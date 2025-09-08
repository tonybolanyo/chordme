/**
 * Comprehensive Analytics Dashboard Component
 * 
 * A unified analytics dashboard providing insights into:
 * - User activity analytics with time-series data
 * - Song and chord progression popularity tracking
 * - Collaboration session analytics and patterns
 * - Performance mode usage statistics
 * - Real-time dashboard updates
 * - Customizable widgets and views
 * - Data export capabilities
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useComprehensiveAnalytics,
  useWidgetAnalytics,
  useRealTimeAnalytics
} from '../hooks/useComprehensiveAnalytics';
import {
  AnalyticsTimeframe,
  WidgetConfig,
  DashboardWidget,
  AnalyticsExportConfig
} from '../types/analytics';

// Widget Components
import UserActivityWidget from './widgets/UserActivityWidget';
import SongPopularityWidget from './widgets/SongPopularityWidget';
import CollaborationWidget from './widgets/CollaborationWidget';
import PerformanceStatsWidget from './widgets/PerformanceStatsWidget';
import RecentInsightsWidget from './widgets/RecentInsightsWidget';
import ProblemSectionsWidget from './widgets/ProblemSectionsWidget';
import ProgressTrendsWidget from './widgets/ProgressTrendsWidget';

interface ComprehensiveAnalyticsDashboardProps {
  className?: string;
  initialTimeframe?: AnalyticsTimeframe;
  showHeader?: boolean;
  onClose?: () => void;
}

const ComprehensiveAnalyticsDashboard: React.FC<ComprehensiveAnalyticsDashboardProps> = ({
  className = '',
  initialTimeframe = '30d',
  showHeader = true,
  onClose
}) => {
  const { t } = useTranslation();
  
  // Main analytics hook
  const {
    dashboardData,
    widgetConfig,
    availableWidgets,
    updateWidgetConfig,
    loading,
    error,
    lastUpdated,
    isRealTimeConnected,
    refresh,
    setTimeframe,
    exportData
  } = useComprehensiveAnalytics({
    timeframe: initialTimeframe,
    autoRefresh: true,
    refreshInterval: 30
  });

  // Real-time updates
  const { updates, isConnected } = useRealTimeAnalytics();

  // Local state
  const [selectedTimeframe, setSelectedTimeframe] = useState<AnalyticsTimeframe>(initialTimeframe);
  const [isExporting, setIsExporting] = useState(false);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Available timeframes
  const timeframes: { value: AnalyticsTimeframe; label: string }[] = [
    { value: '7d', label: t('analytics.timeframe.7d', 'Last 7 days') },
    { value: '30d', label: t('analytics.timeframe.30d', 'Last 30 days') },
    { value: '90d', label: t('analytics.timeframe.90d', 'Last 90 days') },
    { value: '1y', label: t('analytics.timeframe.1y', 'Last year') },
    { value: 'all', label: t('analytics.timeframe.all', 'All time') }
  ];

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: AnalyticsTimeframe) => {
    setSelectedTimeframe(newTimeframe);
    setTimeframe(newTimeframe);
  };

  // Handle export
  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    setIsExporting(true);
    try {
      const exportConfig: AnalyticsExportConfig = {
        format,
        timeframe: selectedTimeframe,
        include_sections: ['user_activity', 'song_popularity', 'collaboration_patterns', 'performance_statistics']
      };
      
      const exportData = await exportData(exportConfig);
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Get enabled widgets
  const enabledWidgets = widgetConfig?.enabled_widgets || [
    'user_activity', 'song_popularity', 'performance_stats', 'collaboration_summary'
  ];

  // Widget component mapping
  const widgetComponents = {
    user_activity: UserActivityWidget,
    song_popularity: SongPopularityWidget,
    collaboration_summary: CollaborationWidget,
    performance_stats: PerformanceStatsWidget,
    recent_insights: RecentInsightsWidget,
    problem_sections: ProblemSectionsWidget,
    progress_trends: ProgressTrendsWidget
  };

  // Loading state
  if (loading && !dashboardData) {
    return (
      <div className={`comprehensive-analytics-dashboard ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('analytics.loading', 'Loading analytics...')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className={`comprehensive-analytics-dashboard ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('analytics.error.title', 'Analytics Error')}
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {t('analytics.retry', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`comprehensive-analytics-dashboard bg-gray-50 min-h-screen ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('analytics.dashboard.title', 'Analytics Dashboard')}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t('analytics.dashboard.subtitle', 'Comprehensive insights into your musical practice and performance')}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Real-time status */}
                <div className="flex items-center text-sm">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    isRealTimeConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-gray-600">
                    {isRealTimeConnected 
                      ? t('analytics.realtime.connected', 'Live updates')
                      : t('analytics.realtime.disconnected', 'Manual refresh')
                    }
                  </span>
                </div>

                {/* Last updated */}
                {lastUpdated && (
                  <div className="text-sm text-gray-500">
                    {t('analytics.lastUpdated', 'Updated')}: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}

                {/* Timeframe selector */}
                <select
                  value={selectedTimeframe}
                  onChange={(e) => handleTimeframeChange(e.target.value as AnalyticsTimeframe)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timeframes.map((tf) => (
                    <option key={tf.value} value={tf.value}>
                      {tf.label}
                    </option>
                  ))}
                </select>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowWidgetConfig(!showWidgetConfig)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title={t('analytics.customize', 'Customize Dashboard')}
                  >
                    ⚙️
                  </button>
                  
                  <button
                    onClick={refresh}
                    disabled={loading}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
                    title={t('analytics.refresh', 'Refresh')}
                  >
                    🔄
                  </button>
                  
                  <button
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
                    title={t('analytics.export', 'Export Data')}
                  >
                    📥
                  </button>

                  {onClose && (
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      title={t('common.close', 'Close')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Configuration Panel */}
      {showWidgetConfig && (
        <WidgetConfigPanel
          widgetConfig={widgetConfig}
          availableWidgets={availableWidgets}
          onConfigUpdate={updateWidgetConfig}
          onClose={() => setShowWidgetConfig(false)}
        />
      )}

      {/* Dashboard Content */}
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title={t('analytics.summary.sessions', 'Total Sessions')}
            value={dashboardData?.summary_metrics?.total_sessions || 0}
            icon="🎵"
            trend="+12%"
          />
          <SummaryCard
            title={t('analytics.summary.songs', 'Songs Practiced')}
            value={dashboardData?.summary_metrics?.total_songs || 0}
            icon="🎼"
            trend="+5%"
          />
          <SummaryCard
            title={t('analytics.summary.collaborations', 'Collaborations')}
            value={dashboardData?.summary_metrics?.total_collaborations || 0}
            icon="👥"
            trend="+8%"
          />
          <SummaryCard
            title={t('analytics.summary.practiceTime', 'Practice Time')}
            value={formatDuration(dashboardData?.user_activity?.total_practice_time || 0)}
            icon="⏱️"
            trend="+15%"
          />
        </div>

        {/* Main Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {enabledWidgets.map((widgetId) => {
            const WidgetComponent = widgetComponents[widgetId];
            if (!WidgetComponent) return null;

            return (
              <div key={widgetId} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <WidgetComponent
                  data={getWidgetData(widgetId, dashboardData)}
                  timeframe={selectedTimeframe}
                  loading={loading}
                  error={error}
                />
              </div>
            );
          })}
        </div>

        {/* Real-time Updates Log */}
        {updates.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {t('analytics.realtimeUpdates', 'Recent Updates')}
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {updates.slice(0, 5).map((update, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{update.message || 'Analytics updated'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, trend }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <p className="text-sm text-green-600 mt-1">{trend}</p>
        )}
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
  </div>
);

// Widget Configuration Panel Component
interface WidgetConfigPanelProps {
  widgetConfig: WidgetConfig | null;
  availableWidgets: DashboardWidget[];
  onConfigUpdate: (config: Partial<WidgetConfig>) => Promise<void>;
  onClose: () => void;
}

const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({
  widgetConfig,
  availableWidgets,
  onConfigUpdate,
  onClose
}) => {
  const { t } = useTranslation();
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(
    widgetConfig?.enabled_widgets || []
  );

  const handleToggleWidget = (widgetId: string) => {
    const newEnabledWidgets = enabledWidgets.includes(widgetId)
      ? enabledWidgets.filter(id => id !== widgetId)
      : [...enabledWidgets, widgetId];
    
    setEnabledWidgets(newEnabledWidgets);
  };

  const handleSave = async () => {
    await onConfigUpdate({
      enabled_widgets: enabledWidgets
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('analytics.customizeWidgets', 'Customize Widgets')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            {availableWidgets.map((widget) => (
              <label key={widget.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledWidgets.includes(widget.id)}
                  onChange={() => handleToggleWidget(widget.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">{widget.name}</div>
                  <div className="text-sm text-gray-600">{widget.description}</div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              {t('common.save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getWidgetData(widgetId: string, dashboardData: any): any {
  switch (widgetId) {
    case 'user_activity':
      return dashboardData?.user_activity;
    case 'song_popularity':
      return dashboardData?.song_popularity;
    case 'collaboration_summary':
      return dashboardData?.collaboration_patterns;
    case 'performance_stats':
      return dashboardData?.performance_statistics;
    case 'recent_insights':
      return dashboardData?.summary_metrics;
    default:
      return null;
  }
}

export default ComprehensiveAnalyticsDashboard;