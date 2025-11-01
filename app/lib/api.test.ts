import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FireRiskAPI, ApiError } from './api';

global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('FireRiskAPI - Critical for data fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFireRiskPredictions', () => {
    it('should successfully fetch and transform fire risk data', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            lat: 51.0447,
            lon: -114.0719,
            location_name: 'Calgary',
            province: 'AB',
            daily_fire_risk: 0.45,
            danger_class: 'Moderate',
            color_code: '#FFEB3B',
            weather_features: {
              temperature: 20,
              humidity: 45,
              wind_speed: 12,
              pressure: 1013,
              fire_danger_index: 5.2
            },
            model_confidence: 0.95
          }
        ],
        model_info: {},
        timestamp: '2025-01-01T12:00:00Z',
        last_updated: '2025-01-01T12:00:00Z'
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await FireRiskAPI.getFireRiskPredictions();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].location).toBe('Calgary');
      expect(result.data[0].riskLevel).toBe(0.45);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(FireRiskAPI.getFireRiskPredictions()).rejects.toThrow(ApiError);
    });

    it('should filter out invalid risk levels', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            lat: 51.0447,
            lon: -114.0719,
            location_name: 'Valid',
            province: 'AB',
            daily_fire_risk: 0.45,
            danger_class: 'Moderate',
            weather_features: {},
            model_confidence: 0.95
          },
          {
            lat: 49.2827,
            lon: -123.1207,
            location_name: 'Invalid',
            province: 'BC',
            daily_fire_risk: 1.5,
            danger_class: 'High',
            weather_features: {},
            model_confidence: 0.95
          }
        ],
        model_info: {},
        timestamp: '2025-01-01T12:00:00Z',
        last_updated: '2025-01-01T12:00:00Z'
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await FireRiskAPI.getFireRiskPredictions();
      expect(result.data.length).toBeLessThan(2);
    });
  });
});

describe('ApiError', () => {
  it('should create error with correct properties', () => {
    const error = new ApiError('TEST_ERROR', 'Test message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
  });
});