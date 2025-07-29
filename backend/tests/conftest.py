"""Test configuration and fixtures for ChordMe tests."""

import pytest
import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import bcrypt


def create_test_app():
    """Create and configure test app."""
    app = Flask(__name__)
    
    # Test configuration
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key'
    app.config['JWT_EXPIRATION_DELTA'] = 3600
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['WTF_CSRF_ENABLED'] = False
    
    # Initialize extensions
    cors = CORS(app, resources={
        r'/api/*': {
            'origins': '*',
        }
    })
    db = SQLAlchemy(app)
    
    # Define User model within the app context
    class User(db.Model):
        __tablename__ = 'users'
        
        id = db.Column(db.Integer, primary_key=True)
        email = db.Column(db.String(120), unique=True, nullable=False, index=True)
        password_hash = db.Column(db.String(128), nullable=False)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        def __init__(self, email, password):
            self.email = email
            self.set_password(password)
        
        def set_password(self, password):
            """Hash and set the password."""
            password_bytes = password.encode('utf-8')
            salt = bcrypt.gensalt()
            self.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        def check_password(self, password):
            """Check if the provided password matches the stored hash."""
            password_bytes = password.encode('utf-8')
            hash_bytes = self.password_hash.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hash_bytes)
        
        def to_dict(self):
            """Convert user to dictionary (excluding password)."""
            return {
                'id': self.id,
                'email': self.email,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
        
        def __repr__(self):
            return f'<User {self.email}>'
    
    # Import utilities
    from chordme.utils import validate_email, validate_password, create_error_response, create_success_response, generate_jwt_token, sanitize_input
    from flask import send_from_directory, send_file, request, jsonify
    from sqlalchemy.exc import IntegrityError
    
    # Register routes
    @app.route('/api/v1/health', methods=['GET'])
    def health():
        """Health check endpoint."""
        return {
            'status': 'ok',
            'message': 'Service is running'
        }, 200

    @app.route('/api/v1/auth/register', methods=['POST'])
    def register():
        """Register a new user with email and password."""
        try:
            # Get JSON data from request
            data = request.get_json(force=True, silent=True)
            
            if not data:
                return create_error_response("No data provided")
            
            # Sanitize input data
            data = sanitize_input(data)
            
            email = data.get('email', '').strip().lower()
            password = data.get('password', '')
            
            # Validate email with enhanced checks
            email_valid, email_error = validate_email(email)
            if not email_valid:
                return create_error_response(email_error)
            
            # Validate password with enhanced checks
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

    @app.route('/api/v1/auth/login', methods=['POST'])
    def login():
        """Login user with email and password. Returns JWT token."""
        try:
            # Get JSON data from request
            data = request.get_json(force=True, silent=True)
            
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
            
            # Basic email format validation for login
            if '@' not in email or len(email) < 3 or len(email) > 120:
                return create_error_response("Invalid email or password", 401)
            
            # Find user by email
            user = User.query.filter_by(email=email).first()
            if not user:
                return create_error_response("Invalid email or password", 401)
            
            # Check password
            if not user.check_password(password):
                return create_error_response("Invalid email or password", 401)
            
            # Generate JWT token
            token = generate_jwt_token(user.id)
            if not token:
                return create_error_response("Failed to generate authentication token", 500)
            
            # Return success response with token and user data
            return create_success_response(
                data={
                    'token': token,
                    'user': user.to_dict()
                },
                message="Login successful"
            )
            
        except Exception as e:
            app.logger.error(f"Login error: {str(e)}")
            return create_error_response("An error occurred during login", 500)
    
    return app, db


@pytest.fixture
def client():
    """Create a test client with in-memory database."""
    app, db = create_test_app()
    
    with app.test_client() as client:
        with app.app_context():
            # Create all tables
            db.create_all()
            try:
                yield client
            finally:
                # Clean up after test
                db.session.remove()
                db.drop_all()



@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        'email': 'test@example.com',
        'password': 'TestPassword123'
    }


@pytest.fixture
def invalid_emails():
    """List of invalid email formats for testing."""
    return [
        '',
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid.com',
        'test@',
        'test@.com',
        'test@domain',
        'a' * 120 + '@example.com',  # Too long
    ]


@pytest.fixture
def invalid_passwords():
    """List of invalid passwords for testing."""
    return [
        '',
        'short',
        'toolong' * 20,  # Too long
        'nouppercase123',
        'NOLOWERCASE123',
        'NoNumbers',
        'NoDigits!',
    ]


@pytest.fixture
def valid_user_variations():
    """Various valid user data for testing."""
    return [
        {'email': 'user1@example.com', 'password': 'ValidPass123'},
        {'email': 'user2@test.org', 'password': 'AnotherPass456'},
        {'email': 'test.user@domain.co.uk', 'password': 'ComplexPassword789'},
    ]