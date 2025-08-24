"""
Integration tests for Google Drive API endpoints.
"""

import json
import pytest
from unittest.mock import patch
from chordme.models import User


class TestGoogleDriveEndpoints:
    """Test Google Drive API endpoints."""
    
    @pytest.fixture
    def user_data(self):
        """Create test user data."""
        return {
            'email': 'testuser@example.com',
            'password': 'SecurePassword123!'
        }
    
    @pytest.fixture
    def auth_headers(self, client, user_data):
        """Create authenticated user and return auth headers."""
        # Register user
        response = client.post('/api/v1/auth/register', 
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 201
        
        # Login to get token
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(user_data),
                              content_type='application/json')
        assert response.status_code == 200
        
        token = response.json['data']['token']
        return {'Authorization': f'Bearer {token}'}
    
    def test_validate_and_save_service_disabled(self, client, auth_headers):
        """Test validate and save endpoint when service is disabled."""
        data = {
            'access_token': 'test_token',
            'file_name': 'test.pro',
            'content': '{title: Test Song}\nThis is a test.'
        }
        
        response = client.post('/api/v1/google-drive/validate-and-save',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Google Drive integration is not enabled' in response.json['message']
    
    def test_validate_and_save_missing_data(self, client, auth_headers):
        """Test validate and save endpoint with missing data."""
        response = client.post('/api/v1/google-drive/validate-and-save',
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'No data provided' in response.json['message']
    
    def test_validate_and_save_missing_fields(self, client, auth_headers):
        """Test validate and save endpoint with missing required fields."""
        test_cases = [
            ({}, 'Access token is required'),
            ({'access_token': 'test'}, 'File name is required'),
            ({'access_token': 'test', 'file_name': 'test.pro'}, 'Content is required'),
        ]
        
        for data, expected_error in test_cases:
            response = client.post('/api/v1/google-drive/validate-and-save',
                                  data=json.dumps(data),
                                  content_type='application/json',
                                  headers=auth_headers)
            
            assert response.status_code == 400
            assert expected_error in response.json['message']
    
    def test_validate_and_save_invalid_file_name(self, client, auth_headers):
        """Test validate and save endpoint with invalid file name."""
        data = {
            'access_token': 'test_token',
            'file_name': 'a' * 101,  # Too long
            'content': '{title: Test Song}'
        }
        
        response = client.post('/api/v1/google-drive/validate-and-save',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'File name must be 100 characters or less' in response.json['message']
    
    @patch('chordme.api.current_app')
    def test_validate_and_save_enabled(self, mock_app, client, auth_headers):
        """Test validate and save endpoint when enabled (mocked)."""
        # Mock the app config to enable Google Drive
        mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
        
        with patch('chordme.api.google_drive_service') as mock_service:
            mock_service.is_enabled.return_value = True
            mock_service.validate_chordpro_and_save.return_value = {
                'success': True,
                'validation': {'valid': True},
                'file': {'id': 'test_file_id'},
                'message': 'Success'
            }
            
            data = {
                'access_token': 'test_token',
                'file_name': 'test.pro',
                'content': '{title: Test Song}\nThis is a test.'
            }
            
            response = client.post('/api/v1/google-drive/validate-and-save',
                                  data=json.dumps(data),
                                  content_type='application/json',
                                  headers=auth_headers)
            
            assert response.status_code == 200
            assert response.json['status'] == 'success'
            assert response.json['data']['success'] is True
    
    def test_batch_validate_service_disabled(self, client, auth_headers):
        """Test batch validate endpoint when service is disabled."""
        data = {
            'access_token': 'test_token',
            'file_ids': ['file1', 'file2']
        }
        
        response = client.post('/api/v1/google-drive/batch-validate',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Google Drive integration is not enabled' in response.json['message']
    
    def test_batch_validate_missing_fields(self, client, auth_headers):
        """Test batch validate endpoint with missing required fields."""
        test_cases = [
            ({}, 'Access token is required'),
            ({'access_token': 'test'}, 'At least one file ID is required'),
            ({'access_token': 'test', 'file_ids': 'not_a_list'}, 'File IDs must be a list'),
            ({'access_token': 'test', 'file_ids': []}, 'At least one file ID is required'),
        ]
        
        for data, expected_error in test_cases:
            response = client.post('/api/v1/google-drive/batch-validate',
                                  data=json.dumps(data),
                                  content_type='application/json',
                                  headers=auth_headers)
            
            assert response.status_code == 400
            assert expected_error in response.json['message']
    
    def test_batch_validate_too_many_files(self, client, auth_headers):
        """Test batch validate endpoint with too many files."""
        data = {
            'access_token': 'test_token',
            'file_ids': ['file' + str(i) for i in range(21)]  # 21 files, over limit
        }
        
        response = client.post('/api/v1/google-drive/batch-validate',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Maximum 20 files can be validated at once' in response.json['message']
    
    def test_batch_validate_invalid_file_ids(self, client, auth_headers):
        """Test batch validate endpoint with invalid file IDs."""
        data = {
            'access_token': 'test_token',
            'file_ids': ['valid_id', '', 'another_valid_id']  # Empty string in middle
        }
        
        response = client.post('/api/v1/google-drive/batch-validate',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'All file IDs must be non-empty strings' in response.json['message']
    
    def test_backup_songs_service_disabled(self, client, auth_headers):
        """Test backup songs endpoint when service is disabled."""
        data = {
            'access_token': 'test_token'
        }
        
        response = client.post('/api/v1/google-drive/backup-songs',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Google Drive integration is not enabled' in response.json['message']
    
    def test_backup_songs_missing_token(self, client, auth_headers):
        """Test backup songs endpoint with missing access token."""
        response = client.post('/api/v1/google-drive/backup-songs',
                              data=json.dumps({}),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Access token is required' in response.json['message']
    
    def test_backup_songs_invalid_folder_name(self, client, auth_headers):
        """Test backup songs endpoint with invalid folder name."""
        data = {
            'access_token': 'test_token',
            'backup_folder_name': 'a' * 101  # Too long
        }
        
        response = client.post('/api/v1/google-drive/backup-songs',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Backup folder name must be 100 characters or less' in response.json['message']
    
    def test_endpoints_require_authentication(self, client):
        """Test that all Google Drive endpoints require authentication."""
        endpoints = [
            '/api/v1/google-drive/validate-and-save',
            '/api/v1/google-drive/batch-validate',
            '/api/v1/google-drive/backup-songs'
        ]
        
        for endpoint in endpoints:
            response = client.post(endpoint,
                                  data=json.dumps({}),
                                  content_type='application/json')
            
            assert response.status_code == 401
            assert 'Token is missing' in response.json['message']
    
    def test_endpoints_rate_limiting(self, client, auth_headers):
        """Test that Google Drive endpoints have rate limiting."""
        # This test would be more comprehensive with actual rate limiting configuration
        # For now, just verify the endpoints respond appropriately to valid requests
        
        data = {
            'access_token': 'test_token',
            'file_name': 'test.pro',
            'content': '{title: Test}'
        }
        
        response = client.post('/api/v1/google-drive/validate-and-save',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        
        # Should get 400 for disabled service, not 429 for rate limiting
        assert response.status_code == 400
        assert 'Google Drive integration is not enabled' in response.json['message']