import re
from flask import jsonify, current_app
import jwt
from datetime import datetime, timedelta


def validate_email(email):
    """Validate email format."""
    if not email:
        return False, "Email is required"
    
    # Basic email regex pattern
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    if len(email) > 120:
        return False, "Email is too long"
    
    return True, None


def validate_password(password):
    """Validate password requirements."""
    if not password:
        return False, "Password is required"
    
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
    
    return True, None


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