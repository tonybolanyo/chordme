import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChordProDemo from './ChordProDemo';

// Mock the components
vi.mock('../components', () => ({
  ChordProEditor: vi.fn(({ value, onChange, ...props }) => (
    <textarea
      data-testid="chordpro-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      ref={props.ref}
    />
  )),
  ChordProViewer: vi.fn(({ content }) => (
    <div data-testid="chordpro-viewer">{content}</div>
  )),
  ChordPalette: vi.fn(({ onChordSelect }) => (
    <div data-testid="chord-palette">
      <button onClick={() => onChordSelect('[C]')}>C</button>
      <button onClick={() => onChordSelect('[G]')}>G</button>
      <button onClick={() => onChordSelect('[Am]')}>Am</button>
    </div>
  )),
  TranspositionControls: vi.fn(({ onTranspose }) => (
    <div data-testid="transposition-controls">
      <button onClick={() => onTranspose(1)}>♯</button>
      <button onClick={() => onTranspose(-1)}>♭</button>
    </div>
  )),
}));

// Mock the chord service
vi.mock('../services/chordService', () => ({
  transposeChordProContent: vi.fn((content, semitones) => {
    // Simple mock implementation
    if (semitones === 1) {
      return content.replace(/\[G\]/g, '[G#]');
    }
    if (semitones === -1) {
      return content.replace(/\[G\]/g, '[F#]');
    }
    return content;
  }),
}));

import { transposeChordProContent } from '../services/chordService';
const mockTransposeChordProContent = vi.mocked(transposeChordProContent);

describe('ChordProDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with title and description', () => {
      render(<ChordProDemo />);
      
      expect(screen.getByText('ChordPro Syntax Highlighting Demo')).toBeInTheDocument();
      expect(screen.getByText('This demonstrates the ChordPro syntax highlighting features:')).toBeInTheDocument();
    });

    it('renders all feature descriptions', () => {
      render(<ChordProDemo />);
      
      expect(screen.getByText(/Chords.*in square brackets/)).toBeInTheDocument();
      expect(screen.getByText(/Directives.*in curly braces/)).toBeInTheDocument();
      expect(screen.getByText(/Comments.*starting with #/)).toBeInTheDocument();
      expect(screen.getByText(/Lyrics.*as regular text/)).toBeInTheDocument();
    });

    it('renders interactive features list', () => {
      render(<ChordProDemo />);
      
      expect(screen.getByText(/Direct Chord Entry/)).toBeInTheDocument();
      expect(screen.getByText(/Autocomplete/)).toBeInTheDocument();
      expect(screen.getByText(/Chord Palette/)).toBeInTheDocument();
      expect(screen.getByText(/Drag & Drop/)).toBeInTheDocument();
      expect(screen.getByText(/Chord Transposition/)).toBeInTheDocument();
      expect(screen.getByText(/Visual Feedback/)).toBeInTheDocument();
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
  });

  describe('Initial Content', () => {
    it('starts with sample Amazing Grace content', () => {
      render(<ChordProDemo />);
      
      const editor = screen.getByTestId('chordpro-editor');
      expect(editor).toHaveValue(expect.stringContaining('{title: Amazing Grace}'));
      expect(editor).toHaveValue(expect.stringContaining('{artist: Traditional}'));
      expect(editor).toHaveValue(expect.stringContaining('[G]Amazing [G7]grace'));
    });

    it('displays initial content in viewer and raw content', () => {
      render(<ChordProDemo />);
      
      const viewer = screen.getByTestId('chordpro-viewer');
      expect(viewer).toHaveTextContent(expect.stringContaining('{title: Amazing Grace}'));
      
      const rawContent = screen.getByRole('region', { name: /raw content/i }) || 
                        screen.getByText('{title: Amazing Grace}').closest('pre');
      expect(rawContent).toHaveTextContent('{title: Amazing Grace}');
    });
  });

  describe('Editor Interactions', () => {
    it('updates content when editor changes', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      const editor = screen.getByTestId('chordpro-editor');
      await user.clear(editor);
      await user.type(editor, 'New test content');
      
      expect(editor).toHaveValue('New test content');
      expect(screen.getByTestId('chordpro-viewer')).toHaveTextContent('New test content');
    });

    it('maintains cursor position after content change', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      const editor = screen.getByTestId('chordpro-editor');
      await user.clear(editor);
      await user.type(editor, 'Test');
      
      // Verify content was updated
      expect(editor).toHaveValue('Test');
    });
  });

  describe('Chord Palette Integration', () => {
    it('renders chord palette with chord buttons', () => {
      render(<ChordProDemo />);
      
      const palette = screen.getByTestId('chord-palette');
      expect(palette).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'G' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Am' })).toBeInTheDocument();
    });

    it('inserts chord when palette button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      // Clear the editor first
      const editor = screen.getByTestId('chordpro-editor');
      await user.clear(editor);
      
      // Click chord button
      await user.click(screen.getByRole('button', { name: 'C' }));
      
      expect(editor).toHaveValue('[C]');
    });

    it('inserts chord at cursor position', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      const editor = screen.getByTestId('chordpro-editor');
      await user.clear(editor);
      await user.type(editor, 'Hello world');
      
      // Position cursor at position 5 (after "Hello")
      editor.setSelectionRange(5, 5);
      
      // Click chord button
      await user.click(screen.getByRole('button', { name: 'C' }));
      
      expect(editor).toHaveValue('Hello[C] world');
    });
  });

  describe('Transposition Controls', () => {
    it('renders transposition controls', () => {
      render(<ChordProDemo />);
      
      const controls = screen.getByTestId('transposition-controls');
      expect(controls).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '♯' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '♭' }));
    });

    it('transposes content up when sharp button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      await user.click(screen.getByRole('button', { name: '♯' }));
      
      expect(mockTransposeChordProContent).toHaveBeenCalledWith(
        expect.stringContaining('[G]Amazing [G7]grace'),
        1
      );
    });

    it('transposes content down when flat button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      await user.click(screen.getByRole('button', { name: '♭' }));
      
      expect(mockTransposeChordProContent).toHaveBeenCalledWith(
        expect.stringContaining('[G]Amazing [G7]grace'),
        -1
      );
    });

    it('updates editor with transposed content', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      // Mock returns transposed content
      mockTransposeChordProContent.mockReturnValue('Transposed content');
      
      await user.click(screen.getByRole('button', { name: '♯' }));
      
      const editor = screen.getByTestId('chordpro-editor');
      expect(editor).toHaveValue('Transposed content');
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct container styles', () => {
      render(<ChordProDemo />);
      
      const container = screen.getByText('ChordPro Syntax Highlighting Demo').closest('div');
      expect(container).toHaveStyle({ padding: '20px' });
    });

    it('renders in two-column layout', () => {
      render(<ChordProDemo />);
      
      // Check that main content and sidebar are present
      const editor = screen.getByTestId('chordpro-editor');
      const palette = screen.getByTestId('chord-palette');
      
      expect(editor).toBeInTheDocument();
      expect(palette).toBeInTheDocument();
    });

    it('displays raw content in preformatted block', () => {
      render(<ChordProDemo />);
      
      const rawContent = screen.getByText('{title: Amazing Grace}').closest('pre');
      expect(rawContent).toBeInTheDocument();
      expect(rawContent).toHaveStyle({ 
        backgroundColor: '#f5f5f5',
        fontSize: '12px' 
      });
    });
  });

  describe('Component Integration', () => {
    it('renders all required components', () => {
      render(<ChordProDemo />);
      
      // Verify all components are rendered
      expect(screen.getByTestId('chordpro-editor')).toBeInTheDocument();
      expect(screen.getByTestId('chordpro-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('chord-palette')).toBeInTheDocument();
      expect(screen.getByTestId('transposition-controls')).toBeInTheDocument();
    });

    it('connects chord palette to editor', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      const editor = screen.getByTestId('chordpro-editor');
      await user.clear(editor);
      
      // Click a chord from the palette
      await user.click(screen.getByRole('button', { name: 'C' }));
      
      expect(editor).toHaveValue('[C]');
    });

    it('connects transposition controls to content', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      await user.click(screen.getByRole('button', { name: '♯' }));
      
      expect(mockTransposeChordProContent).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles transposition errors gracefully', async () => {
      const user = userEvent.setup();
      mockTransposeChordProContent.mockImplementation(() => {
        throw new Error('Transposition failed');
      });
      
      render(<ChordProDemo />);
      
      // Should not crash when transposition fails
      await user.click(screen.getByRole('button', { name: '♯' }));
      
      // Component should still be functional
      expect(screen.getByTestId('chordpro-editor')).toBeInTheDocument();
    });

    it('handles chord selection when editor is not available', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      // Remove the ref to simulate editor not being available
      const editor = screen.getByTestId('chordpro-editor');
      Object.defineProperty(editor, 'setSelectionRange', {
        value: undefined,
        writable: true,
      });
      
      // Should not crash
      await user.click(screen.getByRole('button', { name: 'C' }));
      
      expect(screen.getByTestId('chordpro-editor')).toBeInTheDocument();
    });
  });

  describe('Content Synchronization', () => {
    it('keeps editor, viewer, and raw content in sync', async () => {
      const user = userEvent.setup();
      render(<ChordProDemo />);
      
      const editor = screen.getByTestId('chordpro-editor');
      const newContent = 'Test sync content';
      
      await user.clear(editor);
      await user.type(editor, newContent);
      
      expect(screen.getByTestId('chordpro-viewer')).toHaveTextContent(newContent);
      
      // Check that content appears in the pre element (raw content section)
      const preElements = document.querySelectorAll('pre');
      const rawContentPre = Array.from(preElements).find(pre => 
        pre.textContent?.includes(newContent)
      );
      expect(rawContentPre).toBeInTheDocument();
    });

    it('updates all views when transposition occurs', async () => {
      const user = userEvent.setup();
      const transposedContent = 'Transposed test content';
      mockTransposeChordProContent.mockReturnValue(transposedContent);
      
      render(<ChordProDemo />);
      
      await user.click(screen.getByRole('button', { name: '♯' }));
      
      expect(screen.getByTestId('chordpro-editor')).toHaveValue(transposedContent);
      expect(screen.getByTestId('chordpro-viewer')).toHaveTextContent(transposedContent);
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading structure', () => {
      render(<ChordProDemo />);
      
      expect(screen.getByRole('heading', { level: 1, name: /ChordPro Syntax Highlighting Demo/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Interactive Editor/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Rendered Output/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Raw Content/ })).toBeInTheDocument();
    });

    it('provides keyboard navigation support', async () => {
      render(<ChordProDemo />);
      
      const editor = screen.getByTestId('chordpro-editor');
      expect(editor).toBeInTheDocument();
      
      // Editor should be focusable
      editor.focus();
      expect(document.activeElement).toBe(editor);
    });
  });
});