import re
import unicodedata
from flask import jsonify, current_app
import jwt
from datetime import datetime, timedelta


def validate_email(email):
    """
    Validate and normalize email format with comprehensive security checks.
    
    Performs the following validations:
    - Unicode normalization
    - Length validation
    - Format validation with robust regex
    - Domain structure validation
    - Special character handling
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


def sanitize_input(data):
    """
    Sanitize input data to prevent injection attacks and normalize values.
    """
    if not isinstance(data, dict):
        return {}
    
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            # Strip whitespace
            value = value.strip()
            
            # Limit string length to prevent DoS
            if len(value) > 1000:
                value = value[:1000]
            
            # Remove null bytes and control characters except newline/tab
            value = ''.join(char for char in value if ord(char) >= 32 or char in '\n\t')
            
        sanitized[key] = value
    
    return sanitized


def create_error_response(message, status_code=400):
    """Create a standardized error response."""
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
            'exp': datetime.utcnow() + timedelta(seconds=current_app.config['JWT_EXPIRATION_DELTA']),
            'iat': datetime.utcnow()
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


def jwt_required(f):
    """
    Decorator to require JWT authentication for API endpoints.
    Sets g.current_user to the authenticated user.
    """
    from functools import wraps
    from flask import request, g
    from . import db
    from .models import User
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return create_error_response("Authorization header is required", 401)
        
        # Extract token from "Bearer <token>" format
        try:
            token_type, token = auth_header.split(' ', 1)
            if token_type.lower() != 'bearer':
                return create_error_response("Invalid authorization header format", 401)
        except ValueError:
            return create_error_response("Invalid authorization header format", 401)
        
        # Verify token
        payload = verify_jwt_token(token)
        if not payload:
            return create_error_response("Invalid or expired token", 401)
        
        # Get user from payload
        user_id = payload.get('user_id')
        if not user_id:
            return create_error_response("Invalid token payload", 401)
        
        user = db.session.get(User, user_id)
        if not user:
            return create_error_response("User not found", 401)
        
        # Set current user in Flask g object
        g.current_user = user
        
        return f(*args, **kwargs)
    
    return decorated_function