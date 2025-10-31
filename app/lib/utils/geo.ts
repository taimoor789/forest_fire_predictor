/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Starting latitude
 * @param lon1 - Starting longitude
 * @param lat2 - Ending latitude
 * @param lon2 - Ending longitude
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if a point is within Canada's approximate boundaries
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns True if point is within Canada
 */
export const isInCanada = (lat: number, lon: number): boolean => {
  return lat >= 41.5 && lat <= 83.6 && lon >= -141.1 && lon <= -52.5;
};

/**
 * Convert decimal degrees to a readable coordinate string
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Formatted coordinate string
 */
export const formatCoordinates = (lat: number, lon: number): string => {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};