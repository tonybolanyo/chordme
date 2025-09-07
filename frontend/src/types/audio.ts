/**
 * Audio Playback Engine Type Definitions
 * Provides comprehensive typing for audio functionality
 */

// Supported audio formats
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac' | 'm4a' | 'flac' | 'youtube';

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
  youtubeData?: YouTubeVideoData;
}

// YouTube-specific video data
export interface YouTubeVideoData {
  videoId: string;
  title: string;
  channelTitle?: string;
  description?: string;
  thumbnails?: YouTubeThumbnails;
  publishedAt?: string;
  duration?: string; // ISO 8601 duration format
  viewCount?: number;
  likeCount?: number;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
  startTime?: number; // Start offset in seconds for synchronization
  endTime?: number; // End offset in seconds
}

// YouTube thumbnail data
export interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
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
  youtubePlayerState?: YouTubePlayerState;
}

// YouTube Player API state
export interface YouTubePlayerState {
  isReady: boolean;
  playerState: number; // YouTube player state constants
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackQuality: string;
  availableQualityLevels: string[];
  videoLoadedFraction: number;
}

// Audio error types
export interface AudioError {
  code: AudioErrorCode;
  message: string;
  details?: Record<string, unknown>;
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
  // Synchronization error codes
  SYNC_TIMELINE_INVALID = 'SYNC_TIMELINE_INVALID',
  SYNC_ANALYSIS_FAILED = 'SYNC_ANALYSIS_FAILED',
  SYNC_ANNOTATION_FAILED = 'SYNC_ANNOTATION_FAILED',
  SYNC_EXPORT_FAILED = 'SYNC_EXPORT_FAILED',
  SYNC_IMPORT_FAILED = 'SYNC_IMPORT_FAILED',
}

// Synchronization-specific errors
export interface SyncError {
  code: AudioErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  context: 'timeline' | 'annotation' | 'analysis' | 'export' | 'import';
  recoverable: boolean;
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
  // Synchronization events
  'sync:chordchange': { chord: ChordTimeMapping; nextChord?: ChordTimeMapping };
  'sync:markerreached': { marker: PlaybackMarker };
  'sync:loopstart': { loop: LoopSection };
  'sync:loopend': { loop: LoopSection };
  'sync:timelineloaded': { timeline: SyncTimeline };
  'sync:annotationadded': { annotation: ChordTimeMapping };
  'sync:annotationupdated': { annotation: ChordTimeMapping };
  'sync:annotationremoved': { annotationId: string };
  'sync:analysiscomplete': { result: AudioAnalysisResult };
  'sync:error': { error: SyncError };
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
  
  // Synchronization methods
  loadSyncTimeline(timeline: SyncTimeline): Promise<void>;
  addChordMapping(mapping: ChordTimeMapping): void;
  updateChordMapping(mapping: ChordTimeMapping): void;
  removeChordMapping(id: string): void;
  addPlaybackMarker(marker: PlaybackMarker): void;
  removePlaybackMarker(id: string): void;
  setLoopSection(loop: LoopSection): void;
  clearLoopSection(): void;
  enableSync(config: AudioSyncConfig): void;
  disableSync(): void;
  getSyncState(): SyncState;
  startChordAnnotation(): void;
  stopChordAnnotation(): void;
  analyzeAudioForChords(config: AutoDetectionConfig): Promise<AudioAnalysisResult>;
  exportSyncData(): SyncTimeline;
  importSyncData(timeline: SyncTimeline): Promise<void>;
  
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
  YouTubeVideoData,
  YouTubeThumbnails,
  YouTubeThumbnail,
  YouTubePlayerState,
  YouTubePlayerConfig,
  YouTubeSearchParams,
  YouTubeSearchResult,
  YouTubeSyncConfig,
  IYouTubeService,
  // Synchronization types
  ChordTimeMapping,
  ChordTimingMetadata,
  TempoMapping,
  AudioSyncConfig,
  LoopSection,
  PlaybackMarker,
  SyncTimeline,
  SyncTimelineMetadata,
  SyncState,
  AutoDetectionConfig,
  AudioAnalysisResult,
  SyncError,
  // Practice Mode types
  PracticeSession,
  PracticeGoal,
  PracticeStatistics,
  Achievement,
  MetronomeConfig,
  TimeSignature,
  MetronomeSubdivision,
  MetronomeSound,
  DifficultyLevel,
  ChordTimingFeedback,
  PracticeRecording,
  MetronomeEvent,
  IPracticeModeService,
  PracticeSessionConfig,
  PracticeModeEventMap,
  IMetronomeService,
  MetronomeEventMap,
};

// YouTube Player configuration
export interface YouTubePlayerConfig {
  apiKey: string;
  playbackQuality?: string; // 'small', 'medium', 'large', 'hd720', 'hd1080', 'highres'
  autoplay?: boolean;
  loop?: boolean;
  controls?: number; // 0, 1, or 2
  showinfo?: number; // 0 or 1
  rel?: number; // 0 or 1
  modestbranding?: number; // 0 or 1
  cc_load_policy?: number; // 0 or 1
  iv_load_policy?: number; // 1 or 3
  fs?: number; // 0 or 1
  disablekb?: number; // 0 or 1
  enablejsapi?: number; // 0 or 1
  origin?: string;
  widget_referrer?: string;
  start?: number; // Start time in seconds
  end?: number; // End time in seconds
  playlist?: string; // Comma-separated list of video IDs
}

// YouTube search parameters
export interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  videoDuration?: 'any' | 'long' | 'medium' | 'short';
  videoDefinition?: 'any' | 'high' | 'standard';
  videoCategoryId?: string;
  regionCode?: string;
  relevanceLanguage?: string;
  publishedAfter?: string;
  publishedBefore?: string;
}

// YouTube search result
export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnails: YouTubeThumbnails;
  publishedAt: string;
  duration: string;
  viewCount?: number;
  likeCount?: number;
  relevanceScore?: number;
}

// YouTube synchronization configuration
export interface YouTubeSyncConfig {
  enabled: boolean;
  chordProgression?: ChordTimeMapping[];
  syncTolerance: number; // Synchronization tolerance in milliseconds
  autoSync: boolean;
  syncMode: 'manual' | 'automatic' | 'chord-based';
  beatDetection?: boolean;
  tempoMapping?: TempoMapping[];
}

// Chord timing mapping for synchronization
export interface ChordTimeMapping {
  id: string; // Unique identifier for the mapping
  chordName: string;
  startTime: number; // Time in seconds when chord starts
  endTime: number; // Time in seconds when chord ends
  barNumber?: number;
  beatPosition?: number;
  confidence?: number; // 0-1, for auto-detected timings
  source: 'manual' | 'automatic' | 'imported';
  verified?: boolean; // Has been manually verified
  metadata?: ChordTimingMetadata;
}

// Additional metadata for chord timing
export interface ChordTimingMetadata {
  intensity?: number; // 0-1, how prominent the chord is
  isTransition?: boolean; // Is this a transitional chord
  notes?: string[]; // Additional notes about this timing
  originalPosition?: number; // Original position in ChordPro content
  lyricLine?: string; // Associated lyric line
}

// Tempo mapping for synchronization
export interface TempoMapping {
  id: string;
  time: number; // Time in seconds
  bpm: number; // Beats per minute
  timeSignature?: string; // e.g., "4/4", "3/4"
  confidence?: number; // 0-1, for auto-detected tempo
  source: 'manual' | 'automatic' | 'imported';
}

// Audio synchronization configuration
export interface AudioSyncConfig {
  enabled: boolean;
  tolerance: number; // Synchronization tolerance in milliseconds (default: 50)
  autoHighlight: boolean; // Auto-highlight current chord
  scrollSync: boolean; // Synchronize scrolling with playback
  visualFeedback: boolean; // Show visual feedback
  practiceMode: boolean; // Enable practice mode features
  loopSection?: LoopSection; // Current loop section
  playbackMarkers: PlaybackMarker[]; // Custom playback markers
}

// Loop section for practice mode
export interface LoopSection {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  enabled: boolean;
  repeatCount?: number; // Number of times to repeat, undefined = infinite
  speedModifier?: number; // 0.5-2.0, speed adjustment for this section
}

// Playback markers for navigation
export interface PlaybackMarker {
  id: string;
  time: number;
  label: string;
  type: 'verse' | 'chorus' | 'bridge' | 'solo' | 'intro' | 'outro' | 'custom';
  color?: string;
}

// Synchronization timeline data
export interface SyncTimeline {
  id: string;
  audioSourceId: string;
  chordMappings: ChordTimeMapping[];
  tempoMappings: TempoMapping[];
  markers: PlaybackMarker[];
  loopSections: LoopSection[];
  metadata: SyncTimelineMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Timeline metadata
export interface SyncTimelineMetadata {
  title?: string;
  artist?: string;
  key?: string;
  bpm?: number;
  timeSignature?: string;
  duration: number;
  chordProContent?: string; // Original ChordPro content
  notes?: string;
  tags?: string[];
}

// Synchronization state
export interface SyncState {
  isEnabled: boolean;
  currentTimeline?: SyncTimeline;
  currentChord?: ChordTimeMapping;
  nextChord?: ChordTimeMapping;
  isHighlighting: boolean;
  syncPosition: number; // Current sync position in seconds
  lastSyncTime: number; // Last successful sync timestamp
  driftCompensation: number; // Accumulated drift compensation
}

// Auto-detection configuration
export interface AutoDetectionConfig {
  enabled: boolean;
  method: 'onset' | 'chroma' | 'combined';
  sensitivity: number; // 0-1
  minChordDuration: number; // Minimum chord duration in seconds
  maxChordDuration: number; // Maximum chord duration in seconds
  confidenceThreshold: number; // Minimum confidence for auto-detection
  postProcessing: boolean; // Apply post-processing to improve accuracy
}

// Audio analysis result for chord detection
export interface AudioAnalysisResult {
  chordMappings: ChordTimeMapping[];
  confidence: number;
  analysisTime: number; // Time taken for analysis in ms
  method: string;
  sampleRate: number;
  duration: number;
  metadata?: {
    onsetTimes?: number[];
    chromaFeatures?: number[][];
    tempo?: number;
    key?: string;
  };
}

// Practice Mode Types
export interface PracticeSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  songId?: string;
  practiceGoals: PracticeGoal[];
  statistics: PracticeStatistics;
  achievements: Achievement[];
  loopSections: LoopSection[];
  metronomeSettings: MetronomeConfig;
  difficultyLevel: DifficultyLevel;
  recordingEnabled: boolean;
  recordingData?: PracticeRecording;
}

export interface PracticeGoal {
  id: string;
  type: 'chord_changes' | 'tempo' | 'accuracy' | 'endurance' | 'section_mastery';
  target: number;
  current: number;
  completed: boolean;
  description: string;
  deadline?: Date;
}

export interface PracticeStatistics {
  totalPracticeTime: number; // seconds
  sessionsCount: number;
  averageAccuracy: number; // 0-1
  chordChangeAccuracy: number; // 0-1
  tempoConsistency: number; // 0-1
  sectionsCompleted: number;
  streak: number; // consecutive days
  lastPracticeDate: Date;
  improvementRate: number; // weekly percentage
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'practice_time' | 'accuracy' | 'streak' | 'speed' | 'challenge';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt?: Date;
  progress: number; // 0-1
  requirement: number;
  icon: string;
  reward?: string;
}

export interface MetronomeConfig {
  enabled: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: MetronomeSubdivision;
  volume: number; // 0-1
  sound: MetronomeSound;
  visualCue: boolean;
  countIn: number; // bars before starting
  accentBeats: boolean;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export type MetronomeSubdivision = 'quarter' | 'eighth' | 'sixteenth' | 'triplet';
export type MetronomeSound = 'click' | 'beep' | 'wood' | 'rim' | 'cowbell';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface ChordTimingFeedback {
  chordName: string;
  expectedTime: number;
  actualTime: number;
  accuracy: number; // 0-1
  timing: 'early' | 'late' | 'perfect';
  feedback: string;
  suggestion?: string;
}

export interface PracticeRecording {
  id: string;
  sessionId: string;
  audioData?: ArrayBuffer;
  timingData: ChordTimingFeedback[];
  metronomeData: MetronomeEvent[];
  startTime: Date;
  duration: number;
  quality: 'low' | 'medium' | 'high';
  fileSize?: number;
}

export interface MetronomeEvent {
  beat: number;
  subdivision: number;
  time: number;
  accent: boolean;
  played: boolean; // if user played along correctly
}

export interface IPracticeModeService {
  // Session management
  startPracticeSession(config: PracticeSessionConfig): Promise<PracticeSession>;
  endPracticeSession(): Promise<void>;
  pausePracticeSession(): void;
  resumePracticeSession(): void;
  getCurrentSession(): PracticeSession | null;
  
  // Goals and progress
  setGoals(goals: PracticeGoal[]): void;
  updateProgress(statistics: Partial<PracticeStatistics>): void;
  getProgress(): PracticeStatistics;
  checkAchievements(): Achievement[];
  
  // Timing feedback
  analyzeChordTiming(mapping: ChordTimeMapping, actualTime: number): ChordTimingFeedback;
  getTimingHistory(): ChordTimingFeedback[];
  
  // Recording
  startRecording(): Promise<void>;
  stopRecording(): Promise<PracticeRecording>;
  getRecordings(): PracticeRecording[];
  
  // Difficulty adjustment
  adjustDifficulty(level: DifficultyLevel): void;
  getSimplifiedChords(chords: string[]): string[];
  
  // Events
  addEventListener<K extends keyof PracticeModeEventMap>(
    type: K,
    listener: (event: PracticeModeEventMap[K]) => void
  ): void;
}

export interface PracticeSessionConfig {
  songId?: string;
  duration?: number; // seconds
  goals: PracticeGoal[];
  metronome: MetronomeConfig;
  difficulty: DifficultyLevel;
  enableRecording: boolean;
  loopSections?: LoopSection[];
}

export interface PracticeModeEventMap {
  'practice:session_started': { session: PracticeSession };
  'practice:session_ended': { session: PracticeSession; statistics: PracticeStatistics };
  'practice:goal_completed': { goal: PracticeGoal };
  'practice:achievement_unlocked': { achievement: Achievement };
  'practice:timing_feedback': { feedback: ChordTimingFeedback };
  'practice:progress_updated': { statistics: PracticeStatistics };
  'metronome:beat': { beat: number; accent: boolean };
  'metronome:measure': { measure: number };
}

export interface IMetronomeService {
  // Basic controls
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  
  // Configuration
  setBPM(bpm: number): void;
  setTimeSignature(timeSignature: TimeSignature): void;
  setSubdivision(subdivision: MetronomeSubdivision): void;
  setVolume(volume: number): void;
  setSound(sound: MetronomeSound): void;
  
  // State
  isRunning(): boolean;
  getCurrentBeat(): number;
  getCurrentMeasure(): number;
  getConfig(): MetronomeConfig;
  
  // Events
  addEventListener<K extends keyof MetronomeEventMap>(
    type: K,
    listener: (event: MetronomeEventMap[K]) => void
  ): void;
}

export interface MetronomeEventMap {
  'beat': { beat: number; measure: number; accent: boolean; time: number };
  'measure': { measure: number; time: number };
  'started': { config: MetronomeConfig };
  'stopped': { totalBeats: number; duration: number };
  'bpm_changed': { bpm: number };
  'time_signature_changed': { timeSignature: TimeSignature };
}

// YouTube service interface
export interface IYouTubeService {
  // Initialization
  initialize(apiKey: string): Promise<void>;
  isInitialized(): boolean;
  
  // Player management
  createPlayer(containerId: string, config: YouTubePlayerConfig): Promise<YT.Player>;
  destroyPlayer(playerId: string): void;
  
  // Search functionality
  searchVideos(params: YouTubeSearchParams): Promise<YouTubeSearchResult[]>;
  getVideoDetails(videoId: string): Promise<YouTubeVideoData>;
  
  // Playback control
  playVideo(playerId: string): void;
  pauseVideo(playerId: string): void;
  seekTo(playerId: string, seconds: number): void;
  setVolume(playerId: string, volume: number): void;
  mute(playerId: string): void;
  unMute(playerId: string): void;
  
  // State queries
  getPlayerState(playerId: string): number;
  getCurrentTime(playerId: string): number;
  getDuration(playerId: string): number;
  getVolume(playerId: string): number;
  isMuted(playerId: string): boolean;
  
  // Event handling
  addEventListener(playerId: string, event: string, handler: (...args: unknown[]) => void): void;
  removeEventListener(playerId: string, event: string, handler: (...args: unknown[]) => void): void;
  
  // Synchronization
  syncWithChords(playerId: string, syncConfig: YouTubeSyncConfig): void;
  updateSyncMapping(playerId: string, mapping: ChordTimeMapping[]): void;
  
  // Cleanup
  cleanup(): void;
}