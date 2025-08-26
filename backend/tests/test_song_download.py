"""
Test song download functionality.
"""

import pytest
from flask import Flask
import json
from chordme import app, db
from chordme.models import User, Song
from chordme.utils import generate_jwt_token


@pytest.fixture
def client():
    """Create a test client."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = 'test-secret'
    app.config['JWT_EXPIRATION_DELTA'] = 3600
    app.config['BCRYPT_ROUNDS'] = 4  # Lower rounds for faster testing
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


class TestSongDownload:
    """Test cases for song download functionality."""
    
    def setup_method(self):
        """Set up test data."""
        self.user_data = {
            'email': 'test@example.com',
            'password': 'Password123!'
        }
        self.song_data = {
            'title': 'Test Song',
            'content': '{title: Test Song}\n{artist: Test Artist}\n[C]Hello [G]world [Am]test [F]song'
        }
    
    def test_download_song_success(self, client):
        """Test successful song download."""
        # Create user
        user = User(email=self.user_data['email'], password=self.user_data['password'])
        db.session.add(user)
        db.session.commit()
        
        # Create song
        song = Song(title=self.song_data['title'], author_id=user.id, content=self.song_data['content'])
        db.session.add(song)
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        headers = {'Authorization': f'Bearer {token}'}
        
        # Download song
        response = client.get(f'/api/v1/songs/{song.id}/download', headers=headers)
        
        # Check response
        assert response.status_code == 200
        assert response.mimetype == 'text/plain'
        assert 'Content-Disposition' in response.headers
        assert 'attachment' in response.headers['Content-Disposition']
        assert 'Test-Song.cho' in response.headers['Content-Disposition']
        
        # Check content
        content = response.get_data(as_text=True)
        assert '{title: Test Song}' in content
        assert '[C]Hello [G]world [Am]test [F]song' in content
    
    def test_download_song_adds_title_directive(self, client):
        """Test that download adds title directive if missing."""
        # Create user
        user = User(email=self.user_data['email'], password=self.user_data['password'])
        db.session.add(user)
        db.session.commit()
        
        # Create song without title directive
        content_without_title = '[C]Hello [G]world [Am]test [F]song'
        song = Song(title='My Song Title', author_id=user.id, content=content_without_title)
        db.session.add(song)
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        headers = {'Authorization': f'Bearer {token}'}
        
        # Download song
        response = client.get(f'/api/v1/songs/{song.id}/download', headers=headers)
        
        # Check response
        assert response.status_code == 200
        content = response.get_data(as_text=True)
        assert '{title: My Song Title}' in content
        assert '[C]Hello [G]world [Am]test [F]song' in content
    
    def test_download_song_unauthorized(self, client):
        """Test song download without authentication."""
        # Create user and song
        user = User(email=self.user_data['email'], password=self.user_data['password'])
        db.session.add(user)
        db.session.commit()
        
        song = Song(title=self.song_data['title'], author_id=user.id, content=self.song_data['content'])
        db.session.add(song)
        db.session.commit()
        
        # Try to download without token
        response = client.get(f'/api/v1/songs/{song.id}/download')
        
        # Check response
        assert response.status_code == 401
        data = json.loads(response.get_data())
        assert data['status'] == 'error'
    
    def test_download_song_not_found(self, client):
        """Test download of non-existent song."""
        # Create user
        user = User(email=self.user_data['email'], password=self.user_data['password'])
        db.session.add(user)
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        headers = {'Authorization': f'Bearer {token}'}
        
        # Try to download non-existent song
        response = client.get('/api/v1/songs/999/download', headers=headers)
        
        # Check response
        assert response.status_code == 404
        data = json.loads(response.get_data())
        assert data['status'] == 'error'
        assert 'Song not found' in data['error']['message']
    
    def test_download_song_not_owned(self, client):
        """Test download of song owned by another user."""
        # Create two users
        user1 = User(email='user1@example.com', password=self.user_data['password'])
        user2 = User(email='user2@example.com', password=self.user_data['password'])
        db.session.add(user1)
        db.session.add(user2)
        db.session.commit()
        
        # Create song owned by user1
        song = Song(title=self.song_data['title'], author_id=user1.id, content=self.song_data['content'])
        db.session.add(song)
        db.session.commit()
        
        # Generate JWT token for user2
        token = generate_jwt_token(user2.id)
        headers = {'Authorization': f'Bearer {token}'}
        
        # Try to download song as user2
        response = client.get(f'/api/v1/songs/{song.id}/download', headers=headers)
        
        # Check response
        assert response.status_code == 404
        data = json.loads(response.get_data())
        assert data['status'] == 'error'
        assert 'Song not found' in data['error']['message']
    
    def test_download_filename_sanitization(self, client):
        """Test that special characters in song title are sanitized for filename."""
        # Create user
        user = User(email=self.user_data['email'], password=self.user_data['password'])
        db.session.add(user)
        db.session.commit()
        
        # Create song with special characters in title
        song = Song(title='My/Song*Title?<>|', author_id=user.id, content=self.song_data['content'])
        db.session.add(song)
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        headers = {'Authorization': f'Bearer {token}'}
        
        # Download song
        response = client.get(f'/api/v1/songs/{song.id}/download', headers=headers)
        
        # Check response
        assert response.status_code == 200
        assert 'Content-Disposition' in response.headers
        
        # Check that filename is sanitized
        content_disposition = response.headers['Content-Disposition']
        assert 'MySongTitle.cho' in content_disposition
        assert '/' not in content_disposition
        assert '*' not in content_disposition
        assert '?' not in content_disposition