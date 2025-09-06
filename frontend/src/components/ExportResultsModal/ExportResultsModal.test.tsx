import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportResultsModal from './ExportResultsModal';
import { ExportConfig } from '../../types';

describe('ExportResultsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnExport = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onExport: mockOnExport,
    selectedCount: 3,
    selectedTitles: ['Song 1 - Artist 1', 'Song 2 - Artist 2', 'Song 3 - Artist 3'],
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnExport.mockClear();
  });

  it('renders nothing when not open', () => {
    const { container } = render(
      <ExportResultsModal
        {...defaultProps}
        isOpen={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays selected count', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('shows selected song titles', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    expect(screen.getByText('Song 1 - Artist 1')).toBeInTheDocument();
    expect(screen.getByText('Song 2 - Artist 2')).toBeInTheDocument();
    expect(screen.getByText('Song 3 - Artist 3')).toBeInTheDocument();
  });

  it('shows preview when more than 3 songs selected', () => {
    const manyTitles = Array.from({ length: 5 }, (_, i) => `Song ${i + 1} - Artist ${i + 1}`);
    
    render(
      <ExportResultsModal
        {...defaultProps}
        selectedCount={5}
        selectedTitles={manyTitles}
      />
    );
    
    expect(screen.getByText('Song 1 - Artist 1')).toBeInTheDocument();
    expect(screen.getByText('Song 2 - Artist 2')).toBeInTheDocument();
    expect(screen.getByText('Song 3 - Artist 3')).toBeInTheDocument();
    expect(screen.getByText('...and 2 more')).toBeInTheDocument();
  });

  it('renders all export format options', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    expect(screen.getByLabelText(/PDF/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Text/)).toBeInTheDocument();
    expect(screen.getByLabelText(/JSON/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CSV/)).toBeInTheDocument();
  });

  it('has PDF selected by default', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const pdfRadio = screen.getByRole('radio', { name: /PDF/ });
    expect(pdfRadio).toBeChecked();
  });

  it('allows changing export format', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const jsonRadio = screen.getByRole('radio', { name: /JSON/ });
    fireEvent.click(jsonRadio);
    
    expect(jsonRadio).toBeChecked();
  });

  it('renders content options', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    expect(screen.getByText('Include metadata (artist, genre, key, etc.)')).toBeInTheDocument();
    expect(screen.getByText('Include lyrics')).toBeInTheDocument();
    expect(screen.getByText('Include chord notations')).toBeInTheDocument();
  });

  it('has all content options checked by default', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const metadataCheckbox = screen.getByRole('checkbox', { name: /metadata/ });
    const lyricsCheckbox = screen.getByRole('checkbox', { name: /lyrics/ });
    const chordsCheckbox = screen.getByRole('checkbox', { name: /chord/ });
    
    expect(metadataCheckbox).toBeChecked();
    expect(lyricsCheckbox).toBeChecked();
    expect(chordsCheckbox).toBeChecked();
  });

  it('calls onClose when close button clicked', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: 'Close export modal' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button clicked', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onExport with config when export button clicked', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: 'Export 3 Songs' });
    fireEvent.click(exportButton);
    
    expect(mockOnExport).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'pdf',
        includeMetadata: true,
        includeLyrics: true,
        includeChords: true,
      })
    );
  });

  it('updates file extension when format changes', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    expect(screen.getByText('.pdf')).toBeInTheDocument();
    
    const txtRadio = screen.getByRole('radio', { name: /Text/ });
    fireEvent.click(txtRadio);
    
    expect(screen.getByText('.txt')).toBeInTheDocument();
  });

  it('allows custom file name', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const fileNameInput = screen.getByDisplayValue(/search-results-/);
    fireEvent.change(fileNameInput, { target: { value: 'my-songs' } });
    
    expect(fileNameInput).toHaveValue('my-songs');
  });

  it('closes modal when overlay clicked', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const overlay = screen.getByText('Export Search Results').closest('.export-modal-overlay');
    fireEvent.click(overlay!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close modal when modal content clicked', () => {
    render(<ExportResultsModal {...defaultProps} />);
    
    const modal = screen.getByText('Export Search Results').closest('.export-modal');
    fireEvent.click(modal!);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});