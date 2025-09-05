import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PDFExportModal from './PDFExportModal';
import { apiService } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn(),
  },
}));

const mockSong = {
  id: '1',
  title: 'Test Song',
  content: 'This is a test song content',
  author: 'Test Author',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockOnClose = vi.fn();
const mockOnExport = vi.fn();

describe('PDFExportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful template loading
    (apiService.get as any).mockResolvedValue({
      status: 'success',
      data: [
        { name: 'modern', description: 'Clean, contemporary design', predefined: true },
        { name: 'classic', description: 'Traditional sheet music appearance', predefined: true },
      ],
    });
  });

  it('renders basic export options when open', () => {
    render(
      <PDFExportModal
        song={mockSong}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('Title (optional override):')).toBeInTheDocument();
    expect(screen.getByLabelText('Artist (optional):')).toBeInTheDocument();
    expect(screen.getByLabelText('Paper Size:')).toBeInTheDocument();
    expect(screen.getByLabelText('Orientation:')).toBeInTheDocument();
    expect(screen.getByLabelText('Template:')).toBeInTheDocument();
    expect(screen.getByLabelText('Include chord diagrams')).toBeInTheDocument();
  });

  it('loads templates on mount', async () => {
    render(
      <PDFExportModal
        song={mockSong}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith('/api/v1/pdf/templates');
    });

    await waitFor(() => {
      expect(screen.getByText('Clean, contemporary design')).toBeInTheDocument();
    });
  });

  it('shows advanced options when toggle is clicked', async () => {
    render(
      <PDFExportModal
        song={mockSong}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    const advancedToggle = screen.getByText('▶ Show Advanced Options');
    fireEvent.click(advancedToggle);

    await waitFor(() => {
      expect(screen.getByLabelText('Font Family:')).toBeInTheDocument();
      expect(screen.getByLabelText('Font Size:')).toBeInTheDocument();
      expect(screen.getByText('Margins (inches)')).toBeInTheDocument();
      expect(screen.getByLabelText('Header Text:')).toBeInTheDocument();
      expect(screen.getByLabelText('Footer Text:')).toBeInTheDocument();
      expect(screen.getByLabelText('Export Quality:')).toBeInTheDocument();
    });

    expect(screen.getByText('▼ Hide Advanced Options')).toBeInTheDocument();
  });

  it('calls onExport with all options when form is submitted', async () => {
    render(
      <PDFExportModal
        song={mockSong}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Clean, contemporary design')).toBeInTheDocument();
    });

    // Change some options
    fireEvent.change(screen.getByLabelText('Artist (optional):'), {
      target: { value: 'Test Artist' },
    });

    fireEvent.change(screen.getByLabelText('Template:'), {
      target: { value: 'classic' },
    });

    const chordDiagramsCheckbox = screen.getByLabelText('Include chord diagrams');
    fireEvent.click(chordDiagramsCheckbox);

    // Submit the form
    const exportButton = screen.getByText('Export PDF');
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledWith(
      expect.objectContaining({
        paperSize: 'a4',
        orientation: 'portrait',
        title: 'Test Song',
        artist: 'Test Artist',
        template: 'classic',
        includeChordDiagrams: false, // toggled off
        fontSize: 12,
        fontFamily: 'Helvetica',
        marginTop: 0.5,
        marginBottom: 0.5,
        marginLeft: 0.75,
        marginRight: 0.75,
        headerText: '',
        footerText: '',
        quality: 'standard',
      })
    );
  });

  it('handles template loading failure gracefully', async () => {
    // Mock API failure
    (apiService.get as any).mockRejectedValue(new Error('Network error'));

    render(
      <PDFExportModal
        song={mockSong}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    await waitFor(() => {
      // Should fall back to default templates
      expect(screen.getByText('Clean, contemporary design')).toBeInTheDocument();
      expect(screen.getByText('Traditional sheet music appearance')).toBeInTheDocument();
      expect(screen.getByText('Simplified layout')).toBeInTheDocument();
    });
  });

  it('disables form elements when exporting', () => {
    render(
      <PDFExportModal
        song={mockSong}
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={true}
      />
    );

    expect(screen.getByLabelText('Title (optional override):')).toBeDisabled();
    expect(screen.getByLabelText('Artist (optional):')).toBeDisabled();
    expect(screen.getByLabelText('Paper Size:')).toBeDisabled();
    expect(screen.getByLabelText('Orientation:')).toBeDisabled();
    expect(screen.getByLabelText('Include chord diagrams')).toBeDisabled();
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <PDFExportModal
        song={mockSong}
        isOpen={false}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
      />
    );

    expect(screen.queryByText('Export as PDF')).not.toBeInTheDocument();
  });
});