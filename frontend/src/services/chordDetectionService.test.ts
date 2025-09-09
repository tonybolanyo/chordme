/**
 * Tests for Chord Detection Service
 */

import { describe, it, expect } from 'vitest';
import {
  detectChordsInContent,
  getChordAtCursor,
  getChordsInRange,
  useChordDetection,
} from './chordDetectionService';

describe('Chord Detection Service', () => {
  describe('detectChordsInContent', () => {
    it('should detect simple chords in basic content', () => {
      const content = '[C] This is a test [G] with some chords [Am]';
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(3);
      expect(result.uniqueChordCount).toBe(3);
      expect(result.uniqueChords).toEqual(['Am', 'C', 'G']);
      expect(result.chords).toHaveLength(3);
      
      // Check first chord
      expect(result.chords[0].chord).toBe('C');
      expect(result.chords[0].start).toBe(0);
      expect(result.chords[0].end).toBe(3);
      expect(result.chords[0].line).toBe(0);
      expect(result.chords[0].column).toBe(0);
    });

    it('should handle multiline content correctly', () => {
      const content = `[C] First line with chord
[G] Second line [Am] multiple chords
Third line [F] last chord`;
      
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(4);
      expect(result.uniqueChords).toEqual(['Am', 'C', 'F', 'G']);
      
      // Check line numbers are correct
      expect(result.chords[0].line).toBe(0); // [C]
      expect(result.chords[1].line).toBe(1); // [G]
      expect(result.chords[2].line).toBe(1); // [Am]
      expect(result.chords[3].line).toBe(2); // [F]
    });

    it('should handle complex chord names', () => {
      const content = '[Cmaj7] [F#dim] [Bb/D] [Am7add9]';
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(4);
      expect(result.chords.map(c => c.chord)).toEqual([
        'Cmaj7', 'F#dim', 'Bb/D', 'Am7add9'
      ]);
    });

    it('should handle empty content', () => {
      const result = detectChordsInContent('');
      
      expect(result.chordCount).toBe(0);
      expect(result.uniqueChordCount).toBe(0);
      expect(result.chords).toHaveLength(0);
      expect(result.uniqueChords).toHaveLength(0);
    });

    it('should handle content with no chords', () => {
      const content = 'This is just lyrics without any chords';
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(0);
      expect(result.uniqueChordCount).toBe(0);
    });

    it('should handle malformed brackets gracefully', () => {
      const content = '[C] normal chord [ incomplete [G] another normal]';
      const result = detectChordsInContent(content);

      // Should find complete bracket pairs only: [C] and [G] 
      // The "[ incomplete" part doesn't have a matching closing bracket until [G]
      expect(result.chordCount).toBe(2); // [C] and [G]
      expect(result.chords.map(c => c.chord)).toEqual(['C', 'G']);
    });

    it('should detect duplicate chords but count them separately', () => {
      const content = '[C] first [G] middle [C] duplicate';
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(3); // 3 total chords
      expect(result.uniqueChordCount).toBe(2); // 2 unique chords
      expect(result.uniqueChords).toEqual(['C', 'G']);
    });

    it('should validate chord names correctly', () => {
      const content = '[C] [InvalidChord] [G] [NotAChord123]';
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(4); // All detected
      expect(result.chords[0].isValid).toBe(true); // C
      expect(result.chords[1].isValid).toBe(false); // InvalidChord
      expect(result.chords[2].isValid).toBe(true); // G
      expect(result.chords[3].isValid).toBe(false); // NotAChord123
    });
  });

  describe('getChordAtCursor', () => {
    const content = '[C] This is a test [G] with chords [Am] end';

    it('should find chord at cursor position', () => {
      // Cursor at position 1 (inside [C])
      const result = getChordAtCursor(content, 1);
      
      expect(result.chord).toBeDefined();
      expect(result.chord?.chord).toBe('C');
      expect(result.chord?.start).toBe(0);
      expect(result.chord?.end).toBe(3);
    });

    it('should return undefined when cursor is not on a chord', () => {
      // Cursor at position 10 (in the lyrics)
      const result = getChordAtCursor(content, 10);
      
      expect(result.chord).toBeUndefined();
    });

    it('should find nearby chords', () => {
      // Cursor at position 10 (between chords)
      const result = getChordAtCursor(content, 10);
      
      expect(result.nearbyChords).toHaveLength(3);
      // Should be sorted by distance
      expect(result.nearbyChords[0].chord).toBe('C'); // Closest
    });

    it('should generate chord suggestions', () => {
      const result = getChordAtCursor(content, 1); // On [C] chord
      
      expect(result.suggestedChords).toContain('F');
      expect(result.suggestedChords).toContain('G');
      expect(result.suggestedChords.length).toBeGreaterThan(0);
    });

    it('should handle cursor at end of content', () => {
      const result = getChordAtCursor(content, content.length);
      
      expect(result.chord).toBeUndefined();
      expect(result.nearbyChords.length).toBeGreaterThan(0);
    });
  });

  describe('getChordsInRange', () => {
    const content = `[C] Line 0
[G] Line 1
[Am] Line 2
[F] Line 3`;

    it('should get chords in specified line range', () => {
      const result = getChordsInRange(content, 1, 2);
      
      expect(result).toHaveLength(2);
      expect(result.map(c => c.chord)).toEqual(['G', 'Am']);
      expect(result[0].line).toBe(1);
      expect(result[1].line).toBe(2);
    });

    it('should handle single line range', () => {
      const result = getChordsInRange(content, 1, 1);
      
      expect(result).toHaveLength(1);
      expect(result[0].chord).toBe('G');
    });

    it('should handle out of bounds ranges', () => {
      const result = getChordsInRange(content, 10, 20);
      
      expect(result).toHaveLength(0);
    });

    it('should handle range that includes all lines', () => {
      const result = getChordsInRange(content, 0, 10);
      
      expect(result).toHaveLength(4);
    });
  });

  describe('useChordDetection', () => {
    it('should provide comprehensive chord analysis', () => {
      const content = '[C] This is [G] a test [Am]';
      const result = useChordDetection(content, 1); // Cursor on [C]

      expect(result.chords).toHaveLength(3);
      expect(result.uniqueChords).toEqual(['Am', 'C', 'G']);
      expect(result.chordCount).toBe(3);
      expect(result.uniqueChordCount).toBe(3);
      expect(result.chordAtCursor?.chord).toBe('C');
      expect(result.nearbyChords).toHaveLength(2);
      expect(result.suggestedChords.length).toBeGreaterThan(0);
    });

    it('should work without cursor position', () => {
      const content = '[C] This is [G] a test';
      const result = useChordDetection(content);

      expect(result.chords).toHaveLength(2);
      expect(result.chordAtCursor).toBeUndefined();
      expect(result.nearbyChords).toHaveLength(0);
    });

    it('should provide utility functions', () => {
      const content = `[C] Line 0
[G] Line 1`;
      const result = useChordDetection(content);

      expect(typeof result.getChordsInRange).toBe('function');
      expect(typeof result.getChordAtPosition).toBe('function');
      
      const rangeChords = result.getChordsInRange(0, 0);
      expect(rangeChords).toHaveLength(1);
      expect(rangeChords[0].chord).toBe('C');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very long content efficiently', () => {
      // Generate large content with many chords
      const chords = ['C', 'G', 'Am', 'F'];
      const lines = Array.from({ length: 1000 }, (_, i) => 
        `[${chords[i % chords.length]}] Line ${i} with some lyrics here`
      );
      const content = lines.join('\n');

      const start = performance.now();
      const result = detectChordsInContent(content);
      const end = performance.now();

      expect(result.chordCount).toBe(1000);
      expect(result.uniqueChordCount).toBe(4);
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle special characters in content', () => {
      const content = '[C] Special chars: åäö ñç üß [G] emojis: 🎸🎵 [Am]';
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(3);
      expect(result.chords.map(c => c.chord)).toEqual(['C', 'G', 'Am']);
    });

    it('should handle mixed line endings', () => {
      const content = '[C] Unix line\n[G] Windows line\r\n[Am] Mac line\r[F] End';
      const result = detectChordsInContent(content);

      expect(result.chordCount).toBe(4);
      expect(result.chords.every(c => c.line >= 0)).toBe(true);
    });
  });
});