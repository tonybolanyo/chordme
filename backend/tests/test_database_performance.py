"""
Tests for Database Performance Optimization Module

This module contains comprehensive tests for database performance monitoring,
indexing optimization, read replicas, and maintenance automation.
"""

import pytest
import time
import threading
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

from chordme.database_performance import (
    DatabasePerformanceManager, QueryMetrics, ConnectionPoolMetrics,
    query_timer, optimize_query_for_pagination, get_query_execution_plan
)
from chordme.database_indexing import (
    DatabaseIndexOptimizer, IndexRecommendation, IndexUsageStats
)
from chordme.read_replicas import (
    ReadReplicaManager, ReplicaConfig, ReplicaHealth
)
from chordme.database_maintenance import (
    DatabaseMaintenanceManager, MaintenanceTask, MaintenanceResult
)


class TestDatabasePerformanceManager:
    """Test database performance monitoring and management."""
    
    def test_query_metrics_creation(self):
        """Test creating query metrics objects."""
        metrics = QueryMetrics(
            query_hash="test_hash",
            sql="SELECT * FROM users",
            duration=0.123,
            timestamp=datetime.utcnow(),
            endpoint="/api/users",
            user_id=1
        )
        
        assert metrics.query_hash == "test_hash"
        assert metrics.sql == "SELECT * FROM users"
        assert metrics.duration == 0.123
        assert metrics.endpoint == "/api/users"
        assert metrics.user_id == 1
    
    def test_performance_manager_initialization(self, app):
        """Test performance manager initialization."""
        with app.app_context():
            manager = DatabasePerformanceManager()
            manager.init_app(app)
            
            assert manager.app == app
            assert manager.monitoring_enabled is True
            assert manager.slow_query_threshold == 1.0
            assert len(manager.query_metrics) == 0
    
    def test_query_normalization(self, app):
        """Test SQL query normalization for pattern matching."""
        with app.app_context():
            manager = DatabasePerformanceManager()
            
            # Test parameter normalization
            sql1 = "SELECT * FROM users WHERE id = 123"
            sql2 = "SELECT * FROM users WHERE id = 456"
            
            norm1 = manager._normalize_query(sql1)
            norm2 = manager._normalize_query(sql2)
            
            assert norm1 == norm2
            assert "?" in norm1
            assert "123" not in norm1
    
    def test_query_metrics_recording(self, app):
        """Test recording query metrics."""
        with app.app_context():
            manager = DatabasePerformanceManager()
            manager.init_app(app)
            
            # Record a fast query
            manager._record_query_metrics("SELECT 1", 0.01)
            assert len(manager.query_metrics) == 1
            assert len(manager.slow_queries) == 0
            
            # Record a slow query
            manager._record_query_metrics("SELECT * FROM large_table", 2.0)
            assert len(manager.query_metrics) == 2
            assert len(manager.slow_queries) == 1
    
    def test_query_statistics_aggregation(self, app):
        """Test query statistics aggregation."""
        with app.app_context():
            manager = DatabasePerformanceManager()
            manager.init_app(app)
            
            # Record multiple queries with same pattern
            for i in range(5):
                manager._record_query_metrics(f"SELECT * FROM users WHERE id = {i}", 0.1 + i * 0.01)
            
            stats = manager.get_query_statistics(10)
            
            assert len(stats) == 1  # Should be aggregated into one pattern
            assert stats[0]['count'] == 5
            assert stats[0]['avg_duration'] == pytest.approx(0.12, abs=0.01)
    
    def test_slow_query_alerting(self, app):
        """Test slow query alerting mechanism."""
        with app.app_context():
            manager = DatabasePerformanceManager()
            manager.init_app(app)
            manager.slow_query_threshold = 0.5
            
            with patch.object(manager, '_trigger_slow_query_alert') as mock_alert:
                # Record a slow query
                manager._record_query_metrics("SLOW QUERY", 1.0)
                
                mock_alert.assert_called_once()
    
    def test_connection_pool_monitoring(self, app):
        """Test connection pool status monitoring."""
        with app.app_context():
            manager = DatabasePerformanceManager()
            manager.init_app(app)
            
            with patch('chordme.database_performance.db.engine') as mock_engine:
                mock_pool = Mock()
                mock_pool.size.return_value = 20
                mock_pool.checkedin.return_value = 15
                mock_pool.checkedout.return_value = 5
                mock_pool.overflow.return_value = 0
                mock_pool.invalid.return_value = 0
                mock_engine.pool = mock_pool
                
                status = manager.get_connection_pool_status()
                
                assert status['pool_size'] == 20
                assert status['checked_in'] == 15
                assert status['checked_out'] == 5
    
    def test_query_pattern_analysis(self, app):
        """Test query pattern analysis for recommendations."""
        with app.app_context():
            manager = DatabasePerformanceManager()
            manager.init_app(app)
            
            # Simulate repeated slow queries
            for i in range(10):
                manager._record_query_metrics("SELECT * FROM slow_table", 2.0)
            
            analysis = manager.analyze_query_patterns()
            
            assert analysis['total_queries'] == 10
            assert analysis['slow_queries_count'] == 10
            assert len(analysis['recommendations']) > 0
    
    def test_query_timer_context_manager(self):
        """Test query timing context manager."""
        with query_timer("test_operation"):
            time.sleep(0.01)  # Simulate work
        
        # Should not raise any exceptions
    
    def test_pagination_optimization(self):
        """Test query pagination optimization."""
        mock_query = Mock()
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        # Test small offset
        result = optimize_query_for_pagination(mock_query, 1, 20)
        mock_query.offset.assert_called_with(0)
        mock_query.limit.assert_called_with(20)
        
        # Test large offset (should log warning)
        with patch('chordme.database_performance.logger') as mock_logger:
            optimize_query_for_pagination(mock_query, 1000, 20)
            mock_logger.warning.assert_called()


class TestDatabaseIndexOptimizer:
    """Test database indexing optimization."""
    
    def test_index_recommendation_creation(self):
        """Test creating index recommendations."""
        rec = IndexRecommendation(
            table_name="users",
            columns=["email"],
            index_type="btree",
            reasoning="Email lookups for authentication",
            estimated_benefit="high",
            sql_statement="CREATE INDEX idx_users_email ON users (email);"
        )
        
        assert rec.table_name == "users"
        assert rec.columns == ["email"]
        assert rec.estimated_benefit == "high"
    
    def test_index_optimizer_initialization(self, app):
        """Test index optimizer initialization."""
        with app.app_context():
            optimizer = DatabaseIndexOptimizer()
            optimizer.init_app(app)
            
            assert optimizer.app == app
            assert optimizer.cache_ttl == 3600
    
    def test_sqlite_index_analysis(self, app):
        """Test SQLite index analysis."""
        with app.app_context():
            optimizer = DatabaseIndexOptimizer()
            optimizer.init_app(app)
            
            with patch('chordme.database_indexing.db.engine') as mock_engine:
                mock_engine.name = 'sqlite'
                
                recommendations = optimizer._analyze_sqlite_indexes()
                
                # Should return recommendations for common patterns
                assert isinstance(recommendations, list)
    
    @pytest.mark.skipif(True, reason="Requires PostgreSQL setup")
    def test_postgresql_index_analysis(self, app):
        """Test PostgreSQL index analysis."""
        with app.app_context():
            optimizer = DatabaseIndexOptimizer()
            optimizer.init_app(app)
            
            # This would require actual PostgreSQL connection
            # In real tests, use pytest fixtures with test database
            pass
    
    def test_index_usage_stats(self, app):
        """Test index usage statistics collection."""
        with app.app_context():
            optimizer = DatabaseIndexOptimizer()
            optimizer.init_app(app)
            
            with patch('chordme.database_indexing.db.engine') as mock_engine:
                mock_engine.name = 'sqlite'
                
                stats = optimizer.get_index_usage_stats()
                assert isinstance(stats, list)
    
    def test_unused_index_detection(self, app):
        """Test detection of unused indexes."""
        with app.app_context():
            optimizer = DatabaseIndexOptimizer()
            optimizer.init_app(app)
            
            # Mock some index usage stats
            with patch.object(optimizer, 'get_index_usage_stats') as mock_stats:
                mock_stats.return_value = [
                    IndexUsageStats(
                        index_name='idx_unused',
                        table_name='test_table',
                        scans=0,
                        tuples_read=0,
                        tuples_fetched=0,
                        size_mb=10.0
                    ),
                    IndexUsageStats(
                        index_name='idx_used',
                        table_name='test_table',
                        scans=1000,
                        tuples_read=5000,
                        tuples_fetched=5000,
                        size_mb=5.0
                    )
                ]
                
                unused = optimizer.find_unused_indexes(min_scans=100)
                assert len(unused) == 1
                assert unused[0].index_name == 'idx_unused'
    
    def test_index_maintenance_plan(self, app):
        """Test comprehensive index maintenance plan generation."""
        with app.app_context():
            optimizer = DatabaseIndexOptimizer()
            optimizer.init_app(app)
            
            with patch.object(optimizer, 'analyze_missing_indexes') as mock_missing, \
                 patch.object(optimizer, 'find_unused_indexes') as mock_unused, \
                 patch.object(optimizer, 'get_index_usage_stats') as mock_stats:
                
                mock_missing.return_value = [
                    IndexRecommendation(
                        table_name="users",
                        columns=["email"],
                        index_type="btree",
                        reasoning="Authentication lookups",
                        estimated_benefit="high",
                        sql_statement="CREATE INDEX idx_users_email ON users (email);"
                    )
                ]
                mock_unused.return_value = []
                mock_stats.return_value = []
                
                plan = optimizer.generate_index_maintenance_plan()
                
                assert 'missing_indexes' in plan
                assert 'unused_indexes' in plan
                assert 'maintenance_actions' in plan
                assert len(plan['maintenance_actions']) > 0


class TestReadReplicaManager:
    """Test read replica configuration and management."""
    
    def test_replica_config_creation(self):
        """Test creating replica configuration."""
        config = ReplicaConfig(
            name="replica1",
            url="postgresql://replica:5432/db",
            weight=2,
            max_lag_seconds=30
        )
        
        assert config.name == "replica1"
        assert config.weight == 2
        assert config.enabled is True
    
    def test_replica_manager_initialization(self, app):
        """Test replica manager initialization."""
        with app.app_context():
            manager = ReadReplicaManager()
            manager.init_app(app)
            
            assert manager.app == app
            assert manager.load_balancing_strategy == 'weighted_random'
    
    def test_replica_addition(self, app):
        """Test adding read replicas."""
        with app.app_context():
            manager = ReadReplicaManager()
            manager.init_app(app)
            
            # Mock the engine creation and connection test
            with patch('chordme.read_replicas.create_engine') as mock_create, \
                 patch.object(manager, '_connection_counts', {}):
                
                mock_engine = Mock()
                mock_conn = Mock()
                mock_engine.connect.return_value.__enter__.return_value = mock_conn
                mock_create.return_value = mock_engine
                
                replica = ReplicaConfig(
                    name="test_replica",
                    url="postgresql://test:5432/db"
                )
                
                manager.add_replica(replica)
                
                assert "test_replica" in manager.replicas
                assert "test_replica" in manager.replica_engines
                assert "test_replica" in manager.replica_health
    
    def test_read_only_query_detection(self, app):
        """Test detection of read-only queries."""
        with app.app_context():
            manager = ReadReplicaManager()
            manager.init_app(app)
            
            # Test various query types
            assert manager._is_read_only_query("SELECT * FROM users") is True
            assert manager._is_read_only_query("INSERT INTO users VALUES (1)") is False
            assert manager._is_read_only_query("UPDATE users SET name = 'test'") is False
            assert manager._is_read_only_query("DELETE FROM users") is False
            assert manager._is_read_only_query("EXPLAIN SELECT * FROM users") is True
    
    def test_replica_selection_strategies(self, app):
        """Test different replica selection strategies."""
        with app.app_context():
            manager = ReadReplicaManager()
            manager.init_app(app)
            
            # Setup test replicas
            replicas = ['replica1', 'replica2', 'replica3']
            for name in replicas:
                manager.replica_health[name] = ReplicaHealth(
                    name=name,
                    is_healthy=True,
                    last_check=datetime.utcnow(),
                    response_time_ms=10.0
                )
                manager.replicas[name] = ReplicaConfig(name=name, url="test", weight=1)
            
            # Test round-robin
            manager.load_balancing_strategy = 'round_robin'
            selections = [manager._round_robin_selection(replicas) for _ in range(6)]
            assert len(set(selections)) == 3  # Should cycle through all replicas
            
            # Test weighted random
            manager.load_balancing_strategy = 'weighted_random'
            selection = manager._weighted_random_selection(replicas)
            assert selection in replicas
    
    def test_replica_health_check(self, app):
        """Test replica health checking."""
        with app.app_context():
            manager = ReadReplicaManager()
            manager.init_app(app)
            
            # Add a test replica
            replica = ReplicaConfig(name="test", url="test://db")
            manager.replicas["test"] = replica
            
            # Mock engine and connection
            mock_engine = Mock()
            mock_conn = Mock()
            mock_engine.connect.return_value.__enter__.return_value = mock_conn
            mock_engine.url = "postgresql://test"
            manager.replica_engines["test"] = mock_engine
            
            health = manager.check_replica_health("test")
            
            assert health.name == "test"
            assert isinstance(health.is_healthy, bool)
            assert health.response_time_ms >= 0


class TestDatabaseMaintenanceManager:
    """Test database maintenance automation."""
    
    def test_maintenance_task_creation(self):
        """Test creating maintenance tasks."""
        task = MaintenanceTask(
            name="test_task",
            description="Test maintenance task",
            frequency_hours=24,
            enabled=True
        )
        
        assert task.name == "test_task"
        assert task.frequency_hours == 24
        assert task.enabled is True
    
    def test_maintenance_manager_initialization(self, app):
        """Test maintenance manager initialization."""
        with app.app_context():
            manager = DatabaseMaintenanceManager()
            manager.init_app(app)
            
            assert manager.app == app
            assert manager.maintenance_enabled is True
            assert len(manager.tasks) > 0  # Should have default tasks
    
    def test_task_registration(self, app):
        """Test registering maintenance tasks."""
        with app.app_context():
            manager = DatabaseMaintenanceManager()
            manager.init_app(app)
            
            def test_function():
                return {'test': 'result'}
            
            task = MaintenanceTask(
                name="custom_task",
                description="Custom test task",
                frequency_hours=12,
                task_function=test_function
            )
            
            manager.register_task(task)
            
            assert "custom_task" in manager.tasks
            assert manager.tasks["custom_task"].task_function == test_function
    
    def test_task_execution(self, app):
        """Test executing maintenance tasks."""
        with app.app_context():
            manager = DatabaseMaintenanceManager()
            manager.init_app(app)
            
            # Create a test task
            execution_count = 0
            
            def test_task():
                nonlocal execution_count
                execution_count += 1
                return {'executed': True, 'count': execution_count}
            
            task = MaintenanceTask(
                name="test_execution",
                description="Test task execution",
                frequency_hours=1,
                task_function=test_task
            )
            
            manager.register_task(task)
            
            # Execute the task
            result = manager.run_task_now("test_execution")
            
            assert result.success is True
            assert execution_count == 1
            assert result.task_name == "test_execution"
    
    def test_task_scheduling(self, app):
        """Test task scheduling logic."""
        with app.app_context():
            manager = DatabaseMaintenanceManager()
            manager.init_app(app)
            
            # Create a task that should run immediately
            task = MaintenanceTask(
                name="immediate_task",
                description="Should run immediately",
                frequency_hours=1,
                task_function=lambda: {'ran': True}
            )
            
            # Set next run to past
            task.next_run = datetime.utcnow() - timedelta(minutes=1)
            manager.register_task(task)
            
            # Simulate scheduler check
            current_time = datetime.utcnow()
            should_run = task.next_run and current_time >= task.next_run
            
            assert should_run is True
    
    def test_maintenance_statistics_update(self, app):
        """Test the statistics update maintenance task."""
        with app.app_context():
            manager = DatabaseMaintenanceManager()
            manager.init_app(app)
            
            with patch('chordme.database_maintenance.db.engine') as mock_engine:
                mock_conn = Mock()
                mock_engine.connect.return_value.__enter__.return_value = mock_conn
                mock_engine.name = 'sqlite'
                
                result = manager._update_statistics()
                
                assert 'tables_updated' in result
                mock_conn.execute.assert_called()
    
    def test_index_maintenance_task(self, app):
        """Test the index maintenance task."""
        with app.app_context():
            manager = DatabaseMaintenanceManager()
            manager.init_app(app)
            
            with patch('chordme.database_maintenance.db_index_optimizer') as mock_optimizer:
                mock_optimizer.analyze_missing_indexes.return_value = []
                mock_optimizer.find_unused_indexes.return_value = []
                
                result = manager._maintain_indexes()
                
                assert 'recommendations' in result
                assert 'high_priority_created' in result
    
    def test_data_cleanup_task(self, app):
        """Test the data cleanup maintenance task."""
        with app.app_context():
            manager = DatabaseMaintenanceManager()
            manager.init_app(app)
            
            with patch('chordme.database_maintenance.db.engine') as mock_engine, \
                 patch('chordme.database_maintenance.inspect') as mock_inspect:
                
                mock_conn = Mock()
                mock_engine.connect.return_value.__enter__.return_value = mock_conn
                mock_inspector = Mock()
                mock_inspector.get_table_names.return_value = ['sessions', 'songs']
                mock_inspect.return_value = mock_inspector
                
                # Mock query results
                mock_result = Mock()
                mock_result.rowcount = 5
                mock_conn.execute.return_value = mock_result
                
                result = manager._cleanup_old_data()
                
                assert 'deleted_sessions' in result
                assert 'cleaned_temp_data' in result


@pytest.fixture
def app():
    """Create a test Flask application."""
    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy
    
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['DB_MONITORING_ENABLED'] = True
    app.config['DB_MAINTENANCE_ENABLED'] = True
    app.config['SLOW_QUERY_THRESHOLD'] = 1.0
    
    return app


class TestDatabasePerformanceIntegration:
    """Integration tests for database performance features."""
    
    def test_full_performance_monitoring_flow(self, app):
        """Test complete performance monitoring workflow."""
        with app.app_context():
            from chordme.database_performance import db_performance
            from chordme.database_indexing import db_index_optimizer
            
            # Initialize managers
            db_performance.init_app(app)
            db_index_optimizer.init_app(app)
            
            # Simulate some queries
            db_performance._record_query_metrics("SELECT * FROM users", 0.05)
            db_performance._record_query_metrics("SELECT * FROM songs WHERE user_id = 1", 0.12)
            db_performance._record_query_metrics("SELECT COUNT(*) FROM songs", 1.5)  # Slow query
            
            # Get statistics
            stats = db_performance.get_query_statistics(10)
            slow_queries = db_performance.get_slow_queries(5)
            analysis = db_performance.analyze_query_patterns()
            
            assert len(stats) <= 3
            assert len(slow_queries) == 1
            assert analysis['total_queries'] == 3
            assert analysis['slow_queries_count'] == 1
    
    def test_maintenance_and_optimization_integration(self, app):
        """Test integration between maintenance and optimization modules."""
        with app.app_context():
            from chordme.database_maintenance import db_maintenance_manager
            from chordme.database_indexing import db_index_optimizer
            
            # Initialize managers
            db_maintenance_manager.init_app(app)
            db_index_optimizer.init_app(app)
            
            # Test that maintenance tasks can access optimization features
            with patch.object(db_index_optimizer, 'analyze_missing_indexes') as mock_analyze:
                mock_analyze.return_value = []
                
                result = db_maintenance_manager._maintain_indexes()
                
                assert 'recommendations' in result
                mock_analyze.assert_called_once()


if __name__ == '__main__':
    pytest.main([__file__])