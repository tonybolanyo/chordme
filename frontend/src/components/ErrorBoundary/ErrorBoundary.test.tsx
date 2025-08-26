import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from './ErrorBoundary';

// Mock CSS import
vi.mock('./ErrorBoundary.css', () => ({}));

// Mock console methods
const originalConsoleError = console.error;

// Component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Component that conditionally throws an error
function ConditionalError() {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  return (
    <div>
      <button 
        data-testid="trigger-error"
        onClick={() => setShouldThrow(true)}
      >
        Trigger Error
      </button>
      <ThrowError shouldThrow={shouldThrow} />
    </div>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child component</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child component')).toBeInTheDocument();
  });

  it('renders default error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = <div data-testid="custom-fallback">Custom error UI</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.objectContaining({
        message: 'Test error'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('displays error ID', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    // Error ID should be in the format err-timestamp-random
    expect(screen.getByText(/err-\d+-[a-z0-9]+/)).toBeInTheDocument();
  });

  it('allows retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalError />
      </ErrorBoundary>
    );

    // Trigger error
    fireEvent.click(screen.getByTestId('trigger-error'));

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click try again
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // Should render children again
    expect(screen.getByTestId('trigger-error')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('provides reload page functionality', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload Page' }));

    expect(mockReload).toHaveBeenCalled();
  });

  it('shows error details in development mode', () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should have a details element
    const details = screen.getByText('Error Details (Development Only)');
    expect(details).toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should not have error details
    expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('handles error reporting in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Mock the reportError method by spying on console.error
    const consoleSpy = vi.spyOn(console, 'error');

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should log error report in production
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error Report:',
      expect.objectContaining({
        message: 'Test error',
        timestamp: expect.any(String),
        url: expect.any(String),
        userAgent: expect.any(String),
        errorId: expect.stringMatching(/err-\d+-[a-z0-9]+/)
      })
    );

    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  it('resets error state on retry', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click try again
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // Re-render with non-throwing component
    rerender(
      <ErrorBoundary>
        <div data-testid="recovered">Recovered successfully</div>
      </ErrorBoundary>
    );

    // Should show recovered content
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error boundary should have accessible content
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Buttons should be focusable and have proper labels
    const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
    const reloadButton = screen.getByRole('button', { name: 'Reload Page' });
    
    expect(tryAgainButton).toBeInTheDocument();
    expect(reloadButton).toBeInTheDocument();
  });
});