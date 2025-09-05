/**
 * Service for managing autocompletion settings and custom chords
 */

export interface AutocompletionSettings {
  enabled: boolean;
  maxSuggestions: number;
  showDirectives: boolean;
  showChords: boolean;
  contextAware: boolean;
  customChords: CustomChord[];
}

export interface CustomChord {
  name: string;
  definition: string;
  description?: string;
  category?: string;
  userId?: string;
  createdAt: Date;
}

const SETTINGS_KEY = 'chordme_autocompletion_settings';
const CUSTOM_CHORDS_KEY = 'chordme_custom_chords';

const DEFAULT_SETTINGS: AutocompletionSettings = {
  enabled: true,
  maxSuggestions: 8,
  showDirectives: true,
  showChords: true,
  contextAware: true,
  customChords: [],
};

class AutocompletionSettingsService {
  /**
   * Get current autocompletion settings
   */
  getSettings(): AutocompletionSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load autocompletion settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Save autocompletion settings
   */
  saveSettings(settings: Partial<AutocompletionSettings>): void {
    try {
      const currentSettings = this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save autocompletion settings:', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): void {
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      console.warn('Failed to reset autocompletion settings:', error);
    }
  }

  /**
   * Get custom chords
   */
  getCustomChords(): CustomChord[] {
    try {
      const stored = localStorage.getItem(CUSTOM_CHORDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((chord: any) => ({
          ...chord,
          createdAt: new Date(chord.createdAt),
        }));
      }
    } catch (error) {
      console.warn('Failed to load custom chords:', error);
    }
    return [];
  }

  /**
   * Add a custom chord
   */
  addCustomChord(chord: Omit<CustomChord, 'createdAt'>): void {
    try {
      const customChords = this.getCustomChords();
      const newChord: CustomChord = {
        ...chord,
        createdAt: new Date(),
      };
      
      // Check if chord already exists (case-insensitive)
      const existingIndex = customChords.findIndex(
        c => c.name.toLowerCase() === chord.name.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update existing chord
        customChords[existingIndex] = newChord;
      } else {
        // Add new chord
        customChords.push(newChord);
      }
      
      localStorage.setItem(CUSTOM_CHORDS_KEY, JSON.stringify(customChords));
    } catch (error) {
      console.error('Failed to add custom chord:', error);
    }
  }

  /**
   * Remove a custom chord
   */
  removeCustomChord(chordName: string): void {
    try {
      const customChords = this.getCustomChords();
      const filteredChords = customChords.filter(
        c => c.name.toLowerCase() !== chordName.toLowerCase()
      );
      localStorage.setItem(CUSTOM_CHORDS_KEY, JSON.stringify(filteredChords));
    } catch (error) {
      console.error('Failed to remove custom chord:', error);
    }
  }

  /**
   * Clear all custom chords
   */
  clearCustomChords(): void {
    try {
      localStorage.removeItem(CUSTOM_CHORDS_KEY);
    } catch (error) {
      console.warn('Failed to clear custom chords:', error);
    }
  }

  /**
   * Export settings and custom chords
   */
  exportData(): { settings: AutocompletionSettings; customChords: CustomChord[] } {
    return {
      settings: this.getSettings(),
      customChords: this.getCustomChords(),
    };
  }

  /**
   * Import settings and custom chords
   */
  importData(data: { settings?: Partial<AutocompletionSettings>; customChords?: CustomChord[] }): void {
    try {
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      if (data.customChords) {
        localStorage.setItem(CUSTOM_CHORDS_KEY, JSON.stringify(data.customChords));
      }
    } catch (error) {
      console.error('Failed to import data:', error);
    }
  }
}

// Export singleton instance
export const autocompletionSettingsService = new AutocompletionSettingsService();