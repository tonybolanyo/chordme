import { describe, it, expect, beforeEach } from 'vitest';
import { storagePreferenceService } from './storagePreference';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('StoragePreferenceService', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getPreference', () => {
    it('should return default "api" when no preference is stored', () => {
      const preference = storagePreferenceService.getPreference();
      expect(preference).toBe('api');
    });

    it('should return stored preference when available', () => {
      storagePreferenceService.setPreference('firebase');
      const preference = storagePreferenceService.getPreference();
      expect(preference).toBe('firebase');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('chordme_storage_preference', 'invalid-json');
      const preference = storagePreferenceService.getPreference();
      expect(preference).toBe('api');
    });
  });

  describe('setPreference', () => {
    it('should store preference with timestamp', () => {
      const before = Date.now();
      storagePreferenceService.setPreference('firebase');
      const after = Date.now();

      const metadata = storagePreferenceService.getPreferenceMetadata();
      expect(metadata).toBeTruthy();
      expect(metadata!.backend).toBe('firebase');
      expect(metadata!.timestamp).toBeGreaterThanOrEqual(before);
      expect(metadata!.timestamp).toBeLessThanOrEqual(after);
    });

    it('should overwrite existing preference', () => {
      storagePreferenceService.setPreference('firebase');
      storagePreferenceService.setPreference('api');

      const preference = storagePreferenceService.getPreference();
      expect(preference).toBe('api');
    });
  });

  describe('clearPreference', () => {
    it('should remove stored preference', () => {
      storagePreferenceService.setPreference('firebase');
      expect(storagePreferenceService.hasExplicitPreference()).toBe(true);

      storagePreferenceService.clearPreference();
      expect(storagePreferenceService.hasExplicitPreference()).toBe(false);
      expect(storagePreferenceService.getPreference()).toBe('api');
    });
  });

  describe('hasExplicitPreference', () => {
    it('should return false when no preference is stored', () => {
      expect(storagePreferenceService.hasExplicitPreference()).toBe(false);
    });

    it('should return true when preference is stored', () => {
      storagePreferenceService.setPreference('firebase');
      expect(storagePreferenceService.hasExplicitPreference()).toBe(true);
    });
  });

  describe('getPreferenceMetadata', () => {
    it('should return null when no preference is stored', () => {
      const metadata = storagePreferenceService.getPreferenceMetadata();
      expect(metadata).toBe(null);
    });

    it('should return metadata when preference is stored', () => {
      storagePreferenceService.setPreference('firebase');
      const metadata = storagePreferenceService.getPreferenceMetadata();

      expect(metadata).toBeTruthy();
      expect(metadata!.backend).toBe('firebase');
      expect(typeof metadata!.timestamp).toBe('number');
    });
  });
});
