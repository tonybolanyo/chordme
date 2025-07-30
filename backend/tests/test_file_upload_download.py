"""
Test file upload and download functionality.
"""

import os
import io
import zipfile
import pytest
import json
from chordme import app, db
from chordme.models import User, Song


@pytest.fixture
def test_client():
    """Create a test client using the real chordme app."""
    with app.test_client() as client:
        with app.app_context():
            # Clear rate limiter state before each test
            from chordme.rate_limiter import rate_limiter
            rate_limiter.requests.clear()
            rate_limiter.blocked_ips.clear()
            
            db.create_all()
            try:
                yield client
            finally:
                db.session.remove()
                db.drop_all()


@pytest.fixture
def auth_token(test_client):
    """Create a user and return a valid JWT token for testing."""
    from chordme.utils import generate_jwt_token
    
    # Create a test user
    user_data = {
        'email': 'test@example.com',
        'password': 'TestPassword123'
    }
    
    # Register the user
    response = test_client.post('/api/v1/auth/register',
                          data=json.dumps(user_data),
                          content_type='application/json')
    
    assert response.status_code == 201
    
    # Get the user from database to get the ID
    user = User.query.filter_by(email='test@example.com').first()
    assert user is not None
    
    # Generate and return JWT token
    token = generate_jwt_token(user.id)
    assert token is not None
    
    return token


class TestFileUpload:
    """Test file upload endpoints."""
    
    def test_upload_valid_chordpro_file(self, test_client, auth_token):
        """Test uploading a valid ChordPro file."""
        # Create test file content
        chordpro_content = """{title: Test Song}
{artist: Test Artist}

[C]This is a test [G]song
[Am]With some [F]chords"""
        
        # Create file-like object
        file_data = io.BytesIO(chordpro_content.encode('utf-8'))
        
        # Upload file
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload', 
                             headers=headers,
                             data={'file': (file_data, 'test_song.cho')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'data' in data
        assert data['data']['title'] == 'Test Song'
        assert 'validation' in data['data']
        
        # Verify song was created in database
        song = Song.query.filter_by(title='Test Song').first()
        assert song is not None
        assert song.content == chordpro_content
    
    def test_upload_txt_file(self, test_client, auth_token):
        """Test uploading a text file."""
        content = "Simple song content\nWith lyrics"
        file_data = io.BytesIO(content.encode('utf-8'))
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={'file': (file_data, 'simple_song.txt')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['title'] == 'simple_song'
    
    def test_upload_no_file(self, test_client, auth_token):
        """Test upload with no file provided."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'No file provided' in data['error']
    
    def test_upload_empty_filename(self, test_client, auth_token):
        """Test upload with empty filename."""
        file_data = io.BytesIO(b"content")
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={'file': (file_data, '')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'No file selected' in data['error']
    
    def test_upload_invalid_file_extension(self, test_client, auth_token):
        """Test upload with invalid file extension."""
        file_data = io.BytesIO(b"content")
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={'file': (file_data, 'test.pdf')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Invalid file type' in data['error']
    
    def test_upload_empty_file(self, test_client, auth_token):
        """Test upload with empty file content."""
        file_data = io.BytesIO(b"")
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={'file': (file_data, 'empty.cho')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'File is empty' in data['error']
    
    def test_upload_file_too_large(self, test_client, auth_token):
        """Test upload with file content too large."""
        # Create content larger than 10,000 characters
        large_content = "x" * 10001
        file_data = io.BytesIO(large_content.encode('utf-8'))
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={'file': (file_data, 'large.cho')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'too large' in data['error']
    
    def test_upload_unauthorized(self, test_client):
        """Test upload without authentication."""
        file_data = io.BytesIO(b"content")
        
        response = test_client.post('/api/v1/songs/upload',
                             data={'file': (file_data, 'test.cho')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 401


class TestMultipleFileUpload:
    """Test multiple file upload endpoint."""
    
    def test_upload_multiple_valid_files(self, test_client, auth_token):
        """Test uploading multiple valid files."""
        # Create first file
        content1 = "{title: Song 1}\nContent 1"
        file1 = (io.BytesIO(content1.encode('utf-8')), 'song1.cho')
        
        # Create second file
        content2 = "{title: Song 2}\nContent 2"
        file2 = (io.BytesIO(content2.encode('utf-8')), 'song2.cho')
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload-multiple',
                             headers=headers,
                             data={'files': [file1, file2]},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['upload_count'] == 2
        assert len(data['data']['uploaded_songs']) == 2
        assert len(data['data']['errors']) == 0
    
    def test_upload_multiple_with_errors(self, test_client, auth_token):
        """Test uploading multiple files with some errors."""
        # Valid file
        content1 = "{title: Song 1}\nContent 1"
        file1 = (io.BytesIO(content1.encode('utf-8')), 'song1.cho')
        
        # Invalid file (wrong extension)
        file2 = (io.BytesIO(b"content"), 'invalid.pdf')
        
        # Empty file
        file3 = (io.BytesIO(b""), 'empty.cho')
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload-multiple',
                             headers=headers,
                             data={'files': [file1, file2, file3]},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['upload_count'] == 1
        assert len(data['data']['uploaded_songs']) == 1
        assert len(data['data']['errors']) == 2
    
    def test_upload_too_many_files(self, test_client, auth_token):
        """Test uploading too many files."""
        files = []
        
        # Create 11 files (max is 10)
        for i in range(11):
            content = f"Content {i}"
            files.append((io.BytesIO(content.encode('utf-8')), f'song{i}.cho'))
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload-multiple',
                             headers=headers,
                             data={'files': files},
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Too many files' in data['error']


class TestBulkDownload:
    """Test bulk download functionality."""
    
    def test_download_all_songs_success(self, test_client, auth_token):
        """Test downloading all user songs as ZIP."""
        # Create test songs in database
        user = User.query.filter_by(email='test@example.com').first()
        user_id = user.id
        
        song1 = Song(title="Test Song 1", author_id=user_id, content="{title: Test Song 1}\nContent 1")
        song2 = Song(title="Test Song 2", author_id=user_id, content="{title: Test Song 2}\nContent 2")
        
        db.session.add(song1)
        db.session.add(song2)
        db.session.commit()
        
        # Download all songs
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.get('/api/v1/songs/download-all', headers=headers)
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/zip'
        assert 'attachment' in response.headers['Content-Disposition']
        assert 'chordme_songs_' in response.headers['Content-Disposition']
        
        # Verify ZIP content
        zip_data = io.BytesIO(response.data)
        with zipfile.ZipFile(zip_data, 'r') as zip_file:
            filenames = zip_file.namelist()
            assert len(filenames) == 2
            assert any('Test-Song-1.cho' in name for name in filenames)
            assert any('Test-Song-2.cho' in name for name in filenames)
            
            # Check file contents
            for filename in filenames:
                content = zip_file.read(filename).decode('utf-8')
                assert '{title:' in content
    
    def test_download_all_songs_no_songs(self, test_client, auth_token):
        """Test downloading when user has no songs."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.get('/api/v1/songs/download-all', headers=headers)
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'No songs found' in data['error']
    
    def test_download_all_unauthorized(self, test_client):
        """Test bulk download without authentication."""
        response = test_client.get('/api/v1/songs/download-all')
        assert response.status_code == 401


class TestFileUploadSecurity:
    """Test security aspects of file upload."""
    
    def test_upload_malicious_filename(self, test_client, auth_token):
        """Test upload with potentially malicious filename."""
        content = "Normal content"
        file_data = io.BytesIO(content.encode('utf-8'))
        malicious_filename = "../../../etc/passwd.cho"
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={'file': (file_data, malicious_filename)},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        data = response.get_json()
        # Title should be sanitized
        assert '../' not in data['data']['title']
        assert 'passwd' in data['data']['title']  # But filename part should remain
    
    def test_upload_special_characters_in_title(self, test_client, auth_token):
        """Test upload with special characters that need sanitization."""
        content = '{title: Test<>:"/\\|?*Song}\nContent'
        file_data = io.BytesIO(content.encode('utf-8'))
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = test_client.post('/api/v1/songs/upload',
                             headers=headers,
                             data={'file': (file_data, 'test.cho')},
                             content_type='multipart/form-data')
        
        assert response.status_code == 201
        data = response.get_json()
        # Special characters should be removed from title
        assert '<' not in data['data']['title']
        assert '>' not in data['data']['title']
        assert '"' not in data['data']['title']
        assert 'TestSong' in data['data']['title']