"""
Multi-user integration tests for collaborative editing scenarios.
Tests complex collaboration workflows with simulated multiple users.
"""

import pytest
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from chordme import app, db
from chordme.models import User, Song


@pytest.fixture
def test_client():
    """Create a test client for integration testing."""
    app.config['TESTING'] = True
    app.config['HTTPS_ENFORCED'] = False
    
    with app.test_client() as client:
        with app.app_context():
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
def collaboration_team(test_client):
    """Create a team of users for collaboration testing."""
    from chordme.utils import generate_jwt_token
    
    team = {}
    roles = [
        ('songwriter', 'songwriter@band.com'),
        ('lyricist', 'lyricist@band.com'),
        ('guitarist', 'guitarist@band.com'),
        ('bassist', 'bassist@band.com'),
        ('drummer', 'drummer@band.com'),
        ('producer', 'producer@studio.com'),
        ('manager', 'manager@company.com'),
        ('guest1', 'guest1@example.com'),
        ('guest2', 'guest2@example.com'),
        ('guest3', 'guest3@example.com'),
    ]
    
    for role, email in roles:
        user = User(email, 'BandPass123!')
        db.session.add(user)
        db.session.commit()
        
        token = generate_jwt_token(user.id)
        team[role] = {
            'user': user,
            'token': token,
            'headers': {'Authorization': f'Bearer {token}'},
            'email': email
        }
    
    return team


@pytest.fixture
def band_song(collaboration_team):
    """Create a song for the band to collaborate on."""
    songwriter = collaboration_team['songwriter']['user']
    
    song = Song(
        'Our New Hit',
        songwriter.id,
        '''{title: Our New Hit}
{artist: The Collaborative Band}
{key: C}

{start_of_verse}
[C]This is where our [Am]story begins
[F]Working together [G]through thick and thin
{end_of_verse}

{start_of_chorus}
[Am]We are [F]stronger to[C]gether
[Am]Creating [F]something that lasts for[G]ever
{end_of_chorus}'''
    )
    
    # Set up initial collaborators with different permissions
    song.add_shared_user(collaboration_team['lyricist']['user'].id, 'edit')
    song.add_shared_user(collaboration_team['guitarist']['user'].id, 'edit')
    song.add_shared_user(collaboration_team['bassist']['user'].id, 'edit')
    song.add_shared_user(collaboration_team['drummer']['user'].id, 'read')
    song.add_shared_user(collaboration_team['producer']['user'].id, 'admin')
    song.add_shared_user(collaboration_team['manager']['user'].id, 'read')
    
    db.session.add(song)
    db.session.commit()
    
    return song


class TestCollaborativeWorkflows:
    """Test complete collaborative workflows from start to finish."""

    def test_song_creation_and_sharing_workflow(self, test_client, collaboration_team):
        """Test the complete workflow of creating and sharing a song."""
        songwriter = collaboration_team['songwriter']
        lyricist = collaboration_team['lyricist']
        producer = collaboration_team['producer']
        
        # Step 1: Songwriter creates initial song
        song_data = {
            'title': 'Workflow Test Song',
            'content': '{title: Workflow Test Song}\n[C]Initial melody idea'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=songwriter['headers'])
        assert response.status_code == 201
        song_id = response.get_json()['data']['id']
        
        # Step 2: Share with lyricist for editing
        share_data = {
            'user_email': lyricist['email'],
            'permission_level': 'edit'
        }
        response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=songwriter['headers'])
        assert response.status_code == 200
        
        # Step 3: Lyricist adds lyrics
        lyrics_update = {
            'content': '''{title: Workflow Test Song}
[C]Initial melody idea with [Am]words that flow
[F]Lyrics that tell our [G]story'''
        }
        response = test_client.put(f'/api/v1/songs/{song_id}',
                                  data=json.dumps(lyrics_update),
                                  content_type='application/json',
                                  headers=lyricist['headers'])
        assert response.status_code == 200
        
        # Step 4: Share with producer as admin
        share_data = {
            'user_email': producer['email'],
            'permission_level': 'admin'
        }
        response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=songwriter['headers'])
        assert response.status_code == 200
        
        # Step 5: Producer reviews and manages permissions
        response = test_client.get(f'/api/v1/songs/{song_id}/collaborators',
                                  headers=producer['headers'])
        assert response.status_code == 200
        collaborators = response.get_json()['data']['collaborators']
        assert len(collaborators) == 2  # lyricist and producer
        
        # Step 6: Verify final song state
        response = test_client.get(f'/api/v1/songs/{song_id}',
                                  headers=songwriter['headers'])
        assert response.status_code == 200
        final_song = response.get_json()['data']
        assert 'words that flow' in final_song['content']
        assert 'story' in final_song['content']

    def test_permission_escalation_workflow(self, test_client, collaboration_team, band_song):
        """Test workflow for escalating permissions during collaboration."""
        songwriter = collaboration_team['songwriter']
        drummer = collaboration_team['drummer']
        producer = collaboration_team['producer']
        
        # Step 1: Drummer (read-only) requests to contribute
        # (In real app, this would be a request system, here we simulate producer granting access)
        
        # Step 2: Producer upgrades drummer to editor
        update_data = {
            'user_email': drummer['user'].email,
            'permission_level': 'edit'
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=producer['headers'])
        assert response.status_code == 200
        
        # Step 3: Drummer can now edit the song
        drum_update = {
            'content': band_song.content + '\n\n{comment: Added drum notation}\n[C]Kick on 1 and 3, snare on 2 and 4'
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(drum_update),
                                  content_type='application/json',
                                  headers=drummer['headers'])
        assert response.status_code == 200
        
        # Step 4: Later, producer revokes edit access
        update_data = {
            'user_email': drummer['user'].email,
            'permission_level': 'read'
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=producer['headers'])
        assert response.status_code == 200
        
        # Step 5: Drummer can no longer edit
        another_update = {
            'content': band_song.content + '\n[C]This should not work'
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(another_update),
                                  content_type='application/json',
                                  headers=drummer['headers'])
        assert response.status_code == 403

    def test_collaborative_editing_session(self, test_client, collaboration_team, band_song):
        """Test a realistic collaborative editing session with multiple users."""
        songwriter = collaboration_team['songwriter']
        lyricist = collaboration_team['lyricist']
        guitarist = collaboration_team['guitarist']
        bassist = collaboration_team['bassist']
        
        # Simulate a collaborative editing session where multiple users make changes
        edits = [
            (lyricist, 'Add second verse', '''
{start_of_verse}
[C]Through the ups and [Am]downs we face
[F]Music keeps us [G]in this place
{end_of_verse}'''),
            (guitarist, 'Add guitar solo', '''
{start_of_solo}
[C] [Am] [F] [G]
[C] [Am] [F] [G]
{end_of_solo}'''),
            (bassist, 'Add bass line notes', '''
{comment: Bass line - root notes with walking}
[C]Root on C [Am]Root on A [F]Root on F [G]Walk up to G'''),
            (songwriter, 'Add bridge', '''
{start_of_bridge}
[F]When we [C]play as [G]one
[F]Magic [C]has be[G]gun
{end_of_bridge}'''),
        ]
        
        # Apply edits sequentially (simulating real-time collaboration)
        current_content = band_song.content
        for user, description, addition in edits:
            updated_content = current_content + '\n' + addition
            update_data = {
                'content': updated_content,
                'title': f'Our New Hit - {description}'
            }
            
            response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                      data=json.dumps(update_data),
                                      content_type='application/json',
                                      headers=user['headers'])
            assert response.status_code == 200
            
            # Update current content for next iteration
            current_content = updated_content
            time.sleep(0.1)  # Small delay to simulate real-time
        
        # Verify final song contains all contributions
        response = test_client.get(f'/api/v1/songs/{band_song.id}',
                                  headers=songwriter['headers'])
        assert response.status_code == 200
        final_song = response.get_json()['data']
        
        assert 'ups and downs' in final_song['content']  # Lyricist addition
        assert 'solo' in final_song['content']           # Guitarist addition
        assert 'Bass line' in final_song['content']      # Bassist addition
        assert 'Magic has begun' in final_song['content'] # Songwriter bridge


class TestConcurrentCollaboration:
    """Test concurrent collaboration scenarios."""

    def test_concurrent_edits_by_multiple_users(self, test_client, collaboration_team, band_song):
        """Test handling of concurrent edits by multiple users."""
        users_with_edit_access = [
            collaboration_team['songwriter'],
            collaboration_team['lyricist'],
            collaboration_team['guitarist'],
            collaboration_team['bassist'],
        ]
        
        def make_concurrent_edit(user, edit_suffix):
            """Make a concurrent edit with a unique identifier."""
            update_data = {
                'content': band_song.content + f'\n{{comment: Edit by {user["email"]} - {edit_suffix}}}',
                'title': f'Concurrent Edit - {edit_suffix}'
            }
            return test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=user['headers'])
        
        # Execute concurrent edits
        results = []
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(make_concurrent_edit, user, f'edit_{i}')
                for i, user in enumerate(users_with_edit_access)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        # At least one edit should succeed (last writer wins)
        successful_edits = [r for r in results if r.status_code == 200]
        assert len(successful_edits) >= 1
        
        # Verify the final state is consistent
        response = test_client.get(f'/api/v1/songs/{band_song.id}',
                                  headers=collaboration_team['songwriter']['headers'])
        assert response.status_code == 200
        final_content = response.get_json()['data']['content']
        
        # Should contain original content plus one of the edits
        assert 'Our New Hit' in final_content
        assert 'Edit by' in final_content

    def test_concurrent_permission_changes(self, test_client, collaboration_team, band_song):
        """Test concurrent permission changes by multiple admins."""
        songwriter = collaboration_team['songwriter']
        producer = collaboration_team['producer']
        guest_users = [
            collaboration_team['guest1'],
            collaboration_team['guest2'],
            collaboration_team['guest3'],
        ]
        
        # First, add guests as readers
        for guest in guest_users:
            share_data = {
                'user_email': guest['email'],
                'permission_level': 'read'
            }
            response = test_client.post(f'/api/v1/songs/{band_song.id}/share',
                                       data=json.dumps(share_data),
                                       content_type='application/json',
                                       headers=songwriter['headers'])
            assert response.status_code == 200
        
        # Now have both songwriter and producer try to change permissions concurrently
        def change_permission(admin_user, target_user, permission):
            update_data = {
                'user_id': target_user['user'].id,
                'permission_level': permission
            }
            return test_client.put(f'/api/v1/songs/{band_song.id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=admin_user['headers'])
        
        # Concurrent permission changes
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = [
                executor.submit(change_permission, songwriter, guest_users[0], 'edit'),
                executor.submit(change_permission, producer, guest_users[0], 'admin'),
                executor.submit(change_permission, songwriter, guest_users[1], 'edit'),
                executor.submit(change_permission, producer, guest_users[2], 'edit'),
            ]
            results = [future.result() for future in as_completed(futures)]
        
        # All permission changes should succeed (they don't conflict with each other)
        successful_changes = [r for r in results if r.status_code == 200]
        assert len(successful_changes) >= 3
        
        # Verify final permissions are consistent
        response = test_client.get(f'/api/v1/songs/{band_song.id}/collaborators',
                                  headers=songwriter['headers'])
        assert response.status_code == 200
        collaborators = response.get_json()['data']['collaborators']
        
        # Should have all the guests with updated permissions
        guest_permissions = {
            collab['user_id']: collab['permission_level']
            for collab in collaborators
            if collab['user_id'] in [g['user'].id for g in guest_users]
        }
        assert len(guest_permissions) == 3

    def test_rapid_collaboration_session(self, test_client, collaboration_team, band_song):
        """Test rapid collaboration with many quick edits."""
        active_collaborators = [
            collaboration_team['songwriter'],
            collaboration_team['lyricist'],
            collaboration_team['guitarist'],
        ]
        
        edit_count = 0
        edit_lock = threading.Lock()
        
        def rapid_editor(user, duration=5):
            """Make rapid edits for a specified duration."""
            nonlocal edit_count
            end_time = time.time() + duration
            local_edits = 0
            
            while time.time() < end_time:
                with edit_lock:
                    edit_count += 1
                    current_edit = edit_count
                
                update_data = {
                    'content': band_song.content + f'\n{{comment: Rapid edit #{current_edit} by {user["email"]}}}',
                }
                
                response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                          data=json.dumps(update_data),
                                          content_type='application/json',
                                          headers=user['headers'])
                
                if response.status_code == 200:
                    local_edits += 1
                
                time.sleep(0.1)  # Brief pause between edits
            
            return local_edits
        
        # Run rapid collaboration session
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(rapid_editor, user, 3)  # 3 second sessions
                for user in active_collaborators
            ]
            edit_counts = [future.result() for future in as_completed(futures)]
        
        total_successful_edits = sum(edit_counts)
        assert total_successful_edits >= 5  # Should handle multiple rapid edits
        
        # Verify final song state is still consistent
        response = test_client.get(f'/api/v1/songs/{band_song.id}',
                                  headers=collaboration_team['songwriter']['headers'])
        assert response.status_code == 200
        final_song = response.get_json()['data']
        assert 'Our New Hit' in final_song['content']


class TestCollaborationErrorRecovery:
    """Test error handling and recovery in collaboration scenarios."""

    def test_network_interruption_simulation(self, test_client, collaboration_team, band_song):
        """Test collaboration resilience to network interruptions."""
        lyricist = collaboration_team['lyricist']
        guitarist = collaboration_team['guitarist']
        
        # Successful edit
        update_data = {
            'content': band_song.content + '\n{comment: Before interruption}',
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=lyricist['headers'])
        assert response.status_code == 200
        
        # Simulate network issue by using invalid token (simulating token expiry during network issue)
        invalid_headers = {'Authorization': 'Bearer invalid.token.here'}
        failed_update = {
            'content': band_song.content + '\n{comment: This should fail}',
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(failed_update),
                                  content_type='application/json',
                                  headers=invalid_headers)
        assert response.status_code == 401
        
        # Recovery - another user can continue working
        recovery_update = {
            'content': band_song.content + '\n{comment: After recovery}',
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(recovery_update),
                                  content_type='application/json',
                                  headers=guitarist['headers'])
        assert response.status_code == 200
        
        # Verify final state shows successful recovery
        response = test_client.get(f'/api/v1/songs/{band_song.id}',
                                  headers=collaboration_team['songwriter']['headers'])
        final_content = response.get_json()['data']['content']
        assert 'Before interruption' in final_content
        assert 'After recovery' in final_content
        assert 'This should fail' not in final_content

    def test_invalid_operation_handling(self, test_client, collaboration_team, band_song):
        """Test handling of invalid operations during collaboration."""
        guitarist = collaboration_team['guitarist']
        
        # Try to update with invalid data
        invalid_updates = [
            {'content': None},  # Null content
            {'content': ''},    # Empty content
            {'title': 'x' * 1000},  # Extremely long title
            {'invalid_field': 'test'},  # Invalid field
        ]
        
        for invalid_update in invalid_updates:
            response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                      data=json.dumps(invalid_update),
                                      content_type='application/json',
                                      headers=guitarist['headers'])
            # Should handle gracefully (not 500 error)
            assert response.status_code in [400, 422]
        
        # Verify song is still accessible and unchanged
        response = test_client.get(f'/api/v1/songs/{band_song.id}',
                                  headers=guitarist['headers'])
        assert response.status_code == 200
        current_content = response.get_json()['data']['content']
        assert 'Our New Hit' in current_content

    def test_permission_conflict_resolution(self, test_client, collaboration_team, band_song):
        """Test resolution of permission conflicts."""
        songwriter = collaboration_team['songwriter']
        producer = collaboration_team['producer']
        drummer = collaboration_team['drummer']
        
        # Scenario: Drummer tries to edit while permission is being changed
        def attempt_edit():
            update_data = {
                'content': band_song.content + '\n{comment: Drummer edit attempt}',
            }
            return test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=drummer['headers'])
        
        def change_permission():
            update_data = {
                'user_id': drummer['user'].id,
                'permission_level': 'edit'
            }
            return test_client.put(f'/api/v1/songs/{band_song.id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=producer['headers'])
        
        # Execute operations concurrently
        with ThreadPoolExecutor(max_workers=2) as executor:
            edit_future = executor.submit(attempt_edit)
            permission_future = executor.submit(change_permission)
            
            edit_result = edit_future.result()
            permission_result = permission_future.result()
        
        # Permission change should succeed
        assert permission_result.status_code == 200
        
        # Edit may succeed or fail depending on timing, but should handle gracefully
        assert edit_result.status_code in [200, 403]
        
        # After permission change, drummer should be able to edit
        retry_update = {
            'content': band_song.content + '\n{comment: Drummer edit after permission change}',
        }
        response = test_client.put(f'/api/v1/songs/{band_song.id}',
                                  data=json.dumps(retry_update),
                                  content_type='application/json',
                                  headers=drummer['headers'])
        assert response.status_code == 200


class TestLargeScaleCollaboration:
    """Test collaboration with many users and complex scenarios."""

    def test_large_team_collaboration(self, test_client, collaboration_team):
        """Test collaboration with a large team of users."""
        songwriter = collaboration_team['songwriter']
        
        # Create a song for large team collaboration
        song_data = {
            'title': 'Large Team Collaboration',
            'content': '{title: Large Team Collaboration}\n[C]Starting point for team'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=songwriter['headers'])
        song_id = response.get_json()['data']['id']
        
        # Add all team members with various permissions
        team_members = [
            ('lyricist', 'edit'),
            ('guitarist', 'edit'),
            ('bassist', 'edit'),
            ('drummer', 'read'),
            ('producer', 'admin'),
            ('manager', 'read'),
            ('guest1', 'read'),
            ('guest2', 'read'),
            ('guest3', 'read'),
        ]
        
        for role, permission in team_members:
            share_data = {
                'user_email': collaboration_team[role]['email'],
                'permission_level': permission
            }
            response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                       data=json.dumps(share_data),
                                       content_type='application/json',
                                       headers=songwriter['headers'])
            assert response.status_code == 200
        
        # Simulate large team collaboration session
        editors = ['lyricist', 'guitarist', 'bassist']
        readers = ['drummer', 'manager', 'guest1', 'guest2', 'guest3']
        
        def collaborative_edit(role, section):
            user = collaboration_team[role]
            update_data = {
                'content': song_data['content'] + f'\n{{start_of_{section}}}\n[C]{role} contribution\n{{end_of_{section}}}',
                'title': f'Large Team - {section} by {role}'
            }
            return test_client.put(f'/api/v1/songs/{song_id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=user['headers'])
        
        def read_and_verify(role):
            user = collaboration_team[role]
            return test_client.get(f'/api/v1/songs/{song_id}',
                                  headers=user['headers'])
        
        # Execute large team operations
        with ThreadPoolExecutor(max_workers=12) as executor:
            # Editors make changes
            edit_futures = [
                executor.submit(collaborative_edit, role, f'section_{i}')
                for i, role in enumerate(editors)
            ]
            
            # Readers access the song
            read_futures = [
                executor.submit(read_and_verify, role)
                for role in readers
            ]
            
            edit_results = [future.result() for future in edit_futures]
            read_results = [future.result() for future in read_futures]
        
        # Verify results
        successful_edits = [r for r in edit_results if r.status_code == 200]
        successful_reads = [r for r in read_results if r.status_code == 200]
        
        assert len(successful_edits) >= 1  # At least one edit should succeed
        assert len(successful_reads) >= 3  # Most reads should succeed
        
        # Verify final collaborator count
        response = test_client.get(f'/api/v1/songs/{song_id}/collaborators',
                                  headers=songwriter['headers'])
        collaborators = response.get_json()['data']['collaborators']
        assert len(collaborators) == len(team_members)  # All team members added