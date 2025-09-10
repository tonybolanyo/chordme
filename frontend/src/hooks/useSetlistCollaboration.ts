/**
 * React hook for setlist collaboration features
 * Provides real-time collaboration, band coordination, and mobile features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SetlistCollaborationSession,
  SetlistCollaborationParticipant,
  BandCoordinationState,
  setlistCollaborationService,
} from '../services/setlistCollaborationService';
import type {
  SetlistSong,
  SetlistComment,
  SetlistTask,
  MobileCoordinationState,
} from '../types/setlist';

export interface UseSetlistCollaborationOptions {
  setlistId: string;
  userId: string;
  userInfo: {
    email: string;
    name?: string;
  };
  enableRealtimeUpdates?: boolean;
  enableBandCoordination?: boolean;
  enableMobileMode?: boolean;
}

export interface UseSetlistCollaborationReturn {
  // Session state
  session: SetlistCollaborationSession | null;
  isConnected: boolean;
  participants: SetlistCollaborationParticipant[];
  currentUserRole?: string;
  
  // Setlist operations
  addSong: (songId: string, position: number, section?: string) => Promise<SetlistSong>;
  removeSong: (setlistSongId: string) => Promise<void>;
  reorderSongs: (songOrders: Array<{ setlist_song_id: string; new_sort_order: number; section?: string }>) => Promise<void>;
  updateSong: (setlistSongId: string, updates: Partial<SetlistSong>) => Promise<SetlistSong>;
  
  // Comments and annotations
  comments: SetlistComment[];
  addComment: (content: string, options?: {
    setlistSongId?: string;
    commentType?: string;
    priority?: string;
    isPrivate?: boolean;
  }) => Promise<SetlistComment>;
  resolveComment: (commentId: string) => Promise<void>;
  
  // Task management
  tasks: SetlistTask[];
  createTask: (title: string, options?: {
    description?: string;
    assignedTo?: string;
    dueDate?: Date;
    priority?: string;
  }) => Promise<SetlistTask>;
  updateTaskStatus: (taskId: string, status: string, progressPercentage?: number) => Promise<void>;
  
  // Band coordination
  bandCoordination: BandCoordinationState;
  startRehearsalMode: () => Promise<void>;
  startPerformanceMode: () => Promise<void>;
  stopCoordinationMode: () => Promise<void>;
  updateReadyStatus: (isReady: boolean) => Promise<void>;
  sendCoordinationMessage: (message: string) => Promise<void>;
  
  // Mobile coordination
  mobileState: MobileCoordinationState | null;
  setCurrentSong: (songId: string) => Promise<void>;
  adjustTempo: (songId: string, tempoChange: number) => Promise<void>;
  skipSong: (songId: string) => Promise<void>;
  
  // External sharing
  createExternalShare: (shareType: string, options: {
    accessLevel: string;
    expiresAt?: Date;
    recipientEmail?: string;
  }) => Promise<string>; // Returns share URL
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useSetlistCollaboration(
  options: UseSetlistCollaborationOptions
): UseSetlistCollaborationReturn {
  const {
    setlistId,
    userId,
    userInfo,
    enableRealtimeUpdates = true,
    enableBandCoordination = true,
    enableMobileMode = false,
  } = options;

  // State
  const [session, setSession] = useState<SetlistCollaborationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [comments, setComments] = useState<SetlistComment[]>([]);
  const [tasks, setTasks] = useState<SetlistTask[]>([]);
  const [mobileState, setMobileState] = useState<MobileCoordinationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const coordinationUnsubscribe = useRef<(() => void) | null>(null);

  // Initialize collaboration session
  const connect = useCallback(async () => {
    try {
      setError(null);
      
      const newSession = await setlistCollaborationService.startSetlistCollaboration(
        setlistId,
        userId,
        userInfo
      );
      
      setSession(newSession);
      setIsConnected(true);
      
      // Set up band coordination listener
      if (enableBandCoordination) {
        coordinationUnsubscribe.current = setlistCollaborationService.onCoordinationChange(
          setlistId,
          (state) => {
            setSession(prev => prev ? { ...prev, bandCoordination: state } : null);
          }
        );
      }
      
      // Initialize mobile coordination if enabled
      if (enableMobileMode) {
        setMobileState({
          setlist_id: setlistId,
          is_live: false,
          tempo_adjustments: {},
          key_changes: {},
          skipped_songs: [],
        });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to collaboration session');
      setIsConnected(false);
    }
  }, [setlistId, userId, userInfo, enableBandCoordination, enableMobileMode]);

  // Disconnect from collaboration
  const disconnect = useCallback(async () => {
    try {
      if (coordinationUnsubscribe.current) {
        coordinationUnsubscribe.current();
        coordinationUnsubscribe.current = null;
      }
      
      await setlistCollaborationService.endSetlistCollaboration(setlistId);
      setSession(null);
      setIsConnected(false);
      setComments([]);
      setTasks([]);
      setMobileState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [setlistId]);

  // Setlist operations
  const addSong = useCallback(async (
    songId: string,
    position: number,
    section?: string
  ): Promise<SetlistSong> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      return await setlistCollaborationService.addSongToSetlist(
        setlistId,
        songId,
        position,
        section
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add song');
      throw err;
    }
  }, [session, setlistId]);

  const removeSong = useCallback(async (setlistSongId: string): Promise<void> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      // Implementation would call setlistCollaborationService.removeSongFromSetlist
      // For now, just a placeholder
      console.log('Remove song:', setlistSongId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove song');
      throw err;
    }
  }, [session]);

  const reorderSongs = useCallback(async (
    songOrders: Array<{ setlist_song_id: string; new_sort_order: number; section?: string }>
  ): Promise<void> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      await setlistCollaborationService.reorderSetlistSongs(setlistId, songOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder songs');
      throw err;
    }
  }, [session, setlistId]);

  const updateSong = useCallback(async (
    setlistSongId: string,
    updates: Partial<SetlistSong>
  ): Promise<SetlistSong> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      // Implementation would call setlistService.updateSetlistSong
      console.log('Update song:', setlistSongId, updates);
      return {} as SetlistSong; // Placeholder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update song');
      throw err;
    }
  }, [session]);

  // Comments
  const addComment = useCallback(async (
    content: string,
    options: {
      setlistSongId?: string;
      commentType?: string;
      priority?: string;
      isPrivate?: boolean;
    } = {}
  ): Promise<SetlistComment> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      const comment = await setlistCollaborationService.addComment(setlistId, content, options);
      setComments(prev => [...prev, comment]);
      return comment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      throw err;
    }
  }, [session, setlistId]);

  const resolveComment = useCallback(async (commentId: string): Promise<void> => {
    try {
      // Implementation would call API to resolve comment
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, is_resolved: true, resolved_at: new Date().toISOString() }
            : comment
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve comment');
      throw err;
    }
  }, []);

  // Task management
  const createTask = useCallback(async (
    title: string,
    options: {
      description?: string;
      assignedTo?: string;
      dueDate?: Date;
      priority?: string;
    } = {}
  ): Promise<SetlistTask> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      // Implementation would call API to create task
      const task: SetlistTask = {
        id: `task-${Date.now()}`,
        setlist_id: setlistId,
        created_by: userId,
        title,
        description: options.description,
        assigned_to: options.assignedTo,
        task_type: 'general',
        priority: (options.priority as unknown) || 'normal',
        status: 'todo',
        progress_percentage: 0,
        due_date: options.dueDate?.toISOString(),
        depends_on_tasks: [],
        role_requirements: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setTasks(prev => [...prev, task]);
      return task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  }, [session, setlistId, userId]);

  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: string,
    progressPercentage?: number
  ): Promise<void> => {
    try {
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? {
                ...task,
                status: status as unknown,
                progress_percentage: progressPercentage ?? task.progress_percentage,
                updated_at: new Date().toISOString(),
                ...(status === 'completed' && { completed_at: new Date().toISOString() }),
              }
            : task
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
      throw err;
    }
  }, []);

  // Band coordination
  const startRehearsalMode = useCallback(async (): Promise<void> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      await setlistCollaborationService.startBandCoordination(setlistId, 'rehearsal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start rehearsal mode');
      throw err;
    }
  }, [session, setlistId]);

  const startPerformanceMode = useCallback(async (): Promise<void> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      await setlistCollaborationService.startBandCoordination(setlistId, 'performance');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start performance mode');
      throw err;
    }
  }, [session, setlistId]);

  const stopCoordinationMode = useCallback(async (): Promise<void> => {
    if (!session) return;
    
    try {
      // Implementation would stop coordination mode
      setSession(prev => prev ? {
        ...prev,
        bandCoordination: {
          ...prev.bandCoordination,
          rehearsalMode: false,
          performanceMode: false,
        }
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop coordination mode');
      throw err;
    }
  }, [session]);

  const updateReadyStatus = useCallback(async (isReady: boolean): Promise<void> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      await setlistCollaborationService.updateReadyStatus(setlistId, isReady);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ready status');
      throw err;
    }
  }, [session, setlistId]);

  const sendCoordinationMessage = useCallback(async (message: string): Promise<void> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      // Implementation would send coordination message
      console.log('Send coordination message:', message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [session]);

  // Mobile coordination
  const setCurrentSong = useCallback(async (songId: string): Promise<void> => {
    if (!mobileState) return;
    
    setMobileState(prev => prev ? { ...prev, current_song: songId } : null);
  }, [mobileState]);

  const adjustTempo = useCallback(async (songId: string, tempoChange: number): Promise<void> => {
    if (!mobileState) return;
    
    setMobileState(prev => prev ? {
      ...prev,
      tempo_adjustments: { ...prev.tempo_adjustments, [songId]: tempoChange }
    } : null);
  }, [mobileState]);

  const skipSong = useCallback(async (songId: string): Promise<void> => {
    if (!mobileState) return;
    
    setMobileState(prev => prev ? {
      ...prev,
      skipped_songs: [...prev.skipped_songs, songId]
    } : null);
  }, [mobileState]);

  // External sharing
  const createExternalShare = useCallback(async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shareType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: {
      accessLevel: string;
      expiresAt?: Date;
      recipientEmail?: string;
    }
  ): Promise<string> => {
    if (!session) throw new Error('No active collaboration session');
    
    try {
      // Implementation would create external share
      const shareUrl = `https://app.chordme.com/shared/${setlistId}/${Date.now()}`;
      return shareUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create external share');
      throw err;
    }
  }, [session, setlistId]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (enableRealtimeUpdates && !isConnected) {
      connect();
    }
    
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [enableRealtimeUpdates, isConnected, connect, disconnect]);

  // Derived state
  const participants = session?.participants || [];
  const bandCoordination = session?.bandCoordination || {
    rehearsalMode: false,
    performanceMode: false,
    coordinationNotes: '',
    roleAssignments: {},
    readyStatus: {},
  };
  
  const currentUserRole = participants.find(p => p.userId === userId)?.bandRole;

  return {
    // Session state
    session,
    isConnected,
    participants,
    currentUserRole,
    
    // Setlist operations
    addSong,
    removeSong,
    reorderSongs,
    updateSong,
    
    // Comments and annotations
    comments,
    addComment,
    resolveComment,
    
    // Task management
    tasks,
    createTask,
    updateTaskStatus,
    
    // Band coordination
    bandCoordination,
    startRehearsalMode,
    startPerformanceMode,
    stopCoordinationMode,
    updateReadyStatus,
    sendCoordinationMessage,
    
    // Mobile coordination
    mobileState,
    setCurrentSong,
    adjustTempo,
    skipSong,
    
    // External sharing
    createExternalShare,
    
    // Connection management
    connect,
    disconnect,
    
    // Error handling
    error,
    clearError,
  };
}