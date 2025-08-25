
//Main data interface 
export interface FireRiskData {
  id: string;
  lat: number;
  lng: number;
  riskLevel: number;
  location: string;
  province: string;
  lastUpdated: string;
}

export interface ExtendedFireRiskData extends FireRiskData {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
  pressure?: number;
  fireWeatherIndex?: number;
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
  onLocaationClick?: (location: FireRiskData) => void;
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

export interface StatisticsData {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalLocations: number;
  modelAccuracy: number;
  lastUpdated: string;
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

export type CanadianProvince = 
  | 'BC' | 'AB' | 'SK' | 'MB' // Western provinces
  | 'ON' | 'QC'      // Central provinces  
  | 'NB' | 'NS' | 'PE' | 'NL' // Atlantic provinces
  | 'YT' | 'NT' | 'NU'; // Territories

  //Constants
  export const RISK_LEVELS = {
    VERY_LOW: 0.0,
    LOW: 0.2,
    MEDIUM: 0.4,
    HIGH: 0.6,
    VERY_HIGH: 0.8,
  } as const; //makes this readonly

  // Default color scheme
export const DEFAULT_RISK_COLORS: RiskColor[] = [
  { min: 0.8, max: 1.0, color: '#d32f2f', label: 'Very High', textColor: '#ffffff' },
  { min: 0.6, max: 0.8, color: '#f57c00', label: 'High', textColor: '#ffffff' },
  { min: 0.4, max: 0.6, color: '#fbc02d', label: 'Medium', textColor: '#000000' },
  { min: 0.2, max: 0.4, color: '#689f38', label: 'Low', textColor: '#ffffff' },
  { min: 0.0, max: 0.2, color: '#388e3c', label: 'Very Low', textColor: '#ffffff' },
];

//These functions check if data matches expected types at runtime
export function isValidFireRiskData(obj: unknown): obj is FireRiskData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as FireRiskData).id === 'string' &&
    typeof (obj as FireRiskData).lat === 'number' &&
    typeof (obj as FireRiskData).lng === 'number' &&
    typeof (obj as FireRiskData).riskLevel === 'number' &&
    (obj as FireRiskData).riskLevel >= 0 && (obj as FireRiskData).riskLevel <= 1 &&
    typeof (obj as FireRiskData).location === 'string' &&
    typeof (obj as FireRiskData).province === 'string' &&
    typeof (obj as FireRiskData).lastUpdated === 'string'
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
