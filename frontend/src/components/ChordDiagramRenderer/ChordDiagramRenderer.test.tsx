/**
 * Tests for ChordDiagramRenderer component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ChordDiagramRenderer from './ChordDiagramRenderer';
import { ChordDiagram, INSTRUMENT_CONFIGS } from '../../types/chordDiagram';

// Mock chord diagram data for testing
const createMockChord = (overrides: Partial<ChordDiagram> = {}): ChordDiagram => ({
  id: 'test-chord-1',
  name: 'C',
  instrument: INSTRUMENT_CONFIGS.guitar,
  positions: [
    { stringNumber: 1, fret: 0, finger: 0 }, // Open E
    { stringNumber: 2, fret: 1, finger: 1 }, // B fret 1, index finger
    { stringNumber: 3, fret: 0, finger: 0 }, // Open G
    { stringNumber: 4, fret: 2, finger: 2 }, // D fret 2, middle finger
    { stringNumber: 5, fret: 3, finger: 3 }, // A fret 3, ring finger
    { stringNumber: 6, fret: -1, finger: -1 } // Muted low E
  ],
  difficulty: 'beginner',
  alternatives: [],
  notes: {
    root: 'C',
    quality: 'major',
    intervals: ['1', '3', '5'],
    voicing: 'root'
  },
  description: 'Basic C major chord',
  localization: {
    names: { en: 'C Major', es: 'Do Mayor' },
    descriptions: { en: 'Basic major chord', es: 'Acorde mayor básico' },
    fingeringInstructions: { en: 'Press strings as shown', es: 'Presiona las cuerdas como se muestra' }
  },
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    source: 'test',
    popularityScore: 0.9,
    isVerified: true,
    tags: ['basic', 'major']
  },
  ...overrides
});

const mockBarreChord = createMockChord({
  name: 'F',
  positions: [
    { stringNumber: 1, fret: 1, finger: 1, isBarre: true, barreSpan: 6 },
    { stringNumber: 2, fret: 1, finger: 1, isBarre: true },
    { stringNumber: 3, fret: 2, finger: 2 },
    { stringNumber: 4, fret: 3, finger: 4 },
    { stringNumber: 5, fret: 3, finger: 3 },
    { stringNumber: 6, fret: 1, finger: 1, isBarre: true }
  ],
  barre: {
    fret: 1,
    finger: 1,
    startString: 1,
    endString: 6
  },
  difficulty: 'intermediate'
});

describe('ChordDiagramRenderer', () => {
  describe('Basic Rendering', () => {
    it('renders chord diagram with default props', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByLabelText(/Chord diagram for C on guitar/)).toBeInTheDocument();
    });

    it('renders chord name correctly', () => {
      const chord = createMockChord({ name: 'Am' });
      render(<ChordDiagramRenderer chord={chord} />);
      
      expect(screen.getByText('Am')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const chord = createMockChord();
      const { container } = render(
        <ChordDiagramRenderer chord={chord} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('sets custom width and calculates height', () => {
      const chord = createMockChord();
      const { container } = render(
        <ChordDiagramRenderer chord={chord} width={300} />
      );
      
      const diagramContainer = container.firstChild as HTMLElement;
      expect(diagramContainer).toHaveStyle({ width: '300px', height: '420px' });
    });
  });

  describe('SVG Elements', () => {
    it('renders fretboard grid lines', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const fretLines = svg.querySelectorAll('.fret-line');
      const stringLines = svg.querySelectorAll('.string-line');
      
      expect(fretLines.length).toBeGreaterThan(0);
      expect(stringLines.length).toBe(6); // Guitar has 6 strings
    });

    it('renders finger positions correctly', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const fingerPositions = svg.querySelectorAll('.finger-position');
      
      // Should render fretted notes (excluding open strings and muted)
      const frettedNotes = chord.positions.filter(p => p.fret > 0);
      expect(fingerPositions.length).toBe(frettedNotes.length);
    });

    it('renders open string indicators', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const openIndicators = svg.querySelectorAll('.open-indicator');
      
      const openStrings = chord.positions.filter(p => p.fret === 0);
      expect(openIndicators.length).toBe(openStrings.length);
    });

    it('renders muted string indicators', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const mutedIndicators = svg.querySelectorAll('.muted-indicator');
      
      const mutedStrings = chord.positions.filter(p => p.fret === -1);
      expect(mutedIndicators.length).toBe(mutedStrings.length);
    });

    it('renders barre chord when present', () => {
      render(<ChordDiagramRenderer chord={mockBarreChord} />);
      
      const svg = screen.getByRole('img');
      const barreLine = svg.querySelector('.barre-line');
      
      expect(barreLine).toBeInTheDocument();
    });

    it('renders finger numbers on fretted positions', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const fingerNumbers = svg.querySelectorAll('.finger-number');
      
      const frettedWithFingers = chord.positions.filter(p => p.fret > 0 && p.finger > 0);
      expect(fingerNumbers.length).toBe(frettedWithFingers.length);
    });
  });

  describe('Interactions', () => {
    it('calls onFingerClick when finger position is clicked', () => {
      const onFingerClick = vi.fn();
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} onFingerClick={onFingerClick} />);
      
      const svg = screen.getByRole('img');
      const firstFingerPosition = svg.querySelector('.finger-position');
      
      if (firstFingerPosition) {
        fireEvent.click(firstFingerPosition);
        expect(onFingerClick).toHaveBeenCalled();
      }
    });

    it('shows tooltip on finger hover when showTooltips is true', async () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} showTooltips={true} />);
      
      const svg = screen.getByRole('img');
      const firstFingerPosition = svg.querySelector('.finger-position');
      
      if (firstFingerPosition) {
        fireEvent.mouseEnter(firstFingerPosition);
        
        await waitFor(() => {
          expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });
      }
    });

    it('hides tooltip on finger leave', async () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} showTooltips={true} />);
      
      const svg = screen.getByRole('img');
      const firstFingerPosition = svg.querySelector('.finger-position');
      
      if (firstFingerPosition) {
        fireEvent.mouseEnter(firstFingerPosition);
        await waitFor(() => {
          expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });
        
        fireEvent.mouseLeave(firstFingerPosition);
        await waitFor(() => {
          expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
      }
    });

    it('does not show tooltip when showTooltips is false', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} showTooltips={false} />);
      
      const svg = screen.getByRole('img');
      const firstFingerPosition = svg.querySelector('.finger-position');
      
      if (firstFingerPosition) {
        fireEvent.mouseEnter(firstFingerPosition);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on SVG', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label', 'Chord diagram for C on guitar');
    });

    it('has ARIA labels on finger positions', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const fingerPositions = svg.querySelectorAll('.finger-position');
      
      fingerPositions.forEach(position => {
        expect(position).toHaveAttribute('aria-label');
        expect(position).toHaveAttribute('role', 'button');
      });
    });

    it('has ARIA labels on open string indicators', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const openIndicators = svg.querySelectorAll('.open-indicator');
      
      openIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-label');
      });
    });

    it('has ARIA labels on muted string indicators', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const mutedIndicators = svg.querySelectorAll('.muted-indicator');
      
      mutedIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-label');
      });
    });

    it('has ARIA label on barre chord', () => {
      render(<ChordDiagramRenderer chord={mockBarreChord} />);
      
      const svg = screen.getByRole('img');
      const barreLine = svg.querySelector('.barre-line');
      
      expect(barreLine).toHaveAttribute('aria-label');
    });

    it('supports keyboard navigation', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} />);
      
      const svg = screen.getByRole('img');
      const fingerPositions = svg.querySelectorAll('.finger-position');
      
      fingerPositions.forEach(position => {
        expect(position).toHaveAttribute('role', 'button');
      });
    });
  });

  describe('Theming and Modes', () => {
    it('applies high contrast mode', () => {
      const chord = createMockChord();
      const { container } = render(
        <ChordDiagramRenderer chord={chord} highContrast={true} />
      );
      
      expect(container.firstChild).toHaveClass('high-contrast');
    });

    it('applies print mode', () => {
      const chord = createMockChord();
      const { container } = render(
        <ChordDiagramRenderer chord={chord} printMode={true} />
      );
      
      expect(container.firstChild).toHaveClass('print-mode');
    });

    it('hides tooltip in print mode', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} printMode={true} showTooltips={true} />);
      
      const svg = screen.getByRole('img');
      const firstFingerPosition = svg.querySelector('.finger-position');
      
      if (firstFingerPosition) {
        fireEvent.mouseEnter(firstFingerPosition);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      }
    });
  });

  describe('Multi-instrument Support', () => {
    it('renders ukulele diagram correctly', () => {
      const ukuleleChord = createMockChord({
        name: 'C',
        instrument: INSTRUMENT_CONFIGS.ukulele,
        positions: [
          { stringNumber: 1, fret: 0, finger: 0 }, // A
          { stringNumber: 2, fret: 0, finger: 0 }, // E
          { stringNumber: 3, fret: 0, finger: 0 }, // C
          { stringNumber: 4, fret: 3, finger: 3 }  // G
        ]
      });
      
      render(<ChordDiagramRenderer chord={ukuleleChord} />);
      
      const svg = screen.getByRole('img');
      const stringLines = svg.querySelectorAll('.string-line');
      
      expect(stringLines.length).toBe(4); // Ukulele has 4 strings
      expect(screen.getByLabelText(/Chord diagram for C on ukulele/)).toBeInTheDocument();
    });

    it('renders mandolin diagram correctly', () => {
      const mandolinChord = createMockChord({
        name: 'G',
        instrument: INSTRUMENT_CONFIGS.mandolin,
        positions: [
          { stringNumber: 1, fret: 0, finger: 0 }, // E
          { stringNumber: 2, fret: 0, finger: 0 }, // E
          { stringNumber: 3, fret: 0, finger: 0 }, // A
          { stringNumber: 4, fret: 0, finger: 0 }, // A
          { stringNumber: 5, fret: 0, finger: 0 }, // D
          { stringNumber: 6, fret: 0, finger: 0 }, // D
          { stringNumber: 7, fret: 0, finger: 0 }, // G
          { stringNumber: 8, fret: 0, finger: 0 }  // G
        ]
      });
      
      render(<ChordDiagramRenderer chord={mandolinChord} />);
      
      const svg = screen.getByRole('img');
      const stringLines = svg.querySelectorAll('.string-line');
      
      expect(stringLines.length).toBe(8); // Mandolin has 8 strings (4 pairs)
      expect(screen.getByLabelText(/Chord diagram for G on mandolin/)).toBeInTheDocument();
    });
  });

  describe('Responsive Scaling', () => {
    it('maintains aspect ratio when width changes', () => {
      const chord = createMockChord();
      const { container, rerender } = render(
        <ChordDiagramRenderer chord={chord} width={200} />
      );
      
      let diagramContainer = container.firstChild as HTMLElement;
      expect(diagramContainer).toHaveStyle({ width: '200px', height: '280px' });
      
      rerender(<ChordDiagramRenderer chord={chord} width={400} />);
      
      diagramContainer = container.firstChild as HTMLElement;
      expect(diagramContainer).toHaveStyle({ width: '400px', height: '560px' });
    });

    it('uses SVG viewBox for scalability', () => {
      const chord = createMockChord();
      render(<ChordDiagramRenderer chord={chord} width={300} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('viewBox', '0 0 300 420');
    });
  });

  describe('Error Handling', () => {
    it('handles chord with no positions gracefully', () => {
      const emptyChord = createMockChord({ positions: [] });
      
      expect(() => {
        render(<ChordDiagramRenderer chord={emptyChord} />);
      }).not.toThrow();
    });

    it('handles chord with invalid fret numbers gracefully', () => {
      const invalidChord = createMockChord({
        positions: [
          { stringNumber: 1, fret: -5, finger: 0 }, // Invalid fret
          { stringNumber: 2, fret: 100, finger: 1 }  // Very high fret
        ]
      });
      
      expect(() => {
        render(<ChordDiagramRenderer chord={invalidChord} />);
      }).not.toThrow();
    });
  });
});