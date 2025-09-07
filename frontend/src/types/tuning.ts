/**
 * Alternative Tuning System for ChordMe
 * 
 * This module defines types and interfaces for managing alternative guitar tunings,
 * tuning conversions, and tuning-specific chord libraries.
 */

import { InstrumentType } from './chordDiagram';

/**
 * Common alternative tuning presets
 */
export type TuningPreset = 
  | 'standard' 
  | 'drop_d' 
  | 'dadgad' 
  | 'open_g' 
  | 'open_d' 
  | 'open_c' 
  | 'open_e'
  | 'half_step_down'
  | 'whole_step_down'
  | 'double_drop_d'
  | 'drop_c'
  | 'drop_b'
  | 'custom';

/**
 * Tuning information and metadata
 */
export interface TuningInfo {
  /** Unique identifier for this tuning */
  id: string;
  
  /** Display name of the tuning */
  name: string;
  
  /** Short description of the tuning */
  description: string;
  
  /** Tuning preset type */
  preset: TuningPreset;
  
  /** Instrument this tuning applies to */
  instrument: InstrumentType;
  
  /** String tuning notes from lowest to highest */
  notes: string[];
  
  /** Tuning in semitones relative to standard tuning */
  semitoneOffsets: number[];
  
  /** Whether this is a standard tuning for the instrument */
  isStandard: boolean;
  
  /** Difficulty of playing in this tuning */
  difficulty: 'easy' | 'medium' | 'hard';
  
  /** Musical genres commonly associated with this tuning */
  genres: string[];
  
  /** Notable artists who use this tuning */
  artists?: string[];
  
  /** Localized names and descriptions */
  localization: {
    names: { [locale: string]: string };
    descriptions: { [locale: string]: string };
  };
  
  /** Creation and modification metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    isCustom: boolean;
    isVerified: boolean;
    popularityScore: number;
  };
}

/**
 * Tuning conversion result
 */
export interface TuningConversionResult {
  /** Whether the conversion was successful */
  success: boolean;
  
  /** Original chord positions */
  originalPositions: number[];
  
  /** Converted chord positions */
  convertedPositions: number[];
  
  /** Semitone adjustments made per string */
  adjustments: number[];
  
  /** Whether the conversion required capo */
  requiresCapo: boolean;
  
  /** Recommended capo position if needed */
  capoPosition?: number;
  
  /** Conversion notes or warnings */
  notes: string[];
  
  /** Confidence score of the conversion (0-100) */
  confidence: number;
}

/**
 * Capo calculation for alternative tunings
 */
export interface CapoCalculation {
  /** Recommended capo position */
  position: number;
  
  /** Resulting effective tuning with capo */
  effectiveTuning: string[];
  
  /** Effective semitone offsets with capo */
  effectiveOffsets: number[];
  
  /** Whether this capo position achieves the desired chord */
  achievesChord: boolean;
  
  /** Alternative capo positions */
  alternatives: {
    position: number;
    confidence: number;
    notes: string;
  }[];
}

/**
 * Tuning-specific chord library entry
 */
export interface TuningChordLibraryEntry {
  /** Chord name */
  chordName: string;
  
  /** Tuning this chord is optimized for */
  tuningId: string;
  
  /** Fret positions for this chord in this tuning */
  positions: number[];
  
  /** Finger assignments */
  fingering: number[];
  
  /** Difficulty in this tuning */
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  /** Why this chord works well in this tuning */
  advantages: string[];
  
  /** Alternative fingerings in this tuning */
  alternatives: {
    positions: number[];
    fingering: number[];
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }[];
}

/**
 * Tuning comparison result
 */
export interface TuningComparison {
  /** First tuning being compared */
  tuning1: TuningInfo;
  
  /** Second tuning being compared */
  tuning2: TuningInfo;
  
  /** Strings that have the same tuning */
  matchingStrings: number[];
  
  /** Strings with different tuning */
  differentStrings: number[];
  
  /** Overall similarity score (0-100) */
  similarity: number;
  
  /** Conversion difficulty between these tunings */
  conversionDifficulty: 'easy' | 'medium' | 'hard';
  
  /** Common chord shapes that work in both tunings */
  commonChords: string[];
}

/**
 * Predefined common tunings for guitar
 */
export const COMMON_GUITAR_TUNINGS: Record<TuningPreset, Omit<TuningInfo, 'id' | 'metadata'>> = {
  standard: {
    name: 'Standard Tuning',
    description: 'The most common guitar tuning',
    preset: 'standard',
    instrument: 'guitar',
    notes: ['E', 'A', 'D', 'G', 'B', 'E'],
    semitoneOffsets: [0, 0, 0, 0, 0, 0],
    isStandard: true,
    difficulty: 'easy',
    genres: ['rock', 'pop', 'country', 'classical'],
    localization: {
      names: { en: 'Standard Tuning', es: 'Afinación Estándar' },
      descriptions: { 
        en: 'The most common guitar tuning (E-A-D-G-B-E)',
        es: 'La afinación de guitarra más común (Mi-La-Re-Sol-Si-Mi)'
      }
    }
  },
  
  drop_d: {
    name: 'Drop D',
    description: 'Lower the low E string to D for heavier sound',
    preset: 'drop_d',
    instrument: 'guitar',
    notes: ['D', 'A', 'D', 'G', 'B', 'E'],
    semitoneOffsets: [-2, 0, 0, 0, 0, 0],
    isStandard: false,
    difficulty: 'easy',
    genres: ['metal', 'grunge', 'alternative rock'],
    artists: ['Foo Fighters', 'Soundgarden', 'Tool'],
    localization: {
      names: { en: 'Drop D', es: 'Drop D' },
      descriptions: { 
        en: 'Lower the 6th string to D (D-A-D-G-B-E)',
        es: 'Baja la 6ª cuerda a Re (Re-La-Re-Sol-Si-Mi)'
      }
    }
  },
  
  dadgad: {
    name: 'DADGAD',
    description: 'Celtic and folk tuning with open chord voicings',
    preset: 'dadgad',
    instrument: 'guitar',
    notes: ['D', 'A', 'D', 'G', 'A', 'D'],
    semitoneOffsets: [-2, 0, 0, 0, -2, -2],
    isStandard: false,
    difficulty: 'medium',
    genres: ['folk', 'celtic', 'fingerstyle'],
    artists: ['Led Zeppelin', 'Davey Graham', 'Pierre Bensusan'],
    localization: {
      names: { en: 'DADGAD', es: 'DADGAD' },
      descriptions: { 
        en: 'Celtic tuning creating rich open chord voicings (D-A-D-G-A-D)',
        es: 'Afinación celta que crea voicings de acordes abiertos ricos (Re-La-Re-Sol-La-Re)'
      }
    }
  },
  
  open_g: {
    name: 'Open G',
    description: 'Tuned to G major chord when strummed open',
    preset: 'open_g',
    instrument: 'guitar',
    notes: ['D', 'G', 'D', 'G', 'B', 'D'],
    semitoneOffsets: [-2, -2, 0, 0, 0, -2],
    isStandard: false,
    difficulty: 'medium',
    genres: ['blues', 'slide guitar', 'country'],
    artists: ['Keith Richards', 'Ry Cooder', 'Robert Johnson'],
    localization: {
      names: { en: 'Open G', es: 'Sol Abierto' },
      descriptions: { 
        en: 'Tuned to G major chord (D-G-D-G-B-D)',
        es: 'Afinado al acorde de Sol mayor (Re-Sol-Re-Sol-Si-Re)'
      }
    }
  },
  
  open_d: {
    name: 'Open D',
    description: 'Tuned to D major chord when strummed open',
    preset: 'open_d',
    instrument: 'guitar',
    notes: ['D', 'A', 'D', 'F#', 'A', 'D'],
    semitoneOffsets: [-2, 0, 0, -1, -2, -2],
    isStandard: false,
    difficulty: 'medium',
    genres: ['blues', 'slide guitar', 'folk'],
    artists: ['Bob Dylan', 'Joni Mitchell', 'Neil Young'],
    localization: {
      names: { en: 'Open D', es: 'Re Abierto' },
      descriptions: { 
        en: 'Tuned to D major chord (D-A-D-F#-A-D)',
        es: 'Afinado al acorde de Re mayor (Re-La-Re-Fa#-La-Re)'
      }
    }
  },
  
  open_c: {
    name: 'Open C',
    description: 'Tuned to C major chord when strummed open',
    preset: 'open_c',
    instrument: 'guitar',
    notes: ['C', 'G', 'C', 'G', 'C', 'E'],
    semitoneOffsets: [-4, -2, -2, 0, -4, 0],
    isStandard: false,
    difficulty: 'hard',
    genres: ['folk', 'fingerstyle', 'slide guitar'],
    artists: ['Devin Townsend', 'Nick Drake'],
    localization: {
      names: { en: 'Open C', es: 'Do Abierto' },
      descriptions: { 
        en: 'Tuned to C major chord (C-G-C-G-C-E)',
        es: 'Afinado al acorde de Do mayor (Do-Sol-Do-Sol-Do-Mi)'
      }
    }
  },
  
  open_e: {
    name: 'Open E',
    description: 'Tuned to E major chord when strummed open',
    preset: 'open_e',
    instrument: 'guitar',
    notes: ['E', 'B', 'E', 'G#', 'B', 'E'],
    semitoneOffsets: [0, 2, 2, 1, 0, 0],
    isStandard: false,
    difficulty: 'medium',
    genres: ['blues', 'slide guitar', 'rock'],
    artists: ['Derek Trucks', 'Duane Allman'],
    localization: {
      names: { en: 'Open E', es: 'Mi Abierto' },
      descriptions: { 
        en: 'Tuned to E major chord (E-B-E-G#-B-E)',
        es: 'Afinado al acorde de Mi mayor (Mi-Si-Mi-Sol#-Si-Mi)'
      }
    }
  },
  
  half_step_down: {
    name: 'Half Step Down',
    description: 'All strings tuned down one semitone',
    preset: 'half_step_down',
    instrument: 'guitar',
    notes: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'],
    semitoneOffsets: [-1, -1, -1, -1, -1, -1],
    isStandard: false,
    difficulty: 'easy',
    genres: ['rock', 'metal', 'grunge'],
    artists: ['Jimi Hendrix', 'Stevie Ray Vaughan', 'Alice in Chains'],
    localization: {
      names: { en: 'Half Step Down', es: 'Medio Tono Abajo' },
      descriptions: { 
        en: 'Standard tuning lowered by one semitone (Eb-Ab-Db-Gb-Bb-Eb)',
        es: 'Afinación estándar bajada un semitono (Mib-Lab-Reb-Solb-Sib-Mib)'
      }
    }
  },
  
  whole_step_down: {
    name: 'Whole Step Down',
    description: 'All strings tuned down one whole tone',
    preset: 'whole_step_down',
    instrument: 'guitar',
    notes: ['D', 'G', 'C', 'F', 'A', 'D'],
    semitoneOffsets: [-2, -2, -2, -2, -2, -2],
    isStandard: false,
    difficulty: 'easy',
    genres: ['metal', 'doom', 'stoner rock'],
    artists: ['Black Sabbath', 'Sleep', 'Electric Wizard'],
    localization: {
      names: { en: 'Whole Step Down', es: 'Tono Completo Abajo' },
      descriptions: { 
        en: 'Standard tuning lowered by one whole tone (D-G-C-F-A-D)',
        es: 'Afinación estándar bajada un tono completo (Re-Sol-Do-Fa-La-Re)'
      }
    }
  },
  
  double_drop_d: {
    name: 'Double Drop D',
    description: 'Both E strings dropped to D',
    preset: 'double_drop_d',
    instrument: 'guitar',
    notes: ['D', 'A', 'D', 'G', 'B', 'D'],
    semitoneOffsets: [-2, 0, 0, 0, 0, -2],
    isStandard: false,
    difficulty: 'medium',
    genres: ['folk', 'fingerstyle', 'alternative'],
    artists: ['Neil Young', 'Joni Mitchell'],
    localization: {
      names: { en: 'Double Drop D', es: 'Doble Drop D' },
      descriptions: { 
        en: 'Both high and low E strings dropped to D (D-A-D-G-B-D)',
        es: 'Las cuerdas Mi aguda y grave bajadas a Re (Re-La-Re-Sol-Si-Re)'
      }
    }
  },
  
  drop_c: {
    name: 'Drop C',
    description: 'Whole step down plus dropped low string',
    preset: 'drop_c',
    instrument: 'guitar',
    notes: ['C', 'G', 'C', 'F', 'A', 'D'],
    semitoneOffsets: [-4, -2, -2, -2, -2, -2],
    isStandard: false,
    difficulty: 'medium',
    genres: ['metal', 'metalcore', 'nu metal'],
    artists: ['Bullet for My Valentine', 'Killswitch Engage'],
    localization: {
      names: { en: 'Drop C', es: 'Drop C' },
      descriptions: { 
        en: 'Whole step down with lowest string dropped to C (C-G-C-F-A-D)',
        es: 'Un tono abajo con la cuerda más grave bajada a Do (Do-Sol-Do-Fa-La-Re)'
      }
    }
  },
  
  drop_b: {
    name: 'Drop B',
    description: 'Very low tuning for heavy genres',
    preset: 'drop_b',
    instrument: 'guitar',
    notes: ['B', 'F#', 'B', 'E', 'G#', 'C#'],
    semitoneOffsets: [-5, -3, -3, -3, -3, -3],
    isStandard: false,
    difficulty: 'hard',
    genres: ['deathcore', 'djent', 'progressive metal'],
    artists: ['Periphery', 'Meshuggah', 'After the Burial'],
    localization: {
      names: { en: 'Drop B', es: 'Drop B' },
      descriptions: { 
        en: 'Very low tuning for heavy music (B-F#-B-E-G#-C#)',
        es: 'Afinación muy grave para música pesada (Si-Fa#-Si-Mi-Sol#-Do#)'
      }
    }
  },
  
  custom: {
    name: 'Custom Tuning',
    description: 'User-defined custom tuning',
    preset: 'custom',
    instrument: 'guitar',
    notes: ['E', 'A', 'D', 'G', 'B', 'E'],
    semitoneOffsets: [0, 0, 0, 0, 0, 0],
    isStandard: false,
    difficulty: 'medium',
    genres: ['experimental', 'progressive'],
    localization: {
      names: { en: 'Custom Tuning', es: 'Afinación Personalizada' },
      descriptions: { 
        en: 'User-defined custom tuning',
        es: 'Afinación personalizada definida por el usuario'
      }
    }
  }
};

/**
 * Tuning change suggestion
 */
export interface TuningSuggestion {
  /** Suggested tuning */
  tuning: TuningInfo;
  
  /** Reason for the suggestion */
  reason: string;
  
  /** Confidence score (0-100) */
  confidence: number;
  
  /** Expected benefits */
  benefits: string[];
  
  /** Potential challenges */
  challenges: string[];
}