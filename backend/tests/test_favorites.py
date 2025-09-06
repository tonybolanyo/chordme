"""
Tests for favorites functionality
"""

import pytest
import json
from unittest.mock import patch
from flask import Flask
from chordme.models import User, Song, UserFavorite
from chordme import app, db


class TestFavoritesAPI:
    """Test favorites API endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
                db.drop_all()

    @pytest.fixture
    def auth_headers(self, client):
        """Create authenticated user and return auth headers"""
        # Create test user
        user = User(email='test@example.com', password='testpassword')
        db.session.add(user)
        db.session.commit()
        
        # Login to get token
        response = client.post('/api/v1/auth/login', 
                             json={'email': 'test@example.com', 'password': 'testpassword'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        token = data['data']['token']
        
        return {'Authorization': f'Bearer {token}'}

    @pytest.fixture
    def test_song(self):
        """Create a test song"""
        song = Song(
            title='Test Song',
            artist='Test Artist',
            content='{title: Test Song}\n{artist: Test Artist}\n[G]Hello world',
            author_id=1
        )
        db.session.add(song)
        db.session.commit()
        return song

    def test_toggle_song_favorite_add(self, client, auth_headers, test_song):
        """Test adding a song to favorites"""
        response = client.post(f'/api/v1/favorites/songs/{test_song.id}', 
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'Song added to favorites'
        assert data['data']['is_favorited'] == True
        assert data['data']['song_id'] == test_song.id
        assert data['data']['favorite_count'] == 1

    def test_toggle_song_favorite_remove(self, client, auth_headers, test_song):
        """Test removing a song from favorites"""
        # First add to favorites
        client.post(f'/api/v1/favorites/songs/{test_song.id}', headers=auth_headers)
        
        # Then remove
        response = client.post(f'/api/v1/favorites/songs/{test_song.id}', 
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'Song removed from favorites'
        assert data['data']['is_favorited'] == False
        assert data['data']['favorite_count'] == 0

    def test_toggle_song_favorite_nonexistent(self, client, auth_headers):
        """Test favoriting a non-existent song"""
        response = client.post('/api/v1/favorites/songs/999', headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert data['message'] == 'Song not found'

    def test_get_favorite_songs_empty(self, client, auth_headers):
        """Test getting favorite songs when none exist"""
        response = client.get('/api/v1/favorites/songs', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['favorites'] == []
        assert data['data']['total_count'] == 0

    def test_get_favorite_songs_with_data(self, client, auth_headers, test_song):
        """Test getting favorite songs when favorites exist"""
        # Add song to favorites
        client.post(f'/api/v1/favorites/songs/{test_song.id}', headers=auth_headers)
        
        response = client.get('/api/v1/favorites/songs', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert len(data['data']['favorites']) == 1
        assert data['data']['total_count'] == 1
        
        favorite = data['data']['favorites'][0]
        assert favorite['song_id'] == test_song.id
        assert favorite['title'] == test_song.title
        assert favorite['artist'] == test_song.artist

    def test_get_favorite_songs_pagination(self, client, auth_headers):
        """Test favorite songs pagination"""
        response = client.get('/api/v1/favorites/songs?limit=5&offset=0', 
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'

    def test_get_favorite_songs_sorting(self, client, auth_headers):
        """Test favorite songs sorting"""
        response = client.get('/api/v1/favorites/songs?sort=title', 
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'

    def test_export_favorites(self, client, auth_headers, test_song):
        """Test exporting favorites data"""
        # Add song to favorites first
        client.post(f'/api/v1/favorites/songs/{test_song.id}', headers=auth_headers)
        
        response = client.get('/api/v1/favorites/export', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'export_date' in data['data']
        assert 'favorite_songs' in data['data']
        assert len(data['data']['favorite_songs']) == 1

    def test_export_favorites_csv_format(self, client, auth_headers):
        """Test exporting favorites in CSV format"""
        response = client.get('/api/v1/favorites/export?format=csv', 
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        # Note: CSV export returns JSON with a note for now
        assert 'note' in data['data']

    def test_unauthorized_access(self, client):
        """Test that endpoints require authentication"""
        endpoints = [
            ('POST', '/api/v1/favorites/songs/1'),
            ('GET', '/api/v1/favorites/songs'),
            ('POST', '/api/v1/favorites/queries'),
            ('GET', '/api/v1/favorites/export')
        ]
        
        for method, endpoint in endpoints:
            if method == 'POST':
                response = client.post(endpoint)
            else:
                response = client.get(endpoint)
            
            assert response.status_code == 401  # Unauthorized

    def test_save_favorite_query_placeholder(self, client, auth_headers):
        """Test placeholder for saving favorite query (uses localStorage for now)"""
        query_data = {
            'name': 'My Favorite Search',
            'query': 'rock AND guitar',
            'filters': {'genre': 'rock'}
        }
        
        response = client.post('/api/v1/favorites/queries', 
                             json=query_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'Favorite query saved successfully'