"""Tests for collaborative song editing endpoints."""

import pytest
import json
from chordme import app, db
from chordme.models import User, Song


@pytest.fixture
def test_client():
    """Create a test client using the real chordme app."""
    # Configure for testing
    app.config['TESTING'] = True
    app.config['HTTPS_ENFORCED'] = False  # Disable HTTPS enforcement in tests
    
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
def users_and_tokens(test_client):
    """Create test users and return their tokens."""
    from chordme.utils import generate_jwt_token
    
    # Create test users
    owner = User('owner@example.com', 'Password123')
    editor = User('editor@example.com', 'Password123')
    reader = User('reader@example.com', 'Password123')
    unauthorized = User('unauthorized@example.com', 'Password123')
    
    db.session.add_all([owner, editor, reader, unauthorized])
    db.session.commit()
    
    # Generate tokens
    owner_token = generate_jwt_token(owner.id)
    editor_token = generate_jwt_token(editor.id)
    reader_token = generate_jwt_token(reader.id)
    unauthorized_token = generate_jwt_token(unauthorized.id)
    
    return {
        'owner': {'user': owner, 'token': owner_token, 'headers': {'Authorization': f'Bearer {owner_token}'}},
        'editor': {'user': editor, 'token': editor_token, 'headers': {'Authorization': f'Bearer {editor_token}'}},
        'reader': {'user': reader, 'token': reader_token, 'headers': {'Authorization': f'Bearer {reader_token}'}},
        'unauthorized': {'user': unauthorized, 'token': unauthorized_token, 'headers': {'Authorization': f'Bearer {unauthorized_token}'}}
    }


@pytest.fixture
def sample_song(users_and_tokens):
    """Create a sample song with sharing permissions."""
    owner = users_and_tokens['owner']['user']
    editor = users_and_tokens['editor']['user']
    reader = users_and_tokens['reader']['user']
    
    # Create song
    song = Song('Collaborative Song', owner.id, '{title: Collaborative Song}\n[C]Test [G]content')
    
    # Set up sharing permissions
    song.add_shared_user(editor.id, 'edit')
    song.add_shared_user(reader.id, 'read')
    
    db.session.add(song)
    db.session.commit()
    
    return song


class TestSongSharingEndpoints:
    """Test song sharing and collaboration endpoints."""

    def test_share_song_as_owner(self, test_client, users_and_tokens):
        """Test sharing a song as the owner."""
        owner = users_and_tokens['owner']
        target_user = users_and_tokens['unauthorized']['user']
        
        # Create a song
        song_data = {
            'title': 'Test Song',
            'content': '{title: Test Song}\n[C]Test content'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        assert response.status_code == 201
        song_id = response.get_json()['data']['id']
        
        # Share the song
        share_data = {
            'user_email': target_user.email,
            'permission_level': 'edit'
        }
        response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['user_id'] == target_user.id
        assert data['data']['user_email'] == target_user.email
        assert data['data']['permission_level'] == 'edit'

    def test_share_song_insufficient_permissions(self, test_client, users_and_tokens, sample_song):
        """Test sharing a song without admin permissions."""
        editor = users_and_tokens['editor']
        target_user = users_and_tokens['unauthorized']['user']
        
        share_data = {
            'user_email': target_user.email,
            'permission_level': 'read'
        }
        response = test_client.post(f'/api/v1/songs/{sample_song.id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=editor['headers'])
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'insufficient permissions' in data['error']['message'].lower()

    def test_share_song_with_self(self, test_client, users_and_tokens, sample_song):
        """Test sharing a song with yourself (should fail)."""
        owner = users_and_tokens['owner']
        
        share_data = {
            'user_email': owner['user'].email,
            'permission_level': 'edit'
        }
        response = test_client.post(f'/api/v1/songs/{sample_song.id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'cannot share song with yourself' in data['error']['message'].lower()

    def test_share_song_invalid_permission_level(self, test_client, users_and_tokens, sample_song):
        """Test sharing with invalid permission level."""
        owner = users_and_tokens['owner']
        target_user = users_and_tokens['unauthorized']['user']
        
        share_data = {
            'user_email': target_user.email,
            'permission_level': 'invalid'
        }
        response = test_client.post(f'/api/v1/songs/{sample_song.id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        assert response.status_code == 400
        data = response.get_json()
        assert "permission level must be 'read', 'edit', or 'admin'" in data['error']['message'].lower()

    def test_share_song_nonexistent_user(self, test_client, users_and_tokens, sample_song):
        """Test sharing with a non-existent user."""
        owner = users_and_tokens['owner']
        
        share_data = {
            'user_email': 'nonexistent@example.com',
            'permission_level': 'read'
        }
        response = test_client.post(f'/api/v1/songs/{sample_song.id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        assert response.status_code == 404
        data = response.get_json()
        assert 'user not found' in data['error']['message'].lower()

    def test_get_collaborators(self, test_client, users_and_tokens, sample_song):
        """Test getting list of collaborators."""
        owner = users_and_tokens['owner']
        
        response = test_client.get(f'/api/v1/songs/{sample_song.id}/collaborators',
                                  headers=owner['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Should have owner info
        assert data['data']['owner']['user_id'] == owner['user'].id
        assert data['data']['owner']['email'] == owner['user'].email
        
        # Should have 2 collaborators (editor and reader)
        collaborators = data['data']['collaborators']
        assert len(collaborators) == 2
        
        # Check collaborators details
        emails = [c['email'] for c in collaborators]
        assert 'editor@example.com' in emails
        assert 'reader@example.com' in emails
        
        # Check permission levels
        for collaborator in collaborators:
            if collaborator['email'] == 'editor@example.com':
                assert collaborator['permission_level'] == 'edit'
            elif collaborator['email'] == 'reader@example.com':
                assert collaborator['permission_level'] == 'read'

    def test_get_collaborators_as_collaborator(self, test_client, users_and_tokens, sample_song):
        """Test getting collaborators list as a collaborator."""
        editor = users_and_tokens['editor']
        
        response = test_client.get(f'/api/v1/songs/{sample_song.id}/collaborators',
                                  headers=editor['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['data']['collaborators']) == 2

    def test_get_collaborators_unauthorized(self, test_client, users_and_tokens, sample_song):
        """Test getting collaborators without access to song."""
        unauthorized = users_and_tokens['unauthorized']
        
        response = test_client.get(f'/api/v1/songs/{sample_song.id}/collaborators',
                                  headers=unauthorized['headers'])
        
        assert response.status_code == 404

    def test_update_permissions(self, test_client, users_and_tokens, sample_song):
        """Test updating user permissions."""
        owner = users_and_tokens['owner']
        reader = users_and_tokens['reader']['user']
        
        # Update reader to editor
        update_data = {
            'user_email': reader.email,
            'permission_level': 'admin'
        }
        response = test_client.put(f'/api/v1/songs/{sample_song.id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=owner['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['old_permission'] == 'read'
        assert data['data']['new_permission'] == 'admin'
        assert data['data']['user_email'] == reader.email

    def test_update_permissions_insufficient_access(self, test_client, users_and_tokens, sample_song):
        """Test updating permissions without admin access."""
        editor = users_and_tokens['editor']
        reader = users_and_tokens['reader']['user']
        
        update_data = {
            'user_email': reader.email,
            'permission_level': 'edit'
        }
        response = test_client.put(f'/api/v1/songs/{sample_song.id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=editor['headers'])
        
        assert response.status_code == 403

    def test_update_permissions_own_permissions(self, test_client, users_and_tokens, sample_song):
        """Test trying to update own permissions (should fail)."""
        owner = users_and_tokens['owner']
        
        update_data = {
            'user_email': owner['user'].email,
            'permission_level': 'read'  # Try to downgrade own permissions
        }
        response = test_client.put(f'/api/v1/songs/{sample_song.id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=owner['headers'])
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'cannot change your own permissions' in data['error']['message'].lower()

    def test_revoke_access(self, test_client, users_and_tokens):
        """Test revoking user access."""
        owner = users_and_tokens['owner']
        reader = users_and_tokens['reader']['user']
        
        # Create a fresh song for this test
        song = Song('Revoke Test Song', owner['user'].id, '{title: Revoke Test Song}\n[C]Test [G]content')
        song.add_shared_user(reader.id, 'read')
        db.session.add(song)
        db.session.commit()
        
        response = test_client.delete(f'/api/v1/songs/{song.id}/share/{reader.id}',
                                     headers=owner['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        assert reader.email in data['message']
        
        # Verify reader can no longer access the song
        reader_headers = users_and_tokens['reader']['headers']
        response = test_client.get(f'/api/v1/songs/{song.id}',
                                  headers=reader_headers)
        assert response.status_code == 404

    def test_revoke_access_insufficient_permissions(self, test_client, users_and_tokens, sample_song):
        """Test revoking access without admin permissions."""
        editor = users_and_tokens['editor']
        reader = users_and_tokens['reader']['user']
        
        response = test_client.delete(f'/api/v1/songs/{sample_song.id}/share/{reader.id}',
                                     headers=editor['headers'])
        
        assert response.status_code == 403

    def test_revoke_own_access(self, test_client, users_and_tokens, sample_song):
        """Test trying to revoke own access (should fail)."""
        owner = users_and_tokens['owner']
        
        response = test_client.delete(f'/api/v1/songs/{sample_song.id}/share/{owner["user"].id}',
                                     headers=owner['headers'])
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'cannot revoke your own access' in data['error']['message'].lower()

    def test_revoke_access_user_without_access(self, test_client, users_and_tokens, sample_song):
        """Test revoking access from user who doesn't have access."""
        owner = users_and_tokens['owner']
        unauthorized = users_and_tokens['unauthorized']['user']
        
        response = test_client.delete(f'/api/v1/songs/{sample_song.id}/share/{unauthorized.id}',
                                     headers=owner['headers'])
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'does not have access' in data['error']['message'].lower()


class TestCollaborativePermissions:
    """Test collaborative permissions on existing endpoints."""

    def test_shared_song_read_access(self, test_client, users_and_tokens, sample_song):
        """Test that users with read access can view songs."""
        reader = users_and_tokens['reader']
        
        response = test_client.get(f'/api/v1/songs/{sample_song.id}',
                                  headers=reader['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['title'] == 'Collaborative Song'

    def test_shared_song_edit_access(self, test_client, users_and_tokens, sample_song):
        """Test that users with edit access can modify songs."""
        editor = users_and_tokens['editor']
        
        update_data = {
            'title': 'Updated by Editor',
            'content': '{title: Updated by Editor}\n[C]Updated [G]content'
        }
        response = test_client.put(f'/api/v1/songs/{sample_song.id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=editor['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['title'] == 'Updated by Editor'

    def test_shared_song_read_only_cannot_edit(self, test_client, users_and_tokens, sample_song):
        """Test that users with only read access cannot edit songs."""
        reader = users_and_tokens['reader']
        
        update_data = {
            'title': 'Unauthorized Edit Attempt'
        }
        response = test_client.put(f'/api/v1/songs/{sample_song.id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=reader['headers'])
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'insufficient permissions to edit' in data['error']['message'].lower()

    def test_shared_song_cannot_delete(self, test_client, users_and_tokens, sample_song):
        """Test that collaborators cannot delete songs (only owner can)."""
        editor = users_and_tokens['editor']
        
        response = test_client.delete(f'/api/v1/songs/{sample_song.id}',
                                     headers=editor['headers'])
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'only the song owner can delete' in data['error']['message'].lower()

    def test_shared_song_download_access(self, test_client, users_and_tokens, sample_song):
        """Test that users with read access can download songs."""
        reader = users_and_tokens['reader']
        
        response = test_client.get(f'/api/v1/songs/{sample_song.id}/download',
                                  headers=reader['headers'])
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'text/plain; charset=utf-8'
        assert 'Collaborative-Song.cho' in response.headers['Content-Disposition']

    def test_shared_song_sections_access(self, test_client, users_and_tokens, sample_song):
        """Test that users with read access can view song sections."""
        reader = users_and_tokens['reader']
        
        response = test_client.get(f'/api/v1/songs/{sample_song.id}/sections',
                                  headers=reader['headers'])
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'sections' in data['data']

    def test_unauthorized_user_no_access(self, test_client, users_and_tokens, sample_song):
        """Test that unauthorized users cannot access shared songs."""
        unauthorized = users_and_tokens['unauthorized']
        
        # Cannot read
        response = test_client.get(f'/api/v1/songs/{sample_song.id}',
                                  headers=unauthorized['headers'])
        assert response.status_code == 404  # API returns 404 for unauthorized access to prevent info disclosure
        
        # Cannot edit
        update_data = {'title': 'Hack attempt'}
        response = test_client.put(f'/api/v1/songs/{sample_song.id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=unauthorized['headers'])
        assert response.status_code == 404  # API returns 404 for unauthorized access to prevent info disclosure
        
        # Cannot delete
        response = test_client.delete(f'/api/v1/songs/{sample_song.id}',
                                     headers=unauthorized['headers'])
        assert response.status_code == 403  # DELETE returns 403 for unauthorized access


class TestPublicSongs:
    """Test public song sharing functionality."""

    def test_public_song_access(self, test_client, users_and_tokens):
        """Test that public songs are accessible to all users."""
        owner = users_and_tokens['owner']
        unauthorized = users_and_tokens['unauthorized']
        
        # Create a public song
        song_data = {
            'title': 'Public Song',
            'content': '{title: Public Song}\n[C]Public [G]content'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        assert response.status_code == 201
        song_id = response.get_json()['data']['id']
        
        # Make song public
        song = Song.query.get(song_id)
        song.share_settings = 'public'
        db.session.commit()
        
        # Unauthorized user should be able to read
        response = test_client.get(f'/api/v1/songs/{song_id}',
                                  headers=unauthorized['headers'])
        assert response.status_code == 200
        
        # But not edit (public gives read access only)
        update_data = {'title': 'Unauthorized Edit'}
        response = test_client.put(f'/api/v1/songs/{song_id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=unauthorized['headers'])
        assert response.status_code == 403