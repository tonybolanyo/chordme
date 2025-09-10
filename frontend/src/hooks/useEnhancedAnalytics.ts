/**
 * React Hooks for Enhanced Performance Analytics
 * 
 * Provides React hooks for:
 * - Performance session tracking
 * - Problem section monitoring
 * - AI recommendations
 * - Privacy settings management
 * - Real-time analytics updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PerformanceSession,
  ProblemSection,
  PerformanceInsights,
  AIRecommendation,
  AnonymousUsageAnalytics,
  EnhancedAnalyticsPrivacySettings,
  StartSessionRequest,
  EndSessionRequest,
  RecordEventRequest,
  UsePerformanceSessionOptions,
  UsePerformanceSessionReturn,
  UsePerformanceInsightsOptions,
  UsePerformanceInsightsReturn,
  UseProblemSectionsOptions,
  UseProblemSectionsReturn
} from '../types/analytics';
import enhancedAnalyticsService from '../services/enhancedAnalyticsService';

/**
 * Hook for managing performance sessions
 */
export function usePerformanceSession(options: UsePerformanceSessionOptions = {}): UsePerformanceSessionReturn {
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<PerformanceSession | undefined>();
  const [error, setError] = useState<string | undefined>();
  
  const sessionRef = useRef<number | null>(null);

  const startSession = useCallback(async (sessionOptions?: UsePerformanceSessionOptions): Promise<number> => {
    try {
      setError(undefined);
      setIsTracking(true);
      
      const mergedOptions = { ...options, ...sessionOptions };
      const request: StartSessionRequest = {
        session_type: mergedOptions.sessionType || 'practice',
        song_id: mergedOptions.songId,
        setlist_id: mergedOptions.setlistId,
        device_type: getDeviceType(),
        analytics_consent: mergedOptions.analyticsConsent || false,
      };
      
      const newSessionId = await enhancedAnalyticsService.startPerformanceSession(request);
      setSessionId(newSessionId);
      sessionRef.current = newSessionId;
      
      return newSessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      setIsTracking(false);
      throw err;
    }
  }, [options]);

  const endSession = useCallback(async (endOptions?: EndSessionRequest): Promise<void> => {
    if (!sessionRef.current) {
      console.warn('No active session to end');
      return;
    }
    
    try {
      setError(undefined);
      await enhancedAnalyticsService.endPerformanceSession(sessionRef.current, endOptions);
      
      setSessionId(undefined);
      setIsTracking(false);
      setCurrentSession(undefined);
      sessionRef.current = null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const recordEvent = useCallback(async (event: RecordEventRequest): Promise<void> => {
    try {
      setError(undefined);
      await enhancedAnalyticsService.recordPerformanceEvent(sessionRef.current, event);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record event';
      setError(errorMessage);
      console.warn('Event recording failed:', errorMessage);
    }
  }, []);

  // Auto-start session if requested
  useEffect(() => {
    if (options.autoStart && !sessionRef.current) {
      startSession().catch(console.error);
    }
  }, [options.autoStart, startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        enhancedAnalyticsService.endPerformanceSession(sessionRef.current).catch(console.error);
      }
    };
  }, []);

  return {
    sessionId,
    isTracking,
    startSession,
    endSession,
    recordEvent,
    currentSession,
    error,
  };
}

/**
 * Hook for accessing performance insights
 */
export function usePerformanceInsights(options: UsePerformanceInsightsOptions = {}): UsePerformanceInsightsReturn {
  const [insights, setInsights] = useState<PerformanceInsights | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(undefined);
      
      const newInsights = await enhancedAnalyticsService.getPerformanceInsights(
        options.songId,
        options.periodDays || 30
      );
      
      setInsights(newInsights);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load insights';
      setError(errorMessage);
      console.error('Failed to load performance insights:', err);
    } finally {
      setLoading(false);
    }
  }, [options.songId, options.periodDays]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh if requested
  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(refresh, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, refresh]);

  return {
    insights,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}

/**
 * Hook for monitoring problem sections
 */
export function useProblemSections(options: UseProblemSectionsOptions = {}): UseProblemSectionsReturn {
  const [problemSections, setProblemSections] = useState<ProblemSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [totalCount, setTotalCount] = useState(0);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(undefined);
      
      const response = await enhancedAnalyticsService.getProblemSections(
        options.sessionId,
        options.songId,
        options.limit || 10
      );
      
      setProblemSections(response.problem_sections);
      setTotalCount(response.total_count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load problem sections';
      setError(errorMessage);
      console.error('Failed to load problem sections:', err);
    } finally {
      setLoading(false);
    }
  }, [options.sessionId, options.songId, options.limit]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh if requested
  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(refresh, 30 * 1000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, refresh]);

  return {
    problemSections,
    loading,
    error,
    refresh,
    totalCount,
  };
}

/**
 * Hook for managing analytics privacy settings
 */
export function useAnalyticsPrivacy() {
  const [settings, setSettings] = useState<EnhancedAnalyticsPrivacySettings | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(undefined);
      
      const privacySettings = await enhancedAnalyticsService.getPrivacySettings();
      setSettings(privacySettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load privacy settings';
      setError(errorMessage);
      console.error('Failed to load privacy settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<EnhancedAnalyticsPrivacySettings>): Promise<void> => {
    try {
      setLoading(true);
      setError(undefined);
      
      const response = await enhancedAnalyticsService.updatePrivacySettings(updates);
      setSettings(response.updated_settings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update privacy settings';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refresh: loadSettings,
  };
}

/**
 * Hook for anonymous usage analytics
 */
export function useAnonymousAnalytics(timePeriod: 'daily' | 'weekly' | 'monthly' = 'weekly') {
  const [analytics, setAnalytics] = useState<AnonymousUsageAnalytics | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(undefined);
      
      const data = await enhancedAnalyticsService.getAnonymousUsageAnalytics(timePeriod);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      console.error('Failed to load anonymous analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    analytics,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for auto-tracking audio element events
 */
export function useAudioTracking(audioElement: HTMLAudioElement | null, enabled: boolean = true) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!audioElement || !enabled) {
      return;
    }

    // Setup auto-tracking
    cleanupRef.current = enhancedAnalyticsService.setupAutoTracking(audioElement);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [audioElement, enabled]);

  return {
    isTracking: enabled && !!audioElement,
  };
}

/**
 * Hook for real-time performance metrics
 */
export function useRealTimeMetrics(sessionId?: number) {
  const [metrics, setMetrics] = useState({
    pauseCount: 0,
    rewindCount: 0,
    tempoChanges: 0,
    completionPercentage: 0,
    currentPosition: 0,
  });

  const updateMetrics = useCallback((updates: Partial<typeof metrics>) => {
    setMetrics(prev => ({ ...prev, ...updates }));
  }, []);

  const incrementPause = useCallback(() => {
    setMetrics(prev => ({ ...prev, pauseCount: prev.pauseCount + 1 }));
  }, []);

  const incrementRewind = useCallback(() => {
    setMetrics(prev => ({ ...prev, rewindCount: prev.rewindCount + 1 }));
  }, []);

  const incrementTempoChange = useCallback(() => {
    setMetrics(prev => ({ ...prev, tempoChanges: prev.tempoChanges + 1 }));
  }, []);

  const updatePosition = useCallback((position: number) => {
    setMetrics(prev => ({ ...prev, currentPosition: position }));
  }, []);

  const updateCompletion = useCallback((percentage: number) => {
    setMetrics(prev => ({ ...prev, completionPercentage: percentage }));
  }, []);

  // Reset metrics when session changes
  useEffect(() => {
    setMetrics({
      pauseCount: 0,
      rewindCount: 0,
      tempoChanges: 0,
      completionPercentage: 0,
      currentPosition: 0,
    });
  }, [sessionId]);

  return {
    metrics,
    updateMetrics,
    incrementPause,
    incrementRewind,
    incrementTempoChange,
    updatePosition,
    updateCompletion,
  };
}

/**
 * Hook for AI recommendations management
 */
export function useAIRecommendations(insights?: PerformanceInsights) {
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  
  const recommendations = insights?.ai_recommendations || [];
  
  const activeRecommendations = recommendations.filter(
    rec => !dismissedRecommendations.has(rec.type)
  );

  const dismissRecommendation = useCallback((recommendation: AIRecommendation) => {
    setDismissedRecommendations(prev => new Set([...prev, recommendation.type]));
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissedRecommendations(new Set());
  }, []);

  const getRecommendationsByPriority = useCallback((priority: 'high' | 'medium' | 'low') => {
    return activeRecommendations.filter(rec => rec.priority === priority);
  }, [activeRecommendations]);

  return {
    recommendations: activeRecommendations,
    dismissedCount: dismissedRecommendations.size,
    dismissRecommendation,
    clearDismissed,
    getRecommendationsByPriority,
  };
}

// Utility functions

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width <= 768) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return '#ef4444'; // red-500
    case 'medium': return '#f59e0b'; // amber-500
    case 'low': return '#10b981'; // emerald-500
    default: return '#6b7280'; // gray-500
  }
}

export function getSeverityColor(severity: number): string {
  if (severity >= 4) return '#ef4444'; // red-500 - high severity
  if (severity >= 2.5) return '#f59e0b'; // amber-500 - medium severity
  return '#10b981'; // emerald-500 - low severity
}

export function formatTrendDirection(direction: string): { text: string; color: string } {
  switch (direction) {
    case 'improving':
      return { text: 'Improving', color: '#10b981' };
    case 'declining':
      return { text: 'Declining', color: '#ef4444' };
    case 'stable':
      return { text: 'Stable', color: '#6b7280' };
    case 'variable':
      return { text: 'Variable', color: '#f59e0b' };
    case 'reducing':
      return { text: 'Reducing', color: '#10b981' };
    case 'increasing':
      return { text: 'Increasing', color: '#ef4444' };
    default:
      return { text: direction, color: '#6b7280' };
  }
}