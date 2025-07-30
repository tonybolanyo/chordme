"""
HTTPS enforcement module for ChordMe application.

Provides HTTPS redirect functionality and HSTS (HTTP Strict Transport Security)
headers to ensure all API traffic is encrypted in production environments.
"""

from flask import request, redirect, url_for, current_app
from functools import wraps
import os


def is_https_required():
    """
    Check if HTTPS enforcement is enabled based on configuration.
    
    Returns:
        bool: True if HTTPS should be enforced, False otherwise
    """
    # Check for explicit configuration first
    https_config = current_app.config.get('HTTPS_ENFORCED')
    if https_config is not None:
        return bool(https_config)
    
    # Check environment variable
    env_value = os.environ.get('HTTPS_ENFORCED', '').lower()
    if env_value in ('true', '1', 'yes', 'on'):
        return True
    elif env_value in ('false', '0', 'no', 'off'):
        return False
    
    # Default: enforce HTTPS in production, disable in development/testing
    return not (current_app.config.get('DEBUG', False) or 
                current_app.config.get('TESTING', False))


def is_secure_request():
    """
    Check if the current request is using HTTPS.
    
    Handles various proxy and load balancer scenarios where the
    original HTTPS request may be terminated at the proxy level.
    
    Returns:
        bool: True if request is secure (HTTPS), False otherwise
    """
    # Direct HTTPS check
    if request.is_secure:
        return True
    
    # Check common proxy headers for HTTPS termination
    # X-Forwarded-Proto header (standard for many load balancers)
    if request.headers.get('X-Forwarded-Proto') == 'https':
        return True
    
    # X-Forwarded-SSL header (used by some proxies)
    if request.headers.get('X-Forwarded-SSL') == 'on':
        return True
    
    # X-Scheme header (used by some proxies)
    if request.headers.get('X-Scheme') == 'https':
        return True
    
    # HTTP_X_FORWARDED_PROTO header (alternative format)
    if request.environ.get('HTTP_X_FORWARDED_PROTO') == 'https':
        return True
    
    return False


def get_https_url():
    """
    Convert the current request URL to HTTPS.
    
    Returns:
        str: The HTTPS version of the current URL
    """
    url = request.url
    if url.startswith('http://'):
        return url.replace('http://', 'https://', 1)
    return url


def add_hsts_headers(response):
    """
    Add HTTP Strict Transport Security (HSTS) headers to the response.
    
    Args:
        response: Flask response object
        
    Returns:
        Flask response object with HSTS headers added
    """
    if is_https_required():
        # HSTS header: enforce HTTPS for 1 year, include subdomains
        # max-age=31536000 = 1 year in seconds
        # includeSubDomains: apply to all subdomains
        # preload: eligible for browser HSTS preload lists
        hsts_value = 'max-age=31536000; includeSubDomains'
        
        # Add preload directive only in production (not development)
        if not current_app.config.get('DEBUG', False):
            hsts_value += '; preload'
        
        response.headers['Strict-Transport-Security'] = hsts_value
    
    return response


def enforce_https(f):
    """
    Decorator to enforce HTTPS for a specific endpoint.
    
    Redirects HTTP requests to HTTPS if HTTPS enforcement is enabled.
    Adds HSTS headers to all responses when HTTPS is enforced.
    
    Args:
        f: The Flask route function to decorate
        
    Returns:
        Decorated function that enforces HTTPS
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip HTTPS enforcement if disabled
        if not is_https_required():
            result = f(*args, **kwargs)
            return result
        
        # Check if request is already secure
        if not is_secure_request():
            # Redirect to HTTPS version
            https_url = get_https_url()
            current_app.logger.info(
                f"Redirecting HTTP request to HTTPS: {request.url} -> {https_url}"
            )
            return redirect(https_url, code=301)  # Permanent redirect
        
        # Process the request normally
        result = f(*args, **kwargs)
        
        # Add HSTS headers to response
        if hasattr(result, 'headers'):
            result = add_hsts_headers(result)
        elif isinstance(result, tuple) and len(result) >= 2:
            # Handle (data, status_code) or (data, status_code, headers) tuples
            from flask import make_response
            response = make_response(result)
            result = add_hsts_headers(response)
        else:
            # Convert to response and add headers
            from flask import make_response
            response = make_response(result)
            result = add_hsts_headers(response)
        
        return result
    
    return decorated_function


def enforce_https_globally():
    """
    Apply HTTPS enforcement to all requests globally.
    
    This can be used as a before_request handler to enforce HTTPS
    across the entire application.
    """
    # Skip HTTPS enforcement if disabled
    if not is_https_required():
        return None
    
    # Skip for static files and non-API routes if needed
    if request.endpoint and request.endpoint.startswith('static'):
        return None
    
    # Check if request is already secure
    if not is_secure_request():
        # Redirect to HTTPS version
        https_url = get_https_url()
        current_app.logger.info(
            f"Global HTTPS redirect: {request.url} -> {https_url}"
        )
        return redirect(https_url, code=301)  # Permanent redirect
    
    return None


def add_hsts_headers_globally(response):
    """
    Add HSTS headers to all responses globally.
    
    This can be used as an after_request handler to add HSTS headers
    to all responses when HTTPS is enforced.
    
    Args:
        response: Flask response object
        
    Returns:
        Flask response object with HSTS headers added
    """
    return add_hsts_headers(response)


class HTTPSEnforcement:
    """
    Flask extension for HTTPS enforcement.
    
    Provides easy integration of HTTPS enforcement into Flask applications.
    """
    
    def __init__(self, app=None):
        """
        Initialize the HTTPS enforcement extension.
        
        Args:
            app: Flask application instance (optional)
        """
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """
        Initialize the extension with a Flask application.
        
        Args:
            app: Flask application instance
        """
        # Set default configuration
        app.config.setdefault('HTTPS_ENFORCED', None)  # None = auto-detect
        
        # Register global handlers
        app.before_request(enforce_https_globally)
        app.after_request(add_hsts_headers_globally)
        
        # Store reference to the app
        self.app = app


# Global instance for easy import
https_enforcement = HTTPSEnforcement()