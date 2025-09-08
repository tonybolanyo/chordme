"""
Tests for professional collaboration workspace features.
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from chordme import db
from chordme.models import User, CollaborationRoom, RoomParticipant, RoomResource, RoomMeeting
from chordme.professional_templates_routes import PROFESSIONAL_TEMPLATES


class TestProfessionalCollaboration:
    """Test professional collaboration workspace features."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['WTF_CSRF_ENABLED'] = False
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
    
    @pytest.fixture
    def test_user(self, client):
        """Create test user."""
        with client.application.app_context():
            user = User(email='test@example.com', password='testpass123')
            db.session.add(user)
            db.session.commit()
            return user
    
    @pytest.fixture
    def auth_headers(self, test_user, client):
        """Get authentication headers."""
        with client.application.app_context():
            # Mock JWT token generation
            with patch('chordme.utils.generate_jwt_token') as mock_jwt:
                mock_jwt.return_value = 'test_token'
                response = client.post('/api/v1/auth/login', json={
                    'email': 'test@example.com',
                    'password': 'testpass123'
                })
                return {'Authorization': 'Bearer test_token'}
    
    def test_create_collaboration_room(self, client, auth_headers):
        """Test creating a professional collaboration room."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': 1}
            
            room_data = {
                'name': 'Test Album Project',
                'description': 'Professional album production workspace',
                'room_type': 'album',
                'access_mode': 'invite-only',
                'max_participants': 20,
                'has_resource_library': True,
                'has_meeting_scheduler': True,
                'has_calendar_integration': False,
                'has_progress_tracking': True,
                'has_chat_enabled': True
            }
            
            response = client.post(
                '/api/v1/collaboration-rooms',
                json=room_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['name'] == 'Test Album Project'
            assert data['data']['room_type'] == 'album'
            assert data['data']['has_resource_library'] is True
    
    def test_get_professional_templates(self, client, auth_headers):
        """Test retrieving professional templates."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': 1}
            
            response = client.get(
                '/api/v1/professional-templates',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert len(data['data']) == 3  # album, tour, lesson_plan
            
            # Check album template
            album_template = next((t for t in data['data'] if t['id'] == 'album'), None)
            assert album_template is not None
            assert album_template['name'] == 'Album Production'
            assert album_template['room_type'] == 'album'
            assert len(album_template['workflow_stages']) == 4  # Pre-Production, Recording, Mixing, Mastering
    
    def test_get_specific_template(self, client, auth_headers):
        """Test retrieving a specific professional template."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': 1}
            
            response = client.get(
                '/api/v1/professional-templates/tour',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            
            template = data['data']
            assert template['id'] == 'tour'
            assert template['name'] == 'Tour Management'
            assert template['room_type'] == 'tour'
            assert 'tour_manager' in template['default_roles']
            assert len(template['meeting_templates']) == 2
    
    def test_create_room_from_template(self, client, auth_headers):
        """Test creating a room from a professional template."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': 1}
            
            room_data = {
                'name': 'Summer Tour 2024',
                'description': 'Complete summer tour management',
                'access_mode': 'invite-only'
            }
            
            response = client.post(
                '/api/v1/professional-templates/tour/create-room',
                json=room_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            
            room = data['data']
            assert room['name'] == 'Summer Tour 2024'
            assert room['room_type'] == 'tour'
            assert room['max_participants'] == 30  # From tour template
            assert room['has_meeting_scheduler'] is True
            assert 'template_id' in room['settings']
            assert room['settings']['template_id'] == 'tour'
    
    def test_add_room_participant(self, client, auth_headers, test_user):
        """Test adding a participant to a collaboration room."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': test_user.id}
            
            # Create room first
            room_id = str(uuid.uuid4())
            room = CollaborationRoom(
                room_id=room_id,
                name='Test Room',
                room_type='album',
                creator_id=test_user.id
            )
            
            with client.application.app_context():
                db.session.add(room)
                db.session.commit()
            
            # Create another user to add as participant
            with client.application.app_context():
                other_user = User(email='participant@example.com', password='pass123')
                db.session.add(other_user)
                db.session.commit()
            
            participant_data = {
                'email': 'participant@example.com',
                'role': 'member',
                'title': 'Lead Guitarist',
                'department': 'Music'
            }
            
            response = client.post(
                f'/api/v1/collaboration-rooms/{room_id}/participants',
                json=participant_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['role'] == 'member'
            assert data['data']['title'] == 'Lead Guitarist'
    
    def test_create_room_resource(self, client, auth_headers, test_user):
        """Test creating a resource in a collaboration room."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': test_user.id}
            
            # Create room first
            room_id = str(uuid.uuid4())
            room = CollaborationRoom(
                room_id=room_id,
                name='Test Room',
                room_type='album',
                creator_id=test_user.id
            )
            
            with client.application.app_context():
                db.session.add(room)
                
                # Add user as participant with appropriate permissions
                participant = RoomParticipant(
                    room_id=room_id,
                    user_id=test_user.id,
                    role='band_leader'
                )
                db.session.add(participant)
                db.session.commit()
            
            resource_data = {
                'name': 'Song Demo Recording',
                'description': 'Initial demo recording for review',
                'resource_type': 'audio',
                'category': 'Demos',
                'tags': ['demo', 'rough_mix'],
                'access_level': 'room',
                'content_url': 'https://example.com/demo.mp3'
            }
            
            response = client.post(
                f'/api/v1/collaboration-rooms/{room_id}/resources',
                json=resource_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['name'] == 'Song Demo Recording'
            assert data['data']['resource_type'] == 'audio'
            assert data['data']['category'] == 'Demos'
    
    def test_schedule_room_meeting(self, client, auth_headers, test_user):
        """Test scheduling a meeting for a collaboration room."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': test_user.id}
            
            # Create room first
            room_id = str(uuid.uuid4())
            room = CollaborationRoom(
                room_id=room_id,
                name='Test Room',
                room_type='album',
                creator_id=test_user.id,
                has_meeting_scheduler=True
            )
            
            with client.application.app_context():
                db.session.add(room)
                
                # Add user as participant with meeting permissions
                participant = RoomParticipant(
                    room_id=room_id,
                    user_id=test_user.id,
                    role='band_leader'
                )
                db.session.add(participant)
                db.session.commit()
            
            scheduled_time = (datetime.utcnow() + timedelta(days=1)).isoformat()
            meeting_data = {
                'title': 'Pre-Production Meeting',
                'description': 'Discuss song selection and recording plan',
                'scheduled_at': scheduled_time,
                'duration_minutes': 120,
                'timezone': 'UTC',
                'agenda': [
                    {
                        'title': 'Song Selection',
                        'description': 'Review and finalize song list',
                        'duration_minutes': 60,
                        'type': 'discussion',
                        'order': 1
                    }
                ],
                'attendee_emails': ['participant@example.com']
            }
            
            response = client.post(
                f'/api/v1/collaboration-rooms/{room_id}/meetings',
                json=meeting_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['title'] == 'Pre-Production Meeting'
            assert data['data']['duration_minutes'] == 120
            assert len(data['data']['agenda']) == 1
    
    def test_send_chat_message(self, client, auth_headers, test_user):
        """Test sending a chat message to a room."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': test_user.id}
            
            # Create room first
            room_id = str(uuid.uuid4())
            room = CollaborationRoom(
                room_id=room_id,
                name='Test Room',
                room_type='album',
                creator_id=test_user.id,
                has_chat_enabled=True
            )
            
            with client.application.app_context():
                db.session.add(room)
                
                # Add user as participant
                participant = RoomParticipant(
                    room_id=room_id,
                    user_id=test_user.id,
                    role='band_leader'
                )
                db.session.add(participant)
                db.session.commit()
            
            message_data = {
                'content': 'Looking forward to our recording session next week!',
                'message_type': 'text'
            }
            
            response = client.post(
                f'/api/v1/collaboration-rooms/{room_id}/chat',
                json=message_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['content'] == 'Looking forward to our recording session next week!'
            assert data['data']['message_type'] == 'text'
    
    def test_room_permissions(self, client, auth_headers, test_user):
        """Test role-based permissions in collaboration rooms."""
        # Test different permission levels for different roles
        
        with client.application.app_context():
            # Create room
            room_id = str(uuid.uuid4())
            room = CollaborationRoom(
                room_id=room_id,
                name='Permission Test Room',
                room_type='album',
                creator_id=test_user.id
            )
            db.session.add(room)
            
            # Create participants with different roles
            band_leader = RoomParticipant(
                room_id=room_id,
                user_id=test_user.id,
                role='band_leader'
            )
            db.session.add(band_leader)
            db.session.commit()
            
            # Test band_leader permissions
            assert band_leader.has_permission('manage_participants')
            assert band_leader.has_permission('manage_resources')
            assert band_leader.has_permission('schedule_meetings')
            assert band_leader.has_permission('manage_calendar')
            
            # Create member participant
            other_user = User(email='member@example.com', password='pass123')
            db.session.add(other_user)
            db.session.flush()
            
            member = RoomParticipant(
                room_id=room_id,
                user_id=other_user.id,
                role='member'
            )
            db.session.add(member)
            db.session.commit()
            
            # Test member permissions
            assert member.has_permission('read')
            assert member.has_permission('edit')
            assert member.has_permission('view_resources')
            assert not member.has_permission('manage_participants')
            assert not member.has_permission('manage_room')
    
    def test_template_workflow_stages(self):
        """Test that professional templates have proper workflow stages."""
        # Test album template workflow
        album_template = PROFESSIONAL_TEMPLATES['album']
        workflow_stages = album_template['workflow_stages']
        
        assert len(workflow_stages) == 4
        stage_names = [stage['name'] for stage in workflow_stages]
        assert 'Pre-Production' in stage_names
        assert 'Recording' in stage_names
        assert 'Mixing' in stage_names
        assert 'Mastering' in stage_names
        
        # Test tour template workflow
        tour_template = PROFESSIONAL_TEMPLATES['tour']
        workflow_stages = tour_template['workflow_stages']
        
        assert len(workflow_stages) == 4
        stage_names = [stage['name'] for stage in workflow_stages]
        assert 'Tour Planning' in stage_names
        assert 'Pre-Production' in stage_names
        assert 'Tour Execution' in stage_names
        assert 'Post-Tour' in stage_names
    
    def test_template_role_permissions(self):
        """Test that templates define appropriate role permissions."""
        for template_id, template_data in PROFESSIONAL_TEMPLATES.items():
            role_permissions = template_data['role_permissions']
            
            # All templates should have basic roles
            if template_data['category'] in ['album', 'tour']:
                assert 'band_leader' in role_permissions
                assert 'member' in role_permissions
            elif template_data['category'] == 'lesson_plan':
                assert 'instructor' in role_permissions
                assert 'student' in role_permissions
            
            # All roles should have read permission
            for role, permissions in role_permissions.items():
                assert 'read' in permissions
            
            # Band leaders/instructors should have management permissions
            leadership_roles = ['band_leader', 'instructor', 'tour_manager']
            for role in leadership_roles:
                if role in role_permissions:
                    permissions = role_permissions[role]
                    assert any(perm.startswith('manage_') for perm in permissions)
    
    def test_invalid_room_creation(self, client, auth_headers):
        """Test error handling for invalid room creation."""
        with patch('chordme.utils.verify_jwt_token') as mock_verify:
            mock_verify.return_value = {'user_id': 1}
            
            # Missing required fields
            response = client.post(
                '/api/v1/collaboration-rooms',
                json={},
                headers=auth_headers
            )
            assert response.status_code == 400
            
            # Invalid room type
            response = client.post(
                '/api/v1/collaboration-rooms',
                json={
                    'name': 'Test Room',
                    'room_type': 'invalid_type'
                },
                headers=auth_headers
            )
            assert response.status_code == 400
    
    def test_calendar_integration_data_structure(self):
        """Test that meeting data is properly structured for calendar integration."""
        # Test that meeting templates have proper structure for calendar integration
        for template_id, template_data in PROFESSIONAL_TEMPLATES.items():
            meeting_templates = template_data['meeting_templates']
            
            for meeting_template in meeting_templates:
                assert 'name' in meeting_template
                assert 'duration_minutes' in meeting_template
                assert 'agenda_items' in meeting_template
                assert isinstance(meeting_template['agenda_items'], list)
                
                for agenda_item in meeting_template['agenda_items']:
                    assert 'title' in agenda_item
                    assert 'duration_minutes' in agenda_item
                    assert 'type' in agenda_item
                    assert 'order' in agenda_item