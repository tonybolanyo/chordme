"""
Database Partitioning Module

This module provides comprehensive database partitioning strategies for large datasets including:
- Range partitioning by date/timestamp
- Hash partitioning for even distribution
- List partitioning for discrete values
- Automated partition management and maintenance
"""

import logging
import json
import click
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from calendar import monthrange
from sqlalchemy import text, inspect
from flask import current_app
from . import db

logger = logging.getLogger(__name__)


@dataclass
class PartitionStrategy:
    """Represents a database partitioning strategy."""
    table_name: str
    partition_type: str  # 'range', 'hash', 'list'
    partition_column: str
    strategy_config: Dict[str, Any]
    enabled: bool = True


@dataclass
class PartitionInfo:
    """Information about a database partition."""
    partition_name: str
    table_name: str
    partition_type: str
    partition_bounds: Dict[str, Any]
    row_count: int
    size_mb: float
    created_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None


class DatabasePartitionManager:
    """Manages database partitioning strategies and operations."""
    
    def __init__(self, app=None):
        self.app = app
        self.partition_strategies = {}  # Dict[str, PartitionStrategy]
        self.partition_cache = {}  # Dict[str, List[PartitionInfo]]
        self.partitioning_enabled = True
        self.auto_create_partitions = True
        self.partition_retention_months = 12
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the partition manager with Flask app."""
        self.app = app
        
        # Load configuration
        self.partitioning_enabled = app.config.get('PARTITIONING_ENABLED', True)
        self.auto_create_partitions = app.config.get('AUTO_CREATE_PARTITIONS', True)
        self.partition_retention_months = app.config.get('PARTITION_RETENTION_MONTHS', 12)
        
        # Load partition strategies from configuration
        self._load_partition_strategies()
        
        # Register CLI commands
        self._register_cli_commands(app)
        
        logger.info("Database partition manager initialized")
    
    def _load_partition_strategies(self):
        """Load partition strategies from application configuration."""
        # Default partitioning strategies for common tables
        default_strategies = [
            PartitionStrategy(
                table_name='performance_sessions',
                partition_type='range',
                partition_column='created_at',
                strategy_config={
                    'interval': 'month',
                    'format': 'YYYY_MM'
                }
            ),
            PartitionStrategy(
                table_name='performance_events',
                partition_type='range',
                partition_column='timestamp',
                strategy_config={
                    'interval': 'month',
                    'format': 'YYYY_MM'
                }
            ),
            PartitionStrategy(
                table_name='audit_logs',
                partition_type='range',
                partition_column='created_at',
                strategy_config={
                    'interval': 'month',
                    'format': 'YYYY_MM'
                }
            )
        ]
        
        # Add default strategies
        for strategy in default_strategies:
            self.partition_strategies[strategy.table_name] = strategy
        
        # Load custom strategies from app config
        custom_strategies = self.app.config.get('PARTITION_STRATEGIES', [])
        for config in custom_strategies:
            strategy = PartitionStrategy(
                table_name=config['table_name'],
                partition_type=config['partition_type'],
                partition_column=config['partition_column'],
                strategy_config=config['strategy_config'],
                enabled=config.get('enabled', True)
            )
            self.partition_strategies[strategy.table_name] = strategy
    
    def analyze_partitioning_candidates(self) -> List[Dict[str, Any]]:
        """Analyze tables that would benefit from partitioning."""
        candidates = []
        
        try:
            if db.engine.name == 'postgresql':
                candidates = self._analyze_postgresql_candidates()
            elif db.engine.name == 'sqlite':
                # SQLite doesn't support native partitioning
                candidates = self._analyze_sqlite_candidates()
            
            return candidates
            
        except Exception as e:
            logger.error(f"Error analyzing partitioning candidates: {e}")
            return []
    
    def _analyze_postgresql_candidates(self) -> List[Dict[str, Any]]:
        """Analyze PostgreSQL tables for partitioning opportunities."""
        candidates = []
        
        try:
            with db.engine.connect() as conn:
                # Find large tables with time-based columns
                result = conn.execute(text("""
                    SELECT 
                        t.tablename,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
                        n_tup_ins + n_tup_upd + n_tup_del as total_changes
                    FROM pg_tables t
                    LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
                    WHERE t.schemaname = 'public'
                    AND pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024  -- > 100MB
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                    LIMIT 20
                """))
                
                for row in result:
                    table_name = row.tablename
                    
                    # Check for time-based columns
                    time_columns = self._find_time_columns_postgresql(table_name)
                    
                    if time_columns:
                        candidates.append({
                            'table_name': table_name,
                            'size': row.size,
                            'size_bytes': row.size_bytes,
                            'total_changes': row.total_changes or 0,
                            'time_columns': time_columns,
                            'recommended_strategy': self._recommend_partition_strategy(
                                table_name, row.size_bytes, time_columns
                            ),
                            'already_partitioned': self._is_table_partitioned(table_name)
                        })
            
            return candidates
            
        except Exception as e:
            logger.error(f"Error analyzing PostgreSQL partitioning candidates: {e}")
            return []
    
    def _analyze_sqlite_candidates(self) -> List[Dict[str, Any]]:
        """Analyze SQLite tables (SQLite doesn't support native partitioning)."""
        candidates = []
        
        try:
            with db.engine.connect() as conn:
                # Get table information
                tables_result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in tables_result if not row[0].startswith('sqlite_')]
                
                for table_name in tables:
                    # Get table size estimate
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    row_count = count_result.fetchone()[0]
                    
                    # Estimate size (rough calculation)
                    estimated_size = row_count * 1000  # Rough estimate: 1KB per row
                    
                    if row_count > 100000:  # Large table
                        # Check for time-based columns
                        time_columns = self._find_time_columns_sqlite(table_name)
                        
                        if time_columns:
                            candidates.append({
                                'table_name': table_name,
                                'row_count': row_count,
                                'estimated_size_bytes': estimated_size,
                                'time_columns': time_columns,
                                'note': 'SQLite partitioning requires application-level implementation',
                                'recommended_strategy': 'Consider migrating to PostgreSQL for native partitioning'
                            })
            
            return candidates
            
        except Exception as e:
            logger.error(f"Error analyzing SQLite tables: {e}")
            return []
    
    def _find_time_columns_postgresql(self, table_name: str) -> List[str]:
        """Find time-based columns in a PostgreSQL table."""
        time_columns = []
        
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = :table_name 
                    AND table_schema = 'public'
                    AND data_type IN ('timestamp', 'timestamptz', 'date', 'timestamp without time zone', 'timestamp with time zone')
                """), {'table_name': table_name})
                
                time_columns = [row.column_name for row in result]
            
        except Exception as e:
            logger.error(f"Error finding time columns for {table_name}: {e}")
        
        return time_columns
    
    def _find_time_columns_sqlite(self, table_name: str) -> List[str]:
        """Find time-based columns in a SQLite table."""
        time_columns = []
        
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text(f"PRAGMA table_info({table_name})"))
                
                for row in result:
                    column_name = row[1]  # Column name
                    column_type = row[2].lower()  # Column type
                    
                    # Check for common time column patterns
                    if any(time_type in column_type for time_type in ['timestamp', 'datetime', 'date']):
                        time_columns.append(column_name)
                    elif any(time_name in column_name.lower() for time_name in ['created_at', 'updated_at', 'timestamp', 'date']):
                        time_columns.append(column_name)
            
        except Exception as e:
            logger.error(f"Error finding time columns for {table_name}: {e}")
        
        return time_columns
    
    def _recommend_partition_strategy(self, table_name: str, size_bytes: int, time_columns: List[str]) -> Dict[str, Any]:
        """Recommend a partitioning strategy for a table."""
        strategy = {
            'type': 'range',
            'column': time_columns[0] if time_columns else None,
            'reasoning': []
        }
        
        # Size-based recommendations
        if size_bytes > 10 * 1024 * 1024 * 1024:  # > 10GB
            strategy['interval'] = 'week'
            strategy['reasoning'].append('Very large table - weekly partitions recommended')
        elif size_bytes > 1 * 1024 * 1024 * 1024:  # > 1GB
            strategy['interval'] = 'month'
            strategy['reasoning'].append('Large table - monthly partitions recommended')
        else:
            strategy['interval'] = 'quarter'
            strategy['reasoning'].append('Medium table - quarterly partitions recommended')
        
        # Table-specific recommendations
        if 'log' in table_name.lower() or 'audit' in table_name.lower():
            strategy['interval'] = 'month'
            strategy['reasoning'].append('Log table - monthly partitions for efficient cleanup')
        elif 'session' in table_name.lower() or 'event' in table_name.lower():
            strategy['interval'] = 'month'
            strategy['reasoning'].append('Session/event table - monthly partitions for performance')
        
        return strategy
    
    def _is_table_partitioned(self, table_name: str) -> bool:
        """Check if a table is already partitioned."""
        try:
            if db.engine.name == 'postgresql':
                with db.engine.connect() as conn:
                    result = conn.execute(text("""
                        SELECT COUNT(*) FROM pg_partitioned_table 
                        WHERE partrelid = :table_name::regclass
                    """), {'table_name': table_name})
                    return result.fetchone()[0] > 0
            else:
                return False
                
        except Exception:
            return False
    
    def create_range_partitions(self, table_name: str, column_name: str, 
                               start_date: datetime, end_date: datetime, 
                               interval: str = 'month') -> List[str]:
        """Create range partitions for a table."""
        if db.engine.name != 'postgresql':
            raise ValueError("Partitioning is only supported on PostgreSQL")
        
        created_partitions = []
        
        try:
            with db.engine.connect() as conn:
                # First, convert table to partitioned table if not already
                if not self._is_table_partitioned(table_name):
                    self._convert_to_partitioned_table(table_name, column_name)
                
                # Generate partition dates
                partition_dates = self._generate_partition_dates(start_date, end_date, interval)
                
                for i, (start, end) in enumerate(partition_dates):
                    partition_name = f"{table_name}_{start.strftime('%Y_%m')}"
                    
                    # Create partition
                    create_sql = f"""
                        CREATE TABLE {partition_name} PARTITION OF {table_name}
                        FOR VALUES FROM ('{start.strftime('%Y-%m-%d')}') 
                        TO ('{end.strftime('%Y-%m-%d')}')
                    """
                    
                    try:
                        conn.execute(text(create_sql))
                        created_partitions.append(partition_name)
                        logger.info(f"Created partition: {partition_name}")
                    except Exception as e:
                        if "already exists" in str(e):
                            logger.info(f"Partition already exists: {partition_name}")
                        else:
                            logger.error(f"Error creating partition {partition_name}: {e}")
                
                conn.commit()
            
            return created_partitions
            
        except Exception as e:
            logger.error(f"Error creating range partitions: {e}")
            raise
    
    def _convert_to_partitioned_table(self, table_name: str, column_name: str):
        """Convert a regular table to a partitioned table."""
        # This is a complex operation that typically requires:
        # 1. Creating a new partitioned table
        # 2. Copying data from old table
        # 3. Dropping old table and renaming new one
        
        # For safety, we'll just log this requirement
        logger.warning(f"Table {table_name} needs to be converted to partitioned table manually")
        logger.warning(f"Recommended: CREATE TABLE {table_name}_new PARTITION BY RANGE ({column_name})")
    
    def _generate_partition_dates(self, start_date: datetime, end_date: datetime, 
                                 interval: str) -> List[Tuple[datetime, datetime]]:
        """Generate partition date ranges."""
        dates = []
        current = start_date.replace(day=1)  # Start of month
        
        while current < end_date:
            if interval == 'month':
                # Calculate end of month
                year, month = current.year, current.month
                _, last_day = monthrange(year, month)
                month_end = datetime(year, month, last_day, 23, 59, 59)
                
                # Next month start
                if month == 12:
                    next_start = datetime(year + 1, 1, 1)
                else:
                    next_start = datetime(year, month + 1, 1)
                
                dates.append((current, next_start))
                current = next_start
                
            elif interval == 'week':
                week_end = current + timedelta(days=7)
                dates.append((current, week_end))
                current = week_end
                
            elif interval == 'quarter':
                # Quarterly partitions
                quarter_end = current + timedelta(days=90)  # Approximate
                dates.append((current, quarter_end))
                current = quarter_end
            
            else:
                raise ValueError(f"Unsupported interval: {interval}")
        
        return dates
    
    def get_partition_info(self, table_name: str) -> List[PartitionInfo]:
        """Get information about table partitions."""
        if table_name in self.partition_cache:
            return self.partition_cache[table_name]
        
        partitions = []
        
        try:
            if db.engine.name == 'postgresql':
                partitions = self._get_postgresql_partition_info(table_name)
            
            # Cache the results
            self.partition_cache[table_name] = partitions
            
        except Exception as e:
            logger.error(f"Error getting partition info for {table_name}: {e}")
        
        return partitions
    
    def _get_postgresql_partition_info(self, table_name: str) -> List[PartitionInfo]:
        """Get PostgreSQL partition information."""
        partitions = []
        
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT 
                        schemaname || '.' || tablename as partition_name,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                    FROM pg_tables 
                    WHERE tablename LIKE :pattern
                    AND schemaname = 'public'
                    ORDER BY tablename
                """), {'pattern': f'{table_name}_%'})
                
                for row in result:
                    # Get row count
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {row.partition_name}"))
                    row_count = count_result.fetchone()[0]
                    
                    partitions.append(PartitionInfo(
                        partition_name=row.partition_name,
                        table_name=table_name,
                        partition_type='range',  # Assume range for now
                        partition_bounds={},  # Would need more complex query
                        row_count=row_count,
                        size_mb=row.size_bytes / (1024 * 1024) if row.size_bytes else 0
                    ))
            
        except Exception as e:
            logger.error(f"Error getting PostgreSQL partition info: {e}")
        
        return partitions
    
    def cleanup_old_partitions(self, table_name: str, retention_months: Optional[int] = None) -> List[str]:
        """Clean up old partitions based on retention policy."""
        retention_months = retention_months or self.partition_retention_months
        cutoff_date = datetime.utcnow() - timedelta(days=retention_months * 30)
        
        dropped_partitions = []
        
        try:
            partitions = self.get_partition_info(table_name)
            
            for partition in partitions:
                # Extract date from partition name (assumes YYYY_MM format)
                try:
                    name_parts = partition.partition_name.split('_')
                    if len(name_parts) >= 2:
                        year = int(name_parts[-2])
                        month = int(name_parts[-1])
                        partition_date = datetime(year, month, 1)
                        
                        if partition_date < cutoff_date:
                            # Drop the partition
                            if self._drop_partition(partition.partition_name):
                                dropped_partitions.append(partition.partition_name)
                                
                except (ValueError, IndexError):
                    logger.warning(f"Could not parse date from partition name: {partition.partition_name}")
            
            # Clear cache
            if table_name in self.partition_cache:
                del self.partition_cache[table_name]
                
        except Exception as e:
            logger.error(f"Error cleaning up old partitions: {e}")
        
        return dropped_partitions
    
    def _drop_partition(self, partition_name: str) -> bool:
        """Drop a specific partition."""
        try:
            with db.engine.connect() as conn:
                conn.execute(text(f"DROP TABLE {partition_name}"))
                conn.commit()
                logger.info(f"Dropped partition: {partition_name}")
                return True
                
        except Exception as e:
            logger.error(f"Error dropping partition {partition_name}: {e}")
            return False
    
    def get_partitioning_status(self) -> Dict[str, Any]:
        """Get comprehensive partitioning status."""
        status = {
            'partitioning_enabled': self.partitioning_enabled,
            'auto_create_partitions': self.auto_create_partitions,
            'retention_months': self.partition_retention_months,
            'total_strategies': len(self.partition_strategies),
            'active_strategies': len([s for s in self.partition_strategies.values() if s.enabled]),
            'partitioned_tables': [],
            'candidates': self.analyze_partitioning_candidates()
        }
        
        # Get info for each partitioned table
        for table_name, strategy in self.partition_strategies.items():
            if strategy.enabled:
                partitions = self.get_partition_info(table_name)
                
                status['partitioned_tables'].append({
                    'table_name': table_name,
                    'strategy': {
                        'type': strategy.partition_type,
                        'column': strategy.partition_column,
                        'config': strategy.strategy_config
                    },
                    'partition_count': len(partitions),
                    'total_size_mb': sum(p.size_mb for p in partitions),
                    'total_rows': sum(p.row_count for p in partitions)
                })
        
        return status
    
    def _register_cli_commands(self, app):
        """Register CLI commands for partition management."""
        @app.cli.command()
        def db_partition_status():
            """Show database partitioning status."""
            if not self.partitioning_enabled:
                print("Database partitioning is disabled.")
                return
            
            status = self.get_partitioning_status()
            
            print("\n=== Database Partitioning Status ===")
            print(f"Partitioning enabled: {status['partitioning_enabled']}")
            print(f"Auto-create partitions: {status['auto_create_partitions']}")
            print(f"Retention: {status['retention_months']} months")
            print(f"Total strategies: {status['total_strategies']}")
            print(f"Active strategies: {status['active_strategies']}")
            
            print("\n=== Partitioned Tables ===")
            for table in status['partitioned_tables']:
                print(f"Table: {table['table_name']}")
                print(f"  Strategy: {table['strategy']['type']} on {table['strategy']['column']}")
                print(f"  Partitions: {table['partition_count']}")
                print(f"  Total size: {table['total_size_mb']:.1f} MB")
                print(f"  Total rows: {table['total_rows']:,}")
                print()
            
            print("=== Partitioning Candidates ===")
            for candidate in status['candidates'][:5]:
                print(f"Table: {candidate['table_name']}")
                if 'size' in candidate:
                    print(f"  Size: {candidate['size']}")
                if 'row_count' in candidate:
                    print(f"  Rows: {candidate['row_count']:,}")
                print(f"  Time columns: {', '.join(candidate['time_columns'])}")
                print(f"  Recommended: {candidate.get('recommended_strategy', {}).get('type', 'N/A')}")
                print()
        
        @app.cli.command()
        @click.argument('table_name')
        @click.argument('column_name')
        def db_create_partitions(table_name, column_name):
            """Create partitions for a table."""
            if not self.partitioning_enabled:
                print("Database partitioning is disabled.")
                return
            
            try:
                # Create partitions for next 12 months
                start_date = datetime.utcnow().replace(day=1)
                end_date = start_date + timedelta(days=365)
                
                created = self.create_range_partitions(table_name, column_name, start_date, end_date)
                
                print(f"✅ Created {len(created)} partitions for {table_name}")
                for partition in created:
                    print(f"  - {partition}")
                    
            except Exception as e:
                print(f"❌ Failed to create partitions: {e}")
        
        @app.cli.command()
        @click.argument('table_name')
        def db_cleanup_partitions(table_name):
            """Clean up old partitions for a table."""
            try:
                dropped = self.cleanup_old_partitions(table_name)
                
                if dropped:
                    print(f"✅ Dropped {len(dropped)} old partitions for {table_name}")
                    for partition in dropped:
                        print(f"  - {partition}")
                else:
                    print(f"No old partitions found for {table_name}")
                    
            except Exception as e:
                print(f"❌ Failed to cleanup partitions: {e}")


# Global instance
db_partition_manager = DatabasePartitionManager()