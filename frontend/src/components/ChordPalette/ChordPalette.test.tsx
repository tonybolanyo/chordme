import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChordPalette from './ChordPalette';

describe('ChordPalette', () => {
  it('renders chord library title', () => {
    render(<ChordPalette />);
    expect(screen.getByText('Chord Library')).toBeInTheDocument();
    expect(screen.getByText('Click to insert chord or drag to position')).toBeInTheDocument();
  });

  it('displays search input and category select', () => {
    render(<ChordPalette />);
    expect(screen.getByPlaceholderText('Search chords...')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
  });

  it('displays chord buttons', () => {
    render(<ChordPalette />);
    
    // Check for some common chords
    expect(screen.getByRole('button', { name: /Insert C chord/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert G chord/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Am chord/i })).toBeInTheDocument();
  });

  it('calls onChordSelect when chord button is clicked', () => {
    const mockOnChordSelect = vi.fn();
    render(<ChordPalette onChordSelect={mockOnChordSelect} />);
    
    const cChordButton = screen.getByRole('button', { name: /Insert C chord/i });
    fireEvent.click(cChordButton);
    
    expect(mockOnChordSelect).toHaveBeenCalledWith('[C]');
  });

  it('filters chords by search term', () => {
    render(<ChordPalette />);
    
    const searchInput = screen.getByPlaceholderText('Search chords...');
    fireEvent.change(searchInput, { target: { value: 'maj7' } });
    
    // Should show major7 chords
    expect(screen.getByRole('button', { name: /Insert Cmaj7 chord/i })).toBeInTheDocument();
    
    // Should not show regular major chords
    expect(screen.queryByRole('button', { name: /Insert C chord/i })).not.toBeInTheDocument();
  });

  it('filters chords by category', () => {
    render(<ChordPalette />);
    
    const categorySelect = screen.getByLabelText('Filter by category');
    fireEvent.change(categorySelect, { target: { value: 'minor' } });
    
    // Should show minor chords
    expect(screen.getByRole('button', { name: /Insert Am chord/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Em chord/i })).toBeInTheDocument();
    
    // Should not show major chords
    expect(screen.queryByRole('button', { name: /Insert C chord/i })).not.toBeInTheDocument();
  });

  it('shows clear search button when searching', () => {
    render(<ChordPalette />);
    
    const searchInput = screen.getByPlaceholderText('Search chords...');
    fireEvent.change(searchInput, { target: { value: 'G' } });
    
    const clearButton = screen.getByRole('button', { name: /Clear search/i });
    expect(clearButton).toBeInTheDocument();
    
    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
  });

  it('shows empty state when no chords match search', () => {
    render(<ChordPalette />);
    
    const searchInput = screen.getByPlaceholderText('Search chords...');
    fireEvent.change(searchInput, { target: { value: 'XYZ' } });
    
    expect(screen.getByText(/No chords found matching "XYZ"/i)).toBeInTheDocument();
    expect(screen.getByText('Clear search')).toBeInTheDocument();
  });

  it('displays chord count', () => {
    render(<ChordPalette />);
    
    // Should display total number of chords
    expect(screen.getByText(/\d+ of \d+ chords/)).toBeInTheDocument();
  });

  it('applies custom className and style', () => {
    const customStyle = { backgroundColor: 'rgb(255, 0, 0)' };
    const { container } = render(
      <ChordPalette className="custom-class" style={customStyle} />
    );
    
    const chordPalette = container.firstChild as HTMLElement;
    expect(chordPalette).toHaveClass('chord-palette', 'custom-class');
    expect(chordPalette).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  it('handles keyboard interaction on search input', () => {
    render(<ChordPalette />);
    
    const searchInput = screen.getByPlaceholderText('Search chords...');
    
    // Focus and type
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'Am' } });
    
    expect(searchInput).toHaveValue('Am');
    expect(screen.getByRole('button', { name: /Insert Am chord/i })).toBeInTheDocument();
  });

  it('supports drag and drop functionality', () => {
    const mockOnChordSelect = vi.fn();
    render(<ChordPalette onChordSelect={mockOnChordSelect} />);
    
    const chordButton = screen.getByRole('button', { name: /Insert C chord/i });
    
    // Check that the button is draggable
    expect(chordButton).toHaveAttribute('draggable', 'true');
    
    // Test drag start event using fireEvent
    const mockDataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
    };
    
    fireEvent.dragStart(chordButton, {
      dataTransfer: mockDataTransfer,
    });
    
    // Verify data transfer was called with correct data
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', '[C]');
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/chord', 'C');
  });
});