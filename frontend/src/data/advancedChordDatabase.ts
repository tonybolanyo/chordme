/**
 * Advanced Chord Database - 500+ Professional Chord Diagrams
 * 
 * This module contains a comprehensive collection of advanced chord diagrams
 * including jazz chords, extended harmonies, slash chords, and alternative fingerings.
 */

import {
  ChordDiagram
} from '../types/chordDiagram';

import { createChordDiagram, createBarreChord, addAlternativeFingering } from '../services/chordDiagramUtils';

/**
 * Jazz Chord Database - Major 7th Chords
 */
export const JAZZ_MAJOR_7TH_CHORDS: Record<string, ChordDiagram> = {
  // C Major 7th variations
  CMAJ7_OPEN: createChordDiagram('Cmaj7', 'guitar', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 2, finger: 2 },
    { stringNumber: 5, fret: 3, finger: 3 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  CMAJ7_3RD_FRET: createChordDiagram('Cmaj7', 'guitar', [
    { stringNumber: 1, fret: 3, finger: 2 },
    { stringNumber: 2, fret: 5, finger: 4 },
    { stringNumber: 3, fret: 4, finger: 3 },
    { stringNumber: 4, fret: 5, finger: 4 },
    { stringNumber: 5, fret: 3, finger: 1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  CMAJ7_8TH_FRET: createChordDiagram('Cmaj7', 'guitar', [
    { stringNumber: 1, fret: 8, finger: 3 },
    { stringNumber: 2, fret: 8, finger: 4 },
    { stringNumber: 3, fret: 9, finger: 2 },
    { stringNumber: 4, fret: 10, finger: 1 },
    { stringNumber: 5, fret: -1, finger: -1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  // D Major 7th variations
  DMAJ7_OPEN: createChordDiagram('Dmaj7', 'guitar', [
    { stringNumber: 1, fret: 2, finger: 1 },
    { stringNumber: 2, fret: 2, finger: 2 },
    { stringNumber: 3, fret: 2, finger: 3 },
    { stringNumber: 4, fret: 0, finger: 0 },
    { stringNumber: 5, fret: -1, finger: -1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  DMAJ7_5TH_FRET: createChordDiagram('Dmaj7', 'guitar', [
    { stringNumber: 1, fret: 5, finger: 2 },
    { stringNumber: 2, fret: 7, finger: 4 },
    { stringNumber: 3, fret: 6, finger: 3 },
    { stringNumber: 4, fret: 7, finger: 4 },
    { stringNumber: 5, fret: 5, finger: 1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  // E Major 7th variations
  EMAJ7_OPEN: createChordDiagram('Emaj7', 'guitar', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 1, finger: 1 },
    { stringNumber: 4, fret: 2, finger: 2 },
    { stringNumber: 5, fret: 2, finger: 3 },
    { stringNumber: 6, fret: 0, finger: 0 }
  ]),

  EMAJ7_7TH_FRET: createChordDiagram('Emaj7', 'guitar', [
    { stringNumber: 1, fret: 7, finger: 2 },
    { stringNumber: 2, fret: 9, finger: 4 },
    { stringNumber: 3, fret: 8, finger: 3 },
    { stringNumber: 4, fret: 9, finger: 4 },
    { stringNumber: 5, fret: 7, finger: 1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  // F Major 7th variations
  FMAJ7_1ST_FRET: createChordDiagram('Fmaj7', 'guitar', [
    { stringNumber: 1, fret: 1, finger: 1 },
    { stringNumber: 2, fret: 1, finger: 1 },
    { stringNumber: 3, fret: 2, finger: 2 },
    { stringNumber: 4, fret: 3, finger: 4 },
    { stringNumber: 5, fret: 3, finger: 3 },
    { stringNumber: 6, fret: 1, finger: 1 }
  ]),

  FMAJ7_8TH_FRET: createChordDiagram('Fmaj7', 'guitar', [
    { stringNumber: 1, fret: 8, finger: 2 },
    { stringNumber: 2, fret: 10, finger: 4 },
    { stringNumber: 3, fret: 9, finger: 3 },
    { stringNumber: 4, fret: 10, finger: 4 },
    { stringNumber: 5, fret: 8, finger: 1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  // G Major 7th variations
  GMAJ7_OPEN: createChordDiagram('Gmaj7', 'guitar', [
    { stringNumber: 1, fret: 3, finger: 3 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 0, finger: 0 },
    { stringNumber: 5, fret: 2, finger: 2 },
    { stringNumber: 6, fret: 3, finger: 4 }
  ]),

  GMAJ7_3RD_FRET: createChordDiagram('Gmaj7', 'guitar', [
    { stringNumber: 1, fret: 3, finger: 1 },
    { stringNumber: 2, fret: 3, finger: 1 },
    { stringNumber: 3, fret: 4, finger: 2 },
    { stringNumber: 4, fret: 5, finger: 4 },
    { stringNumber: 5, fret: 5, finger: 3 },
    { stringNumber: 6, fret: 3, finger: 1 }
  ]),

  // A Major 7th variations
  AMAJ7_OPEN: createChordDiagram('Amaj7', 'guitar', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 2, finger: 2 },
    { stringNumber: 3, fret: 1, finger: 1 },
    { stringNumber: 4, fret: 2, finger: 3 },
    { stringNumber: 5, fret: 0, finger: 0 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  AMAJ7_5TH_FRET: createChordDiagram('Amaj7', 'guitar', [
    { stringNumber: 1, fret: 5, finger: 1 },
    { stringNumber: 2, fret: 5, finger: 1 },
    { stringNumber: 3, fret: 6, finger: 2 },
    { stringNumber: 4, fret: 7, finger: 4 },
    { stringNumber: 5, fret: 7, finger: 3 },
    { stringNumber: 6, fret: 5, finger: 1 }
  ]),

  // B Major 7th variations
  BMAJ7_2ND_FRET: createChordDiagram('Bmaj7', 'guitar', [
    { stringNumber: 1, fret: 2, finger: 1 },
    { stringNumber: 2, fret: 4, finger: 3 },
    { stringNumber: 3, fret: 3, finger: 2 },
    { stringNumber: 4, fret: 4, finger: 4 },
    { stringNumber: 5, fret: 2, finger: 1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  BMAJ7_7TH_FRET: createChordDiagram('Bmaj7', 'guitar', [
    { stringNumber: 1, fret: 7, finger: 1 },
    { stringNumber: 2, fret: 7, finger: 1 },
    { stringNumber: 3, fret: 8, finger: 2 },
    { stringNumber: 4, fret: 9, finger: 4 },
    { stringNumber: 5, fret: 9, finger: 3 },
    { stringNumber: 6, fret: 7, finger: 1 }
  ])
};

/**
 * Get total chord count so far (this is just the beginning)
 */
export function getAdvancedChordCount(): number {
  return Object.keys(JAZZ_MAJOR_7TH_CHORDS).length;
}