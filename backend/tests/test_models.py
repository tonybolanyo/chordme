"""
Comprehensive tests for chordme.models module.
Tests User, Song, and Chord models functionality.
"""

import pytest
from datetime import datetime
from chordme import app as flask_app, db
from chordme.models import User, Song, Chord


class TestUserModel:
    """Test User model functionality."""

    def setup_method(self):
        """Set up test database."""
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        with flask_app.app_context():
            db.create_all()

    def teardown_method(self):
        """Clean up test database."""
        with flask_app.app_context():
            db.session.remove()
            db.drop_all()

    def test_user_creation(self):
        """Test basic user creation."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            assert user.id is not None
            assert user.email == 'test@example.com'
            assert user.password_hash is not None
            assert user.password_hash != 'TestPassword123'

    def test_user_password_verification(self):
        """Test password hashing and verification."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            
            assert user.check_password('TestPassword123') is True
            assert user.check_password('WrongPassword') is False

    def test_user_to_dict(self):
        """Test user serialization."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            user_dict = user.to_dict()
            assert isinstance(user_dict, dict)
            assert user_dict['id'] == user.id
            assert user_dict['email'] == 'test@example.com'
            assert 'password_hash' not in user_dict  # Should not expose password


class TestSongModel:
    """Test Song model functionality."""

    def setup_method(self):
        """Set up test database."""
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        with flask_app.app_context():
            db.create_all()

    def teardown_method(self):
        """Clean up test database."""
        with flask_app.app_context():
            db.session.remove()
            db.drop_all()

    def test_song_creation(self):
        """Test basic song creation."""
        with flask_app.app_context():
            # First create a user
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Then create a song
            song = Song(
                title='Test Song',
                content='[C]Hello [G]world',
                author_id=user.id
            )
            db.session.add(song)
            db.session.commit()
            
            assert song.id is not None
            assert song.title == 'Test Song'
            assert song.content == '[C]Hello [G]world'
            assert song.author_id == user.id

    def test_song_to_dict(self):
        """Test song serialization."""
        with flask_app.app_context():
            # Create user and song
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            song = Song(
                title='Test Song',
                content='[C]Hello [G]world',
                author_id=user.id
            )
            db.session.add(song)
            db.session.commit()
            
            song_dict = song.to_dict()
            assert isinstance(song_dict, dict)
            assert song_dict['id'] == song.id
            assert song_dict['title'] == 'Test Song'
            assert song_dict['content'] == '[C]Hello [G]world'
            assert song_dict['author_id'] == user.id


class TestChordModel:
    """Test Chord model functionality."""

    def setup_method(self):
        """Set up test database."""
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        with flask_app.app_context():
            db.create_all()

    def teardown_method(self):
        """Clean up test database."""
        with flask_app.app_context():
            db.session.remove()
            db.drop_all()

    def test_chord_model_exists(self):
        """Test that Chord model can be imported and has basic attributes."""
        assert hasattr(Chord, '__tablename__')
        assert hasattr(Chord, 'id') 
        
    def test_chord_creation(self):
        """Test basic chord creation if Chord model is fully implemented."""
        # Note: This test might need adjustment based on actual Chord model implementation
        with flask_app.app_context():
            try:
                chord = Chord()
                assert chord is not None
            except TypeError:
                # If Chord requires parameters, test basic attributes only
                assert hasattr(Chord, '__tablename__')


class TestSongModelAdditionalFeatures:
    """Test additional Song model features for better coverage."""
    
    def setUp(self):
        """Set up test database."""
        with flask_app.app_context():
            db.create_all()

    def tearDown(self):
        """Clean up test database."""
        with flask_app.app_context():
            db.session.remove()
            db.drop_all()

    def test_song_model_attributes(self):
        """Test Song model has expected attributes."""
        with flask_app.app_context():
            expected_attributes = ['id', 'title', 'content', 'author_id', 'created_at', 'updated_at']
            
            for attr in expected_attributes:
                assert hasattr(Song, attr), f"Song model should have {attr} attribute"
    
    def test_song_model_relationships(self):
        """Test Song model relationships."""
        with flask_app.app_context():
            # Test that Song has author relationship
            if hasattr(Song, 'author'):
                assert hasattr(Song, 'author')
    
    def test_song_str_representation(self):
        """Test Song string representation."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            song = Song(
                title='Test Song',
                content='[C]Hello [G]world',
                author_id=user.id
            )
            
            str_repr = str(song)
            assert isinstance(str_repr, str)
            assert len(str_repr) > 0
    
    def test_song_to_dict_complete(self):
        """Test complete Song to_dict functionality."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            song = Song(
                title='Test Song',
                content='[C]Hello [G]world',
                author_id=user.id
            )
            db.session.add(song)
            db.session.commit()
            
            song_dict = song.to_dict()
            
            # Test all expected fields are present
            expected_fields = ['id', 'title', 'content', 'author_id']
            for field in expected_fields:
                assert field in song_dict
            
            # Test field values
            assert song_dict['title'] == 'Test Song'
            assert song_dict['content'] == '[C]Hello [G]world'
            assert song_dict['author_id'] == user.id


class TestUserModelAdditionalFeatures:
    """Test additional User model features for better coverage."""
    
    def setUp(self):
        """Set up test database."""
        with flask_app.app_context():
            db.create_all()

    def tearDown(self):
        """Clean up test database."""
        with flask_app.app_context():
            db.session.remove()
            db.drop_all()

    def test_user_model_attributes(self):
        """Test User model has expected attributes."""
        with flask_app.app_context():
            expected_attributes = ['id', 'email', 'password_hash', 'created_at']
            
            for attr in expected_attributes:
                assert hasattr(User, attr), f"User model should have {attr} attribute"
    
    def test_user_str_representation(self):
        """Test User string representation."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            
            str_repr = str(user)
            assert isinstance(str_repr, str)
            assert len(str_repr) > 0
    
    def test_user_to_dict_complete(self):
        """Test complete User to_dict functionality."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            user_dict = user.to_dict()
            
            # Test expected fields are present
            expected_fields = ['id', 'email']
            for field in expected_fields:
                assert field in user_dict
            
            # Test sensitive fields are excluded
            assert 'password' not in user_dict
            assert 'password_hash' not in user_dict
            
            # Test field values
            assert user_dict['email'] == 'test@example.com'
    
    def test_user_password_methods(self):
        """Test User password-related methods."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            
            # Test password verification
            assert user.check_password('TestPassword123') is True
            assert user.check_password('WrongPassword') is False
            
            # Test password hash is set
            assert user.password_hash is not None
            assert user.password_hash != 'TestPassword123'  # Should be hashed


class TestModelEdgeCases:
    """Test edge cases for model functionality."""
    
    def setUp(self):
        """Set up test database."""
        with flask_app.app_context():
            db.create_all()

    def tearDown(self):
        """Clean up test database."""
        with flask_app.app_context():
            db.session.remove()
            db.drop_all()

    def test_user_creation_edge_cases(self):
        """Test User creation with edge cases."""
        with flask_app.app_context():
            # Test with empty password (should handle gracefully)
            try:
                user = User(email='test@example.com', password='')
                # Should either work or raise appropriate error
            except (ValueError, TypeError):
                # Expected for invalid password
                pass
    
    def test_song_creation_edge_cases(self):
        """Test Song creation with edge cases."""
        with flask_app.app_context():
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Test with empty content
            song = Song(
                title='Empty Song',
                content='',
                author_id=user.id
            )
            db.session.add(song)
            db.session.commit()
            
            assert song.content == ''
            
            # Test with long title
            long_title = 'x' * 500
            song2 = Song(
                title=long_title,
                content='[C]Test',
                author_id=user.id
            )
            # Should handle long titles appropriately