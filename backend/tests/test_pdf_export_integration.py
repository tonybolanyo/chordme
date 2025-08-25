"""
Integration tests for PDF export endpoint.
"""

import pytest
import json
from io import BytesIO
from chordme import app, db
from chordme.models import User, Song


class TestPDFExportEndpoint:
    """Test cases for the PDF export API endpoint."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
                db.drop_all()
    
    @pytest.fixture
    def auth_headers(self, client):
        """Create authenticated user and return auth headers."""
        # Register user
        user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        client.post('/api/v1/auth/register', 
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        # Login user
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        token = response.get_json()['data']['token']
        return {'Authorization': f'Bearer {token}'}
    
    @pytest.fixture
    def sample_song(self, client, auth_headers):
        """Create a sample song for testing."""
        song_data = {
            'title': 'Test Song',
            'artist': 'Test Artist',
            'content': """{title: Amazing Grace}
{artist: John Newton}
{key: G}

A[G]mazing [G7]grace how [C]sweet the [G]sound
That [Em]saved a [C]wretch like [G]me
I [G]once was [G7]lost but [C]now am [G]found
Was [Em]blind but [C]now I [G]see"""
        }
        
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        return response.get_json()['data']['id']
    
    def test_export_pdf_success(self, client, auth_headers, sample_song):
        """Test successful PDF export."""
        response = client.get(f'/api/v1/songs/{sample_song}/export/pdf',
                             headers=auth_headers)
        
        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
        assert 'Content-Disposition' in response.headers
        assert 'attachment' in response.headers['Content-Disposition']
        assert '.pdf' in response.headers['Content-Disposition']
        
        # Check PDF content
        pdf_data = response.data
        assert len(pdf_data) > 0
        assert pdf_data.startswith(b'%PDF')
    
    def test_export_pdf_with_paper_size(self, client, auth_headers, sample_song):
        """Test PDF export with different paper sizes."""
        for paper_size in ['a4', 'letter', 'legal']:
            response = client.get(f'/api/v1/songs/{sample_song}/export/pdf?paper_size={paper_size}',
                                 headers=auth_headers)
            
            assert response.status_code == 200
            assert response.content_type == 'application/pdf'
            
            pdf_data = response.data
            assert len(pdf_data) > 0
            assert pdf_data.startswith(b'%PDF')
    
    def test_export_pdf_with_orientation(self, client, auth_headers, sample_song):
        """Test PDF export with different orientations."""
        for orientation in ['portrait', 'landscape']:
            response = client.get(f'/api/v1/songs/{sample_song}/export/pdf?orientation={orientation}',
                                 headers=auth_headers)
            
            assert response.status_code == 200
            assert response.content_type == 'application/pdf'
            
            pdf_data = response.data
            assert len(pdf_data) > 0
            assert pdf_data.startswith(b'%PDF')
    
    def test_export_pdf_with_overrides(self, client, auth_headers, sample_song):
        """Test PDF export with title and artist overrides."""
        response = client.get(f'/api/v1/songs/{sample_song}/export/pdf?title=Override Title&artist=Override Artist',
                             headers=auth_headers)
        
        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
        
        pdf_data = response.data
        assert len(pdf_data) > 0
        assert pdf_data.startswith(b'%PDF')
    
    def test_export_pdf_invalid_paper_size(self, client, auth_headers, sample_song):
        """Test PDF export with invalid paper size."""
        response = client.get(f'/api/v1/songs/{sample_song}/export/pdf?paper_size=invalid',
                             headers=auth_headers)
        
        assert response.status_code == 400
        assert response.get_json()['status'] == 'error'
        assert 'Invalid paper size' in response.get_json()['error']
    
    def test_export_pdf_invalid_orientation(self, client, auth_headers, sample_song):
        """Test PDF export with invalid orientation."""
        response = client.get(f'/api/v1/songs/{sample_song}/export/pdf?orientation=invalid',
                             headers=auth_headers)
        
        assert response.status_code == 400
        assert response.get_json()['status'] == 'error'
        assert 'Invalid orientation' in response.get_json()['error']
    
    def test_export_pdf_nonexistent_song(self, client, auth_headers):
        """Test PDF export for nonexistent song."""
        response = client.get('/api/v1/songs/99999/export/pdf',
                             headers=auth_headers)
        
        assert response.status_code == 404
        assert response.get_json()['status'] == 'error'
        assert 'Song not found' in response.get_json()['error']
    
    def test_export_pdf_unauthorized(self, client, sample_song):
        """Test PDF export without authentication."""
        response = client.get(f'/api/v1/songs/{sample_song}/export/pdf')
        
        assert response.status_code == 401
        assert response.get_json()['status'] == 'error'
        assert 'Authentication required' in response.get_json()['error']
    
    def test_export_pdf_invalid_song_id(self, client, auth_headers):
        """Test PDF export with invalid song ID."""
        response = client.get('/api/v1/songs/invalid/export/pdf',
                             headers=auth_headers)
        
        assert response.status_code == 400
    
    def test_export_pdf_comprehensive_content(self, client, auth_headers):
        """Test PDF export with comprehensive ChordPro content."""
        # Create song with comprehensive content
        song_data = {
            'title': 'Comprehensive Test',
            'artist': 'Test Artist',
            'content': """{title: Amazing Grace}
{artist: John Newton}
{key: G}
{tempo: 90}

{comment: This is a comment}

{sov}
A[G]mazing [G7]grace how [C]sweet the [G]sound
That [Em]saved a [C]wretch like [G]me
I [G]once was [G7]lost but [C]now am [G]found
Was [Em]blind but [C]now I [G]see
{eov}

{soc}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [Em]grace my [C]fears re[G]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [C]first be[G]lieved
{eoc}

{sob}
Through [G]many [G7]dangers, [C]toils and [G]snares
I [Em]have al[C]ready [G]come
'Tis [G]grace hath [G7]brought me [C]safe thus [G]far
And [Em]grace will [C]lead me [G]home
{eob}"""
        }
        
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        song_id = response.get_json()['data']['id']
        
        # Export PDF
        response = client.get(f'/api/v1/songs/{song_id}/export/pdf',
                             headers=auth_headers)
        
        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
        
        pdf_data = response.data
        assert len(pdf_data) > 1000  # Should be substantial with comprehensive content
        assert pdf_data.startswith(b'%PDF')
    
    def test_export_pdf_minimal_content(self, client, auth_headers):
        """Test PDF export with minimal content."""
        # Create song with minimal content
        song_data = {
            'title': 'Minimal Song',
            'content': 'Just some lyrics here'
        }
        
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        song_id = response.get_json()['data']['id']
        
        # Export PDF
        response = client.get(f'/api/v1/songs/{song_id}/export/pdf',
                             headers=auth_headers)
        
        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
        
        pdf_data = response.data
        assert len(pdf_data) > 0
        assert pdf_data.startswith(b'%PDF')
    
    def test_export_pdf_special_characters(self, client, auth_headers):
        """Test PDF export with special characters."""
        # Create song with special characters
        song_data = {
            'title': 'Café Song',
            'artist': 'José María',
            'content': """{title: Café Song}
{artist: José María}
Test with ñ, ü, and other special characters
[C]Hola [G]mundo"""
        }
        
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        song_id = response.get_json()['data']['id']
        
        # Export PDF
        response = client.get(f'/api/v1/songs/{song_id}/export/pdf',
                             headers=auth_headers)
        
        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
        
        pdf_data = response.data
        assert len(pdf_data) > 0
        assert pdf_data.startswith(b'%PDF')
    
    def test_export_pdf_filename_generation(self, client, auth_headers):
        """Test PDF filename generation."""
        # Create song with special characters in title
        song_data = {
            'title': 'Song With Special Characters!@#$%^&*()',
            'content': 'Test content'
        }
        
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        song_id = response.get_json()['data']['id']
        
        # Export PDF
        response = client.get(f'/api/v1/songs/{song_id}/export/pdf',
                             headers=auth_headers)
        
        assert response.status_code == 200
        
        # Check filename is sanitized
        content_disposition = response.headers['Content-Disposition']
        assert 'Song-With-Special-Characters' in content_disposition
        assert '.pdf' in content_disposition
        # Should not contain special characters
        assert '!' not in content_disposition
        assert '@' not in content_disposition


class TestPDFExportPermissions:
    """Test PDF export with different permission scenarios."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
                db.drop_all()
    
    @pytest.fixture
    def users_and_songs(self, client):
        """Create users and songs for permission testing."""
        # Create first user
        user1_data = {
            'email': 'user1@example.com',
            'password': 'TestPassword123!'
        }
        client.post('/api/v1/auth/register', 
                   data=json.dumps(user1_data),
                   content_type='application/json')
        
        response1 = client.post('/api/v1/auth/login',
                               data=json.dumps(user1_data),
                               content_type='application/json')
        token1 = response1.get_json()['data']['token']
        headers1 = {'Authorization': f'Bearer {token1}'}
        
        # Create second user
        user2_data = {
            'email': 'user2@example.com',
            'password': 'TestPassword123!'
        }
        client.post('/api/v1/auth/register', 
                   data=json.dumps(user2_data),
                   content_type='application/json')
        
        response2 = client.post('/api/v1/auth/login',
                               data=json.dumps(user2_data),
                               content_type='application/json')
        token2 = response2.get_json()['data']['token']
        headers2 = {'Authorization': f'Bearer {token2}'}
        
        # Create song for user1
        song_data = {
            'title': 'User1 Song',
            'content': 'Test content'
        }
        
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=headers1)
        
        song_id = response.get_json()['data']['id']
        
        return {
            'headers1': headers1,
            'headers2': headers2,
            'song_id': song_id
        }
    
    def test_export_pdf_owner_access(self, client, users_and_songs):
        """Test PDF export by song owner."""
        data = users_and_songs
        
        response = client.get(f'/api/v1/songs/{data["song_id"]}/export/pdf',
                             headers=data['headers1'])
        
        assert response.status_code == 200
        assert response.content_type == 'application/pdf'
    
    def test_export_pdf_unauthorized_user(self, client, users_and_songs):
        """Test PDF export by unauthorized user."""
        data = users_and_songs
        
        response = client.get(f'/api/v1/songs/{data["song_id"]}/export/pdf',
                             headers=data['headers2'])
        
        assert response.status_code == 404  # Song not found (no permission)