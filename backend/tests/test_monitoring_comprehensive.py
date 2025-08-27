"""
Comprehensive tests for monitoring functionality.
"""

import pytest
import time
import json
from unittest.mock import patch, MagicMock
from flask import Flask, g
from chordme.monitoring import (
    HealthChecker, MetricsCollector, monitor_request_metrics,
    monitoring_bp, setup_monitoring
)


class TestHealthChecker:
    """Test HealthChecker functionality."""
    
    def test_check_database_success(self, app):
        """Test successful database health check."""
        with app.app_context():
            with patch('chordme.monitoring.db') as mock_db:
                mock_session = MagicMock()
                mock_db.session = mock_session
                mock_session.execute.return_value = None
                mock_session.commit.return_value = None
                
                result = HealthChecker.check_database()
                
                assert result['status'] == 'healthy'
                assert 'response_time_ms' in result
                assert result['details'] == 'Database connection successful'
                assert isinstance(result['response_time_ms'], (int, float))
                assert result['response_time_ms'] >= 0
                
    def test_check_database_failure(self, app):
        """Test database health check failure."""
        with app.app_context():
            with patch('chordme.monitoring.db') as mock_db:
                mock_session = MagicMock()
                mock_db.session = mock_session
                mock_session.execute.side_effect = Exception("Database connection failed")
                
                result = HealthChecker.check_database()
                
                assert result['status'] == 'unhealthy'
                assert 'error' in result
                assert result['details'] == 'Database connection failed'
                assert "Database connection failed" in result['error']
                
    def test_check_application_success(self, app):
        """Test successful application health check."""
        with app.app_context():
            with patch('chordme.monitoring.current_app') as mock_app:
                mock_app.config = {'SECRET_KEY': 'test_secret'}
                
                result = HealthChecker.check_application()
                
                assert result['status'] == 'healthy'
                assert result['details'] == 'Application configuration valid'
                assert 'uptime_seconds' in result
                assert isinstance(result['uptime_seconds'], (int, float))
                
    def test_check_application_missing_secret(self, app):
        """Test application health check with missing secret key."""
        with app.app_context():
            with patch('chordme.monitoring.current_app') as mock_app:
                mock_app.config = {}  # Missing SECRET_KEY
                
                result = HealthChecker.check_application()
                
                assert result['status'] == 'unhealthy'
                assert 'error' in result
                assert result['details'] == 'Application configuration invalid'


class TestMetricsCollector:
    """Test MetricsCollector functionality."""
    
    def test_metrics_collector_init(self):
        """Test metrics collector initialization."""
        collector = MetricsCollector()
        
        assert collector.request_counts == {}
        assert collector.response_times == {}
        assert collector.user_activities == {}
        assert collector.start_time <= time.time()
        
    def test_record_request_new_endpoint(self):
        """Test recording request for new endpoint."""
        collector = MetricsCollector()
        
        collector.record_request('/api/v1/songs', 'GET', 200, 0.5)
        
        endpoint_key = 'GET /api/v1/songs'
        assert endpoint_key in collector.request_counts
        assert collector.request_counts[endpoint_key] == 1
        assert endpoint_key in collector.response_times
        assert len(collector.response_times[endpoint_key]) == 1
        assert collector.response_times[endpoint_key][0] == 0.5
        
    def test_record_request_existing_endpoint(self):
        """Test recording multiple requests for same endpoint."""
        collector = MetricsCollector()
        
        # Record multiple requests
        collector.record_request('/api/v1/songs', 'GET', 200, 0.5)
        collector.record_request('/api/v1/songs', 'GET', 200, 0.3)
        collector.record_request('/api/v1/songs', 'GET', 404, 0.1)
        
        endpoint_key = 'GET /api/v1/songs'
        assert collector.request_counts[endpoint_key] == 3
        assert len(collector.response_times[endpoint_key]) == 3
        assert collector.response_times[endpoint_key] == [0.5, 0.3, 0.1]
        
    def test_record_request_different_methods(self):
        """Test recording requests with different HTTP methods."""
        collector = MetricsCollector()
        
        collector.record_request('/api/v1/songs', 'GET', 200, 0.5)
        collector.record_request('/api/v1/songs', 'POST', 201, 0.7)
        collector.record_request('/api/v1/songs', 'PUT', 200, 0.6)
        
        assert 'GET /api/v1/songs' in collector.request_counts
        assert 'POST /api/v1/songs' in collector.request_counts
        assert 'PUT /api/v1/songs' in collector.request_counts
        assert collector.request_counts['GET /api/v1/songs'] == 1
        assert collector.request_counts['POST /api/v1/songs'] == 1
        assert collector.request_counts['PUT /api/v1/songs'] == 1
        
    def test_record_user_activity_new_user(self):
        """Test recording activity for new user."""
        collector = MetricsCollector()
        
        collector.record_user_activity('user123', 'login')
        
        assert 'user123' in collector.user_activities
        assert collector.user_activities['user123']['login'] == 1
        
    def test_record_user_activity_existing_user(self):
        """Test recording multiple activities for same user."""
        collector = MetricsCollector()
        
        collector.record_user_activity('user123', 'login')
        collector.record_user_activity('user123', 'create_song')
        collector.record_user_activity('user123', 'login')  # Duplicate activity
        
        assert collector.user_activities['user123']['login'] == 2
        assert collector.user_activities['user123']['create_song'] == 1
        
    def test_get_metrics_summary_empty(self):
        """Test metrics summary with no data."""
        collector = MetricsCollector()
        
        summary = collector.get_metrics_summary()
        
        assert summary['total_requests'] == 0
        assert summary['unique_endpoints'] == 0
        assert summary['average_response_time'] == 0
        assert summary['active_users'] == 0
        assert 'uptime_seconds' in summary
        assert summary['uptime_seconds'] >= 0
        
    def test_get_metrics_summary_with_data(self):
        """Test metrics summary with actual data."""
        collector = MetricsCollector()
        
        # Add some request data
        collector.record_request('/api/v1/songs', 'GET', 200, 0.5)
        collector.record_request('/api/v1/songs', 'POST', 201, 0.7)
        collector.record_request('/api/v1/users', 'GET', 200, 0.3)
        
        # Add user activity
        collector.record_user_activity('user1', 'login')
        collector.record_user_activity('user2', 'create_song')
        
        summary = collector.get_metrics_summary()
        
        assert summary['total_requests'] == 3
        assert summary['unique_endpoints'] == 2  # GET /api/v1/songs, POST /api/v1/songs, GET /api/v1/users = 2 unique base endpoints
        assert summary['average_response_time'] == (0.5 + 0.7 + 0.3) / 3
        assert summary['active_users'] == 2
        assert 'request_breakdown' in summary
        assert 'popular_activities' in summary
        
    def test_reset_metrics(self):
        """Test resetting metrics data."""
        collector = MetricsCollector()
        
        # Add some data
        collector.record_request('/api/v1/songs', 'GET', 200, 0.5)
        collector.record_user_activity('user1', 'login')
        
        # Reset and verify
        new_start_time = collector.reset_metrics()
        
        assert collector.request_counts == {}
        assert collector.response_times == {}
        assert collector.user_activities == {}
        assert collector.start_time == new_start_time
        assert new_start_time <= time.time()


class TestMonitorRequestMetrics:
    """Test monitor_request_metrics decorator."""
    
    def test_monitor_request_metrics_success(self, app):
        """Test request monitoring with successful request."""
        with app.test_client() as client:
            with patch('chordme.monitoring.MetricsCollector') as mock_collector_class:
                mock_collector = MagicMock()
                mock_collector_class.return_value = mock_collector
                
                @monitor_request_metrics
                def test_endpoint():
                    return {'message': 'success'}, 200
                
                with app.test_request_context('/test', method='GET'):
                    result = test_endpoint()
                    
                    assert result == ({'message': 'success'}, 200)
                    # Verify metrics were recorded
                    mock_collector.record_request.assert_called_once()
                    
    def test_monitor_request_metrics_exception(self, app):
        """Test request monitoring when endpoint raises exception."""
        with app.test_client() as client:
            with patch('chordme.monitoring.MetricsCollector') as mock_collector_class:
                mock_collector = MagicMock()
                mock_collector_class.return_value = mock_collector
                
                @monitor_request_metrics
                def test_endpoint():
                    raise ValueError("Test error")
                
                with app.test_request_context('/test', method='POST'):
                    with pytest.raises(ValueError):
                        test_endpoint()
                    
                    # Verify metrics were still recorded
                    mock_collector.record_request.assert_called_once()
                    
    def test_monitor_request_metrics_timing(self, app):
        """Test that request monitoring records timing correctly."""
        with app.test_client() as client:
            with patch('chordme.monitoring.MetricsCollector') as mock_collector_class:
                mock_collector = MagicMock()
                mock_collector_class.return_value = mock_collector
                
                @monitor_request_metrics
                def slow_endpoint():
                    time.sleep(0.1)  # Simulate slow operation
                    return 'done'
                
                with app.test_request_context('/slow', method='GET'):
                    result = slow_endpoint()
                    
                    assert result == 'done'
                    # Verify timing was recorded
                    mock_collector.record_request.assert_called_once()
                    call_args = mock_collector.record_request.call_args
                    duration = call_args[0][3]  # Fourth argument is duration
                    assert duration >= 0.1  # Should be at least 0.1 seconds


class TestMonitoringBlueprint:
    """Test monitoring blueprint endpoints."""
    
    def test_health_check_detailed_success(self, app):
        """Test detailed health check endpoint."""
        app.register_blueprint(monitoring_bp)
        
        with app.test_client() as client:
            with patch('chordme.monitoring.HealthChecker') as mock_health_checker:
                mock_health_checker.check_database.return_value = {
                    'status': 'healthy',
                    'response_time_ms': 10.0,
                    'details': 'Database connection successful'
                }
                mock_health_checker.check_application.return_value = {
                    'status': 'healthy',
                    'uptime_seconds': 3600,
                    'details': 'Application configuration valid'
                }
                
                response = client.get('/api/v1/monitoring/health/detailed')
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['status'] == 'healthy'
                assert data['overall_health'] == 'healthy'
                assert 'database' in data['checks']
                assert 'application' in data['checks']
                assert data['checks']['database']['status'] == 'healthy'
                assert data['checks']['application']['status'] == 'healthy'
                
    def test_health_check_detailed_partial_failure(self, app):
        """Test detailed health check with partial failure."""
        app.register_blueprint(monitoring_bp)
        
        with app.test_client() as client:
            with patch('chordme.monitoring.HealthChecker') as mock_health_checker:
                mock_health_checker.check_database.return_value = {
                    'status': 'unhealthy',
                    'error': 'Connection failed',
                    'details': 'Database connection failed'
                }
                mock_health_checker.check_application.return_value = {
                    'status': 'healthy',
                    'uptime_seconds': 3600,
                    'details': 'Application configuration valid'
                }
                
                response = client.get('/api/v1/monitoring/health/detailed')
                
                assert response.status_code == 503  # Service Unavailable
                data = response.get_json()
                assert data['status'] == 'error'
                assert data['overall_health'] == 'degraded'
                assert data['checks']['database']['status'] == 'unhealthy'
                assert data['checks']['application']['status'] == 'healthy'
                
    def test_get_metrics_endpoint(self, app):
        """Test metrics endpoint."""
        app.register_blueprint(monitoring_bp)
        
        with app.test_client() as client:
            # Initialize global metrics collector
            with patch('chordme.monitoring.metrics_collector') as mock_collector:
                mock_collector.get_metrics_summary.return_value = {
                    'total_requests': 100,
                    'unique_endpoints': 5,
                    'average_response_time': 0.25,
                    'active_users': 10,
                    'uptime_seconds': 3600,
                    'request_breakdown': {},
                    'popular_activities': {}
                }
                
                response = client.get('/api/v1/monitoring/metrics')
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['status'] == 'success'
                assert 'metrics' in data
                assert data['metrics']['total_requests'] == 100
                assert data['metrics']['active_users'] == 10
                
    def test_reset_metrics_endpoint(self, app):
        """Test metrics reset endpoint."""
        app.register_blueprint(monitoring_bp)
        
        with app.test_client() as client:
            with patch('chordme.monitoring.metrics_collector') as mock_collector:
                mock_collector.reset_metrics.return_value = time.time()
                
                response = client.post('/api/v1/monitoring/metrics/reset')
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['status'] == 'success'
                assert data['message'] == 'Metrics reset successfully'
                assert 'reset_time' in data
                
                # Verify reset was called
                mock_collector.reset_metrics.assert_called_once()


class TestMonitoringIntegration:
    """Test monitoring integration scenarios."""
    
    def test_setup_monitoring_function(self, app):
        """Test setup_monitoring function."""
        # Mock the metrics collector
        with patch('chordme.monitoring.MetricsCollector') as mock_collector_class:
            mock_collector = MagicMock()
            mock_collector_class.return_value = mock_collector
            
            setup_monitoring(app)
            
            # Verify collector was created
            mock_collector_class.assert_called_once()
            
    def test_record_user_activity_function(self, app):
        """Test global record_user_activity function."""
        with app.app_context():
            with patch('chordme.monitoring.metrics_collector') as mock_collector:
                from chordme.monitoring import record_user_activity
                
                record_user_activity('user123', 'login')
                
                mock_collector.record_user_activity.assert_called_once_with('user123', 'login')
                
    def test_metrics_collector_thread_safety(self):
        """Test metrics collector thread safety simulation."""
        collector = MetricsCollector()
        
        # Simulate concurrent requests
        import threading
        
        def record_requests():
            for i in range(100):
                collector.record_request(f'/api/endpoint{i % 10}', 'GET', 200, 0.1)
                
        # Start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=record_requests)
            threads.append(thread)
            thread.start()
            
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
            
        # Verify all requests were recorded
        total_requests = sum(collector.request_counts.values())
        assert total_requests == 500  # 5 threads * 100 requests each
        
    def test_monitoring_with_real_flask_request(self, app):
        """Test monitoring with actual Flask request context."""
        app.register_blueprint(monitoring_bp)
        
        # Setup monitoring
        setup_monitoring(app)
        
        with app.test_client() as client:
            # Make actual request to monitoring endpoint
            response = client.get('/api/v1/monitoring/health/detailed')
            
            # Should get a real response
            assert response.status_code in [200, 503]
            data = response.get_json()
            assert 'status' in data
            assert 'checks' in data
            
    def test_metrics_memory_management(self):
        """Test metrics collector memory management."""
        collector = MetricsCollector()
        
        # Add a large number of different endpoints
        for i in range(1000):
            collector.record_request(f'/api/endpoint{i}', 'GET', 200, 0.1)
            
        # Memory usage should be reasonable
        assert len(collector.request_counts) == 1000
        assert len(collector.response_times) == 1000
        
        # Reset should clear everything
        collector.reset_metrics()
        assert len(collector.request_counts) == 0
        assert len(collector.response_times) == 0
        
    def test_health_check_edge_cases(self, app):
        """Test health check edge cases."""
        with app.app_context():
            # Test with None database
            with patch('chordme.monitoring.db', None):
                result = HealthChecker.check_database()
                assert result['status'] == 'unhealthy'
                
            # Test with database import error
            with patch('chordme.monitoring.db') as mock_db:
                mock_db.session.execute.side_effect = ImportError("No module named 'sqlalchemy'")
                result = HealthChecker.check_database()
                assert result['status'] == 'unhealthy'
                assert 'ImportError' in result['error']