// Types for sophisticated real-time collaborative editing
export interface CollaborationUser {
  id: string;
  email: string;
  name?: string;
  color: string; // Unique color for this user's cursor and edits
  lastSeen: string; // ISO timestamp
}

export interface CursorPosition {
  line: number;
  column: number;
  selectionStart?: number;
  selectionEnd?: number;
  // Enhanced selection tracking
  hasSelection: boolean;
  selectionDirection?: 'forward' | 'backward' | 'none';
  // Touch/mobile support
  touchPosition?: {
    x: number;
    y: number;
    timestamp: string;
  };
}

export interface UserCursor {
  userId: string;
  position: CursorPosition;
  timestamp: string;
}

export interface UserPresence {
  userId: string;
  status: 'active' | 'idle' | 'offline' | 'typing' | 'away';
  lastActivity: string;
  currentSong?: string; // Song ID they're currently viewing/editing
  activityDetails?: {
    isTyping: boolean;
    typingStarted?: string;
    lastInteraction?: string;
    idleTimeout?: number; // in ms
  };
  avatar?: {
    url?: string;
    initials?: string;
    backgroundColor?: string;
  };
  privacySettings?: {
    showStatus: boolean;
    showActivity: boolean;
    showLocation: boolean;
  };
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    isTouchDevice: boolean;
    userAgent?: string;
  };
}

export interface TextOperation {
  type: 'insert' | 'delete' | 'retain';
  content?: string; // For insert operations
  length: number; // Number of characters
  position?: number; // For delete operations
}

// Extended operation types for ChordPro-specific editing
export interface ChordProOperation {
  type: 'chord-insert' | 'chord-modify' | 'directive-insert' | 'directive-modify' | 'directive-delete';
  position: number;
  content?: string;
  chordData?: {
    original: string;
    normalized: string;
    position: number;
  };
  directiveData?: {
    type: string; // title, artist, key, etc.
    value: string;
    position: number;
  };
  length?: number;
}

// Vector clock for operation ordering
export interface VectorClock {
  [userId: string]: number;
}

// Enhanced operation with ordering information
export interface OrderedOperation {
  id: string;
  operation: TextOperation | ChordProOperation;
  vectorClock: VectorClock;
  userId: string;
  timestamp: string;
  dependencies?: string[]; // Operation IDs this depends on
}

export interface EditOperation {
  id: string;
  songId: string;
  userId: string;
  timestamp: string;
  operations: TextOperation[];
  version: number; // Document version this operation is based on
  attribution: {
    userId: string;
    timestamp: string;
  };
  // Enhanced with ordering and history
  vectorClock?: VectorClock;
  dependencies?: string[];
  isUndo?: boolean;
  undoOperationId?: string;
}

// Operation history for undo/redo
export interface OperationHistory {
  operations: OrderedOperation[];
  undoStack: string[]; // Operation IDs
  redoStack: string[]; // Operation IDs
  currentIndex: number;
  maxHistorySize: number;
}

// Change tracking
export interface ChangeTracker {
  changes: Map<string, OrderedOperation[]>; // userId -> operations
  since: string; // timestamp
  until: string; // timestamp
}

// Recovery mechanisms
export interface OperationFailure {
  operationId: string;
  error: string;
  timestamp: string;
  retryCount: number;
  canRecover: boolean;
}

export interface RecoveryState {
  failedOperations: OperationFailure[];
  recoveryStrategy: 'retry' | 'skip' | 'manual';
  rollbackPoint?: {
    content: string;
    version: number;
    operationId: string;
  };
}

export interface DocumentState {
  content: string;
  version: number;
  lastModified: string;
  lastModifiedBy: string;
  // Enhanced with vector clocks and recovery
  vectorClock?: VectorClock;
  checkpoints?: DocumentCheckpoint[];
}

export interface DocumentCheckpoint {
  id: string;
  content: string;
  version: number;
  vectorClock: VectorClock;
  timestamp: string;
  operationId: string;
}

export interface ConflictResolution {
  type: 'auto-merge' | 'manual-review' | 'force-overwrite';
  strategy: 'operational-transform' | 'last-writer-wins' | 'user-choice';
  result: {
    content: string;
    version: number;
    conflictMarkers?: ConflictMarker[];
  };
}

export interface ConflictMarker {
  type: 'conflict-start' | 'conflict-separator' | 'conflict-end';
  position: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface NetworkStatus {
  online: boolean;
  latency?: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastSync?: string;
}

export interface OptimisticUpdate {
  id: string;
  operation: EditOperation;
  localState: DocumentState;
  rollbackData?: {
    previousContent: string;
    previousVersion: number;
  };
  status: 'pending' | 'confirmed' | 'failed' | 'rolled-back';
  timestamp: string;
}

export interface CollaborationSession {
  songId: string;
  participants: CollaborationUser[];
  cursors: UserCursor[];
  presences: UserPresence[];
  documentState: DocumentState;
  pendingOperations: EditOperation[];
  optimisticUpdates: OptimisticUpdate[];
  networkStatus: NetworkStatus;
  permissions: Record<string, 'read' | 'edit' | 'admin' | 'owner'>;
  // Enhanced with operation history and recovery
  operationHistory?: OperationHistory;
  recoveryState?: RecoveryState;
  changeTracker?: ChangeTracker;
}

export interface PermissionChange {
  userId: string;
  oldPermission: string;
  newPermission: string;
  changedBy: string;
  timestamp: string;
  songId: string;
}

export interface CollaborationEvent {
  type:
    | 'user-joined'
    | 'user-left'
    | 'cursor-moved'
    | 'presence-changed'
    | 'edit-operation'
    | 'permission-changed'
    | 'network-status'
    | 'conflict-detected'
    | 'operation-failed'
    | 'recovery-initiated'
    | 'user-typing-started'
    | 'user-typing-stopped'
    | 'user-idle'
    | 'user-away'
    | 'selection-changed';
  payload: any;
  timestamp: string;
  userId?: string;
}

// Notification system for user join/leave events
export interface PresenceNotification {
  id: string;
  type: 'user-joined' | 'user-left' | 'user-reconnected' | 'user-disconnected';
  userId: string;
  userName: string;
  timestamp: string;
  autoHide?: boolean;
  hideAfter?: number; // in ms
}

// Privacy controls for presence visibility
export interface PresencePrivacySettings {
  showOnlineStatus: boolean;
  showActivityStatus: boolean; // typing, idle indicators
  showCursorPosition: boolean;
  showCurrentLocation: boolean; // which song/section
  allowDirectMessages: boolean;
  visibleToUsers: 'all' | 'collaborators-only' | 'friends-only';
  invisibleMode: boolean; // appear offline to others
}

// Activity detection configuration
export interface ActivityDetectionConfig {
  typingIndicatorTimeout: number; // ms before showing "typing"
  idleTimeout: number; // ms before showing "idle"
  awayTimeout: number; // ms before showing "away"
  enableTypingIndicators: boolean;
  enableIdleDetection: boolean;
  enableActivityTracking: boolean;
}
