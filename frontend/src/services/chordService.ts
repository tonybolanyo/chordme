/**
 * Service for chord validation and autocomplete functionality
 */

import { CustomChord } from './autocompletionSettings';

// Comprehensive chord dictionary with 200+ common chords
const COMMON_CHORDS = [
  // Natural major chords
  'C', 'D', 'E', 'F', 'G', 'A', 'B',
  
  // Sharp major chords
  'C#', 'D#', 'F#', 'G#', 'A#',
  
  // Flat major chords  
  'Db', 'Eb', 'Gb', 'Ab', 'Bb',

  // Natural minor chords
  'Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'Gm',
  
  // Sharp minor chords
  'A#m', 'C#m', 'D#m', 'F#m', 'G#m',
  
  // Flat minor chords
  'Abm', 'Bbm', 'Dbm', 'Ebm', 'Gbm',

  // Dominant 7th chords - Natural
  'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7',
  
  // Dominant 7th chords - Sharp/Flat
  'C#7', 'D#7', 'F#7', 'G#7', 'A#7',
  'Db7', 'Eb7', 'Gb7', 'Ab7', 'Bb7',

  // Minor 7th chords - Natural
  'Am7', 'Bm7', 'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7',
  
  // Minor 7th chords - Sharp/Flat
  'A#m7', 'C#m7', 'D#m7', 'F#m7', 'G#m7',
  'Abm7', 'Bbm7', 'Dbm7', 'Ebm7', 'Gbm7',

  // Major 7th chords - Natural
  'Cmaj7', 'Dmaj7', 'Emaj7', 'Fmaj7', 'Gmaj7', 'Amaj7', 'Bmaj7',
  
  // Major 7th chords - Sharp/Flat
  'C#maj7', 'D#maj7', 'F#maj7', 'G#maj7', 'A#maj7',
  'Dbmaj7', 'Ebmaj7', 'Gbmaj7', 'Abmaj7', 'Bbmaj7',

  // Sus4 chords - Natural
  'Csus4', 'Dsus4', 'Esus4', 'Fsus4', 'Gsus4', 'Asus4', 'Bsus4',
  
  // Sus4 chords - Sharp/Flat
  'C#sus4', 'D#sus4', 'F#sus4', 'G#sus4', 'A#sus4',
  'Dbsus4', 'Ebsus4', 'Gbsus4', 'Absus4', 'Bbsus4',

  // Sus2 chords - Natural
  'Csus2', 'Dsus2', 'Esus2', 'Fsus2', 'Gsus2', 'Asus2', 'Bsus2',
  
  // Sus2 chords - Sharp/Flat
  'C#sus2', 'D#sus2', 'F#sus2', 'G#sus2', 'A#sus2',
  'Dbsus2', 'Ebsus2', 'Gbsus2', 'Absus2', 'Bbsus2',

  // Add9 chords
  'Cadd9', 'Dadd9', 'Eadd9', 'Fadd9', 'Gadd9', 'Aadd9', 'Badd9',
  'Amadd9', 'Bmadd9', 'Cmadd9', 'Dmadd9', 'Emadd9', 'Fmadd9', 'Gmadd9',

  // 9th chords
  'C9', 'D9', 'E9', 'F9', 'G9', 'A9', 'B9',
  'Cm9', 'Dm9', 'Em9', 'Fm9', 'Gm9', 'Am9', 'Bm9',

  // 6th chords
  'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6',
  'Am6', 'Bm6', 'Cm6', 'Dm6', 'Em6', 'Fm6', 'Gm6',

  // Diminished chords - Natural
  'Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim',
  
  // Diminished chords - Sharp/Flat
  'C#dim', 'D#dim', 'F#dim', 'G#dim', 'A#dim',
  'Dbdim', 'Ebdim', 'Gbdim', 'Abdim', 'Bbdim',

  // Half-diminished (m7b5) chords
  'Cm7b5', 'Dm7b5', 'Em7b5', 'Fm7b5', 'Gm7b5', 'Am7b5', 'Bm7b5',

  // Augmented chords - Natural
  'Caug', 'Daug', 'Eaug', 'Faug', 'Gaug', 'Aaug', 'Baug',
  
  // Augmented chords - Sharp/Flat
  'C#aug', 'D#aug', 'F#aug', 'G#aug', 'A#aug',
  'Dbaug', 'Ebaug', 'Gbaug', 'Abaug', 'Bbaug',

  // Common slash chords (inversions)
  'C/E', 'C/G', 'D/F#', 'D/A', 'E/G#', 'E/B', 
  'F/A', 'F/C', 'G/B', 'G/D', 'A/C#', 'A/E', 'B/D#', 'B/F#',
  
  // Minor slash chords
  'Am/C', 'Am/E', 'Bm/D', 'Bm/F#', 'Cm/Eb', 'Cm/G',
  'Dm/F', 'Dm/A', 'Em/G', 'Em/B', 'Fm/Ab', 'Fm/C', 'Gm/Bb', 'Gm/D',

  // 11th and 13th chords (common jazz extensions)
  'C11', 'D11', 'E11', 'F11', 'G11', 'A11', 'B11',
  'C13', 'D13', 'E13', 'F13', 'G13', 'A13', 'B13',

  // Power chords (5ths)
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C#5', 'D#5', 'F#5', 'G#5', 'A#5',
  'Db5', 'Eb5', 'Gb5', 'Ab5', 'Bb5',

  // Alternative chord notations
  'CM7', 'DM7', 'EM7', 'FM7', 'GM7', 'AM7', 'BM7', // Alternative major 7th notation
  'Cm(maj7)', 'Dm(maj7)', 'Em(maj7)', 'Fm(maj7)', 'Gm(maj7)', 'Am(maj7)', 'Bm(maj7)', // Minor major 7th
];

export interface ChordSuggestion {
  chord: string;
  isValid: boolean;
  score: number; // Relevance score for sorting
}

export interface DirectiveSuggestion {
  directive: string;
  description: string;
  example: string;
  category: 'metadata' | 'formatting' | 'chord' | 'verse' | 'advanced';
  score: number;
}

export type AutocompleteSuggestion = ChordSuggestion | DirectiveSuggestion;

// Common ChordPro directives
const CHORDPRO_DIRECTIVES = [
  // Metadata directives
  { directive: '{title}', description: 'Song title', example: '{title: Amazing Grace}', category: 'metadata' as const },
  { directive: '{subtitle}', description: 'Song subtitle', example: '{subtitle: Traditional Hymn}', category: 'metadata' as const },
  { directive: '{artist}', description: 'Artist or performer', example: '{artist: John Newton}', category: 'metadata' as const },
  { directive: '{composer}', description: 'Song composer', example: '{composer: John Newton}', category: 'metadata' as const },
  { directive: '{lyricist}', description: 'Lyric writer', example: '{lyricist: John Newton}', category: 'metadata' as const },
  { directive: '{album}', description: 'Album name', example: '{album: Hymns Collection}', category: 'metadata' as const },
  { directive: '{year}', description: 'Release year', example: '{year: 1779}', category: 'metadata' as const },
  { directive: '{key}', description: 'Song key', example: '{key: G}', category: 'chord' as const },
  { directive: '{time}', description: 'Time signature', example: '{time: 4/4}', category: 'metadata' as const },
  { directive: '{tempo}', description: 'Tempo marking', example: '{tempo: 120}', category: 'metadata' as const },
  { directive: '{capo}', description: 'Capo position', example: '{capo: 3}', category: 'chord' as const },
  
  // Formatting directives
  { directive: '{comment}', description: 'Comment line', example: '{comment: Play softly}', category: 'formatting' as const },
  { directive: '{c}', description: 'Comment (short)', example: '{c: Repeat 2x}', category: 'formatting' as const },
  { directive: '{highlight}', description: 'Highlight text', example: '{highlight: Important}', category: 'formatting' as const },
  
  // Verse structure directives
  { directive: '{start_of_chorus}', description: 'Begin chorus section', example: '{start_of_chorus}', category: 'verse' as const },
  { directive: '{end_of_chorus}', description: 'End chorus section', example: '{end_of_chorus}', category: 'verse' as const },
  { directive: '{soc}', description: 'Start of chorus (short)', example: '{soc}', category: 'verse' as const },
  { directive: '{eoc}', description: 'End of chorus (short)', example: '{eoc}', category: 'verse' as const },
  { directive: '{start_of_verse}', description: 'Begin verse section', example: '{start_of_verse}', category: 'verse' as const },
  { directive: '{end_of_verse}', description: 'End verse section', example: '{end_of_verse}', category: 'verse' as const },
  { directive: '{sov}', description: 'Start of verse (short)', example: '{sov}', category: 'verse' as const },
  { directive: '{eov}', description: 'End of verse (short)', example: '{eov}', category: 'verse' as const },
  { directive: '{start_of_bridge}', description: 'Begin bridge section', example: '{start_of_bridge}', category: 'verse' as const },
  { directive: '{end_of_bridge}', description: 'End bridge section', example: '{end_of_bridge}', category: 'verse' as const },
  { directive: '{sob}', description: 'Start of bridge (short)', example: '{sob}', category: 'verse' as const },
  { directive: '{eob}', description: 'End of bridge (short)', example: '{eob}', category: 'verse' as const },
  
  // Advanced directives
  { directive: '{define}', description: 'Define chord fingering', example: '{define: G 3 0 0 0 2 3}', category: 'advanced' as const },
  { directive: '{transpose}', description: 'Transpose chords', example: '{transpose: +2}', category: 'chord' as const },
  { directive: '{columns}', description: 'Set column layout', example: '{columns: 2}', category: 'formatting' as const },
  { directive: '{column_break}', description: 'Force column break', example: '{column_break}', category: 'formatting' as const },
  { directive: '{new_page}', description: 'Force page break', example: '{new_page}', category: 'formatting' as const },
  { directive: '{new_song}', description: 'Start new song', example: '{new_song}', category: 'formatting' as const },
  { directive: '{textfont}', description: 'Set text font', example: '{textfont: Arial}', category: 'formatting' as const },
  { directive: '{textsize}', description: 'Set text size', example: '{textsize: 12}', category: 'formatting' as const },
  { directive: '{chordfont}', description: 'Set chord font', example: '{chordfont: Times}', category: 'formatting' as const },
  { directive: '{chordsize}', description: 'Set chord size', example: '{chordsize: 10}', category: 'formatting' as const },
  { directive: '{grid}', description: 'Chord grid', example: '{grid: G C D G}', category: 'chord' as const },
  { directive: '{no_grid}', description: 'Disable chord grid', example: '{no_grid}', category: 'chord' as const },
];

/**
 * Enhanced chord validation using new chord recognition engine
 */
export function isValidChord(chord: string): boolean {
  if (!chord.trim()) {
    return false;
  }

  // Use enhanced chord recognition engine for improved validation
  // Fall back to original pattern for backward compatibility
  try {
    // Import dynamically to avoid circular dependencies
    const { chordRecognitionEngine } = require('./chordRecognition');
    return chordRecognitionEngine.isValidChord(chord.trim());
  } catch (error) {
    // Fallback to original regex pattern if enhanced engine fails
    const chordPattern =
      /^[A-G][#b]?[mM]?(?:maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?[0-9]*)?(?:\/[A-G][#b]?)?$/;
    return chordPattern.test(chord.trim());
  }
}

/**
 * Get directive suggestions based on partial input
 */
export function getDirectiveSuggestions(
  input: string,
  maxSuggestions: number = 10
): DirectiveSuggestion[] {
  const inputLower = input.toLowerCase().trim();

  if (!inputLower) {
    return [];
  }

  const suggestions: DirectiveSuggestion[] = [];

  // Find matching directives
  for (const item of CHORDPRO_DIRECTIVES) {
    const directiveLower = item.directive.toLowerCase();
    let score = 0;

    if (directiveLower === inputLower) {
      // Exact match gets highest score
      score = 100;
    } else if (directiveLower.includes(inputLower)) {
      // Check if input matches the directive name without braces
      const directiveNameOnly = item.directive.slice(1, -1).toLowerCase(); // Remove { and }
      if (directiveNameOnly === inputLower) {
        score = 100; // Exact directive name match
      } else if (directiveNameOnly.startsWith(inputLower)) {
        // Prefix match gets high score
        score = 90 - (directiveNameOnly.length - input.length) * 2;
      } else if (directiveLower.startsWith(inputLower)) {
        // Prefix match with braces gets good score
        score = 85 - (item.directive.length - input.length) * 2;
      } else {
        // Contains match gets lower score
        score = 50 - (item.directive.length - input.length);
      }
    }

    if (score > 0) {
      suggestions.push({
        ...item,
        score,
      });
    }
  }

  // Sort by score (highest first) and return top suggestions
  return suggestions.sort((a, b) => b.score - a.score).slice(0, maxSuggestions);
}

/**
 * Enhanced fuzzy matching algorithm using Levenshtein distance and other metrics
 */
function calculateFuzzyScore(input: string, target: string): number {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // Exact match gets highest score
  if (inputLower === targetLower) {
    return 100;
  }
  
  // Prefix match gets high score
  if (targetLower.startsWith(inputLower)) {
    return 90 - (target.length - input.length) * 2;
  }
  
  // Contains match gets good score
  if (targetLower.includes(inputLower)) {
    return 70 - (target.length - input.length);
  }
  
  // Calculate Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(inputLower, targetLower);
  const maxLength = Math.max(inputLower.length, targetLower.length);
  const similarity = 1 - (distance / maxLength);
  
  // Only consider as a match if similarity is above threshold
  if (similarity >= 0.6) {
    return Math.floor(similarity * 50); // Scale to 0-50 range
  }
  
  // Check for substring matches in reverse order
  if (input.length >= 2) {
    for (let i = 1; i < input.length; i++) {
      const substring = inputLower.substring(i);
      if (targetLower.includes(substring)) {
        return Math.max(10, 30 - i * 5); // Decreasing score for later substrings
      }
    }
  }
  
  return 0;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Get enhanced chord suggestions with custom chords and fuzzy matching
 */
export function getEnhancedChordSuggestions(
  input: string,
  customChords: CustomChord[] = [],
  maxSuggestions: number = 10
): ChordSuggestion[] {
  const inputTrimmed = input.trim();

  if (!inputTrimmed) {
    return [];
  }

  const suggestions: ChordSuggestion[] = [];
  
  // Add suggestions from common chords
  for (const chord of COMMON_CHORDS) {
    const score = calculateFuzzyScore(inputTrimmed, chord);
    if (score > 0) {
      suggestions.push({
        chord,
        isValid: isValidChord(chord),
        score,
      });
    }
  }
  
  // Add suggestions from custom chords (with slight score boost)
  for (const customChord of customChords) {
    const score = calculateFuzzyScore(inputTrimmed, customChord.name);
    if (score > 0) {
      suggestions.push({
        chord: customChord.name,
        isValid: true, // Custom chords are considered valid by definition
        score: score + 5, // Small boost for custom chords
      });
    }
  }

  // Sort by score (highest first) and return top suggestions
  return suggestions.sort((a, b) => b.score - a.score).slice(0, maxSuggestions);
}

/**
 * Get chord suggestions based on partial input (original function for backward compatibility)
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
 * Enhanced chord suggestions with context-aware filtering
 */
export function getContextAwareChordSuggestions(
  input: string,
  keySignature?: string,
  maxSuggestions: number = 10
): ChordSuggestion[] {
  const inputLower = input.toLowerCase().trim();

  if (!inputLower) {
    return [];
  }

  let suggestions: ChordSuggestion[] = getChordSuggestions(input, COMMON_CHORDS.length);

  // If we have a key signature, boost chords that are diatonic to that key
  if (keySignature) {
    const diatonicChords = getDiatonicChords(keySignature);
    suggestions = suggestions.map(suggestion => {
      if (diatonicChords.includes(suggestion.chord)) {
        return { ...suggestion, score: suggestion.score + 20 }; // Boost diatonic chords
      }
      return suggestion;
    });
  }

  // Sort by enhanced score and return top suggestions
  return suggestions.sort((a, b) => b.score - a.score).slice(0, maxSuggestions);
}

/**
 * Get diatonic chords for a given key signature
 */
function getDiatonicChords(key: string): string[] {
  const keyUpper = key.toUpperCase().trim();
  
  // Major key diatonic chord progressions (I, ii, iii, IV, V, vi, vii°)
  const majorKeys: Record<string, string[]> = {
    'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
    'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
    'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
    'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
    'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
    'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
    'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'],
    'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
    'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
    'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
    'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'],
    'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim'],
  };

  // Minor key diatonic chord progressions (i, ii°, III, iv, v, VI, VII)
  const minorKeys: Record<string, string[]> = {
    'AM': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
    'EM': ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
    'BM': ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A'],
    'F#M': ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E'],
    'C#M': ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B'],
    'G#M': ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#'],
    'DM': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'],
    'GM': ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F'],
    'CM': ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'],
    'FM': ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'],
    'BBM': ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab'],
  };

  return majorKeys[keyUpper] || minorKeys[keyUpper] || [];
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
 * Detect if cursor is inside directive braces and return directive info
 */
export function detectDirectiveInput(
  text: string,
  cursorPosition: number
): {
  isInDirective: boolean;
  directiveStart?: number;
  directiveEnd?: number;
  directiveText?: string;
} {
  if (cursorPosition < 0 || cursorPosition > text.length) {
    return { isInDirective: false };
  }

  // Find the nearest opening brace before cursor
  let openBrace = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (text[i] === '{') {
      openBrace = i;
      break;
    } else if (text[i] === '}') {
      // Found closing brace first, not in a directive
      break;
    }
  }

  if (openBrace === -1) {
    return { isInDirective: false };
  }

  // Find the closing brace after the opening brace
  let closeBrace = -1;
  for (let i = openBrace + 1; i < text.length; i++) {
    if (text[i] === '}') {
      closeBrace = i;
      break;
    } else if (text[i] === '{') {
      // Found another opening brace, not in a complete directive
      break;
    }
  }

  // Check if cursor is within the directive braces
  if (closeBrace !== -1 && cursorPosition <= closeBrace) {
    const directiveText = text.substring(openBrace + 1, closeBrace);
    return {
      isInDirective: true,
      directiveStart: openBrace + 1,
      directiveEnd: closeBrace,
      directiveText,
    };
  }

  // Cursor is after opening brace but no closing brace yet
  if (cursorPosition > openBrace) {
    const directiveText = text.substring(openBrace + 1, cursorPosition);
    return {
      isInDirective: true,
      directiveStart: openBrace + 1,
      directiveEnd: cursorPosition,
      directiveText,
    };
  }

  return { isInDirective: false };
}

/**
 * Detect input type and context (chord, directive, or neither)
 */
export function detectInputContext(
  text: string,
  cursorPosition: number
): {
  type: 'chord' | 'directive' | 'none';
  inputText?: string;
  start?: number;
  end?: number;
  keySignature?: string; // Extracted key signature for context-aware suggestions
} {
  // Check for directive input first
  const directiveInfo = detectDirectiveInput(text, cursorPosition);
  if (directiveInfo.isInDirective) {
    return {
      type: 'directive',
      inputText: directiveInfo.directiveText,
      start: directiveInfo.directiveStart,
      end: directiveInfo.directiveEnd,
    };
  }

  // Check for chord input
  const chordInfo = detectChordInput(text, cursorPosition);
  if (chordInfo.isInChord) {
    // Try to extract key signature from the content for context-aware suggestions
    const keySignature = extractKeySignature(text);
    
    return {
      type: 'chord',
      inputText: chordInfo.chordText,
      start: chordInfo.chordStart,
      end: chordInfo.chordEnd,
      keySignature,
    };
  }

  return { type: 'none' };
}

/**
 * Extract key signature from ChordPro content
 */
function extractKeySignature(content: string): string | undefined {
  const keyPattern = /\{key\s*:\s*([A-G][#b]?m?)\s*\}/i;
  const match = content.match(keyPattern);
  return match ? match[1].trim() : undefined;
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
