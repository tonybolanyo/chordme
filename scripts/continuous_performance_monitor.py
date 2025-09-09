#!/usr/bin/env python3
"""
Continuous Performance Monitoring and Regression Detection for ChordMe

This script provides enterprise-grade continuous performance monitoring:
- Automated performance baseline tracking
- Performance regression detection with alerts
- Trend analysis and prediction
- Performance dashboard data collection
- Automated reporting and notifications
"""

import asyncio
import aiohttp
import time
import json
import statistics
import logging
import argparse
import sys
import os
import sqlite3
import threading
import schedule
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, asdict
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class MonitoringConfig:
    """Configuration for continuous performance monitoring."""
    base_url: str = "http://localhost:5000"
    frontend_url: str = "http://localhost:5173"
    
    # Monitoring parameters
    monitoring_interval_minutes: int = 15
    baseline_window_days: int = 7
    trend_analysis_days: int = 30
    
    # Performance thresholds for alerts
    api_response_time_threshold_ms: int = 1000
    frontend_load_time_threshold_ms: int = 3000
    memory_usage_threshold_mb: int = 1024
    error_rate_threshold_percent: float = 5.0
    
    # Regression detection settings
    regression_threshold_percent: float = 20.0  # 20% increase triggers alert
    consecutive_failures_threshold: int = 3
    
    # Alert settings
    enable_email_alerts: bool = False
    smtp_server: str = "localhost"
    smtp_port: int = 587
    email_username: str = ""
    email_password: str = ""
    alert_recipients: List[str] = None
    
    # Data storage
    database_path: str = "/tmp/chordme_performance_monitoring.db"
    retention_days: int = 90
    
    def __post_init__(self):
        if self.alert_recipients is None:
            self.alert_recipients = []


@dataclass
class PerformanceBaseline:
    """Performance baseline for comparison."""
    metric_name: str
    baseline_value: float
    baseline_date: datetime
    confidence_interval: Tuple[float, float]
    sample_count: int


class PerformanceDatabase:
    """Database for storing performance metrics and baselines."""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the performance monitoring database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                metric_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                metadata TEXT,
                test_run_id TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS performance_baselines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT UNIQUE NOT NULL,
                baseline_value REAL NOT NULL,
                confidence_lower REAL NOT NULL,
                confidence_upper REAL NOT NULL,
                sample_count INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS performance_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                current_value REAL NOT NULL,
                baseline_value REAL,
                threshold_value REAL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                resolved BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS monitoring_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT UNIQUE NOT NULL,
                status TEXT NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                metrics_collected INTEGER DEFAULT 0,
                alerts_generated INTEGER DEFAULT 0,
                error_message TEXT
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_name ON performance_metrics(metric_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_created ON performance_alerts(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON performance_alerts(resolved)")
        
        conn.commit()
        conn.close()
        
        logger.info(f"Performance monitoring database initialized at {self.db_path}")
    
    def store_metric(self, metric_type: str, metric_name: str, value: float, unit: str, 
                    success: bool, metadata: Dict[str, Any] = None, test_run_id: str = None):
        """Store a performance metric in the database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO performance_metrics 
            (metric_type, metric_name, value, unit, success, metadata, test_run_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (metric_type, metric_name, value, unit, success, 
              json.dumps(metadata) if metadata else None, test_run_id))
        
        conn.commit()
        conn.close()
    
    def get_recent_metrics(self, metric_name: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent metrics for a specific metric name."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT timestamp, value, success, metadata
            FROM performance_metrics
            WHERE metric_name = ? AND timestamp > datetime('now', '-{} hours')
            ORDER BY timestamp DESC
        """.format(hours), (metric_name,))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "timestamp": datetime.fromisoformat(row[0].replace(' ', 'T')),
                "value": row[1],
                "success": bool(row[2]),
                "metadata": json.loads(row[3]) if row[3] else None
            })
        
        conn.close()
        return results
    
    def update_baseline(self, metric_name: str, baseline_value: float, 
                       confidence_interval: Tuple[float, float], sample_count: int):
        """Update or create a performance baseline."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO performance_baselines
            (metric_name, baseline_value, confidence_lower, confidence_upper, sample_count, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (metric_name, baseline_value, confidence_interval[0], confidence_interval[1], sample_count))
        
        conn.commit()
        conn.close()
    
    def get_baseline(self, metric_name: str) -> Optional[PerformanceBaseline]:
        """Get the current baseline for a metric."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT baseline_value, confidence_lower, confidence_upper, sample_count, updated_at
            FROM performance_baselines
            WHERE metric_name = ?
        """, (metric_name,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return PerformanceBaseline(
                metric_name=metric_name,
                baseline_value=row[0],
                baseline_date=datetime.fromisoformat(row[4].replace(' ', 'T')),
                confidence_interval=(row[1], row[2]),
                sample_count=row[3]
            )
        return None
    
    def store_alert(self, alert_type: str, metric_name: str, current_value: float,
                   baseline_value: float = None, threshold_value: float = None,
                   severity: str = "warning", message: str = ""):
        """Store a performance alert."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO performance_alerts
            (alert_type, metric_name, current_value, baseline_value, threshold_value, severity, message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (alert_type, metric_name, current_value, baseline_value, threshold_value, severity, message))
        
        conn.commit()
        conn.close()
    
    def get_unresolved_alerts(self) -> List[Dict[str, Any]]:
        """Get all unresolved alerts."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, alert_type, metric_name, current_value, baseline_value, 
                   threshold_value, severity, message, created_at
            FROM performance_alerts
            WHERE resolved = FALSE
            ORDER BY created_at DESC
        """)
        
        alerts = []
        for row in cursor.fetchall():
            alerts.append({
                "id": row[0],
                "alert_type": row[1],
                "metric_name": row[2],
                "current_value": row[3],
                "baseline_value": row[4],
                "threshold_value": row[5],
                "severity": row[6],
                "message": row[7],
                "created_at": datetime.fromisoformat(row[8].replace(' ', 'T'))
            })
        
        conn.close()
        return alerts
    
    def cleanup_old_data(self, retention_days: int):
        """Clean up old performance data."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Clean up old metrics
        cursor.execute("""
            DELETE FROM performance_metrics
            WHERE timestamp < datetime('now', '-{} days')
        """.format(retention_days))
        
        # Clean up old resolved alerts
        cursor.execute("""
            DELETE FROM performance_alerts
            WHERE resolved = TRUE AND resolved_at < datetime('now', '-{} days')
        """.format(retention_days))
        
        deleted_metrics = cursor.rowcount
        conn.commit()
        conn.close()
        
        logger.info(f"Cleaned up {deleted_metrics} old performance records")


class PerformanceMonitor:
    """Main continuous performance monitoring class."""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.db = PerformanceDatabase(config.database_path)
        self.monitoring_active = False
        self.current_run_id = None
        
    def start_monitoring(self):
        """Start continuous performance monitoring."""
        logger.info("Starting continuous performance monitoring...")
        self.monitoring_active = True
        
        # Schedule monitoring tasks
        schedule.every(self.config.monitoring_interval_minutes).minutes.do(self._run_monitoring_cycle)
        schedule.every().day.at("02:00").do(self._update_baselines)
        schedule.every().day.at("03:00").do(self._cleanup_old_data)
        schedule.every().hour.do(self._check_for_regressions)
        
        # Run initial monitoring cycle
        self._run_monitoring_cycle()
        
        # Start scheduler in separate thread
        def run_scheduler():
            while self.monitoring_active:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        logger.info("Continuous monitoring started")
        return scheduler_thread
    
    def stop_monitoring(self):
        """Stop continuous performance monitoring."""
        logger.info("Stopping continuous performance monitoring...")
        self.monitoring_active = False
        schedule.clear()
    
    def _run_monitoring_cycle(self):
        """Run a single monitoring cycle."""
        self.current_run_id = f"monitor_{int(time.time())}"
        start_time = datetime.utcnow()
        
        logger.info(f"Starting monitoring cycle: {self.current_run_id}")
        
        try:
            # Store monitoring run start
            conn = sqlite3.connect(self.config.database_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO monitoring_runs (run_id, status, start_time)
                VALUES (?, 'running', ?)
            """, (self.current_run_id, start_time.isoformat()))
            conn.commit()
            conn.close()
            
            metrics_collected = 0
            alerts_generated = 0
            
            # Run performance tests
            asyncio.run(self._collect_performance_metrics())
            
            # Update monitoring run status
            end_time = datetime.utcnow()
            conn = sqlite3.connect(self.config.database_path)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE monitoring_runs
                SET status = 'completed', end_time = ?, metrics_collected = ?, alerts_generated = ?
                WHERE run_id = ?
            """, (end_time.isoformat(), metrics_collected, alerts_generated, self.current_run_id))
            conn.commit()
            conn.close()
            
            logger.info(f"Monitoring cycle completed: {self.current_run_id}")
            
        except Exception as e:
            logger.error(f"Monitoring cycle failed: {e}")
            
            # Update monitoring run with error
            conn = sqlite3.connect(self.config.database_path)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE monitoring_runs
                SET status = 'failed', end_time = ?, error_message = ?
                WHERE run_id = ?
            """, (datetime.utcnow().isoformat(), str(e), self.current_run_id))
            conn.commit()
            conn.close()
    
    async def _collect_performance_metrics(self):
        """Collect current performance metrics."""
        logger.info("Collecting performance metrics...")
        
        # Test API endpoints
        await self._test_api_performance()
        
        # Test frontend performance
        await self._test_frontend_performance()
        
        # Test system metrics
        self._collect_system_metrics()
    
    async def _test_api_performance(self):
        """Test API endpoint performance."""
        endpoints = [
            ("GET", "/api/v1/health"),
            ("GET", "/api/v1/songs"),
            ("GET", "/api/v1/monitoring/metrics"),
        ]
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            for method, endpoint in endpoints:
                start_time = time.time()
                success = False
                
                try:
                    if method == "GET":
                        async with session.get(f"{self.config.base_url}{endpoint}") as response:
                            success = response.status < 400
                    
                except Exception as e:
                    logger.debug(f"API test failed for {method} {endpoint}: {e}")
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                
                metric_name = f"api_{method.lower()}_{endpoint.replace('/', '_').replace('-', '_')}"
                
                # Store metric
                self.db.store_metric(
                    metric_type="api_performance",
                    metric_name=metric_name,
                    value=response_time_ms,
                    unit="ms",
                    success=success,
                    test_run_id=self.current_run_id
                )
                
                # Check for threshold violations
                if response_time_ms > self.config.api_response_time_threshold_ms:
                    self.db.store_alert(
                        alert_type="threshold_violation",
                        metric_name=metric_name,
                        current_value=response_time_ms,
                        threshold_value=self.config.api_response_time_threshold_ms,
                        severity="warning",
                        message=f"API response time ({response_time_ms:.2f}ms) exceeds threshold ({self.config.api_response_time_threshold_ms}ms)"
                    )
                
                await asyncio.sleep(0.1)
    
    async def _test_frontend_performance(self):
        """Test frontend loading performance."""
        start_time = time.time()
        success = False
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get(self.config.frontend_url) as response:
                    if response.status == 200:
                        # Read response to simulate full page load
                        await response.read()
                        success = True
        
        except Exception as e:
            logger.debug(f"Frontend test failed: {e}")
        
        end_time = time.time()
        load_time_ms = (end_time - start_time) * 1000
        
        # Store metric
        self.db.store_metric(
            metric_type="frontend_performance",
            metric_name="frontend_load_time",
            value=load_time_ms,
            unit="ms",
            success=success,
            test_run_id=self.current_run_id
        )
        
        # Check for threshold violations
        if load_time_ms > self.config.frontend_load_time_threshold_ms:
            self.db.store_alert(
                alert_type="threshold_violation",
                metric_name="frontend_load_time",
                current_value=load_time_ms,
                threshold_value=self.config.frontend_load_time_threshold_ms,
                severity="warning",
                message=f"Frontend load time ({load_time_ms:.2f}ms) exceeds threshold ({self.config.frontend_load_time_threshold_ms}ms)"
            )
    
    def _collect_system_metrics(self):
        """Collect system performance metrics."""
        try:
            import psutil
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_usage_mb = (memory.total - memory.available) / 1024 / 1024
            
            self.db.store_metric(
                metric_type="system_performance",
                metric_name="memory_usage",
                value=memory_usage_mb,
                unit="mb",
                success=True,
                test_run_id=self.current_run_id
            )
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            self.db.store_metric(
                metric_type="system_performance",
                metric_name="cpu_usage",
                value=cpu_percent,
                unit="percent",
                success=True,
                test_run_id=self.current_run_id
            )
            
            # Check for threshold violations
            if memory_usage_mb > self.config.memory_usage_threshold_mb:
                self.db.store_alert(
                    alert_type="threshold_violation",
                    metric_name="memory_usage",
                    current_value=memory_usage_mb,
                    threshold_value=self.config.memory_usage_threshold_mb,
                    severity="warning",
                    message=f"Memory usage ({memory_usage_mb:.2f}MB) exceeds threshold ({self.config.memory_usage_threshold_mb}MB)"
                )
        
        except Exception as e:
            logger.warning(f"System metrics collection failed: {e}")
    
    def _update_baselines(self):
        """Update performance baselines based on recent data."""
        logger.info("Updating performance baselines...")
        
        # Get all unique metric names from recent data
        conn = sqlite3.connect(self.config.database_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT metric_name
            FROM performance_metrics
            WHERE timestamp > datetime('now', '-{} days') AND success = TRUE
        """.format(self.config.baseline_window_days))
        
        metric_names = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        for metric_name in metric_names:
            recent_metrics = self.db.get_recent_metrics(metric_name, hours=self.config.baseline_window_days * 24)
            successful_metrics = [m for m in recent_metrics if m["success"]]
            
            if len(successful_metrics) >= 10:  # Need at least 10 samples
                values = [m["value"] for m in successful_metrics]
                
                baseline_value = statistics.median(values)
                
                # Calculate confidence interval (simple approach)
                std_dev = statistics.stdev(values)
                confidence_lower = baseline_value - (1.96 * std_dev / len(values) ** 0.5)
                confidence_upper = baseline_value + (1.96 * std_dev / len(values) ** 0.5)
                
                self.db.update_baseline(
                    metric_name=metric_name,
                    baseline_value=baseline_value,
                    confidence_interval=(confidence_lower, confidence_upper),
                    sample_count=len(successful_metrics)
                )
                
                logger.debug(f"Updated baseline for {metric_name}: {baseline_value:.2f}")
        
        logger.info("Baseline update completed")
    
    def _check_for_regressions(self):
        """Check for performance regressions."""
        logger.info("Checking for performance regressions...")
        
        # Get all metrics with baselines
        conn = sqlite3.connect(self.config.database_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT metric_name FROM performance_baselines")
        metric_names = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        for metric_name in metric_names:
            baseline = self.db.get_baseline(metric_name)
            if not baseline:
                continue
            
            # Get recent metrics for comparison
            recent_metrics = self.db.get_recent_metrics(metric_name, hours=1)  # Last hour
            successful_metrics = [m for m in recent_metrics if m["success"]]
            
            if len(successful_metrics) >= 3:  # Need at least 3 recent samples
                recent_values = [m["value"] for m in successful_metrics]
                recent_avg = statistics.mean(recent_values)
                
                # Calculate percentage change from baseline
                if baseline.baseline_value > 0:
                    percentage_change = ((recent_avg - baseline.baseline_value) / baseline.baseline_value) * 100
                    
                    # Check for regression
                    if percentage_change > self.config.regression_threshold_percent:
                        self.db.store_alert(
                            alert_type="performance_regression",
                            metric_name=metric_name,
                            current_value=recent_avg,
                            baseline_value=baseline.baseline_value,
                            severity="critical",
                            message=f"Performance regression detected: {metric_name} increased by {percentage_change:.1f}% from baseline"
                        )
                        
                        logger.warning(f"Performance regression detected for {metric_name}: {percentage_change:.1f}% increase")
        
        # Send alerts if configured
        if self.config.enable_email_alerts:
            self._send_alert_notifications()
    
    def _send_alert_notifications(self):
        """Send email notifications for unresolved alerts."""
        if not self.config.alert_recipients:
            return
        
        unresolved_alerts = self.db.get_unresolved_alerts()
        critical_alerts = [a for a in unresolved_alerts if a["severity"] == "critical"]
        
        if critical_alerts:
            try:
                self._send_email_alert(critical_alerts)
            except Exception as e:
                logger.error(f"Failed to send email alerts: {e}")
    
    def _send_email_alert(self, alerts: List[Dict[str, Any]]):
        """Send email alert for critical performance issues."""
        if not self.config.enable_email_alerts or not self.config.alert_recipients:
            return
        
        # Create email content
        subject = f"ChordMe Performance Alert - {len(alerts)} Critical Issues"
        
        body = "ChordMe Performance Monitoring Alert\n\n"
        body += f"Critical performance issues detected:\n\n"
        
        for alert in alerts:
            body += f"• {alert['metric_name']}: {alert['message']}\n"
            body += f"  Current Value: {alert['current_value']:.2f}\n"
            if alert['baseline_value']:
                body += f"  Baseline Value: {alert['baseline_value']:.2f}\n"
            body += f"  Detected: {alert['created_at']}\n\n"
        
        body += "Please investigate these performance issues immediately.\n"
        body += f"Monitoring Dashboard: {self.config.base_url}/monitoring\n"
        
        # Send email
        try:
            msg = MimeMultipart()
            msg['From'] = self.config.email_username
            msg['Subject'] = subject
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(self.config.smtp_server, self.config.smtp_port)
            if self.config.email_username and self.config.email_password:
                server.starttls()
                server.login(self.config.email_username, self.config.email_password)
            
            for recipient in self.config.alert_recipients:
                msg['To'] = recipient
                server.send_message(msg)
                del msg['To']
            
            server.quit()
            logger.info(f"Email alerts sent to {len(self.config.alert_recipients)} recipients")
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
    
    def _cleanup_old_data(self):
        """Clean up old monitoring data."""
        logger.info("Cleaning up old monitoring data...")
        self.db.cleanup_old_data(self.config.retention_days)
    
    def get_monitoring_summary(self) -> Dict[str, Any]:
        """Get current monitoring status summary."""
        conn = sqlite3.connect(self.config.database_path)
        cursor = conn.cursor()
        
        # Get recent run statistics
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM monitoring_runs
            WHERE start_time > datetime('now', '-24 hours')
            GROUP BY status
        """)
        run_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Get alert statistics
        cursor.execute("""
            SELECT severity, COUNT(*) as count
            FROM performance_alerts
            WHERE resolved = FALSE
            GROUP BY severity
        """)
        alert_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Get recent metrics count
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM performance_metrics
            WHERE timestamp > datetime('now', '-24 hours')
        """)
        metrics_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "monitoring_active": self.monitoring_active,
            "last_24_hours": {
                "monitoring_runs": run_stats,
                "metrics_collected": metrics_count,
                "active_alerts": alert_stats
            },
            "database_path": self.config.database_path,
            "monitoring_interval_minutes": self.config.monitoring_interval_minutes
        }


def main():
    """Main function for continuous performance monitoring."""
    parser = argparse.ArgumentParser(description="Continuous Performance Monitoring for ChordMe")
    parser.add_argument("--base-url", default="http://localhost:5000", help="API base URL")
    parser.add_argument("--frontend-url", default="http://localhost:5173", help="Frontend URL")
    parser.add_argument("--interval", type=int, default=15, help="Monitoring interval in minutes")
    parser.add_argument("--database", default="/tmp/chordme_performance_monitoring.db", help="Database path")
    parser.add_argument("--retention-days", type=int, default=90, help="Data retention in days")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")
    parser.add_argument("--status", action="store_true", help="Show monitoring status")
    
    args = parser.parse_args()
    
    config = MonitoringConfig(
        base_url=args.base_url,
        frontend_url=args.frontend_url,
        monitoring_interval_minutes=args.interval,
        database_path=args.database,
        retention_days=args.retention_days
    )
    
    monitor = PerformanceMonitor(config)
    
    if args.status:
        # Show monitoring status
        summary = monitor.get_monitoring_summary()
        print("\n" + "="*60)
        print("PERFORMANCE MONITORING STATUS")
        print("="*60)
        print(f"Monitoring Active: {summary['monitoring_active']}")
        print(f"Database: {summary['database_path']}")
        print(f"Monitoring Interval: {summary['monitoring_interval_minutes']} minutes")
        
        print("\nLast 24 Hours:")
        stats = summary['last_24_hours']
        print(f"  Metrics Collected: {stats['metrics_collected']}")
        print(f"  Monitoring Runs: {stats['monitoring_runs']}")
        print(f"  Active Alerts: {stats['active_alerts']}")
        
        return
    
    if args.daemon:
        # Run as daemon
        try:
            logger.info("Starting performance monitoring daemon...")
            scheduler_thread = monitor.start_monitoring()
            
            # Keep the main thread alive
            try:
                while True:
                    time.sleep(60)
                    if not monitor.monitoring_active:
                        break
            except KeyboardInterrupt:
                logger.info("Shutting down monitoring daemon...")
                monitor.stop_monitoring()
            
        except Exception as e:
            logger.error(f"Monitoring daemon failed: {e}")
            sys.exit(1)
    else:
        # Run single monitoring cycle
        monitor._run_monitoring_cycle()
        
        # Show summary
        summary = monitor.get_monitoring_summary()
        print("\nMonitoring cycle completed.")
        print(f"Metrics collected in last 24h: {summary['last_24_hours']['metrics_collected']}")
        print(f"Active alerts: {summary['last_24_hours']['active_alerts']}")


if __name__ == "__main__":
    main()