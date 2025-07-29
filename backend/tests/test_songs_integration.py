"""
Integration tests for song CRUD endpoints using the real Flask app.
Tests the complete song functionality including authentication and CRUD operations.
"""

import pytest
import json
import tempfile
import os
from chordme import app, db
from chordme.models import User, Song
from chordme.utils import generate_jwt_token


class TestSongEndpoints:
    """Integration tests for song CRUD endpoints."""
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Set up test database and clean up after each test."""
        # Create a temporary database file
        self.db_fd, self.db_path = tempfile.mkstemp()
        
        # Configure app for testing
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.db_path}'
        app.config['WTF_CSRF_ENABLED'] = False
        app.config['RATE_LIMITING_ENABLED'] = False  # Disable rate limiting for tests
        
        with app.app_context():
            db.create_all()
            yield
            db.drop_all()
        
        # Clean up
        os.close(self.db_fd)
        os.unlink(self.db_path)
    
    def create_test_user(self):
        """Create a test user and return user object and auth headers."""
        with app.app_context():
            user = User(email='test@example.com', password='Test123!')
            db.session.add(user)
            db.session.commit()
            
            token = generate_jwt_token(user.id)
            headers = {'Authorization': f'Bearer {token}'}
            
            return user, headers
    
    def test_song_authentication_required(self):
        """Test that all song endpoints require authentication."""
        with app.test_client() as client:
            # Test CREATE without auth
            response = client.post('/api/v1/songs', 
                                 json={'title': 'Test', 'content': 'Test'})
            assert response.status_code == 401
            
            # Test LIST without auth
            response = client.get('/api/v1/songs')
            assert response.status_code == 401
            
            # Test GET without auth
            response = client.get('/api/v1/songs/1')
            assert response.status_code == 401
            
            # Test UPDATE without auth
            response = client.put('/api/v1/songs/1', json={'title': 'Updated'})
            assert response.status_code == 401
            
            # Test DELETE without auth
            response = client.delete('/api/v1/songs/1')
            assert response.status_code == 401
    
    def test_song_creation_success(self):
        """Test successful song creation."""
        user, headers = self.create_test_user()
        
        with app.test_client() as client:
            song_data = {
                'title': 'My Test Song',
                'content': '[Verse]\nThis is a test song'
            }
            
            response = client.post('/api/v1/songs', 
                                 json=song_data, 
                                 headers=headers)
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['status'] == 'success'
            assert data['data']['title'] == song_data['title']
            assert data['data']['content'] == song_data['content']
            assert 'id' in data['data']
    
    def test_song_creation_validation(self):
        """Test song creation validation."""
        user, headers = self.create_test_user()
        
        with app.test_client() as client:
            # Test missing title
            response = client.post('/api/v1/songs', 
                                 json={'content': 'Test content'}, 
                                 headers=headers)
            assert response.status_code == 400
            data = response.get_json()
            assert 'Title is required' in data['error']
            
            # Test missing content
            response = client.post('/api/v1/songs', 
                                 json={'title': 'Test Song'}, 
                                 headers=headers)
            assert response.status_code == 400
            data = response.get_json()
            assert 'Content is required' in data['error']
            
            # Test empty title
            response = client.post('/api/v1/songs', 
                                 json={'title': '   ', 'content': 'Test'}, 
                                 headers=headers)
            assert response.status_code == 400
            
            # Test title too long
            response = client.post('/api/v1/songs', 
                                 json={'title': 'a' * 201, 'content': 'Test'}, 
                                 headers=headers)
            assert response.status_code == 400
    
    def test_song_listing(self):
        """Test song listing."""
        user, headers = self.create_test_user()
        
        with app.app_context():
            # Create test songs
            song1 = Song(title='First Song', author_id=user.id, content='First content')
            song2 = Song(title='Second Song', author_id=user.id, content='Second content')
            db.session.add_all([song1, song2])
            db.session.commit()
        
        with app.test_client() as client:
            response = client.get('/api/v1/songs', headers=headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'success'
            assert len(data['data']['songs']) == 2
            assert data['data']['pagination']['total'] == 2
    
    def test_song_retrieval(self):
        """Test individual song retrieval."""
        user, headers = self.create_test_user()
        
        with app.app_context():
            song = Song(title='Test Song', author_id=user.id, content='Test content')
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        with app.test_client() as client:
            # Test successful retrieval
            response = client.get(f'/api/v1/songs/{song_id}', headers=headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['title'] == 'Test Song'
            assert data['data']['content'] == 'Test content'
            
            # Test non-existent song
            response = client.get('/api/v1/songs/999', headers=headers)
            assert response.status_code == 404
    
    def test_song_update(self):
        """Test song update."""
        user, headers = self.create_test_user()
        
        with app.app_context():
            song = Song(title='Original Title', author_id=user.id, content='Original content')
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        with app.test_client() as client:
            # Test successful update
            update_data = {
                'title': 'Updated Title',
                'content': 'Updated content'
            }
            
            response = client.put(f'/api/v1/songs/{song_id}', 
                                json=update_data, 
                                headers=headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['title'] == 'Updated Title'
            assert data['data']['content'] == 'Updated content'
            
            # Test partial update (only title)
            response = client.put(f'/api/v1/songs/{song_id}', 
                                json={'title': 'Partial Update'}, 
                                headers=headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['title'] == 'Partial Update'
            assert data['data']['content'] == 'Updated content'  # Should remain unchanged
    
    def test_song_deletion(self):
        """Test song deletion."""
        user, headers = self.create_test_user()
        
        with app.app_context():
            song = Song(title='To Delete', author_id=user.id, content='Delete me')
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        with app.test_client() as client:
            # Test successful deletion
            response = client.delete(f'/api/v1/songs/{song_id}', headers=headers)
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'success'
            assert data['message'] == 'Song deleted successfully'
            
            # Verify song is deleted
            response = client.get(f'/api/v1/songs/{song_id}', headers=headers)
            assert response.status_code == 404
    
    def test_user_isolation(self):
        """Test that users can only access their own songs."""
        # Create two users
        with app.app_context():
            user1 = User(email='user1@test.com', password='Test123!')
            user2 = User(email='user2@test.com', password='Test123!')
            db.session.add_all([user1, user2])
            db.session.commit()
            
            # Create songs for each user
            song1 = Song(title='User 1 Song', author_id=user1.id, content='User 1 content')
            song2 = Song(title='User 2 Song', author_id=user2.id, content='User 2 content')
            db.session.add_all([song1, song2])
            db.session.commit()
            
            # Generate tokens
            token1 = generate_jwt_token(user1.id)
            token2 = generate_jwt_token(user2.id)
            
            headers1 = {'Authorization': f'Bearer {token1}'}
            headers2 = {'Authorization': f'Bearer {token2}'}
            
            user1_song_id = song1.id
            user2_song_id = song2.id
        
        with app.test_client() as client:
            # User 1 should only see their own song
            response = client.get('/api/v1/songs', headers=headers1)
            assert response.status_code == 200
            data = response.get_json()
            assert len(data['data']['songs']) == 1
            assert data['data']['songs'][0]['title'] == 'User 1 Song'
            
            # User 1 should not be able to access User 2's song
            response = client.get(f'/api/v1/songs/{user2_song_id}', headers=headers1)
            assert response.status_code == 404
            
            # User 1 should not be able to update User 2's song
            response = client.put(f'/api/v1/songs/{user2_song_id}', 
                                json={'title': 'Hacked'}, 
                                headers=headers1)
            assert response.status_code == 404
            
            # User 1 should not be able to delete User 2's song
            response = client.delete(f'/api/v1/songs/{user2_song_id}', headers=headers1)
            assert response.status_code == 404
    
    def test_complete_song_lifecycle(self):
        """Test complete CRUD lifecycle for a song."""
        user, headers = self.create_test_user()
        
        with app.test_client() as client:
            # Create song
            create_data = {
                'title': 'Lifecycle Song',
                'content': '[Verse]\nTest song for lifecycle'
            }
            
            response = client.post('/api/v1/songs', 
                                 json=create_data, 
                                 headers=headers)
            assert response.status_code == 201
            song_id = response.get_json()['data']['id']
            
            # Read song
            response = client.get(f'/api/v1/songs/{song_id}', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['title'] == 'Lifecycle Song'
            
            # Update song
            update_data = {
                'title': 'Updated Lifecycle Song',
                'content': '[Verse]\nUpdated test song'
            }
            
            response = client.put(f'/api/v1/songs/{song_id}', 
                                json=update_data, 
                                headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['title'] == 'Updated Lifecycle Song'
            
            # Verify update in list
            response = client.get('/api/v1/songs', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert len(data['data']['songs']) == 1
            assert data['data']['songs'][0]['title'] == 'Updated Lifecycle Song'
            
            # Delete song
            response = client.delete(f'/api/v1/songs/{song_id}', headers=headers)
            assert response.status_code == 200
            
            # Verify deletion
            response = client.get('/api/v1/songs', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert len(data['data']['songs']) == 0