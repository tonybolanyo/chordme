import { useState, useEffect, useCallback } from 'react';
import { ViewMode, SplitOrientation, SplitViewConfig } from '../types';
import { splitViewPreferenceService } from '../services/splitViewPreference';

interface UseSplitViewOptions {
  defaultViewMode?: ViewMode;
  defaultSplitOrientation?: SplitOrientation;
  defaultSplitRatio?: number;
  enableSyncedScrolling?: boolean;
  showModeSelector?: boolean;
}

interface UseSplitViewReturn {
  config: SplitViewConfig;
  setViewMode: (mode: ViewMode) => void;
  setSplitOrientation: (orientation: SplitOrientation) => void;
  setSplitRatio: (ratio: number) => void;
  resetToDefaults: () => void;
}

export const useSplitView = (options: UseSplitViewOptions = {}): UseSplitViewReturn => {
  const {
    defaultViewMode = 'split',
    defaultSplitOrientation = 'vertical',
    defaultSplitRatio = 0.5,
    enableSyncedScrolling = true,
    showModeSelector = true,
  } = options;

  // Initialize state from preferences or defaults
  const [config, setConfig] = useState<SplitViewConfig>(() => {
    const preferences = splitViewPreferenceService.getPreferences();
    return {
      viewMode: preferences.viewMode || defaultViewMode,
      splitOrientation: preferences.splitOrientation || defaultSplitOrientation,
      splitRatio: preferences.splitRatio || defaultSplitRatio,
      enableSyncedScrolling,
      showModeSelector,
    };
  });

  // Update view mode
  const setViewMode = useCallback((viewMode: ViewMode) => {
    setConfig(prev => ({ ...prev, viewMode }));
    splitViewPreferenceService.setViewMode(viewMode);
  }, []);

  // Update split orientation
  const setSplitOrientation = useCallback((splitOrientation: SplitOrientation) => {
    setConfig(prev => ({ ...prev, splitOrientation }));
    splitViewPreferenceService.setSplitOrientation(splitOrientation);
  }, []);

  // Update split ratio
  const setSplitRatio = useCallback((splitRatio: number) => {
    setConfig(prev => ({ ...prev, splitRatio }));
    splitViewPreferenceService.setSplitRatio(splitRatio);
  }, []);

  // Reset to default preferences
  const resetToDefaults = useCallback(() => {
    const newConfig: SplitViewConfig = {
      viewMode: defaultViewMode,
      splitOrientation: defaultSplitOrientation,
      splitRatio: defaultSplitRatio,
      enableSyncedScrolling,
      showModeSelector,
    };
    setConfig(newConfig);
    splitViewPreferenceService.clearPreferences();
  }, [defaultViewMode, defaultSplitOrientation, defaultSplitRatio, enableSyncedScrolling, showModeSelector]);

  // Listen for changes in localStorage (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chordme_split_view_preference' && e.newValue) {
        try {
          const preferences = JSON.parse(e.newValue);
          setConfig(prev => ({
            ...prev,
            viewMode: preferences.viewMode || prev.viewMode,
            splitOrientation: preferences.splitOrientation || prev.splitOrientation,
            splitRatio: preferences.splitRatio || prev.splitRatio,
          }));
        } catch (error) {
          console.warn('Failed to parse split view preferences from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    config,
    setViewMode,
    setSplitOrientation,
    setSplitRatio,
    resetToDefaults,
  };
};