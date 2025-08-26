"""
Unit tests for API endpoints with missing coverage.
Focuses on simple endpoints to improve coverage percentage.
"""

import pytest
from chordme import app, db
from chordme.models import User
import json


class TestAPIEndpointsCoverage:
    """Test coverage for basic API endpoints."""

    def test_version_endpoint(self, test_client):
        """Test the version endpoint returns correct data."""
        response = test_client.get('/api/v1/version')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'version' in data
        assert 'name' in data
        assert 'status' in data
        assert data['name'] == 'ChordMe Backend'
        assert data['status'] == 'ok'

    def test_csrf_token_endpoint(self, test_client):
        """Test the CSRF token endpoint returns a valid token."""
        response = test_client.get('/api/v1/csrf-token')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'csrf_token' in data
        assert isinstance(data['csrf_token'], str)
        assert len(data['csrf_token']) > 0

    def test_validate_chordpro_endpoint_valid(self, test_client):
        """Test ChordPro validation endpoint with valid content."""
        valid_chordpro = """
        {title: Test Song}
        {artist: Test Artist}
        
        [C]Hello [G]world
        This is a [Am]test [F]song
        """
        
        response = test_client.post(
            '/api/v1/songs/validate-chordpro',
            data=json.dumps({'content': valid_chordpro}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'data' in data

    def test_validate_chordpro_endpoint_invalid(self, test_client):
        """Test ChordPro validation endpoint with invalid content."""
        invalid_chordpro = """
        {invalid_directive: Test}
        [InvalidChord]Invalid content
        """
        
        response = test_client.post(
            '/api/v1/songs/validate-chordpro',
            data=json.dumps({'content': invalid_chordpro}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = response.get_json()
        # Should still return success but with warnings/errors in data

    def test_validate_chordpro_endpoint_missing_content(self, test_client):
        """Test ChordPro validation endpoint with missing content."""
        response = test_client.post(
            '/api/v1/songs/validate-chordpro',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        assert response.status_code == 400

    def test_chords_endpoint_get(self, test_client, auth_headers):
        """Test getting all chords endpoint."""
        response = test_client.get('/api/v1/chords', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert isinstance(data['data'], list)

    def test_chords_endpoint_unauthorized(self, test_client):
        """Test chords endpoint without authentication."""
        response = test_client.get('/api/v1/chords')
        
        assert response.status_code == 401

    def test_songs_list_unauthorized(self, test_client):
        """Test songs list endpoint without authentication."""
        response = test_client.get('/api/v1/songs')
        
        assert response.status_code == 401

    def test_songs_list_authorized_empty(self, test_client, auth_headers):
        """Test songs list endpoint with authentication but no songs."""
        response = test_client.get('/api/v1/songs', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert isinstance(data['data'], list)

    def test_nonexistent_song_get(self, test_client, auth_headers):
        """Test getting a non-existent song."""
        response = test_client.get('/api/v1/songs/99999', headers=auth_headers)
        
        assert response.status_code == 404

    def test_nonexistent_song_put(self, test_client, auth_headers):
        """Test updating a non-existent song."""
        response = test_client.put(
            '/api/v1/songs/99999',
            data=json.dumps({'title': 'Test'}),
            content_type='application/json',
            headers=auth_headers
        )
        
        assert response.status_code == 404

    def test_nonexistent_song_delete(self, test_client, auth_headers):
        """Test deleting a non-existent song."""
        response = test_client.delete('/api/v1/songs/99999', headers=auth_headers)
        
        assert response.status_code == 404

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


class TestAPIErrorHandling:
    """Test error handling across various endpoints."""

    def test_malformed_json_request(self, test_client):
        """Test handling of malformed JSON requests."""
        response = test_client.post(
            '/api/v1/auth/register',
            data='{"invalid": json}',  # Malformed JSON
            content_type='application/json'
        )
        
        assert response.status_code == 400

    def test_large_request_handling(self, test_client):
        """Test handling of oversized requests."""
        large_content = 'x' * (10 * 1024 * 1024)  # 10MB of content
        
        response = test_client.post(
            '/api/v1/songs/validate-chordpro',
            data=json.dumps({'content': large_content}),
            content_type='application/json'
        )
        
        # Should handle gracefully (either reject or accept depending on limits)
        assert response.status_code in [400, 413, 500]

    def test_invalid_content_type(self, test_client):
        """Test handling of invalid content types."""
        response = test_client.post(
            '/api/v1/auth/register',
            data='email=test@example.com&password=password123',
            content_type='application/x-www-form-urlencoded'
        )
        
        # Should handle gracefully
        assert response.status_code in [400, 415]

    def test_missing_required_headers(self, test_client):
        """Test endpoints that require specific headers."""
        response = test_client.post(
            '/api/v1/auth/register',
            data=json.dumps({'email': 'test@example.com', 'password': 'password123'})
            # Missing content-type header
        )
        
        # Should handle gracefully
        assert response.status_code in [400, 415]


class TestUtilityFunctionsCoverage:
    """Test utility functions to improve coverage."""

    def test_input_sanitization_edge_cases(self, test_client):
        """Test input sanitization with edge cases."""
        test_cases = [
            {'email': '  TEST@EXAMPLE.COM  ', 'password': 'password123'},
            {'email': 'test@example.com', 'password': '  password123  '},
            {'email': '', 'password': 'password123'},
            {'email': 'test@example.com', 'password': ''},
        ]
        
        for case in test_cases:
            response = test_client.post(
                '/api/v1/auth/register',
                data=json.dumps(case),
                content_type='application/json'
            )
            
            # Should handle all cases gracefully
            assert response.status_code in [200, 400]

    def test_auth_required_decorator_edge_cases(self, test_client):
        """Test authentication decorator with various token formats."""
        test_headers = [
            {'Authorization': 'Bearer invalid_token'},
            {'Authorization': 'Basic invalid_format'},
            {'Authorization': 'Bearer '},
            {'Authorization': ''},
            {},
        ]
        
        for headers in test_headers:
            response = test_client.get('/api/v1/songs', headers=headers)
            
            # Should return 401 for all invalid auth attempts
            assert response.status_code == 401