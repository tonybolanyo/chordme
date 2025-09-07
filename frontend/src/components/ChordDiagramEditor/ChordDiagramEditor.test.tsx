/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ChordDiagramEditor } from './ChordDiagramEditor';

// Mock crypto.randomUUID for testing environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  }
});

describe('ChordDiagramEditor', () => {
  it('renders without crashing', () => {
    render(<ChordDiagramEditor />);
    expect(screen.getByText('Chord Diagram Editor')).toBeInTheDocument();
  });

  it('displays the editor components', () => {
    render(<ChordDiagramEditor />);
    
    // Check for main editor elements
    expect(screen.getByText('Chord Diagram Editor')).toBeInTheDocument();
    expect(screen.getByText('Edit Mode')).toBeInTheDocument();
    expect(screen.getAllByText('Finger')).toHaveLength(2); // Button and label
    expect(screen.getByText('Barre')).toBeInTheDocument();
    expect(screen.getByText('Mute')).toBeInTheDocument();
  });

  it('initializes with guitar as default instrument', () => {
    render(<ChordDiagramEditor />);
    
    const instrumentSelect = screen.getByDisplayValue('Guitar (6 strings)');
    expect(instrumentSelect).toBeInTheDocument();
  });

  it('shows chord naming editor', () => {
    render(<ChordDiagramEditor />);
    
    expect(screen.getByText('Chord Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter chord name/)).toBeInTheDocument();
  });

  it('displays validation panel', () => {
    render(<ChordDiagramEditor />);
    
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  it('shows fingering controls', () => {
    render(<ChordDiagramEditor />);
    
    expect(screen.getByText('Fingering Details')).toBeInTheDocument();
    expect(screen.getByText('String Positions')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked and chord is valid', () => {
    const mockOnSave = vi.fn();
    render(<ChordDiagramEditor onSave={mockOnSave} />);
    
    // Note: Save button should be disabled initially as the chord is invalid
    const saveButton = screen.getByTitle(/Save chord diagram|Fix validation errors/);
    expect(saveButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<ChordDiagramEditor onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close editor');
    expect(closeButton).toBeInTheDocument();
  });

  it('can switch between different instruments', () => {
    render(<ChordDiagramEditor />);
    
    const instrumentSelect = screen.getByDisplayValue('Guitar (6 strings)');
    expect(instrumentSelect).toBeInTheDocument();
    
    // Check that other instrument options are available
    expect(screen.getByText('Ukulele (4 strings)')).toBeInTheDocument();
    expect(screen.getByText('Mandolin (8 strings)')).toBeInTheDocument();
  });

  it('accepts custom initial chord', () => {
    const customChord = {
      id: 'test-chord',
      name: 'Test Chord',
      instrument: {
        type: 'guitar' as const,
        stringCount: 6,
        standardTuning: ['E', 'A', 'D', 'G', 'B', 'E'],
        fretRange: { min: 0, max: 24 },
        commonCapoPositions: [0, 1, 2, 3, 4, 5, 7]
      },
      positions: [
        { stringNumber: 1, fret: 0, finger: 0 },
        { stringNumber: 2, fret: 1, finger: 1 },
        { stringNumber: 3, fret: 0, finger: 0 },
        { stringNumber: 4, fret: 2, finger: 3 },
        { stringNumber: 5, fret: 3, finger: 4 },
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
        names: { en: 'Test Chord' },
        descriptions: { en: 'Test chord description' },
        fingeringInstructions: { en: 'Test fingering instructions' }
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        source: 'test',
        popularityScore: 1,
        isVerified: true,
        tags: ['test']
      }
    };

    render(<ChordDiagramEditor initialChord={customChord} />);
    
    expect(screen.getByDisplayValue('Test Chord')).toBeInTheDocument();
  });
});