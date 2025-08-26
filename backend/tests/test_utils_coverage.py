"""
Comprehensive tests for chordme.utils module to improve coverage.
"""
import pytest
from datetime import datetime, timedelta
import jwt
import json
from flask import Flask, current_app, request
from chordme.utils import (
    sanitize_html_content,
    validate_email,
    validate_password,
    sanitize_input,
    create_error_response,
    create_legacy_error_response,
    create_success_response,
    generate_jwt_token,
    verify_jwt_token,
    validate_positive_integer,
    validate_request_size,
    auth_required
)


class TestSanitizeHtmlContent:
    """Test HTML content sanitization functions."""
    
    def test_sanitize_script_tags(self):
        """Test removal of script tags."""
        malicious_content = '<script>alert("xss")</script>Some content'
        result = sanitize_html_content(malicious_content)
        assert '<script>' not in result
        assert 'alert("xss")' not in result
        assert 'Some content' in result
    
    def test_sanitize_iframe_tags(self):
        """Test removal of iframe tags."""
        content = '<iframe src="malicious.com"></iframe>Safe content'
        result = sanitize_html_content(content)
        assert '<iframe' not in result
        assert 'Safe content' in result
    
    def test_sanitize_javascript_urls(self):
        """Test removal of javascript: URLs."""
        content = 'Click <a href="javascript:alert(1)">here</a>'
        result = sanitize_html_content(content)
        assert 'javascript:' not in result
    
    def test_sanitize_data_urls(self):
        """Test removal of data: URLs."""
        content = '<img src="data:image/svg+xml;base64,PHN2Zz4=">Text'
        result = sanitize_html_content(content)
        assert 'data:' not in result
        assert 'Text' in result
    
    def test_sanitize_non_string_input(self):
        """Test handling of non-string input."""
        assert sanitize_html_content(123) == 123
        assert sanitize_html_content(None) is None
        assert sanitize_html_content([]) == []


class TestValidateEmail:
    """Test email validation functionality."""
    
    def test_valid_email_formats(self):
        """Test various valid email formats."""
        valid_emails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'test+label@example.org',
            'user123@test-domain.com'
        ]
        
        for email in valid_emails:
            is_valid, error = validate_email(email)
            assert is_valid, f"Email {email} should be valid, got error: {error}"
    
    def test_invalid_email_formats(self):
        """Test various invalid email formats."""
        invalid_emails = [
            '',
            'not-an-email',
            '@domain.com',
            'user@',
            'user@domain',
            'user name@domain.com',  # space in local part
            'user@domain..com',      # double dot in domain
        ]
        
        for email in invalid_emails:
            is_valid, error = validate_email(email)
            assert not is_valid, f"Email {email} should be invalid"
            assert error is not None
    
    def test_email_too_long(self):
        """Test email length validation."""
        long_email = 'a' * 300 + '@example.com'
        is_valid, error = validate_email(long_email)
        assert not is_valid
        assert 'too long' in error.lower()
    
    def test_empty_email(self):
        """Test empty email validation."""
        is_valid, error = validate_email('')
        assert not is_valid
        assert 'required' in error.lower()
    
    def test_none_email(self):
        """Test None email validation."""
        is_valid, error = validate_email(None)
        assert not is_valid
        assert 'required' in error.lower()


class TestValidatePassword:
    """Test password validation functionality."""
    
    def test_valid_passwords(self):
        """Test various valid password formats."""
        valid_passwords = [
            'Password123!',
            'ComplexP@ss1',
            'MyStr0ng#Password',
            'Test@12345'
        ]
        
        for password in valid_passwords:
            is_valid, error = validate_password(password)
            assert is_valid is True, f"Password {password} should be valid, got error: {error}"
    
    def test_invalid_passwords(self):
        """Test various invalid password formats."""
        invalid_passwords = [
            '',                # empty
            'password',        # no uppercase, numbers, or special chars
            'PASSWORD',        # no lowercase, numbers, or special chars
            'Password',        # no numbers or special chars
            'Pass1!',          # too short
            None,              # None value
        ]
        
        for password in invalid_passwords:
            is_valid, error = validate_password(password)
            assert is_valid is False, f"Password {password} should be invalid"
            assert error is not None


class TestSanitizeInput:
    """Test input sanitization functions."""
    
    def test_sanitize_string_input(self):
        """Test string input sanitization."""
        test_string = "Normal string content"
        result = sanitize_input(test_string)
        assert result == test_string
    
    def test_sanitize_long_string(self):
        """Test string length limiting."""
        long_string = "a" * 2000
        result = sanitize_input(long_string, max_string_length=100)
        assert len(result) <= 100
    
    def test_sanitize_dict_input(self):
        """Test dictionary input sanitization."""
        test_dict = {
            "key1": "value1",
            "key2": "a" * 200,
            "key3": 123
        }
        result = sanitize_input(test_dict, max_string_length=50)
        assert isinstance(result, dict)
        assert result["key1"] == "value1"
        assert len(result["key2"]) <= 50
        assert result["key3"] == 123
    
    def test_sanitize_list_input(self):
        """Test list input sanitization."""
        test_list = ["short", "a" * 200, 42, {"nested": "value"}]
        result = sanitize_input(test_list, max_string_length=50)
        assert isinstance(result, list)
        assert result[0] == "short"
        assert len(result[1]) <= 50
        assert result[2] == 42
    
    def test_sanitize_non_string_input(self):
        """Test handling of non-string input."""
        assert sanitize_input(123) == 123
        assert sanitize_input({}) == {}  # Empty dict should remain empty dict
        assert sanitize_input(True) is True


class TestResponseFunctions:
    """Test response creation functions."""
    
    def test_create_success_response(self):
        """Test success response creation."""
        app = Flask(__name__)
        
        with app.app_context():
            # Test with data
            response, status_code = create_success_response(data={"test": "value"}, message="Success")
            data = response.get_json()
            assert data["status"] == "success"
            assert data["data"]["test"] == "value"
            assert data["message"] == "Success"
            assert status_code == 200
            
            # Test without data
            response, status_code = create_success_response()
            data = response.get_json()
            assert data["status"] == "success"
            assert status_code == 200
    
    def test_create_error_response(self):
        """Test error response creation."""
        app = Flask(__name__)
        
        with app.app_context():
            # Test basic error response
            response, status_code = create_error_response("Test error")
            data = response.get_json()
            assert data["status"] == "error"
            assert "Test error" in data["error"]["message"]
            assert status_code == 400
            
            # Test with error code
            response, status_code = create_error_response(
                "Test error",
                status_code=422,
                error_code="VALIDATION_ERROR"
            )
            data = response.get_json()
            assert status_code == 422
            assert data["error"]["code"] == "VALIDATION_ERROR"
    
    def test_create_legacy_error_response(self):
        """Test legacy error response creation."""
        app = Flask(__name__)
        
        with app.app_context():
            response, status_code = create_legacy_error_response("Legacy error", 500)
            data = response.get_json()
            assert data["status"] == "error"
            assert data["error"] == "Legacy error"
            assert status_code == 500


class TestJWTFunctions:
    """Test JWT token generation and validation."""
    
    def test_generate_and_verify_jwt_token(self):
        """Test JWT token generation and verification."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        app.config['JWT_EXPIRATION_DELTA'] = 3600
        
        with app.app_context():
            user_id = 123
            
            # Generate token
            token = generate_jwt_token(user_id)
            assert token is not None
            assert isinstance(token, str)
            assert len(token) > 0
            
            # Verify token
            payload = verify_jwt_token(token)
            assert payload is not None
            assert payload['user_id'] == user_id
            assert 'exp' in payload
            assert 'iat' in payload
    
    def test_verify_invalid_token(self):
        """Test verification of invalid token."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        
        with app.app_context():
            # Invalid token format
            payload = verify_jwt_token('invalid-token')
            assert payload is None
            
            # Empty token
            payload = verify_jwt_token('')
            assert payload is None
            
            # None token
            payload = verify_jwt_token(None)
            assert payload is None


class TestValidationFunctions:
    """Test validation utility functions."""
    
    def test_validate_positive_integer_decorator_with_missing_param(self):
        """Test positive integer validation decorator with missing parameter."""
        app = Flask(__name__)
        
        @validate_positive_integer('test_param')
        def test_function(test_param=None):
            return f"received: {test_param}"
        
        with app.test_request_context('/'):
            # Should return error response for missing parameter
            response, status_code = test_function()
            assert status_code == 400
            data = response.get_json()
            assert 'error' in data
    
    def test_validate_request_size_decorator_with_large_request(self):
        """Test request size validation decorator."""
        app = Flask(__name__)
        
        @validate_request_size(max_content_length=10)  # Very small limit
        def test_function():
            return "success"
        
        # Simulate a large request
        with app.test_request_context('/', data='x' * 20, content_type='text/plain', 
                                     environ_base={'CONTENT_LENGTH': '20'}):
            response, status_code = test_function()
            assert status_code == 413  # Request too large


class TestAuthRequired:
    """Test authentication required decorator."""
    
    def test_auth_required_decorator_with_valid_token(self):
        """Test auth_required decorator with valid token."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        app.config['JWT_EXPIRATION_DELTA'] = 3600
        
        @auth_required
        def protected_function():
            return "protected content"
        
        with app.app_context():
            # Generate a valid token
            token = generate_jwt_token(123)
            
            # Test with valid token
            with app.test_request_context('/', headers={'Authorization': f'Bearer {token}'}):
                result = protected_function()
                assert result == "protected content"
    
    def test_auth_required_decorator_without_token(self):
        """Test auth_required decorator without token."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        
        @auth_required
        def protected_function():
            return "protected content"
        
        with app.app_context():
            # Test without token
            with app.test_request_context('/'):
                response, status_code = protected_function()
                assert status_code == 401
                data = response.get_json()
                assert data['status'] == 'error'