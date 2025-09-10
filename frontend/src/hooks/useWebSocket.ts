/**
 * React hooks for WebSocket functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  webSocketService, 
  ConnectionStatus, 
  WebSocketMessage, 
  RoomInfo, 
  CollaborationOperation, 
  CursorPosition 
} from '../services/webSocketService';

/**
 * Hook for managing WebSocket connection status
 */
export function useWebSocketConnection(token?: string) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    webSocketService.getConnectionStatus()
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to connection status updates
    const unsubscribeConnection = webSocketService.onConnection(setConnectionStatus);
    const unsubscribeError = webSocketService.onError(setError);

    // Authenticate if token is provided
    if (token && !connectionStatus.authenticated) {
      webSocketService.authenticate(token);
    }

    return () => {
      unsubscribeConnection();
      unsubscribeError();
    };
  }, [token, connectionStatus.authenticated]);

  const connect = useCallback((authToken?: string) => {
    setError(null);
    webSocketService.connect(authToken);
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  const authenticate = useCallback((authToken: string) => {
    setError(null);
    webSocketService.authenticate(authToken);
  }, []);

  return {
    connectionStatus,
    error,
    connect,
    disconnect,
    authenticate,
    isReady: connectionStatus.connected && connectionStatus.authenticated,
  };
}

/**
 * Hook for managing collaboration rooms
 */
export function useWebSocketRoom(roomId?: string) {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    const unsubscribeRoom = webSocketService.onRoom((info) => {
      setRoomInfo(info);
      if (info.id === roomId) {
        setParticipants(info.participants.map(p => p.id));
      }
    });

    const unsubscribeMessage = webSocketService.onMessage((message) => {
      if (message.type === 'room_message') {
        setMessages(prev => [...prev, message]);
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeMessage();
    };
  }, [roomId]);

  useEffect(() => {
    if (roomId && roomId !== currentRoom && webSocketService.isReady()) {
      if (currentRoom) {
        webSocketService.leaveRoom();
      }
      webSocketService.joinRoom(roomId);
      setCurrentRoom(roomId);
    }

    return () => {
      if (currentRoom) {
        webSocketService.leaveRoom();
        setCurrentRoom(null);
      }
    };
  }, [roomId, currentRoom]);

  const sendMessage = useCallback((message: unknown) => {
    webSocketService.sendMessage(message);
  }, []);

  const leaveRoom = useCallback(() => {
    webSocketService.leaveRoom();
    setCurrentRoom(null);
    setRoomInfo(null);
    setParticipants([]);
    setMessages([]);
  }, []);

  return {
    currentRoom,
    roomInfo,
    participants,
    messages,
    sendMessage,
    leaveRoom,
  };
}

/**
 * Hook for real-time collaboration features
 */
export function useWebSocketCollaboration(roomId?: string) {
  const [operations, setOperations] = useState<CollaborationOperation[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribeOperation = webSocketService.onOperation((operation) => {
      setOperations(prev => [...prev, operation]);
      
      // Remove from pending if it was our operation
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operation.id);
        return newSet;
      });
    });

    const unsubscribeCursor = webSocketService.onCursor((cursor) => {
      setCursors(prev => {
        const newMap = new Map(prev);
        newMap.set(cursor.userId, cursor);
        return newMap;
      });
    });

    return () => {
      unsubscribeOperation();
      unsubscribeCursor();
    };
  }, []);

  const sendOperation = useCallback((operation: Omit<CollaborationOperation, 'userId' | 'timestamp' | 'id'>) => {
    if (!roomId) return;

    const operationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to pending operations
    setPendingOperations(prev => new Set(prev).add(operationId));
    
    webSocketService.sendOperation({
      ...operation,
      id: operationId,
    });

    return operationId;
  }, [roomId]);

  const sendCursorUpdate = useCallback((position: Omit<CursorPosition, 'userId'>) => {
    if (!roomId) return;
    
    webSocketService.sendCursorUpdate(position);
  }, [roomId]);

  // Clear old operations periodically to prevent memory issues
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - (5 * 60 * 1000); // Keep operations for 5 minutes
      setOperations(prev => prev.filter(op => op.timestamp > cutoff));
    }, 60000); // Run cleanup every minute

    return () => clearInterval(cleanup);
  }, []);

  return {
    operations,
    cursors: Array.from(cursors.values()),
    pendingOperations: Array.from(pendingOperations),
    sendOperation,
    sendCursorUpdate,
  };
}

/**
 * Hook for connection status indicators
 */
export function useConnectionIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>(webSocketService.getConnectionStatus());
  const [showReconnecting, setShowReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const unsubscribe = webSocketService.onConnection((newStatus) => {
      setStatus(newStatus);

      // Show reconnecting indicator with a slight delay to avoid flickering
      if (newStatus.reconnecting) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setShowReconnecting(true);
        }, 1000);
      } else {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        setShowReconnecting(false);
      }
    });

    return () => {
      unsubscribe();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const getStatusColor = () => {
    if (!status.connected) return '#ef4444'; // red
    if (!status.authenticated) return '#f59e0b'; // amber
    if (status.latency && status.latency > 500) return '#f59e0b'; // amber for high latency
    return '#10b981'; // green
  };

  const getStatusText = () => {
    if (showReconnecting) return 'Reconnecting...';
    if (!status.connected) return 'Disconnected';
    if (!status.authenticated) return 'Authenticating...';
    if (status.latency) return `Connected (${status.latency}ms)`;
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (showReconnecting) return '🔄';
    if (!status.connected) return '⚡';
    if (!status.authenticated) return '🔐';
    return '🟢';
  };

  return {
    status,
    statusColor: getStatusColor(),
    statusText: getStatusText(),
    statusIcon: getStatusIcon(),
    isConnected: status.connected,
    isAuthenticated: status.authenticated,
    isReconnecting: showReconnecting,
    latency: status.latency,
    retryCount: status.retryCount,
    lastError: status.lastError,
  };
}

/**
 * Hook for managing WebSocket with automatic cleanup
 */
export function useWebSocket(config?: { 
  roomId?: string; 
  token?: string; 
  autoJoinRoom?: boolean;
}) {
  const connection = useWebSocketConnection(config?.token);
  const room = useWebSocketRoom(config?.autoJoinRoom ? config.roomId : undefined);
  const collaboration = useWebSocketCollaboration(config?.roomId);
  const indicator = useConnectionIndicator();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room.currentRoom) {
        room.leaveRoom();
      }
    };
  }, [room]);

  return {
    connection,
    room,
    collaboration,
    indicator,
    // Convenience methods
    isReady: connection.isReady,
    sendMessage: room.sendMessage,
    sendOperation: collaboration.sendOperation,
    sendCursorUpdate: collaboration.sendCursorUpdate,
  };
}