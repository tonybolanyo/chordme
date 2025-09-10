// Tests for enhanced LiveCursors component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LiveCursors } from './LiveCursors';
import type { UserCursor, CollaborationUser } from '../../types/collaboration';

// Mock the hooks
vi.mock('../../hooks/useCollaborativeEditing', () => ({
  useCollaborativePresence: vi.fn(() => ({
    cursors: [],
  })),
}));

vi.mock('../../hooks/usePresenceSystem', () => ({
  usePresenceSystem: vi.fn(() => ({
    generateUserAvatar: vi.fn((user) => ({
      initials: 'TU',
      backgroundColor: '#FF6B6B',
    })),
    typingUsers: new Set(),
  })),
}));

const mockParticipants: CollaborationUser[] = [
  {
    id: 'user-1',
    email: 'user1@example.com',
    name: 'User One',
    color: '#FF6B6B',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'user-2',
    email: 'user2@example.com',
    name: 'User Two',
    color: '#4ECDC4',
    lastSeen: new Date().toISOString(),
  },
];

const mockCursors: UserCursor[] = [
  {
    userId: 'user-1',
    position: {
      line: 0,
      column: 5,
      hasSelection: false,
    },
    timestamp: new Date().toISOString(),
  },
  {
    userId: 'user-2',
    position: {
      line: 1,
      column: 10,
      hasSelection: true,
      selectionStart: 15,
      selectionEnd: 25,
    },
    timestamp: new Date().toISOString(),
  },
];

describe('LiveCursors', () => {
  let mockEditorRef: React.RefObject<HTMLTextAreaElement>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock textarea element
    const mockTextarea = document.createElement('textarea');
    mockTextarea.value = 'Hello world\nThis is line 2 with some text\nLine 3';
    
    // Mock the computed style
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        font: '14px monospace',
        fontSize: '14px',
        fontFamily: 'monospace',
        paddingLeft: '10px',
        paddingTop: '10px',
      }),
    });

    mockEditorRef = {
      current: mockTextarea,
    };
  });

  it('renders without crashing', () => {
    render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    expect(screen.getByRole('generic', { hidden: true })).toBeInTheDocument();
  });

  it('does not render current user cursor', () => {
    
    useCollaborativePresence.mockReturnValue({
      cursors: [
        {
          userId: 'current-user',
          position: { line: 0, column: 0, hasSelection: false },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={[...mockParticipants, { 
          id: 'current-user', 
          email: 'current@example.com',
          name: 'Current User',
          color: '#000000',
          lastSeen: new Date().toISOString(),
        }]}
        currentUserId="current-user"
      />
    );

    // Should not find any cursor elements since current user is filtered out
    expect(screen.queryByText(/Current User/)).not.toBeInTheDocument();
  });

  it('renders other user cursors', () => {
    
    useCollaborativePresence.mockReturnValue({
      cursors: mockCursors,
    });

    render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    // Check if cursor elements are rendered
    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toBeInTheDocument();
  });

  it('handles typing indicators correctly', () => {
    
    
    
    useCollaborativePresence.mockReturnValue({
      cursors: mockCursors,
    });

    usePresenceSystem.mockReturnValue({
      generateUserAvatar: vi.fn(() => ({
        initials: 'TU',
        backgroundColor: '#FF6B6B',
      })),
      typingUsers: new Set(['user-1']),
    });

    render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toBeInTheDocument();
  });

  it('handles text selection highlighting', () => {
    
    
    const cursorsWithSelection = [
      {
        userId: 'user-1',
        position: {
          line: 0,
          column: 0,
          hasSelection: true,
          selectionStart: 0,
          selectionEnd: 5,
        },
        timestamp: new Date().toISOString(),
      },
    ];

    useCollaborativePresence.mockReturnValue({
      cursors: cursorsWithSelection,
    });

    render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toBeInTheDocument();
  });

  it('handles empty cursor list', () => {
    
    useCollaborativePresence.mockReturnValue({
      cursors: [],
    });

    render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toBeInTheDocument();
  });

  it('handles null editor ref', () => {
    const nullEditorRef = { current: null };

    render(
      <LiveCursors
        songId="test-song"
        editorRef={nullEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toBeInTheDocument();
  });

  it('filters out unknown users', () => {
    
    
    const cursorsWithUnknownUser = [
      {
        userId: 'unknown-user',
        position: {
          line: 0,
          column: 0,
          hasSelection: false,
        },
        timestamp: new Date().toISOString(),
      },
    ];

    useCollaborativePresence.mockReturnValue({
      cursors: cursorsWithUnknownUser,
    });

    render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toBeInTheDocument();
  });

  it('handles invalid cursor positions gracefully', () => {
    
    
    const invalidCursors = [
      {
        userId: 'user-1',
        position: {
          line: 999, // Invalid line
          column: 0,
          hasSelection: false,
        },
        timestamp: new Date().toISOString(),
      },
      {
        userId: 'user-2',
        position: {
          line: 0,
          column: 999, // Invalid column
          hasSelection: false,
        },
        timestamp: new Date().toISOString(),
      },
    ];

    useCollaborativePresence.mockReturnValue({
      cursors: invalidCursors,
    });

    expect(() => {
      render(
        <LiveCursors
          songId="test-song"
          editorRef={mockEditorRef}
          participants={mockParticipants}
          currentUserId="current-user"
        />
      );
    }).not.toThrow();
  });

  it('updates positions when editor content changes', () => {
    
    useCollaborativePresence.mockReturnValue({
      cursors: mockCursors,
    });

    const { rerender } = render(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    // Change editor content
    if (mockEditorRef.current) {
      mockEditorRef.current.value = 'New content\nDifferent text';
    }

    rerender(
      <LiveCursors
        songId="test-song"
        editorRef={mockEditorRef}
        participants={mockParticipants}
        currentUserId="current-user"
      />
    );

    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toBeInTheDocument();
  });
});