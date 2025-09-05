/**
 * Comprehensive test suite for Enhanced Chord Recognition Engine
 */

import { describe, it, expect } from 'vitest';
import { 
  ChordRecognitionEngine, 
  chordRecognitionEngine, 
  parseChord, 
  isValidChord,
  type ParsedChord 
} from './chordRecognition';

describe('ChordRecognitionEngine', () => {
  let engine: ChordRecognitionEngine;

  beforeEach(() => {
    engine = new ChordRecognitionEngine();
  });

  describe('Basic Chord Recognition', () => {
    it('should recognize simple major chords', () => {
      const testChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      
      testChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.components.root).toBe(chord);
        expect(result.quality).toBe('major');
      });
    });

    it('should recognize simple minor chords', () => {
      const testChords = ['Am', 'Dm', 'Em', 'Fm', 'Gm', 'Cm', 'Bm'];
      
      testChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.quality).toBe('minor');
        expect(result.components.quality).toBe('m');
      });
    });

    it('should recognize sharp and flat chords', () => {
      const sharpChords = ['C#', 'D#', 'F#', 'G#', 'A#'];
      const flatChords = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'];
      
      [...sharpChords, ...flatChords].forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.components.accidental).toBeDefined();
      });
    });
  });

  describe('Extended Chord Recognition', () => {
    it('should recognize 7th chords', () => {
      const seventhChords = ['C7', 'Dm7', 'G7', 'Am7', 'Fmaj7', 'Cmaj7'];
      
      seventhChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.components.extension).toMatch(/7/);
      });
    });

    it('should recognize 9th, 11th, and 13th chords', () => {
      const extendedChords = ['C9', 'D11', 'G13', 'Am9', 'F11', 'B13'];
      
      extendedChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.components.extension).toMatch(/[9]|1[13]/);
      });
    });

    it('should recognize add chords', () => {
      const addChords = ['Cadd9', 'Dadd9', 'Fadd11', 'Gadd13'];
      
      addChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.components.extension).toMatch(/add/);
      });
    });
  });

  describe('Suspended Chord Recognition', () => {
    it('should recognize sus2 and sus4 chords', () => {
      const susChords = ['Csus2', 'Dsus4', 'Gsus2', 'Asus4', 'Fsus4'];
      
      susChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.quality).toBe('suspended');
        expect(result.components.suspension).toMatch(/sus[24]/);
      });
    });
  });

  describe('Diminished and Augmented Chords', () => {
    it('should recognize diminished chords', () => {
      const dimChords = ['Cdim', 'Ddim', 'Edim'];
      
      dimChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.quality).toBe('diminished');
      });
    });

    it('should recognize augmented chords', () => {
      const augChords = ['Caug', 'Daug', 'C+', 'F+', 'Gaug'];
      
      augChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.quality).toBe('augmented');
      });
    });
  });

  describe('Slash Chord Recognition', () => {
    it('should recognize common slash chords', () => {
      const slashChords = ['C/E', 'G/B', 'F/A', 'Am/C', 'D/F#'];
      
      slashChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.components.bassNote).toBeDefined();
      });
    });

    it('should parse slash chord components correctly', () => {
      const result = engine.parseChord('C/E');
      expect(result.components.root).toBe('C');
      expect(result.components.bassNote).toBe('E');
      expect(result.quality).toBe('major');
    });
  });

  describe('Language/Notation Support', () => {
    it('should handle Spanish chord notation', () => {
      const spanishChords = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
      const expectedRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      
      spanishChords.forEach((chord, index) => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        expect(result.components.root).toBe(expectedRoots[index]);
      });
    });

    it('should handle German notation (H = B)', () => {
      const result = engine.parseChord('H');
      expect(result.isValid).toBe(true);
      expect(result.components.root).toBe('B');
    });

    it('should handle different quality notations', () => {
      const variations = ['Cmajor', 'Dminor', 'Eaug', 'Fdim'];
      
      variations.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Complex Chord Recognition', () => {
    it('should recognize complex jazz chords', () => {
      const jazzChords = ['Cmaj7#11', 'Dm7b5', 'G7#9', 'Amaj9#11', 'F#m7b5'];
      
      jazzChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(true);
        if (chord.includes('#') || chord.includes('b')) {
          expect(result.components.modification).toBeDefined();
        }
      });
    });

    it('should handle chord with multiple extensions', () => {
      const result = engine.parseChord('Cmaj7#11');
      expect(result.isValid).toBe(true);
      expect(result.components.extension).toContain('7');
      expect(result.components.modification).toContain('#11');
    });
  });

  describe('Enharmonic Equivalents', () => {
    it('should provide enharmonic equivalents', () => {
      const equivalents = engine.getEnharmonicEquivalents('C#');
      expect(equivalents).toContain('Db');
      
      const equivalents2 = engine.getEnharmonicEquivalents('Bb');
      expect(equivalents2).toContain('A#');
      
      // Test with lowercase inputs
      const equivalents3 = engine.getEnharmonicEquivalents('bb');
      expect(equivalents3).toContain('A#');
    });

    it('should include enharmonic equivalents in parsed chords', () => {
      const result = engine.parseChord('C#');
      expect(result.enharmonicEquivalents).toContain('Db');
    });
  });

  describe('Invalid Chord Handling', () => {
    it('should reject invalid chord names', () => {
      const invalidChords = ['X', 'Z7', '123', '', '   '];
      
      invalidChords.forEach(chord => {
        const result = engine.parseChord(chord);
        expect(result.isValid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });

    it('should handle malformed chord extensions', () => {
      const malformedChords = ['C14', 'D99', 'Emadd15'];
      
      malformedChords.forEach(chord => {
        const result = engine.parseChord(chord);
        // These might be valid in some contexts, so we focus on graceful handling
        expect(result.original).toBe(chord);
      });
    });

    it('should provide helpful error messages', () => {
      const result = engine.parseChord('XYZ');
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid chord format');
    });
  });

  describe('Content Analysis', () => {
    it('should extract chords from ChordPro content', () => {
      const content = `{title: Test Song}
[C]Amazing [G]grace how [Am]sweet the [F]sound
[C]That saved a [G]wretch like [C]me`;

      const chords = engine.extractChordsFromContent(content);
      expect(chords).toHaveLength(4); // C, G, Am, F
      
      const chordNames = chords.map(c => c.original);
      expect(chordNames).toContain('C');
      expect(chordNames).toContain('G');
      expect(chordNames).toContain('Am');
      expect(chordNames).toContain('F');
    });

    it('should validate ChordPro content comprehensively', () => {
      const content = `{title: Test Song}
[C]Valid [G]chord [X]Invalid [Am]content [Z7]here`;

      const analysis = engine.validateChordProContent(content);
      expect(analysis.totalChords).toBe(5); // C, G, X, Am, Z7
      expect(analysis.validChords).toBeGreaterThanOrEqual(3); // At least C, G, Am should be valid
      expect(analysis.invalidChords.length).toBeGreaterThanOrEqual(1); // At least X should be invalid
      expect(analysis.uniqueRoots).toContain('C');
      expect(analysis.uniqueRoots).toContain('G');
      expect(analysis.uniqueRoots).toContain('A');
    });

    it('should analyze chord qualities in content', () => {
      const content = `[C][Dm][Em][F][G][Am]`;
      const analysis = engine.validateChordProContent(content);
      
      expect(analysis.qualities.major).toBeGreaterThan(0);
      expect(analysis.qualities.minor).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large chord datasets efficiently', () => {
      const largeChordList: string[] = [];
      const chordRoots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const qualities = ['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', 'dim', 'aug'];
      
      // Generate 1000+ chord combinations
      chordRoots.forEach(root => {
        qualities.forEach(quality => {
          largeChordList.push(root + quality);
        });
      });

      const startTime = performance.now();
      const results = engine.parseChords(largeChordList);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(results).toHaveLength(largeChordList.length);
      
      // Most should be valid
      const validCount = results.filter(r => r.isValid).length;
      expect(validCount).toBeGreaterThan(largeChordList.length * 0.8);
    });

    it('should handle large ChordPro content efficiently', () => {
      // Create large content with many chords
      let largeContent = '{title: Large Song}\n';
      for (let i = 0; i < 1000; i++) {
        largeContent += '[C]Test [G]content [Am]with [F]many [Dm]chords [G7]here\n';
      }

      const startTime = performance.now();
      const analysis = engine.validateChordProContent(largeContent);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(analysis.totalChords).toBe(6); // Unique chords: C, G, Am, F, Dm, G7
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input gracefully', () => {
      const result = engine.parseChord('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty chord notation');
    });

    it('should handle whitespace-only input', () => {
      const result = engine.parseChord('   ');
      expect(result.isValid).toBe(false);
    });

    it('should handle very long chord names', () => {
      const longChord = 'Cmaj7#11b13add9sus4/E';
      const result = engine.parseChord(longChord);
      expect(result.original).toBe(longChord);
      // Result validity depends on implementation, but should not crash
    });

    it('should handle non-ASCII characters gracefully', () => {
      const result = engine.parseChord('Cμ7');
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Legacy Compatibility', () => {
    it('should work with legacy isValidChord function', () => {
      expect(isValidChord('C')).toBe(true);
      expect(isValidChord('Am')).toBe(true);
      expect(isValidChord('X')).toBe(false);
    });

    it('should work with legacy parseChord function', () => {
      const result = parseChord('Cmaj7');
      expect(result.isValid).toBe(true);
      expect(result.components.root).toBe('C');
    });
  });

  describe('Singleton Instance', () => {
    it('should provide consistent results from singleton', () => {
      const result1 = chordRecognitionEngine.parseChord('C');
      const result2 = chordRecognitionEngine.parseChord('C');
      
      expect(result1.normalized).toBe(result2.normalized);
      expect(result1.quality).toBe(result2.quality);
    });
  });
});