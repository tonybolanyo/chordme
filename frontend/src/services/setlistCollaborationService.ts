/**
 * Setlist Collaboration Service - Extends real-time collaboration to setlists
 * Builds on the existing CollaborationService infrastructure
 */

import { CollaborationService } from './collaborationService';
import { setlistService } from './setlistService';
import type {
  Setlist,
  SetlistSong,
  SetlistCollaborator,
  SetlistComment,
  SetlistTask,
} from '../types/setlist';

export interface SetlistCollaborationSession {
  setlistId: string;
  participants: SetlistCollaborationParticipant[];
  activeEditors: string[]; // user IDs currently editing
  documentState: {
    setlist: Setlist;
    lastModified: string;
    version: number;
  };
  realtimeComments: SetlistComment[];
  activeTasks: SetlistTask[];
  bandCoordination: BandCoordinationState;
}

export interface SetlistCollaborationParticipant {
  userId: string;
  email: string;
  name?: string;
  bandRole?: string;
  instrument?: string;
  isLead: boolean;
  status: 'active' | 'idle' | 'away' | 'offline';
  currentActivity: 'viewing' | 'editing' | 'commenting' | 'preparing';
  lastActivity: string;
  color: string;
}

export interface BandCoordinationState {
  currentLeader?: string; // user ID of current rehearsal/performance leader
  rehearsalMode: boolean;
  performanceMode: boolean;
  coordinationNotes: string;
  roleAssignments: Record<string, string>; // role -> user ID
  readyStatus: Record<string, boolean>; // user ID -> ready status
}

export interface SetlistOperation {
  id: string;
  setlistId: string;
  userId: string;
  timestamp: string;
  operationType: 'song_reorder' | 'song_add' | 'song_remove' | 'song_update' | 'metadata_update' | 'comment_add' | 'task_update';
  operationData: any;
  version: number;
}

/**
 * Setlist-specific collaboration service
 */
export class SetlistCollaborationService {
  private baseCollaborationService: CollaborationService;
  private activeSetlistSessions = new Map<string, SetlistCollaborationSession>();
  private coordinationCallbacks = new Map<string, Set<(state: BandCoordinationState) => void>>();
  
  constructor() {
    this.baseCollaborationService = new CollaborationService();
  }

  /**
   * Start collaboration session for a setlist
   */
  async startSetlistCollaboration(
    setlistId: string,
    userId: string,
    userInfo: { email: string; name?: string }
  ): Promise<SetlistCollaborationSession> {
    // Initialize base collaboration for the user
    await this.baseCollaborationService.initializeUser(userId, userInfo);

    // Get setlist details and collaborators
    const setlist = await setlistService.getSetlist(setlistId, {
      include_songs: true,
      include_collaborators: true,
    });

    // Get current collaborator info for role assignments
    const collaborators = await setlistService.getCollaborators(setlistId);
    
    const participants: SetlistCollaborationParticipant[] = collaborators.map((collab, index) => ({
      userId: collab.user_id,
      email: collab.user?.email || '',
      name: collab.user?.display_name,
      bandRole: collab.band_role,
      instrument: collab.instrument,
      isLead: collab.is_lead_for_role || false,
      status: 'active',
      currentActivity: 'viewing',
      lastActivity: new Date().toISOString(),
      color: this.generateUserColor(collab.user_id),
    }));

    const session: SetlistCollaborationSession = {
      setlistId,
      participants,
      activeEditors: [],
      documentState: {
        setlist,
        lastModified: setlist.updated_at,
        version: 1,
      },
      realtimeComments: [],
      activeTasks: [],
      bandCoordination: {
        rehearsalMode: false,
        performanceMode: false,
        coordinationNotes: '',
        roleAssignments: {},
        readyStatus: {},
      },
    };

    this.activeSetlistSessions.set(setlistId, session);
    
    // Set up real-time listeners for setlist changes
    this.setupSetlistRealtimeListeners(setlistId);
    
    return session;
  }

  /**
   * Add a song to the setlist with real-time collaboration
   */
  async addSongToSetlist(
    setlistId: string,
    songId: string,
    position: number,
    section?: string,
    performanceNotes?: string
  ): Promise<SetlistSong> {
    const session = this.activeSetlistSessions.get(setlistId);
    if (!session) {
      throw new Error('No active collaboration session for this setlist');
    }

    // Create the operation
    const operation: SetlistOperation = {
      id: this.generateOperationId(),
      setlistId,
      userId: this.getCurrentUserId(),
      timestamp: new Date().toISOString(),
      operationType: 'song_add',
      operationData: {
        songId,
        position,
        section,
        performanceNotes,
      },
      version: session.documentState.version + 1,
    };

    // Apply optimistically to local state
    try {
      const newSong = await setlistService.addSongToSetlist(setlistId, {
        song_id: songId,
        sort_order: position,
        section,
        performance_notes: performanceNotes,
      });

      // Update local session state
      session.documentState.setlist.songs?.push(newSong);
      session.documentState.version = operation.version;
      session.documentState.lastModified = new Date().toISOString();

      // Broadcast operation to other participants
      await this.broadcastSetlistOperation(operation);

      return newSong;
    } catch (error) {
      console.error('Error adding song to setlist:', error);
      throw error;
    }
  }

  /**
   * Reorder songs in setlist with real-time sync
   */
  async reorderSetlistSongs(
    setlistId: string,
    songOrders: Array<{ setlist_song_id: string; new_sort_order: number; section?: string }>
  ): Promise<void> {
    const session = this.activeSetlistSessions.get(setlistId);
    if (!session) {
      throw new Error('No active collaboration session for this setlist');
    }

    const operation: SetlistOperation = {
      id: this.generateOperationId(),
      setlistId,
      userId: this.getCurrentUserId(),
      timestamp: new Date().toISOString(),
      operationType: 'song_reorder',
      operationData: { songOrders },
      version: session.documentState.version + 1,
    };

    try {
      await setlistService.reorderSongs(setlistId, { song_orders: songOrders });

      // Update local session state
      if (session.documentState.setlist.songs) {
        songOrders.forEach(({ setlist_song_id, new_sort_order, section }) => {
          const song = session.documentState.setlist.songs?.find(s => s.id === setlist_song_id);
          if (song) {
            song.sort_order = new_sort_order;
            if (section) song.section = section;
          }
        });

        // Re-sort songs by new order
        session.documentState.setlist.songs.sort((a, b) => a.sort_order - b.sort_order);
      }

      session.documentState.version = operation.version;
      session.documentState.lastModified = new Date().toISOString();

      // Broadcast operation
      await this.broadcastSetlistOperation(operation);
    } catch (error) {
      console.error('Error reordering setlist songs:', error);
      throw error;
    }
  }

  /**
   * Add comment to setlist item
   */
  async addComment(
    setlistId: string,
    content: string,
    options: {
      setlistSongId?: string;
      commentType?: string;
      priority?: string;
      targetElement?: string;
      elementPosition?: number;
      isPrivate?: boolean;
      visibleToRoles?: string[];
    } = {}
  ): Promise<SetlistComment> {
    try {
      const response = await fetch(`/api/v1/setlists/${setlistId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          content,
          setlist_song_id: options.setlistSongId,
          comment_type: options.commentType || 'general',
          priority: options.priority || 'normal',
          target_element: options.targetElement,
          element_position: options.elementPosition,
          is_private: options.isPrivate || false,
          visible_to_roles: options.visibleToRoles || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const comment = await response.json();

      // Update session state
      const session = this.activeSetlistSessions.get(setlistId);
      if (session) {
        session.realtimeComments.push(comment);
      }

      // Broadcast to other participants
      await this.broadcastSetlistOperation({
        id: this.generateOperationId(),
        setlistId,
        userId: this.getCurrentUserId(),
        timestamp: new Date().toISOString(),
        operationType: 'comment_add',
        operationData: { comment },
        version: session?.documentState.version || 1,
      });

      return comment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Start band coordination mode (rehearsal or performance)
   */
  async startBandCoordination(
    setlistId: string,
    mode: 'rehearsal' | 'performance',
    leaderId?: string
  ): Promise<void> {
    const session = this.activeSetlistSessions.get(setlistId);
    if (!session) {
      throw new Error('No active collaboration session for this setlist');
    }

    session.bandCoordination.rehearsalMode = mode === 'rehearsal';
    session.bandCoordination.performanceMode = mode === 'performance';
    session.bandCoordination.currentLeader = leaderId || this.getCurrentUserId();

    // Notify all participants
    this.notifyCoordinationChange(setlistId, session.bandCoordination);

    // Broadcast coordination state change
    await this.broadcastSetlistOperation({
      id: this.generateOperationId(),
      setlistId,
      userId: this.getCurrentUserId(),
      timestamp: new Date().toISOString(),
      operationType: 'metadata_update',
      operationData: {
        coordinationMode: mode,
        leader: session.bandCoordination.currentLeader,
      },
      version: session.documentState.version,
    });
  }

  /**
   * Update ready status for band coordination
   */
  async updateReadyStatus(setlistId: string, isReady: boolean): Promise<void> {
    const session = this.activeSetlistSessions.get(setlistId);
    if (!session) return;

    const userId = this.getCurrentUserId();
    session.bandCoordination.readyStatus[userId] = isReady;

    // Notify coordination change
    this.notifyCoordinationChange(setlistId, session.bandCoordination);

    // Broadcast status update
    await this.broadcastSetlistOperation({
      id: this.generateOperationId(),
      setlistId,
      userId,
      timestamp: new Date().toISOString(),
      operationType: 'metadata_update',
      operationData: {
        readyStatus: { [userId]: isReady },
      },
      version: session.documentState.version,
    });
  }

  /**
   * Subscribe to band coordination changes
   */
  onCoordinationChange(
    setlistId: string,
    callback: (state: BandCoordinationState) => void
  ): () => void {
    if (!this.coordinationCallbacks.has(setlistId)) {
      this.coordinationCallbacks.set(setlistId, new Set());
    }
    
    this.coordinationCallbacks.get(setlistId)!.add(callback);

    return () => {
      this.coordinationCallbacks.get(setlistId)?.delete(callback);
    };
  }

  /**
   * End collaboration session
   */
  async endSetlistCollaboration(setlistId: string): Promise<void> {
    const session = this.activeSetlistSessions.get(setlistId);
    if (!session) return;

    // Clean up listeners and resources
    this.cleanupSetlistListeners(setlistId);
    this.activeSetlistSessions.delete(setlistId);
    this.coordinationCallbacks.delete(setlistId);
  }

  // Private helper methods

  private setupSetlistRealtimeListeners(setlistId: string): void {
    // Set up Firestore listeners for real-time updates
    // This would integrate with the existing Firebase infrastructure
    // Implementation similar to the base CollaborationService
  }

  private cleanupSetlistListeners(setlistId: string): void {
    // Clean up Firestore listeners
  }

  private async broadcastSetlistOperation(operation: SetlistOperation): Promise<void> {
    // Broadcast operation to all session participants via Firestore
    // This would use the existing Firestore infrastructure
  }

  private notifyCoordinationChange(setlistId: string, state: BandCoordinationState): void {
    const callbacks = this.coordinationCallbacks.get(setlistId);
    if (callbacks) {
      callbacks.forEach(callback => callback(state));
    }
  }

  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string {
    // Get current user ID from authentication context
    return 'current-user-id'; // Placeholder
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#FDA7DF', '#F7DC6F', '#BB8FCE'
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }
}

// Export singleton instance
export const setlistCollaborationService = new SetlistCollaborationService();
export default setlistCollaborationService;