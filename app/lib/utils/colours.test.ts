// utils/colours.test.ts
//
// NOTE: this suite previously asserted a real FWI-value color scale
// (getRiskColor(12) -> '#FF9800' /* High */, etc). That scale was replaced
// with the ML model's calibrated probability scale (0-1) at the 2026-09-28
// promotion decision (see docs/PREREGISTRATION.md in the backend repo,
// app/lib/fwi/tiers.ts's FALLBACK_TIERS) -- rewritten here against that
// contract. Values are chosen to sit clearly inside each tier's bounds
// (Very Low [0, 0.0000742), Low [0.0000742, 0.0008383), Moderate
// [0.0008383, 0.0105609), High [0.0105609, inf)) rather than on a boundary.
import { describe, it, expect } from '@jest/globals';
import { getRiskColor, getRiskLabel, getDangerClassInfo, formatFWI } from './colours';

describe('getRiskColor - Critical for map visualization', () => {
  it('should return the official tier color for each probability range', () => {
    expect(getRiskColor(0.00003)).toBe('#4CAF50'); // Very Low
    expect(getRiskColor(0.0003)).toBe('#8BC34A'); // Low
    expect(getRiskColor(0.003)).toBe('#FFEB3B'); // Moderate
    expect(getRiskColor(0.05)).toBe('#FF9800'); // High
  });

  it('should always return a valid hex color', () => {
    const color = getRiskColor(0.003);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should fall back to Very Low for invalid input', () => {
    expect(getRiskColor(NaN)).toBe('#4CAF50');
  });
});

describe('getRiskLabel - Critical for user understanding', () => {
  it('should return the official tier name for each probability range', () => {
    expect(getRiskLabel(0.00003)).toBe('Very Low');
    expect(getRiskLabel(0.0003)).toBe('Low');
    expect(getRiskLabel(0.003)).toBe('Moderate');
    expect(getRiskLabel(0.05)).toBe('High');
  });

  it('should return a non-empty string', () => {
    expect(getRiskLabel(0.003).length).toBeGreaterThan(0);
  });
});

describe('getDangerClassInfo', () => {
  it('should return the matching tier color, range, and description', () => {
    const info = getDangerClassInfo(0.003);
    expect(info.name).toBe('Moderate');
    expect(info.color).toBe('#FFEB3B');
    expect(info.fwiRange).toBe('0.084%–1.056%');
  });

  it('should format the top tier range with a "+" rather than a fixed max', () => {
    expect(getDangerClassInfo(0.05).fwiRange).toBe('1.056%+');
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
