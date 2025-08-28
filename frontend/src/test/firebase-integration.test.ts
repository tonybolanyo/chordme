// Test script to verify Firebase integration functionality
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiService } from '../services/api';

// Mock Firebase service for testing
vi.mock('../services/firebase', () => ({
  firebaseService: {
    isEnabled: vi.fn(),
    isInitialized: vi.fn(),
  },
}));

// Mock storage preference service
vi.mock('../services/storagePreference', () => ({
  storagePreferenceService: {
    getPreference: vi.fn(),
  },
}));

describe('Firebase Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report API data source when Firebase is disabled', async () => {
    const { firebaseService } = await import('../services/firebase');
    const { storagePreferenceService } = await import(
      '../services/storagePreference'
    );

    vi.mocked(firebaseService.isEnabled).mockReturnValue(false);
    vi.mocked(firebaseService.isInitialized).mockReturnValue(false);
    vi.mocked(storagePreferenceService.getPreference).mockReturnValue('api');

    const dataSourceInfo = apiService.getDataSourceInfo();

    expect(dataSourceInfo).toEqual({
      source: 'api',
      isFirebaseEnabled: false,
      isFirebaseConfigured: false,
    });
  });

  it('should report Firebase data source when Firebase is enabled', async () => {
    const { firebaseService } = await import('../services/firebase');
    const { storagePreferenceService } = await import(
      '../services/storagePreference'
    );

    vi.mocked(firebaseService.isEnabled).mockReturnValue(true);
    vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
    vi.mocked(storagePreferenceService.getPreference).mockReturnValue(
      'firebase'
    );

    const dataSourceInfo = apiService.getDataSourceInfo();

    expect(dataSourceInfo).toEqual({
      source: 'firebase',
      isFirebaseEnabled: true, // This maps to isEnabled() in the implementation
      isFirebaseConfigured: true, // This maps to isInitialized() in the implementation
    });
  });

  it('should handle mixed Firebase states correctly', async () => {
    const { firebaseService } = await import('../services/firebase');
    const { storagePreferenceService } = await import(
      '../services/storagePreference'
    );

    // Firebase initialized but not enabled (wrong VITE_DATA_SOURCE)
    vi.mocked(firebaseService.isEnabled).mockReturnValue(false);
    vi.mocked(firebaseService.isInitialized).mockReturnValue(true);
    vi.mocked(storagePreferenceService.getPreference).mockReturnValue('api');

    const dataSourceInfo = apiService.getDataSourceInfo();

    expect(dataSourceInfo).toEqual({
      source: 'api',
      isFirebaseEnabled: true, // This maps to isEnabled() = true
      isFirebaseConfigured: false, // This maps to isInitialized() = false
    });
  });
});
