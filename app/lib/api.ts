import { FireRiskData, ApiError as ApiErrorInterface} from "../types";
import { useState, useEffect, useRef} from "react";
import { logger } from "./utils/logger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// localStorage keys for caching fire risk data
const CACHE_KEY = 'fireRiskDataCache';
const CACHE_TIMESTAMP_KEY = 'fireRiskDataCacheTimestamp';

// Enhanced interface for Fire Weather Index response
export interface FWIPredictionResponse {
  success: boolean;
  data: Array<{
    lat: number;
    lon: number;
    location_name: string;
    province: string;
    daily_fire_risk: number; 
    danger_class: string;
    color_code: string;
    weather_features: {
      temperature: number;
      humidity: number;
      wind_speed: number;
      pressure: number;
      fire_danger_index: number;
      rain_1h_mm: number;
      rain_3h_mm: number;
      snow_1h_mm: number;
      snow_3h_mm: number;
      is_hot: number;
      is_dry: number;
      humidity_temp_ratio: number;
      is_windy: number;
      total_precip: number;
      has_recent_precip: number;
      weather_main_encoded: number;
    };
    fire_weather_indices?: { // Canadian FWI components
      ffmc: number; 
      dmc: number;
      dc: number;
      isi: number;
      bui: number;
      fwi: number;
      dsr: number;
    };
    model_confidence: number;
    last_updated: string;
  }>;
  model_info: {
    model_type: string;
    version: string;
    methodology: string;
    r2_score: number; 
    mse: number;
    mae: number;
    risk_range: [number, number];
    features_used: string[];
  };
  processing_stats?: {
    total_locations: number;
    processed_successfully: number;
    processing_errors: number;
    processing_time_seconds: number;
    risk_statistics: {
      min_risk: number;
      max_risk: number;
      mean_risk: number;
      very_low_count: number;
      low_count: number;
      moderate_count: number;
      high_count: number;
      very_high_count: number;
      extreme_count: number;
    };
  };
  timestamp: string;
  last_updated?: string;
}

/**
 * FireRiskAPI - Centralized API service layer
 * Uses static methods (no instantiation needed)
 * Pattern: FireRiskAPI.getFireRiskPredictions()
 */
export class FireRiskAPI {
  // Private static helper method for making fetch requests with consistent error handling
  private static async fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    // AbortController lets us cancel the request after timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 
    
    // Make the actual fetch request
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options, //Spread any custom options(method,body,etc.)
      signal: controller.signal, // Connect abort signal
      headers: {
        'Content-Type': 'application/json',
        // Prevent browser caching of API responses
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...options?.headers, // Allow overriding headers
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId); //Cancel timeout if request completes

    // Check HTTP status code
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status.toString(),
        errorData.message || `HTTP error! status: ${response.status}`,
        errorData
      );
    }

    // Parse and return JSON response
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle timeout errors
    if ((error as Error).name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'Request timed out after 30 seconds');
    }
    // Handle network errors 
    throw new ApiError(
      'NETWORK_ERROR',
      'Failed to fetch data from server',
      error
    );
  }
 }

 /**
   * Get fire risk predictions with automatic retry logic
   * @param retryCount - Current retry attempt 
   * @returns Object containing transformed data and batch timestamp
   */
 static async getFireRiskPredictions(retryCount = 0): Promise<{ data: FireRiskData[], batchTimestamp: string }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  
  try {
    // Fetch raw response from backend
    const response = await this.fetchWithErrorHandling<FWIPredictionResponse>(
      '/api/predict/fire-risk'
    );

    const batchTimestamp = (response as any).last_updated || response.timestamp;

    // Validate response structure
    if (!response.data || !Array.isArray(response.data)) {
      throw new ApiError('INVALID_RESPONSE', 'API response missing or invalid data array');
    }

    if (response.data.length === 0) {
      return { data: [], batchTimestamp };
    }

    // Extract all risk values for validation
    const risks = response.data
      .map(item => item.daily_fire_risk)
      .filter(risk => typeof risk === 'number' && !isNaN(risk));
    
    if (risks.length === 0) {
      throw new ApiError('NO_VALID_RISKS', 'No valid risk values in FWI response');
    }

    //Convert backend format to frontend format
    const transformedData: FireRiskData[] = [];

    response.data.forEach((item, index) => {
      // Parse and validate coordinates
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const risk = Number(item.daily_fire_risk);
      
      // Comprehensive validation checks
      const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
      const isValidLon = !isNaN(lon) && lon >= -180 && lon <= 180;
      const isValidRisk = !isNaN(risk) && risk >= 0 && risk <= 1;
      const hasLocation = typeof item.location_name === 'string' && item.location_name.trim() !== '';
      const hasProvince = typeof item.province === 'string' && item.province.trim() !== '';

      // Skip invalid entries 
      if (!isValidLat || !isValidLon || !isValidRisk || !hasLocation || !hasProvince) {
        return;
      }

      // Extract weather features
      const temp = item.weather_features?.temperature;
      const humidity = item.weather_features?.humidity;
      const windSpeed = item.weather_features?.wind_speed;

      // Transform to frontend data structure
      transformedData.push({
        id: `fwi_${lat}_${lon}`,
        lat,
        lon,
        riskLevel: risk,
        location: item.location_name.trim(),
        province: item.province.trim(),
        temperature: temp || 15,  
        humidity: humidity || 60,
        windSpeed: windSpeed || 10,
        fireDangerIndex: item.weather_features?.fire_danger_index || item.fire_weather_indices?.fwi || 0,
        modelConfidence: Number(item.model_confidence) || 0.95,
        dangerClass: item.danger_class,
        colorCode: item.color_code,
        fireWeatherIndices: item.fire_weather_indices ? {
          ffmc: item.fire_weather_indices.ffmc,
          dmc: item.fire_weather_indices.dmc,
          dc: item.fire_weather_indices.dc,
          isi: item.fire_weather_indices.isi,
          bui: item.fire_weather_indices.bui,
          fwi: item.fire_weather_indices.fwi,
          dsr: item.fire_weather_indices.dsr
        } : undefined
      });
    });

    if (transformedData.length === 0) {
      throw new ApiError('NO_VALID_DATA', 'No valid Fire Weather Index data after transformation');
    }

    return {
      data: transformedData,
      batchTimestamp: batchTimestamp.split('.')[0] + 'Z' 
    };
  } catch (error) {
    //Automatic retries for network errors
    if (retryCount < MAX_RETRIES && error instanceof ApiError && 
        (error.code === 'NETWORK_ERROR' || error.message.includes('503'))) {
      
      logger.warn(`API call failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      
      //Exponential backoff: wait longer with each retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      
      //Recursive retry
      return this.getFireRiskPredictions(retryCount + 1);
    }
    
    //Max retries exceeded or non-retryable error
    throw error;
  }
 }

  /**
  * Get model metadata and statistics
  */
  static async getModelInfo(): Promise<{
    modelType: string;
    methodology: string;
    r2Score: number;
    mse: number;
    mae: number;
    riskRange: [number, number];
    features: string[];
    version: string;
    lastTrained: string;
    confidence: string;
  }> {
    const response = await this.fetchWithErrorHandling<{
      model_type: string;
      methodology: string;
      r2_score: number;
      mse: number;
      mae: number;
      risk_range: [number, number];
      features: string[];
      version: string;
      last_trained: string;
      confidence: string;
    }>('/api/model/info');

    // Transform snake_case to camelCase for frontend
    return {
      modelType: response.model_type,
      methodology: response.methodology,
      r2Score: response.r2_score,
      mse: response.mse,
      mae: response.mae,
      riskRange: response.risk_range,
      features: response.features,
      version: response.version,
      lastTrained: response.last_trained,
      confidence: response.confidence
    };
  }

  /**
   * Trigger backend to refresh weather data and recalculate FWI
   */
  static async refreshSystem(): Promise<{success: boolean; message: string}> {
    return this.fetchWithErrorHandling('/api/system/retrain', {
      method: 'POST'
    });
  }

  /**
   * Get system statistics and processing info
   */
  static async getSystemStats(): Promise<any> {
    return this.fetchWithErrorHandling('/api/stats');
  }

  /**
   * Check if backend is healthy
   */
  static async healthCheck(): Promise<{
    status: string; 
    timestamp: string;
    system_type: string;
    system_loaded: boolean;
  }> {
    return this.fetchWithErrorHandling('/health');
  }
}

/**
 * Custom ApiError class for consistent error handling
 * Extends native Error class with additional properties
 */
export class ApiError extends Error implements ApiErrorInterface{
  constructor(
    public code: string, // Error code for programmatic handling
    message: string, // Human-readable error message
    public details?: unknown //Optional additional error details
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Custom hook that encapsulates all data fetching logic
// Returns data, loading state, errors, and refetch function
export function useFireRiskData() {
  const [data, setData] = useState<FireRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{
    modelType: string;
    methodology: string;
    r2Score: number;
    mse: number;
    mae: number;
    riskRange: [number, number];
    version: string;
    confidence: string;
  } | null>(null);

  // useRef to track previous data (for change detection)
  const prevDataRef = useRef<FireRiskData[] | null>(null);

  // Cache management state
  const [cachedData, setCachedData] = useState<FireRiskData[] | null>(null);
  const [showCachedWarning, setShowCachedWarning] = useState(false);

  // Ref for update checking interval
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null); 

  // Load cached data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          setCachedData(parsedData);
          setData(parsedData); // Display immediately
          setLoading(false);

          // Check cache age
          if (cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age > 2 * 60 * 60 * 1000) { //Older than 2 hours
              setShowCachedWarning(true);
            }
          }
        } catch (e) {
          logger.error('Failed to parse cached data:', e);
        }
      }
    }
  }, []);

  //Main data fetching function
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fire risk predictions and model info in parallel
      const fireRiskResponse = await FireRiskAPI.getFireRiskPredictions();
      const systemInfo = await FireRiskAPI.getModelInfo().catch(() => null);

      const fireRiskData = fireRiskResponse.data;
      const backendTimestamp = fireRiskResponse.batchTimestamp;

      //Filter out invalid entries
      const validatedData = fireRiskData.filter(item => {
        const isValid = 
          typeof item.lat === 'number' && 
          typeof item.lon === 'number' &&
          typeof item.riskLevel === 'number' &&
          item.riskLevel >= 0 && 
          item.riskLevel <= 1 &&
          typeof item.location === 'string' &&
          item.location.trim() !== '';

        if (!isValid) {
          logger.warn("Invalid Fire Weather Index item", item);
        }
        return isValid;
      });

      if (validatedData.length === 0 && fireRiskData.length > 0) {
        throw new Error('No valid Fire Weather Index data received from API');
      }

      // Cache data with compression (only essential fields)
      if (typeof window !== 'undefined') {
        try {
          const compressedData = validatedData.map(item => ({
            id: item.id,
            lat: item.lat,
            lon: item.lon,
            riskLevel: item.riskLevel,
            location: item.location,
            province: item.province,
            temperature: item.temperature,
            humidity: item.humidity,
            windSpeed: item.windSpeed
          }));
          
          const dataString = JSON.stringify(compressedData);
          
          // Check size limit (4MB localStorage limit)
          if (dataString.length < 4 * 1024 * 1024) {
            localStorage.setItem(CACHE_KEY, dataString);
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            setCachedData(validatedData);
            setShowCachedWarning(false);
          } else {
            logger.warn('Data too large to cache, skipping localStorage');
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'QuotaExceededError') {
            logger.warn('localStorage quota exceeded, clearing old cache');
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
          } else {
            logger.error('Failed to cache data:', e);
          }
        }
      }

      if (!lastUpdated || backendTimestamp !== lastUpdated) {
        logger.info(' New data from backend, updating lastUpdated to:', backendTimestamp);
        setLastUpdated(backendTimestamp);
      } else {
        logger.info(' Same backend data, lastUpdated stays:', lastUpdated);
      }

      setData(validatedData);
      setModelInfo(systemInfo);
      prevDataRef.current = validatedData;

      logger.info(`Loaded ${validatedData.length} Fire Weather Index predictions`);
    } catch (err) {
      logger.error('Failed to fetch Fire Weather Index predictions:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load Fire Weather Index predictions');
      
      try {
        const { mockFireRiskData } = await import('./mockData');
        setData(mockFireRiskData);
        logger.info('Using mock data as fallback for Fire Weather Index');
      } catch (mockError) {
        logger.error('Failed to load mock data:', mockError);
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await FireRiskAPI.getFireRiskPredictions();
      const newTimestamp = response.batchTimestamp;
      
      // If timestamp changed, fetch new data
      if (lastUpdated && newTimestamp !== lastUpdated) {
        logger.info(' New data detected! Refreshing...');
        await fetchData();
      }
    } catch (err) {
      logger.warn('Failed to check for updates:', err);
    }
  };

  //Setup hourly updates and minutely checking
  useEffect(() => {
    //Initial fetch
    fetchData();

    // Calculate time until next hour
    const getNextUpdateTime = () => {
      const now = new Date();
      const nextUpdate = new Date();
      nextUpdate.setHours(nextUpdate.getHours() + 1, 0, 0, 0);
      return nextUpdate.getTime() - now.getTime();
    };

    const timeUntilNext = getNextUpdateTime();
    logger.info(`Next Fire Weather Index update in ${Math.round(timeUntilNext / (1000 * 60))} minutes`);

    // Setup hourly updates
    const initialTimeout = setTimeout(() => {
      fetchData();
      
      //After first scheduled update, set up recurring hourly interval
      const hourlyInterval = setInterval(() => {
        logger.info('Fetching hourly Fire Weather Index update...');
        fetchData();
      }, 60 * 60 * 1000); //Every hour
      
      return () => {
        logger.info('Cleaning up Fire Weather Index update interval');
        clearInterval(hourlyInterval);
      };
    }, timeUntilNext);

    // Start checking for updates every minute
    checkIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, 60 * 1000); // Check every 60 seconds

    return () => {
      clearTimeout(initialTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [lastUpdated]); // Re-run if lastUpdated changes

  // Prefer fresh data, fall back to cached data
  const displayData = data && data.length > 0 ? data : cachedData;

  return {
    data: displayData,
    loading,
    error,
    lastUpdated,  
    modelInfo,
    refetch: fetchData
  };
}

export const config = {
  apiUrl: API_BASE_URL,
  refreshInterval: 60 * 60 * 1000, //1 hour
  maxRetries: 3,
  retryDelay: 1000,
  systemType: "Canadian Fire Weather Index System"
};