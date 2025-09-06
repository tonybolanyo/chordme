"""WebSocket server for real-time collaboration with Socket.IO."""

import logging
import time
from typing import Dict, Set, Optional, Any
from functools import wraps
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room
import jwt
from .utils import verify_jwt_token
from .rate_limiter import rate_limiter

# Setup logging
logger = logging.getLogger(__name__)

class WebSocketServer:
    """WebSocket server with Socket.IO for real-time collaboration."""
    
    def __init__(self, app=None, redis_url: Optional[str] = None):
        self.socketio = None
        self.app = app
        self.redis_url = redis_url
        
        # Connection tracking
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        self.room_participants: Dict[str, Set[str]] = {}
        self.user_rooms: Dict[str, Set[str]] = {}
        
        # Rate limiting configuration
        self.message_rate_limit = 60  # messages per minute
        self.connection_rate_limit = 10  # connections per minute per IP
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the WebSocket server with Flask app."""
        self.app = app
        
        # Configure Socket.IO with Redis for scaling (if available)
        socketio_config = {
            'cors_allowed_origins': "*",
            'async_mode': 'threading',
            'logger': logger,
            'engineio_logger': logger,
            'ping_timeout': 60,
            'ping_interval': 25,
        }
        
        if self.redis_url:
            socketio_config['message_queue'] = self.redis_url
            
        self.socketio = SocketIO(app, **socketio_config)
        self._register_event_handlers()
        
        logger.info("WebSocket server initialized")
    
    def auth_required(self, f):
        """Decorator to require authentication for WebSocket events."""
        @wraps(f)
        def decorated(*args, **kwargs):
            # Get user info from active connections
            session_id = request.sid
            if session_id not in self.active_connections:
                emit('error', {'message': 'Authentication required'})
                return False
                
            user_info = self.active_connections[session_id]
            if not user_info.get('authenticated', False):
                emit('error', {'message': 'Authentication required'})
                return False
                
            return f(*args, **kwargs)
        return decorated
    
    def rate_limit(self, event_type: str):
        """Decorator to apply rate limiting to WebSocket events."""
        def decorator(f):
            @wraps(f)
            def decorated(*args, **kwargs):
                session_id = request.sid
                user_info = self.active_connections.get(session_id, {})
                user_id = user_info.get('user_id')
                
                if not user_id:
                    emit('error', {'message': 'Authentication required'})
                    return False
                
                # Check rate limit
                rate_key = f"websocket:{event_type}:{user_id}"
                if not rate_limiter.allow_request(rate_key, self.message_rate_limit, window=60):
                    emit('error', {'message': 'Rate limit exceeded'})
                    logger.warning(f"Rate limit exceeded for user {user_id} on event {event_type}")
                    return False
                
                return f(*args, **kwargs)
            return decorated
        return decorator
    
    def _register_event_handlers(self):
        """Register Socket.IO event handlers."""
        
        @self.socketio.on('connect')
        def handle_connect(auth=None):
            """Handle client connection."""
            session_id = request.sid
            client_ip = request.environ.get('REMOTE_ADDR', 'unknown')
            
            # Basic connection rate limiting by IP
            ip_rate_key = f"websocket:connect:{client_ip}"
            if not rate_limiter.allow_request(ip_rate_key, self.connection_rate_limit, window=60):
                logger.warning(f"Connection rate limit exceeded for IP {client_ip}")
                return False
            
            # Initialize connection
            self.active_connections[session_id] = {
                'connected_at': time.time(),
                'ip_address': client_ip,
                'authenticated': False,
                'user_id': None,
                'last_ping': time.time(),
            }
            
            logger.info(f"Client connected: {session_id} from {client_ip}")
            emit('connected', {'message': 'Connected to ChordMe WebSocket server'})
            
            # If auth provided in connection, try to authenticate
            if auth and isinstance(auth, dict) and 'token' in auth:
                handle_authenticate({'token': auth['token']})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection."""
            session_id = request.sid
            
            if session_id in self.active_connections:
                user_info = self.active_connections[session_id]
                user_id = user_info.get('user_id')
                
                # Leave all rooms
                if user_id and user_id in self.user_rooms:
                    for room_id in list(self.user_rooms[user_id]):
                        self._leave_room_internal(session_id, room_id)
                
                # Remove connection
                del self.active_connections[session_id]
                logger.info(f"Client disconnected: {session_id}")
        
        @self.socketio.on('authenticate')
        def handle_authenticate(data):
            """Handle authentication with JWT token."""
            session_id = request.sid
            
            if not isinstance(data, dict) or 'token' not in data:
                emit('auth_error', {'message': 'Invalid authentication data'})
                return
            
            token = data['token']
            payload = verify_jwt_token(token)
            
            if not payload:
                emit('auth_error', {'message': 'Invalid or expired token'})
                return
            
            # Update connection with user info
            if session_id in self.active_connections:
                self.active_connections[session_id].update({
                    'authenticated': True,
                    'user_id': payload['user_id'],
                    'email': payload.get('email', ''),
                })
                
                emit('authenticated', {
                    'message': 'Successfully authenticated',
                    'user_id': payload['user_id']
                })
                logger.info(f"User authenticated: {payload['user_id']} on session {session_id}")
            else:
                emit('auth_error', {'message': 'Connection not found'})
        
        @self.socketio.on('ping')
        @self.auth_required
        def handle_ping():
            """Handle ping for connection health monitoring."""
            session_id = request.sid
            if session_id in self.active_connections:
                self.active_connections[session_id]['last_ping'] = time.time()
            emit('pong', {'timestamp': int(time.time() * 1000)})
        
        @self.socketio.on('join_room')
        @self.auth_required
        @self.rate_limit('join_room')
        def handle_join_room(data):
            """Handle joining a collaboration room."""
            session_id = request.sid
            user_info = self.active_connections.get(session_id, {})
            user_id = user_info.get('user_id')
            
            if not isinstance(data, dict) or 'room_id' not in data:
                emit('error', {'message': 'Invalid room data'})
                return
            
            room_id = data['room_id']
            
            # Validate room_id format (should be song ID)
            if not room_id or not isinstance(room_id, str) or len(room_id) > 50:
                emit('error', {'message': 'Invalid room ID'})
                return
            
            # Join the room
            join_room(room_id)
            
            # Track room membership
            if room_id not in self.room_participants:
                self.room_participants[room_id] = set()
            self.room_participants[room_id].add(user_id)
            
            if user_id not in self.user_rooms:
                self.user_rooms[user_id] = set()
            self.user_rooms[user_id].add(room_id)
            
            # Notify room of new participant
            emit('user_joined', {
                'user_id': user_id,
                'room_id': room_id,
                'participant_count': len(self.room_participants[room_id])
            }, room=room_id)
            
            # Send confirmation to user
            emit('room_joined', {
                'room_id': room_id,
                'participant_count': len(self.room_participants[room_id])
            })
            
            logger.info(f"User {user_id} joined room {room_id}")
        
        @self.socketio.on('leave_room')
        @self.auth_required
        def handle_leave_room(data):
            """Handle leaving a collaboration room."""
            session_id = request.sid
            
            if not isinstance(data, dict) or 'room_id' not in data:
                emit('error', {'message': 'Invalid room data'})
                return
            
            room_id = data['room_id']
            self._leave_room_internal(session_id, room_id)
        
        @self.socketio.on('broadcast_message')
        @self.auth_required
        @self.rate_limit('broadcast')
        def handle_broadcast_message(data):
            """Handle broadcasting messages to room participants."""
            session_id = request.sid
            user_info = self.active_connections.get(session_id, {})
            user_id = user_info.get('user_id')
            
            if not isinstance(data, dict) or 'room_id' not in data or 'message' not in data:
                emit('error', {'message': 'Invalid message data'})
                return
            
            room_id = data['room_id']
            message = data['message']
            
            # Validate user is in the room
            if user_id not in self.user_rooms or room_id not in self.user_rooms[user_id]:
                emit('error', {'message': 'Not authorized for this room'})
                return
            
            # Validate message size (prevent large payloads)
            if isinstance(message, str) and len(message) > 10000:
                emit('error', {'message': 'Message too large'})
                return
            
            # Broadcast to room (excluding sender)
            self.socketio.emit('room_message', {
                'user_id': user_id,
                'room_id': room_id,
                'message': message,
                'timestamp': int(time.time() * 1000)
            }, room=room_id, include_self=False)
            
            # Confirm to sender
            emit('message_sent', {'room_id': room_id})
        
        @self.socketio.on('collaboration_operation')
        @self.auth_required
        @self.rate_limit('collaboration')
        def handle_collaboration_operation(data):
            """Handle real-time collaboration operations."""
            session_id = request.sid
            user_info = self.active_connections.get(session_id, {})
            user_id = user_info.get('user_id')
            
            if not isinstance(data, dict) or 'room_id' not in data or 'operation' not in data:
                emit('error', {'message': 'Invalid operation data'})
                return
            
            room_id = data['room_id']
            operation = data['operation']
            
            # Validate user is in the room
            if user_id not in self.user_rooms or room_id not in self.user_rooms[user_id]:
                emit('error', {'message': 'Not authorized for this room'})
                return
            
            # Add metadata to operation
            operation_with_meta = {
                'user_id': user_id,
                'room_id': room_id,
                'operation': operation,
                'timestamp': int(time.time() * 1000),
                'operation_id': f"{user_id}_{int(time.time() * 1000)}"
            }
            
            # Broadcast to room (excluding sender)
            self.socketio.emit('collaboration_update', operation_with_meta, room=room_id, include_self=False)
            
            # Confirm to sender
            emit('operation_confirmed', {
                'room_id': room_id,
                'operation_id': operation_with_meta['operation_id']
            })
        
        @self.socketio.on('cursor_update')
        @self.auth_required
        @self.rate_limit('cursor')
        def handle_cursor_update(data):
            """Handle cursor position updates."""
            session_id = request.sid
            user_info = self.active_connections.get(session_id, {})
            user_id = user_info.get('user_id')
            
            if not isinstance(data, dict) or 'room_id' not in data or 'position' not in data:
                emit('error', {'message': 'Invalid cursor data'})
                return
            
            room_id = data['room_id']
            position = data['position']
            
            # Validate user is in the room
            if user_id not in self.user_rooms or room_id not in self.user_rooms[user_id]:
                emit('error', {'message': 'Not authorized for this room'})
                return
            
            # Broadcast cursor update to room (excluding sender)
            self.socketio.emit('cursor_moved', {
                'user_id': user_id,
                'room_id': room_id,
                'position': position,
                'timestamp': int(time.time() * 1000)
            }, room=room_id, include_self=False)
    
    def _leave_room_internal(self, session_id: str, room_id: str):
        """Internal method to handle leaving a room."""
        user_info = self.active_connections.get(session_id, {})
        user_id = user_info.get('user_id')
        
        if not user_id:
            return
        
        # Leave the Socket.IO room
        leave_room(room_id)
        
        # Update tracking
        if room_id in self.room_participants and user_id in self.room_participants[room_id]:
            self.room_participants[room_id].remove(user_id)
            
            # Clean up empty rooms
            if not self.room_participants[room_id]:
                del self.room_participants[room_id]
                close_room(room_id)
        
        if user_id in self.user_rooms and room_id in self.user_rooms[user_id]:
            self.user_rooms[user_id].remove(room_id)
            
            # Clean up empty user room sets
            if not self.user_rooms[user_id]:
                del self.user_rooms[user_id]
        
        # Notify room of participant leaving
        remaining_count = len(self.room_participants.get(room_id, set()))
        if remaining_count > 0:
            self.socketio.emit('user_left', {
                'user_id': user_id,
                'room_id': room_id,
                'participant_count': remaining_count
            }, room=room_id)
        
        # Send confirmation to user
        emit('room_left', {'room_id': room_id})
        logger.info(f"User {user_id} left room {room_id}")
    
    def get_room_participants(self, room_id: str) -> Set[str]:
        """Get the set of participants in a room."""
        return self.room_participants.get(room_id, set())
    
    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)
    
    def get_room_count(self) -> int:
        """Get the number of active rooms."""
        return len(self.room_participants)
    
    def cleanup_stale_connections(self, max_age: int = 3600):
        """Clean up connections that haven't pinged recently."""
        current_time = time.time()
        stale_sessions = []
        
        for session_id, connection_info in self.active_connections.items():
            last_ping = connection_info.get('last_ping', connection_info.get('connected_at', 0))
            if current_time - last_ping > max_age:
                stale_sessions.append(session_id)
        
        for session_id in stale_sessions:
            logger.info(f"Cleaning up stale connection: {session_id}")
            if session_id in self.active_connections:
                user_info = self.active_connections[session_id]
                user_id = user_info.get('user_id')
                
                # Leave all rooms
                if user_id and user_id in self.user_rooms:
                    for room_id in list(self.user_rooms[user_id]):
                        self._leave_room_internal(session_id, room_id)
                
                del self.active_connections[session_id]

# Global WebSocket server instance
websocket_server = WebSocketServer()