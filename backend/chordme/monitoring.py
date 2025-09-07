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


@monitoring_bp.route('/performance-metrics', methods=['POST'])
def receive_performance_metrics():
    """Receive performance metrics from frontend monitoring."""
    try:
        from flask import request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        # Store performance metrics
        performance_metrics_store.store_metrics(data)
        
        # Check for critical alerts
        alerts = data.get('metrics', {}).get('alerts', [])
        critical_alerts = [a for a in alerts if a.get('severity') == 'critical']
        
        if critical_alerts:
            monitor_logger.warning(
                f"Critical performance alerts received: {len(critical_alerts)}",
                critical_alerts=critical_alerts
            )
        
        return jsonify({
            'status': 'success',
            'message': 'Performance metrics stored successfully',
            'timestamp': datetime.now(UTC).isoformat()
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to store performance metrics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to store performance metrics'
        }), 500


@monitoring_bp.route('/frontend-error', methods=['POST'])
def receive_frontend_error():
    """Receive error reports from frontend monitoring."""
    try:
        from flask import request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No error data provided'
            }), 400
        
        # Log frontend error
        monitor_logger.error(
            f"Frontend error reported: {data.get('message', 'Unknown error')}",
            frontend_error=True,
            url=data.get('url'),
            user_agent=data.get('userAgent'),
            user_id=data.get('userId'),
            error_details=data
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Error report received',
            'timestamp': datetime.now(UTC).isoformat()
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to process frontend error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to process error report'
        }), 500


@monitoring_bp.route('/frontend-metrics', methods=['POST'])
def receive_frontend_metrics():
    """Receive individual performance metrics from frontend."""
    try:
        from flask import request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No metric data provided'
            }), 400
        
        # Store individual metric
        performance_metrics_store.store_individual_metric(data)
        
        return jsonify({
            'status': 'success',
            'message': 'Metric stored successfully',
            'timestamp': datetime.now(UTC).isoformat()
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to store frontend metric: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to store metric'
        }), 500


class PerformanceMetricsStore:
    """Storage for performance metrics with retention policies."""
    
    def __init__(self):
        self.metrics = []
        self.max_metrics = 10000  # Keep last 10k metrics
        self.cleanup_interval = 3600  # Clean up every hour
        self.last_cleanup = time.time()
    
    def store_metrics(self, data: Dict[str, Any]):
        """Store complete performance metrics data."""
        metrics_entry = {
            'timestamp': time.time(),
            'data': data
        }
        
        self.metrics.append(metrics_entry)
        self._cleanup_if_needed()
    
    def store_individual_metric(self, metric: Dict[str, Any]):
        """Store individual performance metric."""
        metric_entry = {
            'timestamp': time.time(),
            'metric': metric
        }
        
        self.metrics.append(metric_entry)
        self._cleanup_if_needed()
    
    def get_recent_metrics(self, seconds: int = 300) -> List[Dict[str, Any]]:
        """Get metrics from the last N seconds."""
        cutoff_time = time.time() - seconds
        return [m for m in self.metrics if m['timestamp'] > cutoff_time]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get summary of recent performance metrics."""
        recent_metrics = self.get_recent_metrics(300)  # Last 5 minutes
        
        if not recent_metrics:
            return {
                'status': 'no_data',
                'message': 'No recent performance data available'
            }
        
        # Extract collaboration latency data
        collaboration_latencies = []
        audio_sync_deviations = []
        memory_usage_ratios = []
        
        for entry in recent_metrics:
            if 'data' in entry and 'summary' in entry['data']:
                summary = entry['data']['summary']
                if 'collaboration' in summary:
                    collaboration_latencies.append(summary['collaboration']['averageLatency'])
                if 'audioSync' in summary:
                    audio_sync_deviations.append(summary['audioSync']['averageAccuracy'])
                if 'memory' in summary:
                    memory_usage_ratios.append(summary['memory']['usageRatio'])
        
        # Calculate averages
        avg_collaboration_latency = sum(collaboration_latencies) / len(collaboration_latencies) if collaboration_latencies else 0
        avg_audio_sync_deviation = sum(audio_sync_deviations) / len(audio_sync_deviations) if audio_sync_deviations else 0
        avg_memory_usage = sum(memory_usage_ratios) / len(memory_usage_ratios) if memory_usage_ratios else 0
        
        return {
            'status': 'ok',
            'metrics_count': len(recent_metrics),
            'collaboration_latency_avg': round(avg_collaboration_latency, 2),
            'collaboration_latency_threshold_met': avg_collaboration_latency <= 100,
            'audio_sync_accuracy_avg': round(avg_audio_sync_deviation, 2),
            'audio_sync_threshold_met': avg_audio_sync_deviation <= 50,
            'memory_usage_avg': round(avg_memory_usage, 3),
            'memory_usage_healthy': avg_memory_usage <= 0.9,
            'timestamp': datetime.now(UTC).isoformat()
        }
    
    def _cleanup_if_needed(self):
        """Clean up old metrics if needed."""
        current_time = time.time()
        
        # Check if cleanup is needed
        if (current_time - self.last_cleanup > self.cleanup_interval or 
            len(self.metrics) > self.max_metrics):
            
            # Keep only recent metrics
            cutoff_time = current_time - (24 * 3600)  # Keep last 24 hours
            self.metrics = [m for m in self.metrics if m['timestamp'] > cutoff_time]
            
            # If still too many, keep only the most recent
            if len(self.metrics) > self.max_metrics:
                self.metrics = self.metrics[-self.max_metrics:]
            
            self.last_cleanup = current_time


# Initialize performance metrics store
performance_metrics_store = PerformanceMetricsStore()


@monitoring_bp.route('/performance-summary', methods=['GET'])
def get_performance_summary():
    """Get summary of recent performance metrics."""
    try:
        summary = performance_metrics_store.get_performance_summary()
        
        return jsonify({
            'status': 'success',
            'summary': summary,
            'timestamp': datetime.now(UTC).isoformat()
        }), 200
        
    except Exception as e:
        monitor_logger.error(f"Failed to get performance summary: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get performance summary'
        }), 500


@monitoring_bp.route('/websocket-metrics', methods=['GET'])
def get_websocket_metrics():
    """Get WebSocket performance metrics."""
    try:
        from . import websocket_server
        
        if hasattr(current_app, 'websocket_server'):
            ws_metrics = current_app.websocket_server.get_performance_metrics()
            
            return jsonify({
                'status': 'success',
                'metrics': ws_metrics,
                'timestamp': datetime.now(UTC).isoformat()
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'WebSocket server not available'
            }), 503
            
    except Exception as e:
        monitor_logger.error(f"Failed to get WebSocket metrics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get WebSocket metrics'
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