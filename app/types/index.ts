export interface FireRiskData {
  id: string;
  lat: number;
  lon: number;
  riskLevel: number; 
  location: string;
  province: string;
  lastUpdated?: string;
  nearest_station?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  fireDangerIndex?: number;
  modelConfidence?: number;
  gridCellsCount?: number;
  
  // Fire Weather Index specific properties
  dangerClass?: string;
  colorCode?: string;
  fireWeatherIndices?: {
    ffmc: number;
    dmc: number;
    dc: number;
    isi: number;
    bui: number;
    fwi: number;
    dsr: number;
  };
}

// Fire Weather Index Model Info
export interface FWIModelInfo {
  modelType: string;
  methodology: string;
  r2Score: number;
  mse: number;
  mae: number;
  riskRange: [number, number];
  version: string;
  lastTrained: string;
  confidence: string;
}

// Fire Weather Index Prediction Response
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
}

// Station data for aggregated view
export interface StationData {
  stationName: string;
  coordinates: [number, number];
  province: string;
  gridCells: FireRiskData[];
  avgRisk: number;
  maxRisk: number;
  minRisk: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  weather?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    pressure?: number;
  };
}

// Risk color scheme
export interface RiskColor {
  min: number;
  max: number;
  color: string;
  label: string;
  textColor?: string;
}

// Component Props
export interface MapProps {
  data?: FireRiskData[];
  height?: string;
  width?: string;
  className?: string;
  center?: [number, number];
  zoom?: number;
  onLocationClick?: (location: FireRiskData) => void;
}

export interface LegendProps {
  colors: RiskColor[];
  title?: string;
  position?: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showStatus?: boolean;
  lastUpdated?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface FireRiskResponse {
  success: boolean;          
  data: FireRiskData[];
  message?: string;         
  timestamp: string;      
  modelVersion?: string;    
  accuracy?: number;        
  dataSource?: string;      
}

// Statistics for the sidebar
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

// Alert/Warning Interface
export interface FireAlert {
  id: string;
  location: string;
  province: string;
  riskLevel: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  isActive: boolean;
  color?: string;
}

// Utility Types
export type BasicFireRiskData = Pick<FireRiskData, 'id' | 'lat' | 'lon' | 'riskLevel'>;
export type PartialFireRiskData = Partial<FireRiskData>;
export type RiskLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

// Fire Weather Index thresholds
export const FWI_RISK_THRESHOLDS = {
  VERY_HIGH: 0.8,  
  HIGH: 0.6,       
  MEDIUM: 0.4,     
  LOW: 0.2,        
  VERY_LOW: 0.0    
} as const;

// Helper function to get risk category
export function getRiskCategory(probability: number): keyof typeof FWI_RISK_THRESHOLDS {
  if (probability >= FWI_RISK_THRESHOLDS.VERY_HIGH) return 'VERY_HIGH';
  if (probability >= FWI_RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (probability >= FWI_RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (probability >= FWI_RISK_THRESHOLDS.LOW) return 'LOW';
  return 'VERY_LOW';
}

// Heatmap options
export interface HeatLayerOptions {
  radius?: number;
  blur?: number;
  max?: number;
  maxZoom?: number;
  gradient?: { [key: number]: string };
}

// Helper function to get risk label
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

// Default color scheme for Fire Weather Index
export const DEFAULT_RISK_COLORS: RiskColor[] = [
  { min: 0.8, max: 1.0, color: '#d32f2f', label: 'Very High', textColor: '#ffffff' },
  { min: 0.6, max: 0.8, color: '#f57c00', label: 'High', textColor: '#ffffff' },
  { min: 0.4, max: 0.6, color: '#fbc02d', label: 'Medium', textColor: '#000000' },
  { min: 0.2, max: 0.4, color: '#689f38', label: 'Low', textColor: '#ffffff' },
  { min: 0.0, max: 0.2, color: '#388e3c', label: 'Very Low', textColor: '#ffffff' },
];

// Validation functions
export function isValidFWIPrediction(obj: unknown): obj is FWIPredictionResponse['data'][0] {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).lat === 'number' &&
    typeof (obj as any).lon === 'number' &&
    typeof (obj as any).daily_fire_risk === 'number' &&
    (obj as any).daily_fire_risk >= 0 &&
    (obj as any).daily_fire_risk <= 1 &&
    typeof (obj as any).location_name === 'string' 
  );
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
}

// API Error interface
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Danger class definitions
export interface DangerClass {
  name: string;
  range: string;
  color: string;
  description: string;
}

export const DANGER_CLASSES: DangerClass[] = [
  { name: "Very Low", range: "0-1 FWI", color: "#4CAF50", description: "Fires start easily but spread slowly" },
  { name: "Low", range: "1-3 FWI", color: "#8BC34A", description: "Fires start easily and spread at low to moderate rates" },
  { name: "Moderate", range: "3-7 FWI", color: "#FFEB3B", description: "Fires start easily and spread at moderate rates" },
  { name: "High", range: "7-17 FWI", color: "#FF9800", description: "Fires start easily and spread at high rates" },
  { name: "Very High", range: "17-30 FWI", color: "#F44336", description: "Fires start very easily and spread at very high rates" },
  { name: "Extreme", range: "30+ FWI", color: "#9C27B0", description: "Fires start very easily and spread at extreme rates" }
];

// Helper to get danger class by FWI value
export function getDangerClassByFWI(fwi: number): DangerClass {
  if (fwi < 1) return DANGER_CLASSES[0];
  if (fwi < 3) return DANGER_CLASSES[1];
  if (fwi < 7) return DANGER_CLASSES[2];
  if (fwi < 17) return DANGER_CLASSES[3];
  if (fwi < 30) return DANGER_CLASSES[4];
  return DANGER_CLASSES[5];
}

// Helper to get color by risk level
export function getColorByRiskLevel(riskLevel: number): string {
  if (riskLevel >= 0.8) return '#d32f2f';
  if (riskLevel >= 0.6) return '#f57c00';
  if (riskLevel >= 0.4) return '#fbc02d';
  if (riskLevel >= 0.2) return '#689f38';
  return '#388e3c';
}