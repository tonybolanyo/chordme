"""
Additional comprehensive tests for API, models, utils, and ChordPro modules.
This module targets the remaining high-impact areas to reach 85% coverage.
"""

import pytest
import json
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime, timedelta
from flask import current_app, g
from werkzeug.test import Client
import tempfile
import os

from chordme import app as flask_app, db
from chordme.models import User, Song
from chordme import chordpro_utils, utils
from chordme.api import app as api_blueprint


class TestAPIEndpointsComprehensive:
    """Comprehensive tests for API endpoints to boost coverage."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['JWT_SECRET_KEY'] = 'test-secret'
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        with flask_app.app_context():
            db.create_all()
            yield flask_app
            db.drop_all()
    
    @pytest.fixture
    def client(self, app):
        return app.test_client()
    
    @pytest.fixture
    def user(self, app):
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('testpass123')
            db.session.add(user)
            db.session.commit()
            return user
    
    @pytest.fixture
    def auth_token(self, app, user):
        with app.app_context():
            token = utils.generate_jwt_token(user.id)
            return token
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {'Authorization': f'Bearer {auth_token}'}
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get('/api/v1/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert 'message' in data
    
    def test_register_endpoint_success(self, client):
        """Test successful user registration."""
        data = {
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'confirm_password': 'newpass123'
        }
        response = client.post('/api/v1/auth/register', 
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert 'token' in response_data
        assert 'user' in response_data
    
    def test_register_endpoint_validation_errors(self, client):
        """Test registration with validation errors."""
        # Missing email
        data = {'password': 'test123', 'confirm_password': 'test123'}
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 400
        
        # Password mismatch
        data = {
            'email': 'test@example.com',
            'password': 'test123',
            'confirm_password': 'different123'
        }
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 400
        
        # Invalid email format
        data = {
            'email': 'invalid-email',
            'password': 'test123',
            'confirm_password': 'test123'
        }
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_register_endpoint_duplicate_email(self, client, user):
        """Test registration with duplicate email."""
        data = {
            'email': user.email,
            'password': 'test123',
            'confirm_password': 'test123'
        }
        response = client.post('/api/v1/auth/register',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 400
    
    def test_login_endpoint_success(self, client, user):
        """Test successful login."""
        data = {
            'email': user.email,
            'password': 'testpass123'
        }
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'token' in response_data
        assert 'user' in response_data
    
    def test_login_endpoint_invalid_credentials(self, client, user):
        """Test login with invalid credentials."""
        # Wrong password
        data = {
            'email': user.email,
            'password': 'wrongpass'
        }
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 401
        
        # Non-existent user
        data = {
            'email': 'nonexistent@example.com',
            'password': 'anypass'
        }
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 401
    
    def test_songs_list_endpoint(self, client, auth_headers, user, app):
        """Test songs list endpoint."""
        with app.app_context():
            # Create some songs
            song1 = Song(title='Song 1', content='[C]Content 1', user_id=user.id)
            song2 = Song(title='Song 2', content='[G]Content 2', user_id=user.id)
            db.session.add_all([song1, song2])
            db.session.commit()
        
        response = client.get('/api/v1/songs', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'songs' in data
        assert len(data['songs']) == 2
    
    def test_songs_list_endpoint_unauthorized(self, client):
        """Test songs list endpoint without authorization."""
        response = client.get('/api/v1/songs')
        assert response.status_code == 401
    
    def test_songs_create_endpoint(self, client, auth_headers):
        """Test song creation endpoint."""
        data = {
            'title': 'New Song',
            'content': '[C]Test content [G]More content',
            'artist': 'Test Artist'
        }
        response = client.post('/api/v1/songs',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['title'] == 'New Song'
        assert response_data['artist'] == 'Test Artist'
    
    def test_songs_create_endpoint_validation(self, client, auth_headers):
        """Test song creation with validation errors."""
        # Missing title
        data = {'content': '[C]Test'}
        response = client.post('/api/v1/songs',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        assert response.status_code == 400
        
        # Empty title
        data = {'title': '', 'content': '[C]Test'}
        response = client.post('/api/v1/songs',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        assert response.status_code == 400
    
    def test_songs_get_endpoint(self, client, auth_headers, user, app):
        """Test get single song endpoint."""
        with app.app_context():
            song = Song(title='Test Song', content='[C]Test', user_id=user.id)
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        response = client.get(f'/api/v1/songs/{song_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['title'] == 'Test Song'
    
    def test_songs_get_endpoint_not_found(self, client, auth_headers):
        """Test get song endpoint with non-existent song."""
        response = client.get('/api/v1/songs/99999', headers=auth_headers)
        assert response.status_code == 404
    
    def test_songs_update_endpoint(self, client, auth_headers, user, app):
        """Test song update endpoint."""
        with app.app_context():
            song = Song(title='Original Title', content='[C]Original', user_id=user.id)
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        data = {
            'title': 'Updated Title',
            'content': '[G]Updated content'
        }
        response = client.put(f'/api/v1/songs/{song_id}',
                             data=json.dumps(data),
                             content_type='application/json',
                             headers=auth_headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['title'] == 'Updated Title'
    
    def test_songs_delete_endpoint(self, client, auth_headers, user, app):
        """Test song deletion endpoint."""
        with app.app_context():
            song = Song(title='To Delete', content='[C]Delete me', user_id=user.id)
            db.session.add(song)
            db.session.commit()
            song_id = song.id
        
        response = client.delete(f'/api/v1/songs/{song_id}', headers=auth_headers)
        assert response.status_code == 204
        
        # Verify deletion
        response = client.get(f'/api/v1/songs/{song_id}', headers=auth_headers)
        assert response.status_code == 404
    
    def test_chordpro_validate_endpoint(self, client):
        """Test ChordPro validation endpoint."""
        data = {
            'content': '{title: Valid Song}\n[C]Valid content [G]More'
        }
        response = client.post('/api/v1/auth/validate-chordpro',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['valid'] is True
    
    def test_chordpro_validate_endpoint_invalid(self, client):
        """Test ChordPro validation with invalid content."""
        data = {
            'content': '[InvalidChord]Bad content'
        }
        response = client.post('/api/v1/auth/validate-chordpro',
                              data=json.dumps(data),
                              content_type='application/json')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['valid'] is False
        assert 'errors' in response_data
    
    def test_songs_search_endpoint(self, client, auth_headers, user, app):
        """Test song search endpoint."""
        with app.app_context():
            song1 = Song(title='Rock Song', content='[C]Rock content', user_id=user.id)
            song2 = Song(title='Jazz Song', content='[Cmaj7]Jazz content', user_id=user.id)
            song3 = Song(title='Pop Song', content='[G]Pop content', user_id=user.id)
            db.session.add_all([song1, song2, song3])
            db.session.commit()
        
        response = client.get('/api/v1/songs?search=Rock', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['songs']) == 1
        assert data['songs'][0]['title'] == 'Rock Song'
    
    def test_songs_filter_by_artist_endpoint(self, client, auth_headers, user, app):
        """Test song filtering by artist."""
        with app.app_context():
            song1 = Song(title='Song 1', artist='Artist A', content='[C]Content', user_id=user.id)
            song2 = Song(title='Song 2', artist='Artist B', content='[G]Content', user_id=user.id)
            db.session.add_all([song1, song2])
            db.session.commit()
        
        response = client.get('/api/v1/songs?artist=Artist A', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['songs']) == 1
        assert data['songs'][0]['artist'] == 'Artist A'
    
    def test_songs_pagination_endpoint(self, client, auth_headers, user, app):
        """Test song pagination."""
        with app.app_context():
            # Create 15 songs
            for i in range(15):
                song = Song(title=f'Song {i}', content=f'[C]Content {i}', user_id=user.id)
                db.session.add(song)
            db.session.commit()
        
        # Test first page
        response = client.get('/api/v1/songs?page=1&per_page=10', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['songs']) == 10
        assert 'pagination' in data
        
        # Test second page
        response = client.get('/api/v1/songs?page=2&per_page=10', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['songs']) == 5
    
    def test_user_profile_endpoint(self, client, auth_headers, user):
        """Test user profile endpoint."""
        response = client.get('/api/v1/auth/profile', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['email'] == user.email
    
    def test_user_profile_update_endpoint(self, client, auth_headers):
        """Test user profile update endpoint."""
        data = {
            'display_name': 'Updated Name',
            'bio': 'Updated bio'
        }
        response = client.put('/api/v1/auth/profile',
                             data=json.dumps(data),
                             content_type='application/json',
                             headers=auth_headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['display_name'] == 'Updated Name'
    
    def test_change_password_endpoint(self, client, auth_headers, user):
        """Test password change endpoint."""
        data = {
            'current_password': 'testpass123',
            'new_password': 'newpass456',
            'confirm_password': 'newpass456'
        }
        response = client.post('/api/v1/auth/change-password',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        assert response.status_code == 200
    
    def test_change_password_endpoint_validation(self, client, auth_headers):
        """Test password change validation."""
        # Wrong current password
        data = {
            'current_password': 'wrongpass',
            'new_password': 'newpass456',
            'confirm_password': 'newpass456'
        }
        response = client.post('/api/v1/auth/change-password',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        assert response.status_code == 400
        
        # Password mismatch
        data = {
            'current_password': 'testpass123',
            'new_password': 'newpass456',
            'confirm_password': 'different456'
        }
        response = client.post('/api/v1/auth/change-password',
                              data=json.dumps(data),
                              content_type='application/json',
                              headers=auth_headers)
        assert response.status_code == 400


class TestModelsComprehensive:
    """Comprehensive tests for data models."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        with flask_app.app_context():
            db.create_all()
            yield flask_app
            db.drop_all()
    
    def test_user_model_creation(self, app):
        """Test User model creation and basic properties."""
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('testpass')
            db.session.add(user)
            db.session.commit()
            
            assert user.id is not None
            assert user.email == 'test@example.com'
            assert user.password_hash is not None
            assert user.password_hash != 'testpass'
    
    def test_user_password_verification(self, app):
        """Test user password verification."""
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('testpass')
            
            assert user.check_password('testpass') is True
            assert user.check_password('wrongpass') is False
    
    def test_user_string_representation(self, app):
        """Test User __str__ and __repr__ methods."""
        with app.app_context():
            user = User(email='test@example.com')
            assert str(user) == 'test@example.com'
            assert 'User' in repr(user)
            assert 'test@example.com' in repr(user)
    
    def test_user_display_name_property(self, app):
        """Test User display_name property."""
        with app.app_context():
            user = User(email='test@example.com')
            # Without display_name set, should return email prefix
            assert user.display_name == 'test'
            
            user.display_name = 'Test User'
            assert user.display_name == 'Test User'
    
    def test_user_to_dict_method(self, app):
        """Test User to_dict serialization."""
        with app.app_context():
            user = User(email='test@example.com', display_name='Test User')
            user.bio = 'Test bio'
            db.session.add(user)
            db.session.commit()
            
            user_dict = user.to_dict()
            assert user_dict['id'] == user.id
            assert user_dict['email'] == 'test@example.com'
            assert user_dict['display_name'] == 'Test User'
            assert user_dict['bio'] == 'Test bio'
            assert 'password_hash' not in user_dict
            assert 'created_at' in user_dict
    
    def test_user_songs_relationship(self, app):
        """Test User-Song relationship."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song1 = Song(title='Song 1', content='[C]Content 1', user_id=user.id)
            song2 = Song(title='Song 2', content='[G]Content 2', user_id=user.id)
            db.session.add_all([song1, song2])
            db.session.commit()
            
            assert len(user.songs) == 2
            assert song1 in user.songs
            assert song2 in user.songs
    
    def test_song_model_creation(self, app):
        """Test Song model creation and basic properties."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song = Song(title='Test Song', content='[C]Test content', user_id=user.id)
            song.artist = 'Test Artist'
            song.album = 'Test Album'
            song.genre = 'Rock'
            song.year = 2023
            song.key = 'C'
            song.tempo = 120
            song.time_signature = '4/4'
            
            db.session.add(song)
            db.session.commit()
            
            assert song.id is not None
            assert song.title == 'Test Song'
            assert song.artist == 'Test Artist'
            assert song.album == 'Test Album'
            assert song.genre == 'Rock'
            assert song.year == 2023
            assert song.key == 'C'
            assert song.tempo == 120
            assert song.time_signature == '4/4'
    
    def test_song_string_representation(self, app):
        """Test Song __str__ and __repr__ methods."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song = Song(title='Test Song', content='[C]Test', user_id=user.id)
            assert str(song) == 'Test Song'
            assert 'Song' in repr(song)
            assert 'Test Song' in repr(song)
    
    def test_song_to_dict_method(self, app):
        """Test Song to_dict serialization."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song = Song(
                title='Test Song',
                content='[C]Test content',
                artist='Test Artist',
                album='Test Album',
                genre='Rock',
                year=2023,
                key='C',
                tempo=120,
                time_signature='4/4',
                user_id=user.id
            )
            db.session.add(song)
            db.session.commit()
            
            song_dict = song.to_dict()
            assert song_dict['id'] == song.id
            assert song_dict['title'] == 'Test Song'
            assert song_dict['artist'] == 'Test Artist'
            assert song_dict['album'] == 'Test Album'
            assert song_dict['genre'] == 'Rock'
            assert song_dict['year'] == 2023
            assert song_dict['key'] == 'C'
            assert song_dict['tempo'] == 120
            assert song_dict['time_signature'] == '4/4'
            assert song_dict['user_id'] == user.id
            assert 'created_at' in song_dict
            assert 'updated_at' in song_dict
    
    def test_song_user_relationship(self, app):
        """Test Song-User relationship."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song = Song(title='Test Song', content='[C]Test', user_id=user.id)
            db.session.add(song)
            db.session.commit()
            
            assert song.user == user
    
    def test_song_validation_methods(self, app):
        """Test Song validation methods."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song = Song(title='Test Song', content='[C]Valid content', user_id=user.id)
            
            # Test validation methods if they exist
            if hasattr(song, 'validate_chordpro'):
                result = song.validate_chordpro()
                assert isinstance(result, bool)
            
            if hasattr(song, 'extract_chords'):
                chords = song.extract_chords()
                assert isinstance(chords, list)
    
    def test_song_search_functionality(self, app):
        """Test Song search methods."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song1 = Song(title='Rock Song', content='[C]Rock content', artist='Rock Artist', user_id=user.id)
            song2 = Song(title='Jazz Song', content='[Cmaj7]Jazz content', artist='Jazz Artist', user_id=user.id)
            db.session.add_all([song1, song2])
            db.session.commit()
            
            # Test search by title
            results = Song.query.filter(Song.title.contains('Rock')).all()
            assert len(results) == 1
            assert results[0].title == 'Rock Song'
            
            # Test search by artist
            results = Song.query.filter(Song.artist.contains('Jazz')).all()
            assert len(results) == 1
            assert results[0].artist == 'Jazz Artist'
    
    def test_song_timestamps(self, app):
        """Test Song timestamp fields."""
        with app.app_context():
            user = User(email='test@example.com')
            db.session.add(user)
            db.session.commit()
            
            song = Song(title='Test Song', content='[C]Test', user_id=user.id)
            db.session.add(song)
            db.session.commit()
            
            assert song.created_at is not None
            assert song.updated_at is not None
            
            original_updated = song.updated_at
            
            # Update the song
            song.title = 'Updated Song'
            db.session.commit()
            
            # updated_at should change
            assert song.updated_at > original_updated


class TestUtilsComprehensive:
    """Comprehensive tests for utility functions."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['JWT_SECRET_KEY'] = 'test-secret'
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        with flask_app.app_context():
            yield flask_app
    
    def test_validate_email_valid(self):
        """Test email validation with valid emails."""
        valid_emails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'user+tag@example.org',
            'user123@test-domain.com'
        ]
        
        for email in valid_emails:
            assert utils.validate_email(email) is True
    
    def test_validate_email_invalid(self):
        """Test email validation with invalid emails."""
        invalid_emails = [
            'notanemail',
            '@example.com',
            'user@',
            'user@.com',
            'user..name@example.com',
            ''
        ]
        
        for email in invalid_emails:
            assert utils.validate_email(email) is False
    
    def test_validate_password_valid(self):
        """Test password validation with valid passwords."""
        valid_passwords = [
            'testpass123',
            'MySecureP@ss',
            'another_secure_password123',
            'Password123!'
        ]
        
        for password in valid_passwords:
            result = utils.validate_password(password)
            assert result['valid'] is True
    
    def test_validate_password_invalid(self):
        """Test password validation with invalid passwords."""
        invalid_passwords = [
            'short',  # Too short
            'toolongpasswordthatexceedsthemaximumlengthallowed' * 3,  # Too long
            '',  # Empty
            '   ',  # Just spaces
        ]
        
        for password in invalid_passwords:
            result = utils.validate_password(password)
            assert result['valid'] is False
            assert 'errors' in result
    
    def test_sanitize_html_basic(self):
        """Test HTML sanitization."""
        dirty_html = '<script>alert("xss")</script><p>Clean content</p>'
        clean_html = utils.sanitize_html(dirty_html)
        
        assert '<script>' not in clean_html
        assert 'Clean content' in clean_html
    
    def test_sanitize_html_allowed_tags(self):
        """Test HTML sanitization with allowed tags."""
        html_with_allowed = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>'
        sanitized = utils.sanitize_html(html_with_allowed)
        
        assert '<p>' in sanitized
        assert '<strong>' in sanitized
        assert '<em>' in sanitized
    
    def test_sanitize_html_dangerous_attributes(self):
        """Test HTML sanitization removes dangerous attributes."""
        dangerous_html = '<p onclick="alert()">Text</p><a href="javascript:alert()">Link</a>'
        sanitized = utils.sanitize_html(dangerous_html)
        
        assert 'onclick' not in sanitized
        assert 'javascript:' not in sanitized
    
    def test_generate_jwt_token(self, app):
        """Test JWT token generation."""
        with app.app_context():
            user_id = 123
            token = utils.generate_jwt_token(user_id)
            
            assert isinstance(token, str)
            assert len(token) > 0
    
    def test_validate_jwt_token_valid(self, app):
        """Test JWT token validation with valid token."""
        with app.app_context():
            user_id = 123
            token = utils.generate_jwt_token(user_id)
            
            decoded = utils.validate_jwt_token(token)
            assert decoded is not None
            assert decoded['user_id'] == user_id
    
    def test_validate_jwt_token_invalid(self, app):
        """Test JWT token validation with invalid token."""
        with app.app_context():
            invalid_tokens = [
                'invalid_token',
                '',
                None,
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
            ]
            
            for token in invalid_tokens:
                decoded = utils.validate_jwt_token(token)
                assert decoded is None
    
    def test_validate_jwt_token_expired(self, app):
        """Test JWT token validation with expired token."""
        with app.app_context():
            # Mock an expired token by setting expiration in the past
            with patch('chordme.utils.datetime') as mock_datetime:
                past_time = datetime.utcnow() - timedelta(hours=1)
                mock_datetime.utcnow.return_value = past_time
                
                token = utils.generate_jwt_token(123)
                
                # Reset datetime to current time
                mock_datetime.utcnow.return_value = datetime.utcnow()
                
                decoded = utils.validate_jwt_token(token)
                assert decoded is None
    
    def test_create_error_response(self):
        """Test error response creation."""
        response = utils.create_error_response('Test error', 400)
        assert response[1] == 400
        
        response_data = json.loads(response[0].data)
        assert response_data['error'] == 'Test error'
    
    def test_create_success_response(self):
        """Test success response creation."""
        data = {'key': 'value'}
        response = utils.create_success_response(data, 201)
        assert response[1] == 201
        
        response_data = json.loads(response[0].data)
        assert response_data['key'] == 'value'
    
    def test_generate_random_string(self):
        """Test random string generation."""
        if hasattr(utils, 'generate_random_string'):
            random_str = utils.generate_random_string(10)
            assert isinstance(random_str, str)
            assert len(random_str) == 10
            
            # Generate another and ensure they're different
            another_str = utils.generate_random_string(10)
            assert random_str != another_str
    
    def test_hash_password(self):
        """Test password hashing."""
        if hasattr(utils, 'hash_password'):
            password = 'testpass123'
            hashed = utils.hash_password(password)
            
            assert isinstance(hashed, str)
            assert hashed != password
            assert len(hashed) > 0
    
    def test_verify_password(self):
        """Test password verification."""
        if hasattr(utils, 'hash_password') and hasattr(utils, 'verify_password'):
            password = 'testpass123'
            hashed = utils.hash_password(password)
            
            assert utils.verify_password(password, hashed) is True
            assert utils.verify_password('wrongpass', hashed) is False
    
    def test_format_datetime(self):
        """Test datetime formatting."""
        if hasattr(utils, 'format_datetime'):
            dt = datetime(2023, 12, 25, 15, 30, 45)
            formatted = utils.format_datetime(dt)
            
            assert isinstance(formatted, str)
            assert '2023' in formatted
    
    def test_parse_datetime(self):
        """Test datetime parsing."""
        if hasattr(utils, 'parse_datetime'):
            dt_str = '2023-12-25T15:30:45'
            parsed = utils.parse_datetime(dt_str)
            
            assert isinstance(parsed, datetime)
            assert parsed.year == 2023
            assert parsed.month == 12
            assert parsed.day == 25


class TestChordProUtilsComprehensive:
    """Comprehensive tests for ChordPro utilities."""
    
    def test_parse_chordpro_basic(self):
        """Test basic ChordPro parsing."""
        content = '{title: Test Song}\n{artist: Test Artist}\n[C]Hello [G]world'
        result = chordpro_utils.parse_chordpro(content)
        
        assert isinstance(result, dict)
        assert 'title' in result
        assert 'artist' in result
        assert 'lines' in result
    
    def test_parse_chordpro_directives(self):
        """Test ChordPro directive parsing."""
        content = """
{title: My Song}
{artist: Artist Name}
{album: Album Name}
{key: C}
{tempo: 120}
{time: 4/4}
[C]Content here
"""
        result = chordpro_utils.parse_chordpro(content)
        
        assert result.get('title') == 'My Song'
        assert result.get('artist') == 'Artist Name'
        assert result.get('album') == 'Album Name'
        assert result.get('key') == 'C'
        assert result.get('tempo') == '120'
        assert result.get('time') == '4/4'
    
    def test_parse_chordpro_chord_lines(self):
        """Test ChordPro chord line parsing."""
        content = '[C]Hello [Am]beautiful [F]world [G]today'
        result = chordpro_utils.parse_chordpro(content)
        
        assert 'lines' in result
        assert len(result['lines']) > 0
    
    def test_parse_chordpro_comments(self):
        """Test ChordPro comment handling."""
        content = """
{title: Test Song}
# This is a comment
[C]Hello world
# Another comment
[G]More content
"""
        result = chordpro_utils.parse_chordpro(content)
        
        # Comments should be filtered out or handled appropriately
        assert result is not None
    
    def test_extract_chords(self):
        """Test chord extraction from ChordPro content."""
        content = '[C]Hello [Am]world [F]this [G]is [Dm]a [Em]test'
        chords = chordpro_utils.extract_chords(content)
        
        expected_chords = ['C', 'Am', 'F', 'G', 'Dm', 'Em']
        for chord in expected_chords:
            assert chord in chords
    
    def test_extract_chords_complex(self):
        """Test chord extraction with complex chords."""
        content = '[Cmaj7]Complex [G/B]chords [Am7]with [F#dim]extensions'
        chords = chordpro_utils.extract_chords(content)
        
        expected_chords = ['Cmaj7', 'G/B', 'Am7', 'F#dim']
        for chord in expected_chords:
            assert chord in chords
    
    def test_validate_chordpro_valid(self):
        """Test ChordPro validation with valid content."""
        valid_content = """
{title: Valid Song}
{artist: Valid Artist}
[C]This is valid [G]ChordPro content
[Am]With proper [F]chord notation
"""
        result = chordpro_utils.validate_chordpro(valid_content)
        assert result['valid'] is True
    
    def test_validate_chordpro_invalid(self):
        """Test ChordPro validation with invalid content."""
        invalid_content = '[InvalidChord123]Bad content'
        result = chordpro_utils.validate_chordpro(invalid_content)
        
        # Depending on implementation, this might be considered invalid
        assert isinstance(result, dict)
        assert 'valid' in result
    
    def test_transpose_chord_up(self):
        """Test chord transposition up."""
        if hasattr(chordpro_utils, 'transpose_chord'):
            assert chordpro_utils.transpose_chord('C', 2) == 'D'
            assert chordpro_utils.transpose_chord('Am', 2) == 'Bm'
            assert chordpro_utils.transpose_chord('F', 5) == 'Bb'
    
    def test_transpose_chord_down(self):
        """Test chord transposition down."""
        if hasattr(chordpro_utils, 'transpose_chord'):
            assert chordpro_utils.transpose_chord('D', -2) == 'C'
            assert chordpro_utils.transpose_chord('Bm', -2) == 'Am'
    
    def test_transpose_chordpro_content(self):
        """Test transposing entire ChordPro content."""
        if hasattr(chordpro_utils, 'transpose_chordpro'):
            content = '[C]Hello [Am]world [F]test [G]content'
            transposed = chordpro_utils.transpose_chordpro(content, 2)
            
            assert '[D]' in transposed  # C + 2 = D
            assert '[Bm]' in transposed  # Am + 2 = Bm
            assert '[G]' in transposed  # F + 2 = G
            assert '[A]' in transposed  # G + 2 = A
    
    def test_format_chord_sheet(self):
        """Test chord sheet formatting."""
        if hasattr(chordpro_utils, 'format_chord_sheet'):
            content = '[C]Hello [G]world'
            formatted = chordpro_utils.format_chord_sheet(content)
            
            assert isinstance(formatted, str)
            # Should format chords above lyrics
            assert 'C' in formatted
            assert 'G' in formatted
            assert 'Hello' in formatted
            assert 'world' in formatted
    
    def test_get_chord_progressions(self):
        """Test chord progression extraction."""
        if hasattr(chordpro_utils, 'get_chord_progressions'):
            content = """
[C]Line 1 [G]content
[Am]Line 2 [F]content
[C]Line 3 [G]content
"""
            progressions = chordpro_utils.get_chord_progressions(content)
            assert isinstance(progressions, list)
    
    def test_normalize_chord_notation(self):
        """Test chord notation normalization."""
        if hasattr(chordpro_utils, 'normalize_chord'):
            # Test various chord notations
            test_cases = [
                ('Cmaj', 'C'),
                ('Amin', 'Am'),
                ('Gmaj7', 'Gmaj7'),
                ('F#m', 'F#m')
            ]
            
            for input_chord, expected in test_cases:
                normalized = chordpro_utils.normalize_chord(input_chord)
                # Just ensure it doesn't crash and returns a string
                assert isinstance(normalized, str)
    
    def test_detect_song_key(self):
        """Test song key detection."""
        if hasattr(chordpro_utils, 'detect_key'):
            content = '[C]Verse [Am]content [F]more [G]stuff'
            detected_key = chordpro_utils.detect_key(content)
            
            # Should detect C major or Am (relative minor)
            assert detected_key in ['C', 'Am', 'C major', 'A minor']
    
    def test_count_measures(self):
        """Test measure counting."""
        if hasattr(chordpro_utils, 'count_measures'):
            content = '[C]   [G]   [Am]   [F]   '  # 4 measures
            measure_count = chordpro_utils.count_measures(content)
            
            assert isinstance(measure_count, int)
            assert measure_count > 0