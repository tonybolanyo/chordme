/**
 * YouTube Integration Component
 * Provides YouTube video integration for songs with search and synchronization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { YouTubePlayer } from '../YouTubePlayer/YouTubePlayer';
import { YouTubeSearch } from '../YouTubePlayer/YouTubeSearch';
import { youtubeService } from '../../services/youtubeService';
import { apiRequest } from '../../utils/apiUtils';
import type {
  YouTubeSearchResult,
  YouTubeVideoData,
  YouTubeSyncConfig,
  ChordTimeMapping,
} from '../../types/audio';
import type { Song } from '../../types';
import './YouTubeIntegration.css';

export interface YouTubeIntegrationProps {
  song: Song;
  onError?: (error: string) => void;
  className?: string;
  autoSearch?: boolean;
  syncEnabled?: boolean;
  compact?: boolean;
}

interface LinkedVideoData {
  videoId: string;
  videoTitle: string;
  startTime?: number;
  endTime?: number;
  syncEnabled: boolean;
  chordMapping: ChordTimeMapping[];
  linkedAt: string;
  videoDetails: YouTubeVideoData;
}

export const YouTubeIntegration: React.FC<YouTubeIntegrationProps> = ({
  song,
  onError,
  className = '',
  autoSearch = true,
  syncEnabled = true,
  compact = false,
}) => {
  const [currentView, setCurrentView] = useState<'search' | 'player' | 'none'>('none');
  const [linkedVideo, setLinkedVideo] = useState<LinkedVideoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<YouTubeSearchResult[]>([]);
  const [syncConfig, setSyncConfig] = useState<YouTubeSyncConfig>({
    enabled: false,
    syncTolerance: 100,
    autoSync: true,
    syncMode: 'automatic',
  });

  // Load existing YouTube data for the song
  useEffect(() => {
    const loadYouTubeData = async () => {
      if (!song.id) return;

      try {
        setIsLoading(true);
        const response = await apiRequest<LinkedVideoData>(`/songs/${song.id}/youtube`);
        setLinkedVideo(response);
        setCurrentView('player');
        
        // Update sync config
        setSyncConfig(prev => ({
          ...prev,
          enabled: response.syncEnabled,
          chordProgression: response.chordMapping,
        }));
      } catch (err: any) {
        if (err.status !== 404) {
          const errorMsg = err.message || 'Failed to load YouTube data';
          setError(errorMsg);
          onError?.(errorMsg);
        }
        // If no YouTube data exists (404), show search if autoSearch is enabled
        if (autoSearch && err.status === 404) {
          setCurrentView('search');
          await loadSuggestions();
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadYouTubeData();
  }, [song.id, autoSearch, onError]);

  // Load video suggestions based on song
  const loadSuggestions = useCallback(async () => {
    if (!song.id) return;

    try {
      setIsLoading(true);
      const response = await apiRequest<{
        suggestions: YouTubeSearchResult[];
        query: string;
        total: number;
      }>(`/youtube/suggest/${song.id}`);
      setSuggestions(response.suggestions);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load video suggestions';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [song.id, onError]);

  // Handle video selection from search
  const handleVideoSelect = useCallback(async (video: YouTubeSearchResult) => {
    if (!song.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Link the video to the song
      const linkData = {
        videoId: video.videoId,
        title: video.title,
        syncEnabled: syncEnabled,
        chordMapping: [] as ChordTimeMapping[],
      };

      const response = await apiRequest<{
        message: string;
        videoId: string;
        songId: number;
        linkedAt: string;
      }>(`/songs/${song.id}/youtube`, {
        method: 'POST',
        body: JSON.stringify(linkData),
      });

      // Get the full video details
      const videoDetails = await apiRequest<YouTubeVideoData>(`/youtube/video/${video.videoId}`);

      // Create linked video data
      const linkedData: LinkedVideoData = {
        videoId: video.videoId,
        videoTitle: video.title,
        syncEnabled: syncEnabled,
        chordMapping: [],
        linkedAt: response.linkedAt,
        videoDetails,
      };

      setLinkedVideo(linkedData);
      setCurrentView('player');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to link video';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [song.id, syncEnabled, onError]);

  // Handle unlinking video
  const handleUnlinkVideo = useCallback(async () => {
    if (!song.id || !linkedVideo) return;

    try {
      setIsLoading(true);
      await apiRequest(`/songs/${song.id}/youtube`, {
        method: 'DELETE',
      });

      setLinkedVideo(null);
      setCurrentView(autoSearch ? 'search' : 'none');
      
      if (autoSearch) {
        await loadSuggestions();
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to unlink video';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [song.id, linkedVideo, autoSearch, loadSuggestions, onError]);

  // Handle YouTube player errors
  const handlePlayerError = useCallback((error: any) => {
    const errorMsg = error.message || 'YouTube player error';
    setError(errorMsg);
    onError?.(errorMsg);
  }, [onError]);

  // Handle chord highlighting (for future synchronization)
  const handleChordHighlight = useCallback((chord: ChordTimeMapping) => {
    // This would integrate with the ChordPro viewer to highlight chords
    console.log('Chord highlight:', chord);
  }, []);

  // Clear errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  if (!song.id) {
    return null;
  }

  return (
    <div className={`youtube-integration ${compact ? 'youtube-integration--compact' : ''} ${className}`}>
      <div className="youtube-integration__header">
        <h3 className="youtube-integration__title">
          {compact ? 'Video' : 'YouTube Integration'}
        </h3>
        
        <div className="youtube-integration__controls">
          {linkedVideo && (
            <>
              <button
                className="youtube-integration__button youtube-integration__button--search"
                onClick={() => setCurrentView('search')}
                disabled={isLoading}
                title="Search for different video"
              >
                🔍
              </button>
              <button
                className="youtube-integration__button youtube-integration__button--unlink"
                onClick={handleUnlinkVideo}
                disabled={isLoading}
                title="Unlink video"
              >
                ❌
              </button>
            </>
          )}
          
          {!linkedVideo && currentView === 'none' && (
            <button
              className="youtube-integration__button youtube-integration__button--add"
              onClick={() => {
                setCurrentView('search');
                if (autoSearch) loadSuggestions();
              }}
              disabled={isLoading}
              title="Add YouTube video"
            >
              ➕ Add Video
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="youtube-integration__error">
          <span className="youtube-integration__error-icon">⚠️</span>
          <span className="youtube-integration__error-message">{error}</span>
          <button
            className="youtube-integration__error-close"
            onClick={clearError}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {isLoading && (
        <div className="youtube-integration__loading">
          <div className="youtube-integration__loading-spinner">⏳</div>
          <span>Loading...</span>
        </div>
      )}

      <div className="youtube-integration__content">
        {currentView === 'search' && (
          <div className="youtube-integration__search">
            <YouTubeSearch
              onVideoSelect={handleVideoSelect}
              onError={onError}
              initialQuery={suggestions.length > 0 ? '' : `${song.title} official`}
              maxResults={compact ? 5 : 10}
              compact={compact}
            />
            
            {suggestions.length > 0 && (
              <div className="youtube-integration__suggestions">
                <h4 className="youtube-integration__suggestions-title">
                  Suggested for "{song.title}"
                </h4>
                <div className="youtube-integration__suggestions-list">
                  {suggestions.slice(0, compact ? 3 : 5).map((suggestion) => (
                    <div
                      key={suggestion.videoId}
                      className="youtube-integration__suggestion"
                      onClick={() => handleVideoSelect(suggestion)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleVideoSelect(suggestion);
                        }
                      }}
                    >
                      <img
                        src={suggestion.thumbnails.medium?.url || suggestion.thumbnails.default?.url}
                        alt={suggestion.title}
                        className="youtube-integration__suggestion-thumbnail"
                      />
                      <div className="youtube-integration__suggestion-info">
                        <h5 className="youtube-integration__suggestion-title">
                          {suggestion.title}
                        </h5>
                        <p className="youtube-integration__suggestion-channel">
                          {suggestion.channelTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'player' && linkedVideo && (
          <div className="youtube-integration__player">
            <YouTubePlayer
              videoId={linkedVideo.videoId}
              config={{
                apiKey: import.meta.env.VITE_YOUTUBE_API_KEY,
                start: linkedVideo.startTime,
                end: linkedVideo.endTime,
              }}
              syncConfig={syncConfig}
              onPlayerReady={() => console.log('Player ready')}
              onError={handlePlayerError}
              onChordHighlight={handleChordHighlight}
              height={compact ? 200 : 360}
              width={compact ? 300 : 640}
            />
            
            <div className="youtube-integration__video-info">
              <h4 className="youtube-integration__video-title">
                {linkedVideo.videoTitle}
              </h4>
              <p className="youtube-integration__video-channel">
                {linkedVideo.videoDetails.channelTitle}
              </p>
              <p className="youtube-integration__video-linked">
                Linked {new Date(linkedVideo.linkedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {currentView === 'none' && !linkedVideo && (
          <div className="youtube-integration__empty">
            <div className="youtube-integration__empty-icon">🎵</div>
            <p className="youtube-integration__empty-message">
              No YouTube video linked to this song
            </p>
            <button
              className="youtube-integration__empty-button"
              onClick={() => {
                setCurrentView('search');
                if (autoSearch) loadSuggestions();
              }}
            >
              Search for Videos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeIntegration;