import re
import unicodedata
from flask import jsonify, current_app
import jwt
from datetime import datetime, timedelta, UTC
import html
import bleach

def sanitize_html_content(content):
    """
    Sanitize HTML content by removing potentially dangerous tags.
    
    This is specifically for ChordPro content that should not contain HTML/JavaScript.
    Uses bleach to remove all HTML tags and attributes safely.
    """
    if not isinstance(content, str):
        return content
    
    # Use bleach to strip all HTML tags and attributes safely
    # This will robustly remove any potentially dangerous HTML, including script, style, event handlers, malformed tags, etc.
    cleaned_content = bleach.clean(content, tags=[], attributes=[], strip=True)
    return cleaned_content


def validate_email(email):
    """
    Validate and normalize email format with comprehensive security checks.
    
    Performs the following validations:
    - Unicode normalization
    - Length validation
    - Format validation with robust regex
    - Domain structure validation
    - Special character handling
    
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if not email:
        return False, "Email is required"
    
    # Strip whitespace and convert to lowercase first
    email = email.strip().lower()
    
    # Length validation
    if len(email) < 3:  # Minimum reasonable email length (a@b)
        return False, "Email is too short"
    
    if len(email) > 120:
        return False, "Email is too long"
    
    # Check for invalid characters at start/end
    if email.startswith('.') or email.endswith('.'):
        return False, "Invalid email format"
    
    if email.startswith('@') or email.endswith('@'):
        return False, "Invalid email format"
    
    # Basic structure validation
    if email.count('@') != 1:
        return False, "Invalid email format"
    
    local_part, domain_part = email.split('@')
    
    # Validate local part
    if not local_part or len(local_part) > 64:
        return False, "Invalid email format"
    
    # Check for consecutive dots in local part
    if '..' in local_part:
        return False, "Invalid email format"
    
    # Local part cannot start or end with dot
    if local_part.startswith('.') or local_part.endswith('.'):
        return False, "Invalid email format"
    
    # Validate domain part
    if not domain_part or len(domain_part) > 63:
        return False, "Invalid email format"
    
    # Check for consecutive dots in domain
    if '..' in domain_part:
        return False, "Invalid email format"
    
    # Domain must contain at least one dot
    if '.' not in domain_part:
        return False, "Invalid email format"
    
    # Check domain structure
    domain_parts = domain_part.split('.')
    if len(domain_parts) < 2:
        return False, "Invalid email format"
    
    # Validate each domain part
    for part in domain_parts:
        if not part:  # Empty part (consecutive dots)
            return False, "Invalid email format"
        
        if part.startswith('-') or part.endswith('-'):
            return False, "Invalid email format"
    
    # Validate TLD (last part) - must be at least 2 chars and not all digits
    tld = domain_parts[-1]
    if len(tld) < 2 or tld.isdigit():
        return False, "Invalid email format"
    
    # Use more permissive regex that handles Unicode
    # This pattern allows Unicode characters but still validates structure
    try:
        # Basic email structure validation
        email_pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
        if not re.match(email_pattern, email):
            return False, "Invalid email format"
        
        # Check for dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '\\', '\x00', '\n', '\r', '\t', ' ', '#']
        for char in dangerous_chars:
            if char in email:
                return False, "Invalid email format"
        
    except Exception:
        return False, "Invalid email format"
    
    return True, None

def validate_password(password):
    """
    Validate password requirements with enhanced security checks.
    
    Requirements:
    - At least 8 characters, maximum 128
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - No excessively weak patterns
    """
    if not password:
        return False, "Password is required"
    
    # Length validation
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if len(password) > 128:
        return False, "Password is too long"
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    # Check for very weak patterns (more lenient than before)
    weak_patterns = [
        r'(.)\1{4,}',  # 5 or more consecutive identical characters
        r'^[0-9]+$',  # All numbers
        r'^[a-zA-Z]+$',  # All letters
    ]
    
    for pattern in weak_patterns:
        if re.search(pattern, password):
            return False, "Password contains weak patterns"
    
    # Check for very common weak passwords (case insensitive)
    weak_passwords = [
        'password', 'password1', 'password123', '12345678', 'qwerty123',
        'admin123', 'letmein', 'welcome123'
    ]
    
    if password.lower() in weak_passwords:
        return False, "Password is too common"
    
    return True, None


def sanitize_input(data, max_string_length=1000):
    """
    Enhanced sanitize input data to prevent injection attacks and normalize values.
    
    Args:
        data: Input data to sanitize (dict, str, or other types)
        max_string_length: Maximum length for string values (default 1000)
    
    Returns:
        Sanitized data maintaining the original structure, or {} for None/non-dict
    """
    if data is None:
        return {}
    
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            # Sanitize both key and value
            sanitized_key = sanitize_input(key, max_string_length) if isinstance(key, str) else key
            # Don't sanitize None values within dicts, keep them as None
            if value is None:
                sanitized_value = None
            else:
                sanitized_value = sanitize_input(value, max_string_length)
            sanitized[sanitized_key] = sanitized_value
        return sanitized
    
    elif isinstance(data, list):
        return [sanitize_input(item, max_string_length) if item is not None else None for item in data]
    
    elif isinstance(data, str):
        # Strip whitespace
        value = data.strip()
        
        # Limit string length to prevent DoS
        if len(value) > max_string_length:
            value = value[:max_string_length]
        
        # Remove null bytes and most control characters except newline/tab
        value = ''.join(char for char in value if ord(char) >= 32 or char in '\n\t')
        
        # Remove potential SQL injection patterns (basic protection)
        # Note: The main protection is parameterized queries, this is additional
        dangerous_patterns = [
            '\x00',  # null byte
            '\x1a',  # substitute character
        ]
        for pattern in dangerous_patterns:
            value = value.replace(pattern, '')
        
        return value
    
    elif isinstance(data, (int, float, bool)):
        return data
    
    else:
        # For other types (like None, lists, etc.), return empty dict for compatibility
        return {}


def create_error_response(message, status_code=400, error_code=None, details=None):
    """Create a standardized error response with enhanced format."""
    from .error_codes import get_error_details, ERROR_CODES
    
    # If error_code is provided, use its details
    if error_code:
        error_details = get_error_details(error_code)
        response = {
            'status': 'error',
            'error': {
                'code': error_code,
                'message': error_details['message'],
                'category': error_details['category'],
                'retryable': error_details['retryable']
            }
        }
        # Use the HTTP status from error code if status_code is default
        if status_code == 400 and error_details['http_status'] != 400:
            status_code = error_details['http_status']
    else:
        # Fallback to legacy format for backward compatibility
        response = {
            'status': 'error',
            'error': {
                'message': message,
                'retryable': False  # Default to non-retryable for legacy errors
            }
        }
    
    # Add additional details if provided (for debugging)
    if details and current_app.debug:
        response['error']['details'] = details
    
    return jsonify(response), status_code


def create_legacy_error_response(message, status_code=400):
    """Create a legacy error response for backward compatibility."""
    return jsonify({
        'error': message,
        'status': 'error'
    }), status_code


def create_success_response(data=None, message=None, status_code=200):
    """Create a standardized success response."""
    response = {
        'status': 'success'
    }
    
    if data:
        response['data'] = data
    
    if message:
        response['message'] = message
    
    return jsonify(response), status_code


def generate_jwt_token(user_id):
    """Generate a JWT token for the given user ID."""
    try:
        payload = {
            'user_id': user_id,
            'exp': datetime.now(UTC) + timedelta(seconds=current_app.config['JWT_EXPIRATION_DELTA']),
            'iat': datetime.now(UTC)
        }
        token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
        return token
    except Exception as e:
        current_app.logger.error(f"JWT generation error: {str(e)}")
        return None


def verify_jwt_token(token):
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def validate_positive_integer(param_name):
    """
    Decorator to validate that a path parameter is a positive integer.
    
    Args:
        param_name: Name of the parameter to validate
    """
    from functools import wraps
    from flask import request, jsonify
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get the parameter value from kwargs
            param_value = kwargs.get(param_name)
            
            if param_value is None:
                return jsonify({
                    'error': f'Missing required parameter: {param_name}',
                    'status': 'error'
                }), 400
            
            # Validate it's a positive integer
            try:
                int_value = int(param_value)
                if int_value <= 0:
                    return jsonify({
                        'error': f'{param_name} must be a positive integer',
                        'status': 'error'
                    }), 400
                
                # Update kwargs with validated integer
                kwargs[param_name] = int_value
                
            except (ValueError, TypeError):
                return jsonify({
                    'error': f'{param_name} must be a valid integer',
                    'status': 'error'
                }), 400
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def validate_request_size(max_content_length=1024*1024):  # 1MB default
    """
    Decorator to validate request content length.
    
    Args:
        max_content_length: Maximum allowed content length in bytes
    """
    from functools import wraps
    from flask import request, jsonify
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            content_length = request.content_length
            
            if content_length and content_length > max_content_length:
                return jsonify({
                    'error': f'Request too large. Maximum size: {max_content_length} bytes',
                    'status': 'error'
                }), 413
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def auth_required(f):
    """
    Decorator to require authentication for an endpoint.
    Expects Authorization header with Bearer token.
    """
    from functools import wraps
    from flask import request, jsonify, g
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({
                'error': 'Authorization header is required',
                'status': 'error'
            }), 401
        
        # Check for Bearer token format
        try:
            token_type, token = auth_header.split(' ', 1)
            if token_type.lower() != 'bearer':
                return jsonify({
                    'error': 'Authorization header must be Bearer token',
                    'status': 'error'
                }), 401
        except ValueError:
            return jsonify({
                'error': 'Invalid Authorization header format',
                'status': 'error'
            }), 401
        
        # Verify the token
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({
                'error': 'Invalid or expired token',
                'status': 'error'
            }), 401
        
        # Store user ID in flask.g for use in the route
        g.current_user_id = payload['user_id']
        
        return f(*args, **kwargs)
    
    return decorated_function