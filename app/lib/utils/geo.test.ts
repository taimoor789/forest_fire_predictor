// utils/geo.test.ts
import { describe, it, expect } from '@jest/globals';
import { calculateDistance } from './geo';

describe('calculateDistance - Critical for nearest station logic', () => {
  it('should calculate distance between Calgary and Vancouver', () => {
    const distance = calculateDistance(51.0447, -114.0719, 49.2827, -123.1207);
    expect(distance).toBeGreaterThan(600);
    expect(distance).toBeLessThan(700);
  });

  it('should return 0 for same location', () => {
    const distance = calculateDistance(45.5, -73.5, 45.5, -73.5);
    expect(distance).toBe(0);
  });

  it('should not return NaN or Infinity', () => {
    const distance = calculateDistance(51.0447, -114.0719, 49.2827, -123.1207);
    expect(isNaN(distance)).toBe(false);
    expect(isFinite(distance)).toBe(true);
  });
});