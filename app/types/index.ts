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
  historicalFireZone?: boolean;  
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
  algorithm: string;
  r2Score: number;
  mse: number;
  mae: number;
  fwiRange: [number, number];
  components: string[];
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
    fwi: number;  
    danger_class: string;
    color_code: string;
    weather_features: {
      temperature: number;
      humidity: number;
      wind_speed: number;
      pressure: number;
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
    historical_fire_zone: boolean;
    model_confidence: number;
    last_updated: string;
  }>;
  model_info: {
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
}

// Station data for aggregated view
export interface StationData {
  stationName: string;
  coordinates: [number, number];
  province: string;
  gridCells: FireRiskData[];
  avgFWI: number;  
  maxFWI: number; 
  minFWI: number; 
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
  extremeCount: number;
  veryHighCount: number;
  highRiskCount: number;
  moderateCount: number;
  lowCount: number;
  veryLowCount: number;
  totalLocations: number;
  modelAccuracy: number;
  averageConfidence: number;
  lastUpdated: string;
  modelVersion: string;
  averageFWI: number;
}

// Alert/Warning Interface
export interface FireAlert {
  id: string;
  location: string;
  province: string;
  fwi: number;
  dangerClass: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  message: string;
  timestamp: string;
  isActive: boolean;
  color?: string;
}

// Utility Types
export type BasicFireRiskData = Pick<FireRiskData, 'id' | 'lat' | 'lon' | 'riskLevel'>;
export type PartialFireRiskData = Partial<FireRiskData>;
export type DangerClass = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

// Fire Weather Index thresholds (official Canadian FWI System)
export const FWI_DANGER_THRESHOLDS = {
  EXTREME: 30,
  VERY_HIGH: 18,
  HIGH: 8,
  MODERATE: 4,
  LOW: 2,
  VERY_LOW: 0
} as const;

// Helper function to get danger class from FWI
export function getDangerClass(fwi: number): DangerClass {
  if (fwi >= FWI_DANGER_THRESHOLDS.EXTREME) return 'Extreme';
  if (fwi >= FWI_DANGER_THRESHOLDS.VERY_HIGH) return 'Very High';
  if (fwi >= FWI_DANGER_THRESHOLDS.HIGH) return 'High';
  if (fwi >= FWI_DANGER_THRESHOLDS.MODERATE) return 'Moderate';
  if (fwi >= FWI_DANGER_THRESHOLDS.LOW) return 'Low';
  return 'Very Low';
}

// Heatmap options
export interface HeatLayerOptions {
  radius?: number;
  blur?: number;
  max?: number;
  maxZoom?: number;
  gradient?: { [key: number]: string };
}

// Helper function to get danger class label with FWI
export function getDangerLabel(fwi: number): string {
  const dangerClass = getDangerClass(fwi);
  const fwiDisplay = fwi.toFixed(1);
  return `${dangerClass} (FWI ${fwiDisplay})`;
}

// Default color scheme for Fire Weather Index
export const DEFAULT_FWI_COLORS: RiskColor[] = [
  { min: 30, max: 100, color: '#9C27B0', label: 'Extreme', textColor: '#ffffff' },
  { min: 18, max: 30, color: '#F44336', label: 'Very High', textColor: '#ffffff' },
  { min: 8, max: 18, color: '#FF9800', label: 'High', textColor: '#ffffff' },
  { min: 4, max: 8, color: '#FFEB3B', label: 'Moderate', textColor: '#000000' },
  { min: 2, max: 4, color: '#8BC34A', label: 'Low', textColor: '#ffffff' },
  { min: 0, max: 2, color: '#4CAF50', label: 'Very Low', textColor: '#ffffff' },
];

// Validation functions
export function isValidFWIPrediction(obj: unknown): obj is FWIPredictionResponse['data'][0] {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).lat === 'number' &&
    typeof (obj as any).lon === 'number' &&
    typeof (obj as any).fwi === 'number' &&
    (obj as any).fwi >= 0 &&
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
export interface DangerClassDefinition {
  name: DangerClass;
  fwiMin: number;
  fwiMax: number;
  color: string;
  description: string;
}

export const DANGER_CLASS_DEFINITIONS: DangerClassDefinition[] = [
  { name: "Very Low", fwiMin: 0, fwiMax: 2, color: "#4CAF50", description: "Fuels will not ignite readily from small firebrands" },
  { name: "Low", fwiMin: 2, fwiMax: 4, color: "#8BC34A", description: "Fires start easily and spread at low to moderate rates" },
  { name: "Moderate", fwiMin: 4, fwiMax: 8, color: "#FFEB3B", description: "Fires start easily and spread at moderate rates" },
  { name: "High", fwiMin: 8, fwiMax: 18, color: "#FF9800", description: "High fire intensity with serious control problems" },
  { name: "Very High", fwiMin: 18, fwiMax: 30, color: "#F44336", description: "Very intense fires with rapid spread" },
  { name: "Extreme", fwiMin: 30, fwiMax: 100, color: "#9C27B0", description: "Extremely intense, fast-moving fires" }
];

// Helper to get danger class definition by FWI value
export function getDangerClassDefinition(fwi: number): DangerClassDefinition {
  if (fwi < 2) return DANGER_CLASS_DEFINITIONS[0];
  if (fwi < 4) return DANGER_CLASS_DEFINITIONS[1];
  if (fwi < 8) return DANGER_CLASS_DEFINITIONS[2];
  if (fwi < 18) return DANGER_CLASS_DEFINITIONS[3];
  if (fwi < 30) return DANGER_CLASS_DEFINITIONS[4];
  return DANGER_CLASS_DEFINITIONS[5];
}

// Helper to get color by FWI level
export function getColorByFWI(fwi: number): string {
  if (fwi >= 30) return '#9C27B0';
  if (fwi >= 18) return '#F44336';
  if (fwi >= 8) return '#FF9800';
  if (fwi >= 4) return '#FFEB3B';
  if (fwi >= 2) return '#8BC34A';
  return '#4CAF50';
}