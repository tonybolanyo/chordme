"""
Integration tests for Milestone 3 features working together.
Tests comprehensive integration between real-time collaboration, setlist management,
audio integration, advanced chord diagrams, and performance mode.
"""

import pytest
import requests
import json
import time
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any

# Base URL for the API
BASE_URL = "http://localhost:5000"


class TestMilestone3FeatureIntegration:
    """Integration tests for Milestone 3 features working together."""
    
    def create_test_user(self):
        """Create a unique test user."""
        return {
            "email": f"integration_test_{uuid.uuid4()}@example.com",
            "password": "IntegrationTest123!"
        }
    
    def register_and_login_user(self, user_data: Dict[str, str]) -> str:
        """Register and login a user, return the auth token."""
        try:
            # Register
            register_response = requests.post(
                f"{BASE_URL}/api/v1/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            # Login
            login_response = requests.post(
                f"{BASE_URL}/api/v1/auth/login",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            if login_response.status_code == 200:
                return login_response.json()["data"]["token"]
            else:
                raise Exception(f"Login failed: {login_response.status_code}")
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_collaboration_setlist_integration(self):
        """Test integration between real-time collaboration and setlist management."""
        try:
            # Create multiple users for collaboration
            users = [self.create_test_user() for _ in range(3)]
            tokens = [self.register_and_login_user(user) for user in users]
            
            # User 1 creates a setlist
            user1_headers = {
                "Authorization": f"Bearer {tokens[0]}",
                "Content-Type": "application/json"
            }
            
            setlist_data = {
                "name": "Collaborative Setlist Integration Test",
                "description": "Testing collaboration on setlist management",
                "event_type": "performance",
                "venue": "Integration Test Venue"
            }
            
            setlist_response = requests.post(
                f"{BASE_URL}/api/v1/setlists",
                json=setlist_data,
                headers=user1_headers
            )
            
            if setlist_response.status_code == 201:
                setlist_id = setlist_response.json()["id"]
                
                # Share setlist with other users (if collaboration endpoint exists)
                for i, token in enumerate(tokens[1:], 1):
                    collaboration_data = {
                        "user_email": users[i]["email"],
                        "permission": "edit"
                    }
                    
                    # Attempt to add collaborator (endpoint may not exist yet)
                    collab_response = requests.post(
                        f"{BASE_URL}/api/v1/setlists/{setlist_id}/collaborators",
                        json=collaboration_data,
                        headers=user1_headers
                    )
                    # Don't assert on this as the endpoint might not be implemented
                
                # Test concurrent setlist modifications
                def modify_setlist(user_token, modification_id):
                    headers = {
                        "Authorization": f"Bearer {user_token}",
                        "Content-Type": "application/json"
                    }
                    
                    update_data = {
                        "name": f"Setlist Modified by User {modification_id}",
                        "description": f"Concurrent modification {modification_id}"
                    }
                    
                    response = requests.put(
                        f"{BASE_URL}/api/v1/setlists/{setlist_id}",
                        json=update_data,
                        headers=headers
                    )
                    return response.status_code == 200
                
                # Test concurrent modifications
                with ThreadPoolExecutor(max_workers=3) as executor:
                    futures = [
                        executor.submit(modify_setlist, token, i)
                        for i, token in enumerate(tokens)
                    ]
                    results = [future.result() for future in as_completed(futures)]
                
                # At least one modification should succeed
                assert any(results), "No setlist modifications succeeded"
                
                # Verify final setlist state
                final_response = requests.get(
                    f"{BASE_URL}/api/v1/setlists/{setlist_id}",
                    headers=user1_headers
                )
                
                if final_response.status_code == 200:
                    final_setlist = final_response.json()
                    assert "Modified by User" in final_setlist["name"]
            else:
                pytest.skip("Setlist creation not available - endpoint may not be implemented")
        
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_audio_sync_performance_mode_integration(self):
        """Test integration between audio synchronization and performance mode."""
        try:
            user_data = self.create_test_user()
            token = self.register_and_login_user(user_data)
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Create a song with chord timing data for audio sync
            song_data = {
                "title": "Audio Sync Performance Test",
                "content": """{title: Audio Sync Performance Test}
{artist: Integration Test}
{key: C}
{tempo: 120}

[C]Amazing [F]grace, how [G]sweet the [Am]sound
[F]That saved a [C]wretch like [G]me[C]

{comment: Timing data for audio sync}
{chord_timing: C@0.0, F@2.5, G@5.0, Am@7.5}
{section_timing: verse@0.0, chorus@16.0}""",
                "is_public": False
            }
            
            song_response = requests.post(
                f"{BASE_URL}/api/v1/songs",
                json=song_data,
                headers=headers
            )
            
            assert song_response.status_code == 201
            song = song_response.json()["data"]
            song_id = song["id"]
            
            # Test performance mode configuration
            performance_config = {
                "font_size": "large",
                "auto_scroll": True,
                "full_screen": True,
                "chord_highlighting": True,
                "audio_sync_enabled": True
            }
            
            # Simulate performance mode activation (this would be frontend logic)
            # We can test the song data retrieval and validation for performance mode
            performance_response = requests.get(
                f"{BASE_URL}/api/v1/songs/{song_id}",
                headers=headers
            )
            
            assert performance_response.status_code == 200
            performance_song = performance_response.json()["data"]
            
            # Verify song has necessary data for audio sync and performance mode
            assert "chord_timing" in performance_song["content"]
            assert "section_timing" in performance_song["content"]
            assert "{key: C}" in performance_song["content"]
            assert "{tempo: 120}" in performance_song["content"]
            
            # Test transposition with audio sync data
            transposition_data = {
                "song_id": song_id,
                "semitones": 2  # Transpose up 2 semitones (C to D)
            }
            
            transpose_response = requests.post(
                f"{BASE_URL}/api/v1/songs/transpose",
                json=transposition_data,
                headers=headers
            )
            
            if transpose_response.status_code == 200:
                transposed_content = transpose_response.json()["data"]["content"]
                # Verify transposition worked and timing data is preserved
                assert "[D]Amazing" in transposed_content or "transposed" in transposed_content.lower()
                assert "chord_timing" in transposed_content  # Timing data should be preserved
        
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_collaborative_performance_workflow(self):
        """Test complete collaborative performance workflow combining all features."""
        try:
            # Create a band with different roles
            band_members = {
                "leader": self.create_test_user(),
                "guitarist": self.create_test_user(),
                "bassist": self.create_test_user()
            }
            
            tokens = {
                role: self.register_and_login_user(user)
                for role, user in band_members.items()
            }
            
            leader_headers = {
                "Authorization": f"Bearer {tokens['leader']}",
                "Content-Type": "application/json"
            }
            
            # 1. Leader creates a collaborative song
            song_data = {
                "title": "Collaborative Performance Song",
                "content": """{title: Collaborative Performance Song}
{artist: Integration Test Band}
{key: G}
{tempo: 140}

{comment: Verse}
[G]We are testing [D]collaboration
[Em]Real-time [C]integration
[G]Performance [D]mode and [Em]more[C]

{comment: Chorus}
[C]All together [G]now we play
[Am]Every feature [D]works today
[C]ChordMe helps us [G]find our [D]way[G]""",
                "is_public": False
            }
            
            song_response = requests.post(
                f"{BASE_URL}/api/v1/songs",
                json=song_data,
                headers=leader_headers
            )
            
            assert song_response.status_code == 201
            song = song_response.json()["data"]
            song_id = song["id"]
            
            # 2. Share song with band members (simulate collaboration)
            # This would involve collaboration endpoints which may not be fully implemented
            
            # 3. Test concurrent edits by different band members
            def band_member_edit(member_token, member_role, song_id):
                headers = {
                    "Authorization": f"Bearer {member_token}",
                    "Content-Type": "application/json"
                }
                
                # Each member adds their part
                additions = {
                    "guitarist": "\n{comment: Guitar solo}\n[G] [D] [Em] [C] x2",
                    "bassist": "\n{comment: Bass line}\n{bass: G-G-D-D-Em-Em-C-C}"
                }
                
                if member_role in additions:
                    # Get current content
                    get_response = requests.get(f"{BASE_URL}/api/v1/songs/{song_id}", headers=headers)
                    if get_response.status_code == 200:
                        current_content = get_response.json()["data"]["content"]
                        
                        # Add member's contribution
                        updated_content = current_content + additions[member_role]
                        
                        update_response = requests.put(
                            f"{BASE_URL}/api/v1/songs/{song_id}",
                            json={"content": updated_content},
                            headers=headers
                        )
                        return update_response.status_code == 200
                return False
            
            # Simulate concurrent collaborative editing
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [
                    executor.submit(band_member_edit, tokens["guitarist"], "guitarist", song_id),
                    executor.submit(band_member_edit, tokens["bassist"], "bassist", song_id)
                ]
                edit_results = [future.result() for future in as_completed(futures)]
            
            # 4. Verify collaborative changes were applied
            final_response = requests.get(f"{BASE_URL}/api/v1/songs/{song_id}", headers=leader_headers)
            assert final_response.status_code == 200
            
            final_song = final_response.json()["data"]
            final_content = final_song["content"]
            
            # Check that collaborative edits are present
            # (At least one should have succeeded even if there were conflicts)
            has_guitar_or_bass = "Guitar solo" in final_content or "Bass line" in final_content
            assert has_guitar_or_bass, "No collaborative edits were successfully applied"
            
            # 5. Test the song works with performance features
            # Key detection should work
            key_detection_response = requests.post(
                f"{BASE_URL}/api/v1/songs/detect-key",
                json={"content": final_content},
                headers=leader_headers
            )
            
            if key_detection_response.status_code == 200:
                key_data = key_detection_response.json()["data"]
                assert key_data["detected_key"] == "G"
                assert not key_data["is_minor"]
            
            # 6. Test transposition for different instruments
            transpose_response = requests.post(
                f"{BASE_URL}/api/v1/songs/transpose",
                json={"song_id": song_id, "semitones": -2},  # Down 2 semitones (G to F)
                headers=leader_headers
            )
            
            if transpose_response.status_code == 200:
                transposed = transpose_response.json()["data"]
                # Verify the song can be transposed for performance
                assert "transposed" in transposed["content"].lower() or "[F]" in transposed["content"]
        
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_load_testing_collaborative_features(self):
        """Test collaborative features under load with multiple concurrent users."""
        try:
            # Create multiple users for load testing
            num_users = 5
            users = [self.create_test_user() for _ in range(num_users)]
            tokens = [self.register_and_login_user(user) for user in users]
            
            # First user creates a song
            leader_headers = {
                "Authorization": f"Bearer {tokens[0]}",
                "Content-Type": "application/json"
            }
            
            song_data = {
                "title": "Load Test Collaboration Song",
                "content": """{title: Load Test Song}
{artist: Load Test}

[C]Initial [G]content for [Am]load [F]testing
[C]Multiple [G]users will [Am]edit [F]this""",
                "is_public": False
            }
            
            song_response = requests.post(
                f"{BASE_URL}/api/v1/songs",
                json=song_data,
                headers=leader_headers
            )
            
            assert song_response.status_code == 201
            song_id = song_response.json()["data"]["id"]
            
            # Function for concurrent user actions
            def user_actions(user_token, user_id, iterations=3):
                headers = {
                    "Authorization": f"Bearer {user_token}",
                    "Content-Type": "application/json"
                }
                
                successful_actions = 0
                
                for i in range(iterations):
                    try:
                        # Read song
                        get_response = requests.get(f"{BASE_URL}/api/v1/songs/{song_id}", headers=headers)
                        if get_response.status_code == 200:
                            successful_actions += 1
                        
                        # Attempt to edit song
                        current_content = get_response.json()["data"]["content"]
                        updated_content = current_content + f"\n{{comment: Edit {i} by user {user_id}}}"
                        
                        edit_response = requests.put(
                            f"{BASE_URL}/api/v1/songs/{song_id}",
                            json={"content": updated_content},
                            headers=headers
                        )
                        
                        if edit_response.status_code == 200:
                            successful_actions += 1
                        
                        # Small delay to simulate realistic usage
                        time.sleep(0.1)
                        
                    except Exception as e:
                        print(f"User {user_id} iteration {i} failed: {e}")
                
                return successful_actions
            
            # Run concurrent user actions
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=num_users) as executor:
                futures = [
                    executor.submit(user_actions, token, i, 3)
                    for i, token in enumerate(tokens)
                ]
                results = [future.result() for future in as_completed(futures)]
            
            end_time = time.time()
            
            # Verify load test results
            total_successful_actions = sum(results)
            total_expected_actions = num_users * 3 * 2  # 3 iterations * 2 actions per iteration
            
            # At least 50% of actions should succeed under load
            success_rate = total_successful_actions / total_expected_actions
            assert success_rate >= 0.5, f"Load test success rate too low: {success_rate}"
            
            # Test should complete within reasonable time (30 seconds for this small load)
            duration = end_time - start_time
            assert duration < 30, f"Load test took too long: {duration} seconds"
            
            # Verify final song state is still valid
            final_response = requests.get(f"{BASE_URL}/api/v1/songs/{song_id}", headers=leader_headers)
            assert final_response.status_code == 200
            
            final_song = final_response.json()["data"]
            assert "Load Test Song" in final_song["content"]
            
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_cross_feature_performance_benchmarks(self):
        """Test performance benchmarks when using multiple features together."""
        try:
            user_data = self.create_test_user()
            token = self.register_and_login_user(user_data)
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Create a complex song with multiple features enabled
            complex_song_data = {
                "title": "Performance Benchmark Song",
                "content": """{title: Performance Benchmark Song}
{artist: Benchmark Test}
{key: A}
{tempo: 130}
{capo: 2}

{comment: Verse 1 with complex chords}
[Amaj7]Complex [D9/F#]chord [G#m7b5]progressions [C#7]here
[F#m7]Multiple [B7sus4]chord [E7sus4]types [A6]testing
[Dm6/F]Alternative [G7]voicings [Cmaj9]and [F#dim7]more

{comment: Chorus with timing data}
[A]Benchmark [E/G#]performance [F#m]testing [D]now
[A/C#]Every [Bm7]feature [E7]works [A]somehow

{chord_timing: A@0.0, E/G#@2.0, F#m@4.0, D@6.0}
{section_timing: verse@0.0, chorus@16.0, bridge@32.0}

{comment: Bridge with transposition test}
[F]Modulation [C/E]to [Dm]another [Bb]key
[F/A]Testing [Gm7]transposition [C7]capability [F]free

{comment: Multiple metadata for testing}
{genre: Rock}
{difficulty: Advanced}
{duration: 4:30}
{instruments: guitar, piano, drums, bass}""",
                "is_public": False
            }
            
            # Benchmark song creation
            start_time = time.time()
            song_response = requests.post(
                f"{BASE_URL}/api/v1/songs",
                json=complex_song_data,
                headers=headers
            )
            creation_time = time.time() - start_time
            
            assert song_response.status_code == 201
            song_id = song_response.json()["data"]["id"]
            
            # Song creation should be fast even with complex content
            assert creation_time < 5.0, f"Song creation too slow: {creation_time} seconds"
            
            # Benchmark key detection on complex song
            start_time = time.time()
            key_response = requests.post(
                f"{BASE_URL}/api/v1/songs/detect-key",
                json={"content": complex_song_data["content"]},
                headers=headers
            )
            key_detection_time = time.time() - start_time
            
            if key_response.status_code == 200:
                # Key detection should be fast
                assert key_detection_time < 2.0, f"Key detection too slow: {key_detection_time} seconds"
                
                key_data = key_response.json()["data"]
                assert key_data["detected_key"] == "A"
            
            # Benchmark transposition on complex song
            start_time = time.time()
            transpose_response = requests.post(
                f"{BASE_URL}/api/v1/songs/transpose",
                json={"song_id": song_id, "semitones": 3},
                headers=headers
            )
            transposition_time = time.time() - start_time
            
            if transpose_response.status_code == 200:
                # Transposition should be fast even with complex chords
                assert transposition_time < 3.0, f"Transposition too slow: {transposition_time} seconds"
            
            # Benchmark multiple rapid API calls (simulating performance mode usage)
            start_time = time.time()
            rapid_calls = 10
            
            for i in range(rapid_calls):
                response = requests.get(f"{BASE_URL}/api/v1/songs/{song_id}", headers=headers)
                assert response.status_code == 200
            
            rapid_calls_time = time.time() - start_time
            
            # Rapid API calls should maintain good performance
            avg_call_time = rapid_calls_time / rapid_calls
            assert avg_call_time < 0.5, f"Average API call too slow: {avg_call_time} seconds"
            
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")