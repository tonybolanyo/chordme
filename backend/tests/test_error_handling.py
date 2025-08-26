"""
Test error handling utilities and error codes.
"""
import pytest
from unittest.mock import patch
from flask import Flask

from chordme.error_codes import (
    get_error_details, 
    is_retryable_error, 
    get_error_category,
    ERROR_CODES,
    ERROR_CATEGORIES
)
from chordme.utils import create_error_response, create_legacy_error_response


class TestErrorCodes:
    """Test error code definitions and utilities."""
    
    def test_get_error_details_valid_code(self):
        """Test getting details for a valid error code."""
        details = get_error_details('INVALID_EMAIL')
        
        assert details['code'] == 'INVALID_EMAIL'
        assert details['category'] == ERROR_CATEGORIES['VALIDATION']
        assert details['http_status'] == 400
        assert details['retryable'] is False
        assert 'Please enter a valid email address' in details['message']
    
    def test_get_error_details_invalid_code(self):
        """Test getting details for an invalid error code returns default."""
        details = get_error_details('NONEXISTENT_CODE')
        
        assert details['code'] == 'INTERNAL_SERVER_ERROR'
        assert details['category'] == ERROR_CATEGORIES['SERVER_ERROR']
        assert details['http_status'] == 500
        assert details['retryable'] is True
    
    def test_is_retryable_error_true(self):
        """Test retryable error detection."""
        assert is_retryable_error('RATE_LIMIT_EXCEEDED') is True
        assert is_retryable_error('INTERNAL_SERVER_ERROR') is True
        assert is_retryable_error('NETWORK_ERROR') is True
    
    def test_is_retryable_error_false(self):
        """Test non-retryable error detection."""
        assert is_retryable_error('INVALID_EMAIL') is False
        assert is_retryable_error('INVALID_CREDENTIALS') is False
        assert is_retryable_error('ACCESS_DENIED') is False
    
    def test_get_error_category(self):
        """Test error category extraction."""
        assert get_error_category('INVALID_EMAIL') == ERROR_CATEGORIES['VALIDATION']
        assert get_error_category('TOKEN_EXPIRED') == ERROR_CATEGORIES['AUTHENTICATION']
        assert get_error_category('ACCESS_DENIED') == ERROR_CATEGORIES['AUTHORIZATION']
        assert get_error_category('SONG_NOT_FOUND') == ERROR_CATEGORIES['NOT_FOUND']
    
    def test_all_error_codes_have_required_fields(self):
        """Test that all error codes have required fields."""
        for error_code, details in ERROR_CODES.items():
            assert 'code' in details
            assert 'category' in details
            assert 'message' in details
            assert 'http_status' in details
            assert 'retryable' in details
            assert details['code'] == error_code
            assert details['category'] in ERROR_CATEGORIES.values()
            assert isinstance(details['retryable'], bool)
            assert isinstance(details['http_status'], int)
            assert isinstance(details['message'], str)
            assert len(details['message']) > 0


class TestErrorResponseUtils:
    """Test enhanced error response utilities."""
    
    def setup_method(self):
        """Set up test Flask app."""
        self.app = Flask(__name__)
        self.app.config['DEBUG'] = False
    
    def test_create_error_response_with_error_code(self):
        """Test creating error response with error code."""
        with self.app.app_context():
            response, status_code = create_error_response(
                message="Custom message",
                error_code="INVALID_EMAIL"
            )
            
            data = response.get_json()
            
            assert status_code == 400
            assert data['status'] == 'error'
            assert data['error']['code'] == 'INVALID_EMAIL'
            assert data['error']['category'] == ERROR_CATEGORIES['VALIDATION']
            assert data['error']['retryable'] is False
            # Should use error code message, not custom message
            assert 'Please enter a valid email address' in data['error']['message']
    
    def test_create_error_response_without_error_code(self):
        """Test creating legacy error response without error code."""
        with self.app.app_context():
            response, status_code = create_error_response(
                message="Custom error message"
            )
            
            data = response.get_json()
            
            assert status_code == 400
            assert data['status'] == 'error'
            assert data['error']['message'] == "Custom error message"
            assert data['error']['retryable'] is False
            assert 'code' not in data['error']
    
    def test_create_error_response_with_custom_status_code(self):
        """Test creating error response with custom status code."""
        with self.app.app_context():
            response, status_code = create_error_response(
                message="Not found",
                status_code=404,
                error_code="SONG_NOT_FOUND"
            )
            
            data = response.get_json()
            
            assert status_code == 404
            assert data['error']['code'] == 'SONG_NOT_FOUND'
    
    def test_create_error_response_status_code_from_error_code(self):
        """Test that status code is taken from error code."""
        with self.app.app_context():
            response, status_code = create_error_response(
                message="Unauthorized",
                error_code="TOKEN_EXPIRED"  # This has http_status 401
            )
            
            assert status_code == 401
    
    def test_create_error_response_with_details_debug_mode(self):
        """Test error response includes details in debug mode."""
        self.app.config['DEBUG'] = True
        
        with self.app.app_context():
            response, status_code = create_error_response(
                message="Error",
                error_code="INVALID_EMAIL",
                details={"field": "email", "value": "invalid"}
            )
            
            data = response.get_json()
            
            assert 'details' in data['error']['message']
            assert data['error']['details']['field'] == 'email'
    
    def test_create_error_response_no_details_production_mode(self):
        """Test error response excludes details in production mode."""
        self.app.config['DEBUG'] = False
        
        with self.app.app_context():
            response, status_code = create_error_response(
                message="Error",
                error_code="INVALID_EMAIL",
                details={"field": "email", "value": "invalid"}
            )
            
            data = response.get_json()
            
            assert 'details' not in data['error']
    
    def test_create_legacy_error_response(self):
        """Test legacy error response format."""
        with self.app.app_context():
            response, status_code = create_legacy_error_response(
                message="Legacy error"
            )
            
            data = response.get_json()
            
            assert status_code == 400
            assert data['status'] == 'error'
            assert data['error'] == 'Legacy error'


class TestErrorResponseIntegration:
    """Test error response integration scenarios."""
    
    def setup_method(self):
        """Set up test Flask app."""
        self.app = Flask(__name__)
    
    def test_retryable_server_error(self):
        """Test server error marked as retryable."""
        with self.app.app_context():
            response, status_code = create_error_response(
                message="",
                error_code="INTERNAL_SERVER_ERROR"
            )
            
            data = response.get_json()
            
            assert status_code == 500
            assert data['error']['retryable'] is True
            assert data['error']['category'] == ERROR_CATEGORIES['SERVER_ERROR']
    
    def test_non_retryable_validation_error(self):
        """Test validation error marked as non-retryable."""
        with self.app.app_context():
            response, status_code = create_error_response(
                message="",
                error_code="INVALID_PASSWORD"
            )
            
            data = response.get_json()
            
            assert status_code == 400
            assert data['error']['retryable'] is False
            assert data['error']['category'] == ERROR_CATEGORIES['VALIDATION']
    
    def test_authentication_error_handling(self):
        """Test authentication error handling."""
        with self.app.app_context():
            response, status_code = create_error_response(
                message="",
                error_code="TOKEN_EXPIRED"
            )
            
            data = response.get_json()
            
            assert status_code == 401
            assert data['error']['code'] == 'TOKEN_EXPIRED'
            assert data['error']['retryable'] is False
            assert 'session has expired' in data['error']['message'].lower()