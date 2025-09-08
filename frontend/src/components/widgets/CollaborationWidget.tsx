/**
 * Collaboration Widget
 * 
 * Displays collaboration analytics including:
 * - Total collaboration sessions
 * - Most collaborative songs
 * - Collaboration patterns and frequency
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CollaborationPatternsAnalytics,
  AnalyticsTimeframe
} from '../../types/analytics';

interface CollaborationWidgetProps {
  data: CollaborationPatternsAnalytics | null;
  timeframe: AnalyticsTimeframe;
  loading: boolean;
  error: string | null;
}

const CollaborationWidget: React.FC<CollaborationWidgetProps> = ({
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
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
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

  if (!data || data.total_collaboration_sessions === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-4xl mb-2">👥</div>
        <p className="text-gray-500">
          {t('analytics.collaboration.noCollaborations', 'No collaborations yet')}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {t('analytics.collaboration.startCollaborating', 'Invite others to practice together!')}
        </p>
      </div>
    );
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'very_frequent': return 'text-green-600';
      case 'frequent': return 'text-blue-600';
      case 'regular': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      very_frequent: t('analytics.collaboration.veryFrequent', 'Very Frequent'),
      frequent: t('analytics.collaboration.frequent', 'Frequent'),
      regular: t('analytics.collaboration.regular', 'Regular'),
      occasional: t('analytics.collaboration.occasional', 'Occasional'),
      irregular: t('analytics.collaboration.irregular', 'Irregular')
    };
    return labels[frequency] || frequency;
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.collaboration.title', 'Collaboration')}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {t(`analytics.timeframe.${timeframe}`, timeframe)}
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {data.total_collaboration_sessions}
          </div>
          <div className="text-sm text-gray-600">
            {t('analytics.collaboration.sessions', 'Sessions')}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(data.average_participants * 10) / 10}
          </div>
          <div className="text-sm text-gray-600">
            {t('analytics.collaboration.avgParticipants', 'Avg Participants')}
          </div>
        </div>
      </div>

      {/* Collaboration Frequency */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {t('analytics.collaboration.frequency', 'Frequency')}
          </span>
          <span className={`font-medium ${getFrequencyColor(data.collaboration_frequency)}`}>
            {getFrequencyLabel(data.collaboration_frequency)}
          </span>
        </div>
      </div>

      {/* Collaboration Patterns */}
      {data.collaboration_patterns && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('analytics.collaboration.patterns', 'Patterns')}
          </h4>
          
          <div className="space-y-2 text-sm">
            {data.collaboration_patterns.peak_hours.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {t('analytics.collaboration.peakHours', 'Peak Hours')}
                </span>
                <span className="text-gray-900">
                  {data.collaboration_patterns.peak_hours.join(', ')}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {t('analytics.collaboration.avgDuration', 'Avg Duration')}
              </span>
              <span className="text-gray-900">
                {data.collaboration_patterns.average_duration}m
              </span>
            </div>
            
            {data.collaboration_patterns.most_common_roles.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {t('analytics.collaboration.commonRoles', 'Common Roles')}
                </span>
                <span className="text-gray-900">
                  {data.collaboration_patterns.most_common_roles.slice(0, 2).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Most Collaborative Songs */}
      {data.most_collaborative_songs && data.most_collaborative_songs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('analytics.collaboration.topSongs', 'Most Collaborative Songs')}
          </h4>
          <div className="space-y-1">
            {data.most_collaborative_songs.slice(0, 3).map((song, index) => (
              <div key={song.song_id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 w-4 text-center">{index + 1}</span>
                  <span className="text-gray-900 font-medium truncate">{song.title}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <span>{song.collaboration_count}x</span>
                  <span>·</span>
                  <span>{Math.round(song.average_participants * 10) / 10} avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationWidget;