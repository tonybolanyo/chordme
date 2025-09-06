/**
 * Audio Player Hook
 * React hook for managing audio playback state and controls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import {
  AudioSource,
  PlaybackState,
  AudioEngineState,
  AudioError,
  Playlist,
  PlaylistItem,
  VisualizationData,
} from '../types/audio';

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  enableVisualization?: boolean;
  onTrackChange?: (track: AudioSource) => void;
  onError?: (error: AudioError) => void;
}

export interface UseAudioPlayerReturn {
  // State
  state: AudioEngineState;
  isPlaying: boolean;
  isPaused: boolean;
  isStopped: boolean;
  isLoading: boolean;
  hasError: boolean;
  visualizationData: VisualizationData | null;
  
  // Controls
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  
  // Track management
  loadTrack: (source: AudioSource) => Promise<void>;
  loadPlaylist: (playlist: Playlist) => void;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  skipToTrack: (index: number) => Promise<void>;
  
  // Utility
  formatTime: (seconds: number) => string;
  getProgress: () => number;
  clearError: () => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn {
  const {
    autoPlay = false,
    enableVisualization = false,
    onTrackChange,
    onError,
  } = options;

  const [state, setState] = useState<AudioEngineState>(audioEngine.getState());
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);
  const visualizationFrameId = useRef<number>();
  const isFirstTrack = useRef(true);

  // Update local state when audio engine state changes
  useEffect(() => {
    const handleStateChange = () => {
      setState(audioEngine.getState());
    };

    const handleTimeUpdate = () => {
      setState(audioEngine.getState());
    };

    const handleVolumeChange = () => {
      setState(audioEngine.getState());
    };

    const handleRateChange = () => {
      setState(audioEngine.getState());
    };

    const handleTrackChange = (event: { track: AudioSource; index: number }) => {
      setState(audioEngine.getState());
      onTrackChange?.(event.track);
    };

    const handleError = (event: { error: AudioError }) => {
      setState(audioEngine.getState());
      onError?.(event.error);
    };

    const handleLoaded = () => {
      setState(audioEngine.getState());
      
      // Auto-play first track if enabled
      if (autoPlay && isFirstTrack.current) {
        audioEngine.play();
        isFirstTrack.current = false;
      }
    };

    // Subscribe to audio engine events
    audioEngine.addEventListener('statechange', handleStateChange);
    audioEngine.addEventListener('timeupdate', handleTimeUpdate);
    audioEngine.addEventListener('volumechange', handleVolumeChange);
    audioEngine.addEventListener('ratechange', handleRateChange);
    audioEngine.addEventListener('trackchange', handleTrackChange);
    audioEngine.addEventListener('error', handleError);
    audioEngine.addEventListener('loaded', handleLoaded);

    // Initial state sync
    handleStateChange();

    return () => {
      audioEngine.removeEventListener('statechange', handleStateChange);
      audioEngine.removeEventListener('timeupdate', handleTimeUpdate);
      audioEngine.removeEventListener('volumechange', handleVolumeChange);
      audioEngine.removeEventListener('ratechange', handleRateChange);
      audioEngine.removeEventListener('trackchange', handleTrackChange);
      audioEngine.removeEventListener('error', handleError);
      audioEngine.removeEventListener('loaded', handleLoaded);
    };
  }, [autoPlay, onTrackChange, onError]);

  // Visualization data updates
  useEffect(() => {
    if (!enableVisualization) {
      setVisualizationData(null);
      return;
    }

    const updateVisualization = () => {
      if (state.playbackState === 'playing') {
        const data = audioEngine.getVisualizationData();
        setVisualizationData(data);
      }
      visualizationFrameId.current = requestAnimationFrame(updateVisualization);
    };

    if (state.playbackState === 'playing') {
      visualizationFrameId.current = requestAnimationFrame(updateVisualization);
    }

    return () => {
      if (visualizationFrameId.current) {
        cancelAnimationFrame(visualizationFrameId.current);
      }
    };
  }, [enableVisualization, state.playbackState]);

  // Control functions
  const play = useCallback(async () => {
    try {
      await audioEngine.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, []);

  const pause = useCallback(() => {
    audioEngine.pause();
  }, []);

  const stop = useCallback(() => {
    audioEngine.stop();
  }, []);

  const seek = useCallback((time: number) => {
    audioEngine.seek(time);
  }, []);

  const setVolume = useCallback((volume: number) => {
    audioEngine.setVolume(volume);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    audioEngine.setPlaybackRate(rate);
  }, []);

  const loadTrack = useCallback(async (source: AudioSource) => {
    try {
      await audioEngine.loadTrack(source);
    } catch (error) {
      console.error('Failed to load track:', error);
    }
  }, []);

  const loadPlaylist = useCallback((playlist: Playlist) => {
    audioEngine.loadPlaylist(playlist);
  }, []);

  const nextTrack = useCallback(async () => {
    try {
      await audioEngine.next();
    } catch (error) {
      console.error('Failed to go to next track:', error);
    }
  }, []);

  const previousTrack = useCallback(async () => {
    try {
      await audioEngine.previous();
    } catch (error) {
      console.error('Failed to go to previous track:', error);
    }
  }, []);

  const skipToTrack = useCallback(async (index: number) => {
    try {
      await audioEngine.skipToTrack(index);
    } catch (error) {
      console.error('Failed to skip to track:', error);
    }
  }, []);

  // Utility functions
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) {
      return '0:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getProgress = useCallback((): number => {
    if (state.duration === 0) return 0;
    return (state.currentTime / state.duration) * 100;
  }, [state.currentTime, state.duration]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // Computed state values
  const isPlaying = state.playbackState === 'playing';
  const isPaused = state.playbackState === 'paused';
  const isStopped = state.playbackState === 'stopped' || state.playbackState === 'idle';
  const isLoading = state.playbackState === 'loading' || state.isBuffering;
  const hasError = !!state.error;

  return {
    // State
    state,
    isPlaying,
    isPaused,
    isStopped,
    isLoading,
    hasError,
    visualizationData,

    // Controls
    play,
    pause,
    stop,
    seek,
    setVolume,
    setPlaybackRate,

    // Track management
    loadTrack,
    loadPlaylist,
    nextTrack,
    previousTrack,
    skipToTrack,

    // Utility
    formatTime,
    getProgress,
    clearError,
  };
}

export default useAudioPlayer;