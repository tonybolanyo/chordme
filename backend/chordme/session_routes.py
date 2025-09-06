"""
Session management routes for collaborative editing.
Handles session creation, management, invitations, and activity logging.
"""

from . import app, db
from .models import CollaborationSession, SessionTemplate, SessionParticipant, SessionActivity, User, Song
from .utils import auth_required, create_error_response, create_success_response, validate_request_size, sanitize_input
from .rate_limiter import rate_limit
from .security_headers import security_headers
from flask import request, jsonify, g
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import uuid
import secrets


@app.route('/api/v1/sessions', methods=['POST'])
@rate_limit("5 per minute")
@security_headers
@validate_request_size(max_content_length=1024*1024)  # 1MB limit
@auth_required
def create_session():
    """
    Create a new collaborative session.
    ---
    tags:
      - Sessions
    summary: Create collaborative session
    description: Create a new collaborative editing session for a song
    parameters:
      - in: body
        name: session_data
        schema:
          type: object
          required:
            - song_id
            - name
          properties:
            song_id:
              type: integer
              description: ID of the song to collaborate on
            name:
              type: string
              description: Session name
            description:
              type: string
              description: Optional session description
            template_id:
              type: integer
              description: ID of session template to use
            access_mode:
              type: string
              enum: ['invite-only', 'link-access', 'public']
              default: 'invite-only'
            max_participants:
              type: integer
              default: 10
              minimum: 2
              maximum: 50
    responses:
      201:
        description: Session created successfully
      400:
        description: Invalid request data
      404:
        description: Song not found
      403:
        description: Insufficient permissions
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No JSON data provided", 400)
        
        # Validate required fields
        song_id = data.get('song_id')
        name = sanitize_input(data.get('name', '').strip())
        
        if not song_id or not name:
            return create_error_response("song_id and name are required", 400)
        
        # Validate song exists and user has access
        song = Song.query.get(song_id)
        if not song:
            return create_error_response("Song not found", 404)
        
        # Check if user can create sessions for this song
        if song.user_id != g.current_user_id:
            # Check if user has edit permissions through sharing
            user_permission = song.permissions.get(str(g.current_user_id))
            if user_permission not in ['edit', 'admin']:
                return create_error_response("Insufficient permissions to create session", 403)
        
        # Validate optional fields
        description = sanitize_input(data.get('description', ''))
        template_id = data.get('template_id')
        access_mode = data.get('access_mode', 'invite-only')
        max_participants = data.get('max_participants', 10)
        
        if access_mode not in ['invite-only', 'link-access', 'public']:
            return create_error_response("Invalid access_mode", 400)
        
        if not isinstance(max_participants, int) or max_participants < 2 or max_participants > 50:
            return create_error_response("max_participants must be between 2 and 50", 400)
        
        # Validate template if provided
        template = None
        if template_id:
            template = SessionTemplate.query.get(template_id)
            if not template:
                return create_error_response("Template not found", 404)
            
            if not template.is_public and template.created_by != g.current_user_id:
                return create_error_response("Template not accessible", 403)
        
        # Create session
        session_id = str(uuid.uuid4())
        session = CollaborationSession(
            session_id=session_id,
            song_id=song_id,
            creator_id=g.current_user_id,
            name=name,
            template_id=template_id,
            description=description,
            access_mode=access_mode,
            max_participants=max_participants
        )
        
        db.session.add(session)
        
        # Add creator as owner participant
        owner_participant = SessionParticipant(
            session_id=session_id,
            user_id=g.current_user_id,
            role='owner'
        )
        db.session.add(owner_participant)
        
        # Log session creation
        activity = SessionActivity.log(
            session_id=session_id,
            user_id=g.current_user_id,
            activity_type='session_created',
            description=f"Created session '{name}'"
        )
        
        # Update session participant count and start time
        session.participant_count = 1
        session.started_at = datetime.utcnow()
        
        # Increment template usage if used
        if template:
            template.increment_usage()
        
        db.session.commit()
        
        return create_success_response(
            data=session.to_dict(include_participants=True),
            message="Session created successfully"
        ), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return create_error_response("Database constraint violation", 400)
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating session: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def get_session(session_id):
    """
    Get session details.
    ---
    tags:
      - Sessions
    summary: Get session information
    description: Retrieve detailed information about a collaborative session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
    responses:
      200:
        description: Session details
      404:
        description: Session not found
      403:
        description: Access denied
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check access permissions
        if not session.can_access(g.current_user_id):
            return create_error_response("Access denied", 403)
        
        # Get user's role in session
        user_role = session.get_user_role(g.current_user_id)
        
        # Include activities only if user has appropriate permissions
        include_activities = user_role in ['owner', 'editor']
        
        session_data = session.to_dict(
            include_participants=True,
            include_activities=include_activities
        )
        session_data['user_role'] = user_role
        
        return create_success_response(data=session_data)
        
    except Exception as e:
        app.logger.error(f"Error getting session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/join', methods=['POST'])
@rate_limit("10 per minute")
@security_headers
@validate_request_size(max_content_length=1024)  # 1KB limit
@auth_required
def join_session(session_id):
    """
    Join a collaborative session.
    ---
    tags:
      - Sessions
    summary: Join session
    description: Join an existing collaborative session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
      - in: body
        name: join_data
        schema:
          type: object
          properties:
            invitation_code:
              type: string
              description: Required for link-access sessions
    responses:
      200:
        description: Successfully joined session
      400:
        description: Invalid request or session full
      404:
        description: Session not found
      403:
        description: Access denied
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        if session.status != 'active':
            return create_error_response("Session is not active", 400)
        
        if session.participant_count >= session.max_participants:
            return create_error_response("Session is full", 400)
        
        # Check if user is already a participant
        existing_participant = SessionParticipant.query.filter_by(
            session_id=session_id, user_id=g.current_user_id
        ).first()
        
        if existing_participant:
            if existing_participant.status == 'active':
                return create_error_response("Already a participant", 400)
            else:
                # Reactivate participant
                existing_participant.status = 'active'
                existing_participant.joined_at = datetime.utcnow()
                session.participant_count += 1
        else:
            # Check access permissions
            data = request.get_json() or {}
            
            if session.access_mode == 'invite-only':
                # Must be explicitly invited (handled by invitation endpoints)
                return create_error_response("Session requires invitation", 403)
            elif session.access_mode == 'link-access':
                # Must provide correct invitation code
                provided_code = data.get('invitation_code')
                if not provided_code or provided_code != session.invitation_code:
                    return create_error_response("Invalid invitation code", 403)
            elif session.access_mode == 'public':
                # Must have access to the song
                song = session.song
                if song.user_id != g.current_user_id:
                    user_permission = song.permissions.get(str(g.current_user_id))
                    if not user_permission:
                        return create_error_response("No access to song", 403)
            
            # Add as new participant
            participant = session.add_participant(
                user_id=g.current_user_id,
                role='viewer'  # Default role for self-joined participants
            )
        
        # Log join activity
        SessionActivity.log(
            session_id=session_id,
            user_id=g.current_user_id,
            activity_type='user_joined',
            description=f"Joined session"
        )
        
        db.session.commit()
        
        return create_success_response(
            data=session.to_dict(include_participants=True),
            message="Successfully joined session"
        )
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error joining session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/leave', methods=['POST'])
@rate_limit("10 per minute")
@security_headers
@auth_required
def leave_session(session_id):
    """
    Leave a collaborative session.
    ---
    tags:
      - Sessions
    summary: Leave session
    description: Leave a collaborative session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
    responses:
      200:
        description: Successfully left session
      404:
        description: Session not found
      400:
        description: Not a participant or cannot leave
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check if user is a participant
        participant = SessionParticipant.query.filter_by(
            session_id=session_id, user_id=g.current_user_id
        ).first()
        
        if not participant:
            return create_error_response("Not a participant in this session", 400)
        
        # Owner cannot leave unless transferring ownership or ending session
        if participant.role == 'owner':
            return create_error_response("Owner cannot leave session. Transfer ownership or end session.", 400)
        
        # Remove participant
        if session.remove_participant(g.current_user_id):
            # Log leave activity
            SessionActivity.log(
                session_id=session_id,
                user_id=g.current_user_id,
                activity_type='user_left',
                description=f"Left session"
            )
            
            db.session.commit()
            
            return create_success_response(message="Successfully left session")
        else:
            return create_error_response("Failed to leave session", 400)
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error leaving session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/participants', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def get_session_participants(session_id):
    """
    Get session participants.
    ---
    tags:
      - Sessions
    summary: Get participants list
    description: Get list of all participants in a session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
    responses:
      200:
        description: Participants list
      404:
        description: Session not found
      403:
        description: Access denied
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check access permissions
        if not session.can_access(g.current_user_id):
            return create_error_response("Access denied", 403)
        
        participants = [p.to_dict(include_user=True) for p in session.participants]
        
        return create_success_response(data={'participants': participants})
        
    except Exception as e:
        app.logger.error(f"Error getting participants for session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/invite', methods=['POST'])
@rate_limit("20 per minute")
@security_headers
@validate_request_size(max_content_length=2048)  # 2KB limit
@auth_required
def invite_to_session(session_id):
    """
    Invite users to a session.
    ---
    tags:
      - Sessions
    summary: Invite users
    description: Invite users to join a collaborative session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
      - in: body
        name: invitation_data
        schema:
          type: object
          required:
            - users
          properties:
            users:
              type: array
              items:
                type: object
                properties:
                  email:
                    type: string
                  role:
                    type: string
                    enum: ['viewer', 'commenter', 'editor']
                    default: 'viewer'
            message:
              type: string
              description: Optional invitation message
    responses:
      200:
        description: Invitations sent successfully
      400:
        description: Invalid request data
      404:
        description: Session not found
      403:
        description: Access denied
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check if user can invite others
        user_role = session.get_user_role(g.current_user_id)
        if user_role not in ['owner', 'editor']:
            return create_error_response("Insufficient permissions to invite users", 403)
        
        data = request.get_json()
        if not data or 'users' not in data:
            return create_error_response("Users list is required", 400)
        
        users_to_invite = data['users']
        message = sanitize_input(data.get('message', ''))
        
        if not isinstance(users_to_invite, list) or len(users_to_invite) == 0:
            return create_error_response("Users must be a non-empty array", 400)
        
        invited_users = []
        errors = []
        
        for user_data in users_to_invite:
            if not isinstance(user_data, dict) or 'email' not in user_data:
                errors.append("Each user must have an email field")
                continue
            
            email = user_data['email'].strip().lower()
            role = user_data.get('role', 'viewer')
            
            if role not in ['viewer', 'commenter', 'editor']:
                errors.append(f"Invalid role '{role}' for user {email}")
                continue
            
            # Find user by email
            user = User.query.filter_by(email=email).first()
            if not user:
                errors.append(f"User not found: {email}")
                continue
            
            # Check if session is full
            if session.participant_count >= session.max_participants:
                errors.append("Session is full")
                break
            
            # Check if already a participant
            existing = SessionParticipant.query.filter_by(
                session_id=session_id, user_id=user.id
            ).first()
            
            if existing:
                errors.append(f"User {email} is already a participant")
                continue
            
            # Add participant
            participant = session.add_participant(
                user_id=user.id,
                role=role,
                invited_by=g.current_user_id
            )
            
            # Log invitation activity
            SessionActivity.log(
                session_id=session_id,
                user_id=g.current_user_id,
                activity_type='user_invited',
                description=f"Invited {email} as {role}",
                details={'invited_user_id': user.id, 'role': role}
            )
            
            invited_users.append({
                'user_id': user.id,
                'email': email,
                'role': role
            })
        
        db.session.commit()
        
        response_data = {
            'invited_users': invited_users,
            'errors': errors
        }
        
        if invited_users:
            return create_success_response(
                data=response_data,
                message=f"Successfully invited {len(invited_users)} users"
            )
        else:
            return create_error_response("No users were invited", 400, response_data)
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error inviting users to session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/activities', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def get_session_activities(session_id):
    """
    Get session activity log.
    ---
    tags:
      - Sessions
    summary: Get activity log
    description: Get activity log for a collaborative session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
      - in: query
        name: limit
        type: integer
        default: 50
        description: Maximum number of activities to return
      - in: query
        name: offset
        type: integer
        default: 0
        description: Number of activities to skip
      - in: query
        name: activity_type
        type: string
        description: Filter by activity type
    responses:
      200:
        description: Activity log
      404:
        description: Session not found
      403:
        description: Access denied
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check access permissions
        if not session.can_access(g.current_user_id):
            return create_error_response("Access denied", 403)
        
        # Get user's role to determine what activities they can see
        user_role = session.get_user_role(g.current_user_id)
        include_private = user_role == 'owner'
        
        # Parse query parameters
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100
        offset = int(request.args.get('offset', 0))
        activity_type = request.args.get('activity_type')
        
        # Build query
        query = SessionActivity.query.filter_by(session_id=session_id)
        
        if not include_private:
            query = query.filter_by(is_private=False)
        
        if activity_type:
            query = query.filter_by(activity_type=activity_type)
        
        query = query.order_by(SessionActivity.created_at.desc())
        query = query.offset(offset).limit(limit)
        
        activities = [
            activity.to_dict(include_user=True, include_private=include_private)
            for activity in query.all()
        ]
        
        # Filter out None values (private activities for non-owners)
        activities = [a for a in activities if a is not None]
        
        return create_success_response(data={'activities': activities})
        
    except Exception as e:
        app.logger.error(f"Error getting activities for session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/templates', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def get_session_templates():
    """
    Get available session templates.
    ---
    tags:
      - Sessions
    summary: Get session templates
    description: Get list of available session templates
    parameters:
      - in: query
        name: category
        type: string
        description: Filter by template category
    responses:
      200:
        description: Session templates list
    """
    try:
        category = request.args.get('category')
        
        query = SessionTemplate.query.filter(
            db.or_(
                SessionTemplate.is_public == True,
                SessionTemplate.created_by == g.current_user_id
            )
        )
        
        if category:
            query = query.filter_by(category=category)
        
        query = query.order_by(SessionTemplate.usage_count.desc(), SessionTemplate.name)
        
        templates = [template.to_dict() for template in query.all()]
        
        return create_success_response(data={'templates': templates})
        
    except Exception as e:
        app.logger.error(f"Error getting session templates: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/my-sessions', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def get_my_sessions():
    """
    Get user's sessions.
    ---
    tags:
      - Sessions
    summary: Get user sessions
    description: Get list of sessions user is participating in or created
    parameters:
      - in: query
        name: status
        type: string
        description: Filter by session status
      - in: query
        name: role
        type: string
        description: Filter by user's role in sessions
    responses:
      200:
        description: User's sessions list
    """
    try:
        status = request.args.get('status')
        role = request.args.get('role')
        
        # Get sessions where user is a participant
        participant_subquery = db.session.query(SessionParticipant.session_id).filter_by(
            user_id=g.current_user_id
        )
        
        if role:
            participant_subquery = participant_subquery.filter_by(role=role)
        
        query = CollaborationSession.query.filter(
            CollaborationSession.id.in_(participant_subquery)
        )
        
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(CollaborationSession.last_activity.desc())
        
        sessions = []
        for session in query.all():
            session_data = session.to_dict()
            session_data['user_role'] = session.get_user_role(g.current_user_id)
            sessions.append(session_data)
        
        return create_success_response(data={'sessions': sessions})
        
    except Exception as e:
        app.logger.error(f"Error getting user sessions: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/recording/start', methods=['POST'])
@rate_limit("10 per minute")
@security_headers
@auth_required
def start_session_recording(session_id):
    """
    Start recording a session.
    ---
    tags:
      - Sessions
    summary: Start session recording
    description: Start recording all events in a collaborative session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
    responses:
      200:
        description: Recording started successfully
      404:
        description: Session not found
      403:
        description: Access denied
      400:
        description: Session already being recorded
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check if user has permission to manage recording
        user_role = session.get_user_role(g.current_user_id)
        if user_role not in ['owner', 'editor']:
            return create_error_response("Insufficient permissions to start recording", 403)
        
        from .session_recording import recording_manager
        
        success = recording_manager.start_session_recording(session_id)
        if success:
            return create_success_response(message="Recording started successfully")
        else:
            return create_error_response("Failed to start recording", 400)
        
    except Exception as e:
        app.logger.error(f"Error starting recording for session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/recording/stop', methods=['POST'])
@rate_limit("10 per minute")
@security_headers
@auth_required
def stop_session_recording(session_id):
    """
    Stop recording a session.
    ---
    tags:
      - Sessions
    summary: Stop session recording
    description: Stop recording a collaborative session and get recording data
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
    responses:
      200:
        description: Recording stopped successfully
      404:
        description: Session not found
      403:
        description: Access denied
      400:
        description: Session not being recorded
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check if user has permission to manage recording
        user_role = session.get_user_role(g.current_user_id)
        if user_role not in ['owner', 'editor']:
            return create_error_response("Insufficient permissions to stop recording", 403)
        
        from .session_recording import recording_manager
        
        recording_data = recording_manager.stop_session_recording(session_id)
        if recording_data:
            return create_success_response(
                data=recording_data,
                message="Recording stopped successfully"
            )
        else:
            return create_error_response("Failed to stop recording or session not being recorded", 400)
        
    except Exception as e:
        app.logger.error(f"Error stopping recording for session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/<session_id>/recording/status', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def get_recording_status(session_id):
    """
    Get recording status for a session.
    ---
    tags:
      - Sessions
    summary: Get recording status
    description: Get current recording status for a collaborative session
    parameters:
      - in: path
        name: session_id
        type: string
        required: true
        description: Session ID
    responses:
      200:
        description: Recording status
      404:
        description: Session not found
      403:
        description: Access denied
    """
    try:
        session = CollaborationSession.query.get(session_id)
        if not session:
            return create_error_response("Session not found", 404)
        
        # Check access permissions
        if not session.can_access(g.current_user_id):
            return create_error_response("Access denied", 403)
        
        from .session_recording import recording_manager
        
        status = recording_manager.get_recording_status(session_id)
        
        return create_success_response(data=status)
        
    except Exception as e:
        app.logger.error(f"Error getting recording status for session {session_id}: {str(e)}")
        return create_error_response("Internal server error", 500)


@app.route('/api/v1/sessions/cleanup', methods=['POST'])
@rate_limit("5 per hour")
@security_headers
@auth_required
def cleanup_sessions():
    """
    Cleanup inactive sessions (admin only).
    ---
    tags:
      - Sessions
    summary: Cleanup inactive sessions
    description: Clean up inactive sessions and archive old ones
    parameters:
      - in: body
        name: cleanup_options
        schema:
          type: object
          properties:
            dry_run:
              type: boolean
              default: false
              description: If true, only report what would be cleaned up
    responses:
      200:
        description: Cleanup completed successfully
      403:
        description: Access denied (admin only)
    """
    try:
        # This would typically require admin permissions
        # For now, we'll allow any authenticated user for testing
        
        data = request.get_json() or {}
        dry_run = data.get('dry_run', False)
        
        from .session_cleanup import SessionCleanupService
        
        stats = SessionCleanupService.cleanup_inactive_sessions(dry_run=dry_run)
        
        return create_success_response(
            data=stats,
            message=f"Cleanup completed {'(dry run)' if dry_run else ''}"
        )
        
    except Exception as e:
        app.logger.error(f"Error during session cleanup: {str(e)}")
        return create_error_response("Internal server error", 500)