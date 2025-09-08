"""
Application Performance Monitoring (APM) configuration for ChordMe.
Provides integration with Sentry, New Relic, and other APM tools.
"""

import os
import logging
from flask import Flask
from typing import Optional, Dict, Any

# Import APM tools
try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
    sentry_sdk = None


class APMConfig:
    """Configuration class for Application Performance Monitoring tools."""
    
    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        self.sentry_dsn = None
        self.new_relic_key = None
        self.datadog_key = None
        self.monitoring_enabled = False
        
        if app:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """Initialize APM configuration with Flask app."""
        self.app = app
        
        # Load configuration from environment or app config
        self.sentry_dsn = app.config.get('SENTRY_DSN') or os.getenv('SENTRY_DSN')
        self.new_relic_key = app.config.get('NEW_RELIC_LICENSE_KEY') or os.getenv('NEW_RELIC_LICENSE_KEY')
        self.datadog_key = app.config.get('DATADOG_API_KEY') or os.getenv('DATADOG_API_KEY')
        
        # Initialize monitoring tools
        self._setup_sentry()
        self._setup_new_relic()
        self._setup_datadog()
        
        # Log APM initialization
        logger = logging.getLogger('chordme.apm')
        logger.info(f"APM initialized - Sentry: {bool(self.sentry_dsn)}, "
                   f"New Relic: {bool(self.new_relic_key)}, "
                   f"Datadog: {bool(self.datadog_key)}")
    
    def _setup_sentry(self):
        """Configure Sentry error tracking and performance monitoring."""
        if not self.sentry_dsn or not SENTRY_AVAILABLE:
            return
        
        try:
            # Get environment from config
            environment = self.app.config.get('ENVIRONMENT', 'development')
            
            # Configure Sentry with comprehensive monitoring
            sentry_sdk.init(
                dsn=self.sentry_dsn,
                integrations=[
                    FlaskIntegration(auto_enabling_integrations=False),
                    SqlalchemyIntegration()
                ],
                traces_sample_rate=self._get_trace_sample_rate(),
                profiles_sample_rate=self._get_profile_sample_rate(),
                environment=environment,
                release=self.app.config.get('VERSION', 'unknown'),
                before_send=self._filter_sentry_events,
                before_send_transaction=self._filter_sentry_transactions
            )
            
            self.monitoring_enabled = True
            logging.getLogger('chordme.apm').info("Sentry APM initialized successfully")
            
        except Exception as e:
            logging.getLogger('chordme.apm').error(f"Failed to initialize Sentry: {e}")
    
    def _setup_new_relic(self):
        """Configure New Relic APM integration."""
        if not self.new_relic_key:
            return
        
        try:
            # New Relic typically uses an agent that's configured externally
            # Set environment variables for New Relic agent
            os.environ['NEW_RELIC_LICENSE_KEY'] = self.new_relic_key
            os.environ['NEW_RELIC_APP_NAME'] = self.app.config.get('APP_NAME', 'ChordMe')
            os.environ['NEW_RELIC_ENVIRONMENT'] = self.app.config.get('ENVIRONMENT', 'development')
            
            logging.getLogger('chordme.apm').info("New Relic configuration set")
            
        except Exception as e:
            logging.getLogger('chordme.apm').error(f"Failed to configure New Relic: {e}")
    
    def _setup_datadog(self):
        """Configure Datadog APM integration."""
        if not self.datadog_key:
            return
        
        try:
            # Datadog typically uses an agent that's configured externally
            # Set environment variables for Datadog agent
            os.environ['DD_API_KEY'] = self.datadog_key
            os.environ['DD_ENV'] = self.app.config.get('ENVIRONMENT', 'development')
            os.environ['DD_SERVICE'] = self.app.config.get('APP_NAME', 'chordme')
            os.environ['DD_VERSION'] = self.app.config.get('VERSION', 'unknown')
            
            logging.getLogger('chordme.apm').info("Datadog configuration set")
            
        except Exception as e:
            logging.getLogger('chordme.apm').error(f"Failed to configure Datadog: {e}")
    
    def _get_trace_sample_rate(self) -> float:
        """Get trace sampling rate based on environment."""
        environment = self.app.config.get('ENVIRONMENT', 'development')
        
        # Adjust sampling rates by environment
        if environment == 'production':
            return 0.1  # 10% sampling in production
        elif environment == 'staging':
            return 0.3  # 30% sampling in staging
        else:
            return 1.0  # 100% sampling in development
    
    def _get_profile_sample_rate(self) -> float:
        """Get profiling sampling rate based on environment."""
        environment = self.app.config.get('ENVIRONMENT', 'development')
        
        # Adjust profiling rates by environment
        if environment == 'production':
            return 0.05  # 5% profiling in production
        elif environment == 'staging':
            return 0.1   # 10% profiling in staging
        else:
            return 0.5   # 50% profiling in development
    
    def _filter_sentry_events(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter Sentry events to reduce noise."""
        # Filter out health check errors
        if 'request' in event and event['request'].get('url', '').endswith('/health'):
            return None
        
        # Filter out specific error types in development
        if self.app.config.get('ENVIRONMENT') == 'development':
            if 'exc_info' in hint:
                exc_type = hint['exc_info'][0]
                if exc_type.__name__ in ['BrokenPipeError', 'ConnectionResetError']:
                    return None
        
        return event
    
    def _filter_sentry_transactions(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter Sentry transactions to reduce noise."""
        # Filter out health check transactions
        if event.get('transaction', '').endswith('/health'):
            return None
        
        return event


class AlertManager:
    """Manages alerting thresholds and notifications."""
    
    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        self.alert_thresholds = {
            'error_rate_percent': 1.0,      # Alert if error rate > 1%
            'response_time_ms': 500,        # Alert if response time > 500ms
            'cpu_usage_percent': 80,        # Alert if CPU usage > 80%
            'memory_usage_percent': 85,     # Alert if memory usage > 85%
            'disk_usage_percent': 90        # Alert if disk usage > 90%
        }
        self.notification_channels = []
        self.locale = 'en'  # Default locale for alert messages
        
        if app:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """Initialize alert manager with Flask app."""
        self.app = app
        
        # Load alert thresholds from config
        self.alert_thresholds.update(
            app.config.get('ALERT_THRESHOLDS', {})
        )
        
        # Set locale from config or default to 'en'
        self.locale = app.config.get('DEFAULT_LOCALE', 'en')
        
        # Configure notification channels
        self._setup_notification_channels()
        
        logging.getLogger('chordme.alerts').info(
            f"Alert manager initialized with {len(self.notification_channels)} channels, locale: {self.locale}"
        )
    
    def get_cultural_thresholds(self, locale: str) -> Dict[str, float]:
        """Get culturally-adjusted performance thresholds based on locale."""
        base_thresholds = self.alert_thresholds.copy()
        
        # Cultural adjustments based on research and best practices
        cultural_adjustments = {
            'es': {
                # Spanish-speaking users may have different expectations
                # More tolerance for collaboration latency in distributed teams
                'collaboration_latency': base_thresholds.get('collaboration_latency', 100) * 1.2,
                # Lower tolerance for audio sync issues due to musical culture
                'audio_sync_accuracy': base_thresholds.get('audio_sync_accuracy', 50) * 0.8
            },
            'en': {
                # English users - baseline thresholds
            }
        }
        
        if locale in cultural_adjustments:
            for metric, adjustment in cultural_adjustments[locale].items():
                if metric in base_thresholds:
                    base_thresholds[metric] = adjustment
        
        return base_thresholds
    
    def _setup_notification_channels(self):
        """Setup notification channels for alerts."""
        # Slack webhook
        slack_webhook = self.app.config.get('SLACK_WEBHOOK_URL') or os.getenv('SLACK_WEBHOOK_URL')
        if slack_webhook:
            self.notification_channels.append({
                'type': 'slack',
                'webhook_url': slack_webhook
            })
        
        # Email notifications
        email_config = self.app.config.get('ALERT_EMAIL_CONFIG')
        if email_config:
            self.notification_channels.append({
                'type': 'email',
                'config': email_config
            })
        
        # Custom webhook
        custom_webhook = self.app.config.get('CUSTOM_ALERT_WEBHOOK') or os.getenv('CUSTOM_ALERT_WEBHOOK')
        if custom_webhook:
            self.notification_channels.append({
                'type': 'webhook',
                'url': custom_webhook
            })
    
    def check_thresholds(self, metrics: Dict[str, Any], locale: str = None) -> list:
        """Check if any metrics exceed alert thresholds."""
        alerts = []
        current_locale = locale or self.locale
        
        # Use culturally-adjusted thresholds
        thresholds = self.get_cultural_thresholds(current_locale)
        
        for metric_name, threshold in thresholds.items():
            if metric_name in metrics:
                value = metrics[metric_name]
                if value > threshold:
                    alerts.append({
                        'metric': metric_name,
                        'value': value,
                        'threshold': threshold,
                        'severity': self._get_alert_severity(metric_name, value, threshold),
                        'timestamp': metrics.get('timestamp', 'unknown'),
                        'message': self._get_localized_alert_message(metric_name, value, threshold, current_locale),
                        'title': self._get_localized_alert_title(metric_name, current_locale),
                        'locale': current_locale
                    })
        
        return alerts
    
    def _get_alert_severity(self, metric_name: str, value: float, threshold: float) -> str:
        """Determine alert severity based on how much threshold is exceeded."""
        ratio = value / threshold
        
        if ratio >= 2.0:
            return 'critical'
        elif ratio >= 1.5:
            return 'high'
        elif ratio >= 1.2:
            return 'medium'
        else:
            return 'low'
    
    def _get_localized_alert_message(self, metric_name: str, value: float, threshold: float, locale: str) -> str:
        """Get localized alert message based on metric type and locale."""
        messages = {
            'en': {
                'error_rate_percent': f"Error rate of {value}% exceeds threshold of {threshold}%",
                'response_time_ms': f"Response time of {value}ms exceeds threshold of {threshold}ms",
                'cpu_usage_percent': f"CPU usage of {value}% exceeds threshold of {threshold}%",
                'memory_usage_percent': f"Memory usage of {value}% exceeds threshold of {threshold}%",
                'disk_usage_percent': f"Disk usage of {value}% exceeds threshold of {threshold}%",
                'collaboration_latency': f"Collaboration latency of {value}ms exceeds threshold of {threshold}ms",
                'audio_sync_accuracy': f"Audio sync deviation of {value}ms exceeds threshold of {threshold}ms"
            },
            'es': {
                'error_rate_percent': f"Tasa de errores de {value}% excede el umbral de {threshold}%",
                'response_time_ms': f"Tiempo de respuesta de {value}ms excede el umbral de {threshold}ms",
                'cpu_usage_percent': f"Uso de CPU de {value}% excede el umbral de {threshold}%",
                'memory_usage_percent': f"Uso de memoria de {value}% excede el umbral de {threshold}%",
                'disk_usage_percent': f"Uso de disco de {value}% excede el umbral de {threshold}%",
                'collaboration_latency': f"Latencia de colaboración de {value}ms excede el umbral de {threshold}ms",
                'audio_sync_accuracy': f"Desviación de sincronización de audio de {value}ms excede el umbral de {threshold}ms"
            }
        }
        
        return messages.get(locale, messages['en']).get(metric_name, f"Metric {metric_name}: {value} > {threshold}")
    
    def _get_localized_alert_title(self, metric_name: str, locale: str) -> str:
        """Get localized alert title based on metric type and locale."""
        titles = {
            'en': {
                'error_rate_percent': "Error Rate Exceeded",
                'response_time_ms': "Response Time Exceeded",
                'cpu_usage_percent': "CPU Usage High",
                'memory_usage_percent': "Memory Usage High",
                'disk_usage_percent': "Disk Usage High",
                'collaboration_latency': "Collaboration Latency High",
                'audio_sync_accuracy': "Audio Sync Issue"
            },
            'es': {
                'error_rate_percent': "Tasa de Errores Excedida",
                'response_time_ms': "Tiempo de Respuesta Excedido",
                'cpu_usage_percent': "Uso de CPU Alto",
                'memory_usage_percent': "Uso de Memoria Alto",
                'disk_usage_percent': "Uso de Disco Alto",
                'collaboration_latency': "Latencia de Colaboración Alta",
                'audio_sync_accuracy': "Problema de Sincronización de Audio"
            }
        }
        
        return titles.get(locale, titles['en']).get(metric_name, f"Alert: {metric_name}")
    
    def send_alerts(self, alerts: list):
        """Send alerts through configured notification channels."""
        if not alerts:
            return
        
        for channel in self.notification_channels:
            try:
                self._send_alert_to_channel(alerts, channel)
            except Exception as e:
                logging.getLogger('chordme.alerts').error(
                    f"Failed to send alert to {channel['type']}: {e}"
                )
    
    def _send_alert_to_channel(self, alerts: list, channel: Dict[str, Any]):
        """Send alert to a specific notification channel."""
        import requests
        import json
        
        if channel['type'] == 'slack':
            self._send_slack_alert(alerts, channel['webhook_url'])
        elif channel['type'] == 'webhook':
            self._send_webhook_alert(alerts, channel['url'])
        elif channel['type'] == 'email':
            self._send_email_alert(alerts, channel['config'])
    
    def _send_slack_alert(self, alerts: list, webhook_url: str):
        """Send alert to Slack channel."""
        import requests
        import json
        
        message = self._format_slack_message(alerts)
        
        response = requests.post(
            webhook_url,
            data=json.dumps(message),
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        response.raise_for_status()
    
    def _send_webhook_alert(self, alerts: list, webhook_url: str):
        """Send alert to custom webhook."""
        import requests
        import json
        
        payload = {
            'service': 'chordme',
            'alerts': alerts,
            'timestamp': alerts[0]['timestamp'] if alerts else None
        }
        
        response = requests.post(
            webhook_url,
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        response.raise_for_status()
    
    def _send_email_alert(self, alerts: list, email_config: Dict[str, Any]):
        """Send alert via email."""
        # Email implementation would depend on the email service being used
        # This is a placeholder for email notification logic
        logging.getLogger('chordme.alerts').info(f"Email alert would be sent for {len(alerts)} alerts")
    
    def _format_slack_message(self, alerts: list) -> Dict[str, Any]:
        """Format alerts for Slack message."""
        critical_alerts = [a for a in alerts if a['severity'] == 'critical']
        high_alerts = [a for a in alerts if a['severity'] == 'high']
        
        color = 'danger' if critical_alerts else ('warning' if high_alerts else 'good')
        
        text = f"🚨 ChordMe Alert: {len(alerts)} threshold(s) exceeded"
        
        fields = []
        for alert in alerts[:5]:  # Limit to first 5 alerts
            fields.append({
                'title': alert.get('title', f"{alert['metric']} ({alert['severity']})"),
                'value': alert.get('message', f"{alert['value']} > {alert['threshold']}"),
                'short': True
            })
        
        return {
            'attachments': [{
                'color': color,
                'text': text,
                'fields': fields,
                'footer': 'ChordMe Monitoring',
                'ts': alerts[0]['timestamp'] if alerts else None
            }]
        }


def setup_apm(app: Flask) -> APMConfig:
    """Setup Application Performance Monitoring for the Flask app."""
    apm_config = APMConfig(app)
    
    # Store APM config in app for later access
    app.apm_config = apm_config
    
    return apm_config


def setup_alerting(app: Flask) -> AlertManager:
    """Setup alerting system for the Flask app."""
    alert_manager = AlertManager(app)
    
    # Store alert manager in app for later access
    app.alert_manager = alert_manager
    
    return alert_manager