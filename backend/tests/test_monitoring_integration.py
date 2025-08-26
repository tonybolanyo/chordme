"""
Tests for monitoring and health check functionality.
"""
import pytest
import json
import time
from unittest.mock import patch, MagicMock
from flask import Flask
from chordme.monitoring import HealthChecker, MetricsCollector, monitoring_bp, setup_monitoring, record_user_activity


class TestHealthChecker:
    """Test health checking functionality."""
    
    def test_check_database_success(self):
        """Test successful database health check."""
        with patch('chordme.monitoring.HealthChecker.check_database') as mock_check:
            mock_check.return_value = {
                'status': 'healthy',
                'response_time_ms': 5.0,
                'details': 'Database connection successful'
            }
            
            result = HealthChecker.check_database()
            
            assert result['status'] == 'healthy'
            assert result['details'] == 'Database connection successful'
    
    def test_check_database_failure(self):
        """Test database health check failure."""
        with patch('chordme.monitoring.HealthChecker.check_database') as mock_check:
            mock_check.return_value = {
                'status': 'unhealthy',
                'error': 'Connection failed',
                'details': 'Database connection failed'
            }
            
            result = HealthChecker.check_database()
            
            assert result['status'] == 'unhealthy'
            assert result['details'] == 'Database connection failed'
            assert 'Connection failed' in result['error']['message']
    
    def test_check_application_healthy(self):
        """Test application health check when everything is healthy."""
        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
        app.logger_structured = MagicMock()
        
        with app.app_context():
            result = HealthChecker.check_application()
            
            assert result['status'] == 'healthy'
            assert result['checks']['flask_app'] is True
            assert result['checks']['database_configured'] is True
            assert result['checks']['logging_configured'] is True
    
    def test_check_application_degraded(self):
        """Test application health check when some components are missing."""
        app = Flask(__name__)
        # Missing SQLALCHEMY_DATABASE_URI and logger_structured
        
        with app.app_context():
            result = HealthChecker.check_application()
            
            assert result['status'] == 'degraded'
            assert result['checks']['flask_app'] is True
            assert result['checks']['database_configured'] is False
            assert result['checks']['logging_configured'] is False


class TestMetricsCollector:
    """Test metrics collection functionality."""
    
    def test_metrics_collector_initialization(self):
        """Test that metrics collector initializes correctly."""
        collector = MetricsCollector()
        
        assert collector.metrics['requests']['total'] == 0
        assert collector.metrics['requests']['errors'] == 0
        assert collector.metrics['requests']['success'] == 0
        assert collector.metrics['response_times'] == []
        assert collector.metrics['user_activities'] == {}
        assert 'last_reset' in collector.metrics
    
    def test_record_request_success(self):
        """Test recording successful request metrics."""
        collector = MetricsCollector()
        
        collector.record_request('/test', 'GET', 200, 0.5)
        
        assert collector.metrics['requests']['total'] == 1
        assert collector.metrics['requests']['success'] == 1
        assert collector.metrics['requests']['errors'] == 0
        assert len(collector.metrics['response_times']) == 1
        
        response_time = collector.metrics['response_times'][0]
        assert response_time['endpoint'] == '/test'
        assert response_time['method'] == 'GET'
        assert response_time['duration'] == 0.5
    
    def test_record_request_error(self):
        """Test recording error request metrics."""
        collector = MetricsCollector()
        
        collector.record_request('/test', 'POST', 500, 1.2)
        
        assert collector.metrics['requests']['total'] == 1
        assert collector.metrics['requests']['success'] == 0
        assert collector.metrics['requests']['errors'] == 1
    
    def test_record_user_activity(self):
        """Test recording user activity metrics."""
        collector = MetricsCollector()
        
        collector.record_user_activity('user123', 'login')
        collector.record_user_activity('user123', 'view_song')
        collector.record_user_activity('user456', 'create_song')
        
        assert len(collector.metrics['user_activities']) == 2
        assert collector.metrics['user_activities']['user123']['login'] == 1
        assert collector.metrics['user_activities']['user123']['view_song'] == 1
        assert collector.metrics['user_activities']['user456']['create_song'] == 1
    
    def test_get_metrics_summary(self):
        """Test getting metrics summary."""
        collector = MetricsCollector()
        
        # Add some test data
        collector.record_request('/test1', 'GET', 200, 0.5)
        collector.record_request('/test2', 'POST', 404, 0.3)
        collector.record_request('/test3', 'GET', 500, 1.0)
        collector.record_user_activity('user1', 'action1')
        
        summary = collector.get_metrics_summary()
        
        assert summary['total_requests'] == 3
        assert summary['success_requests'] == 1
        assert summary['error_requests'] == 2
        assert summary['error_rate_percent'] == 66.67
        assert summary['average_response_time_ms'] == 600.0  # (0.5 + 0.3 + 1.0) / 3 * 1000
        assert summary['active_users'] == 1
        assert 'uptime_seconds' in summary
        assert 'last_reset' in summary
    
    def test_reset_metrics(self):
        """Test resetting metrics."""
        collector = MetricsCollector()
        
        # Add some data
        collector.record_request('/test', 'GET', 200, 0.5)
        collector.record_user_activity('user1', 'action1')
        
        # Reset
        collector.reset_metrics()
        
        assert collector.metrics['requests']['total'] == 0
        assert collector.metrics['requests']['errors'] == 0
        assert collector.metrics['requests']['success'] == 0
        assert collector.metrics['response_times'] == []
        assert collector.metrics['user_activities'] == {}
    
    def test_response_times_limit(self):
        """Test that response times are limited to last 100 entries."""
        collector = MetricsCollector()
        
        # Add more than 100 entries
        for i in range(150):
            collector.record_request(f'/test{i}', 'GET', 200, 0.1)
        
        assert len(collector.metrics['response_times']) == 100
        # Should keep the last 100 entries
        assert collector.metrics['response_times'][0]['endpoint'] == '/test50'
        assert collector.metrics['response_times'][-1]['endpoint'] == '/test149'


class TestMonitoringEndpoints:
    """Test monitoring HTTP endpoints."""
    
    def test_health_check_detailed_endpoint(self):
        """Test detailed health check endpoint."""
        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
        app.logger_structured = MagicMock()
        app.register_blueprint(monitoring_bp)
        
        client = app.test_client()
        
        with patch('chordme.monitoring.HealthChecker.check_database') as mock_db_check:
            mock_db_check.return_value = {
                'status': 'healthy',
                'response_time_ms': 5.0,
                'details': 'Database connection successful'
            }
            
            response = client.get('/api/v1/monitoring/health-detailed')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'healthy'
            assert data['service'] == 'chordme-backend'
            assert 'timestamp' in data
            assert 'checks' in data
            assert data['checks']['database']['status'] == 'healthy'
            assert data['checks']['application']['status'] == 'healthy'
    
    def test_health_check_detailed_unhealthy(self):
        """Test detailed health check endpoint with unhealthy status."""
        app = Flask(__name__)
        app.register_blueprint(monitoring_bp)
        
        client = app.test_client()
        
        with patch('chordme.monitoring.HealthChecker.check_database') as mock_db_check:
            mock_db_check.return_value = {
                'status': 'unhealthy',
                'error': 'Connection failed',
                'details': 'Database connection failed'
            }
            
            response = client.get('/api/v1/monitoring/health-detailed')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            
            assert data['status'] == 'unhealthy'
            assert data['checks']['database']['status'] == 'unhealthy'
    
    def test_get_metrics_endpoint(self):
        """Test metrics endpoint."""
        app = Flask(__name__)
        app.register_blueprint(monitoring_bp)
        
        client = app.test_client()
        
        with patch('chordme.monitoring.metrics_collector') as mock_collector:
            mock_collector.get_metrics_summary.return_value = {
                'total_requests': 100,
                'error_rate_percent': 5.0,
                'average_response_time_ms': 250.0
            }
            
            response = client.get('/api/v1/monitoring/metrics')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert data['metrics']['total_requests'] == 100
            assert data['metrics']['error_rate_percent'] == 5.0
    
    def test_reset_metrics_endpoint(self):
        """Test metrics reset endpoint."""
        app = Flask(__name__)
        app.register_blueprint(monitoring_bp)
        
        client = app.test_client()
        
        with patch('chordme.monitoring.metrics_collector') as mock_collector:
            response = client.post('/api/v1/monitoring/metrics/reset')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert 'Metrics reset successfully' in data['message']
            mock_collector.reset_metrics.assert_called_once()


class TestMonitoringIntegration:
    """Test monitoring integration functions."""
    
    def test_record_user_activity(self):
        """Test record_user_activity helper function."""
        with patch('chordme.monitoring.metrics_collector') as mock_collector:
            with patch('chordme.monitoring.monitor_logger') as mock_logger:
                record_user_activity('user123', 'login')
                
                mock_collector.record_user_activity.assert_called_once_with('user123', 'login')
                mock_logger.info.assert_called_once()
    
    def test_setup_monitoring(self):
        """Test monitoring setup."""
        app = Flask(__name__)
        
        with patch('chordme.monitoring.monitor_logger') as mock_logger:
            setup_monitoring(app)
            
            # Check that blueprint is registered
            assert any(bp.name == 'monitoring' for bp in app.blueprints.values())
            
            # Check that logging setup is called if needed
            mock_logger.info.assert_called_with("Application monitoring initialized")


if __name__ == '__main__':
    pytest.main([__file__])