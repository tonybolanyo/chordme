import { describe, it, expect } from 'vitest';
import {
  isValidChord,
  getChordSuggestions,
  detectChordInput,
  type ChordSuggestion
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
});