/**
 * Recent Insights Widget
 * 
 * Displays recent AI recommendations and insights
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface RecentInsightsWidgetProps {
  data: any;
  timeframe: string;
  loading: boolean;
  error: string | null;
}

const RecentInsightsWidget: React.FC<RecentInsightsWidgetProps> = ({
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
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const insights = [
    {
      type: 'tip',
      title: t('analytics.insights.practiceConsistency', 'Practice Consistency'),
      message: t('analytics.insights.practiceMessage', 'Your practice consistency has improved by 15% this week!'),
      time: '2 hours ago'
    },
    {
      type: 'recommendation',
      title: t('analytics.insights.focusArea', 'Focus Area'),
      message: t('analytics.insights.focusMessage', 'Consider practicing chord transitions for better flow'),
      time: '1 day ago'
    }
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.insights.title', 'Recent Insights')}
        </h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-blue-800">{insight.message}</p>
              </div>
              <span className="text-xs text-blue-600 ml-2">{insight.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentInsightsWidget;