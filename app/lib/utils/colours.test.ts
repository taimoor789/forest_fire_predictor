// utils/colours.test.ts
//
// NOTE: this suite previously asserted a 0-1 probability color scale
// (getRiskColor(0.85) -> '#d32f2f', etc). That scale was abandoned when the
// app moved to real FWI values (0-100+, see app/lib/fwi/tiers.ts) and the
// test was never updated, so it had been failing independently of this
// change. Rewritten here against the real FWI-scale contract.
import { describe, it, expect } from '@jest/globals';
import { getRiskColor, getRiskLabel, getDangerClassInfo, formatFWI } from './colours';

describe('getRiskColor - Critical for map visualization', () => {
  it('should return the official tier color for each FWI range', () => {
    expect(getRiskColor(1)).toBe('#4CAF50'); // Very Low
    expect(getRiskColor(3)).toBe('#8BC34A'); // Low
    expect(getRiskColor(6)).toBe('#FFEB3B'); // Moderate
    expect(getRiskColor(12)).toBe('#FF9800'); // High
    expect(getRiskColor(24)).toBe('#F44336'); // Very High
    expect(getRiskColor(35)).toBe('#9C27B0'); // Extreme
  });

  it('should always return a valid hex color', () => {
    const color = getRiskColor(10);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should fall back to Very Low for invalid input', () => {
    expect(getRiskColor(NaN)).toBe('#4CAF50');
  });
});

describe('getRiskLabel - Critical for user understanding', () => {
  it('should return the official tier name for each FWI range', () => {
    expect(getRiskLabel(1)).toBe('Very Low');
    expect(getRiskLabel(3)).toBe('Low');
    expect(getRiskLabel(6)).toBe('Moderate');
    expect(getRiskLabel(12)).toBe('High');
    expect(getRiskLabel(24)).toBe('Very High');
    expect(getRiskLabel(35)).toBe('Extreme');
  });

  it('should return a non-empty string', () => {
    expect(getRiskLabel(10).length).toBeGreaterThan(0);
  });
});

describe('getDangerClassInfo', () => {
  it('should return the matching tier color, range, and description', () => {
    const info = getDangerClassInfo(12);
    expect(info.name).toBe('High');
    expect(info.color).toBe('#FF9800');
    expect(info.fwiRange).toBe('8–18');
  });

  it('should format the top tier range with a "+" rather than a fixed max', () => {
    expect(getDangerClassInfo(40).fwiRange).toBe('30+');
  });
});

describe('formatFWI', () => {
  it('should format to one decimal place', () => {
    expect(formatFWI(5.2345)).toBe('5.2');
  });

  it('should fall back to "0.0" for invalid input', () => {
    expect(formatFWI(NaN)).toBe('0.0');
  });
});
