"""
Integration tests for Performance Monitoring System

Tests the complete performance monitoring pipeline including:
- Performance metric collection
- Alert generation and notifications
- Dashboard data aggregation
- Regression testing integration
"""

import pytest
import time
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch

from chordme.performance_alerts import (
    AlertManager, PerformanceAlert, AlertType, AlertSeverity, 
    NotificationChannel, alert_manager
)
from chordme.monitoring import PerformanceMetricsStore, performance_metrics_store


class TestPerformanceMonitoringIntegration:
    """Integration tests for the complete performance monitoring system."""

    def setup_method(self):
        """Setup for each test method."""
        # Clear any existing alerts and metrics
        alert_manager.alerts.clear()
        alert_manager.alert_history.clear()
        alert_manager.notification_channels.clear()
        performance_metrics_store.metrics.clear()

    def test_end_to_end_performance_monitoring(self):
        """Test the complete performance monitoring workflow."""
        # 1. Setup notification channels
        email_channel = NotificationChannel(
            name="test_email",
            type="email",
            config={
                'smtp_host': 'localhost',
                'from_email': 'test@example.com',
                'to_emails': ['admin@example.com']
            }
        )
        alert_manager.add_notification_channel(email_channel)

        # 2. Simulate performance metrics that exceed thresholds
        test_metrics = {
            'collaboration': {
                'average_latency': 120,  # Exceeds 100ms critical threshold
                'recent_operations': 5,
                'within_threshold': False
            },
            'audio_sync': {
                'average_accuracy': 60,  # Exceeds 50ms critical threshold
                'recent_measurements': 8,
                'within_threshold': False
            },
            'memory': {
                'usage_ratio': 0.85,  # Exceeds 80% warning threshold
                'heap_used': 1700000000,
                'heap_limit': 2000000000,
                'within_threshold': False
            }
        }

        # 3. Store metrics (this should trigger alert evaluation)
        performance_metrics_store.store_metrics({'summary': test_metrics})

        # 4. Verify alerts were created
        active_alerts = alert_manager.get_active_alerts()
        assert len(active_alerts) >= 3, "Should have created alerts for each threshold violation"

        # Check specific alert types
        alert_types = [alert.type for alert in active_alerts]
        assert AlertType.COLLABORATION_LATENCY in alert_types
        assert AlertType.AUDIO_SYNC_ACCURACY in alert_types
        assert AlertType.MEMORY_USAGE in alert_types

        # Check severity levels
        critical_alerts = [a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]
        warning_alerts = [a for a in active_alerts if a.severity == AlertSeverity.WARNING]
        
        assert len(critical_alerts) >= 2, "Should have critical alerts for collaboration and audio sync"
        assert len(warning_alerts) >= 1, "Should have warning alert for memory usage"

        # 5. Test alert summary
        summary = alert_manager.get_alert_summary()
        assert summary['total_active'] >= 3
        assert summary['critical'] >= 2
        assert summary['warning'] >= 1

    def test_alert_aggregation_and_deduplication(self):
        """Test that duplicate alerts are properly aggregated."""
        # Generate multiple similar alerts within aggregation window
        test_metrics = {
            'collaboration': {
                'average_latency': 110,
                'recent_operations': 3,
                'within_threshold': False
            }
        }

        # Store same metrics multiple times quickly
        for _ in range(5):
            performance_metrics_store.store_metrics({'summary': test_metrics})
            time.sleep(0.1)  # Small delay

        # Should only have one alert due to aggregation
        active_alerts = alert_manager.get_active_alerts()
        collaboration_alerts = [a for a in active_alerts if a.type == AlertType.COLLABORATION_LATENCY]
        
        assert len(collaboration_alerts) == 1, "Should aggregate duplicate alerts"

    def test_alert_acknowledgment_and_resolution(self):
        """Test alert acknowledgment and resolution workflow."""
        # Create an alert
        test_metrics = {
            'memory': {
                'usage_ratio': 0.95,
                'heap_used': 1900000000,
                'heap_limit': 2000000000,
                'within_threshold': False
            }
        }
        
        performance_metrics_store.store_metrics({'summary': test_metrics})
        
        # Get the created alert
        active_alerts = alert_manager.get_active_alerts()
        assert len(active_alerts) > 0
        
        alert = active_alerts[0]
        
        # Acknowledge the alert
        success = alert_manager.acknowledge_alert(alert.id, "test_user")
        assert success
        assert alert.acknowledged
        assert 'acknowledged_by' in alert.metadata
        
        # Resolve the alert
        success = alert_manager.resolve_alert(alert.id, "test_user")
        assert success
        assert alert.resolved
        assert 'resolved_by' in alert.metadata

    @patch('smtplib.SMTP')
    def test_email_notification_integration(self, mock_smtp):
        """Test email notification integration."""
        # Setup email channel
        email_channel = NotificationChannel(
            name="test_email",
            type="email",
            config={
                'smtp_host': 'localhost',
                'smtp_port': 587,
                'from_email': 'alerts@chordme.com',
                'to_emails': ['admin@chordme.com'],
                'use_tls': True
            },
            severity_filter=[AlertSeverity.CRITICAL]
        )
        alert_manager.add_notification_channel(email_channel)

        # Create critical alert
        test_metrics = {
            'collaboration': {
                'average_latency': 150,  # Critical level
                'recent_operations': 5,
                'within_threshold': False
            }
        }

        # Mock SMTP server
        mock_server = Mock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        # Store metrics to trigger alert
        performance_metrics_store.store_metrics({'summary': test_metrics})

        # Small delay for async notification
        time.sleep(0.1)

        # Verify email was attempted to be sent
        # Note: In real test, we'd check mock_server.send_message was called

    @patch('requests.post')
    def test_webhook_notification_integration(self, mock_post):
        """Test webhook notification integration."""
        # Setup webhook channel
        webhook_channel = NotificationChannel(
            name="test_webhook",
            type="webhook",
            config={
                'url': 'https://example.com/alerts',
                'auth_header': 'Bearer test_token'
            }
        )
        alert_manager.add_notification_channel(webhook_channel)

        # Mock successful webhook response
        mock_post.return_value.status_code = 200

        # Create alert
        test_metrics = {
            'audio_sync': {
                'average_accuracy': 75,  # Critical level
                'recent_measurements': 10,
                'within_threshold': False
            }
        }

        performance_metrics_store.store_metrics({'summary': test_metrics})

        # Small delay for async notification
        time.sleep(0.1)

        # Verify webhook was called (in async context, might need more sophisticated testing)

    def test_performance_metrics_retention(self):
        """Test that old metrics are properly cleaned up."""
        # Store many metrics
        for i in range(100):
            test_metrics = {
                'collaboration': {
                    'average_latency': 50 + i,  # Gradually increasing
                    'recent_operations': 1,
                    'within_threshold': True
                }
            }
            performance_metrics_store.store_metrics({'summary': test_metrics})

        # Check that metrics are retained
        assert len(performance_metrics_store.metrics) == 100

        # Simulate time passing and cleanup
        old_time = time.time() - (25 * 3600)  # 25 hours ago
        for metric in performance_metrics_store.metrics[:50]:
            metric['timestamp'] = old_time

        # Force cleanup
        performance_metrics_store._cleanup_if_needed()

        # Should have cleaned up old metrics
        assert len(performance_metrics_store.metrics) == 50

    def test_alert_rate_limiting(self):
        """Test that notification rate limiting works correctly."""
        # Setup notification channel
        email_channel = NotificationChannel(
            name="rate_limited_email",
            type="email",
            config={'smtp_host': 'localhost', 'from_email': 'test@example.com', 'to_emails': ['admin@example.com']}
        )
        alert_manager.add_notification_channel(email_channel)

        # Set low rate limit for testing
        alert_manager.max_notifications_per_hour = 2

        # Generate multiple alerts
        for i in range(5):
            test_metrics = {
                'collaboration': {
                    'average_latency': 110 + i,  # Different values to avoid aggregation
                    'recent_operations': 1,
                    'within_threshold': False
                }
            }
            
            # Use different timestamps to avoid aggregation
            with patch('time.time', return_value=time.time() + i * 60):
                performance_metrics_store.store_metrics({'summary': test_metrics})

        # Should have rate limiting in effect
        # This is hard to test synchronously due to async notifications
        # In practice, would need proper async test framework

    def test_multi_threshold_violation_scenario(self):
        """Test scenario with multiple simultaneous threshold violations."""
        # Simulate a system under severe stress
        critical_metrics = {
            'collaboration': {
                'average_latency': 250,  # Way over threshold
                'recent_operations': 15,
                'within_threshold': False
            },
            'audio_sync': {
                'average_accuracy': 120,  # Way over threshold
                'recent_measurements': 20,
                'within_threshold': False
            },
            'memory': {
                'usage_ratio': 0.97,  # Critical memory usage
                'heap_used': 1940000000,
                'heap_limit': 2000000000,
                'within_threshold': False
            },
            'network': {
                'average_latency': 8000,  # Very slow network
                'recent_requests': 25,
                'total_data_transferred': 1000000
            }
        }

        performance_metrics_store.store_metrics({'summary': critical_metrics})

        # Should create multiple critical alerts
        active_alerts = alert_manager.get_active_alerts()
        critical_alerts = [a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]
        
        assert len(critical_alerts) >= 3, "Should create multiple critical alerts for severe system stress"

        # Check that alert summary reflects the severity
        summary = alert_manager.get_alert_summary()
        assert summary['critical'] >= 3
        assert summary['total_active'] >= 3

    def test_performance_regression_detection(self):
        """Test integration with performance regression detection."""
        # Simulate baseline performance
        baseline_metrics = {
            'collaboration': {'average_latency': 45, 'recent_operations': 10, 'within_threshold': True},
            'audio_sync': {'average_accuracy': 15, 'recent_measurements': 12, 'within_threshold': True},
            'memory': {'usage_ratio': 0.6, 'heap_used': 1200000000, 'heap_limit': 2000000000, 'within_threshold': True}
        }

        # Store baseline
        for _ in range(5):
            performance_metrics_store.store_metrics({'summary': baseline_metrics})

        # No alerts should be created for good performance
        assert len(alert_manager.get_active_alerts()) == 0

        # Simulate performance degradation
        degraded_metrics = {
            'collaboration': {'average_latency': 105, 'recent_operations': 8, 'within_threshold': False},
            'audio_sync': {'average_accuracy': 55, 'recent_measurements': 10, 'within_threshold': False},
            'memory': {'usage_ratio': 0.92, 'heap_used': 1840000000, 'heap_limit': 2000000000, 'within_threshold': False}
        }

        performance_metrics_store.store_metrics({'summary': degraded_metrics})

        # Should detect regression and create alerts
        active_alerts = alert_manager.get_active_alerts()
        assert len(active_alerts) >= 3, "Should detect performance regression"

    def test_system_health_monitoring(self):
        """Test overall system health monitoring integration."""
        # Test various system health scenarios
        scenarios = [
            {
                'name': 'healthy_system',
                'metrics': {
                    'collaboration': {'average_latency': 45, 'within_threshold': True},
                    'audio_sync': {'average_accuracy': 20, 'within_threshold': True},
                    'memory': {'usage_ratio': 0.5, 'within_threshold': True}
                },
                'expected_alerts': 0
            },
            {
                'name': 'degraded_system',
                'metrics': {
                    'collaboration': {'average_latency': 85, 'within_threshold': True},
                    'audio_sync': {'average_accuracy': 45, 'within_threshold': True},
                    'memory': {'usage_ratio': 0.85, 'within_threshold': False}
                },
                'expected_alerts': 1
            },
            {
                'name': 'failing_system',
                'metrics': {
                    'collaboration': {'average_latency': 150, 'within_threshold': False},
                    'audio_sync': {'average_accuracy': 80, 'within_threshold': False},
                    'memory': {'usage_ratio': 0.95, 'within_threshold': False}
                },
                'expected_alerts': 3
            }
        ]

        for scenario in scenarios:
            # Clear previous alerts
            alert_manager.alerts.clear()
            
            # Apply scenario metrics
            performance_metrics_store.store_metrics({'summary': scenario['metrics']})
            
            # Check expected alerts
            active_alerts = alert_manager.get_active_alerts()
            assert len(active_alerts) >= scenario['expected_alerts'], \
                f"Scenario {scenario['name']} should generate at least {scenario['expected_alerts']} alerts"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])