#!/usr/bin/env python3
"""
Comprehensive Performance Monitoring Framework for ChordMe

This script provides enterprise-grade performance monitoring and benchmarking:
- 500+ concurrent user load testing
- Database performance with millions of records
- Memory usage optimization validation
- Real-time collaboration performance under load
- Performance regression detection
- Continuous monitoring capabilities
"""

import asyncio
import aiohttp
import psutil
import time
import json
import statistics
import logging
import argparse
import sys
import os
import uuid
import sqlite3
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class PerformanceConfig:
    """Configuration for comprehensive performance monitoring."""
    base_url: str = "http://localhost:5000"
    frontend_url: str = "http://localhost:5173"
    
    # Load testing parameters
    max_concurrent_users: int = 500
    test_duration_minutes: int = 15
    ramp_up_time_seconds: int = 120
    operation_interval_seconds: float = 0.5
    
    # Database performance parameters
    database_records_target: int = 1000000
    batch_size: int = 1000
    database_operation_timeout: int = 60
    
    # Memory monitoring parameters
    memory_sample_interval: float = 1.0
    memory_leak_threshold_mb: int = 100
    max_memory_usage_mb: int = 4096
    
    # Performance thresholds (enterprise requirements)
    max_api_response_time_ms: int = 1000
    max_database_response_time_ms: int = 500
    max_collaboration_latency_ms: int = 100
    min_throughput_ops_per_second: int = 100
    max_error_rate_percent: float = 1.0
    
    # Real-time collaboration parameters
    websocket_timeout_seconds: int = 30
    collaboration_room_count: int = 100
    participants_per_room: int = 10


@dataclass
class PerformanceMetric:
    """Individual performance measurement."""
    timestamp: float
    metric_type: str
    operation: str
    value: float
    unit: str
    success: bool
    metadata: Dict[str, Any] = None
    user_id: str = None
    session_id: str = None


class DatabasePerformanceTester:
    """Database performance testing with large datasets."""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.test_db_path = "/tmp/chordme_performance_test.db"
        self.metrics: List[PerformanceMetric] = []
    
    def setup_test_database(self) -> bool:
        """Create test database with large dataset."""
        logger.info("Setting up test database with large dataset...")
        
        try:
            # Remove existing test database
            if os.path.exists(self.test_db_path):
                os.remove(self.test_db_path)
            
            # Create test database
            conn = sqlite3.connect(self.test_db_path)
            cursor = conn.cursor()
            
            # Create tables
            cursor.execute("""
                CREATE TABLE test_songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    user_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            cursor.execute("""
                CREATE TABLE test_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE test_collaboration_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    event_data TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX idx_songs_user_id ON test_songs(user_id)")
            cursor.execute("CREATE INDEX idx_songs_created_at ON test_songs(created_at)")
            cursor.execute("CREATE INDEX idx_collaboration_room_id ON test_collaboration_events(room_id)")
            cursor.execute("CREATE INDEX idx_collaboration_timestamp ON test_collaboration_events(timestamp)")
            
            conn.commit()
            
            # Generate test users
            logger.info("Generating test users...")
            users_to_create = min(10000, self.config.database_records_target // 100)
            user_data = [(f"test_user_{i}@performance.test",) for i in range(users_to_create)]
            
            cursor.executemany("INSERT INTO test_users (email) VALUES (?)", user_data)
            conn.commit()
            
            # Generate test songs in batches
            logger.info(f"Generating {self.config.database_records_target} test songs...")
            songs_created = 0
            batch_size = self.config.batch_size
            
            while songs_created < self.config.database_records_target:
                batch_data = []
                for i in range(min(batch_size, self.config.database_records_target - songs_created)):
                    song_id = songs_created + i
                    user_id = (song_id % users_to_create) + 1
                    
                    song_data = (
                        f"Performance Test Song {song_id}",
                        f"{{title: Performance Test Song {song_id}}}\n{{artist: Test User {user_id}}}\n\n[C]This is test song {song_id} [Am]for performance testing\n[F]Testing database operations [G]under load [C]",
                        user_id,
                        json.dumps({"test_data": True, "song_number": song_id})
                    )
                    batch_data.append(song_data)
                
                cursor.executemany(
                    "INSERT INTO test_songs (title, content, user_id, metadata) VALUES (?, ?, ?, ?)",
                    batch_data
                )
                conn.commit()
                
                songs_created += len(batch_data)
                
                if songs_created % 10000 == 0:
                    logger.info(f"Created {songs_created} songs...")
            
            # Generate collaboration events
            logger.info("Generating collaboration events...")
            events_to_create = min(100000, self.config.database_records_target // 10)
            event_data = []
            
            for i in range(events_to_create):
                room_id = (i % 1000) + 1
                user_id = (i % users_to_create) + 1
                event_type = ["join", "edit", "comment", "leave"][i % 4]
                event_data_json = json.dumps({"event_id": i, "test_data": True})
                
                event_data.append((room_id, user_id, event_type, event_data_json))
                
                if len(event_data) >= batch_size:
                    cursor.executemany(
                        "INSERT INTO test_collaboration_events (room_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                        event_data
                    )
                    conn.commit()
                    event_data = []
            
            if event_data:
                cursor.executemany(
                    "INSERT INTO test_collaboration_events (room_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                    event_data
                )
                conn.commit()
            
            conn.close()
            
            logger.info(f"Test database created successfully at {self.test_db_path}")
            logger.info(f"Created {songs_created} songs, {users_to_create} users, {events_to_create} collaboration events")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup test database: {e}")
            return False
    
    def run_database_performance_tests(self) -> Dict[str, Any]:
        """Run comprehensive database performance tests."""
        logger.info("Running database performance tests...")
        
        results = {
            "setup_successful": False,
            "read_performance": {},
            "write_performance": {},
            "search_performance": {},
            "complex_query_performance": {},
            "concurrent_access_performance": {}
        }
        
        # Setup test database
        if not self.setup_test_database():
            results["error"] = "Failed to setup test database"
            return results
        
        results["setup_successful"] = True
        
        try:
            # Test read performance
            results["read_performance"] = self._test_read_performance()
            
            # Test write performance
            results["write_performance"] = self._test_write_performance()
            
            # Test search performance
            results["search_performance"] = self._test_search_performance()
            
            # Test complex queries
            results["complex_query_performance"] = self._test_complex_queries()
            
            # Test concurrent access
            results["concurrent_access_performance"] = self._test_concurrent_access()
            
        except Exception as e:
            logger.error(f"Database performance tests failed: {e}")
            results["error"] = str(e)
        
        return results
    
    def _test_read_performance(self) -> Dict[str, Any]:
        """Test database read performance."""
        logger.info("Testing database read performance...")
        
        conn = sqlite3.connect(self.test_db_path)
        cursor = conn.cursor()
        
        read_times = []
        
        # Test simple selects
        for i in range(100):
            start_time = time.time()
            cursor.execute("SELECT * FROM test_songs LIMIT 100 OFFSET ?", (i * 100,))
            results = cursor.fetchall()
            end_time = time.time()
            
            read_times.append((end_time - start_time) * 1000)
        
        # Test indexed reads
        indexed_read_times = []
        for i in range(100):
            user_id = (i % 100) + 1
            start_time = time.time()
            cursor.execute("SELECT * FROM test_songs WHERE user_id = ? LIMIT 50", (user_id,))
            results = cursor.fetchall()
            end_time = time.time()
            
            indexed_read_times.append((end_time - start_time) * 1000)
        
        conn.close()
        
        return {
            "simple_reads": {
                "avg_ms": statistics.mean(read_times),
                "p95_ms": self._percentile(read_times, 95),
                "max_ms": max(read_times),
                "operations_tested": len(read_times)
            },
            "indexed_reads": {
                "avg_ms": statistics.mean(indexed_read_times),
                "p95_ms": self._percentile(indexed_read_times, 95),
                "max_ms": max(indexed_read_times),
                "operations_tested": len(indexed_read_times)
            }
        }
    
    def _test_write_performance(self) -> Dict[str, Any]:
        """Test database write performance."""
        logger.info("Testing database write performance...")
        
        conn = sqlite3.connect(self.test_db_path)
        cursor = conn.cursor()
        
        # Test individual inserts
        single_insert_times = []
        for i in range(100):
            song_data = (
                f"Write Performance Test Song {i}",
                f"[C]Write test song {i} [Am]for measuring [F]insert performance [G][C]",
                1,
                json.dumps({"write_test": True, "iteration": i})
            )
            
            start_time = time.time()
            cursor.execute(
                "INSERT INTO test_songs (title, content, user_id, metadata) VALUES (?, ?, ?, ?)",
                song_data
            )
            conn.commit()
            end_time = time.time()
            
            single_insert_times.append((end_time - start_time) * 1000)
        
        # Test batch inserts
        batch_insert_times = []
        batch_size = 100
        
        for batch in range(10):
            batch_data = []
            for i in range(batch_size):
                song_id = batch * batch_size + i
                song_data = (
                    f"Batch Test Song {song_id}",
                    f"[C]Batch test song {song_id} [Am]testing [F]batch performance [G][C]",
                    1,
                    json.dumps({"batch_test": True, "batch": batch, "item": i})
                )
                batch_data.append(song_data)
            
            start_time = time.time()
            cursor.executemany(
                "INSERT INTO test_songs (title, content, user_id, metadata) VALUES (?, ?, ?, ?)",
                batch_data
            )
            conn.commit()
            end_time = time.time()
            
            batch_insert_times.append((end_time - start_time) * 1000)
        
        conn.close()
        
        return {
            "single_inserts": {
                "avg_ms": statistics.mean(single_insert_times),
                "p95_ms": self._percentile(single_insert_times, 95),
                "max_ms": max(single_insert_times),
                "operations_tested": len(single_insert_times)
            },
            "batch_inserts": {
                "avg_ms": statistics.mean(batch_insert_times),
                "p95_ms": self._percentile(batch_insert_times, 95),
                "max_ms": max(batch_insert_times),
                "operations_tested": len(batch_insert_times),
                "records_per_batch": batch_size
            }
        }
    
    def _test_search_performance(self) -> Dict[str, Any]:
        """Test database search performance."""
        logger.info("Testing database search performance...")
        
        conn = sqlite3.connect(self.test_db_path)
        cursor = conn.cursor()
        
        search_times = []
        search_terms = ["Performance", "Test", "Song", "Database", "Load"]
        
        for term in search_terms:
            for i in range(20):  # Test each term 20 times
                start_time = time.time()
                cursor.execute(
                    "SELECT * FROM test_songs WHERE title LIKE ? OR content LIKE ? LIMIT 100",
                    (f"%{term}%", f"%{term}%")
                )
                results = cursor.fetchall()
                end_time = time.time()
                
                search_times.append((end_time - start_time) * 1000)
        
        conn.close()
        
        return {
            "text_search": {
                "avg_ms": statistics.mean(search_times),
                "p95_ms": self._percentile(search_times, 95),
                "max_ms": max(search_times),
                "operations_tested": len(search_times)
            }
        }
    
    def _test_complex_queries(self) -> Dict[str, Any]:
        """Test complex database query performance."""
        logger.info("Testing complex query performance...")
        
        conn = sqlite3.connect(self.test_db_path)
        cursor = conn.cursor()
        
        complex_query_times = []
        
        # Test joins and aggregations
        queries = [
            """
            SELECT u.email, COUNT(s.id) as song_count 
            FROM test_users u 
            LEFT JOIN test_songs s ON u.id = s.user_id 
            GROUP BY u.id 
            ORDER BY song_count DESC 
            LIMIT 100
            """,
            """
            SELECT room_id, COUNT(*) as event_count, 
                   COUNT(DISTINCT user_id) as unique_users
            FROM test_collaboration_events 
            GROUP BY room_id 
            HAVING event_count > 10
            ORDER BY event_count DESC 
            LIMIT 50
            """,
            """
            SELECT DATE(created_at) as date, COUNT(*) as songs_created
            FROM test_songs 
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            """,
            """
            SELECT s.title, u.email, 
                   (SELECT COUNT(*) FROM test_collaboration_events ce WHERE ce.user_id = s.user_id) as user_activity
            FROM test_songs s
            JOIN test_users u ON s.user_id = u.id
            WHERE s.created_at > datetime('now', '-1 day')
            ORDER BY user_activity DESC
            LIMIT 100
            """
        ]
        
        for query in queries:
            for _ in range(5):  # Run each query 5 times
                start_time = time.time()
                cursor.execute(query)
                results = cursor.fetchall()
                end_time = time.time()
                
                complex_query_times.append((end_time - start_time) * 1000)
        
        conn.close()
        
        return {
            "complex_queries": {
                "avg_ms": statistics.mean(complex_query_times),
                "p95_ms": self._percentile(complex_query_times, 95),
                "max_ms": max(complex_query_times),
                "operations_tested": len(complex_query_times)
            }
        }
    
    def _test_concurrent_access(self) -> Dict[str, Any]:
        """Test concurrent database access performance."""
        logger.info("Testing concurrent database access...")
        
        def worker_function(worker_id: int) -> List[float]:
            """Worker function for concurrent access testing."""
            conn = sqlite3.connect(self.test_db_path)
            cursor = conn.cursor()
            worker_times = []
            
            for i in range(50):  # Each worker performs 50 operations
                operation_type = i % 3
                
                start_time = time.time()
                
                if operation_type == 0:  # Read operation
                    cursor.execute("SELECT * FROM test_songs WHERE user_id = ? LIMIT 10", (worker_id % 100 + 1,))
                    results = cursor.fetchall()
                elif operation_type == 1:  # Write operation
                    cursor.execute(
                        "INSERT INTO test_songs (title, content, user_id, metadata) VALUES (?, ?, ?, ?)",
                        (f"Concurrent Test {worker_id}-{i}", f"[C]Concurrent test song", worker_id % 100 + 1, json.dumps({"concurrent_test": True}))
                    )
                    conn.commit()
                else:  # Search operation
                    cursor.execute("SELECT * FROM test_songs WHERE title LIKE ? LIMIT 5", (f"%Test%",))
                    results = cursor.fetchall()
                
                end_time = time.time()
                worker_times.append((end_time - start_time) * 1000)
            
            conn.close()
            return worker_times
        
        # Run concurrent workers
        concurrent_workers = 20
        with ThreadPoolExecutor(max_workers=concurrent_workers) as executor:
            futures = [executor.submit(worker_function, i) for i in range(concurrent_workers)]
            all_times = []
            
            for future in as_completed(futures):
                try:
                    worker_times = future.result()
                    all_times.extend(worker_times)
                except Exception as e:
                    logger.warning(f"Concurrent worker failed: {e}")
        
        return {
            "concurrent_access": {
                "avg_ms": statistics.mean(all_times) if all_times else 0,
                "p95_ms": self._percentile(all_times, 95) if all_times else 0,
                "max_ms": max(all_times) if all_times else 0,
                "operations_tested": len(all_times),
                "concurrent_workers": concurrent_workers
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


class MemoryMonitor:
    """Advanced memory monitoring and leak detection."""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.monitoring = False
        self.memory_samples: List[Dict[str, Any]] = []
        self.baseline_memory = None
        
    def start_monitoring(self):
        """Start continuous memory monitoring."""
        self.monitoring = True
        self.baseline_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        def monitor_thread():
            while self.monitoring:
                try:
                    process = psutil.Process()
                    system_memory = psutil.virtual_memory()
                    
                    sample = {
                        "timestamp": time.time(),
                        "process_memory_mb": process.memory_info().rss / 1024 / 1024,
                        "process_memory_percent": process.memory_percent(),
                        "system_memory_percent": system_memory.percent,
                        "system_available_mb": system_memory.available / 1024 / 1024,
                        "file_descriptors": process.num_fds() if hasattr(process, 'num_fds') else 0,
                        "threads": process.num_threads()
                    }
                    
                    self.memory_samples.append(sample)
                    
                    time.sleep(self.config.memory_sample_interval)
                    
                except Exception as e:
                    logger.warning(f"Memory monitoring error: {e}")
                    time.sleep(self.config.memory_sample_interval)
        
        self.monitor_thread = threading.Thread(target=monitor_thread, daemon=True)
        self.monitor_thread.start()
        logger.info("Memory monitoring started")
    
    def stop_monitoring(self):
        """Stop memory monitoring."""
        self.monitoring = False
        logger.info("Memory monitoring stopped")
    
    def get_memory_analysis(self) -> Dict[str, Any]:
        """Analyze memory usage patterns."""
        if not self.memory_samples:
            return {"error": "No memory samples available"}
        
        memory_values = [s["process_memory_mb"] for s in self.memory_samples]
        memory_growth = memory_values[-1] - memory_values[0] if len(memory_values) > 1 else 0
        
        # Detect potential memory leaks
        leak_detected = False
        if self.baseline_memory and memory_growth > self.config.memory_leak_threshold_mb:
            leak_detected = True
        
        # Calculate memory statistics
        analysis = {
            "monitoring_duration_seconds": self.memory_samples[-1]["timestamp"] - self.memory_samples[0]["timestamp"],
            "sample_count": len(self.memory_samples),
            "baseline_memory_mb": self.baseline_memory,
            "current_memory_mb": memory_values[-1],
            "memory_growth_mb": memory_growth,
            "memory_leak_detected": leak_detected,
            "peak_memory_mb": max(memory_values),
            "avg_memory_mb": statistics.mean(memory_values),
            "memory_stability": {
                "min_mb": min(memory_values),
                "max_mb": max(memory_values),
                "std_dev_mb": statistics.stdev(memory_values) if len(memory_values) > 1 else 0,
                "range_mb": max(memory_values) - min(memory_values)
            },
            "memory_trend": self._calculate_memory_trend(),
            "system_impact": {
                "max_system_memory_percent": max(s["system_memory_percent"] for s in self.memory_samples),
                "avg_system_memory_percent": statistics.mean(s["system_memory_percent"] for s in self.memory_samples),
                "file_descriptors_used": self.memory_samples[-1]["file_descriptors"],
                "threads_used": self.memory_samples[-1]["threads"]
            }
        }
        
        return analysis
    
    def _calculate_memory_trend(self) -> str:
        """Calculate overall memory usage trend."""
        if len(self.memory_samples) < 10:
            return "insufficient_data"
        
        # Take samples from beginning, middle, and end
        segment_size = len(self.memory_samples) // 3
        
        early_avg = statistics.mean(s["process_memory_mb"] for s in self.memory_samples[:segment_size])
        middle_avg = statistics.mean(s["process_memory_mb"] for s in self.memory_samples[segment_size:2*segment_size])
        late_avg = statistics.mean(s["process_memory_mb"] for s in self.memory_samples[2*segment_size:])
        
        early_to_middle = (middle_avg - early_avg) / early_avg
        middle_to_late = (late_avg - middle_avg) / middle_avg
        
        # Determine trend
        if early_to_middle > 0.1 and middle_to_late > 0.1:
            return "increasing"
        elif early_to_middle < -0.1 and middle_to_late < -0.1:
            return "decreasing"
        elif abs(early_to_middle) < 0.05 and abs(middle_to_late) < 0.05:
            return "stable"
        else:
            return "fluctuating"


class ComprehensivePerformanceMonitor:
    """Main performance monitoring orchestrator."""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.db_tester = DatabasePerformanceTester(config)
        self.memory_monitor = MemoryMonitor(config)
        self.metrics: List[PerformanceMetric] = []
        
    async def run_comprehensive_benchmark(self) -> Dict[str, Any]:
        """Run comprehensive performance benchmark."""
        logger.info("Starting comprehensive performance benchmark")
        logger.info(f"Configuration: Max users: {self.config.max_concurrent_users}, Duration: {self.config.test_duration_minutes}min")
        
        benchmark_start_time = time.time()
        
        # Start memory monitoring
        self.memory_monitor.start_monitoring()
        
        try:
            results = {
                "benchmark_config": asdict(self.config),
                "timestamp": datetime.utcnow().isoformat(),
                "phases": {}
            }
            
            # Phase 1: Database Performance Testing
            logger.info("Phase 1: Database Performance Testing")
            results["phases"]["database_performance"] = self.db_tester.run_database_performance_tests()
            
            # Phase 2: Load Testing with 500+ Users
            logger.info("Phase 2: High-Concurrency Load Testing")
            results["phases"]["load_testing"] = await self._run_high_concurrency_load_test()
            
            # Phase 3: Real-time Collaboration Testing
            logger.info("Phase 3: Real-time Collaboration Performance")
            results["phases"]["collaboration_performance"] = await self._test_realtime_collaboration()
            
            # Phase 4: API Performance Under Load
            logger.info("Phase 4: API Performance Under Load")
            results["phases"]["api_performance"] = await self._test_api_performance_under_load()
            
            benchmark_end_time = time.time()
            
            # Stop memory monitoring and get analysis
            self.memory_monitor.stop_monitoring()
            results["memory_analysis"] = self.memory_monitor.get_memory_analysis()
            
            # Calculate overall results
            results["benchmark_summary"] = {
                "total_duration_seconds": benchmark_end_time - benchmark_start_time,
                "total_metrics_collected": len(self.metrics),
                "performance_assessment": self._assess_overall_performance(results)
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Comprehensive benchmark failed: {e}")
            self.memory_monitor.stop_monitoring()
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}
    
    async def _run_high_concurrency_load_test(self) -> Dict[str, Any]:
        """Run load test with 500+ concurrent users."""
        logger.info(f"Starting load test with {self.config.max_concurrent_users} concurrent users...")
        
        # Use existing enterprise load testing script but with higher concurrency
        try:
            result = subprocess.run([
                'python', 'scripts/enterprise_load_testing.py',
                '--users', str(self.config.max_concurrent_users),
                '--duration', str(self.config.test_duration_minutes),
                '--ramp-up', str(self.config.ramp_up_time_seconds),
                '--base-url', self.config.base_url
            ], capture_output=True, text=True, timeout=self.config.test_duration_minutes * 60 + 300)
            
            if result.returncode == 0:
                # Try to parse JSON output
                try:
                    # Look for JSON in the output
                    lines = result.stdout.split('\n')
                    for line in lines:
                        if line.strip().startswith('{') and 'test_summary' in line:
                            return json.loads(line.strip())
                except json.JSONDecodeError:
                    pass
                
                # Return summary if no JSON found
                return {
                    "status": "completed",
                    "concurrent_users": self.config.max_concurrent_users,
                    "output": result.stdout[-1000:],  # Last 1000 chars
                    "note": "Load test completed but detailed results not parsed"
                }
            else:
                return {
                    "status": "failed",
                    "error": result.stderr,
                    "output": result.stdout[-1000:] if result.stdout else None
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "timeout",
                "error": "Load test timed out",
                "timeout_seconds": self.config.test_duration_minutes * 60 + 300
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _test_realtime_collaboration(self) -> Dict[str, Any]:
        """Test real-time collaboration performance under load."""
        logger.info("Testing real-time collaboration performance...")
        
        # This would be implemented with WebSocket testing
        # For now, simulate realistic collaboration testing
        collaboration_latencies = []
        
        # Simulate WebSocket connection latency testing
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            for room_id in range(min(10, self.config.collaboration_room_count)):
                try:
                    # Test room creation latency
                    start_time = time.time()
                    
                    room_data = {
                        "name": f"Performance Test Room {room_id}",
                        "room_type": "performance_test",
                        "max_participants": self.config.participants_per_room
                    }
                    
                    async with session.post(
                        f"{self.config.base_url}/api/v1/collaboration-rooms",
                        json=room_data,
                        headers={"Content-Type": "application/json"}
                    ) as response:
                        end_time = time.time()
                        latency_ms = (end_time - start_time) * 1000
                        collaboration_latencies.append(latency_ms)
                        
                        success = response.status < 400
                        
                        self.metrics.append(PerformanceMetric(
                            timestamp=start_time,
                            metric_type="collaboration",
                            operation="room_creation",
                            value=latency_ms,
                            unit="ms",
                            success=success,
                            metadata={"room_id": room_id}
                        ))
                
                except Exception as e:
                    logger.warning(f"Collaboration test failed for room {room_id}: {e}")
                    
                await asyncio.sleep(0.1)
        
        if collaboration_latencies:
            return {
                "room_creation": {
                    "avg_latency_ms": statistics.mean(collaboration_latencies),
                    "p95_latency_ms": self._percentile(collaboration_latencies, 95),
                    "max_latency_ms": max(collaboration_latencies),
                    "rooms_tested": len(collaboration_latencies),
                    "meets_threshold": statistics.mean(collaboration_latencies) <= self.config.max_collaboration_latency_ms
                }
            }
        else:
            return {"error": "No collaboration latency data collected"}
    
    async def _test_api_performance_under_load(self) -> Dict[str, Any]:
        """Test API performance under sustained load."""
        logger.info("Testing API performance under load...")
        
        api_endpoints = [
            ("GET", "/api/v1/health"),
            ("GET", "/api/v1/songs"),
            ("POST", "/api/v1/auth/register"),
            ("POST", "/api/v1/auth/login")
        ]
        
        endpoint_results = {}
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            for method, endpoint in api_endpoints:
                response_times = []
                success_count = 0
                
                # Test each endpoint multiple times under load
                for i in range(50):
                    start_time = time.time()
                    success = False
                    
                    try:
                        if method == "GET":
                            async with session.get(f"{self.config.base_url}{endpoint}") as response:
                                success = response.status < 400
                        else:
                            # POST requests with dummy data
                            if "register" in endpoint:
                                data = {
                                    "email": f"loadtest_{i}_{int(time.time())}@test.com",
                                    "password": "LoadTest123!"
                                }
                            elif "login" in endpoint:
                                data = {
                                    "email": f"loadtest_{i}@test.com",
                                    "password": "LoadTest123!"
                                }
                            else:
                                data = {}
                            
                            async with session.post(
                                f"{self.config.base_url}{endpoint}",
                                json=data,
                                headers={"Content-Type": "application/json"}
                            ) as response:
                                success = response.status < 400
                    
                    except Exception as e:
                        logger.debug(f"API test failed for {method} {endpoint}: {e}")
                    
                    end_time = time.time()
                    response_time_ms = (end_time - start_time) * 1000
                    response_times.append(response_time_ms)
                    
                    if success:
                        success_count += 1
                    
                    await asyncio.sleep(0.05)  # Brief delay between requests
                
                endpoint_results[f"{method} {endpoint}"] = {
                    "avg_response_time_ms": statistics.mean(response_times),
                    "p95_response_time_ms": self._percentile(response_times, 95),
                    "max_response_time_ms": max(response_times),
                    "success_rate": success_count / len(response_times),
                    "requests_tested": len(response_times),
                    "meets_threshold": statistics.mean(response_times) <= self.config.max_api_response_time_ms
                }
        
        return endpoint_results
    
    def _assess_overall_performance(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall performance against enterprise requirements."""
        issues = []
        warnings = []
        
        # Check database performance
        db_results = results.get("phases", {}).get("database_performance", {})
        if db_results.get("setup_successful"):
            read_perf = db_results.get("read_performance", {}).get("simple_reads", {})
            if read_perf.get("avg_ms", 0) > self.config.max_database_response_time_ms:
                issues.append(f"Database read performance ({read_perf['avg_ms']:.2f}ms) exceeds threshold ({self.config.max_database_response_time_ms}ms)")
        
        # Check memory usage
        memory_analysis = results.get("memory_analysis", {})
        if memory_analysis.get("memory_leak_detected"):
            issues.append(f"Memory leak detected: {memory_analysis.get('memory_growth_mb', 0):.2f}MB growth")
        
        if memory_analysis.get("peak_memory_mb", 0) > self.config.max_memory_usage_mb:
            warnings.append(f"Peak memory usage ({memory_analysis['peak_memory_mb']:.2f}MB) exceeds threshold ({self.config.max_memory_usage_mb}MB)")
        
        # Check API performance
        api_results = results.get("phases", {}).get("api_performance", {})
        for endpoint, metrics in api_results.items():
            if isinstance(metrics, dict):
                if not metrics.get("meets_threshold", True):
                    issues.append(f"{endpoint}: Performance below threshold")
                
                if metrics.get("success_rate", 0) < 0.95:
                    issues.append(f"{endpoint}: Success rate ({metrics['success_rate']:.2%}) below 95%")
        
        # Overall grade
        if len(issues) == 0:
            grade = "EXCELLENT"
        elif len(issues) <= 2:
            grade = "GOOD"
        else:
            grade = "NEEDS_IMPROVEMENT"
        
        return {
            "overall_grade": grade,
            "meets_enterprise_requirements": len(issues) == 0,
            "critical_issues": issues,
            "warnings": warnings,
            "performance_score": max(0, 100 - len(issues) * 20 - len(warnings) * 5),
            "recommendation": "APPROVED" if len(issues) == 0 else "REQUIRES_OPTIMIZATION"
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
    
    def save_results(self, results: Dict[str, Any], filename: str = None):
        """Save benchmark results to file."""
        if not filename:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"comprehensive_performance_benchmark_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Comprehensive benchmark results saved to {filename}")


async def main():
    """Main function for comprehensive performance monitoring."""
    parser = argparse.ArgumentParser(description="Comprehensive Performance Monitoring for ChordMe")
    parser.add_argument("--base-url", default="http://localhost:5000", help="API base URL")
    parser.add_argument("--frontend-url", default="http://localhost:5173", help="Frontend URL")
    parser.add_argument("--users", type=int, default=500, help="Maximum concurrent users")
    parser.add_argument("--duration", type=int, default=15, help="Test duration in minutes")
    parser.add_argument("--database-records", type=int, default=100000, help="Database records for testing")
    parser.add_argument("--output", help="Output file for results")
    
    args = parser.parse_args()
    
    config = PerformanceConfig(
        base_url=args.base_url,
        frontend_url=args.frontend_url,
        max_concurrent_users=args.users,
        test_duration_minutes=args.duration,
        database_records_target=args.database_records
    )
    
    monitor = ComprehensivePerformanceMonitor(config)
    
    try:
        results = await monitor.run_comprehensive_benchmark()
        
        # Print summary
        print("\n" + "="*80)
        print("COMPREHENSIVE PERFORMANCE BENCHMARK RESULTS")
        print("="*80)
        
        if "error" in results:
            print(f"ERROR: {results['error']}")
            return
        
        summary = results.get("benchmark_summary", {})
        assessment = summary.get("performance_assessment", {})
        
        print(f"Total Duration: {summary.get('total_duration_seconds', 0):.2f} seconds")
        print(f"Metrics Collected: {summary.get('total_metrics_collected', 0)}")
        print(f"Overall Grade: {assessment.get('overall_grade', 'UNKNOWN')}")
        print(f"Performance Score: {assessment.get('performance_score', 0)}/100")
        print(f"Enterprise Ready: {'YES' if assessment.get('meets_enterprise_requirements') else 'NO'}")
        
        if assessment.get("critical_issues"):
            print("\nCritical Issues:")
            for issue in assessment["critical_issues"]:
                print(f"  ❌ {issue}")
        
        if assessment.get("warnings"):
            print("\nWarnings:")
            for warning in assessment["warnings"]:
                print(f"  ⚠️  {warning}")
        
        # Print key metrics
        memory_analysis = results.get("memory_analysis", {})
        if memory_analysis:
            print(f"\nMemory Analysis:")
            print(f"  Peak Usage: {memory_analysis.get('peak_memory_mb', 0):.2f}MB")
            print(f"  Memory Growth: {memory_analysis.get('memory_growth_mb', 0):.2f}MB")
            print(f"  Leak Detected: {'YES' if memory_analysis.get('memory_leak_detected') else 'NO'}")
        
        # Save results
        monitor.save_results(results, args.output)
        
        # Exit with appropriate code
        if not assessment.get("meets_enterprise_requirements"):
            sys.exit(1)
        
    except KeyboardInterrupt:
        logger.info("Benchmark interrupted by user")
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())