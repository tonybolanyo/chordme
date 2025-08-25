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
}

export interface UserCursor {
  userId: string;
  position: CursorPosition;
  timestamp: string;
}

export interface UserPresence {
  userId: string;
  status: 'active' | 'idle' | 'offline';
  lastActivity: string;
  currentSong?: string; // Song ID they're currently viewing/editing
}

export interface TextOperation {
  type: 'insert' | 'delete' | 'retain';
  content?: string; // For insert operations
  length: number; // Number of characters
  position?: number; // For delete operations
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
}

export interface DocumentState {
  content: string;
  version: number;
  lastModified: string;
  lastModifiedBy: string;
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
    | 'conflict-detected';
  payload: any;
  timestamp: string;
  userId?: string;
}
