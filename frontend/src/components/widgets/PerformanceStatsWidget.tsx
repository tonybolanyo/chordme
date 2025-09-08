/**
 * Performance Statistics Widget
 * 
 * Displays performance analytics including:
 * - Practice completion rates
 * - Improvement scores
 * - Problem areas identification
 * - Performance trends
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PerformanceStatistics,
  AnalyticsTimeframe
} from '../../types/analytics';

interface PerformanceStatsWidgetProps {
  data: PerformanceStatistics | null;
  timeframe: AnalyticsTimeframe;
  loading: boolean;
  error: string | null;
}

const PerformanceStatsWidget: React.FC<PerformanceStatsWidgetProps> = ({
  data,
  timeframe,
  loading,
  error
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600">⚠️</div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-4xl mb-2">📊</div>
        <p className="text-gray-500">
          {t('analytics.performance.noData', 'No performance data available')}
        </p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.performance.title', 'Performance Stats')}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {t(`analytics.timeframe.${timeframe}`, timeframe)}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {formatDuration(data.total_practice_time)}
          </div>
          <div className="text-xs text-gray-600">
            {t('analytics.performance.totalTime', 'Total Practice')}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-xl font-bold ${getScoreColor(data.completion_rate)}`}>
            {Math.round(data.completion_rate)}%
          </div>
          <div className="text-xs text-gray-600">
            {t('analytics.performance.completion', 'Completion')}
          </div>
        </div>
      </div>

      {/* Improvement Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">
            {t('analytics.performance.improvement', 'Improvement Score')}
          </span>
          <span className={`font-medium ${getScoreColor(data.improvement_score)}`}>
            {Math.round(data.improvement_score)}/100
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${getScoreBackground(data.improvement_score)}`}
            style={{ width: `${data.improvement_score}%` }}
          ></div>
        </div>
      </div>

      {/* Performance Trends */}
      {data.performance_trends && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('analytics.performance.trends', 'Trends')}
          </h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {t('analytics.performance.completionTrend', 'Completion')}
              </span>
              <div className={`flex items-center space-x-1 ${getTrendColor(data.performance_trends.completion_trend)}`}>
                <span className="text-xs">{getTrendIcon(data.performance_trends.completion_trend)}</span>
                <span className="capitalize">{data.performance_trends.completion_trend}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {t('analytics.performance.improvementTrend', 'Improvement')}
              </span>
              <div className={`flex items-center space-x-1 ${getTrendColor(data.performance_trends.improvement_trend)}`}>
                <span className="text-xs">{getTrendIcon(data.performance_trends.improvement_trend)}</span>
                <span className="capitalize">{data.performance_trends.improvement_trend}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {t('analytics.performance.consistency', 'Consistency')}
              </span>
              <div className={`flex items-center space-x-1 ${getTrendColor(data.performance_trends.consistency)}`}>
                <span className="text-xs">{getTrendIcon(data.performance_trends.consistency)}</span>
                <span className="capitalize">{data.performance_trends.consistency}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problem Areas */}
      {data.problem_areas && data.problem_areas.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('analytics.performance.problemAreas', 'Areas to Focus')}
          </h4>
          <div className="space-y-1">
            {data.problem_areas.slice(0, 3).map((problem, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">
                  {problem.problem_type.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-12 bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-red-500 h-1 rounded-full"
                      style={{ width: `${(problem.frequency / Math.max(...data.problem_areas.map(p => p.frequency))) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-900 text-xs w-6 text-right">{problem.frequency}</span>
                </div>
              </div>
            ))}
          </div>
          
          {data.problem_areas.length > 3 && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              +{data.problem_areas.length - 3} {t('analytics.performance.moreAreas', 'more areas')}
            </div>
          )}
        </div>
      )}

      {/* No Problems Message */}
      {(!data.problem_areas || data.problem_areas.length === 0) && (
        <div className="text-center py-4">
          <div className="text-green-500 text-2xl mb-1">✅</div>
          <p className="text-sm text-green-600">
            {t('analytics.performance.noProblems', 'Great job! No major problem areas identified.')}
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceStatsWidget;