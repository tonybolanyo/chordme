"""
Tests for YouTube integration routes
"""

import pytest
import json
from unittest.mock import patch, Mock
from chordme import app, db
from chordme.models import User, Song


@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def authenticated_user(client):
    """Create and authenticate a test user"""
    # Create test user
    user = User(email='test@example.com')
    user.set_password('TestPassword123!')
    db.session.add(user)
    db.session.commit()
    
    # Login
    response = client.post('/api/v1/auth/login', 
                          data=json.dumps({
                              'email': 'test@example.com',
                              'password': 'TestPassword123!'
                          }),
                          content_type='application/json')
    
    data = json.loads(response.data)
    token = data['data']['token']
    
    return {
        'user': user,
        'token': token,
        'headers': {'Authorization': f'Bearer {token}'}
    }


@pytest.fixture
def test_song(authenticated_user):
    """Create a test song"""
    song = Song(
        title='Test Song',
        content='{title: Test Song}\n{artist: Test Artist}\n[C]Hello [G]World',
        user_id=authenticated_user['user'].id
    )
    db.session.add(song)
    db.session.commit()
    return song


class TestYouTubeSearch:
    """Test YouTube search functionality"""
    
    @patch.dict('os.environ', {'YOUTUBE_API_KEY': 'test_api_key'})
    @patch('requests.get')
    def test_search_videos_success(self, mock_get, client, authenticated_user):
        """Test successful video search"""
        # Mock YouTube API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.raise_for_status = Mock()
        mock_response.json.return_value = {
            'items': [
                {
                    'id': {'videoId': 'test123'},
                    'snippet': {
                        'title': 'Test Video',
                        'description': 'Test description',
                        'channelTitle': 'Test Channel',
                        'thumbnails': {'default': {'url': 'thumb.jpg'}},
                        'publishedAt': '2023-01-01T00:00:00Z'
                    },
                    'contentDetails': {'duration': 'PT3M30S'},
                    'statistics': {'viewCount': '1000', 'likeCount': '50'}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        # Make request
        response = client.post('/api/v1/youtube/search',
                              data=json.dumps({
                                  'query': 'test song',
                                  'maxResults': 10
                              }),
                              content_type='application/json',
                              headers=authenticated_user['headers'])
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert len(data['data']['videos']) == 1
        assert data['data']['videos'][0]['videoId'] == 'test123'
        assert data['data']['videos'][0]['title'] == 'Test Video'
    
    def test_search_videos_no_auth(self, client):
        """Test search without authentication"""
        response = client.post('/api/v1/youtube/search',
                              data=json.dumps({'query': 'test song'}),
                              content_type='application/json')
        
        assert response.status_code == 401
    
    def test_search_videos_missing_query(self, client, authenticated_user):
        """Test search without query"""
        response = client.post('/api/v1/youtube/search',
                              data=json.dumps({}),
                              content_type='application/json',
                              headers=authenticated_user['headers'])
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'query' in data['error']['message'].lower()
    
    def test_search_videos_invalid_max_results(self, client, authenticated_user):
        """Test search with invalid maxResults"""
        response = client.post('/api/v1/youtube/search',
                              data=json.dumps({
                                  'query': 'test song',
                                  'maxResults': 50  # Too high
                              }),
                              content_type='application/json',
                              headers=authenticated_user['headers'])
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'maxResults' in data['error']['message']


class TestVideoDetails:
    """Test video details functionality"""
    
    @patch.dict('os.environ', {'YOUTUBE_API_KEY': 'test_api_key'})
    @patch('requests.get')
    def test_get_video_details_success(self, mock_get, client, authenticated_user):
        """Test successful video details retrieval"""
        # Mock YouTube API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.raise_for_status = Mock()
        mock_response.json.return_value = {
            'items': [
                {
                    'snippet': {
                        'title': 'Test Video',
                        'channelTitle': 'Test Channel',
                        'description': 'Test description',
                        'thumbnails': {'default': {'url': 'thumb.jpg'}},
                        'publishedAt': '2023-01-01T00:00:00Z',
                        'tags': ['music', 'test']
                    },
                    'contentDetails': {'duration': 'PT3M30S'},
                    'statistics': {'viewCount': '1000', 'likeCount': '50'}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        # Make request
        response = client.get('/api/v1/youtube/video/test123',
                             headers=authenticated_user['headers'])
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['videoId'] == 'test123'
        assert data['data']['title'] == 'Test Video'
        assert data['data']['tags'] == ['music', 'test']
    
    def test_get_video_details_no_auth(self, client):
        """Test video details without authentication"""
        response = client.get('/api/v1/youtube/video/test123')
        assert response.status_code == 401
    
    def test_get_video_details_invalid_id(self, client, authenticated_user):
        """Test video details with invalid video ID"""
        response = client.get('/api/v1/youtube/video/invalid!@#',
                             headers=authenticated_user['headers'])
        
        assert response.status_code == 400


class TestVideoLinking:
    """Test video linking functionality"""
    
    @patch.dict('os.environ', {'YOUTUBE_API_KEY': 'test_api_key'})
    @patch('requests.get')
    def test_link_video_to_song_success(self, mock_get, client, authenticated_user, test_song):
        """Test successful video linking"""
        # Mock YouTube API response for video validation
        mock_response = Mock()
        mock_response.ok = True
        mock_response.raise_for_status = Mock()
        mock_response.json.return_value = {
            'items': [
                {
                    'snippet': {
                        'title': 'Test Video',
                        'channelTitle': 'Test Channel',
                        'description': 'Test description',
                        'thumbnails': {'default': {'url': 'thumb.jpg'}},
                        'publishedAt': '2023-01-01T00:00:00Z'
                    },
                    'contentDetails': {'duration': 'PT3M30S'},
                    'statistics': {'viewCount': '1000', 'likeCount': '50'}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        # Make request
        response = client.post(f'/api/v1/songs/{test_song.id}/youtube',
                              data=json.dumps({
                                  'videoId': 'test123',
                                  'title': 'Test Video',
                                  'syncEnabled': True
                              }),
                              content_type='application/json',
                              headers=authenticated_user['headers'])
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['videoId'] == 'test123'
        assert data['data']['songId'] == test_song.id
    
    def test_link_video_no_auth(self, client, test_song):
        """Test video linking without authentication"""
        response = client.post(f'/api/v1/songs/{test_song.id}/youtube',
                              data=json.dumps({'videoId': 'test123'}),
                              content_type='application/json')
        
        assert response.status_code == 401
    
    def test_link_video_missing_video_id(self, client, authenticated_user, test_song):
        """Test video linking without video ID"""
        response = client.post(f'/api/v1/songs/{test_song.id}/youtube',
                              data=json.dumps({}),
                              content_type='application/json',
                              headers=authenticated_user['headers'])
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'video id' in data['error']['message'].lower()
    
    def test_link_video_nonexistent_song(self, client, authenticated_user):
        """Test video linking to nonexistent song"""
        response = client.post('/api/v1/songs/99999/youtube',
                              data=json.dumps({'videoId': 'test123'}),
                              content_type='application/json',
                              headers=authenticated_user['headers'])
        
        assert response.status_code == 404


class TestVideoUnlinking:
    """Test video unlinking functionality"""
    
    def test_unlink_video_success(self, client, authenticated_user, test_song):
        """Test successful video unlinking"""
        # First add YouTube data to the song
        test_song.metadata = {
            'youtube': {
                'video_id': 'test123',
                'video_title': 'Test Video',
                'sync_enabled': True,
                'chord_mapping': [],
                'linked_at': '2023-01-01T00:00:00Z'
            }
        }
        db.session.commit()
        
        # Make request
        response = client.delete(f'/api/v1/songs/{test_song.id}/youtube',
                                headers=authenticated_user['headers'])
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['songId'] == test_song.id
        
        # Verify video data was removed
        db.session.refresh(test_song)
        assert 'youtube' not in (test_song.metadata or {})
    
    def test_unlink_video_no_youtube_data(self, client, authenticated_user, test_song):
        """Test unlinking when no YouTube data exists"""
        response = client.delete(f'/api/v1/songs/{test_song.id}/youtube',
                                headers=authenticated_user['headers'])
        
        assert response.status_code == 404


class TestVideoSuggestions:
    """Test video suggestions functionality"""
    
    @patch.dict('os.environ', {'YOUTUBE_API_KEY': 'test_api_key'})
    @patch('requests.get')
    def test_suggest_videos_success(self, mock_get, client, authenticated_user, test_song):
        """Test successful video suggestions"""
        # Mock YouTube API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.raise_for_status = Mock()
        mock_response.json.return_value = {
            'items': [
                {
                    'id': {'videoId': 'test123'},
                    'snippet': {
                        'title': 'Test Song Official',
                        'description': 'Official video',
                        'channelTitle': 'Test Artist',
                        'thumbnails': {'default': {'url': 'thumb.jpg'}},
                        'publishedAt': '2023-01-01T00:00:00Z'
                    },
                    'contentDetails': {'duration': 'PT3M30S'},
                    'statistics': {'viewCount': '1000', 'likeCount': '50'}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        # Make request
        response = client.get(f'/api/v1/youtube/suggest/{test_song.id}',
                             headers=authenticated_user['headers'])
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert len(data['data']['suggestions']) == 1
        assert data['data']['songId'] == test_song.id
        assert 'Test Song' in data['data']['query']
    
    def test_suggest_videos_no_auth(self, client, test_song):
        """Test video suggestions without authentication"""
        response = client.get(f'/api/v1/youtube/suggest/{test_song.id}')
        assert response.status_code == 401
    
    def test_suggest_videos_nonexistent_song(self, client, authenticated_user):
        """Test video suggestions for nonexistent song"""
        response = client.get('/api/v1/youtube/suggest/99999',
                             headers=authenticated_user['headers'])
        
        assert response.status_code == 404


if __name__ == '__main__':
    pytest.main([__file__])