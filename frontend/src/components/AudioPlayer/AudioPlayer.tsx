/**
 * Audio Player Component
 * Main UI component for audio playback controls
 */

import React, { useRef, useEffect } from 'react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { AudioPlayerProps, AudioSource } from '../../types/audio';
import './AudioPlayer.css';

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  playlist,
  autoPlay = false,
  showVisualization = false,
  visualizationConfig,
  keyboardShortcuts = true,
  customShortcuts,
  className = '',
  theme = 'auto',
  compact = false,
  showPlaylist = true,
  enableCrossfade = false,
  onTrackChange,
  onPlaylistChange,
  onError,
}) => {
  const playerRef = useRef<HTMLDivElement>(null);
  
  const {
    state,
    isPlaying,
    isPaused,
    isStopped,
    isLoading,
    hasError,
    visualizationData,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    loadTrack,
    loadPlaylist,
    nextTrack,
    previousTrack,
    formatTime,
    getProgress,
    clearError,
  } = useAudioPlayer({
    autoPlay,
    enableVisualization: showVisualization,
    onTrackChange,
    onError,
  });

  // Load playlist when it changes
  useEffect(() => {
    if (playlist) {
      loadPlaylist(playlist);
      onPlaylistChange?.(playlist);
    }
  }, [playlist, loadPlaylist, onPlaylistChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrlOrCmd = event.ctrlKey || event.metaKey;

      switch (key) {
        case ' ':
        case 'k':
          event.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          break;
        case 'arrowleft':
          if (ctrlOrCmd) {
            event.preventDefault();
            previousTrack();
          } else {
            event.preventDefault();
            seek(Math.max(0, state.currentTime - 10));
          }
          break;
        case 'arrowright':
          if (ctrlOrCmd) {
            event.preventDefault();
            nextTrack();
          } else {
            event.preventDefault();
            seek(Math.min(state.duration, state.currentTime + 10));
          }
          break;
        case 'arrowup':
          event.preventDefault();
          setVolume(Math.min(1, state.volume + 0.1));
          break;
        case 'arrowdown':
          event.preventDefault();
          setVolume(Math.max(0, state.volume - 0.1));
          break;
        case 'm':
          event.preventDefault();
          setVolume(state.volume > 0 ? 0 : 1);
          break;
        case 's':
          if (ctrlOrCmd) {
            event.preventDefault();
            stop();
          }
          break;
        case 'escape':
          if (hasError) {
            clearError();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    keyboardShortcuts,
    isPlaying,
    state.currentTime,
    state.duration,
    state.volume,
    hasError,
    play,
    pause,
    stop,
    seek,
    setVolume,
    nextTrack,
    previousTrack,
    clearError,
  ]);

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / rect.width;
    const newTime = clickPosition * state.duration;
    seek(newTime);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(event.target.value));
  };

  const handlePlaybackRateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPlaybackRate(parseFloat(event.target.value));
  };

  const getVolumeIcon = () => {
    if (state.volume === 0) return '🔇';
    if (state.volume < 0.3) return '🔈';
    if (state.volume < 0.7) return '🔉';
    return '🔊';
  };

  const getPlayIcon = () => {
    if (isLoading) return '⏳';
    if (isPlaying) return '⏸️';
    return '▶️';
  };

  const playerClasses = [
    'audio-player',
    className,
    `audio-player--${theme}`,
    compact && 'audio-player--compact',
    hasError && 'audio-player--error',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={playerRef} className={playerClasses} role="region" aria-label="Audio Player">
      {/* Error Display */}
      {hasError && state.error && (
        <div className="audio-player__error" role="alert">
          <span className="audio-player__error-message">{state.error.message}</span>
          <button
            className="audio-player__error-close"
            onClick={clearError}
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Track Info */}
      {state.currentTrack && (
        <div className="audio-player__track-info">
          <div className="audio-player__track-title">{state.currentTrack.title}</div>
          {state.currentTrack.artist && (
            <div className="audio-player__track-artist">{state.currentTrack.artist}</div>
          )}
        </div>
      )}

      {/* Main Controls */}
      <div className="audio-player__controls">
        <button
          className="audio-player__button audio-player__button--previous"
          onClick={previousTrack}
          disabled={!state.currentPlaylist || state.currentPlaylist.items.length <= 1}
          aria-label="Previous track"
        >
          ⏮️
        </button>

        <button
          className="audio-player__button audio-player__button--play"
          onClick={isPlaying ? pause : play}
          disabled={!state.currentTrack || isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {getPlayIcon()}
        </button>

        <button
          className="audio-player__button audio-player__button--stop"
          onClick={stop}
          disabled={!state.currentTrack || isStopped}
          aria-label="Stop"
        >
          ⏹️
        </button>

        <button
          className="audio-player__button audio-player__button--next"
          onClick={nextTrack}
          disabled={!state.currentPlaylist || state.currentPlaylist.items.length <= 1}
          aria-label="Next track"
        >
          ⏭️
        </button>
      </div>

      {/* Progress Bar */}
      <div className="audio-player__progress-container">
        <span className="audio-player__time audio-player__time--current">
          {formatTime(state.currentTime)}
        </span>
        
        <div
          className="audio-player__progress"
          onClick={handleProgressClick}
          role="slider"
          aria-label="Seek"
          aria-valuenow={state.currentTime}
          aria-valuemin={0}
          aria-valuemax={state.duration}
          tabIndex={0}
        >
          <div className="audio-player__progress-track">
            <div
              className="audio-player__progress-fill"
              style={{ width: `${getProgress()}%` }}
            />
            {state.isBuffering && (
              <div
                className="audio-player__progress-buffer"
                style={{ width: `${state.bufferProgress * 100}%` }}
              />
            )}
          </div>
        </div>
        
        <span className="audio-player__time audio-player__time--duration">
          {formatTime(state.duration)}
        </span>
      </div>

      {/* Additional Controls */}
      <div className="audio-player__additional-controls">
        {/* Volume Control */}
        <div className="audio-player__volume-container">
          <span className="audio-player__volume-icon">{getVolumeIcon()}</span>
          <input
            type="range"
            className="audio-player__volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={state.volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </div>

        {/* Playback Rate Control */}
        <div className="audio-player__rate-container">
          <label htmlFor="playback-rate" className="audio-player__rate-label">
            Speed:
          </label>
          <select
            id="playback-rate"
            className="audio-player__rate-select"
            value={state.playbackRate}
            onChange={handlePlaybackRateChange}
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>

      {/* Visualization */}
      {showVisualization && visualizationData && (
        <div className="audio-player__visualization">
          <canvas
            ref={(canvas) => {
              if (canvas && visualizationData) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  // Simple frequency bar visualization
                  const { frequencyData } = visualizationData;
                  const bufferLength = frequencyData.length;
                  const barWidth = canvas.width / bufferLength;
                  
                  ctx.fillStyle = '#1a1a1a';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (frequencyData[i] / 255) * canvas.height;
                    const hue = (i / bufferLength) * 360;
                    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                    ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth, barHeight);
                  }
                }
              }
            }}
            className="audio-player__visualization-canvas"
            width={300}
            height={100}
          />
        </div>
      )}

      {/* Playlist */}
      {showPlaylist && state.currentPlaylist && (
        <div className="audio-player__playlist">
          <h3 className="audio-player__playlist-title">{state.currentPlaylist.name}</h3>
          <ul className="audio-player__playlist-items">
            {state.currentPlaylist.items.map((item, index) => (
              <li
                key={item.id}
                className={`audio-player__playlist-item ${
                  index === state.currentPlaylist!.currentIndex
                    ? 'audio-player__playlist-item--current'
                    : ''
                }`}
              >
                <button
                  className="audio-player__playlist-item-button"
                  onClick={() => loadTrack(item.audioSource)}
                >
                  <span className="audio-player__playlist-item-title">
                    {item.customTitle || item.audioSource.title}
                  </span>
                  {item.audioSource.artist && (
                    <span className="audio-player__playlist-item-artist">
                      {item.audioSource.artist}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status Indicators */}
      <div className="audio-player__status">
        {state.usingFallback && (
          <span className="audio-player__status-indicator" title="Using HTML5 Audio fallback">
            🔄
          </span>
        )}
        {state.isBuffering && (
          <span className="audio-player__status-indicator" title="Buffering">
            ⏳
          </span>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;