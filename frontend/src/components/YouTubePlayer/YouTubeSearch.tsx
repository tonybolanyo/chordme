/**
 * YouTube Search Component
 * Allows users to search for and select YouTube videos
 */

import React, { useState, useCallback, useEffect } from 'react';
import { youtubeService } from '../../services/youtubeService';
import {
  YouTubeSearchParams,
  YouTubeSearchResult,
  YouTubeVideoData,
} from '../../types/audio';
import './YouTubeSearch.css';

export interface YouTubeSearchProps {
  onVideoSelect: (video: YouTubeSearchResult) => void;
  onError?: (error: string) => void;
  initialQuery?: string;
  maxResults?: number;
  className?: string;
  compact?: boolean;
}

export const YouTubeSearch: React.FC<YouTubeSearchProps> = ({
  onVideoSelect,
  onError,
  initialQuery = '',
  maxResults = 10,
  className = '',
  compact = false,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<Partial<YouTubeSearchParams>>({
    order: 'relevance',
    videoDuration: 'any',
    videoDefinition: 'any',
  });

  // Auto-search when initial query is provided
  useEffect(() => {
    if (initialQuery.trim()) {
      handleSearch();
    }
  }, [initialQuery]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const searchOptions: YouTubeSearchParams = {
        query: query.trim(),
        maxResults,
        ...searchParams,
      };

      const searchResults = await youtubeService.searchVideos(searchOptions);
      setResults(searchResults);

      if (searchResults.length === 0) {
        setError('No videos found for your search');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [query, searchParams, maxResults, onError]);

  const handleVideoSelect = useCallback((video: YouTubeSearchResult) => {
    setSelectedVideo(video.videoId);
    onVideoSelect(video);
  }, [onVideoSelect]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const formatDuration = useCallback((duration: string) => {
    // Parse ISO 8601 duration format (PT1H2M3S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const formatViewCount = useCallback((count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  }, []);

  const truncateText = useCallback((text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }, []);

  return (
    <div className={`youtube-search ${compact ? 'youtube-search--compact' : ''} ${className}`}>
      <div className="youtube-search__header">
        <h3 className="youtube-search__title">
          {compact ? 'Search Videos' : 'Search YouTube Videos'}
        </h3>
        
        <div className="youtube-search__search-container">
          <div className="youtube-search__input-group">
            <input
              type="text"
              className="youtube-search__input"
              placeholder="Search for songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="youtube-search__search-button"
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              aria-label="Search"
            >
              {isLoading ? '⏳' : '🔍'}
            </button>
          </div>

          {!compact && (
            <div className="youtube-search__filters">
              <select
                className="youtube-search__filter"
                value={searchParams.order}
                onChange={(e) => setSearchParams(prev => ({ ...prev, order: e.target.value as any }))}
              >
                <option value="relevance">Most Relevant</option>
                <option value="date">Newest</option>
                <option value="viewCount">Most Viewed</option>
                <option value="rating">Highest Rated</option>
                <option value="title">Title</option>
              </select>

              <select
                className="youtube-search__filter"
                value={searchParams.videoDuration}
                onChange={(e) => setSearchParams(prev => ({ ...prev, videoDuration: e.target.value as any }))}
              >
                <option value="any">Any Duration</option>
                <option value="short">Under 4 minutes</option>
                <option value="medium">4-20 minutes</option>
                <option value="long">Over 20 minutes</option>
              </select>

              <select
                className="youtube-search__filter"
                value={searchParams.videoDefinition}
                onChange={(e) => setSearchParams(prev => ({ ...prev, videoDefinition: e.target.value as any }))}
              >
                <option value="any">Any Quality</option>
                <option value="high">HD</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="youtube-search__error">
          <span className="youtube-search__error-icon">⚠️</span>
          <span className="youtube-search__error-message">{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="youtube-search__loading">
          <div className="youtube-search__loading-spinner">⏳</div>
          <span>Searching YouTube...</span>
        </div>
      )}

      <div className="youtube-search__results">
        {results.map((video) => (
          <div
            key={video.videoId}
            className={`youtube-search__result ${
              selectedVideo === video.videoId ? 'youtube-search__result--selected' : ''
            }`}
            onClick={() => handleVideoSelect(video)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleVideoSelect(video);
              }
            }}
          >
            <div className="youtube-search__thumbnail-container">
              <img
                src={video.thumbnails.medium?.url || video.thumbnails.default?.url}
                alt={video.title}
                className="youtube-search__thumbnail"
                loading="lazy"
              />
              <div className="youtube-search__duration">
                {formatDuration(video.duration)}
              </div>
            </div>

            <div className="youtube-search__info">
              <h4 className="youtube-search__video-title">
                {compact ? truncateText(video.title, 60) : video.title}
              </h4>
              
              <p className="youtube-search__channel">
                {video.channelTitle}
              </p>

              {!compact && (
                <p className="youtube-search__description">
                  {truncateText(video.description, 120)}
                </p>
              )}

              <div className="youtube-search__metadata">
                {video.viewCount && (
                  <span className="youtube-search__views">
                    {formatViewCount(video.viewCount)}
                  </span>
                )}
                <span className="youtube-search__published">
                  {new Date(video.publishedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {selectedVideo === video.videoId && (
              <div className="youtube-search__selected-indicator">
                ✓
              </div>
            )}
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="youtube-search__footer">
          <p className="youtube-search__results-count">
            {results.length} video{results.length !== 1 ? 's' : ''} found
          </p>
          {results.length === maxResults && (
            <p className="youtube-search__more-hint">
              Try a more specific search for better results
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default YouTubeSearch;