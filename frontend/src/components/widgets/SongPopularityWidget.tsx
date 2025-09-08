/**
 * Song Popularity Widget
 * 
 * Displays song and chord popularity analytics including:
 * - Top performed songs
 * - Trending analysis
 * - Chord usage statistics
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  SongPopularityAnalytics,
  AnalyticsTimeframe
} from '../../types/analytics';

interface SongPopularityWidgetProps {
  data: SongPopularityAnalytics | null;
  timeframe: AnalyticsTimeframe;
  loading: boolean;
  error: string | null;
}

const SongPopularityWidget: React.FC<SongPopularityWidgetProps> = ({
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

  if (!data || data.top_songs.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-4xl mb-2">🎵</div>
        <p className="text-gray-500">
          {t('analytics.songPopularity.noSongs', 'No songs practiced yet')}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {t('analytics.songPopularity.startPracticing', 'Start practicing to see your favorites!')}
        </p>
      </div>
    );
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.songPopularity.title', 'Song Popularity')}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {t(`analytics.timeframe.${timeframe}`, timeframe)}
        </span>
      </div>

      {/* Top Songs */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('analytics.songPopularity.topSongs', 'Most Practiced Songs')}
        </h4>
        <div className="space-y-2">
          {data.top_songs.slice(0, 5).map((song, index) => (
            <div key={song.song_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500 w-4 text-center">
                  {index + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{song.title}</div>
                  {song.artist && (
                    <div className="text-xs text-gray-600">{song.artist}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{song.performance_count}x</span>
                {song.trend_direction && (
                  <span className="text-xs">{getTrendIcon(song.trend_direction)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Analysis */}
      {data.trending_analysis && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('analytics.songPopularity.trending', 'Trending')}
          </h4>
          
          {data.trending_analysis.trending_up.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-green-600 font-medium mb-1">
                📈 {t('analytics.songPopularity.trendingUp', 'Rising')}
              </div>
              <div className="flex flex-wrap gap-1">
                {data.trending_analysis.trending_up.slice(0, 3).map((song, index) => (
                  <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {song}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.trending_analysis.new_favorites.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-blue-600 font-medium mb-1">
                ✨ {t('analytics.songPopularity.newFavorites', 'New Favorites')}
              </div>
              <div className="flex flex-wrap gap-1">
                {data.trending_analysis.new_favorites.slice(0, 3).map((song, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {song}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popular Chords */}
      {data.chord_popularity && data.chord_popularity.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('analytics.songPopularity.popularChords', 'Popular Chords')}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {data.chord_popularity.slice(0, 6).map((chord) => (
              <div key={chord.chord} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{chord.chord}</span>
                <div className="flex items-center space-x-1">
                  <div className="w-8 bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-purple-500 h-1 rounded-full"
                      style={{ width: `${chord.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 w-6 text-right">
                    {Math.round(chord.percentage)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SongPopularityWidget;