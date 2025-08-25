// Service for managing user storage backend preferences
const STORAGE_PREFERENCE_KEY = 'chordme_storage_preference';

export type StorageBackendType =
  | 'api'
  | 'firebase'
  | 'googledrive'
  | 'localstorage';

export interface StoragePreference {
  backend: StorageBackendType;
  timestamp: number;
}

class StoragePreferenceService {
  /**
   * Get the user's preferred storage backend
   */
  getPreference(): StorageBackendType {
    try {
      const stored = localStorage.getItem(STORAGE_PREFERENCE_KEY);
      if (stored) {
        const preference: StoragePreference = JSON.parse(stored);
        return preference.backend;
      }
    } catch (error) {
      console.warn(
        'Failed to get storage preference from localStorage:',
        error
      );
    }

    // Default fallback: check environment variable, then default to 'api'
    const envDataSource = import.meta.env.VITE_DATA_SOURCE;
    if (envDataSource === 'firebase') {
      return 'firebase';
    }
    return 'api';
  }

  /**
   * Set the user's preferred storage backend
   */
  setPreference(backend: StorageBackendType): void {
    try {
      const preference: StoragePreference = {
        backend,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_PREFERENCE_KEY, JSON.stringify(preference));
    } catch (error) {
      console.error(
        'Failed to save storage preference to localStorage:',
        error
      );
    }
  }

  /**
   * Clear the user's storage preference (will fall back to environment variable)
   */
  clearPreference(): void {
    try {
      localStorage.removeItem(STORAGE_PREFERENCE_KEY);
    } catch (error) {
      console.warn(
        'Failed to clear storage preference from localStorage:',
        error
      );
    }
  }

  /**
   * Check if the user has explicitly set a preference
   */
  hasExplicitPreference(): boolean {
    try {
      return localStorage.getItem(STORAGE_PREFERENCE_KEY) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get preference metadata including timestamp
   */
  getPreferenceMetadata(): StoragePreference | null {
    try {
      const stored = localStorage.getItem(STORAGE_PREFERENCE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to get storage preference metadata:', error);
    }
    return null;
  }
}

// Export singleton instance
export const storagePreferenceService = new StoragePreferenceService();
