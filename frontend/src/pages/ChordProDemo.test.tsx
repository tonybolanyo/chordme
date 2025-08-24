import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChordProDemo from './ChordProDemo';

// Mock all the child components 
vi.mock('../components', () => ({
  ChordProEditor: () => <div data-testid="chordpro-editor">Editor</div>,
  ChordProViewer: () => <div data-testid="chordpro-viewer">Viewer</div>,
  ChordPalette: () => <div data-testid="chord-palette">Palette</div>,
  TranspositionControls: () => <div data-testid="transposition-controls">Controls</div>,
}));

// Mock the chord service
vi.mock('../services/chordService', () => ({
  transposeChordProContent: vi.fn((content) => content),
}));

describe('ChordProDemo Component', () => {
  it('renders main title', () => {
    render(<ChordProDemo />);
    expect(screen.getByText('ChordPro Syntax Highlighting Demo')).toBeInTheDocument();
  });

  it('renders all main components', () => {
    render(<ChordProDemo />);
    expect(screen.getByTestId('chordpro-editor')).toBeInTheDocument();
    expect(screen.getByTestId('chordpro-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('chord-palette')).toBeInTheDocument();
    expect(screen.getByTestId('transposition-controls')).toBeInTheDocument();
  });

  it('renders section headers', () => {
    render(<ChordProDemo />);
    expect(screen.getByText('Interactive Editor')).toBeInTheDocument();
    expect(screen.getByText('Rendered Output')).toBeInTheDocument();
    expect(screen.getByText('Raw Content')).toBeInTheDocument();
  });

  it('describes ChordPro features', () => {
    render(<ChordProDemo />);
    expect(screen.getByText(/This demonstrates the ChordPro syntax highlighting features/)).toBeInTheDocument();
    expect(screen.getByText(/Interactive Features/)).toBeInTheDocument();
  });

  it('has proper heading hierarchy', () => {
    render(<ChordProDemo />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  });
});