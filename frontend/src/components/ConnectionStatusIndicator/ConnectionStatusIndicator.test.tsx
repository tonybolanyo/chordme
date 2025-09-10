/**
 * Tests for Connection Status Indicator component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the WebSocket hook
vi.mock('../../hooks/useWebSocket', () => ({
  useConnectionIndicator: vi.fn(),
}));

import { useConnectionIndicator } from '../../hooks/useWebSocket';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

const mockUseConnectionIndicator = useConnectionIndicator as vi.Mocked(...args: unknown[]) => unknown<typeof useConnectionIndicator>;

describe('ConnectionStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render connected status', () => {
    mockUseConnectionIndicator.mockReturnValue({
      statusColor: '#10b981',
      statusText: 'Connected',
      statusIcon: '🟢',
      isConnected: true,
      isAuthenticated: true,
      isReconnecting: false,
      latency: 50,
      retryCount: 0,
      lastError: undefined,
      status: {
        connected: true,
        authenticated: true,
        reconnecting: false,
        retryCount: 0,
      },
    });

    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('🟢')).toBeInTheDocument();
  });

  it('should render disconnected status', () => {
    mockUseConnectionIndicator.mockReturnValue({
      statusColor: '#ef4444',
      statusText: 'Disconnected',
      statusIcon: '⚡',
      isConnected: false,
      isAuthenticated: false,
      isReconnecting: false,
      latency: undefined,
      retryCount: 0,
      lastError: 'Connection failed',
      status: {
        connected: false,
        authenticated: false,
        reconnecting: false,
        retryCount: 0,
        lastError: 'Connection failed',
      },
    });

    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('should render reconnecting status', () => {
    mockUseConnectionIndicator.mockReturnValue({
      statusColor: '#f59e0b',
      statusText: 'Reconnecting...',
      statusIcon: '🔄',
      isConnected: false,
      isAuthenticated: false,
      isReconnecting: true,
      latency: undefined,
      retryCount: 2,
      lastError: undefined,
      status: {
        connected: false,
        authenticated: false,
        reconnecting: true,
        retryCount: 2,
      },
    });

    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('should show details when showDetails is true', () => {
    mockUseConnectionIndicator.mockReturnValue({
      statusColor: '#10b981',
      statusText: 'Connected',
      statusIcon: '🟢',
      isConnected: true,
      isAuthenticated: true,
      isReconnecting: false,
      latency: 75,
      retryCount: 0,
      lastError: undefined,
      status: {
        connected: true,
        authenticated: true,
        reconnecting: false,
        retryCount: 0,
      },
    });

    render(<ConnectionStatusIndicator showDetails={true} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('75ms')).toBeInTheDocument();
  });

  it('should show retry count when reconnecting', () => {
    mockUseConnectionIndicator.mockReturnValue({
      statusColor: '#f59e0b',
      statusText: 'Reconnecting...',
      statusIcon: '🔄',
      isConnected: false,
      isAuthenticated: false,
      isReconnecting: true,
      latency: undefined,
      retryCount: 3,
      lastError: undefined,
      status: {
        connected: false,
        authenticated: false,
        reconnecting: true,
        retryCount: 3,
      },
    });

    render(<ConnectionStatusIndicator showDetails={true} />);
    
    expect(screen.getByText('Attempt 3')).toBeInTheDocument();
  });

  it('should show error when disconnected with error', () => {
    mockUseConnectionIndicator.mockReturnValue({
      statusColor: '#ef4444',
      statusText: 'Disconnected',
      statusIcon: '⚡',
      isConnected: false,
      isAuthenticated: false,
      isReconnecting: false,
      latency: undefined,
      retryCount: 0,
      lastError: 'Network error',
      status: {
        connected: false,
        authenticated: false,
        reconnecting: false,
        retryCount: 0,
        lastError: 'Network error',
      },
    });

    render(<ConnectionStatusIndicator showDetails={true} />);
    
    expect(screen.getByText('Connection error')).toBeInTheDocument();
  });
});