#!/usr/bin/env python3
"""
APM Internationalization Demo for ChordMe

This script demonstrates the internationalization capabilities of the
Application Performance Monitoring system, showing how alerts and
thresholds work in different languages and cultures.
"""

import json
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from chordme.apm_config import AlertManager


def demo_localized_alerts():
    """Demonstrate localized alert messages."""
    print("=" * 60)
    print("APM INTERNATIONALIZATION DEMO")
    print("=" * 60)
    print()
    
    # Initialize alert manager
    alert_manager = AlertManager()
    
    # Test metrics that exceed various thresholds
    test_scenarios = [
        {
            'name': 'High Error Rate',
            'metrics': {
                'error_rate_percent': 2.5,
                'timestamp': '2024-01-01T12:00:00Z'
            }
        },
        {
            'name': 'Slow Response Time',
            'metrics': {
                'response_time_ms': 750,
                'timestamp': '2024-01-01T12:01:00Z'
            }
        },
        {
            'name': 'Memory Usage High',
            'metrics': {
                'memory_usage_percent': 92,
                'timestamp': '2024-01-01T12:02:00Z'
            }
        },
        {
            'name': 'Collaboration Latency',
            'metrics': {
                'collaboration_latency': 120,
                'timestamp': '2024-01-01T12:03:00Z'
            }
        }
    ]
    
    locales = ['en', 'es']
    
    for scenario in test_scenarios:
        print(f"SCENARIO: {scenario['name']}")
        print("-" * 40)
        
        for locale in locales:
            print(f"\n{locale.upper()} ({get_locale_name(locale)}):")
            
            alerts = alert_manager.check_thresholds(scenario['metrics'], locale)
            
            if alerts:
                for alert in alerts:
                    print(f"  🚨 {alert['title']}")
                    print(f"     {alert['message']}")
                    print(f"     Severity: {alert['severity']}")
                    print(f"     Threshold: {alert['threshold']}")
            else:
                print("  ✅ No alerts triggered")
        
        print("\n" + "=" * 60 + "\n")


def demo_cultural_thresholds():
    """Demonstrate cultural threshold adjustments."""
    print("CULTURAL THRESHOLD ADJUSTMENTS")
    print("=" * 60)
    print()
    
    alert_manager = AlertManager()
    
    locales = ['en', 'es']
    
    print("Comparing base thresholds with cultural adjustments:\n")
    
    for locale in locales:
        thresholds = alert_manager.get_cultural_thresholds(locale)
        print(f"{locale.upper()} ({get_locale_name(locale)}) Thresholds:")
        for metric, threshold in thresholds.items():
            if 'collaboration' in metric or 'audio_sync' in metric:
                print(f"  📊 {metric}: {threshold}")
        print()
    
    # Test collaboration latency scenario with cultural adjustments
    collaboration_metrics = {
        'collaboration_latency': 110,  # Between default (100) and Spanish adjusted (~120)
        'timestamp': '2024-01-01T13:00:00Z'
    }
    
    print("COLLABORATION LATENCY TEST (110ms):")
    print("-" * 40)
    
    for locale in locales:
        alerts = alert_manager.check_thresholds(collaboration_metrics, locale)
        print(f"\n{locale.upper()} ({get_locale_name(locale)}):")
        
        if alerts:
            print(f"  🚨 Alert triggered: {alerts[0]['message']}")
        else:
            print("  ✅ Within acceptable threshold (cultural adjustment applied)")


def demo_message_formatting():
    """Demonstrate alert message formatting in different languages."""
    print("\n" + "=" * 60)
    print("ALERT MESSAGE FORMATTING DEMO")
    print("=" * 60)
    print()
    
    alert_manager = AlertManager()
    
    # Test different metric types
    test_cases = [
        ('error_rate_percent', 3.2, 1.0),
        ('response_time_ms', 850, 500),
        ('memory_usage_percent', 88, 85),
        ('cpu_usage_percent', 95, 80)
    ]
    
    for metric, value, threshold in test_cases:
        print(f"METRIC: {metric}")
        print(f"Value: {value}, Threshold: {threshold}")
        print("-" * 30)
        
        # Generate test metrics
        test_metrics = {
            metric: value,
            'timestamp': '2024-01-01T14:00:00Z'
        }
        
        for locale in ['en', 'es']:
            alerts = alert_manager.check_thresholds(test_metrics, locale)
            if alerts:
                alert = alerts[0]
                print(f"{locale.upper()}: {alert['message']}")
        
        print()


def get_locale_name(locale):
    """Get human-readable locale name."""
    names = {
        'en': 'English',
        'es': 'Español'
    }
    return names.get(locale, locale)


def main():
    """Run the APM internationalization demo."""
    try:
        demo_localized_alerts()
        demo_cultural_thresholds()
        demo_message_formatting()
        
        print("=" * 60)
        print("DEMO COMPLETE")
        print("=" * 60)
        print()
        print("Key Features Demonstrated:")
        print("✅ Localized alert messages in English and Spanish")
        print("✅ Cultural threshold adjustments for different regions")
        print("✅ Proper message interpolation with values")
        print("✅ Severity calculation across languages")
        print("✅ Comprehensive metric coverage")
        print()
        print("This demonstrates the internationalization capabilities")
        print("of the ChordMe APM system, supporting multi-language")
        print("environments with cultural considerations.")
        
    except Exception as e:
        print(f"Error running demo: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())