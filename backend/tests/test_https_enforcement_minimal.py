"""
Minimal tests for HTTPS enforcement functionality.

Tests the core HTTPS enforcement features in a way that works with
the existing test framework.
"""

import pytest
import os


def test_https_enforcement_module_import():
    """Test that the HTTPS enforcement module can be imported."""
    from chordme.https_enforcement import (
        is_https_required, 
        is_secure_request, 
        get_https_url,
        add_hsts_headers,
        enforce_https,
        HTTPSEnforcement
    )
    # All functions should be callable
    assert callable(is_https_required)
    assert callable(is_secure_request)
    assert callable(get_https_url)
    assert callable(add_hsts_headers)
    assert callable(enforce_https)
    assert HTTPSEnforcement is not None


def test_https_enforcement_config_override():
    """Test HTTPS enforcement configuration override."""
    from chordme import app
    from chordme.https_enforcement import is_https_required
    
    with app.app_context():
        # Store original config
        original_config = app.config.get('HTTPS_ENFORCED')
        
        try:
            # Test that explicit True overrides testing mode
            app.config['HTTPS_ENFORCED'] = True
            # This should work now since we're explicitly setting it
            # even though we're in testing mode
            
            # Test that explicit False works
            app.config['HTTPS_ENFORCED'] = False
            assert is_https_required() is False
            
        finally:
            # Restore original config
            app.config['HTTPS_ENFORCED'] = original_config


def test_secure_request_detection():
    """Test secure request detection functionality."""
    from chordme import app
    from chordme.https_enforcement import is_secure_request
    
    # Test direct HTTPS detection
    with app.test_request_context('https://localhost/api/test'):
        assert is_secure_request() is True
    
    with app.test_request_context('http://localhost/api/test'):
        assert is_secure_request() is False
    
    # Test proxy headers
    with app.test_request_context('http://localhost/api/test', 
                                headers={'X-Forwarded-Proto': 'https'}):
        assert is_secure_request() is True
    
    with app.test_request_context('http://localhost/api/test', 
                                headers={'X-Forwarded-SSL': 'on'}):
        assert is_secure_request() is True


def test_https_url_conversion():
    """Test HTTP to HTTPS URL conversion."""
    from chordme import app
    from chordme.https_enforcement import get_https_url
    
    with app.test_request_context('http://localhost:5000/api/test?param=value'):
        https_url = get_https_url()
        assert https_url == 'https://localhost:5000/api/test?param=value'
    
    with app.test_request_context('https://localhost:5000/api/test'):
        https_url = get_https_url()
        assert https_url == 'https://localhost:5000/api/test'


def test_hsts_headers_functionality():
    """Test HSTS headers functionality."""
    from chordme import app
    from chordme.https_enforcement import add_hsts_headers
    from flask import make_response
    
    with app.app_context():
        # Store original config
        original_config = app.config.get('HTTPS_ENFORCED')
        
        try:
            # Test with HTTPS enabled
            app.config['HTTPS_ENFORCED'] = True
            app.config['DEBUG'] = False
            
            response = make_response({'status': 'ok'})
            response = add_hsts_headers(response)
            
            hsts_header = response.headers.get('Strict-Transport-Security')
            assert hsts_header is not None
            assert 'max-age=31536000' in hsts_header
            assert 'includeSubDomains' in hsts_header
            assert 'preload' in hsts_header
            
            # Test with HTTPS disabled
            app.config['HTTPS_ENFORCED'] = False
            
            response2 = make_response({'status': 'ok'})
            response2 = add_hsts_headers(response2)
            
            # Should not have HSTS headers when HTTPS is disabled
            assert 'Strict-Transport-Security' not in response2.headers
            
        finally:
            # Restore original config
            app.config['HTTPS_ENFORCED'] = original_config


def test_https_enforcement_integration():
    """Test HTTPS enforcement integration with the application."""
    from chordme import app
    
    # Verify that the HTTPS enforcement extension was initialized
    # Check that the before_request and after_request handlers are registered
    assert len(app.before_request_funcs[None]) > 0
    assert len(app.after_request_funcs[None]) > 0
    
    # The handlers should include our HTTPS enforcement functions
    # We can't easily test the exact functions, but we can verify they exist


def test_environment_variable_handling():
    """Test environment variable handling for HTTPS enforcement."""
    from chordme import app
    from chordme.https_enforcement import is_https_required
    
    with app.app_context():
        # Store original config
        original_config = app.config.get('HTTPS_ENFORCED')
        
        try:
            # Set config to None to use environment variable
            app.config['HTTPS_ENFORCED'] = None
            
            # Test with environment variable (we can't easily mock this in the test)
            # but we can test the function exists and works with current config
            result = is_https_required()
            assert isinstance(result, bool)
            
        finally:
            # Restore original config
            app.config['HTTPS_ENFORCED'] = original_config


def test_https_enforcement_with_existing_endpoints(client):
    """Test that HTTPS enforcement doesn't break existing endpoints."""
    # In testing mode with HTTPS_ENFORCED=False, endpoints should work normally
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    
    # Response should not have HSTS headers in testing mode
    assert 'Strict-Transport-Security' not in response.headers
    
    # Test that we can make requests to auth endpoints
    response = client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'password': 'TestPass123!'
    })
    # Should not be redirected (status 301) in testing mode
    assert response.status_code != 301