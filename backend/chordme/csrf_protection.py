"""
CSRF protection functionality for ChordMe authentication endpoints.

Provides token-based CSRF protection for state-changing operations
like user registration and login.
"""

import secrets
import time
import hmac
import hashlib
from flask import request, current_app, session
from functools import wraps


class CSRFProtection:
    """Simple CSRF protection using token-based validation."""
    
    def __init__(self):
        # Store valid tokens with their expiration times
        self.tokens = {}
        self.token_expiry = 3600  # 1 hour
    
    def generate_token(self, session_id=None):
        """
        Generate a new CSRF token.
        
        Args:
            session_id: Optional session identifier
            
        Returns:
            str: CSRF token
        """
        # Generate random token
        token_data = secrets.token_urlsafe(32)
        timestamp = str(int(time.time()))
        
        # Create session-specific token if session_id provided
        if session_id:
            token_key = f"{session_id}:{timestamp}"
        else:
            token_key = f"anonymous:{timestamp}"
        
        # Create HMAC signature
        try:
            secret_key = current_app.config.get('SECRET_KEY', 'default-secret')
        except RuntimeError:
            # No app context available, use default
            secret_key = 'default-secret'
        signature = hmac.new(
            secret_key.encode('utf-8'),
            f"{token_key}:{token_data}".encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Combine token parts
        csrf_token = f"{token_data}.{timestamp}.{signature}"
        
        # Store token with expiration
        expiry_time = time.time() + self.token_expiry
        self.tokens[csrf_token] = expiry_time
        
        # Clean up expired tokens periodically
        self._cleanup_expired_tokens()
        
        try:
            current_app.logger.debug(f"Generated CSRF token for session: {session_id or 'anonymous'}")
        except RuntimeError:
            # No app context available, skip logging
            pass
        
        return csrf_token
    
    def validate_token(self, token, session_id=None):
        """
        Validate a CSRF token.
        
        Args:
            token: The CSRF token to validate
            session_id: Optional session identifier
            
        Returns:
            bool: True if token is valid, False otherwise
        """
        if not token:
            return False
        
        try:
            # Parse token parts
            parts = token.split('.')
            if len(parts) != 3:
                return False
            
            token_data, timestamp, signature = parts
            
            # Check token exists and hasn't expired
            if token not in self.tokens:
                try:
                    current_app.logger.warning(f"CSRF token not found: {token[:16]}...")
                except RuntimeError:
                    pass
                return False
            
            if time.time() > self.tokens[token]:
                try:
                    current_app.logger.warning(f"CSRF token expired: {token[:16]}...")
                except RuntimeError:
                    pass
                del self.tokens[token]
                return False
            
            # Verify HMAC signature
            if session_id:
                token_key = f"{session_id}:{timestamp}"
            else:
                token_key = f"anonymous:{timestamp}"
            
            try:
                secret_key = current_app.config.get('SECRET_KEY', 'default-secret')
            except RuntimeError:
                secret_key = 'default-secret'
            expected_signature = hmac.new(
                secret_key.encode('utf-8'),
                f"{token_key}:{token_data}".encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                try:
                    current_app.logger.warning(f"CSRF token signature mismatch: {token[:16]}...")
                except RuntimeError:
                    pass
                return False
            
            # Token is valid, remove it (one-time use)
            del self.tokens[token]
            
            try:
                current_app.logger.debug(f"CSRF token validated successfully: {token[:16]}...")
            except RuntimeError:
                pass
            return True
            
        except Exception as e:
            try:
                current_app.logger.error(f"CSRF token validation error: {str(e)}")
            except RuntimeError:
                pass
            return False
    
    def _cleanup_expired_tokens(self):
        """Remove expired tokens to prevent memory bloat."""
        current_time = time.time()
        expired_tokens = [token for token, expiry in self.tokens.items() if current_time > expiry]
        
        for token in expired_tokens:
            del self.tokens[token]
        
        if expired_tokens:
            try:
                current_app.logger.debug(f"Cleaned up {len(expired_tokens)} expired CSRF tokens")
            except RuntimeError:
                pass


# Global CSRF protection instance
csrf_protection = CSRFProtection()


def csrf_protect(require_token=True):
    """
    Decorator to add CSRF protection to endpoints.
    
    Args:
        require_token: Whether to require a valid CSRF token
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if require_token:
                # CSRF protection only applies to unsafe HTTP methods
                # Safe methods (GET, HEAD, OPTIONS, TRACE) are exempt
                safe_methods = {'GET', 'HEAD', 'OPTIONS', 'TRACE'}
                
                if request.method not in safe_methods:
                    # Get CSRF token from various sources
                    csrf_token = None
                    
                    # Check headers first
                    csrf_token = request.headers.get('X-CSRF-Token')
                    
                    # Check form data if not in headers
                    if not csrf_token and request.is_json:
                        data = request.get_json() or {}
                        csrf_token = data.get('csrf_token')
                    elif not csrf_token:
                        csrf_token = request.form.get('csrf_token')
                    
                    # Get session ID if available
                    session_id = session.get('id') if 'session' in globals() else None
                    
                    # Validate token
                    if not csrf_protection.validate_token(csrf_token, session_id):
                        try:
                            current_app.logger.warning(
                                f"CSRF protection triggered for {f.__name__} from IP {request.remote_addr}"
                            )
                        except RuntimeError:
                            pass
                        
                        from .utils import create_error_response
                        return create_error_response(
                            "CSRF token validation failed. Please refresh and try again.", 
                            403
                        )
            
            # Execute the original function
            return f(*args, **kwargs)
            
        return decorated_function
    return decorator


def get_csrf_token():
    """
    Get a new CSRF token for the current session.
    
    Returns:
        str: CSRF token
    """
    session_id = session.get('id') if 'session' in globals() else None
    return csrf_protection.generate_token(session_id)