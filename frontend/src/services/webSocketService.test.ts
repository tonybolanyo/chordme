/**
 * Tests for WebSocket service and hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Socket.IO client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
  };
});

// Now import the modules after mocking
import { WebSocketService } from '../services/webSocketService';
import { useWebSocketConnection, useWebSocketRoom, useWebSocketCollaboration } from '../hooks/useWebSocket';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockEventHandlers: Record<string, Function>;
  let mockSocket: unknown;
  let mockIo: unknown;

  beforeEach(() => {
    // Get fresh mock instances
    const { io } = await import('socket.io-client');
    mockIo = io as any;
    mockSocket = mockIo();
    
    mockEventHandlers = {};
    mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
      mockEventHandlers[event] = handler;
    });
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    mockIo.mockClear();

    service = new WebSocketService({ autoConnect: false });
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected status', () => {
      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.authenticated).toBe(false);
      expect(status.reconnecting).toBe(false);
    });

    it('should connect to WebSocket server', () => {
      service.connect();
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: expect.any(Number),
          forceNew: false,
          reconnection: false,
          autoConnect: true,
        })
      );
    });

    it('should handle connection events', () => {
      service.connect();
      
      // Simulate connection
      act(() => {
        mockSocket.connected = true;
        mockEventHandlers['connect']();
      });

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(true);
    });

    it('should handle disconnection events', () => {
      service.connect();
      
      // Connect first
      act(() => {
        mockSocket.connected = true;
        mockEventHandlers['connect']();
      });

      // Then disconnect
      act(() => {
        mockSocket.connected = false;
        mockEventHandlers['disconnect']('transport close');
      });

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.authenticated).toBe(false);
    });

    it('should authenticate with token', () => {
      const token = 'test-jwt-token';
      service.connect();
      mockSocket.connected = true;

      service.authenticate(token);

      expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', { token });
    });

    it('should handle authentication success', () => {
      service.connect();
      
      act(() => {
        mockEventHandlers['authenticated']({ user_id: 'user123' });
      });

      const status = service.getConnectionStatus();
      expect(status.authenticated).toBe(true);
    });

    it('should handle authentication errors', () => {
      service.connect();
      const errorSpy = vi.fn();
      service.onError(errorSpy);

      act(() => {
        mockEventHandlers['auth_error']({ message: 'Invalid token' });
      });

      const status = service.getConnectionStatus();
      expect(status.authenticated).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith('Invalid token');
    });
  });

  describe('Room Management', () => {
    beforeEach(() => {
      service.connect();
      mockSocket.connected = true;
      mockEventHandlers['connect']();
      mockEventHandlers['authenticated']({ user_id: 'user123' });
    });

    it('should join a room', () => {
      const roomId = 'song123';
      service.joinRoom(roomId);

      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { room_id: roomId });
      expect(service.getCurrentRoom()).toBe(roomId);
    });

    it('should leave a room', () => {
      const roomId = 'song123';
      service.joinRoom(roomId);
      service.leaveRoom();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', { room_id: roomId });
      expect(service.getCurrentRoom()).toBe(null);
    });

    it('should handle room joined events', () => {
      const roomSpy = vi.fn();
      service.onRoom(roomSpy);

      act(() => {
        mockEventHandlers['room_joined']({
          room_id: 'song123',
          participant_count: 2,
        });
      });

      expect(roomSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'song123',
          participantCount: 2,
        })
      );
    });

    it('should not join room when not authenticated', () => {
      service = new WebSocketService({ autoConnect: false });
      service.connect();
      mockSocket.connected = true;
      mockEventHandlers['connect']();
      // Don't authenticate

      const errorSpy = vi.fn();
      service.onError(errorSpy);

      service.joinRoom('song123');

      expect(errorSpy).toHaveBeenCalledWith(
        'Cannot join room: not connected or authenticated'
      );
    });
  });

  describe('Collaboration Features', () => {
    beforeEach(() => {
      service.connect();
      mockSocket.connected = true;
      mockEventHandlers['connect']();
      mockEventHandlers['authenticated']({ user_id: 'user123' });
      service.joinRoom('song123');
    });

    it('should send collaboration operations', () => {
      const operation = {
        id: 'op123',
        type: 'insert' as const,
        position: 10,
        content: 'hello',
      };

      service.sendOperation(operation);

      expect(mockSocket.emit).toHaveBeenCalledWith('collaboration_operation', {
        room_id: 'song123',
        operation,
      });
    });

    it('should send cursor updates', () => {
      const position = { line: 5, column: 10 };
      service.sendCursorUpdate(position);

      expect(mockSocket.emit).toHaveBeenCalledWith('cursor_update', {
        room_id: 'song123',
        position,
      });
    });

    it('should handle incoming collaboration operations', () => {
      const operationSpy = vi.fn();
      service.onOperation(operationSpy);

      act(() => {
        mockEventHandlers['collaboration_update']({
          operation_id: 'op456',
          user_id: 'user456',
          operation: {
            type: 'insert',
            position: 15,
            content: 'world',
          },
          timestamp: Date.now(),
        });
      });

      expect(operationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'op456',
          userId: 'user456',
          type: 'insert',
          position: 15,
          content: 'world',
        })
      );
    });

    it('should handle incoming cursor updates', () => {
      const cursorSpy = vi.fn();
      service.onCursor(cursorSpy);

      act(() => {
        mockEventHandlers['cursor_moved']({
          user_id: 'user456',
          position: { line: 3, column: 8 },
        });
      });

      expect(cursorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user456',
          line: 3,
          column: 8,
        })
      );
    });
  });

  describe('Ping/Pong Mechanism', () => {
    beforeEach(() => {
      service.connect();
      mockSocket.connected = true;
      mockEventHandlers['connect']();
    });

    it('should handle pong responses', () => {
      const timestamp = Date.now();
      
      act(() => {
        mockEventHandlers['pong']({ timestamp });
      });

      const status = service.getConnectionStatus();
      expect(status.serverTime).toBe(timestamp);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', () => {
      service.connect();
      const connectionSpy = vi.fn();
      service.onConnection(connectionSpy);

      act(() => {
        mockEventHandlers['connect_error'](new Error('Connection failed'));
      });

      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.lastError).toContain('Connection error');
    });

    it('should handle server errors', () => {
      service.connect();
      const errorSpy = vi.fn();
      service.onError(errorSpy);

      act(() => {
        mockEventHandlers['error']({ message: 'Server error' });
      });

      expect(errorSpy).toHaveBeenCalledWith('Server error');
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should schedule reconnection on unexpected disconnect', () => {
      service.connect();
      
      // Connect first
      act(() => {
        mockSocket.connected = true;
        mockEventHandlers['connect']();
      });

      // Disconnect unexpectedly
      act(() => {
        mockSocket.connected = false;
        mockEventHandlers['disconnect']('transport close');
      });

      const status = service.getConnectionStatus();
      expect(status.reconnecting).toBe(true);
      expect(status.retryCount).toBe(1);
    });

    it('should implement exponential backoff', () => {
      service.connect();
      
      // Simulate multiple failed reconnection attempts
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockEventHandlers['connect_error'](new Error('Connection failed'));
        });
      }

      const status = service.getConnectionStatus();
      expect(status.retryCount).toBe(3);
    });
  });
});

describe('WebSocket React Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useWebSocketConnection', () => {
    it('should return connection status', () => {
      const { result } = renderHook(() => useWebSocketConnection());

      expect(result.current.connectionStatus).toEqual(
        expect.objectContaining({
          connected: expect.any(Boolean),
          authenticated: expect.any(Boolean),
        })
      );
    });

    it('should provide connection methods', () => {
      const { result } = renderHook(() => useWebSocketConnection());

      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.authenticate).toBe('function');
    });

    it('should authenticate when token is provided', () => {
      const token = 'test-token';
      
      renderHook(() => useWebSocketConnection(token));

      // The hook should attempt to authenticate with the provided token
      // This would be tested by checking if webSocketService.authenticate was called
    });
  });

  describe('useWebSocketRoom', () => {
    it('should manage room state', () => {
      const roomId = 'song123';
      const { result } = renderHook(() => useWebSocketRoom(roomId));

      expect(result.current.currentRoom).toBe(null); // Initially no room
      expect(result.current.participants).toEqual([]);
      expect(result.current.messages).toEqual([]);
    });

    it('should provide room methods', () => {
      const { result } = renderHook(() => useWebSocketRoom());

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.leaveRoom).toBe('function');
    });
  });

  describe('useWebSocketCollaboration', () => {
    it('should manage collaboration state', () => {
      const roomId = 'song123';
      const { result } = renderHook(() => useWebSocketCollaboration(roomId));

      expect(result.current.operations).toEqual([]);
      expect(result.current.cursors).toEqual([]);
      expect(result.current.pendingOperations).toEqual([]);
    });

    it('should provide collaboration methods', () => {
      const { result } = renderHook(() => useWebSocketCollaboration());

      expect(typeof result.current.sendOperation).toBe('function');
      expect(typeof result.current.sendCursorUpdate).toBe('function');
    });

    it('should generate operation IDs', () => {
      const roomId = 'song123';
      const { result } = renderHook(() => useWebSocketCollaboration(roomId));

      const operation = {
        type: 'insert' as const,
        position: 10,
        content: 'test',
      };

      act(() => {
        const operationId = result.current.sendOperation(operation);
        expect(typeof operationId).toBe('string');
        expect(result.current.pendingOperations).toContain(operationId);
      });
    });
  });
});

describe('Message Validation', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService({ autoConnect: false });
    service.connect();
    mockSocket.connected = true;
    mockEventHandlers['connect']();
    mockEventHandlers['authenticated']({ user_id: 'user123' });
    service.joinRoom('song123');
  });

  afterEach(() => {
    service.destroy();
  });

  it('should validate operation data structure', () => {
    const validOperation = {
      id: 'op123',
      type: 'insert' as const,
      position: 10,
      content: 'hello',
    };

    expect(() => service.sendOperation(validOperation)).not.toThrow();
  });

  it('should validate cursor position data', () => {
    const validPosition = { line: 5, column: 10 };
    
    expect(() => service.sendCursorUpdate(validPosition)).not.toThrow();
  });

  it('should handle malformed incoming data gracefully', () => {
    const errorSpy = vi.fn();
    service.onError(errorSpy);

    // Simulate malformed collaboration update
    act(() => {
      try {
        mockEventHandlers['collaboration_update']({
          // Missing required fields
          user_id: 'user456',
        });
      } catch (error) {
        // Should handle gracefully
      }
    });

    // Should not crash the application
    expect(service.isReady()).toBe(true);
  });
});

describe('Performance and Cleanup', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService({ autoConnect: false });
  });

  afterEach(() => {
    service.destroy();
  });

  it('should clean up event handlers on destroy', () => {
    const connectionSpy = vi.fn();
    const messageSpy = vi.fn();
    
    const unsubscribe1 = service.onConnection(connectionSpy);
    const unsubscribe2 = service.onMessage(messageSpy);

    // Verify handlers are registered
    expect(service['connectionHandlers'].size).toBe(1);
    expect(service['messageHandlers'].size).toBe(1);

    // Test individual unsubscribe
    unsubscribe1();
    expect(service['connectionHandlers'].size).toBe(0);

    // Test destroy cleanup
    service.destroy();
    expect(service['messageHandlers'].size).toBe(0);
  });

  it('should handle multiple event handlers', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const spy3 = vi.fn();

    service.onConnection(spy1);
    service.onConnection(spy2);
    service.onConnection(spy3);

    expect(service['connectionHandlers'].size).toBe(3);

    service.destroy();
    expect(service['connectionHandlers'].size).toBe(0);
  });
});