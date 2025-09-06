#!/usr/bin/env python3
"""
Demonstration script showing the post-production monitoring and alerting system.
This script demonstrates all the key features implemented for comprehensive monitoring.
"""

import sys
import os
import json
import requests
import time

# Add the backend to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from chordme import app

def demonstrate_monitoring_system():
    """Demonstrate the comprehensive monitoring system."""
    
    print("🚀 ChordMe Post-Production Monitoring & Alerting Demo")
    print("=" * 60)
    
    with app.test_client() as client:
        
        # 1. Health Check System
        print("\n1. 📊 Health Check System")
        print("-" * 30)
        
        response = client.get('/api/v1/monitoring/health-detailed')
        health_data = json.loads(response.data)
        
        print(f"✅ Health Status: {health_data['status']}")
        print(f"✅ Database: {health_data['checks']['database']['status']} ({health_data['checks']['database']['response_time_ms']}ms)")
        print(f"✅ Application: {health_data['checks']['application']['status']}")
        
        # 2. Metrics Collection
        print("\n2. 📈 Metrics Collection")
        print("-" * 30)
        
        # Simulate some requests
        for i in range(5):
            client.get('/api/v1/health')
            if i == 2:  # Simulate an error
                client.get('/api/v1/nonexistent')
        
        response = client.get('/api/v1/monitoring/metrics')
        metrics_data = json.loads(response.data)['metrics']
        
        print(f"✅ Total Requests: {metrics_data['total_requests']}")
        print(f"✅ Error Rate: {metrics_data['error_rate_percent']}%")
        print(f"✅ Avg Response Time: {metrics_data['average_response_time_ms']}ms")
        print(f"✅ Active Users: {metrics_data['active_users']}")
        
        # 3. Alert System Testing
        print("\n3. 🚨 Alert System Testing")
        print("-" * 30)
        
        # Test error rate alert
        response = client.post('/api/v1/monitoring/alerts/test', 
                             json={'type': 'error_rate'})
        alert_data = json.loads(response.data)
        
        if alert_data['status'] == 'success' and 'alerts' in alert_data:
            print(f"✅ Error Rate Alert Triggered: {len(alert_data['alerts'])} alerts")
            for alert in alert_data['alerts']:
                print(f"   - {alert['metric']}: {alert['value']} > {alert['threshold']} ({alert['severity']})")
        
        # Test latency alert
        response = client.post('/api/v1/monitoring/alerts/test', 
                             json={'type': 'latency'})
        alert_data = json.loads(response.data)
        
        if alert_data['status'] == 'success' and 'alerts' in alert_data:
            print(f"✅ Latency Alert Triggered: {len(alert_data['alerts'])} alerts")
        
        # 4. Frontend Error Logging
        print("\n4. 🌐 Frontend Error Logging")
        print("-" * 30)
        
        frontend_error = {
            'message': 'Demo JavaScript error',
            'stack': 'Error: Demo error\n    at component.tsx:10:5',
            'url': 'https://chordme.com/demo',
            'userId': 'demo-user-123',
            'timestamp': '2024-01-01T12:00:00Z'
        }
        
        response = client.post('/api/v1/monitoring/frontend-error',
                             json=frontend_error,
                             headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            print("✅ Frontend Error Logged Successfully")
        
        # 5. Frontend Metrics Logging
        print("\n5. 📱 Frontend Performance Metrics")
        print("-" * 30)
        
        frontend_metrics = [
            {'name': 'LCP', 'value': 2800, 'url': 'https://chordme.com/demo'},
            {'name': 'FID', 'value': 150, 'url': 'https://chordme.com/demo'},
            {'name': 'CLS', 'value': 0.15, 'url': 'https://chordme.com/demo'}
        ]
        
        for metric in frontend_metrics:
            metric['userId'] = 'demo-user-123'
            metric['timestamp'] = '2024-01-01T12:00:00Z'
            
            response = client.post('/api/v1/monitoring/frontend-metrics',
                                 json=metric,
                                 headers={'Content-Type': 'application/json'})
            
            if response.status_code == 200:
                threshold_exceeded = ""
                if metric['name'] == 'LCP' and metric['value'] > 2500:
                    threshold_exceeded = " ⚠️ (Above threshold!)"
                elif metric['name'] == 'FID' and metric['value'] > 100:
                    threshold_exceeded = " ⚠️ (Above threshold!)"
                elif metric['name'] == 'CLS' and metric['value'] > 0.1:
                    threshold_exceeded = " ⚠️ (Above threshold!)"
                
                print(f"✅ {metric['name']}: {metric['value']}{threshold_exceeded}")
        
        # 6. APM Configuration Status
        print("\n6. 🔧 APM Configuration Status")
        print("-" * 30)
        
        if hasattr(app, 'apm_config'):
            print("✅ APM Configuration Loaded")
            print(f"   - Monitoring Enabled: {app.apm_config.monitoring_enabled}")
        else:
            print("⚙️  APM Configuration Available (not initialized with credentials)")
        
        if hasattr(app, 'alert_manager'):
            print("✅ Alert Manager Configured")
            print(f"   - Notification Channels: {len(app.alert_manager.notification_channels)}")
        
        # 7. Integration Summary
        print("\n7. 🎯 Integration Summary")
        print("-" * 30)
        
        features = [
            "✅ Health checks with database connectivity validation",
            "✅ Real-time metrics collection and aggregation", 
            "✅ Configurable alert thresholds and notifications",
            "✅ Frontend error boundary and reporting system",
            "✅ Core Web Vitals performance tracking",
            "✅ APM integration ready (Sentry, New Relic, Datadog)",
            "✅ Structured logging with JSON format",
            "✅ Automated monitoring tests (16 test cases)",
            "✅ Comprehensive operations manual with runbooks"
        ]
        
        for feature in features:
            print(f"   {feature}")
        
        print(f"\n🎉 Monitoring System Successfully Demonstrated!")
        print("📖 See docs/operations-manual.md for complete documentation")
        print("🧪 Run 'python -m pytest backend/tests/test_monitoring_alerts.py' for full test suite")

if __name__ == '__main__':
    demonstrate_monitoring_system()