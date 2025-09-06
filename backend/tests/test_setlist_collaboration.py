"""
Tests for setlist collaboration API routes.
"""

import pytest
import json
from datetime import datetime, timezone

from chordme import app, db
from chordme.models import User, Setlist, SetlistCollaborator, Song, SetlistSong


class TestSetlistCollaborationAPI:
    """Test setlist collaboration API endpoints."""
    
    def test_create_setlist_success(self, app, db_session, auth_headers):
        """Test successful setlist creation."""
        with app.test_client() as client:
            response = client.post('/api/v1/setlists', 
                headers=auth_headers,
                json={
                    'name': 'Sunday Service',
                    'description': 'Weekly worship service',
                    'event_type': 'worship',
                    'venue': 'Main Sanctuary',
                    'estimated_duration': 45
                }
            )
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['name'] == 'Sunday Service'
            assert data['event_type'] == 'worship'
            assert data['venue'] == 'Main Sanctuary'
    
    def test_list_setlists_with_permissions(self, app, db_session, auth_headers):
        """Test listing setlists with proper permission filtering."""
        with app.app_context():
            # Create test users
            owner = User(email='owner@example.com', password='TestPassword123')
            collaborator = User(email='collaborator@example.com', password='TestPassword123')
            other_user = User(email='other@example.com', password='TestPassword123')
            
            db_session.add_all([owner, collaborator, other_user])
            db_session.commit()
            
            # Create setlist
            setlist = Setlist(name='Test Setlist', user_id=owner.id)
            db_session.add(setlist)
            db_session.commit()
            
            # Add collaborator
            collaboration = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=collaborator.id,
                permission_level='edit',
                band_role='lead_guitar',
                instrument='Guitar',
                status='accepted'
            )
            db_session.add(collaboration)
            db_session.commit()
        
        with app.test_client() as client:
            # Test owner access
            response = client.get('/api/v1/setlists', headers=auth_headers)
            assert response.status_code == 200
            data = response.get_json()
            assert len(data['setlists']) >= 1
    
    def test_add_collaborator_with_band_role(self, app, db_session, auth_headers):
        """Test adding collaborator with band role assignment."""
        with app.app_context():
            # Create test users
            owner = User(email='owner@example.com', password='TestPassword123')
            guitarist = User(email='guitarist@example.com', password='TestPassword123')
            
            db_session.add_all([owner, guitarist])
            db_session.commit()
            
            # Create setlist
            setlist = Setlist(name='Test Setlist', user_id=owner.id)
            db_session.add(setlist)
            db_session.commit()
        
        with app.test_client() as client:
            response = client.post(f'/api/v1/setlists/{setlist.id}/collaborators',
                headers=auth_headers,
                json={
                    'user_email': 'guitarist@example.com',
                    'permission_level': 'edit',
                    'band_role': 'lead_guitar',
                    'instrument': 'Electric Guitar',
                    'is_lead_for_role': True
                }
            )
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['band_role'] == 'lead_guitar'
            assert data['instrument'] == 'Electric Guitar'
            assert data['is_lead_for_role'] == True
    
    def test_setlist_access_control(self, app, db_session):
        """Test setlist access control with different permission levels."""
        with app.app_context():
            # Create test users
            owner = User(email='owner@example.com', password='TestPassword123')
            viewer = User(email='viewer@example.com', password='TestPassword123')
            editor = User(email='editor@example.com', password='TestPassword123')
            unauthorized = User(email='unauthorized@example.com', password='TestPassword123')
            
            db_session.add_all([owner, viewer, editor, unauthorized])
            db_session.commit()
            
            # Create private setlist
            setlist = Setlist(
                name='Private Setlist', 
                user_id=owner.id,
                is_public=False
            )
            db_session.add(setlist)
            db_session.commit()
            
            # Add collaborators with different permissions
            viewer_collab = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=viewer.id,
                permission_level='view',
                status='accepted'
            )
            editor_collab = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=editor.id,
                permission_level='edit',
                status='accepted'
            )
            
            db_session.add_all([viewer_collab, editor_collab])
            db_session.commit()
            
            # Test access control
            assert setlist.can_user_access(owner.id) == True
            assert setlist.can_user_access(viewer.id) == True
            assert setlist.can_user_access(editor.id) == True
            assert setlist.can_user_access(unauthorized.id) == False
            
            # Test edit permissions
            assert setlist.can_user_edit(owner.id) == True
            assert setlist.can_user_edit(viewer.id) == False
            assert setlist.can_user_edit(editor.id) == True
            assert setlist.can_user_edit(unauthorized.id) == False
    
    def test_public_setlist_access(self, app, db_session):
        """Test public setlist access by any user."""
        with app.app_context():
            owner = User(email='owner@example.com', password='TestPassword123')
            random_user = User(email='random@example.com', password='TestPassword123')
            
            db_session.add_all([owner, random_user])
            db_session.commit()
            
            # Create public setlist
            public_setlist = Setlist(
                name='Public Setlist',
                user_id=owner.id,
                is_public=True
            )
            db_session.add(public_setlist)
            db_session.commit()
            
            # Any user should be able to view public setlist
            assert public_setlist.can_user_access(random_user.id) == True
            # But not edit unless they're a collaborator
            assert public_setlist.can_user_edit(random_user.id) == False
    
    def test_update_collaborator_permissions(self, app, db_session, auth_headers):
        """Test updating collaborator permission levels."""
        with app.app_context():
            # Create test data
            owner = User(email='owner@example.com', password='TestPassword123')
            collaborator = User(email='collaborator@example.com', password='TestPassword123')
            
            db_session.add_all([owner, collaborator])
            db_session.commit()
            
            setlist = Setlist(name='Test Setlist', user_id=owner.id)
            db_session.add(setlist)
            db_session.commit()
            
            collaboration = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=collaborator.id,
                permission_level='view',
                status='accepted'
            )
            db_session.add(collaboration)
            db_session.commit()
        
        with app.test_client() as client:
            # Update permission level
            response = client.put(
                f'/api/v1/setlists/{setlist.id}/collaborators/{collaboration.id}',
                headers=auth_headers,
                json={'permission_level': 'edit'}
            )
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['permission_level'] == 'edit'
    
    def test_remove_collaborator(self, app, db_session, auth_headers):
        """Test removing a collaborator from setlist."""
        with app.app_context():
            # Create test data
            owner = User(email='owner@example.com', password='TestPassword123')
            collaborator = User(email='collaborator@example.com', password='TestPassword123')
            
            db_session.add_all([owner, collaborator])
            db_session.commit()
            
            setlist = Setlist(name='Test Setlist', user_id=owner.id)
            db_session.add(setlist)
            db_session.commit()
            
            collaboration = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=collaborator.id,
                permission_level='edit',
                status='accepted'
            )
            db_session.add(collaboration)
            db_session.commit()
            
            collab_id = collaboration.id
        
        with app.test_client() as client:
            # Remove collaborator
            response = client.delete(
                f'/api/v1/setlists/{setlist.id}/collaborators/{collab_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            
            # Verify collaborator was removed
            removed_collab = SetlistCollaborator.query.get(collab_id)
            assert removed_collab is None


# Fixtures for testing
@pytest.fixture
def auth_headers():
    """Mock authentication headers for testing."""
    # This would normally contain a valid JWT token
    return {
        'Authorization': 'Bearer mock-jwt-token',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def app():
    """Create test Flask application."""
    from chordme import app as flask_app
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.drop_all()


@pytest.fixture
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        yield db.session
        db.session.rollback()
        db.session.close()