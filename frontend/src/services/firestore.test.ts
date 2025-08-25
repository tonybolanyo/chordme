// Comprehensive tests for Firestore service CRUD operations
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Song, User } from '../types';

// Mock Firebase modules
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockOnSnapshot = vi.fn();
const mockTimestamp = {
  now: vi.fn(() => ({ 
    seconds: 1234567890, 
    nanoseconds: 0,
    toDate: () => new Date(1234567890 * 1000),
    toMillis: () => 1234567890 * 1000
  })),
  fromDate: vi.fn((date: Date) => ({ 
    seconds: Math.floor(date.getTime() / 1000), 
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime()
  })),
};

// Create a mock Timestamp class for instanceof checks
class MockTimestampClass {
  constructor(public seconds: number, public nanoseconds: number) {}
  toDate() { return new Date(this.seconds * 1000); }
  toMillis() { return this.seconds * 1000; }
}

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  onSnapshot: mockOnSnapshot,
  Timestamp: {
    ...mockTimestamp,
    // Add the constructor for instanceof checks
    constructor: MockTimestampClass
  },
}));

// Mock the firebase service
vi.mock('./firebase', () => ({
  firebaseService: {
    isInitialized: vi.fn(() => true),
    getFirestore: vi.fn(() => ({ name: 'mock-firestore' })),
  },
}));

describe('FirestoreService - CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimestamp.now.mockReturnValue({ 
      seconds: 1234567890, 
      nanoseconds: 0,
      toDate: () => new Date(1234567890 * 1000),
      toMillis: () => 1234567890 * 1000
    });
  });

  describe('Service Availability', () => {
    it('should exist and be importable with all CRUD methods', async () => {
      const { firestoreService } = await import('./firestore');
      expect(firestoreService).toBeDefined();
      expect(typeof firestoreService.getSongs).toBe('function');
      expect(typeof firestoreService.getSong).toBe('function');
      expect(typeof firestoreService.createSong).toBe('function');
      expect(typeof firestoreService.updateSong).toBe('function');
      expect(typeof firestoreService.deleteSong).toBe('function');
      expect(typeof firestoreService.getUser).toBe('function');
      expect(typeof firestoreService.createUser).toBe('function');
      expect(typeof firestoreService.updateUser).toBe('function');
      expect(typeof firestoreService.isAvailable).toBe('function');
    });

    it('should report availability based on Firebase service', async () => {
      const { firestoreService } = await import('./firestore');
      expect(firestoreService.isAvailable()).toBe(true);
    });

    it('should report unavailable when Firebase is not initialized', async () => {
      const { firebaseService } = await import('./firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);
      
      const { firestoreService } = await import('./firestore');
      expect(firestoreService.isAvailable()).toBe(false);
    });
  });

  describe('Song CRUD Operations', () => {
    const mockSongData: Partial<Song> = {
      title: 'Test Song',
      author_id: 'user-123',
      content: '{title: Test Song}\n[C]Hello [G]World',
    };

    const mockFirestoreSong = {
      id: 'song-123',
      title: 'Test Song',
      author_id: 'user-123',
      content: '{title: Test Song}\n[C]Hello [G]World',
      created_at: '2023-02-13T21:31:30.000Z',
      updated_at: '2023-02-13T21:31:30.000Z',
    };

    describe('getSongs', () => {
      it('should retrieve all songs for a user', async () => {
        const mockSnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: 'song-123',
              data: () => mockFirestoreSong,
              exists: () => true,
            });
          }),
        };

        mockCollection.mockReturnValue('songs-collection');
        mockQuery.mockReturnValue('songs-query');
        mockWhere.mockReturnValue('where-clause');
        mockOrderBy.mockReturnValue('order-clause');
        mockGetDocs.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const songs = await firestoreService.getSongs('user-123');

        expect(songs).toHaveLength(1);
        expect(songs[0]).toEqual({
          id: 'song-123',
          title: 'Test Song',
          author_id: 'user-123',
          content: '{title: Test Song}\n[C]Hello [G]World',
          created_at: '2023-02-13T21:31:30.000Z',
          updated_at: '2023-02-13T21:31:30.000Z',
        });

        expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'songs');
        expect(mockWhere).toHaveBeenCalledWith('author_id', '==', 'user-123');
        expect(mockOrderBy).toHaveBeenCalledWith('updated_at', 'desc');
      });

      it('should return empty array when no songs found', async () => {
        const mockSnapshot = { 
          forEach: vi.fn()
        };
        mockGetDocs.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const songs = await firestoreService.getSongs('user-123');

        expect(songs).toEqual([]);
      });

      it('should handle errors during song retrieval', async () => {
        mockGetDocs.mockRejectedValue(new Error('Firestore error'));

        const { firestoreService } = await import('./firestore');
        
        await expect(firestoreService.getSongs('user-123')).rejects.toThrow('Failed to fetch songs from Firestore');
      });
    });

    describe('getSong', () => {
      it('should retrieve a specific song by ID', async () => {
        const mockSnapshot = {
          id: 'song-123',
          data: () => mockFirestoreSong,
          exists: () => true,
        };

        mockDoc.mockReturnValue('song-doc');
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const song = await firestoreService.getSong('song-123');

        expect(song).toEqual({
          id: 'song-123',
          title: 'Test Song',
          author_id: 'user-123',
          content: '{title: Test Song}\n[C]Hello [G]World',
          created_at: '2023-02-13T21:31:30.000Z',
          updated_at: '2023-02-13T21:31:30.000Z',
        });

        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'songs', 'song-123');
      });

      it('should return null when song does not exist', async () => {
        const mockSnapshot = {
          exists: () => false,
        };

        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const song = await firestoreService.getSong('non-existent');

        expect(song).toBeNull();
      });
    });

    describe('createSong', () => {
      it('should create a new song with auto-generated ID', async () => {
        const mockDocRef = { id: 'song-123' };
        const mockSnapshot = {
          id: 'song-123',
          data: () => mockFirestoreSong,
          exists: () => true,
        };

        mockAddDoc.mockResolvedValue(mockDocRef);
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const song = await firestoreService.createSong(mockSongData, 'user-123');

        expect(song.id).toBe('song-123');
        expect(song.title).toBe('Test Song');
        expect(song.author_id).toBe('user-123');

        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            title: 'Test Song',
            author_id: 'user-123',
            content: '{title: Test Song}\n[C]Hello [G]World',
            created_at: expect.any(Object),
            updated_at: expect.any(Object),
          })
        );
      });

      it('should handle creation errors', async () => {
        mockAddDoc.mockRejectedValue(new Error('Creation failed'));

        const { firestoreService } = await import('./firestore');
        
        await expect(
          firestoreService.createSong(mockSongData, 'user-123')
        ).rejects.toThrow('Failed to create song in Firestore');
      });
    });

    describe('updateSong', () => {
      it('should update an existing song', async () => {
        const updateData = { title: 'Updated Title', author_id: 'updated-user' };
        const updatedFirestoreSong = {
          ...mockFirestoreSong,
          title: 'Updated Title',
          author_id: 'updated-user',
        };

        const mockSnapshot = {
          id: 'song-123',
          data: () => updatedFirestoreSong,
          exists: () => true,
        };

        mockDoc.mockReturnValue('song-doc');
        mockUpdateDoc.mockResolvedValue(undefined);
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const song = await firestoreService.updateSong('song-123', updateData);

        expect(song.title).toBe('Updated Title');
        expect(song.author_id).toBe('updated-user');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          'song-doc',
          expect.objectContaining({
            title: 'Updated Title',
            author_id: 'updated-user',
            updated_at: expect.any(Object),
          })
        );
      });

      it('should handle update errors', async () => {
        mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

        const { firestoreService } = await import('./firestore');
        
        await expect(
          firestoreService.updateSong('song-123', { title: 'New Title' })
        ).rejects.toThrow('Failed to update song in Firestore');
      });
    });

    describe('deleteSong', () => {
      it('should delete a song', async () => {
        mockDoc.mockReturnValue('song-doc');
        mockDeleteDoc.mockResolvedValue(undefined);

        const { firestoreService } = await import('./firestore');
        
        await expect(firestoreService.deleteSong('song-123')).resolves.not.toThrow();

        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'songs', 'song-123');
        expect(mockDeleteDoc).toHaveBeenCalledWith('song-doc');
      });

      it('should handle deletion errors', async () => {
        mockDeleteDoc.mockRejectedValue(new Error('Deletion failed'));

        const { firestoreService } = await import('./firestore');
        
        await expect(firestoreService.deleteSong('song-123')).rejects.toThrow('Failed to delete song from Firestore');
      });
    });
  });

  describe('User CRUD Operations', () => {
    const mockUserData = { email: 'test@example.com' };
    const mockFirestoreUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2023-02-13T21:31:30.000Z',
      updated_at: '2023-02-13T21:31:30.000Z',
    };

    describe('getUser', () => {
      it('should retrieve a user by ID', async () => {
        const mockSnapshot = {
          id: 'user-123',
          data: () => mockFirestoreUser,
          exists: () => true,
        };

        mockDoc.mockReturnValue('user-doc');
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const user = await firestoreService.getUser('user-123');

        expect(user).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2023-02-13T21:31:30.000Z',
          updated_at: '2023-02-13T21:31:30.000Z',
        });
      });

      it('should return null when user does not exist', async () => {
        const mockSnapshot = { exists: () => false };
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const user = await firestoreService.getUser('non-existent');

        expect(user).toBeNull();
      });
    });

    describe('createUser', () => {
      it('should create user with provided ID', async () => {
        const mockSnapshot = {
          id: 'user-123',
          data: () => mockFirestoreUser,
          exists: () => true,
        };

        mockDoc.mockReturnValue('user-doc');
        mockSetDoc.mockResolvedValue(undefined);
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const user = await firestoreService.createUser({ 
          email: 'test@example.com',
          id: 'user-123'
        });

        expect(user.id).toBe('user-123');
        expect(user.email).toBe('test@example.com');

        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-123');
        expect(mockSetDoc).toHaveBeenCalled();
      });

      it('should create user with auto-generated ID', async () => {
        const mockDocRef = { id: 'auto-user-456' };
        const mockSnapshot = {
          id: 'auto-user-456',
          data: () => ({ ...mockFirestoreUser, id: 'auto-user-456' }),
          exists: () => true,
        };

        mockAddDoc.mockResolvedValue(mockDocRef);
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const user = await firestoreService.createUser(mockUserData);

        expect(user.id).toBe('auto-user-456');
        expect(mockAddDoc).toHaveBeenCalled();
      });
    });

    describe('updateUser', () => {
      it('should update user information', async () => {
        const updateData = { email: 'updated@example.com' };
        const updatedFirestoreUser = {
          ...mockFirestoreUser,
          email: 'updated@example.com',
        };

        const mockSnapshot = {
          id: 'user-123',
          data: () => updatedFirestoreUser,
          exists: () => true,
        };

        mockDoc.mockReturnValue('user-doc');
        mockUpdateDoc.mockResolvedValue(undefined);
        mockGetDoc.mockResolvedValue(mockSnapshot);

        const { firestoreService } = await import('./firestore');
        const user = await firestoreService.updateUser('user-123', updateData);

        expect(user.email).toBe('updated@example.com');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          'user-doc',
          expect.objectContaining({
            email: 'updated@example.com',
            updated_at: expect.any(Object),
          })
        );
      });
    });
  });

  describe('Real-time Operations', () => {
    describe('subscribeToSongs', () => {
      it('should set up real-time listener for songs', async () => {
        const mockUnsubscribe = vi.fn();
        const callback = vi.fn();

        mockCollection.mockReturnValue('songs-collection');
        mockQuery.mockReturnValue('songs-query');
        mockWhere.mockReturnValue('where-clause');
        mockOrderBy.mockReturnValue('order-clause');
        mockOnSnapshot.mockReturnValue(mockUnsubscribe);

        const { firestoreService } = await import('./firestore');
        const unsubscribe = firestoreService.subscribeToSongs('user-123', callback);

        expect(unsubscribe).toBe(mockUnsubscribe);
        expect(mockOnSnapshot).toHaveBeenCalled();
        expect(mockWhere).toHaveBeenCalledWith('author_id', '==', 'user-123');
      });

      it('should handle real-time updates', async () => {
        const callback = vi.fn();
        const mockSnapshot = {
          forEach: vi.fn((cb) => {
            cb({
              id: 'song-123',
              data: () => mockFirestoreSong,
              exists: () => true,
            });
          }),
        };

        mockOnSnapshot.mockImplementation((query, cb) => {
          // Simulate snapshot callback
          cb(mockSnapshot);
          return vi.fn();
        });

        const { firestoreService } = await import('./firestore');
        firestoreService.subscribeToSongs('user-123', callback);

        expect(callback).toHaveBeenCalledWith([
          expect.objectContaining({
            id: 'song-123',
            title: 'Test Song',
            author_id: 'user-123',
          }),
        ]);
      });
    });

    describe('subscribeToSong', () => {
      it('should set up real-time listener for a single song', async () => {
        const mockUnsubscribe = vi.fn();
        const callback = vi.fn();

        mockDoc.mockReturnValue('song-doc');
        mockOnSnapshot.mockReturnValue(mockUnsubscribe);

        const { firestoreService } = await import('./firestore');
        const unsubscribe = firestoreService.subscribeToSong('song-123', callback);

        expect(unsubscribe).toBe(mockUnsubscribe);
        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'songs', 'song-123');
        expect(mockOnSnapshot).toHaveBeenCalled();
      });

      it('should handle single song real-time updates', async () => {
        const callback = vi.fn();
        const mockSnapshot = {
          id: 'song-123',
          data: () => mockFirestoreSong,
          exists: () => true,
        };

        mockOnSnapshot.mockImplementation((docRef, cb) => {
          // Simulate snapshot callback
          cb(mockSnapshot);
          return vi.fn();
        });

        const { firestoreService } = await import('./firestore');
        firestoreService.subscribeToSong('song-123', callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'song-123',
            title: 'Test Song',
            author_id: 'user-123',
          })
        );
      });

      it('should handle song deletion in real-time', async () => {
        const callback = vi.fn();
        const mockSnapshot = {
          exists: () => false,
        };

        mockOnSnapshot.mockImplementation((docRef, cb) => {
          cb(mockSnapshot);
          return vi.fn();
        });

        const { firestoreService } = await import('./firestore');
        firestoreService.subscribeToSong('song-123', callback);

        expect(callback).toHaveBeenCalledWith(null);
      });
    });
  });
});