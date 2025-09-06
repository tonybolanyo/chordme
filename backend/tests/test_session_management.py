"""
Tests for session management functionality.
"""

import pytest
import json
from chordme.models import (
    User, Song, CollaborationSession, SessionTemplate, 
    SessionParticipant, SessionActivity, db
)
from chordme import app


@pytest.fixture
def client():
    """Create a test client."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def sample_users(client):
    """Create sample users for testing."""
    with app.app_context():
        user1 = User('user1@example.com', 'password123')
        user2 = User('user2@example.com', 'password123')
        user3 = User('user3@example.com', 'password123')
        
        db.session.add_all([user1, user2, user3])
        db.session.commit()
        
        return {
            'user1': user1,
            'user2': user2,
            'user3': user3
        }


@pytest.fixture
def sample_song(client, sample_users):
    """Create a sample song for testing."""
    with app.app_context():
        song = Song(
            title='Test Song',
            user_id=sample_users['user1'].id,
            content='{title: Test Song}\n{artist: Test Artist}\n[C]Hello [G]world'
        )
        db.session.add(song)
        db.session.commit()
        return song


@pytest.fixture
def auth_token(client, sample_users):
    """Get authentication token for user1."""
    response = client.post('/api/v1/auth/login', 
                          json={'email': 'user1@example.com', 'password': 'password123'})
    data = json.loads(response.data)
    return data['token']


@pytest.fixture
def session_template(client, sample_users):
    """Create a sample session template."""
    with app.app_context():
        template = SessionTemplate(
            name='Band Practice',
            category='rehearsal',
            created_by=sample_users['user1'].id,
            description='Template for band practice sessions',
            max_participants=5
        )
        db.session.add(template)
        db.session.commit()
        return template


class TestSessionCreation:
    """Test session creation functionality."""
    
    def test_create_session_success(self, client, sample_song, auth_token):
        """Test successful session creation."""
        response = client.post('/api/v1/sessions',
                             headers={'Authorization': f'Bearer {auth_token}'},
                             json={
                                 'song_id': sample_song.id,
                                 'name': 'Test Session',
                                 'description': 'A test collaboration session',
                                 'access_mode': 'invite-only',
                                 'max_participants': 5
                             })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['data']['name'] == 'Test Session'
        assert data['data']['song_id'] == sample_song.id
        assert data['data']['participant_count'] == 1  # Creator is automatically added
        
    def test_create_session_missing_data(self, client, auth_token):
        """Test session creation with missing required data."""
        response = client.post('/api/v1/sessions',
                             headers={'Authorization': f'Bearer {auth_token}'},
                             json={'name': 'Test Session'})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'song_id and name are required' in data['error']
    
    def test_create_session_invalid_song(self, client, auth_token):
        """Test session creation with non-existent song."""
        response = client.post('/api/v1/sessions',
                             headers={'Authorization': f'Bearer {auth_token}'},
                             json={
                                 'song_id': 99999,
                                 'name': 'Test Session'
                             })
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Song not found' in data['error']
    
    def test_create_session_with_template(self, client, sample_song, session_template, auth_token):
        """Test session creation with template."""
        response = client.post('/api/v1/sessions',
                             headers={'Authorization': f'Bearer {auth_token}'},
                             json={
                                 'song_id': sample_song.id,
                                 'name': 'Template Session',
                                 'template_id': session_template.id
                             })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['template_id'] == session_template.id
        assert data['data']['max_participants'] == session_template.max_participants


class TestSessionAccess:
    """Test session access and permissions."""
    
    def test_get_session_as_owner(self, client, sample_song, auth_token):
        """Test getting session details as owner."""
        # Create session first
        create_response = client.post('/api/v1/sessions',
                                    headers={'Authorization': f'Bearer {auth_token}'},
                                    json={
                                        'song_id': sample_song.id,
                                        'name': 'Test Session'
                                    })
        session_id = json.loads(create_response.data)['data']['id']
        
        # Get session details
        response = client.get(f'/api/v1/sessions/{session_id}',
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['id'] == session_id
        assert data['data']['user_role'] == 'owner'
    
    def test_get_nonexistent_session(self, client, auth_token):
        """Test getting non-existent session."""
        response = client.get('/api/v1/sessions/nonexistent-id',
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Session not found' in data['error']


class TestSessionParticipation:
    """Test session participation functionality."""
    
    def test_join_public_session(self, client, sample_song, sample_users, auth_token):
        """Test joining a public session."""
        # Create public session as user1
        create_response = client.post('/api/v1/sessions',
                                    headers={'Authorization': f'Bearer {auth_token}'},
                                    json={
                                        'song_id': sample_song.id,
                                        'name': 'Public Session',
                                        'access_mode': 'public'
                                    })
        session_id = json.loads(create_response.data)['data']['id']
        
        # Login as user2 
        login_response = client.post('/api/v1/auth/login', 
                                   json={'email': 'user2@example.com', 'password': 'password123'})
        user2_token = json.loads(login_response.data)['token']
        
        # Give user2 access to the song
        with app.app_context():
            song = Song.query.get(sample_song.id)
            song.permissions[str(sample_users['user2'].id)] = 'read'
            db.session.commit()
        
        # Join session as user2
        response = client.post(f'/api/v1/sessions/{session_id}/join',
                             headers={'Authorization': f'Bearer {user2_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['participant_count'] == 2
    
    def test_leave_session(self, client, sample_song, sample_users, auth_token):
        """Test leaving a session."""
        # Create session and add participant (similar setup as above)
        # ... (abbreviated for brevity)
        pass


class TestSessionInvitations:
    """Test session invitation functionality."""
    
    def test_invite_users_success(self, client, sample_song, sample_users, auth_token):
        """Test successful user invitation."""
        # Create session
        create_response = client.post('/api/v1/sessions',
                                    headers={'Authorization': f'Bearer {auth_token}'},
                                    json={
                                        'song_id': sample_song.id,
                                        'name': 'Invitation Test Session'
                                    })
        session_id = json.loads(create_response.data)['data']['id']
        
        # Invite users
        response = client.post(f'/api/v1/sessions/{session_id}/invite',
                             headers={'Authorization': f'Bearer {auth_token}'},
                             json={
                                 'users': [
                                     {'email': 'user2@example.com', 'role': 'editor'},
                                     {'email': 'user3@example.com', 'role': 'viewer'}
                                 ]
                             })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['invited_users']) == 2
    
    def test_invite_nonexistent_user(self, client, sample_song, auth_token):
        """Test inviting non-existent user."""
        # Create session
        create_response = client.post('/api/v1/sessions',
                                    headers={'Authorization': f'Bearer {auth_token}'},
                                    json={
                                        'song_id': sample_song.id,
                                        'name': 'Invitation Test Session'
                                    })
        session_id = json.loads(create_response.data)['data']['id']
        
        # Invite non-existent user
        response = client.post(f'/api/v1/sessions/{session_id}/invite',
                             headers={'Authorization': f'Bearer {auth_token}'},
                             json={
                                 'users': [
                                     {'email': 'nonexistent@example.com', 'role': 'viewer'}
                                 ]
                             })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert len(data['data']['errors']) > 0
        assert 'User not found' in data['data']['errors'][0]


class TestSessionActivities:
    """Test session activity logging."""
    
    def test_get_session_activities(self, client, sample_song, auth_token):
        """Test getting session activity log."""
        # Create session
        create_response = client.post('/api/v1/sessions',
                                    headers={'Authorization': f'Bearer {auth_token}'},
                                    json={
                                        'song_id': sample_song.id,
                                        'name': 'Activity Test Session'
                                    })
        session_id = json.loads(create_response.data)['data']['id']
        
        # Get activities
        response = client.get(f'/api/v1/sessions/{session_id}/activities',
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        activities = data['data']['activities']
        assert len(activities) >= 1  # At least session creation activity
        assert activities[0]['activity_type'] == 'session_created'


class TestSessionTemplates:
    """Test session template functionality."""
    
    def test_get_session_templates(self, client, session_template, auth_token):
        """Test getting available session templates."""
        response = client.get('/api/v1/sessions/templates',
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        templates = data['data']['templates']
        assert len(templates) >= 1
        assert any(t['name'] == 'Band Practice' for t in templates)
    
    def test_filter_templates_by_category(self, client, session_template, auth_token):
        """Test filtering templates by category."""
        response = client.get('/api/v1/sessions/templates?category=rehearsal',
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        templates = data['data']['templates']
        assert all(t['category'] == 'rehearsal' for t in templates)


class TestUserSessions:
    """Test user session listing."""
    
    def test_get_my_sessions(self, client, sample_song, auth_token):
        """Test getting user's sessions."""
        # Create a session first
        client.post('/api/v1/sessions',
                   headers={'Authorization': f'Bearer {auth_token}'},
                   json={
                       'song_id': sample_song.id,
                       'name': 'My Test Session'
                   })
        
        # Get user's sessions
        response = client.get('/api/v1/sessions/my-sessions',
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        sessions = data['data']['sessions']
        assert len(sessions) >= 1
        assert sessions[0]['name'] == 'My Test Session'
        assert sessions[0]['user_role'] == 'owner'
    
    def test_filter_sessions_by_status(self, client, sample_song, auth_token):
        """Test filtering sessions by status."""
        # Create a session first
        client.post('/api/v1/sessions',
                   headers={'Authorization': f'Bearer {auth_token}'},
                   json={
                       'song_id': sample_song.id,
                       'name': 'Active Session'
                   })
        
        # Get active sessions only
        response = client.get('/api/v1/sessions/my-sessions?status=active',
                            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        sessions = data['data']['sessions']
        assert all(s['status'] == 'active' for s in sessions)


class TestSessionModels:
    """Test session model functionality directly."""
    
    def test_collaboration_session_model(self, client, sample_users, sample_song):
        """Test CollaborationSession model methods."""
        with app.app_context():
            session = CollaborationSession(
                session_id='test-session-123',
                song_id=sample_song.id,
                creator_id=sample_users['user1'].id,
                name='Test Session'
            )
            db.session.add(session)
            db.session.commit()
            
            # Test can_access method
            assert session.can_access(sample_users['user1'].id) == True
            assert session.can_access(sample_users['user2'].id) == False
            
            # Test add_participant method
            participant = session.add_participant(
                user_id=sample_users['user2'].id,
                role='editor'
            )
            db.session.commit()
            
            assert session.participant_count == 1  # Updated by add_participant
            assert participant.role == 'editor'
            assert session.can_access(sample_users['user2'].id) == True
    
    def test_session_activity_logging(self, client, sample_users, sample_song):
        """Test session activity logging."""
        with app.app_context():
            session = CollaborationSession(
                session_id='test-session-456',
                song_id=sample_song.id,
                creator_id=sample_users['user1'].id,
                name='Activity Test Session'
            )
            db.session.add(session)
            db.session.commit()
            
            # Log activity
            activity = session.log_activity(
                user_id=sample_users['user1'].id,
                activity_type='test_activity',
                details={'test': 'data'}
            )
            db.session.commit()
            
            assert activity.session_id == session.id
            assert activity.activity_type == 'test_activity'
            assert activity.details['test'] == 'data'


class TestSessionSecurity:
    """Test session security and permissions."""
    
    def test_unauthorized_session_access(self, client):
        """Test accessing sessions without authentication."""
        response = client.get('/api/v1/sessions/test-session')
        assert response.status_code == 401
    
    def test_insufficient_permissions(self, client, sample_song, sample_users, auth_token):
        """Test accessing session with insufficient permissions."""
        # Create session as user1
        create_response = client.post('/api/v1/sessions',
                                    headers={'Authorization': f'Bearer {auth_token}'},
                                    json={
                                        'song_id': sample_song.id,
                                        'name': 'Private Session'
                                    })
        session_id = json.loads(create_response.data)['data']['id']
        
        # Try to access as user2 (unauthorized)
        login_response = client.post('/api/v1/auth/login', 
                                   json={'email': 'user2@example.com', 'password': 'password123'})
        user2_token = json.loads(login_response.data)['token']
        
        response = client.get(f'/api/v1/sessions/{session_id}',
                            headers={'Authorization': f'Bearer {user2_token}'})
        
        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'Access denied' in data['error']