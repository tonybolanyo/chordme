"""
Automated monitoring tests that verify alerting on simulated failures and latency conditions.
Tests the monitoring system's ability to detect and respond to issues.
"""

import pytest
import time
import json
import threading
from unittest.mock import patch, MagicMock
from chordme import app as flask_app
from chordme.monitoring import metrics_collector, HealthChecker
from chordme.apm_config import AlertManager


class TestMonitoringAlerts:
    """Test monitoring alerting system."""

    def test_error_rate_threshold_alert(self):
        """Test that error rate threshold triggers alerts."""
        with flask_app.app_context():
            # Setup alert manager
            alert_manager = AlertManager(flask_app)
            
            # Simulate high error rate metrics
            high_error_metrics = {
                'error_rate_percent': 2.5,  # Above 1% threshold
                'response_time_ms': 300,
                'timestamp': '2024-01-01T12:00:00Z'
            }
            
            # Check thresholds
            alerts = alert_manager.check_thresholds(high_error_metrics)
            
            # Should trigger error rate alert
            assert len(alerts) == 1
            assert alerts[0]['metric'] == 'error_rate_percent'
            assert alerts[0]['value'] == 2.5
            assert alerts[0]['threshold'] == 1.0
            assert alerts[0]['severity'] in ['low', 'medium', 'high', 'critical']

    def test_latency_threshold_alert(self):
        """Test that latency threshold triggers alerts."""
        with flask_app.app_context():
            alert_manager = AlertManager(flask_app)
            
            # Simulate high latency metrics
            high_latency_metrics = {
                'error_rate_percent': 0.5,
                'response_time_ms': 750,  # Above 500ms threshold
                'timestamp': '2024-01-01T12:00:00Z'
            }
            
            # Check thresholds
            alerts = alert_manager.check_thresholds(high_latency_metrics)
            
            # Should trigger latency alert
            assert len(alerts) == 1
            assert alerts[0]['metric'] == 'response_time_ms'
            assert alerts[0]['value'] == 750
            assert alerts[0]['threshold'] == 500

    def test_multiple_threshold_alerts(self):
        """Test multiple thresholds being exceeded simultaneously."""
        with flask_app.app_context():
            alert_manager = AlertManager(flask_app)
            
            # Simulate multiple high metrics
            critical_metrics = {
                'error_rate_percent': 3.0,  # Above 1% threshold
                'response_time_ms': 1200,   # Above 500ms threshold
                'cpu_usage_percent': 85,    # Above 80% threshold
                'timestamp': '2024-01-01T12:00:00Z'
            }
            
            # Check thresholds
            alerts = alert_manager.check_thresholds(critical_metrics)
            
            # Should trigger multiple alerts
            assert len(alerts) == 3
            
            # Verify each alert
            alert_metrics = {alert['metric'] for alert in alerts}
            assert 'error_rate_percent' in alert_metrics
            assert 'response_time_ms' in alert_metrics
            assert 'cpu_usage_percent' in alert_metrics

    def test_alert_severity_levels(self):
        """Test that alert severity is calculated correctly."""
        with flask_app.app_context():
            alert_manager = AlertManager(flask_app)
            
            # Test different severity levels
            test_cases = [
                {'value': 1.1, 'threshold': 1.0, 'expected': 'low'},     # 1.1x threshold
                {'value': 1.5, 'threshold': 1.0, 'expected': 'high'},    # 1.5x threshold
                {'value': 2.0, 'threshold': 1.0, 'expected': 'critical'}, # 2.0x threshold
            ]
            
            for case in test_cases:
                severity = alert_manager._get_alert_severity(
                    'test_metric', case['value'], case['threshold']
                )
                assert severity == case['expected']

    @patch('requests.post')
    def test_slack_notification(self, mock_post):
        """Test Slack notification functionality."""
        with flask_app.app_context():
            # Configure Slack webhook
            flask_app.config['SLACK_WEBHOOK_URL'] = 'https://hooks.slack.com/test'
            alert_manager = AlertManager(flask_app)
            
            # Create test alerts
            test_alerts = [{
                'metric': 'error_rate_percent',
                'value': 2.0,
                'threshold': 1.0,
                'severity': 'high',
                'timestamp': '2024-01-01T12:00:00Z'
            }]
            
            # Mock successful response
            mock_post.return_value.status_code = 200
            mock_post.return_value.raise_for_status.return_value = None
            
            # Send alerts
            alert_manager.send_alerts(test_alerts)
            
            # Verify Slack webhook was called
            assert mock_post.called
            call_args = mock_post.call_args
            assert call_args[0][0] == 'https://hooks.slack.com/test'
            
            # Verify payload structure
            payload = json.loads(call_args[1]['data'])
            assert 'attachments' in payload
            assert len(payload['attachments']) == 1

    def test_monitoring_endpoint_alerts(self):
        """Test monitoring endpoints trigger alerts correctly."""
        with flask_app.test_client() as client:
            # Test alert test endpoint
            response = client.post('/api/v1/monitoring/alerts/test', 
                                 json={'type': 'error_rate'})
            
            # Should complete successfully
            assert response.status_code in [200, 503]  # 200 or 503 if alerts triggered
            
            data = json.loads(response.data)
            assert 'status' in data


class TestPerformanceMonitoring:
    """Test performance monitoring capabilities."""

    def test_request_metrics_collection(self):
        """Test that request metrics are collected properly."""
        with flask_app.app_context():
            # Reset metrics
            metrics_collector.reset_metrics()
            
            # Record some test requests
            metrics_collector.record_request('/api/test', 'GET', 200, 0.150)
            metrics_collector.record_request('/api/test', 'POST', 500, 0.300)
            metrics_collector.record_request('/api/test', 'GET', 200, 0.100)
            
            # Get metrics summary
            summary = metrics_collector.get_metrics_summary()
            
            # Verify metrics
            assert summary['total_requests'] == 3
            assert summary['success_requests'] == 2
            assert summary['error_requests'] == 1
            assert summary['error_rate_percent'] == 33.33
            assert summary['average_response_time_ms'] > 0

    def test_health_check_performance(self):
        """Test health check response time monitoring."""
        with flask_app.app_context():
            start_time = time.time()
            
            # Perform health check
            db_health = HealthChecker.check_database()
            app_health = HealthChecker.check_application()
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Health checks should complete quickly
            assert duration < 1.0  # Less than 1 second
            
            # Verify health check results
            assert isinstance(db_health, dict)
            assert isinstance(app_health, dict)
            assert 'status' in db_health
            assert 'status' in app_health

    def test_concurrent_monitoring(self):
        """Test monitoring under concurrent load."""
        with flask_app.app_context():
            metrics_collector.reset_metrics()
            
            def simulate_requests():
                for i in range(10):
                    metrics_collector.record_request(f'/api/test/{i}', 'GET', 200, 0.1)
                    time.sleep(0.01)  # Small delay
            
            # Start multiple threads
            threads = []
            for _ in range(3):
                thread = threading.Thread(target=simulate_requests)
                threads.append(thread)
                thread.start()
            
            # Wait for threads to complete
            for thread in threads:
                thread.join(timeout=5)
            
            # Verify all requests were recorded
            summary = metrics_collector.get_metrics_summary()
            assert summary['total_requests'] == 30
            assert summary['success_requests'] == 30
            assert summary['error_requests'] == 0

    def test_frontend_error_logging(self):
        """Test frontend error logging endpoint."""
        with flask_app.test_client() as client:
            # Simulate frontend error
            error_data = {
                'message': 'Test frontend error',
                'stack': 'Error stack trace',
                'url': 'https://example.com/test',
                'userId': 'test-user-123',
                'timestamp': '2024-01-01T12:00:00Z'
            }
            
            response = client.post('/api/v1/monitoring/frontend-error',
                                 json=error_data,
                                 headers={'Content-Type': 'application/json'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'

    def test_frontend_metrics_logging(self):
        """Test frontend metrics logging endpoint."""
        with flask_app.test_client() as client:
            # Simulate frontend metric
            metric_data = {
                'name': 'LCP',
                'value': 3000,  # Above threshold
                'url': 'https://example.com/test',
                'userId': 'test-user-123',
                'timestamp': '2024-01-01T12:00:00Z'
            }
            
            response = client.post('/api/v1/monitoring/frontend-metrics',
                                 json=metric_data,
                                 headers={'Content-Type': 'application/json'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'


class TestMonitoringIntegration:
    """Test monitoring system integration."""

    def test_detailed_health_endpoint(self):
        """Test detailed health check endpoint."""
        with flask_app.test_client() as client:
            response = client.get('/api/v1/monitoring/health-detailed')
            
            # Should return health information
            assert response.status_code in [200, 503]  # Healthy or unhealthy
            
            data = json.loads(response.data)
            assert 'status' in data
            assert 'checks' in data
            assert 'timestamp' in data
            
            # Verify health check structure
            if 'database' in data['checks']:
                assert 'status' in data['checks']['database']
            if 'application' in data['checks']:
                assert 'status' in data['checks']['application']

    def test_metrics_endpoint(self):
        """Test metrics collection endpoint."""
        with flask_app.test_client() as client:
            response = client.get('/api/v1/monitoring/metrics')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['status'] == 'success'
            assert 'metrics' in data
            assert 'timestamp' in data
            
            # Verify metrics structure
            metrics = data['metrics']
            assert 'total_requests' in metrics
            assert 'error_rate_percent' in metrics
            assert 'average_response_time_ms' in metrics

    def test_metrics_reset_endpoint(self):
        """Test metrics reset functionality."""
        with flask_app.test_client() as client:
            # First record some metrics
            with flask_app.app_context():
                metrics_collector.record_request('/test', 'GET', 200, 0.1)
                initial_requests = metrics_collector.get_metrics_summary()['total_requests']
            
            # Reset metrics
            response = client.post('/api/v1/monitoring/metrics/reset')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            
            # Verify metrics were reset (should only have the reset request itself)
            with flask_app.app_context():
                summary = metrics_collector.get_metrics_summary()
                # After reset, we should have only the POST request from the reset call
                assert summary['total_requests'] <= 1  # Only the reset request itself

    def test_monitoring_with_apm_integration(self):
        """Test monitoring integration with APM tools."""
        with flask_app.app_context():
            # Test APM config initialization
            from chordme.apm_config import APMConfig
            
            apm_config = APMConfig(flask_app)
            
            # Should initialize without error
            assert apm_config is not None
            assert hasattr(apm_config, 'app')
            assert apm_config.app == flask_app

    def test_simulated_failure_conditions(self):
        """Test monitoring response to simulated failure conditions."""
        test_scenarios = [
            {
                'name': 'High Error Rate',
                'metrics': {'error_rate_percent': 5.0, 'response_time_ms': 200},
                'expected_alerts': 1
            },
            {
                'name': 'High Latency',
                'metrics': {'error_rate_percent': 0.5, 'response_time_ms': 1000},
                'expected_alerts': 1
            },
            {
                'name': 'System Overload',
                'metrics': {
                    'error_rate_percent': 3.0,
                    'response_time_ms': 800,
                    'cpu_usage_percent': 95,
                    'memory_usage_percent': 90
                },
                'expected_alerts': 4
            }
        ]
        
        with flask_app.app_context():
            alert_manager = AlertManager(flask_app)
            
            for scenario in test_scenarios:
                alerts = alert_manager.check_thresholds(scenario['metrics'])
                
                # Verify expected number of alerts
                assert len(alerts) == scenario['expected_alerts'], \
                    f"Scenario '{scenario['name']}' failed: expected {scenario['expected_alerts']} alerts, got {len(alerts)}"
                
                # Verify alert content
                for alert in alerts:
                    assert 'metric' in alert
                    assert 'value' in alert
                    assert 'threshold' in alert
                    assert 'severity' in alert
                    assert alert['severity'] in ['low', 'medium', 'high', 'critical']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])