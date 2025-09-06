/**
 * Tests for Analytics Service
 * 
 * Tests the frontend analytics service functionality,
 * API communication, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import analyticsService from './analyticsService';
import {
  SetlistAnalytics,
  SongAnalytics,
  PerformanceRecommendations,
  PopularSongsData,
  SetlistComparison,
  AnalyticsExportData,
} from '../../types/analytics';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AnalyticsService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    
    // Mock environment variable
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5000');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Authentication', () => {
    it('should include authorization headers in requests', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: { setlist_id: 1, total_performances: 5 }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await analyticsService.getSetlistAnalytics(1);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/setlists/1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          })
        })
      );
    });

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: { setlist_id: 1 }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await analyticsService.getSetlistAnalytics(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': '',
          })
        })
      );
    });
  });

  describe('Setlist Analytics', () => {
    it('should fetch setlist analytics successfully', async () => {
      const mockData: SetlistAnalytics = {
        setlist_id: 1,
        setlist_name: 'Test Setlist',
        total_performances: 5,
        average_rating: 4.2,
        average_duration: 65,
        most_performed_songs: [],
        performance_trends: { by_month: [] },
        audience_feedback: {},
        timing_analysis: { total_songs: 10 },
        generated_at: '2023-12-01T00:00:00Z'
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: mockData
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.getSetlistAnalytics(1);

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/setlists/1',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle setlist analytics errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          status: 'error',
          message: 'Access denied'
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(analyticsService.getSetlistAnalytics(1))
        .rejects.toThrow('Access denied. You do not have permission to view this data.');
    });
  });

  describe('Song Analytics', () => {
    it('should fetch song analytics successfully', async () => {
      const mockData: SongAnalytics = {
        song_id: 1,
        song_title: 'Test Song',
        total_performances: 3,
        average_rating: 4.5,
        key_distribution: { 'C': 2, 'G': 1 },
        response_distribution: { 'excellent': 2, 'good': 1 },
        performance_trend: [],
        generated_at: '2023-12-01T00:00:00Z'
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: mockData
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.getSongAnalytics(1);

      expect(result).toEqual(mockData);
    });
  });

  describe('Recommendations', () => {
    it('should fetch recommendations with default limit', async () => {
      const mockData: PerformanceRecommendations = {
        high_performing_songs: [],
        optimal_durations: { duration_analysis: {} },
        trending_combinations: [],
        timing_recommendations: {
          average_performance_duration: 60,
          recommended_preparation_time: 30,
          recommended_break_frequency: 'Every 20-25 minutes',
          optimal_song_count: 15
        },
        generated_at: '2023-12-01T00:00:00Z'
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: mockData
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.getRecommendations();

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/recommendations?limit=10',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should fetch recommendations with custom limit', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {}
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await analyticsService.getRecommendations(5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.any(Object)
      );
    });
  });

  describe('Popular Songs', () => {
    it('should fetch popular songs with default parameters', async () => {
      const mockData: PopularSongsData = {
        timeframe: '30d',
        popular_songs: [],
        trending_songs: [],
        total_songs: 0,
        generated_at: '2023-12-01T00:00:00Z'
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: mockData
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.getPopularSongs();

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('timeframe=30d&scope=user&limit=20'),
        expect.any(Object)
      );
    });

    it('should fetch popular songs with custom parameters', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {}
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await analyticsService.getPopularSongs('7d', 'public', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('timeframe=7d&scope=public&limit=10'),
        expect.any(Object)
      );
    });
  });

  describe('Setlist Comparison', () => {
    it('should compare setlists successfully', async () => {
      const mockData: SetlistComparison = {
        setlists: [
          {
            setlist_id: 1,
            name: 'Setlist 1',
            total_performances: 5,
            songs_count: 10
          },
          {
            setlist_id: 2,
            name: 'Setlist 2',
            total_performances: 3,
            songs_count: 8
          }
        ],
        insights: ['Setlist 1 has more performances'],
        generated_at: '2023-12-01T00:00:00Z'
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: mockData
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.compareSetlists([1, 2]);

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/compare',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ setlist_ids: [1, 2] })
        })
      );
    });
  });

  describe('Data Export', () => {
    it('should export analytics data with consent', async () => {
      const mockData: AnalyticsExportData = {
        export_type: 'comprehensive',
        format: 'json',
        user_id: 1,
        generated_at: '2023-12-01T00:00:00Z',
        data: {}
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: mockData
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.exportAnalytics('comprehensive', 'json', true);

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/export',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            export_type: 'comprehensive',
            format: 'json',
            privacy_consent: true
          })
        })
      );
    });

    it('should reject export without consent', async () => {
      await expect(analyticsService.exportAnalytics('comprehensive', 'json', false))
        .rejects.toThrow('Privacy consent is required for data export');
    });
  });

  describe('Privacy Settings', () => {
    it('should fetch privacy settings', async () => {
      const mockData = {
        privacy_settings: {
          collect_performance_data: true,
          include_in_trends: true,
          allow_recommendations: true,
          data_retention_days: 365,
          export_allowed: true
        },
        gdpr_rights: {
          access: 'View all collected data',
          rectification: 'Correct inaccurate data',
          erasure: 'Delete personal data',
          portability: 'Export data in machine-readable format',
          restriction: 'Limit data processing',
          objection: 'Object to data processing'
        }
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: mockData
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.getPrivacySettings();

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/privacy/settings',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should update privacy settings', async () => {
      const settingsUpdate = {
        collect_performance_data: false,
        data_retention_days: 90
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: { updated_settings: settingsUpdate }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.updatePrivacySettings(settingsUpdate);

      expect(result.updated_settings).toEqual(settingsUpdate);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/privacy/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(settingsUpdate)
        })
      );
    });
  });

  describe('Data Deletion', () => {
    it('should delete analytics data with proper confirmation', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {
            deleted_items: ['Performance analytics data'],
            deletion_date: '2023-12-01T00:00:00Z',
            compliance_note: 'Deletion performed per GDPR Article 17'
          }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.deleteAnalyticsData(
        'all',
        'I understand this action cannot be undone'
      );

      expect(result.deleted_items).toContain('Performance analytics data');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/data/delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            confirmation: 'I understand this action cannot be undone',
            delete_type: 'all'
          })
        })
      );
    });

    it('should reject deletion without proper confirmation', async () => {
      await expect(analyticsService.deleteAnalyticsData('all', 'wrong confirmation'))
        .rejects.toThrow('Explicit confirmation required for data deletion');
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting errors', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          message: 'Rate limit exceeded. Please try again later.'
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(analyticsService.getSetlistAnalytics(1))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle 404 errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: () => Promise.resolve({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(analyticsService.getSetlistAnalytics(1))
        .rejects.toThrow('Analytics data not found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(analyticsService.getSetlistAnalytics(1))
        .rejects.toThrow('Network error');
    });

    it('should handle malformed API responses', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'error',
          message: 'Invalid request'
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(analyticsService.getSetlistAnalytics(1))
        .rejects.toThrow('Invalid request');
    });
  });

  describe('Data Validation', () => {
    it('should validate data for privacy compliance', () => {
      const safeData = {
        song_id: 1,
        title: 'Test Song',
        performance_count: 5
      };

      expect(analyticsService.validateDataPrivacy(safeData)).toBe(true);
    });

    it('should detect sensitive data', () => {
      const unsafeData = {
        song_id: 1,
        title: 'Test Song',
        user_email: 'test@example.com'  // Sensitive field
      };

      expect(analyticsService.validateDataPrivacy(unsafeData)).toBe(false);
    });

    it('should handle nested objects', () => {
      const nestedUnsafeData = {
        song: {
          id: 1,
          title: 'Test Song'
        },
        user: {
          full_name: 'John Doe'  // Sensitive field
        }
      };

      expect(analyticsService.validateDataPrivacy(nestedUnsafeData)).toBe(false);
    });
  });

  describe('Analytics Availability', () => {
    it('should check analytics availability', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.checkAnalyticsAvailability();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/analytics/privacy/settings',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle analytics unavailability', async () => {
      const mockResponse = {
        ok: false,
        status: 403
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await analyticsService.checkAnalyticsAvailability();

      expect(result).toBe(false);
    });
  });
});