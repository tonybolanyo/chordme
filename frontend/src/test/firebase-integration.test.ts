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

describe('Firebase Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report API data source when Firebase is disabled', async () => {
    const { firebaseService } = await import('../services/firebase');
    vi.mocked(firebaseService.isEnabled).mockReturnValue(false);
    vi.mocked(firebaseService.isInitialized).mockReturnValue(false);

    const dataSourceInfo = apiService.getDataSourceInfo();
    
    expect(dataSourceInfo).toEqual({
      source: 'api',
      isFirebaseEnabled: false,
      isFirebaseConfigured: false,
    });
  });

  it('should report Firebase data source when Firebase is enabled', async () => {
    const { firebaseService } = await import('../services/firebase');
    vi.mocked(firebaseService.isEnabled).mockReturnValue(true);
    vi.mocked(firebaseService.isInitialized).mockReturnValue(true);

    const dataSourceInfo = apiService.getDataSourceInfo();
    
    expect(dataSourceInfo).toEqual({
      source: 'firebase',
      isFirebaseEnabled: true,
      isFirebaseConfigured: true,
    });
  });

  it('should handle mixed Firebase states correctly', async () => {
    const { firebaseService } = await import('../services/firebase');
    // Firebase initialized but not enabled (wrong VITE_DATA_SOURCE)
    vi.mocked(firebaseService.isEnabled).mockReturnValue(false);
    vi.mocked(firebaseService.isInitialized).mockReturnValue(true);

    const dataSourceInfo = apiService.getDataSourceInfo();
    
      isFirebaseConfigured: true,
    });
  });
});