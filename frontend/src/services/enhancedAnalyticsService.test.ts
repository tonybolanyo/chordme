/**
 * Tests for Enhanced Analytics Service (Frontend)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import enhancedAnalyticsService from '../services/enhancedAnalyticsService';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true
});

describe('EnhancedAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('Session Management', () => {
    it('should start a performance session', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            session_id: 123,
            message: 'Session started successfully'
          }
        })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const sessionId = await enhancedAnalyticsService.startPerformanceSession({
        session_type: 'practice',
        song_id: 1,
        analytics_consent: true
      });

      expect(sessionId).toBe(123);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/performance/sessions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify({
            session_type: 'practice',
            song_id: 1,
            analytics_consent: true
          })
        })
      );
    });

    it('should record performance events', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { message: 'Event recorded' } })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await enhancedAnalyticsService.recordPerformanceEvent(123, {
        event_type: 'pause',
        position_seconds: 30.5,
        chord_at_position: 'G'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/performance/sessions/123/events',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            event_type: 'pause',
            position_seconds: 30.5,
            chord_at_position: 'G'
          })
        })
      );
    });

    it('should end a performance session', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { message: 'Session ended' } })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await enhancedAnalyticsService.endPerformanceSession(123, {
        completion_percentage: 85.0,
        session_rating: 4
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/performance/sessions/123/end',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            completion_percentage: 85.0,
            session_rating: 4
          })
        })
      );
    });
  });

  describe('Analytics Retrieval', () => {
    it('should get performance insights', async () => {
      const mockInsights = {
        user_id: 1,
        summary_metrics: {
          total_sessions: 5,
          average_completion_rate: 85.0
        },
        ai_recommendations: []
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ data: mockInsights })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const insights = await enhancedAnalyticsService.getPerformanceInsights(1, 30);

      expect(insights).toEqual(mockInsights);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/performance/insights?song_id=1&period_days=30',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should get problem sections', async () => {
      const mockProblemSections = {
        problem_sections: [
          {
            id: 1,
            problem_type: 'frequent_pauses',
            severity_score: 3.5,
            suggested_improvements: ['Practice at slower tempo']
          }
        ],
        total_count: 1
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ data: mockProblemSections })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await enhancedAnalyticsService.getProblemSections(123);

      expect(result).toEqual(mockProblemSections);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/performance/problem-sections?session_id=123&limit=10',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('Privacy Controls', () => {
    it('should get privacy settings', async () => {
      const mockSettings = {
        anonymous_only: true,
        analytics_consent: false,
        data_retention_days: 30
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ data: mockSettings })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const settings = await enhancedAnalyticsService.getPrivacySettings();

      expect(settings).toEqual(mockSettings);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/performance/privacy/settings',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should update privacy settings', async () => {
      const mockUpdatedSettings = {
        anonymous_only: false,
        analytics_consent: true
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            message: 'Settings updated',
            updated_settings: mockUpdatedSettings
          }
        })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await enhancedAnalyticsService.updatePrivacySettings(mockUpdatedSettings);

      expect(result.updated_settings).toEqual(mockUpdatedSettings);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/performance/privacy/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockUpdatedSettings)
        })
      );
    });
  });

  describe('Offline Support', () => {
    it('should queue events when offline', async () => {
      // Simulate offline
      Object.defineProperty(window.navigator, 'onLine', {
        value: false
      });

      await enhancedAnalyticsService.recordPerformanceEvent(123, {
        event_type: 'pause',
        position_seconds: 10.0
      });

      // Should not make network request when offline
      expect(mockFetch).not.toHaveBeenCalled();

      // Should have pending events
      expect(enhancedAnalyticsService.hasPendingEvents()).toBe(true);
    });

    it('should process queued events when back online', async () => {
      // Setup service with current session
      await enhancedAnalyticsService.startPerformanceSession({
        session_type: 'practice'
      });

      // Go offline and queue events
      Object.defineProperty(window.navigator, 'onLine', {
        value: false
      });

      await enhancedAnalyticsService.recordPerformanceEvent(null, {
        event_type: 'pause',
        position_seconds: 10.0
      });

      // Go back online
      Object.defineProperty(window.navigator, 'onLine', {
        value: true
      });

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { message: 'Event recorded' } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Process queue
      await enhancedAnalyticsService.forceProcessQueue();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          code: 'INVALID_INPUT',
          message: 'Invalid session type'
        })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(
        enhancedAnalyticsService.startPerformanceSession({
          session_type: 'invalid_type' as unknown
        })
      ).rejects.toThrow('Invalid session type');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        enhancedAnalyticsService.getPerformanceInsights()
      ).rejects.toThrow('Network error');
    });
  });

  describe('Utility Methods', () => {
    it('should provide convenient event recording methods', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { message: 'Event recorded' } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Test convenience methods
      await enhancedAnalyticsService.recordPause(30.0, 'G', 'verse');
      await enhancedAnalyticsService.recordPlay(35.0);
      await enhancedAnalyticsService.recordRewind(40.0, 30.0);
      await enhancedAnalyticsService.recordTempoChange(45.0, 120);

      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      // Verify the last call (tempo change)
      const lastCall = mockFetch.mock.calls[3];
      const body = JSON.parse(lastCall[1].body);
      expect(body.event_type).toBe('tempo_change');
      expect(body.position_seconds).toBe(45.0);
      expect(body.tempo_bpm).toBe(120);
    });
  });
});