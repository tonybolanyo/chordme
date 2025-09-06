/**
 * SetlistBuilder.test.tsx - Tests for the SetlistBuilder component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SetlistBuilder } from './SetlistBuilder';
import { setlistService } from '../../services/setlistService';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

// Mock the setlist service
vi.mock('../../services/setlistService', () => ({
  setlistService: {
    getSetlist: vi.fn(),
    createSetlist: vi.fn(),
    getTemplate: vi.fn(),
    createSetlistFromTemplate: vi.fn(),
    searchSongs: vi.fn(),
    addSongToSetlist: vi.fn(),
    bulkAddSongs: vi.fn(),
  }
}));

const mockSetlist = {
  id: 'setlist-1',
  name: 'Test Setlist',
  description: 'A test setlist',
  user_id: 'user-1',
  event_type: 'performance' as const,
  is_template: false,
  is_public: false,
  is_recurring: false,
  status: 'draft' as const,
  is_deleted: false,
  is_archived: false,
  tags: [],
  view_count: 0,
  usage_count: 0,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  songs: [
    {
      id: 'setlist-song-1',
      setlist_id: 'setlist-1',
      song_id: 'song-1',
      sort_order: 1,
      section: 'main',
      is_optional: false,
      is_highlight: false,
      requires_preparation: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ]
};

const mockSongs = [
  {
    id: 'song-1',
    title: 'Test Song 1',
    artist: 'Test Artist 1',
    key: 'C',
    tempo: 120,
    duration: 180,
    tags: ['rock']
  },
  {
    id: 'song-2',
    title: 'Test Song 2',
    artist: 'Test Artist 2',
    key: 'G',
    tempo: 140,
    duration: 200,
    tags: ['pop']
  }
];

const renderWithI18n = (component: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('SetlistBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (setlistService.getSetlist as any).mockResolvedValue(mockSetlist);
    (setlistService.createSetlist as any).mockResolvedValue(mockSetlist);
    (setlistService.searchSongs as any).mockResolvedValue(mockSongs);
    (setlistService.addSongToSetlist as any).mockResolvedValue({
      id: 'new-setlist-song',
      setlist_id: 'setlist-1',
      song_id: 'song-2',
      sort_order: 2,
      section: 'main',
      is_optional: false,
      is_highlight: false,
      requires_preparation: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    });
  });

  it('renders loading state initially', async () => {
    renderWithI18n(<SetlistBuilder />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders setlist builder after loading', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Setlist')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/available songs/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search songs/i)).toBeInTheDocument();
  });

  it('loads and displays available songs', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Song 1')).toBeInTheDocument();
      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
    });
  });

  it('displays setlist sections', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/main set/i)).toBeInTheDocument();
      expect(screen.getByText(/opening/i)).toBeInTheDocument();
      expect(screen.getByText(/encore/i)).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    const searchMock = vi.fn().mockResolvedValue([mockSongs[0]]);
    (setlistService.searchSongs as any).mockImplementation(searchMock);
    
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search songs/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search songs/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(searchMock).toHaveBeenCalledWith('test', { limit: 50 });
    });
  });

  it('handles drag start event', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Song 1')).toBeInTheDocument();
    });
    
    const songCard = screen.getByText('Test Song 1').closest('.song-card');
    expect(songCard).toBeInTheDocument();
    
    // Test drag start
    const dragEvent = new Event('dragstart', { bubbles: true });
    Object.assign(dragEvent, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: null
      }
    });
    
    fireEvent(songCard!, dragEvent);
    
    expect(songCard).toHaveClass('dragging');
  });

  it('shows preview button when not in read-only mode', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" readOnly={false} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    });
  });

  it('hides action buttons in read-only mode', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" readOnly={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Setlist')).toBeInTheDocument();
    });
    
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    const onSave = vi.fn();
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" onSave={onSave} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(onSave).toHaveBeenCalledWith(mockSetlist);
  });

  it('calls onCancel when error occurs and go back is clicked', async () => {
    const onCancel = vi.fn();
    (setlistService.getSetlist as any).mockRejectedValue(new Error('Failed to load'));
    
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" onCancel={onCancel} />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('creates new setlist when no setlistId or templateId provided', async () => {
    const createMock = vi.fn().mockResolvedValue({
      ...mockSetlist,
      name: 'New Setlist'
    });
    (setlistService.createSetlist as any).mockImplementation(createMock);
    
    renderWithI18n(<SetlistBuilder />);
    
    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        name: expect.any(String),
        event_type: 'performance'
      });
    });
  });

  it('handles keyboard navigation for accessibility', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Song 1')).toBeInTheDocument();
    });
    
    const songCard = screen.getByText('Test Song 1').closest('.song-card');
    expect(songCard).toHaveAttribute('tabIndex', '0');
    expect(songCard).toHaveAttribute('role', 'listitem');
    expect(songCard).toHaveAttribute('aria-label');
  });

  it('displays song metadata correctly', async () => {
    renderWithI18n(<SetlistBuilder setlistId="setlist-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Song 1')).toBeInTheDocument();
    });
    
    // Check for key, tempo, and duration display
    expect(screen.getByText('C')).toBeInTheDocument(); // Key
    expect(screen.getByText('120 BPM')).toBeInTheDocument(); // Tempo
    expect(screen.getByText('3:00')).toBeInTheDocument(); // Duration (180 seconds = 3:00)
  });

  it('handles template creation', async () => {
    const templateMock = {
      id: 'template-1',
      name: 'Test Template',
      default_event_type: 'worship' as const,
      default_sections: [],
      is_system_template: false,
      is_public: false,
      usage_count: 0,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };
    
    (setlistService.getTemplate as any).mockResolvedValue(templateMock);
    (setlistService.createSetlistFromTemplate as any).mockResolvedValue({
      ...mockSetlist,
      name: 'Test Template - 1/1/2023'
    });
    
    renderWithI18n(<SetlistBuilder templateId="template-1" />);
    
    await waitFor(() => {
      expect(setlistService.getTemplate).toHaveBeenCalledWith('template-1');
      expect(setlistService.createSetlistFromTemplate).toHaveBeenCalledWith('template-1', {
        name: expect.stringContaining('Test Template'),
        event_type: 'worship'
      });
    });
  });
});