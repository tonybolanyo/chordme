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
