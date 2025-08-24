/**
 * Service for chord validation and autocomplete functionality
 */

// Import the chord list from ChordPalette
const COMMON_CHORDS = [
  // Major chords
  'C',
  'D',
  'E',
  'F',
  'G',
  'A',
  'B',

  // Minor chords
  'Am',
  'Bm',
  'Cm',
  'Dm',
  'Em',
  'Fm',
  'Gm',

  // 7th chords
  'C7',
  'D7',
  'E7',
  'F7',
  'G7',
  'A7',
  'B7',

  // Minor 7th chords
  'Am7',
  'Bm7',
  'Cm7',
  'Dm7',
  'Em7',
  'Fm7',
  'Gm7',

  // Major 7th chords
  'Cmaj7',
  'Dmaj7',
  'Emaj7',
  'Fmaj7',
  'Gmaj7',
  'Amaj7',
  'Bmaj7',

  // Sus chords
  'Csus4',
  'Dsus4',
  'Esus4',
  'Fsus4',
  'Gsus4',
  'Asus4',
  'Bsus4',
  'Csus2',
  'Dsus2',
  'Gsus2',
  'Asus2',

  // Common slash chords
  'C/E',
  'D/F#',
  'F/C',
  'G/B',
  'Am/C',

  // Diminished and augmented
  'Cdim',
  'Ddim',
  'Fdim',
  'Gdim',
  'Caug',
  'Faug',
];

export interface ChordSuggestion {
  chord: string;
  isValid: boolean;
  score: number; // Relevance score for sorting
}

/**
 * Basic chord validation using regex pattern (matching backend validation)
 */
export function isValidChord(chord: string): boolean {
  if (!chord.trim()) {
    return false;
  }

  // Match the backend regex pattern for chord validation
  const chordPattern =
    /^[A-G][#b]?[mM]?(?:maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?[0-9]*)?(?:\/[A-G][#b]?)?$/;
  return chordPattern.test(chord.trim());
}

/**
 * Get chord suggestions based on partial input
 */
export function getChordSuggestions(
  input: string,
  maxSuggestions: number = 10
): ChordSuggestion[] {
  const inputLower = input.toLowerCase().trim();

  if (!inputLower) {
    return [];
  }

  const suggestions: ChordSuggestion[] = [];

  // Find matching chords from the common chords list
  for (const chord of COMMON_CHORDS) {
    const chordLower = chord.toLowerCase();
    let score = 0;

    if (chordLower === inputLower) {
      // Exact match gets highest score
      score = 100;
    } else if (chordLower.startsWith(inputLower)) {
      // Prefix match gets high score
      score = 90 - (chord.length - input.length) * 2;
    } else if (chordLower.includes(inputLower)) {
      // Contains match gets lower score
      score = 50 - (chord.length - input.length);
    }

    if (score > 0) {
      suggestions.push({
        chord,
        isValid: isValidChord(chord),
        score,
      });
    }
  }

  // Sort by score (highest first) and return top suggestions
  return suggestions.sort((a, b) => b.score - a.score).slice(0, maxSuggestions);
}

/**
 * Detect if cursor is inside chord brackets and return chord info
 */
export function detectChordInput(
  text: string,
  cursorPosition: number
): {
  isInChord: boolean;
  chordStart?: number;
  chordEnd?: number;
  chordText?: string;
} {
  if (cursorPosition < 0 || cursorPosition > text.length) {
    return { isInChord: false };
  }

  // Find the nearest opening bracket before cursor
  let openBracket = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (text[i] === '[') {
      openBracket = i;
      break;
    } else if (text[i] === ']') {
      // Found closing bracket first, not in a chord
      break;
    }
  }

  if (openBracket === -1) {
    return { isInChord: false };
  }

  // Find the closing bracket after the opening bracket
  let closeBracket = -1;
  for (let i = openBracket + 1; i < text.length; i++) {
    if (text[i] === ']') {
      closeBracket = i;
      break;
    } else if (text[i] === '[') {
      // Found another opening bracket, not in a complete chord
      break;
    }
  }

  // Check if cursor is within the chord brackets
  if (closeBracket !== -1 && cursorPosition <= closeBracket) {
    const chordText = text.substring(openBracket + 1, closeBracket);
    return {
      isInChord: true,
      chordStart: openBracket + 1,
      chordEnd: closeBracket,
      chordText,
    };
  }

  // Cursor is after opening bracket but no closing bracket yet
  if (cursorPosition > openBracket) {
    const chordText = text.substring(openBracket + 1, cursorPosition);
    return {
      isInChord: true,
      chordStart: openBracket + 1,
      chordEnd: cursorPosition,
      chordText,
    };
  }

  return { isInChord: false };
}

/**
 * Chromatic scale for chord transposition
 */
const CHROMATIC_SCALE = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

/**
 * Enharmonic equivalents mapping (flats to sharps)
 */
const ENHARMONIC_MAP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/**
 * Parse a chord name into root note and modifiers
 */
function parseChord(chord: string): { root: string; modifiers: string } {
  const trimmed = chord.trim();
  if (!trimmed) return { root: '', modifiers: '' };

  // Handle flat notes (e.g., Bb, Db)
  if (trimmed.length >= 2 && trimmed[1] === 'b') {
    return {
      root: trimmed.substring(0, 2),
      modifiers: trimmed.substring(2),
    };
  }

  // Handle sharp notes (e.g., C#, F#)
  if (trimmed.length >= 2 && trimmed[1] === '#') {
    return {
      root: trimmed.substring(0, 2),
      modifiers: trimmed.substring(2),
    };
  }

  // Handle natural notes (e.g., C, D, E)
  return {
    root: trimmed.substring(0, 1),
    modifiers: trimmed.substring(1),
  };
}

/**
 * Transpose a single chord by a given number of semitones
 */
export function transposeChord(chord: string, semitones: number): string {
  if (!chord || !isValidChord(chord)) {
    return chord; // Return unchanged if invalid
  }

  const { root, modifiers } = parseChord(chord);

  // Convert flat to sharp for easier processing
  const normalizedRoot = ENHARMONIC_MAP[root] || root;

  // Find current position in chromatic scale
  const currentIndex = CHROMATIC_SCALE.indexOf(normalizedRoot);
  if (currentIndex === -1) {
    return chord; // Return unchanged if root note not found
  }

  // Calculate new position (handle negative transposition and wrap around)
  let newIndex = (currentIndex + semitones) % 12;
  if (newIndex < 0) {
    newIndex += 12;
  }

  const newRoot = CHROMATIC_SCALE[newIndex];
  return newRoot + modifiers;
}

/**
 * Transpose all chords in ChordPro content by a given number of semitones
 */
export function transposeChordProContent(
  content: string,
  semitones: number
): string {
  if (!content || semitones === 0) {
    return content;
  }

  // Regular expression to find chord notation in ChordPro format [ChordName]
  const chordPattern = /\[([^\]]+)\]/g;

  return content.replace(chordPattern, (_match, chordName) => {
    const transposedChord = transposeChord(chordName, semitones);
    return `[${transposedChord}]`;
  });
}
