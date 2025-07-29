from . import app, db
from .models import User
from .utils import validate_email, validate_password, create_error_response, create_success_response
from flask import send_from_directory, send_file, request, jsonify
from sqlalchemy.exc import IntegrityError
import os


@app.route('/api/v1/health', methods=['GET'])
def health():
    """
    Health check endpoint.
    """
    return {
        'status': 'ok',
        'message': 'Service is running'
    }, 200


@app.route('/api/v1/auth/register', methods=['POST'])
def register():
    """
    Register a new user with email and password.
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided")
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate email
        email_valid, email_error = validate_email(email)
        if not email_valid:
            return create_error_response(email_error)
        
        # Validate password
        password_valid, password_error = validate_password(password)
        if not password_valid:
            return create_error_response(password_error)
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return create_error_response("User with this email already exists", 409)
        
        # Create new user
        new_user = User(email=email, password=password)
        
        # Save to database
        db.session.add(new_user)
        db.session.commit()
        
        # Return success response (excluding password)
        return create_success_response(
            data=new_user.to_dict(),
            message="User registered successfully",
            status_code=201
        )
        
    except IntegrityError:
        db.session.rollback()
        return create_error_response("User with this email already exists", 409)
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Registration error: {str(e)}")
        return create_error_response("An error occurred during registration", 500)


@app.route('/')
def index():
    """
    Serve the main frontend application.
    """
    return send_file(os.path.join(app.static_folder, 'index.html'))


@app.route('/<path:path>')
def serve_static(path):
    """
    Serve static files and handle client-side routing.
    """
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        # For client-side routing, serve the main index.html
        return send_file(os.path.join(app.static_folder, 'index.html'))


# Initialize database tables
with app.app_context():
    db.create_all()