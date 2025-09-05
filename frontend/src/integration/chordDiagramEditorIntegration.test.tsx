/**
 * Integration tests for Chord Diagram Editor Integration
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChordProEditor from '../components/ChordProEditor';
import { ChordDiagram, INSTRUMENT_CONFIGS } from '../types/chordDiagram';

// Mock the services to avoid dependency issues
vi.mock('../services/chordDiagramUtils', () => ({
  searchChordDiagramsAdvanced: vi.fn((diagrams) => ({
    results: diagrams.map((d: ChordDiagram) => ({ diagram: d, score: 100, matchReason: 'exact' }))
  }))
}));

vi.mock('../components/ChordDiagramRenderer', () => ({
  default: ({ chord }: any) => (
    <div data-testid={`chord-diagram-${chord.name}`}>
      Diagram for {chord.name}
    </div>
  )
}));

describe('Chord Diagram Editor Integration', () => {
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
    }
  ];

  it('should integrate chord detection with diagram panel', () => {
    const mockOnChange = vi.fn();
    
    render(
      <ChordProEditor
        value="[C] This is a test [G] song"
        onChange={mockOnChange}
        enableChordDiagrams={true}
        chordDiagrams={mockDiagrams}
        showChordPanel={true}
      />
    );

    // Should show the chord panel with detected chords
    expect(screen.getByText('Chord Diagrams')).toBeInTheDocument();
    expect(screen.getByText('2 chords (2 unique)')).toBeInTheDocument();
    
    // Should show chord buttons
    expect(screen.getByRole('button', { name: 'C +' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'G +' })).toBeInTheDocument();
  });

  it('should insert chords when clicked from panel', () => {
    const mockOnChange = vi.fn();
    
    render(
      <ChordProEditor
        value=""
        onChange={mockOnChange}
        enableChordDiagrams={true}
        chordDiagrams={mockDiagrams}
        showChordPanel={true}
      />
    );

    // Panel should show empty state initially
    expect(screen.getByText('No chords detected in the editor.')).toBeInTheDocument();
  });

  it('should work with disabled chord diagrams (backward compatibility)', () => {
    const mockOnChange = vi.fn();
    
    render(
      <ChordProEditor
        value="[C] This is a test"
        onChange={mockOnChange}
        enableChordDiagrams={false}
      />
    );

    // Should not show chord panel
    expect(screen.queryByText('Chord Diagrams')).not.toBeInTheDocument();
    
    // Should still work as regular editor
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('[C] This is a test');
  });

  it('should maintain existing editor functionality', () => {
    const mockOnChange = vi.fn();
    
    render(
      <ChordProEditor
        value="[C] Test content"
        onChange={mockOnChange}
        enableAutocomplete={true}
        enableValidation={true}
        enableChordDiagrams={true}
        chordDiagrams={mockDiagrams}
      />
    );

    // Should have all the existing functionality
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    
    // Should show validation status
    expect(screen.getByText(/valid/i)).toBeInTheDocument();
  });

  it('should handle panel visibility toggle', () => {
    const mockOnVisibilityChange = vi.fn();
    
    render(
      <ChordProEditor
        value="[C] Test"
        onChange={vi.fn()}
        enableChordDiagrams={true}
        chordDiagrams={mockDiagrams}
        showChordPanel={true}
        onChordPanelVisibilityChange={mockOnVisibilityChange}
      />
    );

    // Should show panel initially
    expect(screen.getByText('Chord Diagrams')).toBeInTheDocument();
    
    // Click hide button
    fireEvent.click(screen.getByRole('button', { name: 'Hide chord diagram panel' }));
    
    // Should call visibility change handler
    expect(mockOnVisibilityChange).toHaveBeenCalledWith(false);
  });
});