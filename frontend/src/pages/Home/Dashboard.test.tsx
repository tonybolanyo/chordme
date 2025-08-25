import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from './Home';
import type { Song, User } from '../../types';

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

// Mock the real-time hooks
vi.mock('../../hooks/useRealtimeSongs', () => ({
  useRealtimeSongs: vi.fn(() => ({
    songs: [],
    loading: false,
    error: null,
    isRealTime: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('../../hooks/useRealtimeSong', () => ({
  useRealtimeSong: vi.fn(() => ({
    song: null,
    isRealTime: false,
  })),
}));

// Mock the components
vi.mock('../../components', () => ({
  ChordProEditor: ({ value }: { value: string }) => (
    <textarea data-testid="chordpro-editor" value={value} readOnly />
  ),
  ChordProViewer: ({ content }: { content: string }) => (
    <div data-testid="chordpro-viewer">{content}</div>
  ),
  GoogleDriveFileList: () => (
    <div data-testid="google-drive-file-list">Google Drive Files</div>
  ),
  SongSharingModal: () => (
    <div data-testid="song-sharing-modal">Sharing Modal</div>
  ),
  NotificationContainer: () => (
    <div data-testid="notification-container">Notifications</div>
  ),
}));

// Mock the Google OAuth service
vi.mock('../../services/googleOAuth', () => ({
  googleOAuth2Service: {
    isAuthenticated: vi.fn(() => false),
    createFile: vi.fn(),
  },
}));

// Mock user for auth context
const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    }),
  };
});

import { useRealtimeSongs } from '../../hooks/useRealtimeSongs';

const mockUseRealtimeSongs = vi.mocked(useRealtimeSongs);

describe('Dashboard - Song Separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify(mockUser));
  });

  it('separates owned songs into "My Songs" section', () => {
    const ownedSong: Song = {
      id: '1',
      title: 'My Owned Song',
      author_id: '1', // Same as current user
      content: '[C]My song content',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockUseRealtimeSongs.mockReturnValue({
      songs: [ownedSong],
      loading: false,
      error: null,
      isRealTime: false,
      refetch: vi.fn(),
    });

    render(<Home />);

    // Should appear in My Songs section
    expect(screen.getByText('My Songs (1)')).toBeInTheDocument();
    expect(screen.getByText('Shared with Me (0)')).toBeInTheDocument();
    expect(screen.getByText('My Owned Song')).toBeInTheDocument();
  });

  it('separates shared songs into "Shared with Me" section', () => {
    const sharedSong: Song = {
      id: '2',
      title: 'Shared Song',
      author_id: '2', // Different from current user
      user_permission: 'edit', // User has edit permission
      content: '[C]Shared song content',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockUseRealtimeSongs.mockReturnValue({
      songs: [sharedSong],
      loading: false,
      error: null,
      isRealTime: false,
      refetch: vi.fn(),
    });

    render(<Home />);

    // Should appear in Shared with Me section
    expect(screen.getByText('My Songs (0)')).toBeInTheDocument();
    expect(screen.getByText('Shared with Me (1)')).toBeInTheDocument();
    expect(screen.getByText('Shared Song')).toBeInTheDocument();
  });

  it('correctly separates mixed owned and shared songs', () => {
    const ownedSong: Song = {
      id: '1',
      title: 'My Owned Song',
      author_id: '1',
      content: '[C]My song',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    const sharedSong: Song = {
      id: '2',
      title: 'Shared Song',
      author_id: '2',
      user_permission: 'read',
      content: '[C]Shared song',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockUseRealtimeSongs.mockReturnValue({
      songs: [ownedSong, sharedSong],
      loading: false,
      error: null,
      isRealTime: false,
      refetch: vi.fn(),
    });

    render(<Home />);

    // Should show correct counts
    expect(screen.getByText('My Songs (1)')).toBeInTheDocument();
    expect(screen.getByText('Shared with Me (1)')).toBeInTheDocument();

    // Should show both songs
    expect(screen.getByText('My Owned Song')).toBeInTheDocument();
    expect(screen.getByText('Shared Song')).toBeInTheDocument();
  });

  it('shows appropriate empty states for both sections', () => {
    mockUseRealtimeSongs.mockReturnValue({
      songs: [],
      loading: false,
      error: null,
      isRealTime: false,
      refetch: vi.fn(),
    });

    render(<Home />);

    // Should show empty states
    expect(screen.getByText('My Songs (0)')).toBeInTheDocument();
    expect(screen.getByText('Shared with Me (0)')).toBeInTheDocument();

    expect(
      screen.getByText(
        "You haven't created any songs yet. Create your first song to get started!"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No songs have been shared with you yet. When other users share songs with you, they'll appear here."
      )
    ).toBeInTheDocument();
  });

  it('shows real-time indicators when real-time is enabled', () => {
    mockUseRealtimeSongs.mockReturnValue({
      songs: [],
      loading: false,
      error: null,
      isRealTime: true, // Real-time enabled
      refetch: vi.fn(),
    });

    render(<Home />);

    // Should show real-time indicators for both sections
    const realtimeIndicators = screen.getAllByText('🔄 Real-time');
    expect(realtimeIndicators).toHaveLength(2); // One for each section
  });

  it('shows filtering and sorting controls when songs are present', () => {
    const ownedSong: Song = {
      id: '1',
      title: 'My Song',
      author_id: '1',
      content: '[C]Test',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    const sharedSong: Song = {
      id: '2',
      title: 'Shared Song',
      author_id: '2',
      user_permission: 'edit',
      content: '[C]Test',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockUseRealtimeSongs.mockReturnValue({
      songs: [ownedSong, sharedSong],
      loading: false,
      error: null,
      isRealTime: false,
      refetch: vi.fn(),
    });

    render(<Home />);

    // Should show sort control for My Songs section
    expect(screen.getByText('Sort by:')).toBeInTheDocument();

    // Should show filter and sort controls for Shared section (when there are shared songs)
    // Since our shared song should appear in the shared section, it should show controls
    expect(screen.getByText('Filter by permission:')).toBeInTheDocument();

    // Check that control options exist
    expect(screen.getByText('Last Modified')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Created Date')).toBeInTheDocument();
  });
});
