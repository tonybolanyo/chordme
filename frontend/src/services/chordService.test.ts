import { describe, it, expect } from 'vitest';
import {
  isValidChord,
  getChordSuggestions,
  detectChordInput,
  transposeChord,
  transposeChordProContent,
  transposeChordWithKey,
  transposeChordIntelligent,
  convertNotation,
} from './chordService';

describe('ChordService', () => {
  describe('isValidChord', () => {
    it('validates basic major chords', () => {
      expect(isValidChord('C')).toBe(true);
      expect(isValidChord('G')).toBe(true);
      expect(isValidChord('F')).toBe(true);
    });

    it('validates minor chords', () => {
      expect(isValidChord('Am')).toBe(true);
      expect(isValidChord('Dm')).toBe(true);
      expect(isValidChord('Em')).toBe(true);
    });

    it('validates complex chords', () => {
      expect(isValidChord('F#m7')).toBe(true);
      expect(isValidChord('Gsus4')).toBe(true);
      expect(isValidChord('Cmaj7')).toBe(true);
      expect(isValidChord('C/E')).toBe(true);
    });

    it('rejects invalid chords', () => {
      expect(isValidChord('')).toBe(false);
      expect(isValidChord('H')).toBe(false);
      expect(isValidChord('invalid')).toBe(false);
      expect(isValidChord('c')).toBe(false); // lowercase
    });

    it('handles whitespace', () => {
      expect(isValidChord('  C  ')).toBe(true);
      expect(isValidChord('  ')).toBe(false);
    });
  });

  describe('getChordSuggestions', () => {
    it('returns exact matches with highest score', () => {
      const suggestions = getChordSuggestions('C');
      expect(suggestions.length).toBeGreaterThan(0);

      const exactMatch = suggestions.find((s) => s.chord === 'C');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.score).toBe(100);
    });

    it('returns prefix matches', () => {
      const suggestions = getChordSuggestions('Am');
      expect(suggestions.length).toBeGreaterThan(0);

      const prefixMatches = suggestions.filter((s) => s.chord.startsWith('Am'));
      expect(prefixMatches.length).toBeGreaterThan(1);
      expect(prefixMatches.some((s) => s.chord === 'Am')).toBe(true);
      expect(prefixMatches.some((s) => s.chord === 'Am7')).toBe(true);
    });

    it('limits suggestions to maxSuggestions', () => {
      const suggestions = getChordSuggestions('C', 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('returns empty array for empty input', () => {
      const suggestions = getChordSuggestions('');
      expect(suggestions).toEqual([]);
    });

    it('sorts suggestions by relevance score', () => {
      const suggestions = getChordSuggestions('C');

      // Scores should be in descending order
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].score).toBeLessThanOrEqual(
          suggestions[i - 1].score
        );
      }
    });

    it('marks all returned chords as valid', () => {
      const suggestions = getChordSuggestions('G');
      suggestions.forEach((suggestion) => {
        expect(suggestion.isValid).toBe(true);
      });
    });
  });

  describe('detectChordInput', () => {
    it('detects cursor inside complete chord brackets', () => {
      const text = 'Some lyrics [Am] more lyrics';
      const result = detectChordInput(text, 15); // Inside [Am]

      expect(result.isInChord).toBe(true);
      expect(result.chordText).toBe('Am');
      expect(result.chordStart).toBe(13);
      expect(result.chordEnd).toBe(15);
    });

    it('detects cursor in incomplete chord', () => {
      const text = 'Some lyrics [Am';
      const result = detectChordInput(text, 15); // At end of incomplete chord

      expect(result.isInChord).toBe(true);
      expect(result.chordText).toBe('Am');
      expect(result.chordStart).toBe(13);
    });

    it('detects cursor in partial chord input', () => {
      const text = 'Some lyrics [A';
      const result = detectChordInput(text, 14); // After 'A'

      expect(result.isInChord).toBe(true);
      expect(result.chordText).toBe('A');
      expect(result.chordStart).toBe(13);
    });

    it('returns false when cursor is not in chord', () => {
      const text = 'Some lyrics [Am] more lyrics';

      // Before opening bracket
      let result = detectChordInput(text, 10);
      expect(result.isInChord).toBe(false);

      // After closing bracket
      result = detectChordInput(text, 18);
      expect(result.isInChord).toBe(false);
    });

    it('handles cursor at beginning of text', () => {
      const text = '[Am] lyrics';
      const result = detectChordInput(text, 0);
      expect(result.isInChord).toBe(false);
    });

    it('handles cursor at end of text', () => {
      const text = 'lyrics [Am]';
      const result = detectChordInput(text, text.length);
      expect(result.isInChord).toBe(false);
    });

    it('handles multiple chord brackets correctly', () => {
      const text = '[C] lyrics [Am] more [G] end';

      // Inside first chord
      let result = detectChordInput(text, 1);
      expect(result.isInChord).toBe(true);
      expect(result.chordText).toBe('C');

      // Inside second chord
      result = detectChordInput(text, 13);
      expect(result.isInChord).toBe(true);
      expect(result.chordText).toBe('Am');

      // Between chords
      result = detectChordInput(text, 8);
      expect(result.isInChord).toBe(false);
    });

    it('handles edge cases with cursor position', () => {
      const text = '[Am]';

      // Invalid cursor positions
      expect(detectChordInput(text, -1).isInChord).toBe(false);
      expect(detectChordInput(text, 10).isInChord).toBe(false);
    });
  });

  describe('transposeChord', () => {
    it('transposes basic major chords up', () => {
      expect(transposeChord('C', 1)).toBe('C#');
      expect(transposeChord('C', 2)).toBe('D');
      expect(transposeChord('C', 12)).toBe('C'); // Full octave
    });

    it('transposes basic major chords down', () => {
      expect(transposeChord('C', -1)).toBe('B');
      expect(transposeChord('C', -2)).toBe('A#');
      expect(transposeChord('C', -12)).toBe('C'); // Full octave down
    });

    it('transposes minor chords', () => {
      expect(transposeChord('Am', 2)).toBe('Bm');
      expect(transposeChord('Dm', 3)).toBe('Fm');
      expect(transposeChord('Em', -1)).toBe('D#m');
    });

    it('transposes complex chords', () => {
      expect(transposeChord('Cmaj7', 2)).toBe('Dmaj7');
      expect(transposeChord('Gsus4', 1)).toBe('G#sus4');
      expect(transposeChord('F#m7', 3)).toBe('Am7');
    });

    it('handles flat notes (converts to sharps)', () => {
      expect(transposeChord('Bb', 1)).toBe('B');
      expect(transposeChord('Db', 2)).toBe('D#');
      expect(transposeChord('Eb', -1)).toBe('D');
    });

    it('handles slash chords', () => {
      expect(transposeChord('C/E', 2)).toBe('D/F#');
      expect(transposeChord('G/B', 1)).toBe('G#/C');
    });

    it('returns unchanged for invalid chords', () => {
      expect(transposeChord('', 2)).toBe('');
      expect(transposeChord('invalid', 2)).toBe('invalid');
      expect(transposeChord('H', 2)).toBe('H'); // Invalid note
    });

    it('handles zero transposition', () => {
      expect(transposeChord('C', 0)).toBe('C');
      expect(transposeChord('Am7', 0)).toBe('Am7');
    });
  });

  describe('transposeChordProContent', () => {
    it('transposes all chords in ChordPro content', () => {
      const content = '[C]Hello [G]world [Am]test';
      const result = transposeChordProContent(content, 2);
      expect(result).toBe('[D]Hello [A]world [Bm]test');
    });

    it('preserves lyrics and other content', () => {
      const content = `{title: Test Song}
# Verse 1
[C]Amazing [G]grace
Some lyrics without chords
{chorus}`;

      const result = transposeChordProContent(content, 1);
      expect(result).toContain('{title: Test Song}');
      expect(result).toContain('# Verse 1');
      expect(result).toContain('[C#]Amazing [G#]grace');
      expect(result).toContain('Some lyrics without chords');
      expect(result).toContain('{chorus}');
    });

    it('handles complex chord progressions', () => {
      const content =
        '[Cmaj7]Test [F#m7]progression [Bb]with [G/B]various chords';
      const result = transposeChordProContent(content, 3);
      expect(result).toBe(
        '[D#maj7]Test [Am7]progression [C#]with [A#/D]various chords'
      );
    });

    it('returns unchanged for zero transposition', () => {
      const content = '[C]Test [G]content';
      const result = transposeChordProContent(content, 0);
      expect(result).toBe(content);
    });

    it('returns unchanged for empty content', () => {
      expect(transposeChordProContent('', 2)).toBe('');
      expect(transposeChordProContent('No chords here', 2)).toBe(
        'No chords here'
      );
    });

    it('handles negative transposition', () => {
      const content = '[C]Hello [G]world';
      const result = transposeChordProContent(content, -1);
      expect(result).toBe('[B]Hello [F#]world');
    });
  });

  describe('Enhanced Transposition with Key Signature', () => {
    it('uses sharp preference for sharp keys', () => {
      expect(transposeChordWithKey('C', 1, 'G')).toBe('C#'); // G major (1 sharp)
      expect(transposeChordWithKey('F', 1, 'D')).toBe('F#'); // D major (2 sharps)
    });

    it('uses flat preference for flat keys', () => {
      expect(transposeChordWithKey('C', 1, 'F')).toBe('Db'); // F major (1 flat) 
      expect(transposeChordWithKey('A', 1, 'Bb')).toBe('Bb'); // Bb major (2 flats)
    });

    it('handles minor keys correctly', () => {
      expect(transposeChordWithKey('C', 1, 'Em')).toBe('C#'); // E minor (1 sharp)
      expect(transposeChordWithKey('C', 1, 'Dm')).toBe('Db'); // D minor (1 flat)
    });

    it('maintains slash chord relationships', () => {
      expect(transposeChordWithKey('C/E', 2, 'G')).toBe('D/F#');
      expect(transposeChordWithKey('F/A', -1, 'F')).toBe('E/Ab');
    });

    it('handles complex chords with key signature', () => {
      expect(transposeChordWithKey('Cmaj7', 1, 'F')).toBe('Dbmaj7');
      expect(transposeChordWithKey('Am7', 3, 'Bb')).toBe('Cm7');
    });
  });

  describe('Intelligent Transposition', () => {
    it('preserves enharmonics when requested', () => {
      const options = { preserveEnharmonics: true };
      expect(transposeChordIntelligent('Bb', 1, options)).toBe('B');
      expect(transposeChordIntelligent('C#', 1, options)).toBe('D');
    });

    it('respects preferred accidentals', () => {
      expect(transposeChordIntelligent('C', 1, { preferredAccidentals: 'flats' })).toBe('Db');
      expect(transposeChordIntelligent('C', 1, { preferredAccidentals: 'sharps' })).toBe('C#');
    });

    it('handles notation system conversion', () => {
      expect(transposeChordIntelligent('C', 2, { notationSystem: 'latin' })).toBe('Re');
      expect(transposeChordIntelligent('F', -1, { notationSystem: 'latin' })).toBe('Mi');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles large semitone values correctly', () => {
      expect(transposeChord('C', 15)).toBe('D#'); // 15 % 12 = 3 semitones
      expect(transposeChord('C', -15)).toBe('A'); // -15 + 24 = 9 semitones
    });

    it('handles invalid key signatures gracefully', () => {
      expect(transposeChordWithKey('C', 1, 'InvalidKey')).toBe('C#');
      expect(transposeChordWithKey('C', 1, '')).toBe('C#');
    });

    it('preserves chord extensions and alterations', () => {
      expect(transposeChord('Cmaj7', 2)).toBe('Dmaj7');
      expect(transposeChord('Fm7', -1)).toBe('Em7');
      expect(transposeChord('Gsus4', 4)).toBe('Bsus4');
    });

    it('handles multiple slash chords correctly', () => {
      const content = '[C/E] and [G/B] chords';
      const result = transposeChordProContent(content, 2);
      expect(result).toBe('[D/F#] and [A/C#] chords');
    });
  });
});
