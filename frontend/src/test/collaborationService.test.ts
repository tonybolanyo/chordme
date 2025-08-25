// Comprehensive unit tests for collaboration service
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CollaborationService } from '../services/collaborationService';
import type { 
  TextOperation,
  EditOperation,
  CollaborationSession,
  OptimisticUpdate,
  PermissionChange
} from '../types/collaboration';

// Mock Firebase services
vi.mock('../services/firebase', () => ({
  firebaseService: {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(),
      doc: vi.fn(),
    })),
    isInitialized: vi.fn(() => true),
  },
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => new Date()),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

describe('CollaborationService', () => {
  let collaborationService: CollaborationService;
  
  beforeEach(() => {
    collaborationService = new CollaborationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    collaborationService.cleanup();
  });

  describe('User Initialization', () => {
    it('should initialize user with valid data', async () => {
      const userId = 'user123';
      const userInfo = { email: 'test@example.com', name: 'Test User' };

      await collaborationService.initializeUser(userId, userInfo);

      expect(collaborationService['currentUserId']).toBe(userId);
      expect(collaborationService['currentUserColor']).toBeDefined();
    });

    it('should generate unique colors for different users', async () => {
      const service1 = new CollaborationService();
      const service2 = new CollaborationService();

      await service1.initializeUser('user1', { email: 'user1@example.com' });
      await service2.initializeUser('user2', { email: 'user2@example.com' });

      expect(service1['currentUserColor']).not.toBe(service2['currentUserColor']);

      service1.cleanup();
      service2.cleanup();
    });

    it('should handle user initialization without name', async () => {
      const userId = 'user123';
      const userInfo = { email: 'test@example.com' };

      await expect(collaborationService.initializeUser(userId, userInfo)).resolves.not.toThrow();
    });
  });

  describe('Collaboration Session Management', () => {
    beforeEach(async () => {
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
    });

    it('should start collaboration session successfully', async () => {
      const songId = 'song123';
      
      const session = await collaborationService.startCollaborationSession(songId);

      expect(session).toBeDefined();
      expect(session.songId).toBe(songId);
      expect(session.participants).toEqual([]);
      expect(session.cursors).toEqual([]);
      expect(session.documentState.version).toBe(0);
    });

    it('should fail to start session without user initialization', async () => {
      const uninitializedService = new CollaborationService();
      
      await expect(
        uninitializedService.startCollaborationSession('song123')
      ).rejects.toThrow('User must be initialized before starting collaboration');

      uninitializedService.cleanup();
    });

    it('should end collaboration session cleanly', async () => {
      const songId = 'song123';
      
      await collaborationService.startCollaborationSession(songId);
      await collaborationService.endCollaborationSession(songId);

      const session = collaborationService.getSession(songId);
      expect(session).toBeNull();
    });

    it('should handle ending non-existent session gracefully', async () => {
      await expect(
        collaborationService.endCollaborationSession('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('Text Operations', () => {
    let songId: string;

    beforeEach(async () => {
      songId = 'song123';
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
      await collaborationService.startCollaborationSession(songId);
    });

    it('should apply text operations with optimistic updates', async () => {
      const operations: TextOperation[] = [{
        type: 'insert',
        position: 0,
        content: 'Hello ',
        length: 6,
      }];

      vi.mocked(collaborationService.applyTextOperation).mockResolvedValue({
        id: 'update1',
        operation: {
          id: 'op1',
          songId,
          userId: 'testUser',
          timestamp: new Date().toISOString(),
          operations,
          version: 1,
          attribution: {
            userId: 'testUser',
            timestamp: new Date().toISOString(),
          },
        },
        localState: {
          content: 'Hello ',
          version: 1,
          lastModified: new Date().toISOString(),
          lastModifiedBy: 'testUser',
        },
        status: 'pending',
        timestamp: new Date().toISOString(),
      });

      const result = await collaborationService.applyTextOperation(songId, operations, true);
      
      expect(result).toBeDefined();
      expect(result?.status).toBe('pending');
      expect(result?.localState.content).toBe('Hello ');
    });

    it('should handle text operation failures with rollback', async () => {
      const operations: TextOperation[] = [{
        type: 'insert',
        position: 0,
        content: 'Hello',
        length: 5,
      }];

      vi.mocked(collaborationService.applyTextOperation).mockResolvedValue({
        id: 'update1',
        operation: {
          id: 'op1',
          songId,
          userId: 'testUser',
          timestamp: new Date().toISOString(),
          operations,
          version: 1,
          attribution: {
            userId: 'testUser',
            timestamp: new Date().toISOString(),
          },
        },
        localState: {
          content: '',
          version: 0,
          lastModified: new Date().toISOString(),
          lastModifiedBy: 'testUser',
        },
        rollbackData: {
          previousContent: '',
          previousVersion: 0,
        },
        status: 'failed',
        timestamp: new Date().toISOString(),
      });

      const result = await collaborationService.applyTextOperation(songId, operations, true);
      
      expect(result?.status).toBe('failed');
      expect(result?.rollbackData).toBeDefined();
    });

    it('should validate operation parameters', async () => {
      const invalidOperations: TextOperation[] = [{
        type: 'insert',
        position: -1, // Invalid position
        content: 'test',
        length: 4,
      }];

      await expect(
        collaborationService.applyTextOperation(songId, invalidOperations)
      ).resolves.toBeDefined();
    });
  });

  describe('Cursor Position Management', () => {
    let songId: string;

    beforeEach(async () => {
      songId = 'song123';
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
      await collaborationService.startCollaborationSession(songId);
    });

    it('should update cursor position successfully', async () => {
      const position = { line: 5, column: 10 };

      await expect(
        collaborationService.updateCursorPosition(songId, position)
      ).resolves.not.toThrow();
    });

    it('should handle cursor position with selection', async () => {
      const position = { 
        line: 5, 
        column: 10, 
        selectionStart: 0, 
        selectionEnd: 15 
      };

      await expect(
        collaborationService.updateCursorPosition(songId, position)
      ).resolves.not.toThrow();
    });

    it('should validate cursor position bounds', async () => {
      const invalidPosition = { line: -1, column: -1 };

      await expect(
        collaborationService.updateCursorPosition(songId, invalidPosition)
      ).resolves.not.toThrow();
    });
  });

  describe('Network Status Monitoring', () => {
    beforeEach(async () => {
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
    });

    it('should handle network status changes', () => {
      const mockCallback = vi.fn();
      
      const unsubscribe = collaborationService.onNetworkStatusChange(mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should remove network status callback on unsubscribe', () => {
      const mockCallback = vi.fn();
      
      const unsubscribe = collaborationService.onNetworkStatusChange(mockCallback);
      unsubscribe();

      // Verify callback is removed
      expect(collaborationService['networkStatusCallbacks'].has(mockCallback)).toBe(false);
    });
  });

  describe('Permission Change Handling', () => {
    beforeEach(async () => {
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
    });

    it('should handle permission changes', () => {
      const mockCallback = vi.fn();
      
      const unsubscribe = collaborationService.onPermissionChange(mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should notify on permission changes', () => {
      const mockCallback = vi.fn();
      
      collaborationService.onPermissionChange(mockCallback);

      const permissionChange: PermissionChange = {
        userId: 'user123',
        oldPermission: 'read',
        newPermission: 'edit',
        changedBy: 'admin',
        timestamp: new Date().toISOString(),
        songId: 'song123',
      };

      // Simulate permission change notification
      collaborationService['permissionChangeCallbacks'].forEach(callback => {
        callback(permissionChange);
      });

      expect(mockCallback).toHaveBeenCalledWith(permissionChange);
    });
  });

  describe('Session Cleanup', () => {
    it('should cleanup all resources', async () => {
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
      await collaborationService.startCollaborationSession('song1');
      await collaborationService.startCollaborationSession('song2');

      const networkCallback = vi.fn();
      const permissionCallback = vi.fn();
      
      collaborationService.onNetworkStatusChange(networkCallback);
      collaborationService.onPermissionChange(permissionCallback);

      collaborationService.cleanup();

      // Verify all sessions are closed
      expect(collaborationService.getSession('song1')).toBeNull();
      expect(collaborationService.getSession('song2')).toBeNull();

      // Verify callbacks are cleared
      expect(collaborationService['networkStatusCallbacks'].size).toBe(0);
      expect(collaborationService['permissionChangeCallbacks'].size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
      
      // Mock network failure
      vi.mocked(collaborationService.applyTextOperation).mockRejectedValue(
        new Error('Network error')
      );

      const operations: TextOperation[] = [{
        type: 'insert',
        position: 0,
        content: 'test',
        length: 4,
      }];

      await expect(
        collaborationService.applyTextOperation('song123', operations)
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid session operations', () => {
      expect(collaborationService.getSession('nonexistent')).toBeNull();
    });

    it('should handle cursor updates for invalid sessions', async () => {
      await collaborationService.initializeUser('testUser', { email: 'test@example.com' });
      
      await expect(
        collaborationService.updateCursorPosition('nonexistent', { line: 0, column: 0 })
      ).resolves.not.toThrow();
    });
  });
});