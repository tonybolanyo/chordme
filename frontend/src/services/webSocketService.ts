/**
 * WebSocket service using Socket.IO for real-time communication
 */

import { io, Socket } from 'socket.io-client';

export interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  reconnecting: boolean;
  retryCount: number;
  lastError?: string;
  latency?: number;
  serverTime?: number;
}

export interface WebSocketUser {
  id: string;
  email: string;
  name?: string;
}

export interface RoomInfo {
  id: string;
  participantCount: number;
  participants: WebSocketUser[];
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
}

export interface CollaborationOperation {
  id: string;
  type: 'insert' | 'delete' | 'format';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

export interface CursorPosition {
  line: number;
  column: number;
  userId: string;
  color?: string;
}

export type ConnectionEventHandler = (status: ConnectionStatus) => void;
export type MessageEventHandler = (message: WebSocketMessage) => void;
export type RoomEventHandler = (roomInfo: RoomInfo) => void;
export type OperationEventHandler = (operation: CollaborationOperation) => void;
export type CursorEventHandler = (cursor: CursorPosition) => void;
export type ErrorEventHandler = (error: string) => void;

export class WebSocketService {
  private socket: Socket | null = null;
  private config: Required<WebSocketConfig>;
  private connectionStatus: ConnectionStatus;
  private retryTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private currentToken: string | null = null;
  private currentRoom: string | null = null;

  // Event handlers
  private connectionHandlers = new Set<ConnectionEventHandler>();
  private messageHandlers = new Set<MessageEventHandler>();
  private roomHandlers = new Set<RoomEventHandler>();
  private operationHandlers = new Set<OperationEventHandler>();
  private cursorHandlers = new Set<CursorEventHandler>();
  private errorHandlers = new Set<ErrorEventHandler>();

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || (
        process.env.NODE_ENV === 'development' 
          ? 'http://localhost:5000' 
          : window.location.origin
      ),
      autoConnect: config.autoConnect ?? true,
      retryAttempts: config.retryAttempts ?? 5,
      retryDelay: config.retryDelay ?? 1000,
      maxRetryDelay: config.maxRetryDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      timeout: config.timeout ?? 20000,
    };

    this.connectionStatus = {
      connected: false,
      authenticated: false,
      reconnecting: false,
      retryCount: 0,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(token?: string): void {
    if (this.socket?.connected) {
      return;
    }

    if (token) {
      this.currentToken = token;
    }

    const socketConfig = {
      timeout: this.config.timeout,
      forceNew: false,
      reconnection: false, // We handle reconnection manually
      autoConnect: true,
      auth: this.currentToken ? { token: this.currentToken } : undefined,
    };

    this.socket = io(this.config.url, socketConfig);
    this.setupEventHandlers();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionStatus({
      connected: false,
      authenticated: false,
      reconnecting: false,
      retryCount: 0,
    });
  }

  /**
   * Authenticate with the server using JWT token
   */
  authenticate(token: string): void {
    this.currentToken = token;

    if (this.socket?.connected) {
      this.socket.emit('authenticate', { token });
    } else {
      // Store token for connection
      this.connect(token);
    }
  }

  /**
   * Join a collaboration room
   */
  joinRoom(roomId: string): void {
    if (!this.socket?.connected || !this.connectionStatus.authenticated) {
      this.emitError('Cannot join room: not connected or authenticated');
      return;
    }

    this.currentRoom = roomId;
    this.socket.emit('join_room', { room_id: roomId });
  }

  /**
   * Leave the current collaboration room
   */
  leaveRoom(): void {
    if (!this.socket?.connected || !this.currentRoom) {
      return;
    }

    this.socket.emit('leave_room', { room_id: this.currentRoom });
    this.currentRoom = null;
  }

  /**
   * Send a message to the current room
   */
  sendMessage(message: any): void {
    if (!this.socket?.connected || !this.currentRoom || !this.connectionStatus.authenticated) {
      this.emitError('Cannot send message: not connected, authenticated, or in room');
      return;
    }

    this.socket.emit('broadcast_message', {
      room_id: this.currentRoom,
      message,
    });
  }

  /**
   * Send a collaboration operation
   */
  sendOperation(operation: Omit<CollaborationOperation, 'userId' | 'timestamp'>): void {
    if (!this.socket?.connected || !this.currentRoom || !this.connectionStatus.authenticated) {
      this.emitError('Cannot send operation: not connected, authenticated, or in room');
      return;
    }

    this.socket.emit('collaboration_operation', {
      room_id: this.currentRoom,
      operation,
    });
  }

  /**
   * Send cursor position update
   */
  sendCursorUpdate(position: Omit<CursorPosition, 'userId'>): void {
    if (!this.socket?.connected || !this.currentRoom || !this.connectionStatus.authenticated) {
      return; // Cursor updates are non-critical, fail silently
    }

    this.socket.emit('cursor_update', {
      room_id: this.currentRoom,
      position,
    });
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Check if connected and authenticated
   */
  isReady(): boolean {
    return this.connectionStatus.connected && this.connectionStatus.authenticated;
  }

  /**
   * Get current room ID
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  /**
   * Event handler registration methods
   */
  onConnection(handler: ConnectionEventHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onMessage(handler: MessageEventHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onRoom(handler: RoomEventHandler): () => void {
    this.roomHandlers.add(handler);
    return () => this.roomHandlers.delete(handler);
  }

  onOperation(handler: OperationEventHandler): () => void {
    this.operationHandlers.add(handler);
    return () => this.operationHandlers.delete(handler);
  }

  onCursor(handler: CursorEventHandler): () => void {
    this.cursorHandlers.add(handler);
    return () => this.cursorHandlers.delete(handler);
  }

  onError(handler: ErrorEventHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.updateConnectionStatus({
        connected: true,
        retryCount: 0,
        lastError: undefined,
      });

      // Start ping mechanism
      this.startPingMechanism();

      // If we have a token, authenticate immediately
      if (this.currentToken) {
        this.socket!.emit('authenticate', { token: this.currentToken });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.updateConnectionStatus({
        connected: false,
        authenticated: false,
        lastError: `Disconnected: ${reason}`,
      });

      this.stopPingMechanism();

      // Attempt reconnection for unexpected disconnects
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }

      this.scheduleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.updateConnectionStatus({
        connected: false,
        authenticated: false,
        lastError: `Connection error: ${error.message}`,
      });

      this.scheduleReconnection();
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated for user:', data.user_id);
      this.updateConnectionStatus({
        authenticated: true,
        lastError: undefined,
      });
    });

    this.socket.on('auth_error', (data) => {
      console.error('WebSocket authentication error:', data.message);
      this.updateConnectionStatus({
        authenticated: false,
        lastError: `Authentication error: ${data.message}`,
      });
      this.emitError(data.message);
    });

    // Ping/pong for latency measurement
    this.socket.on('pong', (data) => {
      const now = Date.now();
      const serverTime = data.timestamp;
      const latency = now - (this.connectionStatus.serverTime || now);
      
      this.updateConnectionStatus({
        latency,
        serverTime,
      });
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      console.log('Joined room:', data.room_id);
      this.emitRoomEvent({
        id: data.room_id,
        participantCount: data.participant_count,
        participants: [], // Will be updated by user events
      });
    });

    this.socket.on('room_left', (data) => {
      console.log('Left room:', data.room_id);
      if (this.currentRoom === data.room_id) {
        this.currentRoom = null;
      }
    });

    this.socket.on('user_joined', (data) => {
      console.log('User joined room:', data.user_id);
      this.emitRoomEvent({
        id: data.room_id,
        participantCount: data.participant_count,
        participants: [], // Simplified for now
      });
    });

    this.socket.on('user_left', (data) => {
      console.log('User left room:', data.user_id);
      this.emitRoomEvent({
        id: data.room_id,
        participantCount: data.participant_count,
        participants: [], // Simplified for now
      });
    });

    // Collaboration events
    this.socket.on('collaboration_update', (data) => {
      this.emitOperationEvent({
        id: data.operation_id,
        type: data.operation.type,
        position: data.operation.position,
        content: data.operation.content,
        length: data.operation.length,
        userId: data.user_id,
        timestamp: data.timestamp,
      });
    });

    this.socket.on('cursor_moved', (data) => {
      this.emitCursorEvent({
        line: data.position.line,
        column: data.position.column,
        userId: data.user_id,
      });
    });

    // Message events
    this.socket.on('room_message', (data) => {
      this.emitMessageEvent({
        type: 'room_message',
        data: data.message,
        timestamp: data.timestamp,
        userId: data.user_id,
      });
    });

    // Error events
    this.socket.on('error', (data) => {
      console.error('WebSocket server error:', data.message);
      this.emitError(data.message);
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.connectionStatus.retryCount >= this.config.retryAttempts) {
      this.emitError('Maximum reconnection attempts reached');
      return;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    const delay = Math.min(
      this.config.retryDelay * Math.pow(this.config.backoffMultiplier, this.connectionStatus.retryCount),
      this.config.maxRetryDelay
    );

    this.updateConnectionStatus({
      reconnecting: true,
      retryCount: this.connectionStatus.retryCount + 1,
    });

    console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.connectionStatus.retryCount})`);

    this.retryTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat/ping mechanism
   */
  private startPingMechanism(): void {
    this.stopPingMechanism();

    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.connectionStatus.serverTime = Date.now();
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat/ping mechanism
   */
  private stopPingMechanism(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Update connection status and notify handlers
   */
  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates };
    this.connectionHandlers.forEach(handler => {
      try {
        handler(this.connectionStatus);
      } catch (error) {
        console.error('Error in connection status handler:', error);
      }
    });
  }

  /**
   * Emit events to registered handlers
   */
  private emitMessageEvent(message: WebSocketMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private emitRoomEvent(roomInfo: RoomInfo): void {
    this.roomHandlers.forEach(handler => {
      try {
        handler(roomInfo);
      } catch (error) {
        console.error('Error in room handler:', error);
      }
    });
  }

  private emitOperationEvent(operation: CollaborationOperation): void {
    this.operationHandlers.forEach(handler => {
      try {
        handler(operation);
      } catch (error) {
        console.error('Error in operation handler:', error);
      }
    });
  }

  private emitCursorEvent(cursor: CursorPosition): void {
    this.cursorHandlers.forEach(handler => {
      try {
        handler(cursor);
      } catch (error) {
        console.error('Error in cursor handler:', error);
      }
    });
  }

  private emitError(error: string): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (error) {
        console.error('Error in error handler:', error);
      }
    });
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.disconnect();
    this.connectionHandlers.clear();
    this.messageHandlers.clear();
    this.roomHandlers.clear();
    this.operationHandlers.clear();
    this.cursorHandlers.clear();
    this.errorHandlers.clear();
  }
}

// Global WebSocket service instance
export const webSocketService = new WebSocketService();