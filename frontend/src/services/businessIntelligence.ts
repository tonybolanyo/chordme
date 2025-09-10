/**
 * Business Intelligence Service
 * 
 * Frontend service for BI and reporting functionality including:
 * - Report generation and management
 * - Custom dashboard creation
 * - Data export and external BI integration
 * - AI insights and recommendations
 * - Goal setting and progress tracking
 */

import { apiCall } from '../utils/apiUtils';
import {
  ReportConfig,
  GeneratedReport,
  ScheduledReport,
  DashboardConfig,
  DataExport,
  AIRecommendations,
  ExternalBIConnection,
  Goal,
  HealthStatus,
  BIApiResponse,
  DeliverySettings,
  GoalProgress
} from '../types/businessIntelligence';

class BusinessIntelligenceService {
  private baseUrl = '/api/v1/bi';

  /**
   * Generate a business intelligence report
   */
  async generateReport(config: ReportConfig): Promise<GeneratedReport> {
    const response = await apiCall<BIApiResponse<GeneratedReport>>(
      `${this.baseUrl}/reports/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to generate report');
    }

    return response.data!;
  }

  /**
   * Schedule a report for automated generation
   */
  async scheduleReport(
    reportConfig: ReportConfig,
    schedule: string,
    deliverySettings?: DeliverySettings
  ): Promise<ScheduledReport> {
    const requestBody = {
      report_config: reportConfig,
      schedule,
      ...deliverySettings,
    };

    const response = await apiCall<BIApiResponse<ScheduledReport>>(
      `${this.baseUrl}/reports/schedule`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to schedule report');
    }

    return response.data!;
  }

  /**
   * Get list of scheduled reports
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    const response = await apiCall<BIApiResponse<ScheduledReport[]>>(
      `${this.baseUrl}/reports/scheduled`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get scheduled reports');
    }

    return response.data || [];
  }

  /**
   * Update scheduled report
   */
  async updateScheduledReport(
    scheduleId: string,
    updates: Partial<ScheduledReport>
  ): Promise<ScheduledReport> {
    const response = await apiCall<BIApiResponse<ScheduledReport>>(
      `${this.baseUrl}/reports/scheduled/${scheduleId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to update scheduled report');
    }

    return response.data!;
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(scheduleId: string): Promise<void> {
    const response = await apiCall<BIApiResponse<void>>(
      `${this.baseUrl}/reports/scheduled/${scheduleId}`,
      {
        method: 'DELETE',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to delete scheduled report');
    }
  }

  /**
   * Export data for external BI tools
   */
  async exportData(
    dataType: 'sessions' | 'performances' | 'users' | 'songs' | 'analytics',
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json',
    filters?: Record<string, string | number | boolean | string[]>
  ): Promise<DataExport> {
    const requestBody = {
      data_type: dataType,
      start_date: startDate,
      end_date: endDate,
      format,
      filters,
    };

    const response = await apiCall<BIApiResponse<DataExport>>(
      `${this.baseUrl}/export/data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to export data');
    }

    return response.data!;
  }

  /**
   * Create custom dashboard
   */
  async createCustomDashboard(dashboardConfig: Omit<DashboardConfig, 'dashboard_id' | 'created_by' | 'created_at'>): Promise<DashboardConfig> {
    const response = await apiCall<BIApiResponse<DashboardConfig>>(
      `${this.baseUrl}/dashboards/custom`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboardConfig),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to create dashboard');
    }

    return response.data!;
  }

  /**
   * Get list of custom dashboards
   */
  async getCustomDashboards(): Promise<DashboardConfig[]> {
    const response = await apiCall<BIApiResponse<DashboardConfig[]>>(
      `${this.baseUrl}/dashboards/custom`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get dashboards');
    }

    return response.data || [];
  }

  /**
   * Update custom dashboard
   */
  async updateCustomDashboard(
    dashboardId: string,
    updates: Partial<DashboardConfig>
  ): Promise<DashboardConfig> {
    const response = await apiCall<BIApiResponse<DashboardConfig>>(
      `${this.baseUrl}/dashboards/custom/${dashboardId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to update dashboard');
    }

    return response.data!;
  }

  /**
   * Delete custom dashboard
   */
  async deleteCustomDashboard(dashboardId: string): Promise<void> {
    const response = await apiCall<BIApiResponse<void>>(
      `${this.baseUrl}/dashboards/custom/${dashboardId}`,
      {
        method: 'DELETE',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to delete dashboard');
    }
  }

  /**
   * Get AI-powered insights and recommendations
   */
  async getAIRecommendations(
    userId?: number,
    organizationId?: number,
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ): Promise<AIRecommendations> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (organizationId) params.append('organization_id', organizationId.toString());
    params.append('period', period);

    const response = await apiCall<BIApiResponse<AIRecommendations>>(
      `${this.baseUrl}/insights/recommendations?${params.toString()}`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get recommendations');
    }

    return response.data!;
  }

  /**
   * Get BI services health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const response = await apiCall<HealthStatus>(
      `${this.baseUrl}/health`,
      {
        method: 'GET',
      }
    );

    return response;
  }

  /**
   * Create external BI connection
   */
  async createExternalBIConnection(connection: Omit<ExternalBIConnection, 'connection_id' | 'created_by' | 'created_at'>): Promise<ExternalBIConnection> {
    const response = await apiCall<BIApiResponse<ExternalBIConnection>>(
      `${this.baseUrl}/integrations/external`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connection),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to create BI connection');
    }

    return response.data!;
  }

  /**
   * Get list of external BI connections
   */
  async getExternalBIConnections(): Promise<ExternalBIConnection[]> {
    const response = await apiCall<BIApiResponse<ExternalBIConnection[]>>(
      `${this.baseUrl}/integrations/external`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get BI connections');
    }

    return response.data || [];
  }

  /**
   * Test external BI connection
   */
  async testExternalBIConnection(connectionId: string): Promise<{ status: 'success' | 'failed'; message: string }> {
    const response = await apiCall<BIApiResponse<{ status: 'success' | 'failed'; message: string }>>(
      `${this.baseUrl}/integrations/external/${connectionId}/test`,
      {
        method: 'POST',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to test connection');
    }

    return response.data!;
  }

  /**
   * Sync data to external BI tool
   */
  async syncToExternalBI(connectionId: string, dataSource: string): Promise<{ job_id: string }> {
    const response = await apiCall<BIApiResponse<{ job_id: string }>>(
      `${this.baseUrl}/integrations/external/${connectionId}/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data_source: dataSource }),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to start sync');
    }

    return response.data!;
  }

  /**
   * Create goal for student/user
   */
  async createGoal(goal: Omit<Goal, 'goal_id' | 'current_value' | 'progress_percentage' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const response = await apiCall<BIApiResponse<Goal>>(
      `${this.baseUrl}/goals`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goal),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to create goal');
    }

    return response.data!;
  }

  /**
   * Get goals for user
   */
  async getGoals(userId?: number): Promise<Goal[]> {
    const params = userId ? `?user_id=${userId}` : '';
    const response = await apiCall<BIApiResponse<Goal[]>>(
      `${this.baseUrl}/goals${params}`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get goals');
    }

    return response.data || [];
  }

  /**
   * Update goal
   */
  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal> {
    const response = await apiCall<BIApiResponse<Goal>>(
      `${this.baseUrl}/goals/${goalId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to update goal');
    }

    return response.data!;
  }

  /**
   * Record goal progress
   */
  async recordGoalProgress(goalId: string, progress: Omit<GoalProgress, 'goal_id' | 'recorded_at'>): Promise<GoalProgress> {
    const response = await apiCall<BIApiResponse<GoalProgress>>(
      `${this.baseUrl}/goals/${goalId}/progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progress),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to record progress');
    }

    return response.data!;
  }

  /**
   * Get goal progress history
   */
  async getGoalProgress(goalId: string): Promise<GoalProgress[]> {
    const response = await apiCall<BIApiResponse<GoalProgress[]>>(
      `${this.baseUrl}/goals/${goalId}/progress`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get goal progress');
    }

    return response.data || [];
  }

  /**
   * Get report templates
   */
  async getReportTemplates(): Promise<any[]> {
    const response = await apiCall<BIApiResponse<any[]>>(
      `${this.baseUrl}/templates`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get report templates');
    }

    return response.data || [];
  }

  /**
   * Preview report data before generation
   */
  async previewReport(config: ReportConfig): Promise<unknown> {
    const response = await apiCall<BIApiResponse<unknown>>(
      `${this.baseUrl}/reports/preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to preview report');
    }

    return response.data;
  }

  /**
   * Get available data sources for report building
   */
  async getDataSources(): Promise<any[]> {
    const response = await apiCall<BIApiResponse<any[]>>(
      `${this.baseUrl}/data-sources`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get data sources');
    }

    return response.data || [];
  }

  /**
   * Get data fields for a specific data source
   */
  async getDataFields(dataSource: string): Promise<any[]> {
    const response = await apiCall<BIApiResponse<any[]>>(
      `${this.baseUrl}/data-sources/${dataSource}/fields`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get data fields');
    }

    return response.data || [];
  }

  /**
   * Validate report configuration
   */
  async validateReportConfig(config: ReportConfig): Promise<{ valid: boolean; errors: string[] }> {
    const response = await apiCall<BIApiResponse<{ valid: boolean; errors: string[] }>>(
      `${this.baseUrl}/reports/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to validate config');
    }

    return response.data!;
  }

  /**
   * Get report generation history
   */
  async getReportHistory(limit?: number): Promise<GeneratedReport[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiCall<BIApiResponse<GeneratedReport[]>>(
      `${this.baseUrl}/reports/history${params}`,
      {
        method: 'GET',
      }
    );

    if (response.status === 'error') {
      throw new Error(response.error?.message || 'Failed to get report history');
    }

    return response.data || [];
  }

  /**
   * Download report in specified format
   */
  async downloadReport(reportId: string, format: 'pdf' | 'csv' | 'excel'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/reports/${reportId}/download?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    return response.blob();
  }
}

// Export singleton instance
export const businessIntelligenceService = new BusinessIntelligenceService();
export default businessIntelligenceService;