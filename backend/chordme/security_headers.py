"""
Security headers and enhanced error handling for ChordMe application.

Provides security-related HTTP headers and robust error handling
to protect against common web vulnerabilities.
"""

from flask import current_app
from functools import wraps


def add_security_headers(response):
    """
    Add security-related HTTP headers to responses.
    
    Args:
        response: Flask response object
        
    Returns:
        Flask response object with added headers
    """
    # Prevent clickjacking attacks
    response.headers['X-Frame-Options'] = 'DENY'
    
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Enable XSS protection
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Only send referrer for same-origin requests
    response.headers['Referrer-Policy'] = 'same-origin'
    
    # Prevent Adobe Flash and PDF files from loading content
    response.headers['X-Permitted-Cross-Domain-Policies'] = 'none'
    
    # Content Security Policy for API endpoints
    response.headers['Content-Security-Policy'] = (
        "default-src 'none'; "
        "script-src 'none'; "
        "style-src 'none'; "
        "img-src 'none'; "
        "font-src 'none'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    
    # Feature Policy to disable unused browser features
    response.headers['Permissions-Policy'] = (
        "accelerometer=(), "
        "camera=(), "
        "geolocation=(), "
        "gyroscope=(), "
        "magnetometer=(), "
        "microphone=(), "
        "payment=(), "
        "usb=()"
    )
    
    return response


def security_headers(f):
    """
    Decorator to add security headers to endpoint responses.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        result = f(*args, **kwargs)
        
        # Handle different response formats
        if isinstance(result, tuple) and len(result) >= 2:
            if hasattr(result[0], 'headers'):
                response = add_security_headers(result[0])
                return (response,) + result[1:]
            else:
                # It's a (data, status_code) tuple, need to convert to response
                from flask import jsonify
                response = jsonify(result[0])
                response = add_security_headers(response)
                return response, result[1]
        elif hasattr(result, 'headers'):
            result = add_security_headers(result)
        else:
            # It's just data, convert to response
            from flask import jsonify
            response = jsonify(result)
            result = add_security_headers(response)
        
        return result
        
    return decorated_function


class SecurityErrorHandler:
    """Enhanced error handling with security considerations."""
    
    @staticmethod
    def handle_validation_error(error_msg, details=None):
        """
        Handle validation errors securely.
        
        Args:
            error_msg: User-friendly error message
            details: Optional detailed error information (for logging only)
            
        Returns:
            tuple: (response, status_code)
        """
        # Log detailed error for debugging (server-side only)
        if details:
            current_app.logger.warning(f"Validation error: {details}")
        
        # Return generic user-friendly message
        from .utils import create_error_response
        return create_error_response(error_msg, 400)
    
    @staticmethod
    def handle_authentication_error(error_msg, ip_address=None):
        """
        Handle authentication errors securely.
        
        Args:
            error_msg: User-friendly error message
            ip_address: Client IP address for logging
            
        Returns:
            tuple: (response, status_code)
        """
        # Log authentication failure for security monitoring
        log_msg = f"Authentication failed: {error_msg}"
        if ip_address:
            log_msg += f" from IP {ip_address}"
        
        current_app.logger.warning(log_msg)
        
        # Return generic error message to prevent information disclosure
        from .utils import create_error_response
        return create_error_response("Invalid email or password", 401)
    
    @staticmethod
    def handle_authorization_error(error_msg, user_id=None, ip_address=None):
        """
        Handle authorization errors securely.
        
        Args:
            error_msg: User-friendly error message
            user_id: User ID attempting the action
            ip_address: Client IP address for logging
            
        Returns:
            tuple: (response, status_code)
        """
        # Log authorization failure for security monitoring
        log_msg = f"Authorization failed: {error_msg}"
        if user_id:
            log_msg += f" for user {user_id}"
        if ip_address:
            log_msg += f" from IP {ip_address}"
        
        current_app.logger.warning(log_msg)
        
        from .utils import create_error_response
        return create_error_response("Access denied", 403)
    
    @staticmethod
    def handle_server_error(error_msg, exception=None, ip_address=None):
        """
        Handle server errors securely.
        
        Args:
            error_msg: User-friendly error message
            exception: The original exception (for logging only)
            ip_address: Client IP address for logging
            
        Returns:
            tuple: (response, status_code)
        """
        # Log detailed error for debugging (server-side only)
        log_msg = f"Server error: {error_msg}"
        if exception:
            log_msg += f" - {str(exception)}"
        if ip_address:
            log_msg += f" from IP {ip_address}"
        
        current_app.logger.error(log_msg)
        
        # Return generic error message to prevent information disclosure
        from .utils import create_error_response
        return create_error_response("An internal error occurred", 500)


# Global error handler instance
security_error_handler = SecurityErrorHandler()


def secure_endpoint(require_auth=False, require_csrf=False):
    """
    Decorator to add comprehensive security to endpoints.
    
    Args:
        require_auth: Whether the endpoint requires authentication
        require_csrf: Whether the endpoint requires CSRF protection
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Apply CSRF protection if required
                if require_csrf:
                    from .csrf_protection import csrf_protect
                    csrf_decorator = csrf_protect(require_token=True)
                    protected_func = csrf_decorator(f)
                    return security_headers(protected_func)(*args, **kwargs)
                
                # Apply security headers
                return security_headers(f)(*args, **kwargs)
                
            except Exception as e:
                return security_error_handler.handle_server_error(
                    "An error occurred processing your request",
                    exception=e,
                    ip_address=current_app.request.remote_addr if hasattr(current_app, 'request') else None
                )
        
        return decorated_function
    return decorator