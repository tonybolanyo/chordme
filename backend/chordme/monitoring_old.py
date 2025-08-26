"""
Application Performance Monitoring (APM) and health monitoring for ChordMe.
Provides health checks, metrics collection, and monitoring endpoints.
"""

import time
import json
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, current_app, g
from functools import wraps
from typing import Dict, Any, List
from .logging_config import StructuredLogger

# Create monitoring blueprint
monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/v1/monitoring')

# Initialize monitoring logger
monitor_logger = StructuredLogger('chordme.monitoring')


class HealthChecker:
    """Comprehensive health checking for application components."""
    
    @staticmethod
    def check_database():
        """Check database connectivity and responsiveness."""
        try:
            from .models import db
            start_time = time.time()
            
            # Simple database connectivity test
            db.session.execute('SELECT 1')
            db.session.commit()
            
            duration = time.time() - start_time
            
            return {
                'status': 'healthy',
                'response_time_ms': round(duration * 1000, 2),
                'details': 'Database connection successful'
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Database connection failed'
            }
    
    @staticmethod
    def check_application():
        """Check application health and configuration."""
        try:
            # Basic application health checks
            checks = {
                'flask_app': current_app is not None,
                'database_configured': hasattr(current_app, 'config') and 'SQLALCHEMY_DATABASE_URI' in current_app.config,
                'logging_configured': hasattr(current_app, 'logger_structured')
            }
            
            all_healthy = all(checks.values())
            
            return {
                'status': 'healthy' if all_healthy else 'degraded',
                'checks': checks,
                'details': 'Application health check completed'
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Application health check failed'
            }


class MetricsCollector:
    """Collect and aggregate application metrics."""
    
    def __init__(self):
        self.metrics = {
            'requests': {'total': 0, 'errors': 0, 'success': 0},
            'response_times': [],
            'user_activities': {},
            'last_reset': datetime.utcnow()
        }
    
    def record_request(self, endpoint: str, method: str, status_code: int, duration: float):
        """Record request metrics."""
        self.metrics['requests']['total'] += 1
        
        if 200 <= status_code < 400:
            self.metrics['requests']['success'] += 1
        else:
            self.metrics['requests']['errors'] += 1
        
        # Keep last 100 response times for analysis
        self.metrics['response_times'].append({
            'endpoint': endpoint,
            'method': method,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        if len(self.metrics['response_times']) > 100:
            self.metrics['response_times'] = self.metrics['response_times'][-100:]
    
    def record_user_activity(self, user_id: str, activity_type: str):
        """Record user activity for monitoring."""
        if user_id not in self.metrics['user_activities']:
            self.metrics['user_activities'][user_id] = {}
        
        if activity_type not in self.metrics['user_activities'][user_id]:
            self.metrics['user_activities'][user_id][activity_type] = 0
        
        self.metrics['user_activities'][user_id][activity_type] += 1
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summarized metrics for monitoring dashboard."""
        uptime = datetime.utcnow() - self.metrics['last_reset']
        
        # Calculate average response time
        if self.metrics['response_times']:
            avg_response_time = sum(rt['duration'] for rt in self.metrics['response_times']) / len(self.metrics['response_times'])
        else:
            avg_response_time = 0
        
        # Calculate error rate
        total_requests = self.metrics['requests']['total']
        error_rate = (self.metrics['requests']['errors'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'uptime_seconds': uptime.total_seconds(),
            'total_requests': total_requests,
            'success_requests': self.metrics['requests']['success'],
            'error_requests': self.metrics['requests']['errors'],
            'error_rate_percent': round(error_rate, 2),
            'average_response_time_ms': round(avg_response_time * 1000, 2),
            'active_users': len(self.metrics['user_activities']),
            'last_reset': self.metrics['last_reset'].isoformat()
        }
    
    def reset_metrics(self):
        """Reset metrics collection."""
        self.metrics = {
            'requests': {'total': 0, 'errors': 0, 'success': 0},
            'response_times': [],
            'user_activities': {},
            'last_reset': datetime.utcnow()
        }


# Global metrics collector instance
metrics_collector = MetricsCollector()


def monitor_request_metrics(f):
    """Decorator to monitor request performance and collect metrics."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = f(*args, **kwargs)
            duration = time.time() - start_time
            status_code = getattr(result, 'status_code', 200)
            
            # Record metrics
            from flask import request
            metrics_collector.record_request(
                endpoint=request.endpoint or 'unknown',
                method=request.method,
                status_code=status_code,
                duration=duration
            )
            
            # Log performance data
            if hasattr(current_app, 'logger_performance'):
                current_app.logger_performance.log_request_performance(
                    duration=duration,
                    status_code=status_code,
                    endpoint=request.endpoint
                )
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Record error metrics
            from flask import request
            metrics_collector.record_request(
                endpoint=request.endpoint or 'unknown',
                method=request.method,
                status_code=500,
                duration=duration
            )
            
            # Log error
            monitor_logger.error(
                f"Request failed: {str(e)}",
                endpoint=request.endpoint,
                duration=duration,
                error_type=type(e).__name__
            )
            
            raise
    
    return decorated_function


@monitoring_bp.route('/health-detailed', methods=['GET'])
def health_check_detailed():
    """Comprehensive health check endpoint with detailed information."""
    health_results = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'chordme-backend',
        'version': getattr(current_app, 'version', 'unknown'),
        'checks': {}
    }
    
    # Check database
    db_health = HealthChecker.check_database()
    health_results['checks']['database'] = db_health
    
    # Check application
    app_health = HealthChecker.check_application()
    health_results['checks']['application'] = app_health
    
    # Determine overall status
    statuses = [check['status'] for check in health_results['checks'].values()]
    if 'critical' in statuses or 'unhealthy' in statuses:
        health_results['status'] = 'unhealthy'
        status_code = 503
    elif 'warning' in statuses or 'degraded' in statuses:
        health_results['status'] = 'degraded'
        status_code = 200
    else:
        status_code = 200
    
    # Log health check
    monitor_logger.info(
        f"Health check completed - Status: {health_results['status']}",
        health_status=health_results['status'],
        checks=health_results['checks']
    )
    
    return jsonify(health_results), status_code


@monitoring_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """Get application metrics and performance data."""
    try:
        metrics_summary = metrics_collector.get_metrics_summary()
        
        response = {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': metrics_summary
        }
        
        monitor_logger.info(
            "Metrics requested",
            total_requests=metrics_summary['total_requests'],
            error_rate=metrics_summary['error_rate_percent']
        )
        
        return jsonify(response), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to retrieve metrics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve metrics'
        }), 500


@monitoring_bp.route('/metrics/reset', methods=['POST'])
def reset_metrics():
    """Reset metrics collection (for testing/debugging)."""
    try:
        metrics_collector.reset_metrics()
        
        monitor_logger.info("Metrics reset requested")
        
        return jsonify({
            'status': 'success',
            'message': 'Metrics reset successfully',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to reset metrics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to reset metrics'
        }), 500


def record_user_activity(user_id: str, activity_type: str):
    """Helper function to record user activity."""
    metrics_collector.record_user_activity(user_id, activity_type)
    
    monitor_logger.info(
        f"User activity recorded: {activity_type}",
        user_id=user_id,
        activity_type=activity_type
    )


def setup_monitoring(app):
    """Initialize monitoring for the Flask application."""
    # Register monitoring blueprint
    app.register_blueprint(monitoring_bp)
    
    # Initialize logging if not already done
    if not hasattr(app, 'logger_structured'):
        from .logging_config import setup_logging
        setup_logging(app)
    
    monitor_logger.info("Application monitoring initialized")


class MetricsCollector:
    """Collect and aggregate application metrics."""
    
    def __init__(self):
        self.metrics = {
            'requests': {'total': 0, 'errors': 0, 'success': 0},
            'response_times': [],
            'user_activities': {},
            'last_reset': datetime.utcnow()
        }
    
    def record_request(self, endpoint: str, method: str, status_code: int, duration: float):
        """Record request metrics."""
        self.metrics['requests']['total'] += 1
        
        if 200 <= status_code < 400:
            self.metrics['requests']['success'] += 1
        else:
            self.metrics['requests']['errors'] += 1
        
        # Keep last 100 response times for analysis
        self.metrics['response_times'].append({
            'endpoint': endpoint,
            'method': method,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        if len(self.metrics['response_times']) > 100:
            self.metrics['response_times'] = self.metrics['response_times'][-100:]
    
    def record_user_activity(self, user_id: str, activity_type: str):
        """Record user activity for monitoring."""
        if user_id not in self.metrics['user_activities']:
            self.metrics['user_activities'][user_id] = {}
        
        if activity_type not in self.metrics['user_activities'][user_id]:
            self.metrics['user_activities'][user_id][activity_type] = 0
        
        self.metrics['user_activities'][user_id][activity_type] += 1
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summarized metrics for monitoring dashboard."""
        uptime = datetime.utcnow() - self.metrics['last_reset']
        
        # Calculate average response time
        if self.metrics['response_times']:
            avg_response_time = sum(rt['duration'] for rt in self.metrics['response_times']) / len(self.metrics['response_times'])
        else:
            avg_response_time = 0
        
        # Calculate error rate
        total_requests = self.metrics['requests']['total']
        error_rate = (self.metrics['requests']['errors'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'uptime_seconds': uptime.total_seconds(),
            'total_requests': total_requests,
            'success_requests': self.metrics['requests']['success'],
            'error_requests': self.metrics['requests']['errors'],
            'error_rate_percent': round(error_rate, 2),
            'average_response_time_ms': round(avg_response_time * 1000, 2),
            'active_users': len(self.metrics['user_activities']),
            'last_reset': self.metrics['last_reset'].isoformat()
        }
    
    def reset_metrics(self):
        """Reset metrics collection."""
        self.metrics = {
            'requests': {'total': 0, 'errors': 0, 'success': 0},
            'response_times': [],
            'user_activities': {},
            'last_reset': datetime.utcnow()
        }


# Global metrics collector instance
metrics_collector = MetricsCollector()


def monitor_request_metrics(f):
    """Decorator to monitor request performance and collect metrics."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = f(*args, **kwargs)
            duration = time.time() - start_time
            status_code = getattr(result, 'status_code', 200)
            
            # Record metrics
            from flask import request
            metrics_collector.record_request(
                endpoint=request.endpoint or 'unknown',
                method=request.method,
                status_code=status_code,
                duration=duration
            )
            
            # Log performance data
            if hasattr(current_app, 'logger_performance'):
                current_app.logger_performance.log_request_performance(
                    duration=duration,
                    status_code=status_code,
                    endpoint=request.endpoint
                )
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Record error metrics
            from flask import request
            metrics_collector.record_request(
                endpoint=request.endpoint or 'unknown',
                method=request.method,
                status_code=500,
                duration=duration
            )
            
            # Log error
            monitor_logger.error(
                f"Request failed: {str(e)}",
                endpoint=request.endpoint,
                duration=duration,
                error_type=type(e).__name__
            )
            
            raise
    
    return decorated_function


@monitoring_bp.route('/health', methods=['GET'])
def health_check():
    """Comprehensive health check endpoint."""
    health_results = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'chordme-backend',
        'version': getattr(current_app, 'version', 'unknown'),
        'checks': {}
    }
    
    # Check database
    db_health = HealthChecker.check_database()
    health_results['checks']['database'] = db_health
    
    # Check memory
    memory_health = HealthChecker.check_memory()
    health_results['checks']['memory'] = memory_health
    
    # Check disk
    disk_health = HealthChecker.check_disk()
    health_results['checks']['disk'] = disk_health
    
    # Determine overall status
    statuses = [check['status'] for check in health_results['checks'].values()]
    if 'critical' in statuses or 'unhealthy' in statuses:
        health_results['status'] = 'unhealthy'
        status_code = 503
    elif 'warning' in statuses:
        health_results['status'] = 'degraded'
        status_code = 200
    else:
        status_code = 200
    
    # Log health check
    monitor_logger.info(
        f"Health check completed - Status: {health_results['status']}",
        health_status=health_results['status'],
        checks=health_results['checks']
    )
    
    return jsonify(health_results), status_code


@monitoring_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """Get application metrics and performance data."""
    try:
        metrics_summary = metrics_collector.get_metrics_summary()
        
        response = {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': metrics_summary
        }
        
        monitor_logger.info(
            "Metrics requested",
            total_requests=metrics_summary['total_requests'],
            error_rate=metrics_summary['error_rate_percent']
        )
        
        return jsonify(response), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to retrieve metrics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve metrics'
        }), 500


@monitoring_bp.route('/metrics/reset', methods=['POST'])
def reset_metrics():
    """Reset metrics collection (for testing/debugging)."""
    try:
        metrics_collector.reset_metrics()
        
        monitor_logger.info("Metrics reset requested")
        
        return jsonify({
            'status': 'success',
            'message': 'Metrics reset successfully',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to reset metrics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to reset metrics'
        }), 500


def record_user_activity(user_id: str, activity_type: str):
    """Helper function to record user activity."""
    metrics_collector.record_user_activity(user_id, activity_type)
    
    monitor_logger.info(
        f"User activity recorded: {activity_type}",
        user_id=user_id,
        activity_type=activity_type
    )


def setup_monitoring(app):
    """Initialize monitoring for the Flask application."""
    # Register monitoring blueprint
    app.register_blueprint(monitoring_bp)
    
    # Initialize logging if not already done
    if not hasattr(app, 'logger_structured'):
        from .logging_config import setup_logging
        setup_logging(app)
    
    monitor_logger.info("Application monitoring initialized")