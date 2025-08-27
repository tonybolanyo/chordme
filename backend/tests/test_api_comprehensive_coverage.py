"""
Additional test coverage for API endpoints and core functionality.
Focus on improving coverage for the main API module which has the highest impact.
"""

import pytest
import json
from unittest.mock import patch, MagicMock


class TestAPIEndpointsBasicCoverage:
    """Basic coverage tests for API endpoints."""
    
    def test_version_endpoint_detailed(self, client):
        """Test version endpoint in detail."""
        response = client.get('/api/v1/version')
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Test all expected fields
        assert 'version' in data
        assert 'name' in data
        assert 'status' in data
        
        # Test specific values
        assert data['name'] == 'ChordMe Backend'
        assert data['status'] == 'ok'
        assert isinstance(data['version'], str)
        
    def test_health_endpoint_detailed(self, client):
        """Test health endpoint in detail."""
        response = client.get('/api/v1/health')
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Test all expected fields
        assert 'status' in data
        assert 'message' in data
        
        # Test specific values
        assert data['status'] == 'ok'
        assert 'Service is running' in data['message']
        
    def test_csrf_token_endpoint_detailed(self, client):
        """Test CSRF token endpoint in detail."""
        response = client.get('/api/v1/csrf-token')
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Test that we get some form of token response
        assert 'csrf_token' in str(data).lower() or 'token' in str(data).lower()
        
    def test_registration_endpoint_comprehensive(self, client):
        """Test registration endpoint with various inputs."""
        # Test valid registration
        valid_data = {
            'email': 'test@example.com',
            'password': 'ValidPassword123!'
        }
        
        response = client.post('/api/v1/auth/register',
                               data=json.dumps(valid_data),
                               content_type='application/json')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        
    def test_registration_validation_cases(self, client):
        """Test registration input validation."""
        test_cases = [
            # Missing email
            ({'password': 'ValidPassword123!'}, 400),
            # Missing password
            ({'email': 'test@example.com'}, 400),
            # Invalid email format
            ({'email': 'invalid-email', 'password': 'ValidPassword123!'}, 400),
            # Weak password
            ({'email': 'test2@example.com', 'password': 'weak'}, 400),
            # Empty data
            ({}, 400),
        ]
        
        for data, expected_status in test_cases:
            response = client.post('/api/v1/auth/register',
                                   data=json.dumps(data),
                                   content_type='application/json')
            assert response.status_code == expected_status
            
    def test_login_endpoint_comprehensive(self, client):
        """Test login endpoint after registration."""
        # First register a user
        user_data = {
            'email': 'login_test@example.com',
            'password': 'ValidPassword123!'
        }
        
        register_response = client.post('/api/v1/auth/register',
                                        data=json.dumps(user_data),
                                        content_type='application/json')
        assert register_response.status_code == 201
        
        # Then test login
        login_response = client.post('/api/v1/auth/login',
                                     data=json.dumps(user_data),
                                     content_type='application/json')
        
        assert login_response.status_code == 200
        login_data = login_response.get_json()
        assert login_data['status'] == 'success'
        assert 'token' in login_data['data']
        
    def test_login_validation_cases(self, client):
        """Test login input validation."""
        test_cases = [
            # Missing email
            ({'password': 'ValidPassword123!'}, 400),
            # Missing password
            ({'email': 'test@example.com'}, 400),
            # Invalid credentials
            ({'email': 'nonexistent@example.com', 'password': 'WrongPassword123!'}, 401),
            # Empty data
            ({}, 400),
        ]
        
        for data, expected_status in test_cases:
            response = client.post('/api/v1/auth/login',
                                   data=json.dumps(data),
                                   content_type='application/json')
            assert response.status_code == expected_status
            
    def test_chordpro_validation_endpoint(self, client):
        """Test ChordPro validation endpoint."""
        # Test valid ChordPro content
        valid_content = {
            'content': '{title: Test Song}\n{artist: Test Artist}\n[C]This is a test [G]song'
        }
        
        response = client.post('/api/v1/songs/validate-chordpro',
                               data=json.dumps(valid_content),
                               content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        
    def test_chordpro_validation_edge_cases(self, client):
        """Test ChordPro validation with edge cases."""
        test_cases = [
            # Empty content
            ({'content': ''}, 400),
            # Missing content field
            ({}, 400),
            # Very simple content
            ({'content': '[C]Simple'}, 200),
            # Content with special characters
            ({'content': '{title: Test}\n[C]Test & more'}, 200),
        ]
        
        for data, expected_status in test_cases:
            response = client.post('/api/v1/songs/validate-chordpro',
                                   data=json.dumps(data),
                                   content_type='application/json')
            assert response.status_code == expected_status
            
    def test_transpose_chordpro_endpoint(self, client):
        """Test ChordPro transposition endpoint."""
        # Test valid transposition
        transpose_data = {
            'content': '[C]Test [G]content [Am]here',
            'semitones': 2
        }
        
        response = client.post('/api/v1/songs/transpose-chordpro',
                               data=json.dumps(transpose_data),
                               content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'transposed_content' in data['data']
        
    def test_transpose_chordpro_validation(self, client):
        """Test ChordPro transposition validation."""
        test_cases = [
            # Invalid semitones (too high)
            ({'content': '[C]Test', 'semitones': 15}, 400),
            # Invalid semitones (too low)
            ({'content': '[C]Test', 'semitones': -15}, 400),
            # Missing content
            ({'semitones': 2}, 400),
            # Missing semitones
            ({'content': '[C]Test'}, 400),
        ]
        
        for data, expected_status in test_cases:
            response = client.post('/api/v1/songs/transpose-chordpro',
                                   data=json.dumps(data),
                                   content_type='application/json')
            assert response.status_code == expected_status


class TestAPIErrorHandling:
    """Test API error handling scenarios."""
    
    def test_malformed_json_requests(self, client):
        """Test API handling of malformed JSON."""
        endpoints = [
            '/api/v1/auth/register',
            '/api/v1/auth/login',
            '/api/v1/songs/validate-chordpro',
            '/api/v1/songs/transpose-chordpro'
        ]
        
        for endpoint in endpoints:
            response = client.post(endpoint,
                                   data='{"invalid": json}',
                                   content_type='application/json')
            assert response.status_code == 400
            
    def test_missing_content_type(self, client):
        """Test API handling of missing content type."""
        endpoints = [
            '/api/v1/auth/register',
            '/api/v1/auth/login'
        ]
        
        for endpoint in endpoints:
            response = client.post(endpoint,
                                   data='{"test": "data"}')
            # Should be 400 (bad request) or 415 (unsupported media type)
            assert response.status_code in [400, 415]
            
    def test_empty_requests(self, client):
        """Test API handling of empty requests."""
        endpoints = [
            '/api/v1/auth/register',
            '/api/v1/auth/login',
            '/api/v1/songs/validate-chordpro',
            '/api/v1/songs/transpose-chordpro'
        ]
        
        for endpoint in endpoints:
            response = client.post(endpoint,
                                   data='',
                                   content_type='application/json')
            assert response.status_code == 400
            
    def test_nonexistent_endpoints(self, client):
        """Test accessing non-existent API endpoints."""
        non_existent = [
            '/api/v1/nonexistent',
            '/api/v1/songs/invalid',
            '/api/v2/auth/register',  # Wrong version
        ]
        
        for endpoint in non_existent:
            response = client.get(endpoint)
            assert response.status_code == 404
            
    def test_method_not_allowed(self, client):
        """Test method not allowed scenarios."""
        # Try POST on GET endpoints
        get_endpoints = [
            '/api/v1/health',
            '/api/v1/version',
            '/api/v1/csrf-token'
        ]
        
        for endpoint in get_endpoints:
            response = client.post(endpoint)
            assert response.status_code == 405
            
        # Try GET on POST endpoints  
        post_endpoints = [
            '/api/v1/auth/register',
            '/api/v1/auth/login',
            '/api/v1/songs/validate-chordpro',
            '/api/v1/songs/transpose-chordpro'
        ]
        
        for endpoint in post_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 405
            
    def test_options_requests(self, client):
        """Test OPTIONS requests for CORS."""
        endpoints = [
            '/api/v1/health',
            '/api/v1/version',
            '/api/v1/auth/register',
            '/api/v1/auth/login'
        ]
        
        for endpoint in endpoints:
            response = client.options(endpoint)
            # Should handle OPTIONS gracefully
            assert response.status_code in [200, 204, 405]


class TestAPIInputSanitization:
    """Test API input sanitization and security."""
    
    def test_xss_prevention_in_registration(self, client):
        """Test XSS prevention in registration."""
        malicious_data = {
            'email': '<script>alert("xss")</script>@example.com',
            'password': 'ValidPassword123!'
        }
        
        response = client.post('/api/v1/auth/register',
                               data=json.dumps(malicious_data),
                               content_type='application/json')
        
        # Should be rejected due to invalid email format
        assert response.status_code in [400, 422]
        
    def test_sql_injection_prevention(self, client):
        """Test SQL injection prevention."""
        malicious_data = {
            'email': "'; DROP TABLE users; --@example.com",
            'password': 'ValidPassword123!'
        }
        
        response = client.post('/api/v1/auth/register',
                               data=json.dumps(malicious_data),
                               content_type='application/json')
        
        # Should be rejected due to invalid email format
        assert response.status_code in [400, 422]
        
    def test_large_payload_handling(self, client):
        """Test handling of large payloads."""
        large_data = {
            'email': 'test@example.com',
            'password': 'ValidPassword123!',
            'extra_field': 'x' * 50000  # Large field
        }
        
        response = client.post('/api/v1/auth/register',
                               data=json.dumps(large_data),
                               content_type='application/json')
        
        # Should handle gracefully
        assert response.status_code in [200, 201, 400, 413]
        
    def test_unicode_handling(self, client):
        """Test unicode character handling."""
        unicode_data = {
            'email': 'test@例え.テスト',
            'password': 'ValidPassword123!'
        }
        
        response = client.post('/api/v1/auth/register',
                               data=json.dumps(unicode_data),
                               content_type='application/json')
        
        # May be valid or invalid depending on implementation
        assert response.status_code in [200, 201, 400, 422]


class TestChordProUtilsAdditional:
    """Additional tests for ChordPro utilities."""
    
    def test_chordpro_validator_basic(self):
        """Test ChordProValidator basic functionality."""
        from chordme.chordpro_utils import ChordProValidator
        
        validator = ChordProValidator()
        assert validator is not None
        
    def test_validate_chordpro_content_variations(self):
        """Test validate_chordpro_content with various inputs."""
        from chordme.chordpro_utils import validate_chordpro_content
        
        test_cases = [
            '{title: Test Song}\n[C]Simple song',
            '{title: Complex Song}\n{artist: Artist}\n{key: C}\n[C]Verse [G]here\n{chorus}\n[Am]Chorus [F]line',
            '[C]Just chords',
            'Just lyrics no chords',
            '{title: Unicode Test}\n[C]Test with émojis 🎵',
        ]
        
        for content in test_cases:
            result = validate_chordpro_content(content)
            assert isinstance(result, dict)
            # Should have some validation result
            assert 'valid' in result or 'errors' in result or 'warnings' in result
            
    def test_chordpro_empty_content(self):
        """Test ChordPro validation with empty content."""
        from chordme.chordpro_utils import validate_chordpro_content
        
        result = validate_chordpro_content('')
        assert isinstance(result, dict)


class TestRateLimiterAdditional:
    """Additional tests for rate limiter."""
    
    def test_rate_limiter_record_request(self):
        """Test record_request method."""
        from chordme.rate_limiter import RateLimiter
        
        limiter = RateLimiter()
        
        # Test recording requests
        limiter.record_request('192.168.1.1')
        limiter.record_request('192.168.1.1')
        
        # Should have recorded requests
        assert '192.168.1.1' in limiter.requests
        assert len(limiter.requests['192.168.1.1']) == 2
        
    def test_rate_limiter_multiple_ips(self):
        """Test rate limiter with multiple IPs."""
        from chordme.rate_limiter import RateLimiter
        
        limiter = RateLimiter()
        
        # Test with different IPs
        ips = ['192.168.1.1', '192.168.1.2', '10.0.0.1']
        
        for ip in ips:
            is_limited, remaining, reset_time = limiter.is_rate_limited(ip)
            assert is_limited is False
            assert remaining >= 0
            
        # All IPs should be tracked
        assert len(limiter.requests) == len(ips)
        
    def test_rate_limiter_edge_cases(self):
        """Test rate limiter edge cases."""
        from chordme.rate_limiter import RateLimiter
        
        limiter = RateLimiter()
        
        # Test with None IP
        is_limited, remaining, reset_time = limiter.is_rate_limited(None)
        assert isinstance(is_limited, bool)
        assert isinstance(remaining, int)
        assert isinstance(reset_time, int)
        
        # Test with empty string IP
        is_limited, remaining, reset_time = limiter.is_rate_limited('')
        assert isinstance(is_limited, bool)
        assert isinstance(remaining, int)
        assert isinstance(reset_time, int)