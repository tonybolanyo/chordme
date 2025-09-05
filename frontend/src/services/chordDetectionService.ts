/**
 * Chord Detection Service for Editor Integration
 * 
 * This service detects and analyzes chords within ChordPro content for
 * real-time chord diagram display and editor integration.
 */

import { chordRecognitionEngine } from './chordRecognition';
import { ChordDiagram } from '../types/chordDiagram';

export interface ChordPosition {
  /** The chord symbol (e.g., 'C', 'Am7') */
  chord: string;
  /** Start position in the text */
  start: number;
  /** End position in the text */
  end: number;
  /** Line number (0-based) */
  line: number;
  /** Column position in the line (0-based) */
  column: number;
  /** Whether this is a valid chord */
  isValid: boolean;
}

export interface ChordDetectionResult {
  /** All chord positions found in the content */
  chords: ChordPosition[];
  /** Unique chord names found */
  uniqueChords: string[];
  /** Total number of chords detected */
  chordCount: number;
  /** Number of unique chords */
  uniqueChordCount: number;
}

export interface ChordAtCursor {
  /** The chord at cursor position, if any */
  chord?: ChordPosition;
  /** Nearby chords (within 50 characters) */
  nearbyChords: ChordPosition[];
  /** Suggested chords based on context */
  suggestedChords: string[];
}

/**
 * Detect all chords in ChordPro content
 */
export function detectChordsInContent(content: string): ChordDetectionResult {
  const chords: ChordPosition[] = [];
  const uniqueChordsSet = new Set<string>();
  
  if (!content) {
    return {
      chords: [],
      uniqueChords: [],
      chordCount: 0,
      uniqueChordCount: 0
    };
  }

  const lines = content.split('\n');
  let globalPosition = 0;

  lines.forEach((line, lineIndex) => {
    // Look for chord patterns: [ChordName] - only match complete brackets
    const chordPattern = /\[([^\[\]]+)\]/g;
    let match;

    while ((match = chordPattern.exec(line)) !== null) {
      const fullMatch = match[0]; // [C] or [Am7]
      const chordName = match[1].trim(); // C or Am7 (trimmed)
      const startPos = match.index;
      const endPos = match.index + fullMatch.length;

      // Validate the chord using the recognition engine
      const isValid = chordRecognitionEngine.isValidChord(chordName);

      const chordPosition: ChordPosition = {
        chord: chordName,
        start: globalPosition + startPos,
        end: globalPosition + endPos,
        line: lineIndex,
        column: startPos,
        isValid
      };

      chords.push(chordPosition);
      
      if (isValid) {
        uniqueChordsSet.add(chordName);
      }
    }

    // Update global position for next line
    globalPosition += line.length + 1; // +1 for newline character
  });

  return {
    chords,
    uniqueChords: Array.from(uniqueChordsSet).sort(),
    chordCount: chords.length,
    uniqueChordCount: uniqueChordsSet.size
  };
}

/**
 * Get chord information at a specific cursor position
 */
export function getChordAtCursor(
  content: string, 
  cursorPosition: number
): ChordAtCursor {
  const detection = detectChordsInContent(content);
  
  // Find chord at exact cursor position
  const chordAtCursor = detection.chords.find(
    chord => cursorPosition >= chord.start && cursorPosition <= chord.end
  );

  // Find nearby chords (within 50 characters)
  const nearbyChords = detection.chords.filter(chord => {
    const distance = Math.min(
      Math.abs(chord.start - cursorPosition),
      Math.abs(chord.end - cursorPosition)
    );
    return distance <= 50 && chord !== chordAtCursor;
  });

  // Sort nearby chords by distance
  nearbyChords.sort((a, b) => {
    const distanceA = Math.min(
      Math.abs(a.start - cursorPosition),
      Math.abs(a.end - cursorPosition)
    );
    const distanceB = Math.min(
      Math.abs(b.start - cursorPosition),
      Math.abs(b.end - cursorPosition)
    );
    return distanceA - distanceB;
  });

  // Generate suggested chords based on context
  const suggestedChords = generateSuggestedChords(
    detection.uniqueChords,
    chordAtCursor?.chord
  );

  return {
    chord: chordAtCursor,
    nearbyChords: nearbyChords.slice(0, 5), // Limit to 5 nearby chords
    suggestedChords
  };
}

/**
 * Get all chords within a specific line range
 */
export function getChordsInRange(
  content: string,
  startLine: number,
  endLine: number
): ChordPosition[] {
  const detection = detectChordsInContent(content);
  
  return detection.chords.filter(chord => 
    chord.line >= startLine && chord.line <= endLine
  );
}

/**
 * Generate suggested chords based on musical context
 */
function generateSuggestedChords(
  existingChords: string[],
  currentChord?: string
): string[] {
  // Simple chord progression suggestions
  const suggestions: string[] = [];
  
  if (!currentChord && existingChords.length === 0) {
    // Default suggestions for empty content
    return ['C', 'G', 'Am', 'F', 'D', 'Em'];
  }

  if (currentChord) {
    // Suggest common progressions based on current chord
    const progressions: Record<string, string[]> = {
      'C': ['F', 'G', 'Am', 'Dm'],
      'G': ['C', 'D', 'Em', 'Am'],
      'Am': ['F', 'C', 'G', 'Dm'],
      'F': ['C', 'G', 'Am', 'Bb'],
      'D': ['G', 'A', 'Bm', 'Em'],
      'Em': ['Am', 'D', 'G', 'C'],
      'Dm': ['F', 'C', 'Bb', 'Gm'],
      'A': ['D', 'E', 'F#m', 'Bm'],
      'E': ['A', 'B', 'C#m', 'F#m'],
      'Bm': ['G', 'D', 'A', 'Em']
    };

    const currentSuggestions = progressions[currentChord] || [];
    suggestions.push(...currentSuggestions);
  }

  // Add common chords if not already present
  const commonChords = ['C', 'G', 'Am', 'F', 'D', 'Em', 'Dm', 'A', 'E', 'Bm'];
  commonChords.forEach(chord => {
    if (!suggestions.includes(chord) && !existingChords.includes(chord)) {
      suggestions.push(chord);
    }
  });

  // Remove duplicates and limit to 6 suggestions
  return [...new Set(suggestions)].slice(0, 6);
}

/**
 * Real-time chord detection hook for editor integration
 */
export function useChordDetection(content: string, cursorPosition?: number) {
  const detection = detectChordsInContent(content);
  const chordAtCursor = cursorPosition !== undefined 
    ? getChordAtCursor(content, cursorPosition)
    : { nearbyChords: [], suggestedChords: [] };

  return {
    ...detection,
    chordAtCursor: chordAtCursor.chord,
    nearbyChords: chordAtCursor.nearbyChords,
    suggestedChords: chordAtCursor.suggestedChords,
    
    // Utility functions
    getChordsInRange: (startLine: number, endLine: number) => 
      getChordsInRange(content, startLine, endLine),
    getChordAtPosition: (position: number) => 
      getChordAtCursor(content, position)
  };
}