/**
 * Chord Diagram Utility Functions
 * 
 * This module provides utility functions for creating, manipulating,
 * and working with chord diagram data structures.
 */

import {
  ChordDiagram,
  StringPosition,
  BarreChord,
  AlternativeFingering,
  ChordDiagramCollection,
  InstrumentType,
  InstrumentConfig,
  INSTRUMENT_CONFIGS,
  DifficultyLevel,
  ChordNotes,
  CHORD_INTERVALS,
  LocalizedChordInfo,
  ChordDiagramMetadata
} from '../types/chordDiagram';

/**
 * Create a new chord diagram with default values
 */
export function createChordDiagram(
  name: string,
  instrument: InstrumentType,
  positions: StringPosition[]
): ChordDiagram {
  const id = generateChordDiagramId(name, instrument);
  const instrumentConfig = INSTRUMENT_CONFIGS[instrument];
  
  return {
    id,
    name,
    instrument: instrumentConfig,
    positions,
    difficulty: 'intermediate',
    alternatives: [],
    notes: {
      root: extractRootNote(name),
      notes: [],
      intervals: [],
      isStandardTuning: true
    },
    localization: {
      names: { en: name },
      descriptions: { en: `${name} chord for ${instrument}` },
      fingeringInstructions: { en: 'Standard fingering' }
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'user-created',
      popularityScore: 0.5,
      isVerified: false,
      tags: [instrument, extractChordQuality(name)]
    }
  };
}

/**
 * Generate a unique ID for a chord diagram
 */
export function generateChordDiagramId(name: string, instrument: InstrumentType): string {
  const cleanName = name.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  const timestamp = Date.now().toString(36);
  return `${instrument}_${cleanName}_${timestamp}`;
}

/**
 * Clone a chord diagram
 */
export function cloneChordDiagram(diagram: ChordDiagram): ChordDiagram {
  return JSON.parse(JSON.stringify(diagram));
}

/**
 * Transpose a chord diagram by semitones
 */
export function transposeChordDiagram(diagram: ChordDiagram, semitones: number): ChordDiagram {
  if (semitones === 0) return diagram;

  const transposed = cloneChordDiagram(diagram);
  
  // Transpose the chord name
  transposed.name = transposeChordName(diagram.name, semitones);
  
  // Update the root note
  transposed.notes.root = transposeNote(diagram.notes.root, semitones);
  
  // Transpose all notes
  transposed.notes.notes = diagram.notes.notes.map(note => transposeNote(note, semitones));
  
  // Update localized names
  Object.keys(transposed.localization.names).forEach(locale => {
    transposed.localization.names[locale] = transposeChordName(
      diagram.localization.names[locale], 
      semitones
    );
  });

  // Update ID to reflect the transposition
  transposed.id = generateChordDiagramId(transposed.name, diagram.instrument.type);
  
  // Update metadata
  transposed.metadata.updatedAt = new Date().toISOString();
  
  return transposed;
}

/**
 * Add alternative fingering to a chord diagram
 */
export function addAlternativeFingering(
  diagram: ChordDiagram,
  positions: StringPosition[],
  description: string,
  difficulty: DifficultyLevel = 'intermediate',
  barre?: BarreChord
): ChordDiagram {
  const updated = cloneChordDiagram(diagram);
  
  const alternative: AlternativeFingering = {
    id: `${diagram.id}_alt_${updated.alternatives.length + 1}`,
    description,
    positions,
    barre,
    difficulty,
    notes: `Alternative fingering: ${description}`
  };
  
  updated.alternatives.push(alternative);
  updated.metadata.updatedAt = new Date().toISOString();
  
  return updated;
}

/**
 * Create a barre chord from string positions
 */
export function createBarreChord(
  fret: number,
  finger: number,
  startString: number,
  endString: number,
  isPartial: boolean = false
): BarreChord {
  return {
    fret,
    finger: finger as any,
    startString,
    endString,
    isPartial
  };
}

/**
 * Convert string positions to include barre information
 */
export function applyBarreToPositions(
  positions: StringPosition[],
  barre: BarreChord
): StringPosition[] {
  return positions.map(position => {
    if (position.stringNumber >= barre.startString && 
        position.stringNumber <= barre.endString &&
        position.fret === barre.fret) {
      return {
        ...position,
        finger: barre.finger,
        isBarre: true,
        barreSpan: barre.endString - barre.startString + 1
      };
    }
    return position;
  });
}

/**
 * Calculate notes from string positions and tuning
 */
export function calculateNotesFromPositions(
  positions: StringPosition[],
  tuning: string[]
): ChordNotes {
  const notes: string[] = [];
  
  positions.forEach(position => {
    if (position.fret >= 0 && position.stringNumber <= tuning.length) {
      const openNote = tuning[position.stringNumber - 1];
      const frettedNote = transposeNote(openNote, position.fret);
      notes.push(frettedNote);
    }
  });

  // Remove duplicates and sort
  const uniqueNotes = Array.from(new Set(notes));
  
  // Determine root note (lowest note typically)
  const root = uniqueNotes[0] || 'C';
  
  // Calculate intervals (simplified)
  const intervals = uniqueNotes.map(note => 
    calculateInterval(root, note)
  );

  return {
    root,
    notes: uniqueNotes,
    intervals,
    isStandardTuning: true // Could be determined by comparing to standard tuning
  };
}

/**
 * Create string positions from a simplified fingering pattern
 */
export function createStringPositionsFromPattern(
  pattern: (number | 'x')[], // Array of fret numbers or 'x' for muted
  instrument: InstrumentType
): StringPosition[] {
  const config = INSTRUMENT_CONFIGS[instrument];
  const positions: StringPosition[] = [];

  pattern.forEach((fret, index) => {
    if (index >= config.stringCount) return;

    const stringNumber = index + 1;
    let fretNumber: number;
    let finger: number;

    if (fret === 'x') {
      fretNumber = -1;
      finger = -1;
    } else if (fret === 0) {
      fretNumber = 0;
      finger = 0;
    } else {
      fretNumber = fret as number;
      finger = 1; // Default finger assignment, should be optimized
    }

    positions.push({
      stringNumber,
      fret: fretNumber,
      finger: finger as any
    });
  });

  return positions;
}

/**
 * Optimize finger assignments for a chord
 */
export function optimizeFingerAssignments(positions: StringPosition[]): StringPosition[] {
  const frettedPositions = positions
    .filter(p => p.fret > 0)
    .sort((a, b) => a.fret - b.fret);

  if (frettedPositions.length === 0) return positions;

  // Simple finger assignment algorithm
  const optimized = [...positions];
  let fingerCounter = 1;

  // Group by fret for potential barres
  const fretGroups = new Map<number, StringPosition[]>();
  frettedPositions.forEach(pos => {
    if (!fretGroups.has(pos.fret)) {
      fretGroups.set(pos.fret, []);
    }
    fretGroups.get(pos.fret)!.push(pos);
  });

  // Assign fingers, considering barres
  for (const [fret, positions] of fretGroups.entries()) {
    if (positions.length > 1) {
      // Potential barre
      positions.forEach(pos => {
        const index = optimized.findIndex(p => 
          p.stringNumber === pos.stringNumber && p.fret === pos.fret
        );
        if (index >= 0) {
          optimized[index].finger = fingerCounter as any;
          optimized[index].isBarre = true;
          optimized[index].barreSpan = positions.length;
        }
      });
    } else {
      // Single note
      const pos = positions[0];
      const index = optimized.findIndex(p => 
        p.stringNumber === pos.stringNumber && p.fret === pos.fret
      );
      if (index >= 0) {
        optimized[index].finger = fingerCounter as any;
      }
    }
    fingerCounter++;
  }

  return optimized;
}

/**
 * Convert chord diagram to a simplified tablature string
 */
export function chordDiagramToTab(diagram: ChordDiagram): string {
  const positions = new Array(diagram.instrument.stringCount).fill('x');
  
  diagram.positions.forEach(pos => {
    if (pos.stringNumber <= positions.length) {
      if (pos.fret === -1) {
        positions[pos.stringNumber - 1] = 'x';
      } else {
        positions[pos.stringNumber - 1] = pos.fret.toString();
      }
    }
  });

  return positions.join('');
}

/**
 * Parse a tablature string into string positions
 */
export function tabToStringPositions(
  tab: string,
  instrument: InstrumentType
): StringPosition[] {
  const config = INSTRUMENT_CONFIGS[instrument];
  const positions: StringPosition[] = [];

  for (let i = 0; i < Math.min(tab.length, config.stringCount); i++) {
    const char = tab[i];
    let fret: number;
    let finger: number;

    if (char === 'x' || char === 'X') {
      fret = -1;
      finger = -1;
    } else if (char === '0') {
      fret = 0;
      finger = 0;
    } else {
      const fretNum = parseInt(char, 10);
      if (isNaN(fretNum)) continue;
      fret = fretNum;
      finger = 1; // Default, should be optimized
    }

    positions.push({
      stringNumber: i + 1,
      fret,
      finger: finger as any
    });
  }

  return optimizeFingerAssignments(positions);
}

/**
 * Search chord diagrams by criteria
 */
export function searchChordDiagrams(
  diagrams: ChordDiagram[],
  criteria: {
    name?: string;
    instrument?: InstrumentType;
    difficulty?: DifficultyLevel[];
    maxFret?: number;
    includeBarre?: boolean;
  }
): ChordDiagram[] {
  return diagrams.filter(diagram => {
    // Name filter
    if (criteria.name && !diagram.name.toLowerCase().includes(criteria.name.toLowerCase())) {
      return false;
    }

    // Instrument filter
    if (criteria.instrument && diagram.instrument.type !== criteria.instrument) {
      return false;
    }

    // Difficulty filter
    if (criteria.difficulty && !criteria.difficulty.includes(diagram.difficulty)) {
      return false;
    }

    // Max fret filter
    if (criteria.maxFret !== undefined) {
      const maxFret = Math.max(...diagram.positions.map(p => p.fret));
      if (maxFret > criteria.maxFret) {
        return false;
      }
    }

    // Barre filter
    if (criteria.includeBarre === false && diagram.barre) {
      return false;
    }

    return true;
  });
}

/**
 * Group chord diagrams by chord name
 */
export function groupChordDiagramsByName(diagrams: ChordDiagram[]): Map<string, ChordDiagram[]> {
  const groups = new Map<string, ChordDiagram[]>();

  diagrams.forEach(diagram => {
    const name = diagram.name;
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name)!.push(diagram);
  });

  return groups;
}

/**
 * Create a chord diagram collection
 */
export function createChordDiagramCollection(
  name: string,
  description: string,
  instrument: InstrumentType,
  diagrams: ChordDiagram[] = []
): ChordDiagramCollection {
  return {
    id: `collection_${instrument}_${Date.now()}`,
    name,
    description,
    instrument,
    diagrams,
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Helper function to extract root note from chord name
 */
function extractRootNote(chordName: string): string {
  const match = chordName.match(/^([A-G][#b]?)/);
  return match ? match[1] : 'C';
}

/**
 * Helper function to extract chord quality from chord name
 */
function extractChordQuality(chordName: string): string {
  if (chordName.includes('m') && !chordName.includes('maj')) return 'minor';
  if (chordName.includes('dim')) return 'diminished';
  if (chordName.includes('aug')) return 'augmented';
  if (chordName.includes('sus')) return 'suspended';
  if (chordName.includes('7')) return 'seventh';
  return 'major';
}

/**
 * Simple note transposition (simplified for this example)
 */
function transposeNote(note: string, semitones: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const currentIndex = notes.indexOf(note.replace('b', '#'));
  if (currentIndex === -1) return note;
  
  const newIndex = (currentIndex + semitones + 12) % 12;
  return notes[newIndex];
}

/**
 * Simple chord name transposition
 */
function transposeChordName(chordName: string, semitones: number): string {
  const rootNote = extractRootNote(chordName);
  const suffix = chordName.replace(rootNote, '');
  const transposedRoot = transposeNote(rootNote, semitones);
  return transposedRoot + suffix;
}

/**
 * Calculate interval between two notes (simplified)
 */
function calculateInterval(root: string, note: string): string {
  // This is a simplified interval calculation
  // In a real implementation, this would be more sophisticated
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = notes.indexOf(root);
  const noteIndex = notes.indexOf(note);
  
  if (rootIndex === -1 || noteIndex === -1) return '1';
  
  const semitones = (noteIndex - rootIndex + 12) % 12;
  const intervalMap: { [key: number]: string } = {
    0: '1',
    1: 'b2',
    2: '2',
    3: 'b3',
    4: '3',
    5: '4',
    6: 'b5',
    7: '5',
    8: 'b6',
    9: '6',
    10: 'b7',
    11: '7'
  };
  
  return intervalMap[semitones] || '1';
}