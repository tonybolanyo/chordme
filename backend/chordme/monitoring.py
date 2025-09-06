"""
Application Performance Monitoring (APM) and health monitoring for ChordMe.
Provides health checks, metrics collection, and monitoring endpoints.
"""

import time
import json
from datetime import datetime, timedelta, UTC
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
            from sqlalchemy import text
            start_time = time.time()
            
            # Simple database connectivity test
            db.session.execute(text('SELECT 1'))
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
            'last_reset': datetime.now(UTC)
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
            'timestamp': datetime.now(UTC).isoformat()
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
        uptime = datetime.now(UTC) - self.metrics['last_reset']
        
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
            'last_reset': datetime.now(UTC)
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
        'timestamp': datetime.now(UTC).isoformat(),
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
            'timestamp': datetime.now(UTC).isoformat(),
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
            'timestamp': datetime.now(UTC).isoformat()
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


@monitoring_bp.route('/frontend-error', methods=['POST'])
def log_frontend_error():
    """Endpoint to receive frontend error reports."""
    try:
        from flask import request
        error_data = request.get_json()
        
        # Log frontend error with structured logging
        monitor_logger.error(
            f"Frontend Error: {error_data.get('message', 'Unknown error')}",
            error_type='frontend',
            user_id=error_data.get('userId'),
            url=error_data.get('url'),
            user_agent=error_data.get('userAgent'),
            stack_trace=error_data.get('stack'),
            error_id=error_data.get('errorId'),
            timestamp=error_data.get('timestamp')
        )
        
        # Record in metrics if user is tracked
        if error_data.get('userId'):
            record_user_activity(error_data['userId'], 'frontend_error')
        
        return jsonify({
            'status': 'success',
            'message': 'Frontend error logged successfully'
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to log frontend error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to log frontend error'
        }), 500


@monitoring_bp.route('/frontend-metrics', methods=['POST'])
def log_frontend_metrics():
    """Endpoint to receive frontend performance metrics."""
    try:
        from flask import request
        metric_data = request.get_json()
        
        # Log frontend performance metric
        monitor_logger.info(
            f"Frontend Metric: {metric_data.get('name')} = {metric_data.get('value')}",
            metric_type='frontend_performance',
            metric_name=metric_data.get('name'),
            metric_value=metric_data.get('value'),
            user_id=metric_data.get('userId'),
            url=metric_data.get('url'),
            timestamp=metric_data.get('timestamp')
        )
        
        # Check if metric exceeds alert thresholds
        _check_frontend_metric_thresholds(metric_data)
        
        return jsonify({
            'status': 'success',
            'message': 'Frontend metric logged successfully'
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to log frontend metric: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to log frontend metric'
        }), 500


def _check_frontend_metric_thresholds(metric_data):
    """Check if frontend metrics exceed alert thresholds."""
    from flask import current_app
    
    # Define frontend metric thresholds
    thresholds = {
        'LCP': 2500,  # Largest Contentful Paint (ms)
        'FID': 100,   # First Input Delay (ms)
        'CLS': 0.1,   # Cumulative Layout Shift
        'PageLoadTime': 3000,  # Page load time (ms)
        'APIResponseTime': 1000  # API response time (ms)
    }
    
    metric_name = metric_data.get('name')
    metric_value = metric_data.get('value', 0)
    
    if metric_name in thresholds and metric_value > thresholds[metric_name]:
        # Log threshold exceeded
        monitor_logger.warning(
            f"Frontend metric threshold exceeded: {metric_name} = {metric_value} > {thresholds[metric_name]}",
            metric_name=metric_name,
            metric_value=metric_value,
            threshold=thresholds[metric_name],
            url=metric_data.get('url'),
            user_id=metric_data.get('userId')
        )
        
        # Trigger alert if alert manager is available
        if hasattr(current_app, 'alert_manager'):
            current_app.alert_manager.send_alerts([{
                'metric': f'frontend_{metric_name}',
                'value': metric_value,
                'threshold': thresholds[metric_name],
                'severity': 'medium',
                'timestamp': metric_data.get('timestamp'),
                'source': 'frontend'
            }])


@monitoring_bp.route('/alerts/test', methods=['POST'])
def test_alerts():
    """Test endpoint to trigger sample alerts for monitoring validation."""
    try:
        from flask import request, current_app
        
        # Get test parameters
        data = request.get_json() or {}
        alert_type = data.get('type', 'error_rate')
        
        # Generate test metrics that exceed thresholds
        test_metrics = {
            'error_rate_percent': 5.0 if alert_type == 'error_rate' else 0.5,
            'response_time_ms': 1000 if alert_type == 'latency' else 200,
            'cpu_usage_percent': 90 if alert_type == 'cpu' else 30,
            'timestamp': datetime.now(UTC).isoformat()
        }
        
        # Check thresholds and trigger alerts
        if hasattr(current_app, 'alert_manager'):
            alerts = current_app.alert_manager.check_thresholds(test_metrics)
            if alerts:
                current_app.alert_manager.send_alerts(alerts)
                
                monitor_logger.info(
                    f"Test alerts triggered: {len(alerts)} alerts",
                    alert_type=alert_type,
                    alerts=alerts
                )
                
                return jsonify({
                    'status': 'success',
                    'message': f'Triggered {len(alerts)} test alerts',
                    'alerts': alerts
                }), 200
            else:
                return jsonify({
                    'status': 'success',
                    'message': 'No alerts triggered (metrics within thresholds)',
                    'metrics': test_metrics
                }), 200
        else:
            return jsonify({
                'status': 'warning',
                'message': 'Alert manager not configured'
            }), 200
            
    except Exception as e:
        monitor_logger.error(f"Failed to test alerts: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to test alerts'
        }), 500


def setup_monitoring(app):
    """Initialize monitoring for the Flask application."""
    # Register monitoring blueprint
    app.register_blueprint(monitoring_bp)
    
    # Initialize logging if not already done
    if not hasattr(app, 'logger_structured'):
        from .logging_config import setup_logging
        setup_logging(app)
    
    # Initialize APM and alerting
    try:
        from .apm_config import setup_apm, setup_alerting
        setup_apm(app)
        setup_alerting(app)
        monitor_logger.info("APM and alerting initialized")
    except Exception as e:
        monitor_logger.warning(f"Failed to initialize APM/alerting: {e}")
    
    monitor_logger.info("Application monitoring initialized")