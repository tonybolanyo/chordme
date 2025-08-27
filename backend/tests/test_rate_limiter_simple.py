"""
Simplified comprehensive tests for rate limiting functionality.
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from flask import Flask, request
from chordme.rate_limiter import RateLimiter, rate_limit


class TestRateLimiter:
    """Test RateLimiter class functionality."""
    
    def test_rate_limiter_init(self):
        """Test rate limiter initialization."""
        limiter = RateLimiter()
        
        assert hasattr(limiter, 'requests')
        assert hasattr(limiter, 'blocked_ips')
        
    def test_rate_limiter_allow_first_request(self):
        """Test that first request is always allowed."""
        limiter = RateLimiter()
        
        is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1")
        
        assert is_limited is False
        assert remaining >= 0
        assert reset_time >= 0
        
    def test_rate_limiter_record_request(self):
        """Test recording requests."""
        limiter = RateLimiter()
        
        # Record a request
        limiter.record_request("127.0.0.1")
        
        # Should have recorded the request
        assert "127.0.0.1" in limiter.requests
        
    def test_rate_limiter_multiple_requests(self):
        """Test multiple requests from same IP."""
        limiter = RateLimiter()
        
        # Make several requests
        for i in range(3):
            limiter.record_request("127.0.0.1")
            
        # Check rate limiting
        is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=5)
        
        assert is_limited is False  # Should still be under limit
        assert remaining >= 0
        
    def test_rate_limiter_exceed_limit(self):
        """Test exceeding rate limit."""
        limiter = RateLimiter()
        
        # Record many requests to exceed limit
        for i in range(10):
            limiter.record_request("127.0.0.1")
            
        # Should be rate limited
        is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=5)
        
        assert is_limited is True
        assert remaining == 0
        assert reset_time > 0
        
    def test_rate_limiter_different_ips(self):
        """Test rate limiting with different IP addresses."""
        limiter = RateLimiter()
        
        # Record requests for first IP
        for i in range(10):
            limiter.record_request("127.0.0.1")
            
        # Second IP should not be affected
        is_limited, remaining, reset_time = limiter.is_rate_limited("192.168.1.1", max_requests=5)
        
        assert is_limited is False
        
    def test_rate_limiter_time_window(self):
        """Test rate limiting time window."""
        limiter = RateLimiter()
        
        # Test with very short window
        is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=1, window_seconds=1)
        
        assert is_limited is False
        
        # Record request
        limiter.record_request("127.0.0.1")
        
        # Should be limited now
        is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=1, window_seconds=1)
        
        assert is_limited is True
        
    def test_rate_limiter_blocked_ips(self):
        """Test blocked IPs functionality."""
        limiter = RateLimiter()
        
        # Manually add blocked IP
        limiter.blocked_ips["127.0.0.1"] = time.time() + 60  # Block for 60 seconds
        
        # Should be blocked
        is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1")
        
        assert is_limited is True
        assert remaining == 0
        assert reset_time > 0


class TestRateLimitDecorator:
    """Test rate_limit decorator functionality."""
    
    def test_rate_limit_decorator_basic(self, app):
        """Test basic rate limit decorator functionality."""
        with app.app_context():
            @rate_limit(max_requests=2, window_seconds=60)
            def test_endpoint():
                return "success"
            
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                
                # First request should succeed
                result = test_endpoint()
                assert result == "success"
                
    def test_rate_limit_decorator_with_params(self, app):
        """Test rate limit decorator with custom parameters."""
        with app.app_context():
            @rate_limit(max_requests=1, window_seconds=60, block_duration=120)
            def test_endpoint():
                return "success"
            
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                
                result = test_endpoint()
                assert result == "success"
                
    def test_rate_limit_decorator_no_app_context(self):
        """Test rate limit decorator without app context."""
        @rate_limit()
        def test_endpoint():
            return "success"
        
        # Should handle gracefully when no app context
        with patch('chordme.rate_limiter.current_app', None):
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                
                result = test_endpoint()
                # Should still work, possibly with fallback behavior
                assert result is not None
                
    def test_rate_limit_decorator_exception_handling(self, app):
        """Test rate limit decorator exception handling."""
        with app.app_context():
            @rate_limit()
            def test_endpoint():
                raise ValueError("Test error")
            
            with patch('chordme.rate_limiter.request') as mock_request:
                mock_request.remote_addr = "127.0.0.1"
                
                # Exception should propagate
                with pytest.raises(ValueError):
                    test_endpoint()


class TestRateLimitIntegration:
    """Test rate limiting integration scenarios."""
    
    def test_rate_limit_with_real_request(self, app):
        """Test rate limiting with real Flask request."""
        with app.test_client() as client:
            @rate_limit(max_requests=2, window_seconds=60)
            def test_view():
                return "test response"
            
            # Mock the view as an actual route
            with app.test_request_context('/', method='GET', environ_base={'REMOTE_ADDR': '127.0.0.1'}):
                result = test_view()
                assert result == "test response"
                
    def test_rate_limit_concurrent_requests(self, app):
        """Test rate limiting with simulated concurrent requests."""
        with app.app_context():
            limiter = RateLimiter()
            
            # Simulate multiple concurrent requests
            for i in range(5):
                limiter.record_request("127.0.0.1")
                
            # Check if rate limited
            is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=3)
            
            assert is_limited is True  # Should be limited after 5 requests with limit of 3
            
    def test_rate_limit_memory_cleanup(self, app):
        """Test rate limiter memory cleanup."""
        with app.app_context():
            limiter = RateLimiter()
            
            # Add requests for many different IPs
            for i in range(100):
                limiter.record_request(f"192.168.1.{i}")
                
            # Should handle many IPs without issues
            assert len(limiter.requests) == 100
            
    def test_rate_limit_edge_cases(self, app):
        """Test rate limiter edge cases."""
        with app.app_context():
            limiter = RateLimiter()
            
            # Test with zero max_requests
            is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=0)
            assert is_limited is True  # Should always be limited with 0 max
            
            # Test with very large window
            is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=1000, window_seconds=86400)
            assert is_limited is False  # Should not be limited with large limit
            
    def test_rate_limit_performance(self, app):
        """Test rate limiter performance."""
        with app.app_context():
            limiter = RateLimiter()
            
            # Time many operations
            start_time = time.time()
            
            for i in range(1000):
                limiter.record_request("127.0.0.1")
                limiter.is_rate_limited("127.0.0.1")
                
            end_time = time.time()
            
            # Should complete quickly
            assert (end_time - start_time) < 2.0  # Less than 2 seconds for 1000 operations
            
    def test_rate_limit_reset_functionality(self, app):
        """Test rate limit reset after time window."""
        with app.app_context():
            limiter = RateLimiter()
            
            # Record requests
            for i in range(5):
                limiter.record_request("127.0.0.1")
                
            # Should be limited
            is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=3, window_seconds=1)
            assert is_limited is True
            
            # Wait for window to pass
            time.sleep(1.1)
            
            # Should no longer be limited
            is_limited, remaining, reset_time = limiter.is_rate_limited("127.0.0.1", max_requests=3, window_seconds=1)
            assert is_limited is False
            
    def test_rate_limit_configuration_scenarios(self, app):
        """Test various rate limit configurations."""
        with app.app_context():
            limiter = RateLimiter()
            
            configs = [
                (1, 60),      # Very restrictive
                (100, 60),    # Very permissive
                (10, 1),      # Short window
                (10, 3600),   # Long window
            ]
            
            for max_requests, window_seconds in configs:
                # Record some requests
                for i in range(5):
                    limiter.record_request(f"test_{max_requests}_{window_seconds}")
                    
                # Check rate limiting
                is_limited, remaining, reset_time = limiter.is_rate_limited(
                    f"test_{max_requests}_{window_seconds}",
                    max_requests=max_requests,
                    window_seconds=window_seconds
                )
                
                # Verify basic functionality
                assert isinstance(is_limited, bool)
                assert isinstance(remaining, int)
                assert isinstance(reset_time, (int, float))
                assert remaining >= 0
                assert reset_time >= 0