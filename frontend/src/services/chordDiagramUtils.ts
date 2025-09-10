/**
 * Chord Diagram Utility (...args: unknown[]) => unknowns
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
  ChordDiagramMetadata,
  ChordType,
  FretRange,
  SortOption,
  ChordDiagramSearchCriteria,
  ChordDiagramSearchResult,
  ChordDiagramSearchOptions,
  ChordDiagramSearchResults
} from '../types/chordDiagram';

// Import fuzzy search functionality from chordService
import { calculateFuzzyScore } from './chordService';

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
    finger: finger as unknown,
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
  tuning: string[],
  instrument?: InstrumentType
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

  // Determine if this is standard tuning
  const isStandardTuning = instrument ? 
    isStandardTuningForInstrument(tuning, instrument) : 
    true;

  return {
    root,
    notes: uniqueNotes,
    intervals,
    isStandardTuning
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
      finger: finger as unknown
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
          optimized[index].finger = fingerCounter as unknown;
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
        optimized[index].finger = fingerCounter as unknown;
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
      finger: finger as unknown
    });
  }

  return optimizeFingerAssignments(positions);
}

/**
 * Determine fret range type for a chord diagram
 */
function getFretRange(diagram: ChordDiagram): FretRange {
  const maxFret = Math.max(...diagram.positions.map(p => p.fret));
  const minFret = Math.min(...diagram.positions.filter(p => p.fret > 0).map(p => p.fret));
  
  if (diagram.barre) return 'barre';
  if (maxFret <= 3) return 'open';
  if (minFret >= 5) return 'high';
  return 'custom';
}

/**
 * Calculate relevance score for a chord diagram
 */
function calculateRelevanceScore(diagram: ChordDiagram, criteria: ChordDiagramSearchCriteria): number {
  let score = 0;
  
  // Name matching score
  if (criteria.name) {
    if (criteria.fuzzySearch) {
      score += calculateFuzzyScore(criteria.name, diagram.name);
    } else {
      const name = diagram.name.toLowerCase();
      const searchName = criteria.name.toLowerCase();
      if (name === searchName) score += 100;
      else if (name.startsWith(searchName)) score += 80;
      else if (name.includes(searchName)) score += 60;
    }
  }
  
  // Exact matches get bonus points
  if (criteria.instrument && diagram.instrument.type === criteria.instrument) score += 10;
  if (criteria.difficulty && criteria.difficulty.includes(diagram.difficulty)) score += 10;
  
  // Popularity score
  score += (diagram.metadata.popularityScore || 0) * 20;
  
  // Verified diagrams get bonus
  if (diagram.metadata.isVerified) score += 5;
  
  return Math.min(score, 100); // Cap at 100
}

/**
 * Sort chord diagrams by specified option
 */
function sortChordDiagrams(
  results: ChordDiagramSearchResult[], 
  sortBy: SortOption, 
  direction: 'asc' | 'desc' = 'desc'
): ChordDiagramSearchResult[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  
  return results.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'relevance':
        comparison = a.score - b.score;
        break;
      case 'alphabetical':
        comparison = a.diagram.name.localeCompare(b.diagram.name);
        break;
      case 'difficulty':
        const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'expert': 4 };
        comparison = difficultyOrder[a.diagram.difficulty] - difficultyOrder[b.diagram.difficulty];
        break;
      case 'popularity':
        comparison = (a.diagram.metadata.popularityScore || 0) - (b.diagram.metadata.popularityScore || 0);
        break;
      case 'fretPosition':
        const aMaxFret = Math.max(...a.diagram.positions.map(p => p.fret));
        const bMaxFret = Math.max(...b.diagram.positions.map(p => p.fret));
        comparison = aMaxFret - bMaxFret;
        break;
      default:
        comparison = a.score - b.score;
    }
    
    return comparison * multiplier;
  });
}

/**
 * Enhanced search chord diagrams with advanced filtering, sorting, and pagination
 */
export function searchChordDiagramsAdvanced(
  diagrams: ChordDiagram[],
  options: ChordDiagramSearchOptions
): ChordDiagramSearchResults {
  const {
    criteria,
    sortBy = 'relevance',
    sortDirection = 'desc',
    page = 0,
    pageSize = 20,
    maxResults = 1000
  } = options;
  
  // Default fuzzy search settings
  const fuzzySearch = criteria.fuzzySearch ?? true;
  const fuzzyThreshold = criteria.fuzzyThreshold ?? 30;
  
  // Filter diagrams
  const filteredResults: ChordDiagramSearchResult[] = [];
  
  for (const diagram of diagrams) {
    let matches = true;
    let matchReason = '';
    let score = 0;
    
    // Name filter
    if (criteria.name) {
      if (fuzzySearch) {
        score = calculateFuzzyScore(criteria.name, diagram.name);
        if (score < fuzzyThreshold) {
          matches = false;
        } else {
          matchReason = `Name match (${score}% similarity)`;
        }
      } else {
        const nameMatch = diagram.name.toLowerCase().includes(criteria.name.toLowerCase());
        if (!nameMatch) {
          matches = false;
        } else {
          matchReason = 'Name contains search term';
          score = 80;
        }
      }
    }
    
    // Instrument filter
    if (matches && criteria.instrument && diagram.instrument.type !== criteria.instrument) {
      matches = false;
    }
    
    // Difficulty filter
    if (matches && criteria.difficulty && !criteria.difficulty.includes(diagram.difficulty)) {
      matches = false;
    }
    
    // Chord type filter
    if (matches && criteria.chordType) {
      const diagramChordType = extractChordType(diagram.name);
      if (!criteria.chordType.includes(diagramChordType)) {
        matches = false;
      }
    }
    
    // Fret range filters
    if (matches && (criteria.maxFret !== undefined || criteria.minFret !== undefined)) {
      const maxFret = Math.max(...diagram.positions.map(p => p.fret));
      const minFret = Math.min(...diagram.positions.filter(p => p.fret > 0).map(p => p.fret));
      
      if (criteria.maxFret !== undefined && maxFret > criteria.maxFret) {
        matches = false;
      }
      if (criteria.minFret !== undefined && minFret < criteria.minFret) {
        matches = false;
      }
    }
    
    // Fret range type filter
    if (matches && criteria.fretRange) {
      const diagramFretRange = getFretRange(diagram);
      if (diagramFretRange !== criteria.fretRange) {
        matches = false;
      }
    }
    
    // Barre filter
    if (matches && criteria.includeBarre === true && !diagram.barre) {
      matches = false;
    }
    if (matches && criteria.includeBarre === false && diagram.barre) {
      matches = false;
    }
    
    // Tags filter
    if (matches && criteria.tags && criteria.tags.length > 0) {
      const hasMatchingTag = criteria.tags.some(tag => 
        diagram.metadata.tags.some(diagramTag => 
          diagramTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) {
        matches = false;
      }
    }
    
    // Popularity filter
    if (matches && criteria.minPopularity !== undefined) {
      const popularity = diagram.metadata.popularityScore || 0;
      if (popularity < criteria.minPopularity) {
        matches = false;
      }
    }
    
    if (matches) {
      // Calculate final relevance score
      if (score === 0) {
        score = calculateRelevanceScore(diagram, criteria);
      }
      
      if (!matchReason) {
        matchReason = 'Matches all criteria';
      }
      
      filteredResults.push({
        diagram,
        score,
        matchReason
      });
    }
  }
  
  // Sort results
  const sortedResults = sortChordDiagrams(filteredResults, sortBy, sortDirection);
  
  // Apply max results limit
  const limitedResults = sortedResults.slice(0, maxResults);
  
  // Calculate pagination
  const totalCount = limitedResults.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const paginatedResults = limitedResults.slice(startIndex, endIndex);
  
  return {
    results: paginatedResults,
    totalCount,
    page,
    pageSize,
    totalPages,
    criteria,
    sortBy,
    sortDirection
  };
}

/**
 * Legacy search function for backward compatibility
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
  const searchOptions: ChordDiagramSearchOptions = {
    criteria: {
      ...criteria,
      fuzzySearch: false // Legacy behavior was exact matching
    },
    sortBy: 'relevance',
    maxResults: 1000
  };
  
  const results = searchChordDiagramsAdvanced(diagrams, searchOptions);
  return results.results.map(result => result.diagram);
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
 * Extract chord quality/type from chord name
 */
export function extractChordType(chordName: string): ChordType {
  const originalName = chordName;
  const name = chordName.toLowerCase();
  
  // Check for specific patterns in order of specificity
  if (name.includes('maj7')) return 'maj7';
  if (originalName.includes('M7')) return 'maj7'; // Check for uppercase M7
  if (name.includes('min7')) return 'min7';
  if (name.includes('m7') && !name.includes('maj7')) return 'min7';
  if (name.includes('sus2')) return 'sus2';
  if (name.includes('sus4')) return 'sus4';
  if (name.includes('dim')) return 'dim';
  if (name.includes('aug') || name.includes('+')) return 'aug';
  if (name.includes('add9')) return 'add9';
  if (name.includes('13')) return '13th';
  if (name.includes('11')) return '11th';
  if (name.includes('9')) return '9th';
  if (name.includes('7')) return '7th';
  if (name.includes('m') && !name.includes('maj')) return 'minor';
  if (name.match(/^[a-g][#b]?5$/)) return 'power'; // Power chords like C5, F#5
  
  return 'major'; // Default to major
}

/**
 * Helper function to extract chord quality from chord name (legacy compatibility)
 */
function extractChordQuality(chordName: string): string {
  const chordType = extractChordType(chordName);
  
  // Map new types to legacy strings for backward compatibility
  switch (chordType) {
    case 'minor': return 'minor';
    case 'dim': return 'diminished';
    case 'aug': return 'augmented';
    case 'sus2':
    case 'sus4': return 'suspended';
    case '7th':
    case 'maj7':
    case 'min7':
    case '9th':
    case '11th':
    case '13th': return 'seventh';
    case 'power': return 'power';
    default: return 'major';
  }
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
 * Check if a tuning matches the standard tuning for an instrument
 */
function isStandardTuningForInstrument(tuning: string[], instrument: InstrumentType): boolean {
  const standardTuning = INSTRUMENT_CONFIGS[instrument].standardTuning;
  if (tuning.length !== standardTuning.length) return false;
  
  return tuning.every((note, index) => {
    const standardNote = standardTuning[index];
    return normalizeNote(note) === normalizeNote(standardNote);
  });
}

/**
 * Normalize note (convert flats to sharps for comparison)
 */
function normalizeNote(note: string): string {
  const flatToSharp: { [key: string]: string } = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };
  return flatToSharp[note] || note;
}

/**
 * Create chord diagram with custom tuning
 */
export function createChordDiagramWithTuning(
  name: string,
  instrument: InstrumentType,
  positions: StringPosition[],
  tuning: string[],
  difficulty: DifficultyLevel = 'intermediate'
): ChordDiagram {
  const diagram = createChordDiagram(name, instrument, positions);
  
  // Update instrument config with custom tuning
  diagram.instrument = {
    ...diagram.instrument,
    standardTuning: tuning
  };
  
  // Recalculate notes with the custom tuning
  diagram.notes = calculateNotesFromPositions(positions, tuning, instrument);
  diagram.difficulty = difficulty;
  
  return diagram;
}

/**
 * Convert chord diagram to different tuning
 */
export function transposeChordDiagramToTuning(
  diagram: ChordDiagram,
  targetTuning: string[],
  options: {
    allowCapo?: boolean;
    maxCapoPosition?: number;
  } = {}
): ChordDiagram | null {
  const { allowCapo = true, maxCapoPosition = 7 } = options;
  
  // Get the current tuning
  const currentTuning = diagram.instrument.standardTuning;
  
  // Calculate tuning differences
  const tuningDifferences = currentTuning.map((note, index) => {
    return calculateSemitoneDifference(note, targetTuning[index]);
  });

  // Convert positions
  const newPositions: StringPosition[] = diagram.positions.map((pos, index) => {
    if (pos.fret < 0) return pos; // Keep muted strings
    
    const adjustment = tuningDifferences[index];
    const newFret = pos.fret - adjustment;
    
    if (newFret < 0) {
      // Try with capo if allowed
      if (allowCapo && Math.abs(newFret) <= maxCapoPosition) {
        return { ...pos, fret: 0 }; // Will become open string with capo
      }
      return { ...pos, fret: -1, finger: -1 }; // Mute string
    }
    
    return { ...pos, fret: newFret };
  });

  // Create new diagram
  const newDiagram = createChordDiagramWithTuning(
    diagram.name,
    diagram.instrument.type,
    newPositions,
    targetTuning,
    diagram.difficulty
  );
  
  // Copy other properties
  newDiagram.description = diagram.description;
  newDiagram.alternatives = diagram.alternatives;
  newDiagram.localization = diagram.localization;
  
  return newDiagram;
}

/**
 * Calculate semitone difference between two notes
 */
function calculateSemitoneDifference(note1: string, note2: string): number {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const normalizedNote1 = normalizeNote(note1);
  const normalizedNote2 = normalizeNote(note2);
  
  const index1 = notes.indexOf(normalizedNote1);
  const index2 = notes.indexOf(normalizedNote2);
  
  if (index1 === -1 || index2 === -1) return 0;
  
  return (index2 - index1 + 12) % 12;
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