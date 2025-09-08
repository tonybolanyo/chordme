"""
Database Maintenance Automation Module

This module provides automated database maintenance tasks including:
- Automated statistics updates
- Index maintenance and rebuilding
- Data cleanup and archival
- Health monitoring and alerting
"""

import logging
import time
import threading
import click
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from sqlalchemy import text, inspect
from flask import current_app
from . import db
from .database_performance import db_performance
from .database_indexing import db_index_optimizer

logger = logging.getLogger(__name__)


@dataclass
class MaintenanceTask:
    """Represents a database maintenance task."""
    name: str
    description: str
    frequency_hours: int
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    enabled: bool = True
    task_function: Optional[Callable] = None


@dataclass
class MaintenanceResult:
    """Result of a maintenance task execution."""
    task_name: str
    success: bool
    duration_seconds: float
    message: str
    details: Dict[str, Any]
    timestamp: datetime


class DatabaseMaintenanceManager:
    """Manages automated database maintenance tasks."""
    
    def __init__(self, app=None):
        self.app = app
        self.tasks = {}  # Dict[str, MaintenanceTask]
        self.execution_history = []  # List[MaintenanceResult]
        self.scheduler_thread = None
        self.scheduler_running = False
        self.maintenance_enabled = True
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the maintenance manager with Flask app."""
        self.app = app
        
        # Configure maintenance settings
        self.maintenance_enabled = app.config.get('DB_MAINTENANCE_ENABLED', True)
        
        # Register default maintenance tasks
        self._register_default_tasks()
        
        # Start scheduler if enabled
        if self.maintenance_enabled:
            self.start_scheduler()
        
        # Register CLI commands
        self._register_cli_commands(app)
        
        logger.info("Database maintenance manager initialized")
    
    def _register_default_tasks(self):
        """Register default maintenance tasks."""
        # Statistics update task
        self.register_task(MaintenanceTask(
            name="update_statistics",
            description="Update database table statistics for query optimization",
            frequency_hours=6,  # Every 6 hours
            task_function=self._update_statistics
        ))
        
        # Index maintenance task
        self.register_task(MaintenanceTask(
            name="maintain_indexes",
            description="Analyze and maintain database indexes",
            frequency_hours=24,  # Daily
            task_function=self._maintain_indexes
        ))
        
        # Cleanup old data task
        self.register_task(MaintenanceTask(
            name="cleanup_old_data",
            description="Clean up old temporary and deleted data",
            frequency_hours=12,  # Twice daily
            task_function=self._cleanup_old_data
        ))
        
        # Performance metrics cleanup
        self.register_task(MaintenanceTask(
            name="cleanup_performance_metrics",
            description="Clean up old performance monitoring data",
            frequency_hours=168,  # Weekly
            task_function=self._cleanup_performance_metrics
        ))
        
        # Connection pool health check
        self.register_task(MaintenanceTask(
            name="check_connection_pool",
            description="Monitor and maintain database connection pool health",
            frequency_hours=1,  # Hourly
            task_function=self._check_connection_pool_health
        ))
        
        # Vacuum and analyze (PostgreSQL)
        self.register_task(MaintenanceTask(
            name="vacuum_analyze",
            description="Vacuum and analyze PostgreSQL tables",
            frequency_hours=72,  # Every 3 days
            task_function=self._vacuum_analyze_postgresql
        ))
    
    def register_task(self, task: MaintenanceTask):
        """Register a maintenance task."""
        # Calculate next run time
        if task.next_run is None:
            task.next_run = datetime.utcnow() + timedelta(hours=task.frequency_hours)
        
        self.tasks[task.name] = task
        logger.info(f"Registered maintenance task: {task.name}")
    
    def unregister_task(self, task_name: str):
        """Unregister a maintenance task."""
        if task_name in self.tasks:
            del self.tasks[task_name]
            logger.info(f"Unregistered maintenance task: {task_name}")
    
    def start_scheduler(self):
        """Start the maintenance task scheduler."""
        if self.scheduler_running:
            return
        
        self.scheduler_running = True
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.scheduler_thread.start()
        logger.info("Database maintenance scheduler started")
    
    def stop_scheduler(self):
        """Stop the maintenance task scheduler."""
        self.scheduler_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        logger.info("Database maintenance scheduler stopped")
    
    def _scheduler_loop(self):
        """Main scheduler loop."""
        while self.scheduler_running:
            try:
                current_time = datetime.utcnow()
                
                # Check which tasks need to run
                for task_name, task in self.tasks.items():
                    if task.enabled and task.next_run and current_time >= task.next_run:
                        self._execute_task(task)
                
                # Sleep for 5 minutes before next check
                time.sleep(300)
                
            except Exception as e:
                logger.error(f"Error in maintenance scheduler: {e}")
                time.sleep(60)  # Wait 1 minute on error
    
    def _execute_task(self, task: MaintenanceTask):
        """Execute a maintenance task."""
        if not task.task_function:
            logger.warning(f"No function defined for task: {task.name}")
            return
        
        logger.info(f"Starting maintenance task: {task.name}")
        start_time = time.time()
        
        try:
            # Execute the task
            result_details = task.task_function()
            
            duration = time.time() - start_time
            
            # Record successful execution
            result = MaintenanceResult(
                task_name=task.name,
                success=True,
                duration_seconds=duration,
                message="Task completed successfully",
                details=result_details or {},
                timestamp=datetime.utcnow()
            )
            
            # Update task timing
            task.last_run = datetime.utcnow()
            task.next_run = task.last_run + timedelta(hours=task.frequency_hours)
            
            logger.info(f"Completed maintenance task: {task.name} in {duration:.2f}s")
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Record failed execution
            result = MaintenanceResult(
                task_name=task.name,
                success=False,
                duration_seconds=duration,
                message=f"Task failed: {str(e)}",
                details={'error': str(e)},
                timestamp=datetime.utcnow()
            )
            
            logger.error(f"Failed maintenance task: {task.name}: {e}")
        
        # Store execution history
        self.execution_history.append(result)
        
        # Keep only last 100 results
        if len(self.execution_history) > 100:
            self.execution_history = self.execution_history[-100:]
    
    def run_task_now(self, task_name: str) -> MaintenanceResult:
        """Run a specific maintenance task immediately."""
        if task_name not in self.tasks:
            raise ValueError(f"Task {task_name} not found")
        
        task = self.tasks[task_name]
        self._execute_task(task)
        
        # Return the latest result for this task
        for result in reversed(self.execution_history):
            if result.task_name == task_name:
                return result
        
        raise RuntimeError(f"No execution result found for task {task_name}")
    
    def get_task_status(self) -> Dict[str, Any]:
        """Get status of all maintenance tasks."""
        status = {
            'scheduler_running': self.scheduler_running,
            'maintenance_enabled': self.maintenance_enabled,
            'total_tasks': len(self.tasks),
            'tasks': []
        }
        
        for task_name, task in self.tasks.items():
            # Get latest execution result
            latest_result = None
            for result in reversed(self.execution_history):
                if result.task_name == task_name:
                    latest_result = result
                    break
            
            task_info = {
                'name': task.name,
                'description': task.description,
                'frequency_hours': task.frequency_hours,
                'enabled': task.enabled,
                'last_run': task.last_run.isoformat() if task.last_run else None,
                'next_run': task.next_run.isoformat() if task.next_run else None,
            }
            
            if latest_result:
                task_info.update({
                    'last_success': latest_result.success,
                    'last_duration': latest_result.duration_seconds,
                    'last_message': latest_result.message
                })
            
            status['tasks'].append(task_info)
        
        return status
    
    # Maintenance Task Functions
    
    def _update_statistics(self) -> Dict[str, Any]:
        """Update database table statistics."""
        results = {'tables_updated': 0, 'errors': []}
        
        try:
            with db.engine.connect() as conn:
                if db.engine.name == 'postgresql':
                    # PostgreSQL: Update statistics
                    conn.execute(text("ANALYZE"))
                    results['tables_updated'] = 'all'
                    
                elif db.engine.name == 'sqlite':
                    # SQLite: Analyze main database
                    conn.execute(text("ANALYZE"))
                    results['tables_updated'] = 'all'
                
                conn.commit()
                
        except Exception as e:
            results['errors'].append(str(e))
            raise
        
        return results
    
    def _maintain_indexes(self) -> Dict[str, Any]:
        """Maintain database indexes."""
        results = {
            'recommendations': 0,
            'high_priority_created': 0,
            'unused_found': 0,
            'errors': []
        }
        
        try:
            # Get index recommendations
            recommendations = db_index_optimizer.analyze_missing_indexes()
            high_priority = [r for r in recommendations if r.estimated_benefit == 'high']
            
            results['recommendations'] = len(recommendations)
            
            # Create high-priority indexes (limit to 3 per run to avoid overload)
            created_count = 0
            for rec in high_priority[:3]:
                try:
                    if db_index_optimizer.create_index_safely(rec):
                        created_count += 1
                except Exception as e:
                    results['errors'].append(f"Failed to create index: {str(e)}")
            
            results['high_priority_created'] = created_count
            
            # Find unused indexes
            unused_indexes = db_index_optimizer.find_unused_indexes()
            results['unused_found'] = len(unused_indexes)
            
            # Log unused indexes (don't auto-drop for safety)
            if unused_indexes:
                unused_names = [idx.index_name for idx in unused_indexes[:5]]
                logger.info(f"Found potentially unused indexes: {', '.join(unused_names)}")
            
        except Exception as e:
            results['errors'].append(str(e))
            raise
        
        return results
    
    def _cleanup_old_data(self) -> Dict[str, Any]:
        """Clean up old temporary and deleted data."""
        results = {
            'deleted_sessions': 0,
            'cleaned_temp_data': 0,
            'errors': []
        }
        
        try:
            with db.engine.connect() as conn:
                # Clean up old sessions (older than 30 days)
                cutoff_date = datetime.utcnow() - timedelta(days=30)
                
                # Check if sessions table exists
                inspector = inspect(db.engine)
                tables = inspector.get_table_names()
                
                if 'sessions' in tables:
                    result = conn.execute(text("""
                        DELETE FROM sessions 
                        WHERE created_at < :cutoff_date
                    """), {'cutoff_date': cutoff_date})
                    results['deleted_sessions'] = result.rowcount
                
                # Clean up soft-deleted songs (older than 90 days)
                if 'songs' in tables:
                    soft_delete_cutoff = datetime.utcnow() - timedelta(days=90)
                    result = conn.execute(text("""
                        DELETE FROM songs 
                        WHERE deleted_at IS NOT NULL 
                        AND deleted_at < :cutoff_date
                    """), {'cutoff_date': soft_delete_cutoff})
                    results['cleaned_temp_data'] += result.rowcount
                
                # Clean up expired password reset tokens
                if 'password_reset_tokens' in tables:
                    result = conn.execute(text("""
                        DELETE FROM password_reset_tokens 
                        WHERE expires_at < :now
                    """), {'now': datetime.utcnow()})
                    results['cleaned_temp_data'] += result.rowcount
                
                conn.commit()
                
        except Exception as e:
            results['errors'].append(str(e))
            raise
        
        return results
    
    def _cleanup_performance_metrics(self) -> Dict[str, Any]:
        """Clean up old performance monitoring data."""
        results = {'metrics_cleared': False}
        
        try:
            # Clear old performance metrics (keep last 7 days of detailed data)
            db_performance.clear_metrics()
            results['metrics_cleared'] = True
            
        except Exception as e:
            results['errors'] = [str(e)]
            raise
        
        return results
    
    def _check_connection_pool_health(self) -> Dict[str, Any]:
        """Check and maintain connection pool health."""
        results = {
            'pool_status': {},
            'warnings': [],
            'actions_taken': []
        }
        
        try:
            # Get current pool status
            pool_status = db_performance.get_connection_pool_status()
            results['pool_status'] = pool_status
            
            # Check for potential issues
            if 'checked_out' in pool_status and 'pool_size' in pool_status:
                usage_ratio = pool_status['checked_out'] / pool_status['pool_size']
                
                if usage_ratio > 0.8:  # More than 80% of connections in use
                    results['warnings'].append(f"High connection pool usage: {usage_ratio:.1%}")
                
                if usage_ratio > 0.95:  # Critical usage
                    results['warnings'].append("Critical connection pool usage - consider increasing pool size")
            
            # Check for invalid connections
            if pool_status.get('invalid', 0) > 0:
                results['warnings'].append(f"Found {pool_status['invalid']} invalid connections")
                
                # Could add automatic cleanup here if needed
                results['actions_taken'].append("Logged invalid connections for investigation")
            
        except Exception as e:
            results['errors'] = [str(e)]
            raise
        
        return results
    
    def _vacuum_analyze_postgresql(self) -> Dict[str, Any]:
        """Vacuum and analyze PostgreSQL tables."""
        from . import db
        
        if db.engine.name != 'postgresql':
            return {'skipped': 'Not a PostgreSQL database'}
        
        results = {
            'tables_vacuumed': 0,
            'tables_analyzed': 0,
            'errors': []
        }
        
        try:
            with db.engine.connect() as conn:
                # Get list of user tables
                tables_result = conn.execute(text("""
                    SELECT tablename FROM pg_tables 
                    WHERE schemaname = 'public'
                """))
                
                tables = [row[0] for row in tables_result]
                
                for table in tables:
                    try:
                        # Vacuum table (reclaim space)
                        conn.execute(text(f"VACUUM {table}"))
                        results['tables_vacuumed'] += 1
                        
                        # Analyze table (update statistics)
                        conn.execute(text(f"ANALYZE {table}"))
                        results['tables_analyzed'] += 1
                        
                    except Exception as e:
                        error_msg = f"Error processing table {table}: {str(e)}"
                        results['errors'].append(error_msg)
                        logger.warning(error_msg)
                
        except Exception as e:
            results['errors'].append(str(e))
            raise
        
        return results
    
    def _register_cli_commands(self, app):
        """Register CLI commands for maintenance management."""
        @app.cli.command()
        def db_maintenance_status():
            """Show database maintenance status."""
            status = self.get_task_status()
            
            print("\n=== Database Maintenance Status ===")
            print(f"Scheduler running: {status['scheduler_running']}")
            print(f"Maintenance enabled: {status['maintenance_enabled']}")
            print(f"Total tasks: {status['total_tasks']}")
            print()
            
            for task in status['tasks']:
                print(f"Task: {task['name']}")
                print(f"  Description: {task['description']}")
                print(f"  Frequency: {task['frequency_hours']} hours")
                print(f"  Enabled: {task['enabled']}")
                print(f"  Last run: {task['last_run'] or 'Never'}")
                print(f"  Next run: {task['next_run'] or 'Not scheduled'}")
                
                if 'last_success' in task:
                    status_emoji = "✓" if task['last_success'] else "✗"
                    print(f"  Last result: {status_emoji} {task['last_message']}")
                    print(f"  Duration: {task['last_duration']:.2f}s")
                
                print()
        
        @app.cli.command()
        @click.argument('task_name')
        def db_run_maintenance(task_name):
            """Run a specific maintenance task now."""
            try:
                result = self.run_task_now(task_name)
                
                status_emoji = "✓" if result.success else "✗"
                print(f"{status_emoji} Task '{task_name}' completed in {result.duration_seconds:.2f}s")
                print(f"Message: {result.message}")
                
                if result.details:
                    print("Details:")
                    for key, value in result.details.items():
                        print(f"  {key}: {value}")
                        
            except ValueError as e:
                print(f"Error: {e}")
                print(f"Available tasks: {', '.join(self.tasks.keys())}")
            except Exception as e:
                print(f"Failed to run task: {e}")
        
        @app.cli.command()
        def db_maintenance_history():
            """Show recent maintenance execution history."""
            if not self.execution_history:
                print("No maintenance history available.")
                return
            
            print("\n=== Recent Maintenance History ===")
            
            # Show last 20 executions
            for result in self.execution_history[-20:]:
                status_emoji = "✓" if result.success else "✗"
                print(f"{status_emoji} {result.task_name} - {result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"   {result.message} ({result.duration_seconds:.2f}s)")
                
                if not result.success and result.details.get('error'):
                    print(f"   Error: {result.details['error']}")
                print()


# Global instance
db_maintenance_manager = DatabaseMaintenanceManager()