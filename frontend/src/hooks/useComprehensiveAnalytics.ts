/**
 * React Hook for Comprehensive Analytics Dashboard
 * 
 * Provides a unified interface for all analytics types including:
 * - User activity analytics with time-series data
 * - Song and chord progression popularity tracking
 * - Collaboration session analytics and patterns
 * - Performance mode usage statistics
 * - Real-time dashboard updates
 * - Customizable widget management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ComprehensiveDashboardData,
  UserActivityAnalytics,
  SongPopularityAnalytics,
  CollaborationPatternsAnalytics,
  WidgetConfig,
  AnalyticsTimeframe,
  DashboardWidget,
  AnalyticsExportConfig
} from '../types/analytics';
import { webSocketService } from '../services/webSocketService';

// Types for the comprehensive analytics hook
export interface UseComprehensiveAnalyticsOptions {
  timeframe?: AnalyticsTimeframe;
  includeAnonymous?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

export interface UseComprehensiveAnalyticsReturn {
  // Data
  dashboardData: ComprehensiveDashboardData | null;
  userActivity: UserActivityAnalytics | null;
  songPopularity: SongPopularityAnalytics | null;
  collaborationPatterns: CollaborationPatternsAnalytics | null;
  
  // Widget management
  widgetConfig: WidgetConfig | null;
  availableWidgets: DashboardWidget[];
  updateWidgetConfig: (config: Partial<WidgetConfig>) => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isRealTimeConnected: boolean;
  
  // Actions
  refresh: () => Promise<void>;
  setTimeframe: (timeframe: AnalyticsTimeframe) => void;
  exportData: (config: AnalyticsExportConfig) => Promise<unknown>;
  
  // Real-time updates
  subscribeToRealTimeUpdates: () => void;
  unsubscribeFromRealTimeUpdates: () => void;
}

/**
 * Comprehensive analytics dashboard hook
 */
export function useComprehensiveAnalytics(
  options: UseComprehensiveAnalyticsOptions = {}
): UseComprehensiveAnalyticsReturn {
  // State management
  const [dashboardData, setDashboardData] = useState<ComprehensiveDashboardData | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivityAnalytics | null>(null);
  const [songPopularity, setSongPopularity] = useState<SongPopularityAnalytics | null>(null);
  const [collaborationPatterns, setCollaborationPatterns] = useState<CollaborationPatternsAnalytics | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [availableWidgets, setAvailableWidgets] = useState<DashboardWidget[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>(options.timeframe || '30d');
  const [includeAnonymous, _setIncludeAnonymous] = useState(options.includeAnonymous || false);
  
  // Refs for cleanup and intervals
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realTimeSubscriptionRef = useRef<(() => void) | null>(null);
  
  // API service
  const apiService = {
    async fetchDashboardData(): Promise<ComprehensiveDashboardData> {
      const params = new URLSearchParams({
        timeframe,
        include_anonymous: includeAnonymous.toString()
      });
      
      const response = await fetch(`/api/v1/analytics/comprehensive/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    },
    
    async fetchUserActivity(): Promise<UserActivityAnalytics> {
      const params = new URLSearchParams({
        timeframe,
        granularity: 'daily'
      });
      
      const response = await fetch(`/api/v1/analytics/comprehensive/user-activity?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user activity: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    },
    
    async fetchSongPopularity(): Promise<SongPopularityAnalytics> {
      const params = new URLSearchParams({
        timeframe,
        limit: '20',
        include_chords: 'true'
      });
      
      const response = await fetch(`/api/v1/analytics/comprehensive/song-popularity?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch song popularity: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    },
    
    async fetchCollaborationPatterns(): Promise<CollaborationPatternsAnalytics> {
      const params = new URLSearchParams({
        timeframe
      });
      
      const response = await fetch(`/api/v1/analytics/comprehensive/collaboration-patterns?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch collaboration patterns: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    },
    
    async fetchWidgetConfig(): Promise<{ widgetConfig: WidgetConfig; availableWidgets: DashboardWidget[] }> {
      const response = await fetch('/api/v1/analytics/comprehensive/widgets/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch widget config: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    },
    
    async updateWidgetConfig(config: Partial<WidgetConfig>): Promise<WidgetConfig> {
      const response = await fetch('/api/v1/analytics/comprehensive/widgets/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update widget config: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data.widget_config;
    },
    
    async exportData(config: AnalyticsExportConfig): Promise<unknown> {
      const response = await fetch('/api/v1/analytics/comprehensive/export/comprehensive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          export_config: config,
          privacy_consent: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    }
  };
  
  // Fetch all analytics data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch dashboard data and widget config in parallel
      const [dashboardResult, widgetResult] = await Promise.all([
        apiService.fetchDashboardData(),
        apiService.fetchWidgetConfig()
      ]);
      
      setDashboardData(dashboardResult);
      setWidgetConfig(widgetResult.widgetConfig);
      setAvailableWidgets(widgetResult.availableWidgets);
      
      // Extract individual analytics from dashboard data
      if (dashboardResult.user_activity) {
        setUserActivity(dashboardResult.user_activity);
      }
      if (dashboardResult.song_popularity) {
        setSongPopularity(dashboardResult.song_popularity);
      }
      if (dashboardResult.collaboration_patterns) {
        setCollaborationPatterns(dashboardResult.collaboration_patterns);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(errorMessage);
      console.error('Error fetching comprehensive analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, includeAnonymous]);
  
  // Refresh function
  const refresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);
  
  // Update widget configuration
  const updateWidgetConfig = useCallback(async (config: Partial<WidgetConfig>) => {
    try {
      const updatedConfig = await apiService.updateWidgetConfig(config);
      setWidgetConfig(updatedConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update widget config';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  // Export data function
  const exportData = useCallback(async (config: AnalyticsExportConfig) => {
    try {
      return await apiService.exportData(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  // Real-time updates management
  const subscribeToRealTimeUpdates = useCallback(() => {
    if (!webSocketService || realTimeSubscriptionRef.current) {
      return;
    }
    
    const handleAnalyticsUpdate = (data: unknown) => {
      // Handle real-time analytics updates
      if (data.type === 'analytics_update') {
        // Refresh specific sections based on update type
        if (data.section === 'user_activity') {
          apiService.fetchUserActivity().then(setUserActivity).catch(console.error);
        } else if (data.section === 'performance_stats') {
          // Refresh dashboard data
          refresh();
        }
        
        setLastUpdated(new Date());
      }
    };
    
    // Subscribe to WebSocket analytics updates
    webSocketService.onMessage(handleAnalyticsUpdate);
    setIsRealTimeConnected(webSocketService.isReady());
    
    // Store cleanup function
    realTimeSubscriptionRef.current = () => {
      // Cleanup WebSocket subscription if needed
      setIsRealTimeConnected(false);
    };
  }, [refresh]);
  
  const unsubscribeFromRealTimeUpdates = useCallback(() => {
    if (realTimeSubscriptionRef.current) {
      realTimeSubscriptionRef.current();
      realTimeSubscriptionRef.current = null;
    }
    setIsRealTimeConnected(false);
  }, []);
  
  // Set up auto-refresh
  useEffect(() => {
    if (options.autoRefresh) {
      const interval = (options.refreshInterval || 30) * 1000; // Convert to milliseconds
      
      refreshIntervalRef.current = setInterval(() => {
        if (!loading) {
          refresh();
        }
      }, interval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [options.autoRefresh, options.refreshInterval, loading, refresh]);
  
  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Real-time subscription on mount
  useEffect(() => {
    if (options.autoRefresh) {
      subscribeToRealTimeUpdates();
    }
    
    return () => {
      unsubscribeFromRealTimeUpdates();
    };
  }, [options.autoRefresh, subscribeToRealTimeUpdates, unsubscribeFromRealTimeUpdates]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      unsubscribeFromRealTimeUpdates();
    };
  }, [unsubscribeFromRealTimeUpdates]);
  
  return {
    // Data
    dashboardData,
    userActivity,
    songPopularity,
    collaborationPatterns,
    
    // Widget management
    widgetConfig,
    availableWidgets,
    updateWidgetConfig,
    
    // State
    loading,
    error,
    lastUpdated,
    isRealTimeConnected,
    
    // Actions
    refresh,
    setTimeframe: (newTimeframe: AnalyticsTimeframe) => {
      setTimeframe(newTimeframe);
    },
    exportData,
    
    // Real-time updates
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates
  };
}

/**
 * Hook for widget-specific analytics data
 */
export function useWidgetAnalytics(
  widgetId: string,
  options: UseComprehensiveAnalyticsOptions = {}
) {
  const {
    dashboardData,
    userActivity,
    songPopularity,
    collaborationPatterns,
    loading,
    error,
    refresh
  } = useComprehensiveAnalytics(options);
  
  // Return widget-specific data
  const getWidgetData = useCallback(() => {
    switch (widgetId) {
      case 'user_activity':
        return userActivity;
      case 'song_popularity':
        return songPopularity;
      case 'collaboration_summary':
        return collaborationPatterns;
      case 'performance_stats':
        return dashboardData?.performance_statistics;
      case 'recent_insights':
        return dashboardData?.summary_metrics;
      default:
        return null;
    }
  }, [widgetId, userActivity, songPopularity, collaborationPatterns, dashboardData]);
  
  return {
    data: getWidgetData(),
    loading,
    error,
    refresh
  };
}

/**
 * Hook for real-time analytics updates
 */
export function useRealTimeAnalytics() {
  const [updates, setUpdates] = useState<unknown[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const handleUpdate = (update: unknown) => {
      setUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
    };
    
    const handleConnection = (status: unknown) => {
      setIsConnected(status.connected);
    };
    
    if (webSocketService) {
      webSocketService.onMessage(handleUpdate);
      webSocketService.onConnection(handleConnection);
      setIsConnected(webSocketService.isReady());
    }
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  return {
    updates,
    isConnected,
    clearUpdates: () => setUpdates([])
  };
}

export default useComprehensiveAnalytics;