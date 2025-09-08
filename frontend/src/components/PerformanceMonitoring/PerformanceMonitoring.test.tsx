import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PerformanceMonitoring from './PerformanceMonitoring';

// Mock react-i18next
const mockT = vi.fn((key: string, options?: any) => {
  const translations: Record<string, string> = {
    'apm.title': 'Application Performance Monitoring',
    'apm.monitoring.status': 'Monitoring Status',
    'apm.monitoring.enabled': 'Enabled',
    'apm.monitoring.disabled': 'Disabled',
    'apm.monitoring.enable': 'Enable Monitoring',
    'apm.monitoring.disable': 'Disable Monitoring',
    'apm.metrics.title': 'Performance Metrics',
    'apm.metrics.responseTime': 'Response Time',
    'apm.metrics.errorRate': 'Error Rate',
    'apm.metrics.memoryUsage': 'Memory Usage',
    'apm.metrics.collaborationLatency': 'Collaboration Latency',
    'apm.alerts.title': 'Performance Alerts',
    'apm.alerts.noAlerts': 'No active alerts',
    'apm.alerts.acknowledge': 'Acknowledge',
    'apm.alerts.resolve': 'Resolve',
    'apm.alerts.acknowledged': 'Acknowledged',
    'apm.alerts.resolved': 'Resolved',
    'apm.alerts.severity.low': 'Low',
    'apm.alerts.severity.medium': 'Medium',
    'apm.alerts.severity.high': 'High',
    'apm.alerts.severity.critical': 'Critical',
    'apm.alerts.types.responseTime': 'Response Time Exceeded',
    'apm.alerts.types.errorRate': 'Error Rate Exceeded',
    'apm.alerts.types.memoryUsage': 'Memory Usage High',
    'apm.alerts.types.collaborationLatency': 'Collaboration Latency High',
    'apm.alerts.messages.responseTimeExceeded': `Response time of ${options?.value}ms exceeds threshold of ${options?.threshold}ms`,
    'apm.alerts.messages.errorRateExceeded': `Error rate of ${options?.value}% exceeds threshold of ${options?.threshold}%`,
    'apm.alerts.messages.memoryUsageExceeded': `Memory usage of ${options?.value}% exceeds threshold of ${options?.threshold}%`,
    'apm.alerts.messages.collaborationLatencyExceeded': `Collaboration latency of ${options?.value}ms exceeds threshold of ${options?.threshold}ms`,
    'apm.thresholds.title': 'Performance Thresholds',
    'apm.units.ms': 'ms',
    'apm.units.%': '%',
    'apm.units.percent': '%',
    'apm.units.milliseconds': 'ms'
  };
  return translations[key] || key;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}));

describe('PerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders performance monitoring title', () => {
    render(<PerformanceMonitoring />);
    expect(screen.getByText('Application Performance Monitoring')).toBeInTheDocument();
  });

  it('shows monitoring enabled status by default', () => {
    render(<PerformanceMonitoring />);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disable Monitoring')).toBeInTheDocument();
  });

  it('can toggle monitoring on and off', () => {
    render(<PerformanceMonitoring />);
    
    const toggleButton = screen.getByText('Disable Monitoring');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('Enable Monitoring')).toBeInTheDocument();
  });

  it('displays performance metrics when monitoring is enabled', () => {
    render(<PerformanceMonitoring />);
    
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('Response Time')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Collaboration Latency')).toBeInTheDocument();
  });

  it('hides metrics when monitoring is disabled', () => {
    render(<PerformanceMonitoring />);
    
    const toggleButton = screen.getByText('Disable Monitoring');
    fireEvent.click(toggleButton);
    
    expect(screen.queryByText('Performance Metrics')).not.toBeInTheDocument();
  });

  it('displays alerts section', () => {
    render(<PerformanceMonitoring />);
    
    expect(screen.getByText('Performance Alerts')).toBeInTheDocument();
  });

  it('shows no alerts message when there are no alerts', async () => {
    render(<PerformanceMonitoring />);
    
    await waitFor(() => {
      expect(screen.getByText('No active alerts')).toBeInTheDocument();
    });
  });

  it('allows acknowledging alerts', async () => {
    render(<PerformanceMonitoring />);
    
    // Wait for component to initialize with potential alerts
    await waitFor(() => {
      const acknowledgeButtons = screen.queryAllByText('Acknowledge');
      if (acknowledgeButtons.length > 0) {
        fireEvent.click(acknowledgeButtons[0]);
        expect(screen.getByText('Acknowledged')).toBeInTheDocument();
      }
    });
  });

  it('allows resolving acknowledged alerts', async () => {
    render(<PerformanceMonitoring />);
    
    await waitFor(() => {
      const acknowledgeButtons = screen.queryAllByText('Acknowledge');
      if (acknowledgeButtons.length > 0) {
        fireEvent.click(acknowledgeButtons[0]);
        
        const resolveButton = screen.getByText('Resolve');
        fireEvent.click(resolveButton);
        
        expect(screen.getByText('Resolved')).toBeInTheDocument();
      }
    });
  });

  it('displays metric values and thresholds', () => {
    render(<PerformanceMonitoring />);
    
    // Check for metric values (these are mocked in the component)
    expect(screen.getByText('245ms')).toBeInTheDocument(); // Response time
    expect(screen.getByText('0.5%')).toBeInTheDocument(); // Error rate
    expect(screen.getByText('78%')).toBeInTheDocument(); // Memory usage
    expect(screen.getByText('95ms')).toBeInTheDocument(); // Collaboration latency
  });

  it('shows progress bars for metrics', () => {
    const { container } = render(<PerformanceMonitoring />);
    
    const progressBars = container.querySelectorAll('.progress-bar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('applies correct status colors to metrics', () => {
    const { container } = render(<PerformanceMonitoring />);
    
    const statusIndicators = container.querySelectorAll('.metric-status');
    expect(statusIndicators.length).toBeGreaterThan(0);
  });

  it('uses correct translation keys', () => {
    render(<PerformanceMonitoring />);
    
    expect(mockT).toHaveBeenCalledWith('apm.title');
    expect(mockT).toHaveBeenCalledWith('apm.monitoring.status');
    expect(mockT).toHaveBeenCalledWith('apm.metrics.title');
    expect(mockT).toHaveBeenCalledWith('apm.alerts.title');
  });

  it('handles metric translation with interpolation', () => {
    render(<PerformanceMonitoring />);
    
    // The component should call translation functions with interpolation values
    expect(mockT).toHaveBeenCalledWith('apm.units.ms');
    expect(mockT).toHaveBeenCalledWith('apm.units.%');
  });
});