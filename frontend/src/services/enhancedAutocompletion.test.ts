import { describe, it, expect } from 'vitest';
import {
  getDirectiveSuggestions,
  getEnhancedChordSuggestions,
  getContextAwareChordSuggestions,
  detectDirectiveInput,
  detectInputContext,
  DirectiveSuggestion,
} from './chordService';
import { autocompletionSettingsService, CustomChord } from './autocompletionSettings';

describe('Enhanced ChordPro Autocompletion', () => {
  describe('Expanded Chord Dictionary', () => {
    it('returns many more chord suggestions than before', () => {
      const suggestions = getEnhancedChordSuggestions('C', [], 100);
      // Should have significantly more than the original ~10-15 C-based chords
      expect(suggestions.length).toBeGreaterThan(20);
      
      // Should include various C chord types
      const chordNames = suggestions.map(s => s.chord);
      expect(chordNames).toContain('C');
      expect(chordNames).toContain('Cmaj7');
      expect(chordNames).toContain('C7');
      expect(chordNames).toContain('Csus4');
      expect(chordNames).toContain('Cadd9');
      expect(chordNames).toContain('C5');
    });

    it('includes sharp and flat variations', () => {
      const sharpSuggestions = getEnhancedChordSuggestions('C#', [], 50);
      const flatSuggestions = getEnhancedChordSuggestions('Db', [], 50);
      
      expect(sharpSuggestions.length).toBeGreaterThan(5);
      expect(flatSuggestions.length).toBeGreaterThan(5);
      
      const sharpNames = sharpSuggestions.map(s => s.chord);
      const flatNames = flatSuggestions.map(s => s.chord);
      
      expect(sharpNames).toContain('C#');
      expect(sharpNames).toContain('C#m');
      expect(flatNames).toContain('Db');
      expect(flatNames).toContain('Dbm');
    });

    it('supports jazz and extended chords', () => {
      const suggestions = getEnhancedChordSuggestions('C', [], 100);
      const chordNames = suggestions.map(s => s.chord);
      
      // Jazz extensions
      expect(chordNames).toContain('C9');
      expect(chordNames).toContain('C11');
      expect(chordNames).toContain('C13');
      expect(chordNames).toContain('Cm7b5');
      expect(chordNames).toContain('Cm(maj7)');
    });
  });

  describe('ChordPro Directive Autocompletion', () => {
    it('provides directive suggestions for metadata', () => {
      const suggestions = getDirectiveSuggestions('title', 10);
      expect(suggestions.length).toBeGreaterThan(0);
      
      const titleSuggestion = suggestions.find(s => s.directive === '{title}');
      expect(titleSuggestion).toBeDefined();
      expect(titleSuggestion?.category).toBe('metadata');
      expect(titleSuggestion?.description).toContain('title');
    });

    it('provides directive suggestions for verse structure', () => {
      const suggestions = getDirectiveSuggestions('start_of', 10);
      expect(suggestions.length).toBeGreaterThan(0);
      
      const chordNames = suggestions.map(s => s.directive);
      expect(chordNames).toContain('{start_of_chorus}');
      expect(chordNames).toContain('{start_of_verse}');
      expect(chordNames).toContain('{start_of_bridge}');
    });

    it('provides directive suggestions with fuzzy matching', () => {
      const suggestions = getDirectiveSuggestions('art', 10);
      expect(suggestions.length).toBeGreaterThan(0);
      
      const artistSuggestion = suggestions.find(s => s.directive === '{artist}');
      expect(artistSuggestion).toBeDefined();
    });

    it('scores exact matches highest', () => {
      const suggestions = getDirectiveSuggestions('title', 10);
      expect(suggestions[0].directive).toBe('{title}');
      expect(suggestions[0].score).toBe(100);
    });
  });

  describe('Directive Input Detection', () => {
    it('detects cursor inside directive braces', () => {
      const text = 'Some content {title: Song Name} more content';
      const result = detectDirectiveInput(text, 20); // Inside {title: Song Name}

      expect(result.isInDirective).toBe(true);
      expect(result.directiveText).toBe('title: Song Name');
      expect(result.directiveStart).toBe(14);
      expect(result.directiveEnd).toBe(30);
    });

    it('detects partial directive input', () => {
      const text = 'Some content {tit';
      const result = detectDirectiveInput(text, 17); // At end of {tit

      expect(result.isInDirective).toBe(true);
      expect(result.directiveText).toBe('tit');
      expect(result.directiveStart).toBe(14);
    });

    it('returns false when not in directive', () => {
      const text = 'Some content {title} more content';
      const result = detectDirectiveInput(text, 5); // Before opening brace

      expect(result.isInDirective).toBe(false);
    });
  });

  describe('Context-Aware Chord Suggestions', () => {
    it('boosts diatonic chords for major keys', () => {
      const suggestionsWithKey = getContextAwareChordSuggestions('D', 'C', 20);
      const suggestionsWithoutKey = getEnhancedChordSuggestions('D', [], 20);

      const dChordWithKey = suggestionsWithKey.find(s => s.chord === 'Dm');
      const dChordWithoutKey = suggestionsWithoutKey.find(s => s.chord === 'Dm');

      // Dm is diatonic to C major, so it should get a boost
      expect(dChordWithKey?.score).toBeGreaterThan(dChordWithoutKey?.score || 0);
    });

    it('provides context from key signature in content', () => {
      const text = '{key: G} Some lyrics [D] more lyrics';
      const result = detectInputContext(text, 22); // Inside [D] - position 22 is the 'D'

      expect(result.type).toBe('chord');
      expect(result.keySignature).toBe('G');
      expect(result.inputText).toBe('D');
    });
  });

  describe('Input Context Detection', () => {
    it('detects chord input context', () => {
      const text = 'Some lyrics [Am] more content';
      const result = detectInputContext(text, 15); // Inside [Am]

      expect(result.type).toBe('chord');
      expect(result.inputText).toBe('Am');
    });

    it('detects directive input context', () => {
      const text = 'Some content {title} more content';
      const result = detectInputContext(text, 18); // Inside {title}

      expect(result.type).toBe('directive');
      expect(result.inputText).toBe('title');
    });

    it('detects no input context', () => {
      const text = 'Just some regular text content';
      const result = detectInputContext(text, 15);

      expect(result.type).toBe('none');
    });
  });

  describe('Custom Chord Support', () => {
    it('includes custom chords in enhanced suggestions', () => {
      const customChords: CustomChord[] = [
        {
          name: 'Cmystery',
          definition: '3 0 2 0 1 0',
          description: 'Custom mystery chord',
          createdAt: new Date(),
        },
      ];

      const suggestions = getEnhancedChordSuggestions('Cmy', customChords, 10);
      expect(suggestions.length).toBeGreaterThan(0);

      const customSuggestion = suggestions.find(s => s.chord === 'Cmystery');
      expect(customSuggestion).toBeDefined();
      expect(customSuggestion?.isValid).toBe(true);
    });

    it('gives custom chords a slight score boost', () => {
      const customChords: CustomChord[] = [
        {
          name: 'C',
          definition: '3 3 2 0 1 0',
          description: 'Custom C chord',
          createdAt: new Date(),
        },
      ];

      const suggestions = getEnhancedChordSuggestions('C', customChords, 10);
      const customC = suggestions.filter(s => s.chord === 'C');
      
      // Should have both the built-in C and custom C, with custom getting boost
      expect(customC.length).toBeGreaterThan(0);
      expect(Math.max(...customC.map(c => c.score))).toBeGreaterThan(100);
    });
  });

  describe('Enhanced Fuzzy Matching', () => {
    it('matches with Levenshtein distance', () => {
      // Test fuzzy matching with slight typos
      const suggestions = getEnhancedChordSuggestions('Amj7', [], 10); // Should match Amaj7
      expect(suggestions.length).toBeGreaterThan(0);
      
      const amaj7 = suggestions.find(s => s.chord === 'Amaj7');
      expect(amaj7).toBeDefined();
      expect(amaj7?.score).toBeGreaterThan(0);
    });

    it('handles substring matches', () => {
      const suggestions = getEnhancedChordSuggestions('maj', [], 20);
      expect(suggestions.length).toBeGreaterThan(0);
      
      const majorChords = suggestions.filter(s => s.chord.includes('maj'));
      expect(majorChords.length).toBeGreaterThan(5);
    });

    it('prioritizes better matches', () => {
      const suggestions = getEnhancedChordSuggestions('Cm', [], 20);
      
      // Exact match should be first
      expect(suggestions[0].chord).toBe('Cm');
      expect(suggestions[0].score).toBe(100);
      
      // Prefix matches should come next
      const cmVariants = suggestions.filter(s => s.chord.startsWith('Cm'));
      expect(cmVariants.length).toBeGreaterThan(3);
    });
  });
});

describe('Autocompletion Settings Service', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('provides default settings when none are stored', () => {
    const settings = autocompletionSettingsService.getSettings();
    
    expect(settings.enabled).toBe(true);
    expect(settings.maxSuggestions).toBe(8);
    expect(settings.showDirectives).toBe(true);
    expect(settings.showChords).toBe(true);
    expect(settings.contextAware).toBe(true);
    expect(settings.customChords).toEqual([]);
  });

  it('saves and retrieves settings', () => {
    const newSettings = {
      enabled: false,
      maxSuggestions: 15,
      showDirectives: false,
    };

    autocompletionSettingsService.saveSettings(newSettings);
    const retrieved = autocompletionSettingsService.getSettings();

    expect(retrieved.enabled).toBe(false);
    expect(retrieved.maxSuggestions).toBe(15);
    expect(retrieved.showDirectives).toBe(false);
    // Other settings should remain default
    expect(retrieved.showChords).toBe(true);
    expect(retrieved.contextAware).toBe(true);
  });

  it('manages custom chords', () => {
    const customChord: Omit<CustomChord, 'createdAt'> = {
      name: 'Csus9',
      definition: '3 0 0 0 1 3',
      description: 'C suspended 9th',
      category: 'extended',
    };

    autocompletionSettingsService.addCustomChord(customChord);
    const chords = autocompletionSettingsService.getCustomChords();

    expect(chords.length).toBe(1);
    expect(chords[0].name).toBe('Csus9');
    expect(chords[0].createdAt).toBeInstanceOf(Date);
  });

  it('updates existing custom chords', () => {
    const chord1: Omit<CustomChord, 'createdAt'> = {
      name: 'Csus9',
      definition: '3 0 0 0 1 3',
      description: 'C suspended 9th',
    };

    const chord2: Omit<CustomChord, 'createdAt'> = {
      name: 'Csus9',
      definition: '3 0 2 0 1 3',
      description: 'Updated C suspended 9th',
    };

    autocompletionSettingsService.addCustomChord(chord1);
    autocompletionSettingsService.addCustomChord(chord2);
    
    const chords = autocompletionSettingsService.getCustomChords();
    expect(chords.length).toBe(1);
    expect(chords[0].definition).toBe('3 0 2 0 1 3');
    expect(chords[0].description).toBe('Updated C suspended 9th');
  });

  it('removes custom chords', () => {
    const customChord: Omit<CustomChord, 'createdAt'> = {
      name: 'Csus9',
      definition: '3 0 0 0 1 3',
      description: 'C suspended 9th',
    };

    autocompletionSettingsService.addCustomChord(customChord);
    expect(autocompletionSettingsService.getCustomChords().length).toBe(1);

    autocompletionSettingsService.removeCustomChord('Csus9');
    expect(autocompletionSettingsService.getCustomChords().length).toBe(0);
  });

  it('exports and imports data', () => {
    const customChord: Omit<CustomChord, 'createdAt'> = {
      name: 'Csus9',
      definition: '3 0 0 0 1 3',
      description: 'C suspended 9th',
    };

    autocompletionSettingsService.saveSettings({ enabled: false });
    autocompletionSettingsService.addCustomChord(customChord);

    const exported = autocompletionSettingsService.exportData();
    
    expect(exported.settings.enabled).toBe(false);
    expect(exported.customChords.length).toBe(1);
    expect(exported.customChords[0].name).toBe('Csus9');

    // Clear and import
    autocompletionSettingsService.resetSettings();
    autocompletionSettingsService.clearCustomChords();
    autocompletionSettingsService.importData(exported);

    const newSettings = autocompletionSettingsService.getSettings();
    const newChords = autocompletionSettingsService.getCustomChords();

    expect(newSettings.enabled).toBe(false);
    expect(newChords.length).toBe(1);
    expect(newChords[0].name).toBe('Csus9');
  });
});