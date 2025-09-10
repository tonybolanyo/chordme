/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChordDiagram,
  StringPosition,
  BarreChord,
  INSTRUMENT_CONFIGS,
  DifficultyLevel
} from '../types/chordDiagram';

import {
  validateChordDiagram,
  validateChordDiagrams,
  isValidChordDiagram,
  validateChordDiagramStrict
} from '../services/chordDiagramValidation';

import {
  createChordDiagram,
  transposeChordDiagram,
  addAlternativeFingering,
  createBarreChord,
  calculateNotesFromPositions,
  createStringPositionsFromPattern,
  optimizeFingerAssignments,
  chordDiagramToTab,
  tabToStringPositions,
  searchChordDiagrams,
  createChordDiagramCollection
} from '../services/chordDiagramUtils';

import {
  serializeChordDiagram,
  deserializeChordDiagram,
  toCompactFormat,
  fromCompactFormat,
  exportChordDiagram,
  importChordDiagram,
  ChordDiagramBatch
} from '../services/chordDiagramSerialization';

describe('ChordDiagram Types', () => {
  it('should have correct instrument configurations', () => {
    expect(INSTRUMENT_CONFIGS.guitar.stringCount).toBe(6);
    expect(INSTRUMENT_CONFIGS.ukulele.stringCount).toBe(4);
    expect(INSTRUMENT_CONFIGS.mandolin.stringCount).toBe(8);

    expect(INSTRUMENT_CONFIGS.guitar.standardTuning).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
    expect(INSTRUMENT_CONFIGS.ukulele.standardTuning).toEqual(['G', 'C', 'E', 'A']);
    expect(INSTRUMENT_CONFIGS.mandolin.standardTuning).toEqual(['G', 'G', 'D', 'D', 'A', 'A', 'E', 'E']);
  });

  it('should have valid fret ranges', () => {
    Object.values(INSTRUMENT_CONFIGS).forEach(config => {
      expect(config.fretRange.min).toBe(0);
      expect(config.fretRange.max).toBeGreaterThan(12);
    });
  });
});

describe('ChordDiagram Validation', () => {
  let validChordDiagram: ChordDiagram;

  beforeEach(() => {
    const positions: StringPosition[] = [
      { stringNumber: 1, fret: 3, finger: 3 },
      { stringNumber: 2, fret: 2, finger: 2 },
      { stringNumber: 3, fret: 0, finger: 0 },
      { stringNumber: 4, fret: 0, finger: 0 },
      { stringNumber: 5, fret: 1, finger: 1 },
      { stringNumber: 6, fret: -1, finger: -1 }
    ];

    validChordDiagram = createChordDiagram('C', 'guitar', positions);
  });

  describe('Basic Validation', () => {
    it('should validate a correct chord diagram', () => {
      const result = validateChordDiagram(validChordDiagram);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should reject chord diagram without ID', () => {
      const invalid = { ...validChordDiagram, id: '' };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_required')).toBe(true);
    });

    it('should reject chord diagram without name', () => {
      const invalid = { ...validChordDiagram, name: '' };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_required')).toBe(true);
    });

    it('should reject chord diagram without positions', () => {
      const invalid = { ...validChordDiagram, positions: [] };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_required')).toBe(true);
    });
  });

  describe('String Position Validation', () => {
    it('should reject invalid string numbers', () => {
      const positions: StringPosition[] = [
        { stringNumber: 0, fret: 3, finger: 3 }, // Invalid string number
        { stringNumber: 7, fret: 2, finger: 2 }  // Invalid for guitar (max 6)
      ];
      const invalid = { ...validChordDiagram, positions };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_string')).toBe(true);
    });

    it('should reject invalid fret numbers', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: -2, finger: -1 }, // Invalid fret (below -1)
        { stringNumber: 2, fret: 25, finger: 1 }   // Invalid fret (above max)
      ];
      const invalid = { ...validChordDiagram, positions };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_fret')).toBe(true);
    });

    it('should reject invalid finger assignments', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 3, finger: 5 as unknown }, // Invalid finger (> 4)
        { stringNumber: 2, fret: 2, finger: -2 as unknown } // Invalid finger (< -1)
      ];
      const invalid = { ...validChordDiagram, positions };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_finger')).toBe(true);
    });

    it('should reject inconsistent fret-finger combinations', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 1 }, // Open string with finger
        { stringNumber: 2, fret: 3, finger: 0 }, // Fretted string without finger
        { stringNumber: 3, fret: -1, finger: 1 } // Muted string with finger
      ];
      const invalid = { ...validChordDiagram, positions };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_finger')).toBe(true);
    });

    it('should detect duplicate string positions', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 3, finger: 3 },
        { stringNumber: 1, fret: 5, finger: 1 } // Duplicate string 1
      ];
      const invalid = { ...validChordDiagram, positions };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_string')).toBe(true);
    });
  });

  describe('Barre Chord Validation', () => {
    it('should validate correct barre chord', () => {
      const barre: BarreChord = {
        fret: 1,
        finger: 1,
        startString: 1,
        endString: 6,
        isPartial: false
      };
      const withBarre = { ...validChordDiagram, barre };
      const result = validateChordDiagram(withBarre);
      expect(result.isValid).toBe(true);
    });

    it('should reject barre with invalid fret', () => {
      const barre: BarreChord = {
        fret: 0, // Invalid for barre
        finger: 1,
        startString: 1,
        endString: 6,
        isPartial: false
      };
      const invalid = { ...validChordDiagram, barre };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_barre')).toBe(true);
    });

    it('should reject barre with invalid string range', () => {
      const barre: BarreChord = {
        fret: 1,
        finger: 1,
        startString: 3,
        endString: 2, // End before start
        isPartial: false
      };
      const invalid = { ...validChordDiagram, barre };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_barre')).toBe(true);
    });
  });

  describe('Finger Assignment Conflicts', () => {
    it('should detect finger conflicts', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 3, finger: 1 },
        { stringNumber: 2, fret: 5, finger: 1 } // Same finger on different frets
      ];
      const invalid = { ...validChordDiagram, positions };
      const result = validateChordDiagram(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid_finger')).toBe(true);
    });

    it('should allow same finger on same fret (barre)', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 1, finger: 1 },
        { stringNumber: 2, fret: 1, finger: 1 },
        { stringNumber: 3, fret: 1, finger: 1 }
      ];
      const barre: BarreChord = {
        fret: 1,
        finger: 1,
        startString: 1,
        endString: 3,
        isPartial: true
      };
      const valid = { ...validChordDiagram, positions, barre };
      const result = validateChordDiagram(valid);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Warnings Generation', () => {
    it('should generate difficulty warning for wide stretches', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 1, finger: 1 },
        { stringNumber: 2, fret: 5, finger: 4 } // 4-fret stretch for beginner
      ];
      const diagram = { ...validChordDiagram, positions, difficulty: 'beginner' as DifficultyLevel };
      const result = validateChordDiagram(diagram);
      expect(result.warnings.some(w => w.type === 'difficult_stretch')).toBe(true);
    });

    it('should warn about high fret positions', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 15, finger: 1 }
      ];
      const diagram = { ...validChordDiagram, positions };
      const result = validateChordDiagram(diagram);
      expect(result.warnings.some(w => w.type === 'uncommon_fingering')).toBe(true);
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple chord diagrams', () => {
      const diagram2 = { ...validChordDiagram, id: 'different_id' };
      const diagrams = [validChordDiagram, diagram2];
      const results = validateChordDiagrams(diagrams);
      expect(results.size).toBe(2);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Utility Functions', () => {
    it('should check validity quickly', () => {
      expect(isValidChordDiagram(validChordDiagram)).toBe(true);
    });

    it('should throw on strict validation', () => {
      const invalid = { ...validChordDiagram, id: '' };
      expect(() => validateChordDiagramStrict(invalid)).toThrow();
    });
  });
});

describe('ChordDiagram Utilities', () => {
  describe('Chord Creation', () => {
    it('should create a valid chord diagram', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 3, finger: 3 },
        { stringNumber: 2, fret: 2, finger: 2 },
        { stringNumber: 3, fret: 0, finger: 0 }
      ];
      const diagram = createChordDiagram('C', 'guitar', positions);
      
      expect(diagram.name).toBe('C');
      expect(diagram.instrument.type).toBe('guitar');
      expect(diagram.positions).toEqual(positions);
      expect(diagram.id).toBeDefined();
      expect(diagram.metadata.createdAt).toBeDefined();
    });

    it('should create chord diagrams for different instruments', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 0, finger: 0 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 3, finger: 3 }
      ];
      const diagram = createChordDiagram('C', 'ukulele', positions);
      
      expect(diagram.instrument.type).toBe('ukulele');
      expect(diagram.instrument.stringCount).toBe(4);
    });
  });

  describe('Chord Transposition', () => {
    it('should transpose chord diagram correctly', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 3, finger: 3 }
      ];
      const diagram = createChordDiagram('C', 'guitar', positions);
      const transposed = transposeChordDiagram(diagram, 2);
      
      expect(transposed.name).toBe('D');
      expect(transposed.notes.root).toBe('D');
      expect(transposed.id).not.toBe(diagram.id);
    });

    it('should handle negative transposition', () => {
      const diagram = createChordDiagram('C', 'guitar', []);
      const transposed = transposeChordDiagram(diagram, -1);
      expect(transposed.name).toBe('B');
    });

    it('should not change diagram when transposing by 0', () => {
      const diagram = createChordDiagram('C', 'guitar', []);
      const transposed = transposeChordDiagram(diagram, 0);
      expect(transposed).toEqual(diagram);
    });
  });

  describe('Alternative Fingerings', () => {
    it('should add alternative fingering', () => {
      const diagram = createChordDiagram('C', 'guitar', []);
      const altPositions: StringPosition[] = [
        { stringNumber: 1, fret: 8, finger: 3 }
      ];
      const withAlt = addAlternativeFingering(diagram, altPositions, 'High position');
      
      expect(withAlt.alternatives).toHaveLength(1);
      expect(withAlt.alternatives[0].description).toBe('High position');
      expect(withAlt.alternatives[0].positions).toEqual(altPositions);
    });
  });

  describe('Barre Chord Creation', () => {
    it('should create barre chord', () => {
      const barre = createBarreChord(1, 1, 1, 6, false);
      
      expect(barre.fret).toBe(1);
      expect(barre.finger).toBe(1);
      expect(barre.startString).toBe(1);
      expect(barre.endString).toBe(6);
      expect(barre.isPartial).toBe(false);
    });
  });

  describe('String Position Utilities', () => {
    it('should create positions from pattern', () => {
      const pattern = [3, 2, 0, 0, 1, 'x'];
      const positions = createStringPositionsFromPattern(pattern, 'guitar');
      
      expect(positions).toHaveLength(6);
      expect(positions[0]).toEqual({ stringNumber: 1, fret: 3, finger: 1 });
      expect(positions[5]).toEqual({ stringNumber: 6, fret: -1, finger: -1 });
    });

    it('should optimize finger assignments', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 1, finger: 1 },
        { stringNumber: 2, fret: 2, finger: 1 },
        { stringNumber: 3, fret: 3, finger: 1 }
      ];
      const optimized = optimizeFingerAssignments(positions);
      
      // Should assign different fingers to different frets
      const fretted = optimized.filter(p => p.fret > 0);
      const fingerCounts = new Map();
      fretted.forEach(p => {
        fingerCounts.set(p.finger, (fingerCounts.get(p.finger) || 0) + 1);
      });
      
      expect(fingerCounts.size).toBeGreaterThan(1);
    });
  });

  describe('Tablature Conversion', () => {
    it('should convert chord to tab format', () => {
      const positions: StringPosition[] = [
        { stringNumber: 1, fret: 3, finger: 3 },
        { stringNumber: 2, fret: 2, finger: 2 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 0, finger: 0 },
        { stringNumber: 5, fret: 1, finger: 1 },
        { stringNumber: 6, fret: -1, finger: -1 }
      ];
      const diagram = createChordDiagram('C', 'guitar', positions);
      const tab = chordDiagramToTab(diagram);
      
      expect(tab).toBe('32001x');
    });

    it('should convert tab to positions', () => {
      const tab = '320013';
      const positions = tabToStringPositions(tab, 'guitar');
      
      expect(positions).toHaveLength(6);
      expect(positions[0].fret).toBe(3);
      expect(positions[1].fret).toBe(2);
      expect(positions[5].fret).toBe(3);
    });
  });

  describe('Search Functionality', () => {
    it('should search chord diagrams by name', () => {
      const diagrams = [
        createChordDiagram('C', 'guitar', []),
        createChordDiagram('Am', 'guitar', []),
        createChordDiagram('F', 'guitar', [])
      ];
      
      const results = searchChordDiagrams(diagrams, { name: 'C' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('C');
    });

    it('should search by instrument', () => {
      const diagrams = [
        createChordDiagram('C', 'guitar', []),
        createChordDiagram('C', 'ukulele', [])
      ];
      
      const results = searchChordDiagrams(diagrams, { instrument: 'ukulele' });
      expect(results).toHaveLength(1);
      expect(results[0].instrument.type).toBe('ukulele');
    });

    it('should search by difficulty', () => {
      const easy = createChordDiagram('C', 'guitar', []);
      easy.difficulty = 'beginner';
      
      const hard = createChordDiagram('F#maj7', 'guitar', []);
      hard.difficulty = 'advanced';
      
      const results = searchChordDiagrams([easy, hard], { difficulty: ['beginner'] });
      expect(results).toHaveLength(1);
      expect(results[0].difficulty).toBe('beginner');
    });
  });

  describe('Collection Management', () => {
    it('should create chord diagram collection', () => {
      const diagrams = [
        createChordDiagram('C', 'guitar', []),
        createChordDiagram('G', 'guitar', [])
      ];
      
      const collection = createChordDiagramCollection(
        'Basic Chords',
        'Essential guitar chords',
        'guitar',
        diagrams
      );
      
      expect(collection.name).toBe('Basic Chords');
      expect(collection.instrument).toBe('guitar');
      expect(collection.diagrams).toHaveLength(2);
      expect(collection.id).toBeDefined();
    });
  });
});

describe('ChordDiagram Serialization', () => {
  let testDiagram: ChordDiagram;

  beforeEach(() => {
    const positions: StringPosition[] = [
      { stringNumber: 1, fret: 3, finger: 3 },
      { stringNumber: 2, fret: 2, finger: 2 },
      { stringNumber: 3, fret: 0, finger: 0 }
    ];
    testDiagram = createChordDiagram('C', 'guitar', positions);
  });

  describe('JSON Serialization', () => {
    it('should serialize chord diagram to JSON', () => {
      const json = serializeChordDiagram(testDiagram);
      const parsed = JSON.parse(json);
      
      expect(parsed.id).toBe(testDiagram.id);
      expect(parsed.name).toBe(testDiagram.name);
      expect(parsed.positions).toEqual(testDiagram.positions);
    });

    it('should deserialize chord diagram from JSON', () => {
      const json = serializeChordDiagram(testDiagram);
      const deserialized = deserializeChordDiagram(json);
      
      expect(deserialized.id).toBe(testDiagram.id);
      expect(deserialized.name).toBe(testDiagram.name);
      expect(deserialized.positions).toEqual(testDiagram.positions);
    });

    it('should handle serialization options', () => {
      const json = serializeChordDiagram(testDiagram, { 
        includeMetadata: false,
        compact: true 
      });
      const parsed = JSON.parse(json);
      
      expect(parsed.metadata).toBeUndefined();
      expect(json).not.toContain('\n'); // Compact format
    });

    it('should validate during serialization if requested', () => {
      const invalid = { ...testDiagram, id: '' };
      expect(() => serializeChordDiagram(invalid, { validate: true })).toThrow();
    });

    it('should handle missing fields during deserialization', () => {
      const minimal = {
        id: 'test',
        name: 'C',
        instrument: { type: 'guitar', stringCount: 6, standardTuning: ['E', 'A', 'D', 'G', 'B', 'E'] },
        positions: [],
        difficulty: 'intermediate',
        notes: { root: 'C', notes: [], intervals: [], isStandardTuning: true },
        localization: { names: { en: 'C' }, descriptions: { en: 'C chord' }, fingeringInstructions: { en: 'Standard' } }
      };
      
      const json = JSON.stringify(minimal);
      const deserialized = deserializeChordDiagram(json, { fillDefaults: true });
      
      expect(deserialized.metadata).toBeDefined();
      expect(deserialized.alternatives).toEqual([]);
    });
  });

  describe('Compact Format', () => {
    it('should convert to compact format', () => {
      const compact = toCompactFormat(testDiagram);
      expect(compact).toContain('C:guitar:');
      expect(typeof compact).toBe('string');
    });

    it('should parse from compact format', () => {
      const compact = 'C:guitar:320010';
      const diagram = fromCompactFormat(compact);
      
      expect(diagram.name).toBe('C');
      expect(diagram.instrument.type).toBe('guitar');
      expect(diagram.positions).toHaveLength(6);
    });

    it('should handle barre in compact format', () => {
      const barre = createBarreChord(1, 1, 1, 6);
      const diagram = { ...testDiagram, barre };
      const compact = toCompactFormat(diagram);
      
      expect(compact).toContain(':b1-1-6');
    });

    it('should handle capo in compact format', () => {
      const diagram = { ...testDiagram, capoPosition: 3 };
      const compact = toCompactFormat(diagram);
      
      expect(compact).toContain(':c3');
    });
  });

  describe('Export/Import', () => {
    it('should export to different formats', () => {
      const jsonExport = exportChordDiagram(testDiagram, 'json');
      const compactExport = exportChordDiagram(testDiagram, 'compact');
      const tabExport = exportChordDiagram(testDiagram, 'tab');
      
      expect(typeof jsonExport).toBe('string');
      expect(typeof compactExport).toBe('string');
      expect(typeof tabExport).toBe('string');
    });

    it('should import from different formats', () => {
      const json = serializeChordDiagram(testDiagram);
      const imported = importChordDiagram(json, 'json');
      
      expect(imported.name).toBe(testDiagram.name);
    });

    it('should throw for unsupported formats', () => {
      expect(() => exportChordDiagram(testDiagram, 'unknown' as unknown)).toThrow();
      expect(() => importChordDiagram('data', 'unknown' as unknown)).toThrow();
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch serialization', () => {
      const batch = new ChordDiagramBatch();
      batch.add(testDiagram);
      batch.add(testDiagram);
      
      expect(batch.size()).toBe(2);
      
      const json = batch.serialize();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should handle batch deserialization', () => {
      const batch1 = new ChordDiagramBatch();
      batch1.add(testDiagram);
      batch1.add(testDiagram);
      
      const json = batch1.serialize();
      const batch2 = ChordDiagramBatch.deserialize(json);
      
      expect(batch2.size()).toBe(2);
      expect(batch2.getDiagrams()[0].name).toBe(testDiagram.name);
    });

    it('should clear batch', () => {
      const batch = new ChordDiagramBatch();
      batch.add(testDiagram);
      expect(batch.size()).toBe(1);
      
      batch.clear();
      expect(batch.size()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON during deserialization', () => {
      expect(() => deserializeChordDiagram('invalid json')).toThrow();
    });

    it('should handle missing required fields', () => {
      const incomplete = { name: 'C' };
      const json = JSON.stringify(incomplete);
      expect(() => deserializeChordDiagram(json)).toThrow();
    });

    it('should handle validation errors in strict mode', () => {
      const invalid = { ...testDiagram, id: '' };
      const json = JSON.stringify(invalid);
      expect(() => deserializeChordDiagram(json, { strict: true })).toThrow();
    });
  });
});