import { FireRiskData } from '../types';

export const mockFireRiskData: FireRiskData[] = [
  // British Columbia (higher risk - dry climate)
  { 
    id: '1', 
    lat: 49.2827, 
    lng: -123.1207, 
    riskLevel: 0.75, 
    location: 'Vancouver', 
    province: 'BC', 
    lastUpdated: '2024-08-25' 
  },
  { 
    id: '2', 
    lat: 53.9171, 
    lng: -122.7497, 
    riskLevel: 0.85, 
    location: 'Prince George', 
    province: 'BC', 
    lastUpdated: '2024-08-25' 
  },
  
  // Alberta
  { 
    id: '3', 
    lat: 51.0447, 
    lng: -114.0719, 
    riskLevel: 0.45, 
    location: 'Calgary', 
    province: 'AB', 
    lastUpdated: '2024-08-25' 
  },
  { 
    id: '4', 
    lat: 53.5444, 
    lng: -113.4909, 
    riskLevel: 0.40, 
    location: 'Edmonton', 
    province: 'AB', 
    lastUpdated: '2024-08-25' 
  },
  
  // Saskatchewan  
  { 
    id: '5', 
    lat: 52.1579, 
    lng: -106.6702, 
    riskLevel: 0.55, 
    location: 'Saskatoon', 
    province: 'SK', 
    lastUpdated: '2024-08-25' 
  },
  
  // Manitoba
  { 
    id: '6', 
    lat: 49.8951, 
    lng: -97.1384, 
    riskLevel: 0.35, 
    location: 'Winnipeg', 
    province: 'MB', 
    lastUpdated: '2024-08-25' 
  },
  
  // Ontario (lower risk - more humid)
  { 
    id: '7', 
    lat: 43.6532, 
    lng: -79.3832, 
    riskLevel: 0.25, 
    location: 'Toronto', 
    province: 'ON', 
    lastUpdated: '2024-08-25' 
  },
  { 
    id: '8', 
    lat: 45.4215, 
    lng: -75.6972, 
    riskLevel: 0.30, 
    location: 'Ottawa', 
    province: 'ON', 
    lastUpdated: '2024-08-25' 
  },
  
  // Quebec
  { 
    id: '9', 
    lat: 45.5017, 
    lng: -73.5673, 
    riskLevel: 0.20, 
    location: 'Montreal', 
    province: 'QC', 
    lastUpdated: '2024-08-25' 
  },
  
  // Atlantic Canada (lowest risk - maritime climate)
  { 
    id: '10', 
    lat: 44.6488, 
    lng: -63.5752, 
    riskLevel: 0.15, 
    location: 'Halifax', 
    province: 'NS', 
    lastUpdated: '2024-08-25' 
  },
];