"""Tests to verify foreign key constraints are properly enforced."""

import pytest
from chordme import app, db
from chordme.models import Song


@pytest.fixture
def test_client():
    """Create a test client using the real chordme app."""
    with app.test_client() as client:
        with app.app_context():
            # Clear rate limiter state before each test
            from chordme.rate_limiter import rate_limiter
            rate_limiter.requests.clear()
            rate_limiter.blocked_ips.clear()
            
            # Ensure foreign keys are enabled for this test session
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.session.commit()
            
            db.create_all()
            try:
                yield client
            finally:
                db.session.remove()
                db.drop_all()


class TestForeignKeyConstraints:
    """Test foreign key constraint enforcement."""

    def test_foreign_keys_are_enabled(self, test_client):
        """Test that foreign key constraints are enabled."""
        result = db.session.execute(db.text("PRAGMA foreign_keys;")).fetchone()
        assert result[0] == 1, "Foreign key constraints should be enabled"

    def test_song_creation_with_invalid_user_id_fails(self, test_client):
        """Test that creating a song with non-existent user ID fails."""
        with pytest.raises(Exception) as exc_info:
            # Try to create song with non-existent user ID
            song = Song('Test Song', 99999, 'Test content')
            db.session.add(song)
            db.session.commit()
        
        # Should raise an integrity error due to foreign key constraint
        assert "FOREIGN KEY constraint failed" in str(exc_info.value)

    def test_song_creation_with_valid_user_id_succeeds(self, test_client):
        """Test that creating a song with valid user ID succeeds."""
        from chordme.models import User
        
        # Create a valid user first
        user = User('test@example.com', 'Password123')
        db.session.add(user)
        db.session.commit()
        
        # Now create a song with valid user ID
        song = Song('Test Song', user.id, 'Test content')
        db.session.add(song)
        db.session.commit()
        
        # Should succeed
        assert song.id is not None
        assert song.author_id == user.id