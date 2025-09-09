#!/usr/bin/env python3
"""
Enterprise Performance Benchmarking and Monitoring

Comprehensive performance benchmarking for enterprise scenarios:
- Database performance under enterprise loads
- API response time benchmarking  
- Real-time collaboration performance
- Analytics system performance
- Cross-feature integration performance
- Memory and resource usage monitoring
"""

import asyncio
import aiohttp
import psutil
import time
import json
import statistics
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass, asdict
import argparse
import sys
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class BenchmarkConfig:
    """Configuration for performance benchmarking."""
    base_url: str = "http://localhost:5000"
    frontend_url: str = "http://localhost:5173"
    benchmark_duration_minutes: int = 15
    concurrent_users: int = 100
    operations_per_minute: int = 60
    
    # Performance thresholds (enterprise requirements)
    max_api_response_time_ms: int = 1000
    max_database_response_time_ms: int = 500
    max_memory_usage_mb: int = 2048
    max_cpu_usage_percent: float = 80.0
    min_throughput_ops_per_second: int = 100
    max_error_rate_percent: float = 1.0


@dataclass
class PerformanceMetric:
    """Individual performance measurement."""
    timestamp: float
    operation_type: str
    response_time_ms: float
    memory_usage_mb: float
    cpu_usage_percent: float
    success: bool
    error_message: str = None
    additional_data: Dict[str, Any] = None


class SystemMonitor:
    """Monitor system resources during benchmarking."""
    
    def __init__(self):
        self.process = psutil.Process()
        self.monitoring = False
        self.metrics: List[Dict[str, Any]] = []
    
    async def start_monitoring(self, interval_seconds: float = 1.0):
        """Start continuous system monitoring."""
        self.monitoring = True
        
        while self.monitoring:
            try:
                # System-wide metrics
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                disk_io = psutil.disk_io_counters()
                net_io = psutil.net_io_counters()
                
                # Process-specific metrics
                process_memory = self.process.memory_info().rss / 1024 / 1024  # MB
                process_cpu = self.process.cpu_percent()
                
                metric = {
                    "timestamp": time.time(),
                    "system": {
                        "cpu_percent": cpu_percent,
                        "memory_percent": memory.percent,
                        "memory_available_mb": memory.available / 1024 / 1024,
                        "disk_read_mb": disk_io.read_bytes / 1024 / 1024 if disk_io else 0,
                        "disk_write_mb": disk_io.write_bytes / 1024 / 1024 if disk_io else 0,
                        "network_sent_mb": net_io.bytes_sent / 1024 / 1024 if net_io else 0,
                        "network_recv_mb": net_io.bytes_recv / 1024 / 1024 if net_io else 0
                    },
                    "process": {
                        "memory_mb": process_memory,
                        "cpu_percent": process_cpu
                    }
                }
                
                self.metrics.append(metric)
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                logger.warning(f"Error collecting system metrics: {e}")
                await asyncio.sleep(interval_seconds)
    
    def stop_monitoring(self):
        """Stop system monitoring."""
        self.monitoring = False
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics from monitoring data."""
        if not self.metrics:
            return {}
        
        cpu_values = [m["system"]["cpu_percent"] for m in self.metrics]
        memory_values = [m["system"]["memory_percent"] for m in self.metrics]
        process_memory_values = [m["process"]["memory_mb"] for m in self.metrics]
        process_cpu_values = [m["process"]["cpu_percent"] for m in self.metrics]
        
        return {
            "monitoring_duration_seconds": self.metrics[-1]["timestamp"] - self.metrics[0]["timestamp"],
            "sample_count": len(self.metrics),
            "system_cpu": {
                "avg": statistics.mean(cpu_values),
                "max": max(cpu_values),
                "min": min(cpu_values),
                "p95": self._percentile(cpu_values, 95)
            },
            "system_memory": {
                "avg": statistics.mean(memory_values),
                "max": max(memory_values),
                "min": min(memory_values),
                "p95": self._percentile(memory_values, 95)
            },
            "process_memory_mb": {
                "avg": statistics.mean(process_memory_values),
                "max": max(process_memory_values),
                "min": min(process_memory_values),
                "p95": self._percentile(process_memory_values, 95)
            },
            "process_cpu": {
                "avg": statistics.mean(process_cpu_values),
                "max": max(process_cpu_values),
                "min": min(process_cpu_values),
                "p95": self._percentile(process_cpu_values, 95)
            }
        }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value."""
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


class EnterpriseBenchmark:
    """Enterprise performance benchmarking framework."""
    
    def __init__(self, config: BenchmarkConfig):
        self.config = config
        self.metrics: List[PerformanceMetric] = []
        self.system_monitor = SystemMonitor()
        self.test_users: List[Dict[str, str]] = []
    
    async def run_comprehensive_benchmark(self) -> Dict[str, Any]:
        """Run comprehensive enterprise performance benchmark."""
        logger.info("Starting comprehensive enterprise performance benchmark")
        logger.info(f"Configuration: {asdict(self.config)}")
        
        # Start system monitoring
        monitor_task = asyncio.create_task(self.system_monitor.start_monitoring())
        
        try:
            benchmark_start_time = time.time()
            
            # Test backend availability
            if not await self._test_backend_availability():
                return {"error": "Backend not available for benchmarking"}
            
            # Run benchmark phases
            results = {}
            
            # Phase 1: API Performance Benchmarking
            logger.info("Phase 1: API Performance Benchmarking")
            results["api_performance"] = await self._benchmark_api_performance()
            
            # Phase 2: Database Performance Benchmarking
            logger.info("Phase 2: Database Performance Benchmarking")
            results["database_performance"] = await self._benchmark_database_performance()
            
            # Phase 3: Collaboration Performance Benchmarking
            logger.info("Phase 3: Collaboration Performance Benchmarking")
            results["collaboration_performance"] = await self._benchmark_collaboration_performance()
            
            # Phase 4: Analytics Performance Benchmarking
            logger.info("Phase 4: Analytics Performance Benchmarking")
            results["analytics_performance"] = await self._benchmark_analytics_performance()
            
            # Phase 5: Load Testing Benchmark
            logger.info("Phase 5: Load Testing Benchmark")
            results["load_testing"] = await self._benchmark_load_performance()
            
            benchmark_end_time = time.time()
            
            # Stop monitoring and collect system stats
            self.system_monitor.stop_monitoring()
            await asyncio.sleep(1)  # Allow monitor to stop
            
            results["system_performance"] = self.system_monitor.get_summary_stats()
            results["benchmark_summary"] = {
                "total_duration_seconds": benchmark_end_time - benchmark_start_time,
                "total_operations": len(self.metrics),
                "configuration": asdict(self.config)
            }
            
            # Assess overall performance
            results["performance_assessment"] = self._assess_performance(results)
            
            return results
            
        finally:
            self.system_monitor.stop_monitoring()
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
    
    async def _test_backend_availability(self) -> bool:
        """Test if backend is available for benchmarking."""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(f"{self.config.base_url}/api/v1/health") as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Backend availability check failed: {e}")
            return False
    
    async def _benchmark_api_performance(self) -> Dict[str, Any]:
        """Benchmark API endpoint performance."""
        endpoints = [
            ("GET", "/api/v1/health", None),
            ("POST", "/api/v1/auth/register", {
                "email": f"benchmark_user_{int(time.time())}@benchmark.com",
                "password": "BenchmarkPassword123!"
            }),
            ("POST", "/api/v1/auth/login", {
                "email": f"benchmark_user_{int(time.time())}@benchmark.com", 
                "password": "BenchmarkPassword123!"
            }),
            ("GET", "/api/v1/songs", None),
            ("POST", "/api/v1/songs", {
                "title": "Benchmark Song",
                "content": "[C]Benchmark song [Am]for testing [F]API [G]performance",
                "content_type": "chordpro"
            })
        ]
        
        results = {}
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            for method, endpoint, data in endpoints:
                endpoint_metrics = []
                
                # Test each endpoint multiple times
                for i in range(10):
                    start_time = time.time()
                    success = False
                    error_message = None
                    
                    try:
                        if method == "GET":
                            async with session.get(f"{self.config.base_url}{endpoint}") as response:
                                success = response.status < 400
                                if not success:
                                    error_message = f"HTTP {response.status}"
                        else:
                            async with session.post(
                                f"{self.config.base_url}{endpoint}",
                                json=data,
                                headers={"Content-Type": "application/json"}
                            ) as response:
                                success = response.status < 400
                                if not success:
                                    error_message = f"HTTP {response.status}"
                    
                    except Exception as e:
                        error_message = str(e)
                    
                    end_time = time.time()
                    response_time_ms = (end_time - start_time) * 1000
                    
                    metric = PerformanceMetric(
                        timestamp=start_time,
                        operation_type=f"{method} {endpoint}",
                        response_time_ms=response_time_ms,
                        memory_usage_mb=psutil.Process().memory_info().rss / 1024 / 1024,
                        cpu_usage_percent=psutil.Process().cpu_percent(),
                        success=success,
                        error_message=error_message
                    )
                    
                    endpoint_metrics.append(metric)
                    self.metrics.append(metric)
                    
                    await asyncio.sleep(0.1)  # Small delay between requests
                
                # Calculate endpoint statistics
                response_times = [m.response_time_ms for m in endpoint_metrics if m.success]
                success_count = len([m for m in endpoint_metrics if m.success])
                
                if response_times:
                    results[f"{method} {endpoint}"] = {
                        "avg_response_time_ms": statistics.mean(response_times),
                        "p95_response_time_ms": self._percentile(response_times, 95),
                        "max_response_time_ms": max(response_times),
                        "min_response_time_ms": min(response_times),
                        "success_rate": success_count / len(endpoint_metrics),
                        "total_requests": len(endpoint_metrics)
                    }
                else:
                    results[f"{method} {endpoint}"] = {
                        "error": "No successful requests",
                        "success_rate": 0,
                        "total_requests": len(endpoint_metrics)
                    }
        
        return results
    
    async def _benchmark_database_performance(self) -> Dict[str, Any]:
        """Benchmark database performance through API operations."""
        results = {}
        
        # Create test user for database operations
        test_user = await self._create_test_user()
        if not test_user:
            return {"error": "Could not create test user for database benchmarking"}
        
        token = test_user.get("token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            # Benchmark song creation (database writes)
            create_metrics = []
            for i in range(20):
                song_data = {
                    "title": f"Database Benchmark Song {i}",
                    "content": f"[C]Song {i} for database [Am]performance testing [F]operations [G]benchmark",
                    "content_type": "chordpro",
                    "metadata": {"benchmark": True, "iteration": i}
                }
                
                start_time = time.time()
                success = False
                
                try:
                    async with session.post(
                        f"{self.config.base_url}/api/v1/songs",
                        json=song_data,
                        headers=headers
                    ) as response:
                        success = response.status < 400
                        
                except Exception as e:
                    logger.warning(f"Song creation failed: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                create_metrics.append(response_time_ms)
                await asyncio.sleep(0.1)
            
            # Benchmark song retrieval (database reads)
            read_metrics = []
            for i in range(20):
                start_time = time.time()
                success = False
                
                try:
                    async with session.get(
                        f"{self.config.base_url}/api/v1/songs",
                        headers=headers,
                        params={"limit": 10, "offset": i}
                    ) as response:
                        success = response.status < 400
                        
                except Exception as e:
                    logger.warning(f"Song retrieval failed: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                read_metrics.append(response_time_ms)
                await asyncio.sleep(0.1)
            
            # Benchmark search operations (complex database queries)
            search_metrics = []
            search_terms = ["benchmark", "performance", "database", "testing", "enterprise"]
            
            for term in search_terms:
                start_time = time.time()
                success = False
                
                try:
                    async with session.get(
                        f"{self.config.base_url}/api/v1/songs/search",
                        headers=headers,
                        params={"q": term, "limit": 20}
                    ) as response:
                        success = response.status < 400
                        
                except Exception as e:
                    logger.warning(f"Search operation failed: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                search_metrics.append(response_time_ms)
                await asyncio.sleep(0.2)
        
        # Calculate database performance statistics
        results["database_writes"] = {
            "avg_response_time_ms": statistics.mean(create_metrics) if create_metrics else 0,
            "p95_response_time_ms": self._percentile(create_metrics, 95) if create_metrics else 0,
            "max_response_time_ms": max(create_metrics) if create_metrics else 0,
            "operations_tested": len(create_metrics)
        }
        
        results["database_reads"] = {
            "avg_response_time_ms": statistics.mean(read_metrics) if read_metrics else 0,
            "p95_response_time_ms": self._percentile(read_metrics, 95) if read_metrics else 0,
            "max_response_time_ms": max(read_metrics) if read_metrics else 0,
            "operations_tested": len(read_metrics)
        }
        
        results["database_searches"] = {
            "avg_response_time_ms": statistics.mean(search_metrics) if search_metrics else 0,
            "p95_response_time_ms": self._percentile(search_metrics, 95) if search_metrics else 0,
            "max_response_time_ms": max(search_metrics) if search_metrics else 0,
            "operations_tested": len(search_metrics)
        }
        
        return results
    
    async def _benchmark_collaboration_performance(self) -> Dict[str, Any]:
        """Benchmark collaboration features performance."""
        results = {}
        
        # Create test user for collaboration
        test_user = await self._create_test_user()
        if not test_user:
            return {"error": "Could not create test user for collaboration benchmarking"}
        
        token = test_user.get("token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            # Benchmark room creation
            room_creation_metrics = []
            room_ids = []
            
            for i in range(10):
                room_data = {
                    "name": f"Benchmark Room {i}",
                    "description": f"Performance testing room {i}",
                    "room_type": "professional"
                }
                
                start_time = time.time()
                success = False
                room_id = None
                
                try:
                    async with session.post(
                        f"{self.config.base_url}/api/v1/collaboration-rooms",
                        json=room_data,
                        headers=headers
                    ) as response:
                        if response.status < 400:
                            success = True
                            data = await response.json()
                            room_id = data.get("data", {}).get("id")
                            if room_id:
                                room_ids.append(room_id)
                        
                except Exception as e:
                    logger.warning(f"Room creation failed: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                room_creation_metrics.append(response_time_ms)
                await asyncio.sleep(0.2)
            
            # Benchmark room operations
            room_operations_metrics = []
            
            for room_id in room_ids[:5]:  # Test with first 5 rooms
                # Test adding content to room
                content_data = {
                    "content": f"[C]Benchmark content for room {room_id} [Am]performance testing",
                    "content_type": "chordpro"
                }
                
                start_time = time.time()
                
                try:
                    async with session.post(
                        f"{self.config.base_url}/api/v1/collaboration-rooms/{room_id}/content",
                        json=content_data,
                        headers=headers
                    ) as response:
                        success = response.status < 400
                        
                except Exception as e:
                    logger.warning(f"Room content operation failed: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                room_operations_metrics.append(response_time_ms)
                await asyncio.sleep(0.1)
        
        results["room_creation"] = {
            "avg_response_time_ms": statistics.mean(room_creation_metrics) if room_creation_metrics else 0,
            "p95_response_time_ms": self._percentile(room_creation_metrics, 95) if room_creation_metrics else 0,
            "max_response_time_ms": max(room_creation_metrics) if room_creation_metrics else 0,
            "rooms_created": len(room_ids)
        }
        
        results["room_operations"] = {
            "avg_response_time_ms": statistics.mean(room_operations_metrics) if room_operations_metrics else 0,
            "p95_response_time_ms": self._percentile(room_operations_metrics, 95) if room_operations_metrics else 0,
            "max_response_time_ms": max(room_operations_metrics) if room_operations_metrics else 0,
            "operations_tested": len(room_operations_metrics)
        }
        
        return results
    
    async def _benchmark_analytics_performance(self) -> Dict[str, Any]:
        """Benchmark analytics system performance."""
        results = {}
        
        # Create test user for analytics
        test_user = await self._create_test_user()
        if not test_user:
            return {"error": "Could not create test user for analytics benchmarking"}
        
        token = test_user.get("token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            # Benchmark analytics data generation
            analytics_creation_metrics = []
            
            for i in range(50):
                analytics_data = {
                    "event_type": "benchmark_event",
                    "timestamp": datetime.utcnow().isoformat(),
                    "metadata": {
                        "benchmark_iteration": i,
                        "performance_test": True,
                        "user_action": "content_interaction"
                    }
                }
                
                start_time = time.time()
                
                try:
                    async with session.post(
                        f"{self.config.base_url}/api/v1/analytics/events",
                        json=analytics_data,
                        headers=headers
                    ) as response:
                        success = response.status < 400
                        
                except Exception as e:
                    logger.warning(f"Analytics event creation failed: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                analytics_creation_metrics.append(response_time_ms)
                await asyncio.sleep(0.05)  # Faster generation for analytics
            
            # Benchmark analytics queries
            analytics_query_metrics = []
            
            query_params = [
                {"timeframe": "1h", "event_type": "benchmark_event"},
                {"timeframe": "24h", "aggregation": "hourly"},
                {"timeframe": "7d", "aggregation": "daily"},
                {"event_type": "content_interaction", "limit": 100},
                {"user_metrics": True, "timeframe": "1h"}
            ]
            
            for params in query_params:
                start_time = time.time()
                
                try:
                    async with session.get(
                        f"{self.config.base_url}/api/v1/analytics/metrics",
                        headers=headers,
                        params=params
                    ) as response:
                        success = response.status < 400
                        
                except Exception as e:
                    logger.warning(f"Analytics query failed: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                analytics_query_metrics.append(response_time_ms)
                await asyncio.sleep(0.2)
        
        results["analytics_data_generation"] = {
            "avg_response_time_ms": statistics.mean(analytics_creation_metrics) if analytics_creation_metrics else 0,
            "p95_response_time_ms": self._percentile(analytics_creation_metrics, 95) if analytics_creation_metrics else 0,
            "max_response_time_ms": max(analytics_creation_metrics) if analytics_creation_metrics else 0,
            "events_generated": len(analytics_creation_metrics)
        }
        
        results["analytics_queries"] = {
            "avg_response_time_ms": statistics.mean(analytics_query_metrics) if analytics_query_metrics else 0,
            "p95_response_time_ms": self._percentile(analytics_query_metrics, 95) if analytics_query_metrics else 0,
            "max_response_time_ms": max(analytics_query_metrics) if analytics_query_metrics else 0,
            "queries_tested": len(analytics_query_metrics)
        }
        
        return results
    
    async def _benchmark_load_performance(self) -> Dict[str, Any]:
        """Benchmark system performance under load."""
        results = {}
        
        # Create multiple test users for load testing
        users = []
        for i in range(min(self.config.concurrent_users, 20)):  # Limited for benchmarking
            user = await self._create_test_user()
            if user:
                users.append(user)
        
        if not users:
            return {"error": "Could not create test users for load benchmarking"}
        
        # Concurrent operations
        async def user_operations(user_data: Dict[str, str]) -> List[float]:
            """Perform operations for a single user."""
            token = user_data.get("token")
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            response_times = []
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                for i in range(5):  # 5 operations per user
                    start_time = time.time()
                    
                    try:
                        async with session.get(
                            f"{self.config.base_url}/api/v1/songs",
                            headers=headers,
                            params={"limit": 10}
                        ) as response:
                            success = response.status < 400
                            
                    except Exception as e:
                        logger.warning(f"Load test operation failed: {e}")
                    
                    end_time = time.time()
                    response_times.append((end_time - start_time) * 1000)
                    
                    await asyncio.sleep(0.1)
            
            return response_times
        
        # Execute concurrent operations
        start_time = time.time()
        tasks = [user_operations(user) for user in users]
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()
        
        # Collect all response times
        all_response_times = []
        for result in results_list:
            if isinstance(result, list):
                all_response_times.extend(result)
        
        total_operations = len(all_response_times)
        test_duration = end_time - start_time
        throughput = total_operations / test_duration if test_duration > 0 else 0
        
        results["concurrent_load"] = {
            "concurrent_users": len(users),
            "total_operations": total_operations,
            "test_duration_seconds": test_duration,
            "throughput_ops_per_second": throughput,
            "avg_response_time_ms": statistics.mean(all_response_times) if all_response_times else 0,
            "p95_response_time_ms": self._percentile(all_response_times, 95) if all_response_times else 0,
            "max_response_time_ms": max(all_response_times) if all_response_times else 0
        }
        
        return results
    
    async def _create_test_user(self) -> Dict[str, Any]:
        """Create a test user and return authentication token."""
        user_data = {
            "email": f"benchmark_user_{int(time.time() * 1000)}@benchmark.com",
            "password": "BenchmarkPassword123!"
        }
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                # Register user
                async with session.post(
                    f"{self.config.base_url}/api/v1/auth/register",
                    json=user_data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status not in [200, 201]:
                        logger.warning(f"User registration failed: {response.status}")
                        return None
                
                # Login user
                async with session.post(
                    f"{self.config.base_url}/api/v1/auth/login",
                    json=user_data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data["data"]
                    else:
                        logger.warning(f"User login failed: {response.status}")
                        return None
        
        except Exception as e:
            logger.warning(f"Test user creation failed: {e}")
            return None
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value."""
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
    
    def _assess_performance(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall performance against enterprise requirements."""
        issues = []
        warnings = []
        
        # Check API performance
        api_results = results.get("api_performance", {})
        for endpoint, metrics in api_results.items():
            if isinstance(metrics, dict) and "avg_response_time_ms" in metrics:
                if metrics["avg_response_time_ms"] > self.config.max_api_response_time_ms:
                    issues.append(f"{endpoint}: Average response time ({metrics['avg_response_time_ms']:.2f}ms) exceeds threshold ({self.config.max_api_response_time_ms}ms)")
                
                if metrics.get("success_rate", 0) < 0.95:
                    issues.append(f"{endpoint}: Success rate ({metrics['success_rate']:.2%}) below 95%")
        
        # Check database performance
        db_results = results.get("database_performance", {})
        for operation, metrics in db_results.items():
            if isinstance(metrics, dict) and "avg_response_time_ms" in metrics:
                if metrics["avg_response_time_ms"] > self.config.max_database_response_time_ms:
                    issues.append(f"Database {operation}: Average response time ({metrics['avg_response_time_ms']:.2f}ms) exceeds threshold ({self.config.max_database_response_time_ms}ms)")
        
        # Check system performance
        system_results = results.get("system_performance", {})
        if system_results:
            process_memory = system_results.get("process_memory_mb", {})
            if process_memory.get("max", 0) > self.config.max_memory_usage_mb:
                warnings.append(f"Peak memory usage ({process_memory['max']:.2f}MB) exceeds threshold ({self.config.max_memory_usage_mb}MB)")
            
            process_cpu = system_results.get("process_cpu", {})
            if process_cpu.get("max", 0) > self.config.max_cpu_usage_percent:
                warnings.append(f"Peak CPU usage ({process_cpu['max']:.2f}%) exceeds threshold ({self.config.max_cpu_usage_percent}%)")
        
        # Check load performance
        load_results = results.get("load_testing", {}).get("concurrent_load", {})
        if load_results:
            throughput = load_results.get("throughput_ops_per_second", 0)
            if throughput < self.config.min_throughput_ops_per_second:
                issues.append(f"Throughput ({throughput:.2f} ops/sec) below threshold ({self.config.min_throughput_ops_per_second} ops/sec)")
        
        # Overall assessment
        performance_grade = "EXCELLENT"
        if issues:
            performance_grade = "POOR"
        elif warnings:
            performance_grade = "GOOD"
        
        return {
            "performance_grade": performance_grade,
            "meets_enterprise_requirements": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "assessment_summary": {
                "critical_issues": len(issues),
                "warnings": len(warnings),
                "recommendation": "APPROVED" if len(issues) == 0 else "NEEDS_OPTIMIZATION"
            }
        }
    
    def save_benchmark_results(self, results: Dict[str, Any], filename: str = None):
        """Save benchmark results to file."""
        if not filename:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"enterprise_benchmark_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Benchmark results saved to {filename}")


async def main():
    """Main function to run enterprise performance benchmarking."""
    parser = argparse.ArgumentParser(description="Enterprise Performance Benchmarking for ChordMe")
    parser.add_argument("--base-url", default="http://localhost:5000", help="API base URL")
    parser.add_argument("--frontend-url", default="http://localhost:5173", help="Frontend URL")
    parser.add_argument("--duration", type=int, default=10, help="Benchmark duration in minutes")
    parser.add_argument("--users", type=int, default=20, help="Concurrent users for load testing")
    parser.add_argument("--output", help="Output file for results")
    
    args = parser.parse_args()
    
    config = BenchmarkConfig(
        base_url=args.base_url,
        frontend_url=args.frontend_url,
        benchmark_duration_minutes=args.duration,
        concurrent_users=args.users
    )
    
    benchmark = EnterpriseBenchmark(config)
    
    try:
        results = await benchmark.run_comprehensive_benchmark()
        
        # Print summary
        print("\n" + "="*80)
        print("ENTERPRISE PERFORMANCE BENCHMARK RESULTS")
        print("="*80)
        
        if "error" in results:
            print(f"ERROR: {results['error']}")
            return
        
        summary = results.get("benchmark_summary", {})
        assessment = results.get("performance_assessment", {})
        
        print(f"Benchmark Duration: {summary.get('total_duration_seconds', 0):.2f} seconds")
        print(f"Total Operations: {summary.get('total_operations', 0)}")
        print(f"Performance Grade: {assessment.get('performance_grade', 'UNKNOWN')}")
        print(f"Enterprise Requirements: {'PASS' if assessment.get('meets_enterprise_requirements') else 'FAIL'}")
        
        if assessment.get("issues"):
            print("\nCritical Issues:")
            for issue in assessment["issues"]:
                print(f"  ❌ {issue}")
        
        if assessment.get("warnings"):
            print("\nWarnings:")
            for warning in assessment["warnings"]:
                print(f"  ⚠️  {warning}")
        
        # Print key metrics
        api_perf = results.get("api_performance", {})
        if api_perf:
            print(f"\nAPI Performance:")
            for endpoint, metrics in list(api_perf.items())[:3]:  # Show first 3 endpoints
                if isinstance(metrics, dict) and "avg_response_time_ms" in metrics:
                    print(f"  {endpoint}: {metrics['avg_response_time_ms']:.2f}ms avg")
        
        system_perf = results.get("system_performance", {})
        if system_perf:
            process_memory = system_perf.get("process_memory_mb", {})
            process_cpu = system_perf.get("process_cpu", {})
            print(f"\nSystem Performance:")
            print(f"  Peak Memory: {process_memory.get('max', 0):.2f}MB")
            print(f"  Peak CPU: {process_cpu.get('max', 0):.2f}%")
        
        # Save results
        benchmark.save_benchmark_results(results, args.output)
        
    except KeyboardInterrupt:
        logger.info("Benchmark interrupted by user")
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())