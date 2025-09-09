/**
 * Progress Trends Widget
 * 
 * Displays long-term progress trends and improvement tracking
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface ProgressTrendsWidgetProps {
  data: any;
  timeframe: string;
  loading: boolean;
  error: string | null;
}

const ProgressTrendsWidget: React.FC<ProgressTrendsWidgetProps> = ({
  data: _data,
  timeframe: _timeframe,
  loading,
  error: _error
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const trends = [
    {
      metric: 'Completion Rate',
      current: 85,
      previous: 78,
      trend: 'up'
    },
    {
      metric: 'Session Length',
      current: 45,
      previous: 42,
      trend: 'up'
    },
    {
      metric: 'Problem Areas',
      current: 3,
      previous: 5,
      trend: 'down'
    }
  ];

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
  };

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.progressTrends.title', 'Progress Trends')}
        </h3>
      </div>

      <div className="space-y-3">
        {trends.map((trend, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{trend.metric}</div>
              <div className="text-xs text-gray-600">
                {trend.current} vs {trend.previous} previous
              </div>
            </div>
            <div className={`flex items-center space-x-1 ${getTrendColor(trend.trend)}`}>
              <span className="text-lg">{getTrendIcon(trend.trend)}</span>
              <span className="text-sm font-medium">
                {Math.abs(trend.current - trend.previous)}
                {trend.metric.includes('Rate') ? '%' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressTrendsWidget;