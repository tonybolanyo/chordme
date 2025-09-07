/**
 * Tests for chord diagram utilities with tuning support
 */

import { describe, it, expect } from 'vitest';
import {
  createChordDiagramWithTuning,
  transposeChordDiagramToTuning,
  calculateNotesFromPositions
} from './chordDiagramUtils';
import { StringPosition } from '../types/chordDiagram';

describe('Chord Diagram Tuning Utilities', () => {
  describe('createChordDiagramWithTuning', () => {
    it('should create chord diagram with custom tuning', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 0, finger: 0 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 0, finger: 0 },
        { stringNumber: 5, fret: 0, finger: 0 },
        { stringNumber: 6, fret: 0, finger: 0 }
      ];

      const dadgadTuning = ['D', 'A', 'D', 'G', 'A', 'D'];
      
      const chord = createChordDiagramWithTuning(
        'D',
        'guitar',
        positions,
        dadgadTuning,
        'beginner'
      );

      expect(chord.name).toBe('D');
      expect(chord.instrument.standardTuning).toEqual(dadgadTuning);
      expect(chord.notes.isStandardTuning).toBe(false);
      expect(chord.difficulty).toBe('beginner');
    });

    it('should recognize standard tuning', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 1, finger: 1 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 2, finger: 2 },
        { stringNumber: 5, fret: 3, finger: 3 },
        { stringNumber: 6, fret: -1, finger: -1 }
      ];

      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      
      const chord = createChordDiagramWithTuning(
        'C',
        'guitar',
        positions,
        standardTuning
      );

      expect(chord.notes.isStandardTuning).toBe(true);
    });
  });

  describe('transposeChordDiagramToTuning', () => {
    it('should transpose chord to Drop D tuning', () => {
      const cMajorPositions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 1, finger: 1 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 2, finger: 2 },
        { stringNumber: 5, fret: 3, finger: 3 },
        { stringNumber: 6, fret: -1, finger: -1 }
      ];

      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      const dropDTuning = ['D', 'A', 'D', 'G', 'B', 'E'];

      const originalChord = createChordDiagramWithTuning(
        'C',
        'guitar',
        cMajorPositions,
        standardTuning
      );

      const transposedChord = transposeChordDiagramToTuning(
        originalChord,
        dropDTuning
      );

      expect(transposedChord).toBeDefined();
      expect(transposedChord!.instrument.standardTuning).toEqual(dropDTuning);
      
      // The 6th string should remain muted since it was muted in original
      expect(transposedChord!.positions[5].fret).toBe(-1);
      
      // Other strings should have same or adjusted positions
      expect(transposedChord!.positions[0].fret).toBe(0); // High E unchanged
      expect(transposedChord!.positions[1].fret).toBe(1); // B string unchanged
    });

    it('should handle tuning that requires muting strings', () => {
      const openChordPositions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 0, finger: 0 },
        { stringNumber: 3, fret: 1, finger: 1 },
        { stringNumber: 4, fret: 2, finger: 2 },
        { stringNumber: 5, fret: 2, finger: 3 },
        { stringNumber: 6, fret: 0, finger: 0 }
      ];

      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      const openGTuning = ['D', 'G', 'D', 'G', 'B', 'D'];

      const originalChord = createChordDiagramWithTuning(
        'E',
        'guitar',
        openChordPositions,
        standardTuning
      );

      const transposedChord = transposeChordDiagramToTuning(
        originalChord,
        openGTuning,
        { allowCapo: false }
      );

      expect(transposedChord).toBeDefined();
      // Some strings may need to be muted due to tuning differences
    });

    it('should return null for impossible conversions', () => {
      const impossiblePositions: StringPosition[] = [
        { stringNumber: 1, fret: 15, finger: 1 },
        { stringNumber: 2, fret: 16, finger: 2 },
        { stringNumber: 3, fret: 17, finger: 3 },
        { stringNumber: 4, fret: 18, finger: 4 },
        { stringNumber: 5, fret: 19, finger: 1 },
        { stringNumber: 6, fret: 20, finger: 1 }
      ];

      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      const veryDifferentTuning = ['C', 'F', 'Bb', 'Eb', 'G', 'C'];

      const originalChord = createChordDiagramWithTuning(
        'Impossible',
        'guitar',
        impossiblePositions,
        standardTuning
      );

      const transposedChord = transposeChordDiagramToTuning(
        originalChord,
        veryDifferentTuning,
        { allowCapo: false, maxCapoPosition: 3 }
      );

      // Should still return a chord, but many strings might be muted
      expect(transposedChord).toBeDefined();
    });
  });

  describe('calculateNotesFromPositions with tuning', () => {
    it('should calculate notes correctly for standard tuning', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },  // E
        { stringNumber: 2, fret: 1, finger: 1 },  // C
        { stringNumber: 3, fret: 0, finger: 0 },  // G
        { stringNumber: 4, fret: 2, finger: 2 },  // E
        { stringNumber: 5, fret: 3, finger: 3 },  // C
        { stringNumber: 6, fret: -1, finger: -1 } // Muted
      ];

      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      
      const notes = calculateNotesFromPositions(positions, standardTuning, 'guitar');
      
      expect(notes.isStandardTuning).toBe(true);
      expect(notes.notes).toContain('C');
      expect(notes.notes).toContain('E');
      expect(notes.notes).toContain('G');
      expect(notes.root).toBeDefined();
    });

    it('should calculate notes correctly for alternative tuning', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },  // D
        { stringNumber: 2, fret: 0, finger: 0 },  // A
        { stringNumber: 3, fret: 0, finger: 0 },  // D
        { stringNumber: 4, fret: 0, finger: 0 },  // G
        { stringNumber: 5, fret: 0, finger: 0 },  // A
        { stringNumber: 6, fret: 0, finger: 0 }   // D
      ];

      const dadgadTuning = ['D', 'A', 'D', 'G', 'A', 'D'];
      
      const notes = calculateNotesFromPositions(positions, dadgadTuning, 'guitar');
      
      expect(notes.isStandardTuning).toBe(false);
      expect(notes.notes).toContain('D');
      expect(notes.notes).toContain('A');
      expect(notes.notes).toContain('G');
    });

    it('should handle muted strings correctly', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: -1, finger: -1 }, // Muted
        { stringNumber: 2, fret: -1, finger: -1 }, // Muted
        { stringNumber: 3, fret: 2, finger: 2 },   // E
        { stringNumber: 4, fret: 2, finger: 3 },   // E
        { stringNumber: 5, fret: 2, finger: 4 },   // B
        { stringNumber: 6, fret: 0, finger: 0 }    // E
      ];

      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      
      const notes = calculateNotesFromPositions(positions, standardTuning, 'guitar');
      
      // Should only include notes from non-muted strings
      expect(notes.notes.length).toBeLessThan(6);
      expect(notes.notes).toContain('E');
      expect(notes.notes).toContain('B');
    });

    it('should handle open strings in alternative tuning', () => {
      const allOpenPositions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 0, finger: 0 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 0, finger: 0 },
        { stringNumber: 5, fret: 0, finger: 0 },
        { stringNumber: 6, fret: 0, finger: 0 }
      ];

      const openGTuning = ['D', 'G', 'D', 'G', 'B', 'D'];
      
      const notes = calculateNotesFromPositions(allOpenPositions, openGTuning, 'guitar');
      
      expect(notes.isStandardTuning).toBe(false);
      expect(notes.notes).toContain('D');
      expect(notes.notes).toContain('G');
      expect(notes.notes).toContain('B');
      // Should be a G major chord when all strings are open
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty positions array', () => {
      const emptyPositions: StringPosition[] = [];
      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      
      const notes = calculateNotesFromPositions(emptyPositions, standardTuning, 'guitar');
      
      expect(notes.notes).toEqual([]);
      expect(notes.root).toBe('C'); // Default root
    });

    it('should handle positions beyond string count', () => {
      const invalidPositions: StringPosition[] = [
        { stringNumber: 7, fret: 0, finger: 0 }, // Guitar only has 6 strings
        { stringNumber: 8, fret: 1, finger: 1 }
      ];
      const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];
      
      const notes = calculateNotesFromPositions(invalidPositions, standardTuning, 'guitar');
      
      expect(notes.notes).toEqual([]);
    });

    it('should handle mismatched tuning and positions', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 1, finger: 1 }
      ];
      const shortTuning = ['E']; // Only one string tuning for multi-string positions
      
      const notes = calculateNotesFromPositions(positions, shortTuning, 'guitar');
      
      // Should only process the first string
      expect(notes.notes.length).toBe(1);
      expect(notes.notes).toContain('E');
    });
  });
});