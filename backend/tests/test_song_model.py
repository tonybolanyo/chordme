"""Tests for Song model functionality."""

import pytest
from datetime import datetime

def test_song_model_integration():
    """Test Song model integration with the existing application."""
    # Test with the actual application setup
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create a user first
        user = User('songtest123@example.com', 'TestPassword123')
        db.session.add(user)
        db.session.commit()
        
        # Create a song
        song = Song('Integration Test Song', user.id, 'C G Am F\nTest ChordPro content\nWith multiple lines')
        db.session.add(song)
        db.session.commit()
        
        # Verify song was created
        assert song.id is not None
        assert song.title == 'Integration Test Song'
        assert song.author_id == user.id
        assert song.content == 'C G Am F\nTest ChordPro content\nWith multiple lines'
        assert isinstance(song.created_at, datetime)
        assert isinstance(song.updated_at, datetime)
        
        # Test to_dict
        song_dict = song.to_dict()
        assert 'id' in song_dict
        assert song_dict['title'] == 'Integration Test Song'
        assert song_dict['author_id'] == user.id
        assert song_dict['content'] == 'C G Am F\nTest ChordPro content\nWith multiple lines'
        assert 'created_at' in song_dict
        assert 'updated_at' in song_dict
        assert isinstance(song_dict['created_at'], str)  # Should be ISO format
        assert isinstance(song_dict['updated_at'], str)
        
        # Test sharing model fields
        assert 'shared_with' in song_dict
        assert 'permissions' in song_dict
        assert 'share_settings' in song_dict
        assert song_dict['shared_with'] == []
        assert song_dict['permissions'] == {}
        assert song_dict['share_settings'] == 'private'
        
        # Test relationships
        assert len(user.songs) == 1
        assert user.songs[0].title == 'Integration Test Song'
        assert song.author.email == 'songtest123@example.com'
        
        # Test __repr__
        assert repr(song) == '<Song Integration Test Song>'
        
        # Clean up
        db.session.delete(song)
        db.session.delete(user)
        db.session.commit()


def test_song_model_multiple_songs():
    """Test multiple songs for a user."""
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create a user
        user = User('multiuser@example.com', 'TestPassword123')
        db.session.add(user)
        db.session.commit()
        
        # Create multiple songs
        song1 = Song('First Song', user.id, 'C G Am F\nFirst song content')
        song2 = Song('Second Song', user.id, 'D A Bm G\nSecond song content')
        song3 = Song('Third Song', user.id, 'E B C# A\nThird song content')
        
        db.session.add(song1)
        db.session.add(song2) 
        db.session.add(song3)
        db.session.commit()
        
        # Test relationships
        assert len(user.songs) == 3
        song_titles = [song.title for song in user.songs]
        assert 'First Song' in song_titles
        assert 'Second Song' in song_titles
        assert 'Third Song' in song_titles
        
        # Verify each song's author
        for song in user.songs:
            assert song.author.email == 'multiuser@example.com'
            assert song.author_id == user.id
        
        # Clean up
        for song in list(user.songs):  # Create a copy of the list to avoid modification during iteration
            db.session.delete(song)
        db.session.delete(user)
        db.session.commit()


def test_song_sharing_model_basic():
    """Test basic sharing model functionality."""
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        db.create_all()
        
        # Create users
        author = User('author@example.com', 'TestPassword123')
        shared_user = User('shared@example.com', 'TestPassword123')
        db.session.add(author)
        db.session.add(shared_user)
        db.session.commit()
        
        # Create song with sharing settings
        song = Song(
            'Shared Song',
            author.id,
            'C G Am F\nShared content',
            shared_with=[shared_user.id],
            permissions={str(shared_user.id): 'read'},
            share_settings='link-shared'
        )
        db.session.add(song)
        db.session.commit()
        
        # Test sharing fields
        assert song.shared_with == [shared_user.id]
        assert song.permissions == {str(shared_user.id): 'read'}
        assert song.share_settings == 'link-shared'
        
        # Test helper methods
        assert song.is_shared_with_user(shared_user.id)
        assert not song.is_shared_with_user(999)  # Non-existent user
        assert song.get_user_permission(shared_user.id) == 'read'
        assert song.get_user_permission(999) is None
        
        # Clean up
        db.session.delete(song)
        db.session.delete(author)
        db.session.delete(shared_user)
        db.session.commit()


def test_song_add_remove_shared_user():
    """Test adding and removing shared users."""
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        db.create_all()
        
        # Create users
        author = User('author2@example.com', 'TestPassword123')
        user1 = User('user1@example.com', 'TestPassword123')
        user2 = User('user2@example.com', 'TestPassword123')
        db.session.add(author)
        db.session.add(user1)
        db.session.add(user2)
        db.session.commit()
        
        # Create song
        song = Song('Test Song', author.id, 'C G Am F\nTest content')
        db.session.add(song)
        db.session.commit()
        
        # Initially no shared users
        assert song.shared_with == []
        assert song.permissions == {}
        
        # Add shared users
        song.add_shared_user(user1.id, 'read')
        song.add_shared_user(user2.id, 'edit')
        
        assert user1.id in song.shared_with
        assert user2.id in song.shared_with
        assert song.get_user_permission(user1.id) == 'read'
        assert song.get_user_permission(user2.id) == 'edit'
        
        # Update permission for existing user
        song.add_shared_user(user1.id, 'admin')
        assert song.get_user_permission(user1.id) == 'admin'
        assert len(song.shared_with) == 2  # Should not duplicate
        
        # Remove a user
        song.remove_shared_user(user1.id)
        assert user1.id not in song.shared_with
        assert song.get_user_permission(user1.id) is None
        assert user2.id in song.shared_with  # Other user should remain
        
        # Clean up
        db.session.delete(song)
        db.session.delete(author)
        db.session.delete(user1)
        db.session.delete(user2)
        db.session.commit()


def test_song_permission_validation():
    """Test permission level validation."""
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        db.create_all()
        
        # Create users
        author = User('author3@example.com', 'TestPassword123')
        user = User('user3@example.com', 'TestPassword123')
        db.session.add(author)
        db.session.add(user)
        db.session.commit()
        
        # Create song
        song = Song('Permission Test Song', author.id, 'C G Am F\nTest content')
        db.session.add(song)
        db.session.commit()
        
        # Test valid permission levels
        for level in ['read', 'edit', 'admin']:
            song.add_shared_user(user.id, level)
            assert song.get_user_permission(user.id) == level
        
        # Test invalid permission level
        with pytest.raises(ValueError, match="Permission level must be 'read', 'edit', or 'admin'"):
            song.add_shared_user(user.id, 'invalid')
        
        # Clean up
        db.session.delete(song)
        db.session.delete(author)
        db.session.delete(user)
        db.session.commit()


def test_song_access_control():
    """Test user access control methods."""
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        db.create_all()
        
        # Create users
        author = User('author4@example.com', 'TestPassword123')
        shared_user = User('shared4@example.com', 'TestPassword123')
        public_user = User('public4@example.com', 'TestPassword123')
        no_access_user = User('noaccess4@example.com', 'TestPassword123')
        
        db.session.add(author)
        db.session.add(shared_user)
        db.session.add(public_user)
        db.session.add(no_access_user)
        db.session.commit()
        
        # Test private song
        private_song = Song('Private Song', author.id, 'Private content', share_settings='private')
        private_song.add_shared_user(shared_user.id, 'read')
        db.session.add(private_song)
        
        # Test public song
        public_song = Song('Public Song', author.id, 'Public content', share_settings='public')
        db.session.add(public_song)
        
        db.session.commit()
        
        # Author should have access to their own songs
        assert private_song.can_user_access(author.id)
        assert public_song.can_user_access(author.id)
        
        # Shared user should have access to shared private song
        assert private_song.can_user_access(shared_user.id)
        
        # Any user should have access to public song
        assert public_song.can_user_access(public_user.id)
        assert public_song.can_user_access(no_access_user.id)
        assert public_song.can_user_access(shared_user.id)
        
        # User without access should not have access to private song
        assert not private_song.can_user_access(no_access_user.id)
        assert not private_song.can_user_access(public_user.id)
        
        # Clean up
        db.session.delete(private_song)
        db.session.delete(public_song)
        db.session.delete(author)
        db.session.delete(shared_user)
        db.session.delete(public_user)
        db.session.delete(no_access_user)
        db.session.commit()


def test_song_share_settings_options():
    """Test different share settings options."""
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        db.create_all()
        
        # Create user
        user = User('sharetest@example.com', 'TestPassword123')
        db.session.add(user)
        db.session.commit()
        
        # Test all share settings
        share_settings = ['private', 'public', 'link-shared']
        
        for setting in share_settings:
            song = Song(f'{setting.capitalize()} Song', user.id, f'{setting} content', share_settings=setting)
            db.session.add(song)
            db.session.commit()
            
            assert song.share_settings == setting
            song_dict = song.to_dict()
            assert song_dict['share_settings'] == setting
            
            db.session.delete(song)
        
        # Clean up
        db.session.delete(user)
        db.session.commit()


def test_song_sharing_to_dict():
    """Test that sharing fields are properly included in to_dict output."""
    from chordme import app, db
    from chordme.models import User, Song
    
    with app.app_context():
        db.create_all()
        
        # Create users
        author = User('dictauthor@example.com', 'TestPassword123')
        user1 = User('dictuser1@example.com', 'TestPassword123')
        user2 = User('dictuser2@example.com', 'TestPassword123')
        
        db.session.add(author)
        db.session.add(user1)
        db.session.add(user2)
        db.session.commit()
        
        # Create song with complex sharing setup
        song = Song(
            'Complex Sharing Song',
            author.id,
            'Complex content',
            shared_with=[user1.id, user2.id],
            permissions={str(user1.id): 'read', str(user2.id): 'edit'},
            share_settings='link-shared'
        )
        db.session.add(song)
        db.session.commit()
        
        # Test to_dict includes all sharing fields
        song_dict = song.to_dict()
        
        assert 'shared_with' in song_dict
        assert 'permissions' in song_dict
        assert 'share_settings' in song_dict
        
        assert song_dict['shared_with'] == [user1.id, user2.id]
        assert song_dict['permissions'] == {str(user1.id): 'read', str(user2.id): 'edit'}
        assert song_dict['share_settings'] == 'link-shared'
        
        # Verify all original fields are still present
        required_fields = ['id', 'title', 'author_id', 'content', 'created_at', 'updated_at']
        for field in required_fields:
            assert field in song_dict
        
        # Clean up
        db.session.delete(song)
        db.session.delete(author)
        db.session.delete(user1)
        db.session.delete(user2)
        db.session.commit()