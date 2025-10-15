import { FireRiskData, ApiError as ApiErrorInterface} from "../types";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...options?.headers,
        },
        ...options
      });

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
      throw new ApiError(
        'NETWORK_ERROR',
        'Failed to fetch data from server',
        error
      );
    }
  }

  static async getFireRiskPredictions(): Promise<FireRiskData[]> {
    const response = await this.fetchWithErrorHandling<FWIPredictionResponse>('/api/predict/fire-risk');

    const batchTimestamp = (response as any).last_updated || response.timestamp;
    console.log('🔥🔥🔥 BATCH TIMESTAMP:', batchTimestamp);
    
    console.log('🔥 FWI API RESPONSE:', response);
    console.log('🔥 Response data length:', response.data?.length);
    console.log('🔥 Processing stats:', response.processing_stats);
    console.log('🔥 Model info:', response.model_info);

    if (!response.data || !Array.isArray(response.data)) {
      throw new ApiError('INVALID_RESPONSE', 'API response missing or invalid data array');
    }

    if (response.data.length === 0) {
      console.warn('⚠️ Fire Weather Index API returned empty data array');
      return [];
    }

    const risks = response.data
      .map(item => item.daily_fire_risk)
      .filter(risk => typeof risk === 'number' && !isNaN(risk));
    
    if (risks.length === 0) {
      throw new ApiError('NO_VALID_RISKS', 'No valid risk values in FWI response');
    }

    const minRisk = Math.min(...risks);
    const maxRisk = Math.max(...risks);
    const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;

    console.log('🔥 FIRE WEATHER INDEX DATA ANALYSIS:');
    console.log(`   System: ${response.model_info.model_type}`);
    console.log(`   Methodology: ${response.model_info.methodology}`);
    console.log(`   Total locations: ${response.data.length}`);
    console.log(`   Valid risks: ${risks.length}`);
    console.log(`   Risk range: ${minRisk.toFixed(3)} - ${maxRisk.toFixed(3)}`);
    console.log(`   Average risk: ${avgRisk.toFixed(3)}`);
    
    if (response.processing_stats) {
      const stats = response.processing_stats.risk_statistics;
      console.log(`   Danger classes: VL=${stats.very_low_count}, L=${stats.low_count}, M=${stats.moderate_count}, H=${stats.high_count}, VH=${stats.very_high_count}, E=${stats.extreme_count}`);
      console.log(`   Processing time: ${response.processing_stats.processing_time_seconds.toFixed(1)}s`);
    }

    const transformedData: FireRiskData[] = [];
    const invalidItems: any[] = [];

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
        invalidItems.push({
          index,
          item,
          issues: {
            invalidLat: !isValidLat,
            invalidLon: !isValidLon,
            invalidRisk: !isValidRisk,
            missingLocation: !hasLocation,
            missingProvince: !hasProvince
          }
        });
        return;
      }

      const temp = item.weather_features?.temperature;
      const humidity = item.weather_features?.humidity;
      const windSpeed = item.weather_features?.wind_speed;

      if (temp && (temp < -60 || temp > 60)) {
        console.warn(`⚠️ Extreme temperature for ${item.location_name}: ${temp}°C`);
      }
      if (humidity && (humidity < 0 || humidity > 100)) {
        console.warn(`⚠️ Invalid humidity for ${item.location_name}: ${humidity}%`);
      }
      if (windSpeed && (windSpeed < 0 || windSpeed > 200)) {
        console.warn(`⚠️ Extreme wind speed for ${item.location_name}: ${windSpeed} km/h`);
      }

      transformedData.push({
        id: `fwi_${lat}_${lon}`,
        lat,
        lon,
        riskLevel: risk,
        location: item.location_name.trim(),
        province: item.province.trim(),
        lastUpdated: batchTimestamp,
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
      if (transformedData.length === 1) {
        console.log('🔥🔥🔥 FIRST RECORD lastUpdated:', transformedData[0].lastUpdated);
      }
    });

    if (invalidItems.length > 0) {
      console.error(`🚨 ${invalidItems.length} invalid FWI items found:`, invalidItems.slice(0, 5));
    }

    if (transformedData.length === 0) {
      throw new ApiError('NO_VALID_DATA', 'No valid Fire Weather Index data after transformation');
    }

    const rejectionRate = (invalidItems.length / response.data.length) * 100;
    if (rejectionRate > 10) {
      console.error(`🚨 HIGH REJECTION RATE: ${rejectionRate.toFixed(1)}% of FWI data rejected`);
    }

    const finalRisks = transformedData.map(d => d.riskLevel);
    const finalMin = Math.min(...finalRisks);
    const finalMax = Math.max(...finalRisks);
    const finalAvg = finalRisks.reduce((a, b) => a + b, 0) / finalRisks.length;

    console.log('🔥 FINAL FIRE WEATHER INDEX DATA:');
    console.log(`   Valid items: ${transformedData.length}`);
    console.log(`   Final risk range: ${finalMin.toFixed(3)} - ${finalMax.toFixed(3)}`);
    console.log(`   Final average risk: ${finalAvg.toFixed(3)}`);

    console.log('🔥🔥🔥 FINAL CHECK - First record lastUpdated:', transformedData[0]?.lastUpdated);
    console.log('🔥🔥🔥 FINAL CHECK - Batch timestamp was:', batchTimestamp);

    return transformedData;
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [fireRiskData, systemInfo] = await Promise.all([
        FireRiskAPI.getFireRiskPredictions(),
        FireRiskAPI.getModelInfo().catch(() => null)
      ]);

      console.log('📅📅📅 fireRiskData received, length:', fireRiskData.length);
      console.log('📅📅📅 First record from API:', fireRiskData[0]);
      console.log('📅📅📅 First record lastUpdated:', fireRiskData[0]?.lastUpdated);

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
          console.warn("Invalid Fire Weather Index item", item);
        }
        return isValid;
      });

      if (validatedData.length === 0 && fireRiskData.length > 0) {
        throw new Error('No valid Fire Weather Index data received from API');
      }

      setData(validatedData);
      setModelInfo(systemInfo);
      
      const apiTimestamp = validatedData.length > 0 && validatedData[0].lastUpdated 
        ? validatedData[0].lastUpdated 
        : null;
      
      console.log('📅📅📅 apiTimestamp selected:', apiTimestamp);
      console.log('📅📅📅 About to call setLastUpdated with:', apiTimestamp);
      
      if (apiTimestamp) {
        setLastUpdated(apiTimestamp);
      }

      console.log(`Loaded ${validatedData.length} Fire Weather Index predictions`);
      if (systemInfo) {
        console.log(`System: ${systemInfo.modelType}`);
        console.log(`Methodology: ${systemInfo.methodology}`);
        console.log(`Confidence: ${systemInfo.confidence}`);
        console.log(`Risk range: ${systemInfo.riskRange[0].toFixed(3)} - ${systemInfo.riskRange[1].toFixed(3)}`);
      }
    } catch (err) {
      console.error('Failed to fetch Fire Weather Index predictions:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load Fire Weather Index predictions');
      
      try {
        const { mockFireRiskData } = await import('./mockData');
        setData(mockFireRiskData);
        console.log('Using mock data as fallback for Fire Weather Index');
      } catch (mockError) {
        console.error('Failed to load mock data:', mockError);
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const getNextUpdateTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      let nextHour = Math.ceil(currentHour / 2) * 2;
      let nextDay = 0;
      
      if (nextHour >= 24) {
        nextHour = 0;
        nextDay = 1;
      }
      
      const nextUpdate = new Date();
      nextUpdate.setDate(now.getDate() + nextDay);
      nextUpdate.setHours(nextHour, 0, 0, 0);
      
      if (nextHour === currentHour && currentMinute > 5) {
        nextUpdate.setHours(nextHour + 2, 0, 0, 0);
        if (nextUpdate.getHours() >= 24) {
          nextUpdate.setDate(nextUpdate.getDate() + 1);
          nextUpdate.setHours(0, 0, 0, 0);
        }
      }
      
      return nextUpdate.getTime() - now.getTime();
    };

    const timeUntilNext = getNextUpdateTime();
    
    console.log(`Next Fire Weather Index update in ${Math.round(timeUntilNext / (1000 * 60))} minutes`);

    const initialTimeout = setTimeout(() => {
      fetchData();
      
      const twoHourInterval = setInterval(() => {
        console.log('Fetching scheduled Fire Weather Index update...');
        fetchData();
      }, 2 * 60 * 60 * 1000);
      
      return () => {
        console.log('Cleaning up Fire Weather Index update interval');
        clearInterval(twoHourInterval);
      };
    }, timeUntilNext);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, []);

  return {
    data, 
    error,
    lastUpdated,
    modelInfo,
    refetch: fetchData
  };
}

export const config = {
  apiUrl: API_BASE_URL,
  refreshInterval: 2 * 60 * 60 * 1000,
  maxRetries: 3,
  retryDelay: 1000,
  systemType: "Canadian Fire Weather Index System"
};