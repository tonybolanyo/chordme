// Tests for PresenceNotifications component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PresenceNotifications } from './PresenceNotifications';
import type { PresenceNotification, CollaborationUser } from '../../types/collaboration';

// Mock the hooks
vi.mock('../../hooks/usePresenceSystem', () => ({
  usePresenceSystem: vi.fn(),
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

const mockNotifications: PresenceNotification[] = [
  {
    id: '1',
    type: 'user-joined',
    userId: 'user-1',
    userName: 'User One',
    timestamp: new Date().toISOString(),
    autoHide: true,
    hideAfter: 5000,
  },
  {
    id: '2',
    type: 'user-left',
    userId: 'user-2',
    userName: 'User Two',
    timestamp: new Date().toISOString(),
    autoHide: false,
  },
];

describe('PresenceNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    usePresenceSystem.mockReturnValue({
      notifications: [],
      removeNotification: vi.fn(),
      generateUserAvatar: vi.fn((user) => ({
        initials: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U',
        backgroundColor: user.color || '#999',
      })),
    });
  });

  it('renders nothing when there are no notifications', () => {
    const { container } = render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders notifications when they exist', () => {
    const mockRemoveNotification = vi.fn();
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    usePresenceSystem.mockReturnValue({
      notifications: mockNotifications,
      removeNotification: mockRemoveNotification,
      generateUserAvatar: vi.fn((user) => ({
        initials: 'UO',
        backgroundColor: '#FF6B6B',
      })),
    });

    render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    expect(screen.getByText(/User One joined the session/)).toBeInTheDocument();
    expect(screen.getByText(/User Two left the session/)).toBeInTheDocument();
  });

  it('displays correct icons for different notification types', () => {
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    const notifications = [
      {
        id: '1',
        type: 'user-joined',
        userId: 'user-1',
        userName: 'User One',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'user-reconnected',
        userId: 'user-2',
        userName: 'User Two',
        timestamp: new Date().toISOString(),
      },
    ] as PresenceNotification[];

    usePresenceSystem.mockReturnValue({
      notifications,
      removeNotification: vi.fn(),
      generateUserAvatar: vi.fn(() => ({
        initials: 'U',
        backgroundColor: '#999',
      })),
    });

    render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    expect(screen.getByText(/👋 User One joined the session/)).toBeInTheDocument();
    expect(screen.getByText(/🔄 User Two reconnected/)).toBeInTheDocument();
  });

  it('handles close button clicks', () => {
    const mockRemoveNotification = vi.fn();
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    usePresenceSystem.mockReturnValue({
      notifications: [mockNotifications[0]],
      removeNotification: mockRemoveNotification,
      generateUserAvatar: vi.fn(() => ({
        initials: 'UO',
        backgroundColor: '#FF6B6B',
      })),
    });

    render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    expect(mockRemoveNotification).toHaveBeenCalledWith('1');
  });

  it('formats timestamps correctly', () => {
    const testTime = new Date('2024-01-01T12:30:00Z');
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    usePresenceSystem.mockReturnValue({
      notifications: [{
        ...mockNotifications[0],
        timestamp: testTime.toISOString(),
      }],
      removeNotification: vi.fn(),
      generateUserAvatar: vi.fn(() => ({
        initials: 'UO',
        backgroundColor: '#FF6B6B',
      })),
    });

    render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    // Check that the time is formatted as a locale time string
    const timeElement = screen.getByText(testTime.toLocaleTimeString());
    expect(timeElement).toBeInTheDocument();
  });

  it('applies correct CSS classes for notification types', () => {
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    const notifications = [
      {
        id: '1',
        type: 'user-joined',
        userId: 'user-1',
        userName: 'User One',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'user-left',
        userId: 'user-2',
        userName: 'User Two',
        timestamp: new Date().toISOString(),
      },
    ] as PresenceNotification[];

    usePresenceSystem.mockReturnValue({
      notifications,
      removeNotification: vi.fn(),
      generateUserAvatar: vi.fn(() => ({
        initials: 'U',
        backgroundColor: '#999',
      })),
    });

    const { container } = render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    const joinNotification = container.querySelector('.presence-notification.joining');
    const leaveNotification = container.querySelector('.presence-notification.leaving');

    expect(joinNotification).toBeInTheDocument();
    expect(leaveNotification).toBeInTheDocument();
  });

  it('handles unknown users gracefully', () => {
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    const notificationWithUnknownUser = {
      id: '1',
      type: 'user-joined',
      userId: 'unknown-user',
      userName: 'Unknown User',
      timestamp: new Date().toISOString(),
    } as PresenceNotification;

    usePresenceSystem.mockReturnValue({
      notifications: [notificationWithUnknownUser],
      removeNotification: vi.fn(),
      generateUserAvatar: vi.fn(() => ({
        initials: '?',
        backgroundColor: '#999',
      })),
    });

    render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    expect(screen.getByText(/Unknown User joined the session/)).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders user avatars with correct styling', () => {
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    usePresenceSystem.mockReturnValue({
      notifications: [mockNotifications[0]],
      removeNotification: vi.fn(),
      generateUserAvatar: vi.fn(() => ({
        initials: 'UO',
        backgroundColor: '#FF6B6B',
      })),
    });

    const { container } = render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    const avatar = container.querySelector('.notification-avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveStyle({ backgroundColor: '#FF6B6B' });
    expect(screen.getByText('UO')).toBeInTheDocument();
  });

  it('handles multiple notifications correctly', () => {
    const { usePresenceSystem } = require('../../hooks/usePresenceSystem');
    
    usePresenceSystem.mockReturnValue({
      notifications: mockNotifications,
      removeNotification: vi.fn(),
      generateUserAvatar: vi.fn((user) => ({
        initials: user.name ? user.name.slice(0, 2).toUpperCase() : 'U',
        backgroundColor: user.color || '#999',
      })),
    });

    render(
      <PresenceNotifications
        songId="test-song"
        userId="current-user"
        participants={mockParticipants}
      />
    );

    expect(screen.getAllByRole('button', { name: 'Close notification' })).toHaveLength(2);
    expect(screen.getByText(/User One joined/)).toBeInTheDocument();
    expect(screen.getByText(/User Two left/)).toBeInTheDocument();
  });

  it('handles null props gracefully', () => {
    expect(() => {
      render(
        <PresenceNotifications
          songId={null}
          userId={null}
          participants={[]}
        />
      );
    }).not.toThrow();
  });
});