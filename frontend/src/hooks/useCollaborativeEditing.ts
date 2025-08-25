// React hooks for sophisticated real-time collaborative editing
import { useState, useEffect, useCallback, useRef } from 'react';
import { collaborationService } from '../services/collaborationService';
import type {
  CollaborationSession,
  UserCursor,
  UserPresence,
  NetworkStatus,
  PermissionChange,
  OptimisticUpdate,
  TextOperation,
} from '../types/collaboration';

/**
 * Hook for managing collaborative editing session
 */
export function useCollaborativeEditing(
  songId: string | null,
  userId: string | null
) {
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    connectionQuality: 'excellent',
  });
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<CollaborationSession | null>(null);

  // Initialize collaboration session
  const startCollaboration = useCallback(async () => {
    if (!songId || !userId) return;

    try {
      setError(null);
      const newSession =
        await collaborationService.startCollaborationSession(songId);
      setSession(newSession);
      sessionRef.current = newSession;
      setIsCollaborating(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start collaboration'
      );
    }
  }, [songId, userId]);

  // End collaboration session
  const endCollaboration = useCallback(async () => {
    if (!songId) return;

    try {
      await collaborationService.endCollaborationSession(songId);
      setSession(null);
      sessionRef.current = null;
      setIsCollaborating(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to end collaboration'
      );
    }
  }, [songId]);

  // Apply text operations with operational transformation
  const applyTextOperation = useCallback(
    async (
      operations: TextOperation[],
      optimistic = true
    ): Promise<OptimisticUpdate | null> => {
      if (!songId) return null;

      try {
        const update = await collaborationService.applyTextOperation(
          songId,
          operations,
          optimistic
        );

        // Update local session state
        const currentSession = collaborationService.getSession(songId);
        if (currentSession) {
          setSession({ ...currentSession });
          sessionRef.current = currentSession;
        }

        return update;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to apply text operation'
        );
        return null;
      }
    },
    [songId]
  );

  // Update cursor position
  const updateCursor = useCallback(
    async (position: {
      line: number;
      column: number;
      selectionStart?: number;
      selectionEnd?: number;
    }) => {
      if (!songId) return;

      try {
        await collaborationService.updateCursorPosition(songId, position);
      } catch (err) {
        console.error('Failed to update cursor position:', err);
      }
    },
    [songId]
  );

  // Listen for session updates
  useEffect(() => {
    const handleSessionUpdate = (event: CustomEvent) => {
      const { songId: eventSongId, session: updatedSession } = event.detail;
      if (eventSongId === songId) {
        setSession({ ...updatedSession });
        sessionRef.current = updatedSession;
      }
    };

    window.addEventListener(
      'collaboration-session-update',
      handleSessionUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        'collaboration-session-update',
        handleSessionUpdate as EventListener
      );
    };
  }, [songId]);

  // Listen for network status changes
  useEffect(() => {
    const unsubscribe =
      collaborationService.onNetworkStatusChange(setNetworkStatus);
    return unsubscribe;
  }, []);

  // Auto-start collaboration when dependencies are ready
  useEffect(() => {
    if (songId && userId && !isCollaborating) {
      startCollaboration();
    }

    // Cleanup on unmount or song change
    return () => {
      if (isCollaborating) {
        endCollaboration();
      }
    };
  }, [songId, userId]); // Don't include isCollaborating to avoid infinite loops

  return {
    session,
    isCollaborating,
    networkStatus,
    error,
    startCollaboration,
    endCollaboration,
    applyTextOperation,
    updateCursor,
    participants: session?.participants || [],
    cursors: session?.cursors || [],
    presences: session?.presences || [],
    documentState: session?.documentState,
    optimisticUpdates: session?.optimisticUpdates || [],
  };
}

/**
 * Hook for tracking user presence and cursors
 */
export function useCollaborativePresence(songId: string | null) {
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const [presences, setPresences] = useState<UserPresence[]>([]);
  const [activePeerCount, setActivePeerCount] = useState(0);

  useEffect(() => {
    if (!songId) return;

    const handleSessionUpdate = (event: CustomEvent) => {
      const { songId: eventSongId, session } = event.detail;
      if (eventSongId === songId) {
        setCursors(session.cursors);
        setPresences(session.presences);
        setActivePeerCount(
          session.presences.filter((p: UserPresence) => p.status === 'active')
            .length
        );
      }
    };

    window.addEventListener(
      'collaboration-session-update',
      handleSessionUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        'collaboration-session-update',
        handleSessionUpdate as EventListener
      );
    };
  }, [songId]);

  const getUserPresence = useCallback(
    (userId: string): UserPresence | null => {
      return presences.find((p) => p.userId === userId) || null;
    },
    [presences]
  );

  const getUserCursor = useCallback(
    (userId: string): UserCursor | null => {
      return cursors.find((c) => c.userId === userId) || null;
    },
    [cursors]
  );

  return {
    cursors,
    presences,
    activePeerCount,
    getUserPresence,
    getUserCursor,
  };
}

/**
 * Hook for handling permission changes during collaboration
 */
export function useCollaborativePermissions() {
  const [permissionChanges, setPermissionChanges] = useState<
    PermissionChange[]
  >([]);
  const [hasActivePermissionChange, setHasActivePermissionChange] =
    useState(false);

  useEffect(() => {
    const handlePermissionChange = (change: PermissionChange) => {
      setPermissionChanges((prev) => [...prev, change]);
      setHasActivePermissionChange(true);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setPermissionChanges((prev) => prev.filter((c) => c !== change));
        setHasActivePermissionChange(
          (prev) => prev && permissionChanges.length > 1
        );
      }, 10000);
    };

    const unsubscribe = collaborationService.onPermissionChange(
      handlePermissionChange
    );
    return unsubscribe;
  }, [permissionChanges.length]);

  const dismissPermissionChange = useCallback(
    (change: PermissionChange) => {
      setPermissionChanges((prev) => prev.filter((c) => c !== change));
      setHasActivePermissionChange(
        (prev) => prev && permissionChanges.length > 1
      );
    },
    [permissionChanges.length]
  );

  const clearAllPermissionChanges = useCallback(() => {
    setPermissionChanges([]);
    setHasActivePermissionChange(false);
  }, []);

  return {
    permissionChanges,
    hasActivePermissionChange,
    dismissPermissionChange,
    clearAllPermissionChanges,
  };
}

/**
 * Hook for network-aware collaboration features
 */
export function useCollaborativeNetwork() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    connectionQuality: 'excellent',
  });
  const [reconnecting, setReconnecting] = useState(false);
  const [syncIssues, setSyncIssues] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = collaborationService.onNetworkStatusChange((status) => {
      setNetworkStatus(status);

      // Handle reconnection scenarios
      if (!networkStatus.online && status.online) {
        setReconnecting(true);
        // Simulate reconnection process
        setTimeout(() => setReconnecting(false), 2000);
      }

      // Track sync issues
      if (status.connectionQuality === 'poor' || !status.online) {
        setSyncIssues((prev) => [
          ...prev,
          `Connection issue at ${new Date().toLocaleTimeString()}`,
        ]);
      }
    });

    return unsubscribe;
  }, [networkStatus.online]);

  const clearSyncIssues = useCallback(() => {
    setSyncIssues([]);
  }, []);

  return {
    networkStatus,
    reconnecting,
    syncIssues,
    isOnline: networkStatus.online,
    connectionQuality: networkStatus.connectionQuality,
    clearSyncIssues,
  };
}

/**
 * Hook for managing optimistic updates and rollbacks
 */
export function useOptimisticUpdates(songId: string | null) {
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);
  const [failedUpdates, setFailedUpdates] = useState<OptimisticUpdate[]>([]);

  useEffect(() => {
    if (!songId) return;

    const handleSessionUpdate = (event: CustomEvent) => {
      const { songId: eventSongId, session } = event.detail;
      if (eventSongId === songId) {
        const pending = session.optimisticUpdates.filter(
          (u: OptimisticUpdate) => u.status === 'pending'
        );
        const failed = session.optimisticUpdates.filter(
          (u: OptimisticUpdate) => u.status === 'failed'
        );

        setPendingUpdates(pending);
        setFailedUpdates(failed);
      }
    };

    window.addEventListener(
      'collaboration-session-update',
      handleSessionUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        'collaboration-session-update',
        handleSessionUpdate as EventListener
      );
    };
  }, [songId]);

  const retryFailedUpdate = useCallback(
    async (update: OptimisticUpdate) => {
      if (!songId) return;

      try {
        await collaborationService.applyTextOperation(
          songId,
          update.operation.operations,
          false
        );
        setFailedUpdates((prev) => prev.filter((u) => u.id !== update.id));
      } catch (error) {
        console.error('Failed to retry update:', error);
      }
    },
    [songId]
  );

  const rollbackUpdate = useCallback(
    async (update: OptimisticUpdate) => {
      if (!songId || !update.rollbackData) return;

      // This would require implementing rollback in the collaboration service
      console.log('Rollback requested for update:', update.id);
    },
    [songId]
  );

  return {
    pendingUpdates,
    failedUpdates,
    hasPendingUpdates: pendingUpdates.length > 0,
    hasFailedUpdates: failedUpdates.length > 0,
    retryFailedUpdate,
    rollbackUpdate,
  };
}
