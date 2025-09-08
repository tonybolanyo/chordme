/**
 * User Activity Widget
 * 
 * Displays user activity analytics including:
 * - Total sessions and practice time
 * - Activity timeline
 * - Device distribution
 * - Consistency metrics
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserActivityAnalytics,
  AnalyticsTimeframe
} from '../../types/analytics';

interface UserActivityWidgetProps {
  data: UserActivityAnalytics | null;
  timeframe: AnalyticsTimeframe;
  loading: boolean;
  error: string | null;
}

const UserActivityWidget: React.FC<UserActivityWidgetProps> = ({
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
        <p className="text-gray-500">{t('analytics.noData', 'No data available')}</p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.userActivity.title', 'User Activity')}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {t(`analytics.timeframe.${timeframe}`, timeframe)}
        </span>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{data.total_sessions}</div>
          <div className="text-sm text-gray-600">
            {t('analytics.userActivity.sessions', 'Sessions')}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatDuration(data.total_practice_time)}
          </div>
          <div className="text-sm text-gray-600">
            {t('analytics.userActivity.practiceTime', 'Practice Time')}
          </div>
        </div>
      </div>

      {/* Average Session Length */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {t('analytics.userActivity.avgSession', 'Avg Session')}
          </span>
          <span className="font-medium text-gray-900">
            {formatDuration(data.average_session_length)}
          </span>
        </div>
      </div>

      {/* Consistency Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {t('analytics.userActivity.consistency', 'Consistency')}
          </span>
          <span className={`font-medium ${getConsistencyColor(data.consistency_score)}`}>
            {Math.round(data.consistency_score)}%
          </span>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              data.consistency_score >= 80 ? 'bg-green-500' :
              data.consistency_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${data.consistency_score}%` }}
          ></div>
        </div>
      </div>

      {/* Most Active Day */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {t('analytics.userActivity.mostActiveDay', 'Most Active Day')}
          </span>
          <span className="font-medium text-gray-900">{data.most_active_day}</span>
        </div>
      </div>

      {/* Device Distribution */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {t('analytics.userActivity.devices', 'Devices Used')}
        </h4>
        <div className="space-y-1">
          {Object.entries(data.device_distribution).map(([device, count]) => {
            const percentage = (count / data.total_sessions) * 100;
            return (
              <div key={device} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 capitalize">{device}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Types */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {t('analytics.userActivity.sessionTypes', 'Session Types')}
        </h4>
        <div className="flex flex-wrap gap-1">
          {Object.entries(data.session_type_distribution).map(([type, count]) => (
            <span
              key={type}
              className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded capitalize"
            >
              {type}: {count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserActivityWidget;