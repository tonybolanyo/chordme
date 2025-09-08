// Common type definitions for the ChordMe application
export interface Song {
  id: string;
  title: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  shared_with?: SharedUser[];
  share_settings?: 'private' | 'public' | 'link-shared';
  user_permission?: 'read' | 'edit' | 'admin' | 'owner';
}

export interface Chord {
  name: string;
  fingering: string;
  diagram?: string;
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data?: {
    token?: string;
    user?: User;
  };
  error?: string;
}

// Google OAuth2 types
export interface GoogleOAuth2Config {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAuthResponse {
  tokens: GoogleTokens;
  userInfo: GoogleUserInfo;
}

// Google Drive file types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

// Spotify API types
export interface SpotifyOAuth2Config {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  scope: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name?: string;
  email?: string;
  images?: SpotifyImage[];
  country?: string;
  followers?: {
    total: number;
  };
}

export interface SpotifyAuthResponse {
  tokens: SpotifyTokens;
  userProfile: SpotifyUserProfile;
}

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
  images?: SpotifyImage[];
  external_urls?: {
    spotify: string;
  };
  popularity?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  external_urls?: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url?: string;
  track_number: number;
  external_urls?: {
    spotify: string;
  };
  is_local?: boolean;
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  time_signature: number;
}

export interface SpotifySearchParams {
  query: string;
  type: 'track' | 'artist' | 'album' | 'playlist';
  limit?: number;
  offset?: number;
  market?: string;
}

export interface SpotifySearchResult {
  tracks?: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
    next?: string;
    previous?: string;
  };
  artists?: {
    items: SpotifyArtist[];
    total: number;
    limit: number;
    offset: number;
    next?: string;
    previous?: string;
  };
  albums?: {
    items: SpotifyAlbum[];
    total: number;
    limit: number;
    offset: number;
    next?: string;
    previous?: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  public: boolean;
  collaborative: boolean;
  owner: SpotifyUserProfile;
  images: SpotifyImage[];
  tracks: {
    total: number;
    items?: SpotifyPlaylistTrack[];
  };
  external_urls?: {
    spotify: string;
  };
}

export interface SpotifyPlaylistTrack {
  added_at: string;
  added_by: SpotifyUserProfile;
  is_local: boolean;
  track: SpotifyTrack;
}

export interface SpotifyRecommendationParams {
  seed_artists?: string[];
  seed_genres?: string[];
  seed_tracks?: string[];
  limit?: number;
  target_acousticness?: number;
  target_danceability?: number;
  target_energy?: number;
  target_instrumentalness?: number;
  target_key?: number;
  target_liveness?: number;
  target_loudness?: number;
  target_mode?: number;
  target_popularity?: number;
  target_speechiness?: number;
  target_tempo?: number;
  target_time_signature?: number;
  target_valence?: number;
}

export interface SpotifyRecommendations {
  tracks: SpotifyTrack[];
  seeds: {
    initialPoolSize: number;
    afterFilteringSize: number;
    afterRelinkingSize: number;
    id: string;
    type: string;
  }[];
}

// Song sharing types
export interface SharedUser {
  id: string;
  email: string;
  permission_level: 'read' | 'edit' | 'admin';
  shared_at?: string;
}

export interface ShareSongRequest {
  user_email: string;
  permission_level: 'read' | 'edit' | 'admin';
}

export interface UpdatePermissionRequest {
  user_email: string;
  permission_level: 'read' | 'edit' | 'admin';
}

export interface SharingResponse {
  status: string;
  message: string;
  data?: {
    user_email?: string;
    permission_level?: string;
    old_permission?: string;
    new_permission?: string;
  };
  error?: string;
}

// Notification types
export interface SharingNotification {
  id: string;
  type: 'share_added' | 'share_removed' | 'permission_changed';
  song_id: string;
  song_title: string;
  actor_email: string;
  permission_level?: string;
  old_permission?: string;
  new_permission?: string;
  timestamp: string;
  read: boolean;
}

// Re-export collaboration types
export type {
  CollaborationUser,
  CursorPosition,
  UserCursor,
  UserPresence,
  TextOperation,
  EditOperation,
  DocumentState,
  ConflictResolution,
  ConflictMarker,
  NetworkStatus,
  OptimisticUpdate,
  CollaborationSession,
  PermissionChange,
  CollaborationEvent,
} from './collaboration';

// Re-export split view types
export type {
  ViewMode,
  SplitOrientation,
  SplitViewPreferences,
  SplitViewConfig,
} from './splitView';

// Re-export chord diagram types
export type {
  InstrumentType,
  DifficultyLevel,
  FingerNumber,
  StringPosition,
  BarreChord,
  AlternativeFingering,
  ChordNotes,
  InstrumentConfig,
  ChordDiagramMetadata,
  LocalizedChordInfo,
  ChordDiagram,
  ChordDiagramCollection,
  ChordDiagramValidationResult,
  ChordDiagramValidationError,
  ChordDiagramValidationWarning,
  ChordDiagramSearchCriteria,
} from './chordDiagram';

// Re-export search results types
export type {
  SearchResultsViewMode,
  SearchSortOption,
  SortDirection,
  PageSize,
  ResultAction,
  BulkOperation,
  ExportFormat,
  SearchAnalytics,
  SearchResultsConfig,
  ResultItemState,
  BulkActionContext,
  ExportConfig,
  ResultStatistics,
  PaginationInfo,
  SearchResultsState,
  SearchResultsActions,
} from './searchResults';

// Re-export analytics types
export type {
  SetlistAnalytics,
  PerformedSong,
  PerformanceTrends,
  MonthlyPerformance,
  AudienceFeedback,
  TimingAnalysis,
  SongAnalytics,
  SongPerformanceTrend,
  PerformanceRecommendations,
  RecommendedSong,
  OptimalDurations,
  DurationRange,
  TrendingCombination,
  TimingRecommendations,
  PopularSongsData,
  PopularSong,
  TrendingSong,
  SetlistComparison,
  SetlistComparisonData,
  AnalyticsExportData,
  GDPRCompliance,
  PrivacyNotice,
  AnalyticsPrivacySettings,
  GDPRRights,
  PrivacySettingsResponse,
  AnalyticsApiResponse,
  ExportRequest,
  SetlistComparisonRequest,
  DataDeletionRequest,
  DataDeletionResponse,
  ChartDataPoint,
  TrendChartData,
  TrendDataset,
  PerformanceMetrics,
  AnalyticsDashboardProps,
  SetlistAnalyticsProps,
  SongAnalyticsProps,
  AnalyticsExportProps,
  PrivacySettingsProps,
  AnalyticsTimeframe,
  AnalyticsScope,
  ExportType,
  DeleteType,
  AnalyticsError,
  AnalyticsErrorBoundaryState,
} from './analytics';

export {
  INSTRUMENT_CONFIGS,
  CHORD_INTERVALS,
} from './chordDiagram';

// PDF Template types
export interface PDFTemplate {
  name: string;
  description: string;
  version: string;
  author: string;
  predefined: boolean;
}

export interface PDFPreviewRequest {
  content?: string;
  title?: string;
  artist?: string;
}

// Batch export types
export interface BatchExportRequest {
  songIds: string[];
  options: {
    paperSize?: 'a4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    template?: string;
    fontSize?: number;
    chordDiagrams?: boolean;
    quality?: 'draft' | 'standard' | 'high';
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    header?: string;
    footer?: string;
    colors?: {
      title?: string;
      artist?: string;
      chords?: string;
      lyrics?: string;
    };
  };
}
