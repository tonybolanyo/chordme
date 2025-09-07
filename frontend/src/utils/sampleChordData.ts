/**
 * Sample Chord Diagram Data
 * 
 * Provides example chord diagrams for testing and demonstration of the
 * ChordDiagramRenderer component across different instruments.
 */

import { ChordDiagram, INSTRUMENT_CONFIGS } from '../types/chordDiagram';

// Helper function to create chord metadata
const createMetadata = (_name: string) => ({
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  source: 'sample-data',
  popularityScore: 0.8,
  isVerified: true,
  tags: ['common', 'basic']
});

// Helper function to create localization
const createLocalization = (name: string, description: string) => ({
  names: { 
    en: name,
    es: name // Using same name for simplicity in samples
  },
  descriptions: { 
    en: description,
    es: description
  },
  fingeringInstructions: { 
    en: 'Press strings as shown',
    es: 'Presiona las cuerdas como se muestra'
  }
});

// Guitar chord samples
export const SAMPLE_GUITAR_CHORDS: ChordDiagram[] = [
  {
    id: 'guitar-c-major',
    name: 'C',
    instrument: INSTRUMENT_CONFIGS.guitar,
    positions: [
      { stringNumber: 1, fret: 0, finger: 0 }, // High E - open
      { stringNumber: 2, fret: 1, finger: 1 }, // B - 1st fret, index
      { stringNumber: 3, fret: 0, finger: 0 }, // G - open
      { stringNumber: 4, fret: 2, finger: 2 }, // D - 2nd fret, middle
      { stringNumber: 5, fret: 3, finger: 3 }, // A - 3rd fret, ring
      { stringNumber: 6, fret: -1, finger: -1 } // Low E - muted
    ],
    difficulty: 'beginner',
    alternatives: [],
    notes: {
      root: 'C',
      quality: 'major',
      intervals: ['1', '3', '5'],
      voicing: 'root'
    },
    description: 'Basic C major chord - one of the most fundamental guitar chords',
    localization: createLocalization('C Major', 'Basic major chord'),
    metadata: createMetadata('C Major')
  },
  
  {
    id: 'guitar-g-major',
    name: 'G',
    instrument: INSTRUMENT_CONFIGS.guitar,
    positions: [
      { stringNumber: 1, fret: 3, finger: 3 }, // High E - 3rd fret, ring
      { stringNumber: 2, fret: 0, finger: 0 }, // B - open
      { stringNumber: 3, fret: 0, finger: 0 }, // G - open
      { stringNumber: 4, fret: 0, finger: 0 }, // D - open
      { stringNumber: 5, fret: 2, finger: 2 }, // A - 2nd fret, middle
      { stringNumber: 6, fret: 3, finger: 4 }  // Low E - 3rd fret, pinky
    ],
    difficulty: 'beginner',
    alternatives: [],
    notes: {
      root: 'G',
      quality: 'major',
      intervals: ['1', '3', '5'],
      voicing: 'root'
    },
    description: 'G major chord - bright and open sounding',
    localization: createLocalization('G Major', 'Bright major chord'),
    metadata: createMetadata('G Major')
  },

  {
    id: 'guitar-f-major-barre',
    name: 'F',
    instrument: INSTRUMENT_CONFIGS.guitar,
    positions: [
      { stringNumber: 1, fret: 1, finger: 1, isBarre: true, barreSpan: 6 },
      { stringNumber: 2, fret: 1, finger: 1, isBarre: true },
      { stringNumber: 3, fret: 2, finger: 2 },
      { stringNumber: 4, fret: 3, finger: 4 },
      { stringNumber: 5, fret: 3, finger: 3 },
      { stringNumber: 6, fret: 1, finger: 1, isBarre: true }
    ],
    barre: {
      fret: 1,
      finger: 1,
      startString: 1,
      endString: 6
    },
    difficulty: 'intermediate',
    alternatives: [],
    notes: {
      root: 'F',
      quality: 'major',
      intervals: ['1', '3', '5'],
      voicing: 'root'
    },
    description: 'F major barre chord - requires barring all strings at 1st fret',
    localization: createLocalization('F Major', 'Barre chord formation'),
    metadata: createMetadata('F Major')
  },

  {
    id: 'guitar-am',
    name: 'Am',
    instrument: INSTRUMENT_CONFIGS.guitar,
    positions: [
      { stringNumber: 1, fret: 0, finger: 0 }, // High E - open
      { stringNumber: 2, fret: 1, finger: 1 }, // B - 1st fret, index
      { stringNumber: 3, fret: 2, finger: 3 }, // G - 2nd fret, ring
      { stringNumber: 4, fret: 2, finger: 2 }, // D - 2nd fret, middle
      { stringNumber: 5, fret: 0, finger: 0 }, // A - open
      { stringNumber: 6, fret: -1, finger: -1 } // Low E - muted
    ],
    difficulty: 'beginner',
    alternatives: [],
    notes: {
      root: 'A',
      quality: 'minor',
      intervals: ['1', 'b3', '5'],
      voicing: 'root'
    },
    description: 'A minor chord - the relative minor of C major',
    localization: createLocalization('A Minor', 'Basic minor chord'),
    metadata: createMetadata('A Minor')
  }
];

// Ukulele chord samples
export const SAMPLE_UKULELE_CHORDS: ChordDiagram[] = [
  {
    id: 'ukulele-c-major',
    name: 'C',
    instrument: INSTRUMENT_CONFIGS.ukulele,
    positions: [
      { stringNumber: 1, fret: 0, finger: 0 }, // A - open
      { stringNumber: 2, fret: 0, finger: 0 }, // E - open
      { stringNumber: 3, fret: 0, finger: 0 }, // C - open
      { stringNumber: 4, fret: 3, finger: 3 }  // G - 3rd fret, ring
    ],
    difficulty: 'beginner',
    alternatives: [],
    notes: {
      root: 'C',
      quality: 'major',
      intervals: ['1', '3', '5'],
      voicing: 'root'
    },
    description: 'C major on ukulele - very easy to play',
    localization: createLocalization('C Major', 'Easy ukulele chord'),
    metadata: createMetadata('C Major')
  },

  {
    id: 'ukulele-f-major',
    name: 'F',
    instrument: INSTRUMENT_CONFIGS.ukulele,
    positions: [
      { stringNumber: 1, fret: 0, finger: 0 }, // A - open
      { stringNumber: 2, fret: 1, finger: 1 }, // E - 1st fret, index
      { stringNumber: 3, fret: 0, finger: 0 }, // C - open
      { stringNumber: 4, fret: 2, finger: 2 }  // G - 2nd fret, middle
    ],
    difficulty: 'beginner',
    alternatives: [],
    notes: {
      root: 'F',
      quality: 'major',
      intervals: ['1', '3', '5'],
      voicing: 'root'
    },
    description: 'F major on ukulele - much easier than guitar',
    localization: createLocalization('F Major', 'Easy ukulele chord'),
    metadata: createMetadata('F Major')
  }
];

// Mandolin chord samples
export const SAMPLE_MANDOLIN_CHORDS: ChordDiagram[] = [
  {
    id: 'mandolin-g-major',
    name: 'G',
    instrument: INSTRUMENT_CONFIGS.mandolin,
    positions: [
      { stringNumber: 1, fret: 0, finger: 0 }, // E - open
      { stringNumber: 2, fret: 0, finger: 0 }, // E - open
      { stringNumber: 3, fret: 0, finger: 0 }, // A - open
      { stringNumber: 4, fret: 0, finger: 0 }, // A - open
      { stringNumber: 5, fret: 0, finger: 0 }, // D - open
      { stringNumber: 6, fret: 0, finger: 0 }, // D - open
      { stringNumber: 7, fret: 0, finger: 0 }, // G - open
      { stringNumber: 8, fret: 0, finger: 0 }  // G - open
    ],
    difficulty: 'beginner',
    alternatives: [],
    notes: {
      root: 'G',
      quality: 'major',
      intervals: ['1', '3', '5'],
      voicing: 'root'
    },
    description: 'G major on mandolin - all open strings',
    localization: createLocalization('G Major', 'Open chord on mandolin'),
    metadata: createMetadata('G Major')
  },

  {
    id: 'mandolin-a-major',
    name: 'A',
    instrument: INSTRUMENT_CONFIGS.mandolin,
    positions: [
      { stringNumber: 1, fret: 2, finger: 2 }, // E - 2nd fret
      { stringNumber: 2, fret: 2, finger: 2 }, // E - 2nd fret
      { stringNumber: 3, fret: 2, finger: 2 }, // A - 2nd fret
      { stringNumber: 4, fret: 2, finger: 2 }, // A - 2nd fret
      { stringNumber: 5, fret: 2, finger: 2 }, // D - 2nd fret
      { stringNumber: 6, fret: 2, finger: 2 }, // D - 2nd fret
      { stringNumber: 7, fret: 2, finger: 2 }, // G - 2nd fret
      { stringNumber: 8, fret: 2, finger: 2 }  // G - 2nd fret
    ],
    barre: {
      fret: 2,
      finger: 2,
      startString: 1,
      endString: 8
    },
    difficulty: 'intermediate',
    alternatives: [],
    notes: {
      root: 'A',
      quality: 'major',
      intervals: ['1', '3', '5'],
      voicing: 'root'
    },
    description: 'A major on mandolin - barre across 2nd fret',
    localization: createLocalization('A Major', 'Barre chord on mandolin'),
    metadata: createMetadata('A Major')
  }
];

// Combined sample data
export const ALL_SAMPLE_CHORDS = [
  ...SAMPLE_GUITAR_CHORDS,
  ...SAMPLE_UKULELE_CHORDS,
  ...SAMPLE_MANDOLIN_CHORDS
];

// Helper function to get chords by instrument
export const getChordsByInstrument = (instrumentType: string) => {
  return ALL_SAMPLE_CHORDS.filter(chord => chord.instrument.type === instrumentType);
};

// Helper function to get chord by name and instrument
export const getChord = (name: string, instrumentType: string) => {
  return ALL_SAMPLE_CHORDS.find(
    chord => chord.name === name && chord.instrument.type === instrumentType
  );
};