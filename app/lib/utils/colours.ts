/**
 * Risk level thresholds (normalized 0-1)
 */
export const RISK_THRESHOLDS = {
  VERY_HIGH: 0.8,
  HIGH: 0.6,
  MEDIUM: 0.4,
  LOW: 0.2,
  VERY_LOW: 0.0
} as const;

export const RISK_COLORS = {
  VERY_HIGH: '#d32f2f',
  HIGH: '#f57c00',
  MEDIUM: '#fbc02d',
  LOW: '#689f38',
  VERY_LOW: '#388e3c'
} as const;

/**
 * Get color for a risk level
 * @param riskLevel - Risk level (0-1)
 * @returns Hex color code
 */
export const getRiskColor = (riskLevel: number): string => {
  if (riskLevel >= RISK_THRESHOLDS.VERY_HIGH) return RISK_COLORS.VERY_HIGH;
  if (riskLevel >= RISK_THRESHOLDS.HIGH) return RISK_COLORS.HIGH;
  if (riskLevel >= RISK_THRESHOLDS.MEDIUM) return RISK_COLORS.MEDIUM;
  if (riskLevel >= RISK_THRESHOLDS.LOW) return RISK_COLORS.LOW;
  return RISK_COLORS.VERY_LOW;
};

/**
 * Get risk level label for a given risk value
 * @param riskLevel - Risk level (0-1)
 * @returns Risk level label (e.g., "Very High", "Low")
 */
export const getRiskLabel = (riskLevel: number): string => {
  if (riskLevel >= RISK_THRESHOLDS.VERY_HIGH) return 'Very High';
  if (riskLevel >= RISK_THRESHOLDS.HIGH) return 'High';
  if (riskLevel >= RISK_THRESHOLDS.MEDIUM) return 'Medium';
  if (riskLevel >= RISK_THRESHOLDS.LOW) return 'Low';
  return 'Very Low';
};

/**
 * Get risk level with percentage
 * @param riskLevel - Risk level (0-1)
 * @returns Risk level label with percentage (e.g., "High (75%)")
 */
export const getRiskLabelWithPercent = (riskLevel: number): string => {
  const percentage = Math.round(riskLevel * 100);
  const label = getRiskLabel(riskLevel);
  return `${label} (${percentage}%)`;
};

/**
 * Get abbreviated risk level for compact display
 * @param riskLevel - Risk level (0-1)
 * @returns Abbreviated label (e.g., "V.HIGH", "LOW")
 */
export const getRiskLabelAbbrev = (riskLevel: number): string => {
  if (riskLevel >= RISK_THRESHOLDS.VERY_HIGH) return 'V.HIGH';
  if (riskLevel >= RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (riskLevel >= RISK_THRESHOLDS.MEDIUM) return 'MED';
  if (riskLevel >= RISK_THRESHOLDS.LOW) return 'LOW';
  return 'V.LOW';
};