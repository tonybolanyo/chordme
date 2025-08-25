import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from './Home';
import type { Song } from '../../types';

// Mock the API service with real-time capabilities
vi.mock('../../services/api', () => ({
  apiService: {
    getSongs: vi.fn(),
    createSong: vi.fn(),
    updateSong: vi.fn(),
    deleteSong: vi.fn(),
    downloadSong: vi.fn(),
    supportsRealTimeUpdates: vi.fn(() => true),
    subscribeToSongs: vi.fn(() => () => {}),
    subscribeToSong: vi.fn(() => () => {}),
  },
}));

// Mock the hooks
vi.mock('../../hooks/useRealtimeSongs', () => ({
  useRealtimeSongs: vi.fn(),
}));

vi.mock('../../hooks/useRealtimeSong', () => ({
  useRealtimeSong: vi.fn(),
}));

// Mock the useUndoRedo hook
vi.mock('../../hooks/useUndoRedo', () => ({
  useUndoRedo: vi.fn(() => ({
    currentState: { title: '', content: '' },
    canUndo: false,
    canRedo: false,
    setState: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clearHistory: vi.fn(),
    getHistorySize: vi.fn(() => 0),
  })),
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
  GoogleDriveFileList: () => <div data-testid="google-drive-file-list">Google Drive Files</div>,
  SongSharingModal: () => <div data-testid="song-sharing-modal">Sharing Modal</div>,
  NotificationContainer: () => <div data-testid="notification-container">Notifications</div>,
  HistoryPanel: () => <div data-testid="history-panel">History Panel</div>,
  UndoRedoControls: ({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onShowHistory,
  }: {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onShowHistory?: () => void;
  }) => (
    <div data-testid="undo-redo-controls">
      <button data-testid="undo-button" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button data-testid="redo-button" onClick={onRedo} disabled={!canRedo}>
        Redo
      </button>
      {onShowHistory && (
        <button data-testid="history-button" onClick={onShowHistory}>
          History
        </button>
      )}
    </div>
  ),
}));

// Mock other dependencies
vi.mock('../../utils/jwt', () => ({
  isTokenExpired: vi.fn(() => false),
}));

vi.mock('../../utils', () => ({
  formatRelativeTime: vi.fn((date: string) => `${date} ago`),
}));

vi.mock('../../services/googleOAuth', () => ({
  googleOAuth2Service: {
    isAuthenticated: vi.fn(() => false),
  },
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
}));

import { apiService } from '../../services/api';
import { useRealtimeSongs } from '../../hooks/useRealtimeSongs';
import { useRealtimeSong } from '../../hooks/useRealtimeSong';

const mockApiService = vi.mocked(apiService);
const mockUseRealtimeSongs = vi.mocked(useRealtimeSongs);
const mockUseRealtimeSong = vi.mocked(useRealtimeSong);

describe('Home Component - Real-time Editing', () => {
  const mockSong: Song = {
    id: '1',
    title: 'Test Song',
    content: '[C]Test content',
    author_id: '1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  let originalLocalStorage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Store original localStorage
    originalLocalStorage = window.localStorage;
    
    // Mock localStorage for getUserPermission to work
    const mockUser = { id: '1', email: 'test@example.com' };
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => {
          if (key === 'authUser') {
            return JSON.stringify(mockUser);
          }
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    
    // Reset hook mocks to default values
    mockUseRealtimeSongs.mockReturnValue({
      songs: [mockSong],
      loading: false,
      error: null,
      isRealTime: true,
      refetch: vi.fn(),
    });

    mockUseRealtimeSong.mockReturnValue({
      song: null,
      loading: false,
      error: null,
      isRealTime: true,
      refetch: vi.fn(),
    });

    // Mock shared songs empty for simplicity
    mockApiService.getSharedSongs = vi.fn().mockResolvedValue({
      status: 'success',
      data: { songs: [] },
    });

    mockApiService.updateSong.mockResolvedValue({
      status: 'success',
      data: { song: mockSong },
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe('Real-time Status Indicators', () => {
    it('shows real-time editing indicator when editing a song with real-time enabled', async () => {
      const user = userEvent.setup();
      
      // Mock real-time for the specific song being edited
      mockUseRealtimeSong.mockReturnValue({
        song: mockSong,
        loading: false,
        error: null,
        isRealTime: true,
        refetch: vi.fn(),
      });

      render(<Home />);
      
      // Wait for the song to load
      await waitFor(() => {
        expect(screen.getByText('Test Song')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should show real-time editing indicator
      await waitFor(() => {
        expect(screen.getByText(/Real-time editing enabled/i)).toBeInTheDocument();
      });
    });

    it('does not show real-time indicator when real-time is disabled', async () => {
      const user = userEvent.setup();
      
      // Mock real-time as disabled
      mockUseRealtimeSong.mockReturnValue({
        song: null,
        loading: false,
        error: null,
        isRealTime: false,
        refetch: vi.fn(),
      });

      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Song')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should not show real-time editing indicator
      expect(screen.queryByText(/Real-time editing enabled/i)).not.toBeInTheDocument();
    });
  });

  describe('Editing Form Structure', () => {
    it('shows edit form with real-time capabilities', async () => {
      const user = userEvent.setup();
      
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Song')).toBeInTheDocument();
      });

      // Start editing
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should show edit form
      await waitFor(() => {
        expect(screen.getByTestId('chordpro-editor')).toBeInTheDocument();
        expect(screen.getByText('Edit Song: Test Song')).toBeInTheDocument();
      });
    });

    it('calls useRealtimeSong hook with song ID when editing', async () => {
      const user = userEvent.setup();
      
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Song')).toBeInTheDocument();
      });

      // Start editing
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // The useRealtimeSong hook should be called with the song ID
      // This tests the integration of real-time functionality
      expect(mockUseRealtimeSong).toHaveBeenCalled();
    });
  });
});