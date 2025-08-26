import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ErrorProvider, useError } from '../../contexts/ErrorContext';
import NotificationSystem from './NotificationSystem';

// Mock CSS import
vi.mock('./NotificationSystem.css', () => ({}));

// Test component to trigger notifications
function TestTrigger() {
  const { addNotification } = useError();

  return (
    <div>
      <button
        data-testid="add-error-notification"
        onClick={() => addNotification({
          message: 'Error notification',
          type: 'error',
          code: 'TEST_ERROR'
        })}
      >
        Add Error
      </button>
      
      <button
        data-testid="add-warning-notification"
        onClick={() => addNotification({
          message: 'Warning notification',
          type: 'warning'
        })}
      >
        Add Warning
      </button>
      
      <button
        data-testid="add-info-notification"
        onClick={() => addNotification({
          message: 'Info notification',
          type: 'info'
        })}
      >
        Add Info
      </button>
      
      <button
        data-testid="add-persistent-notification"
        onClick={() => addNotification({
          message: 'Persistent notification',
          type: 'error',
          autoClose: false
        })}
      >
        Add Persistent
      </button>
      
      <button
        data-testid="add-quick-notification"
        onClick={() => addNotification({
          message: 'Quick notification',
          type: 'info',
          duration: 100
        })}
      >
        Add Quick
      </button>
    </div>
  );
}

describe('NotificationSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no notifications', () => {
    const { container } = render(
      <ErrorProvider>
        <NotificationSystem />
      </ErrorProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays error notification correctly', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-error-notification'));

    await waitFor(() => {
      expect(screen.getByText('Error notification')).toBeInTheDocument();
      expect(screen.getByText('Error Code: TEST_ERROR')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    }, { timeout: 10000 });

    const notification = screen.getByRole('alert');
    expect(notification).toHaveClass('notification--error');
  });

  it('displays warning notification correctly', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-warning-notification'));

    await waitFor(() => {
      expect(screen.getByText('Warning notification')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    }, { timeout: 10000 });

    const notification = screen.getByRole('alert');
    expect(notification).toHaveClass('notification--warning');
  });

  it('displays info notification correctly', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-info-notification'));

    await waitFor(() => {
      expect(screen.getByText('Info notification')).toBeInTheDocument();
      expect(screen.getByText('ℹ️')).toBeInTheDocument();
    }, { timeout: 10000 });

    const notification = screen.getByRole('alert');
    expect(notification).toHaveClass('notification--info');
  });

  it('allows manual dismissal of notifications', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-error-notification'));

    await waitFor(() => {
      expect(screen.getByText('Error notification')).toBeInTheDocument();
    }, { timeout: 10000 });

    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Error notification')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('auto-closes notifications with default duration', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-error-notification'));

    await waitFor(() => {
      expect(screen.getByText('Error notification')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Fast forward time by default duration (5000ms)
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Error notification')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('does not auto-close persistent notifications', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-persistent-notification'));

    await waitFor(() => {
      expect(screen.getByText('Persistent notification')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Fast forward time well beyond default duration
    vi.advanceTimersByTime(10000);

    // Should still be visible
    expect(screen.getByText('Persistent notification')).toBeInTheDocument();
  });

  it('respects custom duration', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-quick-notification'));

    await waitFor(() => {
      expect(screen.getByText('Quick notification')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Fast forward by custom duration (100ms)
    vi.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.queryByText('Quick notification')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('displays multiple notifications', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-error-notification'));
    fireEvent.click(screen.getByTestId('add-warning-notification'));
    fireEvent.click(screen.getByTestId('add-info-notification'));

    await waitFor(() => {
      expect(screen.getByText('Error notification')).toBeInTheDocument();
      expect(screen.getByText('Warning notification')).toBeInTheDocument();
      expect(screen.getByText('Info notification')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Should have multiple notification elements
    const notifications = screen.getAllByRole('alert');
    expect(notifications).toHaveLength(3);
  });

  it('handles notifications without error codes', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-warning-notification'));

    await waitFor(() => {
      expect(screen.getByText('Warning notification')).toBeInTheDocument();
      expect(screen.queryByText(/Error Code:/)).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('has proper accessibility attributes', async () => {
    render(
      <ErrorProvider>
        <TestTrigger />
        <NotificationSystem />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-error-notification'));

    await waitFor(() => {
      const notificationSystem = screen.getByLabelText('Notifications');
      expect(notificationSystem).toBeInTheDocument();

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');

      const closeButton = screen.getByLabelText('Close notification');
      expect(closeButton).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});