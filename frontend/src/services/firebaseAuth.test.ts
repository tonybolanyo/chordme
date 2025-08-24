// Test Firebase Authentication service
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase Auth modules first
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(() => ({
    addScope: vi.fn(),
  })),
  signInWithPopup: vi.fn(),
}));

// Mock the firebase service with the actual module path
vi.mock('./firebase', () => ({
  firebaseService: {
    isInitialized: vi.fn(),
    getAuth: vi.fn(),
  },
}));

// Import after mocking
import { firebaseAuthService } from './firebaseAuth';

describe('FirebaseAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service availability', () => {
    it('should report as unavailable when Firebase is not initialized', async () => {
      const { firebaseService } = await import('./firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);
      vi.mocked(firebaseService.getAuth).mockReturnValue(null);

      expect(firebaseAuthService.isAvailable()).toBe(false);
    });

    it('should report as available when Firebase is initialized', async () => {
      const { firebaseService } = await import('./firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
      vi.mocked(firebaseService.getAuth).mockReturnValue({} as any);

      expect(firebaseAuthService.isAvailable()).toBe(true);
    });
  });

  describe('Email/Password Authentication', () => {
    beforeEach(async () => {
      const { firebaseService } = await import('./firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
      vi.mocked(firebaseService.getAuth).mockReturnValue({} as any);
    });

    it('should sign up with email and password', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: null,
        photoURL: null,
      };
      
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      });

      const result = await firebaseAuthService.signUpWithEmailAndPassword(
        'test@example.com',
        'password123'
      );

      expect(result.user.uid).toBe('test-uid');
      expect(result.user.email).toBe('test@example.com');
      expect(result.isNewUser).toBe(true);
    });

    it('should sign in with email and password', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      });

      const result = await firebaseAuthService.signInWithEmailAndPassword(
        'test@example.com',
        'password123'
      );

      expect(result.user.uid).toBe('test-uid');
      expect(result.user.email).toBe('test@example.com');
      expect(result.isNewUser).toBe(false);
    });

    it('should handle authentication errors', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });

      await expect(
        firebaseAuthService.signInWithEmailAndPassword('test@example.com', 'wrong-password')
      ).rejects.toThrow('No account found with this email address');
    });
  });

  describe('Google Authentication', () => {
    beforeEach(async () => {
      const { firebaseService } = await import('./firebase');
      vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
      vi.mocked(firebaseService.getAuth).mockReturnValue({} as any);
    });

    it('should sign in with Google', async () => {
      const { signInWithPopup } = await import('firebase/auth');
      const mockUser = {
        uid: 'google-uid',
        email: 'test@gmail.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        metadata: {
          creationTime: '2023-01-01',
          lastSignInTime: '2023-01-02',
        },
      };
      
      vi.mocked(signInWithPopup).mockResolvedValue({
        user: mockUser,
      });

      const result = await firebaseAuthService.signInWithGoogle();

      expect(result.user.uid).toBe('google-uid');
      expect(result.user.email).toBe('test@gmail.com');
      expect(result.user.displayName).toBe('Test User');
      expect(result.isNewUser).toBe(false);
    });

    it('should handle Google sign-in errors', async () => {
      const { signInWithPopup } = await import('firebase/auth');
      
      vi.mocked(signInWithPopup).mockRejectedValue({
        code: 'auth/popup-closed-by-user',
        message: 'Popup closed',
      });

      await expect(firebaseAuthService.signInWithGoogle()).rejects.toThrow(
        'Sign-in was cancelled'
      );
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      const { firebaseService } = await import('./firebase');
      const { signOut } = await import('firebase/auth');
      
      vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
      vi.mocked(firebaseService.getAuth).mockReturnValue({} as any);
      vi.mocked(signOut).mockResolvedValue(undefined);

      await expect(firebaseAuthService.signOut()).resolves.not.toThrow();
    });

    it('should throw error when Firebase is not available', async () => {
      const { firebaseService } = await import('./firebase');
      
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      await expect(firebaseAuthService.signOut()).rejects.toThrow(
        'Firebase Auth is not available'
      );
    });
  });

  describe('Current User', () => {
    it('should return current user when available', async () => {
      const { firebaseService } = await import('./firebase');
      const mockUser = {
        uid: 'current-uid',
        email: 'current@example.com',
        displayName: 'Current User',
        photoURL: null,
      };
      
      vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
      vi.mocked(firebaseService.getAuth).mockReturnValue({
        currentUser: mockUser,
      });

      const user = firebaseAuthService.getCurrentUser();

      expect(user?.uid).toBe('current-uid');
      expect(user?.email).toBe('current@example.com');
    });

    it('should return null when no user is signed in', async () => {
      const { firebaseService } = await import('./firebase');
      
      vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
      vi.mocked(firebaseService.getAuth).mockReturnValue({
        currentUser: null,
      });

      const user = firebaseAuthService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('Auth State Listener', () => {
    it('should set up auth state listener', async () => {
      const { firebaseService } = await import('./firebase');
      const { onAuthStateChanged } = await import('firebase/auth');
      const mockUnsubscribe = vi.fn();
      
      vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
      vi.mocked(firebaseService.getAuth).mockReturnValue({} as any);
      vi.mocked(onAuthStateChanged).mockReturnValue(mockUnsubscribe);

      const callback = vi.fn();
      const unsubscribe = firebaseAuthService.onAuthStateChanged(callback);

      expect(onAuthStateChanged).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should return no-op function when Firebase is not available', async () => {
      const { firebaseService } = await import('./firebase');
      
      vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

      const callback = vi.fn();
      const unsubscribe = firebaseAuthService.onAuthStateChanged(callback);

      expect(typeof unsubscribe).toBe('function');
      // Should not throw when called
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});