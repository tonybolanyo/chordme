"""
Comprehensive tests for CSRF protection functionality.
"""

import pytest
import secrets
from unittest.mock import patch, MagicMock
from flask import Flask, session, request
from chordme.csrf_protection import (
    CSRFProtection, csrf_protect, get_csrf_token
)


class TestCSRFProtection:
    """Test CSRFProtection class functionality."""
    
    def test_csrf_protection_init(self, app):
        """Test CSRF protection initialization."""
        csrf = CSRFProtection()
        assert csrf.app is None
        assert csrf.enabled is True
        
    def test_csrf_protection_init_with_app(self, app):
        """Test CSRF protection initialization with app."""
        csrf = CSRFProtection(app)
        assert csrf.app is app
        
    def test_csrf_protection_init_app(self, app):
        """Test CSRF protection init_app method."""
        csrf = CSRFProtection()
        csrf.init_app(app)
        assert csrf.app is app
        
    def test_csrf_protection_disabled_config(self, app):
        """Test CSRF protection with disabled configuration."""
        app.config['CSRF_ENABLED'] = False
        csrf = CSRFProtection(app)
        assert csrf.enabled is False
        
    def test_generate_token(self, app):
        """Test CSRF token generation."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            token = csrf.generate_token()
            
            assert isinstance(token, str)
            assert len(token) >= 32  # Should be sufficiently long
            assert token.isalnum() or '_' in token or '-' in token  # Valid characters
            
    def test_generate_token_uniqueness(self, app):
        """Test that generated tokens are unique."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            tokens = [csrf.generate_token() for _ in range(10)]
            
            # All tokens should be unique
            assert len(set(tokens)) == 10
            
    def test_validate_token_valid(self, app):
        """Test validation of valid CSRF token."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            token = csrf.generate_token()
            
            # Store token in session
            session['csrf_token'] = token
            
            # Validate should succeed
            assert csrf.validate_token(token) is True
            
    def test_validate_token_invalid(self, app):
        """Test validation of invalid CSRF token."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            token = csrf.generate_token()
            
            # Store different token in session
            session['csrf_token'] = token
            
            # Validate with wrong token should fail
            assert csrf.validate_token('wrong_token') is False
            
    def test_validate_token_missing_session(self, app):
        """Test validation when no token in session."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            
            # No token in session
            assert csrf.validate_token('any_token') is False
            
    def test_validate_token_disabled(self, app):
        """Test validation when CSRF is disabled."""
        app.config['CSRF_ENABLED'] = False
        with app.test_request_context():
            csrf = CSRFProtection(app)
            
            # Should always return True when disabled
            assert csrf.validate_token('any_token') is True
            
    def test_get_token_from_request_header(self, app):
        """Test getting CSRF token from request header."""
        with app.test_request_context(headers={'X-CSRF-Token': 'test_token'}):
            csrf = CSRFProtection(app)
            token = csrf.get_token_from_request()
            
            assert token == 'test_token'
            
    def test_get_token_from_request_form(self, app):
        """Test getting CSRF token from form data."""
        with app.test_request_context(method='POST', data={'csrf_token': 'form_token'}):
            csrf = CSRFProtection(app)
            token = csrf.get_token_from_request()
            
            assert token == 'form_token'
            
    def test_get_token_from_request_json(self, app):
        """Test getting CSRF token from JSON data."""
        with app.test_request_context(
            method='POST', 
            json={'csrf_token': 'json_token'},
            content_type='application/json'
        ):
            csrf = CSRFProtection(app)
            token = csrf.get_token_from_request()
            
            assert token == 'json_token'
            
    def test_get_token_from_request_priority(self, app):
        """Test token source priority (header > form > json)."""
        with app.test_request_context(
            method='POST',
            headers={'X-CSRF-Token': 'header_token'},
            data={'csrf_token': 'form_token'},
            json={'csrf_token': 'json_token'},
            content_type='application/json'
        ):
            csrf = CSRFProtection(app)
            token = csrf.get_token_from_request()
            
            # Header should take priority
            assert token == 'header_token'
            
    def test_get_token_from_request_none(self, app):
        """Test getting token when none provided."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            token = csrf.get_token_from_request()
            
            assert token is None


class TestCSRFDecorator:
    """Test csrf_protect decorator functionality."""
    
    def test_csrf_protect_valid_token(self, app):
        """Test CSRF decorator with valid token."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            token = csrf.generate_token()
            session['csrf_token'] = token
            
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            with app.test_request_context(
                method='POST',
                headers={'X-CSRF-Token': token}
            ):
                result = protected_endpoint()
                assert result == 'success'
                
    def test_csrf_protect_invalid_token(self, app):
        """Test CSRF decorator with invalid token."""
        with app.test_request_context():
            csrf = CSRFProtection(app)
            token = csrf.generate_token()
            session['csrf_token'] = token
            
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            with app.test_request_context(
                method='POST',
                headers={'X-CSRF-Token': 'wrong_token'}
            ):
                result = protected_endpoint()
                # Should return error response
                assert result != 'success'
                assert isinstance(result, tuple)
                assert result[1] == 403  # Forbidden
                
    def test_csrf_protect_get_request(self, app):
        """Test CSRF decorator with GET request (should pass)."""
        with app.test_request_context():
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            with app.test_request_context(method='GET'):
                result = protected_endpoint()
                assert result == 'success'
                
    def test_csrf_protect_safe_methods(self, app):
        """Test CSRF decorator with safe HTTP methods."""
        safe_methods = ['GET', 'HEAD', 'OPTIONS']
        
        for method in safe_methods:
            with app.test_request_context():
                @csrf_protect
                def protected_endpoint():
                    return f'success_{method}'
                
                with app.test_request_context(method=method):
                    result = protected_endpoint()
                    assert result == f'success_{method}'
                    
    def test_csrf_protect_unsafe_methods(self, app):
        """Test CSRF decorator with unsafe HTTP methods."""
        unsafe_methods = ['POST', 'PUT', 'DELETE', 'PATCH']
        
        with app.test_request_context():
            csrf = CSRFProtection(app)
            token = csrf.generate_token()
            session['csrf_token'] = token
            
            for method in unsafe_methods:
                @csrf_protect
                def protected_endpoint():
                    return f'success_{method}'
                
                # Valid token should work
                with app.test_request_context(
                    method=method,
                    headers={'X-CSRF-Token': token}
                ):
                    result = protected_endpoint()
                    assert result == f'success_{method}'
                
                # Invalid token should fail
                with app.test_request_context(
                    method=method,
                    headers={'X-CSRF-Token': 'wrong_token'}
                ):
                    result = protected_endpoint()
                    assert result != f'success_{method}'
                    
    def test_csrf_protect_disabled(self, app):
        """Test CSRF decorator when protection is disabled."""
        app.config['CSRF_ENABLED'] = False
        
        with app.test_request_context():
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            with app.test_request_context(method='POST'):
                result = protected_endpoint()
                assert result == 'success'


class TestCSRFUtilityFunctions:
    """Test CSRF utility functions."""
    
    def test_generate_csrf_token_function(self, app):
        """Test standalone generate_csrf_token function."""
        with app.test_request_context():
            token = generate_csrf_token()
            
            assert isinstance(token, str)
            assert len(token) >= 32
            assert 'csrf_token' in session
            assert session['csrf_token'] == token
            
    def test_generate_csrf_token_existing_session(self, app):
        """Test generate_csrf_token with existing session token."""
        with app.test_request_context():
            # Set existing token
            session['csrf_token'] = 'existing_token'
            
            token = generate_csrf_token()
            
            # Should return existing token
            assert token == 'existing_token'
            
    def test_get_csrf_token_function(self, app):
        """Test standalone get_csrf_token function."""
        with app.test_request_context():
            # Generate token first
            original_token = generate_csrf_token()
            
            # Get token should return same token
            retrieved_token = get_csrf_token()
            assert retrieved_token == original_token
            
    def test_get_csrf_token_no_session(self, app):
        """Test get_csrf_token when no token in session."""
        with app.test_request_context():
            token = get_csrf_token()
            
            # Should generate new token
            assert isinstance(token, str)
            assert len(token) >= 32
            assert 'csrf_token' in session
            
    def test_validate_csrf_token_function(self, app):
        """Test standalone validate_csrf_token function."""
        with app.test_request_context():
            # Generate token
            token = generate_csrf_token()
            
            # Valid token should pass
            assert validate_csrf_token(token) is True
            
            # Invalid token should fail
            assert validate_csrf_token('wrong_token') is False
            
    def test_validate_csrf_token_none(self, app):
        """Test validate_csrf_token with None input."""
        with app.test_request_context():
            generate_csrf_token()
            
            # None should fail validation
            assert validate_csrf_token(None) is False


class TestCSRFIntegration:
    """Test CSRF protection integration scenarios."""
    
    def test_csrf_full_workflow(self, app):
        """Test complete CSRF protection workflow."""
        with app.test_client() as client:
            # Step 1: Get CSRF token
            with app.test_request_context():
                token = generate_csrf_token()
                
            # Step 2: Make protected request with token
            @csrf_protect
            def protected_view():
                return {'message': 'success'}, 200
                
            with app.test_request_context(
                method='POST',
                headers={'X-CSRF-Token': token}
            ):
                result = protected_view()
                assert result == ({'message': 'success'}, 200)
                
    def test_csrf_ajax_request_simulation(self, app):
        """Test CSRF protection with AJAX-like requests."""
        with app.test_request_context():
            token = generate_csrf_token()
            
            @csrf_protect
            def ajax_endpoint():
                return {'data': 'ajax_response'}
            
            # Simulate AJAX request with CSRF token in header
            with app.test_request_context(
                method='POST',
                headers={
                    'X-CSRF-Token': token,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                json={'action': 'test'}
            ):
                result = ajax_endpoint()
                assert result == {'data': 'ajax_response'}
                
    def test_csrf_form_submission_simulation(self, app):
        """Test CSRF protection with form submission."""
        with app.test_request_context():
            token = generate_csrf_token()
            
            @csrf_protect
            def form_handler():
                return 'form_processed'
            
            # Simulate form submission with CSRF token in form data
            with app.test_request_context(
                method='POST',
                data={'csrf_token': token, 'field1': 'value1'},
                content_type='application/x-www-form-urlencoded'
            ):
                result = form_handler()
                assert result == 'form_processed'
                
    def test_csrf_multiple_tokens(self, app):
        """Test behavior with multiple CSRF tokens."""
        with app.test_request_context():
            # Generate multiple tokens
            token1 = generate_csrf_token()
            token2 = generate_csrf_token()
            
            # Should reuse existing token
            assert token1 == token2
            
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            # Both tokens should work (since they're the same)
            with app.test_request_context(
                method='POST',
                headers={'X-CSRF-Token': token1}
            ):
                result = protected_endpoint()
                assert result == 'success'
                
    def test_csrf_token_rotation(self, app):
        """Test CSRF token rotation scenario."""
        with app.test_request_context():
            # Generate initial token
            token1 = generate_csrf_token()
            
            # Clear session (simulate logout/login)
            session.clear()
            
            # Generate new token
            token2 = generate_csrf_token()
            
            assert token1 != token2
            
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            # Old token should not work
            with app.test_request_context(
                method='POST',
                headers={'X-CSRF-Token': token1}
            ):
                result = protected_endpoint()
                assert result != 'success'
            
            # New token should work
            with app.test_request_context(
                method='POST',
                headers={'X-CSRF-Token': token2}
            ):
                result = protected_endpoint()
                assert result == 'success'
                
    def test_csrf_error_handling(self, app):
        """Test CSRF error handling scenarios."""
        with app.test_request_context():
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            # Test various invalid token scenarios
            invalid_scenarios = [
                {},  # No token
                {'X-CSRF-Token': ''},  # Empty token
                {'X-CSRF-Token': 'short'},  # Too short token
                {'X-CSRF-Token': 'a' * 1000},  # Too long token
                {'X-CSRF-Token': 'invalid-chars!@#$%'},  # Invalid characters
            ]
            
            for headers in invalid_scenarios:
                with app.test_request_context(method='POST', headers=headers):
                    result = protected_endpoint()
                    assert result != 'success'
                    assert isinstance(result, tuple)
                    assert result[1] == 403
                    
    def test_csrf_custom_error_response(self, app):
        """Test CSRF custom error response."""
        with app.test_request_context():
            custom_response = {'error': 'CSRF validation failed'}, 400
            
            @csrf_protect(error_response=custom_response)
            def protected_endpoint():
                return 'success'
            
            with app.test_request_context(method='POST'):
                result = protected_endpoint()
                assert result == custom_response
                
    def test_csrf_performance(self, app):
        """Test CSRF protection performance."""
        with app.test_request_context():
            token = generate_csrf_token()
            
            @csrf_protect
            def protected_endpoint():
                return 'success'
            
            # Test many requests
            import time
            start_time = time.time()
            
            for i in range(100):
                with app.test_request_context(
                    method='POST',
                    headers={'X-CSRF-Token': token}
                ):
                    result = protected_endpoint()
                    assert result == 'success'
                    
            end_time = time.time()
            
            # Should complete quickly (less than 1 second for 100 requests)
            assert (end_time - start_time) < 1.0
            
    def test_csrf_thread_safety(self, app):
        """Test CSRF protection thread safety."""
        import threading
        
        results = []
        
        def worker():
            with app.test_request_context():
                token = generate_csrf_token()
                results.append(token)
                
        # Start multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()
            
        # Wait for all threads
        for thread in threads:
            thread.join()
            
        # All tokens should be valid strings
        assert len(results) == 10
        for token in results:
            assert isinstance(token, str)
            assert len(token) >= 32