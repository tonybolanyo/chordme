// Basic tests for Firebase service
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase modules since we don't have a real Firebase project in tests
vi.mock('firebase/app');
vi.mock('firebase/firestore');
vi.mock('firebase/auth');

describe('FirebaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should exist and be importable', async () => {
    const { firebaseService } = await import('./firebase');
    expect(firebaseService).toBeDefined();
    expect(typeof firebaseService.initialize).toBe('function');
    expect(typeof firebaseService.isInitialized).toBe('function');
    expect(typeof firebaseService.isEnabled).toBe('function');
  });
});