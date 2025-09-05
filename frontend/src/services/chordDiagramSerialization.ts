/**
 * Chord Diagram Serialization/Deserialization Functions
 * 
 * This module provides functions for converting chord diagrams to and from
 * JSON format for storage and transmission.
 */

import {
  ChordDiagram,
  ChordDiagramCollection,
  StringPosition,
  BarreChord,
  AlternativeFingering,
  InstrumentConfig,
  INSTRUMENT_CONFIGS,
  InstrumentType
} from '../types/chordDiagram';

import { validateChordDiagram } from './chordDiagramValidation';

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Include SVG diagram in serialization */
  includeSvg?: boolean;
  /** Include metadata in serialization */
  includeMetadata?: boolean;
  /** Include alternative fingerings */
  includeAlternatives?: boolean;
  /** Compact format (minimal JSON) */
  compact?: boolean;
  /** Validate before serialization */
  validate?: boolean;
}

/**
 * Deserialization options
 */
export interface DeserializationOptions {
  /** Validate after deserialization */
  validate?: boolean;
  /** Strict mode (throw on validation errors) */
  strict?: boolean;
  /** Fill missing metadata with defaults */
  fillDefaults?: boolean;
}

/**
 * Serializable chord diagram format (for JSON storage)
 */
export interface SerializableChordDiagram {
  id: string;
  name: string;
  instrument: {
    type: InstrumentType;
    stringCount: number;
    standardTuning: string[];
  };
  positions: StringPosition[];
  barre?: BarreChord;
  difficulty: string;
  alternatives?: AlternativeFingering[];
  notes: {
    root: string;
    notes: string[];
    intervals: string[];
    isStandardTuning: boolean;
  };
  description?: string;
  localization: {
    names: Record<string, string>;
    descriptions: Record<string, string>;
    fingeringInstructions: Record<string, string>;
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    source: string;
    popularityScore: number;
    isVerified: boolean;
    tags: string[];
  };
  capoPosition?: number;
  svgDiagram?: string;
}

/**
 * Serialize a chord diagram to JSON string
 */
export function serializeChordDiagram(
  diagram: ChordDiagram,
  options: SerializationOptions = {}
): string {
  const {
    includeSvg = false,
    includeMetadata = true,
    includeAlternatives = true,
    compact = false,
    validate = true
  } = options;

  if (validate) {
    const validation = validateChordDiagram(diagram);
    if (!validation.isValid) {
      throw new Error(`Cannot serialize invalid chord diagram: ${validation.errors.map(e => e.message).join(', ')}`);
    }
  }

  const serializable: SerializableChordDiagram = {
    id: diagram.id,
    name: diagram.name,
    instrument: {
      type: diagram.instrument.type,
      stringCount: diagram.instrument.stringCount,
      standardTuning: diagram.instrument.standardTuning
    },
    positions: diagram.positions,
    difficulty: diagram.difficulty,
    notes: diagram.notes,
    localization: diagram.localization
  };

  // Optional fields
  if (diagram.barre) {
    serializable.barre = diagram.barre;
  }

  if (includeAlternatives && diagram.alternatives.length > 0) {
    serializable.alternatives = diagram.alternatives;
  }

  if (diagram.description) {
    serializable.description = diagram.description;
  }

  if (includeMetadata && diagram.metadata) {
    serializable.metadata = diagram.metadata;
  }

  if (diagram.capoPosition !== undefined) {
    serializable.capoPosition = diagram.capoPosition;
  }

  if (includeSvg && diagram.svgDiagram) {
    serializable.svgDiagram = diagram.svgDiagram;
  }

  return JSON.stringify(serializable, null, compact ? 0 : 2);
}

/**
 * Deserialize a chord diagram from JSON string
 */
export function deserializeChordDiagram(
  json: string,
  options: DeserializationOptions = {}
): ChordDiagram {
  const {
    validate = true,
    strict = false,
    fillDefaults = true
  } = options;

  let data: SerializableChordDiagram;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error}`);
  }

  // Validate required fields
  if (!data.id || !data.name || !data.instrument || !data.positions) {
    throw new Error('Missing required fields in chord diagram data');
  }

  // Build full instrument config
  const instrumentConfig: InstrumentConfig = {
    ...INSTRUMENT_CONFIGS[data.instrument.type],
    ...data.instrument
  };

  const diagram: ChordDiagram = {
    id: data.id,
    name: data.name,
    instrument: instrumentConfig,
    positions: data.positions,
    difficulty: data.difficulty as any,
    alternatives: data.alternatives || [],
    notes: data.notes,
    localization: data.localization,
    metadata: data.metadata || (fillDefaults ? createDefaultMetadata() : undefined as any)
  };

  // Optional fields
  if (data.barre) {
    diagram.barre = data.barre;
  }

  if (data.description) {
    diagram.description = data.description;
  }

  if (data.capoPosition !== undefined) {
    diagram.capoPosition = data.capoPosition;
  }

  if (data.svgDiagram) {
    diagram.svgDiagram = data.svgDiagram;
  }

  if (validate) {
    const validation = validateChordDiagram(diagram);
    if (!validation.isValid) {
      const message = `Invalid chord diagram data: ${validation.errors.map(e => e.message).join(', ')}`;
      if (strict) {
        throw new Error(message);
      } else {
        console.warn(message);
      }
    }
  }

  return diagram;
}

/**
 * Serialize a chord diagram collection to JSON string
 */
export function serializeChordDiagramCollection(
  collection: ChordDiagramCollection,
  options: SerializationOptions = {}
): string {
  const serializable = {
    ...collection,
    diagrams: collection.diagrams.map(diagram => 
      JSON.parse(serializeChordDiagram(diagram, options))
    )
  };

  return JSON.stringify(serializable, null, options.compact ? 0 : 2);
}

/**
 * Deserialize a chord diagram collection from JSON string
 */
export function deserializeChordDiagramCollection(
  json: string,
  options: DeserializationOptions = {}
): ChordDiagramCollection {
  let data: any;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error}`);
  }

  if (!data.id || !data.name || !data.instrument || !Array.isArray(data.diagrams)) {
    throw new Error('Missing required fields in chord diagram collection data');
  }

  const diagrams = data.diagrams.map((diagramData: any) => 
    deserializeChordDiagram(JSON.stringify(diagramData), options)
  );

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    instrument: data.instrument,
    diagrams,
    metadata: data.metadata || {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Convert chord diagram to compact format (for minimal storage)
 */
export function toCompactFormat(diagram: ChordDiagram): string {
  const positions = diagram.positions
    .sort((a, b) => a.stringNumber - b.stringNumber)
    .map(p => p.fret === -1 ? 'x' : p.fret.toString())
    .join('');

  let compact = `${diagram.name}:${diagram.instrument.type}:${positions}`;

  if (diagram.barre) {
    compact += `:b${diagram.barre.fret}-${diagram.barre.startString}-${diagram.barre.endString}`;
  }

  if (diagram.capoPosition) {
    compact += `:c${diagram.capoPosition}`;
  }

  return compact;
}

/**
 * Parse chord diagram from compact format
 */
export function fromCompactFormat(compact: string): ChordDiagram {
  const parts = compact.split(':');
  if (parts.length < 3) {
    throw new Error('Invalid compact format');
  }

  const [name, instrumentType, positionsStr, ...modifiers] = parts;
  
  if (!['guitar', 'ukulele', 'mandolin'].includes(instrumentType)) {
    throw new Error(`Invalid instrument type: ${instrumentType}`);
  }

  const instrument = instrumentType as InstrumentType;
  const instrumentConfig = INSTRUMENT_CONFIGS[instrument];

  // Parse positions
  const positions: StringPosition[] = [];
  for (let i = 0; i < Math.min(positionsStr.length, instrumentConfig.stringCount); i++) {
    const char = positionsStr[i];
    let fret: number;
    let finger: number;

    if (char === 'x') {
      fret = -1;
      finger = -1;
    } else if (char === '0') {
      fret = 0;
      finger = 0;
    } else {
      fret = parseInt(char, 10);
      if (isNaN(fret)) {
        throw new Error(`Invalid fret character: ${char}`);
      }
      finger = 1; // Default finger
    }

    positions.push({
      stringNumber: i + 1,
      fret,
      finger: finger as any
    });
  }

  const diagram: ChordDiagram = {
    id: `compact_${Date.now()}`,
    name,
    instrument: instrumentConfig,
    positions,
    difficulty: 'intermediate',
    alternatives: [],
    notes: {
      root: name.charAt(0),
      notes: [],
      intervals: [],
      isStandardTuning: true
    },
    localization: {
      names: { en: name },
      descriptions: { en: `${name} chord` },
      fingeringInstructions: { en: 'Standard fingering' }
    },
    metadata: createDefaultMetadata()
  };

  // Parse modifiers
  for (const modifier of modifiers) {
    if (modifier.startsWith('b')) {
      // Barre: b<fret>-<start>-<end>
      const barreMatch = modifier.match(/^b(\d+)-(\d+)-(\d+)$/);
      if (barreMatch) {
        diagram.barre = {
          fret: parseInt(barreMatch[1], 10),
          finger: 1 as any,
          startString: parseInt(barreMatch[2], 10),
          endString: parseInt(barreMatch[3], 10),
          isPartial: false
        };
      }
    } else if (modifier.startsWith('c')) {
      // Capo: c<position>
      const capoMatch = modifier.match(/^c(\d+)$/);
      if (capoMatch) {
        diagram.capoPosition = parseInt(capoMatch[1], 10);
      }
    }
  }

  return diagram;
}

/**
 * Export chord diagram to various formats
 */
export function exportChordDiagram(
  diagram: ChordDiagram,
  format: 'json' | 'compact' | 'tab' | 'csv'
): string {
  switch (format) {
    case 'json':
      return serializeChordDiagram(diagram);
    
    case 'compact':
      return toCompactFormat(diagram);
    
    case 'tab':
      return chordDiagramToTab(diagram);
    
    case 'csv':
      return chordDiagramToCsv(diagram);
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Import chord diagram from various formats
 */
export function importChordDiagram(
  data: string,
  format: 'json' | 'compact' | 'tab',
  options: DeserializationOptions = {}
): ChordDiagram {
  switch (format) {
    case 'json':
      return deserializeChordDiagram(data, options);
    
    case 'compact':
      return fromCompactFormat(data);
    
    case 'tab':
      throw new Error('Tab import not yet implemented');
    
    default:
      throw new Error(`Unsupported import format: ${format}`);
  }
}

/**
 * Helper function to create default metadata
 */
function createDefaultMetadata() {
  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'imported',
    popularityScore: 0.5,
    isVerified: false,
    tags: []
  };
}

/**
 * Convert chord diagram to tablature string
 */
function chordDiagramToTab(diagram: ChordDiagram): string {
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
 * Convert chord diagram to CSV format
 */
function chordDiagramToCsv(diagram: ChordDiagram): string {
  const headers = ['string', 'fret', 'finger', 'note'];
  const rows = [headers.join(',')];

  diagram.positions.forEach(pos => {
    const note = pos.fret >= 0 ? 'note' : 'muted'; // Simplified
    rows.push([
      pos.stringNumber.toString(),
      pos.fret.toString(),
      pos.finger.toString(),
      note
    ].join(','));
  });

  return rows.join('\n');
}

/**
 * Batch operations for multiple chord diagrams
 */
export class ChordDiagramBatch {
  private diagrams: ChordDiagram[] = [];

  add(diagram: ChordDiagram): void {
    this.diagrams.push(diagram);
  }

  serialize(options: SerializationOptions = {}): string {
    return JSON.stringify(
      this.diagrams.map(d => JSON.parse(serializeChordDiagram(d, options))),
      null,
      options.compact ? 0 : 2
    );
  }

  static deserialize(json: string, options: DeserializationOptions = {}): ChordDiagramBatch {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) {
      throw new Error('Expected array of chord diagrams');
    }

    const batch = new ChordDiagramBatch();
    data.forEach(diagramData => {
      const diagram = deserializeChordDiagram(JSON.stringify(diagramData), options);
      batch.add(diagram);
    });

    return batch;
  }

  getDiagrams(): ChordDiagram[] {
    return [...this.diagrams];
  }

  size(): number {
    return this.diagrams.length;
  }

  clear(): void {
    this.diagrams = [];
  }
}