/**
 * Performance Analytics Dashboard Component
 * 
 * Provides a comprehensive dashboard for performance analytics including:
 * - Real-time performance session tracking
 * - Problem section visualization
 * - AI-powered improvement recommendations
 * - Progress trends and session comparison
 * - Privacy controls
 */

import React, { useState, useEffect } from 'react';
import {
  usePerformanceSession,
  usePerformanceInsights,
  useProblemSections,
  useAIRecommendations,
  useRealTimeMetrics,
  formatDuration,
  formatPercentage,
  getPriorityColor,
  getSeverityColor,
  formatTrendDirection
} from '../hooks/useEnhancedAnalytics';
import {
  PerformanceInsights,
  ProblemSection,
  AIRecommendation,
  SessionType
} from '../types/analytics';

interface PerformanceAnalyticsDashboardProps {
  songId?: number;
  setlistId?: number;
  className?: string;
  onClose?: () => void;
}

const PerformanceAnalyticsDashboard: React.FC<PerformanceAnalyticsDashboardProps> = ({
  songId,
  setlistId,
  className = '',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'recommendations' | 'trends' | 'privacy'>('overview');
  const [sessionType, setSessionType] = useState<SessionType>('practice');

  // Hooks for analytics data
  const {
    sessionId,
    isTracking,
    startSession,
    endSession,
    error: sessionError
  } = usePerformanceSession();

  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
    refresh: refreshInsights
  } = usePerformanceInsights({ songId, periodDays: 30 });

  const {
    problemSections,
    loading: problemsLoading,
    error: problemsError,
    refresh: refreshProblems
  } = useProblemSections({ songId, sessionId });

  const {
    recommendations,
    dismissRecommendation,
    getRecommendationsByPriority
  } = useAIRecommendations(insights);

  const {
    metrics
  } = useRealTimeMetrics(sessionId);

  // Handle session start
  const handleStartSession = async () => {
    try {
      await startSession({
        sessionType,
        songId,
        setlistId,
        analyticsConsent: true
      });
      setIsSessionActive(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  // Handle session end
  const handleEndSession = async () => {
    try {
      await endSession({
        completion_percentage: metrics.completionPercentage,
        session_rating: undefined, // Could be added via UI
        difficulty_rating: undefined
      });
      setIsSessionActive(false);
      // Refresh insights after session ends
      setTimeout(() => {
        refreshInsights();
        refreshProblems();
      }, 1000);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  // Auto-refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (insights) {
        refreshInsights();
      }
      if (sessionId) {
        refreshProblems();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [insights, sessionId, refreshInsights, refreshProblems]);

  return (
    <div className={`performance-analytics-dashboard bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track your performance and get AI-powered improvement suggestions
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Session Controls */}
          {!isTracking ? (
            <div className="flex items-center space-x-2">
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="practice">Practice</option>
                <option value="performance">Performance</option>
                <option value="rehearsal">Rehearsal</option>
              </select>
              <button
                onClick={handleStartSession}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
              >
                Start Session
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium">Recording</span>
              </div>
              <button
                onClick={handleEndSession}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
              >
                End Session
              </button>
            </div>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'problems', name: 'Problem Sections' },
            { id: 'recommendations', name: 'Recommendations' },
            { id: 'trends', name: 'Trends' },
            { id: 'privacy', name: 'Privacy' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewTab
            insights={insights}
            metrics={metrics}
            isTracking={isTracking}
            loading={insightsLoading}
            error={insightsError}
          />
        )}

        {/* Problem Sections Tab */}
        {activeTab === 'problems' && (
          <ProblemSectionsTab
            problemSections={problemSections}
            loading={problemsLoading}
            error={problemsError}
          />
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <RecommendationsTab
            recommendations={recommendations}
            onDismiss={dismissRecommendation}
            getByPriority={getRecommendationsByPriority}
          />
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <TrendsTab
            insights={insights}
            loading={insightsLoading}
          />
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <PrivacyTab />
        )}
      </div>

      {/* Errors */}
      {(sessionError || insightsError || problemsError) && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="text-red-800 text-sm">
            {sessionError || insightsError || problemsError}
          </div>
        </div>
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  insights?: PerformanceInsights;
  metrics: any;
  isTracking: boolean;
  loading: boolean;
  error?: string;
}> = ({ insights, metrics, isTracking, loading, error }) => {
  if (loading) return <div>Loading insights...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!insights) return <div>No performance data available</div>;

  return (
    <div className="space-y-6">
      {/* Current Session Metrics */}
      {isTracking && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">Current Session</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.pauseCount}</div>
              <div className="text-sm text-blue-700">Pauses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.rewindCount}</div>
              <div className="text-sm text-blue-700">Rewinds</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.tempoChanges}</div>
              <div className="text-sm text-blue-700">Tempo Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatPercentage(metrics.completionPercentage)}
              </div>
              <div className="text-sm text-blue-700">Completion</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Total Sessions</h4>
          <div className="text-3xl font-bold text-gray-800">
            {insights.summary_metrics.total_sessions}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {formatDuration(insights.summary_metrics.total_practice_time)} total
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Average Completion</h4>
          <div className="text-3xl font-bold text-gray-800">
            {formatPercentage(insights.summary_metrics.average_completion_rate)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {formatDuration(insights.summary_metrics.average_session_length)} avg session
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Problem Areas</h4>
          <div className="text-3xl font-bold text-gray-800">
            {insights.summary_metrics.total_problem_sections}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Areas needing focus
          </div>
        </div>
      </div>

      {/* Quick Recommendations */}
      {insights.ai_recommendations.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Quick Tip</h4>
          <div className="text-yellow-800">
            {insights.ai_recommendations[0].description}
          </div>
        </div>
      )}
    </div>
  );
};

// Problem Sections Tab Component
const ProblemSectionsTab: React.FC<{
  problemSections: ProblemSection[];
  loading: boolean;
  error?: string;
}> = ({ problemSections, loading, error }) => {
  if (loading) return <div>Loading problem sections...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (problemSections.length === 0) return <div>No problem sections identified</div>;

  return (
    <div className="space-y-4">
      {problemSections.map((section) => (
        <div key={section.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getSeverityColor(section.severity_score) }}
              ></div>
              <h4 className="font-semibold text-gray-900">
                {section.section_name || `${formatDuration(section.start_position)} - ${formatDuration(section.end_position)}`}
              </h4>
              <span className="text-sm text-gray-500 capitalize">
                {section.problem_type.replace('_', ' ')}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Severity: {section.severity_score.toFixed(1)}/5.0
            </div>
          </div>

          {section.identified_issues.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium text-gray-700 mb-1">Issues:</h5>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {section.identified_issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {section.suggested_improvements.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-1">Suggestions:</h5>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {section.suggested_improvements.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Recommendations Tab Component
const RecommendationsTab: React.FC<{
  recommendations: AIRecommendation[];
  onDismiss: (rec: AIRecommendation) => void;
  getByPriority: (priority: 'high' | 'medium' | 'low') => AIRecommendation[];
}> = ({ recommendations, onDismiss, getByPriority }) => {
  if (recommendations.length === 0) {
    return <div>No recommendations available. Great work!</div>;
  }

  const priorityGroups = [
    { priority: 'high' as const, title: 'High Priority' },
    { priority: 'medium' as const, title: 'Medium Priority' },
    { priority: 'low' as const, title: 'Low Priority' }
  ];

  return (
    <div className="space-y-6">
      {priorityGroups.map(({ priority, title }) => {
        const recs = getByPriority(priority);
        if (recs.length === 0) return null;

        return (
          <div key={priority}>
            <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
            <div className="space-y-3">
              {recs.map((rec, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getPriorityColor(rec.priority) }}
                      ></div>
                      <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                    </div>
                    <button
                      onClick={() => onDismiss(rec)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  
                  {rec.actionable_steps.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Action Steps:</h5>
                      <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                        {rec.actionable_steps.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Trends Tab Component
const TrendsTab: React.FC<{
  insights?: PerformanceInsights;
  loading: boolean;
}> = ({ insights, loading }) => {
  if (loading) return <div>Loading trends...</div>;
  if (!insights || insights.improvement_trends.insufficient_data) {
    return <div>Insufficient data for trend analysis. Complete more sessions to see trends.</div>;
  }

  const trends = insights.improvement_trends;
  const comparison = insights.session_comparison;

  return (
    <div className="space-y-6">
      {/* Improvement Trends */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Improvement Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Completion Rate</h4>
            <div className="flex items-center space-x-2">
              <div className="text-lg font-semibold text-gray-900">
                {formatTrendDirection(trends.trend_interpretation.completion).text}
              </div>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: formatTrendDirection(trends.trend_interpretation.completion).color }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Consistency</h4>
            <div className="flex items-center space-x-2">
              <div className="text-lg font-semibold text-gray-900">
                {formatTrendDirection(trends.trend_interpretation.consistency).text}
              </div>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: formatTrendDirection(trends.trend_interpretation.consistency).color }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Problem Areas</h4>
            <div className="flex items-center space-x-2">
              <div className="text-lg font-semibold text-gray-900">
                {formatTrendDirection(trends.trend_interpretation.problems).text}
              </div>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: formatTrendDirection(trends.trend_interpretation.problems).color }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Comparison */}
      {comparison && !comparison.insufficient_data_for_comparison && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Recent vs Earlier Sessions</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  comparison.improvement_summary.completion_improved ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.improvement_summary.completion_improved ? '↗' : '↘'}
                </div>
                <div className="text-sm text-gray-700">Completion Rate</div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  comparison.improvement_summary.duration_more_consistent ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {comparison.improvement_summary.duration_more_consistent ? '↗' : '→'}
                </div>
                <div className="text-sm text-gray-700">Session Consistency</div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  comparison.improvement_summary.fewer_problems ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.improvement_summary.fewer_problems ? '↘' : '↗'}
                </div>
                <div className="text-sm text-gray-700">Problem Count</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Privacy Tab Component
const PrivacyTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Privacy & Data Controls</h3>
        <p className="text-gray-600 mb-4">
          Manage how your performance data is collected, used, and stored.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Privacy First</h4>
        <p className="text-blue-800 text-sm">
          By default, your data is anonymized and stored locally. You can enable enhanced 
          analytics for personalized insights while maintaining full control over your data.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium text-gray-900">Anonymous Data Only</div>
            <div className="text-sm text-gray-600">Collect data without personal identification</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium text-gray-900">Detailed Analytics</div>
            <div className="text-sm text-gray-600">Enable personalized insights and recommendations</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium text-gray-900">Feature Optimization</div>
            <div className="text-sm text-gray-600">Help improve the app with anonymous usage data</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div className="flex space-x-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Export My Data
        </button>
        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Delete All Data
        </button>
      </div>
    </div>
  );
};

export default PerformanceAnalyticsDashboard;