/**
 * Example Chord Diagrams
 * 
 * This module contains example chord diagrams demonstrating the chord diagram
 * data structure implementation across different instruments.
 */

import {
  ChordDiagram,
  StringPosition,
  BarreChord,
  AlternativeFingering,
  ChordDiagramCollection,
  InstrumentType
} from '../types/chordDiagram';

import { createChordDiagram, createBarreChord, addAlternativeFingering } from '../services/chordDiagramUtils';

/**
 * Example guitar chord diagrams
 */
export const GUITAR_CHORDS = {
  // Basic open chords
  C_MAJOR: createChordDiagram('C', 'guitar', [
    { stringNumber: 1, fret: 3, finger: 3 },
    { stringNumber: 2, fret: 2, finger: 2 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 0, finger: 0 },
    { stringNumber: 5, fret: 1, finger: 1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  G_MAJOR: createChordDiagram('G', 'guitar', [
    { stringNumber: 1, fret: 3, finger: 4 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 0, finger: 0 },
    { stringNumber: 5, fret: 2, finger: 2 },
    { stringNumber: 6, fret: 3, finger: 3 }
  ]),

  D_MAJOR: createChordDiagram('D', 'guitar', [
    { stringNumber: 1, fret: 2, finger: 1 },
    { stringNumber: 2, fret: 3, finger: 3 },
    { stringNumber: 3, fret: 2, finger: 2 },
    { stringNumber: 4, fret: 0, finger: 0 },
    { stringNumber: 5, fret: -1, finger: -1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  A_MINOR: createChordDiagram('Am', 'guitar', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 1, finger: 1 },
    { stringNumber: 3, fret: 2, finger: 3 },
    { stringNumber: 4, fret: 2, finger: 2 },
    { stringNumber: 5, fret: 0, finger: 0 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]),

  E_MINOR: createChordDiagram('Em', 'guitar', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 2, finger: 2 },
    { stringNumber: 5, fret: 2, finger: 3 },
    { stringNumber: 6, fret: 0, finger: 0 }
  ])
};

/**
 * Example ukulele chord diagrams
 */
export const UKULELE_CHORDS = {
  C_MAJOR: createChordDiagram('C', 'ukulele', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 3, finger: 3 }
  ]),

  F_MAJOR: createChordDiagram('F', 'ukulele', [
    { stringNumber: 1, fret: 1, finger: 1 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 1, finger: 2 },
    { stringNumber: 4, fret: 2, finger: 3 }
  ]),

  G_MAJOR: createChordDiagram('G', 'ukulele', [
    { stringNumber: 1, fret: 3, finger: 3 },
    { stringNumber: 2, fret: 2, finger: 2 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 2, finger: 1 }
  ]),

  A_MINOR: createChordDiagram('Am', 'ukulele', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 2, finger: 2 }
  ])
};

/**
 * Example mandolin chord diagrams
 */
export const MANDOLIN_CHORDS = {
  G_MAJOR: createChordDiagram('G', 'mandolin', [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 0, finger: 0 },
    { stringNumber: 3, fret: 2, finger: 2 },
    { stringNumber: 4, fret: 2, finger: 2 },
    { stringNumber: 5, fret: 3, finger: 3 },
    { stringNumber: 6, fret: 3, finger: 3 },
    { stringNumber: 7, fret: 0, finger: 0 },
    { stringNumber: 8, fret: 0, finger: 0 }
  ]),

  C_MAJOR: createChordDiagram('C', 'mandolin', [
    { stringNumber: 1, fret: 3, finger: 3 },
    { stringNumber: 2, fret: 3, finger: 3 },
    { stringNumber: 3, fret: 2, finger: 2 },
    { stringNumber: 4, fret: 2, finger: 2 },
    { stringNumber: 5, fret: 0, finger: 0 },
    { stringNumber: 6, fret: 0, finger: 0 },
    { stringNumber: 7, fret: 1, finger: 1 },
    { stringNumber: 8, fret: 1, finger: 1 }
  ])
};

/**
 * Create example barre chords
 */
export function createBarreChordExamples(): ChordDiagram[] {
  // F Major barre chord (1st fret)
  const fMajorBarre = createChordDiagram('F', 'guitar', [
    { stringNumber: 1, fret: 1, finger: 1, isBarre: true, barreSpan: 6 },
    { stringNumber: 2, fret: 1, finger: 1, isBarre: true, barreSpan: 6 },
    { stringNumber: 3, fret: 2, finger: 2 },
    { stringNumber: 4, fret: 3, finger: 4 },
    { stringNumber: 5, fret: 3, finger: 3 },
    { stringNumber: 6, fret: 1, finger: 1, isBarre: true, barreSpan: 6 }
  ]);

  fMajorBarre.barre = createBarreChord(1, 1, 1, 6);
  fMajorBarre.difficulty = 'intermediate';

  // B Minor barre chord (2nd fret)
  const bMinorBarre = createChordDiagram('Bm', 'guitar', [
    { stringNumber: 1, fret: 2, finger: 1, isBarre: true, barreSpan: 5 },
    { stringNumber: 2, fret: 3, finger: 2 },
    { stringNumber: 3, fret: 4, finger: 4 },
    { stringNumber: 4, fret: 4, finger: 3 },
    { stringNumber: 5, fret: 2, finger: 1, isBarre: true, barreSpan: 5 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ]);

  bMinorBarre.barre = createBarreChord(2, 1, 1, 5);
  bMinorBarre.difficulty = 'intermediate';

  return [fMajorBarre, bMinorBarre];
}

/**
 * Create examples with alternative fingerings
 */
export function createAlternativeFingeringExamples(): ChordDiagram[] {
  // C major with alternative fingering
  const cMajor = { ...GUITAR_CHORDS.C_MAJOR };
  
  // Add high position alternative
  const highPositionC = addAlternativeFingering(
    cMajor,
    [
      { stringNumber: 1, fret: 8, finger: 3 },
      { stringNumber: 2, fret: 8, finger: 4 },
      { stringNumber: 3, fret: 9, finger: 2 },
      { stringNumber: 4, fret: 10, finger: 1 },
      { stringNumber: 5, fret: -1, finger: -1 },
      { stringNumber: 6, fret: -1, finger: -1 }
    ],
    'High position (8th fret)',
    'advanced'
  );

  // Add partial barre alternative
  const partialBarreC = addAlternativeFingering(
    highPositionC,
    [
      { stringNumber: 1, fret: 3, finger: 1 },
      { stringNumber: 2, fret: 5, finger: 3 },
      { stringNumber: 3, fret: 5, finger: 4 },
      { stringNumber: 4, fret: 5, finger: 2 },
      { stringNumber: 5, fret: 3, finger: 1 },
      { stringNumber: 6, fret: -1, finger: -1 }
    ],
    'Partial barre (3rd fret)',
    'intermediate',
    createBarreChord(3, 1, 1, 2, true)
  );

  return [partialBarreC];
}

/**
 * Create comprehensive chord collections
 */
export function createChordCollections(): ChordDiagramCollection[] {
  // Basic guitar chords collection
  const basicGuitarChords = {
    id: 'basic_guitar_chords',
    name: 'Basic Guitar Chords',
    description: 'Essential open chords for beginning guitar players',
    instrument: 'guitar' as InstrumentType,
    diagrams: Object.values(GUITAR_CHORDS),
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'ChordMe Example Library',
      license: 'MIT'
    }
  };

  // Ukulele starter pack
  const ukuleleStarter = {
    id: 'ukulele_starter_pack',
    name: 'Ukulele Starter Pack',
    description: 'Four essential chords to play hundreds of songs',
    instrument: 'ukulele' as InstrumentType,
    diagrams: Object.values(UKULELE_CHORDS),
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'ChordMe Example Library',
      license: 'MIT'
    }
  };

  // Advanced guitar techniques
  const advancedGuitar = {
    id: 'advanced_guitar_techniques',
    name: 'Advanced Guitar Techniques',
    description: 'Barre chords and advanced fingerings',
    instrument: 'guitar' as InstrumentType,
    diagrams: [
      ...createBarreChordExamples(),
      ...createAlternativeFingeringExamples()
    ],
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'ChordMe Example Library',
      license: 'MIT'
    }
  };

  return [basicGuitarChords, ukuleleStarter, advancedGuitar];
}

/**
 * Create examples for different difficulty levels
 */
export function createDifficultyExamples(): Record<string, ChordDiagram[]> {
  return {
    beginner: [
      { ...GUITAR_CHORDS.E_MINOR, difficulty: 'beginner' },
      { ...GUITAR_CHORDS.A_MINOR, difficulty: 'beginner' },
      { ...UKULELE_CHORDS.C_MAJOR, difficulty: 'beginner' }
    ],
    
    intermediate: [
      { ...GUITAR_CHORDS.C_MAJOR, difficulty: 'intermediate' },
      { ...GUITAR_CHORDS.G_MAJOR, difficulty: 'intermediate' },
      { ...GUITAR_CHORDS.D_MAJOR, difficulty: 'intermediate' }
    ],
    
    advanced: createBarreChordExamples().map(chord => ({
      ...chord,
      difficulty: 'advanced' as const
    })),
    
    expert: [
      createChordDiagram('Cmaj7#11', 'guitar', [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 0, finger: 0 },
        { stringNumber: 3, fret: 4, finger: 3 },
        { stringNumber: 4, fret: 5, finger: 4 },
        { stringNumber: 5, fret: 3, finger: 2 },
        { stringNumber: 6, fret: -1, finger: -1 }
      ])
    ].map(chord => ({ ...chord, difficulty: 'expert' as const }))
  };
}

/**
 * Create examples with localization
 */
export function createLocalizedExamples(): ChordDiagram[] {
  const cMajor = { ...GUITAR_CHORDS.C_MAJOR };
  
  // Add Spanish localization
  cMajor.localization = {
    names: {
      en: 'C Major',
      es: 'Do Mayor',
      fr: 'Do Majeur',
      de: 'C-Dur'
    },
    descriptions: {
      en: 'C major chord - one of the most fundamental chords in music',
      es: 'Acorde de Do mayor - uno de los acordes más fundamentales en la música',
      fr: 'Accord de Do majeur - l\'un des accords les plus fondamentaux en musique',
      de: 'C-Dur-Akkord - einer der grundlegendsten Akkorde in der Musik'
    },
    fingeringInstructions: {
      en: 'Place finger 1 on 5th string 1st fret, finger 2 on 4th string 2nd fret, finger 3 on 1st string 3rd fret',
      es: 'Coloca el dedo 1 en la 5ª cuerda 1er traste, dedo 2 en la 4ª cuerda 2º traste, dedo 3 en la 1ª cuerda 3er traste',
      fr: 'Placez le doigt 1 sur la 5ème corde 1ère frette, le doigt 2 sur la 4ème corde 2ème frette, le doigt 3 sur la 1ère corde 3ème frette',
      de: 'Setzen Sie Finger 1 auf die 5. Saite 1. Bund, Finger 2 auf die 4. Saite 2. Bund, Finger 3 auf die 1. Saite 3. Bund'
    }
  };

  return [cMajor];
}

/**
 * Create examples demonstrating metadata usage
 */
export function createMetadataExamples(): ChordDiagram[] {
  const examples = Object.values(GUITAR_CHORDS);
  
  examples.forEach((chord, index) => {
    chord.metadata = {
      ...chord.metadata,
      popularityScore: Math.random(),
      isVerified: index < 3, // First 3 are verified
      tags: [
        chord.instrument.type,
        chord.difficulty,
        chord.name.includes('m') ? 'minor' : 'major',
        'open-chord'
      ],
      createdBy: 'example-user',
      source: index % 2 === 0 ? 'official' : 'community'
    };
  });

  return examples;
}

/**
 * Export all examples
 */
export const CHORD_DIAGRAM_EXAMPLES = {
  guitar: GUITAR_CHORDS,
  ukulele: UKULELE_CHORDS,
  mandolin: MANDOLIN_CHORDS,
  barre: createBarreChordExamples(),
  alternatives: createAlternativeFingeringExamples(),
  collections: createChordCollections(),
  difficulty: createDifficultyExamples(),
  localized: createLocalizedExamples(),
  metadata: createMetadataExamples()
};