"""
Professional collaboration workspace routes for enterprise users.
Handles room management, resource libraries, meeting scheduling, and calendar integration.
"""

from . import app, db
from .models import (
    CollaborationRoom, RoomParticipant, RoomResource, RoomMeeting, 
    MeetingAttendee, RoomChatMessage, User
)
from .utils import auth_required, create_error_response, create_success_response, validate_request_size, sanitize_input
from .rate_limiter import rate_limit
from .security_headers import security_headers
from flask import request, jsonify, g
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import uuid
import secrets


@app.route('/api/v1/collaboration-rooms', methods=['POST'])
@rate_limit("10 per hour")
@security_headers
@validate_request_size(max_content_length=1024*1024)  # 1MB limit
@auth_required
def create_collaboration_room():
    """
    Create a new professional collaboration room.
    ---
    tags:
      - Collaboration Rooms
    summary: Create professional collaboration room
    description: Create a new professional collaboration room with enhanced features
    parameters:
      - in: body
        name: room_data
        schema:
          type: object
          required:
            - name
            - room_type
          properties:
            name:
              type: string
              description: Room name
            description:
              type: string
              description: Room description
            room_type:
              type: string
              enum: [album, tour, lesson_plan, general]
              description: Type of professional collaboration
            access_mode:
              type: string
              enum: [invite-only, link-access, public]
              default: invite-only
            max_participants:
              type: integer
              minimum: 1
              maximum: 200
              default: 50
            has_resource_library:
              type: boolean
              default: true
            has_meeting_scheduler:
              type: boolean
              default: true
            has_calendar_integration:
              type: boolean
              default: false
            has_progress_tracking:
              type: boolean
              default: true
            has_chat_enabled:
              type: boolean
              default: true
    responses:
      201:
        description: Room created successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
      403:
        description: Insufficient permissions
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        # Validate required fields
        required_fields = ['name', 'room_type']
        for field in required_fields:
            if field not in data:
                return create_error_response(f"Missing required field: {field}", 400)
        
        # Sanitize input
        name = sanitize_input(data['name'], max_length=255)
        description = sanitize_input(data.get('description', ''), max_length=2000)
        room_type = sanitize_input(data['room_type'])
        
        # Validate room type
        valid_room_types = ['album', 'tour', 'lesson_plan', 'general']
        if room_type not in valid_room_types:
            return create_error_response(f"Invalid room type. Must be one of: {', '.join(valid_room_types)}", 400)
        
        # Validate access mode
        access_mode = data.get('access_mode', 'invite-only')
        valid_access_modes = ['invite-only', 'link-access', 'public']
        if access_mode not in valid_access_modes:
            return create_error_response(f"Invalid access mode. Must be one of: {', '.join(valid_access_modes)}", 400)
        
        # Create room
        room_id = str(uuid.uuid4())
        room = CollaborationRoom(
            room_id=room_id,
            name=name,
            room_type=room_type,
            creator_id=g.current_user.id,
            description=description,
            access_mode=access_mode,
            max_participants=min(data.get('max_participants', 50), 200),
            has_resource_library=data.get('has_resource_library', True),
            has_meeting_scheduler=data.get('has_meeting_scheduler', True),
            has_calendar_integration=data.get('has_calendar_integration', False),
            has_progress_tracking=data.get('has_progress_tracking', True),
            has_chat_enabled=data.get('has_chat_enabled', True)
        )
        
        db.session.add(room)
        
        # Add creator as band leader
        participant = room.add_participant(
            user_id=g.current_user.id,
            role='band_leader'
        )
        
        db.session.commit()
        
        return create_success_response(
            "Collaboration room created successfully", 
            room.to_dict(), 
            201
        )
        
    except IntegrityError:
        db.session.rollback()
        return create_error_response("Room with this name already exists", 409)
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to create room: {str(e)}", 500)


@app.route('/api/v1/collaboration-rooms', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def list_collaboration_rooms():
    """
    List accessible collaboration rooms.
    ---
    tags:
      - Collaboration Rooms
    summary: List collaboration rooms
    description: Get list of collaboration rooms accessible to the current user
    parameters:
      - in: query
        name: room_type
        type: string
        description: Filter by room type
      - in: query
        name: status
        type: string
        description: Filter by room status
      - in: query
        name: limit
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      - in: query
        name: offset
        type: integer
        minimum: 0
        default: 0
    responses:
      200:
        description: Rooms retrieved successfully
      401:
        description: Authentication required
    """
    try:
        # Get query parameters
        room_type = request.args.get('room_type')
        status = request.args.get('status', 'active')
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = int(request.args.get('offset', 0))
        
        # Build query for rooms where user is creator or participant
        user_id = g.current_user.id
        
        # Get rooms where user is creator
        created_rooms = CollaborationRoom.query.filter_by(creator_id=user_id)
        
        # Get rooms where user is participant
        participant_room_ids = db.session.query(RoomParticipant.room_id).filter_by(user_id=user_id).subquery()
        participant_rooms = CollaborationRoom.query.filter(CollaborationRoom.id.in_(participant_room_ids))
        
        # Combine queries
        all_rooms = created_rooms.union(participant_rooms)
        
        # Apply filters
        if room_type:
            all_rooms = all_rooms.filter(CollaborationRoom.room_type == room_type)
        if status:
            all_rooms = all_rooms.filter(CollaborationRoom.status == status)
        
        # Order by last activity
        all_rooms = all_rooms.order_by(CollaborationRoom.last_activity.desc())
        
        # Apply pagination
        rooms = all_rooms.offset(offset).limit(limit).all()
        total_count = all_rooms.count()
        
        # Convert to dict with participant info
        rooms_data = []
        for room in rooms:
            room_dict = room.to_dict()
            room_dict['user_role'] = room.get_user_role(user_id)
            room_dict['participant_count'] = len(room.participants)
            rooms_data.append(room_dict)
        
        return create_success_response(
            "Rooms retrieved successfully",
            {
                'rooms': rooms_data,
                'total_count': total_count,
                'limit': limit,
                'offset': offset
            }
        )
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve rooms: {str(e)}", 500)


@app.route('/api/v1/collaboration-rooms/<room_id>', methods=['GET'])
@rate_limit("60 per minute")
@security_headers
@auth_required
def get_collaboration_room(room_id):
    """
    Get detailed collaboration room information.
    ---
    tags:
      - Collaboration Rooms
    summary: Get collaboration room details
    description: Get detailed information about a specific collaboration room
    parameters:
      - in: path
        name: room_id
        type: string
        required: true
        description: Room ID
    responses:
      200:
        description: Room details retrieved successfully
      401:
        description: Authentication required
      403:
        description: Access denied
      404:
        description: Room not found
    """
    try:
        room = CollaborationRoom.query.get(room_id)
        if not room:
            return create_error_response("Room not found", 404)
        
        # Check access
        if not room.can_access(g.current_user.id):
            return create_error_response("Access denied", 403)
        
        # Get detailed room information
        room_data = room.to_dict(include_participants=True, include_resources=True)
        room_data['user_role'] = room.get_user_role(g.current_user.id)
        
        # Add recent activity
        recent_activities = db.session.query(RoomChatMessage)\
            .filter_by(room_id=room_id, is_deleted=False)\
            .order_by(RoomChatMessage.created_at.desc())\
            .limit(10).all()
        
        room_data['recent_activity'] = [msg.to_dict() for msg in recent_activities]
        
        # Add upcoming meetings
        upcoming_meetings = RoomMeeting.query\
            .filter_by(room_id=room_id)\
            .filter(RoomMeeting.scheduled_at > datetime.utcnow())\
            .order_by(RoomMeeting.scheduled_at.asc())\
            .limit(5).all()
        
        room_data['upcoming_meetings'] = [meeting.to_dict() for meeting in upcoming_meetings]
        
        return create_success_response(
            "Room details retrieved successfully",
            room_data
        )
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve room: {str(e)}", 500)


@app.route('/api/v1/collaboration-rooms/<room_id>/participants', methods=['POST'])
@rate_limit("20 per hour")
@security_headers
@validate_request_size(max_content_length=10*1024)  # 10KB limit
@auth_required
def add_room_participant(room_id):
    """
    Add participant to collaboration room.
    ---
    tags:
      - Collaboration Rooms
    summary: Add room participant
    description: Add a new participant to a collaboration room
    parameters:
      - in: path
        name: room_id
        type: string
        required: true
        description: Room ID
      - in: body
        name: participant_data
        schema:
          type: object
          required:
            - email
          properties:
            email:
              type: string
              description: User email to invite
            role:
              type: string
              enum: [band_leader, member, guest, observer]
              default: member
            title:
              type: string
              description: Participant title/role
            department:
              type: string
              description: Department for enterprise users
    responses:
      201:
        description: Participant added successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
      403:
        description: Insufficient permissions
      404:
        description: Room or user not found
    """
    try:
        room = CollaborationRoom.query.get(room_id)
        if not room:
            return create_error_response("Room not found", 404)
        
        # Check permissions
        user_role = room.get_user_role(g.current_user.id)
        if user_role not in ['owner', 'band_leader']:
            return create_error_response("Insufficient permissions to add participants", 403)
        
        data = request.get_json()
        if not data or 'email' not in data:
            return create_error_response("Email is required", 400)
        
        # Find user by email
        email = sanitize_input(data['email'])
        user = User.query.filter_by(email=email).first()
        if not user:
            return create_error_response("User not found", 404)
        
        # Check if already a participant
        existing = RoomParticipant.query.filter_by(
            room_id=room_id, user_id=user.id
        ).first()
        if existing:
            return create_error_response("User is already a participant", 409)
        
        # Validate role
        role = data.get('role', 'member')
        valid_roles = ['band_leader', 'member', 'guest', 'observer']
        if role not in valid_roles:
            return create_error_response(f"Invalid role. Must be one of: {', '.join(valid_roles)}", 400)
        
        # Add participant
        participant = room.add_participant(
            user_id=user.id,
            role=role,
            invited_by=g.current_user.id
        )
        
        # Set additional properties
        if 'title' in data:
            participant.title = sanitize_input(data['title'], max_length=100)
        if 'department' in data:
            participant.department = sanitize_input(data['department'], max_length=100)
        
        db.session.commit()
        
        return create_success_response(
            "Participant added successfully",
            participant.to_dict(include_user=True),
            201
        )
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to add participant: {str(e)}", 500)


@app.route('/api/v1/collaboration-rooms/<room_id>/resources', methods=['POST'])
@rate_limit("30 per hour")
@security_headers
@validate_request_size(max_content_length=50*1024*1024)  # 50MB limit for resources
@auth_required
def create_room_resource(room_id):
    """
    Create a resource in the room library.
    ---
    tags:
      - Collaboration Rooms
    summary: Create room resource
    description: Add a new resource to the room's resource library
    parameters:
      - in: path
        name: room_id
        type: string
        required: true
        description: Room ID
      - in: body
        name: resource_data
        schema:
          type: object
          required:
            - name
            - resource_type
          properties:
            name:
              type: string
              description: Resource name
            description:
              type: string
              description: Resource description
            resource_type:
              type: string
              enum: [document, audio, video, chord_chart, setlist]
            content_url:
              type: string
              description: URL for external resources
            content_data:
              type: object
              description: Embedded content data
            category:
              type: string
              description: Resource category
            tags:
              type: array
              items:
                type: string
            access_level:
              type: string
              enum: [room, band_leader_only, member_plus]
              default: room
    responses:
      201:
        description: Resource created successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
      403:
        description: Insufficient permissions
      404:
        description: Room not found
    """
    try:
        room = CollaborationRoom.query.get(room_id)
        if not room:
            return create_error_response("Room not found", 404)
        
        # Check access and permissions
        if not room.can_access(g.current_user.id):
            return create_error_response("Access denied", 403)
        
        participant = RoomParticipant.query.filter_by(
            room_id=room_id, user_id=g.current_user.id
        ).first()
        
        if not participant or not participant.has_permission('create_content'):
            return create_error_response("Insufficient permissions to create resources", 403)
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        # Validate required fields
        required_fields = ['name', 'resource_type']
        for field in required_fields:
            if field not in data:
                return create_error_response(f"Missing required field: {field}", 400)
        
        # Validate resource type
        valid_types = ['document', 'audio', 'video', 'chord_chart', 'setlist']
        if data['resource_type'] not in valid_types:
            return create_error_response(f"Invalid resource type. Must be one of: {', '.join(valid_types)}", 400)
        
        # Create resource
        resource = RoomResource(
            room_id=room_id,
            name=sanitize_input(data['name'], max_length=255),
            resource_type=data['resource_type'],
            created_by=g.current_user.id,
            description=sanitize_input(data.get('description', ''), max_length=2000),
            content_url=sanitize_input(data.get('content_url', ''), max_length=500),
            content_data=data.get('content_data'),
            category=sanitize_input(data.get('category', ''), max_length=100),
            tags=data.get('tags', []),
            access_level=data.get('access_level', 'room')
        )
        
        db.session.add(resource)
        db.session.commit()
        
        return create_success_response(
            "Resource created successfully",
            resource.to_dict(),
            201
        )
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to create resource: {str(e)}", 500)


@app.route('/api/v1/collaboration-rooms/<room_id>/meetings', methods=['POST'])
@rate_limit("10 per hour")
@security_headers
@validate_request_size(max_content_length=10*1024)  # 10KB limit
@auth_required
def schedule_room_meeting(room_id):
    """
    Schedule a meeting for the collaboration room.
    ---
    tags:
      - Collaboration Rooms
    summary: Schedule room meeting
    description: Schedule a new meeting for the collaboration room
    parameters:
      - in: path
        name: room_id
        type: string
        required: true
        description: Room ID
      - in: body
        name: meeting_data
        schema:
          type: object
          required:
            - title
            - scheduled_at
          properties:
            title:
              type: string
              description: Meeting title
            description:
              type: string
              description: Meeting description
            scheduled_at:
              type: string
              format: date-time
              description: Meeting start time (ISO format)
            duration_minutes:
              type: integer
              minimum: 15
              maximum: 480
              default: 60
            timezone:
              type: string
              default: UTC
            agenda:
              type: array
              items:
                type: object
            location:
              type: string
              description: Meeting location
            meeting_url:
              type: string
              description: Video conference URL
            attendee_emails:
              type: array
              items:
                type: string
              description: List of attendee emails
    responses:
      201:
        description: Meeting scheduled successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
      403:
        description: Insufficient permissions
      404:
        description: Room not found
    """
    try:
        room = CollaborationRoom.query.get(room_id)
        if not room:
            return create_error_response("Room not found", 404)
        
        # Check permissions
        participant = RoomParticipant.query.filter_by(
            room_id=room_id, user_id=g.current_user.id
        ).first()
        
        if not participant or not participant.has_permission('schedule_meetings'):
            return create_error_response("Insufficient permissions to schedule meetings", 403)
        
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        # Validate required fields
        required_fields = ['title', 'scheduled_at']
        for field in required_fields:
            if field not in data:
                return create_error_response(f"Missing required field: {field}", 400)
        
        # Parse scheduled time
        try:
            scheduled_at = datetime.fromisoformat(data['scheduled_at'].replace('Z', '+00:00'))
        except ValueError:
            return create_error_response("Invalid date format. Use ISO 8601 format.", 400)
        
        # Create meeting
        meeting = RoomMeeting(
            room_id=room_id,
            title=sanitize_input(data['title'], max_length=255),
            scheduled_at=scheduled_at,
            created_by=g.current_user.id,
            description=sanitize_input(data.get('description', ''), max_length=2000),
            duration_minutes=min(data.get('duration_minutes', 60), 480),
            timezone=data.get('timezone', 'UTC'),
            agenda=data.get('agenda', []),
            location=sanitize_input(data.get('location', ''), max_length=255),
            meeting_url=sanitize_input(data.get('meeting_url', ''), max_length=500)
        )
        
        db.session.add(meeting)
        db.session.flush()  # Get meeting ID
        
        # Add attendees
        attendee_emails = data.get('attendee_emails', [])
        for email in attendee_emails:
            user = User.query.filter_by(email=email).first()
            if user:
                meeting.add_attendee(user.id)
        
        db.session.commit()
        
        return create_success_response(
            "Meeting scheduled successfully",
            meeting.to_dict(include_attendees=True),
            201
        )
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to schedule meeting: {str(e)}", 500)


@app.route('/api/v1/collaboration-rooms/<room_id>/chat', methods=['POST'])
@rate_limit("60 per minute")
@security_headers
@validate_request_size(max_content_length=10*1024)  # 10KB limit
@auth_required
def send_chat_message(room_id):
    """
    Send a chat message to the room.
    ---
    tags:
      - Collaboration Rooms
    summary: Send chat message
    description: Send a message to the room chat
    parameters:
      - in: path
        name: room_id
        type: string
        required: true
        description: Room ID
      - in: body
        name: message_data
        schema:
          type: object
          required:
            - content
          properties:
            content:
              type: string
              description: Message content
            message_type:
              type: string
              enum: [text, file, link, announcement]
              default: text
            parent_message_id:
              type: integer
              description: ID of parent message for replies
            mentions:
              type: array
              items:
                type: integer
              description: Array of user IDs to mention
    responses:
      201:
        description: Message sent successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
      403:
        description: Access denied
      404:
        description: Room not found
    """
    try:
        room = CollaborationRoom.query.get(room_id)
        if not room:
            return create_error_response("Room not found", 404)
        
        # Check access
        if not room.can_access(g.current_user.id):
            return create_error_response("Access denied", 403)
        
        data = request.get_json()
        if not data or 'content' not in data:
            return create_error_response("Message content is required", 400)
        
        # Create message
        message = RoomChatMessage(
            room_id=room_id,
            sender_id=g.current_user.id,
            content=sanitize_input(data['content'], max_length=2000),
            message_type=data.get('message_type', 'text')
        )
        
        if 'parent_message_id' in data:
            message.parent_message_id = data['parent_message_id']
        
        if 'mentions' in data:
            message.mentions = data['mentions']
        
        db.session.add(message)
        room.last_activity = datetime.utcnow()
        db.session.commit()
        
        return create_success_response(
            "Message sent successfully",
            message.to_dict(),
            201
        )
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to send message: {str(e)}", 500)