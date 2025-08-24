export interface FireRiskData {
  id: string;
  lat: number;
  lng: number;
  riskLevel: number;
  location: string;
  province: string;
  lastUpdated: string;
}

export interface RiskColor {
  min: number;
  max: number;
  color: string;
  label: string;
}