export interface Station {
  name: string;
  lat: number;
  lon: number;
  province: string;
}

export const CANADIAN_STATIONS: Station[] = [
  { name: "Vancouver", lat: 49.2827, lon: -123.1207, province: "BC" },
  { name: "Kelowna", lat: 49.8880, lon: -119.4960, province: "BC" },
  { name: "Kamloops", lat: 50.6745, lon: -120.3273, province: "BC" },
  { name: "Calgary", lat: 51.0447, lon: -114.0719, province: "AB" },
  { name: "Edmonton", lat: 53.5461, lon: -113.4938, province: "AB" },
  { name: "Fort McMurray", lat: 56.7266, lon: -111.3790, province: "AB" },
  { name: "Saskatoon", lat: 52.1579, lon: -106.6702, province: "SK" },
  { name: "Regina", lat: 50.4452, lon: -104.6189, province: "SK" },
  { name: "Winnipeg", lat: 49.8951, lon: -97.1384, province: "MB" },
  { name: "Thunder Bay", lat: 48.3809, lon: -89.2477, province: "ON" },
  { name: "Ottawa", lat: 45.4215, lon: -75.6972, province: "ON" },
  { name: "Toronto", lat: 43.6510, lon: -79.3470, province: "ON" },
  { name: "Sudbury", lat: 46.4917, lon: -80.9930, province: "ON" },
  { name: "Montreal", lat: 45.5019, lon: -73.5674, province: "QC" },
  { name: "Quebec City", lat: 46.8139, lon: -71.2080, province: "QC" },
  { name: "Halifax", lat: 44.6488, lon: -63.5752, province: "NS" },
  { name: "Whitehorse", lat: 60.7212, lon: -135.0568, province: "YT" },
  { name: "Yellowknife", lat: 62.4540, lon: -114.3718, province: "NT" },
  { name: "Prince George", lat: 53.9171, lon: -122.7497, province: "BC" },
  { name: "Victoria", lat: 48.4284, lon: -123.3656, province: "BC" },
  { name: "Smithers", lat: 54.7800, lon: -127.1743, province: "BC" },
  { name: "Dease Lake", lat: 58.4356, lon: -130.0089, province: "BC" },
  { name: "Fort St. John", lat: 56.2524, lon: -120.8466, province: "BC" },
  { name: "High Level", lat: 58.5169, lon: -117.1360, province: "AB" },
  { name: "Peace River", lat: 56.2333, lon: -117.2833, province: "AB" },
  { name: "La Ronge", lat: 55.1000, lon: -105.3000, province: "SK" },
  { name: "Flin Flon", lat: 54.7682, lon: -101.8779, province: "MB" },
  { name: "Churchill", lat: 58.7684, lon: -94.1650, province: "MB" },
  { name: "Moosonee", lat: 51.2794, lon: -80.6463, province: "ON" },
  { name: "Timmins", lat: 48.4758, lon: -81.3305, province: "ON" },
  { name: "Val-d'Or", lat: 48.1086, lon: -77.7972, province: "QC" },
  { name: "Chibougamau", lat: 49.9167, lon: -74.3667, province: "QC" },
  { name: "Schefferville", lat: 54.8000, lon: -66.8167, province: "QC" },
  { name: "Goose Bay", lat: 53.3019, lon: -60.3267, province: "NL" },
  { name: "St. John's", lat: 47.5615, lon: -52.7126, province: "NL" },
  { name: "Iqaluit", lat: 63.7467, lon: -68.5170, province: "NU" },
  { name: "Rankin Inlet", lat: 62.8090, lon: -92.0853, province: "NU" },
  { name: "Cambridge Bay", lat: 69.1167, lon: -105.0667, province: "NU" }
] as const;