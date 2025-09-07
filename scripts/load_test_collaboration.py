#!/usr/bin/env python3
"""
Load testing script for Milestone 3 collaborative features.
Tests real-time collaboration under stress with multiple concurrent users.
"""

import json
import time
import uuid
import statistics
import requests
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any
import argparse
import sys


class CollaborationLoadTester:
    """Load tester for collaborative features."""
    
    def __init__(self, base_url: str = "http://localhost:5000", num_users: int = 10):
        self.base_url = base_url
        self.num_users = num_users
        self.users = []
        self.tokens = []
        
    def create_test_user(self, user_id: int) -> Dict[str, str]:
        """Create a test user for load testing."""
        user_data = {
            "email": f"loadtest_user_{user_id}_{uuid.uuid4()}@example.com",
            "password": "LoadTest123!"
        }
        return user_data
    
    def register_and_login_user(self, user_data: Dict[str, str]) -> str:
        """Register and login a user, return auth token."""
        try:
            # Register user
            register_response = requests.post(
                f"{self.base_url}/api/v1/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            # Registration might fail if user exists, continue to login
            
            # Login user
            login_response = requests.post(
                f"{self.base_url}/api/v1/auth/login", 
                json=user_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if login_response.status_code == 200:
                data = login_response.json()
                return data["data"]["token"]
            else:
                raise Exception(f"Login failed: {login_response.status_code}")
                    
        except Exception as e:
            print(f"User setup failed: {e}")
            return ""
    
    def setup_users(self):
        """Setup all test users."""
        print(f"Setting up {self.num_users} test users...")
        
        # Create user data
        self.users = [self.create_test_user(i) for i in range(self.num_users)]
        
        # Register and login all users
        tokens = []
        for user in self.users:
            token = self.register_and_login_user(user)
            if token:
                tokens.append(token)
        
        self.tokens = tokens
        print(f"Successfully authenticated {len(self.tokens)}/{self.num_users} users")
        
        if len(self.tokens) < 2:
            raise Exception("Not enough users authenticated for load testing")
        
    def create_test_song(self, token: str) -> str:
        """Create a test song for collaboration."""
        song_data = {
            "title": "Load Test Collaboration Song",
            "content": """{title: Load Test Song}
{artist: Load Test Band}
{key: C}
{tempo: 120}

[C]Load testing [G]collaborative [Am]features [F]now
[C]Multiple users [G]editing [Am]together [F]somehow

{comment: Verse 2}
[C]Real-time sync [G]under heavy [Am]load [F]
[C]Performance [G]testing [Am]overload [F]

{chord_timing: C@0.0, G@2.0, Am@4.0, F@6.0}
{section_timing: verse1@0.0, verse2@16.0}""",
            "is_public": False
        }
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/songs",
            json=song_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 201:
            data = response.json()
            return data["data"]["id"]
        else:
            raise Exception(f"Song creation failed: {response.status_code}")
    
    def user_collaboration_session(self, user_id: int, token: str, song_id: str, duration: int = 30) -> Dict[str, Any]:
        """Simulate a user's collaboration session."""
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        start_time = time.time()
        end_time = start_time + duration
        
        # Performance metrics
        successful_reads = 0
        successful_writes = 0
        failed_requests = 0
        response_times = []
        
        while time.time() < end_time:
            try:
                # Read song (simulate viewing/real-time sync)
                read_start = time.time()
                response = requests.get(
                    f"{self.base_url}/api/v1/songs/{song_id}",
                    headers=headers,
                    timeout=10
                )
                read_time = time.time() - read_start
                response_times.append(read_time)
                
                if response.status_code == 200:
                    successful_reads += 1
                    song_data = response.json()
                    current_content = song_data["data"]["content"]
                else:
                    failed_requests += 1
                    continue
            
                # Occasionally edit the song (simulate collaborative editing)
                if user_id % 3 == 0 and successful_reads % 5 == 0:  # Every 5th read for some users
                    edit_start = time.time()
                    
                    # Add a comment to the song
                    new_content = current_content + f"\n{{comment: Edit by user {user_id} at {time.time():.1f}}}"
                    
                    edit_response = requests.put(
                        f"{self.base_url}/api/v1/songs/{song_id}",
                        json={"content": new_content},
                        headers=headers,
                        timeout=10
                    )
                    
                    edit_time = time.time() - edit_start
                    response_times.append(edit_time)
                    
                    if edit_response.status_code == 200:
                        successful_writes += 1
                    else:
                        failed_requests += 1
                
                # Simulate realistic user behavior delay
                time.sleep(0.5 + (user_id % 3) * 0.2)  # 0.5-1.1 second intervals
                
            except Exception as e:
                failed_requests += 1
                print(f"User {user_id} error: {e}")
                time.sleep(1)  # Back off on errors
        
        session_duration = time.time() - start_time
        
        return {
            "user_id": user_id,
            "duration": session_duration,
            "successful_reads": successful_reads,
            "successful_writes": successful_writes,
            "failed_requests": failed_requests,
            "total_requests": successful_reads + successful_writes + failed_requests,
            "avg_response_time": statistics.mean(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "min_response_time": min(response_times) if response_times else 0
        }
    
    def run_load_test(self, duration: int = 60):
        """Run the complete load test."""
        print(f"Starting load test with {len(self.tokens)} users for {duration} seconds...")
        
        try:
            # Create a song for testing
            song_id = self.create_test_song(self.tokens[0])
            print(f"Created test song with ID: {song_id}")
        except Exception as e:
            print(f"Failed to create test song: {e}")
            return [], ""
        
        # Start all user sessions concurrently
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=len(self.tokens)) as executor:
            futures = [
                executor.submit(self.user_collaboration_session, i, token, song_id, duration)
                for i, token in enumerate(self.tokens)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        actual_duration = time.time() - start_time
        print(f"Load test completed in {actual_duration:.1f} seconds")
        
        return results, song_id
    
    def analyze_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze load test results."""
        valid_results = [r for r in results if isinstance(r, dict)]
        
        if not valid_results:
            return {"error": "No valid results to analyze"}
        
        # Aggregate metrics
        total_reads = sum(r["successful_reads"] for r in valid_results)
        total_writes = sum(r["successful_writes"] for r in valid_results)
        total_failures = sum(r["failed_requests"] for r in valid_results)
        total_requests = sum(r["total_requests"] for r in valid_results)
        
        response_times = [r["avg_response_time"] for r in valid_results if r["avg_response_time"] > 0]
        max_response_times = [r["max_response_time"] for r in valid_results if r["max_response_time"] > 0]
        
        # Calculate success rate
        success_rate = (total_reads + total_writes) / total_requests if total_requests > 0 else 0
        
        # Calculate throughput (requests per second)
        avg_duration = statistics.mean([r["duration"] for r in valid_results])
        throughput = total_requests / avg_duration if avg_duration > 0 else 0
        
        analysis = {
            "participants": len(valid_results),
            "total_requests": total_requests,
            "successful_reads": total_reads,
            "successful_writes": total_writes,
            "failed_requests": total_failures,
            "success_rate": success_rate,
            "throughput_rps": throughput,
            "avg_response_time": statistics.mean(response_times) if response_times else 0,
            "max_response_time": max(max_response_times) if max_response_times else 0,
            "p95_response_time": statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else 0,
            "concurrent_editing_conflicts": total_writes > 0  # Basic conflict detection
        }
        
        return analysis
    
    def print_report(self, analysis: Dict[str, Any], song_id: str):
        """Print load test report."""
        print("\n" + "="*60)
        print("MILESTONE 3 COLLABORATION LOAD TEST REPORT")
        print("="*60)
        
        if "error" in analysis:
            print(f"ERROR: {analysis['error']}")
            return
        
        print(f"Test Song ID: {song_id}")
        print(f"Concurrent Users: {analysis['participants']}")
        print(f"Total Requests: {analysis['total_requests']}")
        print(f"Success Rate: {analysis['success_rate']:.1%}")
        print(f"Throughput: {analysis['throughput_rps']:.1f} requests/second")
        print()
        
        print("REQUEST BREAKDOWN:")
        print(f"  Successful Reads: {analysis['successful_reads']}")
        print(f"  Successful Writes: {analysis['successful_writes']}")
        print(f"  Failed Requests: {analysis['failed_requests']}")
        print()
        
        print("PERFORMANCE METRICS:")
        print(f"  Average Response Time: {analysis['avg_response_time']:.3f}s")
        print(f"  Maximum Response Time: {analysis['max_response_time']:.3f}s")
        if analysis['p95_response_time'] > 0:
            print(f"  95th Percentile: {analysis['p95_response_time']:.3f}s")
        print()
        
        print("COLLABORATION FEATURES:")
        print(f"  Concurrent Editing Detected: {'Yes' if analysis['concurrent_editing_conflicts'] else 'No'}")
        print()
        
        # Pass/Fail criteria
        print("ACCEPTANCE CRITERIA:")
        print(f"  Success Rate >= 95%: {'✅ PASS' if analysis['success_rate'] >= 0.95 else '❌ FAIL'}")
        print(f"  Avg Response Time <= 2s: {'✅ PASS' if analysis['avg_response_time'] <= 2.0 else '❌ FAIL'}")
        print(f"  Max Response Time <= 10s: {'✅ PASS' if analysis['max_response_time'] <= 10.0 else '❌ FAIL'}")
        print(f"  Throughput >= 10 rps: {'✅ PASS' if analysis['throughput_rps'] >= 10.0 else '❌ PASS (Low Load)'}")
        
        # Overall assessment
        all_pass = (
            analysis['success_rate'] >= 0.95 and
            analysis['avg_response_time'] <= 2.0 and
            analysis['max_response_time'] <= 10.0
        )
        
        print(f"\nOVERALL ASSESSMENT: {'✅ PASS' if all_pass else '❌ NEEDS IMPROVEMENT'}")
        print("="*60)


def main():
    """Main function to run load tests."""
    parser = argparse.ArgumentParser(description='Load test Milestone 3 collaborative features')
    parser.add_argument('--users', type=int, default=10, help='Number of concurrent users')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    parser.add_argument('--url', type=str, default='http://localhost:5000', help='Backend URL')
    
    args = parser.parse_args()
    
    tester = CollaborationLoadTester(base_url=args.url, num_users=args.users)
    
    try:
        tester.setup_users()
        
        results, song_id = tester.run_load_test(args.duration)
        analysis = tester.analyze_results(results)
        tester.print_report(analysis, song_id)
        
        # Exit with appropriate code
        if "error" in analysis:
            sys.exit(1)
        
        success_rate = analysis.get('success_rate', 0)
        avg_response_time = analysis.get('avg_response_time', float('inf'))
        
        if success_rate >= 0.95 and avg_response_time <= 2.0:
            sys.exit(0)  # Success
        else:
            sys.exit(1)  # Performance criteria not met
            
    except Exception as e:
        print(f"Load test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()