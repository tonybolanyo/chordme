"""Tests for song section parsing and storage functionality."""

import pytest
import json
from chordme import app, db
from chordme.models import User, Song, SongSection
from chordme.chordpro_utils import ChordProValidator


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
    return token


class TestSectionParsing:
    """Test section parsing utilities."""
    
    def test_extract_sections_basic(self):
        """Test basic section extraction."""
        content = """{title: Test Song}

{start_of_verse}
[G]This is verse content
{end_of_verse}

{start_of_chorus}
[C]This is chorus content
{end_of_chorus}"""
        
        sections = ChordProValidator.extract_sections(content)
        assert len(sections) == 3
        
        # Check metadata section
        assert sections[0]['section_type'] == 'metadata'
        assert sections[0]['content'] == '{title: Test Song}'
        
        # Check verse section
        assert sections[1]['section_type'] == 'verse'
        assert sections[1]['section_number'] is None
        assert '[G]This is verse content' in sections[1]['content']
        
        # Check chorus section
        assert sections[2]['section_type'] == 'chorus'
        assert '[C]This is chorus content' in sections[2]['content']
    
    def test_extract_sections_numbered(self):
        """Test numbered section extraction."""
        content = """{start_of_verse: 1}
First verse content
{end_of_verse}

{start_of_verse: 2}
Second verse content
{end_of_verse}"""
        
        sections = ChordProValidator.extract_sections(content)
        assert len(sections) == 2
        
        assert sections[0]['section_type'] == 'verse'
        assert sections[0]['section_number'] == '1'
        assert 'First verse content' in sections[0]['content']
        
        assert sections[1]['section_type'] == 'verse'
        assert sections[1]['section_number'] == '2'
        assert 'Second verse content' in sections[1]['content']
    
    def test_extract_sections_mixed_content(self):
        """Test extraction with mixed content types."""
        content = """{title: Mixed Song}
{artist: Test Artist}

Some intro text without sections.

{start_of_verse}
Verse content here
{end_of_verse}

{comment: This is a comment}

More standalone content.

{start_of_chorus}
Chorus content here
{end_of_chorus}"""
        
        sections = ChordProValidator.extract_sections(content)
        assert len(sections) >= 5  # At least title, artist, verse, comment, chorus
        
        # Find specific sections
        verse_sections = [s for s in sections if s['section_type'] == 'verse']
        chorus_sections = [s for s in sections if s['section_type'] == 'chorus']
        metadata_sections = [s for s in sections if s['section_type'] == 'metadata']
        
        assert len(verse_sections) == 1
        assert len(chorus_sections) == 1
        assert len(metadata_sections) >= 3  # title, artist, comment


class TestSectionStorage:
    """Test song section database storage."""
    
    def test_song_creation_with_sections(self, test_client, auth_token):
        """Test that creating a song also creates sections."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        song_content = """{title: Test Song}
{artist: Test Artist}

{start_of_verse: 1}
[G]This is the first verse
[C]With some chords [G]here
{end_of_verse}

{start_of_chorus}
[F]This is the chorus
[C]Everyone sings [G]along
{end_of_chorus}"""
        
        song_data = {
            'title': 'Test Song with Sections',
            'content': song_content
        }
        
        # Create song
        response = test_client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=headers)
        
        assert response.status_code == 201
        response_data = json.loads(response.data)
        song_id = response_data['data']['id']
        
        # Check that sections were created
        sections = SongSection.query.filter_by(song_id=song_id).order_by(SongSection.order_index).all()
        assert len(sections) > 0
        
        # Find verse and chorus sections
        verse_sections = [s for s in sections if s.section_type == 'verse']
        chorus_sections = [s for s in sections if s.section_type == 'chorus']
        
        assert len(verse_sections) == 1
        assert len(chorus_sections) == 1
        
        # Check verse section details
        verse = verse_sections[0]
        assert verse.section_number == '1'
        assert '[G]This is the first verse' in verse.content
        
        # Check chorus section details
        chorus = chorus_sections[0]
        assert chorus.section_number is None
        assert '[F]This is the chorus' in chorus.content
    
    def test_song_update_with_sections(self, test_client, auth_token):
        """Test that updating song content also updates sections."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Create initial song
        initial_content = """{title: Initial Song}

{start_of_verse}
Initial verse content
{end_of_verse}"""
        
        song_data = {
            'title': 'Test Song',
            'content': initial_content
        }
        
        response = test_client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=headers)
        
        assert response.status_code == 201
        song_id = json.loads(response.data)['data']['id']
        
        # Check initial sections
        initial_sections = SongSection.query.filter_by(song_id=song_id).all()
        initial_count = len(initial_sections)
        assert initial_count > 0
        
        # Update song with new content
        updated_content = """{title: Updated Song}

{start_of_verse: 1}
Updated verse 1 content
{end_of_verse}

{start_of_verse: 2}
New verse 2 content
{end_of_verse}

{start_of_chorus}
New chorus content
{end_of_chorus}"""
        
        update_data = {
            'content': updated_content
        }
        
        response = test_client.put(f'/api/v1/songs/{song_id}',
                              data=json.dumps(update_data),
                              content_type='application/json',
                              headers=headers)
        
        assert response.status_code == 200
        
        # Check that sections were updated
        updated_sections = SongSection.query.filter_by(song_id=song_id).order_by(SongSection.order_index).all()
        
        # Should have different sections now
        verse_sections = [s for s in updated_sections if s.section_type == 'verse']
        chorus_sections = [s for s in updated_sections if s.section_type == 'chorus']
        
        assert len(verse_sections) == 2
        assert len(chorus_sections) == 1
        
        # Check verse numbers
        verse_numbers = sorted([s.section_number for s in verse_sections])
        assert verse_numbers == ['1', '2']


class TestSectionAPI:
    """Test section retrieval API endpoints."""
    
    def test_get_song_sections(self, test_client, auth_token):
        """Test retrieving all sections for a song."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Create song with sections
        song_content = """{title: API Test Song}

{start_of_verse: 1}
First verse content
{end_of_verse}

{start_of_chorus}
Chorus content
{end_of_chorus}

{start_of_verse: 2}
Second verse content
{end_of_verse}"""
        
        song_data = {
            'title': 'API Test Song',
            'content': song_content
        }
        
        response = test_client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=headers)
        
        assert response.status_code == 201
        song_id = json.loads(response.data)['data']['id']
        
        # Get sections via API
        response = test_client.get(f'/api/v1/songs/{song_id}/sections', headers=headers)
        assert response.status_code == 200
        
        response_data = json.loads(response.data)
        assert response_data['status'] == 'success'
        
        sections = response_data['data']['sections']
        assert len(sections) > 0
        
        # Check that sections are ordered correctly
        for i in range(len(sections) - 1):
            assert sections[i]['order_index'] <= sections[i + 1]['order_index']
        
        # Find specific sections
        verse_sections = [s for s in sections if s['section_type'] == 'verse']
        chorus_sections = [s for s in sections if s['section_type'] == 'chorus']
        
        assert len(verse_sections) == 2
        assert len(chorus_sections) == 1
    
    def test_get_specific_section(self, test_client, auth_token):
        """Test retrieving a specific section by ID."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Create song with sections
        song_content = """{start_of_verse}
Specific verse content for testing
{end_of_verse}"""
        
        song_data = {
            'title': 'Specific Section Test',
            'content': song_content
        }
        
        response = test_client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=headers)
        
        assert response.status_code == 201
        song_id = json.loads(response.data)['data']['id']
        
        # Get all sections first
        response = test_client.get(f'/api/v1/songs/{song_id}/sections', headers=headers)
        assert response.status_code == 200
        
        sections = json.loads(response.data)['data']['sections']
        verse_section = next(s for s in sections if s['section_type'] == 'verse')
        section_id = verse_section['id']
        
        # Get specific section
        response = test_client.get(f'/api/v1/songs/{song_id}/sections/{section_id}', headers=headers)
        assert response.status_code == 200
        
        response_data = json.loads(response.data)
        section_data = response_data['data']
        
        assert section_data['section_type'] == 'verse'
        assert 'Specific verse content for testing' in section_data['content']
    
    def test_get_sections_unauthorized(self, test_client, auth_token):
        """Test that sections can't be accessed for songs you don't own."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Create song
        song_data = {
            'title': 'Private Song',
            'content': '{start_of_verse}\nPrivate content\n{end_of_verse}'
        }
        
        response = test_client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=headers)
        
        assert response.status_code == 201
        song_id = json.loads(response.data)['data']['id']
        
        # Try to access sections without authentication
        response = test_client.get(f'/api/v1/songs/{song_id}/sections')
        assert response.status_code == 401
        
        # Try to access sections with wrong user (would need another user for proper test)
        # For now, just test that the endpoint requires authentication
    
    def test_get_sections_nonexistent_song(self, test_client, auth_token):
        """Test accessing sections for nonexistent song."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Try to get sections for nonexistent song
        response = test_client.get('/api/v1/songs/99999/sections', headers=headers)
        assert response.status_code == 404
        
        response_data = json.loads(response.data)
        assert response_data['status'] == 'error'
        assert 'not found' in response_data['error']['message'].lower()