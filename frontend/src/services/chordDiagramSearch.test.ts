/**
 * Enhanced ChordDiagram Search Tests
 * 
 * Tests for the new search and filtering functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  searchChordDiagramsAdvanced,
  extractChordType
} from './chordDiagramUtils';
import {
  ChordDiagram,
  ChordDiagramSearchOptions,
  ChordType,
  SortOption
} from '../types/chordDiagram';
import { createChordDiagram } from './chordDiagramUtils';

describe('Enhanced Chord Diagram Search', () => {
  let testChords: ChordDiagram[];

  beforeEach(() => {
    // Create test chord diagrams
    testChords = [
      {
        ...createChordDiagram('C', 'guitar', [
          { stringNumber: 1, fret: 0, finger: 0 },
          { stringNumber: 2, fret: 1, finger: 1 },
          { stringNumber: 3, fret: 0, finger: 0 },
          { stringNumber: 4, fret: 2, finger: 2 },
          { stringNumber: 5, fret: 3, finger: 3 },
          { stringNumber: 6, fret: -1, finger: -1 }
        ]),
        difficulty: 'beginner',
        metadata: { ...createChordDiagram('C', 'guitar', []).metadata, popularityScore: 0.9 }
      },
      {
        ...createChordDiagram('Am', 'guitar', [
          { stringNumber: 1, fret: 0, finger: 0 },
          { stringNumber: 2, fret: 1, finger: 1 },
          { stringNumber: 3, fret: 2, finger: 2 },
          { stringNumber: 4, fret: 2, finger: 3 },
          { stringNumber: 5, fret: 0, finger: 0 },
          { stringNumber: 6, fret: -1, finger: -1 }
        ]),
        difficulty: 'beginner',
        metadata: { ...createChordDiagram('Am', 'guitar', []).metadata, popularityScore: 0.8 }
      },
      {
        ...createChordDiagram('F', 'guitar', [
          { stringNumber: 1, fret: 1, finger: 1 },
          { stringNumber: 2, fret: 1, finger: 1 },
          { stringNumber: 3, fret: 2, finger: 2 },
          { stringNumber: 4, fret: 3, finger: 4 },
          { stringNumber: 5, fret: 3, finger: 3 },
          { stringNumber: 6, fret: 1, finger: 1 }
        ]),
        difficulty: 'intermediate',
        barre: { fret: 1, finger: 1, startString: 1, endString: 6 },
        metadata: { ...createChordDiagram('F', 'guitar', []).metadata, popularityScore: 0.7 }
      },
      {
        ...createChordDiagram('G7', 'guitar', [
          { stringNumber: 1, fret: 1, finger: 1 },
          { stringNumber: 2, fret: 0, finger: 0 },
          { stringNumber: 3, fret: 0, finger: 0 },
          { stringNumber: 4, fret: 0, finger: 0 },
          { stringNumber: 5, fret: 2, finger: 2 },
          { stringNumber: 6, fret: 3, finger: 3 }
        ]),
        difficulty: 'intermediate',
        metadata: { ...createChordDiagram('G7', 'guitar', []).metadata, popularityScore: 0.6 }
      },
      {
        ...createChordDiagram('Cmaj7', 'guitar', [
          { stringNumber: 1, fret: 0, finger: 0 },
          { stringNumber: 2, fret: 0, finger: 0 },
          { stringNumber: 3, fret: 0, finger: 0 },
          { stringNumber: 4, fret: 2, finger: 2 },
          { stringNumber: 5, fret: 3, finger: 3 },
          { stringNumber: 6, fret: -1, finger: -1 }
        ]),
        difficulty: 'advanced',
        metadata: { ...createChordDiagram('Cmaj7', 'guitar', []).metadata, popularityScore: 0.5 }
      },
      {
        ...createChordDiagram('C', 'ukulele', [
          { stringNumber: 1, fret: 0, finger: 0 },
          { stringNumber: 2, fret: 0, finger: 0 },
          { stringNumber: 3, fret: 0, finger: 0 },
          { stringNumber: 4, fret: 3, finger: 3 }
        ]),
        difficulty: 'beginner',
        metadata: { ...createChordDiagram('C', 'ukulele', []).metadata, popularityScore: 0.8 }
      }
    ];
  });

  describe('Chord Type Extraction', () => {
    it('should extract major chord type', () => {
      expect(extractChordType('C')).toBe('major');
      expect(extractChordType('G')).toBe('major');
      expect(extractChordType('D')).toBe('major');
    });

    it('should extract minor chord type', () => {
      expect(extractChordType('Am')).toBe('minor');
      expect(extractChordType('Dm')).toBe('minor');
      expect(extractChordType('Em')).toBe('minor');
      expect(extractChordType('Cmin')).toBe('minor');
    });

    it('should extract 7th chord types', () => {
      expect(extractChordType('C7')).toBe('7th');
      expect(extractChordType('G7')).toBe('7th');
      expect(extractChordType('Cmaj7')).toBe('maj7');
      expect(extractChordType('CM7')).toBe('maj7'); // CM7 should be maj7
      expect(extractChordType('Am7')).toBe('min7');
      expect(extractChordType('Cmin7')).toBe('min7');
    });

    it('should extract suspended chord types', () => {
      expect(extractChordType('Csus2')).toBe('sus2');
      expect(extractChordType('Csus4')).toBe('sus4');
      expect(extractChordType('Gsus4')).toBe('sus4');
    });

    it('should extract diminished and augmented types', () => {
      expect(extractChordType('Cdim')).toBe('dim');
      expect(extractChordType('Caug')).toBe('aug');
      expect(extractChordType('C+')).toBe('aug');
    });

    it('should extract extended chord types', () => {
      expect(extractChordType('C9')).toBe('9th');
      expect(extractChordType('C11')).toBe('11th');
      expect(extractChordType('C13')).toBe('13th');
      expect(extractChordType('Cadd9')).toBe('add9');
    });

    it('should extract power chord type', () => {
      expect(extractChordType('C5')).toBe('power');
      expect(extractChordType('G5')).toBe('power');
      expect(extractChordType('F#5')).toBe('power');
    });
  });

  describe('Advanced Search Functionality', () => {
    it('should search by chord name with fuzzy matching', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          name: 'C',
          fuzzySearch: true,
          fuzzyThreshold: 50
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.totalCount).toBeGreaterThan(0);
      expect(results.results.some(r => r.diagram.name === 'C')).toBe(true);
      expect(results.results.some(r => r.diagram.name === 'Cmaj7')).toBe(true);
    });

    it('should filter by instrument type', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          instrument: 'ukulele'
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.totalCount).toBe(1);
      expect(results.results[0].diagram.instrument.type).toBe('ukulele');
    });

    it('should filter by difficulty level', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          difficulty: ['beginner']
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.totalCount).toBe(3); // C, Am, C ukulele
      results.results.forEach(result => {
        expect(result.diagram.difficulty).toBe('beginner');
      });
    });

    it('should filter by chord type', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          chordType: ['minor']
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.totalCount).toBe(1); // Am
      expect(results.results[0].diagram.name).toBe('Am');
    });

    it('should filter by fret range', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          maxFret: 2
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      results.results.forEach(result => {
        const maxFret = Math.max(...result.diagram.positions.map(p => p.fret));
        expect(maxFret).toBeLessThanOrEqual(2);
      });
    });

    it('should filter barre chords', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          includeBarre: true
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.totalCount).toBe(1); // Only F has barre
      expect(results.results[0].diagram.name).toBe('F');
      expect(results.results[0].diagram.barre).toBeDefined();
    });

    it('should exclude barre chords', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          includeBarre: false
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      results.results.forEach(result => {
        expect(result.diagram.barre).toBeFalsy();
      });
    });

    it('should filter by popularity', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          minPopularity: 0.8
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      results.results.forEach(result => {
        expect(result.diagram.metadata.popularityScore || 0).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort by relevance (default)', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: { name: 'C' },
        sortBy: 'relevance',
        sortDirection: 'desc'
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      // Results should be sorted by score (highest first)
      for (let i = 1; i < results.results.length; i++) {
        expect(results.results[i-1].score).toBeGreaterThanOrEqual(results.results[i].score);
      }
    });

    it('should sort alphabetically', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {},
        sortBy: 'alphabetical',
        sortDirection: 'asc'
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      // Results should be sorted alphabetically
      for (let i = 1; i < results.results.length; i++) {
        expect(results.results[i-1].diagram.name.localeCompare(results.results[i].diagram.name))
          .toBeLessThanOrEqual(0);
      }
    });

    it('should sort by difficulty', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {},
        sortBy: 'difficulty',
        sortDirection: 'asc'
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'expert': 4 };
      
      // Results should be sorted by difficulty (easiest first)
      for (let i = 1; i < results.results.length; i++) {
        const prevDiff = difficultyOrder[results.results[i-1].diagram.difficulty];
        const currDiff = difficultyOrder[results.results[i].diagram.difficulty];
        expect(prevDiff).toBeLessThanOrEqual(currDiff);
      }
    });

    it('should sort by popularity', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {},
        sortBy: 'popularity',
        sortDirection: 'desc'
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      // Results should be sorted by popularity (highest first)
      for (let i = 1; i < results.results.length; i++) {
        const prevPop = results.results[i-1].diagram.metadata.popularityScore || 0;
        const currPop = results.results[i].diagram.metadata.popularityScore || 0;
        expect(prevPop).toBeGreaterThanOrEqual(currPop);
      }
    });

    it('should sort by fret position', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {},
        sortBy: 'fretPosition',
        sortDirection: 'asc'
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      // Results should be sorted by max fret position (lowest first)
      for (let i = 1; i < results.results.length; i++) {
        const prevMaxFret = Math.max(...results.results[i-1].diagram.positions.map(p => p.fret));
        const currMaxFret = Math.max(...results.results[i].diagram.positions.map(p => p.fret));
        expect(prevMaxFret).toBeLessThanOrEqual(currMaxFret);
      }
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {},
        page: 0,
        pageSize: 2
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.results.length).toBeLessThanOrEqual(2);
      expect(results.page).toBe(0);
      expect(results.pageSize).toBe(2);
      expect(results.totalPages).toBe(Math.ceil(testChords.length / 2));
    });

    it('should handle second page correctly', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {},
        page: 1,
        pageSize: 3
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.page).toBe(1);
      expect(results.pageSize).toBe(3);
      expect(results.results.length).toBe(Math.min(3, testChords.length - 3));
    });
  });

  describe('Combined Filters', () => {
    it('should handle multiple filters simultaneously', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          instrument: 'guitar',
          difficulty: ['beginner', 'intermediate'],
          chordType: ['major', 'minor'],
          maxFret: 3,
          includeBarre: false
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      results.results.forEach(result => {
        expect(result.diagram.instrument.type).toBe('guitar');
        expect(['beginner', 'intermediate']).toContain(result.diagram.difficulty);
        expect(['major', 'minor']).toContain(extractChordType(result.diagram.name));
        
        const maxFret = Math.max(...result.diagram.positions.map(p => p.fret));
        expect(maxFret).toBeLessThanOrEqual(3);
        
        expect(result.diagram.barre).toBeFalsy();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      // Create a larger test dataset
      const largeDayaset = Array.from({ length: 100 }, (_, i) => ({
        ...createChordDiagram(`Chord${i}`, 'guitar', [
          { stringNumber: 1, fret: i % 12, finger: 1 }
        ]),
        difficulty: ['beginner', 'intermediate', 'advanced'][i % 3] as any
      }));

      const startTime = performance.now();
      
      const options: ChordDiagramSearchOptions = {
        criteria: {
          name: 'Chord',
          fuzzySearch: true
        },
        sortBy: 'alphabetical'
      };

      const results = searchChordDiagramsAdvanced(largeDayaset, options);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(results.totalCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search criteria', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {}
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.totalCount).toBe(testChords.length);
    });

    it('should handle invalid search parameters gracefully', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          name: '',
          maxFret: -1,
          minFret: 100
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results).toBeDefined();
      expect(results.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle no results found', () => {
      const options: ChordDiagramSearchOptions = {
        criteria: {
          name: 'NonexistentChord123'
        }
      };

      const results = searchChordDiagramsAdvanced(testChords, options);
      
      expect(results.totalCount).toBe(0);
      expect(results.results).toHaveLength(0);
    });
  });
});

  describe('Legacy Search Compatibility', () => {
    it('should maintain backward compatibility with old search function', async () => {
      const diagrams = [
        createChordDiagram('C', 'guitar', []),
        createChordDiagram('Am', 'guitar', []),
        createChordDiagram('F', 'guitar', [])
      ];
      
      // This should work with the legacy function
      const { searchChordDiagrams } = await import('./chordDiagramUtils');
      const results = searchChordDiagrams(diagrams, { name: 'C' });
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('C');
    });
  });