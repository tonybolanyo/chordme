#!/usr/bin/env python3
"""
Enterprise Load Testing and Scalability Validation

This script provides comprehensive load testing for enterprise features:
- Concurrent user simulation (1000+ users)
- Collaboration room scalability testing
- Analytics system performance under load
- Platform integration stress testing
- Real-time feature performance validation
"""

import asyncio
import aiohttp
import time
import json
import uuid
import logging
import argparse
import statistics
from typing import Dict, List, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class LoadTestConfig:
    """Configuration for load testing parameters."""
    base_url: str = "http://localhost:5000"
    max_concurrent_users: int = 1000
    test_duration_minutes: int = 10
    ramp_up_time_seconds: int = 60
    operation_interval_seconds: float = 1.0
    timeout_seconds: int = 30
    
    # Enterprise-specific settings
    enterprise_domain: str = "loadtest.enterprise.com"
    collaboration_rooms: int = 50
    analytics_data_points: int = 100000
    
    # Performance thresholds
    max_response_time_ms: int = 2000
    min_success_rate: float = 0.95
    max_error_rate: float = 0.05


@dataclass 
class TestResult:
    """Results from load testing operations."""
    operation_type: str
    start_time: float
    end_time: float
    status_code: int
    response_time_ms: float
    success: bool
    error_message: str = None
    user_id: str = None


class EnterpriseLoadTester:
    """Enterprise-focused load testing framework."""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.results: List[TestResult] = []
        self.active_users: Dict[str, Dict] = {}
        self.collaboration_rooms: List[str] = []
        
    async def create_test_user(self, session: aiohttp.ClientSession, user_index: int) -> Tuple[str, str]:
        """Create and authenticate a test user."""
        user_data = {
            "email": f"loadtest_user_{user_index}_{uuid.uuid4()}@{self.config.enterprise_domain}",
            "password": "LoadTest123!@#"
        }
        
        try:
            # Register user
            async with session.post(
                f"{self.config.base_url}/api/v1/auth/register",
                json=user_data,
                timeout=self.config.timeout_seconds
            ) as response:
                if response.status not in [200, 201]:
                    logger.warning(f"User registration failed: {response.status}")
                    return None, None
            
            # Login user
            async with session.post(
                f"{self.config.base_url}/api/v1/auth/login", 
                json=user_data,
                timeout=self.config.timeout_seconds
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data["data"]["token"], user_data["email"]
                else:
                    logger.warning(f"User login failed: {response.status}")
                    return None, None
                    
        except Exception as e:
            logger.warning(f"User creation failed: {e}")
            return None, None
    
    async def simulate_collaboration_operations(self, session: aiohttp.ClientSession, 
                                               token: str, user_email: str, duration_minutes: int):
        """Simulate collaboration operations for a user."""
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        end_time = time.time() + (duration_minutes * 60)
        operation_count = 0
        
        while time.time() < end_time:
            try:
                # Create or join collaboration room
                if len(self.collaboration_rooms) < self.config.collaboration_rooms:
                    await self._create_collaboration_room(session, headers, user_email)
                else:
                    await self._join_random_room(session, headers, user_email)
                
                # Simulate content operations
                await self._simulate_content_operations(session, headers, user_email)
                
                # Generate analytics data
                await self._generate_analytics_data(session, headers, user_email)
                
                operation_count += 1
                await asyncio.sleep(self.config.operation_interval_seconds)
                
            except Exception as e:
                logger.warning(f"Collaboration operation failed for {user_email}: {e}")
                await asyncio.sleep(1)  # Brief pause on error
        
        logger.info(f"User {user_email} completed {operation_count} operations")
    
    async def _create_collaboration_room(self, session: aiohttp.ClientSession, 
                                        headers: Dict, user_email: str):
        """Create a new collaboration room."""
        room_data = {
            "name": f"LoadTest Room {uuid.uuid4()}",
            "description": f"Load testing room created by {user_email}",
            "room_type": "enterprise_professional",
            "max_participants": 20
        }
        
        start_time = time.time()
        try:
            async with session.post(
                f"{self.config.base_url}/api/v1/collaboration-rooms",
                json=room_data,
                headers=headers,
                timeout=self.config.timeout_seconds
            ) as response:
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                if response.status in [200, 201]:
                    data = await response.json()
                    room_id = data.get("data", {}).get("id")
                    if room_id:
                        self.collaboration_rooms.append(room_id)
                        logger.debug(f"Created room {room_id}")
                
                self.results.append(TestResult(
                    operation_type="create_room",
                    start_time=start_time,
                    end_time=end_time,
                    status_code=response.status,
                    response_time_ms=response_time_ms,
                    success=response.status in [200, 201],
                    user_id=user_email
                ))
                
        except Exception as e:
            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000
            
            self.results.append(TestResult(
                operation_type="create_room",
                start_time=start_time,
                end_time=end_time,
                status_code=0,
                response_time_ms=response_time_ms,
                success=False,
                error_message=str(e),
                user_id=user_email
            ))
    
    async def _join_random_room(self, session: aiohttp.ClientSession, 
                               headers: Dict, user_email: str):
        """Join a random collaboration room."""
        if not self.collaboration_rooms:
            return
        
        import random
        room_id = random.choice(self.collaboration_rooms)
        participant_data = {
            "role": "participant",
            "permissions": ["read", "write"]
        }
        
        start_time = time.time()
        try:
            async with session.post(
                f"{self.config.base_url}/api/v1/collaboration-rooms/{room_id}/participants",
                json=participant_data,
                headers=headers,
                timeout=self.config.timeout_seconds
            ) as response:
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                self.results.append(TestResult(
                    operation_type="join_room",
                    start_time=start_time,
                    end_time=end_time,
                    status_code=response.status,
                    response_time_ms=response_time_ms,
                    success=response.status in [200, 201],
                    user_id=user_email
                ))
                
        except Exception as e:
            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000
            
            self.results.append(TestResult(
                operation_type="join_room", 
                start_time=start_time,
                end_time=end_time,
                status_code=0,
                response_time_ms=response_time_ms,
                success=False,
                error_message=str(e),
                user_id=user_email
            ))
    
    async def _simulate_content_operations(self, session: aiohttp.ClientSession,
                                          headers: Dict, user_email: str):
        """Simulate content creation and editing operations."""
        content_data = {
            "content": f"""
{{title: Load Test Song {uuid.uuid4()}}}
{{artist: {user_email}}}
{{key: C}}

[C]This is a load test [Am]song
[F]Created for performance [G]testing
[C]Multiple users are [Am]creating [F]content [G][C]
            """,
            "content_type": "chordpro",
            "metadata": {
                "created_by": user_email,
                "test_data": True,
                "load_test_operation": True
            }
        }
        
        start_time = time.time()
        try:
            async with session.post(
                f"{self.config.base_url}/api/v1/songs",
                json=content_data,
                headers=headers,
                timeout=self.config.timeout_seconds
            ) as response:
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                self.results.append(TestResult(
                    operation_type="create_content",
                    start_time=start_time,
                    end_time=end_time,
                    status_code=response.status,
                    response_time_ms=response_time_ms,
                    success=response.status in [200, 201],
                    user_id=user_email
                ))
                
        except Exception as e:
            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000
            
            self.results.append(TestResult(
                operation_type="create_content",
                start_time=start_time,
                end_time=end_time,
                status_code=0,
                response_time_ms=response_time_ms,
                success=False,
                error_message=str(e),
                user_id=user_email
            ))
    
    async def _generate_analytics_data(self, session: aiohttp.ClientSession,
                                      headers: Dict, user_email: str):
        """Generate analytics data points."""
        analytics_data = {
            "event_type": "user_activity",
            "user_email": user_email,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "activity": "content_interaction",
                "load_test": True,
                "performance_data": {
                    "operation_count": 1,
                    "session_duration": time.time()
                }
            }
        }
        
        start_time = time.time()
        try:
            async with session.post(
                f"{self.config.base_url}/api/v1/analytics/events",
                json=analytics_data,
                headers=headers,
                timeout=self.config.timeout_seconds
            ) as response:
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                self.results.append(TestResult(
                    operation_type="analytics_event",
                    start_time=start_time,
                    end_time=end_time,
                    status_code=response.status,
                    response_time_ms=response_time_ms,
                    success=response.status in [200, 201],
                    user_id=user_email
                ))
                
        except Exception as e:
            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000
            
            self.results.append(TestResult(
                operation_type="analytics_event",
                start_time=start_time,
                end_time=end_time,
                status_code=0,
                response_time_ms=response_time_ms,
                success=False,
                error_message=str(e),
                user_id=user_email
            ))
    
    async def run_load_test(self) -> Dict[str, Any]:
        """Execute the complete load test."""
        logger.info(f"Starting enterprise load test with {self.config.max_concurrent_users} users")
        logger.info(f"Test duration: {self.config.test_duration_minutes} minutes")
        logger.info(f"Ramp-up time: {self.config.ramp_up_time_seconds} seconds")
        
        test_start_time = time.time()
        
        # Create async session with connection limits
        connector = aiohttp.TCPConnector(limit=self.config.max_concurrent_users * 2)
        timeout = aiohttp.ClientTimeout(total=self.config.timeout_seconds)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Test backend availability
            try:
                async with session.get(f"{self.config.base_url}/api/v1/health") as response:
                    if response.status != 200:
                        logger.error(f"Backend health check failed: {response.status}")
                        return {"error": "Backend not available"}
            except Exception as e:
                logger.error(f"Backend not reachable: {e}")
                return {"error": f"Backend not reachable: {e}"}
            
            # Create and authenticate users with ramp-up
            user_tasks = []
            users_per_second = self.config.max_concurrent_users / self.config.ramp_up_time_seconds
            
            for i in range(self.config.max_concurrent_users):
                # Stagger user creation for gradual ramp-up
                delay = i / users_per_second
                task = asyncio.create_task(self._create_and_run_user(session, i, delay))
                user_tasks.append(task)
            
            # Wait for all user simulations to complete
            logger.info("Waiting for all user simulations to complete...")
            await asyncio.gather(*user_tasks, return_exceptions=True)
        
        test_end_time = time.time()
        test_duration = test_end_time - test_start_time
        
        logger.info(f"Load test completed in {test_duration:.2f} seconds")
        
        # Generate performance report
        return self._generate_performance_report(test_duration)
    
    async def _create_and_run_user(self, session: aiohttp.ClientSession, 
                                  user_index: int, delay: float):
        """Create a user and run their simulation with initial delay."""
        await asyncio.sleep(delay)
        
        token, email = await self.create_test_user(session, user_index)
        if token and email:
            await self.simulate_collaboration_operations(
                session, token, email, self.config.test_duration_minutes
            )
    
    def _generate_performance_report(self, test_duration: float) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        if not self.results:
            return {"error": "No test results available"}
        
        # Calculate performance metrics
        total_operations = len(self.results)
        successful_operations = len([r for r in self.results if r.success])
        failed_operations = total_operations - successful_operations
        
        success_rate = successful_operations / total_operations if total_operations > 0 else 0
        error_rate = failed_operations / total_operations if total_operations > 0 else 0
        
        # Response time statistics
        response_times = [r.response_time_ms for r in self.results if r.success]
        if response_times:
            avg_response_time = statistics.mean(response_times)
            median_response_time = statistics.median(response_times)
            p95_response_time = self._percentile(response_times, 95)
            p99_response_time = self._percentile(response_times, 99)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
        else:
            avg_response_time = median_response_time = p95_response_time = 0
            p99_response_time = max_response_time = min_response_time = 0
        
        # Operations per second
        operations_per_second = total_operations / test_duration if test_duration > 0 else 0
        
        # Group results by operation type
        operation_stats = {}
        for result in self.results:
            op_type = result.operation_type
            if op_type not in operation_stats:
                operation_stats[op_type] = {
                    "total": 0,
                    "successful": 0,
                    "failed": 0,
                    "response_times": []
                }
            
            operation_stats[op_type]["total"] += 1
            if result.success:
                operation_stats[op_type]["successful"] += 1
                operation_stats[op_type]["response_times"].append(result.response_time_ms)
            else:
                operation_stats[op_type]["failed"] += 1
        
        # Calculate per-operation metrics
        for op_type, stats in operation_stats.items():
            if stats["response_times"]:
                stats["avg_response_time"] = statistics.mean(stats["response_times"])
                stats["p95_response_time"] = self._percentile(stats["response_times"], 95)
            else:
                stats["avg_response_time"] = 0
                stats["p95_response_time"] = 0
            
            stats["success_rate"] = stats["successful"] / stats["total"] if stats["total"] > 0 else 0
        
        # Performance assessment
        performance_issues = []
        if avg_response_time > self.config.max_response_time_ms:
            performance_issues.append(f"Average response time ({avg_response_time:.2f}ms) exceeds threshold ({self.config.max_response_time_ms}ms)")
        
        if success_rate < self.config.min_success_rate:
            performance_issues.append(f"Success rate ({success_rate:.2%}) below threshold ({self.config.min_success_rate:.2%})")
        
        if error_rate > self.config.max_error_rate:
            performance_issues.append(f"Error rate ({error_rate:.2%}) exceeds threshold ({self.config.max_error_rate:.2%})")
        
        report = {
            "test_summary": {
                "duration_seconds": test_duration,
                "target_concurrent_users": self.config.max_concurrent_users,
                "total_operations": total_operations,
                "successful_operations": successful_operations,
                "failed_operations": failed_operations,
                "operations_per_second": operations_per_second
            },
            "performance_metrics": {
                "success_rate": success_rate,
                "error_rate": error_rate,
                "avg_response_time_ms": avg_response_time,
                "median_response_time_ms": median_response_time,
                "p95_response_time_ms": p95_response_time,
                "p99_response_time_ms": p99_response_time,
                "min_response_time_ms": min_response_time,
                "max_response_time_ms": max_response_time
            },
            "operation_breakdown": operation_stats,
            "enterprise_metrics": {
                "collaboration_rooms_created": len(self.collaboration_rooms),
                "unique_users_simulated": len(set(r.user_id for r in self.results if r.user_id)),
                "analytics_events_generated": len([r for r in self.results if r.operation_type == "analytics_event"])
            },
            "performance_assessment": {
                "meets_requirements": len(performance_issues) == 0,
                "issues": performance_issues
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return report
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value from data list."""
        if not data:
            return 0
        
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index % 1)
    
    def save_results(self, report: Dict[str, Any], filename: str = None):
        """Save test results to file."""
        if not filename:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"enterprise_load_test_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Test results saved to {filename}")


async def main():
    """Main function to run enterprise load testing."""
    parser = argparse.ArgumentParser(description="Enterprise Load Testing for ChordMe")
    parser.add_argument("--users", type=int, default=100, help="Maximum concurrent users")
    parser.add_argument("--duration", type=int, default=5, help="Test duration in minutes")
    parser.add_argument("--ramp-up", type=int, default=30, help="Ramp-up time in seconds")
    parser.add_argument("--base-url", default="http://localhost:5000", help="API base URL")
    parser.add_argument("--rooms", type=int, default=20, help="Number of collaboration rooms")
    parser.add_argument("--output", help="Output file for results")
    
    args = parser.parse_args()
    
    config = LoadTestConfig(
        base_url=args.base_url,
        max_concurrent_users=args.users,
        test_duration_minutes=args.duration,
        ramp_up_time_seconds=args.ramp_up,
        collaboration_rooms=args.rooms
    )
    
    tester = EnterpriseLoadTester(config)
    
    try:
        report = await tester.run_load_test()
        
        # Print summary
        print("\n" + "="*80)
        print("ENTERPRISE LOAD TEST RESULTS")
        print("="*80)
        
        if "error" in report:
            print(f"ERROR: {report['error']}")
            return
        
        summary = report["test_summary"]
        metrics = report["performance_metrics"]
        assessment = report["performance_assessment"]
        
        print(f"Test Duration: {summary['duration_seconds']:.2f} seconds")
        print(f"Target Users: {summary['target_concurrent_users']}")
        print(f"Total Operations: {summary['total_operations']}")
        print(f"Operations/Second: {summary['operations_per_second']:.2f}")
        print(f"Success Rate: {metrics['success_rate']:.2%}")
        print(f"Average Response Time: {metrics['avg_response_time_ms']:.2f}ms")
        print(f"95th Percentile: {metrics['p95_response_time_ms']:.2f}ms")
        
        print(f"\nPerformance Assessment: {'PASS' if assessment['meets_requirements'] else 'FAIL'}")
        if assessment['issues']:
            print("Issues:")
            for issue in assessment['issues']:
                print(f"  - {issue}")
        
        # Save results
        tester.save_results(report, args.output)
        
    except KeyboardInterrupt:
        logger.info("Load test interrupted by user")
    except Exception as e:
        logger.error(f"Load test failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())