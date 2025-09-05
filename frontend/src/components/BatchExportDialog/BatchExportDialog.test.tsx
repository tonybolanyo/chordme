import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BatchExportDialog from './BatchExportDialog';

const mockSongs = [
  {
    id: '1',
    title: 'Amazing Grace',
    content: 'Amazing grace how sweet the sound',
    author: 'John Newton',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2', 
    title: 'House of the Rising Sun',
    content: 'There is a house in New Orleans',
    author: 'The Animals',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Wonderwall',
    content: 'Today is gonna be the day',
    author: 'Oasis',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockOnClose = vi.fn();
const mockOnExport = vi.fn();

describe('BatchExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders song list when open', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    expect(screen.getByText('Batch Export Songs')).toBeInTheDocument();
    expect(screen.getByText('Select Songs (0 of 3)')).toBeInTheDocument();
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
    expect(screen.getByText('John Newton')).toBeInTheDocument();
    expect(screen.getByText('House of the Rising Sun')).toBeInTheDocument();
    expect(screen.getByText('The Animals')).toBeInTheDocument();
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    expect(screen.getByText('Oasis')).toBeInTheDocument();
  });

  it('handles song selection correctly', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    // Select first song
    const firstSongCheckbox = screen.getByRole('checkbox', { name: /Amazing Grace/i });
    fireEvent.click(firstSongCheckbox);

    expect(screen.getByText('Select Songs (1 of 3)')).toBeInTheDocument();
    expect(screen.getByText('Export 1 Song')).toBeInTheDocument();

    // Select second song
    const secondSongCheckbox = screen.getByRole('checkbox', { name: /House of the Rising Sun/i });
    fireEvent.click(secondSongCheckbox);

    expect(screen.getByText('Select Songs (2 of 3)')).toBeInTheDocument();
    expect(screen.getByText('Export 2 Songs')).toBeInTheDocument();
  });

  it('handles select all functionality', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    expect(screen.getByText('Select Songs (3 of 3)')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
    expect(screen.getByText('Export 3 Songs')).toBeInTheDocument();

    // Click deselect all
    fireEvent.click(screen.getByText('Deselect All'));

    expect(screen.getByText('Select Songs (0 of 3)')).toBeInTheDocument();
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });

  it('calls onExport with selected songs and options', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    // Select songs
    fireEvent.click(screen.getByRole('checkbox', { name: /Amazing Grace/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Wonderwall/i }));

    // Change some options
    fireEvent.change(screen.getByLabelText('Paper Size:'), { target: { value: 'letter' } });
    fireEvent.change(screen.getByLabelText('Template:'), { target: { value: 'classic' } });

    // Click export
    const exportButton = screen.getByText('Export 2 Songs');
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledWith(
      ['1', '3'],
      expect.objectContaining({
        paperSize: 'letter',
        template: 'classic',
        orientation: 'portrait',
        includeChordDiagrams: true,
        fontSize: 12,
        fontFamily: 'Helvetica',
        quality: 'standard',
      })
    );
  });

  it('disables export button when no songs selected', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    const exportButton = screen.getByRole('button', { name: /Export/i });
    expect(exportButton).toBeDisabled();
  });

  it('disables form elements when exporting', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={true}
      />
    );

    expect(screen.getByLabelText('Paper Size:')).toBeDisabled();
    expect(screen.getByLabelText('Template:')).toBeDisabled();
    expect(screen.getByText('Select All')).toBeDisabled();
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={false}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    expect(screen.queryByText('Batch Export Songs')).not.toBeInTheDocument();
  });

  it('handles empty song list gracefully', () => {
    render(
      <BatchExportDialog
        songs={[]}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    expect(screen.getByText('Select Songs (0 of 0)')).toBeInTheDocument();
    // When no songs, it should show "Deselect All" since selectedSongs.size === songs.length (both 0)
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
    expect(screen.queryByText('Amazing Grace')).not.toBeInTheDocument();
  });

  it('updates export options correctly', () => {
    render(
      <BatchExportDialog
        songs={mockSongs}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    // Select a song first
    fireEvent.click(screen.getByRole('checkbox', { name: /Amazing Grace/i }));

    // Change various options
    fireEvent.change(screen.getByLabelText('Paper Size:'), { target: { value: 'legal' } });
    fireEvent.change(screen.getByLabelText('Orientation:'), { target: { value: 'landscape' } });
    fireEvent.change(screen.getByLabelText('Quality:'), { target: { value: 'print' } });
    
    // Toggle chord diagrams
    const chordDiagramsCheckbox = screen.getByLabelText('Include chord diagrams');
    fireEvent.click(chordDiagramsCheckbox);

    // Export and verify options
    fireEvent.click(screen.getByText('Export 1 Song'));

    expect(mockOnExport).toHaveBeenCalledWith(
      ['1'],
      expect.objectContaining({
        paperSize: 'legal',
        orientation: 'landscape',
        quality: 'print',
        includeChordDiagrams: false, // toggled off
      })
    );
  });
});