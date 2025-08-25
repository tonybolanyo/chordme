// Comprehensive tests for Firebase SDK initialization and configuration
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Firebase modules since we don't have a real Firebase project in tests
const mockInitializeApp = vi.fn();
const mockGetFirestore = vi.fn();
const mockGetAuth = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
}));

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
}));

// Store original environment variables
const originalEnv = import.meta.env;

describe('FirebaseService - SDK Initialization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    Object.assign(import.meta.env, originalEnv);
  });

  afterEach(() => {
    // Clean up any instances that might have been created
    vi.resetModules();
  });

  describe('Service Availability and Structure', () => {
    it('should exist and be importable with all required methods', async () => {
      const { firebaseService } = await import('./firebase');
      expect(firebaseService).toBeDefined();
      expect(typeof firebaseService.initialize).toBe('function');
      expect(typeof firebaseService.isInitialized).toBe('function');
      expect(typeof firebaseService.isEnabled).toBe('function');
      expect(typeof firebaseService.getApp).toBe('function');
      expect(typeof firebaseService.getFirestore).toBe('function');
      expect(typeof firebaseService.getAuth).toBe('function');
      expect(typeof firebaseService.getConfig).toBe('function');
    });
  });

  describe('Configuration Validation', () => {
    it('should successfully initialize with complete configuration', async () => {
      // Set complete configuration
      Object.assign(import.meta.env, {
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
      });

      const mockApp = { name: 'test-app' };
      const mockFirestore = { type: 'firestore' };
      const mockAuth = { type: 'auth' };

      mockInitializeApp.mockReturnValue(mockApp);
      mockGetFirestore.mockReturnValue(mockFirestore);
      mockGetAuth.mockReturnValue(mockAuth);

      // Re-import to get fresh instance with new env vars
      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      const result = firebaseService.initialize();

      expect(result).toBe(true);
      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test-project.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test-project.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abcdef123456',
      });
      expect(mockGetFirestore).toHaveBeenCalledWith(mockApp);
      expect(mockGetAuth).toHaveBeenCalledWith(mockApp);
      expect(firebaseService.isInitialized()).toBe(true);
    });

    it('should fail initialization with missing API key', async () => {
      Object.assign(import.meta.env, {
        VITE_FIREBASE_API_KEY: '', // Missing
        VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
      });

      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = firebaseService.initialize();

      expect(result).toBe(false);
      expect(firebaseService.isInitialized()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Firebase initialization skipped - missing configuration:',
        ['apiKey']
      );
      
      consoleSpy.mockRestore();
    });

    it('should fail initialization with multiple missing fields', async () => {
      Object.assign(import.meta.env, {
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: '', // Missing
        VITE_FIREBASE_PROJECT_ID: '', // Missing
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '',  // Missing
      });

      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = firebaseService.initialize();

      expect(result).toBe(false);
      expect(firebaseService.isInitialized()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Firebase initialization skipped - missing configuration:',
        ['authDomain', 'projectId', 'appId']
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle Firebase initialization errors gracefully', async () => {
      Object.assign(import.meta.env, {
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
      });

      const initError = new Error('Invalid API key');
      mockInitializeApp.mockImplementation(() => {
        throw initError;
      });

      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = firebaseService.initialize();

      expect(result).toBe(false);
      expect(firebaseService.isInitialized()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Firebase:', initError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Service State Management', () => {
    it('should correctly report enabled state when data source is firebase and initialized', async () => {
      Object.assign(import.meta.env, {
        VITE_DATA_SOURCE: 'firebase',
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
      });

      mockInitializeApp.mockReturnValue({ name: 'test-app' });
      mockGetFirestore.mockReturnValue({ type: 'firestore' });
      mockGetAuth.mockReturnValue({ type: 'auth' });

      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      firebaseService.initialize();

      expect(firebaseService.isEnabled()).toBe(true);
    });

    it('should report not enabled when data source is not firebase', async () => {
      Object.assign(import.meta.env, {
        VITE_DATA_SOURCE: 'api',
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
      });

      mockInitializeApp.mockReturnValue({ name: 'test-app' });
      mockGetFirestore.mockReturnValue({ type: 'firestore' });
      mockGetAuth.mockReturnValue({ type: 'auth' });

      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      firebaseService.initialize();

      expect(firebaseService.isEnabled()).toBe(false);
    });

    it('should return correct instances after successful initialization', async () => {
      Object.assign(import.meta.env, {
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
      });

      const mockApp = { name: 'test-app' };
      const mockFirestore = { type: 'firestore' };
      const mockAuth = { type: 'auth' };

      mockInitializeApp.mockReturnValue(mockApp);
      mockGetFirestore.mockReturnValue(mockFirestore);
      mockGetAuth.mockReturnValue(mockAuth);

      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      firebaseService.initialize();

      expect(firebaseService.getApp()).toBe(mockApp);
      expect(firebaseService.getFirestore()).toBe(mockFirestore);
      expect(firebaseService.getAuth()).toBe(mockAuth);
      expect(firebaseService.getConfig()).toEqual({
        apiKey: 'test-api-key',
        authDomain: 'test-project.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test-project.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abcdef123456',
      });
    });

    it('should return null instances when not initialized', async () => {
      Object.assign(import.meta.env, {
        VITE_FIREBASE_API_KEY: '', // Missing to prevent initialization
      });

      vi.resetModules();
      const { firebaseService } = await import('./firebase');
      
      // Don't initialize
      expect(firebaseService.getApp()).toBeNull();
      expect(firebaseService.getFirestore()).toBeNull();
      expect(firebaseService.getAuth()).toBeNull();
      expect(firebaseService.getConfig()).toBeNull();
      expect(firebaseService.isInitialized()).toBe(false);
    });
  });
});