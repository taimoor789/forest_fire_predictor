import { FireRiskData, FireRiskResponse, ApiError as ApiErrorInterface} from "../types";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

//Defines the expected shape of a request payload sent to the ML model
export interface MLPredictionRequest {
  locations: Array<{
    lat: number;
    lon: number;
    location_name: string;
    province: string;
  }>;
  //Optional object to override weather values instead of using live data
  weather_override?: {
    temperature?: number;
    humidity?: number;
    wind_speed?: number;
    pressure?: number;
    rain_1h_mm?: number;
    rain_3h_mm?: number;
    snow_1h_mm?: number;
    snow_3h_mm?: number; 
    is_hot?: number;
    is_dry?: number; 
    humidity_temp_ratio?: number;
    is_windy?: number;
    total_precip?: number;
    has_recent_precip?: number;
    weather_main_encoded?: number;
    fire_danger_index?: number;
  };
}

export interface MLPredictionResponse {
  success: boolean;
  data: Array<{
    lat: number;
    lon: number;
    location_name: string;
    province: string;
    daily_fire_risk: number; 
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
    model_confidence: number;
    last_updated: string;
  }>;
  model_info: {
    model_type: string;
    version: string;
    r2_score: number; 
    mse: number;
    mae: number;
    risk_range: [number, number];
    features_used: string[];
  };
  timestamp: string;
}

//API service class
export class FireRiskAPI {
   //Private static helper method for making fetch requests with consistent error handling
  private static async fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      //Perform HTTP request with JSON headers + passed-in options
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers, //Spread syntax merges any extra headers passed in if options isn't undefined
        },
        ...options //Spread other request options(Ex:method, body)
      });

      if (!response.ok) {
        //Try parsing error JSON; fallback to empty object if parsing fails
        const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
          response.status.toString(),
          errorData.message || `HTTP error! status: ${response.status}`,
          errorData
        );
      }

      //If response is OK, parse and return JSON (typed as T)
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
    const response = await this.fetchWithErrorHandling<MLPredictionResponse>('/api/predict/fire-risk');

    //Transform ML response to match frontend FireRiskData interface
    return response.data.map(item => ({
      id: `${item.lat}_${item.lon}`,
      lat: item.lat,
      lon: item.lon,
      riskLevel: item.daily_fire_risk, // Updated field name
      location: item.location_name,
      province: item.province,
      lastUpdated: item.last_updated,
      //Additional data that could be useful for detailed popups
      temperature: item.weather_features.temperature,
      humidity: item.weather_features.humidity,
      windSpeed: item.weather_features.wind_speed,
      fireDangerIndex: item.weather_features.fire_danger_index,
      modelConfidence: item.model_confidence
    }));
  }

    //Gets model metadata + performance metrics and normalizes naming for the UI
  static async getModelInfo(): Promise<{
    modelType: string;
    r2Score: number;
    mse: number;
    mae: number;
    riskRange: [number, number];
    features: string[];
    version: string;
    lastTrained: string;
  }> {
    const response = await this.fetchWithErrorHandling<{
      model_type: string;
      r2_score: number;
      mse: number;
      mae: number;
      risk_range: [number, number];
      features: string[];
      version: string;
      last_trained: string;
    }>('/api/model/info');

    return {
      modelType: response.model_type,
      r2Score: response.r2_score,
      mse: response.mse,
      mae: response.mae,
      riskRange: response.risk_range,
      features: response.features,
      version: response.version,
      lastTrained: response.last_trained
    };
  }

  //Trigger model retraining (if needed)
  static async retrain(): Promise<{success: boolean; message: string}> {
    return this.fetchWithErrorHandling('/api/model/retrain', {
      method: 'POST'
    });
  }

  //Simple health check passthrough
  static async healthCheck(): Promise<{status: string; timestamp: string}> {
    return this.fetchWithErrorHandling('/health');
  }
}

//Runtime error class for API errors
export class ApiError extends Error implements ApiErrorInterface{
  constructor(
    public code: string, //error code (e.g., HTTP status or custom string)
    message: string, //human-readable error message
    public details?: unknown
  ) {
    super(message); //call the parent Error constructor with the message
    this.name = 'ApiError'; //set error name
  }
}

//Hook for using ML fire risk predictions
export function useFireRiskData() {
  const [data, setData] = useState<FireRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{
    modelType: string;
    r2Score: number;
    mse: number;
    mae: number;
    riskRange: [number, number];
    version: string;
  } | null>(null);

  //Fetch predictions + model info from API
  const fetchData = async () => {
    try {
      setLoading(true); //show spinner/loading state
      setError(null);  //clear previous errors

      //Fetch both predictions and model info
      const [fireRiskData, modelData] = await Promise.all([
        FireRiskAPI.getFireRiskPredictions(),
        FireRiskAPI.getModelInfo().catch(() => null) //Don't fail if model info unavailable
      ]);

      //Validate data structure before setting
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
            console.warn("Invalid data item", item);
          }
          return isValid;
      });

      if (validatedData.length === 0 && fireRiskData.length > 0) {
        throw new Error('No valid prediction data received from API');
      }

      setData(validatedData);
      setModelInfo(modelData);
      setLastUpdated(new Date().toISOString());

      console.log(`Loaded ${validatedData.length} daily fire risk predictions`);
      if (modelData) {
        console.log(`Model R²: ${(modelData.r2Score * 100).toFixed(1)}%, MAE: ${modelData.mae.toFixed(3)}`);
        console.log(`Risk range: ${modelData.riskRange[0].toFixed(3)} - ${modelData.riskRange[1].toFixed(3)}`);
      }
    } catch (err) {
      console.error('Failed to fetch ML predictions:', err);
      //If it's an ApiError, use its message, otherwise generic fallback
      setError(err instanceof ApiError ? err.message : 'Failed to load ML predictions');
      
      //Fall back to mock data on error
      try {
        const {mockFireRiskData } = await import('./mockData');
        setData(mockFireRiskData);
        console.log('Using mock data as fallback');
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

     //Calculate time until 8:30 AM the next day
     const now = new Date();
     const tomorrow830 = new Date();
     tomorrow830.setDate(now.getDate() + 1);
     tomorrow830.setHours(8, 30, 0, 0);

     const timeUntil830 = tomorrow830.getTime() - now.getTime();

     //Set timeout for 8:30 AM, then daily interval
     const initialTimeout = setTimeout(() => {
      fetchData();
      const dailyInterval = setInterval(fetchData, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
     }, timeUntil830);

     return () => clearTimeout(initialTimeout);
  }, []);

  return {
    data, 
    loading,
    error,
    lastUpdated,
    modelInfo,
    refetch: fetchData
  };
}

export const config = {
  apiUrl: API_BASE_URL,
  refreshInterval: 5 * 60 * 1000, //5 mins
  maxRetries: 3,
  retryDelay: 1000, //delay (ms) between retries
};