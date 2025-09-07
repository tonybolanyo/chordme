/**
 * Performance Monitoring Dashboard
 * Real-time display of performance metrics for Milestone 3 features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';
import './PerformanceMonitoringDashboard.css';

interface PerformanceMonitoringDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

interface PerformanceStatus {
  collaboration: {
    averageLatency: number;
    withinThreshold: boolean;
    threshold: number;
    recentOperations: number;
  };
  audioSync: {
    averageAccuracy: number;
    withinThreshold: boolean;
    threshold: number;
    recentMeasurements: number;
  };
  memory: {
    usageRatio: number;
    withinThreshold: boolean;
    threshold: number;
    heapUsed: number;
    heapLimit: number;
  };
  network: {
    averageLatency: number;
    recentRequests: number;
    totalDataTransferred: number;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    recent: number;
  };
}

const PerformanceMonitoringDashboard: React.FC<PerformanceMonitoringDashboardProps> = ({
  isVisible,
  onClose
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [alerts, setAlerts] = useState<any[]>([]);

  // Update performance data
  const updatePerformanceData = useCallback(() => {
    const summary = performanceMonitoringService.getPerformanceSummary();
    setPerformanceData(summary);

    // Get recent alerts
    const detailedMetrics = performanceMonitoringService.getDetailedMetrics();
    const recentAlerts = detailedMetrics.alerts.slice(-10); // Last 10 alerts
    setAlerts(recentAlerts);
  }, []);

  // Performance monitoring listener
  useEffect(() => {
    const handlePerformanceUpdate = (data: any) => {
      if (data.type === 'alert') {
        setAlerts(prev => [...prev.slice(-9), data.alert]); // Keep last 10 alerts
      }
      updatePerformanceData();
    };

    if (isVisible) {
      performanceMonitoringService.addListener(handlePerformanceUpdate);
      updatePerformanceData();
      setIsMonitoring(true);

      return () => {
        performanceMonitoringService.removeListener(handlePerformanceUpdate);
        setIsMonitoring(false);
      };
    }
  }, [isVisible, updatePerformanceData]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh && isVisible) {
      const timer = setInterval(updatePerformanceData, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [autoRefresh, isVisible, refreshInterval, updatePerformanceData]);

  if (!isVisible) {
    return null;
  }

  const getStatusColor = (withinThreshold: boolean, value: number, threshold: number) => {
    if (withinThreshold) return 'green';
    if (value > threshold * 0.8) return 'orange';
    return 'red';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="performance-monitoring-dashboard">
      <div className="dashboard-header">
        <h3>Performance Monitoring Dashboard</h3>
        <div className="dashboard-controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button onClick={updatePerformanceData} className="refresh-btn">
            Refresh
          </button>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
      </div>

      {performanceData ? (
        <div className="dashboard-content">
          {/* Real-time Collaboration Performance */}
          <div className="metric-section">
            <h4>Real-time Collaboration Performance</h4>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Average Latency</div>
                <div 
                  className="metric-value"
                  style={{ 
                    color: getStatusColor(
                      performanceData.collaboration.withinThreshold,
                      performanceData.collaboration.averageLatency,
                      performanceData.collaboration.threshold
                    )
                  }}
                >
                  {performanceData.collaboration.averageLatency}ms
                </div>
                <div className="metric-threshold">
                  Target: ≤{performanceData.collaboration.threshold}ms
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Recent Operations</div>
                <div className="metric-value">
                  {performanceData.collaboration.recentOperations}
                </div>
                <div className="metric-threshold">Last 5 minutes</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Status</div>
                <div 
                  className={`metric-status ${performanceData.collaboration.withinThreshold ? 'good' : 'poor'}`}
                >
                  {performanceData.collaboration.withinThreshold ? '✓ Good' : '⚠ Poor'}
                </div>
              </div>
            </div>
          </div>

          {/* Audio Synchronization Accuracy */}
          <div className="metric-section">
            <h4>Audio Synchronization Accuracy</h4>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Average Deviation</div>
                <div 
                  className="metric-value"
                  style={{ 
                    color: getStatusColor(
                      performanceData.audioSync.withinThreshold,
                      performanceData.audioSync.averageAccuracy,
                      performanceData.audioSync.threshold
                    )
                  }}
                >
                  {performanceData.audioSync.averageAccuracy}ms
                </div>
                <div className="metric-threshold">
                  Target: ≤{performanceData.audioSync.threshold}ms
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Recent Measurements</div>
                <div className="metric-value">
                  {performanceData.audioSync.recentMeasurements}
                </div>
                <div className="metric-threshold">Last 5 minutes</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Status</div>
                <div 
                  className={`metric-status ${performanceData.audioSync.withinThreshold ? 'good' : 'poor'}`}
                >
                  {performanceData.audioSync.withinThreshold ? '✓ Accurate' : '⚠ Inaccurate'}
                </div>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="metric-section">
            <h4>Memory Usage</h4>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Heap Usage</div>
                <div 
                  className="metric-value"
                  style={{ 
                    color: getStatusColor(
                      performanceData.memory.withinThreshold,
                      performanceData.memory.usageRatio,
                      performanceData.memory.threshold
                    )
                  }}
                >
                  {(performanceData.memory.usageRatio * 100).toFixed(1)}%
                </div>
                <div className="metric-threshold">
                  Target: ≤{(performanceData.memory.threshold * 100).toFixed(0)}%
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Used Memory</div>
                <div className="metric-value">
                  {formatBytes(performanceData.memory.heapUsed)}
                </div>
                <div className="metric-threshold">
                  of {formatBytes(performanceData.memory.heapLimit)}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Status</div>
                <div 
                  className={`metric-status ${performanceData.memory.withinThreshold ? 'good' : 'poor'}`}
                >
                  {performanceData.memory.withinThreshold ? '✓ Healthy' : '⚠ High'}
                </div>
              </div>
            </div>
          </div>

          {/* Network Performance */}
          <div className="metric-section">
            <h4>Network Performance</h4>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Average Latency</div>
                <div className="metric-value">
                  {performanceData.network.averageLatency.toFixed(0)}ms
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Recent Requests</div>
                <div className="metric-value">
                  {performanceData.network.recentRequests}
                </div>
                <div className="metric-threshold">Last 5 minutes</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Data Transferred</div>
                <div className="metric-value">
                  {formatBytes(performanceData.network.totalDataTransferred)}
                </div>
                <div className="metric-threshold">Recent total</div>
              </div>
            </div>
          </div>

          {/* Alerts Summary */}
          <div className="metric-section">
            <h4>Performance Alerts</h4>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Critical Alerts</div>
                <div className={`metric-value ${performanceData.alerts.critical > 0 ? 'critical' : ''}`}>
                  {performanceData.alerts.critical}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Warning Alerts</div>
                <div className={`metric-value ${performanceData.alerts.warning > 0 ? 'warning' : ''}`}>
                  {performanceData.alerts.warning}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Recent Alerts</div>
                <div className="metric-value">
                  {performanceData.alerts.recent}
                </div>
                <div className="metric-threshold">Last 5 minutes</div>
              </div>
            </div>
          </div>

          {/* Recent Alerts List */}
          {alerts.length > 0 && (
            <div className="alerts-section">
              <h4>Recent Alerts</h4>
              <div className="alerts-list">
                {alerts.slice(-5).reverse().map((alert, index) => (
                  <div key={index} className={`alert-item ${alert.severity}`}>
                    <div className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-value">
                      {alert.value.toFixed(1)} / {alert.threshold}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Controls */}
          <div className="dashboard-actions">
            <button 
              onClick={() => performanceMonitoringService.exportMetrics()}
              className="export-btn"
            >
              Export Metrics to Backend
            </button>
            <button 
              onClick={() => performanceMonitoringService.clearMetrics()}
              className="clear-btn"
            >
              Clear Local Metrics
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-loading">
          <p>Loading performance data...</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitoringDashboard;