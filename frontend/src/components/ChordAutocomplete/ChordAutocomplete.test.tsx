import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChordAutocomplete from './ChordAutocomplete';

describe('ChordAutocomplete', () => {
  const defaultProps = {
    inputText: '',
    onSelectChord: vi.fn(),
    onClose: vi.fn(),
    position: { top: 100, left: 200 },
    visible: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(<ChordAutocomplete {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when visible but no input text', () => {
    const { container } = render(
      <ChordAutocomplete {...defaultProps} visible={true} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders chord suggestions when visible with input text', async () => {
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="C" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chord Suggestions')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });
  });

  it('displays navigation hints', async () => {
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="Am" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/↑↓ navigate, Enter\/Tab select, Esc close/)).toBeInTheDocument();
    });
  });

  it('calls onSelectChord when chord is clicked', async () => {
    const mockOnSelectChord = vi.fn();
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="C" 
        onSelectChord={mockOnSelectChord}
      />
    );

    await waitFor(() => {
      const chordElement = screen.getByText('C');
      fireEvent.click(chordElement.closest('li')!);
    });

    expect(mockOnSelectChord).toHaveBeenCalledWith('C');
  });

  it('positions autocomplete correctly', () => {
    const position = { top: 150, left: 250 };
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="G" 
        position={position}
      />
    );

    const autocomplete = document.querySelector('.chord-autocomplete') as HTMLElement;
    expect(autocomplete.style.top).toBe('150px');
    expect(autocomplete.style.left).toBe('250px');
  });

  it('handles keyboard navigation', async () => {
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="C" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    // Test arrow down navigation
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    
    // The second item should be selected (if multiple suggestions exist)
    const items = document.querySelectorAll('.chord-autocomplete-item');
    if (items.length > 1) {
      expect(items[1]).toHaveClass('selected');
    }
  });

  it('handles Enter key to select chord', async () => {
    const mockOnSelectChord = vi.fn();
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="C" 
        onSelectChord={mockOnSelectChord}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(mockOnSelectChord).toHaveBeenCalled();
  });

  it('handles Escape key to close', async () => {
    const mockOnClose = vi.fn();
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="C" 
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows validity indicators for chords', async () => {
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="C" 
      />
    );

    await waitFor(() => {
      const validityIndicators = screen.getAllByText('✓');
      expect(validityIndicators.length).toBeGreaterThan(0);
    });
  });

  it('filters suggestions based on input text', async () => {
    // Test with specific input that should return limited results
    render(
      <ChordAutocomplete 
        {...defaultProps} 
        visible={true} 
        inputText="Cm" 
      />
    );

    await waitFor(() => {
      // Should show Cm and Cm7, but not Am or Dm
      expect(screen.getByText('Cm')).toBeInTheDocument();
      expect(screen.queryByText('Am')).not.toBeInTheDocument();
    });
  });
});