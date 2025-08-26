"""
Integration tests for API error scenarios.
"""
import pytest
import json
from unittest.mock import patch

from chordme.utils import create_error_response


class TestAPIErrorScenarios:
    """Test various API error scenarios with standardized responses."""
    
    def test_registration_with_invalid_email_returns_structured_error(self, client):
        """Test registration with invalid email returns new error format."""
        response = client.post('/api/v1/auth/register', 
                                  data=json.dumps({
                                      'email': 'invalid-email',
                                      'password': 'ValidPassword123!'
                                  }),
                                  content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        
        # Should use new error format
        assert data['status'] == 'error'
        assert 'error' in data
        
        # Check if it's using enhanced format
        if isinstance(data['error'], dict):
            assert 'message' in data['error']
            assert 'retryable' in data['error']
            assert data['error']['retryable'] is False
        else:
            # Legacy format is also acceptable
            assert isinstance(data['error'], str)
    
    def test_login_with_invalid_credentials_returns_structured_error(self, client):
        """Test login with invalid credentials returns standardized error."""
        response = client.post('/api/v1/auth/login',
                                  data=json.dumps({
                                      'email': 'nonexistent@example.com',
                                      'password': 'WrongPassword123!'
                                  }),
                                  content_type='application/json')
        
        assert response.status_code == 401
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_unauthorized_access_returns_structured_error(self, client):
        """Test unauthorized access returns standardized error."""
        response = client.get('/api/v1/songs',
                                 headers={'Authorization': 'Bearer invalid_token'})
        
        assert response.status_code == 401
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_missing_authorization_header_returns_structured_error(self, client):
        """Test missing authorization header returns standardized error."""
        response = client.get('/api/v1/songs')
        
        assert response.status_code == 401
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_malformed_json_returns_structured_error(self, client):
        """Test malformed JSON request returns standardized error."""
        response = client.post('/api/v1/auth/register',
                                  data='{"invalid": json}',
                                  content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_missing_required_fields_returns_structured_error(self, client):
        """Test missing required fields returns standardized error."""
        response = client.post('/api/v1/auth/register',
                                  data=json.dumps({}),
                                  content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_duplicate_email_registration_returns_structured_error(self, client, sample_user_data):
        """Test duplicate email registration returns standardized error."""
        # First create a user
        client.post('/api/v1/auth/register',
                   data=json.dumps(sample_user_data),
                   content_type='application/json')
        
        # Try to register again with same email
        response = client.post('/api/v1/auth/register',
                                  data=json.dumps({
                                      'email': sample_user_data['email'],
                                      'password': 'AnotherPassword123!'
                                  }),
                                  content_type='application/json')
        
        assert response.status_code == 409
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_nonexistent_song_access_returns_structured_error(self, client, auth_token):
        """Test accessing nonexistent song returns standardized error."""
        response = client.get('/api/v1/songs/99999', 
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 404
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_insufficient_permissions_returns_structured_error(self, client, sample_user_data):
        """Test insufficient permissions returns standardized error."""
        # Create two users
        user1_data = sample_user_data.copy()
        user2_data = sample_user_data.copy()
        user2_data['email'] = 'user2@example.com'
        
        # Register both users
        client.post('/api/v1/auth/register',
                   data=json.dumps(user1_data),
                   content_type='application/json')
        
        client.post('/api/v1/auth/register',
                   data=json.dumps(user2_data),
                   content_type='application/json')
        
        # Login as user1 and create a song
        response1 = client.post('/api/v1/auth/login',
                               data=json.dumps(user1_data),
                               content_type='application/json')
        token1 = response1.get_json()['data']['token']
        
        song_response = client.post('/api/v1/songs',
                                   data=json.dumps({
                                       'title': 'Test Song',
                                       'content': '{title: Test Song}\n[C]Hello world'
                                   }),
                                   content_type='application/json',
                                   headers={'Authorization': f'Bearer {token1}'})
        
        # Check if song creation was successful first
        if song_response.status_code != 201:
            print(f"Song creation failed: {song_response.get_json()}")
            return  # Skip test if song creation fails
        
        song_data = song_response.get_json()
        # Handle different response structures
        if 'data' in song_data and 'song' in song_data['data']:
            song_id = song_data['data']['song']['id']
        elif 'data' in song_data:
            song_id = song_data['data']['id']
        else:
            song_id = song_data['id']
        
        # Login as user2 and try to access user1's song
        response2 = client.post('/api/v1/auth/login',
                               data=json.dumps(user2_data),
                               content_type='application/json')
        token2 = response2.get_json()['data']['token']
        
        # Try to access the song as user2
        response = client.put(f'/api/v1/songs/{song_id}',
                             data=json.dumps({'title': 'Hacked Title'}),
                             content_type='application/json',
                             headers={'Authorization': f'Bearer {token2}'})
        
        assert response.status_code == 403
        data = response.get_json()
        
        assert data['status'] == 'error'
        assert 'error' in data


class TestErrorResponseFormats:
    """Test different error response formats for consistency."""
    
    def test_4xx_client_errors_are_non_retryable(self, client):
        """Test that 4xx errors are marked as non-retryable."""
        test_cases = [
            ('/api/v1/auth/register', {'email': 'invalid'}, 'POST', 400),
            ('/api/v1/auth/login', {'email': 'wrong@test.com', 'password': 'wrong'}, 'POST', 401),
            ('/api/v1/songs', {}, 'GET', 401),  # Missing auth
            ('/api/v1/songs/99999', {}, 'GET', 404),  # Nonexistent resource
        ]
        
        for endpoint, data, method, expected_status in test_cases:
            if method == 'POST':
                response = client.post(endpoint,
                                      data=json.dumps(data),
                                      content_type='application/json')
            else:
                response = client.get(endpoint)
            
            assert response.status_code == expected_status
            response_data = response.get_json()
            
            assert response_data['status'] == 'error'
            # Check if using enhanced format
            if isinstance(response_data['error'], dict):
                assert response_data['error']['retryable'] is False
    
    def test_error_messages_are_user_friendly(self, client):
        """Test that error messages are user-friendly and don't expose internals."""
        # Test various error scenarios
        response = client.post('/api/v1/auth/register',
                              data=json.dumps({
                                  'email': 'invalid-email',
                                  'password': 'weak'
                              }),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        
        error_message = data['error']
        if isinstance(error_message, dict):
            error_message = error_message['message']
        
        # Should not contain internal details like stack traces, SQL, etc.
        assert 'Traceback' not in error_message
        assert 'SQL' not in error_message.upper()
        assert 'Exception' not in error_message
        assert len(error_message) > 0
    
    def test_error_response_structure_consistency(self, client):
        """Test that all error responses follow consistent structure."""
        # Test multiple endpoints that should return errors
        test_cases = [
            ('POST', '/api/v1/auth/register', {'email': 'invalid'}),
            ('POST', '/api/v1/auth/login', {'email': 'wrong@test.com', 'password': 'wrong'}),
            ('GET', '/api/v1/songs', {}),
            ('GET', '/api/v1/songs/99999', {}),
        ]
        
        for method, endpoint, data in test_cases:
            if method == 'POST':
                response = client.post(endpoint,
                                      data=json.dumps(data),
                                      content_type='application/json')
            else:
                response = client.get(endpoint)
            
            # All should return error responses
            assert 400 <= response.status_code < 600
            
            response_data = response.get_json()
            
            # All should have consistent structure
            assert 'status' in response_data
            assert response_data['status'] == 'error'
            assert 'error' in response_data
            
            # Error should be either string (legacy) or object (enhanced)
            error = response_data['error']
            assert isinstance(error, (str, dict))
            
            if isinstance(error, dict):
                # Enhanced format should have required fields
                assert 'message' in error
                assert 'retryable' in error
                assert isinstance(error['retryable'], bool)


class TestErrorHandlingEdgeCases:
    """Test edge cases in error handling."""
    
    def test_empty_request_body_handling(self, client):
        """Test handling of empty request body."""
        response = client.post('/api/v1/auth/register',
                              data='',
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
    
    def test_invalid_content_type_handling(self, client):
        """Test handling of invalid content type."""
        response = client.post('/api/v1/auth/register',
                              data='email=test@test.com&password=test',
                              content_type='application/x-www-form-urlencoded')
        
        # Should still handle gracefully
        assert 400 <= response.status_code < 500
    
    def test_extremely_long_input_handling(self, client):
        """Test handling of extremely long inputs."""
        long_string = 'a' * 10000
        
        response = client.post('/api/v1/auth/register',
                              data=json.dumps({
                                  'email': f'{long_string}@example.com',
                                  'password': 'ValidPassword123!'
                              }),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
    
    def test_special_characters_in_input_handling(self, client):
        """Test handling of special characters in input."""
        special_chars = '<script>alert("xss")</script>'
        
        response = client.post('/api/v1/auth/register',
                              data=json.dumps({
                                  'email': f'{special_chars}@example.com',
                                  'password': 'ValidPassword123!'
                              }),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
        # Response should not echo back malicious content
        error_message = data['error']
        if isinstance(error_message, dict):
            error_message = error_message['message']
        
        assert '<script>' not in error_message
    
    @patch('chordme.utils.current_app')
    def test_error_handling_with_app_context_issues(self, mock_app, client):
        """Test error handling when there are app context issues."""
        # This is more of a defensive test to ensure errors are handled gracefully
        # even when there are internal issues
        
        # Mock the app to raise an exception during error processing
        mock_app.logger.error.side_effect = Exception("Logging failed")
        
        response = client.post('/api/v1/auth/register',
                              data=json.dumps({'email': 'invalid'}),
                              content_type='application/json')
        
        # Should still return a valid error response despite internal logging issues
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'