/**
 * Audio Playback Engine Type Definitions
 * Provides comprehensive typing for audio functionality
 */

// Supported audio formats
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac' | 'm4a' | 'flac';

// Audio playback states
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

// Audio quality levels for caching
export type AudioQuality = 'low' | 'medium' | 'high';

// Crossfade types
export type CrossfadeType = 'none' | 'linear' | 'exponential' | 'logarithmic';

// Audio visualization types
export type VisualizationType = 'waveform' | 'spectrum' | 'oscilloscope' | 'none';

// Audio source information
export interface AudioSource {
  id: string;
  url: string;
  title: string;
  artist?: string;
  duration?: number;
  format: AudioFormat;
  quality: AudioQuality;
  fileSize?: number;
  metadata?: AudioMetadata;
}

// Audio metadata
export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
  duration?: number;
  artwork?: string;
}

// Playback configuration
export interface PlaybackConfig {
  volume: number; // 0-1
  playbackRate: number; // 0.5-2.0
  loop: boolean;
  shuffle: boolean;
  crossfade: CrossfadeConfig;
  preloadNext: boolean;
  gaplessPlayback: boolean;
}

// Crossfade configuration
export interface CrossfadeConfig {
  enabled: boolean;
  duration: number; // seconds
  type: CrossfadeType;
  curve?: number; // custom curve parameter
}

// Audio visualization configuration
export interface VisualizationConfig {
  type: VisualizationType;
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
  height: number;
  width: number;
  color: string;
  backgroundColor: string;
  responsive: boolean;
}

// Playlist item
export interface PlaylistItem {
  id: string;
  audioSource: AudioSource;
  order: number;
  addedAt: Date;
  playCount: number;
  lastPlayed?: Date;
  customTitle?: string;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

// Playlist configuration
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  items: PlaylistItem[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  createdAt: Date;
  updatedAt: Date;
  duration?: number;
  tags?: string[];
}

// Audio engine state
export interface AudioEngineState {
  playbackState: PlaybackState;
  currentTrack?: AudioSource;
  currentPlaylist?: Playlist;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isBuffering: boolean;
  bufferProgress: number;
  error?: AudioError;
  isSupported: boolean;
  usingFallback: boolean;
}

// Audio error types
export interface AudioError {
  code: AudioErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export enum AudioErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  DECODE_ERROR = 'DECODE_ERROR',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_SOURCE = 'INVALID_SOURCE',
  PLAYBACK_FAILED = 'PLAYBACK_FAILED',
  BUFFER_UNDERRUN = 'BUFFER_UNDERRUN',
  DEVICE_BUSY = 'DEVICE_BUSY',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CROSSFADE_FAILED = 'CROSSFADE_FAILED',
}

// Audio engine capabilities
export interface AudioCapabilities {
  webAudioSupported: boolean;
  html5AudioSupported: boolean;
  supportedFormats: AudioFormat[];
  maxChannels: number;
  maxSampleRate: number;
  canPlayType: (format: AudioFormat) => boolean;
  hasAudioContext: boolean;
  hasGainNode: boolean;
  hasAnalyserNode: boolean;
  hasPannerNode: boolean;
  hasConvolverNode: boolean;
}

// Audio cache entry
export interface AudioCacheEntry {
  id: string;
  url: string;
  buffer?: ArrayBuffer;
  audioBuffer?: AudioBuffer;
  size: number;
  cachedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  quality: AudioQuality;
  format: AudioFormat;
  expires?: Date;
}

// Audio cache configuration
export interface AudioCacheConfig {
  maxSize: number; // bytes
  maxEntries: number;
  ttl: number; // seconds
  preloadNext: boolean;
  preloadCount: number;
  compressionEnabled: boolean;
  persistToStorage: boolean;
}

// Audio visualization data
export interface VisualizationData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  analyserNode?: AnalyserNode;
  bufferLength: number;
  sampleRate: number;
  nyquist: number;
}

// Audio events
export interface AudioEventMap {
  'statechange': { state: PlaybackState; previousState: PlaybackState };
  'timeupdate': { currentTime: number; duration: number; progress: number };
  'volumechange': { volume: number };
  'ratechange': { playbackRate: number };
  'trackchange': { track: AudioSource; index: number };
  'playlistchange': { playlist: Playlist };
  'error': { error: AudioError };
  'loading': { progress: number };
  'loaded': { track: AudioSource };
  'ended': { track: AudioSource };
  'buffering': { isBuffering: boolean; progress: number };
  'visualization': { data: VisualizationData };
}

// Audio engine interface
export interface IAudioEngine {
  // Playback control
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  
  // Track management
  loadTrack(source: AudioSource): Promise<void>;
  preloadTrack(source: AudioSource): Promise<void>;
  
  // Playlist management
  loadPlaylist(playlist: Playlist): void;
  next(): Promise<void>;
  previous(): Promise<void>;
  skipToTrack(index: number): Promise<void>;
  
  // Configuration
  updateConfig(config: Partial<PlaybackConfig>): void;
  getCapabilities(): AudioCapabilities;
  
  // State
  getState(): AudioEngineState;
  
  // Events
  addEventListener<K extends keyof AudioEventMap>(
    type: K,
    listener: (event: AudioEventMap[K]) => void
  ): void;
  removeEventListener<K extends keyof AudioEventMap>(
    type: K,
    listener: (event: AudioEventMap[K]) => void
  ): void;
  
  // Cleanup
  destroy(): void;
}

// Keyboard shortcuts for audio
export interface AudioKeyboardShortcuts {
  play: string[];
  pause: string[];
  stop: string[];
  next: string[];
  previous: string[];
  volumeUp: string[];
  volumeDown: string[];
  mute: string[];
  speedUp: string[];
  speedDown: string[];
  speedReset: string[];
  seek: { forward: string[]; backward: string[] };
}

// Audio player component props
export interface AudioPlayerProps {
  playlist?: Playlist;
  autoPlay?: boolean;
  showVisualization?: boolean;
  visualizationConfig?: Partial<VisualizationConfig>;
  keyboardShortcuts?: boolean;
  customShortcuts?: Partial<AudioKeyboardShortcuts>;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  compact?: boolean;
  showPlaylist?: boolean;
  enableCrossfade?: boolean;
  onTrackChange?: (track: AudioSource) => void;
  onPlaylistChange?: (playlist: Playlist) => void;
  onError?: (error: AudioError) => void;
}

// Export all interfaces for easy importing
export type {
  AudioSource,
  AudioMetadata,
  PlaybackConfig,
  CrossfadeConfig,
  VisualizationConfig,
  PlaylistItem,
  Playlist,
  AudioEngineState,
  AudioError,
  AudioCapabilities,
  AudioCacheEntry,
  AudioCacheConfig,
  VisualizationData,
  AudioEventMap,
  IAudioEngine,
  AudioKeyboardShortcuts,
  AudioPlayerProps,
};