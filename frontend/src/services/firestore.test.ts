// Basic tests for Firestore service
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase modules since we don't have a real Firebase project in tests
vi.mock('firebase/firestore');
vi.mock('./firebase', () => ({
  firebaseService: {
    getFirestore: vi.fn(() => ({ name: 'test-firestore' })),
    isInitialized: vi.fn(() => true),
  },
}));

describe('FirestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should exist and be importable', async () => {
    const { firestoreService } = await import('./firestore');
    expect(firestoreService).toBeDefined();
    expect(typeof firestoreService.getSongs).toBe('function');
    expect(typeof firestoreService.getSong).toBe('function');
    expect(typeof firestoreService.createSong).toBe('function');
    expect(typeof firestoreService.updateSong).toBe('function');
    expect(typeof firestoreService.deleteSong).toBe('function');
    expect(typeof firestoreService.isAvailable).toBe('function');
  });

  it('should have real-time subscription methods', async () => {
    const { firestoreService } = await import('./firestore');
    expect(typeof firestoreService.subscribeToSongs).toBe('function');
    expect(typeof firestoreService.subscribeToSong).toBe('function');
  });

  it('should report availability based on Firebase service', async () => {
    const { firestoreService } = await import('./firestore');
    expect(firestoreService.isAvailable()).toBe(true);
  });
});