import { describe, it, expect, beforeEach, vi } from 'vitest';
import { splitViewPreferenceService } from './splitViewPreference';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('splitViewPreferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return default preferences when no stored data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const preferences = splitViewPreferenceService.getPreferences();
      
      expect(preferences).toEqual({
        viewMode: 'split',
        splitOrientation: 'vertical',
        splitRatio: 0.5,
        timestamp: expect.any(Number),
      });
      expect(localStorageMock.getItem).toHaveBeenCalledWith('chordme_split_view_preference');
    });

    it('should return stored preferences when they exist', () => {
      const storedPreferences = {
        viewMode: 'edit-only',
        splitOrientation: 'horizontal',
        splitRatio: 0.7,
        timestamp: 1234567890,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences));
      
      const preferences = splitViewPreferenceService.getPreferences();
      
      expect(preferences).toEqual(storedPreferences);
    });

    it('should return default preferences when stored data is invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const preferences = splitViewPreferenceService.getPreferences();
      
      expect(preferences.viewMode).toBe('split');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get split view preferences:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('setViewMode', () => {
    it('should update view mode and save to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        viewMode: 'split',
        splitOrientation: 'vertical',
        splitRatio: 0.5,
        timestamp: 1234567890,
      }));
      
      splitViewPreferenceService.setViewMode('edit-only');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_split_view_preference',
        expect.stringContaining('"viewMode":"edit-only"')
      );
    });
  });

  describe('setSplitOrientation', () => {
    it('should update split orientation and save to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        viewMode: 'split',
        splitOrientation: 'vertical',
        splitRatio: 0.5,
        timestamp: 1234567890,
      }));
      
      splitViewPreferenceService.setSplitOrientation('horizontal');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_split_view_preference',
        expect.stringContaining('"splitOrientation":"horizontal"')
      );
    });
  });

  describe('setSplitRatio', () => {
    it('should update split ratio and save to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        viewMode: 'split',
        splitOrientation: 'vertical',
        splitRatio: 0.5,
        timestamp: 1234567890,
      }));
      
      splitViewPreferenceService.setSplitRatio(0.7);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_split_view_preference',
        expect.stringContaining('"splitRatio":0.7')
      );
    });

    it('should clamp split ratio between 0.1 and 0.9', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        viewMode: 'split',
        splitOrientation: 'vertical',
        splitRatio: 0.5,
        timestamp: 1234567890,
      }));
      
      // Test clamping to minimum
      splitViewPreferenceService.setSplitRatio(0.05);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_split_view_preference',
        expect.stringContaining('"splitRatio":0.1')
      );
      
      // Test clamping to maximum
      splitViewPreferenceService.setSplitRatio(0.95);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_split_view_preference',
        expect.stringContaining('"splitRatio":0.9')
      );
    });
  });

  describe('clearPreferences', () => {
    it('should remove preferences from localStorage', () => {
      splitViewPreferenceService.clearPreferences();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('chordme_split_view_preference');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => splitViewPreferenceService.clearPreferences()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear split view preferences:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('hasCustomPreferences', () => {
    it('should return true when preferences exist', () => {
      localStorageMock.getItem.mockReturnValue('{"viewMode":"edit-only"}');
      
      const hasCustom = splitViewPreferenceService.hasCustomPreferences();
      
      expect(hasCustom).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('chordme_split_view_preference');
    });

    it('should return false when no preferences exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const hasCustom = splitViewPreferenceService.hasCustomPreferences();
      
      expect(hasCustom).toBe(false);
    });

    it('should return false when localStorage throws an error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const hasCustom = splitViewPreferenceService.hasCustomPreferences();
      
      expect(hasCustom).toBe(false);
    });
  });
});