// utils/colors.test.ts
import { describe, it, expect } from '@jest/globals';
import { getRiskColor, getRiskLabel } from './colours';

describe('getRiskColor - Critical for map visualization', () => {
  it('should return correct colors for each risk level', () => {
    expect(getRiskColor(0.85)).toBe('#d32f2f'); // Very High - Red
    expect(getRiskColor(0.65)).toBe('#f57c00'); // High - Orange
    expect(getRiskColor(0.45)).toBe('#fbc02d'); // Medium - Yellow
    expect(getRiskColor(0.25)).toBe('#689f38'); // Low - Light Green
    expect(getRiskColor(0.15)).toBe('#388e3c'); // Very Low - Dark Green
  });

  it('should always return a valid hex color', () => {
    const color = getRiskColor(0.5);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('getRiskLabel - Critical for user understanding', () => {
  it('should return correct labels', () => {
    // Just check the label exists and contains the right risk level
    const highLabel = getRiskLabel(0.85);
    expect(highLabel).toContain('Very High');
    
    const mediumLabel = getRiskLabel(0.45);
    expect(mediumLabel).toContain('Medium');
    
    const lowLabel = getRiskLabel(0.15);
    expect(lowLabel).toContain('Very Low');
  });

  it('should return a non-empty string', () => {
    expect(getRiskLabel(0.5).length).toBeGreaterThan(0);
  });
});