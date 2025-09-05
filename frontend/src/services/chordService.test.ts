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
  detectKeySignature,
  type KeyDetectionResult,
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

  describe('Automatic Key Detection', () => {
    describe('Manual Key Override', () => {
      it('returns manual key signature with full confidence', () => {
        const content = '{key: G} [C] [G] [Am] [D]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('G');
        expect(result.confidence).toBe(1.0);
        expect(result.isMinor).toBe(false);
        expect(result.alternativeKeys).toEqual([]);
      });

      it('detects minor keys from manual specification', () => {
        const content = '{key: Am} [Am] [F] [C] [G]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('Am');
        expect(result.confidence).toBe(1.0);
        expect(result.isMinor).toBe(true);
        expect(result.alternativeKeys).toEqual([]);
      });
    });

    describe('Major Key Detection', () => {
      it('detects C major from typical progression', () => {
        const content = '[C] [F] [G] [C] [Am] [F] [G] [C]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('C');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.isMinor).toBe(false);
      });

      it('detects G major from chord progression', () => {
        const content = '[G] [C] [D] [G] [Em] [C] [D] [G]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('G');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.isMinor).toBe(false);
      });

      it('detects F major with flat preferences', () => {
        const content = '[F] [Bb] [C] [F] [Dm] [Bb] [C] [F]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('F');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.isMinor).toBe(false);
      });
    });

    describe('Minor Key Detection', () => {
      it('detects A minor from typical progression', () => {
        const content = '[Am] [F] [C] [G] [Am] [F] [C] [G]';
        const result = detectKeySignature(content);
        
        expect(['Am', 'C']).toContain(result.detectedKey); // Am and C are related
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('detects E minor progression', () => {
        const content = '[Em] [Am] [B] [Em] [C] [Am] [B] [Em]';
        const result = detectKeySignature(content);
        
        expect(['Em', 'G']).toContain(result.detectedKey);
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('detects D minor with characteristic chords', () => {
        const content = '[Dm] [Gm] [A] [Dm] [Bb] [Gm] [A] [Dm]';
        const result = detectKeySignature(content);
        
        expect(['Dm', 'F']).toContain(result.detectedKey);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('Alternative Key Suggestions', () => {
      it('provides alternative key suggestions', () => {
        const content = '[C] [G] [Am] [F]'; // Common progression
        const result = detectKeySignature(content);
        
        expect(result.alternativeKeys).toBeDefined();
        expect(result.alternativeKeys.length).toBeGreaterThan(0);
        expect(result.alternativeKeys.length).toBeLessThanOrEqual(3);
        
        // Alternative keys should have lower confidence
        result.alternativeKeys.forEach(alt => {
          expect(alt.confidence).toBeLessThanOrEqual(result.confidence);
          expect(alt.confidence).toBeGreaterThan(0);
        });
      });

      it('includes relative major/minor in alternatives', () => {
        const content = '[C] [Am] [F] [G]';
        const result = detectKeySignature(content);
        
        const alternativeKeys = [result.detectedKey, ...result.alternativeKeys.map(k => k.key)];
        
        // Should include both C major and A minor as possibilities
        expect(alternativeKeys.some(k => k === 'C' || k === 'Am')).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('handles empty content gracefully', () => {
        const result = detectKeySignature('');
        
        expect(result.detectedKey).toBe('C');
        expect(result.confidence).toBe(0.0);
        expect(result.isMinor).toBe(false);
      });

      it('handles content with no chords', () => {
        const content = 'Just some lyrics without any chords';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('C');
        expect(result.confidence).toBe(0.0);
        expect(result.isMinor).toBe(false);
      });

      it('handles content with only invalid chords', () => {
        const content = '[invalid] [X] [notachord]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('C');
        expect(result.confidence).toBe(0.0);
        expect(result.isMinor).toBe(false);
      });

      it('handles mixed valid and invalid chords', () => {
        const content = '[C] [invalid] [G] [notachord] [Am]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    describe('Complex Progressions', () => {
      it('handles jazz progressions with extended chords', () => {
        const content = '[Cmaj7] [Am7] [Dm7] [G7] [Cmaj7]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('C');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.isMinor).toBe(false);
      });

      it('handles progressions with slash chords', () => {
        const content = '[C] [C/E] [F] [G/B] [Am] [F] [G] [C]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('C');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.isMinor).toBe(false);
      });

      it('handles chord progressions with chromatic passing chords', () => {
        const content = '[C] [F] [F#dim] [G] [C]';
        const result = detectKeySignature(content);
        
        expect(result.detectedKey).toBe('C');
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('Confidence Scoring', () => {
      it('gives higher confidence to clear key signatures', () => {
        const clearProgression = '[C] [F] [G] [C] [Am] [F] [G] [C]';
        const ambiguousProgression = '[C] [D] [E] [F]';
        
        const clearResult = detectKeySignature(clearProgression);
        const ambiguousResult = detectKeySignature(ambiguousProgression);
        
        expect(clearResult.confidence).toBeGreaterThan(ambiguousResult.confidence);
      });

      it('gives lower confidence to atonal progressions', () => {
        const atonalProgression = '[C] [F#] [Bb] [E]';
        const result = detectKeySignature(atonalProgression);
        
        expect(result.confidence).toBeLessThan(0.7);
      });

      it('considers chord frequency in confidence calculation', () => {
        const strongTonic = '[C] [C] [C] [F] [G] [C] [C] [C]';
        const weakTonic = '[C] [F] [G] [Am] [Dm] [Em]';
        
        const strongResult = detectKeySignature(strongTonic);
        const weakResult = detectKeySignature(weakTonic);
        
        expect(strongResult.confidence).toBeGreaterThan(weakResult.confidence);
      });
    });

    describe('Performance with Large Content', () => {
      it('handles large chord progressions efficiently', () => {
        const largeProgression = Array(100).fill('[C] [F] [G] [Am]').join(' ');
        
        const startTime = performance.now();
        const result = detectKeySignature(largeProgression);
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
        expect(result.detectedKey).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });
});
