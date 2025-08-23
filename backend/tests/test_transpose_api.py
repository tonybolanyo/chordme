"""
Test cases for the ChordPro transposition API endpoint.
"""

import pytest
import json
from chordme import app, db
from chordme.models import User
from chordme.utils import generate_jwt_token


@pytest.fixture
def client():
    """Create test client."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    app.config['JWT_EXPIRATION_DELTA'] = 3600
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return auth headers."""
    # Create test user
    user = User(email='test@example.com', password='password123')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    # Generate JWT token
    token = generate_jwt_token(user.id)
    
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }


class TestTransposeChordProEndpoint:
    """Test the transpose ChordPro API endpoint."""
    
    def test_transpose_success(self, client, auth_headers):
        """Test successful transposition."""
        data = {
            'content': '[C]Hello [G]world [Am]test',
            'semitones': 2
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        assert result['status'] == 'success'
        assert result['data']['original_content'] == '[C]Hello [G]world [Am]test'
        assert result['data']['transposed_content'] == '[D]Hello [A]world [Bm]test'
        assert result['data']['semitones'] == 2
        assert len(result['data']['chords_changed']) == 3
        
        # Check chord changes (order should match content order, not alphabetical)
        chord_changes = result['data']['chords_changed']
        expected_changes = [
            {'original': 'C', 'transposed': 'D'},
            {'original': 'G', 'transposed': 'A'},
            {'original': 'Am', 'transposed': 'Bm'}
        ]
        assert chord_changes == expected_changes
    
    def test_transpose_with_directives(self, client, auth_headers):
        """Test transposition preserving ChordPro directives."""
        data = {
            'content': '{title: Test Song}\n{artist: Test}\n\n[C]Test [G]content',
            'semitones': 1
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        expected_content = '{title: Test Song}\n{artist: Test}\n\n[C#]Test [G#]content'
        assert result['data']['transposed_content'] == expected_content
    
    def test_transpose_zero_semitones(self, client, auth_headers):
        """Test transposition with zero semitones."""
        data = {
            'content': '[C]Test [G]content',
            'semitones': 0
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        assert result['data']['original_content'] == result['data']['transposed_content']
        assert result['data']['semitones'] == 0
        assert result['data']['chords_changed'] == []
        assert 'No transposition applied' in result['message']
    
    def test_transpose_negative_semitones(self, client, auth_headers):
        """Test transposition with negative semitones."""
        data = {
            'content': '[C]Hello [G]world',
            'semitones': -1
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        assert result['data']['transposed_content'] == '[B]Hello [F#]world'
        assert result['data']['semitones'] == -1
        assert '1 semitones down' in result['message']
    
    def test_transpose_complex_chords(self, client, auth_headers):
        """Test transposition of complex chord progressions."""
        data = {
            'content': '[Cmaj7]Test [F#m7]progression [Bb]with [G/B]various',
            'semitones': 3
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        expected = '[D#maj7]Test [Am7]progression [C#]with [A#/B]various'
        assert result['data']['transposed_content'] == expected
    
    def test_transpose_invalid_chords_ignored(self, client, auth_headers):
        """Test that invalid chords are ignored during transposition."""
        data = {
            'content': '[C]Valid [invalid]Invalid [G]Valid',
            'semitones': 2
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        expected = '[D]Valid [invalid]Invalid [A]Valid'
        assert result['data']['transposed_content'] == expected
        
        # Only valid chords should be in changes
        chord_changes = result['data']['chords_changed']
        assert len(chord_changes) == 2
    
    def test_transpose_missing_content(self, client, auth_headers):
        """Test transposition with missing content."""
        data = {
            'semitones': 2
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result['status'] == 'error'
        assert 'Content is required' in result['error']
    
    def test_transpose_missing_semitones(self, client, auth_headers):
        """Test transposition with missing semitones."""
        data = {
            'content': '[C]Test content'
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result['status'] == 'error'
        assert 'Semitones value is required' in result['error']
    
    def test_transpose_empty_content(self, client, auth_headers):
        """Test transposition with empty content."""
        data = {
            'content': '',
            'semitones': 2
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result['status'] == 'error'
        assert 'Content cannot be empty' in result['error']
    
    def test_transpose_invalid_semitones_type(self, client, auth_headers):
        """Test transposition with invalid semitones type."""
        data = {
            'content': '[C]Test content',
            'semitones': 'invalid'
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result['status'] == 'error'
        assert 'Semitones must be an integer' in result['error']
    
    def test_transpose_semitones_out_of_range(self, client, auth_headers):
        """Test transposition with semitones out of valid range."""
        data = {
            'content': '[C]Test content',
            'semitones': 15
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result['status'] == 'error'
        assert 'Semitones must be between -11 and 11' in result['error']
        
        # Test negative out of range
        data['semitones'] = -15
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 400
    
    def test_transpose_no_json_body(self, client, auth_headers):
        """Test transposition with no JSON body."""
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data='not json',
            headers=auth_headers
        )
        
        assert response.status_code == 500
        result = json.loads(response.data)
        assert result['status'] == 'error'
    
    def test_transpose_requires_authentication(self, client):
        """Test that transposition requires authentication."""
        data = {
            'content': '[C]Test content',
            'semitones': 2
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 401
        result = json.loads(response.data)
        assert result['status'] == 'error'
        assert 'Authorization header is required' in result['error']
    
    def test_transpose_invalid_token(self, client):
        """Test transposition with invalid token."""
        data = {
            'content': '[C]Test content',
            'semitones': 2
        }
        
        headers = {
            'Authorization': 'Bearer invalid-token',
            'Content-Type': 'application/json'
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=headers
        )
        
        assert response.status_code == 401
        result = json.loads(response.data)
        assert result['status'] == 'error'
    
    def test_transpose_large_content(self, client, auth_headers):
        """Test transposition with realistic large content."""
        # Create realistic ChordPro song content
        content = """{title: Amazing Grace}
{artist: John Newton}
{key: G}

{start_of_verse}
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [D]wretch like [G]me
I [G]once was [G7]lost, but [C]now am [G]found
Was [G]blind but [D]now I [G]see
{end_of_verse}

{start_of_verse}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [G]grace my [D]fears re[G]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [G]hour I [D]first be[G]lieved
{end_of_verse}"""
        
        data = {
            'content': content,
            'semitones': 2
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        # Check that chords were transposed correctly
        transposed = result['data']['transposed_content']
        assert '[A]Amazing [A7]grace' in transposed
        assert '[D]sweet the [A]sound' in transposed
        assert '[E]wretch like [A]me' in transposed
        
        # Check chord changes
        chord_changes = result['data']['chords_changed']
        assert len(chord_changes) > 0
        
        # Verify some specific chord changes (G->A, C->D, D->E, etc.)
        chord_map = {change['original']: change['transposed'] for change in chord_changes}
        assert chord_map['G'] == 'A'
        assert chord_map['C'] == 'D' 
        assert chord_map['D'] == 'E'
        assert chord_map['G7'] == 'A7'
    
    def test_transpose_boundary_semitones(self, client, auth_headers):
        """Test transposition with boundary semitone values."""
        content = '[C]Test [G]content'
        
        # Test minimum value
        data = {'content': content, 'semitones': -11}
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Test maximum value
        data = {'content': content, 'semitones': 11}
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_transpose_preserves_whitespace(self, client, auth_headers):
        """Test that transposition preserves whitespace and formatting."""
        content = "  [C]  Spaced   [G]  content  "
        
        data = {
            'content': content,
            'semitones': 1
        }
        
        response = client.post(
            '/api/v1/songs/transpose-chordpro',
            data=json.dumps(data),
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        
        expected = "[C#]  Spaced   [G#]  content"
        assert result['data']['transposed_content'] == expected