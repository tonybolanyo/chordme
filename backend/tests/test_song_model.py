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