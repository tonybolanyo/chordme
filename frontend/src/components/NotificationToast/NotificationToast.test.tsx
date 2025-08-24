import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationToast from './NotificationToast';
import type { SharingNotification } from '../../types';

describe('NotificationToast', () => {
  const mockNotification: SharingNotification = {
    id: 'test-notification-1',
    type: 'share_added',
    song_id: 'song-1',
    song_title: 'Test Song',
    actor_email: 'sharer@example.com',
    permission_level: 'read',
    timestamp: '2024-01-01T00:00:00Z',
    read: false,
  };

  const defaultProps = {
    notification: mockNotification,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing timers
    vi.clearAllTimers();
  });

  it('renders notification with correct message for share_added', () => {
    render(<NotificationToast {...defaultProps} />);
    
    expect(screen.getByText('sharer@example.com shared "Test Song" with you')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Notification icon' })).toHaveTextContent('🎵');
  });

  it('renders notification with correct message for share_removed', () => {
    const removedNotification: SharingNotification = {
      ...mockNotification,
      type: 'share_removed',
    };

    render(<NotificationToast {...defaultProps} notification={removedNotification} />);
    
    expect(screen.getByText('Your access to "Test Song" has been removed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Notification icon' })).toHaveTextContent('🚫');
  });

  it('renders notification with correct message for permission_changed', () => {
    const changedNotification: SharingNotification = {
      ...mockNotification,
      type: 'permission_changed',
      old_permission: 'read',
      new_permission: 'edit',
    };

    render(<NotificationToast {...defaultProps} notification={changedNotification} />);
    
    expect(screen.getByText('Your permission for "Test Song" changed from read to edit')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Notification icon' })).toHaveTextContent('🔧');
  });

  it('applies correct CSS class for share_added type', () => {
    render(<NotificationToast {...defaultProps} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('notification-success');
  });

  it('applies correct CSS class for share_removed type', () => {
    const removedNotification: SharingNotification = {
      ...mockNotification,
      type: 'share_removed',
    };

    render(<NotificationToast {...defaultProps} notification={removedNotification} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('notification-warning');
  });

  it('applies correct CSS class for permission_changed type', () => {
    const changedNotification: SharingNotification = {
      ...mockNotification,
      type: 'permission_changed',
    };

    render(<NotificationToast {...defaultProps} notification={changedNotification} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('notification-info');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<NotificationToast {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('auto-closes after default delay', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    render(<NotificationToast {...defaultProps} onClose={onClose} />);
    
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast forward time by default delay (5000ms)
    vi.advanceTimersByTime(5000);
    
    expect(onClose).toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('auto-closes after custom delay', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    render(<NotificationToast {...defaultProps} onClose={onClose} autoCloseDelay={3000} />);
    
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast forward time by custom delay (3000ms)
    vi.advanceTimersByTime(3000);
    
    expect(onClose).toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('does not auto-close when autoCloseDelay is 0', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    render(<NotificationToast {...defaultProps} onClose={onClose} autoCloseDelay={0} />);
    
    // Fast forward time by a long period
    vi.advanceTimersByTime(10000);
    
    expect(onClose).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('clears timeout when component unmounts', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    const { unmount } = render(<NotificationToast {...defaultProps} onClose={onClose} />);
    
    unmount();
    
    // Fast forward time
    vi.advanceTimersByTime(5000);
    
    // onClose should not be called since component was unmounted
    expect(onClose).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('handles unknown notification type gracefully', () => {
    const unknownNotification: SharingNotification = {
      ...mockNotification,
      type: 'unknown_type' as any,
    };

    render(<NotificationToast {...defaultProps} notification={unknownNotification} />);
    
    expect(screen.getByText('Sharing notification')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Notification icon' })).toHaveTextContent('📢');
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('notification-default');
  });

  it('has proper accessibility attributes', () => {
    render(<NotificationToast {...defaultProps} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    
    const closeButton = screen.getByLabelText('Close notification');
    expect(closeButton).toHaveAttribute('title', 'Close notification');
    
    const icon = screen.getByRole('img', { name: 'Notification icon' });
    expect(icon).toBeInTheDocument();
  });

  it('renders long song titles correctly', () => {
    const longTitleNotification: SharingNotification = {
      ...mockNotification,
      song_title: 'This is a very long song title that might wrap to multiple lines',
    };

    render(<NotificationToast {...defaultProps} notification={longTitleNotification} />);
    
    expect(screen.getByText(/sharer@example.com shared "This is a very long song title/)).toBeInTheDocument();
  });

  it('handles special characters in email and song title', () => {
    const specialNotification: SharingNotification = {
      ...mockNotification,
      actor_email: 'user+test@sub.example.com',
      song_title: 'Song with "Quotes" & Symbols',
    };

    render(<NotificationToast {...defaultProps} notification={specialNotification} />);
    
    expect(screen.getByText('user+test@sub.example.com shared "Song with "Quotes" & Symbols" with you')).toBeInTheDocument();
  });
});