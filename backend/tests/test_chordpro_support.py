"""
Test ChordPro format support in the song management API.
"""

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


class TestChordProFormatSupport:
    """Test ChordPro format support in song management."""

    def test_simple_chordpro_song(self, test_client, auth_token):
        """Test storing and retrieving a simple ChordPro formatted song."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        chordpro_content = """{title: Amazing Grace}
{artist: John Newton}
{key: G}

[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
[G]I [G7]once was [C]lost, but [G]now I'm [Em]found
Was [G]blind but [D]now I [G]see"""

        song_data = {
            'title': 'Amazing Grace',
            'content': chordpro_content
        }
        
        # Create song with ChordPro content
        create_response = test_client.post('/api/v1/songs',
                                      data=json.dumps(song_data),
                                      content_type='application/json',
                                      headers=headers)
        
        assert create_response.status_code == 201
        created_song = json.loads(create_response.data)['data']
        song_id = created_song['id']
        
        # Verify content is preserved exactly
        assert created_song['content'] == chordpro_content
        
        # Retrieve the song and verify content preservation
        get_response = test_client.get(f'/api/v1/songs/{song_id}', headers=headers)
        assert get_response.status_code == 200
        retrieved_song = json.loads(get_response.data)['data']
        
        # Content should be identical to original
        assert retrieved_song['content'] == chordpro_content
        
        # Verify specific ChordPro elements are preserved
        assert '{title: Amazing Grace}' in retrieved_song['content']
        assert '{artist: John Newton}' in retrieved_song['content']
        assert '[G]Amazing [G7]grace' in retrieved_song['content']
        assert '\n' in retrieved_song['content']  # Line breaks preserved

    def test_complex_chordpro_with_directives(self, test_client, auth_token):
        """Test storing complex ChordPro content with various directives."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        complex_chordpro = """{title: House of the Rising Sun}
{artist: Traditional}
{capo: 3}
{tempo: 120}
{key: Am}

{start_of_verse}
There [Am]is a [C]house in [D]New Or[F]leans
They [Am]call the [C]Rising [E]Sun
And it's [Am]been the [C]ruin of [D]many a poor [F]boy
And [Am]God I [E]know I'm [Am]one
{end_of_verse}

{start_of_chorus}
Mother [Am]tell your [C]children
Not to [D]do what [F]I have [Am]done
{end_of_chorus}

{comment: This is a traditional folk song}
{comment: Play with a steady strum pattern}"""

        song_data = {
            'title': 'House of the Rising Sun',
            'content': complex_chordpro
        }
        
        # Create and retrieve song
        create_response = test_client.post('/api/v1/songs',
                                      data=json.dumps(song_data),
                                      content_type='application/json',
                                      headers=headers)
        
        assert create_response.status_code == 201
        song_id = json.loads(create_response.data)['data']['id']
        
        get_response = test_client.get(f'/api/v1/songs/{song_id}', headers=headers)
        assert get_response.status_code == 200
        retrieved_content = json.loads(get_response.data)['data']['content']
        
        # Verify all ChordPro elements are preserved
        assert retrieved_content == complex_chordpro
        assert '{capo: 3}' in retrieved_content
        assert '{tempo: 120}' in retrieved_content
        assert '{start_of_verse}' in retrieved_content
        assert '{end_of_verse}' in retrieved_content
        assert '{start_of_chorus}' in retrieved_content
        assert '{end_of_chorus}' in retrieved_content
        assert '{comment: This is a traditional folk song}' in retrieved_content

    def test_chordpro_update_preserves_formatting(self, test_client, auth_token):
        """Test that updating ChordPro content preserves formatting."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        original_content = """{title: Test Song}
{artist: Test Artist}

[C]Original [G]content [Am]here [F]
With [C]some [G]lyrics"""

        updated_content = """{title: Updated Song}
{artist: Updated Artist}
{key: D}

[D]Updated [A]content [Bm]here [G]
With [D]different [A]lyrics
[D]And [A]more [Bm]lines [G]"""

        # Create original song
        song_data = {'title': 'Test Song', 'content': original_content}
        create_response = test_client.post('/api/v1/songs',
                                      data=json.dumps(song_data),
                                      content_type='application/json',
                                      headers=headers)
        
        assert create_response.status_code == 201
        song_id = json.loads(create_response.data)['data']['id']
        
        # Update with new ChordPro content
        update_data = {'title': 'Updated Song', 'content': updated_content}
        update_response = test_client.put(f'/api/v1/songs/{song_id}',
                                     data=json.dumps(update_data),
                                     content_type='application/json',
                                     headers=headers)
        
        assert update_response.status_code == 200
        updated_song = json.loads(update_response.data)['data']
        
        # Verify updated content is preserved exactly
        assert updated_song['content'] == updated_content
        assert '{key: D}' in updated_song['content']
        assert '[D]Updated [A]content' in updated_song['content']

    def test_chordpro_with_special_characters(self, test_client, auth_token):
        """Test ChordPro content with special characters and unicode."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        special_content = """{title: Café del Mar}
{artist: José González}
{key: Em}

{comment: Song with special characters: ñ, é, ç, ü}

[Em]Vamos a la [Am]playa
[B7]Con mucho [Em]amor
[Em]Niños y [Am]niñas
[B7]Cantando esta [Em]canción

{comment: Tab notation}
E|--0--2--3--|
B|--0--1--0--|
G|--0--2--0--|
D|--2--2--2--|
A|--2--0--2--|
E|--0-----0--|

{comment: Lyrics with accents}
[Em]Música [Am]española
[B7]Es muy [Em]bonita"""

        song_data = {
            'title': 'Café del Mar',
            'content': special_content
        }
        
        # Create and retrieve song
        create_response = test_client.post('/api/v1/songs',
                                      data=json.dumps(song_data),
                                      content_type='application/json',
                                      headers=headers)
        
        assert create_response.status_code == 201
        song_id = json.loads(create_response.data)['data']['id']
        
        get_response = test_client.get(f'/api/v1/songs/{song_id}', headers=headers)
        assert get_response.status_code == 200
        retrieved_content = json.loads(get_response.data)['data']['content']
        
        # Verify special characters and unicode are preserved
        assert retrieved_content == special_content
        assert 'Café del Mar' in retrieved_content
        assert 'José González' in retrieved_content
        assert 'ñ, é, ç, ü' in retrieved_content
        assert 'Música [Am]española' in retrieved_content  # Chord between words
        assert 'E|--0--2--3--|' in retrieved_content  # Tab notation preserved

    def test_chordpro_empty_lines_and_whitespace(self, test_client, auth_token):
        """Test that empty lines and whitespace formatting is preserved."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        whitespace_content = """{title: Whitespace Test}


{start_of_verse}
[C]Line with spaces at end    
[G]Line with tabs	between	words
[Am]Normal line
[F]Line with    multiple   spaces
{end_of_verse}


{comment: Empty lines above and below}


[C]Final [G]line"""

        song_data = {
            'title': 'Whitespace Test',
            'content': whitespace_content
        }
        
        # Create and retrieve song
        create_response = test_client.post('/api/v1/songs',
                                      data=json.dumps(song_data),
                                      content_type='application/json',
                                      headers=headers)
        
        assert create_response.status_code == 201
        song_id = json.loads(create_response.data)['data']['id']
        
        get_response = test_client.get(f'/api/v1/songs/{song_id}', headers=headers)
        assert get_response.status_code == 200
        retrieved_content = json.loads(get_response.data)['data']['content']
        
        # Verify exact whitespace preservation
        assert retrieved_content == whitespace_content
        
        # Count line breaks to ensure they're preserved
        original_lines = whitespace_content.split('\n')
        retrieved_lines = retrieved_content.split('\n')
        assert len(original_lines) == len(retrieved_lines)

    def test_list_songs_preserves_chordpro(self, test_client, auth_token):
        """Test that listing songs preserves ChordPro formatting."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        songs_data = [
            {
                'title': 'Song 1',
                'content': '{title: Song One}\n[C]First [G]song [Am]content [F]'
            },
            {
                'title': 'Song 2', 
                'content': '{title: Song Two}\n{artist: Artist}\n[D]Second [A]song [Bm]content [G]'
            }
        ]
        
        # Create multiple songs
        song_ids = []
        for song_data in songs_data:
            response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=headers)
            assert response.status_code == 201
            song_ids.append(json.loads(response.data)['data']['id'])
        
        # List all songs
        list_response = test_client.get('/api/v1/songs', headers=headers)
        assert list_response.status_code == 200
        songs_list = json.loads(list_response.data)['data']['songs']
        
        assert len(songs_list) == 2
        
        # Verify ChordPro content is preserved in the list
        for i, song in enumerate(songs_list):
            expected_content = songs_data[i]['content']
            assert song['content'] == expected_content
            assert '{title:' in song['content']
            assert '[' in song['content'] and ']' in song['content']

    def test_chordpro_validation_endpoint(self, test_client, auth_token):
        """Test the ChordPro validation API endpoint."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Valid ChordPro content
        valid_content = """{title: Test Song}
{artist: Test Artist}
{key: C}

[C]Test [G]lyrics [Am]here [F]
{comment: This is valid ChordPro}"""
        
        validation_data = {'content': valid_content}
        
        response = test_client.post('/api/v1/songs/validate-chordpro',
                               data=json.dumps(validation_data),
                               content_type='application/json',
                               headers=headers)
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        assert result['status'] == 'success'
        validation_result = result['data']
        
        # Check validation structure
        assert 'is_valid' in validation_result
        assert 'warnings' in validation_result
        assert 'metadata' in validation_result
        assert 'directives' in validation_result
        assert 'chords' in validation_result
        assert 'statistics' in validation_result
        
        # Check that content is valid
        assert validation_result['is_valid']
        assert len(validation_result['warnings']) == 0
        
        # Check extracted metadata
        assert validation_result['metadata']['title'] == 'Test Song'
        assert validation_result['metadata']['artist'] == 'Test Artist'
        assert validation_result['metadata']['key'] == 'C'
        
        # Check extracted chords
        expected_chords = ['Am', 'C', 'F', 'G']
        assert validation_result['chords'] == expected_chords

    def test_chordpro_validation_requires_auth(self, test_client):
        """Test that ChordPro validation requires authentication."""
        validation_data = {'content': '{title: Test}'}
        
        response = test_client.post('/api/v1/songs/validate-chordpro',
                               data=json.dumps(validation_data),
                               content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'authorization header is required' in data['error'].lower()

    def test_chordpro_validation_invalid_content(self, test_client, auth_token):
        """Test ChordPro validation with problematic content."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Content with issues
        problematic_content = """{title: Test Song}
[C]Test [G lyrics [] here
{comment: Missing closing bracket"""
        
        validation_data = {'content': problematic_content}
        
        response = test_client.post('/api/v1/songs/validate-chordpro',
                               data=json.dumps(validation_data),
                               content_type='application/json',
                               headers=headers)
        
        assert response.status_code == 200
        result = json.loads(response.data)
        validation_result = result['data']
        
        # Should detect issues
        assert not validation_result['is_valid']
        assert len(validation_result['warnings']) > 0