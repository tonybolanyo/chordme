"""
Test Spotify integration routes
"""

import pytest
import json
import os
from unittest.mock import patch, MagicMock
from chordme import app, db
from chordme.models import User, Song
from chordme.utils import generate_token
from chordme.spotify_routes import SpotifyService


class TestSpotifyRoutes:
    """Test Spotify API integration routes"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            # Create test user
            self.test_user = User(email='test@example.com')
            self.test_user.set_password('testpassword')
            db.session.add(self.test_user)
            db.session.commit()
            
            # Generate auth token
            self.auth_token = generate_token(self.test_user.id)
            self.auth_headers = {'Authorization': f'Bearer {self.auth_token}'}
    
    def teardown_method(self):
        """Clean up after tests"""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @patch.dict(os.environ, {
        'SPOTIFY_CLIENT_ID': 'test_client_id',
        'SPOTIFY_CLIENT_SECRET': 'test_client_secret'
    })
    @patch('chordme.spotify_routes.requests.post')
    def test_spotify_service_get_access_token(self, mock_post):
        """Test Spotify service access token retrieval"""
        # Mock successful token response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'access_token': 'test_access_token',
            'token_type': 'Bearer',
            'expires_in': 3600
        }
        mock_post.return_value = mock_response
        
        with self.app.app_context():
            token = SpotifyService.get_access_token()
            assert token == 'test_access_token'
            
            # Verify the request was made correctly
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            assert 'Basic' in call_args[1]['headers']['Authorization']
            assert call_args[1]['data']['grant_type'] == 'client_credentials'

    @patch.dict(os.environ, {})
    def test_spotify_service_missing_credentials(self):
        """Test Spotify service with missing credentials"""
        with self.app.app_context():
            with pytest.raises(ValueError, match="Spotify API credentials not configured"):
                SpotifyService.get_access_token()

    @patch('chordme.spotify_routes.SpotifyService.get_access_token')
    @patch('chordme.spotify_routes.requests.get')
    def test_spotify_search_success(self, mock_get, mock_get_token):
        """Test successful Spotify search"""
        mock_get_token.return_value = 'test_access_token'
        
        # Mock search response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'tracks': {
                'items': [
                    {
                        'id': 'track123',
                        'name': 'Test Song',
                        'artists': [{'id': 'artist123', 'name': 'Test Artist'}],
                        'album': {'id': 'album123', 'name': 'Test Album'},
                        'duration_ms': 180000,
                        'popularity': 75
                    }
                ],
                'total': 1,
                'limit': 20,
                'offset': 0
            }
        }
        mock_get.return_value = mock_response
        
        with self.app.app_context():
            result = SpotifyService.search_tracks('test query')
            assert 'tracks' in result
            assert len(result['tracks']['items']) == 1
            assert result['tracks']['items'][0]['name'] == 'Test Song'

    def test_spotify_search_endpoint_success(self):
        """Test /api/v1/spotify/search endpoint"""
        with patch('chordme.spotify_routes.SpotifyService.search_tracks') as mock_search:
            mock_search.return_value = {
                'tracks': {
                    'items': [
                        {
                            'id': 'track123',
                            'name': 'Test Song',
                            'artists': [{'name': 'Test Artist'}]
                        }
                    ],
                    'total': 1
                }
            }
            
            response = self.client.post(
                '/api/v1/spotify/search',
                json={'query': 'test song', 'limit': 20},
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'tracks' in data['data']

    def test_spotify_search_endpoint_missing_query(self):
        """Test search endpoint with missing query"""
        response = self.client.post(
            '/api/v1/spotify/search',
            json={},
            headers=self.auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Query parameter is required' in data['error']['message']

    def test_spotify_search_endpoint_invalid_limit(self):
        """Test search endpoint with invalid limit"""
        response = self.client.post(
            '/api/v1/spotify/search',
            json={'query': 'test', 'limit': 100},
            headers=self.auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'between 1 and 50' in data['error']['message']

    def test_spotify_search_endpoint_unauthorized(self):
        """Test search endpoint without authentication"""
        response = self.client.post(
            '/api/v1/spotify/search',
            json={'query': 'test'}
        )
        
        assert response.status_code == 401

    def test_get_spotify_track_endpoint_success(self):
        """Test /api/v1/spotify/track/<track_id> endpoint"""
        with patch('chordme.spotify_routes.SpotifyService.get_track') as mock_get_track:
            mock_get_track.return_value = {
                'id': 'track123',
                'name': 'Test Song',
                'artists': [{'name': 'Test Artist'}],
                'album': {'name': 'Test Album'},
                'duration_ms': 180000
            }
            
            response = self.client.get(
                '/api/v1/spotify/track/1234567890123456789012',
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['name'] == 'Test Song'

    def test_get_spotify_track_endpoint_invalid_id(self):
        """Test track endpoint with invalid track ID"""
        response = self.client.get(
            '/api/v1/spotify/track/invalid',
            headers=self.auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid track ID format' in data['error']['message']

    def test_get_spotify_track_endpoint_not_found(self):
        """Test track endpoint with non-existent track"""
        with patch('chordme.spotify_routes.SpotifyService.get_track') as mock_get_track:
            mock_get_track.side_effect = ValueError("Track not found")
            
            response = self.client.get(
                '/api/v1/spotify/track/1234567890123456789012',
                headers=self.auth_headers
            )
            
            assert response.status_code == 404
            data = json.loads(response.data)
            assert 'Track not found' in data['error']['message']

    def test_get_spotify_audio_features_endpoint_success(self):
        """Test /api/v1/spotify/audio-features/<track_id> endpoint"""
        with patch('chordme.spotify_routes.SpotifyService.get_audio_features') as mock_get_features:
            mock_get_features.return_value = {
                'id': 'track123',
                'danceability': 0.8,
                'energy': 0.9,
                'key': 1,
                'tempo': 120.0,
                'valence': 0.7
            }
            
            response = self.client.get(
                '/api/v1/spotify/audio-features/1234567890123456789012',
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['danceability'] == 0.8
            assert data['data']['tempo'] == 120.0

    def test_get_spotify_recommendations_endpoint_success(self):
        """Test /api/v1/spotify/recommendations endpoint"""
        with patch('chordme.spotify_routes.SpotifyService.get_recommendations') as mock_get_recs:
            mock_get_recs.return_value = {
                'tracks': [
                    {
                        'id': 'rec_track1',
                        'name': 'Recommended Song',
                        'artists': [{'name': 'Rec Artist'}]
                    }
                ],
                'seeds': [
                    {
                        'initialPoolSize': 100,
                        'afterFilteringSize': 50,
                        'id': 'artist123',
                        'type': 'artist'
                    }
                ]
            }
            
            response = self.client.post(
                '/api/v1/spotify/recommendations',
                json={
                    'seed_artists': ['artist123'],
                    'limit': 10,
                    'target_energy': 0.8
                },
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert len(data['data']['tracks']) == 1
            assert data['data']['tracks'][0]['name'] == 'Recommended Song'

    def test_spotify_recommendations_endpoint_missing_seeds(self):
        """Test recommendations endpoint with no seeds"""
        response = self.client.post(
            '/api/v1/spotify/recommendations',
            json={'limit': 10},
            headers=self.auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'At least one seed' in data['error']['message']

    def test_spotify_recommendations_endpoint_too_many_seeds(self):
        """Test recommendations endpoint with too many seeds"""
        response = self.client.post(
            '/api/v1/spotify/recommendations',
            json={
                'seed_tracks': ['t1', 't2', 't3'],
                'seed_artists': ['a1', 'a2'],
                'seed_genres': ['g1']  # Total: 6 seeds (max is 5)
            },
            headers=self.auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Maximum 5 seeds' in data['error']['message']

    def test_link_spotify_metadata_endpoint_success(self):
        """Test /api/v1/songs/<song_id>/spotify-metadata endpoint"""
        with self.app.app_context():
            # Create test song
            song = Song(
                title='Test Song',
                content='[G]Test content',
                author_id=self.test_user.id
            )
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        with patch('chordme.spotify_routes.SpotifyService.get_track') as mock_get_track:
            with patch('chordme.spotify_routes.SpotifyService.get_audio_features') as mock_get_features:
                mock_get_track.return_value = {
                    'id': 'track123',
                    'name': 'Spotify Song',
                    'artists': [{'name': 'Spotify Artist'}],
                    'album': {'name': 'Spotify Album'}
                }
                mock_get_features.return_value = {
                    'tempo': 120.0,
                    'key': 1,
                    'energy': 0.8,
                    'danceability': 0.7
                }
                
                response = self.client.post(
                    f'/api/v1/songs/{song_id}/spotify-metadata',
                    json={
                        'spotify_track_id': '1234567890123456789012',
                        'auto_sync': True
                    },
                    headers=self.auth_headers
                )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['status'] == 'success'
                assert data['data']['track_name'] == 'Spotify Song'
                assert data['data']['auto_sync'] is True

    def test_link_spotify_metadata_endpoint_song_not_found(self):
        """Test metadata linking with non-existent song"""
        response = self.client.post(
            '/api/v1/songs/99999/spotify-metadata',
            json={'spotify_track_id': '1234567890123456789012'},
            headers=self.auth_headers
        )
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Song not found' in data['error']['message']

    def test_link_spotify_metadata_endpoint_invalid_track_id(self):
        """Test metadata linking with invalid Spotify track ID"""
        with self.app.app_context():
            song = Song(
                title='Test Song',
                content='[G]Test content',
                author_id=self.test_user.id
            )
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        response = self.client.post(
            f'/api/v1/songs/{song_id}/spotify-metadata',
            json={'spotify_track_id': 'invalid'},
            headers=self.auth_headers
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Valid Spotify track ID is required' in data['error']['message']

    @patch('chordme.spotify_routes.SpotifyService.get_access_token')
    @patch('chordme.spotify_routes.requests.get')
    def test_spotify_service_rate_limiting(self, mock_get, mock_get_token):
        """Test Spotify service rate limiting handling"""
        mock_get_token.return_value = 'test_access_token'
        
        # Mock rate limited response
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {'Retry-After': '30'}
        mock_get.return_value = mock_response
        
        with self.app.app_context():
            with pytest.raises(ValueError, match="Rate limited"):
                SpotifyService.search_tracks('test query')

    @patch('chordme.spotify_routes.SpotifyService.get_access_token')
    @patch('chordme.spotify_routes.requests.get')
    def test_spotify_service_network_error(self, mock_get, mock_get_token):
        """Test Spotify service network error handling"""
        mock_get_token.return_value = 'test_access_token'
        mock_get.side_effect = Exception("Network error")
        
        with self.app.app_context():
            with pytest.raises(ValueError, match="Network error during search"):
                SpotifyService.search_tracks('test query')

    def test_spotify_service_recommendations_validation(self):
        """Test Spotify recommendations parameter validation"""
        with patch('chordme.spotify_routes.SpotifyService.get_access_token') as mock_get_token:
            with patch('chordme.spotify_routes.requests.get') as mock_get:
                mock_get_token.return_value = 'test_access_token'
                
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    'tracks': [],
                    'seeds': []
                }
                mock_get.return_value = mock_response
                
                with self.app.app_context():
                    # Test with valid parameters
                    result = SpotifyService.get_recommendations(
                        seed_tracks=['track1'],
                        limit=10,
                        target_energy=0.8,
                        target_tempo=120
                    )
                    
                    assert 'tracks' in result
                    
                    # Verify the API call was made with correct parameters
                    call_args = mock_get.call_args
                    params = call_args[1]['params']
                    assert params['seed_tracks'] == 'track1'
                    assert params['limit'] == 10
                    assert params['target_energy'] == 0.8
                    assert params['target_tempo'] == 120


if __name__ == '__main__':
    pytest.main([__file__])