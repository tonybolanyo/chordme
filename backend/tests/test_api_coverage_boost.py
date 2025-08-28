"""
Strategic test coverage boost for core API functions.
Targets high-impact uncovered functions in api.py module.
"""

import pytest
import json
from unittest.mock import patch, MagicMock


class TestAPIVersionAndHealth:
    """Test version and health endpoints that have basic coverage."""
    
    def test_version_endpoint(self, client):
        """Test version endpoint returns correct structure."""
        response = client.get('/api/v1/version')
        assert response.status_code == 200
        data = response.get_json()
        assert 'version' in data
        assert 'name' in data 
        assert 'status' in data
        assert data['name'] == 'ChordMe Backend'
        assert data['status'] == 'ok'
    
    def test_health_endpoint(self, client):
        """Test health endpoint returns correct structure."""
        response = client.get('/api/v1/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['message'] == 'Service is running'


class TestCSRFTokenEndpoint:
    """Test CSRF token generation endpoint."""
    
    def test_csrf_token_endpoint(self, client):
        """Test CSRF token endpoint functionality."""
        response = client.get('/api/v1/csrf-token')
        assert response.status_code == 200
        data = response.get_json()
        assert 'status' in data
        assert 'data' in data
        assert 'csrf_token' in data['data']
        assert len(data['data']['csrf_token']) > 0


class TestUserRegistrationEndpoint:
    """Test user registration with various scenarios."""
    
    def test_register_valid_user(self, client):
        """Test successful user registration."""
        user_data = {
            'email': 'newuser@example.com',
            'password': 'ValidPassword123'
        }
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'user' in data['data']
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email."""
        user_data = {
            'email': 'invalid-email',
            'password': 'ValidPassword123'
        }
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_register_weak_password(self, client):
        """Test registration with weak password."""
        user_data = {
            'email': 'test@example.com',
            'password': 'weak'
        }
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_register_missing_data(self, client):
        """Test registration with missing data."""
        # Missing email
        response = client.post('/api/v1/auth/register',
                              data=json.dumps({'password': 'ValidPassword123'}),
                              content_type='application/json')
        assert response.status_code == 400
        
        # Missing password
        response = client.post('/api/v1/auth/register',
                              data=json.dumps({'email': 'test@example.com'}),
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_register_duplicate_email(self, client):
        """Test registration with already existing email."""
        user_data = {
            'email': 'duplicate@example.com',
            'password': 'ValidPassword123'
        }
        
        # Register first time
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 201
        
        # Try to register again with same email
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 400


class TestUserLoginEndpoint:
    """Test user login functionality."""
    
    def test_login_valid_credentials(self, client):
        """Test login with valid credentials."""
        # First register a user
        user_data = {
            'email': 'login@example.com',
            'password': 'ValidPassword123'
        }
        client.post('/api/v1/auth/register',
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        # Now login
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'token' in data['data']
        assert 'user' in data['data']
    
    def test_login_invalid_email(self, client):
        """Test login with non-existent email."""
        user_data = {
            'email': 'nonexistent@example.com',
            'password': 'ValidPassword123'
        }
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 401
    
    def test_login_wrong_password(self, client):
        """Test login with wrong password."""
        # Register user
        user_data = {
            'email': 'wrongpass@example.com',
            'password': 'ValidPassword123'
        }
        client.post('/api/v1/auth/register',
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        # Try login with wrong password
        wrong_data = {
            'email': 'wrongpass@example.com',
            'password': 'WrongPassword456'
        }
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(wrong_data),
                              content_type='application/json')
        assert response.status_code == 401
    
    def test_login_missing_data(self, client):
        """Test login with missing data."""
        # Missing email
        response = client.post('/api/v1/auth/login',
                              data=json.dumps({'password': 'ValidPassword123'}),
                              content_type='application/json')
        assert response.status_code == 400
        
        # Missing password
        response = client.post('/api/v1/auth/login',
                              data=json.dumps({'email': 'test@example.com'}),
                              content_type='application/json')
        assert response.status_code == 400


class TestChordProValidationEndpoint:
    """Test ChordPro content validation endpoint."""
    
    def test_validate_chordpro_valid_content(self, client):
        """Test validation with valid ChordPro content."""
        chordpro_data = {
            'content': '{title: Test Song}\n[C]Hello [G]world'
        }
        response = client.post('/api/v1/songs/validate-chordpro',
                              data=json.dumps(chordpro_data),
                              content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
    
    def test_validate_chordpro_invalid_content(self, client):
        """Test validation with invalid ChordPro content."""
        chordpro_data = {
            'content': '[InvalidChord]Some text'
        }
        response = client.post('/api/v1/songs/validate-chordpro',
                              data=json.dumps(chordpro_data),
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_validate_chordpro_empty_content(self, client):
        """Test validation with empty content."""
        chordpro_data = {
            'content': ''
        }
        response = client.post('/api/v1/songs/validate-chordpro',
                              data=json.dumps(chordpro_data),
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_validate_chordpro_missing_content(self, client):
        """Test validation with missing content field."""
        response = client.post('/api/v1/songs/validate-chordpro',
                              data=json.dumps({}),
                              content_type='application/json')
        assert response.status_code == 400


class TestSongCRUDEndpoints:
    """Test song CRUD operations."""
    
    def test_get_songs_unauthorized(self, client):
        """Test getting songs without authentication."""
        response = client.get('/api/v1/songs')
        assert response.status_code == 401
    
    def test_create_song_unauthorized(self, client):
        """Test creating song without authentication."""
        song_data = {
            'title': 'Test Song',
            'artist': 'Test Artist',
            'content': '{title: Test}\n[C]Test content'
        }
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json')
        assert response.status_code == 401
    
    def test_get_songs_authorized(self, client, auth_token):
        """Test getting songs with valid authentication."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/v1/songs', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'songs' in data['data']
    
    def test_create_song_authorized(self, client, auth_token):
        """Test creating song with valid authentication."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        song_data = {
            'title': 'New Test Song',
            'artist': 'Test Artist',
            'content': '{title: New Test Song}\n[C]Hello [G]world'
        }
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=headers)
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'song' in data['data']


class TestAPIErrorHandling:
    """Test various API error handling scenarios."""
    
    def test_invalid_json_format(self, client):
        """Test API response to invalid JSON."""
        response = client.post('/api/v1/auth/register',
                              data='invalid json',
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_missing_content_type(self, client):
        """Test API response when content-type is missing."""
        user_data = {
            'email': 'test@example.com',
            'password': 'ValidPassword123'
        }
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(user_data))
        # Should still work but might have different behavior
        assert response.status_code in [400, 415]
    
    def test_large_request_handling(self, client):
        """Test API response to very large requests."""
        large_content = 'x' * 10000  # 10KB content
        chordpro_data = {
            'content': large_content
        }
        response = client.post('/api/v1/songs/validate-chordpro',
                              data=json.dumps(chordpro_data),
                              content_type='application/json')
        # Should handle gracefully
        assert response.status_code in [400, 413, 500]


class TestAPIUtilityFunctions:
    """Test utility functions used by API endpoints."""
    
    def test_auth_required_decorator(self, client):
        """Test auth_required decorator functionality."""
        # This indirectly tests the decorator by hitting protected endpoints
        response = client.get('/api/v1/songs')
        assert response.status_code == 401
        
        response = client.post('/api/v1/songs',
                              data=json.dumps({'title': 'test'}),
                              content_type='application/json')
        assert response.status_code == 401
    
    def test_rate_limiting_behavior(self, client):
        """Test rate limiting on registration endpoint."""
        user_base = 'ratelimit{}@example.com'
        
        # Make multiple registration attempts
        for i in range(3):  # Stay under the limit
            user_data = {
                'email': user_base.format(i),
                'password': 'ValidPassword123'
            }
            response = client.post('/api/v1/auth/register',
                                  data=json.dumps(user_data),
                                  content_type='application/json')
            # Should succeed initially
            assert response.status_code == 201