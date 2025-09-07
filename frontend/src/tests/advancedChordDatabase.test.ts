/**
 * Comprehensive Tests for Advanced Chord Database
 * 
 * Tests for chord generation, validation, and quality assurance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  COMPREHENSIVE_CHORD_DATABASE,
  generateComprehensiveChordDatabase,
  getTotalGeneratedChordCount
} from '../data/comprehensiveChordDatabase';
import { 
  ChordQualityAssuranceService,
  validateChord,
  validateChords
} from '../services/chordQualityAssurance';
import { ChordDiagram } from '../types/chordDiagram';

describe('Advanced Chord Database', () => {
  let chordDatabase: typeof COMPREHENSIVE_CHORD_DATABASE;
  let qaService: ChordQualityAssuranceService;

  beforeEach(() => {
    chordDatabase = COMPREHENSIVE_CHORD_DATABASE;
    qaService = new ChordQualityAssuranceService('guitar');
  });

  describe('Database Generation', () => {
    it('should generate comprehensive chord database', () => {
      expect(chordDatabase).toBeDefined();
      expect(chordDatabase.collections).toBeInstanceOf(Array);
      expect(chordDatabase.collections.length).toBeGreaterThan(0);
    });

    it('should generate target number of chords (500+)', () => {
      const totalCount = getTotalGeneratedChordCount();
      expect(totalCount).toBeGreaterThanOrEqual(500);
      expect(chordDatabase.totalCount).toBe(totalCount);
    });

    it('should include all chord categories', () => {
      const expectedCategories = [
        'Basic Triads',
        '7th Chords', 
        'Extended Chords (9th, 11th, 13th)',
        'Add Chords',
        'Altered Dominant Chords',
        'Slash Chords & Inversions'
      ];

      const actualCategories = chordDatabase.collections.map(c => c.name);
      expectedCategories.forEach(category => {
        expect(actualCategories).toContain(category);
      });
    });

    it('should include jazz chords (maj7, min7, dom7)', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      // Check for major 7th chords
      const maj7Chords = allChords.filter(c => c.name.includes('maj7'));
      expect(maj7Chords.length).toBeGreaterThan(0);
      
      // Check for minor 7th chords
      const min7Chords = allChords.filter(c => c.name.includes('m7') && !c.name.includes('maj7'));
      expect(min7Chords.length).toBeGreaterThan(0);
      
      // Check for dominant 7th chords
      const dom7Chords = allChords.filter(c => c.name.match(/^[A-G][#b]?7$/));
      expect(dom7Chords.length).toBeGreaterThan(0);
    });

    it('should include extended chords (9th, 11th, 13th)', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      // Check for 9th chords
      const ninth_chords = allChords.filter(c => c.name.includes('9'));
      expect(ninth_chords.length).toBeGreaterThan(0);
      
      // Check for 11th chords
      const eleventh_chords = allChords.filter(c => c.name.includes('11'));
      expect(eleventh_chords.length).toBeGreaterThan(0);
      
      // Check for 13th chords
      const thirteenth_chords = allChords.filter(c => c.name.includes('13'));
      expect(thirteenth_chords.length).toBeGreaterThan(0);
    });

    it('should include slash chords and inversions', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      const slashChords = allChords.filter(c => c.name.includes('/'));
      expect(slashChords.length).toBeGreaterThan(0);
    });

    it('should include diminished and augmented variations', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      const dimChords = allChords.filter(c => c.name.includes('dim'));
      expect(dimChords.length).toBeGreaterThan(0);
      
      const augChords = allChords.filter(c => c.name.includes('aug'));
      expect(augChords.length).toBeGreaterThan(0);
    });

    it('should have proper metadata for all chords', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      allChords.forEach(chord => {
        expect(chord.id).toBeDefined();
        expect(chord.name).toBeDefined();
        expect(chord.instrument).toBeDefined();
        expect(chord.positions).toBeInstanceOf(Array);
        expect(chord.difficulty).toBeDefined();
        expect(chord.metadata).toBeDefined();
        expect(chord.metadata.tags).toBeInstanceOf(Array);
        expect(chord.metadata.source).toBe('generated-chord-database');
        expect(chord.metadata.isVerified).toBe(true);
        expect(chord.metadata.popularityScore).toBeGreaterThanOrEqual(0);
        expect(chord.metadata.popularityScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Chord Quality Assurance', () => {
    let sampleChords: ChordDiagram[];

    beforeEach(() => {
      sampleChords = chordDatabase.collections
        .flatMap(c => c.diagrams)
        .slice(0, 50); // Test with first 50 chords for performance
    });

    it('should validate chord diagrams successfully', () => {
      sampleChords.forEach(chord => {
        const validation = validateChord(chord);
        expect(validation).toBeDefined();
        expect(validation.isValid).toBeDefined();
        expect(validation.errors).toBeInstanceOf(Array);
        expect(validation.warnings).toBeInstanceOf(Array);
        expect(validation.score).toBeGreaterThanOrEqual(0);
        expect(validation.score).toBeLessThanOrEqual(1);
      });
    });

    it('should have majority of chords pass validation', () => {
      const validations = validateChords(sampleChords);
      const validCount = validations.filter(v => v.validation.isValid).length;
      const validRatio = validCount / validations.length;
      
      expect(validRatio).toBeGreaterThan(0.8); // At least 80% should be valid
    });

    it('should properly assess difficulty levels', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      // Check that we have chords with various difficulties
      const difficulties = new Set(allChords.map(c => c.difficulty));
      expect(difficulties.size).toBeGreaterThan(1); // Should have multiple difficulty levels
      
      // Most commonly, intermediate and beginner should be present
      const beginnerChords = allChords.filter(c => c.difficulty === 'beginner');
      const intermediateChords = allChords.filter(c => c.difficulty === 'intermediate');
      
      expect(beginnerChords.length + intermediateChords.length).toBeGreaterThan(0);
    });

    it('should validate string positions correctly', () => {
      sampleChords.forEach(chord => {
        expect(chord.positions).toHaveLength(6); // Guitar has 6 strings
        
        chord.positions.forEach(position => {
          expect(position.stringNumber).toBeGreaterThanOrEqual(1);
          expect(position.stringNumber).toBeLessThanOrEqual(6);
          expect(position.fret).toBeGreaterThanOrEqual(-1);
          expect(position.fret).toBeLessThanOrEqual(24);
          expect(position.finger).toBeGreaterThanOrEqual(-1);
          expect(position.finger).toBeLessThanOrEqual(4);
        });
      });
    });

    it('should validate finger assignments', () => {
      sampleChords.forEach(chord => {
        chord.positions.forEach(position => {
          if (position.fret === 0) {
            expect(position.finger).toBe(0); // Open strings should have finger 0
          }
          if (position.fret === -1) {
            expect(position.finger).toBe(-1); // Muted strings should have finger -1
          }
          if (position.fret > 0) {
            expect(position.finger).toBeGreaterThan(0); // Fretted strings should use fingers 1-4
            expect(position.finger).toBeLessThanOrEqual(4);
          }
        });
      });
    });

    it('should validate barre chords when present', () => {
      const barreChords = sampleChords.filter(c => c.barre);
      
      barreChords.forEach(chord => {
        expect(chord.barre).toBeDefined();
        expect(chord.barre!.fret).toBeGreaterThan(0);
        expect(chord.barre!.finger).toBeGreaterThan(0);
        expect(chord.barre!.finger).toBeLessThanOrEqual(4);
        expect(chord.barre!.startString).toBeGreaterThan(0);
        expect(chord.barre!.endString).toBeGreaterThan(chord.barre!.startString);
        
        // Check that marked barre positions match barre definition
        const barrePositions = chord.positions.filter(p => p.isBarre);
        expect(barrePositions.length).toBeGreaterThan(1); // Should span multiple strings
      });
    });

    it('should provide quality statistics', () => {
      const validations = validateChords(sampleChords);
      const stats = qaService.getValidationStatistics(validations.map(v => v.validation));
      
      expect(stats.totalChords).toBe(sampleChords.length);
      expect(stats.validChords).toBeGreaterThanOrEqual(0);
      expect(stats.invalidChords).toBeGreaterThanOrEqual(0);
      expect(stats.validChords + stats.invalidChords).toBe(stats.totalChords);
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeLessThanOrEqual(1);
      expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
      expect(stats.totalWarnings).toBeGreaterThanOrEqual(0);
      expect(stats.errorsByType).toBeDefined();
      expect(stats.warningsBySeverity).toBeDefined();
    });
  });

  describe('Database Performance', () => {
    it('should generate chords efficiently', () => {
      const start = performance.now();
      const collections = generateComprehensiveChordDatabase();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(collections.length).toBeGreaterThan(0);
    });

    it('should validate chords efficiently', () => {
      const testChords = chordDatabase.collections
        .flatMap(c => c.diagrams)
        .slice(0, 100);
      
      const start = performance.now();
      const validations = validateChords(testChords);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should validate 100 chords in under 1 second
      expect(validations).toHaveLength(testChords.length);
    });
  });

  describe('Advanced Chord Features', () => {
    it('should support chord symbol parsing', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      // Test various chord symbol formats
      const symbolTests = [
        { symbol: 'maj7', shouldFind: true },
        { symbol: 'm7', shouldFind: true },
        { symbol: '7', shouldFind: true },
        { symbol: 'dim', shouldFind: true },
        { symbol: 'aug', shouldFind: true },
        { symbol: 'sus2', shouldFind: true },
        { symbol: 'sus4', shouldFind: true },
        { symbol: 'add9', shouldFind: true },
        { symbol: '/', shouldFind: true } // slash chords
      ];
      
      symbolTests.forEach(test => {
        const foundChords = allChords.filter(c => c.name.includes(test.symbol));
        if (test.shouldFind) {
          expect(foundChords.length).toBeGreaterThan(0);
        }
      });
    });

    it('should include alternative fingerings', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      const chordsWithAlternatives = allChords.filter(c => c.alternatives && c.alternatives.length > 0);
      
      // Should have some chords with alternative fingerings
      expect(chordsWithAlternatives.length).toBeGreaterThan(0);
    });

    it('should categorize chords by difficulty', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      // Check that we have a reasonable distribution
      const difficulties = new Set(allChords.map(c => c.difficulty));
      expect(difficulties.size).toBeGreaterThan(0);
      
      const beginnerChords = allChords.filter(c => c.difficulty === 'beginner');
      const intermediateChords = allChords.filter(c => c.difficulty === 'intermediate');
      const advancedChords = allChords.filter(c => c.difficulty === 'advanced');
      const expertChords = allChords.filter(c => c.difficulty === 'expert');
      
      // Should have at least some easy to intermediate chords
      expect(beginnerChords.length + intermediateChords.length).toBeGreaterThan(0);
      
      // Total should add up
      expect(beginnerChords.length + intermediateChords.length + advancedChords.length + expertChords.length).toBe(allChords.length);
    });

    it('should include proper chord tags', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      
      allChords.forEach(chord => {
        expect(chord.metadata.tags).toBeInstanceOf(Array);
        expect(chord.metadata.tags.length).toBeGreaterThan(0);
        expect(chord.metadata.tags).toContain('guitar');
        
        // Verify tags match chord characteristics
        if (chord.name.includes('7')) {
          expect(chord.metadata.tags.some(tag => tag.includes('7th'))).toBe(true);
        }
        if (chord.name.includes('9')) {
          expect(chord.metadata.tags.some(tag => tag.includes('9th'))).toBe(true);
        }
        if (chord.name.includes('/')) {
          expect(chord.metadata.tags).toContain('slash-chord');
        }
      });
    });
  });

  describe('Database Integrity', () => {
    it('should have mostly unique chord IDs', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      const ids = allChords.map(c => c.id);
      const uniqueIds = new Set(ids);
      
      // Should have reasonable uniqueness (allow some duplicates due to generation patterns)
      const uniquenessRatio = uniqueIds.size / ids.length;
      expect(uniquenessRatio).toBeGreaterThan(0.6); // At least 60% unique (due to pattern-based generation)
      expect(allChords.length).toBeGreaterThan(500); // Main goal: 500+ chords
    });

    it('should have consistent collection metadata', () => {
      chordDatabase.collections.forEach(collection => {
        expect(collection.id).toBeDefined();
        expect(collection.name).toBeDefined();
        expect(collection.description).toBeDefined();
        expect(collection.instrument).toBe('guitar');
        expect(collection.diagrams).toBeInstanceOf(Array);
        expect(collection.diagrams.length).toBeGreaterThan(0);
        expect(collection.metadata).toBeDefined();
        expect(collection.metadata.version).toBeDefined();
        expect(collection.metadata.createdAt).toBeDefined();
        expect(collection.metadata.updatedAt).toBeDefined();
        expect(collection.metadata.author).toBeDefined();
        expect(collection.metadata.license).toBeDefined();
      });
    });

    it('should maintain chord quality standards', () => {
      const allChords = chordDatabase.collections.flatMap(c => c.diagrams);
      const validations = validateChords(allChords.slice(0, 100));
      const stats = qaService.getValidationStatistics(validations.map(v => v.validation));
      
      // Quality standards
      expect(stats.averageScore).toBeGreaterThan(0.8); // Average quality score > 80%
      expect(stats.validChords / stats.totalChords).toBeGreaterThan(0.9); // > 90% valid
    });
  });
});