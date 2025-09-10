/**
 * Simple tests for WebSocket service functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Socket.IO with proper vitest factory function
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
  };
});

import { WebSocketService } from '../services/webSocketService';

describe('WebSocketService Basic Tests', () => {
  let service: WebSocketService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebSocketService({ autoConnect: false });
  });

  it('should initialize with disconnected status', () => {
    const status = service.getConnectionStatus();
    expect(status.connected).toBe(false);
    expect(status.authenticated).toBe(false);
  });

  it('should connect when requested', async () => {
    const { io } = await import('socket.io-client');
    service.connect();
    expect(io).toHaveBeenCalled();
  });

  it('should authenticate with token', async () => {
    const { io } = await import('socket.io-client');
    const mockSocket = (io as unknown)();
    
    service.connect();
    mockSocket.connected = true;
    
    service.authenticate('test-token');
    expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', { token: 'test-token' });
  });

  it('should not be ready when not connected and authenticated', () => {
    expect(service.isReady()).toBe(false);
  });

  it('should clean up properly', async () => {
    const { io } = await import('socket.io-client');
    
    service.connect(); // First need to connect to have a socket to disconnect
    const mockSocket = (io as unknown)();
    
    service.destroy();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});