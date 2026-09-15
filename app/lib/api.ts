import { FireRiskData, ApiError as ApiErrorInterface } from "../types";
import { useState, useEffect, useRef } from "react";
import { logger } from "./utils/logger";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CACHE_KEY = 'fireRiskDataCache';
const CACHE_TIMESTAMP_KEY = 'fireRiskDataCacheTimestamp';
// The live payload runs ~8MB for 7,537 cells; the cached subset below drops
// the weather_features detail and keeps only what a fast first paint needs,
// so this ceiling is well above what that subset actually reaches. It's a
// circuit breaker, not a tuned limit.
const CACHE_SIZE_LIMIT = 6 * 1024 * 1024;

// Shape of GET /api/predict/fire-risk. ml_danger_class / ml_risk_probability
// exist on the wire (shadow-mode fields) but are intentionally never read
// into FireRiskData below — see PRODUCT.md.
export interface FWIPredictionResponse {
  success: boolean;
  data: Array<{
    lat: number;
    lon: number;
    location_name: string;
    province: string;
    fwi: number;
    danger_class: string;
    color_code: string;
    weather_features: {
      temperature: number;
      humidity: number;
      wind_speed: number;
      pressure: number;
      precip_24h_mm: number;
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
    historical_fire_zone: number | boolean;
    last_updated?: string;
  }>;
  model_info?: {
    model_type: string;
    version: string;
    methodology: string;
    algorithm: string;
    r2_score: number;
    mse: number;
    mae: number;
    fwi_range: [number, number];
    components: string[];
  };
  processing_stats?: {
    total_locations: number;
    processed_successfully: number;
    processing_errors: number;
    processing_time_seconds: number;
    fwi_statistics: {
      min_fwi: number;
      max_fwi: number;
      mean_fwi: number;
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

// API service class for the Fire Weather Index system
export class FireRiskAPI {
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
      throw new ApiError('NETWORK_ERROR', 'Failed to fetch data from server', error);
    }
  }

  static async getFireRiskPredictions(retryCount = 0): Promise<{ data: FireRiskData[]; batchTimestamp: string }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    try {
      const response = await this.fetchWithErrorHandling<FWIPredictionResponse>('/api/predict/fire-risk');

      const batchTimestamp = response.last_updated || response.timestamp;

      if (!response.data || !Array.isArray(response.data)) {
        throw new ApiError('INVALID_RESPONSE', 'API response missing or invalid data array');
      }

      if (response.data.length === 0) {
        return { data: [], batchTimestamp };
      }

      const fwis = response.data.map((item) => item.fwi).filter((fwi) => typeof fwi === 'number' && !isNaN(fwi));
      if (fwis.length === 0) {
        throw new ApiError('NO_VALID_FWI', 'No valid FWI values in response');
      }

      const transformedData: FireRiskData[] = [];

      response.data.forEach((item) => {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        const fwi = Number(item.fwi);

        const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
        const isValidLon = !isNaN(lon) && lon >= -180 && lon <= 180;
        const isValidFWI = !isNaN(fwi) && fwi >= 0;
        const hasLocation = typeof item.location_name === 'string' && item.location_name.trim() !== '';
        const hasProvince = typeof item.province === 'string' && item.province.trim() !== '';

        if (!isValidLat || !isValidLon || !isValidFWI || !hasLocation || !hasProvince) {
          return;
        }

        const wf = item.weather_features;

        transformedData.push({
          id: `fwi_${lat}_${lon}`,
          lat,
          lon,
          riskLevel: fwi,
          location: item.location_name.trim(),
          province: item.province.trim(),
          temperature: wf?.temperature,
          humidity: wf?.humidity,
          windSpeed: wf?.wind_speed,
          pressure: wf?.pressure,
          dangerClass: item.danger_class,
          colorCode: item.color_code,
          historicalFireZone: Boolean(item.historical_fire_zone),
          fireWeatherIndices: item.fire_weather_indices
            ? {
                ffmc: item.fire_weather_indices.ffmc,
                dmc: item.fire_weather_indices.dmc,
                dc: item.fire_weather_indices.dc,
                isi: item.fire_weather_indices.isi,
                bui: item.fire_weather_indices.bui,
                fwi: item.fire_weather_indices.fwi,
                dsr: item.fire_weather_indices.dsr,
              }
            : undefined,
          weatherFeatures: wf
            ? {
                temperature: wf.temperature,
                humidity: wf.humidity,
                windSpeed: wf.wind_speed,
                pressure: wf.pressure,
                precip24h: wf.precip_24h_mm,
                isHot: Boolean(wf.is_hot),
                isDry: Boolean(wf.is_dry),
                isWindy: Boolean(wf.is_windy),
                hasRecentPrecip: Boolean(wf.has_recent_precip),
              }
            : undefined,
        });
      });

      if (transformedData.length === 0) {
        throw new ApiError('NO_VALID_DATA', 'No valid Fire Weather Index data after transformation');
      }

      return {
        data: transformedData,
        batchTimestamp: batchTimestamp.split('.')[0] + 'Z',
      };
    } catch (error) {
      if (
        retryCount < MAX_RETRIES &&
        error instanceof ApiError &&
        (error.code === 'NETWORK_ERROR' || error.message.includes('503'))
      ) {
        logger.warn(`API call failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return this.getFireRiskPredictions(retryCount + 1);
      }
      throw error;
    }
  }

  static async getModelInfo(): Promise<{
    modelType: string;
    methodology: string;
    algorithm: string;
    fwiRange: [number, number];
    components: string[];
    version: string;
    lastTrained: string;
  }> {
    const response = await this.fetchWithErrorHandling<{
      model_type: string;
      methodology: string;
      algorithm: string;
      fwi_range: [number, number];
      components: string[];
      version: string;
      last_trained: string;
    }>('/api/model/info');

    return {
      modelType: response.model_type,
      methodology: response.methodology,
      algorithm: response.algorithm,
      fwiRange: response.fwi_range,
      components: response.components,
      version: response.version,
      lastTrained: response.last_trained,
    };
  }

  static async getSystemStats(): Promise<unknown> {
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

export class ApiError extends Error implements ApiErrorInterface {
  constructor(public code: string, message: string, public details?: unknown) {
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
    algorithm: string;
    fwiRange: [number, number];
    components: string[];
    version: string;
    lastTrained: string;
  } | null>(null);

  const [cachedData, setCachedData] = useState<FireRiskData[] | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load cached data on mount for an instant first paint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = localStorage.getItem(CACHE_KEY);
    const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cached) return;
    try {
      const parsedData = JSON.parse(cached);
      setCachedData(parsedData);
      setData(parsedData);
      setLoading(false);
      if (cacheTime) {
        setCacheAge(Date.now() - parseInt(cacheTime, 10));
      }
    } catch (e) {
      logger.error('Failed to parse cached data:', e);
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

      const validatedData = fireRiskData.filter((item) => {
        const isValid =
          typeof item.lat === 'number' &&
          typeof item.lon === 'number' &&
          typeof item.riskLevel === 'number' &&
          item.riskLevel >= 0 &&
          typeof item.location === 'string' &&
          item.location.trim() !== '';

        if (!isValid) {
          logger.warn('Invalid Fire Weather Index item', item);
        }
        return isValid;
      });

      if (validatedData.length === 0 && fireRiskData.length > 0) {
        throw new Error('No valid Fire Weather Index data received from API');
      }

      // Cache a compressed subset for the next visit's instant first paint.
      // Includes fireWeatherIndices (needed by the cell readout) but omits
      // the bulkier weatherFeatures detail to keep this well under the size
      // ceiling; that detail simply arrives with the live refetch.
      if (typeof window !== 'undefined') {
        try {
          const compressedData = validatedData.map((item) => ({
            id: item.id,
            lat: item.lat,
            lon: item.lon,
            riskLevel: item.riskLevel,
            location: item.location,
            province: item.province,
            dangerClass: item.dangerClass,
            colorCode: item.colorCode,
            fireWeatherIndices: item.fireWeatherIndices,
          }));

          const dataString = JSON.stringify(compressedData);

          if (dataString.length < CACHE_SIZE_LIMIT) {
            localStorage.setItem(CACHE_KEY, dataString);
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            setCachedData(validatedData);
            setCacheAge(null);
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
        setLastUpdated(backendTimestamp);
      }

      setData(validatedData);
      setModelInfo(systemInfo);

      logger.info(`Loaded ${validatedData.length} Fire Weather Index predictions`);
    } catch (err) {
      logger.error('Failed to fetch Fire Weather Index predictions:', err);
      // Deliberately do not fall back to synthetic/mock data here: a public
      // safety instrument must say "can't reach the live system" rather than
      // silently render invented numbers as if they were current. Whatever
      // was already on screen (cached or live) stays displayed alongside the
      // error state; only a caller with nothing at all shows the empty state.
      setError(err instanceof ApiError ? err.message : 'Failed to load Fire Weather Index predictions');
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await FireRiskAPI.getFireRiskPredictions();
      const newTimestamp = response.batchTimestamp;

      if (lastUpdated && newTimestamp !== lastUpdated) {
        await fetchData();
      }
    } catch (err) {
      logger.warn('Failed to check for updates:', err);
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

    const initialTimeout = setTimeout(() => {
      fetchData();
      const hourlyInterval = setInterval(() => {
        fetchData();
      }, 60 * 60 * 1000);
      return () => clearInterval(hourlyInterval);
    }, timeUntilNext);

    checkIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [lastUpdated]);

  const displayData = data && data.length > 0 ? data : cachedData || [];
  const isStaleCache = cacheAge !== null && cacheAge > 2 * 60 * 60 * 1000;

  return {
    data: displayData,
    loading,
    error,
    lastUpdated,
    modelInfo,
    isStaleCache,
    refetch: fetchData,
  };
}

export const config = {
  apiUrl: API_BASE_URL,
  refreshInterval: 60 * 60 * 1000,
  maxRetries: 3,
  retryDelay: 1000,
  systemType: 'Canadian Fire Weather Index System',
};
