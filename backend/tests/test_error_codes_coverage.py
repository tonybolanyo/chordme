"""
Test coverage for error_codes module to improve overall test coverage.
"""

import pytest
from chordme.error_codes import ERROR_CATEGORIES, ERROR_CODES, get_error_details, is_retryable_error, get_error_category


class TestErrorCategories:
    """Test error categories constants."""
    
    def test_error_categories_exist(self):
        """Test that all expected error categories exist."""
        expected_categories = [
            'VALIDATION', 'AUTHENTICATION', 'AUTHORIZATION',
            'NOT_FOUND', 'CONFLICT', 'RATE_LIMIT', 'SERVER_ERROR', 'NETWORK'
        ]
        
        for category in expected_categories:
            assert category in ERROR_CATEGORIES
            assert isinstance(ERROR_CATEGORIES[category], str)
            assert len(ERROR_CATEGORIES[category]) > 0
    
    def test_error_categories_values(self):
        """Test error category values are correct."""
        assert ERROR_CATEGORIES['VALIDATION'] == 'validation'
        assert ERROR_CATEGORIES['AUTHENTICATION'] == 'authentication'
        assert ERROR_CATEGORIES['AUTHORIZATION'] == 'authorization'
        assert ERROR_CATEGORIES['NOT_FOUND'] == 'not_found'
        assert ERROR_CATEGORIES['CONFLICT'] == 'conflict'
        assert ERROR_CATEGORIES['RATE_LIMIT'] == 'rate_limit'
        assert ERROR_CATEGORIES['SERVER_ERROR'] == 'server_error'
        assert ERROR_CATEGORIES['NETWORK'] == 'network'


class TestErrorCodes:
    """Test error codes constants."""
    
    def test_error_codes_structure(self):
        """Test that error codes have required structure."""
        required_fields = ['code', 'category', 'message', 'http_status', 'retryable']
        
        for error_code, error_details in ERROR_CODES.items():
            assert isinstance(error_details, dict)
            
            for field in required_fields:
                assert field in error_details, f"Missing field {field} in {error_code}"
            
            # Validate field types
            assert isinstance(error_details['code'], str)
            assert isinstance(error_details['category'], str)
            assert isinstance(error_details['message'], str)
            assert isinstance(error_details['http_status'], int)
            assert isinstance(error_details['retryable'], bool)
    
    def test_validation_error_codes(self):
        """Test validation error codes."""
        validation_errors = [
            'INVALID_EMAIL', 'INVALID_PASSWORD', 
            'MISSING_REQUIRED_FIELD', 'INVALID_INPUT_FORMAT'
        ]
        
        for error_code in validation_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'validation'
            assert error['http_status'] == 400
            assert error['retryable'] is False
    
    def test_authentication_error_codes(self):
        """Test authentication error codes."""
        auth_errors = [
            'INVALID_CREDENTIALS', 'TOKEN_EXPIRED', 
            'TOKEN_INVALID', 'TOKEN_MISSING'
        ]
        
        for error_code in auth_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'authentication'
            assert error['http_status'] == 401
            assert error['retryable'] is False
    
    def test_authorization_error_codes(self):
        """Test authorization error codes."""
        authz_errors = ['ACCESS_DENIED', 'INSUFFICIENT_PERMISSIONS']
        
        for error_code in authz_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'authorization'
            assert error['http_status'] == 403
            assert error['retryable'] is False
    
    def test_not_found_error_codes(self):
        """Test not found error codes."""
        not_found_errors = ['RESOURCE_NOT_FOUND', 'USER_NOT_FOUND', 'SONG_NOT_FOUND']
        
        for error_code in not_found_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'not_found'
            assert error['http_status'] == 404
            assert error['retryable'] is False
    
    def test_conflict_error_codes(self):
        """Test conflict error codes."""
        conflict_errors = ['EMAIL_ALREADY_EXISTS', 'RESOURCE_CONFLICT']
        
        for error_code in conflict_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'conflict'
            assert error['http_status'] == 409
            assert error['retryable'] is False
    
    def test_rate_limit_error_codes(self):
        """Test rate limit error codes."""
        rate_limit_errors = ['RATE_LIMIT_EXCEEDED']
        
        for error_code in rate_limit_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'rate_limit'
            assert error['http_status'] == 429
            assert error['retryable'] is True
    
    def test_server_error_codes(self):
        """Test server error codes."""
        server_errors = ['INTERNAL_SERVER_ERROR', 'DATABASE_ERROR', 'SERVICE_UNAVAILABLE']
        
        for error_code in server_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'server_error'
            assert error['http_status'] in [500, 503]
            assert error['retryable'] is True
    
    def test_network_error_codes(self):
        """Test network error codes."""
        network_errors = ['NETWORK_ERROR', 'TIMEOUT_ERROR']
        
        for error_code in network_errors:
            assert error_code in ERROR_CODES
            error = ERROR_CODES[error_code]
            assert error['category'] == 'network'
            assert error['http_status'] == 0  # Client-side
            assert error['retryable'] is True


class TestGetErrorDetails:
    """Test get_error_details function."""
    
    def test_get_error_details_valid_code(self):
        """Test getting error details for valid error code."""
        result = get_error_details('INVALID_EMAIL')
        
        assert isinstance(result, dict)
        assert result['code'] == 'INVALID_EMAIL'
        assert result['category'] == 'validation'
        assert result['message'] == 'Please enter a valid email address'
        assert result['http_status'] == 400
        assert result['retryable'] is False
    
    def test_get_error_details_invalid_code(self):
        """Test getting error details for invalid error code."""
        result = get_error_details('NONEXISTENT_ERROR')
        
        # Should return default error (INTERNAL_SERVER_ERROR)
        assert isinstance(result, dict)
        assert result['code'] == 'INTERNAL_SERVER_ERROR'
        assert result['category'] == 'server_error'
        assert result['retryable'] is True
    
    def test_get_error_details_empty_code(self):
        """Test getting error details for empty error code."""
        result = get_error_details('')
        
        # Should return default error
        assert isinstance(result, dict)
        assert result['code'] == 'INTERNAL_SERVER_ERROR'
    
    def test_get_error_details_none_code(self):
        """Test getting error details for None error code."""
        result = get_error_details(None)
        
        # Should return default error
        assert isinstance(result, dict)
        assert result['code'] == 'INTERNAL_SERVER_ERROR'


class TestIsRetryableError:
    """Test is_retryable_error function."""
    
    def test_is_retryable_error_retryable(self):
        """Test retryable errors."""
        retryable_errors = [
            'RATE_LIMIT_EXCEEDED', 'INTERNAL_SERVER_ERROR', 
            'DATABASE_ERROR', 'SERVICE_UNAVAILABLE',
            'NETWORK_ERROR', 'TIMEOUT_ERROR'
        ]
        
        for error_code in retryable_errors:
            assert is_retryable_error(error_code) is True
    
    def test_is_retryable_error_non_retryable(self):
        """Test non-retryable errors."""
        non_retryable_errors = [
            'INVALID_EMAIL', 'INVALID_PASSWORD', 'INVALID_CREDENTIALS',
            'ACCESS_DENIED', 'RESOURCE_NOT_FOUND', 'EMAIL_ALREADY_EXISTS'
        ]
        
        for error_code in non_retryable_errors:
            assert is_retryable_error(error_code) is False
    
    def test_is_retryable_error_invalid_code(self):
        """Test is_retryable_error for invalid error code."""
        # Should return default (True for INTERNAL_SERVER_ERROR)
        result = is_retryable_error('NONEXISTENT_ERROR')
        assert result is True
    
    def test_is_retryable_error_empty_code(self):
        """Test is_retryable_error for empty error code."""
        result = is_retryable_error('')
        assert result is True


class TestGetErrorCategory:
    """Test get_error_category function."""
    
    def test_get_error_category_valid_codes(self):
        """Test getting category for valid error codes."""
        test_cases = [
            ('INVALID_EMAIL', 'validation'),
            ('INVALID_CREDENTIALS', 'authentication'),
            ('ACCESS_DENIED', 'authorization'),
            ('RESOURCE_NOT_FOUND', 'not_found'),
            ('EMAIL_ALREADY_EXISTS', 'conflict'),
            ('RATE_LIMIT_EXCEEDED', 'rate_limit'),
            ('INTERNAL_SERVER_ERROR', 'server_error'),
            ('NETWORK_ERROR', 'network')
        ]
        
        for error_code, expected_category in test_cases:
            result = get_error_category(error_code)
            assert result == expected_category
    
    def test_get_error_category_invalid_code(self):
        """Test getting category for invalid error code."""
        result = get_error_category('NONEXISTENT_ERROR')
        
        # Should return default category (server_error)
        assert result == 'server_error'
    
    def test_get_error_category_empty_code(self):
        """Test getting category for empty error code."""
        result = get_error_category('')
        assert result == 'server_error'


class TestErrorCodesIntegration:
    """Test integration scenarios for error codes."""
    
    def test_all_error_codes_have_valid_categories(self):
        """Test that all error codes reference valid categories."""
        valid_categories = set(ERROR_CATEGORIES.values())
        
        for error_code, error_details in ERROR_CODES.items():
            assert error_details['category'] in valid_categories
    
    def test_error_codes_consistency(self):
        """Test consistency across error code functions."""
        for error_code in ERROR_CODES.keys():
            # Test consistency between functions
            details = get_error_details(error_code)
            category = get_error_category(error_code)
            retryable = is_retryable_error(error_code)
            
            assert details['category'] == category
            assert details['retryable'] == retryable
    
    def test_error_message_quality(self):
        """Test that all error messages are user-friendly."""
        for error_code, error_details in ERROR_CODES.items():
            message = error_details['message']
            
            # Messages should be non-empty and readable
            assert len(message) > 10  # Reasonable minimum length
            assert message[0].isupper()  # Should start with capital letter
    
    def test_http_status_codes_validity(self):
        """Test that all HTTP status codes are valid."""
        valid_status_codes = {0, 400, 401, 403, 404, 409, 429, 500, 503}
        
        for error_code, error_details in ERROR_CODES.items():
            status = error_details['http_status']
            assert status in valid_status_codes, f"Invalid status code {status} for {error_code}"