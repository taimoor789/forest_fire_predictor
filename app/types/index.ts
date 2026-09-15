/**
 * One grid cell's Fire Weather Index reading, as consumed by the UI.
 * Deliberately does NOT carry ml_danger_class / ml_risk_probability: those
 * are shadow-mode internal-comparison fields (see PRODUCT.md) and must never
 * reach a component, so they are dropped at the API mapping step rather than
 * threaded through this type.
 */
export interface FireRiskData {
  id: string;
  lat: number;
  lon: number;
  /** The FWI value itself (not a probability). */
  riskLevel: number;
  location: string;
  province: string;
  lastUpdated?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;

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
  weatherFeatures?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
    precip24h: number;
    isHot: boolean;
    isDry: boolean;
    isWindy: boolean;
    hasRecentPrecip: boolean;
  };
}

// API Error interface
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
