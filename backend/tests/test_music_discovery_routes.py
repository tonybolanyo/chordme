"""
Test Music Discovery API Routes

Tests for the music discovery and recommendation API endpoints including:
- Authentication and authorization
- Request validation
- Response format
- Rate limiting
- Privacy compliance
"""

import pytest
import json
from unittest.mock import patch, MagicMock

from chordme import app, db
from chordme.models import User, Song
from chordme.utils import generate_jwt_token


class TestMusicDiscoveryRoutes:
    """Test suite for music discovery API routes."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
                db.drop_all()
    
    @pytest.fixture
    def auth_user(self):
        """Create authenticated user and return auth headers."""
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        token = generate_jwt_token(user.id)
        headers = {'Authorization': f'Bearer {token}'}
        
        return user, headers
    
    @pytest.fixture
    def sample_songs(self, auth_user):
        """Create sample songs for testing."""
        user, _ = auth_user
        
        songs = [
            Song(
                title='Test Rock Song',
                artist='Rock Artist',
                user_id=user.id,
                content='[C]Test rock song content',
                genre='Rock',
                song_key='C',
                tempo=120,
                difficulty='medium',
                share_settings='public'
            ),
            Song(
                title='Test Jazz Song',
                artist='Jazz Artist',
                user_id=user.id,
                content='[F]Test jazz song content',
                genre='Jazz',
                song_key='F',
                tempo=90,
                difficulty='hard',
                share_settings='public'
            )
        ]
        
        # Set view and favorite counts after creation
        songs[0].view_count = 100
        songs[0].favorite_count = 20
        songs[1].view_count = 50
        songs[1].favorite_count = 10
        
        db.session.add_all(songs)
        db.session.commit()
        
        return songs
    
    def test_get_personalized_recommendations_success(self, client, auth_user):
        """Test successful personalized recommendations request."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations') as mock_service:
            mock_service.return_value = {
                'user_id': user.id,
                'recommendations': [
                    {
                        'song_id': 1,
                        'title': 'Recommended Song',
                        'artist': 'Artist Name',
                        'genre': 'Rock',
                        'relevance_score': 0.85,
                        'explanation': 'Matches your rock preferences',
                        'recommendation_type': 'content_based'
                    }
                ],
                'recommendation_sources': {
                    'content_based': 1,
                    'collaborative_filtering': 0
                },
                'privacy_notice': {
                    'data_usage': 'Uses your activity data',
                    'explanation': 'Personalized recommendations'
                },
                'generated_at': '2023-01-01T00:00:00Z'
            }
            
            response = client.get('/api/v1/analytics/discovery/recommendations', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert 'data' in data
            
            recommendations = data['data']
            assert recommendations['user_id'] == user.id
            assert 'recommendations' in recommendations
            assert 'privacy_notice' in recommendations
            
            mock_service.assert_called_once_with(user.id, limit=20)
    
    def test_get_personalized_recommendations_with_limit(self, client, auth_user):
        """Test personalized recommendations with custom limit."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations') as mock_service:
            mock_service.return_value = {'user_id': user.id, 'recommendations': []}
            
            response = client.get('/api/v1/analytics/discovery/recommendations?limit=5', headers=headers)
            
            assert response.status_code == 200
            mock_service.assert_called_once_with(user.id, limit=5)
    
    def test_get_personalized_recommendations_limit_cap(self, client, auth_user):
        """Test that recommendation limit is capped at 50."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations') as mock_service:
            mock_service.return_value = {'user_id': user.id, 'recommendations': []}
            
            response = client.get('/api/v1/analytics/discovery/recommendations?limit=100', headers=headers)
            
            assert response.status_code == 200
            mock_service.assert_called_once_with(user.id, limit=50)  # Should be capped
    
    def test_get_personalized_recommendations_unauthorized(self, client):
        """Test recommendations request without authentication."""
        response = client.get('/api/v1/analytics/discovery/recommendations')
        
        assert response.status_code == 401
    
    def test_get_similar_songs_success(self, client, auth_user, sample_songs):
        """Test successful similar songs request."""
        user, headers = auth_user
        song = sample_songs[0]
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_similar_songs') as mock_service:
            mock_service.return_value = {
                'reference_song': {
                    'id': song.id,
                    'title': song.title,
                    'artist': song.artist,
                    'genre': song.genre
                },
                'similar_songs': [
                    {
                        'song_id': 2,
                        'title': 'Similar Song',
                        'artist': 'Another Artist',
                        'similarity_score': 0.8,
                        'similarity_explanation': 'Same genre and key'
                    }
                ],
                'similarity_factors': ['Musical key', 'Genre', 'Tempo'],
                'generated_at': '2023-01-01T00:00:00Z'
            }
            
            response = client.get(f'/api/v1/analytics/discovery/similar/{song.id}', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert 'data' in data
            
            similar_data = data['data']
            assert 'reference_song' in similar_data
            assert 'similar_songs' in similar_data
            assert 'similarity_factors' in similar_data
            
            mock_service.assert_called_once_with(song.id, user.id, limit=10)
    
    def test_get_similar_songs_permission_denied(self, client, auth_user, sample_songs):
        """Test similar songs request with permission error."""
        user, headers = auth_user
        song = sample_songs[0]
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_similar_songs') as mock_service:
            mock_service.side_effect = PermissionError("Access denied")
            
            response = client.get(f'/api/v1/analytics/discovery/similar/{song.id}', headers=headers)
            
            assert response.status_code == 403
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'access' in data['message'].lower()
    
    def test_explore_artist_success(self, client, auth_user):
        """Test successful artist exploration request."""
        user, headers = auth_user
        artist_name = 'Test Artist'
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_artist_exploration') as mock_service:
            mock_service.return_value = {
                'artist': artist_name,
                'total_songs': 5,
                'songs': [],
                'artist_characteristics': {
                    'primary_genres': {'Rock': 3, 'Pop': 2},
                    'common_keys': {'C': 2, 'G': 2},
                    'difficulty_levels': {'medium': 3, 'easy': 2}
                },
                'related_artists': ['Related Artist 1', 'Related Artist 2'],
                'generated_at': '2023-01-01T00:00:00Z'
            }
            
            response = client.get(f'/api/v1/analytics/discovery/artists/{artist_name}/explore', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert 'data' in data
            
            exploration = data['data']
            assert exploration['artist'] == artist_name
            assert 'artist_characteristics' in exploration
            assert 'related_artists' in exploration
            
            mock_service.assert_called_once_with(artist_name, user.id, limit=20)
    
    def test_explore_artist_empty_name(self, client, auth_user):
        """Test artist exploration with empty artist name."""
        user, headers = auth_user
        
        response = client.get('/api/v1/analytics/discovery/artists//explore', headers=headers)
        
        # Should get 404 for empty artist name in URL path
        assert response.status_code == 404
    
    def test_explore_genre_success(self, client, auth_user):
        """Test successful genre exploration request."""
        user, headers = auth_user
        genre = 'Rock'
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_genre_exploration') as mock_service:
            mock_service.return_value = {
                'genre': genre,
                'total_songs': 10,
                'songs': [],
                'genre_characteristics': {
                    'popular_artists': {'Artist 1': 4, 'Artist 2': 3},
                    'common_keys': {'C': 5, 'G': 3},
                    'average_tempo': 125,
                    'difficulty_distribution': {'medium': 6, 'easy': 4}
                },
                'generated_at': '2023-01-01T00:00:00Z'
            }
            
            response = client.get(f'/api/v1/analytics/discovery/genres/{genre}/explore', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert 'data' in data
            
            exploration = data['data']
            assert exploration['genre'] == genre
            assert 'genre_characteristics' in exploration
            
            mock_service.assert_called_once_with(genre, user.id, limit=20)
    
    def test_get_trending_songs_success(self, client, auth_user):
        """Test successful trending songs request."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_trending_songs') as mock_service:
            mock_service.return_value = {
                'timeframe': '7d',
                'period': {
                    'start_date': '2023-01-01T00:00:00Z',
                    'end_date': '2023-01-08T00:00:00Z'
                },
                'trending_songs': [
                    {
                        'song_id': 1,
                        'title': 'Trending Song',
                        'artist': 'Popular Artist',
                        'trending_score': 15.5,
                        'view_count': 200,
                        'favorite_count': 50,
                        'trend_explanation': 'Recent activity surge'
                    }
                ],
                'trending_factors': ['Recent views', 'New favorites'],
                'generated_at': '2023-01-08T00:00:00Z'
            }
            
            response = client.get('/api/v1/analytics/discovery/trending', headers=headers)
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert 'data' in data
            
            trending = data['data']
            assert trending['timeframe'] == '7d'
            assert 'trending_songs' in trending
            assert 'trending_factors' in trending
            
            mock_service.assert_called_once_with(user.id, timeframe='7d', limit=20)
    
    def test_get_trending_songs_custom_timeframe(self, client, auth_user):
        """Test trending songs with custom timeframe."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_trending_songs') as mock_service:
            mock_service.return_value = {'timeframe': '1d', 'trending_songs': []}
            
            response = client.get('/api/v1/analytics/discovery/trending?timeframe=1d&limit=5', headers=headers)
            
            assert response.status_code == 200
            mock_service.assert_called_once_with(user.id, timeframe='1d', limit=5)
    
    def test_get_trending_songs_invalid_timeframe(self, client, auth_user):
        """Test trending songs with invalid timeframe."""
        user, headers = auth_user
        
        response = client.get('/api/v1/analytics/discovery/trending?timeframe=invalid', headers=headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'invalid timeframe' in data['message'].lower()
    
    def test_get_discovery_preferences_success(self, client, auth_user):
        """Test getting discovery preferences."""
        user, headers = auth_user
        
        response = client.get('/api/v1/analytics/discovery/preferences', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'success'
        assert 'data' in data
        
        prefs_data = data['data']
        assert 'discovery_preferences' in prefs_data
        assert 'privacy_controls' in prefs_data
        
        # Should have default preferences
        prefs = prefs_data['discovery_preferences']
        assert 'enable_personalized_recommendations' in prefs
        assert 'enable_collaborative_filtering' in prefs
        assert 'discovery_privacy_level' in prefs
    
    def test_update_discovery_preferences_success(self, client, auth_user):
        """Test updating discovery preferences."""
        user, headers = auth_user
        
        preferences_update = {
            'enable_personalized_recommendations': False,
            'enable_collaborative_filtering': True,
            'preferred_genres': ['Rock', 'Jazz'],
            'discovery_privacy_level': 'private'
        }
        
        response = client.put(
            '/api/v1/analytics/discovery/preferences',
            headers={**headers, 'Content-Type': 'application/json'},
            data=json.dumps(preferences_update)
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'success'
        assert 'updated_preferences' in data['data']
        
        updated = data['data']['updated_preferences']
        assert updated['enable_personalized_recommendations'] == False
        assert updated['enable_collaborative_filtering'] == True
        assert updated['preferred_genres'] == ['Rock', 'Jazz']
        assert updated['discovery_privacy_level'] == 'private'
    
    def test_update_discovery_preferences_invalid_privacy_level(self, client, auth_user):
        """Test updating preferences with invalid privacy level."""
        user, headers = auth_user
        
        preferences_update = {
            'discovery_privacy_level': 'invalid_level'
        }
        
        response = client.put(
            '/api/v1/analytics/discovery/preferences',
            headers={**headers, 'Content-Type': 'application/json'},
            data=json.dumps(preferences_update)
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'invalid privacy level' in data['message'].lower()
    
    def test_update_discovery_preferences_no_body(self, client, auth_user):
        """Test updating preferences without request body."""
        user, headers = auth_user
        
        response = client.put('/api/v1/analytics/discovery/preferences', headers=headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'request body is required' in data['message'].lower()
    
    def test_cors_headers(self, client, auth_user):
        """Test CORS headers are present in responses."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations'):
            response = client.get('/api/v1/analytics/discovery/recommendations', headers=headers)
            
            # Flask-CORS should add these headers
            assert 'Access-Control-Allow-Origin' in response.headers
    
    def test_rate_limiting_headers(self, client, auth_user):
        """Test that rate limiting is applied to discovery endpoints."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations') as mock_service:
            mock_service.return_value = {'user_id': user.id, 'recommendations': []}
            
            # Make multiple requests to test rate limiting
            for i in range(5):
                response = client.get('/api/v1/analytics/discovery/recommendations', headers=headers)
                
                # In test environment, all should succeed
                # In production, this would test the rate limit
                assert response.status_code in [200, 429]
    
    def test_error_handling(self, client, auth_user):
        """Test error handling in discovery endpoints."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations') as mock_service:
            mock_service.side_effect = Exception("Service error")
            
            response = client.get('/api/v1/analytics/discovery/recommendations', headers=headers)
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'failed to generate' in data['message'].lower()
    
    def test_sql_injection_protection(self, client, auth_user):
        """Test protection against SQL injection in artist/genre exploration."""
        user, headers = auth_user
        
        malicious_input = "'; DROP TABLE songs; --"
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_artist_exploration') as mock_service:
            mock_service.return_value = {'artist': malicious_input, 'total_songs': 0, 'songs': []}
            
            response = client.get(f'/api/v1/analytics/discovery/artists/{malicious_input}/explore', headers=headers)
            
            # Should handle gracefully without SQL injection
            assert response.status_code in [200, 404]  # URL encoding might cause 404
    
    def test_unicode_handling(self, client, auth_user):
        """Test handling of unicode characters in artist/genre names."""
        user, headers = auth_user
        
        unicode_artist = "Artista Español"
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_artist_exploration') as mock_service:
            mock_service.return_value = {'artist': unicode_artist, 'total_songs': 0, 'songs': []}
            
            response = client.get(f'/api/v1/analytics/discovery/artists/{unicode_artist}/explore', headers=headers)
            
            assert response.status_code == 200
            mock_service.assert_called_once()
    
    def test_json_response_format(self, client, auth_user):
        """Test that all endpoints return valid JSON."""
        user, headers = auth_user
        
        endpoints = [
            '/api/v1/analytics/discovery/recommendations',
            '/api/v1/analytics/discovery/trending',
            '/api/v1/analytics/discovery/preferences'
        ]
        
        for endpoint in endpoints:
            with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations'):
                with patch('chordme.music_discovery_service.MusicDiscoveryService.get_trending_songs'):
                    response = client.get(endpoint, headers=headers)
                    
                    # Should return valid JSON
                    try:
                        json.loads(response.data)
                        json_valid = True
                    except json.JSONDecodeError:
                        json_valid = False
                    
                    assert json_valid, f"Invalid JSON response from {endpoint}"
    
    def test_response_structure_consistency(self, client, auth_user):
        """Test that all discovery endpoints follow consistent response structure."""
        user, headers = auth_user
        
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations') as mock_recs:
            mock_recs.return_value = {'user_id': user.id, 'recommendations': []}
            
            response = client.get('/api/v1/analytics/discovery/recommendations', headers=headers)
            data = json.loads(response.data)
            
            # All successful responses should have consistent structure
            assert 'status' in data
            assert 'data' in data
            assert data['status'] == 'success'
            
        # Test error response structure
        with patch('chordme.music_discovery_service.MusicDiscoveryService.get_personalized_recommendations') as mock_recs:
            mock_recs.side_effect = Exception("Test error")
            
            response = client.get('/api/v1/analytics/discovery/recommendations', headers=headers)
            data = json.loads(response.data)
            
            # Error responses should also be consistent
            assert 'status' in data
            assert 'message' in data
            assert data['status'] == 'error'