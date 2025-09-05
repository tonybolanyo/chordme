// Types for split-screen preview mode
export type ViewMode = 'edit-only' | 'preview-only' | 'split';

export type SplitOrientation = 'horizontal' | 'vertical';

export interface SplitViewPreferences {
  viewMode: ViewMode;
  splitOrientation: SplitOrientation;
  splitRatio: number; // 0.1 to 0.9, representing the left/top pane size
  timestamp: number;
}

export interface SplitViewConfig {
  viewMode: ViewMode;
  splitOrientation: SplitOrientation;
  splitRatio: number;
  showModeSelector: boolean;
  enableSyncedScrolling: boolean;
}