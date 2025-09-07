#!/usr/bin/env python3
"""
Performance Alert Configuration and Testing Script

This script helps configure and test the automated performance alerting system.
It can be used to:
- Setup notification channels (email, webhook, Slack)
- Test alert notifications
- Configure alert thresholds
- Simulate performance issues for testing
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone
from typing import Dict, Any

# Add the backend path to sys.path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from chordme.performance_alerts import (
    alert_manager, setup_email_alerts, setup_webhook_alerts, setup_slack_alerts,
    AlertType, AlertSeverity
)


def load_config(config_file: str) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    try:
        with open(config_file, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Config file not found: {config_file}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in config file: {e}")
        return {}


def setup_notifications(config: Dict[str, Any]):
    """Setup notification channels based on configuration."""
    print("Setting up notification channels...")
    
    # Setup email notifications
    if 'email' in config:
        email_config = config['email']
        try:
            setup_email_alerts(
                smtp_host=email_config['smtp_host'],
                smtp_port=email_config.get('smtp_port', 587),
                from_email=email_config['from_email'],
                to_emails=email_config['to_emails'],
                username=email_config.get('username'),
                password=email_config.get('password'),
                use_tls=email_config.get('use_tls', True)
            )
            print("✅ Email notifications configured")
        except KeyError as e:
            print(f"❌ Email configuration missing key: {e}")
    
    # Setup webhook notifications
    if 'webhook' in config:
        webhook_config = config['webhook']
        try:
            setup_webhook_alerts(
                webhook_url=webhook_config['url'],
                auth_header=webhook_config.get('auth_header')
            )
            print("✅ Webhook notifications configured")
        except KeyError as e:
            print(f"❌ Webhook configuration missing key: {e}")
    
    # Setup Slack notifications
    if 'slack' in config:
        slack_config = config['slack']
        try:
            setup_slack_alerts(webhook_url=slack_config['webhook_url'])
            print("✅ Slack notifications configured")
        except KeyError as e:
            print(f"❌ Slack configuration missing key: {e}")


def test_alerts():
    """Test alert notifications with simulated performance issues."""
    print("\nTesting alert notifications...")
    
    # Test collaboration latency alert
    print("Testing collaboration latency alert...")
    test_metrics = {
        'collaboration': {
            'average_latency': 150,  # Exceeds 100ms threshold
            'recent_operations': 5,
            'within_threshold': False
        }
    }
    alert_manager.evaluate_performance_metrics(test_metrics)
    
    # Test audio sync accuracy alert
    print("Testing audio sync accuracy alert...")
    test_metrics = {
        'audio_sync': {
            'average_accuracy': 75,  # Exceeds 50ms threshold
            'recent_measurements': 10,
            'within_threshold': False
        }
    }
    alert_manager.evaluate_performance_metrics(test_metrics)
    
    # Test memory usage alert
    print("Testing memory usage alert...")
    test_metrics = {
        'memory': {
            'usage_ratio': 0.95,  # Exceeds 90% threshold
            'heap_used': 1900000000,  # 1.9GB
            'heap_limit': 2000000000,  # 2GB
            'within_threshold': False
        }
    }
    alert_manager.evaluate_performance_metrics(test_metrics)
    
    print("✅ Test alerts triggered")


def print_alert_status():
    """Print current alert status."""
    print("\n📊 Current Alert Status")
    print("=" * 40)
    
    summary = alert_manager.get_alert_summary()
    active_alerts = alert_manager.get_active_alerts()
    
    print(f"Active Alerts: {summary['total_active']}")
    print(f"  Critical: {summary['critical']}")
    print(f"  Warning: {summary['warning']}")
    print(f"Recent (24h): {summary['recent_24h']}")
    
    if active_alerts:
        print("\nActive Alerts:")
        for alert in active_alerts[:5]:  # Show first 5 alerts
            status = "🔴" if alert.severity == AlertSeverity.CRITICAL else "🟡"
            ack_status = " (ACK)" if alert.acknowledged else ""
            print(f"  {status} {alert.type.value}: {alert.message[:60]}...{ack_status}")
        
        if len(active_alerts) > 5:
            print(f"  ... and {len(active_alerts) - 5} more alerts")
    else:
        print("✅ No active alerts")


def create_sample_config():
    """Create a sample configuration file."""
    sample_config = {
        "email": {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "from_email": "alerts@yourcompany.com",
            "to_emails": ["admin@yourcompany.com", "devops@yourcompany.com"],
            "username": "your_email@gmail.com",
            "password": "your_app_password",
            "use_tls": True
        },
        "webhook": {
            "url": "https://your-webhook-endpoint.com/alerts",
            "auth_header": "Bearer your_auth_token"
        },
        "slack": {
            "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
        },
        "alert_thresholds": {
            "collaboration_latency": {
                "warning": 80,
                "critical": 100
            },
            "audio_sync_accuracy": {
                "warning": 40,
                "critical": 50
            },
            "memory_usage": {
                "warning": 0.8,
                "critical": 0.9
            }
        }
    }
    
    with open('alert_config.json', 'w') as f:
        json.dump(sample_config, f, indent=2)
    
    print("📝 Sample configuration file created: alert_config.json")
    print("Please edit this file with your actual notification settings.")


def configure_thresholds(config: Dict[str, Any]):
    """Configure alert thresholds from configuration."""
    if 'alert_thresholds' in config:
        thresholds = config['alert_thresholds']
        
        # Update alert rules
        if 'collaboration_latency' in thresholds:
            alert_manager.alert_rules[AlertType.COLLABORATION_LATENCY].update({
                'warning_threshold': thresholds['collaboration_latency'].get('warning', 80),
                'critical_threshold': thresholds['collaboration_latency'].get('critical', 100)
            })
        
        if 'audio_sync_accuracy' in thresholds:
            alert_manager.alert_rules[AlertType.AUDIO_SYNC_ACCURACY].update({
                'warning_threshold': thresholds['audio_sync_accuracy'].get('warning', 40),
                'critical_threshold': thresholds['audio_sync_accuracy'].get('critical', 50)
            })
        
        if 'memory_usage' in thresholds:
            alert_manager.alert_rules[AlertType.MEMORY_USAGE].update({
                'warning_threshold': thresholds['memory_usage'].get('warning', 0.8),
                'critical_threshold': thresholds['memory_usage'].get('critical', 0.9)
            })
        
        print("✅ Alert thresholds configured")


def main():
    """Main function for alert configuration and testing."""
    parser = argparse.ArgumentParser(description='ChordMe Performance Alert Configuration')
    parser.add_argument('--config', '-c', help='Configuration file path', default='alert_config.json')
    parser.add_argument('--test', '-t', action='store_true', help='Test alert notifications')
    parser.add_argument('--status', '-s', action='store_true', help='Show alert status')
    parser.add_argument('--create-config', action='store_true', help='Create sample configuration file')
    parser.add_argument('--setup-only', action='store_true', help='Setup notifications without testing')
    
    args = parser.parse_args()
    
    print("🚨 ChordMe Performance Alert Configuration")
    print("=" * 50)
    
    if args.create_config:
        create_sample_config()
        return
    
    if args.status:
        print_alert_status()
        return
    
    # Load configuration
    config = load_config(args.config)
    if not config:
        print(f"❌ No configuration found. Use --create-config to create a sample.")
        return
    
    # Setup notifications
    setup_notifications(config)
    configure_thresholds(config)
    
    if args.test and not args.setup_only:
        test_alerts()
    
    # Show current status
    print_alert_status()
    
    print("\n✅ Alert configuration complete!")
    print("\nNext steps:")
    print("1. Verify notification channels are working")
    print("2. Integrate with your monitoring infrastructure")
    print("3. Set up automated metric collection")
    print("4. Configure escalation policies as needed")


if __name__ == "__main__":
    main()