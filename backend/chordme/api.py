from . import app, db, __version__
from .models import User, Song, Chord, SongSection, SongVersion
from .utils import validate_email, validate_password, create_error_response, create_success_response, generate_jwt_token, sanitize_input, auth_required, validate_positive_integer, validate_request_size, sanitize_html_content
from .rate_limiter import rate_limit
from .csrf_protection import csrf_protect, get_csrf_token
from .security_headers import security_headers, security_error_handler
from .chordpro_utils import validate_chordpro_content, ChordProValidator, detect_key_signature
from flask import send_from_directory, send_file, request, jsonify, g, Response
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import os
import re

# ChordPro directive patterns
TITLE_DIRECTIVE_REGEX = r'^\{title:\s*.*\}$'


@app.route('/api/v1/version', methods=['GET'])
@security_headers
def version():
    """
    Get application version information.
    """
    return {
        'version': __version__,
        'name': 'ChordMe Backend',
        'status': 'ok'
    }, 200


@app.route('/api/v1/health', methods=['GET'])
@security_headers
def health():
    """
    Health check endpoint
    ---
    tags:
      - System
    summary: Check API health status
    description: Returns the current status of the API service
    responses:
      200:
        description: Service is healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: "ok"
            message:
              type: string
              example: "Service is running"
    """
    return {
        'status': 'ok',
        'message': 'Service is running'
    }, 200


@app.route('/api/v1/csrf-token', methods=['GET'])
@security_headers
def get_csrf_token_endpoint():
    """
    Get CSRF token for form submissions
    ---
    tags:
      - Security
    summary: Generate CSRF token
    description: Returns a CSRF token that must be included in form submissions for security
    responses:
      200:
        description: CSRF token generated successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    csrf_token:
                      type: string
                      description: CSRF token for form submissions
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
    Register a new user account
    ---
    tags:
      - Authentication
    summary: Register a new user
    description: Create a new user account with email and password. Requires strong password and valid email format.
    parameters:
      - in: body
        name: body
        description: User registration details
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              format: email
              description: Valid email address
              example: "user@example.com"
            password:
              type: string
              format: password
              description: Strong password (min 8 chars, uppercase, lowercase, number, special char)
              example: "SecurePass123!"
    responses:
      201:
        description: User registered successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/User'
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      409:
        description: User with this email already exists
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many registration attempts
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Get JSON data from request with size limit
        try:
            data = request.get_json()
        except Exception as json_error:
            # Handle cases where JSON parsing fails (e.g., no content-type, invalid JSON)
            return security_error_handler.handle_validation_error(
                "No data provided",
                f"JSON parsing failed: {str(json_error)} from IP {request.remote_addr}"
            )
        
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
            # Use 409 Conflict for duplicate email as it's a resource conflict
            from .utils import create_error_response
            return create_error_response(
                "User with this email already exists",
                409
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
            # Use 409 Conflict for database integrity error (duplicate email)
            from .utils import create_error_response
            return create_error_response(
                "User with this email already exists",
                409
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
    Authenticate user and get JWT token
    ---
    tags:
      - Authentication
    summary: Login user
    description: Authenticate user with email and password, returns JWT token for API access
    parameters:
      - in: body
        name: body
        description: User login credentials
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              format: email
              description: User email address
              example: "user@example.com"
            password:
              type: string
              format: password
              description: User password
              example: "SecurePass123!"
    responses:
      200:
        description: Login successful
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    token:
                      type: string
                      description: JWT authentication token
                    user:
                      $ref: '#/definitions/User'
      400:
        description: Invalid input or missing credentials
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Invalid credentials
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many login attempts
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Get JSON data from request with size limit
        try:
            data = request.get_json()
        except Exception as json_error:
            # Handle cases where JSON parsing fails (e.g., no content-type, invalid JSON)
            return security_error_handler.handle_validation_error(
                "No data provided",
                f"JSON parsing failed: {str(json_error)} from IP {request.remote_addr}"
            )
        
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


# User profile management endpoints - all require authentication

@app.route('/api/v1/user/profile', methods=['GET'])
@auth_required
@security_headers
def get_user_profile_info():
    """
    Get current user profile
    ---
    tags:
      - User Profile
    summary: Get user profile information
    description: Retrieve profile information for the authenticated user
    security:
      - Bearer: []
    responses:
      200:
        description: User profile retrieved successfully
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            email:
              type: string
              example: "user@example.com"
            display_name:
              type: string
              example: "John Doe"
            bio:
              type: string
              example: "Music enthusiast and songwriter"
            profile_image_url:
              type: string
              example: "https://example.com/avatar.jpg"
            created_at:
              type: string
              format: date-time
            updated_at:
              type: string
              format: date-time
      401:
        description: Authentication required
    """
    try:
        user = User.query.get(g.current_user_id)
        if not user:
            return create_error_response(
                "User not found",
                status_code=404
            )
        
        return create_success_response(
            data=user.to_dict(),
            message="Profile retrieved successfully"
        )
        
    except Exception as e:
        app.logger.error(f"Error retrieving user profile for user {g.current_user_id}: {str(e)}")
        return create_error_response(
            "Failed to retrieve profile",
            status_code=500
        )


# @app.route('/api/v1/user/profile', methods=['PUT'])
# @auth_required
# @rate_limit(max_requests=20, window_seconds=300)  # 20 updates per 5 minutes
# @csrf_protect
# @security_headers
# def update_user_profile_info():

@app.route('/api/v1/user/profile', methods=['PUT'])  
@auth_required
@security_headers
def update_user_profile_info():
    """Update user profile information"""
    try:
        # Get and validate request data
        data = request.get_json()
        if not data:
            return create_error_response(
                "No data provided",
                status_code=400
            )
        
        # Sanitize input data
        data = sanitize_input(data)
        
        user = User.query.get(g.current_user_id)
        if not user:
            return create_error_response(
                "User not found",
                status_code=404
            )
        
        # Update profile fields if provided
        if 'display_name' in data:
            display_name = data['display_name']
            if display_name is not None:
                if len(display_name) > 100:
                    return create_error_response(
                        "Display name must be 100 characters or less",
                        status_code=400
                    )
                user.display_name = display_name.strip() if display_name else None
        
        if 'bio' in data:
            bio = data['bio']
            if bio is not None:
                if len(bio) > 500:
                    return create_error_response(
                        "Bio must be 500 characters or less",
                        status_code=400
                    )
                user.bio = bio.strip() if bio else None
        
        if 'profile_image_url' in data:
            profile_image_url = data['profile_image_url']
            if profile_image_url is not None:
                if len(profile_image_url) > 500:
                    return create_error_response(
                        "Profile image URL must be 500 characters or less",
                        status_code=400
                    )
                user.profile_image_url = profile_image_url.strip() if profile_image_url else None
        
        # Save changes
        db.session.commit()
        
        app.logger.info(f"User profile updated successfully for user {user.id}")
        
        return create_success_response(
            data=user.to_dict(),
            message="Profile updated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating user profile for user {g.current_user_id}: {str(e)}")
        return create_error_response(
            "Failed to update profile",
            status_code=500
        )
#     """
#     Update user profile information
#     ---
#     tags:
#       - User Profile
#     summary: Update user profile
#     description: Update display name, bio, and profile image for the authenticated user
#     security:
#       - Bearer: []
#     parameters:
#       - in: body
#         name: profile
#         description: Profile information to update
#         required: true
#         schema:
#           type: object
#           properties:
#             display_name:
#               type: string
#               maxLength: 100
#               example: "John Doe"
#             bio:
#               type: string
#               maxLength: 500
#               example: "Music enthusiast and songwriter"
#             profile_image_url:
#               type: string
#               maxLength: 500
#               example: "https://example.com/avatar.jpg"
#     responses:
#       200:
#         description: Profile updated successfully
#       400:
#         description: Invalid input data
#       401:
#         description: Authentication required
#     """
#     try:
#         # Get and validate request data
#         data = request.get_json()
#         if not data:
#             return create_error_response(
#                 "No data provided",
#                 status_code=400
#             )
#         
#         # Sanitize input data
#         data = sanitize_input(data)
#         
#         user = User.query.get(g.current_user_id)
#         if not user:
#             return create_error_response(
#                 "User not found",
#                 status_code=404
#             )
#         
#         # Update profile fields if provided
#         if 'display_name' in data:
#             display_name = data['display_name']
#             if display_name is not None:
#                 if len(display_name) > 100:
#                     return create_error_response(
#                         "Display name must be 100 characters or less",
#                         status_code=400
#                     )
#                 user.display_name = display_name.strip() if display_name else None
#         
#         if 'bio' in data:
#             bio = data['bio']
#             if bio is not None:
#                 if len(bio) > 500:
#                     return create_error_response(
#                         "Bio must be 500 characters or less",
#                         status_code=400
#                     )
#                 user.bio = bio.strip() if bio else None
#         
#         if 'profile_image_url' in data:
#             profile_image_url = data['profile_image_url']
#             if profile_image_url is not None:
#                 if len(profile_image_url) > 500:
#                     return create_error_response(
#                         "Profile image URL must be 500 characters or less",
#                         status_code=400
#                     )
#                 user.profile_image_url = profile_image_url.strip() if profile_image_url else None
#         
#         # Save changes
#         db.session.commit()
#         
#         app.logger.info(f"User profile updated successfully for user {user.id}")
#         
#         return create_success_response(
#             data=user.to_dict(),
#             message="Profile updated successfully"
#         )
#         
#     except Exception as e:
#         db.session.rollback()
#         app.logger.error(f"Error updating user profile for user {g.current_user_id}: {str(e)}")
#         return create_error_response(
#             "Failed to update profile",
#             status_code=500
#         )


# @app.route('/api/v1/user/email', methods=['PUT'])
# @auth_required
# @rate_limit(max_requests=5, window_seconds=300)  # 5 email changes per 5 minutes
# @csrf_protect
# @security_headers
# def update_user_email_address():
#     """
#     Update user email address
#     ---
#     tags:
#       - User Profile
#     summary: Update user email
#     description: Update email address for the authenticated user with validation
#     security:
#       - Bearer: []
#     parameters:
#       - in: body
#         name: email_data
#         description: New email address
#         required: true
#         schema:
#           type: object
#           required:
#             - new_email
#           properties:
#             new_email:
#               type: string
#               format: email
#               example: "newemail@example.com"
#     responses:
#       200:
#         description: Email updated successfully
#       400:
#         description: Invalid email or email already exists
#       401:
#         description: Authentication required
#     """
#     try:
#         # Get and validate request data
#         data = request.get_json()
#         if not data:
#             return create_error_response(
#                 "No data provided",
#                 status_code=400
#             )
#         
#         # Sanitize input data
#         data = sanitize_input(data)
#         
#         new_email = data.get('new_email', '').strip().lower()
#         
#         # Validate required fields
#         if not new_email:
#             return create_error_response(
#                 "New email is required",
#                 status_code=400
#             )
#         
#         # Validate email format
#         if not validate_email(new_email):
#             return create_error_response(
#                 "Invalid email format",
#                 status_code=400
#             )
#         
#         user = User.query.get(g.current_user_id)
#         if not user:
#             return create_error_response(
#                 "User not found",
#                 status_code=404
#             )
#         
#         # Check if email is already taken by another user
#         existing_user = User.query.filter(
#             User.email == new_email,
#             User.id != g.current_user_id
#         ).first()
#         
#         if existing_user:
#             return create_error_response(
#                 "Email address is already in use",
#                 status_code=400
#             )
#         
#         # Update email
#         user.email = new_email
#         db.session.commit()
#         
#         app.logger.info(f"User email updated successfully for user {user.id} to {new_email}")
#         
#         return create_success_response(
#             data=user.to_dict(),
#             message="Email updated successfully"
#         )
#         
#     except IntegrityError:
#         db.session.rollback()
#         return create_error_response(
#             "Email address is already in use",
#             status_code=400
#         )
#     except Exception as e:
#         db.session.rollback()
#         app.logger.error(f"Error updating user email for user {g.current_user_id}: {str(e)}")
#         return create_error_response(
#             "Failed to update email",
#             status_code=500
#         )


# @app.route('/api/v1/user/password', methods=['PUT'])
# @auth_required
# @rate_limit(max_requests=5, window_seconds=300)  # 5 password changes per 5 minutes
# @csrf_protect
# @security_headers
# def update_user_password_change():
#     """
#     Update user password
#     ---
#     tags:
#       - User Profile
#     summary: Update user password
#     description: Update password for the authenticated user with validation
#     security:
#       - Bearer: []
#     parameters:
#       - in: body
#         name: password_data
#         description: Current and new password
#         required: true
#         schema:
#           type: object
#           required:
#             - current_password
#             - new_password
#           properties:
#             current_password:
#               type: string
#               example: "currentpassword123"
#             new_password:
#               type: string
#               example: "NewSecurePass123!"
#     responses:
#       200:
#         description: Password updated successfully
#       400:
#         description: Invalid current password or new password doesn't meet requirements
#       401:
#         description: Authentication required
#     """
#     try:
#         # Get and validate request data
#         data = request.get_json()
#         if not data:
#             return create_error_response(
#                 "No data provided",
#                 status_code=400
#             )
#         
#         # Sanitize input data
#         data = sanitize_input(data)
#         
#         current_password = data.get('current_password', '')
#         new_password = data.get('new_password', '')
#         
#         # Validate required fields
#         if not current_password:
#             return create_error_response(
#                 "Current password is required",
#                 status_code=400
#             )
#         
#         if not new_password:
#             return create_error_response(
#                 "New password is required",
#                 status_code=400
#             )
#         
#         user = User.query.get(g.current_user_id)
#         if not user:
#             return create_error_response(
#                 "User not found",
#                 status_code=404
#             )
#         
#         # Verify current password
#         if not user.check_password(current_password):
#             app.logger.warning(f"Invalid current password attempt for user {user.id}")
#             return create_error_response(
#                 "Current password is incorrect",
#                 status_code=400
#             )
#         
#         # Validate new password
#         if not validate_password(new_password):
#             return create_error_response(
#                 "New password does not meet security requirements",
#                 status_code=400
#             )
#         
#         # Update password
#         user.set_password(new_password)
#         db.session.commit()
#         
#         app.logger.info(f"User password updated successfully for user {user.id}")
#         
#         return create_success_response(
#             message="Password updated successfully"
#         )
#         
#     except Exception as e:
#         db.session.rollback()
#         app.logger.error(f"Error updating user password for user {g.current_user_id}: {str(e)}")
#         return create_error_response(
#             "Failed to update password",
#             status_code=500
#         )


@app.route('/api/v1/user/email', methods=['PUT'])
@auth_required
@security_headers  
def update_user_email_address():
    """Update user email address"""
    try:
        # Get and validate request data
        data = request.get_json()
        if not data:
            return create_error_response(
                "No data provided",
                status_code=400
            )
        
        # Sanitize input data
        data = sanitize_input(data)
        
        new_email = data.get('new_email', '').strip().lower()
        
        # Validate required fields
        if not new_email:
            return create_error_response(
                "New email is required",
                status_code=400
            )
        
        # Validate email format
        if not validate_email(new_email):
            return create_error_response(
                "Invalid email format",
                status_code=400
            )
        
        user = User.query.get(g.current_user_id)
        if not user:
            return create_error_response(
                "User not found",
                status_code=404
            )
        
        # Check if email is already taken by another user
        existing_user = User.query.filter(
            User.email == new_email,
            User.id != g.current_user_id
        ).first()
        
        if existing_user:
            return create_error_response(
                "Email address is already in use",
                status_code=400
            )
        
        # Update email
        user.email = new_email
        db.session.commit()
        
        app.logger.info(f"User email updated successfully for user {user.id} to {new_email}")
        
        return create_success_response(
            data=user.to_dict(),
            message="Email updated successfully"
        )
        
    except IntegrityError:
        db.session.rollback()
        return create_error_response(
            "Email address is already in use",
            status_code=400
        )
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating user email for user {g.current_user_id}: {str(e)}")
        return create_error_response(
            "Failed to update email",
            status_code=500
        )


@app.route('/api/v1/user/password', methods=['PUT'])
@auth_required
@security_headers
def update_user_password_change():
    """Update user password"""
    try:
        # Get and validate request data
        data = request.get_json()
        if not data:
            return create_error_response(
                "No data provided",
                status_code=400
            )
        
        # Sanitize input data
        data = sanitize_input(data)
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        # Validate required fields
        if not current_password:
            return create_error_response(
                "Current password is required",
                status_code=400
            )
        
        if not new_password:
            return create_error_response(
                "New password is required",
                status_code=400
            )
        
        user = User.query.get(g.current_user_id)
        if not user:
            return create_error_response(
                "User not found",
                status_code=404
            )
        
        # Verify current password
        if not user.check_password(current_password):
            app.logger.warning(f"Invalid current password attempt for user {user.id}")
            return create_error_response(
                "Current password is incorrect",
                status_code=400
            )
        
        # Validate new password
        if not validate_password(new_password):
            return create_error_response(
                "New password does not meet security requirements",
                status_code=400
            )
        
        # Update password
        user.set_password(new_password)
        db.session.commit()
        
        app.logger.info(f"User password updated successfully for user {user.id}")
        
        return create_success_response(
            message="Password updated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating user password for user {g.current_user_id}: {str(e)}")
        return create_error_response(
            "Failed to update password",
            status_code=500
        )


# Song management endpoints - all require authentication

@app.route('/api/v1/songs', methods=['GET'])
@auth_required
@security_headers
def get_songs():
    """
    Get all songs for authenticated user
    ---
    tags:
      - Songs
    summary: List user's songs
    description: Retrieve all songs owned by the authenticated user
    security:
      - Bearer: []
    responses:
      200:
        description: Songs retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    songs:
                      type: array
                      items:
                        $ref: '#/definitions/Song'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
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
    Create a new song
    ---
    tags:
      - Songs
    summary: Create new song
    description: Create a new ChordPro song for the authenticated user
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        description: Song details
        required: true
        schema:
          type: object
          required:
            - title
            - content
          properties:
            title:
              type: string
              description: Song title (max 200 characters)
              example: "Amazing Grace"
            content:
              type: string
              description: ChordPro content (max 10,000 characters)
              example: "{title: Amazing Grace}\n{artist: Traditional}\n\n[C]Amazing [F]grace how [C]sweet the sound"
    responses:
      201:
        description: Song created successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/Song'
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      413:
        description: Request entity too large
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
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
        
        # Additional HTML sanitization for content
        content = sanitize_html_content(content)
        
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
        
        # Save to database first to get song ID
        db.session.add(new_song)
        db.session.flush()  # This assigns the ID without committing
        
        # Parse and store sections
        sections = ChordProValidator.extract_sections(content)
        for section_data in sections:
            section = SongSection(
                song_id=new_song.id,
                section_type=section_data['section_type'],
                section_number=section_data['section_number'],
                content=section_data['content'],
                order_index=section_data['order_index']
            )
            db.session.add(section)
        
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
    Get a specific song by ID
    ---
    tags:
      - Songs
    summary: Get song by ID
    description: Retrieve a specific song by its ID (accessible if owned, shared, or public)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Song retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/Song'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
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



def create_version_snapshot(song, user_id):
    """Create a version snapshot of a song before modification."""
    # Get the next version number for this song
    latest_version = SongVersion.query.filter_by(song_id=song.id)\
                                     .order_by(SongVersion.version_number.desc())\
                                     .first()
    
    next_version_number = (latest_version.version_number + 1) if latest_version else 1
    
    # Create the version snapshot
    version = SongVersion(
        song_id=song.id,
        version_number=next_version_number,
        title=song.title,
        content=song.content,
        user_id=user_id
    )
    
    db.session.add(version)
    return version


@app.route('/api/v1/songs/<int:song_id>', methods=['PUT'])
@auth_required
@validate_positive_integer('song_id')
@validate_request_size(max_content_length=50*1024)  # 50KB for song content
@rate_limit(max_requests=30, window_seconds=300)  # 30 updates per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def update_song(song_id):
    """
    Update a specific song by ID
    ---
    tags:
      - Songs
    summary: Update song
    description: Update a specific song by its ID (requires edit permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: body
        name: body
        description: Updated song details
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
              description: Song title (max 200 characters)
              example: "Amazing Grace (Updated)"
            content:
              type: string
              description: ChordPro content (max 10,000 characters)
              example: "{title: Amazing Grace}\n{artist: Traditional}\n\n[C]Amazing [F]grace how [C]sweet the sound"
    responses:
      200:
        description: Song updated successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/Song'
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      413:
        description: Request entity too large
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has edit access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'edit')
        
        if not song:
            return create_error_response("Song not found", 404)
        
        if not has_permission:
            return create_error_response("Insufficient permissions to edit this song", 403)
        
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data with increased length for song content
        data = sanitize_input(data, max_string_length=15000)  # Allow more for song content
        
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        
        # Additional HTML sanitization for content
        if content:
            content = sanitize_html_content(content)
        
        # Update fields if provided
        if title:
            if len(title) > 200:
                return create_error_response("Title must be 200 characters or less", 400)
        
        if content:
            # Delete existing sections for this song
            SongSection.query.filter_by(song_id=song.id).delete()
        
        # Create version snapshot before making changes
        if title or content:
            create_version_snapshot(song, g.current_user_id)
        
        # Apply the updates
        if title:
            song.title = title
        
        if content:
            song.content = content
            
            # Parse and store new sections
            sections = ChordProValidator.extract_sections(content)
            for section_data in sections:
                section = SongSection(
                    song_id=song.id,
                    section_type=section_data['section_type'],
                    section_number=section_data['section_number'],
                    content=section_data['content'],
                    order_index=section_data['order_index']
                )
                db.session.add(section)
        
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
    Delete a specific song by ID
    ---
    tags:
      - Songs
    summary: Delete song
    description: Delete a specific song by its ID (requires admin permissions - only owner)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Song deleted successfully
        schema:
          $ref: '#/definitions/Success'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user is the actual owner (only owner can delete, not admins)
        song = Song.query.filter_by(id=song_id).first()
        
        if not song:
            return create_error_response("Song not found", 404)
        
        # Only the song author can delete the song
        if song.author_id != g.current_user_id:
            return create_error_response("Only the song owner can delete this song", 403)
        
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
    Download song as ChordPro file
    ---
    tags:
      - Songs
    summary: Download song file
    description: Download a specific song as a ChordPro (.cho) file (accessible if owned, shared, or public)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
    produces:
      - text/plain
    responses:
      200:
        description: Song file downloaded successfully
        headers:
          Content-Disposition:
            type: string
            description: attachment; filename="songname.cho"
          Content-Type:
            type: string
            description: text/plain; charset=utf-8
        schema:
          type: string
          description: ChordPro file content
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
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


@app.route('/api/v1/songs/<int:song_id>/export/pdf', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@rate_limit(max_requests=5, window_seconds=60)  # 5 PDF exports per minute
@security_headers
def export_song_pdf(song_id):
    """
    Export song as PDF document
    ---
    tags:
      - Songs
    summary: Export song as PDF
    description: Export a specific song as a PDF document with proper ChordPro formatting (accessible if owned, shared, or public)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: query
        name: paper_size
        description: Paper size for PDF
        required: false
        type: string
        enum: ['a4', 'letter', 'legal']
        default: 'a4'
      - in: query
        name: orientation
        description: Page orientation
        required: false
        type: string
        enum: ['portrait', 'landscape']
        default: 'portrait'
      - in: query
        name: template
        description: PDF template to use
        required: false
        type: string
        enum: ['classic', 'modern', 'minimal']
        default: 'classic'
      - in: query
        name: title
        description: Override song title
        required: false
        type: string
      - in: query
        name: artist
        description: Override song artist
        required: false
        type: string
    produces:
      - application/pdf
    responses:
      200:
        description: PDF file generated successfully
        headers:
          Content-Disposition:
            type: string
            description: attachment; filename="songname.pdf"
          Content-Type:
            type: string
            description: application/pdf
        schema:
          type: string
          format: binary
          description: PDF file content
      400:
        description: Invalid parameters
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        from .pdf_generator import generate_song_pdf
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
            return create_error_response("Song not found", 404)
        
        # Get export parameters from query string
        paper_size = request.args.get('paper_size', 'a4').lower()
        orientation = request.args.get('orientation', 'portrait').lower()
        template_name = request.args.get('template', 'classic').lower()
        title_override = request.args.get('title')
        artist_override = request.args.get('artist')
        
        # Validate parameters
        valid_paper_sizes = ['a4', 'letter', 'legal']
        valid_orientations = ['portrait', 'landscape']
        valid_templates = ['classic', 'modern', 'minimal']
        
        if paper_size not in valid_paper_sizes:
            return create_error_response(f"Invalid paper size. Must be one of: {', '.join(valid_paper_sizes)}", 400)
        
        if orientation not in valid_orientations:
            return create_error_response(f"Invalid orientation. Must be one of: {', '.join(valid_orientations)}", 400)
        
        if template_name not in valid_templates:
            return create_error_response(f"Invalid template. Must be one of: {', '.join(valid_templates)}", 400)
        
        # Generate PDF
        content = song.content
        title = title_override or song.title
        artist = artist_override or getattr(song, 'artist', None)  # Song model might not have artist field
        
        pdf_bytes = generate_song_pdf(
            content=content,
            title=title,
            artist=artist,
            paper_size=paper_size,
            orientation=orientation,
            template_name=template_name
        )
        
        # Create safe filename
        safe_title = re.sub(r'[^\w\s-]', '', title or 'song')
        safe_title = re.sub(r'[-\s]+', '-', safe_title).strip('-')
        safe_filename = f"{safe_title[:50]}"  # Limit filename length
        
        # Create response with PDF
        response = Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{safe_filename}.pdf"'
            }
        )
        
        # Log export activity
        app.logger.info(f"Song exported as PDF: {song.title} (paper: {paper_size}, orientation: {orientation}, template: {template_name}) by user {g.current_user_id} from IP {request.remote_addr}")
        
        return response
        
    except ImportError as e:
        app.logger.error(f"PDF generation library not available: {str(e)}")
        return create_error_response("PDF export functionality not available", 500)
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while exporting the song as PDF",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/pdf/templates', methods=['GET'])
@auth_required
@rate_limit(max_requests=30, window_seconds=60)  # 30 requests per minute
@security_headers
def list_pdf_templates():
    """
    List available PDF templates
    ---
    tags:
      - PDF Templates
    summary: List all available PDF templates
    description: Get list of all available PDF templates including predefined and custom templates
    security:
      - Bearer: []
    responses:
      200:
        description: List of templates retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                    example: "classic"
                  description:
                    type: string
                    example: "Traditional sheet music appearance"
                  version:
                    type: string
                    example: "1.0"
                  author:
                    type: string
                    example: "ChordMe"
                  predefined:
                    type: boolean
                    example: true
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .pdf_templates import get_template_manager
        
        template_manager = get_template_manager()
        templates = template_manager.list_templates()
        
        return create_success_response(templates)
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while listing PDF templates",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/pdf/templates/<template_name>', methods=['GET'])
@auth_required
@rate_limit(max_requests=30, window_seconds=60)  # 30 requests per minute
@security_headers
def get_pdf_template(template_name):
    """
    Get PDF template details
    ---
    tags:
      - PDF Templates
    summary: Get specific PDF template details
    description: Get detailed configuration of a specific PDF template
    security:
      - Bearer: []
    parameters:
      - in: path
        name: template_name
        description: Template name
        required: true
        type: string
    responses:
      200:
        description: Template details retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                name:
                  type: string
                  example: "classic"
                description:
                  type: string
                  example: "Traditional sheet music appearance"
                styles:
                  type: object
                  description: Style configuration
                colors:
                  type: object
                  description: Color scheme
                spacing:
                  type: object
                  description: Spacing configuration
                page:
                  type: object
                  description: Page configuration
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Template not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .pdf_templates import get_template_manager
        
        template_manager = get_template_manager()
        template_data = template_manager.get_template_preview_data(template_name)
        
        if not template_data:
            return create_error_response("Template not found", 404)
        
        return create_success_response(template_data)
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving PDF template",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/pdf/templates/<template_name>/preview', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=1024)  # 1KB max for preview content
@rate_limit(max_requests=10, window_seconds=60)  # 10 previews per minute
@security_headers
def preview_pdf_template(template_name):
    """
    Generate PDF preview using template
    ---
    tags:
      - PDF Templates
    summary: Generate PDF preview with template
    description: Generate a small PDF preview using the specified template with sample content
    security:
      - Bearer: []
    parameters:
      - in: path
        name: template_name
        description: Template name
        required: true
        type: string
      - in: body
        name: preview_content
        description: Sample content for preview
        required: false
        schema:
          type: object
          properties:
            content:
              type: string
              example: "{title: Sample Song}\n[C]Hello [G]world"
            title:
              type: string
              example: "Sample Song"
            artist:
              type: string
              example: "Sample Artist"
    produces:
      - application/pdf
    responses:
      200:
        description: PDF preview generated successfully
        headers:
          Content-Type:
            type: string
            description: application/pdf
        schema:
          type: string
          format: binary
          description: PDF preview content
      400:
        description: Invalid parameters
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Template not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .pdf_templates import get_template_manager
        from .pdf_generator import generate_song_pdf
        
        # Check if template exists
        template_manager = get_template_manager()
        if not template_manager.get_template(template_name):
            return create_error_response("Template not found", 404)
        
        # Get preview content from request body
        data = request.get_json() or {}
        
        # Use sample content if none provided
        sample_content = data.get('content', """{title: Sample Song}
{artist: Sample Artist}
{key: C}

{sov}
[C]Hello [G]world, this is a [Am]sample [F]song
To [C]demonstrate the [G]template [C]style
{eov}

{soc}
[F]This is the [C]chorus [G]section
[F]Showing how [C]chords are [G]displayed
{eoc}""")
        
        sample_title = data.get('title', 'Sample Song')
        sample_artist = data.get('artist', 'Sample Artist')
        
        # Generate preview PDF (limited to A4 portrait for consistency)
        pdf_bytes = generate_song_pdf(
            content=sample_content,
            title=sample_title,
            artist=sample_artist,
            paper_size='a4',
            orientation='portrait',
            template_name=template_name
        )
        
        # Create response with PDF
        response = Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename="{template_name}-preview.pdf"'
            }
        )
        
        # Log preview activity
        app.logger.info(f"PDF template preview generated: {template_name} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return response
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while generating PDF template preview",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>/versions', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@rate_limit(max_requests=30, window_seconds=300)  # 30 requests per 5 minutes
@security_headers
def get_song_versions(song_id):
    """
    Get version history for a song
    ---
    tags:
      - Songs
    summary: Get song version history
    description: Retrieve all version snapshots for a specific song (requires read permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Version history retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    versions:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: integer
                          song_id:
                            type: integer
                          version_number:
                            type: integer
                          title:
                            type: string
                          content:
                            type: string
                          user_id:
                            type: integer
                          created_at:
                            type: string
                            format: date-time
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
            return create_error_response("Song not found", 404)
        
        # Get all versions for this song
        versions = SongVersion.query.filter_by(song_id=song_id)\
                                  .order_by(SongVersion.created_at.desc())\
                                  .all()
        
        # Convert to dict format
        versions_data = [version.to_dict() for version in versions]
        
        return create_success_response(
            data={'versions': versions_data},
            message=f"Retrieved {len(versions_data)} versions"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving song versions",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>/versions/<int:version_id>', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@validate_positive_integer('version_id')
@rate_limit(max_requests=30, window_seconds=300)  # 30 requests per 5 minutes
@security_headers
def get_song_version(song_id, version_id):
    """
    Get a specific version of a song
    ---
    tags:
      - Songs
    summary: Get specific song version
    description: Retrieve a specific version snapshot of a song (requires read permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: path
        name: version_id
        description: Version ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Version retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    id:
                      type: integer
                    song_id:
                      type: integer
                    version_number:
                      type: integer
                    title:
                      type: string
                    content:
                      type: string
                    user_id:
                      type: integer
                    created_at:
                      type: string
                      format: date-time
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Version not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
            return create_error_response("Song not found", 404)
        
        # Get the specific version
        version = SongVersion.query.filter_by(id=version_id, song_id=song_id).first()
        
        if not version:
            return create_error_response("Version not found", 404)
        
        return create_success_response(
            data=version.to_dict(),
            message="Version retrieved successfully"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving the song version",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>/restore/<int:version_id>', methods=['POST'])
@auth_required
@validate_positive_integer('song_id')
@validate_positive_integer('version_id')
@rate_limit(max_requests=10, window_seconds=300)  # 10 restores per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def restore_song_version(song_id, version_id):
    """
    Restore a song to a specific version
    ---
    tags:
      - Songs
    summary: Restore song version
    description: Restore a song to a specific version state (requires edit permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: path
        name: version_id
        description: Version ID to restore
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Song restored successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/Song'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song or version not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has edit access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'edit')
        
        if not song:
            return create_error_response("Song not found", 404)
        
        if not has_permission:
            return create_error_response("Insufficient permissions to edit this song", 403)
        
        # Get the version to restore
        version = SongVersion.query.filter_by(id=version_id, song_id=song_id).first()
        
        if not version:
            return create_error_response("Version not found", 404)
        
        # Create a snapshot of current state before restoring
        create_version_snapshot(song, g.current_user_id)
        
        # Restore the song to the version state
        song.title = version.title
        song.content = version.content
        
        # Delete existing sections and recreate from restored content
        SongSection.query.filter_by(song_id=song.id).delete()
        
        # Parse and store sections from restored content
        sections = ChordProValidator.extract_sections(version.content)
        for section_data in sections:
            section = SongSection(
                song_id=song.id,
                section_type=section_data['section_type'],
                section_number=section_data['section_number'],
                content=section_data['content'],
                order_index=section_data['order_index']
            )
            db.session.add(section)
        
        # Save changes
        db.session.commit()
        
        app.logger.info(f"Song restored to version {version.version_number}: {song.title} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=song.to_dict(),
            message=f"Song restored to version {version.version_number} successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while restoring the song version",
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
    Validate ChordPro content
    ---
    tags:
      - Songs
    summary: Validate ChordPro content
    description: Validate ChordPro content format and return analysis results
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        description: ChordPro content to validate
        required: true
        schema:
          type: object
          required:
            - content
          properties:
            content:
              type: string
              description: ChordPro content to validate (max 15,000 characters)
              example: "{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [F]world [G]how are [C]you"
    responses:
      200:
        description: ChordPro content validated successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    is_valid:
                      type: boolean
                      description: Whether the content is valid ChordPro
                    warnings:
                      type: array
                      items:
                        type: string
                      description: List of validation warnings
                    directives:
                      type: object
                      description: Parsed ChordPro directives
                    chord_count:
                      type: integer
                      description: Number of chords found
                    line_count:
                      type: integer
                      description: Number of lines
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      413:
        description: Request entity too large
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
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


@app.route('/api/v1/songs/transpose-chordpro', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=50*1024)  # 50KB for song content
@rate_limit(max_requests=30, window_seconds=300)  # 30 transpositions per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def transpose_chordpro():
    """
    Transpose all chords in ChordPro content by a specified number of semitones
    ---
    tags:
      - Songs
    summary: Transpose ChordPro content
    description: Transpose all chord symbols in ChordPro formatted content according to musical theory rules
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        description: Content and transposition parameters
        required: true
        schema:
          type: object
          required:
            - content
            - semitones
          properties:
            content:
              type: string
              description: ChordPro content to transpose
              example: "{title: Test Song}\n[C]Hello [G]world [Am]test"
            semitones:
              type: integer
              description: Number of semitones to transpose (positive = up, negative = down)
              minimum: -11
              maximum: 11
              example: 2
    responses:
      200:
        description: Content transposed successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    original_content:
                      type: string
                      description: Original ChordPro content
                    transposed_content:
                      type: string
                      description: Transposed ChordPro content
                    semitones:
                      type: integer
                      description: Number of semitones transposed
                    chords_changed:
                      type: array
                      items:
                        type: object
                        properties:
                          original:
                            type: string
                          transposed:
                            type: string
                      description: List of chord changes made
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      413:
        description: Request entity too large
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Validate request data
        if not data:
            return create_error_response("Request body must be valid JSON", 400)
        
        content = data.get('content')
        semitones = data.get('semitones')
        
        # Validate required fields
        if content is None:
            return create_error_response("Content is required", 400)
        
        if semitones is None:
            return create_error_response("Semitones value is required", 400)
        
        # Validate content
        content = sanitize_input(content)
        if not content:
            return create_error_response("Content cannot be empty", 400)
        
        # Validate semitones
        try:
            semitones = int(semitones)
        except (ValueError, TypeError):
            return create_error_response("Semitones must be an integer", 400)
        
        if semitones < -11 or semitones > 11:
            return create_error_response("Semitones must be between -11 and 11", 400)
        
        # Import transposition functions
        from .chordpro_utils import transpose_chordpro_content, ChordProValidator
        
        # Perform transposition
        transposed_content = transpose_chordpro_content(content, semitones)
        
        # Find chord changes by comparing individual chords in content
        import re
        chord_pattern = re.compile(r'\[([^\]]+)\]')
        
        original_matches = list(chord_pattern.finditer(content))
        transposed_matches = list(chord_pattern.finditer(transposed_content))
        
        chords_changed = []
        seen_changes = set()
        
        # Compare each chord occurrence
        for orig_match, trans_match in zip(original_matches, transposed_matches):
            original_chord = orig_match.group(1)
            transposed_chord = trans_match.group(1)
            
            if original_chord != transposed_chord:
                change_pair = (original_chord, transposed_chord)
                if change_pair not in seen_changes:
                    chords_changed.append({
                        'original': original_chord,
                        'transposed': transposed_chord
                    })
                    seen_changes.add(change_pair)
        
        # If no semitones change, add note about no change
        if semitones == 0:
            message = "No transposition applied (0 semitones)"
        else:
            direction = "up" if semitones > 0 else "down"
            message = f"Content transposed {abs(semitones)} semitones {direction}"
        
        app.logger.info(f"ChordPro transposition performed: {semitones} semitones by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data={
                'original_content': content,
                'transposed_content': transposed_content,
                'semitones': semitones,
                'chords_changed': chords_changed
            },
            message=message
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while transposing ChordPro content",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/detect-key', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=50*1024)  # 50KB for song content
@rate_limit(max_requests=30, window_seconds=300)  # 30 key detections per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def detect_key():
    """
    Automatically detect the key signature from ChordPro content
    ---
    tags:
      - Songs
    summary: Detect key signature from ChordPro content
    description: Analyze chord progressions to determine the most likely key signature with confidence scores
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        description: ChordPro content to analyze
        required: true
        schema:
          type: object
          required:
            - content
          properties:
            content:
              type: string
              description: ChordPro content to analyze for key detection
              example: "{title: Test Song}\n[C]Hello [F]world [G]test [Am]end"
    responses:
      200:
        description: Key detection performed successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    detected_key:
                      type: string
                      description: Most likely key signature detected
                      example: "C"
                    confidence:
                      type: number
                      format: float
                      description: Confidence score (0.0-1.0) for the detected key
                      example: 0.85
                    is_minor:
                      type: boolean
                      description: Whether the detected key is a minor key
                      example: false
                    alternative_keys:
                      type: array
                      items:
                        type: object
                        properties:
                          key:
                            type: string
                            description: Alternative key possibility
                          confidence:
                            type: number
                            format: float
                            description: Confidence score for this alternative
                          is_minor:
                            type: boolean
                            description: Whether this alternative is minor
                      description: List of alternative key possibilities
                      example: [{"key": "Am", "confidence": 0.75, "is_minor": true}]
      400:
        description: Invalid request data
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Rate limit exceeded
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        data = request.get_json()
        
        if not data:
            return create_error_response("JSON data required", 400)
        
        content = data.get('content', '')
        
        if not content:
            return create_error_response("Content is required", 400)
        
        if not isinstance(content, str):
            return create_error_response("Content must be a string", 400)
        
        # Sanitize input content
        content = sanitize_input(content)
        
        # Detect key signature
        detection_result = detect_key_signature(content)
        
        app.logger.info(f"Key detection performed by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=detection_result,
            message=f"Key detection completed. Detected key: {detection_result['detected_key']} (confidence: {detection_result['confidence']:.1%})"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while detecting key signature",
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
        
        # Save to database first to get song ID
        db.session.add(new_song)
        db.session.flush()  # This assigns the ID without committing
        
        # Parse and store sections
        sections = ChordProValidator.extract_sections(content)
        for section_data in sections:
            section = SongSection(
                song_id=new_song.id,
                section_type=section_data['section_type'],
                section_number=section_data['section_number'],
                content=section_data['content'],
                order_index=section_data['order_index']
            )
            db.session.add(section)
        
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
                db.session.flush()  # Get the ID for sections
                
                # Parse and store sections for this song
                sections = ChordProValidator.extract_sections(content)
                for section_data in sections:
                    section = SongSection(
                        song_id=new_song.id,
                        section_type=section_data['section_type'],
                        section_number=section_data['section_number'],
                        content=section_data['content'],
                        order_index=section_data['order_index']
                    )
                    db.session.add(section)
                
                uploaded_songs.append({
                    'filename': file.filename,
                    'title': title,
                    'song': new_song
                })
                
            except Exception as e:
                errors.append(f"{file.filename}: {str(e)}")
                continue
        
        # Commit all valid songs and their sections
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



# Song sections endpoints - all require authentication

@app.route('/api/v1/songs/<int:song_id>/sections', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@security_headers
def get_song_sections(song_id):
    """
    Get all sections for a specific song
    ---
    tags:
      - Songs
    summary: Get song sections
    description: Retrieve all sections for a specific song (accessible if owned, shared, or public)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Song sections retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    sections:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: integer
                            description: Section ID
                          section_type:
                            type: string
                            description: Type of section (verse, chorus, bridge, etc.)
                          section_number:
                            type: string
                            description: Section number (if applicable)
                          content:
                            type: string
                            description: Raw ChordPro content for this section
                          order_index:
                            type: integer
                            description: Order of section in the song
                          created_at:
                            type: string
                            format: date-time
                          updated_at:
                            type: string
                            format: date-time
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
            return create_error_response("Song not found", 404)
        
        # Get sections ordered by their index
        sections = SongSection.query.filter_by(song_id=song_id).order_by(SongSection.order_index).all()
        
        # Convert to dict format
        sections_data = [section.to_dict() for section in sections]
        
        return create_success_response(
            data={'sections': sections_data},
            message=f"Retrieved {len(sections_data)} sections for song"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving song sections",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>/sections/<int:section_id>', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@validate_positive_integer('section_id')
@security_headers
def get_song_section(song_id, section_id):
    """
    Get a specific section by ID
    ---
    tags:
      - Songs
    summary: Get specific song section
    description: Retrieve a specific section by its ID (accessible if song is owned, shared, or public)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: path
        name: section_id
        description: Section ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Song section retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    id:
                      type: integer
                      description: Section ID
                    section_type:
                      type: string
                      description: Type of section (verse, chorus, bridge, etc.)
                    section_number:
                      type: string
                      description: Section number (if applicable)
                    content:
                      type: string
                      description: Raw ChordPro content for this section
                    order_index:
                      type: integer
                      description: Order of section in the song
                    created_at:
                      type: string
                      format: date-time
                    updated_at:
                      type: string
                      format: date-time
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song or section not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
            return create_error_response("Song not found", 404)
        
        # Find specific section for this song
        section = SongSection.query.filter_by(id=section_id, song_id=song_id).first()
        
        if not section:
            return create_error_response("Section not found", 404)
        
        return create_success_response(
            data=section.to_dict(),
            message="Section retrieved successfully"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving the section",
            exception=e,
            ip_address=request.remote_addr
        )


# Chord management endpoints - all require authentication

@app.route('/api/v1/chords', methods=['GET'])
@auth_required
@security_headers
def get_chords():
    """
    Get all custom chords for authenticated user
    ---
    tags:
      - Chords
    summary: List user's custom chords
    description: Retrieve all custom chords owned by the authenticated user
    security:
      - Bearer: []
    responses:
      200:
        description: Chords retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    chords:
                      type: array
                      items:
                        $ref: '#/definitions/Chord'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Get chords for the current user
        chords = Chord.query.filter_by(user_id=g.current_user_id).all()
        
        # Convert to dict format
        chords_data = [chord.to_dict() for chord in chords]
        
        return create_success_response(
            data={'chords': chords_data},
            message=f"Retrieved {len(chords_data)} chords"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving chords",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/chords', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=10*1024)  # 10KB for chord definition
@rate_limit(max_requests=30, window_seconds=300)  # 30 chords per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def create_chord():
    """
    Create a new custom chord
    ---
    tags:
      - Chords
    summary: Create new custom chord
    description: Create a new custom chord definition for the authenticated user
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        description: Chord details
        required: true
        schema:
          type: object
          required:
            - name
            - definition
          properties:
            name:
              type: string
              description: Chord name (max 50 characters)
              example: "Cmaj7"
            definition:
              type: string
              description: Chord definition/fingering (max 1,000 characters)
              example: "x32000"
            description:
              type: string
              description: Optional description or notes (max 500 characters)
              example: "Easy open chord voicing"
    responses:
      201:
        description: Chord created successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/Chord'
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      413:
        description: Request entity too large
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data but don't truncate yet - we need to validate length first
        data = sanitize_input(data, max_string_length=1500)  # Allow more for validation
        
        name = data.get('name', '').strip()
        definition = data.get('definition', '').strip()
        description = data.get('description', '').strip()
        
        # Additional HTML sanitization for content
        name = sanitize_html_content(name)
        definition = sanitize_html_content(definition)
        if description:
            description = sanitize_html_content(description)
        
        # Validate required fields
        if not name:
            return create_error_response("Name is required", 400)
        
        if not definition:
            return create_error_response("Definition is required", 400)
        
        # Validate field lengths
        if len(name) > 50:
            return create_error_response("Name must be 50 characters or less", 400)
        
        if len(definition) > 1000:
            return create_error_response("Definition must be 1,000 characters or less", 400)
        
        if description and len(description) > 500:
            return create_error_response("Description must be 500 characters or less", 400)
        
        # Check for duplicate chord names for the same user
        existing_chord = Chord.query.filter_by(
            user_id=g.current_user_id, 
            name=name
        ).first()
        
        if existing_chord:
            return create_error_response(
                f"You already have a chord named '{name}'. Please use a different name.", 
                400
            )
        
        # Create new chord
        new_chord = Chord(
            name=name, 
            definition=definition, 
            user_id=g.current_user_id,
            description=description if description else None
        )
        
        # Save to database
        db.session.add(new_chord)
        db.session.commit()
        
        app.logger.info(f"Chord created: {name} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=new_chord.to_dict(),
            message="Chord created successfully",
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while creating the chord",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/chords/<int:chord_id>', methods=['GET'])
@auth_required
@validate_positive_integer('chord_id')
@security_headers
def get_chord(chord_id):
    """
    Get a specific chord by ID
    ---
    tags:
      - Chords
    summary: Get chord by ID
    description: Retrieve a specific chord by its ID (only if owned by authenticated user)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: chord_id
        description: Chord ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Chord retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/Chord'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Chord not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Find chord by ID and ensure it belongs to the current user
        chord = Chord.query.filter_by(id=chord_id, user_id=g.current_user_id).first()
        
        if not chord:
            return create_error_response("Chord not found", 404)
        
        return create_success_response(
            data=chord.to_dict(),
            message="Chord retrieved successfully"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving the chord",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/chords/<int:chord_id>', methods=['PUT'])
@auth_required
@validate_positive_integer('chord_id')
@validate_request_size(max_content_length=10*1024)  # 10KB for chord definition
@rate_limit(max_requests=50, window_seconds=300)  # 50 updates per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def update_chord(chord_id):
    """
    Update a specific chord by ID
    ---
    tags:
      - Chords
    summary: Update chord
    description: Update a specific chord by its ID (only if owned by authenticated user)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: chord_id
        description: Chord ID
        required: true
        type: integer
        minimum: 1
      - in: body
        name: body
        description: Updated chord details
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
              description: Chord name (max 50 characters)
              example: "Cmaj7_updated"
            definition:
              type: string
              description: Chord definition/fingering (max 1,000 characters)
              example: "x35453"
            description:
              type: string
              description: Optional description or notes (max 500 characters)
              example: "Barre chord voicing"
    responses:
      200:
        description: Chord updated successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  $ref: '#/definitions/Chord'
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Chord not found
        schema:
          $ref: '#/definitions/Error'
      413:
        description: Request entity too large
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Find chord by ID and ensure it belongs to the current user
        chord = Chord.query.filter_by(id=chord_id, user_id=g.current_user_id).first()
        
        if not chord:
            return create_error_response("Chord not found", 404)
        
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data but don't truncate yet - we need to validate length first
        data = sanitize_input(data, max_string_length=1500)  # Allow more for validation
        
        name = data.get('name', '').strip()
        definition = data.get('definition', '').strip()
        description = data.get('description', '').strip()
        
        # Additional HTML sanitization for content
        if name:
            name = sanitize_html_content(name)
        if definition:
            definition = sanitize_html_content(definition)
        if description:
            description = sanitize_html_content(description)
        
        # Update fields if provided
        if name:
            if len(name) > 50:
                return create_error_response("Name must be 50 characters or less", 400)
            
            # Check for duplicate chord names for the same user (excluding current chord)
            existing_chord = Chord.query.filter_by(
                user_id=g.current_user_id, 
                name=name
            ).filter(Chord.id != chord_id).first()
            
            if existing_chord:
                return create_error_response(
                    f"You already have a chord named '{name}'. Please use a different name.", 
                    400
                )
            
            chord.name = name
        
        if definition:
            if len(definition) > 1000:
                return create_error_response("Definition must be 1,000 characters or less", 400)
            chord.definition = definition
        
        if 'description' in data:  # Allow setting description to empty string
            if description and len(description) > 500:
                return create_error_response("Description must be 500 characters or less", 400)
            chord.description = description if description else None
        
        # Save changes
        db.session.commit()
        
        app.logger.info(f"Chord updated: {chord.name} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=chord.to_dict(),
            message="Chord updated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while updating the chord",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/chords/<int:chord_id>', methods=['DELETE'])
@auth_required
@validate_positive_integer('chord_id')
@rate_limit(max_requests=20, window_seconds=300)  # 20 deletions per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def delete_chord(chord_id):
    """
    Delete a specific chord by ID
    ---
    tags:
      - Chords
    summary: Delete chord
    description: Delete a specific chord by its ID (only if owned by authenticated user)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: chord_id
        description: Chord ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Chord deleted successfully
        schema:
          $ref: '#/definitions/Success'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Chord not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        # Find chord by ID and ensure it belongs to the current user
        chord = Chord.query.filter_by(id=chord_id, user_id=g.current_user_id).first()
        
        if not chord:
            return create_error_response("Chord not found", 404)
        
        chord_name = chord.name  # Store for logging
        
        # Delete the chord
        db.session.delete(chord)
        db.session.commit()
        
        app.logger.info(f"Chord deleted: {chord_name} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            message="Chord deleted successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while deleting the chord",
            exception=e,
            ip_address=request.remote_addr
        )



# Collaboration endpoints for song sharing and permission management

@app.route('/api/v1/songs/<int:song_id>/share', methods=['POST'])
@auth_required
@validate_positive_integer('song_id')
@validate_request_size(max_content_length=10*1024)  # 10KB for sharing data
@rate_limit(max_requests=20, window_seconds=300)  # 20 sharing operations per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def share_song(song_id):
    """
    Share a song with other users
    ---
    tags:
      - Collaboration
    summary: Share song with users
    description: Share a song with specified users and permission levels (requires admin permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: body
        name: body
        description: Sharing details
        required: true
        schema:
          type: object
          required:
            - user_email
            - permission_level
          properties:
            user_email:
              type: string
              format: email
              description: Email of user to share with
              example: "collaborator@example.com"
            permission_level:
              type: string
              enum: ["read", "edit", "admin"]
              description: Permission level to grant
              example: "edit"
    responses:
      200:
        description: Song shared successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    user_id:
                      type: integer
                      description: ID of the user granted access
                    user_email:
                      type: string
                      description: Email of the user granted access
                    permission_level:
                      type: string
                      description: Permission level granted
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song or user not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission, validate_permission_level, log_sharing_activity
        
        # Check if user has admin access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'admin')
        
        if not song:
            return create_error_response("Song not found", 404)
        
        if not has_permission:
            return create_error_response("Insufficient permissions to manage this song", 403)
        
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data
        data = sanitize_input(data)
        
        user_email = data.get('user_email', '').strip().lower()
        permission_level = data.get('permission_level', '').strip()
        
        # Validate required fields
        if not user_email:
            return create_error_response("User email is required", 400)
        
        if not permission_level:
            return create_error_response("Permission level is required", 400)
        
        # Validate permission level
        if not validate_permission_level(permission_level):
            return create_error_response("Permission level must be 'read', 'edit', or 'admin'", 400)
        
        # Find user by email
        target_user = User.query.filter_by(email=user_email).first()
        if not target_user:
            return create_error_response("User not found", 404)
        
        # Don't allow sharing with yourself
        if target_user.id == g.current_user_id:
            return create_error_response("Cannot share song with yourself", 400)
        
        # Add or update sharing
        previous_permission = song.get_user_permission(target_user.id)
        song.add_shared_user(target_user.id, permission_level)
        
        # Save changes
        db.session.commit()
        
        # Log the sharing activity
        action = 'permission_changed' if previous_permission else 'share_added'
        log_sharing_activity(
            action=action,
            song_id=song_id,
            actor_user_id=g.current_user_id,
            target_user_id=target_user.id,
            permission_level=permission_level,
            details={'previous_permission': previous_permission}
        )
        
        app.logger.info(f"Song shared: {song.title} with {user_email} ({permission_level}) by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data={
                'user_id': target_user.id,
                'user_email': target_user.email,
                'permission_level': permission_level
            },
            message=f"Song shared successfully with {user_email}"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while sharing the song",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>/collaborators', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@security_headers
def get_song_collaborators(song_id):
    """
    Get list of collaborators for a song
    ---
    tags:
      - Collaboration
    summary: List song collaborators
    description: Retrieve list of users who have access to the song (requires read permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Collaborators retrieved successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    collaborators:
                      type: array
                      items:
                        type: object
                        properties:
                          user_id:
                            type: integer
                            description: User ID
                          email:
                            type: string
                            description: User email
                          permission_level:
                            type: string
                            description: Permission level
                          granted_at:
                            type: string
                            format: date-time
                            description: When access was granted
                    owner:
                      type: object
                      properties:
                        user_id:
                          type: integer
                          description: Owner user ID
                        email:
                          type: string
                          description: Owner email
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission
        
        # Check if user has read access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'read')
        
        if not song or not has_permission:
            return create_error_response("Song not found", 404)
        
        # Get owner information
        owner = User.query.filter_by(id=song.author_id).first()
        owner_data = {
            'user_id': owner.id,
            'email': owner.email
        } if owner else None
        
        # Get collaborators
        collaborators = []
        if song.shared_with and song.permissions:
            # Get users who have access
            shared_user_ids = song.shared_with
            shared_users = User.query.filter(User.id.in_(shared_user_ids)).all()
            
            for user in shared_users:
                permission = song.get_user_permission(user.id)
                if permission:
                    collaborators.append({
                        'user_id': user.id,
                        'email': user.email,
                        'permission_level': permission,
                        'granted_at': song.updated_at.isoformat() if song.updated_at else None
                    })
        
        return create_success_response(
            data={
                'collaborators': collaborators,
                'owner': owner_data
            },
            message=f"Retrieved {len(collaborators)} collaborators"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred while retrieving collaborators",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>/permissions', methods=['PUT'])
@auth_required
@validate_positive_integer('song_id')
@validate_request_size(max_content_length=10*1024)  # 10KB for permission data
@rate_limit(max_requests=20, window_seconds=300)  # 20 permission changes per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def update_song_permissions(song_id):
    """
    Update user permissions for a song
    ---
    tags:
      - Collaboration
    summary: Update user permissions
    description: Update permission level for a user on the song (requires admin permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: body
        name: body
        description: Permission update details
        required: true
        schema:
          type: object
          required:
            - user_email
            - permission_level
          properties:
            user_email:
              type: string
              format: email
              description: Email of user to update permissions for
              example: "collaborator@example.com"
            permission_level:
              type: string
              enum: ["read", "edit", "admin"]
              description: New permission level
              example: "admin"
    responses:
      200:
        description: Permissions updated successfully
        schema:
          allOf:
            - $ref: '#/definitions/Success'
            - type: object
              properties:
                data:
                  type: object
                  properties:
                    user_id:
                      type: integer
                      description: ID of the user
                    user_email:
                      type: string
                      description: Email of the user
                    old_permission:
                      type: string
                      description: Previous permission level
                    new_permission:
                      type: string
                      description: New permission level
      400:
        description: Invalid input or validation error
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song or user not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission, validate_permission_level, log_sharing_activity
        
        # Check if user has admin access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'admin')
        
        if not song:
            return create_error_response("Song not found", 404)
        
        if not has_permission:
            return create_error_response("Insufficient permissions to manage this song", 403)
        
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input data
        data = sanitize_input(data)
        
        user_email = data.get('user_email', '').strip().lower()
        permission_level = data.get('permission_level', '').strip()
        
        # Validate required fields
        if not user_email:
            return create_error_response("User email is required", 400)
        
        if not permission_level:
            return create_error_response("Permission level is required", 400)
        
        # Validate permission level
        if not validate_permission_level(permission_level):
            return create_error_response("Permission level must be 'read', 'edit', or 'admin'", 400)
        
        # Find user by email
        target_user = User.query.filter_by(email=user_email).first()
        if not target_user:
            return create_error_response("User not found", 404)
        
        # Check if user currently has access
        old_permission = song.get_user_permission(target_user.id)
        
        # For the owner, they always have access but it's not stored in permissions
        if target_user.id == song.author_id:
            old_permission = 'admin'  # Owner implicitly has admin permissions
        
        if not old_permission and target_user.id != song.author_id:
            return create_error_response("User does not have access to this song", 400)
        
        # Don't allow changing own permissions
        if target_user.id == g.current_user_id:
            return create_error_response("Cannot change your own permissions", 400)
        
        # Update permission
        song.add_shared_user(target_user.id, permission_level)
        
        # Save changes
        db.session.commit()
        
        # Log the permission change
        log_sharing_activity(
            action='permission_changed',
            song_id=song_id,
            actor_user_id=g.current_user_id,
            target_user_id=target_user.id,
            permission_level=permission_level,
            details={'old_permission': old_permission}
        )
        
        app.logger.info(f"Permissions updated: {song.title} for {user_email} ({old_permission} -> {permission_level}) by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data={
                'user_id': target_user.id,
                'user_email': target_user.email,
                'old_permission': old_permission,
                'new_permission': permission_level
            },
            message=f"Permissions updated successfully for {user_email}"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while updating permissions",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/songs/<int:song_id>/share/<int:user_id>', methods=['DELETE'])
@auth_required
@validate_positive_integer('song_id')
@validate_positive_integer('user_id')
@rate_limit(max_requests=20, window_seconds=300)  # 20 revoke operations per 5 minutes
@csrf_protect(require_token=False)  # CSRF optional for API endpoints
@security_headers
def revoke_song_access(song_id, user_id):
    """
    Revoke user access to a song
    ---
    tags:
      - Collaboration
    summary: Revoke user access
    description: Remove user's access to the song (requires admin permissions)
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        description: Song ID
        required: true
        type: integer
        minimum: 1
      - in: path
        name: user_id
        description: User ID to revoke access from
        required: true
        type: integer
        minimum: 1
    responses:
      200:
        description: Access revoked successfully
        schema:
          $ref: '#/definitions/Success'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song or user not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Too many requests
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .permission_helpers import check_song_permission, log_sharing_activity
        
        # Check if user has admin access to the song
        song, has_permission = check_song_permission(song_id, g.current_user_id, 'admin')
        
        if not song:
            return create_error_response("Song not found", 404)
        
        if not has_permission:
            return create_error_response("Insufficient permissions to manage this song", 403)
        
        # Find the target user
        target_user = User.query.filter_by(id=user_id).first()
        if not target_user:
            return create_error_response("User not found", 404)
        
        # Check if user currently has access
        old_permission = song.get_user_permission(target_user.id)
        
        # For the owner, they always have access but it's not stored in permissions
        if target_user.id == song.author_id:
            old_permission = 'admin'  # Owner implicitly has admin permissions
        
        if not old_permission and target_user.id != song.author_id:
            return create_error_response("User does not have access to this song", 400)
        
        # Don't allow revoking own access
        if target_user.id == g.current_user_id:
            return create_error_response("Cannot revoke your own access", 400)
        
        # Remove user access
        song.remove_shared_user(target_user.id)
        
        # Save changes
        db.session.commit()
        
        # Log the access revocation
        log_sharing_activity(
            action='share_removed',
            song_id=song_id,
            actor_user_id=g.current_user_id,
            target_user_id=target_user.id,
            permission_level=old_permission
        )
        
        app.logger.info(f"Access revoked: {song.title} for {target_user.email} by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            message=f"Access revoked successfully for {target_user.email}"
        )
        
    except Exception as e:
        db.session.rollback()
        return security_error_handler.handle_server_error(
            "An error occurred while revoking access",
            exception=e,
            ip_address=request.remote_addr
        )


# Google Drive Integration Endpoints

@app.route('/api/v1/google-drive/validate-and-save', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=1024*1024)  # 1MB limit
@rate_limit(max_requests=10, window_seconds=300)  # 10 saves per 5 minutes
@csrf_protect(require_token=False)
@security_headers
def google_drive_validate_and_save():
    """
    Validate ChordPro content and save to Google Drive
    ---
    tags:
      - Google Drive
    summary: Validate and save ChordPro content to Google Drive
    description: Server-side validation of ChordPro content before saving to Google Drive
    security:
      - Bearer: []
    parameters:
      - in: body
        name: data
        description: ChordPro content and file information
        required: true
        schema:
          type: object
          properties:
            access_token:
              type: string
              description: Google OAuth2 access token
            file_name:
              type: string
              description: Name for the file in Google Drive
            content:
              type: string
              description: ChordPro content to validate and save
            parent_folder_id:
              type: string
              description: Optional parent folder ID in Google Drive
          required:
            - access_token
            - file_name
            - content
    responses:
      200:
        description: Validation and save completed
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                success:
                  type: boolean
                validation:
                  type: object
                file:
                  type: object
                message:
                  type: string
      400:
        description: Bad request or validation failed
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Unauthorized
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .google_drive_service import google_drive_service
        
        if not google_drive_service.is_enabled():
            return create_error_response(
                "Google Drive integration is not enabled on this server", 
                400
            )
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input
        data = sanitize_input(data, max_string_length=50000)  # Allow large content
        
        access_token = data.get('access_token', '').strip()
        file_name = data.get('file_name', '').strip()
        content = data.get('content', '').strip()
        parent_folder_id = data.get('parent_folder_id', '').strip() or None
        
        # Validate required fields
        if not access_token:
            return create_error_response("Access token is required", 400)
        
        if not file_name:
            return create_error_response("File name is required", 400)
        
        if not content:
            return create_error_response("Content is required", 400)
        
        # Validate file name length
        if len(file_name) > 100:
            return create_error_response("File name must be 100 characters or less", 400)
        
        # Call Google Drive service
        result = google_drive_service.validate_chordpro_and_save(
            access_token=access_token,
            file_name=file_name,
            content=content,
            parent_folder_id=parent_folder_id
        )
        
        app.logger.info(f"Google Drive validate and save operation by user {g.current_user_id} from IP {request.remote_addr}")
        
        return create_success_response(
            data=result,
            message="Operation completed"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred during Google Drive operation",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/google-drive/batch-validate', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=512*1024)  # 512KB limit
@rate_limit(max_requests=5, window_seconds=300)  # 5 batch operations per 5 minutes
@csrf_protect(require_token=False)
@security_headers
def google_drive_batch_validate():
    """
    Batch validate multiple ChordPro files from Google Drive
    ---
    tags:
      - Google Drive
    summary: Batch validate ChordPro files
    description: Validate multiple ChordPro files from Google Drive in a single operation
    security:
      - Bearer: []
    parameters:
      - in: body
        name: data
        description: Google Drive file IDs to validate
        required: true
        schema:
          type: object
          properties:
            access_token:
              type: string
              description: Google OAuth2 access token
            file_ids:
              type: array
              items:
                type: string
              description: List of Google Drive file IDs to validate
          required:
            - access_token
            - file_ids
    responses:
      200:
        description: Batch validation completed
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                success:
                  type: boolean
                results:
                  type: array
                  items:
                    type: object
                total:
                  type: integer
                processed:
                  type: integer
      400:
        description: Bad request
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Unauthorized
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .google_drive_service import google_drive_service
        
        if not google_drive_service.is_enabled():
            return create_error_response(
                "Google Drive integration is not enabled on this server", 
                400
            )
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input
        data = sanitize_input(data)
        
        access_token = data.get('access_token', '').strip()
        file_ids = data.get('file_ids', [])
        
        # Validate required fields
        if not access_token:
            return create_error_response("Access token is required", 400)
        
        if not isinstance(file_ids, list):
            return create_error_response("File IDs must be a list", 400)
        
        if len(file_ids) == 0:
            return create_error_response("At least one file ID is required", 400)
        
        if len(file_ids) > 20:  # Limit batch size
            return create_error_response("Maximum 20 files can be validated at once", 400)
        
        # Validate file IDs
        for file_id in file_ids:
            if not isinstance(file_id, str) or not file_id.strip():
                return create_error_response("All file IDs must be non-empty strings", 400)
        
        # Call Google Drive service
        result = google_drive_service.batch_validate_files(
            access_token=access_token,
            file_ids=file_ids
        )
        
        app.logger.info(f"Google Drive batch validation by user {g.current_user_id} for {len(file_ids)} files from IP {request.remote_addr}")
        
        return create_success_response(
            data=result,
            message="Batch validation completed"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred during batch validation",
            exception=e,
            ip_address=request.remote_addr
        )


@app.route('/api/v1/google-drive/backup-songs', methods=['POST'])
@auth_required
@validate_request_size(max_content_length=5*1024*1024)  # 5MB limit for backup
@rate_limit(max_requests=2, window_seconds=3600)  # 2 backups per hour
@csrf_protect(require_token=False)
@security_headers
def google_drive_backup_songs():
    """
    Backup user songs to Google Drive
    ---
    tags:
      - Google Drive
    summary: Backup songs to Google Drive
    description: Create a backup of all user songs in Google Drive organized in a dedicated folder
    security:
      - Bearer: []
    parameters:
      - in: body
        name: data
        description: Backup configuration
        required: true
        schema:
          type: object
          properties:
            access_token:
              type: string
              description: Google OAuth2 access token
            backup_folder_name:
              type: string
              description: Name of the backup folder (optional)
              default: "ChordMe Backup"
          required:
            - access_token
    responses:
      200:
        description: Backup completed
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                success:
                  type: boolean
                folder_id:
                  type: string
                folder_name:
                  type: string
                files:
                  type: array
                  items:
                    type: object
                total_songs:
                  type: integer
                backed_up:
                  type: integer
      400:
        description: Bad request
        schema:
          $ref: '#/definitions/Error'
      401:
        description: Unauthorized
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Internal server error
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        from .google_drive_service import google_drive_service
        
        if not google_drive_service.is_enabled():
            return create_error_response(
                "Google Drive integration is not enabled on this server", 
                400
            )
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        # Sanitize input
        data = sanitize_input(data)
        
        access_token = data.get('access_token', '').strip()
        backup_folder_name = data.get('backup_folder_name', 'ChordMe Backup').strip()
        
        # Validate required fields
        if not access_token:
            return create_error_response("Access token is required", 400)
        
        if len(backup_folder_name) > 100:
            return create_error_response("Backup folder name must be 100 characters or less", 400)
        
        # Get user's songs
        user_songs = Song.query.filter_by(author_id=g.current_user_id).all()
        
        # Convert to format expected by Google Drive service
        songs_data = []
        for song in user_songs:
            songs_data.append({
                'id': song.id,
                'title': song.title,
                'content': song.content or ''
            })
        
        # Call Google Drive service
        result = google_drive_service.backup_user_songs(
            access_token=access_token,
            user_songs=songs_data,
            backup_folder_name=backup_folder_name
        )
        
        app.logger.info(f"Google Drive backup by user {g.current_user_id} for {len(songs_data)} songs from IP {request.remote_addr}")
        
        return create_success_response(
            data=result,
            message="Backup operation completed"
        )
        
    except Exception as e:
        return security_error_handler.handle_server_error(
            "An error occurred during backup operation",
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


# Register chord routes blueprint
from .chord_routes import chord_bp
app.register_blueprint(chord_bp)

# Initialize database tables
with app.app_context():
    db.create_all()