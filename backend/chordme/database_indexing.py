"""
Database Indexing Optimization Module

This module provides advanced indexing strategies and monitoring for optimal database performance.
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from sqlalchemy import text, inspect
from . import db

logger = logging.getLogger(__name__)


@dataclass
class IndexRecommendation:
    """Represents an index optimization recommendation."""
    table_name: str
    columns: List[str]
    index_type: str  # 'btree', 'gin', 'gist', 'hash', 'partial'
    reasoning: str
    estimated_benefit: str  # 'high', 'medium', 'low'
    sql_statement: str


@dataclass
class IndexUsageStats:
    """Represents index usage statistics."""
    index_name: str
    table_name: str
    scans: int
    tuples_read: int
    tuples_fetched: int
    size_mb: float
    last_used: Optional[datetime] = None


class DatabaseIndexOptimizer:
    """Manages database indexing optimization and monitoring."""
    
    def __init__(self, app=None):
        self.app = app
        self.recommendations_cache = []
        self.index_stats_cache = {}
        self.cache_ttl = 3600  # 1 hour cache
        self.last_analysis = None
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the index optimizer with Flask app."""
        self.app = app
        self.cache_ttl = app.config.get('INDEX_CACHE_TTL', 3600)
        
        # Register CLI commands
        self._register_cli_commands(app)
        
        logger.info("Database index optimizer initialized")
    
    def analyze_missing_indexes(self) -> List[IndexRecommendation]:
        """Analyze database for missing index opportunities."""
        try:
            recommendations = []
            
            # Check if we have cached recommendations
            if self._is_cache_valid():
                return self.recommendations_cache
            
            # Get database engine type
            engine_name = db.engine.name
            
            if engine_name == 'postgresql':
                recommendations.extend(self._analyze_postgresql_indexes())
            elif engine_name == 'sqlite':
                recommendations.extend(self._analyze_sqlite_indexes())
            
            # Cache recommendations
            self.recommendations_cache = recommendations
            self.last_analysis = datetime.utcnow()
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error analyzing missing indexes: {e}")
            return []
    
    def _is_cache_valid(self) -> bool:
        """Check if analysis cache is still valid."""
        if not self.last_analysis:
            return False
        
        return (datetime.utcnow() - self.last_analysis).total_seconds() < self.cache_ttl
    
    def _analyze_postgresql_indexes(self) -> List[IndexRecommendation]:
        """Analyze PostgreSQL for missing indexes."""
        recommendations = []
        
        try:
            with db.engine.connect() as conn:
                # Find tables with high sequential scan counts
                result = conn.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        seq_scan,
                        seq_tup_read,
                        idx_scan,
                        idx_tup_fetch
                    FROM pg_stat_user_tables 
                    WHERE seq_scan > 1000 
                    AND (idx_scan IS NULL OR seq_scan > idx_scan * 10)
                    ORDER BY seq_scan DESC
                    LIMIT 20
                """))
                
                for row in result:
                    table_name = row.tablename
                    recommendations.append(IndexRecommendation(
                        table_name=table_name,
                        columns=['id'],  # Basic recommendation
                        index_type='btree',
                        reasoning=f"High sequential scan count: {row.seq_scan}",
                        estimated_benefit='medium',
                        sql_statement=f"CREATE INDEX CONCURRENTLY idx_{table_name}_performance ON {table_name} (id);"
                    ))
                
                # Analyze foreign key columns without indexes
                result = conn.execute(text("""
                    SELECT 
                        tc.table_name,
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                        AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
                """))
                
                for row in result:
                    # Check if index exists on foreign key
                    index_exists = self._check_index_exists(row.table_name, row.column_name)
                    if not index_exists:
                        recommendations.append(IndexRecommendation(
                            table_name=row.table_name,
                            columns=[row.column_name],
                            index_type='btree',
                            reasoning=f"Foreign key column without index",
                            estimated_benefit='high',
                            sql_statement=f"CREATE INDEX CONCURRENTLY idx_{row.table_name}_{row.column_name} ON {row.table_name} ({row.column_name});"
                        ))
                
                # Recommend composite indexes for common WHERE clauses
                recommendations.extend(self._analyze_query_patterns_postgresql())
                
        except Exception as e:
            logger.error(f"Error analyzing PostgreSQL indexes: {e}")
        
        return recommendations
    
    def _analyze_sqlite_indexes(self) -> List[IndexRecommendation]:
        """Analyze SQLite for missing indexes."""
        recommendations = []
        
        try:
            with db.engine.connect() as conn:
                # Get table information
                tables_result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in tables_result if not row[0].startswith('sqlite_')]
                
                for table in tables:
                    # Check foreign key columns
                    fk_result = conn.execute(text(f"PRAGMA foreign_key_list({table})"))
                    for row in fk_result:
                        column = row[3]  # from column
                        # Check if index exists
                        index_exists = self._check_sqlite_index_exists(table, column)
                        if not index_exists:
                            recommendations.append(IndexRecommendation(
                                table_name=table,
                                columns=[column],
                                index_type='btree',
                                reasoning=f"Foreign key column without index",
                                estimated_benefit='high',
                                sql_statement=f"CREATE INDEX idx_{table}_{column} ON {table} ({column});"
                            ))
                    
                    # Recommend indexes for commonly queried columns
                    if table == 'songs':
                        recommendations.extend([
                            IndexRecommendation(
                                table_name='songs',
                                columns=['user_id', 'created_at'],
                                index_type='btree',
                                reasoning="Common filter combination for user songs by date",
                                estimated_benefit='high',
                                sql_statement="CREATE INDEX idx_songs_user_created ON songs (user_id, created_at);"
                            ),
                            IndexRecommendation(
                                table_name='songs',
                                columns=['is_public', 'created_at'],
                                index_type='btree',
                                reasoning="Common filter for public songs",
                                estimated_benefit='medium',
                                sql_statement="CREATE INDEX idx_songs_public_created ON songs (is_public, created_at) WHERE is_public = 1;"
                            )
                        ])
                    
                    if table == 'users':
                        recommendations.append(IndexRecommendation(
                            table_name='users',
                            columns=['email'],
                            index_type='btree',
                            reasoning="Email lookups for authentication",
                            estimated_benefit='high',
                            sql_statement="CREATE UNIQUE INDEX idx_users_email ON users (email);"
                        ))
        
        except Exception as e:
            logger.error(f"Error analyzing SQLite indexes: {e}")
        
        return recommendations
    
    def _analyze_query_patterns_postgresql(self) -> List[IndexRecommendation]:
        """Analyze PostgreSQL query patterns for index recommendations."""
        recommendations = []
        
        # Common query patterns based on application usage
        common_patterns = [
            {
                'table': 'songs',
                'columns': ['user_id', 'created_at'],
                'reasoning': 'User songs sorted by date',
                'benefit': 'high'
            },
            {
                'table': 'songs', 
                'columns': ['is_public', 'updated_at'],
                'reasoning': 'Public songs feed',
                'benefit': 'medium'
            },
            {
                'table': 'song_collaborators',
                'columns': ['song_id', 'permission_level'],
                'reasoning': 'Collaboration queries',
                'benefit': 'high'
            },
            {
                'table': 'favorites',
                'columns': ['user_id', 'created_at'],
                'reasoning': 'User favorites by date',
                'benefit': 'medium'
            }
        ]
        
        for pattern in common_patterns:
            # Check if composite index exists
            if not self._check_composite_index_exists(pattern['table'], pattern['columns']):
                col_str = ', '.join(pattern['columns'])
                recommendations.append(IndexRecommendation(
                    table_name=pattern['table'],
                    columns=pattern['columns'],
                    index_type='btree',
                    reasoning=pattern['reasoning'],
                    estimated_benefit=pattern['benefit'],
                    sql_statement=f"CREATE INDEX CONCURRENTLY idx_{pattern['table']}_{'_'.join(pattern['columns'])} ON {pattern['table']} ({col_str});"
                ))
        
        return recommendations
    
    def _check_index_exists(self, table_name: str, column_name: str) -> bool:
        """Check if an index exists on a specific column."""
        try:
            with db.engine.connect() as conn:
                if db.engine.name == 'postgresql':
                    result = conn.execute(text("""
                        SELECT 1 FROM pg_indexes 
                        WHERE tablename = :table_name 
                        AND indexdef LIKE :column_pattern
                    """), {'table_name': table_name, 'column_pattern': f'%{column_name}%'})
                    return result.fetchone() is not None
                
                elif db.engine.name == 'sqlite':
                    return self._check_sqlite_index_exists(table_name, column_name)
        
        except Exception as e:
            logger.error(f"Error checking index existence: {e}")
            return False
    
    def _check_sqlite_index_exists(self, table_name: str, column_name: str) -> bool:
        """Check if SQLite index exists on column."""
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text(f"PRAGMA index_list({table_name})"))
                for row in result:
                    index_name = row[1]
                    # Get index info
                    index_info = conn.execute(text(f"PRAGMA index_info({index_name})"))
                    for info_row in index_info:
                        if info_row[2] == column_name:  # column name
                            return True
                return False
        except Exception as e:
            logger.error(f"Error checking SQLite index: {e}")
            return False
    
    def _check_composite_index_exists(self, table_name: str, columns: List[str]) -> bool:
        """Check if a composite index exists on multiple columns."""
        try:
            inspector = inspect(db.engine)
            indexes = inspector.get_indexes(table_name)
            
            for index in indexes:
                index_columns = [col['name'] for col in index['column_names']]
                if set(columns).issubset(set(index_columns)):
                    return True
            
            return False
        
        except Exception as e:
            logger.error(f"Error checking composite index: {e}")
            return False
    
    def get_index_usage_stats(self) -> List[IndexUsageStats]:
        """Get index usage statistics."""
        try:
            stats = []
            
            if db.engine.name == 'postgresql':
                with db.engine.connect() as conn:
                    result = conn.execute(text("""
                        SELECT 
                            indexrelname AS index_name,
                            relname AS table_name,
                            idx_scan AS scans,
                            idx_tup_read AS tuples_read,
                            idx_tup_fetch AS tuples_fetched,
                            pg_size_pretty(pg_relation_size(indexrelid)) AS size
                        FROM pg_stat_user_indexes
                        JOIN pg_class ON pg_class.oid = indexrelid
                        ORDER BY idx_scan DESC
                    """))
                    
                    for row in result:
                        stats.append(IndexUsageStats(
                            index_name=row.index_name,
                            table_name=row.table_name,
                            scans=row.scans or 0,
                            tuples_read=row.tuples_read or 0,
                            tuples_fetched=row.tuples_fetched or 0,
                            size_mb=self._parse_pg_size(row.size),
                        ))
            
            elif db.engine.name == 'sqlite':
                # SQLite doesn't provide detailed usage stats
                with db.engine.connect() as conn:
                    tables_result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                    tables = [row[0] for row in tables_result if not row[0].startswith('sqlite_')]
                    
                    for table in tables:
                        indexes_result = conn.execute(text(f"PRAGMA index_list({table})"))
                        for row in indexes_result:
                            stats.append(IndexUsageStats(
                                index_name=row[1],  # name
                                table_name=table,
                                scans=0,  # Not available in SQLite
                                tuples_read=0,
                                tuples_fetched=0,
                                size_mb=0.0,
                            ))
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting index usage stats: {e}")
            return []
    
    def _parse_pg_size(self, size_str: str) -> float:
        """Parse PostgreSQL size string to MB."""
        try:
            if 'MB' in size_str:
                return float(size_str.replace(' MB', ''))
            elif 'GB' in size_str:
                return float(size_str.replace(' GB', '')) * 1024
            elif 'kB' in size_str:
                return float(size_str.replace(' kB', '')) / 1024
            elif 'bytes' in size_str:
                return float(size_str.replace(' bytes', '')) / (1024 * 1024)
            return 0.0
        except:
            return 0.0
    
    def find_unused_indexes(self, min_scans: int = 100) -> List[IndexUsageStats]:
        """Find indexes with low usage that might be candidates for removal."""
        all_stats = self.get_index_usage_stats()
        unused = []
        
        for stat in all_stats:
            # Skip primary key and unique indexes
            if 'pkey' in stat.index_name.lower() or 'unique' in stat.index_name.lower():
                continue
            
            if stat.scans < min_scans:
                unused.append(stat)
        
        return sorted(unused, key=lambda x: x.scans)
    
    def create_index_safely(self, recommendation: IndexRecommendation) -> bool:
        """Create an index safely with proper error handling."""
        try:
            with db.engine.connect() as conn:
                conn.execute(text(recommendation.sql_statement))
                conn.commit()
                
                logger.info(f"Successfully created index: {recommendation.sql_statement}")
                return True
                
        except Exception as e:
            logger.error(f"Error creating index: {e}")
            return False
    
    def generate_index_maintenance_plan(self) -> Dict[str, Any]:
        """Generate a comprehensive index maintenance plan."""
        plan = {
            'missing_indexes': self.analyze_missing_indexes(),
            'unused_indexes': self.find_unused_indexes(),
            'index_stats': self.get_index_usage_stats(),
            'maintenance_actions': [],
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Generate maintenance actions
        for rec in plan['missing_indexes']:
            if rec.estimated_benefit == 'high':
                plan['maintenance_actions'].append({
                    'action': 'create_index',
                    'priority': 'high',
                    'description': f"Create index on {rec.table_name}.{', '.join(rec.columns)}",
                    'sql': rec.sql_statement
                })
        
        for unused in plan['unused_indexes']:
            if unused.scans == 0 and unused.size_mb > 10:  # Large unused index
                plan['maintenance_actions'].append({
                    'action': 'consider_drop',
                    'priority': 'medium',
                    'description': f"Consider dropping unused index {unused.index_name} ({unused.size_mb:.1f}MB)",
                    'sql': f"DROP INDEX {unused.index_name};"
                })
        
        return plan
    
    def _register_cli_commands(self, app):
        """Register CLI commands for index management."""
        @app.cli.command()
        def db_analyze_indexes():
            """Analyze database indexes and provide recommendations."""
            recommendations = self.analyze_missing_indexes()
            usage_stats = self.get_index_usage_stats()
            unused = self.find_unused_indexes()
            
            print("\n=== Index Analysis Results ===")
            print(f"Total indexes: {len(usage_stats)}")
            print(f"Missing index recommendations: {len(recommendations)}")
            print(f"Potentially unused indexes: {len(unused)}")
            
            print("\n=== Recommended Indexes ===")
            for i, rec in enumerate(recommendations[:10], 1):
                print(f"{i}. Table: {rec.table_name}")
                print(f"   Columns: {', '.join(rec.columns)}")
                print(f"   Benefit: {rec.estimated_benefit}")
                print(f"   Reason: {rec.reasoning}")
                print(f"   SQL: {rec.sql_statement}")
                print()
            
            print("=== Potentially Unused Indexes ===")
            for i, stat in enumerate(unused[:5], 1):
                print(f"{i}. {stat.index_name} (Table: {stat.table_name})")
                print(f"   Scans: {stat.scans}, Size: {stat.size_mb:.1f}MB")
                print()
        
        @app.cli.command()
        def db_create_recommended_indexes():
            """Create all high-priority recommended indexes."""
            recommendations = self.analyze_missing_indexes()
            high_priority = [r for r in recommendations if r.estimated_benefit == 'high']
            
            print(f"Creating {len(high_priority)} high-priority indexes...")
            
            success_count = 0
            for rec in high_priority:
                print(f"Creating index on {rec.table_name}.{', '.join(rec.columns)}...")
                if self.create_index_safely(rec):
                    success_count += 1
                    print("  ✓ Success")
                else:
                    print("  ✗ Failed")
            
            print(f"\nCreated {success_count}/{len(high_priority)} indexes successfully.")


# Global instance
db_index_optimizer = DatabaseIndexOptimizer()