/**
 * Tests for ChordDiagramPanel Component
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChordDiagramPanel from './ChordDiagramPanel';
import { ChordDetectionResult } from '../../services/chordDetectionService';
import { ChordDiagram, INSTRUMENT_CONFIGS } from '../../types/chordDiagram';

// Mock the ChordDiagramRenderer component
vi.mock('../ChordDiagramRenderer', () => ({
  default: ({ chord, onFingerClick }: { chord: ChordDiagram; onFingerClick?: () => void }) => (
    <div 
      data-testid={`chord-diagram-${chord.name}`}
      onClick={() => onFingerClick && onFingerClick()}
    >
      Diagram for {chord.name}
    </div>
  )
}));

// Mock the chord diagram utils
vi.mock('../../services/chordDiagramUtils', () => ({
  searchChordDiagramsAdvanced: vi.fn((diagrams, options) => {
    const matchingDiagrams = diagrams.filter((d: ChordDiagram) => 
      d.name === options.criteria.name
    );
    return {
      results: matchingDiagrams.map((d: ChordDiagram) => ({ diagram: d, score: 100, matchReason: 'exact' }))
    };
  })
}));

describe('ChordDiagramPanel', () => {
  const mockChordDetection: ChordDetectionResult = {
    chords: [
      { chord: 'C', start: 0, end: 3, line: 0, column: 0, isValid: true },
      { chord: 'G', start: 10, end: 13, line: 0, column: 10, isValid: true },
      { chord: 'Am', start: 20, end: 24, line: 0, column: 20, isValid: true }
    ],
    uniqueChords: ['C', 'G', 'Am'],
    chordCount: 3,
    uniqueChordCount: 3
  };

  const mockDiagrams: ChordDiagram[] = [
    {
      id: 'c-major-1',
      name: 'C',
      instrument: INSTRUMENT_CONFIGS.guitar,
      positions: [
        { stringNumber: 1, fret: 3, finger: 3 },
        { stringNumber: 2, fret: 2, finger: 2 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 0, finger: 0 },
        { stringNumber: 5, fret: 1, finger: 1 },
        { stringNumber: 6, fret: -1, finger: -1 }
      ],
      difficulty: 'beginner' as const,
      alternatives: [],
      notes: {
        root: 'C',
        notes: ['C', 'E', 'G'],
        intervals: ['1', '3', '5'],
        isStandardTuning: true
      },
      localization: {
        names: { en: 'C Major' },
        descriptions: { en: 'C Major chord' },
        fingeringInstructions: { en: 'Standard C fingering' }
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'standard',
        popularityScore: 0.9,
        isVerified: true,
        tags: ['major', 'beginner']
      }
    },
    {
      id: 'g-major-1',
      name: 'G',
      instrument: INSTRUMENT_CONFIGS.guitar,
      positions: [
        { stringNumber: 1, fret: 3, finger: 3 },
        { stringNumber: 2, fret: 3, finger: 4 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 0, finger: 0 },
        { stringNumber: 5, fret: 2, finger: 2 },
        { stringNumber: 6, fret: 3, finger: 3 }
      ],
      difficulty: 'beginner' as const,
      alternatives: [],
      notes: {
        root: 'G',
        notes: ['G', 'B', 'D'],
        intervals: ['1', '3', '5'],
        isStandardTuning: true
      },
      localization: {
        names: { en: 'G Major' },
        descriptions: { en: 'G Major chord' },
        fingeringInstructions: { en: 'Standard G fingering' }
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'standard',
        popularityScore: 0.9,
        isVerified: true,
        tags: ['major', 'beginner']
      }
    }
  ];

  const defaultProps = {
    chordDetection: mockChordDetection,
    availableDiagrams: mockDiagrams,
    instrument: 'guitar' as const,
    visible: true
  };

  describe('Rendering', () => {
    it('should render with chord detection results', () => {
      render(<ChordDiagramPanel {...defaultProps} />);

      expect(screen.getByText('Chord Diagrams')).toBeInTheDocument();
      expect(screen.getByText('3 chords (3 unique)')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getAllByText('Am')).toHaveLength(2); // In header and fallback button
    });

    it('should render collapsed when not visible', () => {
      render(<ChordDiagramPanel {...defaultProps} visible={false} />);

      expect(screen.getByRole('button', { name: 'Show chord diagram panel' })).toBeInTheDocument();
      expect(screen.queryByText('Chord Diagrams')).not.toBeInTheDocument();
    });

    it('should show empty state when no chords detected', () => {
      const emptyDetection: ChordDetectionResult = {
        chords: [],
        uniqueChords: [],
        chordCount: 0,
        uniqueChordCount: 0
      };

      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          chordDetection={emptyDetection}
        />
      );

      expect(screen.getByText('No chords detected in the editor.')).toBeInTheDocument();
      expect(screen.getByText('Start typing chords like [C] or [Am] to see diagrams here.')).toBeInTheDocument();
    });

    it('should highlight the current chord', () => {
      render(<ChordDiagramPanel {...defaultProps} highlightedChord="C" />);

      const chordSection = screen.getByText('C').closest('.chord-section');
      expect(chordSection).toHaveClass('highlighted');
    });
  });

  describe('Interactions', () => {
    it('should call onChordInsert when chord button is clicked', () => {
      const onChordInsert = vi.fn();
      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          onChordInsert={onChordInsert}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'C +' }));
      expect(onChordInsert).toHaveBeenCalledWith('[C]');
    });

    it('should call onVisibilityChange when toggle button is clicked', () => {
      const onVisibilityChange = vi.fn();
      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          onVisibilityChange={onVisibilityChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Hide chord diagram panel' }));
      expect(onVisibilityChange).toHaveBeenCalledWith(false);
    });

    it('should expand alternatives when expand button is clicked', () => {
      // Add alternative diagrams
      const diagramsWithAlternatives = [
        ...mockDiagrams,
        {
          ...mockDiagrams[0],
          id: 'c-major-2',
          metadata: { ...mockDiagrams[0].metadata, popularityScore: 0.7 }
        }
      ];

      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          availableDiagrams={diagramsWithAlternatives}
          maxDiagramsPerChord={2}
        />
      );

      // Should show expand button for C chord (has alternatives)
      const expandButton = screen.getByRole('button', { name: '+' });
      fireEvent.click(expandButton);

      expect(expandButton).toHaveClass('expanded');
    });

    it('should filter to only highlighted chord when filter is active', () => {
      render(<ChordDiagramPanel {...defaultProps} highlightedChord="C" />);

      // Click the filter button to show only highlighted chord
      fireEvent.click(screen.getByRole('button', { name: '📋' }));

      // Should only show C chord
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.queryByText('G')).not.toBeInTheDocument();
      expect(screen.queryByText('Am')).not.toBeInTheDocument();
    });
  });

  describe('Chord Diagram Integration', () => {
    it('should render chord diagrams for available chords', () => {
      render(<ChordDiagramPanel {...defaultProps} />);

      expect(screen.getByTestId('chord-diagram-C')).toBeInTheDocument();
      expect(screen.getByTestId('chord-diagram-G')).toBeInTheDocument();
    });

    it('should handle chords without available diagrams', () => {
      // Remove G from available diagrams
      const limitedDiagrams = mockDiagrams.filter(d => d.name !== 'G');
      
      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          availableDiagrams={limitedDiagrams}
        />
      );

      // C should have a diagram
      expect(screen.getByTestId('chord-diagram-C')).toBeInTheDocument();
      
      // G and Am should show no diagram available (2 instances)
      const noDiagramTexts = screen.getAllByText('No diagram available');
      expect(noDiagramTexts).toHaveLength(2);
    });

    it('should call onChordInsert when diagram is clicked', () => {
      const onChordInsert = vi.fn();
      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          onChordInsert={onChordInsert}
        />
      );

      fireEvent.click(screen.getByTestId('chord-diagram-C'));
      expect(onChordInsert).toHaveBeenCalledWith('[C]');
    });
  });

  describe('Responsive and Accessibility', () => {
    it('should have proper aria labels', () => {
      render(<ChordDiagramPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Hide chord diagram panel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'C +' })).toBeInTheDocument();
    });

    it('should support custom width', () => {
      const { container } = render(
        <ChordDiagramPanel {...defaultProps} width={400} />
      );

      const panel = container.querySelector('.chord-diagram-panel');
      expect(panel).toHaveStyle({ width: '400px' });
    });

    it('should limit diagrams per chord based on maxDiagramsPerChord', () => {
      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          maxDiagramsPerChord={1}
        />
      );

      // Should only show primary diagrams, no expand buttons
      expect(screen.queryByRole('button', { name: 'Expand alternatives' })).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of chords efficiently', () => {
      const largeChordDetection: ChordDetectionResult = {
        chords: Array.from({ length: 100 }, (_, i) => ({
          chord: `Chord${i}`,
          start: i * 10,
          end: i * 10 + 5,
          line: Math.floor(i / 10),
          column: (i % 10) * 10,
          isValid: true
        })),
        uniqueChords: Array.from({ length: 20 }, (_, i) => `Chord${i}`),
        chordCount: 100,
        uniqueChordCount: 20
      };

      const start = performance.now();
      render(
        <ChordDiagramPanel 
          {...defaultProps} 
          chordDetection={largeChordDetection}
        />
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should render quickly
      expect(screen.getByText('100 chords (20 unique)')).toBeInTheDocument();
    });
  });
});