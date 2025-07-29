from . import app, db
from .models import User
from .utils import validate_email, validate_password, create_error_response, create_success_response, generate_jwt_token, sanitize_input
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
    Enhanced with improved validation and security measures.
    """
    try:
        # Get JSON data from request with size limit
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided")
        
        # Sanitize input data
        data = sanitize_input(data)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate email with enhanced checks
        email_valid, email_error = validate_email(email)
        if not email_valid:
            app.logger.warning(f"Registration failed: invalid email format from IP {request.remote_addr}")
            return create_error_response(email_error)
        
        # Validate password with enhanced checks
        password_valid, password_error = validate_password(password)
        if not password_valid:
            app.logger.warning(f"Registration failed: weak password from IP {request.remote_addr}")
            return create_error_response(password_error)
        
        # Check if user already exists (case-insensitive)
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            app.logger.warning(f"Registration failed: duplicate email {email} from IP {request.remote_addr}")
            return create_error_response("User with this email already exists", 409)
        
        # Create new user
        new_user = User(email=email, password=password)
        
        # Save to database
        db.session.add(new_user)
        db.session.commit()
        
        app.logger.info(f"User registered successfully: {email}")
        
        # Return success response (excluding password)
        return create_success_response(
            data=new_user.to_dict(),
            message="User registered successfully",
            status_code=201
        )
        
    except IntegrityError:
        db.session.rollback()
        app.logger.warning(f"Registration failed: database integrity error from IP {request.remote_addr}")
        return create_error_response("User with this email already exists", 409)
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Registration error: {str(e)} from IP {request.remote_addr}")
        return create_error_response("An error occurred during registration", 500)


@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    """
    Login user with email and password. Returns JWT token.
    Enhanced with improved validation and security measures.
    """
    try:
        # Get JSON data from request with size limit
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided")
        
        # Sanitize input data
        data = sanitize_input(data)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate required fields
        if not email:
            return create_error_response("Email is required")
        
        if not password:
            return create_error_response("Password is required")
        
        # Basic email format validation for login (less strict than registration)
        if '@' not in email or len(email) < 3 or len(email) > 120:
            app.logger.warning(f"Login failed: invalid email format from IP {request.remote_addr}")
            return create_error_response("Invalid email or password", 401)
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            app.logger.warning(f"Login failed: user not found for email {email} from IP {request.remote_addr}")
            return create_error_response("Invalid email or password", 401)
        
        # Check password
        if not user.check_password(password):
            app.logger.warning(f"Login failed: invalid password for email {email} from IP {request.remote_addr}")
            return create_error_response("Invalid email or password", 401)
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        if not token:
            app.logger.error(f"Login failed: JWT generation error for user {user.id}")
            return create_error_response("Failed to generate authentication token", 500)
        
        app.logger.info(f"User logged in successfully: {email}")
        
        # Return success response with token and user data
        return create_success_response(
            data={
                'token': token,
                'user': user.to_dict()
            },
            message="Login successful"
        )
        
    except Exception as e:
        app.logger.error(f"Login error: {str(e)} from IP {request.remote_addr}")
        return create_error_response("An error occurred during login", 500)


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