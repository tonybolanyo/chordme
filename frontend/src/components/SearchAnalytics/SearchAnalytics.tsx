import React from 'react';
import { SearchAnalytics, ResultStatistics } from '../../types';
import './SearchAnalytics.css';

interface SearchAnalyticsProps {
  analytics: SearchAnalytics | null;
  statistics: ResultStatistics | null;
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
  className?: string;
}

const SearchAnalyticsComponent: React.FC<SearchAnalyticsProps> = ({
  analytics,
  statistics,
  isVisible,
  onToggle,
  className = '',
}) => {
  if (!isVisible) {
    return (
      <button
        type="button"
        className="analytics-toggle-button collapsed"
        onClick={() => onToggle(true)}
        aria-label="Show search analytics"
      >
        📊 Analytics
      </button>
    );
  }

  return (
    <div className={`search-analytics ${className}`}>
      <div className="analytics-header">
        <h3>Search Analytics</h3>
        <button
          type="button"
          className="analytics-toggle-button"
          onClick={() => onToggle(false)}
          aria-label="Hide search analytics"
        >
          ✕
        </button>
      </div>

      <div className="analytics-content">
        {statistics && (
          <div className="analytics-section">
            <h4>Current Results</h4>
            <div className="analytics-grid">
              <div className="analytics-metric">
                <span className="metric-value">{statistics.totalResults}</span>
                <span className="metric-label">Total Results</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{statistics.searchTime}ms</span>
                <span className="metric-label">Search Time</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">
                  {Math.round(statistics.averageRelevanceScore * 100)}%
                </span>
                <span className="metric-label">Avg Relevance</span>
              </div>
            </div>

            <div className="distribution-charts">
              <div className="distribution-chart">
                <h5>By Genre</h5>
                <div className="chart-bars">
                  {Object.entries(statistics.resultsByGenre)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([genre, count]) => (
                      <div key={genre} className="chart-bar">
                        <span className="bar-label">{genre}</span>
                        <div className="bar-container">
                          <div 
                            className="bar-fill"
                            style={{
                              width: `${(count / statistics.totalResults) * 100}%`
                            }}
                          />
                        </div>
                        <span className="bar-value">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="distribution-chart">
                <h5>By Difficulty</h5>
                <div className="chart-bars">
                  {Object.entries(statistics.resultsByDifficulty)
                    .sort(([,a], [,b]) => b - a)
                    .map(([difficulty, count]) => (
                      <div key={difficulty} className="chart-bar">
                        <span className="bar-label">{difficulty}</span>
                        <div className="bar-container">
                          <div 
                            className="bar-fill"
                            style={{
                              width: `${(count / statistics.totalResults) * 100}%`
                            }}
                          />
                        </div>
                        <span className="bar-value">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {analytics && (
          <div className="analytics-section">
            <h4>Search History ({analytics.timeRange})</h4>
            <div className="analytics-grid">
              <div className="analytics-metric">
                <span className="metric-value">{analytics.totalQueries}</span>
                <span className="metric-label">Total Searches</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{analytics.averageSearchTime}ms</span>
                <span className="metric-label">Avg Search Time</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">
                  {Math.round(
                    (analytics.resultsDistribution.withResults / 
                     analytics.totalQueries) * 100
                  )}%
                </span>
                <span className="metric-label">Success Rate</span>
              </div>
            </div>

            <div className="popular-terms">
              <h5>Popular Search Terms</h5>
              <div className="terms-list">
                {analytics.popularTerms.map((term, index) => (
                  <div key={term.term} className="term-item">
                    <span className="term-rank">#{index + 1}</span>
                    <span className="term-text">{term.term}</span>
                    <span className="term-count">{term.count} searches</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!analytics && !statistics && (
          <div className="no-analytics">
            <p>No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAnalyticsComponent;