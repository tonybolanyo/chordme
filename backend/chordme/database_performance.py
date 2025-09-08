"""
Database Performance Optimization Module

This module provides comprehensive database performance optimization including:
- Connection pooling management
- Query performance monitoring
- Slow query detection and alerting
- Database maintenance automation
- Read replica configuration
"""

import logging
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from contextlib import contextmanager
from dataclasses import dataclass, field
from collections import defaultdict, deque
import json
import os

from sqlalchemy import event, create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool, StaticPool
from flask import current_app, g
from . import db

logger = logging.getLogger(__name__)


@dataclass
class QueryMetrics:
    """Represents metrics for a database query."""
    query_hash: str
    sql: str
    duration: float
    timestamp: datetime
    endpoint: Optional[str] = None
    user_id: Optional[int] = None
    rows_returned: Optional[int] = None
    execution_plan: Optional[str] = None


@dataclass
class ConnectionPoolMetrics:
    """Represents connection pool metrics."""
    pool_size: int
    checked_in: int
    checked_out: int
    overflow: int
    invalid: int
    timestamp: datetime


class DatabasePerformanceManager:
    """Manages database performance optimization and monitoring."""
    
    def __init__(self, app=None):
        self.app = app
        self.query_metrics = deque(maxlen=10000)  # Store last 10k queries
        self.slow_queries = deque(maxlen=1000)    # Store last 1k slow queries
        self.pool_metrics = deque(maxlen=1000)    # Store last 1k pool metrics
        self.query_stats = defaultdict(list)      # Aggregate query statistics
        self.slow_query_threshold = 1.0           # 1 second default threshold
        self.monitoring_enabled = True
        self.alerts_enabled = True
        self._lock = threading.RLock()
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the performance manager with Flask app."""
        self.app = app
        
        # Configure connection pooling
        self._configure_connection_pool(app)
        
        # Set up query monitoring
        self._setup_query_monitoring()
        
        # Configure from app config
        self.slow_query_threshold = app.config.get('SLOW_QUERY_THRESHOLD', 1.0)
        self.monitoring_enabled = app.config.get('DB_MONITORING_ENABLED', True)
        self.alerts_enabled = app.config.get('DB_ALERTS_ENABLED', True)
        
        # Register CLI commands
        self._register_cli_commands(app)
        
        logger.info("Database performance manager initialized")
    
    def _configure_connection_pool(self, app):
        """Configure SQLAlchemy connection pooling for optimal performance."""
        # Get database URL
        database_url = app.config.get('SQLALCHEMY_DATABASE_URI')
        
        if not database_url:
            logger.warning("No database URL configured")
            return
        
        # Connection pool configuration
        pool_config = {
            'poolclass': QueuePool,
            'pool_size': app.config.get('DB_POOL_SIZE', 20),
            'max_overflow': app.config.get('DB_POOL_MAX_OVERFLOW', 30),
            'pool_timeout': app.config.get('DB_POOL_TIMEOUT', 30),
            'pool_recycle': app.config.get('DB_POOL_RECYCLE', 3600),  # 1 hour
            'pool_pre_ping': app.config.get('DB_POOL_PRE_PING', True),
        }
        
        # Use StaticPool for SQLite (single connection)
        if 'sqlite' in database_url:
            pool_config['poolclass'] = StaticPool
            pool_config['pool_size'] = 1
            pool_config['max_overflow'] = 0
        
        # Apply pool configuration to SQLAlchemy
        app.config.update({
            'SQLALCHEMY_ENGINE_OPTIONS': pool_config
        })
        
        logger.info(f"Database connection pool configured: {pool_config}")
    
    def _setup_query_monitoring(self):
        """Set up SQLAlchemy event listeners for query monitoring."""
        
        @event.listens_for(Engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Record query start time."""
            if self.monitoring_enabled:
                context._query_start_time = time.time()
        
        @event.listens_for(Engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Record query execution metrics."""
            if not self.monitoring_enabled:
                return
            
            start_time = getattr(context, '_query_start_time', None)
            if start_time is None:
                return
            
            duration = time.time() - start_time
            self._record_query_metrics(statement, duration, cursor.rowcount)
    
    def _record_query_metrics(self, sql: str, duration: float, rows_returned: Optional[int] = None):
        """Record metrics for a database query."""
        try:
            with self._lock:
                # Create query hash for aggregation
                query_hash = str(hash(self._normalize_query(sql)))
                
                # Get current context information
                endpoint = getattr(g, 'endpoint', None) if hasattr(g, 'endpoint') else None
                user_id = getattr(g, 'user_id', None) if hasattr(g, 'user_id') else None
                
                # Create metrics object
                metrics = QueryMetrics(
                    query_hash=query_hash,
                    sql=sql,
                    duration=duration,
                    timestamp=datetime.utcnow(),
                    endpoint=endpoint,
                    user_id=user_id,
                    rows_returned=rows_returned
                )
                
                # Store metrics
                self.query_metrics.append(metrics)
                self.query_stats[query_hash].append(duration)
                
                # Check for slow queries
                if duration >= self.slow_query_threshold:
                    self.slow_queries.append(metrics)
                    if self.alerts_enabled:
                        self._trigger_slow_query_alert(metrics)
                
        except Exception as e:
            logger.error(f"Error recording query metrics: {e}")
    
    def _normalize_query(self, sql: str) -> str:
        """Normalize SQL query for pattern matching."""
        # Remove parameters and normalize whitespace
        import re
        # Remove string literals and numbers
        normalized = re.sub(r"'[^']*'", "'?'", sql)
        normalized = re.sub(r'\b\d+\b', '?', normalized)
        # Normalize whitespace
        normalized = re.sub(r'\s+', ' ', normalized.strip())
        return normalized.lower()
    
    def _trigger_slow_query_alert(self, metrics: QueryMetrics):
        """Trigger alert for slow query."""
        logger.warning(
            f"Slow query detected: {metrics.duration:.3f}s - "
            f"Endpoint: {metrics.endpoint} - "
            f"SQL: {metrics.sql[:200]}..."
        )
        
        # Additional alerting logic can be added here
        # (e.g., send to monitoring system, email, Slack, etc.)
    
    def get_query_statistics(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get aggregated query statistics."""
        with self._lock:
            stats = []
            for query_hash, durations in self.query_stats.items():
                if not durations:
                    continue
                
                # Find the most recent query for this hash
                recent_query = None
                for metrics in reversed(self.query_metrics):
                    if metrics.query_hash == query_hash:
                        recent_query = metrics
                        break
                
                if recent_query:
                    stats.append({
                        'query_hash': query_hash,
                        'sql': recent_query.sql,
                        'count': len(durations),
                        'avg_duration': sum(durations) / len(durations),
                        'min_duration': min(durations),
                        'max_duration': max(durations),
                        'total_duration': sum(durations),
                        'last_executed': recent_query.timestamp.isoformat()
                    })
            
            # Sort by total duration (most expensive queries first)
            stats.sort(key=lambda x: x['total_duration'], reverse=True)
            return stats[:limit]
    
    def get_slow_queries(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent slow queries."""
        with self._lock:
            slow_queries = []
            for metrics in list(self.slow_queries)[-limit:]:
                slow_queries.append({
                    'sql': metrics.sql,
                    'duration': metrics.duration,
                    'timestamp': metrics.timestamp.isoformat(),
                    'endpoint': metrics.endpoint,
                    'user_id': metrics.user_id,
                    'rows_returned': metrics.rows_returned
                })
            
            return list(reversed(slow_queries))  # Most recent first
    
    def get_connection_pool_status(self) -> Dict[str, Any]:
        """Get current connection pool status."""
        try:
            engine = db.engine
            pool = engine.pool
            
            status = {
                'pool_size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'invalid': pool.invalid(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Record metrics
            with self._lock:
                pool_metrics = ConnectionPoolMetrics(
                    pool_size=status['pool_size'],
                    checked_in=status['checked_in'],
                    checked_out=status['checked_out'],
                    overflow=status['overflow'],
                    invalid=status['invalid'],
                    timestamp=datetime.utcnow()
                )
                self.pool_metrics.append(pool_metrics)
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting connection pool status: {e}")
            return {'error': str(e)}
    
    def analyze_query_patterns(self) -> Dict[str, Any]:
        """Analyze query patterns for optimization recommendations."""
        with self._lock:
            analysis = {
                'total_queries': len(self.query_metrics),
                'unique_queries': len(self.query_stats),
                'slow_queries_count': len(self.slow_queries),
                'avg_query_time': 0,
                'recommendations': []
            }
            
            if self.query_metrics:
                total_time = sum(m.duration for m in self.query_metrics)
                analysis['avg_query_time'] = total_time / len(self.query_metrics)
            
            # Identify most frequent slow queries
            slow_query_patterns = defaultdict(int)
            for metrics in self.slow_queries:
                slow_query_patterns[metrics.query_hash] += 1
            
            # Generate recommendations
            for query_hash, count in slow_query_patterns.items():
                if count >= 5:  # Frequently slow query
                    analysis['recommendations'].append({
                        'type': 'frequent_slow_query',
                        'query_hash': query_hash,
                        'count': count,
                        'suggestion': 'Consider adding indexes or optimizing this query'
                    })
            
            # Check for N+1 query patterns
            if analysis['unique_queries'] > analysis['total_queries'] * 0.8:
                analysis['recommendations'].append({
                    'type': 'possible_n_plus_one',
                    'suggestion': 'High ratio of unique queries suggests possible N+1 query patterns'
                })
            
            return analysis
    
    def clear_metrics(self):
        """Clear all collected metrics."""
        with self._lock:
            self.query_metrics.clear()
            self.slow_queries.clear()
            self.pool_metrics.clear()
            self.query_stats.clear()
        
        logger.info("Database performance metrics cleared")
    
    def _register_cli_commands(self, app):
        """Register CLI commands for database performance management."""
        @app.cli.command()
        def db_performance_stats():
            """Show database performance statistics."""
            stats = self.get_query_statistics(10)
            slow_queries = self.get_slow_queries(5)
            pool_status = self.get_connection_pool_status()
            analysis = self.analyze_query_patterns()
            
            print("\n=== Database Performance Statistics ===")
            print(f"Total queries: {analysis['total_queries']}")
            print(f"Unique queries: {analysis['unique_queries']}")
            print(f"Slow queries: {analysis['slow_queries_count']}")
            print(f"Average query time: {analysis['avg_query_time']:.3f}s")
            
            print("\n=== Top Expensive Queries ===")
            for i, stat in enumerate(stats, 1):
                print(f"{i}. {stat['sql'][:80]}...")
                print(f"   Count: {stat['count']}, Avg: {stat['avg_duration']:.3f}s, "
                      f"Max: {stat['max_duration']:.3f}s")
            
            print("\n=== Recent Slow Queries ===")
            for i, query in enumerate(slow_queries, 1):
                print(f"{i}. {query['duration']:.3f}s - {query['sql'][:80]}...")
            
            print("\n=== Connection Pool Status ===")
            for key, value in pool_status.items():
                if key != 'timestamp':
                    print(f"{key}: {value}")
            
            print("\n=== Recommendations ===")
            for rec in analysis['recommendations']:
                print(f"- {rec['suggestion']}")


# Global instance
db_performance = DatabasePerformanceManager()


@contextmanager
def query_timer(operation_name: str):
    """Context manager for timing database operations."""
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        if duration > db_performance.slow_query_threshold:
            logger.warning(f"Slow operation '{operation_name}': {duration:.3f}s")


def optimize_query_for_pagination(query, page: int, per_page: int):
    """Optimize query for efficient pagination."""
    # Use offset/limit for small offsets, cursor-based for large offsets
    offset = (page - 1) * per_page
    
    if offset > 10000:  # Large offset, suggest cursor-based pagination
        logger.warning(f"Large offset pagination ({offset}). Consider cursor-based pagination.")
    
    return query.offset(offset).limit(per_page)


def get_query_execution_plan(sql: str) -> Optional[str]:
    """Get query execution plan for analysis."""
    try:
        with db.engine.connect() as conn:
            # PostgreSQL
            if 'postgresql' in str(db.engine.url):
                result = conn.execute(text(f"EXPLAIN ANALYZE {sql}"))
                return '\n'.join([row[0] for row in result])
            
            # SQLite
            elif 'sqlite' in str(db.engine.url):
                result = conn.execute(text(f"EXPLAIN QUERY PLAN {sql}"))
                return '\n'.join([str(row) for row in result])
    
    except Exception as e:
        logger.error(f"Error getting execution plan: {e}")
        return None