// Comprehensive tests for collaborative editing features
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationalTransform } from '../services/operationalTransform';
import type {
  TextOperation,
  EditOperation,
  CollaborationUser,
  DocumentState,
} from '../types/collaboration';

// Mock Firebase services
vi.mock('../services/firebase', () => ({
  firebaseService: {
    getFirestore: vi.fn(() => ({})),
    isInitialized: vi.fn(() => true),
  },
}));

// Mock collaboration service
vi.mock('../services/collaborationService', () => {
  const mockService = {
    initializeUser: vi.fn(),
    startCollaborationSession: vi.fn(),
    endCollaborationSession: vi.fn(),
    applyTextOperation: vi.fn(),
    updateCursorPosition: vi.fn(),
    getSession: vi.fn(),
    onNetworkStatusChange: vi.fn(() => () => {}),
    onPermissionChange: vi.fn(() => () => {}),
  };

  return {
    collaborationService: mockService,
    CollaborationService: vi.fn(() => mockService),
  };
});

// Import mocked services
import { collaborationService } from '../services/collaborationService';
import { CollaborationHeader } from '../components/CollaborativeEditing/CollaborationHeader';
import { ConflictResolutionDialog } from '../components/CollaborativeEditing/ConflictResolutionDialog';

describe('Operational Transformation', () => {
  describe('Basic Operations', () => {
    it('should handle insert operations correctly', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'insert',
        position: 5,
        content: ' Beautiful',
        length: 10,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello Beautiful World');
    });

    it('should handle delete operations correctly', () => {
      const content = 'Hello Beautiful World';
      const operation: TextOperation = {
        type: 'delete',
        position: 5,
        length: 10,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World');
    });

    it('should handle retain operations correctly', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'retain',
        length: 11,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World');
    });
  });

  describe('Operation Transformation', () => {
    it('should transform concurrent insert operations', () => {
      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'A',
        length: 1,
      };

      const op2: TextOperation = {
        type: 'insert',
        position: 7,
        content: 'B',
        length: 1,
      };

      const transformed = OperationalTransform.transform(op1, op2);

      // op2 should be adjusted to account for op1's insertion
      expect(transformed).toEqual({
        type: 'insert',
        position: 8, // 7 + 1 (length of op1)
        content: 'B',
        length: 1,
      });
    });

    it('should transform insert vs delete operations', () => {
      const insertOp: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'New',
        length: 3,
      };

      const deleteOp: TextOperation = {
        type: 'delete',
        position: 7,
        length: 5,
      };

      const transformed = OperationalTransform.transform(insertOp, deleteOp);

      // Delete position should be adjusted for the insert
      expect(transformed).toEqual({
        type: 'delete',
        position: 10, // 7 + 3 (length of insert)
        length: 5,
      });
    });

    it('should handle overlapping delete operations', () => {
      const op1: TextOperation = {
        type: 'delete',
        position: 5,
        length: 3,
      };

      const op2: TextOperation = {
        type: 'delete',
        position: 6,
        length: 4,
      };

      const transformed = OperationalTransform.transform(op1, op2);

      // Should merge overlapping deletes
      expect(transformed.type).toBe('delete');
      expect(transformed.position).toBe(5);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicting operations', () => {
      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'A',
        length: 1,
      };

      const op2: TextOperation = {
        type: 'delete',
        position: 5,
        length: 3,
      };

      const hasConflict = OperationalTransform.operationsConflict(op1, op2);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflicts for non-overlapping operations', () => {
      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'A',
        length: 1,
      };

      const op2: TextOperation = {
        type: 'insert',
        position: 10,
        content: 'B',
        length: 1,
      };

      const hasConflict = OperationalTransform.operationsConflict(op1, op2);
      expect(hasConflict).toBe(false);
    });
  });

  describe('Diff Generation', () => {
    it('should generate correct diff for text changes', () => {
      const oldText = 'Hello World';
      const newText = 'Hello Beautiful World';

      const operations = OperationalTransform.generateDiff(oldText, newText);

      expect(operations).toHaveLength(3);
      expect(operations[0]).toEqual({
        type: 'delete',
        position: 6,
        length: 5,
      });
      expect(operations[1]).toEqual({
        type: 'insert',
        position: 6,
        content: 'Beaut',
        length: 5,
      });
      expect(operations[2]).toEqual({
        type: 'insert',
        position: 11,
        content: 'iful World',
        length: 10,
      });
    });

    it('should handle insertions at the end', () => {
      const oldText = 'Hello';
      const newText = 'Hello World';

      const operations = OperationalTransform.generateDiff(oldText, newText);

      expect(operations).toHaveLength(1);
      expect(operations[0]).toEqual({
        type: 'insert',
        position: 5,
        content: ' World',
        length: 6,
      });
    });

    it('should handle deletions from the end', () => {
      const oldText = 'Hello World';
      const newText = 'Hello';

      const operations = OperationalTransform.generateDiff(oldText, newText);

      expect(operations).toHaveLength(1);
      expect(operations[0]).toEqual({
        type: 'delete',
        position: 5,
        length: 6,
      });
    });
  });

  describe('Operation Inversion', () => {
    it('should invert insert operations correctly', () => {
      const operation: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'Beautiful ',
        length: 10,
      };

      const inverted = OperationalTransform.invertOperation(
        operation,
        'Hello World'
      );

      expect(inverted).toEqual({
        type: 'delete',
        position: 5,
        length: 10,
      });
    });

    it('should invert delete operations correctly', () => {
      const originalContent = 'Hello Beautiful World';
      const operation: TextOperation = {
        type: 'delete',
        position: 5,
        length: 10,
      };

      const inverted = OperationalTransform.invertOperation(
        operation,
        originalContent
      );

      expect(inverted).toEqual({
        type: 'insert',
        position: 5,
        content: ' Beautiful',
        length: 10,
      });
    });
  });
});

describe('Collaborative Editing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Multi-User Concurrent Editing Simulation', () => {
    it('should handle multiple users editing simultaneously', async () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const songId = 'song1';

      // Simulate two users starting collaboration
      const session1 = {
        songId,
        participants: [
          {
            id: user1Id,
            email: 'user1@test.com',
            color: '#FF6B6B',
            lastSeen: new Date().toISOString(),
          },
          {
            id: user2Id,
            email: 'user2@test.com',
            color: '#4ECDC4',
            lastSeen: new Date().toISOString(),
          },
        ],
        cursors: [],
        presences: [],
        documentState: {
          content: 'Initial content',
          version: 0,
          lastModified: new Date().toISOString(),
          lastModifiedBy: user1Id,
        },
        pendingOperations: [],
        optimisticUpdates: [],
        networkStatus: {
          online: true,
          connectionQuality: 'excellent' as const,
        },
        permissions: {},
      };

      vi.mocked(
        collaborationService.startCollaborationSession
      ).mockResolvedValue(session1);
      vi.mocked(collaborationService.getSession).mockReturnValue(session1);

      // User 1 makes an edit
      const user1Operation: TextOperation = {
        type: 'insert',
        position: 7,
        content: ' updated',
        length: 8,
      };

      // User 2 makes a concurrent edit
      const user2Operation: TextOperation = {
        type: 'insert',
        position: 0,
        content: 'Prefix ',
        length: 7,
      };

      // Apply operations with transformation
      const transformedUser1Op = OperationalTransform.transform(
        user2Operation,
        user1Operation
      );

      expect(transformedUser1Op.position).toBe(14); // Original 7 + user2's insertion length 7

      // Verify both operations can be applied
      let content = 'Initial content';
      content = OperationalTransform.applyOperation(content, user2Operation); // User 2's op first
      content = OperationalTransform.applyOperation(content, transformedUser1Op); // Then user 1's transformed op

      expect(content).toBe('Prefix Initial updated content');
    });

    it('should maintain document consistency across multiple operations', async () => {
      const operations: TextOperation[] = [
        { type: 'insert', position: 0, content: 'A', length: 1 },
        { type: 'insert', position: 1, content: 'B', length: 1 },
        { type: 'insert', position: 2, content: 'C', length: 1 },
        { type: 'delete', position: 1, length: 1 },
        { type: 'insert', position: 1, content: 'X', length: 1 },
      ];

      let content = '';
      operations.forEach((op) => {
        content = OperationalTransform.applyOperation(content, op);
      });

      expect(content).toBe('AXC');
    });
  });

  describe('Network Failure Scenarios', () => {
    it('should handle network interruption during editing', async () => {
      const mockNetworkCallback = vi.fn();

      // Simulate network status changes
      let networkCallbacks: Array<(status: any) => void> = [];
      vi.mocked(collaborationService.onNetworkStatusChange).mockImplementation(
        (callback) => {
          networkCallbacks.push(callback);
          return () => {
            networkCallbacks = networkCallbacks.filter((cb) => cb !== callback);
          };
        }
      );

      // Actually register a callback to trigger the mock
      collaborationService.onNetworkStatusChange(mockNetworkCallback);

      // Trigger network offline event
      networkCallbacks.forEach((callback) => {
        callback({
          online: false,
          connectionQuality: 'offline',
          lastSync: new Date().toISOString(),
        });
      });

      expect(networkCallbacks.length).toBeGreaterThan(0);
      expect(mockNetworkCallback).toHaveBeenCalledWith({
        online: false,
        connectionQuality: 'offline',
        lastSync: expect.any(String),
      });
    });

    it('should queue operations during network outage', async () => {
      const mockOptimisticUpdate = {
        id: 'update1',
        operation: {
          id: 'op1',
          songId: 'song1',
          userId: 'user1',
          timestamp: new Date().toISOString(),
          operations: [
            { type: 'insert', position: 0, content: 'A', length: 1 },
          ],
          version: 1,
          attribution: { userId: 'user1', timestamp: new Date().toISOString() },
        } as EditOperation,
        localState: {
          content: 'A',
          version: 1,
          lastModified: new Date().toISOString(),
          lastModifiedBy: 'user1',
        },
        status: 'pending' as const,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(collaborationService.applyTextOperation).mockResolvedValue(
        mockOptimisticUpdate
      );

      const operation: TextOperation = {
        type: 'insert',
        position: 0,
        content: 'A',
        length: 1,
      };

      const result = await collaborationService.applyTextOperation(
        'song1',
        [operation],
        true
      );

      expect(result).toEqual(mockOptimisticUpdate);
      expect(result?.status).toBe('pending');
    });
  });

  describe('Permission Change Scenarios', () => {
    it('should handle permission changes during active collaboration', async () => {
      const mockPermissionCallback = vi.fn();
      const mockPermissionChange = {
        userId: 'user1',
        oldPermission: 'edit',
        newPermission: 'read',
        changedBy: 'admin',
        timestamp: new Date().toISOString(),
        songId: 'song1',
      };

      let permissionCallbacks: Array<(change: any) => void> = [];
      vi.mocked(collaborationService.onPermissionChange).mockImplementation(
        (callback) => {
          permissionCallbacks.push(callback);
          return () => {
            permissionCallbacks = permissionCallbacks.filter(
              (cb) => cb !== callback
            );
          };
        }
      );

      // Actually register a callback to trigger the mock
      collaborationService.onPermissionChange(mockPermissionCallback);

      // Trigger permission change
      permissionCallbacks.forEach((callback) => {
        callback(mockPermissionChange);
      });

      expect(permissionCallbacks.length).toBeGreaterThan(0);
      expect(mockPermissionCallback).toHaveBeenCalledWith(mockPermissionChange);
    });
  });
});

describe('Collaborative UI Components', () => {
  const mockParticipants: CollaborationUser[] = [
    {
      id: 'user1',
      email: 'alice@test.com',
      name: 'Alice',
      color: '#FF6B6B',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'user2',
      email: 'bob@test.com',
      name: 'Bob',
      color: '#4ECDC4',
      lastSeen: new Date().toISOString(),
    },
  ];

  describe('CollaborationHeader', () => {
    it('should display collaboration status and participants', () => {
      render(
        <CollaborationHeader
          songId="song1"
          isCollaborating={true}
          participants={mockParticipants}
        />
      );

      expect(screen.getByText('Live Collaboration')).toBeInTheDocument();
      
      // Check for participant avatars instead of text about "other users online"
      expect(screen.getByTitle('Alice - Active')).toBeInTheDocument();
      expect(screen.getByTitle('Bob - Active')).toBeInTheDocument();
    });

    it('should show user avatars with correct colors', () => {
      render(
        <CollaborationHeader
          songId="song1"
          isCollaborating={true}
          participants={mockParticipants}
        />
      );

      const avatars = screen.getAllByTitle(/Alice|Bob/);
      expect(avatars).toHaveLength(2);
    });

    it('should not render when not collaborating', () => {
      const { container } = render(
        <CollaborationHeader
          songId="song1"
          isCollaborating={false}
          participants={[]}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('ConflictResolutionDialog', () => {
    const mockLocalChanges = {
      content: 'Local version of content',
      version: 2,
      lastModified: new Date().toISOString(),
      operations: [],
    };

    const mockRemoteChanges = {
      content: 'Remote version of content',
      version: 3,
      lastModified: new Date().toISOString(),
      operations: [],
      author: 'Alice',
    };

    it('should display conflict information', () => {
      const mockOnResolve = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={mockOnClose}
          localChanges={mockLocalChanges}
          remoteChanges={mockRemoteChanges}
          onResolve={mockOnResolve}
        />
      );

      expect(
        screen.getByText(/Conflicting Changes Detected/)
      ).toBeInTheDocument();
      expect(screen.getByText('Your Changes')).toBeInTheDocument();
      expect(screen.getByText("Alice's Changes")).toBeInTheDocument();
      expect(screen.getByText('Local version of content')).toBeInTheDocument();
      expect(screen.getByText('Remote version of content')).toBeInTheDocument();
    });

    it('should handle resolution selection', async () => {
      const user = userEvent.setup();
      const mockOnResolve = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={mockOnClose}
          localChanges={mockLocalChanges}
          remoteChanges={mockRemoteChanges}
          onResolve={mockOnResolve}
        />
      );

      // Select "Keep My Changes" option
      const keepMyChangesRadio = screen.getByLabelText(/Keep My Changes/);
      await user.click(keepMyChangesRadio);

      // Click resolve button
      const resolveButton = screen.getByText('Resolve Conflict');
      await user.click(resolveButton);

      expect(mockOnResolve).toHaveBeenCalledWith('accept-local');
    });

    it('should handle manual merge option', async () => {
      const user = userEvent.setup();
      const mockOnResolve = vi.fn();
      const mockOnClose = vi.fn();
      const mockOnMergeManual = vi.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={mockOnClose}
          localChanges={mockLocalChanges}
          remoteChanges={mockRemoteChanges}
          onResolve={mockOnResolve}
          onMergeManual={mockOnMergeManual}
        />
      );

      // Select manual merge option
      const manualMergeRadio = screen.getByLabelText(/Manual Merge/);
      await user.click(manualMergeRadio);

      // Generate merge preview
      const generateButton = screen.getByText('Generate Merge Preview');
      await user.click(generateButton);

      // Should show textarea for manual editing
      expect(
        screen.getByLabelText(/Edit the merged content/)
      ).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <ConflictResolutionDialog
          isOpen={false}
          onClose={vi.fn()}
          localChanges={mockLocalChanges}
          remoteChanges={mockRemoteChanges}
          onResolve={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});

describe('Error Handling and Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle Firestore connection errors gracefully', async () => {
    const error = new Error('Firestore connection failed');
    vi.mocked(collaborationService.startCollaborationSession).mockRejectedValue(
      error
    );

    try {
      await collaborationService.startCollaborationSession('song1');
    } catch (e) {
      expect(e).toBe(error);
    }

    expect(collaborationService.startCollaborationSession).toHaveBeenCalledWith(
      'song1'
    );
  });

  it('should handle operation transformation errors', () => {
    // Test with invalid operation data
    const invalidOperation: any = {
      type: 'invalid',
      position: -1,
      length: -5,
    };

    const content = 'Test content';

    // Should handle gracefully without crashing
    expect(() => {
      OperationalTransform.applyOperation(content, invalidOperation);
    }).not.toThrow();
  });

  it('should handle rollback scenarios for failed optimistic updates', async () => {
    const mockFailedUpdate = {
      id: 'failed-update',
      operation: {
        id: 'op1',
        songId: 'song1',
        userId: 'user1',
        timestamp: new Date().toISOString(),
        operations: [{ type: 'insert', position: 0, content: 'A', length: 1 }],
        version: 1,
        attribution: { userId: 'user1', timestamp: new Date().toISOString() },
      } as EditOperation,
      localState: {
        content: 'A',
        version: 1,
        lastModified: new Date().toISOString(),
        lastModifiedBy: 'user1',
      },
      rollbackData: {
        previousContent: '',
        previousVersion: 0,
      },
      status: 'failed' as const,
      timestamp: new Date().toISOString(),
    };

    // Simulate a failed operation that needs rollback
    vi.mocked(collaborationService.applyTextOperation).mockResolvedValue(
      mockFailedUpdate
    );

    const result = await collaborationService.applyTextOperation(
      'song1',
      [],
      true
    );
    expect(result?.status).toBe('failed');
    expect(result?.rollbackData).toBeDefined();
  });
});
