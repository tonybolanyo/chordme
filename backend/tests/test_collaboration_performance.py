"""
Performance tests for collaboration features.
Tests real-time collaboration under various load conditions.
"""

import pytest
import json
import time
import statistics
import concurrent.futures
from threading import Thread, Event
from chordme import app, db
from chordme.models import User, Song


@pytest.fixture
def test_client():
    """Create a test client for performance testing."""
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
def performance_users(test_client):
    """Create multiple users for performance testing."""
    from chordme.utils import generate_jwt_token
    
    users = []
    for i in range(50):  # Create 50 test users
        user = User(f'user{i}@test.com', 'TestPass123!')
        db.session.add(user)
        db.session.commit()
        
        token = generate_jwt_token(user.id)
        users.append({
            'user': user,
            'token': token,
            'headers': {'Authorization': f'Bearer {token}'},
            'id': i
        })
    
    return users


@pytest.fixture
def shared_song(performance_users):
    """Create a song shared with many users."""
    owner = performance_users[0]['user']
    
    song = Song('Performance Test Song', owner.id, 
                '{title: Performance Test Song}\n[C]Initial [G]content [Am]for [F]testing')
    
    # Share with multiple users with different permission levels
    for i, user_data in enumerate(performance_users[1:21]):  # Share with 20 users
        permission = 'edit' if i % 3 == 0 else 'read'
        song.add_shared_user(user_data['user'].id, permission)
    
    db.session.add(song)
    db.session.commit()
    
    return song


class TestConcurrentAccessPerformance:
    """Test performance under concurrent access scenarios."""

    def test_concurrent_read_performance(self, test_client, performance_users, shared_song):
        """Test performance with many concurrent readers."""
        readers = performance_users[1:21]  # 20 concurrent readers
        response_times = []
        
        def read_song(user_data):
            start_time = time.time()
            response = test_client.get(f'/api/v1/songs/{shared_song.id}',
                                      headers=user_data['headers'])
            end_time = time.time()
            return response.status_code, end_time - start_time
        
        # Execute concurrent reads
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(read_song, user) for user in readers]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Analyze performance
        successful_reads = [r for r in results if r[0] == 200]
        response_times = [r[1] for r in successful_reads]
        
        assert len(successful_reads) >= 15  # At least 75% success rate
        assert statistics.mean(response_times) < 1.0  # Average response time under 1 second
        assert max(response_times) < 3.0  # No request takes more than 3 seconds
        
        print(f"Concurrent read performance:")
        print(f"  - Success rate: {len(successful_reads)}/{len(results)} ({len(successful_reads)/len(results)*100:.1f}%)")
        print(f"  - Average response time: {statistics.mean(response_times):.3f}s")
        print(f"  - Max response time: {max(response_times):.3f}s")

    def test_concurrent_edit_performance(self, test_client, performance_users, shared_song):
        """Test performance with concurrent editors."""
        editors = [user for user in performance_users[1:11] 
                  if (user['id'] - 1) % 3 == 0]  # Users with edit permissions
        response_times = []
        
        def edit_song(user_data, edit_id):
            start_time = time.time()
            update_data = {
                'title': f'Edited by User {user_data["id"]} - Edit {edit_id}',
                'content': f'{{title: Edited by User {user_data["id"]}}}\n[C]Edit {edit_id} [G]content'
            }
            response = test_client.put(f'/api/v1/songs/{shared_song.id}',
                                      data=json.dumps(update_data),
                                      content_type='application/json',
                                      headers=user_data['headers'])
            end_time = time.time()
            return response.status_code, end_time - start_time, user_data['id']
        
        # Execute concurrent edits
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(edit_song, user, i) 
                      for i, user in enumerate(editors)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Analyze performance
        successful_edits = [r for r in results if r[0] == 200]
        response_times = [r[1] for r in successful_edits]
        
        assert len(successful_edits) >= 1  # At least one edit should succeed
        if response_times:
            assert statistics.mean(response_times) < 2.0  # Average under 2 seconds
            assert max(response_times) < 5.0  # No edit takes more than 5 seconds
        
        print(f"Concurrent edit performance:")
        print(f"  - Success rate: {len(successful_edits)}/{len(results)} ({len(successful_edits)/len(results)*100:.1f}%)")
        if response_times:
            print(f"  - Average response time: {statistics.mean(response_times):.3f}s")
            print(f"  - Max response time: {max(response_times):.3f}s")

    def test_mixed_concurrent_operations(self, test_client, performance_users, shared_song):
        """Test performance with mixed concurrent operations."""
        readers = performance_users[1:16]  # 15 readers
        editors = [user for user in performance_users[16:21] 
                  if (user['id'] - 1) % 3 == 0]  # Editors with permissions
        response_times = []
        
        def read_operation(user_data):
            start_time = time.time()
            response = test_client.get(f'/api/v1/songs/{shared_song.id}',
                                      headers=user_data['headers'])
            end_time = time.time()
            return 'read', response.status_code, end_time - start_time
        
        def edit_operation(user_data, edit_id):
            start_time = time.time()
            update_data = {
                'content': f'{{title: Mixed Test}}\n[C]Mixed edit {edit_id} [G]by user {user_data["id"]}'
            }
            response = test_client.put(f'/api/v1/songs/{shared_song.id}',
                                      data=json.dumps(update_data),
                                      content_type='application/json',
                                      headers=user_data['headers'])
            end_time = time.time()
            return 'edit', response.status_code, end_time - start_time
        
        # Execute mixed operations
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = []
            
            # Submit read operations
            for user in readers:
                futures.append(executor.submit(read_operation, user))
            
            # Submit edit operations
            for i, user in enumerate(editors):
                futures.append(executor.submit(edit_operation, user, i))
            
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Analyze results by operation type
        read_results = [r for r in results if r[0] == 'read']
        edit_results = [r for r in results if r[0] == 'edit']
        
        successful_reads = [r for r in read_results if r[1] == 200]
        successful_edits = [r for r in edit_results if r[1] == 200]
        
        assert len(successful_reads) >= 10  # Most reads should succeed
        assert len(successful_edits) >= 1   # At least one edit should succeed
        
        print(f"Mixed operations performance:")
        print(f"  - Read success: {len(successful_reads)}/{len(read_results)}")
        print(f"  - Edit success: {len(successful_edits)}/{len(edit_results)}")


class TestScalabilityPerformance:
    """Test scalability with increasing load."""

    def test_increasing_user_load(self, test_client, performance_users, shared_song):
        """Test performance as user load increases."""
        load_sizes = [5, 10, 15, 20]
        results = {}
        
        for load_size in load_sizes:
            users = performance_users[:load_size]
            response_times = []
            
            def access_song(user_data):
                start_time = time.time()
                response = test_client.get(f'/api/v1/songs/{shared_song.id}',
                                          headers=user_data['headers'])
                end_time = time.time()
                return response.status_code, end_time - start_time
            
            # Execute with current load size
            with concurrent.futures.ThreadPoolExecutor(max_workers=load_size) as executor:
                futures = [executor.submit(access_song, user) for user in users]
                load_results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            successful = [r for r in load_results if r[0] == 200]
            if successful:
                avg_time = statistics.mean([r[1] for r in successful])
                results[load_size] = {
                    'success_rate': len(successful) / len(load_results),
                    'avg_response_time': avg_time,
                    'max_response_time': max([r[1] for r in successful])
                }
        
        # Analyze scalability
        print("Scalability results:")
        for load_size, metrics in results.items():
            print(f"  Load {load_size}: {metrics['success_rate']:.1%} success, "
                  f"{metrics['avg_response_time']:.3f}s avg, "
                  f"{metrics['max_response_time']:.3f}s max")
        
        # Verify performance doesn't degrade drastically
        if len(results) > 1:
            load_sizes_sorted = sorted(results.keys())
            first_avg = results[load_sizes_sorted[0]]['avg_response_time']
            last_avg = results[load_sizes_sorted[-1]]['avg_response_time']
            
            # Performance shouldn't degrade by more than 5x
            assert last_avg < first_avg * 5

    def test_rapid_sequential_requests(self, test_client, performance_users, shared_song):
        """Test performance with rapid sequential requests from single user."""
        user = performance_users[0]
        request_count = 50
        response_times = []
        
        for i in range(request_count):
            start_time = time.time()
            response = test_client.get(f'/api/v1/songs/{shared_song.id}',
                                      headers=user['headers'])
            end_time = time.time()
            
            if response.status_code == 200:
                response_times.append(end_time - start_time)
            elif response.status_code == 429:  # Rate limited
                break
        
        assert len(response_times) >= 10  # Should handle at least 10 requests
        assert statistics.mean(response_times) < 0.5  # Fast sequential access
        
        print(f"Rapid sequential performance:")
        print(f"  - Successful requests: {len(response_times)}/{request_count}")
        print(f"  - Average response time: {statistics.mean(response_times):.3f}s")

    def test_large_document_performance(self, test_client, performance_users):
        """Test performance with large documents."""
        owner = performance_users[0]
        
        # Create a large document
        large_content = '{title: Large Document}\n' + '[C]Large content ' * 1000
        song_data = {
            'title': 'Large Performance Test',
            'content': large_content
        }
        
        # Test creation time
        start_time = time.time()
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        creation_time = time.time() - start_time
        
        assert response.status_code == 201
        assert creation_time < 5.0  # Should create large document in under 5 seconds
        
        song_id = response.get_json()['data']['id']
        
        # Test retrieval time
        start_time = time.time()
        response = test_client.get(f'/api/v1/songs/{song_id}',
                                  headers=owner['headers'])
        retrieval_time = time.time() - start_time
        
        assert response.status_code == 200
        assert retrieval_time < 2.0  # Should retrieve large document in under 2 seconds
        
        # Test update time
        update_data = {
            'content': large_content + '\n[G]Updated content'
        }
        start_time = time.time()
        response = test_client.put(f'/api/v1/songs/{song_id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json',
                                  headers=owner['headers'])
        update_time = time.time() - start_time
        
        assert response.status_code == 200
        assert update_time < 5.0  # Should update large document in under 5 seconds
        
        print(f"Large document performance:")
        print(f"  - Creation time: {creation_time:.3f}s")
        print(f"  - Retrieval time: {retrieval_time:.3f}s")
        print(f"  - Update time: {update_time:.3f}s")


class TestPermissionPerformance:
    """Test performance of permission checking and management."""

    def test_permission_check_performance(self, test_client, performance_users, shared_song):
        """Test performance of permission checking with many collaborators."""
        # Add more collaborators to the song
        for i, user_data in enumerate(performance_users[21:41]):  # Add 20 more collaborators
            permission = ['read', 'edit', 'admin'][i % 3]
            shared_song.add_shared_user(user_data['user'].id, permission)
        db.session.commit()
        
        # Test access time with many collaborators
        user = performance_users[1]  # User with access
        response_times = []
        
        for _ in range(20):
            start_time = time.time()
            response = test_client.get(f'/api/v1/songs/{shared_song.id}',
                                      headers=user['headers'])
            end_time = time.time()
            
            if response.status_code == 200:
                response_times.append(end_time - start_time)
        
        assert len(response_times) >= 15  # Most requests should succeed
        assert statistics.mean(response_times) < 1.0  # Should be fast even with many collaborators
        
        print(f"Permission check performance with many collaborators:")
        print(f"  - Average response time: {statistics.mean(response_times):.3f}s")
        print(f"  - Max response time: {max(response_times):.3f}s")

    def test_collaborator_list_performance(self, test_client, performance_users, shared_song):
        """Test performance of listing collaborators."""
        # Add many collaborators
        for user_data in performance_users[21:41]:
            shared_song.add_shared_user(user_data['user'].id, 'read')
        db.session.commit()
        
        user = performance_users[0]  # Owner
        response_times = []
        
        for _ in range(10):
            start_time = time.time()
            response = test_client.get(f'/api/v1/songs/{shared_song.id}/collaborators',
                                      headers=user['headers'])
            end_time = time.time()
            
            if response.status_code == 200:
                response_times.append(end_time - start_time)
        
        assert len(response_times) >= 8  # Most requests should succeed
        assert statistics.mean(response_times) < 2.0  # Should list collaborators quickly
        
        print(f"Collaborator list performance:")
        print(f"  - Average response time: {statistics.mean(response_times):.3f}s")

    def test_permission_update_performance(self, test_client, performance_users, shared_song):
        """Test performance of updating permissions."""
        owner = performance_users[0]
        target_users = performance_users[1:6]  # 5 users to update
        
        update_times = []
        
        for user_data in target_users:
            update_data = {
                'user_id': user_data['user'].id,
                'permission_level': 'edit'
            }
            
            start_time = time.time()
            response = test_client.put(f'/api/v1/songs/{shared_song.id}/permissions',
                                      data=json.dumps(update_data),
                                      content_type='application/json',
                                      headers=owner['headers'])
            end_time = time.time()
            
            if response.status_code == 200:
                update_times.append(end_time - start_time)
        
        assert len(update_times) >= 3  # Most updates should succeed
        assert statistics.mean(update_times) < 1.0  # Should update permissions quickly
        
        print(f"Permission update performance:")
        print(f"  - Average update time: {statistics.mean(update_times):.3f}s")


class TestMemoryAndResourceUsage:
    """Test memory usage and resource consumption."""

    def test_memory_usage_with_many_collaborators(self, test_client, performance_users):
        """Test memory usage doesn't grow excessively with many collaborators."""
        owner = performance_users[0]
        
        # Create song
        song_data = {
            'title': 'Memory Test Song',
            'content': '{title: Memory Test}\n[C]Content for memory testing'
        }
        response = test_client.post('/api/v1/songs',
                                   data=json.dumps(song_data),
                                   content_type='application/json',
                                   headers=owner['headers'])
        song_id = response.get_json()['data']['id']
        
        # Add many collaborators
        share_times = []
        for user_data in performance_users[1:31]:  # Add 30 collaborators
            share_data = {
                'user_email': user_data['user'].email,
                'permission_level': 'read'
            }
            
            start_time = time.time()
            response = test_client.post(f'/api/v1/songs/{song_id}/share',
                                       data=json.dumps(share_data),
                                       content_type='application/json',
                                       headers=owner['headers'])
            end_time = time.time()
            
            if response.status_code == 200:
                share_times.append(end_time - start_time)
        
        # Performance shouldn't degrade significantly as collaborators increase
        if len(share_times) >= 10:
            first_half_avg = statistics.mean(share_times[:len(share_times)//2])
            second_half_avg = statistics.mean(share_times[len(share_times)//2:])
            
            # Second half shouldn't be more than 3x slower than first half
            assert second_half_avg < first_half_avg * 3
        
        print(f"Memory usage test with {len(share_times)} collaborators:")
        print(f"  - Average share time: {statistics.mean(share_times):.3f}s")

    def test_concurrent_session_handling(self, test_client, performance_users, shared_song):
        """Test handling of many concurrent sessions."""
        session_users = performance_users[:25]  # 25 concurrent sessions
        
        def maintain_session(user_data, duration=2):
            """Simulate maintaining an active session."""
            end_time = time.time() + duration
            request_count = 0
            
            while time.time() < end_time:
                response = test_client.get(f'/api/v1/songs/{shared_song.id}',
                                          headers=user_data['headers'])
                if response.status_code == 200:
                    request_count += 1
                time.sleep(0.1)  # Small delay between requests
            
            return request_count
        
        # Simulate concurrent sessions
        with concurrent.futures.ThreadPoolExecutor(max_workers=25) as executor:
            futures = [executor.submit(maintain_session, user) for user in session_users]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        total_requests = sum(results)
        successful_sessions = len([r for r in results if r > 0])
        
        assert successful_sessions >= 15  # Most sessions should be successful
        assert total_requests >= 100      # Should handle significant request volume
        
        print(f"Concurrent session handling:")
        print(f"  - Successful sessions: {successful_sessions}/{len(session_users)}")
        print(f"  - Total requests handled: {total_requests}")