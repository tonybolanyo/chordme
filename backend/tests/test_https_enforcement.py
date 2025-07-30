"""
Tests for HTTPS enforcement functionality.

Tests the HTTPS redirect behavior, HSTS headers, and configuration options
for the ChordMe application's HTTPS enforcement system.
"""

import pytest
from flask import Flask
from chordme.https_enforcement import (
    HTTPSEnforcement, 
    is_https_required, 
    is_secure_request, 
    get_https_url,
    add_hsts_headers,
    enforce_https
)


class TestHTTPSEnforcement:
    """Test HTTPS enforcement functionality."""
    
    def test_https_required_with_explicit_config(self, app):
        """Test HTTPS requirement detection with explicit configuration."""
        with app.app_context():
            # Test explicit True
            app.config['HTTPS_ENFORCED'] = True
            assert is_https_required() is True
            
            # Test explicit False
            app.config['HTTPS_ENFORCED'] = False
            assert is_https_required() is False
    
    def test_https_required_auto_detect_production(self, app):
        """Test HTTPS requirement auto-detection in production mode."""
        with app.app_context():
            # Production mode (DEBUG=False, TESTING=False)
            app.config['HTTPS_ENFORCED'] = None
            app.config['DEBUG'] = False
            app.config['TESTING'] = False
            assert is_https_required() is True
    
    def test_https_required_auto_detect_development(self, app):
        """Test HTTPS requirement auto-detection in development mode."""
        with app.app_context():
            # Development mode (DEBUG=True)
            app.config['HTTPS_ENFORCED'] = None
            app.config['DEBUG'] = True
            app.config['TESTING'] = False
            assert is_https_required() is False
    
    def test_https_required_auto_detect_testing(self, app):
        """Test HTTPS requirement auto-detection in testing mode."""
        with app.app_context():
            # Testing mode (TESTING=True)
            app.config['HTTPS_ENFORCED'] = None
            app.config['DEBUG'] = False
            app.config['TESTING'] = True
            assert is_https_required() is False
    
    def test_https_required_environment_variable(self, app, monkeypatch):
        """Test HTTPS requirement detection from environment variable."""
        with app.app_context():
            app.config['HTTPS_ENFORCED'] = None
            
            # Test various true values
            for value in ['true', 'True', '1', 'yes', 'YES', 'on', 'ON']:
                monkeypatch.setenv('HTTPS_ENFORCED', value)
                assert is_https_required() is True
            
            # Test various false values
            for value in ['false', 'False', '0', 'no', 'NO', 'off', 'OFF']:
                monkeypatch.setenv('HTTPS_ENFORCED', value)
                assert is_https_required() is False


class TestSecureRequestDetection:
    """Test secure request detection functionality."""
    
    def test_direct_https_detection(self, app, client):
        """Test direct HTTPS request detection."""
        with app.test_request_context('https://localhost/api/test'):
            assert is_secure_request() is True
        
        with app.test_request_context('http://localhost/api/test'):
            assert is_secure_request() is False
    
    def test_proxy_headers_detection(self, app):
        """Test HTTPS detection through proxy headers."""
        # Test X-Forwarded-Proto header
        with app.test_request_context('http://localhost/api/test', 
                                    headers={'X-Forwarded-Proto': 'https'}):
            assert is_secure_request() is True
        
        # Test X-Forwarded-SSL header
        with app.test_request_context('http://localhost/api/test', 
                                    headers={'X-Forwarded-SSL': 'on'}):
            assert is_secure_request() is True
        
        # Test X-Scheme header
        with app.test_request_context('http://localhost/api/test', 
                                    headers={'X-Scheme': 'https'}):
            assert is_secure_request() is True
    
    def test_environ_headers_detection(self, app):
        """Test HTTPS detection through environ headers."""
        with app.test_request_context('http://localhost/api/test', 
                                    environ_base={'HTTP_X_FORWARDED_PROTO': 'https'}):
            assert is_secure_request() is True


class TestHTTPSRedirection:
    """Test HTTPS redirection functionality."""
    
    def test_https_url_conversion(self, app):
        """Test HTTP to HTTPS URL conversion."""
        with app.test_request_context('http://localhost:5000/api/test?param=value'):
            https_url = get_https_url()
            assert https_url == 'https://localhost:5000/api/test?param=value'
        
        with app.test_request_context('https://localhost:5000/api/test'):
            https_url = get_https_url()
            assert https_url == 'https://localhost:5000/api/test'
    
    def test_https_enforcement_disabled(self, client):
        """Test that HTTPS enforcement can be disabled."""
        from chordme import app
        app.config['HTTPS_ENFORCED'] = False
        
        @app.route('/test-endpoint')
        @enforce_https
        def test_endpoint():
            return {'status': 'ok'}
        
        with app.test_client() as test_client:
            # HTTP request should not be redirected when enforcement is disabled
            response = test_client.get('/test-endpoint')
            assert response.status_code == 200
            assert response.get_json()['status'] == 'ok'
    
    def test_https_enforcement_enabled_redirect(self, client):
        """Test HTTPS enforcement redirects HTTP to HTTPS."""
        from chordme import app
        app.config['HTTPS_ENFORCED'] = True
        
        @app.route('/test-endpoint-redirect')
        @enforce_https
        def test_endpoint():
            return {'status': 'ok'}
        
        with app.test_client() as test_client:
            # HTTP request should be redirected to HTTPS
            response = test_client.get('/test-endpoint-redirect')
            assert response.status_code == 301
            assert response.location.startswith('https://')
    
    def test_https_enforcement_secure_request_passes(self, client):
        """Test that HTTPS requests pass through when enforcement is enabled."""
        from chordme import app
        app.config['HTTPS_ENFORCED'] = True
        
        @app.route('/test-endpoint-secure')
        @enforce_https
        def test_endpoint():
            return {'status': 'ok'}
        
        with app.test_client() as test_client:
            # Simulate HTTPS request with proxy header
            response = test_client.get('/test-endpoint-secure', headers={'X-Forwarded-Proto': 'https'})
            assert response.status_code == 200
            assert response.get_json()['status'] == 'ok'


class TestHSTSHeaders:
    """Test HSTS (HTTP Strict Transport Security) headers."""
    
    def test_hsts_headers_added_when_enabled(self, client):
        """Test that HSTS headers are added when HTTPS is enforced."""
        from chordme import app
        app.config['HTTPS_ENFORCED'] = True
        app.config['DEBUG'] = False
        
        @app.route('/test-endpoint-hsts')
        @enforce_https
        def test_endpoint():
            return {'status': 'ok'}
        
        with app.test_client() as test_client:
            # Simulate HTTPS request
            response = test_client.get('/test-endpoint-hsts', headers={'X-Forwarded-Proto': 'https'})
            assert response.status_code == 200
            
            # Check HSTS header
            hsts_header = response.headers.get('Strict-Transport-Security')
            assert hsts_header is not None
            assert 'max-age=31536000' in hsts_header  # 1 year
            assert 'includeSubDomains' in hsts_header
            assert 'preload' in hsts_header  # Should include preload in production
    
    def test_hsts_headers_development_mode(self, client):
        """Test HSTS headers in development mode."""
        from chordme import app
        app.config['HTTPS_ENFORCED'] = True
        app.config['DEBUG'] = True
        
        @app.route('/test-endpoint-dev')
        @enforce_https
        def test_endpoint():
            return {'status': 'ok'}
        
        with app.test_client() as test_client:
            # Simulate HTTPS request in development
            response = test_client.get('/test-endpoint-dev', headers={'X-Forwarded-Proto': 'https'})
            assert response.status_code == 200
            
            # Check HSTS header
            hsts_header = response.headers.get('Strict-Transport-Security')
            assert hsts_header is not None
            assert 'max-age=31536000' in hsts_header
            assert 'includeSubDomains' in hsts_header
            assert 'preload' not in hsts_header  # Should not include preload in development
    
    def test_hsts_headers_not_added_when_disabled(self, client):
        """Test that HSTS headers are not added when HTTPS enforcement is disabled."""
        from chordme import app
        app.config['HTTPS_ENFORCED'] = False
        
        @app.route('/test-endpoint-no-hsts')
        @enforce_https
        def test_endpoint():
            return {'status': 'ok'}
        
        with app.test_client() as test_client:
            response = test_client.get('/test-endpoint-no-hsts')
            assert response.status_code == 200
            
            # HSTS header should not be present
            assert 'Strict-Transport-Security' not in response.headers


class TestHTTPSEnforcementExtension:
    """Test the HTTPSEnforcement Flask extension."""
    
    def test_extension_initialization(self):
        """Test HTTPSEnforcement extension initialization."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        
        # Test initialization with app
        extension = HTTPSEnforcement(app)
        assert extension.app is app
        
        # Test initialization without app
        extension2 = HTTPSEnforcement()
        assert extension2.app is None
        
        # Test init_app method
        extension2.init_app(app)
        assert extension2.app is app
    
    def test_global_https_enforcement(self, app, client):
        """Test global HTTPS enforcement across all routes."""
        app.config['HTTPS_ENFORCED'] = True
        
        # Initialize extension with global enforcement
        HTTPSEnforcement(app)
        
        @app.route('/api/test')
        def test_api():
            return {'status': 'ok'}
        
        @app.route('/other-route')
        def other_route():
            return 'Hello World'
        
        # Both routes should redirect HTTP to HTTPS
        response1 = client.get('/api/test')
        assert response1.status_code == 301
        assert response1.location.startswith('https://')
        
        response2 = client.get('/other-route')
        assert response2.status_code == 301
        assert response2.location.startswith('https://')
        
        # HTTPS requests should pass through
        response3 = client.get('/api/test', headers={'X-Forwarded-Proto': 'https'})
        assert response3.status_code == 200
        
        response4 = client.get('/other-route', headers={'X-Forwarded-Proto': 'https'})
        assert response4.status_code == 200
    
    def test_global_hsts_headers(self, app, client):
        """Test global HSTS headers on all responses."""
        app.config['HTTPS_ENFORCED'] = True
        
        # Initialize extension with global enforcement
        HTTPSEnforcement(app)
        
        @app.route('/api/test')
        def test_api():
            return {'status': 'ok'}
        
        # HTTPS request should include HSTS headers
        response = client.get('/api/test', headers={'X-Forwarded-Proto': 'https'})
        assert response.status_code == 200
        assert 'Strict-Transport-Security' in response.headers


class TestIntegrationWithExistingEndpoints:
    """Test HTTPS enforcement integration with existing API endpoints."""
    
    def test_health_endpoint_https_enforcement(self, app, client):
        """Test HTTPS enforcement on the health endpoint."""
        app.config['HTTPS_ENFORCED'] = True
        
        # Initialize HTTPS enforcement
        HTTPSEnforcement(app)
        
        # HTTP request should be redirected
        response = client.get('/api/v1/health')
        assert response.status_code == 301
        assert response.location.startswith('https://')
        
        # HTTPS request should work normally
        response = client.get('/api/v1/health', headers={'X-Forwarded-Proto': 'https'})
        assert response.status_code == 200
        assert 'Strict-Transport-Security' in response.headers
    
    def test_auth_endpoints_https_enforcement(self, app, client):
        """Test HTTPS enforcement on authentication endpoints."""
        app.config['HTTPS_ENFORCED'] = True
        
        # Initialize HTTPS enforcement
        HTTPSEnforcement(app)
        
        # Test registration endpoint
        response = client.post('/api/v1/auth/register', json={
            'email': 'test@example.com',
            'password': 'TestPass123!'
        })
        assert response.status_code == 301
        assert response.location.startswith('https://')
        
        # Test login endpoint
        response = client.post('/api/v1/auth/login', json={
            'email': 'test@example.com',
            'password': 'TestPass123!'
        })
        assert response.status_code == 301
        assert response.location.startswith('https://')
    
    def test_development_mode_no_enforcement(self, app, client):
        """Test that development mode doesn't enforce HTTPS by default."""
        app.config['HTTPS_ENFORCED'] = None  # Auto-detect mode
        app.config['DEBUG'] = True  # Development mode
        
        # Initialize HTTPS enforcement
        HTTPSEnforcement(app)
        
        # HTTP requests should not be redirected in development
        response = client.get('/api/v1/health')
        assert response.status_code == 200
        assert 'Strict-Transport-Security' not in response.headers


class TestErrorHandling:
    """Test error handling in HTTPS enforcement."""
    
    def test_https_enforcement_with_exception(self, app, client):
        """Test HTTPS enforcement behavior when endpoint raises exception."""
        app.config['HTTPS_ENFORCED'] = True
        
        @app.route('/test-error')
        @enforce_https
        def test_error():
            raise Exception("Test error")
        
        # HTTP request should still be redirected even if endpoint would error
        response = client.get('/test-error')
        assert response.status_code == 301
        assert response.location.startswith('https://')
    
    def test_hsts_headers_with_various_response_types(self, app, client):
        """Test HSTS headers with different response types."""
        app.config['HTTPS_ENFORCED'] = True
        
        @app.route('/test-dict')
        @enforce_https
        def test_dict():
            return {'status': 'ok'}
        
        @app.route('/test-tuple')
        @enforce_https
        def test_tuple():
            return {'status': 'ok'}, 201
        
        @app.route('/test-string')
        @enforce_https
        def test_string():
            return 'Hello World'
        
        # Test all response types with HTTPS
        for endpoint in ['/test-dict', '/test-tuple', '/test-string']:
            response = client.get(endpoint, headers={'X-Forwarded-Proto': 'https'})
            assert response.status_code in [200, 201]
            assert 'Strict-Transport-Security' in response.headers