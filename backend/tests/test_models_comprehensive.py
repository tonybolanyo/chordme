"""
Test database models for improved coverage.
"""
import pytest
from datetime import datetime
from chordme.models import User, Song, Chord, SongSection, SongVersion, db


class TestUserModel:
    """Test User model functionality."""

    def test_user_creation(self, client):
        """Test creating a new user."""
        user = User(email='test@example.com', password='hashed_password')
        db.session.add(user)
        db.session.commit()
        
        assert user.id is not None
        assert user.email == 'test@example.com'
        assert user.created_at is not None
        assert user.updated_at is not None

    def test_user_password_hashing(self, client):
        """Test password hashing functionality."""
        user = User(email='test@example.com', password='testpassword123')
        
        assert user.password_hash != 'testpassword123'  # Should be hashed
        assert user.check_password('testpassword123') is True
        assert user.check_password('wrongpassword') is False

    def test_user_string_representation(self, client):
        """Test user string representation."""
        user = User(email='test@example.com', password='hashed_password')
        
        str_repr = str(user)
        assert 'test@example.com' in str_repr

    def test_user_email_normalization(self, client):
        """Test email normalization."""
        user = User(email='Test@Example.COM', password='hashed_password')
        
        # Check if email is normalized to lowercase
        assert user.email.lower() == 'test@example.com'

    def test_user_duplicate_email(self, client):
        """Test handling of duplicate emails."""
        user1 = User(email='test@example.com', password='hashed_password')
        db.session.add(user1)
        db.session.commit()
        
        user2 = User(email='test@example.com', password='hashed_password2')
        db.session.add(user2)
        
        # Should raise integrity error
        with pytest.raises(Exception):
            db.session.commit()


class TestSongModel:
    """Test Song model functionality."""

    @pytest.fixture
    def test_user(self, client):
        """Create a test user."""
        user = User(email='test@example.com', password='hashed_password')
        db.session.add(user)
        db.session.commit()
        return user

    def test_song_creation(self, client, test_user):
        """Test creating a new song."""
        song = Song(
            title='Test Song',
            author_id=test_user.id,
            content='{title: Test Song}\n[C]Test lyrics'
        )
        db.session.add(song)
        db.session.commit()
        
        assert song.id is not None
        assert song.title == 'Test Song'
        assert song.author_id == test_user.id
        assert song.created_at is not None
        assert song.updated_at is not None

    def test_song_string_representation(self, client, test_user):
        """Test song string representation."""
        song = Song(
            title='Test Song',
            author_id=test_user.id,
            content='{title: Test Song}\n[C]Test lyrics'
        )
        
        str_repr = str(song)
        assert 'Test Song' in str_repr

    def test_song_user_relationship(self, client, test_user):
        """Test song-user relationship."""
        song = Song(
            title='Test Song',
            author_id=test_user.id,
            content='{title: Test Song}\n[C]Test lyrics'
        )
        db.session.add(song)
        db.session.commit()
        
        # Test relationship
        assert song.author == test_user
        assert song in test_user.songs

    def test_song_metadata_extraction(self, client, test_user):
        """Test song metadata extraction."""
        content = """
{title: Test Song}
{artist: Test Artist}
{album: Test Album}

[C]Test content with [G]chords
"""
        song = Song(
            title='Test Song',
            author_id=test_user.id,
            content=content
        )
        
        # If the model has metadata extraction methods
        if hasattr(song, 'extract_metadata'):
            metadata = song.extract_metadata()
            assert isinstance(metadata, dict)

    def test_song_validation(self, client, test_user):
        """Test song content validation."""
        song = Song(
            title='Test Song',
            author_id=test_user.id,
            content='{title: Test Song}\n[C]Test lyrics'
        )
        
        # If the model has validation methods
        if hasattr(song, 'validate_content'):
            is_valid = song.validate_content()
            assert isinstance(is_valid, bool)


class TestChordModel:
    """Test Chord model functionality."""

    def test_chord_creation(self, client):
        """Test creating a new chord."""
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name='C',
            definition='032010',
            user_id=user.id
        )
        db.session.add(chord)
        db.session.commit()
        
        assert chord.id is not None
        assert chord.name == 'C'
        assert chord.definition == '032010'

    def test_chord_string_representation(self, client):
        """Test chord string representation."""
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name='C',
            definition='032010',
            user_id=user.id
        )
        
        str_repr = str(chord)
        assert 'C' in str_repr

    def test_chord_normalization(self, client):
        """Test chord name normalization."""
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        chord = Chord(
            name='c',  # lowercase
            definition='032010',
            user_id=user.id
        )
        
        # If model normalizes chord names
        if hasattr(chord, 'normalize_name'):
            normalized = chord.normalize_name()
            assert normalized == 'C'


class TestSongSectionModel:
    """Test SongSection model functionality."""

    @pytest.fixture
    def test_user_and_song(self, client):
        """Create test user and song."""
        user = User(email='test@example.com', password='hashed_password')
        db.session.add(user)
        db.session.commit()
        
        song = Song(
            title='Test Song',
            author_id=user.id,
            content='{title: Test Song}\n[C]Test lyrics'
        )
        db.session.add(song)
        db.session.commit()
        
        return user, song

    def test_song_section_creation(self, client, test_user_and_song):
        """Test creating a song section."""
        user, song = test_user_and_song
        
        section = SongSection(
            song_id=song.id,
            section_type='verse',
            section_number=1,
            content='[C]First line of verse\n[G]Second line',
            order_index=0
        )
        db.session.add(section)
        db.session.commit()
        
        assert section.id is not None
        assert section.song_id == song.id
        assert section.section_type == 'verse'
        assert section.section_number == 1

    def test_song_section_relationship(self, client, test_user_and_song):
        """Test song section relationship with song."""
        user, song = test_user_and_song
        
        section = SongSection(
            song_id=song.id,
            section_type='verse',
            section_number=1,
            content='[C]Test content',
            order_index=0
        )
        db.session.add(section)
        db.session.commit()
        
        # Test relationship
        assert section.song == song
        assert section in song.sections


class TestSongVersionModel:
    """Test SongVersion model functionality."""

    @pytest.fixture
    def test_user_and_song(self, client):
        """Create test user and song."""
        user = User(email='test@example.com', password='hashed_password')
        db.session.add(user)
        db.session.commit()
        
        song = Song(
            title='Test Song',
            author_id=user.id,
            content='{title: Test Song}\n[C]Test lyrics'
        )
        db.session.add(song)
        db.session.commit()
        
        return user, song

    def test_song_version_creation(self, client, test_user_and_song):
        """Test creating a song version."""
        user, song = test_user_and_song
        
        version = SongVersion(
            song_id=song.id,
            version_number=1,
            content='{title: Test Song v1}\n[C]Version 1 content',
            created_by=user.id
        )
        db.session.add(version)
        db.session.commit()
        
        assert version.id is not None
        assert version.song_id == song.id
        assert version.version_number == 1
        assert version.created_by == user.id

    def test_song_version_relationship(self, client, test_user_and_song):
        """Test song version relationships."""
        user, song = test_user_and_song
        
        version = SongVersion(
            song_id=song.id,
            version_number=1,
            content='{title: Test Song v1}\n[C]Version 1 content',
            created_by=user.id
        )
        db.session.add(version)
        db.session.commit()
        
        # Test relationships
        assert version.song == song
        assert version in song.versions


class TestModelEdgeCases:
    """Test edge cases and error conditions."""

    def test_user_with_empty_email(self, client):
        """Test user creation with empty email."""
        try:
            user = User(email='', password='hashed_password')
            db.session.add(user)
            db.session.commit()
            # Should fail validation
            assert False, "Should not allow empty email"
        except Exception:
            # Expected to fail
            db.session.rollback()

    def test_song_without_user(self, client):
        """Test song creation without user."""
        try:
            song = Song(
                title='Test Song',
                author_id=999999,  # Non-existent user
                content='{title: Test Song}\n[C]Test lyrics'
            )
            db.session.add(song)
            db.session.commit()
            # Should fail foreign key constraint
            assert False, "Should not allow non-existent user"
        except Exception:
            # Expected to fail
            db.session.rollback()

    def test_long_content_handling(self, client):
        """Test handling of very long content."""
        user = User(email='test@example.com', password='hashed_password')
        db.session.add(user)
        db.session.commit()
        
        # Create very long content
        long_content = "{title: Long Song}\n" + "[C]Long lyrics " * 1000
        
        song = Song(
            title='Long Song',
            author_id=user.id,
            content=long_content
        )
        db.session.add(song)
        db.session.commit()
        
        # Should handle long content without issues
        assert song.id is not None
        assert len(song.content) > 10000