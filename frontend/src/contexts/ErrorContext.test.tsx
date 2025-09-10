import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  ErrorProvider,
  useError,
  createApiError,
  createNetworkError,
  createValidationError,
} from './ErrorContext';

// Test component that uses the error context
function TestComponent() {
  const {
    state,
    addError,
    addNotification,
    canRetry,
    incrementRetryAttempts,
    isRetryableError,
  } = useError();

  return (
    <div>
      <div data-testid="error-count">{state.errors.length}</div>
      <div data-testid="notification-count">{state.notifications.length}</div>
      <div data-testid="online-status">
        {state.isOnline ? 'online' : 'offline'}
      </div>

      <button
        data-testid="add-error"
        onClick={() => addError(createApiError('Test error', 'TEST_ERROR'))}
      >
        Add Error
      </button>

      <button
        data-testid="add-notification"
        onClick={() =>
          addNotification({
            message: 'Test notification',
            type: 'info',
          })
        }
      >
        Add Notification
      </button>

      <button
        data-testid="add-retryable-error"
        onClick={() => addError(createNetworkError('Network error'))}
      >
        Add Retryable Error
      </button>

      <button
        data-testid="increment-retry"
        onClick={() => incrementRetryAttempts('test-operation')}
      >
        Increment Retry
      </button>

      <div data-testid="can-retry">
        {canRetry('test-operation') ? 'can-retry' : 'cannot-retry'}
      </div>

      {state.errors.map((error) => (
        <div key={error.id} data-testid="error-item">
          <span data-testid="error-message">{error.message}</span>
          <span data-testid="error-retryable">
            {isRetryableError(error) ? 'retryable' : 'non-retryable'}
          </span>
        </div>
      ))}
    </div>
  );
}

describe('ErrorContext', () => {
  beforeEach(() => {
    // Reset online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('provides initial state correctly', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    expect(screen.getByTestId('error-count')).toHaveTextContent('0');
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    expect(screen.getByTestId('online-status')).toHaveTextContent('online');
    expect(screen.getByTestId('can-retry')).toHaveTextContent('can-retry');
  });

  it('adds and tracks errors', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-error'));

    await waitFor(() => {
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Test error'
      );
    });
  });

  it('adds and tracks notifications', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByTestId('add-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });
  });

  it('tracks retry attempts correctly', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // Initially can retry
    expect(screen.getByTestId('can-retry')).toHaveTextContent('can-retry');

    // Increment retry attempts multiple times
    fireEvent.click(screen.getByTestId('increment-retry'));
    fireEvent.click(screen.getByTestId('increment-retry'));
    fireEvent.click(screen.getByTestId('increment-retry'));

    await waitFor(() => {
      expect(screen.getByTestId('can-retry')).toHaveTextContent('cannot-retry');
    });
  });

  it('identifies retryable errors correctly', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // Add a non-retryable error
    fireEvent.click(screen.getByTestId('add-error'));

    await waitFor(() => {
      expect(screen.getByTestId('error-retryable')).toHaveTextContent(
        'non-retryable'
      );
    });

    // Add a retryable error
    fireEvent.click(screen.getByTestId('add-retryable-error'));

    await waitFor(() => {
      const retryableElements = screen.getAllByTestId('error-retryable');
      expect(retryableElements[1]).toHaveTextContent('retryable');
    });
  });

  it('handles online/offline status changes', () => {
    // Mock addEventListener and removeEventListener
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // Check that event listeners were added
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'online',
      expect.any((...args: unknown[]) => unknown)
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'offline',
      expect.any((...args: unknown[]) => unknown)
    );

    unmount();

    // Check that event listeners were removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'online',
      expect.any((...args: unknown[]) => unknown)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'offline',
      expect.any((...args: unknown[]) => unknown)
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});

describe('Error utility functions', () => {
  it('creates API errors correctly', () => {
    const error = createApiError('API error message', 'API_ERROR', 'api', true);

    expect(error.message).toBe('API error message');
    expect(error.code).toBe('API_ERROR');
    expect(error.category).toBe('api');
    expect(error.retryable).toBe(true);
    expect(error.source).toBe('api');
  });

  it('creates network errors correctly', () => {
    const error = createNetworkError();

    expect(error.message).toBe('Network error occurred');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.category).toBe('network');
    expect(error.retryable).toBe(true);
    expect(error.source).toBe('network');
  });

  it('creates validation errors correctly', () => {
    const error = createValidationError('Invalid email', 'email');

    expect(error.message).toBe('Invalid email');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.category).toBe('validation');
    expect(error.retryable).toBe(false);
    expect(error.source).toBe('validation');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('creates validation errors without field', () => {
    const error = createValidationError('Invalid data');

    expect(error.message).toBe('Invalid data');
    expect(error.details).toBeUndefined();
  });
});
