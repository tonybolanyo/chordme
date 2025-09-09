import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import {
  PopularSongsData,
  PerformanceRecommendations,
  AnalyticsTimeframe,
  AnalyticsDashboardProps,
} from '../../types/analytics';
import './PerformanceAnalytics.css';

const PerformanceAnalytics: React.FC<AnalyticsDashboardProps> = ({
  user_id,
  timeframe = '30d',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<AnalyticsTimeframe>(timeframe);
  const [popularSongs, setPopularSongs] = useState<PopularSongsData | null>(null);
  const [recommendations, setRecommendations] = useState<PerformanceRecommendations | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState({
    recent_performances: 0,
    total_songs: 0,
    average_rating: 0,
    trending_songs: 0,
  });
  const [isAnalyticsAvailable, setIsAnalyticsAvailable] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    checkAnalyticsAvailability();
  }, [user_id, activeTimeframe]);

  const checkAnalyticsAvailability = async () => {
    try {
      const available = await analyticsService.checkAnalyticsAvailability();
      setIsAnalyticsAvailable(available);
    } catch (error) {
      console.error('Error checking analytics availability:', error);
      setIsAnalyticsAvailable(false);
    }
  };

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [popularData, recommendationsData, summaryData] = await Promise.all([
        analyticsService.getPopularSongs(activeTimeframe, 'user', 20),
        analyticsService.getRecommendations(10),
        analyticsService.getDashboardSummary(),
      ]);

      setPopularSongs(popularData);
      setRecommendations(recommendationsData);
      setDashboardSummary(summaryData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(errorMessage);
      console.error('Analytics loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe: AnalyticsTimeframe) => {
    setActiveTimeframe(newTimeframe);
  };

  const renderSummaryCards = () => {
    const cards = [
      {
        title: 'Recent Performances',
        value: dashboardSummary.recent_performances,
        icon: '🎵',
        description: `In the last ${activeTimeframe}`,
      },
      {
        title: 'Total Songs',
        value: dashboardSummary.total_songs,
        icon: '📚',
        description: 'In your repertoire',
      },
      {
        title: 'Average Rating',
        value: dashboardSummary.average_rating.toFixed(1),
        icon: '⭐',
        description: 'Performance quality',
      },
      {
        title: 'Trending Songs',
        value: dashboardSummary.trending_songs,
        icon: '📈',
        description: 'Growing popularity',
      },
    ];

    return (
      <div className="analytics-summary-cards">
        {cards.map((card, index) => (
          <div key={index} className="summary-card">
            <div className="card-icon">{card.icon}</div>
            <div className="card-content">
              <h3 className="card-title">{card.title}</h3>
              <div className="card-value">{card.value}</div>
              <p className="card-description">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeframeSelector = () => {
    const timeframes: { value: AnalyticsTimeframe; label: string }[] = [
      { value: '7d', label: '7 Days' },
      { value: '30d', label: '30 Days' },
      { value: '90d', label: '90 Days' },
      { value: '1y', label: '1 Year' },
      { value: 'all', label: 'All Time' },
    ];

    return (
      <div className="timeframe-selector">
        <label htmlFor="timeframe">Time Period:</label>
        <select
          id="timeframe"
          value={activeTimeframe}
          onChange={(e) => handleTimeframeChange(e.target.value as AnalyticsTimeframe)}
          className="timeframe-select"
        >
          {timeframes.map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderPopularSongs = () => {
    if (!popularSongs || popularSongs.popular_songs.length === 0) {
      return (
        <div className="analytics-section">
          <h3>Popular Songs</h3>
          <p className="no-data">No performance data available for the selected time period.</p>
        </div>
      );
    }

    return (
      <div className="analytics-section">
        <h3>Popular Songs ({popularSongs.timeframe})</h3>
        <div className="popular-songs-list">
          {popularSongs.popular_songs.slice(0, 10).map((song, index) => (
            <div key={song.song_id} className="popular-song-item">
              <div className="song-rank">#{index + 1}</div>
              <div className="song-info">
                <h4 className="song-title">{song.title}</h4>
                {song.artist && <p className="song-artist">{song.artist}</p>}
              </div>
              <div className="song-stats">
                <div className="stat">
                  <span className="stat-value">{song.performance_count}</span>
                  <span className="stat-label">performances</span>
                </div>
                {song.average_rating && (
                  <div className="stat">
                    <span className="stat-value">{song.average_rating.toFixed(1)}</span>
                    <span className="stat-label">avg rating</span>
                  </div>
                )}
                {song.average_duration && (
                  <div className="stat">
                    <span className="stat-value">{Math.round(song.average_duration)}s</span>
                    <span className="stat-label">avg duration</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrendingSongs = () => {
    if (!popularSongs || popularSongs.trending_songs.length === 0) {
      return null;
    }

    return (
      <div className="analytics-section">
        <h3>Trending Songs</h3>
        <div className="trending-songs-list">
          {popularSongs.trending_songs.map((song) => (
            <div key={song.song_id} className="trending-song-item">
              <div className="trend-indicator">📈</div>
              <div className="song-info">
                <h4 className="song-title">{song.title}</h4>
                {song.artist && <p className="song-artist">{song.artist}</p>}
              </div>
              <div className="trend-stats">
                <span className="trend-count">{song.recent_performances} recent</span>
                <span className="trend-status">{song.trend_status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!recommendations) {
      return (
        <div className="analytics-section">
          <h3>Recommendations</h3>
          <p className="no-data">No recommendations available.</p>
        </div>
      );
    }

    return (
      <div className="analytics-section">
        <h3>Performance Recommendations</h3>
        
        {/* High Performing Songs */}
        {recommendations.high_performing_songs.length > 0 && (
          <div className="recommendation-group">
            <h4>🌟 High Performing Songs</h4>
            <p className="recommendation-description">
              Songs that consistently receive high ratings in your performances
            </p>
            <div className="recommendation-list">
              {recommendations.high_performing_songs.slice(0, 5).map((song) => (
                <div key={song.song_id} className="recommendation-item">
                  <div className="song-info">
                    <span className="song-title">{song.title}</span>
                    {song.artist && <span className="song-artist"> by {song.artist}</span>}
                  </div>
                  <div className="recommendation-stats">
                    <span className="rating">⭐ {song.average_rating}</span>
                    <span className="count">({song.performance_count} performances)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimal Duration Recommendations */}
        {recommendations.optimal_durations.recommendation && (
          <div className="recommendation-group">
            <h4>⏱️ Optimal Timing</h4>
            <p className="recommendation-description">
              {recommendations.optimal_durations.recommendation}
            </p>
            <div className="duration-analysis">
              {Object.entries(recommendations.optimal_durations.duration_analysis).map(([range, data]) => (
                <div key={range} className="duration-range">
                  <span className="range-label">{data.duration_range} min</span>
                  <span className="range-rating">⭐ {data.average_rating}</span>
                  <span className="range-count">({data.performance_count} performances)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timing Recommendations */}
        <div className="recommendation-group">
          <h4>🎯 Timing Tips</h4>
          <div className="timing-recommendations">
            <div className="timing-tip">
              <strong>Average Performance:</strong> {recommendations.timing_recommendations.average_performance_duration} minutes
            </div>
            <div className="timing-tip">
              <strong>Preparation Time:</strong> {recommendations.timing_recommendations.recommended_preparation_time} minutes
            </div>
            <div className="timing-tip">
              <strong>Break Frequency:</strong> {recommendations.timing_recommendations.recommended_break_frequency}
            </div>
            <div className="timing-tip">
              <strong>Optimal Songs:</strong> {recommendations.timing_recommendations.optimal_song_count} songs per set
            </div>
          </div>
        </div>

        {/* Trending Combinations */}
        {recommendations.trending_combinations.length > 0 && (
          <div className="recommendation-group">
            <h4>🔥 Trending Combinations</h4>
            <p className="recommendation-description">
              Recent high-rated setlist combinations that work well together
            </p>
            <div className="combination-list">
              {recommendations.trending_combinations.map((combo, index) => (
                <div key={index} className="combination-item">
                  <div className="combo-header">
                    <span className="combo-name">{combo.setlist_name}</span>
                    <span className="combo-rating">⭐ {combo.rating}</span>
                  </div>
                  <div className="combo-songs">
                    {combo.songs.join(', ')}
                  </div>
                  <div className="combo-date">
                    {new Date(combo.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrivacyNotice = () => {
    const notice = popularSongs?.privacy_notice || recommendations?.privacy_notice;
    
    if (!notice) return null;

    return (
      <div className="privacy-notice">
        <h4>🔒 Privacy Notice</h4>
        <ul>
          {notice.data_collection && <li><strong>Data Collection:</strong> {notice.data_collection}</li>}
          {notice.data_usage && <li><strong>Data Usage:</strong> {notice.data_usage}</li>}
          {notice.retention && <li><strong>Retention:</strong> {notice.retention}</li>}
          {notice.sharing && <li><strong>Sharing:</strong> {notice.sharing}</li>}
        </ul>
      </div>
    );
  };

  if (!isAnalyticsAvailable) {
    return (
      <div className={`performance-analytics ${className}`}>
        <div className="analytics-unavailable">
          <h2>📊 Performance Analytics</h2>
          <p>Analytics features are not available. Please check your account settings or contact support.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`performance-analytics ${className}`}>
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`performance-analytics ${className}`}>
        <div className="analytics-error">
          <h2>📊 Performance Analytics</h2>
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={loadAnalyticsData} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-analytics ${className}`}>
      <div className="analytics-header">
        <h2>📊 Performance Analytics</h2>
        {renderTimeframeSelector()}
      </div>

      {renderSummaryCards()}

      <div className="analytics-content">
        <div className="analytics-grid">
          <div className="analytics-column">
            {renderPopularSongs()}
            {renderTrendingSongs()}
          </div>
          
          <div className="analytics-column">
            {renderRecommendations()}
          </div>
        </div>
      </div>

      {renderPrivacyNotice()}
    </div>
  );
};

export default PerformanceAnalytics;