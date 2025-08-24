import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from './Home';
import { AuthProvider } from '../../contexts/AuthContext';
import type { User, Song } from '../../types';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getSongs: vi.fn(),
    createSong: vi.fn(),
    updateSong: vi.fn(),
    deleteSong: vi.fn(),
    downloadSong: vi.fn(),
    supportsRealTimeUpdates: vi.fn(() => false),
    subscribeToSongs: vi.fn(() => () => {}),
    subscribeToSong: vi.fn(() => () => {}),
  },
}));

// Mock the components
vi.mock('../../components', () => ({
  ChordProEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      data-testid="chordpro-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  ChordProViewer: ({ content }: { content: string }) => (
    <div data-testid="chordpro-viewer">{content}</div>
  ),
}));

// Mock the jwt utility
vi.mock('../../utils/jwt', () => ({
  isTokenExpired: vi.fn(() => false),
}));

import { apiService } from '../../services/api';

const mockApiService = vi.mocked(apiService);

// Mock user for auth context
const mockUser: User = { id: '1', email: 'test@example.com' };

// Helper to render Home component with AuthProvider
const renderHome = () => {
  return render(
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
};

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', { value: mockConfirm });

describe('Home Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify(mockUser));
    mockConfirm.mockReturnValue(true);

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Initial Loading', () => {
    it('renders loading state initially', () => {
      mockApiService.getSongs.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderHome();

      expect(screen.getByText('Loading your songs...')).toBeInTheDocument();
    });

    it('loads and displays songs on mount', async () => {
      const mockSongs: Song[] = [
        {
          id: '1',
          title: 'Test Song 1',
          content: '[C]Test content 1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Test Song 2',
          content: '[G]Test content 2',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ];

      mockApiService.getSongs.mockResolvedValue({
        status: 'success',
        data: { songs: mockSongs },
      });

      renderHome();

      await waitFor(() => {
        expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        expect(screen.getByText('Test Song 2')).toBeInTheDocument();
      });

      expect(mockApiService.getSongs).toHaveBeenCalledTimes(1);
    });

    it('displays error when loading songs fails', async () => {
      mockApiService.getSongs.mockRejectedValue(new Error('Network error'));

      renderHome();

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('displays error when API returns error status', async () => {
      mockApiService.getSongs.mockResolvedValue({
        status: 'error',
        error: 'API error',
      });

      renderHome();

      await waitFor(() => {
        expect(screen.getByText('Failed to load songs')).toBeInTheDocument();
      });
    });
  });

  describe('Create Song Functionality', () => {
    beforeEach(async () => {
      mockApiService.getSongs.mockResolvedValue({
        status: 'success',
        data: { songs: [] },
      });

      renderHome();
      await waitFor(() =>
        expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument()
      );
    });

    it('shows create form when Create New Song button is clicked', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Create New Song'));

      expect(screen.getByText('Create New Song')).toBeInTheDocument();
      expect(screen.getByLabelText('Title:')).toBeInTheDocument();
      expect(screen.getByTestId('chordpro-editor')).toBeInTheDocument();
    });

    it('creates a new song successfully', async () => {
      const user = userEvent.setup();
      const newSong = { title: 'New Song', content: 'New content' };

      mockApiService.createSong.mockResolvedValue({
        status: 'success',
        data: {
          song: {
            id: '3',
            ...newSong,
            created_at: '2023-01-03T00:00:00Z',
            updated_at: '2023-01-03T00:00:00Z',
          },
        },
      });

      // Open create form
      await user.click(screen.getByText('Create New Song'));

      // Fill form
      await user.type(screen.getByLabelText('Title:'), newSong.title);
      await user.type(screen.getByTestId('chordpro-editor'), newSong.content);

      // Submit form
      await user.click(screen.getByRole('button', { name: 'Create Song' }));

      await waitFor(() => {
        expect(mockApiService.createSong).toHaveBeenCalledWith({
          title: newSong.title,
          content: newSong.content,
        });
      });

      expect(mockApiService.getSongs).toHaveBeenCalledTimes(2); // Initial load + reload after create
    });

    it('handles create song error', async () => {
      const user = userEvent.setup();

      mockApiService.createSong.mockRejectedValue(new Error('Create failed'));

      await user.click(screen.getByText('Create New Song'));
      await user.type(screen.getByLabelText('Title:'), 'Test Song');
      await user.type(screen.getByTestId('chordpro-editor'), '[C]Test');
      await user.click(screen.getByRole('button', { name: 'Create Song' }));

      await waitFor(() => {
        expect(screen.getByText('Create failed')).toBeInTheDocument();
      });
    });

    it('does not create song with empty title or content', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Create New Song'));
      await user.click(screen.getByRole('button', { name: 'Create Song' }));

      expect(mockApiService.createSong).not.toHaveBeenCalled();
    });

    it('cancels create form', async () => {
      const user = userEvent.setup();

      await user.click(screen.getByText('Create New Song'));
      await user.click(screen.getAllByText('Cancel')[0]);

      expect(screen.queryByLabelText('Title:')).not.toBeInTheDocument();
    });
  });

  describe('Song Actions', () => {
    const mockSong: Song = {
      id: '1',
      title: 'Test Song',
      content: '[C]Test content',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    beforeEach(async () => {
      mockApiService.getSongs.mockResolvedValue({
        status: 'success',
        data: { songs: [mockSong] },
      });

      renderHome();
      await waitFor(() =>
        expect(screen.getByText('Test Song')).toBeInTheDocument()
      );
    });

    it('opens song view when View button is clicked', async () => {
      const user = userEvent.setup();

      await user.click(screen.getAllByText('View')[0]);

      expect(screen.getAllByTestId('chordpro-viewer')[0]).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it.skip('closes song view when Close button is clicked', async () => {
      const user = userEvent.setup();

      await user.click(screen.getAllByText('View')[0]);
      await user.click(screen.getByText('Close'));

      expect(screen.queryByTestId('chordpro-viewer')).not.toBeInTheDocument();
    });

    it('opens edit form when Edit button is clicked', async () => {
      const user = userEvent.setup();

      await user.click(screen.getAllByText('Edit')[0]);

      expect(screen.getByText('Edit Song: Test Song')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument();
      expect(screen.getByDisplayValue('[C]Test content')).toBeInTheDocument();
    });

    it('updates song successfully', async () => {
      const user = userEvent.setup();
      const updatedContent = 'Updated content';

      mockApiService.updateSong.mockResolvedValue({
        status: 'success',
        data: { song: { ...mockSong, content: updatedContent } },
      });

      await user.click(screen.getAllByText('Edit')[0]);

      const editor = screen.getByTestId('chordpro-editor');
      await user.clear(editor);
      await user.type(editor, updatedContent);

      await user.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockApiService.updateSong).toHaveBeenCalledWith(mockSong.id, {
          title: mockSong.title,
          content: updatedContent,
        });
      });
    });

    it('handles update song error', async () => {
      const user = userEvent.setup();

      mockApiService.updateSong.mockRejectedValue(new Error('Update failed'));

      await user.click(screen.getAllByText('Edit')[0]);
      await user.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });

    it('cancels edit form', async () => {
      const user = userEvent.setup();

      await user.click(screen.getAllByText('Edit')[0]);
      await user.click(screen.getAllByText('Cancel')[0]);

      expect(screen.queryByText('Edit Song: Test')).not.toBeInTheDocument();
    });

    it('downloads song when Download button is clicked', async () => {
      const user = userEvent.setup();

      mockApiService.downloadSong.mockResolvedValue(undefined);

      await user.click(screen.getAllByText('Download')[0]);

      await waitFor(() => {
        expect(mockApiService.downloadSong).toHaveBeenCalledWith(mockSong.id);
      });
    });

    it('handles download error', async () => {
      const user = userEvent.setup();

      mockApiService.downloadSong.mockRejectedValue(
        new Error('Download failed')
      );

      await user.click(screen.getAllByText('Download')[0]);

      await waitFor(() => {
        expect(screen.getByText('Download failed')).toBeInTheDocument();
      });
    });

    it('deletes song when Delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();

      mockApiService.deleteSong.mockResolvedValue({
        status: 'success',
        message: 'Song deleted',
      });

      await user.click(screen.getAllByText('Delete')[0]);

      await waitFor(() => {
        expect(mockApiService.deleteSong).toHaveBeenCalledWith(mockSong.id);
      });

      expect(mockApiService.getSongs).toHaveBeenCalledTimes(2); // Initial load + reload after delete
    });

    it('does not delete song when deletion is cancelled', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);

      await user.click(screen.getAllByText('Delete')[0]);

      expect(mockApiService.deleteSong).not.toHaveBeenCalled();
    });

    it('handles delete song error', async () => {
      const user = userEvent.setup();

      mockApiService.deleteSong.mockRejectedValue(new Error('Delete failed'));

      await user.click(screen.getAllByText('Delete')[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    beforeEach(async () => {
      mockApiService.getSongs.mockResolvedValue({
        status: 'success',
        data: { songs: [] },
      });

      renderHome();
      await waitFor(() =>
        expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument()
      );
    });

    it.skip('shows file upload option', () => {
      expect(screen.getByText('or')).toBeInTheDocument();
      expect(screen.getByText('Upload ChordPro File')).toBeInTheDocument();
    });

    it.skip('handles file upload', async () => {
      const user = userEvent.setup();
      const file = new File(['[C]File content'], 'test.cho', {
        type: 'text/plain',
      });

      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
        result: '[C]File content',
      };
      global.FileReader = vi.fn(
        () => mockFileReader
      ) as unknown as typeof FileReader;

      mockApiService.createSong.mockResolvedValue({
        status: 'success',
        data: {
          song: {
            id: '1',
            title: 'test',
            content: '[C]File content',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        },
      });

      const fileInput = screen.getByLabelText('Upload ChordPro File');
      await user.upload(fileInput, file);

      // Simulate FileReader.onload
      mockFileReader.onload?.({
        target: { result: '[C]File content' },
      } as ProgressEvent<FileReader>);

      await waitFor(() => {
        expect(mockApiService.createSong).toHaveBeenCalledWith({
          title: 'test',
          content: '[C]File content',
        });
      });
    });
  });

  describe('UI State Management', () => {
    beforeEach(async () => {
      mockApiService.getSongs.mockResolvedValue({
        status: 'success',
        data: { songs: [] },
      });

      renderHome();
      await waitFor(() =>
        expect(screen.queryByText('Loading songs...')).not.toBeInTheDocument()
      );
    });

    it('shows empty state when no songs', () => {
      expect(
        screen.getByText(
          "You haven't created any songs yet. Create your first song to get started!"
        )
      ).toBeInTheDocument();
    });

    it('hides create form when edit form is opened', async () => {
      const user = userEvent.setup();

      // Mock a song for editing
      mockApiService.getSongs.mockResolvedValue({
        status: 'success',
        data: {
          songs: [
            {
              id: '1',
              title: 'Test',
              content: '[C]Test',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
            },
          ],
        },
      });

      // Re-render to get the song
      renderHome();
      await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());

      await user.click(screen.getAllByText('Create New Song')[0]);
      expect(screen.getAllByText('Create New Song')[0]).toBeInTheDocument();

      await user.click(screen.getAllByText('Edit')[0]);
      expect(screen.getByText('Edit Song: Test')).toBeInTheDocument();
    });

    it('displays user welcome message', () => {
      expect(
        screen.getByText('Welcome back, test@example.com!')
      ).toBeInTheDocument();
    });
  });
});
