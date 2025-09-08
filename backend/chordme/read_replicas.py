"""
Database Read Replica Configuration Module

This module provides read replica configuration and management for scaling database reads.
"""

import logging
import random
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from contextlib import contextmanager
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool
from flask import current_app, g
from . import db

logger = logging.getLogger(__name__)


@dataclass
class ReplicaConfig:
    """Configuration for a read replica."""
    name: str
    url: str
    weight: int = 1  # Higher weight = more traffic
    max_lag_seconds: int = 30  # Maximum acceptable replication lag
    health_check_interval: int = 60  # Health check interval in seconds
    enabled: bool = True


@dataclass
class ReplicaHealth:
    """Health status of a read replica."""
    name: str
    is_healthy: bool
    last_check: datetime
    response_time_ms: float
    replication_lag_seconds: Optional[float] = None
    error_message: Optional[str] = None


class ReadReplicaManager:
    """Manages read replica configuration and load balancing."""
    
    def __init__(self, app=None):
        self.app = app
        self.replicas = {}  # Dict[str, ReplicaConfig]
        self.replica_engines = {}  # Dict[str, Engine]
        self.replica_health = {}  # Dict[str, ReplicaHealth]
        self.read_only_operations = set()
        self.health_check_enabled = True
        self.load_balancing_strategy = 'weighted_random'  # 'round_robin', 'weighted_random', 'least_connections'
        self._current_replica_index = 0
        self._connection_counts = {}
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the read replica manager with Flask app."""
        self.app = app
        
        # Load replica configuration from app config
        self._load_replica_config(app)
        
        # Set up read-only operation detection
        self._setup_read_operation_detection()
        
        # Configure health checking
        self.health_check_enabled = app.config.get('REPLICA_HEALTH_CHECK_ENABLED', True)
        
        # Set load balancing strategy
        self.load_balancing_strategy = app.config.get('REPLICA_LOAD_BALANCING', 'weighted_random')
        
        # Register CLI commands
        self._register_cli_commands(app)
        
        logger.info(f"Read replica manager initialized with {len(self.replicas)} replicas")
    
    def _load_replica_config(self, app):
        """Load read replica configuration from app config."""
        replica_configs = app.config.get('READ_REPLICAS', [])
        
        for config in replica_configs:
            if isinstance(config, dict):
                replica = ReplicaConfig(
                    name=config['name'],
                    url=config['url'],
                    weight=config.get('weight', 1),
                    max_lag_seconds=config.get('max_lag_seconds', 30),
                    health_check_interval=config.get('health_check_interval', 60),
                    enabled=config.get('enabled', True)
                )
                self.add_replica(replica)
    
    def add_replica(self, replica: ReplicaConfig):
        """Add a read replica to the pool."""
        try:
            # Create engine for the replica
            engine_options = {
                'poolclass': QueuePool,
                'pool_size': self.app.config.get('REPLICA_POOL_SIZE', 10),
                'max_overflow': self.app.config.get('REPLICA_POOL_MAX_OVERFLOW', 20),
                'pool_timeout': self.app.config.get('REPLICA_POOL_TIMEOUT', 30),
                'pool_recycle': self.app.config.get('REPLICA_POOL_RECYCLE', 3600),
                'pool_pre_ping': True,
            }
            
            engine = create_engine(replica.url, **engine_options)
            
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self.replicas[replica.name] = replica
            self.replica_engines[replica.name] = engine
            self._connection_counts[replica.name] = 0
            
            # Initialize health status
            self.replica_health[replica.name] = ReplicaHealth(
                name=replica.name,
                is_healthy=True,
                last_check=datetime.utcnow(),
                response_time_ms=0.0
            )
            
            logger.info(f"Added read replica: {replica.name}")
            
        except Exception as e:
            logger.error(f"Failed to add replica {replica.name}: {e}")
            raise
    
    def remove_replica(self, name: str):
        """Remove a read replica from the pool."""
        if name in self.replicas:
            # Close engine connections
            if name in self.replica_engines:
                self.replica_engines[name].dispose()
                del self.replica_engines[name]
            
            del self.replicas[name]
            self.replica_health.pop(name, None)
            self._connection_counts.pop(name, None)
            
            logger.info(f"Removed read replica: {name}")
    
    def _setup_read_operation_detection(self):
        """Set up detection of read-only database operations."""
        # Define read-only SQL keywords
        self.read_only_operations = {
            'SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'ANALYZE'
        }
        
        # Set up SQLAlchemy event listeners for query routing
        @event.listens_for(Engine, "before_cursor_execute")
        def route_query_to_replica(conn, cursor, statement, parameters, context, executemany):
            """Route read queries to read replicas."""
            if not self.replicas or not getattr(g, 'use_read_replica', True):
                return
            
            # Check if this is a read-only operation
            if self._is_read_only_query(statement):
                # Get a healthy replica
                replica_name = self._select_replica()
                if replica_name and replica_name in self.replica_engines:
                    # Mark this context for replica routing
                    context._use_replica = replica_name
    
    def _is_read_only_query(self, sql: str) -> bool:
        """Check if a SQL query is read-only."""
        if not sql:
            return False
        
        # Normalize the SQL
        sql_upper = sql.strip().upper()
        
        # Check for read-only keywords
        for keyword in self.read_only_operations:
            if sql_upper.startswith(keyword):
                return True
        
        # Additional checks for CTEs and subqueries
        if sql_upper.startswith('WITH') and 'SELECT' in sql_upper:
            # Check if it's a read-only CTE
            if not any(write_op in sql_upper for write_op in ['INSERT', 'UPDATE', 'DELETE']):
                return True
        
        return False
    
    def _select_replica(self) -> Optional[str]:
        """Select a healthy replica based on the load balancing strategy."""
        healthy_replicas = [
            name for name, health in self.replica_health.items()
            if health.is_healthy and self.replicas[name].enabled
        ]
        
        if not healthy_replicas:
            return None
        
        if self.load_balancing_strategy == 'round_robin':
            return self._round_robin_selection(healthy_replicas)
        elif self.load_balancing_strategy == 'weighted_random':
            return self._weighted_random_selection(healthy_replicas)
        elif self.load_balancing_strategy == 'least_connections':
            return self._least_connections_selection(healthy_replicas)
        else:
            return random.choice(healthy_replicas)
    
    def _round_robin_selection(self, replicas: List[str]) -> str:
        """Round-robin replica selection."""
        if not replicas:
            return None
        
        selected = replicas[self._current_replica_index % len(replicas)]
        self._current_replica_index += 1
        return selected
    
    def _weighted_random_selection(self, replicas: List[str]) -> str:
        """Weighted random replica selection."""
        if not replicas:
            return None
        
        # Calculate total weight
        total_weight = sum(self.replicas[name].weight for name in replicas)
        
        # Random selection based on weights
        rand_value = random.uniform(0, total_weight)
        current_weight = 0
        
        for name in replicas:
            current_weight += self.replicas[name].weight
            if current_weight >= rand_value:
                return name
        
        return replicas[0]  # Fallback
    
    def _least_connections_selection(self, replicas: List[str]) -> str:
        """Select replica with least active connections."""
        if not replicas:
            return None
        
        # Find replica with minimum connections
        min_connections = float('inf')
        selected_replica = None
        
        for name in replicas:
            connections = self._connection_counts.get(name, 0)
            if connections < min_connections:
                min_connections = connections
                selected_replica = name
        
        return selected_replica or replicas[0]
    
    @contextmanager
    def get_read_connection(self, force_replica: Optional[str] = None):
        """Get a connection for read operations, preferring replicas."""
        replica_name = force_replica or self._select_replica()
        
        if replica_name and replica_name in self.replica_engines:
            # Use replica connection
            engine = self.replica_engines[replica_name]
            self._connection_counts[replica_name] += 1
            
            try:
                with engine.connect() as conn:
                    yield conn
            finally:
                self._connection_counts[replica_name] -= 1
        else:
            # Fallback to primary database
            with db.engine.connect() as conn:
                yield conn
    
    @contextmanager
    def force_primary_db(self):
        """Context manager to force using primary database."""
        old_value = getattr(g, 'use_read_replica', True)
        g.use_read_replica = False
        try:
            yield
        finally:
            g.use_read_replica = old_value
    
    def check_replica_health(self, replica_name: str) -> ReplicaHealth:
        """Check the health of a specific replica."""
        if replica_name not in self.replicas:
            raise ValueError(f"Replica {replica_name} not found")
        
        replica = self.replicas[replica_name]
        engine = self.replica_engines[replica_name]
        
        start_time = time.time()
        health = ReplicaHealth(
            name=replica_name,
            is_healthy=False,
            last_check=datetime.utcnow(),
            response_time_ms=0.0
        )
        
        try:
            with engine.connect() as conn:
                # Basic connectivity check
                conn.execute(text("SELECT 1"))
                
                # Check replication lag (PostgreSQL specific)
                if 'postgresql' in str(engine.url):
                    try:
                        lag_result = conn.execute(text("""
                            SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INT
                        """))
                        lag_row = lag_result.fetchone()
                        if lag_row and lag_row[0] is not None:
                            health.replication_lag_seconds = float(lag_row[0])
                    except Exception as e:
                        logger.warning(f"Could not check replication lag for {replica_name}: {e}")
                
                # Calculate response time
                response_time = (time.time() - start_time) * 1000
                health.response_time_ms = response_time
                
                # Check if lag is within acceptable limits
                if health.replication_lag_seconds is not None:
                    health.is_healthy = health.replication_lag_seconds <= replica.max_lag_seconds
                else:
                    health.is_healthy = True
                
        except Exception as e:
            health.error_message = str(e)
            logger.error(f"Health check failed for replica {replica_name}: {e}")
        
        # Update cached health status
        self.replica_health[replica_name] = health
        return health
    
    def check_all_replicas_health(self) -> Dict[str, ReplicaHealth]:
        """Check health of all replicas."""
        health_results = {}
        
        for replica_name in self.replicas:
            try:
                health_results[replica_name] = self.check_replica_health(replica_name)
            except Exception as e:
                logger.error(f"Error checking health of replica {replica_name}: {e}")
        
        return health_results
    
    def get_replica_status(self) -> Dict[str, Any]:
        """Get comprehensive status of all replicas."""
        status = {
            'total_replicas': len(self.replicas),
            'healthy_replicas': 0,
            'replicas': [],
            'load_balancing_strategy': self.load_balancing_strategy,
            'last_updated': datetime.utcnow().isoformat()
        }
        
        for name, replica in self.replicas.items():
            health = self.replica_health.get(name)
            replica_status = {
                'name': name,
                'url': replica.url,
                'weight': replica.weight,
                'enabled': replica.enabled,
                'max_lag_seconds': replica.max_lag_seconds,
                'active_connections': self._connection_counts.get(name, 0)
            }
            
            if health:
                replica_status.update({
                    'is_healthy': health.is_healthy,
                    'last_check': health.last_check.isoformat(),
                    'response_time_ms': health.response_time_ms,
                    'replication_lag_seconds': health.replication_lag_seconds,
                    'error_message': health.error_message
                })
                
                if health.is_healthy:
                    status['healthy_replicas'] += 1
            
            status['replicas'].append(replica_status)
        
        return status
    
    def enable_replica(self, name: str):
        """Enable a read replica."""
        if name in self.replicas:
            self.replicas[name].enabled = True
            logger.info(f"Enabled replica: {name}")
    
    def disable_replica(self, name: str):
        """Disable a read replica."""
        if name in self.replicas:
            self.replicas[name].enabled = False
            logger.info(f"Disabled replica: {name}")
    
    def _register_cli_commands(self, app):
        """Register CLI commands for replica management."""
        @app.cli.command()
        def db_replica_status():
            """Show read replica status."""
            if not self.replicas:
                print("No read replicas configured.")
                return
            
            status = self.get_replica_status()
            
            print("\n=== Read Replica Status ===")
            print(f"Total replicas: {status['total_replicas']}")
            print(f"Healthy replicas: {status['healthy_replicas']}")
            print(f"Load balancing: {status['load_balancing_strategy']}")
            print()
            
            for replica in status['replicas']:
                print(f"Replica: {replica['name']}")
                print(f"  URL: {replica['url']}")
                print(f"  Weight: {replica['weight']}")
                print(f"  Enabled: {replica['enabled']}")
                print(f"  Healthy: {replica.get('is_healthy', 'Unknown')}")
                print(f"  Active connections: {replica['active_connections']}")
                
                if replica.get('response_time_ms'):
                    print(f"  Response time: {replica['response_time_ms']:.1f}ms")
                
                if replica.get('replication_lag_seconds') is not None:
                    print(f"  Replication lag: {replica['replication_lag_seconds']:.1f}s")
                
                if replica.get('error_message'):
                    print(f"  Error: {replica['error_message']}")
                
                print()
        
        @app.cli.command()
        def db_replica_health_check():
            """Perform health check on all replicas."""
            if not self.replicas:
                print("No read replicas configured.")
                return
            
            print("Checking replica health...")
            health_results = self.check_all_replicas_health()
            
            for name, health in health_results.items():
                status = "✓ Healthy" if health.is_healthy else "✗ Unhealthy"
                print(f"{name}: {status} ({health.response_time_ms:.1f}ms)")
                
                if health.replication_lag_seconds is not None:
                    print(f"  Lag: {health.replication_lag_seconds:.1f}s")
                
                if health.error_message:
                    print(f"  Error: {health.error_message}")


# Global instance
read_replica_manager = ReadReplicaManager()


# Utility functions for application use
def use_read_replica():
    """Context manager to explicitly use read replicas for queries."""
    @contextmanager
    def _use_replica():
        old_value = getattr(g, 'use_read_replica', True)
        g.use_read_replica = True
        try:
            yield
        finally:
            g.use_read_replica = old_value
    
    return _use_replica()


def force_primary():
    """Context manager to force using primary database."""
    return read_replica_manager.force_primary_db()


def get_read_connection(force_replica: Optional[str] = None):
    """Get a read connection, preferring replicas."""
    return read_replica_manager.get_read_connection(force_replica)