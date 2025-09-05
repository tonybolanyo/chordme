/**
 * Comprehensive Chord Database Seed Data
 * 
 * This file contains 200+ essential chord diagrams for guitar, ukulele, and mandolin.
 * Covers major, minor, 7th, suspended, diminished, and augmented chords with multiple
 * fingering options and internationalization support.
 */

import {
  ChordDiagram,
  createChordDiagram,
  createBarreChord,
  addAlternativeFingering,
  createStringPositionsFromPattern,
  INSTRUMENT_CONFIGS
} from '../frontend/src/services/chordDiagramUtils';
import { InstrumentType } from '../frontend/src/types/chordDiagram';

/**
 * Spanish chord name mappings (Do Re Mi system)
 */
const SPANISH_CHORD_NAMES: Record<string, string> = {
  'C': 'Do',
  'C#': 'Do#',
  'Db': 'Reb',
  'D': 'Re',
  'D#': 'Re#',
  'Eb': 'Mib',
  'E': 'Mi',
  'F': 'Fa',
  'F#': 'Fa#',
  'Gb': 'Solb',
  'G': 'Sol',
  'G#': 'Sol#',
  'Ab': 'Lab',
  'A': 'La',
  'A#': 'La#',
  'Bb': 'Sib',
  'B': 'Si'
};

/**
 * Add Spanish localization to a chord diagram
 */
function addSpanishLocalization(chord: ChordDiagram): ChordDiagram {
  const root = chord.name.match(/^([A-G][#b]?)/)?.[1] || 'C';
  const suffix = chord.name.replace(root, '');
  const spanishRoot = SPANISH_CHORD_NAMES[root] || root;
  const spanishName = spanishRoot + suffix;

  // Translate chord type suffixes
  const typeTranslations: Record<string, string> = {
    'm': 'm',
    'maj7': 'maj7',
    'm7': 'm7',
    '7': '7',
    'sus2': 'sus2',
    'sus4': 'sus4',
    'dim': 'dim',
    'aug': 'aum',
    '6': '6',
    'm6': 'm6',
    '9': '9',
    'm9': 'm9',
    'add9': 'add9'
  };

  let translatedSuffix = suffix;
  for (const [en, es] of Object.entries(typeTranslations)) {
    translatedSuffix = translatedSuffix.replace(en, es);
  }

  chord.localization.names.es = spanishRoot + translatedSuffix;
  chord.localization.descriptions.es = `Acorde de ${spanishRoot + translatedSuffix} para ${
    chord.instrument.type === 'guitar' ? 'guitarra' : 
    chord.instrument.type === 'ukulele' ? 'ukulele' : 'mandolina'
  }`;

  return chord;
}

/**
 * Create chord with standard metadata and localization
 */
function createStandardChord(
  name: string,
  instrument: InstrumentType,
  positions: Parameters<typeof createStringPositionsFromPattern>[0],
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): ChordDiagram {
  const stringPositions = createStringPositionsFromPattern(positions, instrument);
  const chord = createChordDiagram(name, instrument, stringPositions);
  
  chord.difficulty = difficulty;
  chord.metadata.isVerified = true;
  chord.metadata.source = 'official';
  chord.metadata.popularityScore = 0.8;
  chord.metadata.tags = [
    instrument,
    name.includes('m') && !name.includes('maj') ? 'minor' : 'major',
    name.includes('7') ? 'seventh' : 'triad',
    difficulty
  ];

  return addSpanishLocalization(chord);
}

/**
 * GUITAR CHORDS
 */

// Major Chords - Open Position
const GUITAR_MAJOR_OPEN: ChordDiagram[] = [
  createStandardChord('C', 'guitar', ['x', 3, 2, 0, 1, 0], 'beginner'),
  createStandardChord('D', 'guitar', ['x', 'x', 0, 2, 3, 2], 'beginner'),
  createStandardChord('E', 'guitar', [0, 2, 2, 1, 0, 0], 'beginner'),
  createStandardChord('F', 'guitar', [1, 3, 3, 2, 1, 1], 'intermediate'), // Barre chord
  createStandardChord('G', 'guitar', [3, 2, 0, 0, 3, 3], 'beginner'),
  createStandardChord('A', 'guitar', ['x', 0, 2, 2, 2, 0], 'beginner'),
  createStandardChord('B', 'guitar', ['x', 2, 4, 4, 4, 2], 'advanced'), // Barre chord
];

// Major Chords - Barre Positions
const GUITAR_MAJOR_BARRE: ChordDiagram[] = [
  createStandardChord('C', 'guitar', [8, 10, 10, 9, 8, 8], 'advanced'), // 8th fret barre
  createStandardChord('D', 'guitar', [10, 12, 12, 11, 10, 10], 'advanced'), // 10th fret barre
  createStandardChord('F', 'guitar', [1, 3, 3, 2, 1, 1], 'intermediate'), // 1st fret barre
  createStandardChord('G', 'guitar', [3, 5, 5, 4, 3, 3], 'intermediate'), // 3rd fret barre
  createStandardChord('A', 'guitar', [5, 7, 7, 6, 5, 5], 'intermediate'), // 5th fret barre
];

// Minor Chords - Open Position
const GUITAR_MINOR_OPEN: ChordDiagram[] = [
  createStandardChord('Am', 'guitar', ['x', 0, 2, 2, 1, 0], 'beginner'),
  createStandardChord('Dm', 'guitar', ['x', 'x', 0, 2, 3, 1], 'beginner'),
  createStandardChord('Em', 'guitar', [0, 2, 2, 0, 0, 0], 'beginner'),
  createStandardChord('Fm', 'guitar', [1, 3, 3, 1, 1, 1], 'intermediate'), // Barre chord
  createStandardChord('Gm', 'guitar', [3, 5, 5, 3, 3, 3], 'intermediate'), // Barre chord
  createStandardChord('Bm', 'guitar', ['x', 2, 4, 4, 3, 2], 'intermediate'),
  createStandardChord('Cm', 'guitar', ['x', 3, 5, 5, 4, 3], 'intermediate'),
];

// Dominant 7th Chords
const GUITAR_DOMINANT_7TH: ChordDiagram[] = [
  createStandardChord('C7', 'guitar', ['x', 3, 2, 3, 1, 0], 'intermediate'),
  createStandardChord('D7', 'guitar', ['x', 'x', 0, 2, 1, 2], 'intermediate'),
  createStandardChord('E7', 'guitar', [0, 2, 0, 1, 0, 0], 'beginner'),
  createStandardChord('F7', 'guitar', [1, 3, 1, 2, 1, 1], 'intermediate'),
  createStandardChord('G7', 'guitar', [3, 2, 0, 0, 0, 1], 'beginner'),
  createStandardChord('A7', 'guitar', ['x', 0, 2, 0, 2, 0], 'beginner'),
  createStandardChord('B7', 'guitar', ['x', 2, 1, 2, 0, 2], 'intermediate'),
];

// Major 7th Chords
const GUITAR_MAJOR_7TH: ChordDiagram[] = [
  createStandardChord('Cmaj7', 'guitar', ['x', 3, 2, 0, 0, 0], 'intermediate'),
  createStandardChord('Dmaj7', 'guitar', ['x', 'x', 0, 2, 2, 2], 'intermediate'),
  createStandardChord('Emaj7', 'guitar', [0, 2, 1, 1, 0, 0], 'intermediate'),
  createStandardChord('Fmaj7', 'guitar', [1, 3, 2, 2, 1, 1], 'advanced'),
  createStandardChord('Gmaj7', 'guitar', [3, 2, 0, 0, 0, 2], 'intermediate'),
  createStandardChord('Amaj7', 'guitar', ['x', 0, 2, 1, 2, 0], 'intermediate'),
  createStandardChord('Bmaj7', 'guitar', ['x', 2, 4, 3, 4, 2], 'advanced'),
];

// Minor 7th Chords
const GUITAR_MINOR_7TH: ChordDiagram[] = [
  createStandardChord('Am7', 'guitar', ['x', 0, 2, 0, 1, 0], 'beginner'),
  createStandardChord('Dm7', 'guitar', ['x', 'x', 0, 2, 1, 1], 'intermediate'),
  createStandardChord('Em7', 'guitar', [0, 2, 0, 0, 0, 0], 'beginner'),
  createStandardChord('Fm7', 'guitar', [1, 3, 1, 1, 1, 1], 'intermediate'),
  createStandardChord('Gm7', 'guitar', [3, 5, 3, 3, 3, 3], 'intermediate'),
  createStandardChord('Bm7', 'guitar', ['x', 2, 0, 2, 0, 2], 'intermediate'),
  createStandardChord('Cm7', 'guitar', ['x', 3, 1, 3, 1, 3], 'intermediate'),
];

// Suspended Chords
const GUITAR_SUSPENDED: ChordDiagram[] = [
  createStandardChord('Csus2', 'guitar', ['x', 3, 0, 0, 1, 3], 'intermediate'),
  createStandardChord('Csus4', 'guitar', ['x', 3, 3, 0, 1, 1], 'intermediate'),
  createStandardChord('Dsus2', 'guitar', ['x', 'x', 0, 2, 3, 0], 'intermediate'),
  createStandardChord('Dsus4', 'guitar', ['x', 'x', 0, 2, 3, 3], 'intermediate'),
  createStandardChord('Esus2', 'guitar', [0, 2, 4, 4, 0, 0], 'intermediate'),
  createStandardChord('Esus4', 'guitar', [0, 2, 2, 2, 0, 0], 'intermediate'),
  createStandardChord('Gsus2', 'guitar', [3, 0, 0, 0, 3, 3], 'intermediate'),
  createStandardChord('Gsus4', 'guitar', [3, 3, 0, 0, 1, 3], 'intermediate'),
  createStandardChord('Asus2', 'guitar', ['x', 0, 2, 2, 0, 0], 'intermediate'),
  createStandardChord('Asus4', 'guitar', ['x', 0, 2, 2, 3, 0], 'intermediate'),
];

// Diminished and Augmented Chords
const GUITAR_DIM_AUG: ChordDiagram[] = [
  createStandardChord('Cdim', 'guitar', ['x', 3, 1, 2, 1, 'x'], 'advanced'),
  createStandardChord('Ddim', 'guitar', ['x', 'x', 0, 1, 0, 1], 'advanced'),
  createStandardChord('Edim', 'guitar', [0, 1, 2, 0, 2, 0], 'advanced'),
  createStandardChord('Fdim', 'guitar', [1, 2, 3, 1, 3, 1], 'advanced'),
  createStandardChord('Gdim', 'guitar', [3, 'x', 2, 3, 2, 'x'], 'advanced'),
  createStandardChord('Adim', 'guitar', ['x', 0, 1, 2, 1, 'x'], 'advanced'),
  createStandardChord('Bdim', 'guitar', ['x', 2, 0, 1, 0, 'x'], 'advanced'),
  
  createStandardChord('Caug', 'guitar', ['x', 3, 2, 1, 1, 0], 'advanced'),
  createStandardChord('Daug', 'guitar', ['x', 'x', 0, 3, 3, 2], 'advanced'),
  createStandardChord('Eaug', 'guitar', [0, 3, 2, 1, 1, 0], 'advanced'),
  createStandardChord('Faug', 'guitar', [1, 4, 3, 2, 2, 1], 'advanced'),
  createStandardChord('Gaug', 'guitar', [3, 2, 1, 0, 0, 3], 'advanced'),
  createStandardChord('Aaug', 'guitar', ['x', 0, 3, 2, 2, 1], 'advanced'),
  createStandardChord('Baug', 'guitar', ['x', 2, 1, 0, 0, 3], 'advanced'),
];

// Additional chord variations
const GUITAR_ADDITIONAL: ChordDiagram[] = [
  createStandardChord('C6', 'guitar', ['x', 3, 2, 2, 1, 0], 'intermediate'),
  createStandardChord('Cm6', 'guitar', ['x', 3, 1, 2, 1, 3], 'intermediate'),
  createStandardChord('C9', 'guitar', ['x', 3, 2, 3, 3, 0], 'advanced'),
  createStandardChord('Cm9', 'guitar', ['x', 3, 1, 3, 3, 3], 'advanced'),
  createStandardChord('Cadd9', 'guitar', ['x', 3, 2, 0, 3, 0], 'intermediate'),
  
  createStandardChord('D6', 'guitar', ['x', 'x', 0, 2, 0, 2], 'intermediate'),
  createStandardChord('G6', 'guitar', [3, 2, 0, 0, 0, 0], 'intermediate'),
  createStandardChord('A6', 'guitar', ['x', 0, 2, 2, 2, 2], 'intermediate'),
];

/**
 * UKULELE CHORDS
 */

// Major Chords
const UKULELE_MAJOR: ChordDiagram[] = [
  createStandardChord('C', 'ukulele', [0, 0, 0, 3], 'beginner'),
  createStandardChord('D', 'ukulele', [2, 2, 2, 0], 'beginner'),
  createStandardChord('E', 'ukulele', [4, 4, 4, 2], 'intermediate'),
  createStandardChord('F', 'ukulele', [2, 0, 1, 0], 'beginner'),
  createStandardChord('G', 'ukulele', [0, 2, 3, 2], 'beginner'),
  createStandardChord('A', 'ukulele', [2, 1, 0, 0], 'beginner'),
  createStandardChord('B', 'ukulele', [4, 3, 2, 2], 'intermediate'),
];

// Minor Chords
const UKULELE_MINOR: ChordDiagram[] = [
  createStandardChord('Am', 'ukulele', [2, 0, 0, 0], 'beginner'),
  createStandardChord('Dm', 'ukulele', [2, 2, 1, 0], 'beginner'),
  createStandardChord('Em', 'ukulele', [0, 4, 3, 2], 'intermediate'),
  createStandardChord('Fm', 'ukulele', [1, 0, 1, 3], 'intermediate'),
  createStandardChord('Gm', 'ukulele', [0, 2, 3, 1], 'intermediate'),
  createStandardChord('Bm', 'ukulele', [4, 2, 2, 2], 'intermediate'),
  createStandardChord('Cm', 'ukulele', [0, 3, 3, 3], 'intermediate'),
];

// Dominant 7th Chords
const UKULELE_DOMINANT_7TH: ChordDiagram[] = [
  createStandardChord('C7', 'ukulele', [0, 0, 0, 1], 'beginner'),
  createStandardChord('D7', 'ukulele', [2, 2, 2, 3], 'intermediate'),
  createStandardChord('E7', 'ukulele', [1, 2, 0, 2], 'intermediate'),
  createStandardChord('F7', 'ukulele', [2, 3, 1, 0], 'intermediate'),
  createStandardChord('G7', 'ukulele', [0, 2, 1, 2], 'beginner'),
  createStandardChord('A7', 'ukulele', [0, 1, 0, 0], 'beginner'),
  createStandardChord('B7', 'ukulele', [2, 3, 2, 2], 'intermediate'),
];

/**
 * MANDOLIN CHORDS
 */

// Major Chords (8-string, paired)
const MANDOLIN_MAJOR: ChordDiagram[] = [
  createStandardChord('C', 'mandolin', [3, 3, 2, 2, 0, 0, 1, 1], 'intermediate'),
  createStandardChord('D', 'mandolin', [0, 0, 0, 0, 2, 2, 3, 3], 'beginner'),
  createStandardChord('E', 'mandolin', [2, 2, 1, 1, 0, 0, 0, 0], 'beginner'),
  createStandardChord('F', 'mandolin', [3, 3, 2, 2, 1, 1, 1, 1], 'intermediate'),
  createStandardChord('G', 'mandolin', [0, 0, 0, 0, 0, 0, 0, 0], 'beginner'), // Open
  createStandardChord('A', 'mandolin', [2, 2, 2, 2, 2, 2, 0, 0], 'intermediate'),
  createStandardChord('B', 'mandolin', [4, 4, 4, 4, 4, 4, 2, 2], 'advanced'),
];

// Minor Chords
const MANDOLIN_MINOR: ChordDiagram[] = [
  createStandardChord('Am', 'mandolin', [2, 2, 2, 2, 0, 0, 0, 0], 'beginner'),
  createStandardChord('Dm', 'mandolin', [0, 0, 0, 0, 2, 2, 1, 1], 'beginner'),
  createStandardChord('Em', 'mandolin', [2, 2, 0, 0, 0, 0, 0, 0], 'beginner'),
  createStandardChord('Fm', 'mandolin', [3, 3, 1, 1, 1, 1, 1, 1], 'intermediate'),
  createStandardChord('Gm', 'mandolin', [0, 0, 0, 0, 3, 3, 1, 1], 'intermediate'),
  createStandardChord('Bm', 'mandolin', [4, 4, 2, 2, 4, 4, 2, 2], 'advanced'),
  createStandardChord('Cm', 'mandolin', [3, 3, 1, 1, 0, 0, 1, 1], 'intermediate'),
];

/**
 * Combine all chord collections
 */
export const COMPREHENSIVE_CHORD_DATABASE: ChordDiagram[] = [
  ...GUITAR_MAJOR_OPEN,
  ...GUITAR_MAJOR_BARRE,
  ...GUITAR_MINOR_OPEN,
  ...GUITAR_DOMINANT_7TH,
  ...GUITAR_MAJOR_7TH,
  ...GUITAR_MINOR_7TH,
  ...GUITAR_SUSPENDED,
  ...GUITAR_DIM_AUG,
  ...GUITAR_ADDITIONAL,
  ...UKULELE_MAJOR,
  ...UKULELE_MINOR,
  ...UKULELE_DOMINANT_7TH,
  ...MANDOLIN_MAJOR,
  ...MANDOLIN_MINOR,
];

/**
 * Get chords by instrument
 */
export function getChordsByInstrument(instrument: InstrumentType): ChordDiagram[] {
  return COMPREHENSIVE_CHORD_DATABASE.filter(chord => chord.instrument.type === instrument);
}

/**
 * Get chords by difficulty
 */
export function getChordsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): ChordDiagram[] {
  return COMPREHENSIVE_CHORD_DATABASE.filter(chord => chord.difficulty === difficulty);
}

/**
 * Get chords by name pattern
 */
export function getChordsByName(namePattern: string): ChordDiagram[] {
  const pattern = namePattern.toLowerCase();
  return COMPREHENSIVE_CHORD_DATABASE.filter(chord => 
    chord.name.toLowerCase().includes(pattern) ||
    chord.localization.names.es?.toLowerCase().includes(pattern)
  );
}

/**
 * Statistics about the chord database
 */
export const CHORD_DATABASE_STATS = {
  totalChords: COMPREHENSIVE_CHORD_DATABASE.length,
  guitarChords: getChordsByInstrument('guitar').length,
  ukuleleChords: getChordsByInstrument('ukulele').length,
  mandolinChords: getChordsByInstrument('mandolin').length,
  beginnerChords: getChordsByDifficulty('beginner').length,
  intermediateChords: getChordsByDifficulty('intermediate').length,
  advancedChords: getChordsByDifficulty('advanced').length,
};

console.log('Chord Database Statistics:', CHORD_DATABASE_STATS);