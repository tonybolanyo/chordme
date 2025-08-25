"""Tests for song version history functionality."""

import pytest
from chordme import db
from chordme.models import User, Song, SongVersion
import json


@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return headers."""
    # Register user
    response = client.post('/api/v1/auth/register', 
                          json={'email': 'test@example.com', 'password': 'TestPassword123'})
    
    # Login to get token
    response = client.post('/api/v1/auth/login',
                          json={'email': 'test@example.com', 'password': 'TestPassword123'})
    
    data = json.loads(response.data)
    token = data['data']['token']
    
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_song(client, auth_headers):
    """Create a sample song for testing."""
    song_data = {
        'title': 'Test Song',
        'content': '{title: Test Song}\n{artist: Test Artist}\n\n[C]This is a [G]test song'
    }
    
    response = client.post('/api/v1/songs', 
                          json=song_data, 
                          headers=auth_headers)
    
    data = json.loads(response.data)
    return data['data']  # Song data is directly in 'data'


class TestSongVersionModel:
    """Test the SongVersion model."""
    
    def test_create_version(self, client):
        """Test creating a song version."""
        with client.application.app_context():
            # Create test user and song
            user = User('test@example.com', 'password123')
            db.session.add(user)
            db.session.commit()
            
            song = Song('Test Song', user.id, 'Test content')
            db.session.add(song)
            db.session.commit()
            
            # Create version
            version = SongVersion(song.id, 1, 'Test Song', 'Test content', user.id)
            db.session.add(version)
            db.session.commit()
            
            assert version.id is not None
            assert version.song_id == song.id
            assert version.version_number == 1
            assert version.title == 'Test Song'
            assert version.content == 'Test content'
            assert version.user_id == user.id
            assert version.created_at is not None
    
    def test_version_to_dict(self, client):
        """Test version to_dict method."""
        with client.application.app_context():
            user = User('test@example.com', 'password123')
            db.session.add(user)
            db.session.commit()
            
            song = Song('Test Song', user.id, 'Test content')
            db.session.add(song)
            db.session.commit()
            
            version = SongVersion(song.id, 1, 'Test Song', 'Test content', user.id)
            db.session.add(version)
            db.session.commit()
            
            version_dict = version.to_dict()
            
            assert 'id' in version_dict
            assert version_dict['song_id'] == song.id
            assert version_dict['version_number'] == 1
            assert version_dict['title'] == 'Test Song'
            assert version_dict['content'] == 'Test content'
            assert version_dict['user_id'] == user.id
            assert 'created_at' in version_dict
    
    def test_unique_version_constraint(self, client):
        """Test that version numbers are unique per song."""
        with client.application.app_context():
            user = User('test@example.com', 'password123')
            db.session.add(user)
            db.session.commit()
            
            song = Song('Test Song', user.id, 'Test content')
            db.session.add(song)
            db.session.commit()
            
            # Create first version
            version1 = SongVersion(song.id, 1, 'Test Song', 'Test content', user.id)
            db.session.add(version1)
            db.session.commit()
            
            # Try to create duplicate version number - should raise integrity error
            version2 = SongVersion(song.id, 1, 'Test Song Updated', 'Updated content', user.id)
            db.session.add(version2)
            
            with pytest.raises(Exception):  # IntegrityError or similar
                db.session.commit()


class TestVersionHistoryAPI:
    """Test version history API endpoints."""
    
    def test_get_song_versions_empty(self, client, auth_headers, sample_song):
        """Test getting versions for a song with no versions."""
        song_id = sample_song['id']
        
        response = client.get(f'/api/v1/songs/{song_id}/versions',
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['versions'] == []
    
    def test_get_song_versions_after_update(self, client, auth_headers, sample_song):
        """Test that versions are created when song is updated."""
        song_id = sample_song['id']
        
        # Update the song to create a version
        update_data = {
            'title': 'Updated Test Song',
            'content': '{title: Updated Test Song}\n{artist: Test Artist}\n\n[C]This is an [G]updated song'
        }
        
        response = client.put(f'/api/v1/songs/{song_id}',
                             json=update_data,
                             headers=auth_headers)
        assert response.status_code == 200
        
        # Check versions were created
        response = client.get(f'/api/v1/songs/{song_id}/versions',
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert len(data['data']['versions']) == 1
        
        version = data['data']['versions'][0]
        assert version['title'] == 'Test Song'  # Original title before update
        assert version['version_number'] == 1
        assert 'created_at' in version
    
    def test_get_specific_version(self, client, auth_headers, sample_song):
        """Test getting a specific version by ID."""
        song_id = sample_song['id']
        
        # Update song to create a version
        update_data = {'title': 'Updated Song'}
        client.put(f'/api/v1/songs/{song_id}', json=update_data, headers=auth_headers)
        
        # Get versions list
        response = client.get(f'/api/v1/songs/{song_id}/versions', headers=auth_headers)
        versions = json.loads(response.data)['data']['versions']
        version_id = versions[0]['id']
        
        # Get specific version
        response = client.get(f'/api/v1/songs/{song_id}/versions/{version_id}',
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['id'] == version_id
        assert data['data']['title'] == 'Test Song'  # Original title
    
    def test_restore_song_version(self, client, auth_headers, sample_song):
        """Test restoring a song to a previous version."""
        song_id = sample_song['id']
        original_title = sample_song['title']
        original_content = sample_song['content']
        
        # Update song to create a version
        update_data = {
            'title': 'Updated Song',
            'content': '{title: Updated Song}\nNew content'
        }
        client.put(f'/api/v1/songs/{song_id}', json=update_data, headers=auth_headers)
        
        # Get the version ID
        response = client.get(f'/api/v1/songs/{song_id}/versions', headers=auth_headers)
        versions = json.loads(response.data)['data']['versions']
        version_id = versions[0]['id']
        
        # Restore to previous version
        response = client.post(f'/api/v1/songs/{song_id}/restore/{version_id}',
                              headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        
        # Verify song was restored
        restored_song = data['data']
        assert restored_song['title'] == original_title
        assert restored_song['content'] == original_content
    
    def test_version_permissions(self, client, auth_headers):
        """Test that version endpoints respect song permissions."""
        # Create a song with one user
        song_data = {'title': 'Private Song', 'content': 'Private content'}
        response = client.post('/api/v1/songs', json=song_data, headers=auth_headers)
        song_id = json.loads(response.data)['data']['song']['id']
        
        # Create second user
        client.post('/api/v1/auth/register', 
                   json={'email': 'user2@example.com', 'password': 'test123'})
        response = client.post('/api/v1/auth/login',
                              json={'email': 'user2@example.com', 'password': 'test123'})
        user2_token = json.loads(response.data)['data']['token']
        user2_headers = {'Authorization': f'Bearer {user2_token}'}
        
        # User 2 should not be able to access versions
        response = client.get(f'/api/v1/songs/{song_id}/versions', headers=user2_headers)
        assert response.status_code == 404  # Song not found (no permission)
    
    def test_restore_version_permissions(self, client, auth_headers):
        """Test that only users with edit permissions can restore versions."""
        # This test would be similar to version_permissions but specifically for restore
        # For brevity, this is a placeholder that could be expanded
        pass
    
    def test_multiple_versions_ordering(self, client, auth_headers, sample_song):
        """Test that versions are returned in correct order (newest first)."""
        song_id = sample_song['id']
        
        # Make multiple updates to create several versions
        for i in range(3):
            update_data = {'title': f'Version {i+1}'}
            client.put(f'/api/v1/songs/{song_id}', json=update_data, headers=auth_headers)
        
        # Get versions
        response = client.get(f'/api/v1/songs/{song_id}/versions', headers=auth_headers)
        versions = json.loads(response.data)['data']['versions']
        
        # Should have 3 versions, ordered by creation date (newest first)
        assert len(versions) == 3
        assert versions[0]['version_number'] == 3  # Most recent
        assert versions[1]['version_number'] == 2
        assert versions[2]['version_number'] == 1  # Oldest
    
    def test_invalid_song_id(self, client, auth_headers):
        """Test version endpoints with invalid song ID."""
        response = client.get('/api/v1/songs/99999/versions', headers=auth_headers)
        assert response.status_code == 404
        
        response = client.get('/api/v1/songs/99999/versions/1', headers=auth_headers)
        assert response.status_code == 404
        
        response = client.post('/api/v1/songs/99999/restore/1', headers=auth_headers)
        assert response.status_code == 404
    
    def test_invalid_version_id(self, client, auth_headers, sample_song):
        """Test version endpoints with invalid version ID."""
        song_id = sample_song['id']
        
        response = client.get(f'/api/v1/songs/{song_id}/versions/99999', headers=auth_headers)
        assert response.status_code == 404
        
        response = client.post(f'/api/v1/songs/{song_id}/restore/99999', headers=auth_headers)
        assert response.status_code == 404