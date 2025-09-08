"""
Database Performance API Routes

This module provides REST API endpoints for database performance monitoring,
optimization, and maintenance management.
"""

import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flasgger import swag_from

from .database_performance import db_performance
from .database_indexing import db_index_optimizer
from .read_replicas import read_replica_manager
from .database_maintenance import db_maintenance_manager
from .database_backup import db_backup_manager
from .permission_helpers import admin_required

logger = logging.getLogger(__name__)

# Create blueprint for database performance routes
db_perf_bp = Blueprint('db_performance', __name__, url_prefix='/api/v1/admin/database')


@db_perf_bp.route('/performance/stats', methods=['GET'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Get database performance statistics',
    'description': 'Retrieve comprehensive database performance metrics including query statistics and slow queries',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'limit',
            'in': 'query',
            'type': 'integer',
            'default': 50,
            'description': 'Maximum number of query statistics to return'
        },
        {
            'name': 'slow_query_limit',
            'in': 'query',
            'type': 'integer',
            'default': 20,
            'description': 'Maximum number of slow queries to return'
        }
    ],
    'responses': {
        200: {
            'description': 'Database performance statistics',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'query_statistics': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'query_hash': {'type': 'string'},
                                        'sql': {'type': 'string'},
                                        'count': {'type': 'integer'},
                                        'avg_duration': {'type': 'number'},
                                        'max_duration': {'type': 'number'},
                                        'total_duration': {'type': 'number'}
                                    }
                                }
                            },
                            'slow_queries': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'sql': {'type': 'string'},
                                        'duration': {'type': 'number'},
                                        'timestamp': {'type': 'string'},
                                        'endpoint': {'type': 'string'},
                                        'user_id': {'type': 'integer'}
                                    }
                                }
                            },
                            'connection_pool': {
                                'type': 'object',
                                'properties': {
                                    'pool_size': {'type': 'integer'},
                                    'checked_in': {'type': 'integer'},
                                    'checked_out': {'type': 'integer'},
                                    'overflow': {'type': 'integer'},
                                    'invalid': {'type': 'integer'}
                                }
                            },
                            'analysis': {
                                'type': 'object',
                                'properties': {
                                    'total_queries': {'type': 'integer'},
                                    'unique_queries': {'type': 'integer'},
                                    'slow_queries_count': {'type': 'integer'},
                                    'avg_query_time': {'type': 'number'},
                                    'recommendations': {'type': 'array'}
                                }
                            }
                        }
                    }
                }
            }
        },
        401: {'description': 'Authentication required'},
        403: {'description': 'Admin access required'}
    }
})
def get_performance_stats():
    """Get comprehensive database performance statistics."""
    try:
        limit = request.args.get('limit', 50, type=int)
        slow_query_limit = request.args.get('slow_query_limit', 20, type=int)
        
        # Get performance data
        query_stats = db_performance.get_query_statistics(limit)
        slow_queries = db_performance.get_slow_queries(slow_query_limit)
        pool_status = db_performance.get_connection_pool_status()
        analysis = db_performance.analyze_query_patterns()
        
        return jsonify({
            'status': 'success',
            'data': {
                'query_statistics': query_stats,
                'slow_queries': slow_queries,
                'connection_pool': pool_status,
                'analysis': analysis,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to retrieve performance statistics',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/indexes/analysis', methods=['GET'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Analyze database indexes',
    'description': 'Get index recommendations and usage statistics for database optimization',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Index analysis results',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'recommendations': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'table_name': {'type': 'string'},
                                        'columns': {'type': 'array', 'items': {'type': 'string'}},
                                        'index_type': {'type': 'string'},
                                        'reasoning': {'type': 'string'},
                                        'estimated_benefit': {'type': 'string'},
                                        'sql_statement': {'type': 'string'}
                                    }
                                }
                            },
                            'usage_stats': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'index_name': {'type': 'string'},
                                        'table_name': {'type': 'string'},
                                        'scans': {'type': 'integer'},
                                        'size_mb': {'type': 'number'}
                                    }
                                }
                            },
                            'unused_indexes': {'type': 'array'},
                            'maintenance_plan': {'type': 'object'}
                        }
                    }
                }
            }
        }
    }
})
def analyze_indexes():
    """Analyze database indexes and provide optimization recommendations."""
    try:
        # Get index analysis data
        recommendations = db_index_optimizer.analyze_missing_indexes()
        usage_stats = db_index_optimizer.get_index_usage_stats()
        unused_indexes = db_index_optimizer.find_unused_indexes()
        maintenance_plan = db_index_optimizer.generate_index_maintenance_plan()
        
        # Convert dataclasses to dictionaries for JSON serialization
        recommendations_data = []
        for rec in recommendations:
            recommendations_data.append({
                'table_name': rec.table_name,
                'columns': rec.columns,
                'index_type': rec.index_type,
                'reasoning': rec.reasoning,
                'estimated_benefit': rec.estimated_benefit,
                'sql_statement': rec.sql_statement
            })
        
        usage_stats_data = []
        for stat in usage_stats:
            usage_stats_data.append({
                'index_name': stat.index_name,
                'table_name': stat.table_name,
                'scans': stat.scans,
                'tuples_read': stat.tuples_read,
                'tuples_fetched': stat.tuples_fetched,
                'size_mb': stat.size_mb,
                'last_used': stat.last_used.isoformat() if stat.last_used else None
            })
        
        unused_indexes_data = []
        for unused in unused_indexes:
            unused_indexes_data.append({
                'index_name': unused.index_name,
                'table_name': unused.table_name,
                'scans': unused.scans,
                'size_mb': unused.size_mb
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'recommendations': recommendations_data,
                'usage_stats': usage_stats_data,
                'unused_indexes': unused_indexes_data,
                'maintenance_plan': maintenance_plan,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error analyzing indexes: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to analyze database indexes',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/indexes/create', methods=['POST'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Create a database index',
    'description': 'Create a new database index based on recommendations',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['sql_statement'],
                'properties': {
                    'sql_statement': {
                        'type': 'string',
                        'description': 'SQL statement to create the index'
                    },
                    'table_name': {'type': 'string', 'description': 'Target table name'},
                    'columns': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Index columns'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Index created successfully'},
        400: {'description': 'Invalid SQL statement'},
        500: {'description': 'Failed to create index'}
    }
})
def create_index():
    """Create a database index."""
    try:
        data = request.get_json()
        
        if not data or 'sql_statement' not in data:
            return jsonify({
                'status': 'error',
                'error': {
                    'message': 'SQL statement is required',
                    'retryable': False
                }
            }), 400
        
        # Create index recommendation object
        from .database_indexing import IndexRecommendation
        recommendation = IndexRecommendation(
            table_name=data.get('table_name', 'unknown'),
            columns=data.get('columns', []),
            index_type='btree',
            reasoning='Manual creation',
            estimated_benefit='unknown',
            sql_statement=data['sql_statement']
        )
        
        # Create the index
        success = db_index_optimizer.create_index_safely(recommendation)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Index created successfully',
                'data': {
                    'sql_statement': data['sql_statement'],
                    'created_at': datetime.utcnow().isoformat()
                }
            })
        else:
            return jsonify({
                'status': 'error',
                'error': {
                    'message': 'Failed to create index',
                    'retryable': True
                }
            }), 500
            
    except Exception as e:
        logger.error(f"Error creating index: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': f'Failed to create index: {str(e)}',
                'retryable': False
            }
        }), 500


@db_perf_bp.route('/replicas/status', methods=['GET'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Get read replica status',
    'description': 'Get status and health information for all configured read replicas',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Read replica status',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'total_replicas': {'type': 'integer'},
                            'healthy_replicas': {'type': 'integer'},
                            'load_balancing_strategy': {'type': 'string'},
                            'replicas': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'name': {'type': 'string'},
                                        'url': {'type': 'string'},
                                        'weight': {'type': 'integer'},
                                        'enabled': {'type': 'boolean'},
                                        'is_healthy': {'type': 'boolean'},
                                        'response_time_ms': {'type': 'number'},
                                        'replication_lag_seconds': {'type': 'number'},
                                        'active_connections': {'type': 'integer'}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
})
def get_replica_status():
    """Get read replica status and health information."""
    try:
        status = read_replica_manager.get_replica_status()
        
        return jsonify({
            'status': 'success',
            'data': status
        })
        
    except Exception as e:
        logger.error(f"Error getting replica status: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to retrieve replica status',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/replicas/<replica_name>/health', methods=['POST'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Check read replica health',
    'description': 'Perform a health check on a specific read replica',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'replica_name',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': 'Name of the replica to check'
        }
    ],
    'responses': {
        200: {'description': 'Health check completed'},
        404: {'description': 'Replica not found'},
        500: {'description': 'Health check failed'}
    }
})
def check_replica_health(replica_name):
    """Perform health check on a specific read replica."""
    try:
        # Check if replica exists
        if replica_name not in read_replica_manager.replicas:
            return jsonify({
                'status': 'error',
                'error': {
                    'message': f'Replica {replica_name} not found',
                    'retryable': False
                }
            }), 404
        
        # Perform health check
        health = read_replica_manager.check_replica_health(replica_name)
        
        health_data = {
            'name': health.name,
            'is_healthy': health.is_healthy,
            'last_check': health.last_check.isoformat(),
            'response_time_ms': health.response_time_ms,
            'replication_lag_seconds': health.replication_lag_seconds,
            'error_message': health.error_message
        }
        
        return jsonify({
            'status': 'success',
            'data': health_data
        })
        
    except Exception as e:
        logger.error(f"Error checking replica health: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': f'Failed to check replica health: {str(e)}',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/maintenance/status', methods=['GET'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Get database maintenance status',
    'description': 'Get status of all database maintenance tasks',
    'security': [{'Bearer': []}],
    'responses': {
        200: {'description': 'Maintenance status retrieved successfully'}
    }
})
def get_maintenance_status():
    """Get database maintenance task status."""
    try:
        status = db_maintenance_manager.get_task_status()
        
        return jsonify({
            'status': 'success',
            'data': status
        })
        
    except Exception as e:
        logger.error(f"Error getting maintenance status: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to retrieve maintenance status',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/maintenance/tasks/<task_name>/run', methods=['POST'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Run maintenance task',
    'description': 'Execute a specific database maintenance task immediately',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'task_name',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': 'Name of the maintenance task to run'
        }
    ],
    'responses': {
        200: {'description': 'Task executed successfully'},
        404: {'description': 'Task not found'},
        500: {'description': 'Task execution failed'}
    }
})
def run_maintenance_task(task_name):
    """Run a specific maintenance task immediately."""
    try:
        # Check if task exists
        if task_name not in db_maintenance_manager.tasks:
            return jsonify({
                'status': 'error',
                'error': {
                    'message': f'Maintenance task {task_name} not found',
                    'retryable': False
                }
            }), 404
        
        # Run the task
        result = db_maintenance_manager.run_task_now(task_name)
        
        result_data = {
            'task_name': result.task_name,
            'success': result.success,
            'duration_seconds': result.duration_seconds,
            'message': result.message,
            'details': result.details,
            'timestamp': result.timestamp.isoformat()
        }
        
        return jsonify({
            'status': 'success',
            'data': result_data
        })
        
    except Exception as e:
        logger.error(f"Error running maintenance task: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': f'Failed to run maintenance task: {str(e)}',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/performance/clear-metrics', methods=['POST'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Clear performance metrics',
    'description': 'Clear all collected database performance metrics',
    'security': [{'Bearer': []}],
    'responses': {
        200: {'description': 'Metrics cleared successfully'}
    }
})
def clear_performance_metrics():
    """Clear all performance metrics."""
    try:
        db_performance.clear_metrics()
        
        return jsonify({
            'status': 'success',
            'message': 'Performance metrics cleared successfully',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error clearing performance metrics: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to clear performance metrics',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/health', methods=['GET'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Database health check',
    'description': 'Comprehensive database health and performance check',
    'security': [{'Bearer': []}],
    'responses': {
        200: {'description': 'Database health status'}
    }
})
def database_health_check():
    """Comprehensive database health check."""
    try:
        # Get connection pool status
        pool_status = db_performance.get_connection_pool_status()
        
        # Get replica status
        replica_status = read_replica_manager.get_replica_status()
        
        # Get maintenance status
        maintenance_status = db_maintenance_manager.get_task_status()
        
        # Analyze recent performance
        analysis = db_performance.analyze_query_patterns()
        
        # Determine overall health
        health_score = 100
        warnings = []
        
        # Check connection pool health
        if pool_status.get('invalid', 0) > 0:
            health_score -= 10
            warnings.append(f"Found {pool_status['invalid']} invalid connections")
        
        pool_usage = 0
        if pool_status.get('pool_size', 0) > 0:
            pool_usage = pool_status.get('checked_out', 0) / pool_status['pool_size']
            if pool_usage > 0.9:
                health_score -= 15
                warnings.append(f"High connection pool usage: {pool_usage:.1%}")
        
        # Check replica health
        total_replicas = replica_status.get('total_replicas', 0)
        healthy_replicas = replica_status.get('healthy_replicas', 0)
        if total_replicas > 0 and healthy_replicas < total_replicas:
            health_score -= 20
            warnings.append(f"Only {healthy_replicas}/{total_replicas} replicas are healthy")
        
        # Check slow queries
        slow_query_count = analysis.get('slow_queries_count', 0)
        if slow_query_count > 100:  # More than 100 slow queries
            health_score -= 10
            warnings.append(f"High number of slow queries: {slow_query_count}")
        
        # Check average query time
        avg_query_time = analysis.get('avg_query_time', 0)
        if avg_query_time > 0.1:  # Average query time > 100ms
            health_score -= 10
            warnings.append(f"High average query time: {avg_query_time:.3f}s")
        
        # Determine health status
        if health_score >= 90:
            health_status = 'excellent'
        elif health_score >= 75:
            health_status = 'good'
        elif health_score >= 60:
            health_status = 'fair'
        else:
            health_status = 'poor'
        
        return jsonify({
            'status': 'success',
            'data': {
                'health_status': health_status,
                'health_score': health_score,
                'warnings': warnings,
                'connection_pool': pool_status,
                'replicas': replica_status,
                'maintenance': {
                    'scheduler_running': maintenance_status['scheduler_running'],
                    'total_tasks': maintenance_status['total_tasks']
                },
                'performance': {
                    'total_queries': analysis['total_queries'],
                    'slow_queries_count': analysis['slow_queries_count'],
                    'avg_query_time': analysis['avg_query_time']
                },
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error performing database health check: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to perform database health check',
                'retryable': True
            }
        }), 500


# Error handlers for the blueprint
@db_perf_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors for database performance routes."""
    return jsonify({
        'status': 'error',
        'error': {
            'message': 'Database performance endpoint not found',
            'retryable': False
        }
    }), 404


@db_perf_bp.route('/backup/create', methods=['POST'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Create database backup',
    'description': 'Create a new database backup with optional configuration',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': False,
            'schema': {
                'type': 'object',
                'properties': {
                    'backup_type': {
                        'type': 'string',
                        'enum': ['full', 'incremental', 'differential'],
                        'default': 'full'
                    },
                    'compression_enabled': {'type': 'boolean', 'default': True},
                    'verify_backup': {'type': 'boolean', 'default': True}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Backup created successfully'},
        500: {'description': 'Backup creation failed'}
    }
})
def create_backup():
    """Create a database backup."""
    try:
        data = request.get_json() or {}
        
        backup_type = data.get('backup_type', 'full')
        
        # Create backup configuration if custom settings provided
        config = None
        if any(key in data for key in ['compression_enabled', 'verify_backup']):
            from .database_backup import BackupConfig
            config = BackupConfig(
                backup_type=backup_type,
                compression_enabled=data.get('compression_enabled', True),
                verify_backup=data.get('verify_backup', True)
            )
        
        # Create backup
        metadata = db_backup_manager.create_backup(backup_type, config)
        
        return jsonify({
            'status': 'success',
            'message': 'Backup created successfully',
            'data': {
                'backup_id': metadata.backup_id,
                'backup_type': metadata.backup_type,
                'timestamp': metadata.timestamp.isoformat(),
                'file_path': metadata.file_path,
                'file_size_bytes': metadata.file_size_bytes,
                'file_size_mb': metadata.file_size_bytes / (1024 * 1024),
                'checksum': metadata.checksum,
                'compression_ratio': metadata.compression_ratio,
                'verification_status': metadata.verification_status,
                'backup_duration_seconds': metadata.backup_duration_seconds
            }
        })
        
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': f'Failed to create backup: {str(e)}',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/backup/status', methods=['GET'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Get backup status',
    'description': 'Get comprehensive backup status and statistics',
    'security': [{'Bearer': []}],
    'responses': {
        200: {'description': 'Backup status retrieved successfully'}
    }
})
def get_backup_status():
    """Get database backup status."""
    try:
        status = db_backup_manager.get_backup_status()
        
        return jsonify({
            'status': 'success',
            'data': status
        })
        
    except Exception as e:
        logger.error(f"Error getting backup status: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to retrieve backup status',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/backup/list', methods=['GET'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'List database backups',
    'description': 'List recent database backups with metadata',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'limit',
            'in': 'query',
            'type': 'integer',
            'default': 20,
            'description': 'Maximum number of backups to return'
        }
    ],
    'responses': {
        200: {'description': 'Backup list retrieved successfully'}
    }
})
def list_backups():
    """List recent database backups."""
    try:
        limit = request.args.get('limit', 20, type=int)
        backups = db_backup_manager.list_backups(limit)
        
        return jsonify({
            'status': 'success',
            'data': {
                'backups': backups,
                'total_shown': len(backups)
            }
        })
        
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Failed to list backups',
                'retryable': True
            }
        }), 500


@db_perf_bp.route('/backup/<backup_id>/restore', methods=['POST'])
@admin_required
@swag_from({
    'tags': ['Database Performance'],
    'summary': 'Restore from backup',
    'description': 'Restore database from a specific backup',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'backup_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': 'ID of the backup to restore from'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': False,
            'schema': {
                'type': 'object',
                'properties': {
                    'target_database': {
                        'type': 'string',
                        'description': 'Target database name or path (optional)'
                    }
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Restore completed successfully'},
        404: {'description': 'Backup not found'},
        500: {'description': 'Restore failed'}
    }
})
def restore_backup(backup_id):
    """Restore database from backup."""
    try:
        data = request.get_json() or {}
        target_database = data.get('target_database')
        
        # Perform restore
        success = db_backup_manager.restore_backup(backup_id, target_database)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': f'Database restored successfully from backup {backup_id}',
                'data': {
                    'backup_id': backup_id,
                    'target_database': target_database,
                    'restored_at': datetime.utcnow().isoformat()
                }
            })
        else:
            return jsonify({
                'status': 'error',
                'error': {
                    'message': 'Restore operation failed',
                    'retryable': True
                }
            }), 500
            
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'error': {
                'message': str(e),
                'retryable': False
            }
        }), 404
        
    except Exception as e:
        logger.error(f"Error restoring backup: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': f'Failed to restore backup: {str(e)}',
                'retryable': True
            }
        }), 500


@db_perf_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors for database performance routes."""
    return jsonify({
        'status': 'error',
        'error': {
            'message': 'Internal database performance error',
            'retryable': True
        }
    }), 500