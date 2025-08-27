"""
Comprehensive tests for API endpoints to improve coverage.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from chordme.models import db, User, Song, Chord


class TestAPIEndpointsComprehensive:
    """Test API endpoints not covered by existing tests."""
    
    def test_version_endpoint(self, test_client):
        """Test version endpoint."""
        response = test_client.get('/api/v1/version')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'version' in data
        assert 'name' in data
        assert 'status' in data
        assert data['name'] == 'ChordMe Backend'
        assert data['status'] == 'ok'
        
    def test_health_endpoint(self, test_client):
        """Test health endpoint."""
        response = test_client.get('/api/v1/health')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['message'] == 'Service is running'
        
    def test_csrf_token_endpoint(self, test_client):
        """Test CSRF token endpoint."""
        response = test_client.get('/api/v1/csrf-token')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert 'csrf_token' in data['data']
        assert len(data['data']['csrf_token']) > 0
        
    def test_user_registration_valid(self, test_client):
        """Test user registration with valid data."""
        user_data = {
            'email': 'test@example.com',
            'password': 'ValidPassword123!'
        }
        
        response = test_client.post('/api/v1/auth/register',
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'user' in data['data']
        
    def test_user_registration_invalid_email(self, test_client):
        """Test user registration with invalid email."""
        user_data = {
            'email': 'invalid_email',
            'password': 'ValidPassword123!'
        }
        
        response = test_client.post('/api/v1/auth/register',
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_user_registration_weak_password(self, test_client):
        """Test user registration with weak password."""
        user_data = {
            'email': 'test@example.com',
            'password': 'weak'
        }
        
        response = test_client.post('/api/v1/auth/register',
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_user_registration_missing_data(self, test_client):
        """Test user registration with missing data."""
        user_data = {
            'email': 'test@example.com'
            # Missing password
        }
        
        response = test_client.post('/api/v1/auth/register',
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_user_registration_duplicate_email(self, test_client):
        """Test user registration with duplicate email."""
        user_data = {
            'email': 'duplicate@example.com',
            'password': 'ValidPassword123!'
        }
        
        # Register first user
        response1 = test_client.post('/api/v1/auth/register',
                                    data=json.dumps(user_data),
                                    content_type='application/json')
        assert response1.status_code == 201
        
        # Try to register again with same email
        response2 = test_client.post('/api/v1/auth/register',
                                    data=json.dumps(user_data),
                                    content_type='application/json')
        assert response2.status_code == 400
        data = response2.get_json()
        assert data['status'] == 'error'
        
    def test_user_login_valid(self, test_client):
        """Test user login with valid credentials."""
        # First register user
        user_data = {
            'email': 'login@example.com',
            'password': 'ValidPassword123!'
        }
        test_client.post('/api/v1/auth/register',
                        data=json.dumps(user_data),
                        content_type='application/json')
        
        # Then login
        response = test_client.post('/api/v1/auth/login',
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'token' in data['data']
        
    def test_user_login_invalid_email(self, test_client):
        """Test user login with invalid email."""
        user_data = {
            'email': 'nonexistent@example.com',
            'password': 'ValidPassword123!'
        }
        
        response = test_client.post('/api/v1/auth/login',
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_user_login_wrong_password(self, test_client):
        """Test user login with wrong password."""
        # First register user
        user_data = {
            'email': 'wrongpass@example.com',
            'password': 'ValidPassword123!'
        }
        test_client.post('/api/v1/auth/register',
                        data=json.dumps(user_data),
                        content_type='application/json')
        
        # Then login with wrong password
        login_data = {
            'email': 'wrongpass@example.com',
            'password': 'WrongPassword123!'
        }
        response = test_client.post('/api/v1/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_user_login_missing_data(self, test_client):
        """Test user login with missing data."""
        user_data = {
            'email': 'test@example.com'
            # Missing password
        }
        
        response = test_client.post('/api/v1/auth/login',
                                   data=json.dumps(user_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_songs_list_unauthorized(self, test_client):
        """Test songs list without authentication."""
        response = test_client.get('/api/v1/songs')
        
        assert response.status_code == 401
        
    def test_songs_list_authorized(self, test_client, auth_headers):
        """Test songs list with authentication."""
        response = test_client.get('/api/v1/songs', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'songs' in data
        assert isinstance(data['songs'], list)
        
    def test_songs_create_unauthorized(self, test_client):
        """Test song creation without authentication."""
        song_data = {
            'title': 'Test Song',
            'content': '{title: Test Song}\n[C]Test content'
        }
        
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json')
        
        assert response.status_code == 401
        
    def test_songs_create_valid(self, test_client, auth_headers):
        """Test song creation with valid data."""
        song_data = {
            'title': 'Test Song',
            'content': '{title: Test Song}\n[C]Test content'
        }
        
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=auth_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'song' in data['data']
        
    def test_songs_create_invalid_data(self, test_client, auth_headers):
        """Test song creation with invalid data."""
        song_data = {
            'title': '',  # Empty title
            'content': ''
        }
        
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=auth_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_song_get_unauthorized(self, test_client):
        """Test getting song without authentication."""
        response = test_client.get('/api/v1/songs/1')
        
        assert response.status_code == 401
        
    def test_song_get_not_found(self, test_client, auth_headers):
        """Test getting non-existent song."""
        response = test_client.get('/api/v1/songs/99999', headers=auth_headers)
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_song_update_unauthorized(self, test_client):
        """Test updating song without authentication."""
        song_data = {
            'title': 'Updated Song',
            'content': '{title: Updated Song}\n[G]Updated content'
        }
        
        response = test_client.put('/api/v1/songs/1',
                                  data=json.dumps(song_data),
                                  content_type='application/json')
        
        assert response.status_code == 401
        
    def test_song_delete_unauthorized(self, test_client):
        """Test deleting song without authentication."""
        response = test_client.delete('/api/v1/songs/1')
        
        assert response.status_code == 401
        
    def test_chords_list_unauthorized(self, test_client):
        """Test chords list without authentication."""
        response = test_client.get('/api/v1/chords')
        
        assert response.status_code == 401
        
    def test_chords_list_authorized(self, test_client, auth_headers):
        """Test chords list with authentication."""
        response = test_client.get('/api/v1/chords', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'chords' in data
        assert isinstance(data['chords'], list)
        
    def test_validate_chordpro_valid(self, test_client):
        """Test ChordPro validation with valid content."""
        content_data = {
            'content': '{title: Test Song}\n{artist: Test Artist}\n[C]Valid content [G]here'
        }
        
        response = test_client.post('/api/v1/songs/validate-chordpro',
                                   data=json.dumps(content_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        
    def test_validate_chordpro_invalid(self, test_client):
        """Test ChordPro validation with invalid content."""
        content_data = {
            'content': '[InvalidChord]Bad content'
        }
        
        response = test_client.post('/api/v1/songs/validate-chordpro',
                                   data=json.dumps(content_data),
                                   content_type='application/json')
        
        # Should still return 200 but with validation results
        assert response.status_code == 200
        data = response.get_json()
        assert 'status' in data
        
    def test_validate_chordpro_empty(self, test_client):
        """Test ChordPro validation with empty content."""
        content_data = {
            'content': ''
        }
        
        response = test_client.post('/api/v1/songs/validate-chordpro',
                                   data=json.dumps(content_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_validate_chordpro_missing_content(self, test_client):
        """Test ChordPro validation with missing content field."""
        content_data = {}  # Missing content field
        
        response = test_client.post('/api/v1/songs/validate-chordpro',
                                   data=json.dumps(content_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_transpose_chordpro_valid(self, test_client):
        """Test ChordPro transposition with valid data."""
        transpose_data = {
            'content': '[C]Test [G]content [Am]here [F]too',
            'semitones': 2
        }
        
        response = test_client.post('/api/v1/songs/transpose-chordpro',
                                   data=json.dumps(transpose_data),
                                   content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'transposed_content' in data['data']
        
    def test_transpose_chordpro_invalid_semitones(self, test_client):
        """Test ChordPro transposition with invalid semitones."""
        transpose_data = {
            'content': '[C]Test content',
            'semitones': 15  # Invalid: too many semitones
        }
        
        response = test_client.post('/api/v1/songs/transpose-chordpro',
                                   data=json.dumps(transpose_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_transpose_chordpro_missing_data(self, test_client):
        """Test ChordPro transposition with missing data."""
        transpose_data = {
            'content': '[C]Test content'
            # Missing semitones
        }
        
        response = test_client.post('/api/v1/songs/transpose-chordpro',
                                   data=json.dumps(transpose_data),
                                   content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_static_file_routing(self, test_client):
        """Test static file routing for frontend."""
        response = test_client.get('/')
        
        # Should return some response (either 404 or the frontend)
        assert response.status_code in [200, 404]
        
    def test_frontend_route_handling(self, test_client):
        """Test frontend route handling for SPA."""
        response = test_client.get('/some/frontend/route')
        
        # Should return some response (either 404 or the frontend)
        assert response.status_code in [200, 404]
        
    def test_api_error_handling_malformed_json(self, test_client):
        """Test API error handling with malformed JSON."""
        response = test_client.post('/api/v1/auth/register',
                                   data='{"malformed": json}',
                                   content_type='application/json')
        
        assert response.status_code == 400
        
    def test_api_error_handling_wrong_content_type(self, test_client):
        """Test API error handling with wrong content type."""
        user_data = {
            'email': 'test@example.com',
            'password': 'ValidPassword123!'
        }
        
        response = test_client.post('/api/v1/auth/register',
                                   data=json.dumps(user_data),
                                   content_type='text/plain')
        
        assert response.status_code == 400
        
    def test_api_error_handling_large_request(self, test_client):
        """Test API error handling with very large request."""
        large_data = {
            'email': 'test@example.com',
            'password': 'ValidPassword123!',
            'extra_data': 'x' * 100000  # Very large field
        }
        
        response = test_client.post('/api/v1/auth/register',
                                   data=json.dumps(large_data),
                                   content_type='application/json')
        
        # Should handle gracefully (either 400 or 413)
        assert response.status_code in [400, 413]


class TestAPICollaborationEndpoints:
    """Test collaboration-related API endpoints."""
    
    def test_song_share_unauthorized(self, test_client):
        """Test song sharing without authentication."""
        share_data = {
            'user_email': 'collaborator@example.com',
            'permission_level': 'read'
        }
        
        response = test_client.post('/api/v1/songs/1/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json')
        
        assert response.status_code == 401
        
    def test_song_collaborators_unauthorized(self, test_client):
        """Test getting song collaborators without authentication."""
        response = test_client.get('/api/v1/songs/1/collaborators')
        
        assert response.status_code == 401
        
    def test_song_permissions_update_unauthorized(self, test_client):
        """Test updating song permissions without authentication."""
        permission_data = {
            'user_email': 'collaborator@example.com',
            'permission_level': 'admin'
        }
        
        response = test_client.put('/api/v1/songs/1/permissions',
                                  data=json.dumps(permission_data),
                                  content_type='application/json')
        
        assert response.status_code == 401
        
    def test_song_unshare_unauthorized(self, test_client):
        """Test removing song collaborator without authentication."""
        response = test_client.delete('/api/v1/songs/1/share/2')
        
        assert response.status_code == 401


class TestAPIGoogleDriveEndpoints:
    """Test Google Drive integration endpoints."""
    
    def test_google_drive_validate_and_save_unauthorized(self, test_client):
        """Test Google Drive validate and save without authentication."""
        drive_data = {
            'access_token': 'fake_token',
            'file_name': 'test.pro',
            'content': '{title: Test Song}'
        }
        
        response = test_client.post('/api/v1/google-drive/validate-and-save',
                                   data=json.dumps(drive_data),
                                   content_type='application/json')
        
        assert response.status_code == 401
        
    def test_google_drive_batch_validate_unauthorized(self, test_client):
        """Test Google Drive batch validate without authentication."""
        batch_data = {
            'access_token': 'fake_token',
            'file_ids': ['file1', 'file2']
        }
        
        response = test_client.post('/api/v1/google-drive/batch-validate',
                                   data=json.dumps(batch_data),
                                   content_type='application/json')
        
        assert response.status_code == 401
        
    def test_google_drive_backup_songs_unauthorized(self, test_client):
        """Test Google Drive backup songs without authentication."""
        backup_data = {
            'access_token': 'fake_token'
        }
        
        response = test_client.post('/api/v1/google-drive/backup-songs',
                                   data=json.dumps(backup_data),
                                   content_type='application/json')
        
        assert response.status_code == 401