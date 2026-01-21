/**
 * Official FWI Danger Classes (from Natural Resources Canada):
 * - Very Low:  FWI 0-2
 * - Low:       FWI 2-4
 * - Moderate:  FWI 4-8
 * - High:      FWI 8-18
 * - Very High: FWI 18-30
 * - Extreme:   FWI 30+
 */


export function getRiskColor(fwi: number): string {
  // Sanitize input
  if (typeof fwi !== 'number' || isNaN(fwi)) {
    return '#4CAF50'; // Default to Very Low (green)
  }

  // Official FWI color thresholds
  if (fwi < 2) {
    return '#4CAF50'; // Very Low - Green
  } else if (fwi < 4) {
    return '#8BC34A'; // Low - Light Green
  } else if (fwi < 8) {
    return '#FFEB3B'; // Moderate - Yellow
  } else if (fwi < 18) {
    return '#FF9800'; // High - Orange
  } else if (fwi < 30) {
    return '#F44336'; // Very High - Red
  } else {
    return '#9C27B0'; // Extreme - Purple
  }
}

/**
 * Get danger class label based on FWI value
 * 
 * @param fwi - Fire Weather Index value (0-100+)
 * @returns Official danger class name
 */
export function getRiskLabel(fwi: number): string {
  // Sanitize input
  if (typeof fwi !== 'number' || isNaN(fwi)) {
    return 'Very Low';
  }

  // Official FWI danger classes
  if (fwi < 2) {
    return 'Very Low';
  } else if (fwi < 4) {
    return 'Low';
  } else if (fwi < 8) {
    return 'Moderate';
  } else if (fwi < 18) {
    return 'High';
  } else if (fwi < 30) {
    return 'Very High';
  } else {
    return 'Extreme';
  }
}

/**
 * Get detailed danger class information
 * 
 * @param fwi - Fire Weather Index value (0-100+)
 * @returns Object with danger class details
 */
export function getDangerClassInfo(fwi: number): {
  name: string;
  color: string;
  fwiRange: string;
  description: string;
} {
  if (fwi < 2) {
    return {
      name: 'Very Low',
      color: '#4CAF50',
      fwiRange: '0-2',
      description: 'Fuels will not ignite readily from small firebrands'
    };
  } else if (fwi < 4) {
    return {
      name: 'Low',
      color: '#8BC34A',
      fwiRange: '2-4',
      description: 'Fires start easily and spread at low to moderate rates'
    };
  } else if (fwi < 8) {
    return {
      name: 'Moderate',
      color: '#FFEB3B',
      fwiRange: '4-8',
      description: 'Fires start easily and spread at moderate rates'
    };
  } else if (fwi < 18) {
    return {
      name: 'High',
      color: '#FF9800',
      fwiRange: '8-18',
      description: 'High fire intensity with serious control problems'
    };
  } else if (fwi < 30) {
    return {
      name: 'Very High',
      color: '#F44336',
      fwiRange: '18-30',
      description: 'Very intense fires with rapid spread'
    };
  } else {
    return {
      name: 'Extreme',
      color: '#9C27B0',
      fwiRange: '30+',
      description: 'Extremely intense, fast-moving fires'
    };
  }
}

/**
 * Format FWI value for display
 * 
 * @param fwi - Fire Weather Index value (0-100+)
 * @returns Formatted string (e.g., "5.2" or "18.4")
 */
export function formatFWI(fwi: number): string {
  if (typeof fwi !== 'number' || isNaN(fwi)) {
    return '0.0';
  }
  
  // Round to 1 decimal place
  return fwi.toFixed(1);
}

/**
 * Get all danger class definitions
 * Useful for legends and documentation
 */
export const DANGER_CLASSES = [
  {
    name: 'Very Low',
    fwiMin: 0,
    fwiMax: 2,
    color: '#4CAF50',
    description: 'Fuels will not ignite readily'
  },
  {
    name: 'Low',
    fwiMin: 2,
    fwiMax: 4,
    color: '#8BC34A',
    description: 'Fires start easily, spread slowly'
  },
  {
    name: 'Moderate',
    fwiMin: 4,
    fwiMax: 8,
    color: '#FFEB3B',
    description: 'Fires start easily, moderate spread'
  },
  {
    name: 'High',
    fwiMin: 8,
    fwiMax: 18,
    color: '#FF9800',
    description: 'High intensity, serious control problems'
  },
  {
    name: 'Very High',
    fwiMin: 18,
    fwiMax: 30,
    color: '#F44336',
    description: 'Very intense fires, rapid spread'
  },
  {
    name: 'Extreme',
    fwiMin: 30,
    fwiMax: 100,
    color: '#9C27B0',
    description: 'Extremely intense, fast-moving fires'
  }
] as const;

/**
 * Get statistics summary based on FWI values
 * 
 * @param fwiValues - Array of FWI values
 * @returns Statistics object
 */
export function getFWIStatistics(fwiValues: number[]): {
  veryLow: number;
  low: number;
  moderate: number;
  high: number;
  veryHigh: number;
  extreme: number;
  total: number;
  average: number;
  max: number;
  min: number;
} {
  const valid = fwiValues.filter(v => typeof v === 'number' && !isNaN(v));
  
  return {
    veryLow: valid.filter(v => v < 2).length,
    low: valid.filter(v => v >= 2 && v < 4).length,
    moderate: valid.filter(v => v >= 4 && v < 8).length,
    high: valid.filter(v => v >= 8 && v < 18).length,
    veryHigh: valid.filter(v => v >= 18 && v < 30).length,
    extreme: valid.filter(v => v >= 30).length,
    total: valid.length,
    average: valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0,
    max: valid.length > 0 ? Math.max(...valid) : 0,
    min: valid.length > 0 ? Math.min(...valid) : 0
  };
}