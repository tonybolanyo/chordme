"""
Automated Performance Alerts and Notifications Service

Provides automated alerting for performance threshold violations including:
- Real-time email/webhook notifications
- Escalation policies for critical alerts
- Alert aggregation and rate limiting
- Integration with monitoring dashboard
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from threading import Lock

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(Enum):
    COLLABORATION_LATENCY = "collaboration_latency"
    AUDIO_SYNC_ACCURACY = "audio_sync_accuracy"
    MEMORY_USAGE = "memory_usage"
    NETWORK_PERFORMANCE = "network_performance"
    SYSTEM_HEALTH = "system_health"


@dataclass
class PerformanceAlert:
    """Performance alert data structure."""
    id: str
    type: AlertType
    severity: AlertSeverity
    message: str
    value: float
    threshold: float
    timestamp: datetime
    metadata: Dict[str, Any]
    acknowledged: bool = False
    resolved: bool = False


@dataclass
class NotificationChannel:
    """Notification channel configuration."""
    name: str
    type: str  # email, webhook, slack
    config: Dict[str, Any]
    enabled: bool = True
    severity_filter: List[AlertSeverity] = None


class AlertManager:
    """Manages performance alerts and notifications."""
    
    def __init__(self):
        self.alerts: List[PerformanceAlert] = []
        self.notification_channels: List[NotificationChannel] = []
        self.alert_rules: Dict[AlertType, Dict[str, Any]] = {}
        self.alert_history: List[PerformanceAlert] = []
        self.escalation_policies: Dict[AlertType, Dict[str, Any]] = {}
        self._lock = Lock()
        
        # Rate limiting for notifications
        self.notification_rate_limits: Dict[str, List[datetime]] = {}
        self.max_notifications_per_hour = 10
        
        # Alert aggregation
        self.alert_aggregation_window = timedelta(minutes=5)
        
        self._setup_default_alert_rules()
        
    def _setup_default_alert_rules(self):
        """Setup default alert rules for performance thresholds."""
        self.alert_rules = {
            AlertType.COLLABORATION_LATENCY: {
                'warning_threshold': 80,  # ms
                'critical_threshold': 100,  # ms
                'evaluation_window': timedelta(minutes=5),
                'min_samples': 3
            },
            AlertType.AUDIO_SYNC_ACCURACY: {
                'warning_threshold': 40,  # ms
                'critical_threshold': 50,  # ms
                'evaluation_window': timedelta(minutes=5),
                'min_samples': 3
            },
            AlertType.MEMORY_USAGE: {
                'warning_threshold': 0.8,  # 80%
                'critical_threshold': 0.9,  # 90%
                'evaluation_window': timedelta(minutes=1),
                'min_samples': 1
            },
            AlertType.NETWORK_PERFORMANCE: {
                'warning_threshold': 3000,  # ms
                'critical_threshold': 5000,  # ms
                'evaluation_window': timedelta(minutes=5),
                'min_samples': 5
            }
        }
        
        # Setup escalation policies
        self.escalation_policies = {
            AlertType.COLLABORATION_LATENCY: {
                'critical': {
                    'immediate': ['email', 'webhook'],
                    'after_5min': ['slack'],
                    'after_15min': ['sms']  # Would need SMS provider integration
                }
            },
            AlertType.MEMORY_USAGE: {
                'critical': {
                    'immediate': ['email', 'webhook', 'slack'],
                    'after_2min': ['sms']
                }
            }
        }
    
    def add_notification_channel(self, channel: NotificationChannel):
        """Add a notification channel."""
        self.notification_channels.append(channel)
        logger.info(f"Added notification channel: {channel.name} ({channel.type})")
    
    def setup_email_notifications(self, smtp_config: Dict[str, Any]):
        """Setup email notifications."""
        email_channel = NotificationChannel(
            name="email_alerts",
            type="email",
            config=smtp_config,
            enabled=True,
            severity_filter=[AlertSeverity.WARNING, AlertSeverity.CRITICAL]
        )
        self.add_notification_channel(email_channel)
    
    def setup_webhook_notifications(self, webhook_config: Dict[str, Any]):
        """Setup webhook notifications."""
        webhook_channel = NotificationChannel(
            name="webhook_alerts",
            type="webhook",
            config=webhook_config,
            enabled=True,
            severity_filter=[AlertSeverity.CRITICAL]
        )
        self.add_notification_channel(webhook_channel)
    
    def setup_slack_notifications(self, slack_config: Dict[str, Any]):
        """Setup Slack notifications."""
        slack_channel = NotificationChannel(
            name="slack_alerts",
            type="slack",
            config=slack_config,
            enabled=True,
            severity_filter=[AlertSeverity.CRITICAL]
        )
        self.add_notification_channel(slack_channel)
    
    def evaluate_performance_metrics(self, metrics: Dict[str, Any]):
        """Evaluate performance metrics and trigger alerts if needed."""
        current_time = datetime.now(timezone.utc)
        
        # Evaluate collaboration latency
        if 'collaboration' in metrics:
            self._evaluate_collaboration_latency(metrics['collaboration'], current_time)
        
        # Evaluate audio sync accuracy
        if 'audio_sync' in metrics:
            self._evaluate_audio_sync_accuracy(metrics['audio_sync'], current_time)
        
        # Evaluate memory usage
        if 'memory' in metrics:
            self._evaluate_memory_usage(metrics['memory'], current_time)
        
        # Evaluate network performance
        if 'network' in metrics:
            self._evaluate_network_performance(metrics['network'], current_time)
    
    def _evaluate_collaboration_latency(self, metrics: Dict[str, Any], timestamp: datetime):
        """Evaluate collaboration latency metrics."""
        avg_latency = metrics.get('average_latency', 0)
        rules = self.alert_rules[AlertType.COLLABORATION_LATENCY]
        
        if avg_latency > rules['critical_threshold']:
            self._create_alert(
                AlertType.COLLABORATION_LATENCY,
                AlertSeverity.CRITICAL,
                f"Collaboration latency exceeded critical threshold: {avg_latency}ms > {rules['critical_threshold']}ms",
                avg_latency,
                rules['critical_threshold'],
                timestamp,
                {'recent_operations': metrics.get('recent_operations', 0)}
            )
        elif avg_latency > rules['warning_threshold']:
            self._create_alert(
                AlertType.COLLABORATION_LATENCY,
                AlertSeverity.WARNING,
                f"Collaboration latency exceeded warning threshold: {avg_latency}ms > {rules['warning_threshold']}ms",
                avg_latency,
                rules['warning_threshold'],
                timestamp,
                {'recent_operations': metrics.get('recent_operations', 0)}
            )
    
    def _evaluate_audio_sync_accuracy(self, metrics: Dict[str, Any], timestamp: datetime):
        """Evaluate audio sync accuracy metrics."""
        avg_deviation = metrics.get('average_accuracy', 0)
        rules = self.alert_rules[AlertType.AUDIO_SYNC_ACCURACY]
        
        if avg_deviation > rules['critical_threshold']:
            self._create_alert(
                AlertType.AUDIO_SYNC_ACCURACY,
                AlertSeverity.CRITICAL,
                f"Audio sync deviation exceeded critical threshold: {avg_deviation}ms > {rules['critical_threshold']}ms",
                avg_deviation,
                rules['critical_threshold'],
                timestamp,
                {'recent_measurements': metrics.get('recent_measurements', 0)}
            )
        elif avg_deviation > rules['warning_threshold']:
            self._create_alert(
                AlertType.AUDIO_SYNC_ACCURACY,
                AlertSeverity.WARNING,
                f"Audio sync deviation exceeded warning threshold: {avg_deviation}ms > {rules['warning_threshold']}ms",
                avg_deviation,
                rules['warning_threshold'],
                timestamp,
                {'recent_measurements': metrics.get('recent_measurements', 0)}
            )
    
    def _evaluate_memory_usage(self, metrics: Dict[str, Any], timestamp: datetime):
        """Evaluate memory usage metrics."""
        usage_ratio = metrics.get('usage_ratio', 0)
        rules = self.alert_rules[AlertType.MEMORY_USAGE]
        
        if usage_ratio > rules['critical_threshold']:
            self._create_alert(
                AlertType.MEMORY_USAGE,
                AlertSeverity.CRITICAL,
                f"Memory usage exceeded critical threshold: {usage_ratio*100:.1f}% > {rules['critical_threshold']*100:.1f}%",
                usage_ratio,
                rules['critical_threshold'],
                timestamp,
                {'heap_used': metrics.get('heap_used', 0), 'heap_limit': metrics.get('heap_limit', 0)}
            )
        elif usage_ratio > rules['warning_threshold']:
            self._create_alert(
                AlertType.MEMORY_USAGE,
                AlertSeverity.WARNING,
                f"Memory usage exceeded warning threshold: {usage_ratio*100:.1f}% > {rules['warning_threshold']*100:.1f}%",
                usage_ratio,
                rules['warning_threshold'],
                timestamp,
                {'heap_used': metrics.get('heap_used', 0), 'heap_limit': metrics.get('heap_limit', 0)}
            )
    
    def _evaluate_network_performance(self, metrics: Dict[str, Any], timestamp: datetime):
        """Evaluate network performance metrics."""
        avg_latency = metrics.get('average_latency', 0)
        rules = self.alert_rules[AlertType.NETWORK_PERFORMANCE]
        
        if avg_latency > rules['critical_threshold']:
            self._create_alert(
                AlertType.NETWORK_PERFORMANCE,
                AlertSeverity.CRITICAL,
                f"Network latency exceeded critical threshold: {avg_latency}ms > {rules['critical_threshold']}ms",
                avg_latency,
                rules['critical_threshold'],
                timestamp,
                {'recent_requests': metrics.get('recent_requests', 0)}
            )
        elif avg_latency > rules['warning_threshold']:
            self._create_alert(
                AlertType.NETWORK_PERFORMANCE,
                AlertSeverity.WARNING,
                f"Network latency exceeded warning threshold: {avg_latency}ms > {rules['warning_threshold']}ms",
                avg_latency,
                rules['warning_threshold'],
                timestamp,
                {'recent_requests': metrics.get('recent_requests', 0)}
            )
    
    def _create_alert(self, alert_type: AlertType, severity: AlertSeverity, 
                     message: str, value: float, threshold: float, 
                     timestamp: datetime, metadata: Dict[str, Any]):
        """Create and process a new alert."""
        alert_id = f"{alert_type.value}_{severity.value}_{int(timestamp.timestamp())}"
        
        # Check for duplicate alerts (aggregation)
        if self._is_duplicate_alert(alert_type, severity, timestamp):
            logger.debug(f"Skipping duplicate alert: {alert_id}")
            return
        
        alert = PerformanceAlert(
            id=alert_id,
            type=alert_type,
            severity=severity,
            message=message,
            value=value,
            threshold=threshold,
            timestamp=timestamp,
            metadata=metadata
        )
        
        with self._lock:
            self.alerts.append(alert)
            self.alert_history.append(alert)
            
            # Keep only recent alerts in memory
            cutoff_time = timestamp - timedelta(hours=24)
            self.alerts = [a for a in self.alerts if a.timestamp > cutoff_time]
            
            # Keep last 1000 alerts in history
            if len(self.alert_history) > 1000:
                self.alert_history = self.alert_history[-1000:]
        
        logger.warning(f"Performance alert created: {alert.message}")
        
        # Send notifications
        asyncio.create_task(self._send_notifications(alert))
    
    def _is_duplicate_alert(self, alert_type: AlertType, severity: AlertSeverity, 
                           timestamp: datetime) -> bool:
        """Check if this alert is a duplicate within the aggregation window."""
        cutoff_time = timestamp - self.alert_aggregation_window
        
        for alert in self.alerts:
            if (alert.type == alert_type and 
                alert.severity == severity and 
                alert.timestamp > cutoff_time):
                return True
        
        return False
    
    async def _send_notifications(self, alert: PerformanceAlert):
        """Send notifications for an alert."""
        for channel in self.notification_channels:
            if not channel.enabled:
                continue
            
            # Check severity filter
            if (channel.severity_filter and 
                alert.severity not in channel.severity_filter):
                continue
            
            # Check rate limits
            if self._is_rate_limited(channel.name):
                logger.warning(f"Rate limit exceeded for channel: {channel.name}")
                continue
            
            try:
                if channel.type == "email":
                    await self._send_email_notification(channel, alert)
                elif channel.type == "webhook":
                    await self._send_webhook_notification(channel, alert)
                elif channel.type == "slack":
                    await self._send_slack_notification(channel, alert)
                
                # Record notification for rate limiting
                self._record_notification(channel.name)
                
            except Exception as e:
                logger.error(f"Failed to send notification via {channel.name}: {str(e)}")
    
    def _is_rate_limited(self, channel_name: str) -> bool:
        """Check if channel is rate limited."""
        current_time = datetime.now(timezone.utc)
        cutoff_time = current_time - timedelta(hours=1)
        
        if channel_name not in self.notification_rate_limits:
            self.notification_rate_limits[channel_name] = []
        
        # Clean old notifications
        self.notification_rate_limits[channel_name] = [
            timestamp for timestamp in self.notification_rate_limits[channel_name]
            if timestamp > cutoff_time
        ]
        
        return len(self.notification_rate_limits[channel_name]) >= self.max_notifications_per_hour
    
    def _record_notification(self, channel_name: str):
        """Record a notification for rate limiting."""
        current_time = datetime.now(timezone.utc)
        
        if channel_name not in self.notification_rate_limits:
            self.notification_rate_limits[channel_name] = []
        
        self.notification_rate_limits[channel_name].append(current_time)
    
    async def _send_email_notification(self, channel: NotificationChannel, alert: PerformanceAlert):
        """Send email notification."""
        config = channel.config
        
        msg = MIMEMultipart()
        msg['From'] = config['from_email']
        msg['To'] = ', '.join(config['to_emails'])
        msg['Subject'] = f"ChordMe Performance Alert: {alert.severity.value.upper()} - {alert.type.value}"
        
        body = self._format_email_body(alert)
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        with smtplib.SMTP(config['smtp_host'], config.get('smtp_port', 587)) as server:
            if config.get('use_tls', True):
                server.starttls()
            if 'username' in config and 'password' in config:
                server.login(config['username'], config['password'])
            server.send_message(msg)
        
        logger.info(f"Email notification sent for alert: {alert.id}")
    
    async def _send_webhook_notification(self, channel: NotificationChannel, alert: PerformanceAlert):
        """Send webhook notification."""
        config = channel.config
        
        payload = {
            'alert_id': alert.id,
            'type': alert.type.value,
            'severity': alert.severity.value,
            'message': alert.message,
            'value': alert.value,
            'threshold': alert.threshold,
            'timestamp': alert.timestamp.isoformat(),
            'metadata': alert.metadata
        }
        
        headers = {'Content-Type': 'application/json'}
        if 'auth_header' in config:
            headers['Authorization'] = config['auth_header']
        
        response = requests.post(
            config['url'],
            json=payload,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        logger.info(f"Webhook notification sent for alert: {alert.id}")
    
    async def _send_slack_notification(self, channel: NotificationChannel, alert: PerformanceAlert):
        """Send Slack notification."""
        config = channel.config
        
        # Format Slack message
        color = "#ff0000" if alert.severity == AlertSeverity.CRITICAL else "#ffa500"
        
        payload = {
            "attachments": [
                {
                    "color": color,
                    "title": f"Performance Alert: {alert.type.value.replace('_', ' ').title()}",
                    "text": alert.message,
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert.severity.value.upper(),
                            "short": True
                        },
                        {
                            "title": "Value",
                            "value": f"{alert.value:.2f}",
                            "short": True
                        },
                        {
                            "title": "Threshold",
                            "value": f"{alert.threshold:.2f}",
                            "short": True
                        },
                        {
                            "title": "Time",
                            "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                            "short": True
                        }
                    ],
                    "footer": "ChordMe Performance Monitoring",
                    "ts": int(alert.timestamp.timestamp())
                }
            ]
        }
        
        response = requests.post(
            config['webhook_url'],
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        
        logger.info(f"Slack notification sent for alert: {alert.id}")
    
    def _format_email_body(self, alert: PerformanceAlert) -> str:
        """Format email notification body."""
        return f"""
        <html>
        <body>
            <h2>ChordMe Performance Alert</h2>
            
            <div style="padding: 10px; background-color: {'#ffebee' if alert.severity == AlertSeverity.CRITICAL else '#fff3e0'}; border-left: 4px solid {'#f44336' if alert.severity == AlertSeverity.CRITICAL else '#ff9800'};">
                <h3>{alert.severity.value.upper()}: {alert.type.value.replace('_', ' ').title()}</h3>
                <p><strong>Message:</strong> {alert.message}</p>
                <p><strong>Value:</strong> {alert.value:.2f}</p>
                <p><strong>Threshold:</strong> {alert.threshold:.2f}</p>
                <p><strong>Time:</strong> {alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")}</p>
            </div>
            
            <h4>Additional Information:</h4>
            <ul>
                {''.join([f'<li><strong>{k}:</strong> {v}</li>' for k, v in alert.metadata.items()])}
            </ul>
            
            <p>Please investigate and take appropriate action if necessary.</p>
            
            <hr>
            <p><small>This is an automated alert from ChordMe Performance Monitoring System.</small></p>
        </body>
        </html>
        """
    
    def get_active_alerts(self) -> List[PerformanceAlert]:
        """Get all active (unresolved) alerts."""
        return [alert for alert in self.alerts if not alert.resolved]
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary statistics."""
        active_alerts = self.get_active_alerts()
        
        return {
            'total_active': len(active_alerts),
            'critical': len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
            'warning': len([a for a in active_alerts if a.severity == AlertSeverity.WARNING]),
            'by_type': {
                alert_type.value: len([a for a in active_alerts if a.type == alert_type])
                for alert_type in AlertType
            },
            'recent_24h': len([a for a in self.alert_history 
                             if a.timestamp > datetime.now(timezone.utc) - timedelta(hours=24)])
        }
    
    def acknowledge_alert(self, alert_id: str, user: str):
        """Acknowledge an alert."""
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.acknowledged = True
                alert.metadata['acknowledged_by'] = user
                alert.metadata['acknowledged_at'] = datetime.now(timezone.utc).isoformat()
                logger.info(f"Alert {alert_id} acknowledged by {user}")
                return True
        return False
    
    def resolve_alert(self, alert_id: str, user: str):
        """Resolve an alert."""
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.resolved = True
                alert.metadata['resolved_by'] = user
                alert.metadata['resolved_at'] = datetime.now(timezone.utc).isoformat()
                logger.info(f"Alert {alert_id} resolved by {user}")
                return True
        return False


# Global alert manager instance
alert_manager = AlertManager()


# Configuration helper functions
def setup_email_alerts(smtp_host: str, smtp_port: int, from_email: str, 
                      to_emails: List[str], username: str = None, 
                      password: str = None, use_tls: bool = True):
    """Setup email notifications."""
    config = {
        'smtp_host': smtp_host,
        'smtp_port': smtp_port,
        'from_email': from_email,
        'to_emails': to_emails,
        'use_tls': use_tls
    }
    
    if username and password:
        config.update({'username': username, 'password': password})
    
    alert_manager.setup_email_notifications(config)


def setup_webhook_alerts(webhook_url: str, auth_header: str = None):
    """Setup webhook notifications."""
    config = {'url': webhook_url}
    if auth_header:
        config['auth_header'] = auth_header
    
    alert_manager.setup_webhook_notifications(config)


def setup_slack_alerts(webhook_url: str):
    """Setup Slack notifications."""
    config = {'webhook_url': webhook_url}
    alert_manager.setup_slack_notifications(config)


# Export main interface
__all__ = [
    'AlertManager', 'PerformanceAlert', 'AlertSeverity', 'AlertType',
    'alert_manager', 'setup_email_alerts', 'setup_webhook_alerts', 'setup_slack_alerts'
]