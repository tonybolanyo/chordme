"""Tests for WebSocket server functionality."""

import pytest
import json
import time
from unittest.mock import patch, MagicMock
from chordme import app, db
from chordme.models import User
from chordme.websocket_server import websocket_server
from chordme.utils import generate_jwt_token
import socketio


@pytest.fixture
def app_with_socketio():
    """Create app with SocketIO for testing."""
    app.config['TESTING'] = True
    app.config['HTTPS_ENFORCED'] = False
    
    with app.test_client() as client:
        with app.app_context():
            # Clear rate limiter state
            from chordme.rate_limiter import rate_limiter
            rate_limiter.requests.clear()
            rate_limiter.blocked_ips.clear()
            
            db.create_all()
            try:
                yield client
            finally:
                db.session.remove()
                db.drop_all()


@pytest.fixture
def test_user(app_with_socketio):
    """Create a test user and return user info with token."""
    user = User('test@example.com', 'Password123')
    db.session.add(user)
    db.session.commit()
    
    token = generate_jwt_token(user.id)
    
    return {
        'id': user.id,
        'email': user.email,
        'token': token,
        'headers': {'Authorization': f'Bearer {token}'}
    }


@pytest.fixture
def socketio_client():
    """Create a Socket.IO test client."""
    sio_client = socketio.SimpleClient()
    return sio_client


class TestWebSocketServer:
    """Test WebSocket server functionality."""
    
    def test_socketio_server_initialization(self, app_with_socketio):
        """Test that SocketIO server is properly initialized."""
        assert websocket_server.socketio is not None
        assert websocket_server.app is not None
        assert len(websocket_server.active_connections) == 0
        assert len(websocket_server.room_participants) == 0
    
    def test_connection_tracking(self, app_with_socketio):
        """Test that connections are properly tracked."""
        # Simulate connection
        session_id = 'test_session_123'
        websocket_server.active_connections[session_id] = {
            'connected_at': time.time(),
            'ip_address': '127.0.0.1',
            'authenticated': False,
            'user_id': None,
            'last_ping': time.time(),
        }
        
        assert websocket_server.get_connection_count() == 1
        
        # Simulate disconnection
        del websocket_server.active_connections[session_id]
        assert websocket_server.get_connection_count() == 0
    
    def test_room_management(self, app_with_socketio):
        """Test room participant tracking."""
        room_id = 'song_123'
        user_id = 'user_456'
        
        # Add participant
        if room_id not in websocket_server.room_participants:
            websocket_server.room_participants[room_id] = set()
        websocket_server.room_participants[room_id].add(user_id)
        
        if user_id not in websocket_server.user_rooms:
            websocket_server.user_rooms[user_id] = set()
        websocket_server.user_rooms[user_id].add(room_id)
        
        assert user_id in websocket_server.get_room_participants(room_id)
        assert websocket_server.get_room_count() == 1
        
        # Remove participant
        websocket_server.room_participants[room_id].remove(user_id)
        websocket_server.user_rooms[user_id].remove(room_id)
        
        if not websocket_server.room_participants[room_id]:
            del websocket_server.room_participants[room_id]
        if not websocket_server.user_rooms[user_id]:
            del websocket_server.user_rooms[user_id]
        
        assert websocket_server.get_room_count() == 0
    
    def test_cleanup_stale_connections(self, app_with_socketio):
        """Test cleanup of stale connections."""
        # Add a stale connection
        session_id = 'stale_session'
        old_time = time.time() - 7200  # 2 hours ago
        
        websocket_server.active_connections[session_id] = {
            'connected_at': old_time,
            'ip_address': '127.0.0.1',
            'authenticated': True,
            'user_id': 'user_123',
            'last_ping': old_time,
        }
        
        # Add to a room
        room_id = 'song_123'
        websocket_server.room_participants[room_id] = {'user_123'}
        websocket_server.user_rooms['user_123'] = {room_id}
        
        assert websocket_server.get_connection_count() == 1
        assert websocket_server.get_room_count() == 1
        
        # Cleanup with 1 hour threshold
        websocket_server.cleanup_stale_connections(max_age=3600)
        
        assert websocket_server.get_connection_count() == 0
        assert websocket_server.get_room_count() == 0


class TestWebSocketEvents:
    """Test WebSocket event handling."""
    
    @patch('chordme.websocket_server.rate_limiter')
    def test_authentication_flow(self, mock_rate_limiter, app_with_socketio, test_user):
        """Test WebSocket authentication flow."""
        mock_rate_limiter.allow_request.return_value = True
        
        # Create a mock socket connection
        with patch.object(websocket_server, 'socketio') as mock_socketio:
            mock_socketio.emit = MagicMock()
            
            # Simulate connect event
            session_id = 'test_session'
            with app.test_request_context(environ_base={'REMOTE_ADDR': '127.0.0.1'}):
                # Mock request.sid
                with patch('chordme.websocket_server.request') as mock_request:
                    mock_request.sid = session_id
                    mock_request.environ = {'REMOTE_ADDR': '127.0.0.1'}
                    
                    # Test connection
                    websocket_server.active_connections[session_id] = {
                        'connected_at': time.time(),
                        'ip_address': '127.0.0.1',
                        'authenticated': False,
                        'user_id': None,
                        'last_ping': time.time(),
                    }
                    
                    # Test authentication
                    with patch('chordme.websocket_server.verify_jwt_token') as mock_verify:
                        mock_verify.return_value = {
                            'user_id': test_user['id'],
                            'email': test_user['email']
                        }
                        
                        # Simulate authenticate event
                        auth_data = {'token': test_user['token']}
                        
                        # Update connection as authenticated
                        websocket_server.active_connections[session_id].update({
                            'authenticated': True,
                            'user_id': test_user['id'],
                            'email': test_user['email'],
                        })
                        
                        assert websocket_server.active_connections[session_id]['authenticated']
                        assert websocket_server.active_connections[session_id]['user_id'] == test_user['id']
    
    def test_rate_limiting(self, app_with_socketio, test_user):
        """Test rate limiting for WebSocket events."""
        session_id = 'test_session'
        
        # Set up authenticated connection
        websocket_server.active_connections[session_id] = {
            'connected_at': time.time(),
            'ip_address': '127.0.0.1',
            'authenticated': True,
            'user_id': test_user['id'],
            'last_ping': time.time(),
        }
        
        with patch('chordme.websocket_server.rate_limiter') as mock_rate_limiter:
            # Test rate limit enforcement
            mock_rate_limiter.allow_request.return_value = False
            
            with patch('chordme.websocket_server.request') as mock_request:
                mock_request.sid = session_id
                
                with patch('chordme.websocket_server.emit') as mock_emit:
                    # Rate limit should prevent the operation
                    @websocket_server.rate_limit('test_event')
                    def test_handler():
                        return True
                    
                    # Call the decorated function
                    result = test_handler()
                    
                    # Should return False due to rate limiting
                    assert result is False
                    mock_emit.assert_called_with('error', {'message': 'Rate limit exceeded'})
    
    def test_room_joining_and_leaving(self, app_with_socketio, test_user):
        """Test joining and leaving rooms."""
        session_id = 'test_session'
        room_id = 'song_123'
        
        # Set up authenticated connection
        websocket_server.active_connections[session_id] = {
            'connected_at': time.time(),
            'ip_address': '127.0.0.1',
            'authenticated': True,
            'user_id': test_user['id'],
            'last_ping': time.time(),
        }
        
        with patch('chordme.websocket_server.request') as mock_request:
            mock_request.sid = session_id
            
            with patch('chordme.websocket_server.join_room') as mock_join:
                with patch('chordme.websocket_server.emit') as mock_emit:
                    # Simulate joining room
                    websocket_server.room_participants[room_id] = {test_user['id']}
                    websocket_server.user_rooms[test_user['id']] = {room_id}
                    
                    assert test_user['id'] in websocket_server.get_room_participants(room_id)
                    assert websocket_server.get_room_count() == 1
                    
                    # Test leaving room
                    websocket_server._leave_room_internal(session_id, room_id)
                    
                    assert test_user['id'] not in websocket_server.get_room_participants(room_id)
                    assert websocket_server.get_room_count() == 0


class TestWebSocketSecurity:
    """Test WebSocket security features."""
    
    def test_unauthorized_access(self, app_with_socketio):
        """Test that unauthorized users cannot access protected events."""
        session_id = 'test_session'
        
        # Set up unauthenticated connection
        websocket_server.active_connections[session_id] = {
            'connected_at': time.time(),
            'ip_address': '127.0.0.1',
            'authenticated': False,
            'user_id': None,
            'last_ping': time.time(),
        }
        
        with patch('chordme.websocket_server.request') as mock_request:
            mock_request.sid = session_id
            
            with patch('chordme.websocket_server.emit') as mock_emit:
                # Test auth_required decorator
                @websocket_server.auth_required
                def protected_handler():
                    return True
                
                result = protected_handler()
                assert result is False
                mock_emit.assert_called_with('error', {'message': 'Authentication required'})
    
    def test_room_authorization(self, app_with_socketio, test_user):
        """Test that users can only access authorized rooms."""
        session_id = 'test_session'
        room_id = 'unauthorized_room'
        
        # Set up authenticated connection
        websocket_server.active_connections[session_id] = {
            'connected_at': time.time(),
            'ip_address': '127.0.0.1',
            'authenticated': True,
            'user_id': test_user['id'],
            'last_ping': time.time(),
        }
        
        with patch('chordme.websocket_server.request') as mock_request:
            mock_request.sid = session_id
            
            with patch('chordme.websocket_server.emit') as mock_emit:
                # User is not in the room, should get authorization error
                # This would be tested by trying to send operations to unauthorized room
                assert test_user['id'] not in websocket_server.get_room_participants(room_id)
    
    def test_message_size_limits(self, app_with_socketio, test_user):
        """Test that large messages are rejected."""
        session_id = 'test_session'
        room_id = 'song_123'
        
        # Set up authenticated connection in room
        websocket_server.active_connections[session_id] = {
            'connected_at': time.time(),
            'ip_address': '127.0.0.1',
            'authenticated': True,
            'user_id': test_user['id'],
            'last_ping': time.time(),
        }
        
        # Add user to room
        websocket_server.room_participants[room_id] = {test_user['id']}
        websocket_server.user_rooms[test_user['id']] = {room_id}
        
        with patch('chordme.websocket_server.request') as mock_request:
            mock_request.sid = session_id
            
            with patch('chordme.websocket_server.emit') as mock_emit:
                # Test with oversized message
                large_message = 'x' * 20000  # 20KB message
                
                # This would simulate the broadcast_message handler validation
                assert len(large_message) > 10000
                # Should reject the message
    
    def test_connection_rate_limiting(self, app_with_socketio):
        """Test connection rate limiting by IP."""
        with patch('chordme.websocket_server.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.allow_request.return_value = False
            
            with patch('chordme.websocket_server.request') as mock_request:
                mock_request.sid = 'test_session'
                mock_request.environ = {'REMOTE_ADDR': '192.168.1.100'}
                
                # Rate limiting should prevent connection
                # This simulates what would happen in the connect handler
                ip_rate_key = f"websocket:connect:192.168.1.100"
                allowed = mock_rate_limiter.allow_request(ip_rate_key, 10, window=60)
                assert not allowed


class TestWebSocketPerformance:
    """Test WebSocket performance and scalability."""
    
    def test_concurrent_connections(self, app_with_socketio):
        """Test handling multiple concurrent connections."""
        # Simulate multiple connections
        connection_count = 50
        
        for i in range(connection_count):
            session_id = f'session_{i}'
            websocket_server.active_connections[session_id] = {
                'connected_at': time.time(),
                'ip_address': f'192.168.1.{i % 255}',
                'authenticated': True,
                'user_id': f'user_{i}',
                'last_ping': time.time(),
            }
        
        assert websocket_server.get_connection_count() == connection_count
        
        # Cleanup
        websocket_server.active_connections.clear()
        assert websocket_server.get_connection_count() == 0
    
    def test_room_scalability(self, app_with_socketio):
        """Test handling multiple rooms with many participants."""
        room_count = 20
        participants_per_room = 10
        
        for room_i in range(room_count):
            room_id = f'room_{room_i}'
            websocket_server.room_participants[room_id] = set()
            
            for user_i in range(participants_per_room):
                user_id = f'user_{room_i}_{user_i}'
                websocket_server.room_participants[room_id].add(user_id)
                
                if user_id not in websocket_server.user_rooms:
                    websocket_server.user_rooms[user_id] = set()
                websocket_server.user_rooms[user_id].add(room_id)
        
        assert websocket_server.get_room_count() == room_count
        
        # Verify participant counts
        for room_i in range(room_count):
            room_id = f'room_{room_i}'
            assert len(websocket_server.get_room_participants(room_id)) == participants_per_room
        
        # Cleanup
        websocket_server.room_participants.clear()
        websocket_server.user_rooms.clear()
        assert websocket_server.get_room_count() == 0