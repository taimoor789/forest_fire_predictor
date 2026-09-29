/**
 * One grid cell's fire risk reading, as consumed by the UI.
 *
 * The ML model (calibrated probability, 4 tiers) has been the primary,
 * served system since 2026-09-28 -- riskProbability drives tier
 * classification/coloring everywhere in the app. riskLevel (the raw FWI
 * score) stays available as reference detail, not for classification: it
 * no longer determines the displayed tier, and the two can legitimately
 * disagree (see docs/PREREGISTRATION.md).
 */
export interface FireRiskData {
  id: string;
  lat: number;
  lon: number;
  /** The FWI value itself (not a probability) -- reference detail only, see above. */
  riskLevel: number;
  /** Calibrated ML probability (0-1). Drives tier classification/coloring. */
  riskProbability: number;
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
