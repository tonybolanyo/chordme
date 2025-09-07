"""
Professional collaboration templates for different use cases.
Provides pre-configured room setups for Album, Tour, and Lesson Plan scenarios.
"""

from . import app, db
from .models import SessionTemplate, CollaborationRoom, RoomParticipant
from .utils import auth_required, create_error_response, create_success_response
from .rate_limiter import rate_limit
from .security_headers import security_headers
from flask import request, jsonify, g
from datetime import datetime
import uuid


# Professional template configurations
PROFESSIONAL_TEMPLATES = {
    'album': {
        'name': 'Album Production',
        'description': 'Complete album production workspace with recording, mixing, and mastering workflow',
        'category': 'album',
        'default_roles': ['band_leader', 'member', 'producer', 'engineer'],
        'max_participants': 20,
        'features': {
            'resource_library': True,
            'meeting_scheduler': True,
            'calendar_integration': True,
            'progress_tracking': True,
            'chat_enabled': True
        },
        'workflow_stages': [
            {
                'name': 'Pre-Production',
                'description': 'Song selection, arrangements, and demo recordings',
                'order': 1,
                'required_roles': ['band_leader', 'member'],
                'estimated_duration_days': 14,
                'deliverables': ['Song List', 'Demo Recordings', 'Arrangement Notes'],
                'milestones': ['Songs Selected', 'Demos Complete']
            },
            {
                'name': 'Recording',
                'description': 'Tracking instruments and vocals',
                'order': 2,
                'required_roles': ['band_leader', 'member', 'engineer'],
                'estimated_duration_days': 21,
                'deliverables': ['Raw Recordings', 'Session Notes'],
                'milestones': ['Tracking Started', 'Basic Tracks Complete', 'Overdubs Complete']
            },
            {
                'name': 'Mixing',
                'description': 'Mixing and sound design',
                'order': 3,
                'required_roles': ['band_leader', 'engineer'],
                'estimated_duration_days': 14,
                'deliverables': ['Mix Revisions', 'Final Mixes'],
                'milestones': ['First Mix', 'Mix Approved']
            },
            {
                'name': 'Mastering',
                'description': 'Final mastering and delivery',
                'order': 4,
                'required_roles': ['band_leader', 'engineer'],
                'estimated_duration_days': 7,
                'deliverables': ['Master Files', 'Metadata'],
                'milestones': ['Master Complete', 'Delivery Ready']
            }
        ],
        'default_resources': [
            {
                'name': 'Song List Template',
                'resource_type': 'document',
                'description': 'Template for organizing song selections and metadata',
                'category': 'Templates',
                'is_required': True,
                'access_level': 'room'
            },
            {
                'name': 'Recording Session Notes',
                'resource_type': 'document',
                'description': 'Template for tracking recording sessions',
                'category': 'Recording',
                'is_required': True,
                'access_level': 'band_leader_only'
            },
            {
                'name': 'Mix Reference Tracks',
                'resource_type': 'audio',
                'description': 'Reference tracks for mixing style',
                'category': 'Reference',
                'is_required': False,
                'access_level': 'member_plus'
            }
        ],
        'meeting_templates': [
            {
                'name': 'Pre-Production Planning',
                'description': 'Initial planning and song selection meeting',
                'duration_minutes': 120,
                'agenda_items': [
                    {
                        'title': 'Song Selection Review',
                        'description': 'Review and finalize song list',
                        'duration_minutes': 45,
                        'type': 'discussion',
                        'order': 1
                    },
                    {
                        'title': 'Recording Schedule',
                        'description': 'Plan recording timeline and logistics',
                        'duration_minutes': 45,
                        'type': 'planning',
                        'order': 2
                    },
                    {
                        'title': 'Budget Review',
                        'description': 'Review project budget and resources',
                        'duration_minutes': 30,
                        'type': 'decision',
                        'order': 3
                    }
                ],
                'required_attendees': ['band_leader', 'member'],
                'recurrence_pattern': None
            },
            {
                'name': 'Weekly Progress Check',
                'description': 'Weekly status update and planning meeting',
                'duration_minutes': 60,
                'agenda_items': [
                    {
                        'title': 'Progress Review',
                        'description': 'Review completed work and current status',
                        'duration_minutes': 30,
                        'type': 'discussion',
                        'order': 1
                    },
                    {
                        'title': 'Next Week Planning',
                        'description': 'Plan upcoming tasks and schedule',
                        'duration_minutes': 30,
                        'type': 'planning',
                        'order': 2
                    }
                ],
                'required_attendees': ['band_leader'],
                'recurrence_pattern': 'weekly'
            }
        ],
        'role_permissions': {
            'band_leader': [
                'read', 'edit', 'comment', 'manage_participants', 'manage_resources',
                'schedule_meetings', 'manage_calendar', 'manage_room', 'approve_deliverables'
            ],
            'member': [
                'read', 'edit', 'comment', 'view_resources', 'join_meetings',
                'use_calendar', 'create_content', 'submit_deliverables'
            ],
            'producer': [
                'read', 'edit', 'comment', 'manage_resources', 'schedule_meetings',
                'approve_deliverables', 'manage_workflow'
            ],
            'engineer': [
                'read', 'edit', 'comment', 'view_resources', 'join_meetings',
                'create_content', 'submit_deliverables'
            ],
            'guest': [
                'read', 'comment', 'view_resources', 'join_meetings'
            ],
            'observer': [
                'read', 'view_resources'
            ]
        }
    },
    
    'tour': {
        'name': 'Tour Management',
        'description': 'Complete tour planning and management workspace',
        'category': 'tour',
        'default_roles': ['band_leader', 'member', 'tour_manager', 'crew'],
        'max_participants': 30,
        'features': {
            'resource_library': True,
            'meeting_scheduler': True,
            'calendar_integration': True,
            'progress_tracking': True,
            'chat_enabled': True
        },
        'workflow_stages': [
            {
                'name': 'Tour Planning',
                'description': 'Route planning, venue booking, and logistics',
                'order': 1,
                'required_roles': ['band_leader', 'tour_manager'],
                'estimated_duration_days': 60,
                'deliverables': ['Tour Route', 'Venue Contracts', 'Budget'],
                'milestones': ['Markets Confirmed', 'Venues Booked', 'Contracts Signed']
            },
            {
                'name': 'Pre-Production',
                'description': 'Rehearsals, setlist planning, and crew preparation',
                'order': 2,
                'required_roles': ['band_leader', 'member', 'crew'],
                'estimated_duration_days': 21,
                'deliverables': ['Final Setlists', 'Stage Plot', 'Crew Assignments'],
                'milestones': ['Rehearsals Complete', 'Equipment Ready', 'Crew Briefed']
            },
            {
                'name': 'Tour Execution',
                'description': 'Live performances and daily operations',
                'order': 3,
                'required_roles': ['band_leader', 'member', 'tour_manager', 'crew'],
                'estimated_duration_days': 45,
                'deliverables': ['Show Reports', 'Merchandise Reports', 'Settlement Sheets'],
                'milestones': ['Tour Started', 'Mid-Tour Review', 'Tour Complete']
            },
            {
                'name': 'Post-Tour',
                'description': 'Wrap-up, reconciliation, and planning next steps',
                'order': 4,
                'required_roles': ['band_leader', 'tour_manager'],
                'estimated_duration_days': 14,
                'deliverables': ['Final Reports', 'Financial Reconciliation', 'Next Tour Planning'],
                'milestones': ['Equipment Returned', 'Finances Settled', 'Review Complete']
            }
        ],
        'default_resources': [
            {
                'name': 'Tour Bible',
                'resource_type': 'document',
                'description': 'Complete tour information and contact details',
                'category': 'Planning',
                'is_required': True,
                'access_level': 'band_leader_only'
            },
            {
                'name': 'Setlist Templates',
                'resource_type': 'setlist',
                'description': 'Different setlist options for various venues',
                'category': 'Performance',
                'is_required': True,
                'access_level': 'member_plus'
            },
            {
                'name': 'Stage Plots',
                'resource_type': 'document',
                'description': 'Technical diagrams for stage setup',
                'category': 'Technical',
                'is_required': True,
                'access_level': 'member_plus'
            }
        ],
        'meeting_templates': [
            {
                'name': 'Tour Planning Meeting',
                'description': 'Initial tour planning and strategy session',
                'duration_minutes': 180,
                'agenda_items': [
                    {
                        'title': 'Tour Goals & Budget',
                        'description': 'Define tour objectives and financial parameters',
                        'duration_minutes': 60,
                        'type': 'discussion',
                        'order': 1
                    },
                    {
                        'title': 'Route Planning',
                        'description': 'Map out tour route and key markets',
                        'duration_minutes': 90,
                        'type': 'planning',
                        'order': 2
                    },
                    {
                        'title': 'Timeline & Next Steps',
                        'description': 'Establish timeline and assign responsibilities',
                        'duration_minutes': 30,
                        'type': 'decision',
                        'order': 3
                    }
                ],
                'required_attendees': ['band_leader', 'tour_manager'],
                'recurrence_pattern': None
            },
            {
                'name': 'Daily Tour Check-in',
                'description': 'Daily status update during tour',
                'duration_minutes': 30,
                'agenda_items': [
                    {
                        'title': 'Yesterday Review',
                        'description': 'Review previous show and any issues',
                        'duration_minutes': 10,
                        'type': 'discussion',
                        'order': 1
                    },
                    {
                        'title': 'Today\'s Show',
                        'description': 'Prepare for today\'s performance',
                        'duration_minutes': 15,
                        'type': 'planning',
                        'order': 2
                    },
                    {
                        'title': 'Issues & Adjustments',
                        'description': 'Address any concerns or needed changes',
                        'duration_minutes': 5,
                        'type': 'action',
                        'order': 3
                    }
                ],
                'required_attendees': ['tour_manager'],
                'recurrence_pattern': 'daily'
            }
        ],
        'role_permissions': {
            'band_leader': [
                'read', 'edit', 'comment', 'manage_participants', 'manage_resources',
                'schedule_meetings', 'manage_calendar', 'manage_room', 'approve_changes'
            ],
            'member': [
                'read', 'edit', 'comment', 'view_resources', 'join_meetings',
                'use_calendar', 'create_content'
            ],
            'tour_manager': [
                'read', 'edit', 'comment', 'manage_resources', 'schedule_meetings',
                'manage_calendar', 'manage_logistics', 'create_reports'
            ],
            'crew': [
                'read', 'comment', 'view_resources', 'join_meetings',
                'update_status', 'access_technical_docs'
            ],
            'guest': [
                'read', 'comment', 'view_resources', 'join_meetings'
            ],
            'observer': [
                'read', 'view_resources'
            ]
        }
    },
    
    'lesson_plan': {
        'name': 'Educational Program',
        'description': 'Structured learning environment for music education',
        'category': 'lesson_plan',
        'default_roles': ['instructor', 'student', 'assistant', 'observer'],
        'max_participants': 25,
        'features': {
            'resource_library': True,
            'meeting_scheduler': True,
            'calendar_integration': True,
            'progress_tracking': True,
            'chat_enabled': True
        },
        'workflow_stages': [
            {
                'name': 'Course Setup',
                'description': 'Curriculum planning and resource preparation',
                'order': 1,
                'required_roles': ['instructor'],
                'estimated_duration_days': 7,
                'deliverables': ['Curriculum Outline', 'Learning Materials', 'Assessment Plan'],
                'milestones': ['Curriculum Approved', 'Materials Ready']
            },
            {
                'name': 'Introduction',
                'description': 'Course introduction and initial assessments',
                'order': 2,
                'required_roles': ['instructor', 'student'],
                'estimated_duration_days': 3,
                'deliverables': ['Student Assessments', 'Individual Learning Plans'],
                'milestones': ['Students Enrolled', 'Baselines Established']
            },
            {
                'name': 'Core Learning',
                'description': 'Main curriculum delivery and practice',
                'order': 3,
                'required_roles': ['instructor', 'student', 'assistant'],
                'estimated_duration_days': 84,
                'deliverables': ['Lesson Progress', 'Practice Recordings', 'Assignment Submissions'],
                'milestones': ['Mid-Term Assessment', 'Performance Milestone', 'Final Assessment']
            },
            {
                'name': 'Evaluation',
                'description': 'Final assessments and course completion',
                'order': 4,
                'required_roles': ['instructor', 'student'],
                'estimated_duration_days': 7,
                'deliverables': ['Final Evaluations', 'Certificates', 'Progress Reports'],
                'milestones': ['Final Exam', 'Graduation', 'Course Complete']
            }
        ],
        'default_resources': [
            {
                'name': 'Curriculum Guide',
                'resource_type': 'document',
                'description': 'Complete curriculum and learning objectives',
                'category': 'Curriculum',
                'is_required': True,
                'access_level': 'room'
            },
            {
                'name': 'Practice Exercises',
                'resource_type': 'chord_chart',
                'description': 'Progressive exercises and practice materials',
                'category': 'Exercises',
                'is_required': True,
                'access_level': 'room'
            },
            {
                'name': 'Reference Recordings',
                'resource_type': 'audio',
                'description': 'Example performances and technique demonstrations',
                'category': 'Reference',
                'is_required': False,
                'access_level': 'room'
            }
        ],
        'meeting_templates': [
            {
                'name': 'Class Session',
                'description': 'Regular class meeting',
                'duration_minutes': 90,
                'agenda_items': [
                    {
                        'title': 'Review & Warm-up',
                        'description': 'Review previous lesson and warm-up exercises',
                        'duration_minutes': 15,
                        'type': 'review',
                        'order': 1
                    },
                    {
                        'title': 'New Material',
                        'description': 'Introduce and practice new concepts',
                        'duration_minutes': 45,
                        'type': 'instruction',
                        'order': 2
                    },
                    {
                        'title': 'Individual Practice',
                        'description': 'Individual or small group practice time',
                        'duration_minutes': 20,
                        'type': 'practice',
                        'order': 3
                    },
                    {
                        'title': 'Q&A & Next Steps',
                        'description': 'Questions and assignment for next session',
                        'duration_minutes': 10,
                        'type': 'discussion',
                        'order': 4
                    }
                ],
                'required_attendees': ['instructor', 'student'],
                'recurrence_pattern': 'weekly'
            },
            {
                'name': 'Progress Review',
                'description': 'Individual student progress review',
                'duration_minutes': 30,
                'agenda_items': [
                    {
                        'title': 'Performance Assessment',
                        'description': 'Student demonstrates current skills',
                        'duration_minutes': 15,
                        'type': 'assessment',
                        'order': 1
                    },
                    {
                        'title': 'Feedback & Goals',
                        'description': 'Provide feedback and set new goals',
                        'duration_minutes': 15,
                        'type': 'planning',
                        'order': 2
                    }
                ],
                'required_attendees': ['instructor'],
                'recurrence_pattern': 'monthly'
            }
        ],
        'role_permissions': {
            'instructor': [
                'read', 'edit', 'comment', 'manage_participants', 'manage_resources',
                'schedule_meetings', 'manage_calendar', 'manage_room', 'create_assignments',
                'grade_assignments', 'manage_curriculum'
            ],
            'student': [
                'read', 'comment', 'view_resources', 'join_meetings',
                'submit_assignments', 'view_grades', 'access_materials'
            ],
            'assistant': [
                'read', 'edit', 'comment', 'view_resources', 'join_meetings',
                'help_students', 'moderate_discussions'
            ],
            'observer': [
                'read', 'view_resources', 'join_meetings'
            ]
        }
    }
}


@app.route('/api/v1/professional-templates', methods=['GET'])
@rate_limit("30 per minute")
@security_headers
@auth_required
def get_professional_templates():
    """
    Get available professional collaboration templates.
    ---
    tags:
      - Professional Templates
    summary: Get professional templates
    description: Retrieve available professional collaboration templates
    parameters:
      - in: query
        name: room_type
        type: string
        enum: [album, tour, lesson_plan]
        description: Filter by room type
    responses:
      200:
        description: Templates retrieved successfully
      401:
        description: Authentication required
    """
    try:
        room_type = request.args.get('room_type')
        
        templates = []
        for template_id, template_data in PROFESSIONAL_TEMPLATES.items():
            if room_type and template_data['category'] != room_type:
                continue
            
            template = {
                'id': template_id,
                'name': template_data['name'],
                'description': template_data['description'],
                'room_type': template_data['category'],
                'category': template_data['category'],
                'default_roles': template_data['default_roles'],
                'max_participants': template_data['max_participants'],
                'features': template_data['features'],
                'workflow_stages': template_data['workflow_stages'],
                'default_resources': template_data['default_resources'],
                'meeting_templates': template_data['meeting_templates'],
                'role_permissions': template_data['role_permissions'],
                'is_system': True,
                'is_public': True,
                'usage_count': 0,  # Would be tracked in database
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            templates.append(template)
        
        return create_success_response(
            "Professional templates retrieved successfully",
            templates
        )
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve templates: {str(e)}", 500)


@app.route('/api/v1/professional-templates/<template_id>', methods=['GET'])
@rate_limit("60 per minute")
@security_headers
@auth_required
def get_professional_template(template_id):
    """
    Get detailed professional template information.
    ---
    tags:
      - Professional Templates
    summary: Get template details
    description: Get detailed information about a specific professional template
    parameters:
      - in: path
        name: template_id
        type: string
        required: true
        description: Template ID
    responses:
      200:
        description: Template details retrieved successfully
      404:
        description: Template not found
      401:
        description: Authentication required
    """
    try:
        if template_id not in PROFESSIONAL_TEMPLATES:
            return create_error_response("Template not found", 404)
        
        template_data = PROFESSIONAL_TEMPLATES[template_id]
        template = {
            'id': template_id,
            'name': template_data['name'],
            'description': template_data['description'],
            'room_type': template_data['category'],
            'category': template_data['category'],
            'default_roles': template_data['default_roles'],
            'max_participants': template_data['max_participants'],
            'features': template_data['features'],
            'workflow_stages': template_data['workflow_stages'],
            'default_resources': template_data['default_resources'],
            'meeting_templates': template_data['meeting_templates'],
            'role_permissions': template_data['role_permissions'],
            'is_system': True,
            'is_public': True,
            'usage_count': 0,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return create_success_response(
            "Template details retrieved successfully",
            template
        )
        
    except Exception as e:
        return create_error_response(f"Failed to retrieve template: {str(e)}", 500)


@app.route('/api/v1/professional-templates/<template_id>/create-room', methods=['POST'])
@rate_limit("5 per hour")
@security_headers
@auth_required
def create_room_from_template(template_id):
    """
    Create a collaboration room from a professional template.
    ---
    tags:
      - Professional Templates
    summary: Create room from template
    description: Create a new collaboration room using a professional template
    parameters:
      - in: path
        name: template_id
        type: string
        required: true
        description: Template ID
      - in: body
        name: room_data
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              description: Room name
            description:
              type: string
              description: Room description
            access_mode:
              type: string
              enum: [invite-only, link-access, public]
              default: invite-only
    responses:
      201:
        description: Room created successfully
      400:
        description: Invalid input data
      404:
        description: Template not found
      401:
        description: Authentication required
    """
    try:
        if template_id not in PROFESSIONAL_TEMPLATES:
            return create_error_response("Template not found", 404)
        
        data = request.get_json()
        if not data or 'name' not in data:
            return create_error_response("Room name is required", 400)
        
        template_data = PROFESSIONAL_TEMPLATES[template_id]
        
        # Create room with template settings
        room_id = str(uuid.uuid4())
        room = CollaborationRoom(
            room_id=room_id,
            name=data['name'],
            room_type=template_data['category'],
            creator_id=g.current_user.id,
            description=data.get('description', template_data['description']),
            access_mode=data.get('access_mode', 'invite-only'),
            max_participants=template_data['max_participants'],
            has_resource_library=template_data['features']['resource_library'],
            has_meeting_scheduler=template_data['features']['meeting_scheduler'],
            has_calendar_integration=template_data['features']['calendar_integration'],
            has_progress_tracking=template_data['features']['progress_tracking'],
            has_chat_enabled=template_data['features']['chat_enabled'],
            settings={
                'template_id': template_id,
                'workflow_stages': template_data['workflow_stages'],
                'role_permissions': template_data['role_permissions']
            },
            metadata={
                'created_from_template': True,
                'template_name': template_data['name'],
                'default_resources': template_data['default_resources'],
                'meeting_templates': template_data['meeting_templates']
            }
        )
        
        db.session.add(room)
        
        # Add creator as appropriate role (band_leader for album/tour, instructor for lesson_plan)
        creator_role = 'band_leader' if template_data['category'] in ['album', 'tour'] else 'instructor'
        participant = room.add_participant(
            user_id=g.current_user.id,
            role=creator_role
        )
        
        db.session.commit()
        
        return create_success_response(
            "Room created from template successfully",
            room.to_dict(),
            201
        )
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(f"Failed to create room from template: {str(e)}", 500)