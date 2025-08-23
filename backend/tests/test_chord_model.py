"""Tests for the Chord model."""

import pytest
from chordme.models import User, Chord
from chordme import db


class TestChordModel:
    """Test the Chord database model."""
    
    def test_chord_creation(self, app):
        """Test creating a chord instance."""
        with app.app_context():
            # Create a user first
            user = User(email='test_chord_creation@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create a chord
            chord = Chord(
                name='Cmaj7',
                definition='x32000',
                user_id=user.id,
                description='Major 7th chord'
            )
            
            assert chord.name == 'Cmaj7'
            assert chord.definition == 'x32000'
            assert chord.user_id == user.id
            assert chord.description == 'Major 7th chord'
            assert chord.id is None  # Not saved yet
    
    def test_chord_creation_without_description(self, app):
        """Test creating a chord without description."""
        with app.app_context():
            # Create a user first
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create a chord without description
            chord = Chord(
                name='G',
                definition='320003',
                user_id=user.id
            )
            
            assert chord.name == 'G'
            assert chord.definition == '320003'
            assert chord.user_id == user.id
            assert chord.description is None
    
    def test_chord_database_save(self, app):
        """Test saving chord to database."""
        with app.app_context():
            # Create a user first
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create and save a chord
            chord = Chord(
                name='Cmaj7',
                definition='x32000',
                user_id=user.id,
                description='Major 7th chord'
            )
            db.session.add(chord)
            db.session.commit()
            
            # Verify it was saved
            assert chord.id is not None
            assert chord.created_at is not None
            assert chord.updated_at is not None
            
            # Verify we can retrieve it
            retrieved_chord = Chord.query.filter_by(id=chord.id).first()
            assert retrieved_chord is not None
            assert retrieved_chord.name == 'Cmaj7'
            assert retrieved_chord.definition == 'x32000'
            assert retrieved_chord.user_id == user.id
            assert retrieved_chord.description == 'Major 7th chord'
    
    def test_chord_to_dict(self, app):
        """Test converting chord to dictionary."""
        with app.app_context():
            # Create a user first
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create and save a chord
            chord = Chord(
                name='Cmaj7',
                definition='x32000',
                user_id=user.id,
                description='Major 7th chord'
            )
            db.session.add(chord)
            db.session.commit()
            
            # Convert to dict
            chord_dict = chord.to_dict()
            
            assert isinstance(chord_dict, dict)
            assert chord_dict['id'] == chord.id
            assert chord_dict['name'] == 'Cmaj7'
            assert chord_dict['definition'] == 'x32000'
            assert chord_dict['description'] == 'Major 7th chord'
            assert chord_dict['user_id'] == user.id
            assert 'created_at' in chord_dict
            assert 'updated_at' in chord_dict
            assert isinstance(chord_dict['created_at'], str)  # ISO format
            assert isinstance(chord_dict['updated_at'], str)  # ISO format
    
    def test_chord_to_dict_without_description(self, app):
        """Test converting chord without description to dictionary."""
        with app.app_context():
            # Create a user first
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create and save a chord without description
            chord = Chord(
                name='G',
                definition='320003',
                user_id=user.id
            )
            db.session.add(chord)
            db.session.commit()
            
            # Convert to dict
            chord_dict = chord.to_dict()
            
            assert chord_dict['description'] is None
    
    def test_chord_repr(self, app):
        """Test chord string representation."""
        with app.app_context():
            # Create a user first
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create a chord
            chord = Chord(
                name='Cmaj7',
                definition='x32000',
                user_id=user.id
            )
            
            assert str(chord) == '<Chord Cmaj7>'
            assert repr(chord) == '<Chord Cmaj7>'
    
    def test_chord_user_relationship(self, app):
        """Test the relationship between chord and user."""
        with app.app_context():
            # Create a user
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create multiple chords for the user
            chord1 = Chord(
                name='Cmaj7',
                definition='x32000',
                user_id=user.id
            )
            chord2 = Chord(
                name='G',
                definition='320003',
                user_id=user.id
            )
            
            db.session.add(chord1)
            db.session.add(chord2)
            db.session.commit()
            
            # Test backref - user should have chords
            assert len(user.chords) == 2
            assert chord1 in user.chords
            assert chord2 in user.chords
            
            # Test forward relationship - chord should have owner
            assert chord1.owner == user
            assert chord2.owner == user
    
    def test_chord_cascade_delete(self, app):
        """Test that chords are deleted when user is deleted."""
        with app.app_context():
            # Create a user
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            user_id = user.id
            
            # Create chords for the user
            chord1 = Chord(
                name='Cmaj7',
                definition='x32000',
                user_id=user.id
            )
            chord2 = Chord(
                name='G',
                definition='320003',
                user_id=user.id
            )
            
            db.session.add(chord1)
            db.session.add(chord2)
            db.session.commit()
            
            chord1_id = chord1.id
            chord2_id = chord2.id
            
            # Delete the user
            db.session.delete(user)
            db.session.commit()
            
            # Chords should be deleted too (cascade)
            remaining_chords = Chord.query.filter_by(user_id=user_id).all()
            assert len(remaining_chords) == 0
            
            # Verify specific chords are gone
            assert Chord.query.filter_by(id=chord1_id).first() is None
            assert Chord.query.filter_by(id=chord2_id).first() is None
    
    def test_chord_query_by_user(self, app):
        """Test querying chords by user."""
        with app.app_context():
            # Create two users
            user1 = User(email='user1@example.com', password='TestPassword123')
            user2 = User(email='user2@example.com', password='TestPassword123')
            db.session.add(user1)
            db.session.add(user2)
            db.session.commit()
            
            # Create chords for both users
            chord1 = Chord(name='C', definition='x32010', user_id=user1.id)
            chord2 = Chord(name='G', definition='320003', user_id=user1.id)
            chord3 = Chord(name='Am', definition='x02210', user_id=user2.id)
            
            db.session.add(chord1)
            db.session.add(chord2)
            db.session.add(chord3)
            db.session.commit()
            
            # Query chords for user1
            user1_chords = Chord.query.filter_by(user_id=user1.id).all()
            assert len(user1_chords) == 2
            chord_names = [chord.name for chord in user1_chords]
            assert 'C' in chord_names
            assert 'G' in chord_names
            assert 'Am' not in chord_names
            
            # Query chords for user2
            user2_chords = Chord.query.filter_by(user_id=user2.id).all()
            assert len(user2_chords) == 1
            assert user2_chords[0].name == 'Am'
    
    def test_chord_unique_name_per_user(self, app):
        """Test that chord names are unique per user."""
        with app.app_context():
            # Create two users
            user1 = User(email='user1@example.com', password='TestPassword123')
            user2 = User(email='user2@example.com', password='TestPassword123')
            db.session.add(user1)
            db.session.add(user2)
            db.session.commit()
            
            # Both users can have chords with the same name
            chord1 = Chord(name='Cmaj7', definition='x32000', user_id=user1.id)
            chord2 = Chord(name='Cmaj7', definition='x35453', user_id=user2.id)
            
            db.session.add(chord1)
            db.session.add(chord2)
            db.session.commit()
            
            # Both should be saved successfully
            assert chord1.id is not None
            assert chord2.id is not None
            assert chord1.id != chord2.id
            
            # Verify they exist in database
            user1_chord = Chord.query.filter_by(user_id=user1.id, name='Cmaj7').first()
            user2_chord = Chord.query.filter_by(user_id=user2.id, name='Cmaj7').first()
            
            assert user1_chord is not None
            assert user2_chord is not None
            assert user1_chord.definition == 'x32000'
            assert user2_chord.definition == 'x35453'
    
    def test_chord_timestamps(self, app):
        """Test that timestamps are properly set."""
        with app.app_context():
            # Create a user
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()
            
            # Create a chord
            chord = Chord(
                name='Cmaj7',
                definition='x32000',
                user_id=user.id
            )
            db.session.add(chord)
            db.session.commit()
            
            # Check timestamps are set
            assert chord.created_at is not None
            assert chord.updated_at is not None
            
            original_created_at = chord.created_at
            original_updated_at = chord.updated_at
            
            # Update the chord
            import time
            time.sleep(0.01)  # Small delay to ensure different timestamp
            chord.definition = 'x35453'
            db.session.commit()
            
            # created_at should remain the same, updated_at should change
            assert chord.created_at == original_created_at
            assert chord.updated_at > original_updated_at