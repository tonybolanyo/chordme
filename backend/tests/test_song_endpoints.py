"""
Comprehensive tests for song CRUD endpoints.
Tests authentication, validation, CRUD operations, and user isolation.
"""

import pytest
import json
from chordme.models import User, Song
from chordme import db, app
from chordme.utils import generate_jwt_token


@pytest.fixture
def test_user(client):
    """Create a test user for authentication tests."""
    user_data = {
        'email': 'testuser@example.com',
        'password': 'TestPassword123'
    }
    
    # Register the user
    response = client.post('/api/v1/auth/register',
                          json=user_data,
                          content_type='application/json')
    
    assert response.status_code == 201
    
    # Get the user from database
    user = User.query.filter_by(email=user_data['email']).first()
    return user


@pytest.fixture
def auth_token(test_user):
    """Generate authentication token for test user."""
    return generate_jwt_token(test_user.id)


@pytest.fixture
def auth_headers(auth_token):
    """Create authentication headers."""
    return {'Authorization': f'Bearer {auth_token}'}


class TestSongAuthentication:
    """Test authentication requirements for song endpoints."""
    
    def test_create_song_requires_auth(self, client):
        """Test that creating a song requires authentication."""
        response = client.post('/api/v1/songs', 
                              json={'title': 'Test Song', 'content': 'Test content'})
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Authorization header is required'
    
    def test_list_songs_requires_auth(self, client):
        """Test that listing songs requires authentication."""
        response = client.get('/api/v1/songs')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Authorization header is required'
    
    def test_get_song_requires_auth(self, client):
        """Test that getting a song requires authentication."""
        response = client.get('/api/v1/songs/1')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Authorization header is required'
    
    def test_update_song_requires_auth(self, client):
        """Test that updating a song requires authentication."""
        response = client.put('/api/v1/songs/1',
                             json={'title': 'Updated'})
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Authorization header is required'
    
    def test_delete_song_requires_auth(self, client):
        """Test that deleting a song requires authentication."""
        response = client.delete('/api/v1/songs/1')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Authorization header is required'
    
    def test_invalid_token_format(self, client):
        """Test that invalid token format is rejected."""
        headers = {'Authorization': 'invalid_format'}
        response = client.get('/api/v1/songs', headers=headers)
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Invalid authorization header format'
    
    def test_invalid_token(self, client):
        """Test that invalid token is rejected."""
        headers = {'Authorization': 'Bearer invalid_token'}
        response = client.get('/api/v1/songs', headers=headers)
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['error'] == 'Invalid or expired token'


class TestSongCreation:
    """Test song creation endpoint."""
    
    def test_create_song_success(self, client, auth_headers):
        """Test successful song creation."""
        song_data = {
            'title': 'My Test Song',
            'content': '[Verse]\nThis is a test song\nWith some chords'
        }
        
        response = client.post('/api/v1/songs',
                              json=song_data,
                              headers=auth_headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'Song created successfully'
        assert data['data']['title'] == song_data['title']
        assert data['data']['content'] == song_data['content']
        assert 'id' in data['data']
        assert 'created_at' in data['data']
        assert 'updated_at' in data['data']
    
    def test_create_song_missing_title(self, client, auth_headers):
        """Test song creation with missing title."""
        song_data = {'content': 'Test content'}
        
        response = client.post('/api/v1/songs',
                              json=song_data,
                              headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Title is required'
    
    def test_create_song_missing_content(self, client, auth_headers):
        """Test song creation with missing content."""
        song_data = {'title': 'Test Song'}
        
        response = client.post('/api/v1/songs',
                              json=song_data,
                              headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Content is required'
    
    def test_create_song_empty_title(self, client, auth_headers):
        """Test song creation with empty title."""
        song_data = {'title': '   ', 'content': 'Test content'}
        
        response = client.post('/api/v1/songs',
                              json=song_data,
                              headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Title is required'
    
    def test_create_song_empty_content(self, client, auth_headers):
        """Test song creation with empty content."""
        song_data = {'title': 'Test Song', 'content': '   '}
        
        response = client.post('/api/v1/songs',
                              json=song_data,
                              headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Content is required'
    
    def test_create_song_title_too_long(self, client, auth_headers):
        """Test song creation with title too long."""
        song_data = {
            'title': 'a' * 201,  # 201 characters
            'content': 'Test content'
        }
        
        response = client.post('/api/v1/songs',
                              json=song_data,
                              headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Title is too long (maximum 200 characters)'


class TestSongListing:
    """Test song listing endpoint."""
    
    def test_list_songs_empty(self, client, auth_headers):
        """Test listing songs when user has no songs."""
        response = client.get('/api/v1/songs', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['songs'] == []
        assert data['data']['pagination']['total'] == 0
    
    def test_list_songs_with_data(self, client, auth_headers, test_user):
        """Test listing songs when user has songs."""
        # Create test songs
        song1 = Song(title='First Song', author_id=test_user.id, content='First content')
        song2 = Song(title='Second Song', author_id=test_user.id, content='Second content')
        db.session.add_all([song1, song2])
        db.session.commit()
        
        response = client.get('/api/v1/songs', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert len(data['data']['songs']) == 2
        assert data['data']['pagination']['total'] == 2
        
        # Check that songs are ordered by created_at desc (newest first)
        songs = data['data']['songs']
        assert songs[0]['title'] == 'Second Song'  # Created second, so should be first
        assert songs[1]['title'] == 'First Song'
    
    def test_list_songs_user_isolation(self, client, auth_headers, test_user):
        """Test that users only see their own songs."""
        # Create another user and their song
        other_user = User(email='other@test.com', password='Test123!')
        db.session.add(other_user)
        db.session.commit()
        
        other_song = Song(title='Other User Song', author_id=other_user.id, content='Other content')
        user_song = Song(title='My Song', author_id=test_user.id, content='My content')
        db.session.add_all([other_song, user_song])
        db.session.commit()
        
        response = client.get('/api/v1/songs', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['songs']) == 1
        assert data['data']['songs'][0]['title'] == 'My Song'


class TestSongRetrieval:
    """Test individual song retrieval endpoint."""
    
    def test_get_song_success(self, client, auth_headers, test_user):
        """Test successful song retrieval."""
        song = Song(title='Test Song', author_id=test_user.id, content='Test content')
        db.session.add(song)
        db.session.commit()
        
        response = client.get(f'/api/v1/songs/{song.id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['title'] == 'Test Song'
        assert data['data']['content'] == 'Test content'
        assert data['data']['id'] == song.id
    
    def test_get_song_not_found(self, client, auth_headers):
        """Test getting non-existent song."""
        response = client.get('/api/v1/songs/999', headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Song not found'
    
    def test_get_song_user_isolation(self, client, auth_headers):
        """Test that users cannot access other users' songs."""
        # Create another user and their song
        other_user = User(email='other@test.com', password='Test123!')
        db.session.add(other_user)
        db.session.commit()
        
        other_song = Song(title='Other Song', author_id=other_user.id, content='Other content')
        db.session.add(other_song)
        db.session.commit()
        
        response = client.get(f'/api/v1/songs/{other_song.id}', headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Song not found'


class TestSongUpdate:
    """Test song update endpoint."""
    
    def test_update_song_success(self, client, auth_headers, test_user):
        """Test successful song update."""
        song = Song(title='Original Title', author_id=test_user.id, content='Original content')
        db.session.add(song)
        db.session.commit()
        
        update_data = {
            'title': 'Updated Title',
            'content': 'Updated content'
        }
        
        response = client.put(f'/api/v1/songs/{song.id}',
                             json=update_data,
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['title'] == 'Updated Title'
        assert data['data']['content'] == 'Updated content'
    
    def test_update_song_partial(self, client, auth_headers, test_user):
        """Test partial song update (only title)."""
        song = Song(title='Original Title', author_id=test_user.id, content='Original content')
        db.session.add(song)
        db.session.commit()
        
        update_data = {'title': 'Updated Title Only'}
        
        response = client.put(f'/api/v1/songs/{song.id}',
                             json=update_data,
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Updated Title Only'
        assert data['data']['content'] == 'Original content'  # Should remain unchanged
    
    def test_update_song_not_found(self, client, auth_headers):
        """Test updating non-existent song."""
        update_data = {'title': 'Updated Title'}
        
        response = client.put('/api/v1/songs/999',
                             json=update_data,
                             headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Song not found'
    
    def test_update_song_user_isolation(self, client, auth_headers):
        """Test that users cannot update other users' songs."""
        # Create another user and their song
        other_user = User(email='other@test.com', password='Test123!')
        db.session.add(other_user)
        db.session.commit()
        
        other_song = Song(title='Other Song', author_id=other_user.id, content='Other content')
        db.session.add(other_song)
        db.session.commit()
        
        update_data = {'title': 'Hacked Title'}
        
        response = client.put(f'/api/v1/songs/{other_song.id}',
                             json=update_data,
                             headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Song not found'


class TestSongDeletion:
    """Test song deletion endpoint."""
    
    def test_delete_song_success(self, client, auth_headers, test_user):
        """Test successful song deletion."""
        song = Song(title='To Delete', author_id=test_user.id, content='Delete me')
        db.session.add(song)
        db.session.commit()
        song_id = song.id
        
        response = client.delete(f'/api/v1/songs/{song_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'Song deleted successfully'
        assert data['data']['title'] == 'To Delete'
        
        # Verify song is actually deleted
        deleted_song = Song.query.get(song_id)
        assert deleted_song is None
    
    def test_delete_song_not_found(self, client, auth_headers):
        """Test deleting non-existent song."""
        response = client.delete('/api/v1/songs/999', headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Song not found'
    
    def test_delete_song_user_isolation(self, client, auth_headers):
        """Test that users cannot delete other users' songs."""
        # Create another user and their song
        other_user = User(email='other@test.com', password='Test123!')
        db.session.add(other_user)
        db.session.commit()
        
        other_song = Song(title='Other Song', author_id=other_user.id, content='Other content')
        db.session.add(other_song)
        db.session.commit()
        song_id = other_song.id
        
        response = client.delete(f'/api/v1/songs/{song_id}', headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Song not found'
        
        # Verify song still exists
        existing_song = Song.query.get(song_id)
        assert existing_song is not None


class TestSongIntegration:
    """Integration tests for complete song workflows."""
    
    def test_complete_song_lifecycle(self, client, auth_headers, test_user):
        """Test complete CRUD lifecycle for a song."""
        # Create song
        create_data = {
            'title': 'Lifecycle Song',
            'content': '[Verse]\nTest song for lifecycle'
        }
        
        response = client.post('/api/v1/songs',
                              json=create_data,
                              headers=auth_headers)
        
        assert response.status_code == 201
        song_id = json.loads(response.data)['data']['id']
        
        # Read song
        response = client.get(f'/api/v1/songs/{song_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Lifecycle Song'
        
        # Update song
        update_data = {
            'title': 'Updated Lifecycle Song',
            'content': '[Verse]\nUpdated test song'
        }
        
        response = client.put(f'/api/v1/songs/{song_id}',
                             json=update_data,
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Updated Lifecycle Song'
        
        # Verify update in list
        response = client.get('/api/v1/songs', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['songs']) == 1
        assert data['data']['songs'][0]['title'] == 'Updated Lifecycle Song'
        
        # Delete song
        response = client.delete(f'/api/v1/songs/{song_id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deletion
        response = client.get('/api/v1/songs', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['songs']) == 0