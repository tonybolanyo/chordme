/**
 * Comprehensive Chord Diagram Data Structure
 * 
 * This module defines the core types and interfaces for storing and manipulating
 * chord diagrams across multiple instruments (guitar, ukulele, mandolin).
 */

/**
 * Supported instrument types
 */
export type InstrumentType = 'guitar' | 'ukulele' | 'mandolin';

/**
 * Difficulty levels for chord diagrams
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Finger assignments (1-4 for index through pinky, 0 for open, -1 for muted)
 */
export type FingerNumber = 0 | 1 | 2 | 3 | 4 | -1;

/**
 * String position information
 */
export interface StringPosition {
  /** String number (1-based, from lowest to highest pitch) */
  stringNumber: number;
  /** Fret number (0 for open, -1 for muted/not played) */
  fret: number;
  /** Finger assignment (0 = open, 1-4 = fingers, -1 = muted) */
  finger: FingerNumber;
  /** Whether this position is part of a barre */
  isBarre?: boolean;
  /** Barre span (number of strings covered) if this is a barre */
  barreSpan?: number;
}

/**
 * Barre chord information
 */
export interface BarreChord {
  /** Fret where the barre is placed */
  fret: number;
  /** Finger used for the barre (typically 1) */
  finger: FingerNumber;
  /** Starting string number (1-based) */
  startString: number;
  /** Ending string number (1-based) */
  endString: number;
  /** Whether this is a full barre or partial */
  isPartial: boolean;
}

/**
 * Alternative fingering for the same chord
 */
export interface AlternativeFingering {
  /** Unique identifier for this fingering */
  id: string;
  /** Description of this fingering variation */
  description: string;
  /** String positions for this alternative */
  positions: StringPosition[];
  /** Barre information if applicable */
  barre?: BarreChord;
  /** Difficulty level of this fingering */
  difficulty: DifficultyLevel;
  /** Notes about this fingering (e.g., "easier for small hands") */
  notes?: string;
}

/**
 * Musical notes that make up the chord
 */
export interface ChordNotes {
  /** Root note of the chord */
  root: string;
  /** All notes in the chord (from lowest to highest string) */
  notes: string[];
  /** Intervals from the root note */
  intervals: string[];
  /** Whether this chord is in standard tuning */
  isStandardTuning: boolean;
}

/**
 * Instrument-specific configuration
 */
export interface InstrumentConfig {
  /** Type of instrument */
  type: InstrumentType;
  /** Number of strings */
  stringCount: number;
  /** Standard tuning (notes from lowest to highest) */
  standardTuning: string[];
  /** Current tuning if different from standard */
  currentTuning?: string[];
  /** Tuning name/description */
  tuningName?: string;
  /** Whether the current tuning is standard */
  isStandardTuning?: boolean;
  /** Typical fret range for this instrument */
  fretRange: {
    min: number;
    max: number;
  };
  /** Common capo positions for this instrument */
  commonCapoPositions: number[];
}

/**
 * Metadata for chord diagrams
 */
export interface ChordDiagramMetadata {
  /** When this diagram was created */
  createdAt: string;
  /** When this diagram was last updated */
  updatedAt: string;
  /** Who created this diagram */
  createdBy?: string;
  /** Source/origin of this diagram (e.g., "user-contributed", "official") */
  source: string;
  /** Popularity/usage score (0-1) */
  popularityScore: number;
  /** Whether this is a verified/approved diagram */
  isVerified: boolean;
  /** Tags for categorization */
  tags: string[];
}

/**
 * Localized chord information
 */
export interface LocalizedChordInfo {
  /** Chord name in different languages/notations */
  names: {
    [locale: string]: string;
  };
  /** Descriptions in different languages */
  descriptions: {
    [locale: string]: string;
  };
  /** Fingering instructions in different languages */
  fingeringInstructions: {
    [locale: string]: string;
  };
}

/**
 * Main chord diagram interface
 */
export interface ChordDiagram {
  /** Unique identifier for this chord diagram */
  id: string;
  
  /** Chord name (e.g., "C", "Am7", "F#dim") */
  name: string;
  
  /** Instrument this diagram is for */
  instrument: InstrumentConfig;
  
  /** Primary fingering positions */
  positions: StringPosition[];
  
  /** Barre chord information if applicable */
  barre?: BarreChord;
  
  /** Difficulty level */
  difficulty: DifficultyLevel;
  
  /** Alternative fingerings for the same chord */
  alternatives: AlternativeFingering[];
  
  /** Musical information about the chord */
  notes: ChordNotes;
  
  /** Additional notes and comments */
  description?: string;
  
  /** Localized information */
  localization: LocalizedChordInfo;
  
  /** Metadata */
  metadata: ChordDiagramMetadata;
  
  /** Whether this diagram uses a capo */
  capoPosition?: number;
  
  /** Visual diagram as SVG string (optional, can be generated) */
  svgDiagram?: string;
  
  /** Tuning information for alternative tunings */
  tuningInfo?: {
    /** ID of the tuning this chord is optimized for */
    tuningId?: string;
    /** Name of the tuning */
    tuningName?: string;
    /** Whether this chord requires a specific tuning */
    requiresAlternativeTuning: boolean;
    /** Conversion notes for standard tuning players */
    conversionNotes?: string[];
  };
}

/**
 * Collection of chord diagrams
 */
export interface ChordDiagramCollection {
  /** Collection identifier */
  id: string;
  /** Collection name */
  name: string;
  /** Description of the collection */
  description: string;
  /** Instrument type for this collection */
  instrument: InstrumentType;
  /** List of chord diagrams */
  diagrams: ChordDiagram[];
  /** Collection metadata */
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    author?: string;
    license?: string;
  };
}

/**
 * Validation result for chord diagrams
 */
export interface ChordDiagramValidationResult {
  /** Whether the diagram is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: ChordDiagramValidationError[];
  /** List of warnings (non-blocking issues) */
  warnings: ChordDiagramValidationWarning[];
  /** Overall validation score (0-1) */
  score: number;
}

/**
 * Validation error for chord diagrams
 */
export interface ChordDiagramValidationError {
  /** Error type */
  type: 'invalid_fret' | 'invalid_finger' | 'invalid_string' | 'impossible_stretch' | 'invalid_barre' | 'missing_required';
  /** Error message */
  message: string;
  /** String number where error occurs (if applicable) */
  stringNumber?: number;
  /** Fret number where error occurs (if applicable) */
  fret?: number;
  /** Suggested fix (if available) */
  suggestion?: string;
}

/**
 * Validation warning for chord diagrams
 */
export interface ChordDiagramValidationWarning {
  /** Warning type */
  type: 'difficult_stretch' | 'uncommon_fingering' | 'alternative_exists' | 'incomplete_chord';
  /** Warning message */
  message: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** Suggested improvement */
  suggestion?: string;
}

/**
 * Chord types for filtering
 */
export type ChordType = 'major' | 'minor' | '7th' | 'maj7' | 'min7' | 'sus2' | 'sus4' | 'dim' | 'aug' | '9th' | '11th' | '13th' | 'add9' | 'power';

/**
 * Fret range types for filtering
 */
export type FretRange = 'open' | 'barre' | 'high' | 'custom';

/**
 * Sort options for search results
 */
export type SortOption = 'relevance' | 'alphabetical' | 'difficulty' | 'popularity' | 'fretPosition';

/**
 * Search criteria for chord diagrams
 */
export interface ChordDiagramSearchCriteria {
  /** Chord name or pattern */
  name?: string;
  /** Instrument type */
  instrument?: InstrumentType;
  /** Difficulty level(s) */
  difficulty?: DifficultyLevel[];
  /** Chord type(s) */
  chordType?: ChordType[];
  /** Maximum fret position */
  maxFret?: number;
  /** Minimum fret position */
  minFret?: number;
  /** Fret range type */
  fretRange?: FretRange;
  /** Whether to include barre chords */
  includeBarre?: boolean;
  /** Tags to search for */
  tags?: string[];
  /** Minimum popularity score */
  minPopularity?: number;
  /** Use fuzzy search */
  fuzzySearch?: boolean;
  /** Search threshold for fuzzy matching (0-100) */
  fuzzyThreshold?: number;
}

/**
 * Search result with metadata
 */
export interface ChordDiagramSearchResult {
  /** The chord diagram */
  diagram: ChordDiagram;
  /** Relevance score (0-100) */
  score: number;
  /** Match reason */
  matchReason: string;
}

/**
 * Search and filter options
 */
export interface ChordDiagramSearchOptions {
  /** Search criteria */
  criteria: ChordDiagramSearchCriteria;
  /** Sort option */
  sortBy?: SortOption;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Pagination: page number (0-based) */
  page?: number;
  /** Pagination: results per page */
  pageSize?: number;
  /** Maximum results to return */
  maxResults?: number;
}

/**
 * Paginated search results
 */
export interface ChordDiagramSearchResults {
  /** Search results */
  results: ChordDiagramSearchResult[];
  /** Total number of matches */
  totalCount: number;
  /** Current page (0-based) */
  page: number;
  /** Results per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Search criteria used */
  criteria: ChordDiagramSearchCriteria;
  /** Sort option used */
  sortBy: SortOption;
  /** Sort direction used */
  sortDirection: 'asc' | 'desc';
}

/**
 * Pre-defined instrument configurations
 */
export const INSTRUMENT_CONFIGS: Record<InstrumentType, InstrumentConfig> = {
  guitar: {
    type: 'guitar',
    stringCount: 6,
    standardTuning: ['E', 'A', 'D', 'G', 'B', 'E'], // Low to high
    fretRange: { min: 0, max: 24 },
    commonCapoPositions: [0, 1, 2, 3, 4, 5, 7]
  },
  ukulele: {
    type: 'ukulele',
    stringCount: 4,
    standardTuning: ['G', 'C', 'E', 'A'], // Low to high
    fretRange: { min: 0, max: 15 },
    commonCapoPositions: [0, 1, 2, 3, 5]
  },
  mandolin: {
    type: 'mandolin',
    stringCount: 8,
    standardTuning: ['G', 'G', 'D', 'D', 'A', 'A', 'E', 'E'], // Low to high, paired strings
    fretRange: { min: 0, max: 24 },
    commonCapoPositions: [0, 2, 3, 5, 7]
  }
};

/**
 * Common chord qualities and their interval patterns
 */
export const CHORD_INTERVALS: Record<string, string[]> = {
  'major': ['1', '3', '5'],
  'minor': ['1', 'b3', '5'],
  'dominant7': ['1', '3', '5', 'b7'],
  'major7': ['1', '3', '5', '7'],
  'minor7': ['1', 'b3', '5', 'b7'],
  'diminished': ['1', 'b3', 'b5'],
  'augmented': ['1', '3', '#5'],
  'sus2': ['1', '2', '5'],
  'sus4': ['1', '4', '5'],
  'add9': ['1', '3', '5', '9'],
  '6': ['1', '3', '5', '6'],
  'm6': ['1', 'b3', '5', '6'],
  '9': ['1', '3', '5', 'b7', '9'],
  'm9': ['1', 'b3', '5', 'b7', '9'],
  '11': ['1', '3', '5', 'b7', '9', '11'],
  '13': ['1', '3', '5', 'b7', '9', '11', '13']
};