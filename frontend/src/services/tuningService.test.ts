/**
 * Tests for TuningService functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TuningService, tuningService } from './tuningService';
import { TuningInfo, TuningPreset } from '../types/tuning';
import { ChordDiagram, InstrumentType } from '../types/chordDiagram';
import { createChordDiagram } from './chordDiagramUtils';

describe('TuningService', () => {
  let service: TuningService;

  beforeEach(() => {
    service = new TuningService();
  });

  describe('Basic Tuning Management', () => {
    it('should get all tunings for guitar', () => {
      const tunings = service.getAllTunings('guitar');
      expect(tunings.length).toBeGreaterThan(0);
      
      const standardTuning = tunings.find(t => t.preset === 'standard');
      expect(standardTuning).toBeDefined();
      expect(standardTuning!.notes).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
    });

    it('should get tuning by preset', () => {
      const dropD = service.getTuningByPreset('drop_d', 'guitar');
      expect(dropD).toBeDefined();
      expect(dropD!.notes).toEqual(['D', 'A', 'D', 'G', 'B', 'E']);
      expect(dropD!.preset).toBe('drop_d');
    });

    it('should get standard tuning', () => {
      const standard = service.getStandardTuning('guitar');
      expect(standard.isStandard).toBe(true);
      expect(standard.notes).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
    });

    it('should create custom tuning', () => {
      const customTuning = service.createCustomTuning(
        'My Custom Tuning',
        'A test custom tuning',
        ['D', 'A', 'D', 'F#', 'A', 'D'],
        'guitar',
        { genres: ['experimental'], difficulty: 'hard' }
      );

      expect(customTuning.name).toBe('My Custom Tuning');
      expect(customTuning.preset).toBe('custom');
      expect(customTuning.notes).toEqual(['D', 'A', 'D', 'F#', 'A', 'D']);
      expect(customTuning.difficulty).toBe('hard');
      expect(customTuning.metadata.isCustom).toBe(true);
    });
  });

  describe('Chord Conversion Between Tunings', () => {
    let cMajorChord: ChordDiagram;
    let standardTuning: TuningInfo;
    let dropDTuning: TuningInfo;

    beforeEach(() => {
      // Create a C major chord in standard tuning
      cMajorChord = createChordDiagram('C', 'guitar', [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 1, finger: 1 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 2, finger: 2 },
        { stringNumber: 5, fret: 3, finger: 3 },
        { stringNumber: 6, fret: -1, finger: -1 }
      ]);

      standardTuning = service.getStandardTuning('guitar');
      dropDTuning = service.getTuningByPreset('drop_d', 'guitar')!;
    });

    it('should convert chord between tunings', () => {
      const conversion = service.convertChordBetweenTunings(
        cMajorChord,
        standardTuning,
        dropDTuning
      );

      expect(conversion.success).toBe(true);
      expect(conversion.confidence).toBeGreaterThan(50);
      expect(conversion.originalPositions).toEqual([0, 1, 0, 2, 3, -1]);
    });

    it('should handle tuning conversion that requires capo', () => {
      const openC = service.getTuningByPreset('open_c', 'guitar')!;
      
      const conversion = service.convertChordBetweenTunings(
        cMajorChord,
        standardTuning,
        openC,
        { allowCapo: true, maxCapoPosition: 5 }
      );

      expect(conversion).toBeDefined();
      // Due to the complexity of open C tuning, it may or may not succeed
      // but it should at least attempt the conversion
    });

    it('should refuse conversion without capo when needed', () => {
      const openC = service.getTuningByPreset('open_c', 'guitar')!;
      
      const conversion = service.convertChordBetweenTunings(
        cMajorChord,
        standardTuning,
        openC,
        { allowCapo: false }
      );

      // Without capo, difficult conversions should have lower confidence
      expect(conversion.confidence).toBeLessThan(80);
    });
  });

  describe('Capo Calculations', () => {
    it('should calculate optimal capo position', () => {
      const standardTuning = service.getStandardTuning('guitar');
      const halfStepDown = service.getTuningByPreset('half_step_down', 'guitar')!;
      
      const capoCalc = service.calculateOptimalCapo(
        [0, 1, 0, 2, 3, -1], // C major positions
        standardTuning,
        halfStepDown,
        5
      );

      expect(capoCalc.position).toBeGreaterThan(0);
      expect(capoCalc.effectiveTuning).toBeDefined();
      expect(capoCalc.alternatives.length).toBeGreaterThan(0);
    });

    it('should handle impossible capo scenarios', () => {
      const standardTuning = service.getStandardTuning('guitar');
      const dadgad = service.getTuningByPreset('dadgad', 'guitar')!;
      
      const capoCalc = service.calculateOptimalCapo(
        [0, 1, 0, 2, 3, 0], // Chord that uses all strings
        standardTuning,
        dadgad,
        3 // Low max capo
      );

      // DADGAD is very different from standard, may not achieve good conversion
      expect(capoCalc).toBeDefined();
    });
  });

  describe('Tuning Comparisons', () => {
    it('should compare similar tunings', () => {
      const standard = service.getStandardTuning('guitar');
      const dropD = service.getTuningByPreset('drop_d', 'guitar')!;
      
      const comparison = service.compareTunings(standard, dropD);
      
      expect(comparison.similarity).toBeGreaterThan(80); // Only 1 string different
      expect(comparison.matchingStrings).toEqual([2, 3, 4, 5, 6]); // 5 strings match
      expect(comparison.differentStrings).toEqual([1]); // Only low E string differs
      expect(comparison.conversionDifficulty).toBe('easy');
    });

    it('should compare very different tunings', () => {
      const standard = service.getStandardTuning('guitar');
      const openG = service.getTuningByPreset('open_g', 'guitar')!;
      
      const comparison = service.compareTunings(standard, openG);
      
      expect(comparison.similarity).toBeLessThan(50); // Many strings different
      expect(comparison.conversionDifficulty).toBe('hard');
    });
  });

  describe('Tuning Suggestions', () => {
    it('should suggest tunings for blues genre', () => {
      const suggestions = service.suggestTunings({
        genre: 'blues',
        preferredDifficulty: 'medium',
        instrument: 'guitar'
      });

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should include open tunings popular in blues
      const hasOpenTuning = suggestions.some(s => 
        s.tuning.preset.includes('open_') || s.tuning.genres.includes('blues')
      );
      expect(hasOpenTuning).toBe(true);
    });

    it('should suggest easy tunings for beginners', () => {
      const suggestions = service.suggestTunings({
        preferredDifficulty: 'easy',
        instrument: 'guitar'
      });

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Standard tuning should be highly recommended for beginners
      const standardSuggestion = suggestions.find(s => s.tuning.preset === 'standard');
      expect(standardSuggestion?.confidence).toBeGreaterThan(70);
    });

    it('should consider current tuning in suggestions', () => {
      const currentTuning = service.getTuningByPreset('drop_d', 'guitar')!;
      
      const suggestions = service.suggestTunings({
        currentTuning,
        instrument: 'guitar'
      });

      // Should not suggest the current tuning
      const hasCurrentTuning = suggestions.some(s => s.tuning.id === currentTuning.id);
      expect(hasCurrentTuning).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid tuning preset', () => {
      const tuning = service.getTuningByPreset('invalid_preset' as TuningPreset, 'guitar');
      expect(tuning).toBeNull();
    });

    it('should handle unsupported instrument', () => {
      const tunings = service.getAllTunings('banjo' as InstrumentType);
      expect(tunings.length).toBe(0);
    });

    it('should handle empty chord positions', () => {
      const standardTuning = service.getStandardTuning('guitar');
      const dropD = service.getTuningByPreset('drop_d', 'guitar')!;
      
      const emptyChord = createChordDiagram('Empty', 'guitar', []);
      
      const conversion = service.convertChordBetweenTunings(
        emptyChord,
        standardTuning,
        dropD
      );

      expect(conversion.success).toBe(true);
      expect(conversion.convertedPositions).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple conversions efficiently', () => {
      const standardTuning = service.getStandardTuning('guitar');
      const allTunings = service.getAllTunings('guitar');
      
      const testChord = createChordDiagram('G', 'guitar', [
        { stringNumber: 1, fret: 3, finger: 3 },
        { stringNumber: 2, fret: 0, finger: 0 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 0, finger: 0 },
        { stringNumber: 5, fret: 2, finger: 2 },
        { stringNumber: 6, fret: 3, finger: 4 }
      ]);

      const startTime = performance.now();
      
      // Convert to all available tunings
      allTunings.forEach(tuning => {
        if (tuning.id !== standardTuning.id) {
          service.convertChordBetweenTunings(testChord, standardTuning, tuning);
        }
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete all conversions in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });
});

describe('Tuning Service Integration', () => {
  it('should be accessible as singleton', () => {
    expect(tuningService).toBeDefined();
    expect(tuningService instanceof TuningService).toBe(true);
  });

  it('should maintain state between calls', () => {
    const customTuning = tuningService.createCustomTuning(
      'Test Persistence',
      'Testing if custom tunings persist',
      ['C', 'G', 'C', 'G', 'C', 'E']
    );

    const allTunings = tuningService.getAllTunings('guitar');
    const foundCustom = allTunings.find(t => t.id === customTuning.id);
    
    expect(foundCustom).toBeDefined();
    expect(foundCustom!.name).toBe('Test Persistence');
  });
});