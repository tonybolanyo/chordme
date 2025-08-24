import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveFileList } from './GoogleDriveFileList';
import type { DriveFile, DriveFileList } from '../../types';

// Mock the Google OAuth service
vi.mock('../../services/googleOAuth', () => ({
  googleOAuth2Service: {
    listDriveFiles: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

import { googleOAuth2Service } from '../../services/googleOAuth';

// Sample test data
const mockFiles: DriveFile[] = [
  {
    id: 'file1',
    name: 'test-song.txt',
    mimeType: 'text/plain',
    modifiedTime: '2023-01-01T12:00:00Z',
    size: '1024',
    webViewLink: 'https://drive.google.com/file/d/file1/view',
  },
  {
    id: 'file2',
    name: 'another-song.txt',
    mimeType: 'text/plain',
    modifiedTime: '2023-01-02T12:00:00Z',
    size: '2048',
    webViewLink: 'https://drive.google.com/file/d/file2/view',
  },
];

const mockFileListResponse: DriveFileList = {
  files: mockFiles,
  nextPageToken: 'next-token',
  incompleteSearch: false,
};

describe('GoogleDriveFileList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication State', () => {
    it('shows sign-in message when not authenticated', () => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(false);
      
      render(<GoogleDriveFileList />);
      
      expect(screen.getByText('Please sign in with Google to access Drive files.')).toBeInTheDocument();
    });

    it('loads files when authenticated', async () => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
      vi.mocked(googleOAuth2Service.listDriveFiles).mockResolvedValue(mockFileListResponse);
      
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(googleOAuth2Service.listDriveFiles).toHaveBeenCalled();
      });
    });
  });

  describe('Initial Rendering', () => {
    beforeEach(() => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
      vi.mocked(googleOAuth2Service.listDriveFiles).mockResolvedValue(mockFileListResponse);
    });

    it('renders header with title and refresh button', async () => {
      render(<GoogleDriveFileList />);
      
      expect(screen.getByText('Google Drive Files')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    });

    it('calls listDriveFiles with default parameters', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(googleOAuth2Service.listDriveFiles).toHaveBeenCalledWith({
          pageToken: undefined,
          pageSize: 20,
          query: "(mimeType='text/plain' or mimeType='application/octet-stream') and trashed=false",
          orderBy: 'modifiedTime desc',
        });
      });
    });

    it('renders file list when files are loaded', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(screen.getByText('test-song.txt')).toBeInTheDocument();
        expect(screen.getByText('another-song.txt')).toBeInTheDocument();
      });
    });
  });

  describe('File Display', () => {
    beforeEach(() => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
      vi.mocked(googleOAuth2Service.listDriveFiles).mockResolvedValue(mockFileListResponse);
    });

    it('displays file names correctly', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(screen.getByText('test-song.txt')).toBeInTheDocument();
        expect(screen.getByText('another-song.txt')).toBeInTheDocument();
      });
    });

    it('displays formatted modification dates', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(screen.getByText(/Modified: 1\/1\/2023/)).toBeInTheDocument();
        expect(screen.getByText(/Modified: 1\/2\/2023/)).toBeInTheDocument();
      });
    });

    it('displays formatted file sizes', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(screen.getByText(/1 KB/)).toBeInTheDocument();
        expect(screen.getByText(/2 KB/)).toBeInTheDocument();
      });
    });

    it('renders view links for files with webViewLink', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        const viewLinks = screen.getAllByText('View');
        expect(viewLinks).toHaveLength(2);
        expect(viewLinks[0]).toHaveAttribute('href', 'https://drive.google.com/file/d/file1/view');
        expect(viewLinks[1]).toHaveAttribute('href', 'https://drive.google.com/file/d/file2/view');
      });
    });
  });

  describe('File Interaction', () => {
    beforeEach(() => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
      vi.mocked(googleOAuth2Service.listDriveFiles).mockResolvedValue(mockFileListResponse);
    });

    it('calls onFileSelect when file is clicked', async () => {
      const onFileSelect = vi.fn();
      render(<GoogleDriveFileList onFileSelect={onFileSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-song.txt')).toBeInTheDocument();
      });
      
      await userEvent.click(screen.getByText('test-song.txt'));
      
      expect(onFileSelect).toHaveBeenCalledWith(mockFiles[0]);
    });

    it('applies hover styles to file items', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(screen.getByText('test-song.txt')).toBeInTheDocument();
      });
      
      const fileItem = screen.getByText('test-song.txt').closest('div');
      
      fireEvent.mouseEnter(fileItem);
      expect(fileItem).toHaveStyle({ backgroundColor: '#f5f5f5' });
      
      fireEvent.mouseLeave(fileItem);
      expect(fileItem).toHaveStyle({ backgroundColor: 'white' });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
    });

    it('calls onError when loading files fails', async () => {
      const onError = vi.fn();
      vi.mocked(googleOAuth2Service.listDriveFiles).mockRejectedValue(new Error('Network error'));
      
      render(<GoogleDriveFileList onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error');
      });
    });

    it('calls onError with generic message for unknown errors', async () => {
      const onError = vi.fn();
      vi.mocked(googleOAuth2Service.listDriveFiles).mockRejectedValue('Unknown error');
      
      render(<GoogleDriveFileList onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to load files');
      });
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
    });

    it('shows no files message when list is empty', async () => {
      vi.mocked(googleOAuth2Service.listDriveFiles).mockResolvedValue({ files: [], nextPageToken: undefined });
      
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(screen.getByText('No files found in your Google Drive.')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Props', () => {
    beforeEach(() => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
      vi.mocked(googleOAuth2Service.listDriveFiles).mockResolvedValue(mockFileListResponse);
    });

    it('applies custom className', () => {
      render(<GoogleDriveFileList className="custom-class" />);
      
      const container = screen.getByText('Google Drive Files').closest('.drive-file-list');
      expect(container).toHaveClass('custom-class');
    });

    it('uses custom file types in query', async () => {
      render(<GoogleDriveFileList fileTypes={['application/json']} />);
      
      await waitFor(() => {
        expect(googleOAuth2Service.listDriveFiles).toHaveBeenCalledWith(expect.objectContaining({
          query: "(mimeType='application/json') and trashed=false",
        }));
      });
    });

    it('uses custom maxResults', async () => {
      render(<GoogleDriveFileList maxResults={50} />);
      
      await waitFor(() => {
        expect(googleOAuth2Service.listDriveFiles).toHaveBeenCalledWith(expect.objectContaining({
          pageSize: 50,
        }));
      });
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      vi.mocked(googleOAuth2Service.isAuthenticated).mockReturnValue(true);
      vi.mocked(googleOAuth2Service.listDriveFiles).mockResolvedValue(mockFileListResponse);
    });

    it('refreshes file list when refresh button is clicked', async () => {
      render(<GoogleDriveFileList />);
      
      await waitFor(() => {
        expect(googleOAuth2Service.listDriveFiles).toHaveBeenCalledTimes(1);
      });
      
      await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
      
      await waitFor(() => {
        expect(googleOAuth2Service.listDriveFiles).toHaveBeenCalledTimes(2);
      });
    });
  });
});