import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistoryPanel from './HistoryPanel';
import { versionHistoryService } from '../../services/versionHistory';
import type { SongVersion } from '../../services/versionHistory';

// Mock the CSS import
vi.mock('./HistoryPanel.css', () => ({}));

// Mock the version history service
vi.mock('../../services/versionHistory', () => ({
  versionHistoryService: {
    getVersions: vi.fn(),
    restoreVersion: vi.fn(),
    formatVersionForDisplay: vi.fn(),
  },
}));

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('HistoryPanel', () => {
  const defaultProps = {
    songId: 'test-song-123',
    currentTitle: 'Test Song',
    currentContent: 'Current content',
    isOpen: true,
    onClose: vi.fn(),
    onRestore: vi.fn(),
    onPreview: vi.fn(),
  };

  const mockVersions: SongVersion[] = [
    {
      id: 1,
      song_id: 'test-song-123',
      version_number: 2,
      title: 'Test Song v2',
      content: 'Version 2 content',
      created_at: '2023-01-02T10:00:00Z',
      description: 'Added chorus',
    },
    {
      id: 2,
      song_id: 'test-song-123',
      version_number: 1,
      title: 'Test Song v1',
      content: 'Version 1 content',
      created_at: '2023-01-01T10:00:00Z',
      description: 'Initial version',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);

    // Setup default mock implementations
    vi.mocked(versionHistoryService.getVersions).mockResolvedValue(mockVersions);
    vi.mocked(versionHistoryService.restoreVersion).mockResolvedValue(undefined);
    vi.mocked(versionHistoryService.formatVersionForDisplay).mockImplementation((version) => ({
      title: `Version ${version.version_number}`,
      subtitle: version.description || 'No description',
      timestamp: new Date(version.created_at).toLocaleDateString(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<HistoryPanel {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Version History')).not.toBeInTheDocument();
  });

  it('renders panel when isOpen is true', () => {
    render(<HistoryPanel {...defaultProps} />);
    
    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close history panel' })).toBeInTheDocument();
  });

  it('loads versions when panel opens', async () => {
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(versionHistoryService.getVersions).toHaveBeenCalledWith('test-song-123');
    });
  });

  it('shows loading state while fetching versions', () => {
    // Make the service return a pending promise
    vi.mocked(versionHistoryService.getVersions).mockReturnValue(new Promise(() => {}));
    
    render(<HistoryPanel {...defaultProps} />);
    
    expect(screen.getByText('Loading version history...')).toBeInTheDocument();
    expect(screen.getByRole('generic', { name: /spinner/i })).toBeInTheDocument();
  });

  it('displays current version section', async () => {
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Current Version')).toBeInTheDocument();
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  it('displays version history list', async () => {
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
      expect(screen.getByText('Version 1')).toBeInTheDocument();
      expect(screen.getByText('Added chorus')).toBeInTheDocument();
      expect(screen.getByText('Initial version')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<HistoryPanel {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Close history panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles preview button click', async () => {
    const onPreview = vi.fn();
    render(<HistoryPanel {...defaultProps} onPreview={onPreview} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByText('Preview');
    fireEvent.click(previewButtons[0]);
    
    expect(onPreview).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('shows content preview when version is selected', async () => {
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByText('Preview');
    fireEvent.click(previewButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Content Preview:')).toBeInTheDocument();
      expect(screen.getByText('Version 2 content')).toBeInTheDocument();
    });
  });

  it('handles restore button click with confirmation', async () => {
    const onRestore = vi.fn();
    render(<HistoryPanel {...defaultProps} onRestore={onRestore} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);
    
    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to restore to version 2? This will create a new version with the restored content.'
    );
    
    await waitFor(() => {
      expect(versionHistoryService.restoreVersion).toHaveBeenCalledWith('test-song-123', 1);
      expect(onRestore).toHaveBeenCalledWith(mockVersions[0]);
    });
  });

  it('does not restore when confirmation is cancelled', async () => {
    mockConfirm.mockReturnValue(false);
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);
    
    expect(versionHistoryService.restoreVersion).not.toHaveBeenCalled();
  });

  it('shows restoring state during restore operation', async () => {
    // Make restore take some time
    vi.mocked(versionHistoryService.restoreVersion).mockReturnValue(
      new Promise((resolve) => setTimeout(resolve, 100))
    );
    
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Restoring...')).toBeInTheDocument();
    });
  });

  it('handles error state during loading', async () => {
    vi.mocked(versionHistoryService.getVersions).mockRejectedValue(
      new Error('Failed to load versions')
    );
    
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load versions')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('handles error state during restore', async () => {
    vi.mocked(versionHistoryService.restoreVersion).mockRejectedValue(
      new Error('Restore failed')
    );
    
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Restore failed')).toBeInTheDocument();
    });
  });

  it('retries loading versions when retry button is clicked', async () => {
    vi.mocked(versionHistoryService.getVersions)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockVersions);
    
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });
    
    expect(versionHistoryService.getVersions).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no versions exist', async () => {
    vi.mocked(versionHistoryService.getVersions).mockResolvedValue([]);
    
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No version history available.')).toBeInTheDocument();
      expect(screen.getByText(/Versions will appear here after you save changes/)).toBeInTheDocument();
    });
  });

  it('reloads versions after successful restore', async () => {
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('Restore');
    fireEvent.click(restoreButtons[0]);
    
    await waitFor(() => {
      expect(versionHistoryService.getVersions).toHaveBeenCalledTimes(2);
    });
  });

  it('loads versions when songId changes', () => {
    const { rerender } = render(<HistoryPanel {...defaultProps} />);
    
    expect(versionHistoryService.getVersions).toHaveBeenCalledWith('test-song-123');
    
    rerender(<HistoryPanel {...defaultProps} songId="different-song" />);
    
    expect(versionHistoryService.getVersions).toHaveBeenCalledWith('different-song');
  });

  it('does not load versions when panel is closed', () => {
    render(<HistoryPanel {...defaultProps} isOpen={false} />);
    
    expect(versionHistoryService.getVersions).not.toHaveBeenCalled();
  });

  it('applies selected class to active version', async () => {
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByText('Preview');
    fireEvent.click(previewButtons[0]);
    
    await waitFor(() => {
      const versionItem = screen.getByText('Version 2').closest('.version-item');
      expect(versionItem).toHaveClass('selected');
    });
  });

  it('formats version display correctly', async () => {
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(versionHistoryService.formatVersionForDisplay).toHaveBeenCalledWith(mockVersions[0]);
      expect(versionHistoryService.formatVersionForDisplay).toHaveBeenCalledWith(mockVersions[1]);
    });
  });

  it('disables buttons during restore operation', async () => {
    vi.mocked(versionHistoryService.restoreVersion).mockReturnValue(
      new Promise((resolve) => setTimeout(resolve, 100))
    );
    
    render(<HistoryPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText('Restore');
    const previewButtons = screen.getAllByText('Preview');
    
    fireEvent.click(restoreButtons[0]);
    
    await waitFor(() => {
      expect(restoreButtons[0]).toBeDisabled();
      expect(previewButtons[0]).toBeDisabled();
    });
  });

  it('handles numeric songId', async () => {
    render(<HistoryPanel {...defaultProps} songId={'123'} />);
    
    await waitFor(() => {
      expect(versionHistoryService.getVersions).toHaveBeenCalledWith('123');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<HistoryPanel {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: 'Close history panel' })).toBeInTheDocument();
  });

  describe('Edge cases', () => {
    it('handles empty songId', () => {
      render(<HistoryPanel {...defaultProps} songId="" />);
      
      expect(versionHistoryService.getVersions).not.toHaveBeenCalled();
    });

    it('handles null/undefined error objects', async () => {
      vi.mocked(versionHistoryService.getVersions).mockRejectedValue(null);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load version history')).toBeInTheDocument();
      });
    });

    it('handles restore with null/undefined error', async () => {
      vi.mocked(versionHistoryService.restoreVersion).mockRejectedValue(null);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 2')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to restore version')).toBeInTheDocument();
      });
    });

    it('clears error state when retrying', async () => {
      vi.mocked(versionHistoryService.getVersions)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockVersions);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try Again'));
      
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
        expect(screen.getByText('Version 2')).toBeInTheDocument();
      });
    });
  });
});