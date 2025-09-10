/**
 * Report Builder Component Tests
 * 
 * Tests for the custom report builder component including:
 * - Configuration interface
 * - Drag and drop functionality
 * - Report generation
 * - Data validation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReportBuilder from '../ReportBuilder';
import businessIntelligenceService from '../../../services/businessIntelligence';
import { ReportType, ReportPeriod, ReportFormat } from '../../../types/businessIntelligence';

// Mock the business intelligence service
vi.mock('../../../services/businessIntelligence', () => ({
  default: {
    getDataSources: vi.fn(),
    getReportTemplates: vi.fn(),
    previewReport: vi.fn(),
    validateReportConfig: vi.fn(),
    generateReport: vi.fn(),
  },
}));

const mockDataSources = [
  { id: 'sessions', name: 'Performance Sessions', description: 'User practice sessions' },
  { id: 'users', name: 'Users', description: 'Student and educator data' },
  { id: 'songs', name: 'Songs', description: 'Song library and metadata' },
];

const mockTemplates = [
  {
    id: 'template1',
    name: 'Student Progress Template',
    description: 'Track individual student improvement',
    report_type: ReportType.STUDENT_PROGRESS,
    period: ReportPeriod.MONTHLY,
    filters: {},
    visualization: {},
    options: {},
  },
  {
    id: 'template2',
    name: 'Usage Analytics Template',
    description: 'Analyze platform usage patterns',
    report_type: ReportType.USAGE_PATTERNS,
    period: ReportPeriod.WEEKLY,
    filters: {},
    visualization: {},
    options: {},
  },
];

const mockPreviewData = {
  summary: {
    total_sessions: 150,
    average_completion: 85,
    unique_users: 25,
  },
  data_points: 150,
  insights: [
    { description: 'Students showing consistent improvement' },
    { description: 'Peak practice time is 6-8 PM' },
  ],
};

describe('ReportBuilder', () => {
  const mockOnReportGenerated = vi.fn();
  const mockOnSaveReport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    businessIntelligenceService.getDataSources.mockResolvedValue(mockDataSources);
    businessIntelligenceService.getReportTemplates.mockResolvedValue(mockTemplates);
    businessIntelligenceService.previewReport.mockResolvedValue(mockPreviewData);
    businessIntelligenceService.validateReportConfig.mockResolvedValue({
      valid: true,
      errors: [],
    });
    businessIntelligenceService.generateReport.mockResolvedValue({
      report_id: 'test-report-1',
      generated_at: new Date().toISOString(),
      data: mockPreviewData,
      insights: [],
      recommendations: [],
    });
  });

  it('renders report builder interface', async () => {
    render(<ReportBuilder />);

    expect(screen.getByText('Custom Report Builder')).toBeInTheDocument();
    expect(screen.getByText('Report Configuration')).toBeInTheDocument();
    expect(screen.getByText('Report Preview')).toBeInTheDocument();
    
    // Wait for data sources to load
    await waitFor(() => {
      expect(screen.getByText('Data Sources')).toBeInTheDocument();
    });
  });

  it('loads data sources and templates on mount', async () => {
    render(<ReportBuilder />);

    await waitFor(() => {
      expect(businessIntelligenceService.getDataSources).toHaveBeenCalled();
      expect(businessIntelligenceService.getReportTemplates).toHaveBeenCalled();
    });

    // Check if data sources are rendered
    await waitFor(() => {
      expect(screen.getByText('Performance Sessions')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Songs')).toBeInTheDocument();
    });

    // Check if templates are rendered
    expect(screen.getByText('Student Progress Template')).toBeInTheDocument();
    expect(screen.getByText('Usage Analytics Template')).toBeInTheDocument();
  });

  it('handles report type selection', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.STUDENT_PROGRESS);

    expect(reportTypeSelect).toHaveValue(ReportType.STUDENT_PROGRESS);
  });

  it('handles period selection', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const periodSelect = screen.getByDisplayValue('Monthly');
    await user.selectOptions(periodSelect, ReportPeriod.WEEKLY);

    expect(periodSelect).toHaveValue(ReportPeriod.WEEKLY);
  });

  it.skip('shows custom date inputs when custom period is selected', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const periodSelect = screen.getByDisplayValue('Monthly');
    await user.selectOptions(periodSelect, ReportPeriod.CUSTOM);

    // Should show date range inputs
    const startDateInput = screen.getByDisplayValue('');
    const endDateInput = screen.getAllByDisplayValue('')[1]; // Second empty input

    expect(startDateInput).toBeInTheDocument();
    expect(endDateInput).toBeInTheDocument();
    expect(startDateInput.type).toBe('date');
    expect(endDateInput.type).toBe('date');
  });

  it('generates preview when configuration changes', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    // Select report type
    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.STUDENT_PROGRESS);

    // Wait for preview to be generated
    await waitFor(() => {
      expect(businessIntelligenceService.previewReport).toHaveBeenCalled();
    });
  });

  it('displays preview data when available', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    // Select report type to trigger preview
    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.STUDENT_PROGRESS);

    // Wait for preview to load
    await waitFor(() => {
      expect(screen.getByText('Report Summary')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument(); // total_sessions
      expect(screen.getByText('85')).toBeInTheDocument(); // average_completion
      expect(screen.getByText('25')).toBeInTheDocument(); // unique_users
    });

    // Check for insights
    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.getByText('Students showing consistent improvement')).toBeInTheDocument();
  });

  it('handles visualization options', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const showTrendsCheckbox = screen.getByLabelText('Show Trends');
    const showComparisonsCheckbox = screen.getByLabelText('Show Comparisons');

    expect(showTrendsCheckbox).toBeChecked();
    expect(showComparisonsCheckbox).not.toBeChecked();

    await user.click(showComparisonsCheckbox);
    expect(showComparisonsCheckbox).toBeChecked();

    await user.click(showTrendsCheckbox);
    expect(showTrendsCheckbox).not.toBeChecked();
  });

  it('handles report options', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const detailedBreakdownCheckbox = screen.getByLabelText('Include Detailed Breakdown');
    const recommendationsCheckbox = screen.getByLabelText('Include AI Recommendations');
    const insightsCheckbox = screen.getByLabelText('Include Insights');

    expect(detailedBreakdownCheckbox).toBeChecked();
    expect(recommendationsCheckbox).toBeChecked();
    expect(insightsCheckbox).toBeChecked();

    await user.click(detailedBreakdownCheckbox);
    expect(detailedBreakdownCheckbox).not.toBeChecked();
  });

  it('handles export format selection', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const formatSelect = screen.getByDisplayValue('JSON');
    await user.selectOptions(formatSelect, ReportFormat.PDF);

    expect(formatSelect).toHaveValue(ReportFormat.PDF);
  });

  it.skip('loads template configuration when template is clicked', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Student Progress Template')).toBeInTheDocument();
    });

    // Click on template
    await user.click(screen.getByText('Student Progress Template'));

    // Check if configuration is updated
    const reportTypeSelect = screen.getByDisplayValue(ReportType.STUDENT_PROGRESS);
    const periodSelect = screen.getByDisplayValue(ReportPeriod.MONTHLY);

    expect(reportTypeSelect).toHaveValue(ReportType.STUDENT_PROGRESS);
    expect(periodSelect).toHaveValue(ReportPeriod.MONTHLY);
  });

  it('generates report when generate button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder onReportGenerated={mockOnReportGenerated} />);

    // Configure report
    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.STUDENT_PROGRESS);

    // Click generate button
    const generateButton = screen.getByText('Generate Report');
    await user.click(generateButton);

    // Verify validation and generation are called
    await waitFor(() => {
      expect(businessIntelligenceService.validateReportConfig).toHaveBeenCalled();
      expect(businessIntelligenceService.generateReport).toHaveBeenCalled();
      expect(mockOnReportGenerated).toHaveBeenCalled();
    });
  });

  it('shows loading state during report generation', async () => {
    const user = userEvent.setup();
    
    // Make generateReport take time
    businessIntelligenceService.generateReport.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<ReportBuilder />);

    // Configure report
    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.STUDENT_PROGRESS);

    // Click generate button
    const generateButton = screen.getByText('Generate Report');
    await user.click(generateButton);

    // Should show loading state
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(generateButton).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Generate Report')).toBeInTheDocument();
    });
  });

  it('displays validation errors', async () => {
    const user = userEvent.setup();
    
    // Mock validation failure
    businessIntelligenceService.validateReportConfig.mockResolvedValue({
      valid: false,
      errors: ['Missing required field: user_ids', 'Invalid date range'],
    });

    render(<ReportBuilder />);

    // Configure report
    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.STUDENT_PROGRESS);

    // Click generate button
    const generateButton = screen.getByText('Generate Report');
    await user.click(generateButton);

    // Should display errors
    await waitFor(() => {
      expect(screen.getByText('Missing required field: user_ids')).toBeInTheDocument();
      expect(screen.getByText('Invalid date range')).toBeInTheDocument();
    });

    // Should not call generateReport
    expect(businessIntelligenceService.generateReport).not.toHaveBeenCalled();
  });

  it('saves report configuration', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder onSaveReport={mockOnSaveReport} />);

    // Configure report
    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.USAGE_PATTERNS);

    // Click save button
    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    expect(mockOnSaveReport).toHaveBeenCalledWith(
      expect.objectContaining({
        report_type: ReportType.USAGE_PATTERNS,
        period: ReportPeriod.MONTHLY,
      })
    );
  });

  it('disables buttons when no report type is selected', () => {
    render(<ReportBuilder />);

    const saveButton = screen.getByText('Save Configuration');
    const generateButton = screen.getByText('Generate Report');

    expect(saveButton).toBeDisabled();
    expect(generateButton).toBeDisabled();
  });

  it('handles drag and drop for data sources', async () => {
    render(<ReportBuilder />);

    // Wait for data sources to load
    await waitFor(() => {
      expect(screen.getByText('Performance Sessions')).toBeInTheDocument();
    });

    const dataSourceItem = screen.getByText('Performance Sessions').closest('.draggable-item');
    expect(dataSourceItem).toHaveAttribute('draggable', 'true');
  });

  it('handles service errors gracefully', async () => {
    // Mock service error
    businessIntelligenceService.getDataSources.mockRejectedValue(
      new Error('Failed to load data sources')
    );

    render(<ReportBuilder />);

    // Should display error message
    await waitFor(() => {
      expect(screen.getByText('Failed to load data sources')).toBeInTheDocument();
    });
  });

  it.skip('renders with initial configuration', async () => {
    const initialConfig = {
      report_type: ReportType.BAND_COLLABORATION,
      period: ReportPeriod.QUARTERLY,
      include_detailed_breakdown: false,
      format: ReportFormat.CSV,
    };

    render(<ReportBuilder initialConfig={initialConfig} />);

    // Wait for component to stabilize and check if initial values are set
    await waitFor(() => {
      expect(screen.getByDisplayValue(ReportType.BAND_COLLABORATION)).toBeInTheDocument();
    });
    
    expect(screen.getByDisplayValue(ReportPeriod.QUARTERLY)).toBeInTheDocument();
    expect(screen.getByDisplayValue(ReportFormat.CSV)).toBeInTheDocument();
    expect(screen.getByLabelText('Include Detailed Breakdown')).not.toBeChecked();
  });

  it('shows placeholder when no report type is selected', () => {
    render(<ReportBuilder />);

    expect(screen.getByText('Report Canvas')).toBeInTheDocument();
    expect(screen.getByText('Select a report type to get started')).toBeInTheDocument();
  });

  it('shows report type badge when type is selected', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    await user.selectOptions(reportTypeSelect, ReportType.PERFORMANCE_TRENDS);

    expect(screen.getByText('PERFORMANCE TRENDS')).toBeInTheDocument();
  });
});

describe('ReportBuilder Accessibility', () => {
  it.skip('has proper aria labels and roles', () => {
    render(<ReportBuilder />);

    // Check for proper form labels
    expect(screen.getByLabelText('Report Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Time Period')).toBeInTheDocument();
    expect(screen.getByLabelText('Export Format')).toBeInTheDocument();

    // Check for proper button roles
    const generateButton = screen.getByText('Generate Report');
    expect(generateButton).toHaveAttribute('role', 'button');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);

    const reportTypeSelect = screen.getByDisplayValue('Select Report Type');
    
    // Focus and navigate with keyboard
    reportTypeSelect.focus();
    expect(reportTypeSelect).toHaveFocus();

    await user.keyboard('{Tab}');
    const periodSelect = screen.getByDisplayValue('Monthly');
    expect(periodSelect).toHaveFocus();
  });
});