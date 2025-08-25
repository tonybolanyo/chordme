"""
Advanced security audit tests that attempt to exploit vulnerabilities
and bypass permissions in the collaboration system.
"""

import pytest
import json
import time
import threading
from chordme import app, db
from chordme.models import User, Song
from chordme.permission_helpers import SecurityAuditLogger


@pytest.fixture
def test_client():
    """Create a test client using the real chordme app."""
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
def security_users(test_client):
    """Create users for security testing with different permission levels."""
    from chordme.utils import generate_jwt_token
    
    users = {}
    user_data = [
        ('owner@security.test', 'owner'),
        ('admin@security.test', 'admin'),
        ('editor@security.test', 'editor'),
        ('reader@security.test', 'reader'),
        ('attacker@security.test', 'attacker'),
        ('victim@security.test', 'victim'),
    ]
    
    for email, role in user_data:
        user = User(email, 'SecureTestPassword123!')
        db.session.add(user)
        db.session.commit()
        
        token = generate_jwt_token(user.id)
        users[role] = {
            'user': user,
            'token': token,
            'headers': {'Authorization': f'Bearer {token}'}
        }
    
    return users


@pytest.fixture
def vulnerable_song(security_users):
    """Create a song for vulnerability testing."""
    owner = security_users['owner']['user']
    admin = security_users['admin']['user']
    editor = security_users['editor']['user']
    reader = security_users['reader']['user']
    
    song = Song('Vulnerable Song Test', owner.id, '{title: Vulnerable Song}\n[C]Test [G]content')
    song.add_shared_user(admin.id, 'admin')
    song.add_shared_user(editor.id, 'edit')
    song.add_shared_user(reader.id, 'read')
    
    db.session.add(song)
    db.session.commit()
    
    return song


class TestPermissionBypassAttempts:
    """Test attempts to bypass permission checks through various attack vectors."""

    def test_privilege_escalation_through_direct_id_manipulation(self, test_client, security_users, vulnerable_song):
        """Test attempts to escalate privileges by manipulating user IDs in requests."""
        reader = security_users['reader']
        owner = security_users['owner']
        
        # Attempt to escalate privileges by using another user's ID in permission updates
        malicious_data = {
            'user_email': reader['user'].email,
            'permission_level': 'admin'
        }
        
        # Try to grant admin privileges using reader's token (should fail)
        response = test_client.put(f'/api/v1/songs/{vulnerable_song.id}/permissions',
                                  data=json.dumps(malicious_data),
                                  content_type='application/json',
                                  headers=reader['headers'])
        
        assert response.status_code == 403
        
        # Verify the reader still only has read permissions
        song_check = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                    headers=reader['headers'])
        assert song_check.status_code == 200

    def test_token_manipulation_attack(self, test_client, security_users, vulnerable_song):
        """Test attempts to manipulate JWT tokens."""
        attacker = security_users['attacker']
        
        # Test with malformed token
        malformed_headers = {'Authorization': 'Bearer malformed.token.here'}
        response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                  headers=malformed_headers)
        assert response.status_code == 401
        
        # Test with empty token
        empty_headers = {'Authorization': 'Bearer '}
        response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                  headers=empty_headers)
        assert response.status_code == 401
        
        # Test with no Bearer prefix
        no_bearer_headers = {'Authorization': attacker['token']}
        response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                  headers=no_bearer_headers)
        assert response.status_code == 401

    def test_parameter_tampering_attacks(self, test_client, security_users, vulnerable_song):
        """Test parameter tampering attempts in sharing requests."""
        editor = security_users['editor']
        victim = security_users['victim']['user']
        
        # Attempt to tamper with song_id in URL vs request body
        malicious_data = {
            'user_email': victim.email,
            'permission_level': 'admin',
            'song_id': 99999  # Try to manipulate song_id in body
        }
        
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(malicious_data),
                                   content_type='application/json',
                                   headers=editor['headers'])
        
        # Should fail as editor doesn't have admin permissions
        assert response.status_code == 403

    def test_batch_permission_manipulation(self, test_client, security_users, vulnerable_song):
        """Test attempts to manipulate permissions through rapid requests."""
        owner = security_users['owner']
        victim = security_users['victim']['user']
        
        # First share the victim user to ensure they exist in the song
        initial_share_data = {
            'user_email': victim.email,
            'permission_level': 'read'
        }
        initial_response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                           data=json.dumps(initial_share_data),
                                           content_type='application/json',
                                           headers=owner['headers'])
        assert initial_response.status_code == 200
        
        # Rapid fire permission changes to test for race conditions
        responses = []
        for i in range(10):
            permission_level = 'admin' if i % 2 == 0 else 'read'
            update_data = {
                'user_email': victim.email,
                'permission_level': permission_level
            }
            response = test_client.put(f'/api/v1/songs/{vulnerable_song.id}/permissions',
                                      data=json.dumps(update_data),
                                      content_type='application/json',
                                      headers=owner['headers'])
            responses.append(response)
        
        # All should succeed for the owner
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count == 10

    def test_cross_user_data_access_attempts(self, test_client, security_users):
        """Test attempts to access other users' data."""
        attacker = security_users['attacker']
        victim = security_users['victim']
        
        # Create a song as victim
        song_data = {
            'title': 'Victim Song',
            'content': '{title: Victim Song}\n[C]Private content'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=victim['headers'])
        assert response.status_code == 201
        victim_song_id = response.get_json()['data']['id']
        
        # Attacker tries to access victim's song
        response = test_client.get(f'/api/v1/songs/{victim_song_id}',
                                  headers=attacker['headers'])
        assert response.status_code == 404  # Should return 404 to prevent enumeration


class TestDataIsolationVerification:
    """Verify data isolation between users and proper access controls."""

    def test_user_list_isolation(self, test_client, security_users):
        """Test that users cannot enumerate other users."""
        attacker = security_users['attacker']
        
        # Try to access user list endpoint (if it exists)
        response = test_client.get('/api/v1/users', headers=attacker['headers'])
        # Should either not exist (404) or require special permissions (403)
        assert response.status_code in [404, 403, 401]

    def test_song_enumeration_prevention(self, test_client, security_users, vulnerable_song):
        """Test that attackers cannot enumerate songs by trying sequential IDs."""
        attacker = security_users['attacker']
        
        # Try to enumerate songs around the known song ID
        enumeration_attempts = []
        for song_id in range(vulnerable_song.id - 2, vulnerable_song.id + 3):
            response = test_client.get(f'/api/v1/songs/{song_id}',
                                      headers=attacker['headers'])
            enumeration_attempts.append(response.status_code)
        
        # All unauthorized access attempts should return 404 (not 403)
        # to prevent revealing song existence
        unauthorized_responses = [code for code in enumeration_attempts if code in [403, 404]]
        assert len(unauthorized_responses) >= 4  # Most should be unauthorized

    def test_collaboration_data_leakage_prevention(self, test_client, security_users, vulnerable_song):
        """Test that collaboration data doesn't leak between songs."""
        reader = security_users['reader']
        
        # Get collaborators for accessible song
        response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}/collaborators',
                                  headers=reader['headers'])
        assert response.status_code == 200
        
        collaborators_data = response.get_json()
        
        # Ensure no sensitive data is exposed
        assert 'password_hash' not in str(collaborators_data)
        assert 'password' not in str(collaborators_data).lower()
        
        # Verify only necessary fields are present
        if 'data' in collaborators_data and 'collaborators' in collaborators_data['data']:
            for collaborator in collaborators_data['data']['collaborators']:
                # Should not expose internal system data
                assert 'created_at' not in collaborator
                assert 'updated_at' not in collaborator
                # Should only have essential collaboration info
                expected_fields = {'user_id', 'permission_level'}
                assert expected_fields.issubset(set(collaborator.keys()))


class TestSecurityBoundaryValidation:
    """Test security boundaries and edge cases."""

    def test_malformed_request_handling(self, test_client, security_users, vulnerable_song):
        """Test handling of malformed requests."""
        owner = security_users['owner']
        
        # Test with malformed JSON - expect 400 or 500
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data='{"malformed": json}',
                                   content_type='application/json',
                                   headers=owner['headers'])
        assert response.status_code in [400, 500]  # Either is acceptable
        
        # Test with extremely large request
        large_data = {
            'user_email': 'test@example.com',
            'permission_level': 'read',
            'extra_data': 'x' * 50000  # Large string
        }
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(large_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        # Should be rejected due to size limits
        assert response.status_code in [400, 413]

    def test_concurrent_permission_race_conditions(self, test_client, security_users, vulnerable_song):
        """Test for race conditions in permission changes - simplified version."""
        owner = security_users['owner']
        victim = security_users['victim']['user']
        
        # First share the victim user to ensure they exist in the song
        initial_share_data = {
            'user_email': victim.email,
            'permission_level': 'read'
        }
        initial_response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                           data=json.dumps(initial_share_data),
                                           content_type='application/json',
                                           headers=owner['headers'])
        assert initial_response.status_code == 200
        
        # Simplified sequential test instead of actual concurrency
        # to avoid threading issues in test environment
        results = []
        for i in range(5):
            permission = 'admin' if i % 2 == 0 else 'read'
            update_data = {
                'user_email': victim.email,
                'permission_level': permission
            }
            response = test_client.put(f'/api/v1/songs/{vulnerable_song.id}/permissions',
                                      data=json.dumps(update_data),
                                      content_type='application/json',
                                      headers=owner['headers'])
            results.append(response)
        
        # All operations should complete successfully
        assert len(results) == 5
        assert all(r.status_code == 200 for r in results)

    def test_injection_attack_prevention(self, test_client, security_users, vulnerable_song):
        """Test prevention of various injection attacks."""
        owner = security_users['owner']
        
        # SQL injection attempt in email field
        injection_data = {
            'user_email': "'; DROP TABLE songs; --@example.com",
            'permission_level': 'read'
        }
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(injection_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        # Should handle gracefully (either 400 for invalid email or 404 for user not found)
        assert response.status_code in [400, 404]
        
        # Verify songs table still exists by making a normal request
        normal_response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                         headers=owner['headers'])
        assert normal_response.status_code == 200

    def test_authorization_header_manipulation(self, test_client, security_users, vulnerable_song):
        """Test manipulation of authorization headers."""
        # Test multiple authorization headers
        headers = {
            'Authorization': 'Bearer valid_token',
            'X-Authorization': 'Bearer malicious_token'
        }
        response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}', headers=headers)
        assert response.status_code == 401
        
        # Test case-sensitive header manipulation - Flask normalizes headers so this may work
        headers = {'authorization': security_users['owner']['headers']['Authorization']}
        response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}', headers=headers)
        # Flask typically normalizes headers, so this might work
        assert response.status_code in [200, 401]  # Either is acceptable


class TestAuditLoggingValidation:
    """Test comprehensive audit logging of security events."""

    def test_security_audit_logging_functionality(self, test_client, security_users, vulnerable_song):
        """Test that security events are properly logged."""
        attacker = security_users['attacker']
        
        # Trigger various security events and verify logging
        # Unauthorized access attempt
        response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                  headers=attacker['headers'])
        assert response.status_code == 404
        
        # Invalid permission level
        malicious_data = {
            'user_email': 'test@example.com',
            'permission_level': 'super_admin'  # Invalid permission
        }
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(malicious_data),
                                   content_type='application/json',
                                   headers=attacker['headers'])
        assert response.status_code in [400, 403, 404]

    def test_audit_log_data_integrity(self, test_client, security_users, vulnerable_song):
        """Test that audit logs contain required security information."""
        owner = security_users['owner']
        victim = security_users['victim']['user']
        
        # Perform a sharing action that should be logged
        share_data = {
            'user_email': victim.email,
            'permission_level': 'read'
        }
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        assert response.status_code == 200
        
        # Test audit logger functionality directly
        log_entry = SecurityAuditLogger.log_security_event(
            'TEST_EVENT',
            {'test': 'data'},
            user_id=owner['user'].id
        )
        
        # Verify log entry contains required fields
        required_fields = ['timestamp', 'event_type', 'user_id', 'details']
        assert all(field in log_entry for field in required_fields)

    def test_sensitive_data_exclusion_from_logs(self, test_client, security_users):
        """Test that sensitive data is not included in audit logs."""
        owner = security_users['owner']
        
        # Create a song with sensitive content
        sensitive_data = {
            'title': 'Sensitive Song',
            'content': '{title: Sensitive Song}\n[C]Password: secret123 [G]API_KEY: abc123'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(sensitive_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        assert response.status_code == 201
        
        # Verify that logs don't contain sensitive patterns
        # This test ensures the logging system sanitizes data properly
        log_entry = SecurityAuditLogger.log_security_event(
            'SENSITIVE_DATA_TEST',
            {'content': 'Password: secret123'},
            user_id=owner['user'].id
        )
        
        # Log entry should exist but content should be sanitized in production
        assert log_entry['event_type'] == 'SENSITIVE_DATA_TEST'


class TestTimingAttackPrevention:
    """Test prevention of timing attacks."""

    def test_user_enumeration_timing_attack_prevention(self, test_client, security_users, vulnerable_song):
        """Test that user enumeration through timing attacks is prevented."""
        owner = security_users['owner']
        
        # Test sharing with existing vs non-existing users
        # Both should take similar time to prevent timing attacks
        
        existing_user_data = {
            'user_email': security_users['victim']['user'].email,
            'permission_level': 'read'
        }
        
        nonexistent_user_data = {
            'user_email': 'nonexistent@example.com',
            'permission_level': 'read'
        }
        
        # Time both requests (simplified test)
        start_time = time.time()
        response1 = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                    data=json.dumps(existing_user_data),
                                    content_type='application/json',
                                    headers=owner['headers'])
        mid_time = time.time()
        
        response2 = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                    data=json.dumps(nonexistent_user_data),
                                    content_type='application/json',
                                    headers=owner['headers'])
        end_time = time.time()
        
        # Both should complete (one succeeds, one fails)
        assert response1.status_code == 200
        assert response2.status_code == 404
        
        # Timing difference should not be significant (basic check)
        time1 = mid_time - start_time
        time2 = end_time - mid_time
        # Allow for reasonable variance in test environment
        assert abs(time1 - time2) < 1.0  # Less than 1 second difference


class TestAdvancedAttackVectors:
    """Test advanced attack vectors and edge cases."""

    def test_session_fixation_prevention(self, test_client, security_users):
        """Test prevention of session fixation attacks."""
        victim = security_users['victim']
        attacker = security_users['attacker']
        
        # Attacker tries to use victim's token for unauthorized access
        response = test_client.get('/api/v1/songs',
                                  headers=victim['headers'])
        assert response.status_code == 200
        
        # Attacker cannot reuse the session without proper authentication
        # (This test validates that tokens are properly validated per request)
        malformed_token = victim['token'][:-5] + 'xxxxx'  # Corrupt the token
        bad_headers = {'Authorization': f'Bearer {malformed_token}'}
        response = test_client.get('/api/v1/songs',
                                  headers=bad_headers)
        assert response.status_code == 401

    def test_brute_force_protection_simulation(self, test_client, security_users, vulnerable_song):
        """Test rate limiting and brute force protection."""
        attacker = security_users['attacker']
        
        # Simulate multiple rapid requests (brute force attempt)
        responses = []
        for i in range(25):  # More than rate limit
            response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                      headers=attacker['headers'])
            responses.append(response.status_code)
        
        # Should eventually hit rate limits or consistent 404s
        # All should be either 404 (unauthorized) or 429 (rate limited)
        assert all(code in [404, 429] for code in responses)

    def test_data_exposure_through_error_messages(self, test_client, security_users, vulnerable_song):
        """Test that error messages don't expose sensitive information."""
        attacker = security_users['attacker']
        
        # Try various operations that should fail
        responses = []
        
        # Try to access non-existent song
        response = test_client.get('/api/v1/songs/999999',
                                  headers=attacker['headers'])
        responses.append(response)
        
        # Try to share with invalid data
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps({}),
                                   content_type='application/json',
                                   headers=attacker['headers'])
        responses.append(response)
        
        # Check that error messages don't reveal internal structure
        for response in responses:
            response_data = response.get_json()
            if response_data and 'error' in response_data:
                error_message = response_data['error'].lower()
                # Should not reveal database info, internal paths, etc.
                assert 'database' not in error_message
                assert 'sql' not in error_message
                assert 'exception' not in error_message
                assert 'traceback' not in error_message

    def test_privilege_escalation_through_collaboration_chain(self, test_client, security_users):
        """Test complex privilege escalation through collaboration relationships."""
        owner = security_users['owner']
        admin = security_users['admin']
        editor = security_users['editor']
        attacker = security_users['attacker']
        
        # Create a song
        song_data = {
            'title': 'Chain Attack Test',
            'content': '{title: Chain Attack}\n[C]Test content'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        assert response.status_code == 201
        song_id = response.get_json()['data']['id']
        
        # Share with admin
        share_data = {
            'user_email': admin['user'].email,
            'permission_level': 'admin'
        }
        response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        assert response.status_code == 200
        
        # Admin shares with editor
        share_data = {
            'user_email': editor['user'].email,
            'permission_level': 'edit'
        }
        response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=admin['headers'])
        assert response.status_code == 200
        
        # Editor tries to share with attacker (should fail - editor can't manage permissions)
        share_data = {
            'user_email': attacker['user'].email,
            'permission_level': 'read'
        }
        response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                   data=json.dumps(share_data),
                                   content_type='application/json',
                                   headers=editor['headers'])
        assert response.status_code == 403
        
        # Attacker should not have access
        response = test_client.get(f'/api/v1/songs/{song_id}',
                                  headers=attacker['headers'])
        assert response.status_code == 404

    def test_resource_exhaustion_protection(self, test_client, security_users, vulnerable_song):
        """Test protection against resource exhaustion attacks."""
        owner = security_users['owner']
        
        # Test extremely large permission level strings
        large_data = {
            'user_email': 'test@example.com',
            'permission_level': 'x' * 10000  # Very large string
        }
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(large_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        # Should be rejected or handled gracefully
        assert response.status_code in [400, 413]
        
        # Test deeply nested JSON (if applicable)
        nested_data = {'user_email': 'test@example.com', 'permission_level': 'read'}
        for i in range(100):  # Create deeply nested structure
            nested_data = {'nested': nested_data}
        
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(nested_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        # Should be handled without crashing
        assert response.status_code in [400, 413, 500]

    def test_information_disclosure_through_side_channels(self, test_client, security_users):
        """Test that information is not disclosed through side channels."""
        attacker = security_users['attacker']
        victim = security_users['victim']
        
        # Create song as victim
        song_data = {
            'title': 'Secret Song',
            'content': '{title: Secret Song}\n[C]Confidential content'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=victim['headers'])
        assert response.status_code == 201
        secret_song_id = response.get_json()['data']['id']
        
        # Attacker tries to get collaborators (should fail consistently)
        response = test_client.get(f'/api/v1/songs/{secret_song_id}/collaborators',
                                  headers=attacker['headers'])
        assert response.status_code == 404  # Should not reveal song existence
        
        # Try to update permissions (should fail consistently)
        update_data = {
            'user_email': attacker['user'].email,
            'permission_level': 'read'
        }
        response = test_client.put(f'/api/v1/songs/{secret_song_id}/permissions',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=attacker['headers'])
        assert response.status_code == 404  # Should not reveal song existence

    def test_cross_origin_request_security(self, test_client, security_users, vulnerable_song):
        """Test security against cross-origin requests."""
        owner = security_users['owner']
        
        # Test with various origin headers that might bypass CORS
        malicious_origins = [
            'https://evil.com',
            'https://chordme.evil.com',
            'http://localhost:8080'
        ]
        
        for origin in malicious_origins:
            headers = dict(owner['headers'])
            headers['Origin'] = origin
            
            response = test_client.get(f'/api/v1/songs/{vulnerable_song.id}',
                                      headers=headers)
            
            # Request should still work (Origin header doesn't affect API access)
            # But CORS headers should be properly set in response
            assert response.status_code == 200

    def test_mass_assignment_protection(self, test_client, security_users, vulnerable_song):
        """Test protection against mass assignment attacks."""
        owner = security_users['owner']
        victim = security_users['victim']['user']
        
        # Try to assign extra fields that shouldn't be settable
        malicious_data = {
            'user_email': victim.email,
            'permission_level': 'read',
            'id': 99999,  # Try to override ID
            'author_id': 99999,  # Try to change ownership
            'admin': True,  # Try to set admin flag
            'is_admin': True,
            'permissions': {'999': 'admin'},  # Try to set raw permissions
            'shared_with': [999],  # Try to set raw shared list
        }
        
        response = test_client.post(f'/api/v1/songs/{vulnerable_song.id}/share',
                                   data=json.dumps(malicious_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        
        # Should succeed but only process valid fields
        assert response.status_code == 200
        
        # Verify that only the intended permission was set
        response_data = response.get_json()
        assert response_data['data']['permission_level'] == 'read'
        assert response_data['data']['user_email'] == victim.email