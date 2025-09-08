import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './PerformanceMonitoring.css';

interface PerformanceMetric {
  name: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface PerformanceAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged?: boolean;
  resolved?: boolean;
}

const PerformanceMonitoring: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(true);

  useEffect(() => {
    if (isMonitoringEnabled) {
      const fetchMetrics = async () => {
        try {
          // Simulate fetching metrics
          const mockMetrics: PerformanceMetric[] = [
            {
              name: 'responseTime',
              value: 245,
              threshold: 500,
              unit: 'ms',
              status: 'healthy'
            },
            {
              name: 'errorRate',
              value: 0.5,
              threshold: 1.0,
              unit: '%',
              status: 'healthy'
            },
            {
              name: 'memoryUsage',
              value: 78,
              threshold: 85,
              unit: '%',
              status: 'warning'
            },
            {
              name: 'collaborationLatency',
              value: 95,
              threshold: 100,
              unit: 'ms',
              status: 'warning'
            }
          ];
          setMetrics(mockMetrics);

          // Simulate alerts for metrics above threshold
          const mockAlerts: PerformanceAlert[] = mockMetrics
            .filter(metric => metric.value > metric.threshold)
            .map(metric => ({
              id: `alert-${metric.name}-${Date.now()}`,
              type: metric.name,
              severity: metric.value > metric.threshold * 1.5 ? 'critical' : 'high',
              message: t(`apm.alerts.messages.${metric.name}Exceeded`, { 
                value: metric.value, 
                threshold: metric.threshold 
              }),
              timestamp: new Date().toISOString()
            }));
          
          setAlerts(mockAlerts);
        } catch (error) {
          console.error('Failed to fetch performance metrics:', error);
        }
      };

      fetchMetrics();
      const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isMonitoringEnabled, t]);

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return '#28a745';
      case 'warning': return '#ffc107';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, resolved: true }
        : alert
    ));
  };

  return (
    <div className="performance-monitoring">
      <div className="monitoring-header">
        <h2>{t('apm.title')}</h2>
        <div className="monitoring-controls">
          <span className="monitoring-status">
            {t('apm.monitoring.status')}: {' '}
            <span className={`status ${isMonitoringEnabled ? 'enabled' : 'disabled'}`}>
              {isMonitoringEnabled ? t('apm.monitoring.enabled') : t('apm.monitoring.disabled')}
            </span>
          </span>
          <button 
            className="btn-toggle-monitoring"
            onClick={() => setIsMonitoringEnabled(!isMonitoringEnabled)}
          >
            {isMonitoringEnabled ? t('apm.monitoring.disable') : t('apm.monitoring.enable')}
          </button>
        </div>
      </div>

      {isMonitoringEnabled && (
        <>
          {/* Performance Metrics */}
          <div className="metrics-section">
            <h3>{t('apm.metrics.title')}</h3>
            <div className="metrics-grid">
              {metrics.map((metric) => (
                <div key={metric.name} className="metric-card">
                  <div className="metric-header">
                    <span className="metric-name">
                      {t(`apm.metrics.${metric.name}`)}
                    </span>
                    <span 
                      className="metric-status"
                      style={{ color: getStatusColor(metric.status) }}
                    >
                      ●
                    </span>
                  </div>
                  <div className="metric-value">
                    {metric.value}{t(`apm.units.${metric.unit.toLowerCase()}`)}
                  </div>
                  <div className="metric-threshold">
                    {t('apm.thresholds.title')}: {metric.threshold}{t(`apm.units.${metric.unit.toLowerCase()}`)}
                  </div>
                  <div className="metric-progress">
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${Math.min((metric.value / metric.threshold) * 100, 100)}%`,
                        backgroundColor: getStatusColor(metric.status)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Alerts */}
          <div className="alerts-section">
            <h3>{t('apm.alerts.title')}</h3>
            {alerts.length === 0 ? (
              <div className="no-alerts">
                <span className="no-alerts-icon">✅</span>
                <p>{t('apm.alerts.noAlerts')}</p>
              </div>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`alert-card ${alert.acknowledged ? 'acknowledged' : ''} ${alert.resolved ? 'resolved' : ''}`}
                  >
                    <div className="alert-header">
                      <span 
                        className="alert-severity"
                        style={{ backgroundColor: getSeverityColor(alert.severity) }}
                      >
                        {t(`apm.alerts.severity.${alert.severity}`)}
                      </span>
                      <span className="alert-type">
                        {t(`apm.alerts.types.${alert.type}`)}
                      </span>
                      <span className="alert-timestamp">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="alert-message">
                      {alert.message}
                    </div>
                    <div className="alert-actions">
                      {!alert.acknowledged && (
                        <button 
                          className="btn-acknowledge"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          {t('apm.alerts.acknowledge')}
                        </button>
                      )}
                      {alert.acknowledged && !alert.resolved && (
                        <button 
                          className="btn-resolve"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          {t('apm.alerts.resolve')}
                        </button>
                      )}
                      {alert.acknowledged && (
                        <span className="alert-status acknowledged">
                          {t('apm.alerts.acknowledged')}
                        </span>
                      )}
                      {alert.resolved && (
                        <span className="alert-status resolved">
                          {t('apm.alerts.resolved')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceMonitoring;