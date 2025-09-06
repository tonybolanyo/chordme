"""
Test suite for setlist data architecture models and functionality.
Comprehensive testing of setlist management, performance tracking, templates, and analytics.
"""

import pytest
from datetime import datetime, timezone, timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from chordme.models import (
    db, User, Song, Setlist, SetlistSong, SetlistVersion, SetlistTemplate, 
    SetlistTemplateSection, SetlistCollaborator, SetlistPerformance, 
    SetlistPerformanceSong
)


class TestSetlistModels:
    """Test basic setlist model functionality."""
    
    def test_setlist_creation(self, app, db_session):
        """Test creating a basic setlist."""
        with app.app_context():
            # Create test user
            user = User(email='test@example.com', password='testpass')
            db_session.add(user)
            db_session.commit()
            
            # Create setlist
            setlist = Setlist(
                name='Sunday Service', 
                user_id=user.id,
                description='Weekly worship service',
                event_type='worship'
            )
            db_session.add(setlist)
            db_session.commit()
            
            assert setlist.id is not None
            assert setlist.name == 'Sunday Service'
            assert setlist.event_type == 'worship'
            assert setlist.status == 'draft'
            assert setlist.is_deleted == False
            assert setlist.usage_count == 0
    
    def test_setlist_to_dict(self, app, db_session):
        """Test setlist serialization."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            db_session.add(user)
            db_session.commit()
            
            setlist = Setlist(
                name='Test Setlist', 
                user_id=user.id,
                venue='Test Venue',
                estimated_duration=60
            )
            db_session.add(setlist)
            db_session.commit()
            
            data = setlist.to_dict()
            
            assert data['name'] == 'Test Setlist'
            assert data['venue'] == 'Test Venue'
            assert data['estimated_duration'] == 60
            assert data['user_id'] == user.id
            assert 'created_at' in data
            assert 'updated_at' in data
    
    def test_setlist_song_creation(self, app, db_session):
        """Test adding songs to setlists."""
        with app.app_context():
            # Create test data
            user = User(email='test@example.com', password='testpass')
            song = Song(
                title='Amazing Grace',
                content='{title: Amazing Grace}\n[C]Amazing Grace...',
                user_id=user.id
            )
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, song, setlist])
            db_session.commit()
            
            # Add song to setlist
            setlist_song = SetlistSong(
                setlist_id=setlist.id,
                song_id=song.id,
                sort_order=1,
                section='opening',
                performance_key='D',
                performance_tempo=120,
                estimated_duration=240
            )
            db_session.add(setlist_song)
            db_session.commit()
            
            assert setlist_song.id is not None
            assert setlist_song.performance_key == 'D'
            assert setlist_song.performance_tempo == 120
            assert setlist_song.section == 'opening'
    
    def test_setlist_add_song_method(self, app, db_session):
        """Test the add_song method on setlist."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            song = Song(title='Test Song', content='Test content', user_id=user.id)
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, song, setlist])
            db_session.commit()
            
            # Use the add_song method
            setlist_song = setlist.add_song(
                song_id=song.id,
                section='main',
                performance_key='G',
                performance_tempo=140
            )
            db_session.commit()
            
            assert setlist_song.song_id == song.id
            assert setlist_song.section == 'main'
            assert setlist_song.performance_key == 'G'
            assert setlist_song.sort_order == 1
    
    def test_setlist_remove_song_method(self, app, db_session):
        """Test removing songs from setlist."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            song = Song(title='Test Song', content='Test content', user_id=user.id)
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, song, setlist])
            db_session.commit()
            
            # Add then remove song
            setlist.add_song(song_id=song.id)
            db_session.commit()
            
            result = setlist.remove_song(song_id=song.id)
            db_session.commit()
            
            assert result == True
            assert len(setlist.setlist_songs) == 0


class TestSetlistVersioning:
    """Test setlist version control functionality."""
    
    def test_setlist_version_creation(self, app, db_session):
        """Test creating setlist versions."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, setlist])
            db_session.commit()
            
            # Create version
            version = SetlistVersion(
                setlist_id=setlist.id,
                version_number=1,
                name='Test Setlist v1',
                created_by=user.id,
                version_note='Initial version'
            )
            db_session.add(version)
            db_session.commit()
            
            assert version.id is not None
            assert version.version_number == 1
            assert version.version_note == 'Initial version'
    
    def test_setlist_version_uniqueness(self, app, db_session):
        """Test that version numbers are unique per setlist."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, setlist])
            db_session.commit()
            
            # Create first version
            version1 = SetlistVersion(
                setlist_id=setlist.id,
                version_number=1,
                name='Version 1',
                created_by=user.id
            )
            db_session.add(version1)
            db_session.commit()
            
            # Try to create duplicate version number
            version2 = SetlistVersion(
                setlist_id=setlist.id,
                version_number=1,  # Same version number
                name='Version 1 Duplicate',
                created_by=user.id
            )
            db_session.add(version2)
            
            with pytest.raises(Exception):  # Should fail due to unique constraint
                db_session.commit()


class TestSetlistTemplates:
    """Test setlist template functionality."""
    
    def test_template_creation(self, app, db_session):
        """Test creating setlist templates."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            db_session.add(user)
            db_session.commit()
            
            template = SetlistTemplate(
                name='Worship Service Template',
                created_by=user.id,
                category='worship',
                subcategory='contemporary',
                target_duration=75,
                default_sections=['opening', 'worship', 'message', 'closing']
            )
            db_session.add(template)
            db_session.commit()
            
            assert template.id is not None
            assert template.category == 'worship'
            assert template.target_duration == 75
            assert 'opening' in template.default_sections
    
    def test_template_sections(self, app, db_session):
        """Test template sections functionality."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            template = SetlistTemplate(
                name='Test Template',
                created_by=user.id,
                category='worship'
            )
            
            db_session.add_all([user, template])
            db_session.commit()
            
            # Add sections
            section1 = SetlistTemplateSection(
                template_id=template.id,
                section_name='opening',
                section_order=1,
                min_songs=1,
                max_songs=3,
                target_duration=10,
                energy_level='medium'
            )
            
            section2 = SetlistTemplateSection(
                template_id=template.id,
                section_name='worship',
                section_order=2,
                min_songs=3,
                max_songs=5,
                target_duration=25,
                energy_level='building'
            )
            
            db_session.add_all([section1, section2])
            db_session.commit()
            
            assert len(template.sections) == 2
            assert template.sections[0].section_name == 'opening'
            assert template.sections[1].energy_level == 'building'
    
    def test_template_serialization(self, app, db_session):
        """Test template to_dict with sections."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            template = SetlistTemplate(
                name='Test Template',
                created_by=user.id,
                category='worship',
                is_public=True
            )
            
            db_session.add_all([user, template])
            db_session.commit()
            
            # Test basic serialization
            data = template.to_dict()
            assert data['name'] == 'Test Template'
            assert data['is_public'] == True
            assert 'sections' not in data
            
            # Test with sections
            data_with_sections = template.to_dict(include_sections=True)
            assert 'sections' in data_with_sections


class TestSetlistCollaboration:
    """Test setlist sharing and collaboration."""
    
    def test_collaborator_creation(self, app, db_session):
        """Test adding collaborators to setlists."""
        with app.app_context():
            owner = User(email='owner@example.com', password='testpass')
            collaborator = User(email='collaborator@example.com', password='testpass')
            setlist = Setlist(name='Shared Setlist', user_id=owner.id)
            
            db_session.add_all([owner, collaborator, setlist])
            db_session.commit()
            
            # Add collaborator
            collaboration = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=collaborator.id,
                permission_level='edit',
                invited_by=owner.id
            )
            db_session.add(collaboration)
            db_session.commit()
            
            assert collaboration.id is not None
            assert collaboration.permission_level == 'edit'
            assert collaboration.status == 'pending'
    
    def test_setlist_access_permissions(self, app, db_session):
        """Test setlist access control."""
        with app.app_context():
            owner = User(email='owner@example.com', password='testpass')
            collaborator = User(email='collaborator@example.com', password='testpass')
            other_user = User(email='other@example.com', password='testpass')
            
            setlist = Setlist(name='Test Setlist', user_id=owner.id)
            
            db_session.add_all([owner, collaborator, other_user, setlist])
            db_session.commit()
            
            # Owner should have access
            assert setlist.can_user_access(owner.id) == True
            assert setlist.can_user_edit(owner.id) == True
            
            # Other user should not have access
            assert setlist.can_user_access(other_user.id) == False
            assert setlist.can_user_edit(other_user.id) == False
            
            # Add collaborator with edit permission
            collaboration = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=collaborator.id,
                permission_level='edit',
                status='accepted'
            )
            db_session.add(collaboration)
            db_session.commit()
            
            # Collaborator should have access and edit permissions
            assert setlist.can_user_access(collaborator.id) == True
            assert setlist.can_user_edit(collaborator.id) == True
    
    def test_public_setlist_access(self, app, db_session):
        """Test public setlist access."""
        with app.app_context():
            owner = User(email='owner@example.com', password='testpass')
            other_user = User(email='other@example.com', password='testpass')
            
            # Create public setlist
            setlist = Setlist(
                name='Public Setlist', 
                user_id=owner.id,
                is_public=True
            )
            
            db_session.add_all([owner, other_user, setlist])
            db_session.commit()
            
            # Any user should be able to access public setlist
            assert setlist.can_user_access(other_user.id) == True
            # But not edit unless they're collaborator
            assert setlist.can_user_edit(other_user.id) == False


class TestSetlistPerformance:
    """Test performance tracking and analytics."""
    
    def test_performance_creation(self, app, db_session):
        """Test creating performance records."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            setlist = Setlist(name='Concert Setlist', user_id=user.id)
            
            db_session.add_all([user, setlist])
            db_session.commit()
            
            # Create performance
            performance = SetlistPerformance(
                setlist_id=setlist.id,
                performed_by=user.id,
                performance_date=datetime.now(timezone.utc),
                venue='Test Venue',
                event_type='concert',
                audience_size=200,
                total_duration=90,
                overall_rating=4
            )
            db_session.add(performance)
            db_session.commit()
            
            assert performance.id is not None
            assert performance.venue == 'Test Venue'
            assert performance.audience_size == 200
            assert performance.overall_rating == 4
    
    def test_performance_song_tracking(self, app, db_session):
        """Test individual song performance tracking."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            song = Song(title='Test Song', content='Test content', user_id=user.id)
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, song, setlist])
            db_session.commit()
            
            # Add song to setlist
            setlist_song = SetlistSong(
                setlist_id=setlist.id,
                song_id=song.id,
                sort_order=1,
                estimated_duration=180
            )
            db_session.add(setlist_song)
            db_session.commit()
            
            # Create performance
            performance = SetlistPerformance(
                setlist_id=setlist.id,
                performed_by=user.id,
                performance_date=datetime.now(timezone.utc)
            )
            db_session.add(performance)
            db_session.commit()
            
            # Track song performance
            perf_song = SetlistPerformanceSong(
                performance_id=performance.id,
                setlist_song_id=setlist_song.id,
                actual_order=1,
                was_performed=True,
                actual_key='G',
                actual_tempo=120,
                actual_duration=190,
                performance_rating=4,
                audience_response='excellent'
            )
            db_session.add(perf_song)
            db_session.commit()
            
            assert perf_song.id is not None
            assert perf_song.actual_duration == 190
            assert perf_song.audience_response == 'excellent'
    
    def test_performance_serialization(self, app, db_session):
        """Test performance data serialization."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, setlist])
            db_session.commit()
            
            performance = SetlistPerformance(
                setlist_id=setlist.id,
                performed_by=user.id,
                performance_date=datetime.now(timezone.utc),
                venue='Test Venue',
                equipment_used=['guitar', 'microphone'],
                team_members=['John Doe', 'Jane Smith']
            )
            db_session.add(performance)
            db_session.commit()
            
            data = performance.to_dict()
            
            assert data['venue'] == 'Test Venue'
            assert 'guitar' in data['equipment_used']
            assert 'John Doe' in data['team_members']
            assert 'performance_date' in data


class TestSetlistRelationships:
    """Test relationships between setlist entities."""
    
    def test_setlist_songs_relationship(self, app, db_session):
        """Test setlist to songs relationship."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            song1 = Song(title='Song 1', content='Content 1', user_id=user.id)
            song2 = Song(title='Song 2', content='Content 2', user_id=user.id)
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, song1, song2, setlist])
            db_session.commit()
            
            # Add songs to setlist
            setlist.add_song(song_id=song1.id, sort_order=1)
            setlist.add_song(song_id=song2.id, sort_order=2)
            db_session.commit()
            
            assert len(setlist.setlist_songs) == 2
            assert setlist.setlist_songs[0].song.title == 'Song 1'
            assert setlist.setlist_songs[1].song.title == 'Song 2'
    
    def test_template_inheritance(self, app, db_session):
        """Test setlist creation from template."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            
            # Create template
            template = SetlistTemplate(
                name='Worship Template',
                created_by=user.id,
                category='worship',
                target_duration=75
            )
            
            db_session.add_all([user, template])
            db_session.commit()
            
            # Create setlist from template
            setlist = Setlist(
                name='Sunday Service',
                user_id=user.id,
                template_id=template.id,
                event_type='worship'
            )
            db_session.add(setlist)
            db_session.commit()
            
            assert setlist.template_id == template.id
            assert setlist.template.name == 'Worship Template'
    
    def test_setlist_versions_relationship(self, app, db_session):
        """Test setlist to versions relationship."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, setlist])
            db_session.commit()
            
            # Create multiple versions
            for i in range(3):
                version = SetlistVersion(
                    setlist_id=setlist.id,
                    version_number=i + 1,
                    name=f'Version {i + 1}',
                    created_by=user.id
                )
                db_session.add(version)
            
            db_session.commit()
            
            assert len(setlist.versions) == 3
            assert setlist.versions[0].version_number == 1


class TestSetlistConstraints:
    """Test database constraints and validation."""
    
    def test_setlist_song_uniqueness(self, app, db_session):
        """Test that songs can't be added to same setlist twice."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            song = Song(title='Test Song', content='Test content', user_id=user.id)
            setlist = Setlist(name='Test Setlist', user_id=user.id)
            
            db_session.add_all([user, song, setlist])
            db_session.commit()
            
            # Add song first time
            setlist_song1 = SetlistSong(
                setlist_id=setlist.id,
                song_id=song.id,
                sort_order=1
            )
            db_session.add(setlist_song1)
            db_session.commit()
            
            # Try to add same song again
            setlist_song2 = SetlistSong(
                setlist_id=setlist.id,
                song_id=song.id,
                sort_order=2
            )
            db_session.add(setlist_song2)
            
            with pytest.raises(Exception):  # Should fail due to unique constraint
                db_session.commit()
    
    def test_collaborator_uniqueness(self, app, db_session):
        """Test that users can't be added as collaborators twice."""
        with app.app_context():
            owner = User(email='owner@example.com', password='testpass')
            collaborator = User(email='collaborator@example.com', password='testpass')
            setlist = Setlist(name='Test Setlist', user_id=owner.id)
            
            db_session.add_all([owner, collaborator, setlist])
            db_session.commit()
            
            # Add collaborator first time
            collab1 = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=collaborator.id,
                permission_level='view'
            )
            db_session.add(collab1)
            db_session.commit()
            
            # Try to add same collaborator again
            collab2 = SetlistCollaborator(
                setlist_id=setlist.id,
                user_id=collaborator.id,
                permission_level='edit'
            )
            db_session.add(collab2)
            
            with pytest.raises(Exception):  # Should fail due to unique constraint
                db_session.commit()


class TestSetlistSearch:
    """Test setlist search and filtering functionality."""
    
    def test_setlist_filtering_by_status(self, app, db_session):
        """Test filtering setlists by status."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            
            # Create setlists with different statuses
            draft_setlist = Setlist(name='Draft Setlist', user_id=user.id, status='draft')
            ready_setlist = Setlist(name='Ready Setlist', user_id=user.id, status='ready')
            archived_setlist = Setlist(name='Archived Setlist', user_id=user.id, is_archived=True)
            
            db_session.add_all([user, draft_setlist, ready_setlist, archived_setlist])
            db_session.commit()
            
            # Test filtering
            draft_setlists = Setlist.query.filter_by(status='draft').all()
            ready_setlists = Setlist.query.filter_by(status='ready').all()
            active_setlists = Setlist.query.filter_by(is_archived=False).all()
            
            assert len(draft_setlists) == 1
            assert len(ready_setlists) == 1
            assert len(active_setlists) == 2  # draft + ready
    
    def test_setlist_filtering_by_event_type(self, app, db_session):
        """Test filtering setlists by event type."""
        with app.app_context():
            user = User(email='test@example.com', password='testpass')
            
            worship_setlist = Setlist(name='Worship Service', user_id=user.id, event_type='worship')
            concert_setlist = Setlist(name='Concert', user_id=user.id, event_type='concert')
            rehearsal_setlist = Setlist(name='Rehearsal', user_id=user.id, event_type='rehearsal')
            
            db_session.add_all([user, worship_setlist, concert_setlist, rehearsal_setlist])
            db_session.commit()
            
            worship_setlists = Setlist.query.filter_by(event_type='worship').all()
            concert_setlists = Setlist.query.filter_by(event_type='concert').all()
            
            assert len(worship_setlists) == 1
            assert len(concert_setlists) == 1
            assert worship_setlists[0].name == 'Worship Service'


# Fixtures for testing
@pytest.fixture
def app():
    """Create test Flask application."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        yield db.session
        db.session.rollback()
        db.session.close()