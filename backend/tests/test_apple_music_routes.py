"""
Tests for Apple Music Integration Routes
"""

import pytest
import json
from unittest.mock import patch, Mock
from chordme import app, db
from chordme.models import User, Song
from chordme.apple_music_routes import AppleMusicService
import os

@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SECRET_KEY'] = 'test-secret-key'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

@pytest.fixture
def auth_headers():
    """Create authentication headers for testing"""
    with app.app_context():
        # Create test user
        test_user = User(email='test@example.com', password='TestPassword123')
        db.session.add(test_user)
        db.session.commit()
        
        # Create JWT token for the user
        from chordme.utils import create_token
        token = create_token(test_user.id)
        
        return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def test_song():
    """Create a test song"""
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        if not user:
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
        
        song = Song(
            title='Test Song',
            content='{title: Test Song}\n{artist: Test Artist}\nC F G Am',
            author_id=user.id
        )
        db.session.add(song)
        db.session.commit()
        
        return song

class TestAppleMusicService:
    """Test the AppleMusicService class"""
    
    def test_is_configured_with_token(self):
        """Test service configuration with developer token"""
        service = AppleMusicService()
        service.developer_token = 'test-token'
        assert service.is_configured() is True
    
    def test_is_configured_without_token(self):
        """Test service configuration without developer token"""
        service = AppleMusicService()
        service.developer_token = None
        assert service.is_configured() is False
    
    def test_get_headers_without_user_token(self):
        """Test header generation without user token"""
        service = AppleMusicService()
        service.developer_token = 'test-dev-token'
        
        headers = service._get_headers()
        
        assert headers['Authorization'] == 'Bearer test-dev-token'
        assert headers['Content-Type'] == 'application/json'
        assert 'Music-User-Token' not in headers
    
    def test_get_headers_with_user_token(self):
        """Test header generation with user token"""
        service = AppleMusicService()
        service.developer_token = 'test-dev-token'
        
        headers = service._get_headers('user-token')
        
        assert headers['Authorization'] == 'Bearer test-dev-token'
        assert headers['Content-Type'] == 'application/json'
        assert headers['Music-User-Token'] == 'user-token'
    
    @patch('requests.request')
    def test_make_request_success(self, mock_request):
        """Test successful API request"""
        service = AppleMusicService()
        service.developer_token = 'test-token'
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': 'test'}
        mock_request.return_value = mock_response
        
        result = service._make_request('GET', '/test')
        
        assert result == {'data': 'test'}
        mock_request.assert_called_once()
    
    @patch('requests.request')
    def test_make_request_rate_limited(self, mock_request):
        """Test rate limited API request"""
        service = AppleMusicService()
        service.developer_token = 'test-token'
        
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.headers = {'Retry-After': '60'}
        mock_request.return_value = mock_response
        
        with pytest.raises(Exception, match='Rate limited'):
            service._make_request('GET', '/test')
    
    @patch('requests.request')
    def test_search_catalog(self, mock_request):
        """Test catalog search"""
        service = AppleMusicService()
        service.developer_token = 'test-token'
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'results': {
                'songs': {
                    'data': [{
                        'id': '123',
                        'attributes': {
                            'name': 'Test Song',
                            'artistName': 'Test Artist'
                        }
                    }]
                }
            }
        }
        mock_request.return_value = mock_response
        
        result = service.search_catalog('test', ['songs'], limit=10)
        
        assert 'results' in result
        assert 'songs' in result['results']
        mock_request.assert_called_once()
    
    def test_calculate_match_confidence_perfect_match(self):
        """Test match confidence calculation for perfect match"""
        service = AppleMusicService()
        
        source = {
            'name': 'Test Song',
            'artist_name': 'Test Artist',
            'album_name': 'Test Album',
            'duration_ms': 180000
        }
        
        candidate = {
            'attributes': {
                'name': 'Test Song',
                'artistName': 'Test Artist',
                'albumName': 'Test Album',
                'durationInMillis': 181000  # 1 second difference
            }
        }
        
        confidence = service._calculate_match_confidence(source, candidate)
        
        assert confidence > 0.8  # Should be high confidence
    
    def test_calculate_match_confidence_poor_match(self):
        """Test match confidence calculation for poor match"""
        service = AppleMusicService()
        
        source = {
            'name': 'Test Song',
            'artist_name': 'Test Artist',
            'album_name': 'Test Album'
        }
        
        candidate = {
            'attributes': {
                'name': 'Different Song',
                'artistName': 'Different Artist',
                'albumName': 'Different Album'
            }
        }
        
        confidence = service._calculate_match_confidence(source, candidate)
        
        assert confidence < 0.3  # Should be low confidence
    
    def test_string_similarity(self):
        """Test string similarity calculation"""
        service = AppleMusicService()
        
        # Identical strings
        assert service._string_similarity('test', 'test') == 1.0
        
        # Different strings
        assert service._string_similarity('test', 'different') < 0.5
        
        # Similar strings
        similarity = service._string_similarity('test song', 'test')
        assert 0 < similarity < 1

class TestAppleMusicRoutes:
    """Test Apple Music API routes"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/api/v1/apple-music/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'service' in data['data']
        assert 'configured' in data['data']
    
    def test_search_without_auth(self, client):
        """Test search endpoint without authentication"""
        response = client.post('/api/v1/apple-music/search', json={
            'term': 'test song',
            'types': ['songs']
        })
        
        assert response.status_code == 401
    
    def test_search_without_config(self, client, auth_headers):
        """Test search endpoint without Apple Music configuration"""
        with patch.dict(os.environ, {}, clear=True):
            response = client.post('/api/v1/apple-music/search', 
                                 json={'term': 'test song', 'types': ['songs']},
                                 headers=auth_headers)
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert 'not configured' in data['error']['message']
    
    def test_search_invalid_request(self, client, auth_headers):
        """Test search endpoint with invalid request"""
        response = client.post('/api/v1/apple-music/search', 
                             json={},  # Missing term
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'required' in data['error']['message']
    
    def test_search_invalid_types(self, client, auth_headers):
        """Test search endpoint with invalid types"""
        response = client.post('/api/v1/apple-music/search', 
                             json={'term': 'test', 'types': ['invalid']},
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid search types' in data['error']['message']
    
    @patch.dict(os.environ, {'APPLE_MUSIC_DEVELOPER_TOKEN': 'test-token'})
    @patch('chordme.apple_music_routes.apple_music_service.search_catalog')
    def test_search_success(self, mock_search, client, auth_headers):
        """Test successful search"""
        mock_search.return_value = {
            'results': {
                'songs': {
                    'data': [{
                        'id': '123',
                        'attributes': {'name': 'Test Song'}
                    }]
                }
            }
        }
        
        response = client.post('/api/v1/apple-music/search', 
                             json={'term': 'test song', 'types': ['songs']},
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'results' in data['data']
    
    @patch.dict(os.environ, {'APPLE_MUSIC_DEVELOPER_TOKEN': 'test-token'})
    @patch('chordme.apple_music_routes.apple_music_service.search_catalog')
    def test_search_api_error(self, mock_search, client, auth_headers):
        """Test search with API error"""
        mock_search.side_effect = Exception('API Error')
        
        response = client.post('/api/v1/apple-music/search', 
                             json={'term': 'test song', 'types': ['songs']},
                             headers=auth_headers)
        
        assert response.status_code == 502
        data = json.loads(response.data)
        assert 'failed' in data['error']['message']
    
    def test_get_song_without_auth(self, client):
        """Test get song endpoint without authentication"""
        response = client.get('/api/v1/apple-music/songs/123')
        
        assert response.status_code == 401
    
    @patch.dict(os.environ, {'APPLE_MUSIC_DEVELOPER_TOKEN': 'test-token'})
    @patch('chordme.apple_music_routes.apple_music_service.get_song')
    def test_get_song_success(self, mock_get_song, client, auth_headers):
        """Test successful get song"""
        mock_get_song.return_value = {
            'data': [{
                'id': '123',
                'attributes': {'name': 'Test Song'}
            }]
        }
        
        response = client.get('/api/v1/apple-music/songs/123', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'data' in data['data']
    
    def test_cross_platform_match_without_auth(self, client):
        """Test cross-platform match without authentication"""
        response = client.post('/api/v1/apple-music/cross-platform-match', json={
            'track': {'name': 'Test Song'}
        })
        
        assert response.status_code == 401
    
    def test_cross_platform_match_invalid_request(self, client, auth_headers):
        """Test cross-platform match with invalid request"""
        response = client.post('/api/v1/apple-music/cross-platform-match', 
                             json={},  # Missing track
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'required' in data['error']['message']
    
    def test_cross_platform_match_missing_name(self, client, auth_headers):
        """Test cross-platform match with missing track name"""
        response = client.post('/api/v1/apple-music/cross-platform-match', 
                             json={'track': {}},  # Missing name
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'name is required' in data['error']['message']
    
    @patch.dict(os.environ, {'APPLE_MUSIC_DEVELOPER_TOKEN': 'test-token'})
    @patch('chordme.apple_music_routes.apple_music_service.cross_platform_match')
    def test_cross_platform_match_success(self, mock_match, client, auth_headers):
        """Test successful cross-platform match"""
        mock_match.return_value = {
            'source_track': {'name': 'Test Song'},
            'matches': [],
            'best_match': None
        }
        
        response = client.post('/api/v1/apple-music/cross-platform-match', 
                             json={'track': {'name': 'Test Song'}},
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'source_track' in data['data']
    
    def test_link_metadata_without_auth(self, client):
        """Test link metadata without authentication"""
        response = client.post('/api/v1/apple-music/link-metadata', json={
            'song_id': '123',
            'apple_music_id': 'apple123'
        })
        
        assert response.status_code == 401
    
    def test_link_metadata_invalid_request(self, client, auth_headers):
        """Test link metadata with invalid request"""
        response = client.post('/api/v1/apple-music/link-metadata', 
                             json={},  # Missing required fields
                             headers=auth_headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'required' in data['error']['message']
    
    def test_link_metadata_song_not_found(self, client, auth_headers, test_song):
        """Test link metadata with non-existent song"""
        response = client.post('/api/v1/apple-music/link-metadata', 
                             json={
                                 'song_id': '999',  # Non-existent
                                 'apple_music_id': 'apple123'
                             },
                             headers=auth_headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'not found' in data['error']['message']
    
    @patch.dict(os.environ, {'APPLE_MUSIC_DEVELOPER_TOKEN': 'test-token'})
    @patch('chordme.apple_music_routes.apple_music_service.get_song')
    def test_link_metadata_success(self, mock_get_song, client, auth_headers, test_song):
        """Test successful metadata linking"""
        mock_get_song.return_value = {
            'data': [{
                'id': 'apple123',
                'attributes': {
                    'name': 'Test Song',
                    'artistName': 'Test Artist',
                    'albumName': 'Test Album',
                    'url': 'https://music.apple.com/song/apple123',
                    'previews': [{'url': 'https://example.com/preview.m4a'}]
                }
            }]
        }
        
        response = client.post('/api/v1/apple-music/link-metadata', 
                             json={
                                 'song_id': str(test_song.id),
                                 'apple_music_id': 'apple123'
                             },
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'linked successfully' in data['data']['message']
    
    @patch.dict(os.environ, {'APPLE_MUSIC_DEVELOPER_TOKEN': 'test-token'})
    @patch('chordme.apple_music_routes.apple_music_service.get_song')
    def test_link_metadata_api_error(self, mock_get_song, client, auth_headers, test_song):
        """Test metadata linking with API error"""
        mock_get_song.side_effect = Exception('API Error')
        
        response = client.post('/api/v1/apple-music/link-metadata', 
                             json={
                                 'song_id': str(test_song.id),
                                 'apple_music_id': 'apple123'
                             },
                             headers=auth_headers)
        
        assert response.status_code == 502
        data = json.loads(response.data)
        assert 'failed' in data['error']['message']
    
    def test_get_recommendations_without_auth(self, client):
        """Test get recommendations without authentication"""
        response = client.get('/api/v1/apple-music/recommendations/test-id')
        
        assert response.status_code == 401
    
    @patch.dict(os.environ, {'APPLE_MUSIC_DEVELOPER_TOKEN': 'test-token'})
    @patch('chordme.apple_music_routes.apple_music_service.get_recommendations')
    def test_get_recommendations_success(self, mock_get_recs, client, auth_headers):
        """Test successful get recommendations"""
        mock_get_recs.return_value = {
            'data': [{
                'id': '123',
                'attributes': {'name': 'Recommended Song'}
            }]
        }
        
        response = client.get('/api/v1/apple-music/recommendations/test-id?limit=10', 
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'data' in data['data']