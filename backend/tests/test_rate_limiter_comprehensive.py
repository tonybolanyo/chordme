"""
Comprehensive tests for rate limiting functionality.
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from flask import Flask, request
from chordme.rate_limiter import RateLimiter, rate_limit


class TestRateLimiter:
    """Test RateLimiter class functionality."""
    
    def test_rate_limiter_init_default(self):
        """Test rate limiter initialization with default values."""
        limiter = RateLimiter()
        
        assert limiter.max_requests == 100
        assert limiter.time_window == 3600  # 1 hour in seconds
        assert limiter.storage == {}
        
    def test_rate_limiter_init_custom(self):
        """Test rate limiter initialization with custom values."""
        limiter = RateLimiter(max_requests=50, time_window=1800)
        
        assert limiter.max_requests == 50
        assert limiter.time_window == 1800  # 30 minutes
        
    def test_rate_limiter_allow_first_request(self):
        """Test that first request is always allowed."""
        limiter = RateLimiter(max_requests=5, time_window=60)
        
        result = limiter.is_request_allowed("test_client")
        
        assert result is True
        assert "test_client" in limiter.storage
        assert limiter.storage["test_client"]["count"] == 1
        
    def test_rate_limiter_allow_within_limit(self):
        """Test requests within rate limit are allowed."""
        limiter = RateLimiter(max_requests=5, time_window=60)
        
        # Make several requests within limit
        for i in range(5):
            result = limiter.is_request_allowed("test_client")
            assert result is True
            
        # Verify count
        assert limiter.storage["test_client"]["count"] == 5
        
    def test_rate_limiter_block_over_limit(self):
        """Test requests over rate limit are blocked."""
        limiter = RateLimiter(max_requests=3, time_window=60)
        
        # Make requests up to limit
        for i in range(3):
            result = limiter.is_request_allowed("test_client")
            assert result is True
            
        # Next request should be blocked
        result = limiter.is_request_allowed("test_client")
        assert result is False
        
        # Count should not increase
        assert limiter.storage["test_client"]["count"] == 3
        
    def test_rate_limiter_window_reset(self):
        """Test rate limit window reset functionality."""
        limiter = RateLimiter(max_requests=2, time_window=1)  # 1 second window
        
        # Make requests up to limit
        for i in range(2):
            result = limiter.is_request_allowed("test_client")
            assert result is True
            
        # Should be blocked
        result = limiter.is_request_allowed("test_client")
        assert result is False
        
        # Wait for window to reset
        time.sleep(1.1)
        
        # Should be allowed again
        result = limiter.is_request_allowed("test_client")
        assert result is True
        assert limiter.storage["test_client"]["count"] == 1
        
    def test_rate_limiter_multiple_clients(self):
        """Test rate limiting with multiple clients."""
        limiter = RateLimiter(max_requests=2, time_window=60)
        
        # Client 1 makes requests
        for i in range(2):
            result = limiter.is_request_allowed("client1")
            assert result is True
            
        # Client 1 should be blocked
        result = limiter.is_request_allowed("client1")
        assert result is False
        
        # Client 2 should still be allowed
        result = limiter.is_request_allowed("client2")
        assert result is True
        
    def test_rate_limiter_cleanup_expired(self):
        """Test cleanup of expired entries."""
        limiter = RateLimiter(max_requests=5, time_window=1)  # 1 second window
        
        # Make a request
        limiter.is_request_allowed("test_client")
        assert "test_client" in limiter.storage
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Make another request (should trigger cleanup)
        limiter.is_request_allowed("test_client")
        
        # Entry should be reset (count should be 1, not 2)
        assert limiter.storage["test_client"]["count"] == 1
        
    def test_rate_limiter_get_remaining_requests(self):
        """Test getting remaining requests for a client."""
        limiter = RateLimiter(max_requests=5, time_window=60)
        
        # Initially should have full limit
        remaining = limiter.get_remaining_requests("test_client")
        assert remaining == 5
        
        # After one request
        limiter.is_request_allowed("test_client")
        remaining = limiter.get_remaining_requests("test_client")
        assert remaining == 4
        
        # After hitting limit
        for i in range(4):
            limiter.is_request_allowed("test_client")
        remaining = limiter.get_remaining_requests("test_client")
        assert remaining == 0
        
    def test_rate_limiter_get_reset_time(self):
        """Test getting reset time for rate limit window."""
        limiter = RateLimiter(max_requests=5, time_window=60)
        
        # Make a request
        limiter.is_request_allowed("test_client")
        
        reset_time = limiter.get_reset_time("test_client")
        assert reset_time > time.time()
        assert reset_time <= time.time() + 60


class TestRateLimitDecorator:
    """Test rate_limit decorator functionality."""
    
    def test_rate_limit_decorator_basic(self, app):
        """Test basic rate limit decorator functionality."""
        with app.app_context():
            limiter = RateLimiter(max_requests=2, time_window=60)
            
            @rate_limit(limiter)
            def test_endpoint():
                return "success"
            
            # First requests should succeed
            result = test_endpoint()
            assert result == "success"
            
            result = test_endpoint()
            assert result == "success"
            
            # Third request should be blocked
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                mock_request.headers = {}
                
                result = test_endpoint()
                # Should return rate limit response
                assert result != "success"
                
    def test_rate_limit_decorator_disabled(self, app):
        """Test rate limit decorator when rate limiting is disabled."""
        with app.app_context():
            with patch('chordme.rate_limiter.current_app') as mock_app:
                mock_app.config = {'RATE_LIMITING_ENABLED': False}
                
                limiter = RateLimiter(max_requests=1, time_window=60)
                
                @rate_limit(limiter)
                def test_endpoint():
                    return "success"
                
                # Should always succeed when disabled
                for i in range(5):
                    result = test_endpoint()
                    assert result == "success"
                    
    def test_rate_limit_decorator_with_custom_response(self, app):
        """Test rate limit decorator with custom rate limit response."""
        with app.app_context():
            limiter = RateLimiter(max_requests=1, time_window=60)
            
            @rate_limit(limiter, rate_limit_response={"error": "custom limit"})
            def test_endpoint():
                return "success"
            
            # First request should succeed
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                mock_request.headers = {}
                
                result = test_endpoint()
                assert result == "success"
                
                # Second request should return custom response
                result = test_endpoint()
                assert result != "success"


class TestClientIdentifier:
    """Test client identifier functionality."""
    
    def test_get_client_identifier_ip_only(self, app):
        """Test client identifier with IP address only."""
        with app.test_request_context(environ_base={'REMOTE_ADDR': '192.168.1.1'}):
            identifier = get_client_identifier()
            assert identifier == "192.168.1.1"
            
    def test_get_client_identifier_with_forwarded_header(self, app):
        """Test client identifier with X-Forwarded-For header."""
        headers = {'X-Forwarded-For': '203.0.113.1, 198.51.100.1'}
        with app.test_request_context(environ_base={'REMOTE_ADDR': '192.168.1.1'}, headers=headers):
            identifier = get_client_identifier()
            assert identifier == "203.0.113.1"  # Should use first IP from header
            
    def test_get_client_identifier_with_real_ip_header(self, app):
        """Test client identifier with X-Real-IP header."""
        headers = {'X-Real-IP': '203.0.113.1'}
        with app.test_request_context(environ_base={'REMOTE_ADDR': '192.168.1.1'}, headers=headers):
            identifier = get_client_identifier()
            assert identifier == "203.0.113.1"
            
    def test_get_client_identifier_header_priority(self, app):
        """Test client identifier header priority."""
        headers = {
            'X-Forwarded-For': '203.0.113.1',
            'X-Real-IP': '198.51.100.1'
        }
        with app.test_request_context(environ_base={'REMOTE_ADDR': '192.168.1.1'}, headers=headers):
            identifier = get_client_identifier()
            # X-Forwarded-For should take priority
            assert identifier == "203.0.113.1"
            
    def test_get_client_identifier_invalid_header(self, app):
        """Test client identifier with invalid header values."""
        headers = {'X-Forwarded-For': 'invalid-ip'}
        with app.test_request_context(environ_base={'REMOTE_ADDR': '192.168.1.1'}, headers=headers):
            identifier = get_client_identifier()
            # Should fall back to remote address
            assert identifier == "192.168.1.1"
            
    def test_get_client_identifier_empty_header(self, app):
        """Test client identifier with empty header values."""
        headers = {'X-Forwarded-For': ''}
        with app.test_request_context(environ_base={'REMOTE_ADDR': '192.168.1.1'}, headers=headers):
            identifier = get_client_identifier()
            # Should fall back to remote address
            assert identifier == "192.168.1.1"


class TestRateLimitIntegration:
    """Test rate limiting integration scenarios."""
    
    def test_rate_limit_with_authentication(self, app):
        """Test rate limiting behavior with authenticated users."""
        with app.app_context():
            limiter = RateLimiter(max_requests=2, time_window=60)
            
            @rate_limit(limiter)
            def authenticated_endpoint():
                return "authenticated success"
            
            # Mock authenticated request
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                mock_request.headers = {'Authorization': 'Bearer token123'}
                
                # Should still be rate limited
                result = authenticated_endpoint()
                assert result == "authenticated success"
                
                result = authenticated_endpoint()
                assert result == "authenticated success"
                
                # Third request should be blocked
                result = authenticated_endpoint()
                assert result != "authenticated success"
                
    def test_rate_limit_different_endpoints(self, app):
        """Test rate limiting with different endpoints sharing same limiter."""
        with app.app_context():
            limiter = RateLimiter(max_requests=3, time_window=60)
            
            @rate_limit(limiter)
            def endpoint1():
                return "endpoint1"
            
            @rate_limit(limiter)
            def endpoint2():
                return "endpoint2"
            
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                mock_request.headers = {}
                
                # Requests to both endpoints should count toward same limit
                result = endpoint1()
                assert result == "endpoint1"
                
                result = endpoint2()
                assert result == "endpoint2"
                
                result = endpoint1()
                assert result == "endpoint1"
                
                # Fourth request to either endpoint should be blocked
                result = endpoint2()
                assert result != "endpoint2"
                
    def test_rate_limit_concurrent_requests(self, app):
        """Test rate limiting with concurrent requests simulation."""
        with app.app_context():
            limiter = RateLimiter(max_requests=5, time_window=60)
            
            @rate_limit(limiter)
            def concurrent_endpoint():
                return "concurrent success"
            
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                mock_request.headers = {}
                
                # Simulate rapid concurrent requests
                results = []
                for i in range(10):
                    result = concurrent_endpoint()
                    results.append(result == "concurrent success")
                
                # First 5 should succeed, rest should be blocked
                successful_requests = sum(results)
                assert successful_requests == 5
                
    def test_rate_limit_memory_usage(self, app):
        """Test rate limiter memory usage with many clients."""
        with app.app_context():
            limiter = RateLimiter(max_requests=100, time_window=60)
            
            # Simulate many different clients
            for i in range(1000):
                client_id = f"client_{i}"
                result = limiter.is_request_allowed(client_id)
                assert result is True
                
            # Storage should contain all clients
            assert len(limiter.storage) == 1000
            
            # Each client should have count of 1
            for client_id, data in limiter.storage.items():
                assert data["count"] == 1
                
    def test_rate_limit_edge_cases(self, app):
        """Test rate limiter edge cases."""
        with app.app_context():
            limiter = RateLimiter(max_requests=0, time_window=60)  # No requests allowed
            
            # Should block all requests
            result = limiter.is_request_allowed("test_client")
            assert result is False
            
            # Test with very large time window
            limiter = RateLimiter(max_requests=1, time_window=86400)  # 24 hours
            result = limiter.is_request_allowed("test_client")
            assert result is True
            
            result = limiter.is_request_allowed("test_client")
            assert result is False
            
    def test_rate_limit_performance(self, app):
        """Test rate limiter performance with many requests."""
        with app.app_context():
            limiter = RateLimiter(max_requests=1000, time_window=60)
            
            # Measure time for many requests
            start_time = time.time()
            for i in range(100):
                limiter.is_request_allowed("performance_test")
            end_time = time.time()
            
            # Should complete quickly (less than 1 second for 100 requests)
            assert (end_time - start_time) < 1.0