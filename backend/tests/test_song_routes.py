"""Tests for protected song management routes."""

import pytest
import json
from chordme import app, db
from chordme.models import User, Song


@pytest.fixture
def test_client():
    """Create a test client using the real chordme app."""
    with app.test_client() as client:
        with app.app_context():
            # Clear rate limiter state before each test
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
def auth_token(test_client):
    """Create a user and return a valid JWT token for testing."""
    from chordme.utils import generate_jwt_token
    
    # Create a test user
    user_data = {
        'email': 'test@example.com',
        'password': 'TestPassword123'
    }
    
    # Register the user
    response = test_client.post('/api/v1/auth/register',
                          data=json.dumps(user_data),
                          content_type='application/json')
    
    assert response.status_code == 201
    
    # Get the user from database to get the ID
    user = User.query.filter_by(email='test@example.com').first()
    assert user is not None
    
    # Generate and return JWT token
    token = generate_jwt_token(user.id)
    assert token is not None
    
    return token


class TestSongRoutesAuthentication:
    """Test authentication protection for song routes."""

    def test_get_songs_requires_auth(self, test_client):
        """Test that GET /api/v1/songs requires authentication."""
        response = test_client.get('/api/v1/songs')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'authorization header is required' in data['error'].lower()

    def test_create_song_requires_auth(self, test_client):
        """Test that POST /api/v1/songs requires authentication."""
        song_data = {
            'title': 'Test Song',
            'content': 'C G Am F\nTest content'
        }
        response = test_client.post('/api/v1/songs', 
                               data=json.dumps(song_data),
                               content_type='application/json')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'authorization header is required' in data['error'].lower()

    def test_get_song_requires_auth(self, test_client):
        """Test that GET /api/v1/songs/<id> requires authentication."""
        response = test_client.get('/api/v1/songs/1')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'authorization header is required' in data['error'].lower()

    def test_update_song_requires_auth(self, test_client):
        """Test that PUT /api/v1/songs/<id> requires authentication."""
        song_data = {
            'title': 'Updated Song',
            'content': 'D A Bm G\nUpdated content'
        }
        response = test_client.put('/api/v1/songs/1',
                              data=json.dumps(song_data),
                              content_type='application/json')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'authorization header is required' in data['error'].lower()

    def test_delete_song_requires_auth(self, test_client):
        """Test that DELETE /api/v1/songs/<id> requires authentication."""
        response = test_client.delete('/api/v1/songs/1')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'authorization header is required' in data['error'].lower()

    def test_invalid_token_returns_401(self, test_client):
        """Test that invalid token returns 401."""
        headers = {'Authorization': 'Bearer invalid-token'}
        response = test_client.get('/api/v1/songs', headers=headers)
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'invalid or expired token' in data['error'].lower()

    def test_malformed_auth_header_returns_401(self, test_client):
        """Test that malformed Authorization header returns 401."""
        # Missing Bearer prefix
        headers = {'Authorization': 'token123'}
        response = test_client.get('/api/v1/songs', headers=headers)
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'invalid authorization header format' in data['error'].lower()

        # Wrong token type
        headers = {'Authorization': 'Basic token123'}
        response = test_client.get('/api/v1/songs', headers=headers)
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'authorization header must be bearer token' in data['error'].lower()


class TestSongRoutesWithAuth:
    """Test song routes with valid authentication."""

    def test_get_songs_with_auth_empty(self, test_client, auth_token):
        """Test GET /api/v1/songs with valid token returns empty list."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.get('/api/v1/songs', headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['songs'] == []

    def test_create_song_with_auth(self, test_client, auth_token):
        """Test POST /api/v1/songs with valid token creates song."""
        song_data = {
            'title': 'My Test Song',
            'content': 'C G Am F\nVerse 1\nG Em Am F\nChorus'
        }
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        response = test_client.post('/api/v1/songs',
                               data=json.dumps(song_data),
                               content_type='application/json',
                               headers=headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'Song created successfully'
        assert data['data']['title'] == 'My Test Song'
        assert data['data']['content'] == song_data['content']
        assert 'id' in data['data']
        assert 'created_at' in data['data']

    def test_song_crud_operations(self, test_client, auth_token):
        """Test complete CRUD operations with authentication."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Create a song
        song_data = {
            'title': 'CRUD Test Song',
            'content': 'C G Am F\nTest lyrics'
        }
        
        create_response = test_client.post('/api/v1/songs',
                                      data=json.dumps(song_data),
                                      content_type='application/json',
                                      headers=headers)
        assert create_response.status_code == 201
        created_song = json.loads(create_response.data)['data']
        song_id = created_song['id']
        
        # Get the song
        get_response = test_client.get(f'/api/v1/songs/{song_id}', headers=headers)
        assert get_response.status_code == 200
        get_data = json.loads(get_response.data)
        assert get_data['status'] == 'success'
        assert get_data['data']['title'] == 'CRUD Test Song'
        
        # Update the song
        update_data = {
            'title': 'Updated CRUD Song',
            'content': 'D A Bm G\nUpdated lyrics'
        }
        update_response = test_client.put(f'/api/v1/songs/{song_id}',
                                     data=json.dumps(update_data),
                                     content_type='application/json',
                                     headers=headers)
        assert update_response.status_code == 200
        updated_song = json.loads(update_response.data)['data']
        assert updated_song['title'] == 'Updated CRUD Song'
        assert updated_song['content'] == update_data['content']
        
        # List songs should include our song
        list_response = test_client.get('/api/v1/songs', headers=headers)
        assert list_response.status_code == 200
        list_data = json.loads(list_response.data)
        assert len(list_data['data']['songs']) == 1
        assert list_data['data']['songs'][0]['id'] == song_id
        
        # Delete the song
        delete_response = test_client.delete(f'/api/v1/songs/{song_id}', headers=headers)
        assert delete_response.status_code == 200
        delete_data = json.loads(delete_response.data)
        assert delete_data['status'] == 'success'
        assert delete_data['message'] == 'Song deleted successfully'
        
        # Verify song is deleted
        get_deleted_response = test_client.get(f'/api/v1/songs/{song_id}', headers=headers)
        assert get_deleted_response.status_code == 404

    def test_create_song_validation(self, test_client, auth_token):
        """Test song creation validation."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Missing title
        response = test_client.post('/api/v1/songs',
                               data=json.dumps({'content': 'Some content'}),
                               content_type='application/json',
                               headers=headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'title is required' in data['error'].lower()
        
        # Missing content
        response = test_client.post('/api/v1/songs',
                               data=json.dumps({'title': 'Some title'}),
                               content_type='application/json',
                               headers=headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'content is required' in data['error'].lower()
        
        # Title too long
        long_title = 'x' * 201
        response = test_client.post('/api/v1/songs',
                               data=json.dumps({'title': long_title, 'content': 'content'}),
                               content_type='application/json',
                               headers=headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'title must be 200 characters or less' in data['error'].lower()

    def test_user_isolation(self, test_client):
        """Test that users can only access their own songs."""
        # Create two users
        user1 = User('user1@example.com', 'Password123')
        user2 = User('user2@example.com', 'Password123')
        db.session.add(user1)
        db.session.add(user2)
        db.session.commit()
        
        from chordme.utils import generate_jwt_token
        token1 = generate_jwt_token(user1.id)
        token2 = generate_jwt_token(user2.id)
        
        headers1 = {'Authorization': f'Bearer {token1}'}
        headers2 = {'Authorization': f'Bearer {token2}'}
        
        # User 1 creates a song
        song_data = {
            'title': 'User 1 Song',
            'content': 'C G Am F\nUser 1 content'
        }
        response = test_client.post('/api/v1/songs',
                               data=json.dumps(song_data),
                               content_type='application/json',
                               headers=headers1)
        assert response.status_code == 201
        song_id = json.loads(response.data)['data']['id']
        
        # User 2 cannot access User 1's song
        response = test_client.get(f'/api/v1/songs/{song_id}', headers=headers2)
        assert response.status_code == 404
        
        # User 2 cannot update User 1's song
        response = test_client.put(f'/api/v1/songs/{song_id}',
                              data=json.dumps({'title': 'Hacked!'}),
                              content_type='application/json',
                              headers=headers2)
        assert response.status_code == 404
        
        # User 2 cannot delete User 1's song
        response = test_client.delete(f'/api/v1/songs/{song_id}', headers=headers2)
        assert response.status_code == 404
        
        # User 2's song list should be empty
        response = test_client.get('/api/v1/songs', headers=headers2)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['songs']) == 0
        
        # Clean up
        db.session.delete(user1)
        db.session.delete(user2)
        db.session.commit()