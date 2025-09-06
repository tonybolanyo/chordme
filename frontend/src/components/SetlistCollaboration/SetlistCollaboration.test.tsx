/**
 * Integration test for setlist collaboration features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SetlistCollaboration from '../SetlistCollaboration';
import type { Setlist } from '../../../types/setlist';

// Mock the collaboration hook
vi.mock('../../../hooks/useSetlistCollaboration', () => ({
  useSetlistCollaboration: vi.fn(),
}));

// Mock the collaboration service
vi.mock('../../../services/setlistCollaborationService', () => ({
  setlistCollaborationService: {
    startSetlistCollaboration: vi.fn(),
    endSetlistCollaboration: vi.fn(),
  },
}));

const mockSetlist: Setlist = {
  id: 'test-setlist-1',
  name: 'Test Setlist',
  description: 'A test setlist for collaboration',
  user_id: 'user-1',
  event_type: 'rehearsal',
  venue: 'Test Venue',
  event_date: '2024-01-15T19:00:00Z',
  estimated_duration: 60,
  is_template: false,
  template_id: undefined,
  is_public: false,
  is_recurring: false,
  recurring_pattern: undefined,
  status: 'draft',
  is_deleted: false,
  is_archived: false,
  deleted_at: undefined,
  archived_at: undefined,
  tags: ['rock', 'cover'],
  notes: 'Rehearsal notes',
  view_count: 0,
  usage_count: 0,
  last_performed: undefined,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  songs: [],
  collaborator_count: 2,
  permission_level: 'owner',
};

const mockCollaboration = {
  session: {
    setlistId: 'test-setlist-1',
    participants: [
      {
        userId: 'user-1',
        email: 'leader@example.com',
        name: 'Band Leader',
        bandRole: 'lead_guitar',
        instrument: 'Electric Guitar',
        isLead: true,
        status: 'active' as const,
        currentActivity: 'viewing' as const,
        lastActivity: '2024-01-01T10:00:00Z',
        color: '#FF6B6B',
      },
      {
        userId: 'user-2',
        email: 'drummer@example.com',
        name: 'Drummer',
        bandRole: 'drums',
        instrument: 'Drum Kit',
        isLead: false,
        status: 'active' as const,
        currentActivity: 'viewing' as const,
        lastActivity: '2024-01-01T10:00:00Z',
        color: '#4ECDC4',
      },
    ],
    activeEditors: [],
    documentState: {
      setlist: mockSetlist,
      lastModified: '2024-01-01T10:00:00Z',
      version: 1,
    },
    realtimeComments: [],
    activeTasks: [],
    bandCoordination: {
      rehearsalMode: false,
      performanceMode: false,
      coordinationNotes: '',
      roleAssignments: {},
      readyStatus: {},
    },
  },
  isConnected: true,
  participants: [
    {
      userId: 'user-1',
      email: 'leader@example.com',
      name: 'Band Leader',
      bandRole: 'lead_guitar',
      instrument: 'Electric Guitar',
      isLead: true,
      status: 'active' as const,
      currentActivity: 'viewing' as const,
      lastActivity: '2024-01-01T10:00:00Z',
      color: '#FF6B6B',
    },
    {
      userId: 'user-2',
      email: 'drummer@example.com',
      name: 'Drummer',
      bandRole: 'drums',
      instrument: 'Drum Kit',
      isLead: false,
      status: 'active' as const,
      currentActivity: 'viewing' as const,
      lastActivity: '2024-01-01T10:00:00Z',
      color: '#4ECDC4',
    },
  ],
  currentUserRole: 'lead_guitar',
  addSong: vi.fn(),
  removeSong: vi.fn(),
  reorderSongs: vi.fn(),
  updateSong: vi.fn(),
  comments: [],
  addComment: vi.fn(),
  resolveComment: vi.fn(),
  tasks: [],
  createTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  bandCoordination: {
    rehearsalMode: false,
    performanceMode: false,
    coordinationNotes: '',
    roleAssignments: {},
    readyStatus: {},
  },
  startRehearsalMode: vi.fn(),
  startPerformanceMode: vi.fn(),
  stopCoordinationMode: vi.fn(),
  updateReadyStatus: vi.fn(),
  sendCoordinationMessage: vi.fn(),
  mobileState: null,
  setCurrentSong: vi.fn(),
  adjustTempo: vi.fn(),
  skipSong: vi.fn(),
  createExternalShare: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  error: null,
  clearError: vi.fn(),
};

describe('SetlistCollaboration', () => {
  beforeEach(() => {
    const { useSetlistCollaboration } = require('../../../hooks/useSetlistCollaboration');
    useSetlistCollaboration.mockReturnValue(mockCollaboration);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders collaboration interface when connected', () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Check that connection status is shown
    expect(screen.getByText('🟢 Connected')).toBeInTheDocument();

    // Check that tabs are rendered
    expect(screen.getByText('Band Coordination')).toBeInTheDocument();
    expect(screen.getByText('Comments (0)')).toBeInTheDocument();
    expect(screen.getByText('Tasks (0)')).toBeInTheDocument();
    expect(screen.getByText('External Sharing')).toBeInTheDocument();
  });

  it('displays participants in the header', () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Check that participant avatars are shown
    const participants = screen.getAllByTitle(/Band Leader|Drummer/);
    expect(participants).toHaveLength(2);
  });

  it('can switch between tabs', async () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Default should be coordination tab
    expect(screen.getByText('Start a coordination session')).toBeInTheDocument();

    // Switch to comments tab
    fireEvent.click(screen.getByText('Comments (0)'));
    await waitFor(() => {
      expect(screen.getByText('Comments & Annotations')).toBeInTheDocument();
    });

    // Switch to tasks tab
    fireEvent.click(screen.getByText('Tasks (0)'));
    await waitFor(() => {
      expect(screen.getByText('Performance Preparation Tasks')).toBeInTheDocument();
    });

    // Switch to sharing tab
    fireEvent.click(screen.getByText('External Sharing'));
    await waitFor(() => {
      expect(screen.getByText('External Sharing')).toBeInTheDocument();
    });
  });

  it('can start rehearsal mode', async () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Find and click rehearsal mode button
    const rehearsalButton = screen.getByText('🎵 Start Rehearsal Mode');
    fireEvent.click(rehearsalButton);

    await waitFor(() => {
      expect(mockCollaboration.startRehearsalMode).toHaveBeenCalled();
    });
  });

  it('can start performance mode', async () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Find and click performance mode button
    const performanceButton = screen.getByText('🎤 Start Performance Mode');
    fireEvent.click(performanceButton);

    await waitFor(() => {
      expect(mockCollaboration.startPerformanceMode).toHaveBeenCalled();
    });
  });

  it('shows band members organized by roles when coordination is active', () => {
    // Update mock to show active coordination
    const activeCollaboration = {
      ...mockCollaboration,
      bandCoordination: {
        ...mockCollaboration.bandCoordination,
        rehearsalMode: true,
      },
    };

    const { useSetlistCollaboration } = require('../../../hooks/useSetlistCollaboration');
    useSetlistCollaboration.mockReturnValue(activeCollaboration);

    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Check that rehearsal mode is indicated
    expect(screen.getByText('🎵 Rehearsal Mode Active')).toBeInTheDocument();

    // Check that band members are shown
    expect(screen.getByText('Band Members')).toBeInTheDocument();
    expect(screen.getByText('Band Leader')).toBeInTheDocument();
    expect(screen.getByText('Drummer')).toBeInTheDocument();
  });

  it('can add comments', async () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Switch to comments tab
    fireEvent.click(screen.getByText('Comments (0)'));

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('Add a comment or suggestion...');
      const addButton = screen.getByText('Add Comment');

      // Add a comment
      fireEvent.change(textarea, { target: { value: 'Great setlist!' } });
      fireEvent.click(addButton);

      expect(mockCollaboration.addComment).toHaveBeenCalledWith('Great setlist!');
    });
  });

  it('can create tasks', async () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    // Switch to tasks tab
    fireEvent.click(screen.getByText('Tasks (0)'));

    await waitFor(() => {
      // Click Add Task button
      fireEvent.click(screen.getByText('Add Task'));

      // Fill in task title
      const titleInput = screen.getByPlaceholderText('Task title...');
      fireEvent.change(titleInput, { target: { value: 'Practice new song' } });

      // Create the task
      fireEvent.click(screen.getByText('Create Task'));

      expect(mockCollaboration.createTask).toHaveBeenCalledWith('Practice new song');
    });
  });

  it('shows error state when collaboration fails', () => {
    const errorCollaboration = {
      ...mockCollaboration,
      error: 'Failed to connect to collaboration session',
    };

    const { useSetlistCollaboration } = require('../../../hooks/useSetlistCollaboration');
    useSetlistCollaboration.mockReturnValue(errorCollaboration);

    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
      />
    );

    expect(screen.getByText('Collaboration Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to connect to collaboration session')).toBeInTheDocument();
  });

  it('enables mobile mode when requested', () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
        enableMobileMode={true}
      />
    );

    // Should show mobile control tab
    expect(screen.getByText('Mobile Control')).toBeInTheDocument();
  });

  it('does not show mobile tab when mobile mode is disabled', () => {
    render(
      <SetlistCollaboration
        setlist={mockSetlist}
        userId="user-1"
        userInfo={{ email: 'test@example.com', name: 'Test User' }}
        enableMobileMode={false}
      />
    );

    // Should not show mobile control tab
    expect(screen.queryByText('Mobile Control')).not.toBeInTheDocument();
  });
});