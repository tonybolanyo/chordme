from . import app, db
from .models import User, Song
from .utils import validate_email, validate_password, create_error_response, create_success_response, generate_jwt_token, sanitize_input, auth_required
from .rate_limiter import rate_limit
from .csrf_protection import csrf_protect, get_csrf_token
from .security_headers import security_headers, security_error_handler
from .chordpro_utils import validate_chordpro_content
from flask import send_from_directory, send_file, request, jsonify, g
from sqlalchemy.exc import IntegrityError
import os


@app.route('/api/v1/health', methods=['GET'])
@security_headers
def health():
    """
    Health check endpoint.
    """
    return {
        'status': 'ok',
        'message': 'Service is running'
    }, 200


@app.route('/api/v1/csrf-token', methods=['GET'])
@security_headers
def get_csrf_token_endpoint():
    """
    Get a CSRF token for form submissions.
    """
    token = get_csrf_token()
    return create_success_response(
        data={'csrf_token': token},
        message="CSRF token generated successfully"
    )


@app.route('/api/v1/auth/register', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=300)  # 5 requests per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for registration to allow easier integration
@security_headers
def register():
    """
    Register a new user with email and password.
    Enhanced with improved validation and security measures.
    """
    try:
        # Get JSON data from request with size limit
        data = request.get_json()
        
        if not data:
            return security_error_handler.handle_validation_error(
                "No data provided",
                "Empty request body in registration"
            )
        
        # Sanitize input data
        data = sanitize_input(data)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate email with enhanced checks
        email_valid, email_error = validate_email(email)
        if not email_valid:
            app.logger.warning(f"Registration failed: invalid email format from IP {request.remote_addr}")
            return security_error_handler.handle_validation_error(
                email_error,
                f"Invalid email format: {email} from IP {request.remote_addr}"
            )
        
        # Validate password with enhanced checks
        password_valid, password_error = validate_password(password)
        if not password_valid:
            app.logger.warning(f"Registration failed: weak password from IP {request.remote_addr}")
            return security_error_handler.handle_validation_error(
                password_error,
                f"Weak password attempt from IP {request.remote_addr}"
            )
        
        # Check if user already exists (case-insensitive)
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            app.logger.warning(f"Registration failed: duplicate email {email} from IP {request.remote_addr}")
            return security_error_handler.handle_validation_error(
                "User with this email already exists",
                f"Duplicate registration attempt for {email} from IP {request.remote_addr}"
            )
        
        # Create new user
        new_user = User(email=email, password=password)
        
        # Save to database with transaction handling
        try:
            db.session.add(new_user)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            app.logger.warning(f"Registration failed: database integrity error from IP {request.remote_addr}")
            return security_error_handler.handle_validation_error(
                "User with this email already exists",
                f"Database integrity error for {email} from IP {request.remote_addr}"
            )
        
        app.logger.info(f"User registered successfully: {email} from IP {request.remote_addr}")
        
        # Return success response (excluding password)
        return create_success_response(
            data=new_user.to_dict(),
            message="User registered successfully",
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred during registration",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/auth/login', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=300)  # 10 login attempts per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for login to allow easier integration
@security_headers
def login():
    """
    Login user with email and password. Returns JWT token.
    Enhanced with improved validation and security measures.
    """
    try:
        # Get JSON data from request with size limit
        data = request.get_json()
        
        if not data:
            return security_error_handler.handle_validation_error(
                "No data provided",
                "Empty request body in login"
            )
        
        # Sanitize input data
        data = sanitize_input(data)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate required fields
        if not email:
            return security_error_handler.handle_validation_error(
                "Email is required",
                f"Missing email in login from IP {request.remote_addr}"
            )
        
        if not password:
            return security_error_handler.handle_validation_error(
                "Password is required",
                f"Missing password in login from IP {request.remote_addr}"
            )
        
        # Basic email format validation for login (less strict than registration)
        if '@' not in email or len(email) < 3 or len(email) > 120:
            return security_error_handler.handle_authentication_error(
                "Invalid email format",
                ip_address=request.remote_addr
            )
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            return security_error_handler.handle_authentication_error(
                f"Invalid credentials for {email}",
                ip_address=request.remote_addr
            )
        
        # Check password
        if not user.check_password(password):
            return security_error_handler.handle_authentication_error(
                f"Invalid password for {email}",
                ip_address=request.remote_addr
            )
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        if not token:
            app.logger.error(f"Login failed: JWT generation error for user {user.id} from IP {request.remote_addr}")
            return security_error_handler.handle_server_error(
                "Failed to generate authentication token",
                exception=Exception("JWT generation failed"),
                ip_address=request.remote_addr
            )
        
        app.logger.info(f"User logged in successfully: {email} from IP {request.remote_addr}")
        
        # Return success response with token and user data
        return create_success_response(
            data={
                'token': token,
                'user': user.to_dict()
            },
            message="Login successful"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred during login",
            exception=e,
            ip_address=request.remote_addr
        )


# Song management endpoints - all require authentication

@app.route('/api/v1/songs', methods=['GET'])
@auth_required
@security_headers
def get_songs():
    """
    Get all songs for the authenticated user.
    """
    try:
        # Get songs for the current user
        songs = Song.query.filter_by(author_id=g.current_user_id).all()
        
        # Convert to dict format
        songs_data = [song.to_dict() for song in songs]
        
        return create_success_response(
            data={'songs': songs_data},
            message=f"Retrieved {len(songs_data)} songs"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving songs",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs', methods=['POST'])
@auth_required
@rate_limit(max_requests=20, window_seconds=300)  # 20 songs per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def create_song():
    """
    Create a new song for the authenticated user.
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data
        data = sanitize_input(data)
        
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        
        # Validate required fields
        if not title:
            return create_error_response("Title is required", 400)
        
        if not content:
            return create_error_response("Content is required", 400)
        
        # Validate title length
        if len(title) > 200:
            return create_error_response("Title must be 200 characters or less", 400)
        
        # Validate content length
        if len(content) > 10000:
            return create_error_response("Content must be 10,000 characters or less", 400)
        
        # Create new song
        new_song = Song(title=title, author_id=g.current_user_id, content=content)
        
        # Save to database
        db.session.add(new_song)
        db.session.commit()
        
        app.logger.info(f"Song created: {title} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=new_song.to_dict(),
            message="Song created successfully",
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while creating the song",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>', methods=['GET'])
@auth_required
@security_headers
def get_song(song_id):
    """
    Get a specific song by ID (only if owned by authenticated user).
    """
    try:
        # Find song by ID and ensure it belongs to the current user
        song = Song.query.filter_by(id=song_id, author_id=g.current_user_id).first()
        
        if not song:
            return create_error_response("Song not found", 404)
        
        return create_success_response(
            data=song.to_dict(),
            message="Song retrieved successfully"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving the song",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>', methods=['PUT'])
@auth_required
@rate_limit(max_requests=30, window_seconds=300)  # 30 updates per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def update_song(song_id):
    """
    Update a specific song by ID (only if owned by authenticated user).
    """
    try:
        # Find song by ID and ensure it belongs to the current user
        song = Song.query.filter_by(id=song_id, author_id=g.current_user_id).first()
        
        if not song:
            return create_error_response("Song not found", 404)
        
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data
        data = sanitize_input(data)
        
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        
        # Update fields if provided
        if title:
            if len(title) > 200:
                return create_error_response("Title must be 200 characters or less", 400)
            song.title = title
        
        if content:
            song.content = content
        
        # Save changes
        db.session.commit()
        
        app.logger.info(f"Song updated: {song.title} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=song.to_dict(),
            message="Song updated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while updating the song",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>', methods=['DELETE'])
@auth_required
@rate_limit(max_requests=10, window_seconds=300)  # 10 deletions per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def delete_song(song_id):
    """
    Delete a specific song by ID (only if owned by authenticated user).
    """
    try:
        # Find song by ID and ensure it belongs to the current user
        song = Song.query.filter_by(id=song_id, author_id=g.current_user_id).first()
        
        if not song:
            return create_error_response("Song not found", 404)
        
        song_title = song.title  # Store for logging
        
        # Delete the song
        db.session.delete(song)
        db.session.commit()
        
        app.logger.info(f"Song deleted: {song_title} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            message="Song deleted successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while deleting the song",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/validate-chordpro', methods=['POST'])
@auth_required
@rate_limit(max_requests=20, window_seconds=300)  # 20 validations per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def validate_chordpro():
    """
    Validate ChordPro content and return analysis.
    Optional endpoint for users who want to validate their ChordPro formatting.
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data
        data = sanitize_input(data)
        
        content = data.get('content', '').strip()
        
        if not content:
            return create_error_response("Content is required for validation", 400)
        
        # Validate ChordPro content
        validation_result = validate_chordpro_content(content)
        
        app.logger.info(f"ChordPro validation performed by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=validation_result,
            message="ChordPro content validated successfully"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while validating ChordPro content",
            exception=e,
            ip_address=request.remote_addr
        )


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