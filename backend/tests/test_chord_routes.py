"""Tests for chord management API endpoints."""

import pytest
import json
from chordme.models import User, Chord
from chordme import db


class TestChordRoutes:
    """Test chord API endpoints."""
    
    def test_get_chords_empty_list(self, client, auth_token):
        """Test getting chords when user has none."""
        response = client.get(
            '/api/v1/chords',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['chords'] == []
        assert 'Retrieved 0 chords' in data['message']
    
    def test_get_chords_requires_auth(self, client):
        """Test that getting chords requires authentication."""
        response = client.get('/api/v1/chords')
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['status'] == 'error'
        # Handle both dictionary and string error formats
        if isinstance(data['error'], dict):
            assert 'Authorization header is required' in data['error']['message']
        else:
            assert 'Authorization header is required' in data['error']
    
    def test_create_chord_success(self, client, auth_token):
        """Test successful chord creation."""
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000',
            'description': 'Easy open chord voicing'
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['message'] == 'Chord created successfully'
        
        chord = data['data']
        assert chord['name'] == 'Cmaj7'
        assert chord['definition'] == 'x32000'
        assert chord['description'] == 'Easy open chord voicing'
        assert chord['id'] is not None
        assert chord['user_id'] is not None
        assert chord['created_at'] is not None
        assert chord['updated_at'] is not None
    
    def test_create_chord_without_description(self, client, auth_token):
        """Test creating chord without optional description."""
        chord_data = {
            'name': 'G',
            'definition': '320003'
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        
        chord = data['data']
        assert chord['name'] == 'G'
        assert chord['definition'] == '320003'
        assert chord['description'] is None
    
    def test_create_chord_requires_auth(self, client):
        """Test that creating chord requires authentication."""
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000'
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json'
        )
        
        assert response.status_code == 401
    
    def test_create_chord_missing_name(self, client, auth_token):
        """Test creating chord without name fails."""
        chord_data = {
            'definition': 'x32000'
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Name is required' in data['error']['message']
    
    def test_create_chord_missing_definition(self, client, auth_token):
        """Test creating chord without definition fails."""
        chord_data = {
            'name': 'Cmaj7'
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Definition is required' in data['error']['message']
    
    def test_create_chord_name_too_long(self, client, auth_token):
        """Test creating chord with name too long fails."""
        chord_data = {
            'name': 'a' * 51,  # Too long
            'definition': 'x32000'
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Name must be 50 characters or less' in data['error']['message']
    
    def test_create_chord_definition_too_long(self, client, auth_token):
        """Test creating chord with definition too long fails."""
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'a' * 1001  # Too long
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Definition must be 1,000 characters or less' in data['error']['message']
    
    def test_create_chord_description_too_long(self, client, auth_token):
        """Test creating chord with description too long fails."""
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000',
            'description': 'a' * 501  # Too long
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Description must be 500 characters or less' in data['error']['message']
    
    def test_create_chord_duplicate_name(self, client, auth_token):
        """Test creating chord with duplicate name fails."""
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000'
        }
        
        # Create first chord
        response1 = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response1.status_code == 201
        
        # Try to create duplicate
        response2 = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response2.status_code == 400
        data = response2.get_json()
        assert data['status'] == 'error'
        # Handle both dictionary and string error formats
        if isinstance(data['error'], dict):
            assert "already have a chord named 'Cmaj7'" in data['error']['message']
        else:
            assert "already have a chord named 'Cmaj7'" in data['error']
    
    def test_get_chords_with_data(self, client, auth_token):
        """Test getting chords when user has some."""
        # Create test chords
        chord_data1 = {
            'name': 'Cmaj7',
            'definition': 'x32000',
            'description': 'Major 7th chord'
        }
        chord_data2 = {
            'name': 'G',
            'definition': '320003'
        }
        
        # Create both chords
        client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data1),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data2),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        # Get all chords
        response = client.get(
            '/api/v1/chords',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert len(data['data']['chords']) == 2
        assert 'Retrieved 2 chords' in data['message']
        
        # Check chord data
        chords = data['data']['chords']
        chord_names = [chord['name'] for chord in chords]
        assert 'Cmaj7' in chord_names
        assert 'G' in chord_names
    
    def test_get_chord_by_id(self, client, auth_token):
        """Test getting specific chord by ID."""
        # Create test chord
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000',
            'description': 'Major 7th chord'
        }
        
        create_response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        chord_id = create_response.get_json()['data']['id']
        
        # Get chord by ID
        response = client.get(
            f'/api/v1/chords/{chord_id}',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['message'] == 'Chord retrieved successfully'
        
        chord = data['data']
        assert chord['id'] == chord_id
        assert chord['name'] == 'Cmaj7'
        assert chord['definition'] == 'x32000'
        assert chord['description'] == 'Major 7th chord'
    
    def test_get_chord_not_found(self, client, auth_token):
        """Test getting chord that doesn't exist."""
        response = client.get(
            '/api/v1/chords/999',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Chord not found' in data['error']['message']
    
    def test_get_chord_requires_auth(self, client):
        """Test that getting specific chord requires authentication."""
        response = client.get('/api/v1/chords/1')
        
        assert response.status_code == 401
    
    def test_update_chord_success(self, client, auth_token):
        """Test successful chord update."""
        # Create test chord
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000',
            'description': 'Major 7th chord'
        }
        
        create_response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        chord_id = create_response.get_json()['data']['id']
        
        # Update chord
        update_data = {
            'name': 'Cmaj7_updated',
            'definition': 'x35453',
            'description': 'Barre chord voicing'
        }
        
        response = client.put(
            f'/api/v1/chords/{chord_id}',
            data=json.dumps(update_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['message'] == 'Chord updated successfully'
        
        chord = data['data']
        assert chord['name'] == 'Cmaj7_updated'
        assert chord['definition'] == 'x35453'
        assert chord['description'] == 'Barre chord voicing'
    
    def test_update_chord_partial(self, client, auth_token):
        """Test partial chord update."""
        # Create test chord
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000',
            'description': 'Major 7th chord'
        }
        
        create_response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        chord_id = create_response.get_json()['data']['id']
        
        # Update only definition
        update_data = {
            'definition': 'x35453'
        }
        
        response = client.put(
            f'/api/v1/chords/{chord_id}',
            data=json.dumps(update_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        
        chord = data['data']
        assert chord['name'] == 'Cmaj7'  # Unchanged
        assert chord['definition'] == 'x35453'  # Updated
        assert chord['description'] == 'Major 7th chord'  # Unchanged
    
    def test_update_chord_not_found(self, client, auth_token):
        """Test updating chord that doesn't exist."""
        update_data = {
            'name': 'Updated'
        }
        
        response = client.put(
            '/api/v1/chords/999',
            data=json.dumps(update_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Chord not found' in data['error']['message']
    
    def test_update_chord_duplicate_name(self, client, auth_token):
        """Test updating chord to duplicate name fails."""
        # Create two chords
        chord1_data = {
            'name': 'Cmaj7',
            'definition': 'x32000'
        }
        chord2_data = {
            'name': 'G',
            'definition': '320003'
        }
        
        create_response1 = client.post(
            '/api/v1/chords',
            data=json.dumps(chord1_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        create_response2 = client.post(
            '/api/v1/chords',
            data=json.dumps(chord2_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        chord2_id = create_response2.get_json()['data']['id']
        
        # Try to update chord2 to have same name as chord1
        update_data = {
            'name': 'Cmaj7'
        }
        
        response = client.put(
            f'/api/v1/chords/{chord2_id}',
            data=json.dumps(update_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        # Handle both dictionary and string error formats
        if isinstance(data['error'], dict):
            assert "already have a chord named 'Cmaj7'" in data['error']['message']
        else:
            assert "already have a chord named 'Cmaj7'" in data['error']
    
    def test_delete_chord_success(self, client, auth_token):
        """Test successful chord deletion."""
        # Create test chord
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000'
        }
        
        create_response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        chord_id = create_response.get_json()['data']['id']
        
        # Delete chord
        response = client.delete(
            f'/api/v1/chords/{chord_id}',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['message'] == 'Chord deleted successfully'
        
        # Verify chord is gone
        get_response = client.get(
            f'/api/v1/chords/{chord_id}',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert get_response.status_code == 404
    
    def test_delete_chord_not_found(self, client, auth_token):
        """Test deleting chord that doesn't exist."""
        response = client.delete(
            '/api/v1/chords/999',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Chord not found' in data['error']['message']
    
    def test_delete_chord_requires_auth(self, client):
        """Test that deleting chord requires authentication."""
        response = client.delete('/api/v1/chords/1')
        
        assert response.status_code == 401


class TestChordSecurity:
    """Test chord security and user isolation."""
    
    def test_chords_isolated_between_users(self, client):
        """Test that users can only see their own chords."""
        # Create two users
        user1_data = {
            'email': 'user1@example.com',
            'password': 'TestPassword123'
        }
        user2_data = {
            'email': 'user2@example.com',
            'password': 'TestPassword123'
        }
        
        # Register both users
        client.post('/api/v1/auth/register',
                   data=json.dumps(user1_data),
                   content_type='application/json')
        client.post('/api/v1/auth/register',
                   data=json.dumps(user2_data),
                   content_type='application/json')
        
        # Login both users to get tokens
        login1_response = client.post('/api/v1/auth/login',
                                     data=json.dumps(user1_data),
                                     content_type='application/json')
        login2_response = client.post('/api/v1/auth/login',
                                     data=json.dumps(user2_data),
                                     content_type='application/json')
        
        token1 = login1_response.get_json()['data']['token']
        token2 = login2_response.get_json()['data']['token']
        
        # User 1 creates a chord
        chord_data = {
            'name': 'Cmaj7',
            'definition': 'x32000'
        }
        
        create_response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {token1}'}
        )
        
        assert create_response.status_code == 201
        chord_id = create_response.get_json()['data']['id']
        
        # User 1 can see their chord
        response1 = client.get(
            '/api/v1/chords',
            headers={'Authorization': f'Bearer {token1}'}
        )
        
        assert response1.status_code == 200
        data1 = response1.get_json()
        assert len(data1['data']['chords']) == 1
        
        # User 2 cannot see User 1's chord in their list
        response2 = client.get(
            '/api/v1/chords',
            headers={'Authorization': f'Bearer {token2}'}
        )
        
        assert response2.status_code == 200
        data2 = response2.get_json()
        assert len(data2['data']['chords']) == 0
        
        # User 2 cannot access User 1's chord by ID
        response3 = client.get(
            f'/api/v1/chords/{chord_id}',
            headers={'Authorization': f'Bearer {token2}'}
        )
        
        assert response3.status_code == 404
        
        # User 2 cannot update User 1's chord
        response4 = client.put(
            f'/api/v1/chords/{chord_id}',
            data=json.dumps({'name': 'Updated'}),
            content_type='application/json',
            headers={'Authorization': f'Bearer {token2}'}
        )
        
        assert response4.status_code == 404
        
        # User 2 cannot delete User 1's chord
        response5 = client.delete(
            f'/api/v1/chords/{chord_id}',
            headers={'Authorization': f'Bearer {token2}'}
        )
        
        assert response5.status_code == 404


class TestChordInput:
    """Test chord input validation and sanitization."""
    
    def test_chord_html_sanitization(self, client, auth_token):
        """Test that dangerous HTML is sanitized in chord fields."""
        chord_data = {
            'name': '<script>alert("test")</script>Cmaj7',
            'definition': '<script>evil()</script>x32000',
            'description': '<script>hack()</script>Major 7th chord'
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 201
        data = response.get_json()
        
        chord = data['data']
        # Dangerous HTML should be sanitized
        assert '<script>' not in chord['name']
        assert '<script>' not in chord['definition']
        assert '<script>' not in chord['description']
        assert 'alert(' not in chord['name']
        assert 'evil(' not in chord['definition']
        assert 'hack(' not in chord['description']
    
    def test_chord_empty_strings_handling(self, client, auth_token):
        """Test handling of empty string inputs."""
        chord_data = {
            'name': '',
            'definition': '',
            'description': ''
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'Name is required' in data['error']['message']
    
    def test_chord_whitespace_trimming(self, client, auth_token):
        """Test that whitespace is properly trimmed."""
        chord_data = {
            'name': '  Cmaj7  ',
            'definition': '  x32000  ',
            'description': '  Major 7th chord  '
        }
        
        response = client.post(
            '/api/v1/chords',
            data=json.dumps(chord_data),
            content_type='application/json',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 201
        data = response.get_json()
        
        chord = data['data']
        assert chord['name'] == 'Cmaj7'
        assert chord['definition'] == 'x32000'
        assert chord['description'] == 'Major 7th chord'