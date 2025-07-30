from . import app, db
from .models import User, Song
from .utils import validate_email, validate_password, create_error_response, create_success_response, generate_jwt_token, sanitize_input, auth_required, validate_positive_integer, validate_request_size
from .rate_limiter import rate_limit
from .csrf_protection import csrf_protect, get_csrf_token
from .security_headers import security_headers, security_error_handler
from .chordpro_utils import validate_chordpro_content, ChordProValidator
from flask import send_from_directory, send_file, request, jsonify, g, Response
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import os
import re

# ChordPro directive patterns
TITLE_DIRECTIVE_REGEX = r'^\{title:\s*.*\}$'


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
@validate_request_size(max_content_length=50*1024)  # 50KB for song content
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
        
        # Sanitize input data with increased length for song content
        data = sanitize_input(data, max_string_length=15000)  # Allow more for song content
        
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
@validate_positive_integer('song_id')
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
@validate_positive_integer('song_id')
@validate_request_size(max_content_length=50*1024)  # 50KB for song content
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
        
        # Sanitize input data with increased length for song content
        data = sanitize_input(data, max_string_length=15000)  # Allow more for song content
        
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
@validate_positive_integer('song_id')
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


@app.route('/api/v1/songs/<int:song_id>/download', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@rate_limit(max_requests=10, window_seconds=60)  # 10 downloads per minute
@security_headers
def download_song(song_id):
    """
    Download a specific song as a ChordPro file (only if owned by authenticated user).
    """
    try:
        # Find song by ID and ensure it belongs to the current user
        song = Song.query.filter_by(id=song_id, author_id=g.current_user_id).first()
        
        if not song:
            return create_error_response("Song not found", 404)
        
        # Generate ChordPro content
        content = song.content
        
        # Add title directive if not present
        if not re.search(TITLE_DIRECTIVE_REGEX, content, re.IGNORECASE):
            content = f"{{title: {song.title}}}\n{content}"
        
        # Generate filename (sanitize for filesystem)
        safe_title = re.sub(r'[^\w\s-]', '', song.title.strip())
        safe_title = re.sub(r'[-\s]+', '-', safe_title)
        filename = f"{safe_title}.cho"
        
        # Create response with ChordPro content
        response = Response(
            content,
            mimetype='text/plain',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'text/plain; charset=utf-8'
            }
        )
        
        app.logger.info(f"Song downloaded: {song.title} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return response
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while downloading the song",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/validate-chordpro', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=50*1024)  # 50KB for validation content
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
        
        # Sanitize input data with increased length for validation content  
        data = sanitize_input(data, max_string_length=15000)  # Allow more for validation content
        
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


@app.route('/api/v1/songs/upload', methods=['POST'])
@auth_required
@rate_limit(max_requests=10, window_seconds=300)  # 10 uploads per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def upload_song_file():
    """
    Upload a ChordPro file and create a new song from its content.
    Supports .cho, .chopro, .chordpro, and .txt files.
    """
    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return create_error_response("No file provided", 400)
        
        file = request.files['file']
        
        # Check if file was selected
        if file.filename == '' or file.filename is None:
            return create_error_response("No file selected", 400)
        
        # Validate file extension
        allowed_extensions = {'.cho', '.chopro', '.chordpro', '.txt'}
        file_ext = os.path.splitext(file.filename.lower())[1]
        
        if file_ext not in allowed_extensions:
            return create_error_response(
                f"Invalid file type. Allowed extensions: {', '.join(allowed_extensions)}", 
                400
            )
        
        # Read file content with size limit (1MB max)
        max_file_size = 1024 * 1024  # 1MB
        file_content = file.read(max_file_size + 1)
        
        if len(file_content) > max_file_size:
            return create_error_response("File too large. Maximum size: 1MB", 400)
        
        # Decode content as UTF-8
        try:
            content = file_content.decode('utf-8')
        except UnicodeDecodeError:
            return create_error_response("File must be UTF-8 encoded text", 400)
        
        # Enhanced content validation
        if not content.strip():
            return create_error_response("File is empty", 400)
        
        if len(content) > 10000:  # Same limit as manual song creation
            return create_error_response("File content too large. Maximum: 10,000 characters", 400)
        
        # Security validation for file content
        validator = ChordProValidator()
        is_valid, warnings = validator.validate_content(content)
        
        # Check for critical security warnings
        critical_warnings = [w for w in warnings if any(term in w.lower() for term in ['dangerous', 'injection', 'script'])]
        if critical_warnings:
            return create_error_response(f"File contains potentially dangerous content: {'; '.join(critical_warnings)}", 400)
        
        # Extract title from filename or content
        base_filename = os.path.splitext(file.filename)[0]
        
        # Try to extract title from ChordPro directives first
        directives = ChordProValidator.extract_directives(content)
        title = directives.get('title', base_filename).strip()
        
        # Fallback to filename if no title found
        if not title:
            title = base_filename
        
        # Validate title length
        if len(title) > 200:
            title = title[:200]
        
        # Sanitize title
        title = re.sub(r'[<>:"/\\|?*]', '', title)  # Remove filesystem-unsafe characters
        if not title.strip():
            title = f"Uploaded Song {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Validate ChordPro content and get warnings
        validation_result = validate_chordpro_content(content)
        
        # Create new song
        new_song = Song(title=title, author_id=g.current_user_id, content=content)
        
        # Save to database
        db.session.add(new_song)
        db.session.commit()
        
        app.logger.info(f"Song uploaded: {title} by user {g.current_user_id} from IP {request.remote_addr}")
        
        # Return success response with song data and validation results
        response_data = new_song.to_dict()
        response_data['validation'] = validation_result
        
        return create_success_response(
            data=response_data,
            message="Song uploaded successfully",
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while uploading the song",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/upload-multiple', methods=['POST'])
@auth_required
@rate_limit(max_requests=5, window_seconds=300)  # 5 bulk uploads per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def upload_multiple_song_files():
    """
    Upload multiple ChordPro files and create songs from their content.
    Maximum 10 files per request.
    """
    try:
        # Check if files are present in request
        if 'files' not in request.files:
            return create_error_response("No files provided", 400)
        
        files = request.files.getlist('files')
        
        if not files or len(files) == 0:
            return create_error_response("No files selected", 400)
        
        # Limit number of files per request
        max_files = 10
        if len(files) > max_files:
            return create_error_response(f"Too many files. Maximum: {max_files} files per request", 400)
        
        uploaded_songs = []
        errors = []
        
        for file in files:
            try:
                # Skip empty filenames
                if not file.filename or file.filename == '':
                    errors.append("Empty filename skipped")
                    continue
                
                # Validate file extension
                allowed_extensions = {'.cho', '.chopro', '.chordpro', '.txt'}
                file_ext = os.path.splitext(file.filename.lower())[1]
                
                if file_ext not in allowed_extensions:
                    errors.append(f"{file.filename}: Invalid file type")
                    continue
                
                # Read file content with size limit
                max_file_size = 1024 * 1024  # 1MB per file
                file_content = file.read(max_file_size + 1)
                
                if len(file_content) > max_file_size:
                    errors.append(f"{file.filename}: File too large")
                    continue
                
                # Decode content as UTF-8
                try:
                    content = file_content.decode('utf-8')
                except UnicodeDecodeError:
                    errors.append(f"{file.filename}: Invalid UTF-8 encoding")
                    continue
                
                # Basic content validation
                if not content.strip():
                    errors.append(f"{file.filename}: Empty file")
                    continue
                
                if len(content) > 10000:
                    errors.append(f"{file.filename}: Content too large")
                    continue
                
                # Extract title
                base_filename = os.path.splitext(file.filename)[0]
                directives = ChordProValidator.extract_directives(content)
                title = directives.get('title', base_filename).strip()
                
                if not title:
                    title = base_filename
                
                if len(title) > 200:
                    title = title[:200]
                
                # Sanitize title
                title = re.sub(r'[<>:"/\\|?*]', '', title)
                if not title.strip():
                    title = f"Uploaded Song {datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                # Create new song
                new_song = Song(title=title, author_id=g.current_user_id, content=content)
                db.session.add(new_song)
                
                uploaded_songs.append({
                    'filename': file.filename,
                    'title': title,
                    'song': new_song
                })
                
            except Exception as e:
                errors.append(f"{file.filename}: {str(e)}")
                continue
        
        # Commit all valid songs
        if uploaded_songs:
            db.session.commit()
            
            # Convert to response format
            songs_data = []
            for upload in uploaded_songs:
                song_data = upload['song'].to_dict()
                song_data['original_filename'] = upload['filename']
                songs_data.append(song_data)
            
            app.logger.info(f"Bulk upload: {len(songs_data)} songs by user {g.current_user_id} from IP {request.remote_addr}")
        else:
            db.session.rollback()
        
        # Prepare response
        response_data = {
            'uploaded_songs': songs_data if uploaded_songs else [],
            'upload_count': len(songs_data) if uploaded_songs else 0,
            'errors': errors
        }
        
        if uploaded_songs and not errors:
            message = f"Successfully uploaded {len(songs_data)} songs"
            status_code = 201
        elif uploaded_songs and errors:
            message = f"Uploaded {len(songs_data)} songs with {len(errors)} errors"
            status_code = 201
        else:
            message = "No songs uploaded due to errors"
            status_code = 400
        
        return create_success_response(
            data=response_data,
            message=message,
            status_code=status_code
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while uploading songs",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/download-all', methods=['GET'])
@auth_required
@rate_limit(max_requests=5, window_seconds=300)  # 5 bulk downloads per 5 minutes
@security_headers
def download_all_songs():
    """
    Download all user's songs as a ZIP file containing ChordPro files.
    """
    try:
        import zipfile
        import io
        
        # Get all songs for the current user
        songs = Song.query.filter_by(author_id=g.current_user_id).all()
        
        if not songs:
            return create_error_response("No songs found", 404)
        
        # Create a ZIP file in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            used_filenames = set()
            
            for song in songs:
                # Generate ChordPro content
                content = song.content
                
                # Add title directive if not present
                if not re.search(TITLE_DIRECTIVE_REGEX, content, re.IGNORECASE):
                    content = f"{{title: {song.title}}}\n{content}"
                
                # Generate unique filename
                safe_title = re.sub(r'[^\w\s-]', '', song.title.strip())
                safe_title = re.sub(r'[-\s]+', '-', safe_title)
                base_filename = f"{safe_title}.cho"
                
                # Handle duplicate filenames
                filename = base_filename
                counter = 1
                while filename in used_filenames:
                    name, ext = os.path.splitext(base_filename)
                    filename = f"{name}_{counter}{ext}"
                    counter += 1
                
                used_filenames.add(filename)
                
                # Add file to ZIP
                zip_file.writestr(filename, content.encode('utf-8'))
        
        zip_buffer.seek(0)
        
        # Generate ZIP filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_filename = f"chordme_songs_{timestamp}.zip"
        
        app.logger.info(f"Bulk download: {len(songs)} songs by user {g.current_user_id} from IP {request.remote_addr}")
        
        # Create response
        response = Response(
            zip_buffer.getvalue(),
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{zip_filename}"',
                'Content-Type': 'application/zip'
            }
        )
        
        return response
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while downloading songs",
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