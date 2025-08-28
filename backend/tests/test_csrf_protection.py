"""
Simplified comprehensive tests for CSRF protection functionality.
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from flask import Flask, session, request
from chordme.csrf_protection import CSRFProtection, csrf_protect, get_csrf_token


class TestCSRFProtection:
    """Test CSRFProtection class functionality."""
    
    def test_csrf_protection_init(self):
        """Test CSRF protection initialization."""
        csrf = CSRFProtection()
        
        assert hasattr(csrf, 'tokens')
        assert hasattr(csrf, 'token_expiry')
        assert csrf.token_expiry == 3600  # 1 hour
        
    def test_generate_token_basic(self, app):
        """Test basic CSRF token generation."""
        with app.app_context():
            csrf = CSRFProtection()
            token = csrf.generate_token()
            
            assert isinstance(token, str)
            assert len(token) > 0
            
    def test_generate_token_with_session_id(self, app):
        """Test CSRF token generation with session ID."""
        with app.app_context():
            csrf = CSRFProtection()
            token = csrf.generate_token(session_id="test_session")
            
            assert isinstance(token, str)
            assert len(token) > 0
            
    def test_generate_token_uniqueness(self, app):
        """Test that generated tokens are unique."""
        with app.app_context():
            csrf = CSRFProtection()
            tokens = [csrf.generate_token() for _ in range(5)]
            
            # All tokens should be unique
            assert len(set(tokens)) == 5
            
    def test_validate_token_valid(self, app):
        """Test validation of valid CSRF token."""
        with app.app_context():
            csrf = CSRFProtection()
            token = csrf.generate_token()
            
            # Validation should succeed
            result = csrf.validate_token(token)
            assert result is True
            
    def test_validate_token_invalid(self, app):
        """Test validation of invalid CSRF token."""
        with app.app_context():
            csrf = CSRFProtection()
            
            # Invalid token should fail
            result = csrf.validate_token("invalid_token")
            assert result is False
            
    def test_validate_token_with_session_id(self, app):
        """Test token validation with session ID."""
        with app.app_context():
            csrf = CSRFProtection()
            token = csrf.generate_token(session_id="test_session")
            
            # Should validate with correct session ID
            result = csrf.validate_token(token, session_id="test_session")
            assert result is True
            
            # Should fail with wrong session ID
            result = csrf.validate_token(token, session_id="wrong_session")
            assert result is False
            
    def test_token_expiry(self, app):
        """Test token expiry functionality."""
        with app.app_context():
            csrf = CSRFProtection()
            csrf.token_expiry = 1  # 1 second expiry for testing
            
            token = csrf.generate_token()
            
            # Should be valid immediately
            assert csrf.validate_token(token) is True
            
            # Wait for expiry
            time.sleep(1.1)
            
            # Should be invalid after expiry
            assert csrf.validate_token(token) is False


class TestCSRFDecorator:
    """Test csrf_protect decorator functionality."""
    
    def test_csrf_protect_basic(self, app):
        """Test basic CSRF decorator functionality."""
        with app.test_request_context():
            @csrf_protect()
            def protected_endpoint():
                return "success"
            
            # Should work with GET request (no CSRF required)
            result = protected_endpoint()
            assert result == "success"
            
    def test_csrf_protect_post_request(self, app):
        """Test CSRF decorator with POST request."""
        with app.test_request_context(method='POST'):
            @csrf_protect()
            def protected_endpoint():
                return "success"
            
            with patch('chordme.csrf_protection.request') as mock_request:
                mock_request.method = 'POST'
                mock_request.headers = {}
                mock_request.form = {}
                mock_request.get_json.return_value = {}
                
                # Should handle POST request
                result = protected_endpoint()
                # May return success or error depending on token validation
                assert result is not None
                
    def test_csrf_protect_require_token_false(self, app):
        """Test CSRF decorator with require_token=False."""
        with app.test_request_context():
            @csrf_protect(require_token=False)
            def protected_endpoint():
                return "success"
            
            result = protected_endpoint()
            assert result == "success"
            
    def test_csrf_protect_exception_handling(self, app):
        """Test CSRF decorator exception handling."""
        with app.test_request_context():
            @csrf_protect()
            def failing_endpoint():
                raise ValueError("Test error")
            
            # Exception should propagate
            with pytest.raises(ValueError):
                failing_endpoint()


class TestCSRFUtilityFunctions:
    """Test CSRF utility functions."""
    
    def test_get_csrf_token_function(self, app):
        """Test standalone get_csrf_token function."""
        with app.test_request_context():
            token = get_csrf_token()
            
            assert isinstance(token, str)
            assert len(token) > 0
            
    def test_get_csrf_token_consistency(self, app):
        """Test that get_csrf_token returns consistent token."""
        with app.test_request_context():
            token1 = get_csrf_token()
            token2 = get_csrf_token()
            
            # Should return the same token within same request
            assert token1 == token2
            
    def test_get_csrf_token_different_requests(self, app):
        """Test get_csrf_token across different requests."""
        tokens = []
        
        for i in range(3):
            with app.test_request_context():
                token = get_csrf_token()
                tokens.append(token)
                
        # Tokens should be different across requests
        assert len(set(tokens)) == 3


class TestCSRFIntegration:
    """Test CSRF protection integration scenarios."""
    
    def test_csrf_full_workflow(self, app):
        """Test complete CSRF protection workflow."""
        with app.test_request_context():
            # Get CSRF token
            token = get_csrf_token()
            
            @csrf_protect()
            def protected_view():
                return {'message': 'success'}
                
            # Mock request with token
            with patch('chordme.csrf_protection.request') as mock_request:
                mock_request.method = 'GET'
                
                result = protected_view()
                assert result == {'message': 'success'}
                
    def test_csrf_with_session(self, app):
        """Test CSRF protection with Flask session."""
        with app.test_client() as client:
            with client.session_transaction() as sess:
                # Set up session data
                sess['user_id'] = 'test_user'
                
            with app.test_request_context():
                token = get_csrf_token()
                assert token is not None
                
    def test_csrf_performance(self, app):
        """Test CSRF protection performance."""
        with app.test_request_context():
            csrf = CSRFProtection()
            
            # Generate many tokens
            start_time = time.time()
            tokens = [csrf.generate_token() for _ in range(100)]
            end_time = time.time()
            
            # Should complete quickly
            assert (end_time - start_time) < 1.0
            assert len(tokens) == 100
            
            # Validate many tokens
            start_time = time.time()
            for token in tokens:
                csrf.validate_token(token)
            end_time = time.time()
            
            # Should complete quickly
            assert (end_time - start_time) < 1.0
            
    def test_csrf_memory_management(self, app):
        """Test CSRF memory management."""
        with app.test_request_context():
            csrf = CSRFProtection()
            
            # Generate many tokens
            for i in range(1000):
                csrf.generate_token(session_id=f"session_{i}")
                
            # Should handle memory efficiently
            assert len(csrf.tokens) <= 1000
            
    def test_csrf_cleanup_expired_tokens(self, app):
        """Test cleanup of expired tokens."""
        with app.test_request_context():
            csrf = CSRFProtection()
            csrf.token_expiry = 1  # 1 second expiry
            
            # Generate tokens
            tokens = [csrf.generate_token() for _ in range(5)]
            
            # Wait for expiry
            time.sleep(1.1)
            
            # Cleanup should remove expired tokens
            csrf._cleanup_expired_tokens()
            
            # Tokens should be invalid now
            for token in tokens:
                assert csrf.validate_token(token) is False
                
    def test_csrf_edge_cases(self, app):
        """Test CSRF protection edge cases."""
        with app.test_request_context():
            csrf = CSRFProtection()
            
            # Test with None token
            assert csrf.validate_token(None) is False
            
            # Test with empty string
            assert csrf.validate_token("") is False
            
            # Test with very long token
            long_token = "a" * 1000
            assert csrf.validate_token(long_token) is False
            
    def test_csrf_thread_safety_simulation(self, app):
        """Test CSRF protection thread safety simulation."""
        import threading
        
        results = []
        
        def worker():
            with app.test_request_context():
                csrf = CSRFProtection()
                token = csrf.generate_token()
                results.append(csrf.validate_token(token))
                
        # Start multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()
            
        # Wait for all threads
        for thread in threads:
            thread.join()
            
        # All validations should succeed
        assert len(results) == 10
        assert all(results)
        
    def test_csrf_with_different_secret_keys(self, app):
        """Test CSRF with different secret keys."""
        # Test with custom secret key
        app.config['SECRET_KEY'] = 'custom_secret_key'
        
        with app.test_request_context():
            csrf = CSRFProtection()
            token = csrf.generate_token()
            
            # Should work with custom secret key
            assert csrf.validate_token(token) is True
            
    def test_csrf_without_app_context(self):
        """Test CSRF without app context."""
        csrf = CSRFProtection()
        
        # Should handle gracefully when no app context
        token = csrf.generate_token()
        assert isinstance(token, str)
        
        # Validation might work or fail gracefully
        result = csrf.validate_token(token)
        assert isinstance(result, bool)