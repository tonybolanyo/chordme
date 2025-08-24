// Collaborative editing service with operational transformation
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { firebaseService } from './firebase';
import { OperationalTransform } from './operationalTransform';
import type {
  CollaborationSession,
  CollaborationUser,
  UserCursor,
  UserPresence,
  EditOperation,
  TextOperation,
  DocumentState,
  OptimisticUpdate,
  NetworkStatus,
  PermissionChange,
  CollaborationEvent
} from '../types/collaboration';

/**
 * Service for managing real-time collaborative editing with operational transformation
 */
export class CollaborationService {
  private db = firebaseService.getFirestore();
  private currentUserId: string | null = null;
  private currentUserColor: string = '';
  private activeSessions = new Map<string, CollaborationSession>();
  private subscriptions = new Map<string, Unsubscribe[]>();
  private networkStatusCallbacks = new Set<(status: NetworkStatus) => void>();
  private permissionChangeCallbacks = new Set<(change: PermissionChange) => void>();
  
  // User colors for cursor tracking
  private static readonly USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#FDA7DF', '#F7DC6F', '#BB8FCE'
  ];

  constructor() {
    this.setupNetworkMonitoring();
  }

  /**
   * Initialize collaboration for a user
   */
  async initializeUser(userId: string, userInfo: { email: string; name?: string }): Promise<void> {
    this.currentUserId = userId;
    this.currentUserColor = this.generateUserColor(userId);
    
    // Create or update user presence
    await this.updateUserPresence(userId, {
      userId,
      status: 'active',
      lastActivity: new Date().toISOString(),
    });
  }

  /**
   * Start collaboration session for a song
   */
  async startCollaborationSession(songId: string): Promise<CollaborationSession> {
    if (!this.currentUserId) {
      throw new Error('User must be initialized before starting collaboration');
    }

    const session: CollaborationSession = {
      songId,
      participants: [],
      cursors: [],
      presences: [],
      documentState: {
        content: '',
        version: 0,
        lastModified: new Date().toISOString(),
        lastModifiedBy: this.currentUserId,
      },
      pendingOperations: [],
      optimisticUpdates: [],
      networkStatus: {
        online: navigator.onLine,
        connectionQuality: 'excellent',
      },
      permissions: {},
    };

    this.activeSessions.set(songId, session);
    
    // Set up real-time subscriptions
    await this.setupCollaborationSubscriptions(songId);
    
    // Add current user to participants
    await this.addParticipant(songId, {
      id: this.currentUserId,
      email: '', // Will be filled by auth context
      color: this.currentUserColor,
      lastSeen: new Date().toISOString(),
    });

    return session;
  }

  /**
   * End collaboration session
   */
  async endCollaborationSession(songId: string): Promise<void> {
    // Clean up subscriptions
    const subs = this.subscriptions.get(songId);
    if (subs) {
      subs.forEach(unsubscribe => unsubscribe());
      this.subscriptions.delete(songId);
    }

    // Remove user from participants
    if (this.currentUserId) {
      await this.removeParticipant(songId, this.currentUserId);
      await this.updateUserPresence(this.currentUserId, {
        userId: this.currentUserId,
        status: 'offline',
        lastActivity: new Date().toISOString(),
      });
    }

    // Clean up local session
    this.activeSessions.delete(songId);
  }

  /**
   * Send cursor position update
   */
  async updateCursorPosition(songId: string, position: { line: number; column: number; selectionStart?: number; selectionEnd?: number }): Promise<void> {
    if (!this.currentUserId) return;

    const cursorData: UserCursor = {
      userId: this.currentUserId,
      position,
      timestamp: new Date().toISOString(),
    };

    try {
      if (!this.db) throw new Error('Firestore not initialized');
      
      const cursorsRef = collection(this.db, 'collaboration', songId, 'cursors');
      const userCursorRef = doc(cursorsRef, this.currentUserId);
      
      await updateDoc(userCursorRef, {
        ...cursorData,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating cursor position:', error);
    }
  }

  /**
   * Apply text operation with operational transformation
   */
  async applyTextOperation(songId: string, operations: TextOperation[], optimistic = true): Promise<OptimisticUpdate | null> {
    if (!this.currentUserId) return null;

    const session = this.activeSessions.get(songId);
    if (!session) return null;

    const editOperation: EditOperation = {
      id: `${this.currentUserId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      songId,
      userId: this.currentUserId,
      timestamp: new Date().toISOString(),
      operations,
      version: session.documentState.version,
      attribution: {
        userId: this.currentUserId,
        timestamp: new Date().toISOString(),
      },
    };

    // Apply optimistic update locally
    let optimisticUpdate: OptimisticUpdate | null = null;
    if (optimistic) {
      optimisticUpdate = {
        id: editOperation.id,
        operation: editOperation,
        localState: { ...session.documentState },
        rollbackData: {
          previousContent: session.documentState.content,
          previousVersion: session.documentState.version,
        },
        status: 'pending',
        timestamp: new Date().toISOString(),
      };

      // Apply operations locally
      const newContent = OperationalTransform.applyOperations(
        session.documentState.content, 
        operations
      );
      
      session.documentState.content = newContent;
      session.documentState.version++;
      session.optimisticUpdates.push(optimisticUpdate);
    }

    try {
      // Send operation to Firestore
      if (!this.db) throw new Error('Firestore not initialized');
      
      const operationsRef = collection(this.db, 'collaboration', songId, 'operations');
      await addDoc(operationsRef, {
        ...editOperation,
        timestamp: serverTimestamp(),
      });

      if (optimisticUpdate) {
        optimisticUpdate.status = 'confirmed';
      }
    } catch (error) {
      console.error('Error applying text operation:', error);
      
      // Rollback optimistic update on error
      if (optimisticUpdate && optimisticUpdate.rollbackData) {
        session.documentState.content = optimisticUpdate.rollbackData.previousContent;
        session.documentState.version = optimisticUpdate.rollbackData.previousVersion;
        optimisticUpdate.status = 'failed';
        
        // Remove failed update from pending list
        const index = session.optimisticUpdates.findIndex(u => u.id === optimisticUpdate!.id);
        if (index >= 0) {
          session.optimisticUpdates.splice(index, 1);
        }
      }
    }

    return optimisticUpdate;
  }

  /**
   * Handle incoming operations from other users
   */
  private async handleIncomingOperation(songId: string, operation: EditOperation): Promise<void> {
    const session = this.activeSessions.get(songId);
    if (!session || operation.userId === this.currentUserId) return;

    // Transform operation against pending local operations
    let transformedOps = operation.operations;
    
    for (const pending of session.optimisticUpdates) {
      if (pending.status === 'pending') {
        transformedOps = OperationalTransform.transformOperations(
          transformedOps,
          pending.operation.operations[0] // Simplified - in real implementation, handle multiple ops
        );
      }
    }

    // Apply transformed operations
    const newContent = OperationalTransform.applyOperations(
      session.documentState.content,
      transformedOps
    );

    session.documentState.content = newContent;
    session.documentState.version = Math.max(session.documentState.version, operation.version + 1);
    session.documentState.lastModified = operation.timestamp;
    session.documentState.lastModifiedBy = operation.userId;

    // Notify UI of changes
    this.notifySessionUpdate(songId, session);
  }

  /**
   * Setup real-time subscriptions for collaboration
   */
  private async setupCollaborationSubscriptions(songId: string): Promise<void> {
    if (!this.db) return;
    
    const subscriptions: Unsubscribe[] = [];

    // Subscribe to operations
    const operationsRef = collection(this.db, 'collaboration', songId, 'operations');
    const operationsQuery = query(operationsRef, orderBy('timestamp', 'desc'));
    
    const operationsUnsub = onSnapshot(operationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const operation = { id: change.doc.id, ...change.doc.data() } as EditOperation;
          this.handleIncomingOperation(songId, operation);
        }
      });
    });
    subscriptions.push(operationsUnsub);

    // Subscribe to cursors
    const cursorsRef = collection(this.db, 'collaboration', songId, 'cursors');
    const cursorsUnsub = onSnapshot(cursorsRef, (snapshot) => {
      const session = this.activeSessions.get(songId);
      if (!session) return;

      session.cursors = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as UserCursor))
        .filter(cursor => cursor.userId !== this.currentUserId);
      
      this.notifySessionUpdate(songId, session);
    });
    subscriptions.push(cursorsUnsub);

    // Subscribe to presence
    const presenceRef = collection(this.db, 'collaboration', songId, 'presence');
    const presenceUnsub = onSnapshot(presenceRef, (snapshot) => {
      const session = this.activeSessions.get(songId);
      if (!session) return;

      session.presences = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserPresence));
      this.notifySessionUpdate(songId, session);
    });
    subscriptions.push(presenceUnsub);

    // Subscribe to permission changes
    const permissionsRef = collection(this.db, 'collaboration', songId, 'permissions');
    const permissionsUnsub = onSnapshot(permissionsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const permissionChange = { id: change.doc.id, ...change.doc.data() } as PermissionChange;
          this.handlePermissionChange(permissionChange);
        }
      });
    });
    subscriptions.push(permissionsUnsub);

    this.subscriptions.set(songId, subscriptions);
  }

  /**
   * Add participant to collaboration session
   */
  private async addParticipant(songId: string, user: CollaborationUser): Promise<void> {
    if (!this.db) return;
    
    try {
      const participantsRef = collection(this.db, 'collaboration', songId, 'participants');
      const userRef = doc(participantsRef, user.id);
      
      await updateDoc(userRef, {
        ...user,
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  }

  /**
   * Remove participant from collaboration session
   */
  private async removeParticipant(songId: string, userId: string): Promise<void> {
    if (!this.db) return;
    
    try {
      const batch = writeBatch(this.db);
      
      // Remove from participants
      const participantRef = doc(this.db, 'collaboration', songId, 'participants', userId);
      batch.delete(participantRef);
      
      // Remove cursor
      const cursorRef = doc(this.db, 'collaboration', songId, 'cursors', userId);
      batch.delete(cursorRef);
      
      // Update presence to offline
      const presenceRef = doc(this.db, 'collaboration', songId, 'presence', userId);
      batch.update(presenceRef, {
        status: 'offline',
        lastActivity: serverTimestamp(),
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  }

  /**
   * Update user presence
   */
  private async updateUserPresence(userId: string, presence: Partial<UserPresence>): Promise<void> {
    if (!this.db) return;
    
    try {
      // Update presence for all active sessions
      for (const songId of this.activeSessions.keys()) {
        const presenceRef = doc(this.db, 'collaboration', songId, 'presence', userId);
        await updateDoc(presenceRef, {
          ...presence,
          lastActivity: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  }

  /**
   * Handle permission changes during active collaboration
   */
  private handlePermissionChange(change: PermissionChange): void {
    this.permissionChangeCallbacks.forEach(callback => {
      try {
        callback(change);
      } catch (error) {
        console.error('Error in permission change callback:', error);
      }
    });
  }

  /**
   * Setup network monitoring for handling interruptions
   */
  private setupNetworkMonitoring(): void {
    const updateNetworkStatus = () => {
      const status: NetworkStatus = {
        online: navigator.onLine,
        connectionQuality: navigator.onLine ? 'excellent' : 'offline',
        lastSync: new Date().toISOString(),
      };

      this.networkStatusCallbacks.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in network status callback:', error);
        }
      });

      // Update all active sessions
      for (const session of this.activeSessions.values()) {
        session.networkStatus = status;
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  }

  /**
   * Generate consistent color for user
   */
  private generateUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CollaborationService.USER_COLORS.length;
    return CollaborationService.USER_COLORS[index];
  }

  /**
   * Notify UI of session updates
   */
  private notifySessionUpdate(songId: string, session: CollaborationSession): void {
    // This would trigger React state updates in the consuming components
    // Implementation depends on how you want to structure the React integration
    const event = new CustomEvent('collaboration-session-update', {
      detail: { songId, session }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get current collaboration session
   */
  getSession(songId: string): CollaborationSession | null {
    return this.activeSessions.get(songId) || null;
  }

  /**
   * Subscribe to network status changes
   */
  onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void {
    this.networkStatusCallbacks.add(callback);
    return () => this.networkStatusCallbacks.delete(callback);
  }

  /**
   * Subscribe to permission changes
   */
  onPermissionChange(callback: (change: PermissionChange) => void): () => void {
    this.permissionChangeCallbacks.add(callback);
    return () => this.permissionChangeCallbacks.delete(callback);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // End all active sessions
    for (const songId of this.activeSessions.keys()) {
      this.endCollaborationSession(songId);
    }

    // Clear callbacks
    this.networkStatusCallbacks.clear();
    this.permissionChangeCallbacks.clear();
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();