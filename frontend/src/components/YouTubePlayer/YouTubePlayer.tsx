/**
 * YouTube Player Component
 * Integrates YouTube video playback with chord chart synchronization
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { youtubeService, YouTubePlayerState } from '../../services/youtubeService';
import {
  YouTubeVideoData,
  YouTubePlayerConfig,
  YouTubeSyncConfig,
  ChordTimeMapping,
} from '../../types/audio';
import './YouTubePlayer.css';

export interface YouTubePlayerProps {
  videoId?: string;
  config?: Partial<YouTubePlayerConfig>;
  syncConfig?: YouTubeSyncConfig;
  onPlayerReady?: (player: unknown) => void;
  onStateChange?: (state: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onError?: (error: unknown) => void;
  onChordHighlight?: (chord: ChordTimeMapping) => void;
  className?: string;
  height?: number;
  width?: number;
  autoplay?: boolean;
  muted?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  config = {},
  syncConfig,
  onPlayerReady,
  onStateChange,
  onTimeUpdate,
  onError,
  onChordHighlight,
  className = '',
  height = 360,
  width = 640,
  autoplay = false,
  muted = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<unknown>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentState, setCurrentState] = useState<number>(YouTubePlayerState.UNSTARTED);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const playerId = useRef<string>(`youtube-player-${Math.random().toString(36).substr(2, 9)}`);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize YouTube service and create player
  useEffect(() => {
    if (!containerRef.current) return;

    const initializePlayer = async () => {
      try {
        // Use environment variable or config for API key
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || config.apiKey || '';
        
        if (!apiKey) {
          throw new Error('YouTube API key not provided');
        }

        // Initialize service
        await youtubeService.initialize(apiKey);

        // Set container ID
        containerRef.current!.id = playerId.current;

        // Player configuration
        const playerConfig: YouTubePlayerConfig = {
          apiKey,
          autoplay,
          loop: false,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
          ...config,
        };

        // Create player
        const player = await youtubeService.createPlayer(playerId.current, playerConfig);
        playerRef.current = player;

        // Set up event listeners
        youtubeService.addEventListener(playerId.current, 'stateChange', handleStateChange);
        youtubeService.addEventListener(playerId.current, 'error', handleError);

        // Set initial volume
        if (muted) {
          youtubeService.mute(playerId.current);
        } else {
          youtubeService.setVolume(playerId.current, volume);
        }

        setIsPlayerReady(true);
        onPlayerReady?.(player);

        // Start time tracking
        startTimeTracking();

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize YouTube player';
        setError(errorMsg);
        onError?.(err);
      }
    };

    initializePlayer();

    // Cleanup
    return () => {
      stopTimeTracking();
      if (playerId.current) {
        youtubeService.destroyPlayer(playerId.current);
      }
    };
  }, []);

  // Load video when videoId changes
  useEffect(() => {
    if (isPlayerReady && videoId && playerRef.current) {
      try {
        playerRef.current.loadVideoById(videoId);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load video';
        setError(errorMsg);
        onError?.(err);
      }
    }
  }, [videoId, isPlayerReady]);

  // Update sync configuration
  useEffect(() => {
    if (isPlayerReady && syncConfig) {
      youtubeService.syncWithChords(playerId.current, syncConfig);
    }
  }, [syncConfig, isPlayerReady]);

  // Set up chord highlight listeners
  useEffect(() => {
    const handleChordHighlight = (event: CustomEvent) => {
      if (event.detail.playerId === playerId.current) {
        onTimeUpdate?.(event.detail.currentTime);
      }
    };

    const handleChordChange = (event: CustomEvent) => {
      if (event.detail.playerId === playerId.current) {
        onChordHighlight?.(event.detail.chord);
      }
    };

    window.addEventListener('youtube-chord-highlight', handleChordHighlight as EventListener);
    window.addEventListener('youtube-chord-change', handleChordChange as EventListener);

    return () => {
      window.removeEventListener('youtube-chord-highlight', handleChordHighlight as EventListener);
      window.removeEventListener('youtube-chord-change', handleChordChange as EventListener);
    };
  }, [onTimeUpdate, onChordHighlight]);

  const handleStateChange = useCallback((event: unknown) => {
    const state = event.data;
    setCurrentState(state);
    onStateChange?.(state);

    // Update duration when video is loaded
    if (state === YouTubePlayerState.PLAYING || state === YouTubePlayerState.PAUSED) {
      const newDuration = youtubeService.getDuration(playerId.current);
      if (newDuration > 0) {
        setDuration(newDuration);
      }
    }
  }, [onStateChange]);

  const handleError = useCallback((event: unknown) => {
    let errorMessage = 'YouTube player error';
    
    switch (event.data) {
      case 2:
        errorMessage = 'Invalid video ID or parameter';
        break;
      case 5:
        errorMessage = 'HTML5 player error';
        break;
      case 100:
        errorMessage = 'Video not found or private';
        break;
      case 101:
      case 150:
        errorMessage = 'Video cannot be embedded';
        break;
    }

    setError(errorMessage);
    onError?.(new Error(errorMessage));
  }, [onError]);

  const startTimeTracking = useCallback(() => {
    if (timeUpdateInterval.current) return;

    timeUpdateInterval.current = setInterval(() => {
      if (currentState === YouTubePlayerState.PLAYING) {
        const time = youtubeService.getCurrentTime(playerId.current);
        setCurrentTime(time);
        onTimeUpdate?.(time);
      }
    }, 100); // Update every 100ms for smooth tracking
  }, [currentState, onTimeUpdate]);

  const stopTimeTracking = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, []);

  // Player control methods
  const play = useCallback(() => {
    if (isPlayerReady) {
      youtubeService.playVideo(playerId.current);
    }
  }, [isPlayerReady]);

  const pause = useCallback(() => {
    if (isPlayerReady) {
      youtubeService.pauseVideo(playerId.current);
    }
  }, [isPlayerReady]);

  const seekTo = useCallback((seconds: number) => {
    if (isPlayerReady) {
      youtubeService.seekTo(playerId.current, seconds);
      setCurrentTime(seconds);
    }
  }, [isPlayerReady]);

  const setVolumeLevel = useCallback((level: number) => {
    if (isPlayerReady) {
      const clampedVolume = Math.max(0, Math.min(1, level));
      youtubeService.setVolume(playerId.current, clampedVolume);
      setVolume(clampedVolume);
    }
  }, [isPlayerReady]);

  const mute = useCallback(() => {
    if (isPlayerReady) {
      youtubeService.mute(playerId.current);
    }
  }, [isPlayerReady]);

  const unmute = useCallback(() => {
    if (isPlayerReady) {
      youtubeService.unMute(playerId.current);
    }
  }, [isPlayerReady]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = currentState === YouTubePlayerState.PLAYING;
  const isPaused = currentState === YouTubePlayerState.PAUSED;
  const isBuffering = currentState === YouTubePlayerState.BUFFERING;

  return (
    <div className={`youtube-player ${className}`}>
      {error && (
        <div className="youtube-player__error">
          <span className="youtube-player__error-icon">⚠️</span>
          <span className="youtube-player__error-message">{error}</span>
        </div>
      )}
      
      <div className="youtube-player__container">
        <div
          ref={containerRef}
          className="youtube-player__iframe"
          style={{ width, height }}
        />
        
        {isBuffering && (
          <div className="youtube-player__buffering">
            <div className="youtube-player__buffering-spinner">⏳</div>
            <span>Loading video...</span>
          </div>
        )}
      </div>

      <div className="youtube-player__controls">
        <div className="youtube-player__playback-controls">
          <button
            className={`youtube-player__button youtube-player__button--play ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? pause : play}
            disabled={!isPlayerReady}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          <div className="youtube-player__time-display">
            <span className="youtube-player__current-time">
              {formatTime(currentTime)}
            </span>
            <span className="youtube-player__time-separator">/</span>
            <span className="youtube-player__duration">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="youtube-player__progress-container">
          <input
            type="range"
            className="youtube-player__progress-bar"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            disabled={!isPlayerReady || duration === 0}
            aria-label="Seek"
          />
          <div
            className="youtube-player__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="youtube-player__volume-controls">
          <button
            className="youtube-player__button youtube-player__button--mute"
            onClick={youtubeService.isMuted(playerId.current) ? unmute : mute}
            disabled={!isPlayerReady}
            aria-label={youtubeService.isMuted(playerId.current) ? 'Unmute' : 'Mute'}
          >
            {youtubeService.isMuted(playerId.current) ? '🔇' : '🔊'}
          </button>

          <input
            type="range"
            className="youtube-player__volume-bar"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
            disabled={!isPlayerReady}
            aria-label="Volume"
          />
        </div>

        {syncConfig?.enabled && (
          <div className="youtube-player__sync-indicator">
            <span className="youtube-player__sync-icon">🎵</span>
            <span className="youtube-player__sync-text">Synced</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubePlayer;