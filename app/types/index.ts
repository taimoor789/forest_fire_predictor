
//Main data interface 
export interface FireRiskData {
  id: string;
  lat: number;
  lng: number;
  riskLevel: number; 
  location: string;
  province: string;
  lastUpdated: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  fireDangerIndex?: number;
  modelConfidence?: number;
  weatherFeatures?: {
    temp_range?: number;
    is_hot?: boolean;
    is_dry?: boolean;
    is_windy?: boolean;
    has_recent_precip?: boolean;
    total_precip?: number;
  };
}

//ML Model specific interfaces
export interface MLModelInfo {
  accuracy: number;
  roc_auc: number;
  version: string;
  features: string[];
  lastTrained: string;
  totalLocations: number;
}

export interface MLPredictionData {
  lat: number;
  lon: number;
  location_name: string;
  province: string;
  fire_risk_probability: number;
  weather_features: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    pressure: number;
    fire_danger_index: number;
    temp_range: number;
    is_hot: number;
    is_dry: number;
    is_windy: number;
    has_recent_precip: number;
    total_precip: number;
  };
  model_confidence: number;
  last_updated: string;
}


//Defines color schemes for different risk levels
export interface RiskColor {
  min: number;
  max: number;
  color: string;
  label: string;
  textColor?: string;
}

//Define what props each component expects
//Map Component Props
export interface MapProps {
  data?: FireRiskData[];
  height?: string;
  width?: string;
  className?: string;
  center?: [number, number];
  zoom?: number;
  onLocationClick?: (location: FireRiskData) => void;
}

//Legend Component Props
export interface LegendProps {
  colors: RiskColor[];
  title?: string;
  position?: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-right';
  className?: string;
}

//Header Component Props
export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showStatus?: boolean;
  lastUpdated?: string;
}

//Single API Response 
export interface ApiResponse<T> {
  success: boolean;
  data: T; //generic type
  message?: string;
  timestamp?: string;
}

//Fire Risk API Response
export interface FireRiskResponse {
  success: boolean;          
  data: FireRiskData[];  //array of fire risk data  
  message?: string;         
  timestamp: string;      
  modelVersion?: string;    
  accuracy?: number;        
  dataSource?: string;      
}

//Statistics for the sidebar
export interface StatisticsData {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalLocations: number;
  modelAccuracy: number;
  modelRocAuc: number;
  averageConfidence: number;
  lastUpdated: string;
  modelVersion: string;
}

//Alert/Warning Interface (for recent alerts sidebar)
export interface FireAlert {
  id: string;
  location: string;
  province: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string; //Alert description
  timestamp: string;
  isActive: boolean; //Whether alert is still active
}

//Utility Types
export type BasicFireRiskData = Pick<FireRiskData, 'id' | 'lat' | 'lng' | 'riskLevel'>;

export type PartialFireRiskData = Partial<FireRiskData>;

export type RiskLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

  //Constants
  export const ML_RISK_THRESHOLDS = {
  VERY_HIGH: 0.8,  
  HIGH: 0.6,       
  MEDIUM: 0.4,     
  LOW: 0.2,        
  VERY_LOW: 0.0    
} as const; //makes this readonly

//Helper function to get risk category from ML probability
export function getRiskCategory(probability: number): keyof typeof ML_RISK_THRESHOLDS {
  if (probability >= ML_RISK_THRESHOLDS.VERY_HIGH) return 'VERY_HIGH';
  if (probability >= ML_RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (probability >= ML_RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (probability >= ML_RISK_THRESHOLDS.LOW) return 'LOW';
  return 'VERY_LOW';
}

//Helper function to get risk label
export function getRiskLabel(probability: number): string {
  const category = getRiskCategory(probability);
  const percentage = Math.round(probability * 100);
  
  const labels = {
    VERY_HIGH: `Very High (${percentage}%)`,
    HIGH: `High (${percentage}%)`,
    MEDIUM: `Medium (${percentage}%)`,
    LOW: `Low (${percentage}%)`,
    VERY_LOW: `Very Low (${percentage}%)`
  };
  
  return labels[category];
}

  // Default color scheme
export const DEFAULT_RISK_COLORS: RiskColor[] = [
  { min: 0.8, max: 1.0, color: '#d32f2f', label: 'Very High', textColor: '#ffffff' },
  { min: 0.6, max: 0.8, color: '#f57c00', label: 'High', textColor: '#ffffff' },
  { min: 0.4, max: 0.6, color: '#fbc02d', label: 'Medium', textColor: '#000000' },
  { min: 0.2, max: 0.4, color: '#689f38', label: 'Low', textColor: '#ffffff' },
  { min: 0.0, max: 0.2, color: '#388e3c', label: 'Very Low', textColor: '#ffffff' },
];

//Validation function for ML predictions, check if types match at runtime
export function isValidMLPrediction(obj: unknown): obj is MLPredictionData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as MLPredictionData).lat === 'number' &&
    typeof (obj as MLPredictionData).lon === 'number' &&
    typeof (obj as MLPredictionData).fire_risk_probability === 'number' &&
    (obj as MLPredictionData).fire_risk_probability >= 0 &&
    (obj as MLPredictionData).fire_risk_probability <= 1 &&
    typeof (obj as MLPredictionData).location_name === 'string' 
  );
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= -90 && lat <= 90 &&      // Valid latitude range
    lng >= -180 && lng <= 180       // Valid longitude range
  );
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
