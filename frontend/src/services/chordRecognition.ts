/**
 * Enhanced Chord Recognition Engine
 * 
 * This module provides comprehensive chord recognition and parsing capabilities
 * supporting various chord formats and notations.
 */

export interface ChordComponents {
  root: string;              // Root note (C, D, E, etc.)
  accidental?: string;       // Sharp (#) or flat (b)
  quality?: string;          // Major (empty), minor (m), diminished (dim), augmented (aug)
  extension?: string;        // 7, 9, 11, 13, maj7, etc.
  suspension?: string;       // sus2, sus4
  addition?: string;         // add9, add11, etc.
  modification?: string;     // b5, #5, b9, #9, etc.
  bassNote?: string;         // Slash chord bass note (C/E -> bassNote: "E")
}

export interface ParsedChord {
  original: string;          // Original chord notation
  normalized: string;        // Normalized chord notation
  components: ChordComponents;
  isValid: boolean;
  quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'suspended' | 'unknown';
  enharmonicEquivalents: string[];
  errors?: string[];
}

/**
 * Enhanced chord recognition patterns
 */
const CHORD_PATTERNS = {
  // Root note patterns
  root: /^([A-G])/,
  
  // Accidental patterns (sharp or flat)
  accidental: /^[A-G]([#b])/,
  
  // Quality patterns (more comprehensive)
  quality: /^[A-G][#b]?(m|min|major|maj|dim|aug|°|o|\+)/i,
  
  // Extension patterns (comprehensive for jazz and complex chords)
  extension: /(?:maj|min|dim|aug|M)?([67]|9|11|13|add[29]|add11|add13)/i,
  
  // Suspension patterns
  suspension: /(sus[24]?)/i,
  
  // Modification patterns (altered dominants, etc.)
  modification: /([#b][59]|[#b]11|[#b]13)/g,
  
  // Slash chord pattern
  slashChord: /\/([A-G][#b]?)/,
  
  // Full comprehensive pattern for validation (more restrictive)
  full: /^[A-G][#b]?(?:(?:maj|min|dim|aug|sus[24]?|add[29]|add1[13]|M|m)?(?:[67]|9|11|13)?(?:[#b][59]|[#b]1[13])*(?:\/[A-G][#b]?)?)?$/
};

/**
 * Enharmonic equivalents mapping
 */
const ENHARMONIC_EQUIVALENTS: Record<string, string[]> = {
  'C#': ['Db'],
  'Db': ['C#'],
  'D#': ['Eb'],
  'Eb': ['D#'],
  'F#': ['Gb'],
  'Gb': ['F#'],
  'G#': ['Ab'],
  'Ab': ['G#'],
  'A#': ['Bb'],
  'Bb': ['A#']
};

/**
 * Note names in different languages/notations
 */
const NOTE_TRANSLATIONS = {
  // Spanish/Latin notation
  'Do': 'C',
  'Re': 'D',
  'Mi': 'E',
  'Fa': 'F',
  'Sol': 'G',
  'La': 'A',
  'Si': 'B',
  // German notation
  'H': 'B'
};

/**
 * Quality detection patterns
 */
const QUALITY_PATTERNS = {
  major: /^[A-G][#b]?(?!.*(?:m|min|dim|aug|°|o|\+|sus))/i,
  minor: /^[A-G][#b]?(?:m|min)(?!aj)/i,
  diminished: /^[A-G][#b]?(?:dim|°|o)(?![a-z])/i,
  augmented: /^[A-G][#b]?(?:aug|\+)/i,
  suspended: /^[A-G][#b]?.*sus/i
};

/**
 * Enhanced chord recognition class
 */
export class ChordRecognitionEngine {
  /**
   * Parse a chord notation into its components
   */
  public parseChord(input: string): ParsedChord {
    const original = input.trim();
    const errors: string[] = [];
    
    if (!original) {
      return this.createInvalidChord(original, ['Empty chord notation']);
    }

    // Normalize input (handle different notations)
    let normalized = this.normalizeChordNotation(original);
    
    // Basic validation using comprehensive pattern
    if (!CHORD_PATTERNS.full.test(normalized)) {
      errors.push(`Invalid chord format: ${original}`);
      return this.createInvalidChord(original, errors);
    }

    // Extract components
    const components = this.extractComponents(normalized);
    
    // Determine chord quality
    const quality = this.determineQuality(normalized);
    
    // Get enharmonic equivalents
    const enharmonicEquivalents = this.getEnharmonicEquivalents(components.root + (components.accidental || ''));
    
    return {
      original,
      normalized,
      components,
      isValid: true,
      quality,
      enharmonicEquivalents
    };
  }

  /**
   * Validate if a chord notation is valid
   */
  public isValidChord(chord: string): boolean {
    return this.parseChord(chord).isValid;
  }

  /**
   * Get all possible enharmonic equivalents for a chord
   */
  public getEnharmonicEquivalents(note: string): string[] {
    // Handle both uppercase and preserve proper case for flats/sharps
    const normalizedNote = note.charAt(0).toUpperCase() + note.slice(1);
    return ENHARMONIC_EQUIVALENTS[normalizedNote] || [];
  }

  /**
   * Normalize chord notation (handle different languages/formats)
   */
  private normalizeChordNotation(chord: string): string {
    let normalized = chord.trim();
    
    // Handle Spanish/Latin notation
    Object.entries(NOTE_TRANSLATIONS).forEach(([foreign, english]) => {
      const pattern = new RegExp(`^${foreign}(?![a-z])`, 'i');
      normalized = normalized.replace(pattern, english);
    });
    
    // Normalize quality indicators
    normalized = normalized
      .replace(/major/gi, 'maj')
      .replace(/minor/gi, 'min')
      .replace(/°/g, 'dim')
      .replace(/\+/g, 'aug');
    
    return normalized;
  }

  /**
   * Extract chord components
   */
  private extractComponents(chord: string): ChordComponents {
    const components: ChordComponents = {
      root: ''
    };

    // Extract root note
    const rootMatch = chord.match(CHORD_PATTERNS.root);
    if (rootMatch) {
      components.root = rootMatch[1];
    }

    // Extract accidental
    const accidentalMatch = chord.match(CHORD_PATTERNS.accidental);
    if (accidentalMatch) {
      components.accidental = accidentalMatch[1];
    }

    // Extract quality
    const qualityMatch = chord.match(CHORD_PATTERNS.quality);
    if (qualityMatch) {
      components.quality = qualityMatch[1];
    }

    // Extract extension
    const extensionMatch = chord.match(CHORD_PATTERNS.extension);
    if (extensionMatch) {
      components.extension = extensionMatch[1];
    }

    // Extract suspension
    const suspensionMatch = chord.match(CHORD_PATTERNS.suspension);
    if (suspensionMatch) {
      components.suspension = suspensionMatch[1];
    }

    // Extract modifications
    const modificationMatches = chord.match(CHORD_PATTERNS.modification);
    if (modificationMatches) {
      components.modification = modificationMatches.join(',');
    }

    // Extract bass note (slash chord)
    const slashMatch = chord.match(CHORD_PATTERNS.slashChord);
    if (slashMatch) {
      components.bassNote = slashMatch[1];
    }

    return components;
  }

  /**
   * Determine chord quality
   */
  private determineQuality(chord: string): ParsedChord['quality'] {
    if (QUALITY_PATTERNS.suspended.test(chord)) return 'suspended';
    if (QUALITY_PATTERNS.diminished.test(chord)) return 'diminished';
    if (QUALITY_PATTERNS.augmented.test(chord)) return 'augmented';
    if (QUALITY_PATTERNS.minor.test(chord)) return 'minor';
    if (QUALITY_PATTERNS.major.test(chord)) return 'major';
    return 'unknown';
  }

  /**
   * Create invalid chord result
   */
  private createInvalidChord(original: string, errors: string[]): ParsedChord {
    return {
      original,
      normalized: original,
      components: { root: '' },
      isValid: false,
      quality: 'unknown',
      enharmonicEquivalents: [],
      errors
    };
  }

  /**
   * Batch parse multiple chords
   */
  public parseChords(chords: string[]): ParsedChord[] {
    return chords.map(chord => this.parseChord(chord));
  }

  /**
   * Extract chords from ChordPro content
   */
  public extractChordsFromContent(content: string): ParsedChord[] {
    const chordPattern = /\[([^\]]+)\]/g;
    const chords: string[] = [];
    let match;
    
    while ((match = chordPattern.exec(content)) !== null) {
      const chordName = match[1].trim();
      if (chordName && !chords.includes(chordName)) {
        chords.push(chordName);
      }
    }
    
    return this.parseChords(chords);
  }

  /**
   * Validate ChordPro content and return detailed analysis
   */
  public validateChordProContent(content: string): {
    isValid: boolean;
    totalChords: number;
    validChords: number;
    invalidChords: ParsedChord[];
    uniqueRoots: string[];
    qualities: Record<string, number>;
  } {
    const parsedChords = this.extractChordsFromContent(content);
    const invalidChords = parsedChords.filter(chord => !chord.isValid);
    const validChords = parsedChords.filter(chord => chord.isValid);
    
    // Analyze unique roots
    const uniqueRoots = [...new Set(validChords.map(chord => 
      chord.components.root + (chord.components.accidental || '')
    ))];
    
    // Analyze qualities
    const qualities: Record<string, number> = {};
    validChords.forEach(chord => {
      qualities[chord.quality] = (qualities[chord.quality] || 0) + 1;
    });
    
    return {
      isValid: invalidChords.length === 0,
      totalChords: parsedChords.length,
      validChords: validChords.length,
      invalidChords,
      uniqueRoots,
      qualities
    };
  }
}

// Export singleton instance
export const chordRecognitionEngine = new ChordRecognitionEngine();

// Legacy compatibility exports
export function isValidChord(chord: string): boolean {
  return chordRecognitionEngine.isValidChord(chord);
}

export function parseChord(chord: string): ParsedChord {
  return chordRecognitionEngine.parseChord(chord);
}