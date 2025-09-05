// Service for managing split-screen view preferences
import { ViewMode, SplitOrientation, SplitViewPreferences } from '../types';

const SPLIT_VIEW_PREFERENCE_KEY = 'chordme_split_view_preference';

const DEFAULT_PREFERENCES: SplitViewPreferences = {
  viewMode: 'split',
  splitOrientation: 'vertical',
  splitRatio: 0.5,
  timestamp: Date.now(),
};

class SplitViewPreferenceService {
  /**
   * Get the user's split view preferences
   */
  getPreferences(): SplitViewPreferences {
    try {
      const stored = localStorage.getItem(SPLIT_VIEW_PREFERENCE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to get split view preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }

  /**
   * Set the user's view mode preference
   */
  setViewMode(viewMode: ViewMode): void {
    const preferences = this.getPreferences();
    this.setPreferences({ ...preferences, viewMode });
  }

  /**
   * Set the user's split orientation preference
   */
  setSplitOrientation(splitOrientation: SplitOrientation): void {
    const preferences = this.getPreferences();
    this.setPreferences({ ...preferences, splitOrientation });
  }

  /**
   * Set the user's split ratio preference
   */
  setSplitRatio(splitRatio: number): void {
    const preferences = this.getPreferences();
    // Clamp between 0.1 and 0.9
    const clampedRatio = Math.max(0.1, Math.min(0.9, splitRatio));
    this.setPreferences({ ...preferences, splitRatio: clampedRatio });
  }

  /**
   * Set all split view preferences
   */
  setPreferences(preferences: Partial<SplitViewPreferences>): void {
    try {
      const current = this.getPreferences();
      const updated: SplitViewPreferences = {
        ...current,
        ...preferences,
        timestamp: Date.now(),
      };
      localStorage.setItem(SPLIT_VIEW_PREFERENCE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save split view preferences:', error);
    }
  }

  /**
   * Clear all split view preferences
   */
  clearPreferences(): void {
    try {
      localStorage.removeItem(SPLIT_VIEW_PREFERENCE_KEY);
    } catch (error) {
      console.warn('Failed to clear split view preferences:', error);
    }
  }

  /**
   * Check if user has custom preferences
   */
  hasCustomPreferences(): boolean {
    try {
      return localStorage.getItem(SPLIT_VIEW_PREFERENCE_KEY) !== null;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const splitViewPreferenceService = new SplitViewPreferenceService();