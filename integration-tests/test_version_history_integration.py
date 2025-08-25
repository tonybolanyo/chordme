"""Integration tests for version history API endpoints."""

import pytest
import requests
import json
import time
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from chordme import app, db
from chordme.models import User, Song, SongVersion
import threading
import socket


def find_free_port():
    """Find a free port to run the test server on."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


@pytest.fixture(scope="module")
def test_server():
    """Start a test server instance."""
    port = find_free_port()
    base_url = f"http://localhost:{port}"
    
    # Configure the app for testing
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET'] = 'test_secret_key'
    app.config['JWT_EXPIRATION_DELTA'] = 3600
    app.config['HTTPS_ENFORCED'] = False
    
    with app.app_context():
        db.create_all()
        
        # Start the server in a separate thread
        server_thread = threading.Thread(
            target=lambda: app.run(host='localhost', port=port, debug=False, use_reloader=False)
        )
        server_thread.daemon = True
        server_thread.start()
        
        # Wait for server to start
        max_retries = 50
        for _ in range(max_retries):
            try:
                response = requests.get(f"{base_url}/api/v1/health", timeout=1)
                if response.status_code == 200:
                    break
            except requests.exceptions.RequestException:
                pass
            time.sleep(0.1)
        else:
            pytest.fail("Test server failed to start")
        
        yield base_url


class TestVersionHistoryIntegration:
    """Test version history API endpoints integration."""
    
    def test_version_history_workflow(self, test_server):
        """Test the complete version history workflow."""
        base_url = test_server
        
        # 1. Register a user
        registration_data = {
            'email': 'versiontest@example.com',
            'password': 'TestPassword123'
        }
        
        response = requests.post(
            f"{base_url}/api/v1/auth/register",
            json=registration_data,
            headers={'Content-Type': 'application/json'}
        )
        assert response.status_code == 201
        
        # 2. Login to get token
        response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json=registration_data,
            headers={'Content-Type': 'application/json'}
        )
        assert response.status_code == 200
        
        login_data = response.json()
        token = login_data['data']['token']
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # 3. Create a song
        song_data = {
            'title': 'Version Test Song',
            'content': '{title: Version Test Song}\n{artist: Test Artist}\n\n[C]Original [G]content'
        }
        
        response = requests.post(
            f"{base_url}/api/v1/songs",
            json=song_data,
            headers=headers
        )
        assert response.status_code == 201
        
        song = response.json()['data']
        song_id = song['id']
        
        # 4. Check initial version history (should be empty)
        response = requests.get(
            f"{base_url}/api/v1/songs/{song_id}/versions",
            headers=headers
        )
        assert response.status_code == 200
        versions_data = response.json()
        assert len(versions_data['data']['versions']) == 0
        
        # 5. Update the song (this should create a version)
        updated_song_data = {
            'title': 'Version Test Song Updated',
            'content': '{title: Version Test Song Updated}\n{artist: Test Artist}\n\n[C]Updated [G]content'
        }
        
        response = requests.put(
            f"{base_url}/api/v1/songs/{song_id}",
            json=updated_song_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # 6. Check version history (should have 1 version now)
        response = requests.get(
            f"{base_url}/api/v1/songs/{song_id}/versions",
            headers=headers
        )
        assert response.status_code == 200
        versions_data = response.json()
        versions = versions_data['data']['versions']
        assert len(versions) == 1
        
        # Verify the version contains the original content
        version = versions[0]
        assert version['title'] == 'Version Test Song'  # Original title
        assert '[C]Original [G]content' in version['content']  # Original content
        assert version['version_number'] == 1
        
        # 7. Make another update
        second_update_data = {
            'title': 'Version Test Song Second Update',
            'content': '{title: Version Test Song Second Update}\n{artist: Test Artist}\n\n[C]Second [G]update'
        }
        
        response = requests.put(
            f"{base_url}/api/v1/songs/{song_id}",
            json=second_update_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # 8. Check version history (should have 2 versions now)
        response = requests.get(
            f"{base_url}/api/v1/songs/{song_id}/versions",
            headers=headers
        )
        assert response.status_code == 200
        versions_data = response.json()
        versions = versions_data['data']['versions']
        assert len(versions) == 2
        
        # Verify versions are ordered correctly (newest first)
        assert versions[0]['version_number'] == 2  # Most recent version
        assert versions[1]['version_number'] == 1  # Original version
        
        # 9. Get a specific version
        version_id = versions[1]['id']  # Get the first version
        response = requests.get(
            f"{base_url}/api/v1/songs/{song_id}/versions/{version_id}",
            headers=headers
        )
        assert response.status_code == 200
        version_data = response.json()['data']
        assert version_data['title'] == 'Version Test Song'
        assert '[C]Original [G]content' in version_data['content']
        
        # 10. Restore to the first version
        response = requests.post(
            f"{base_url}/api/v1/songs/{song_id}/restore/{version_id}",
            headers=headers
        )
        assert response.status_code == 200
        restored_song = response.json()['data']
        assert restored_song['title'] == 'Version Test Song'  # Restored to original title
        assert '[C]Original [G]content' in restored_song['content']  # Restored to original content
        
        # 11. Verify the restoration created a new version
        response = requests.get(
            f"{base_url}/api/v1/songs/{song_id}/versions",
            headers=headers
        )
        assert response.status_code == 200
        versions_data = response.json()
        versions = versions_data['data']['versions']
        assert len(versions) == 3  # Should now have 3 versions due to the restoration
    
    def test_version_history_permissions(self, test_server):
        """Test that version history respects song permissions."""
        base_url = test_server
        
        # Create two users
        user1_data = {'email': 'user1@example.com', 'password': 'TestPassword123'}
        user2_data = {'email': 'user2@example.com', 'password': 'TestPassword123'}
        
        # Register both users
        for user_data in [user1_data, user2_data]:
            response = requests.post(
                f"{base_url}/api/v1/auth/register",
                json=user_data,
                headers={'Content-Type': 'application/json'}
            )
            assert response.status_code == 201
        
        # Login as user1 and create a song
        response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json=user1_data,
            headers={'Content-Type': 'application/json'}
        )
        user1_token = response.json()['data']['token']
        user1_headers = {
            'Authorization': f'Bearer {user1_token}',
            'Content-Type': 'application/json'
        }
        
        song_data = {
            'title': 'Private Song',
            'content': '{title: Private Song}\n[C]Private content'
        }
        
        response = requests.post(
            f"{base_url}/api/v1/songs",
            json=song_data,
            headers=user1_headers
        )
        song_id = response.json()['data']['id']
        
        # Login as user2
        response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json=user2_data,
            headers={'Content-Type': 'application/json'}
        )
        user2_token = response.json()['data']['token']
        user2_headers = {
            'Authorization': f'Bearer {user2_token}',
            'Content-Type': 'application/json'
        }
        
        # User2 should not be able to access version history
        response = requests.get(
            f"{base_url}/api/v1/songs/{song_id}/versions",
            headers=user2_headers
        )
        assert response.status_code == 404  # Song not found due to permissions
        
        # User2 should not be able to restore versions
        response = requests.post(
            f"{base_url}/api/v1/songs/{song_id}/restore/1",
            headers=user2_headers
        )
        assert response.status_code == 404  # Song not found due to permissions
    
    def test_version_history_edge_cases(self, test_server):
        """Test version history edge cases and error conditions."""
        base_url = test_server
        
        # Register and login
        user_data = {'email': 'edgecase@example.com', 'password': 'TestPassword123'}
        
        response = requests.post(
            f"{base_url}/api/v1/auth/register",
            json=user_data,
            headers={'Content-Type': 'application/json'}
        )
        
        response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json=user_data,
            headers={'Content-Type': 'application/json'}
        )
        
        token = response.json()['data']['token']
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # Test with non-existent song ID
        response = requests.get(
            f"{base_url}/api/v1/songs/99999/versions",
            headers=headers
        )
        assert response.status_code == 404
        
        # Test with non-existent version ID
        song_data = {'title': 'Test Song', 'content': '{title: Test Song}\n[C]Content'}
        response = requests.post(
            f"{base_url}/api/v1/songs",
            json=song_data,
            headers=headers
        )
        song_id = response.json()['data']['id']
        
        response = requests.get(
            f"{base_url}/api/v1/songs/{song_id}/versions/99999",
            headers=headers
        )
        assert response.status_code == 404
        
        # Test restore with non-existent version
        response = requests.post(
            f"{base_url}/api/v1/songs/{song_id}/restore/99999",
            headers=headers
        )
        assert response.status_code == 404