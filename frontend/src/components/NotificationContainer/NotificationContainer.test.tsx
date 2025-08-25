import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationContainer from './NotificationContainer';
import type { SharingNotification } from '../../types';

// Mock the NotificationToast component
vi.mock('../NotificationToast', () => ({
  default: ({
    notification,
    onClose,
  }: {
    notification: SharingNotification;
    onClose: () => void;
  }) => (
    <div data-testid={`notification-${notification.id}`}>
      <span>{notification.song_title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('NotificationContainer', () => {
  const mockNotifications: SharingNotification[] = [
    {
      id: 'notification-1',
      type: 'share_added',
      song_id: 'song-1',
      song_title: 'First Song',
      actor_email: 'user1@example.com',
      permission_level: 'read',
      timestamp: '2024-01-01T00:00:00Z',
      read: false,
    },
    {
      id: 'notification-2',
      type: 'permission_changed',
      song_id: 'song-2',
      song_title: 'Second Song',
      actor_email: 'user2@example.com',
      old_permission: 'read',
      new_permission: 'edit',
      timestamp: '2024-01-01T01:00:00Z',
      read: false,
    },
    {
      id: 'notification-3',
      type: 'share_removed',
      song_id: 'song-3',
      song_title: 'Third Song',
      actor_email: 'user3@example.com',
      timestamp: '2024-01-01T02:00:00Z',
      read: true,
    },
  ];

  const defaultProps = {
    notifications: mockNotifications,
    onRemoveNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all notifications', () => {
    render(<NotificationContainer {...defaultProps} />);

    expect(
      screen.getByTestId('notification-notification-1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('notification-notification-2')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('notification-notification-3')
    ).toBeInTheDocument();

    expect(screen.getByText('First Song')).toBeInTheDocument();
    expect(screen.getByText('Second Song')).toBeInTheDocument();
    expect(screen.getByText('Third Song')).toBeInTheDocument();
  });

  it('renders nothing when notifications array is empty', () => {
    render(<NotificationContainer {...defaultProps} notifications={[]} />);

    expect(screen.queryByText('First Song')).not.toBeInTheDocument();
    expect(screen.queryByText('Second Song')).not.toBeInTheDocument();
    expect(screen.queryByText('Third Song')).not.toBeInTheDocument();
  });

  it('calls onRemoveNotification when notification close button is clicked', () => {
    const onRemoveNotification = vi.fn();
    render(
      <NotificationContainer
        {...defaultProps}
        onRemoveNotification={onRemoveNotification}
      />
    );

    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[0]);

    expect(onRemoveNotification).toHaveBeenCalledWith('notification-1');
  });

  it('calls onRemoveNotification with correct ID for each notification', () => {
    const onRemoveNotification = vi.fn();
    render(
      <NotificationContainer
        {...defaultProps}
        onRemoveNotification={onRemoveNotification}
      />
    );

    const closeButtons = screen.getAllByText('Close');

    fireEvent.click(closeButtons[1]);
    expect(onRemoveNotification).toHaveBeenCalledWith('notification-2');

    fireEvent.click(closeButtons[2]);
    expect(onRemoveNotification).toHaveBeenCalledWith('notification-3');
  });

  it('has proper accessibility attributes', () => {
    render(<NotificationContainer {...defaultProps} />);

    const container = screen.getByLabelText('Notifications');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('renders notifications in the order they are provided', () => {
    const reversedNotifications = [...mockNotifications].reverse();

    render(
      <NotificationContainer
        notifications={reversedNotifications}
        onRemoveNotification={vi.fn()}
      />
    );

    const notifications = screen.getAllByText(/Song/);
    expect(notifications[0]).toHaveTextContent('Third Song');
    expect(notifications[1]).toHaveTextContent('Second Song');
    expect(notifications[2]).toHaveTextContent('First Song');
  });

  it('handles single notification correctly', () => {
    const singleNotification = [mockNotifications[0]];

    render(
      <NotificationContainer
        notifications={singleNotification}
        onRemoveNotification={vi.fn()}
      />
    );

    expect(
      screen.getByTestId('notification-notification-1')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('notification-notification-2')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('notification-notification-3')
    ).not.toBeInTheDocument();
  });

  it('updates when notifications prop changes', () => {
    const { rerender } = render(<NotificationContainer {...defaultProps} />);

    expect(screen.getByText('First Song')).toBeInTheDocument();
    expect(screen.getByText('Second Song')).toBeInTheDocument();

    // Update with fewer notifications
    const updatedNotifications = [mockNotifications[0]];
    rerender(
      <NotificationContainer
        notifications={updatedNotifications}
        onRemoveNotification={vi.fn()}
      />
    );

    expect(screen.getByText('First Song')).toBeInTheDocument();
    expect(screen.queryByText('Second Song')).not.toBeInTheDocument();
    expect(screen.queryByText('Third Song')).not.toBeInTheDocument();
  });

  it('handles notifications with duplicate IDs gracefully', () => {
    const duplicateNotifications = [
      mockNotifications[0],
      { ...mockNotifications[1], id: mockNotifications[0].id }, // Same ID as first
    ];

    render(
      <NotificationContainer
        notifications={duplicateNotifications}
        onRemoveNotification={vi.fn()}
      />
    );

    // Should still render both, though React will warn about duplicate keys
    expect(screen.getByText('First Song')).toBeInTheDocument();
    expect(screen.getByText('Second Song')).toBeInTheDocument();
  });

  it('passes correct props to NotificationToast components', () => {
    render(<NotificationContainer {...defaultProps} />);

    // Verify all notifications are rendered with correct test IDs
    mockNotifications.forEach((notification) => {
      expect(
        screen.getByTestId(`notification-${notification.id}`)
      ).toBeInTheDocument();
    });
  });
});
