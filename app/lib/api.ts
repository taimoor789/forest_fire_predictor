import { FireRiskData, ApiError as ApiErrorInterface} from "../types";
import { useState, useEffect, useRef} from "react";
import { logger } from "./utils/logger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    fire_weather_indices?: {
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

//API service class for Fire Weather Index System
export class FireRiskAPI {
  // Private static helper method for making fetch requests with consistent error handling
  private static async fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...options?.headers,
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status.toString(),
        errorData.message || `HTTP error! status: ${response.status}`,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if ((error as Error).name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'Request timed out after 30 seconds');
    }
    throw new ApiError(
      'NETWORK_ERROR',
      'Failed to fetch data from server',
      error
    );
  }
 }

 static async getFireRiskPredictions(retryCount = 0): Promise<{ data: FireRiskData[], batchTimestamp: string }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  
  try {
    const response = await this.fetchWithErrorHandling<FWIPredictionResponse>(
      '/api/predict/fire-risk'
    );

    const batchTimestamp = (response as any).last_updated || response.timestamp;

    if (!response.data || !Array.isArray(response.data)) {
      throw new ApiError('INVALID_RESPONSE', 'API response missing or invalid data array');
    }

    if (response.data.length === 0) {
      return { data: [], batchTimestamp };
    }

    const risks = response.data
      .map(item => item.daily_fire_risk)
      .filter(risk => typeof risk === 'number' && !isNaN(risk));
    
    if (risks.length === 0) {
      throw new ApiError('NO_VALID_RISKS', 'No valid risk values in FWI response');
    }

    const transformedData: FireRiskData[] = [];

    response.data.forEach((item, index) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const risk = Number(item.daily_fire_risk);
      
      const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
      const isValidLon = !isNaN(lon) && lon >= -180 && lon <= 180;
      const isValidRisk = !isNaN(risk) && risk >= 0 && risk <= 1;
      const hasLocation = typeof item.location_name === 'string' && item.location_name.trim() !== '';
      const hasProvince = typeof item.province === 'string' && item.province.trim() !== '';

      if (!isValidLat || !isValidLon || !isValidRisk || !hasLocation || !hasProvince) {
        return;
      }

      const temp = item.weather_features?.temperature;
      const humidity = item.weather_features?.humidity;
      const windSpeed = item.weather_features?.wind_speed;

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
    if (retryCount < MAX_RETRIES && error instanceof ApiError && 
        (error.code === 'NETWORK_ERROR' || error.message.includes('503'))) {
      
      logger.warn(`API call failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      
      return this.getFireRiskPredictions(retryCount + 1);
    }
    
    throw error;
  }
 }

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

  static async refreshSystem(): Promise<{success: boolean; message: string}> {
    return this.fetchWithErrorHandling('/api/system/retrain', {
      method: 'POST'
    });
  }

  static async getSystemStats(): Promise<any> {
    return this.fetchWithErrorHandling('/api/stats');
  }

  static async healthCheck(): Promise<{
    status: string; 
    timestamp: string;
    system_type: string;
    system_loaded: boolean;
  }> {
    return this.fetchWithErrorHandling('/health');
  }
}

export class ApiError extends Error implements ApiErrorInterface{
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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

  const prevDataRef = useRef<FireRiskData[] | null>(null);
  const [cachedData, setCachedData] = useState<FireRiskData[] | null>(null);
  const [showCachedWarning, setShowCachedWarning] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          setCachedData(parsedData);
          setData(parsedData);
          setLoading(false);
          if (cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age > 2 * 60 * 60 * 1000) {
              setShowCachedWarning(true);
            }
          }
        } catch (e) {
          logger.error('Failed to parse cached data:', e);
        }
      }
    }
  }, []);

  const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);

    const fireRiskResponse = await FireRiskAPI.getFireRiskPredictions();
    const systemInfo = await FireRiskAPI.getModelInfo().catch(() => null);

    const fireRiskData = fireRiskResponse.data;
    const backendTimestamp = fireRiskResponse.batchTimestamp;

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

    // Update state immediately
    setData(validatedData);
    setLastUpdated(backendTimestamp);
    setModelInfo(systemInfo);
    prevDataRef.current = validatedData;

    // Cache data after state update
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
        
        if (dataString.length < 4 * 1024 * 1024) {
          localStorage.setItem(CACHE_KEY, dataString);
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          setCachedData(validatedData);
          setShowCachedWarning(false);
        } else {
          logger.warn('Data too large to cache');
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

    logger.info(`Loaded ${validatedData.length} Fire Weather Index predictions`);
  } catch (err) {
    logger.error('Failed to fetch Fire Weather Index predictions:', err);
    setError(err instanceof ApiError ? err.message : 'Failed to load predictions');
    
    // CRITICAL: Use cached data if available, NEVER use mock data in production
    if (cachedData && cachedData.length > 0) {
      const cacheAge = Date.now() - parseInt(localStorage.getItem(CACHE_TIMESTAMP_KEY) || '0');
      const cacheAgeHours = cacheAge / (1000 * 60 * 60);
      
      logger.warn(`Using cached data (${cacheAgeHours.toFixed(1)} hours old)`);
      setData(cachedData);
      setShowCachedWarning(cacheAgeHours > 2); // Show warning if cache is >2 hours old
    } else {
      // No cache available - keep trying to reconnect
      logger.error('No cached data available, retrying in 5 seconds...');
      setData([]);
      
      // Auto-retry after 5 seconds
      setTimeout(() => {
        logger.info('Retrying data fetch...');
        fetchData();
      }, 5000);
    }
  } finally {
    setLoading(false);
  }
 };

  useEffect(() => {
    fetchData();

    const getNextUpdateTime = () => {
      const now = new Date();
      const nextUpdate = new Date();
      nextUpdate.setHours(nextUpdate.getHours() + 1, 0, 0, 0);
      return nextUpdate.getTime() - now.getTime();
    };

    const timeUntilNext = getNextUpdateTime();
    logger.info(`Next Fire Weather Index update in ${Math.round(timeUntilNext / (1000 * 60))} minutes`);

    const initialTimeout = setTimeout(() => {
      fetchData();
      
      const hourlyInterval = setInterval(() => {
        logger.info('Fetching hourly Fire Weather Index update...');
        fetchData();
      }, 60 * 60 * 1000);
      
      return () => {
        logger.info('Cleaning up Fire Weather Index update interval');
        clearInterval(hourlyInterval);
      };
    }, timeUntilNext);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, []);

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
  refreshInterval: 60 * 60 * 1000, 
  maxRetries: 3,
  retryDelay: 1000,
  systemType: "Canadian Fire Weather Index System"
};