# WebSocket Real-time Infrastructure Documentation

## Overview

ChordMe includes a comprehensive WebSocket-based real-time infrastructure built with Socket.IO that enables real-time collaboration, live updates, and instant communication between users. This infrastructure coexists with the existing Firebase-based real-time features, providing users with flexible deployment options.

## Architecture

### Core Components

1. **WebSocket Server** (`backend/chordme/websocket_server.py`)
   - Socket.IO server integrated with Flask
   - Connection lifecycle management
   - Authentication and authorization
   - Rate limiting and security measures
   - Room-based isolation for collaborative sessions

2. **WebSocket Client Service** (`frontend/src/services/webSocketService.ts`)
   - Socket.IO client with automatic reconnection
   - Connection status monitoring
   - Message routing and event handling
   - Exponential backoff for reconnection attempts

3. **React Hooks** (`frontend/src/hooks/useWebSocket.ts`)
   - `useWebSocketConnection` - Connection management
   - `useWebSocketRoom` - Room-based collaboration
   - `useWebSocketCollaboration` - Real-time operations
   - `useConnectionIndicator` - UI status indicators

4. **Connection Status Indicator** (`frontend/src/components/ConnectionStatusIndicator/`)
   - Visual connection status display
   - Latency monitoring
   - Error state indication
   - Reconnection progress tracking

## Features

### Connection Management
- Automatic connection establishment
- JWT-based authentication
- Session persistence across page refreshes
- Graceful disconnection handling

### Real-time Collaboration
- Room-based isolation (one room per song)
- Operational Transform support for text editing
- Cursor position sharing
- Presence indicators
- Conflict resolution

### Scalability and Performance
- Redis-based message queue for multi-instance deployments
- Connection pooling and management
- Rate limiting to prevent abuse
- Heartbeat/ping mechanism for connection health

### Security
- JWT token authentication required for all operations
- Rate limiting per user and per IP
- Room authorization checks
- Message size limits
- Secure room isolation

## Configuration

### Environment Variables

#### Backend Configuration
```bash
# Redis URL for scaling (optional)
REDIS_URL=redis://localhost:6379
# or
REDISCLOUD_URL=redis://user:pass@host:port

# Flask settings
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=1

# WebSocket-specific settings (optional)
WEBSOCKET_PING_INTERVAL=25
WEBSOCKET_PING_TIMEOUT=60
```

#### Frontend Configuration
```bash
# WebSocket server URL (development)
VITE_WEBSOCKET_URL=http://localhost:5000

# Production will use window.location.origin by default
```

### Redis Setup for Load Balancing

For production deployments with multiple server instances:

1. **Install Redis**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # macOS
   brew install redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Configure Redis URL**:
   ```bash
   export REDIS_URL=redis://localhost:6379
   ```

3. **Start multiple server instances**:
   ```bash
   # Instance 1
   FLASK_PORT=5000 python run.py &
   
   # Instance 2
   FLASK_PORT=5001 python run.py &
   ```

## Usage Examples

### Basic Connection

```typescript
import { webSocketService } from './services/webSocketService';

// Connect with authentication
webSocketService.authenticate('your-jwt-token');

// Listen for connection status
webSocketService.onConnection((status) => {
  console.log('Connection status:', status);
});
```

### Room-based Collaboration

```typescript
import { useWebSocket } from './hooks/useWebSocket';

function CollaborativeEditor({ songId, token }) {
  const { connection, room, collaboration } = useWebSocket({
    roomId: songId,
    token,
    autoJoinRoom: true,
  });

  // Send text operations
  const handleTextChange = (operation) => {
    collaboration.sendOperation({
      type: 'insert',
      position: 10,
      content: 'Hello, world!',
    });
  };

  // Handle incoming operations
  useEffect(() => {
    collaboration.operations.forEach(op => {
      // Apply operation to editor
      applyOperation(op);
    });
  }, [collaboration.operations]);

  return (
    <div>
      <ConnectionStatusIndicator />
      <Editor onChange={handleTextChange} />
    </div>
  );
}
```

### Connection Status Monitoring

```typescript
import { useConnectionIndicator } from './hooks/useWebSocket';
import ConnectionStatusIndicator from './components/ConnectionStatusIndicator';

function App() {
  const indicator = useConnectionIndicator();

  return (
    <div>
      <header>
        <ConnectionStatusIndicator showDetails={true} />
        {indicator.isReconnecting && (
          <div>Reconnecting... (attempt {indicator.retryCount})</div>
        )}
      </header>
      <main>
        {/* Your app content */}
      </main>
    </div>
  );
}
```

## API Reference

### WebSocket Events

#### Client to Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | `{ token: string }` | Authenticate with JWT token |
| `join_room` | `{ room_id: string }` | Join a collaboration room |
| `leave_room` | `{ room_id: string }` | Leave a collaboration room |
| `broadcast_message` | `{ room_id: string, message: any }` | Send message to room |
| `collaboration_operation` | `{ room_id: string, operation: Operation }` | Send collaboration operation |
| `cursor_update` | `{ room_id: string, position: Position }` | Update cursor position |
| `ping` | `{}` | Heartbeat ping |

#### Server to Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ message: string }` | Connection established |
| `authenticated` | `{ user_id: string }` | Authentication successful |
| `auth_error` | `{ message: string }` | Authentication failed |
| `room_joined` | `{ room_id: string, participant_count: number }` | Joined room successfully |
| `room_left` | `{ room_id: string }` | Left room successfully |
| `user_joined` | `{ user_id: string, room_id: string, participant_count: number }` | User joined room |
| `user_left` | `{ user_id: string, room_id: string, participant_count: number }` | User left room |
| `collaboration_update` | `{ operation: Operation, user_id: string, timestamp: number }` | Collaboration operation from another user |
| `cursor_moved` | `{ user_id: string, position: Position, timestamp: number }` | Cursor update from another user |
| `room_message` | `{ user_id: string, message: any, timestamp: number }` | Message from another user |
| `pong` | `{ timestamp: number }` | Heartbeat response |
| `error` | `{ message: string }` | Error message |

### Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Connection | 10 per IP | 1 minute |
| Messages | 60 per user | 1 minute |
| Operations | 60 per user | 1 minute |
| Cursor updates | 60 per user | 1 minute |

### Security Features

- **Authentication Required**: All operations except connection require valid JWT token
- **Room Authorization**: Users can only access rooms they have permission for
- **Message Size Limits**: Messages are limited to 10KB to prevent abuse
- **Rate Limiting**: Prevents flooding and abuse
- **Connection Tracking**: Monitors and limits connections per IP
- **Automatic Cleanup**: Removes stale connections and unused rooms

## Troubleshooting

### Common Issues

#### Connection Failures
```bash
# Check server status
curl http://localhost:5000/api/v1/health

# Check WebSocket endpoint
curl -I http://localhost:5000/socket.io/

# Verify Redis connection (if using)
redis-cli ping
```

#### Authentication Errors
- Verify JWT token is valid and not expired
- Check token format: `Bearer <token>`
- Ensure user has proper permissions

#### Room Access Issues
- Verify user is authenticated
- Check room ID format (should be song ID)
- Ensure user has access to the song

#### Performance Issues
- Monitor Redis memory usage if using scaling
- Check rate limiting logs
- Monitor connection count

### Debugging

Enable debug logging:

```bash
# Backend
FLASK_DEBUG=1 python run.py

# Frontend
localStorage.setItem('debug', 'socket.io-client:*');
```

### Health Monitoring

The WebSocket server provides health metrics:

```typescript
// Check connection status
const status = webSocketService.getConnectionStatus();
console.log('Connected:', status.connected);
console.log('Latency:', status.latency);
console.log('Retry count:', status.retryCount);

// Monitor server health
const connections = websocket_server.get_connection_count();
const rooms = websocket_server.get_room_count();
```

## Migration from Firebase

The WebSocket infrastructure can work alongside Firebase or replace it:

### Dual Mode (Recommended)
```typescript
// Use both Firebase and WebSocket
const useFirebase = import.meta.env.VITE_USE_FIREBASE === 'true';
const useWebSocket = import.meta.env.VITE_USE_WEBSOCKET === 'true';

if (useFirebase) {
  // Initialize Firebase real-time features
}

if (useWebSocket) {
  // Initialize WebSocket features
}
```

### WebSocket Only
```typescript
// Configure to use only WebSocket
webSocketService.connect(token);
webSocketService.joinRoom(songId);
```

## Performance Optimization

### Client-side
- Use connection pooling
- Implement message queuing for offline scenarios
- Cache connection status
- Debounce cursor updates

### Server-side
- Use Redis for scaling
- Implement connection limits
- Clean up stale connections
- Monitor memory usage

## Browser Compatibility

Supported browsers:
- **Chrome 60+**: Full support
- **Firefox 55+**: Full support  
- **Safari 11+**: Full support
- **Edge 79+**: Full support (Chromium-based)

Fallback behavior:
- Automatic reconnection with exponential backoff
- Graceful degradation to polling if WebSocket unavailable
- Error state handling for unsupported browsers

## Security Considerations

1. **Always use HTTPS in production** to secure WebSocket connections
2. **Validate JWT tokens** on every WebSocket operation
3. **Implement rate limiting** to prevent abuse
4. **Monitor connection patterns** for suspicious activity
5. **Use Redis AUTH** if Redis is accessible from external networks
6. **Regularly rotate JWT secrets** used for authentication
7. **Audit room access permissions** regularly
8. **Monitor and log security events** for analysis

## Load Testing

For performance validation:

```bash
# Install wscat for testing
npm install -g wscat

# Test connection
wscat -c ws://localhost:5000/socket.io/?EIO=4&transport=websocket

# Load testing with artillery
npm install -g artillery
artillery quick --count 100 --num 10 ws://localhost:5000/socket.io/
```

Example artillery config:
```yaml
# artillery-websocket.yml
config:
  target: 'ws://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "WebSocket load test"
    engine: ws
    weight: 100
```

## Monitoring and Alerting

Set up monitoring for:
- Connection count
- Message rate
- Error rate
- Latency metrics
- Redis performance (if used)
- Memory usage
- CPU usage

Example monitoring integration:
```typescript
// Custom metrics collection
websocket_server.onMetrics((metrics) => {
  // Send to monitoring service
  sendToDatadog(metrics);
  sendToNewRelic(metrics);
});
```