import { describe, it, expect } from 'vitest';
import {
  isValidChord,
  getChordSuggestions,
  detectChordInput,
  transposeChord,
  transposeChordProContent,
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
      
      const exactMatch = suggestions.find(s => s.chord === 'C');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.score).toBe(100);
    });

    it('returns prefix matches', () => {
      const suggestions = getChordSuggestions('Am');
      expect(suggestions.length).toBeGreaterThan(0);
      
      const prefixMatches = suggestions.filter(s => s.chord.startsWith('Am'));
      expect(prefixMatches.length).toBeGreaterThan(1);
      expect(prefixMatches.some(s => s.chord === 'Am')).toBe(true);
      expect(prefixMatches.some(s => s.chord === 'Am7')).toBe(true);
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
        expect(suggestions[i].score).toBeLessThanOrEqual(suggestions[i - 1].score);
      }
    });

    it('marks all returned chords as valid', () => {
      const suggestions = getChordSuggestions('G');
      suggestions.forEach(suggestion => {
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
      expect(transposeChord('C/E', 2)).toBe('D/E');
      expect(transposeChord('G/B', 1)).toBe('G#/B');
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
      const content = '[Cmaj7]Test [F#m7]progression [Bb]with [G/B]various chords';
      const result = transposeChordProContent(content, 3);
      expect(result).toBe('[D#maj7]Test [Am7]progression [C#]with [A#/B]various chords');
    });

    it('returns unchanged for zero transposition', () => {
      const content = '[C]Test [G]content';
      const result = transposeChordProContent(content, 0);
      expect(result).toBe(content);
    });

    it('returns unchanged for empty content', () => {
      expect(transposeChordProContent('', 2)).toBe('');
      expect(transposeChordProContent('No chords here', 2)).toBe('No chords here');
    });

    it('handles negative transposition', () => {
      const content = '[C]Hello [G]world';
      const result = transposeChordProContent(content, -1);
      expect(result).toBe('[B]Hello [F#]world');
    });
  });
});