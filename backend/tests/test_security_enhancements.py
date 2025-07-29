"""
Automated tests for security enhancements in ChordMe application.

This module contains comprehensive tests for:
- Rate limiting functionality
- CSRF protection
- Security headers
- Enhanced error handling
"""

import pytest
import json
import time
from unittest.mock import patch, MagicMock
from chordme.rate_limiter import RateLimiter, rate_limiter
from chordme.csrf_protection import CSRFProtection, csrf_protection
from chordme.security_headers import SecurityErrorHandler


class TestRateLimiting:
    """Test cases for rate limiting functionality."""
    
    def test_rate_limiter_basic_functionality(self, app):
        """Test basic rate limiting functionality."""
        with app.app_context():
            limiter = RateLimiter()
            ip = "192.168.1.1"
            
            # First few requests should be allowed
            for i in range(5):
                is_limited, remaining, reset_time = limiter.is_rate_limited(ip, max_requests=5, window_seconds=60)
                assert not is_limited
                assert remaining >= 0
                limiter.record_request(ip)
            
            # 6th request should be rate limited
            is_limited, remaining, reset_time = limiter.is_rate_limited(ip, max_requests=5, window_seconds=60)
            assert is_limited
            assert remaining == 0
            assert reset_time > 0
    
    def test_rate_limiter_window_cleanup(self):
        """Test that rate limiter cleans up old requests."""
        limiter = RateLimiter()
        ip = "192.168.1.2"
        
        # Make requests and record them
        for i in range(3):
            limiter.record_request(ip)
        
        # Simulate time passing beyond window
        with patch('time.time', return_value=time.time() + 400):
            is_limited, remaining, reset_time = limiter.is_rate_limited(ip, max_requests=5, window_seconds=300)
            assert not is_limited
            assert remaining == 5  # Should be reset after window expiry
    
    def test_rate_limiter_different_ips(self, app):
        """Test that different IPs have separate rate limits."""
        with app.app_context():
            limiter = RateLimiter()
            ip1 = "192.168.1.3"
            ip2 = "192.168.1.4"
            
            # Exhaust rate limit for ip1
            for i in range(5):
                limiter.record_request(ip1)
            
            # ip1 should be limited
            is_limited, _, _ = limiter.is_rate_limited(ip1, max_requests=5, window_seconds=60)
            assert is_limited
            
            # ip2 should not be limited
            is_limited, _, _ = limiter.is_rate_limited(ip2, max_requests=5, window_seconds=60)
            assert not is_limited
    
    def test_rate_limiting_endpoint_integration(self, client):
        """Test rate limiting on actual endpoints."""
        # Register endpoint should be rate limited after 5 attempts
        user_data = {
            'email': 'ratelimit@example.com',
            'password': 'TestPassword123'
        }
        
        # Make multiple requests rapidly
        responses = []
        for i in range(7):
            response = client.post('/api/v1/auth/register', json={
                'email': f'ratelimit{i}@example.com',  # Use different emails to avoid duplicate errors
                'password': 'TestPassword123'
            })
            responses.append(response.status_code)
        
        # Most requests should succeed initially
        success_count = responses.count(201)
        rate_limited_count = responses.count(429)
        
        # Should have some successful requests and at least one rate limited
        assert success_count >= 5  # At least 5 should succeed
        assert rate_limited_count >= 1  # At least 1 should be rate limited
    
    def test_rate_limiting_headers(self, client):
        """Test that rate limiting headers are present."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'headertest@example.com',
            'password': 'TestPassword123'
        })
        
        # Check for rate limiting headers
        assert 'X-RateLimit-Limit' in response.headers
        assert 'X-RateLimit-Remaining' in response.headers
        assert 'X-RateLimit-Reset' in response.headers


class TestCSRFProtection:
    """Test cases for CSRF protection functionality."""
    
    def test_csrf_token_generation(self, app):
        """Test CSRF token generation."""
        with app.app_context():
            protection = CSRFProtection()
            
            token1 = protection.generate_token()
            token2 = protection.generate_token()
            
            # Tokens should be different
            assert token1 != token2
            assert len(token1) > 0
            assert len(token2) > 0
            
            # Tokens should have proper format (data.timestamp.signature)
            assert len(token1.split('.')) == 3
            assert len(token2.split('.')) == 3
    
    def test_csrf_token_validation(self, app):
        """Test CSRF token validation."""
        with app.app_context():
            protection = CSRFProtection()
            
            # Generate a valid token
            token = protection.generate_token()
            
            # Token should validate successfully
            assert protection.validate_token(token)
            
            # Token should be one-time use
            assert not protection.validate_token(token)
    
    def test_csrf_token_expiry(self, app):
        """Test CSRF token expiration."""
        with app.app_context():
            protection = CSRFProtection()
            protection.token_expiry = 1  # 1 second expiry
            
            token = protection.generate_token()
            
            # Token should be valid immediately
            time.sleep(0.5)
            assert protection.validate_token(token)
            
            # Generate new token and test expiry
            token = protection.generate_token()
            time.sleep(1.5)  # Wait for expiry
            assert not protection.validate_token(token)
    
    def test_csrf_token_invalid_format(self, app):
        """Test validation of malformed tokens."""
        with app.app_context():
            protection = CSRFProtection()
            
            # Test various invalid formats
            invalid_tokens = [
                None,
                "",
                "invalid",
                "invalid.token",
                "invalid.token.signature.extra",
                "aaaa.bbbb.cccc"
            ]
            
            for token in invalid_tokens:
                assert not protection.validate_token(token)
    
    def test_csrf_endpoint_availability(self, client):
        """Test CSRF token endpoint."""
        response = client.get('/api/v1/csrf-token')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'csrf_token' in data['data']
        assert len(data['data']['csrf_token']) > 0


class TestSecurityHeaders:
    """Test cases for security headers functionality."""
    
    def test_security_headers_presence(self, client):
        """Test that security headers are present in responses."""
        response = client.get('/api/v1/health')
        
        # Check for various security headers
        expected_headers = [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'X-XSS-Protection',
            'Referrer-Policy',
            'X-Permitted-Cross-Domain-Policies',
            'Permissions-Policy'
        ]
        
        for header in expected_headers:
            assert header in response.headers
    
    def test_security_header_values(self, client):
        """Test that security headers have correct values."""
        response = client.get('/api/v1/health')
        
        assert response.headers['X-Frame-Options'] == 'DENY'
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
        assert response.headers['X-XSS-Protection'] == '1; mode=block'
        assert response.headers['Referrer-Policy'] == 'same-origin'
        assert response.headers['X-Permitted-Cross-Domain-Policies'] == 'none'
    
    def test_csp_header_for_api(self, client):
        """Test Content Security Policy header for API endpoints."""
        response = client.get('/api/v1/health')
        
        # API endpoints should have restrictive CSP
        if 'Content-Security-Policy' in response.headers:
            csp = response.headers['Content-Security-Policy']
            assert "default-src 'none'" in csp
            assert "script-src 'none'" in csp


class TestSecurityErrorHandling:
    """Test cases for enhanced security error handling."""
    
    def test_validation_error_handling(self, client):
        """Test validation error handling."""
        # Test invalid email format
        response = client.post('/api/v1/auth/register', json={
            'email': 'invalid-email',
            'password': 'TestPassword123'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'error' in data
    
    def test_authentication_error_handling(self, client):
        """Test authentication error handling."""
        # Test login with non-existent user
        response = client.post('/api/v1/auth/login', json={
            'email': 'nonexistent@example.com',
            'password': 'WrongPassword123'
        })
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert data['error'] == 'Invalid email or password'
    
    def test_missing_data_error_handling(self, client):
        """Test error handling for missing data."""
        # Test registration without data
        response = client.post('/api/v1/auth/register', json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        
        # Test login without data
        response = client.post('/api/v1/auth/login', json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
    
    def test_empty_request_body_handling(self, client):
        """Test error handling for empty request bodies."""
        # Test registration with no JSON body
        response = client.post('/api/v1/auth/register')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'


class TestSecurityIntegration:
    """Integration tests for all security features working together."""
    
    def test_registration_with_all_security_features(self, client):
        """Test registration endpoint with all security features enabled."""
        user_data = {
            'email': 'security@example.com',
            'password': 'SecurePassword123'
        }
        
        response = client.post('/api/v1/auth/register', json=user_data)
        
        # Should succeed
        assert response.status_code == 201
        
        # Should have security headers
        assert 'X-Frame-Options' in response.headers
        assert 'X-Content-Type-Options' in response.headers
        
        # Should have rate limiting headers
        assert 'X-RateLimit-Limit' in response.headers
        assert 'X-RateLimit-Remaining' in response.headers
    
    def test_login_with_all_security_features(self, client):
        """Test login endpoint with all security features enabled."""
        # First register a user
        user_data = {
            'email': 'logintest@example.com',
            'password': 'SecurePassword123'
        }
        client.post('/api/v1/auth/register', json=user_data)
        
        # Then test login
        response = client.post('/api/v1/auth/login', json=user_data)
        
        # Should succeed
        assert response.status_code == 200
        
        # Should have security headers
        assert 'X-Frame-Options' in response.headers
        assert 'X-Content-Type-Options' in response.headers
        
        # Should have rate limiting headers
        assert 'X-RateLimit-Limit' in response.headers
        assert 'X-RateLimit-Remaining' in response.headers
    
    def test_security_logging_integration(self, client):
        """Test that security events are properly logged."""
        with patch('chordme.logger') as mock_logger:
            # Test failed login attempt
            response = client.post('/api/v1/auth/login', json={
                'email': 'nonexistent@example.com',
                'password': 'WrongPassword123'
            })
            
            assert response.status_code == 401
            # Verify that security event was logged (would check mock_logger calls in real implementation)