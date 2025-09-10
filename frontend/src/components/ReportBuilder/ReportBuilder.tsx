/**
 * Custom Report Builder Component
 * 
 * Provides a drag-and-drop interface for creating custom business intelligence reports.
 * Features:
 * - Visual report configuration
 * - Real-time preview
 * - Multiple visualization types
 * - Filter and parameter configuration
 * - Export and scheduling options
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReportType,
  ReportPeriod,
  ReportFormat,
  ReportConfig,
  ReportBuilderState,
  WidgetType,
  ChartType,
  DragItem,
  DropZone,
  DragContext,
  GeneratedReport
} from '../../types/businessIntelligence';
import businessIntelligenceService from '../../services/businessIntelligence';
import './ReportBuilder.css';

interface ReportBuilderProps {
  onReportGenerated?: (report: GeneratedReport) => void;
  onSaveReport?: (config: ReportConfig) => void;
  initialConfig?: Partial<ReportConfig>;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onReportGenerated,
  onSaveReport,
  initialConfig
}) => {
  const [builderState, setBuilderState] = useState<ReportBuilderState>({
    report_type: initialConfig?.report_type || null,
    period: initialConfig?.period || ReportPeriod.MONTHLY,
    date_range: {
      start: initialConfig?.start_date ? new Date(initialConfig.start_date) : null,
      end: initialConfig?.end_date ? new Date(initialConfig.end_date) : null,
    },
    filters: {
      user_ids: initialConfig?.user_ids || [],
      organization_id: initialConfig?.organization_id,
      song_ids: [],
      setlist_ids: [],
      device_types: [],
    },
    visualization: {
      chart_types: [ChartType.LINE],
      show_trends: true,
      show_comparisons: false,
      breakdown_by: [],
      aggregation_level: 'daily',
    },
    options: {
      include_detailed_breakdown: initialConfig?.include_detailed_breakdown ?? true,
      include_recommendations: initialConfig?.include_recommendations ?? true,
      include_insights: true,
      include_raw_data: false,
      format: initialConfig?.format || ReportFormat.JSON,
      auto_refresh: false,
    },
    is_generating: false,
    errors: [],
  });

  const [dragContext, setDragContext] = useState<DragContext>({
    drag_item: null,
    drop_zones: [],
    is_dragging: false,
    hover_zone: null,
  });

  const [availableDataSources, setAvailableDataSources] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [reportTemplates, setReportTemplates] = useState<any[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load available data sources and templates on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [dataSources, templates] = await Promise.all([
          businessIntelligenceService.getDataSources(),
          businessIntelligenceService.getReportTemplates(),
        ]);
        setAvailableDataSources(dataSources);
        setReportTemplates(templates);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setBuilderState(prev => ({
          ...prev,
          errors: [...prev.errors, 'Failed to load data sources']
        }));
      }
    };

    loadInitialData();
  }, []);

  // Update preview when configuration changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (builderState.report_type && builderState.period) {
        generatePreview();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [builderState.report_type, builderState.period, builderState.filters]);

  const generatePreview = async () => {
    try {
      const config = buildReportConfig();
      const preview = await businessIntelligenceService.previewReport(config);
      setPreviewData(preview);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const buildReportConfig = (): ReportConfig => {
    return {
      report_type: builderState.report_type!,
      period: builderState.period,
      start_date: builderState.date_range.start?.toISOString(),
      end_date: builderState.date_range.end?.toISOString(),
      user_ids: builderState.filters.user_ids,
      organization_id: builderState.filters.organization_id,
      include_detailed_breakdown: builderState.options.include_detailed_breakdown,
      include_recommendations: builderState.options.include_recommendations,
      format: builderState.options.format,
    };
  };

  const handleReportTypeChange = (reportType: ReportType) => {
    setBuilderState(prev => ({
      ...prev,
      report_type: reportType,
      errors: prev.errors.filter(e => !e.includes('report type'))
    }));
  };

  const handlePeriodChange = (period: ReportPeriod) => {
    setBuilderState(prev => ({
      ...prev,
      period,
      date_range: period === ReportPeriod.CUSTOM ? prev.date_range : { start: null, end: null }
    }));
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setBuilderState(prev => ({
      ...prev,
      date_range: { start, end }
    }));
  };

  const handleFilterChange = (filterKey: string, value: unknown) => {
    setBuilderState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterKey]: value
      }
    }));
  };

  const handleVisualizationChange = (vizKey: string, value: unknown) => {
    setBuilderState(prev => ({
      ...prev,
      visualization: {
        ...prev.visualization,
        [vizKey]: value
      }
    }));
  };

  const handleOptionsChange = (optionKey: string, value: unknown) => {
    setBuilderState(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [optionKey]: value
      }
    }));
  };

  // Drag and Drop Handlers
  const handleDragStart = useCallback((item: DragItem) => {
    setDragContext(prev => ({
      ...prev,
      drag_item: item,
      is_dragging: true
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragContext(prev => ({
      ...prev,
      drag_item: null,
      is_dragging: false,
      hover_zone: null
    }));
  }, []);

  const handleDrop = useCallback((dropZone: DropZone) => {
    if (!dragContext.drag_item) return;

    const { drag_item } = dragContext;

    if (drag_item.type === 'widget') {
      // Add widget to canvas
      const widgetConfig = {
        type: drag_item.content.type as WidgetType,
        title: drag_item.content.title,
        data_source: drag_item.content.data_source,
        config: drag_item.content.config || {},
      };

      // Handle widget drop logic here
      console.log('Dropped widget:', widgetConfig, 'on zone:', dropZone);
    } else if (drag_item.type === 'data_field') {
      // Add data field to configuration
      handleFilterChange('selected_fields', [
        ...builderState.filters.user_ids, // Using user_ids as example
        drag_item.content.field_name
      ]);
    }

    handleDragEnd();
  }, [dragContext.drag_item, builderState.filters, handleDragEnd]);

  const generateReport = async () => {
    setBuilderState(prev => ({ ...prev, is_generating: true, errors: [] }));

    try {
      // Validate configuration
      const config = buildReportConfig();
      const validation = await businessIntelligenceService.validateReportConfig(config);

      if (!validation.valid) {
        setBuilderState(prev => ({
          ...prev,
          errors: validation.errors,
          is_generating: false
        }));
        return;
      }

      // Generate report
      const report = await businessIntelligenceService.generateReport(config);
      
      setBuilderState(prev => ({ ...prev, is_generating: false }));
      
      if (onReportGenerated) {
        onReportGenerated(report);
      }
    } catch (error) {
      setBuilderState(prev => ({
        ...prev,
        is_generating: false,
        errors: [error instanceof Error ? error.message : 'Failed to generate report']
      }));
    }
  };

  const saveReport = () => {
    const config = buildReportConfig();
    if (onSaveReport) {
      onSaveReport(config);
    }
  };

  const loadTemplate = (template: unknown) => {
    setBuilderState(prev => ({
      ...prev,
      report_type: template.report_type,
      period: template.period,
      filters: { ...prev.filters, ...template.filters },
      visualization: { ...prev.visualization, ...template.visualization },
      options: { ...prev.options, ...template.options }
    }));
  };

  return (
    <div className="report-builder">
      <div className="report-builder-header">
        <h2>Custom Report Builder</h2>
        <div className="report-builder-actions">
          <button
            className="btn btn-secondary"
            onClick={saveReport}
            disabled={!builderState.report_type}
          >
            Save Configuration
          </button>
          <button
            className="btn btn-primary"
            onClick={generateReport}
            disabled={!builderState.report_type || builderState.is_generating}
          >
            {builderState.is_generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {builderState.errors.length > 0 && (
        <div className="report-builder-errors">
          {builderState.errors.map((error, index) => (
            <div key={index} className="error-message">
              {error}
            </div>
          ))}
        </div>
      )}

      <div className="report-builder-content">
        {/* Left Sidebar - Configuration Panel */}
        <div className="report-builder-sidebar">
          <div className="configuration-panel">
            <h3>Report Configuration</h3>

            {/* Report Type Selection */}
            <div className="config-section">
              <label htmlFor="report-type-select">Report Type</label>
              <select
                id="report-type-select"
                value={builderState.report_type || ''}
                onChange={(e) => handleReportTypeChange(e.target.value as ReportType)}
              >
                <option value="">Select Report Type</option>
                <option value={ReportType.STUDENT_PROGRESS}>Student Progress</option>
                <option value={ReportType.BAND_COLLABORATION}>Band Collaboration</option>
                <option value={ReportType.USAGE_PATTERNS}>Usage Patterns</option>
                <option value={ReportType.PERFORMANCE_TRENDS}>Performance Trends</option>
                <option value={ReportType.COMPARATIVE_ANALYSIS}>Comparative Analysis</option>
                <option value={ReportType.CUSTOM}>Custom</option>
              </select>
            </div>

            {/* Time Period Selection */}
            <div className="config-section">
              <label htmlFor="period-select">Time Period</label>
              <select
                id="period-select"
                value={builderState.period}
                onChange={(e) => handlePeriodChange(e.target.value as ReportPeriod)}
              >
                <option value={ReportPeriod.DAILY}>Daily</option>
                <option value={ReportPeriod.WEEKLY}>Weekly</option>
                <option value={ReportPeriod.MONTHLY}>Monthly</option>
                <option value={ReportPeriod.QUARTERLY}>Quarterly</option>
                <option value={ReportPeriod.YEARLY}>Yearly</option>
                <option value={ReportPeriod.CUSTOM}>Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {builderState.period === ReportPeriod.CUSTOM && (
              <div className="config-section">
                <label>Date Range</label>
                <div className="date-range-inputs">
                  <input
                    type="date"
                    value={builderState.date_range.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => handleDateRangeChange(
                      e.target.value ? new Date(e.target.value) : null,
                      builderState.date_range.end
                    )}
                  />
                  <input
                    type="date"
                    value={builderState.date_range.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => handleDateRangeChange(
                      builderState.date_range.start,
                      e.target.value ? new Date(e.target.value) : null
                    )}
                  />
                </div>
              </div>
            )}

            {/* Visualization Options */}
            <div className="config-section">
              <label>Visualization</label>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={builderState.visualization.show_trends}
                    onChange={(e) => handleVisualizationChange('show_trends', e.target.checked)}
                  />
                  Show Trends
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={builderState.visualization.show_comparisons}
                    onChange={(e) => handleVisualizationChange('show_comparisons', e.target.checked)}
                  />
                  Show Comparisons
                </label>
              </div>
            </div>

            {/* Report Options */}
            <div className="config-section">
              <label>Options</label>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={builderState.options.include_detailed_breakdown}
                    onChange={(e) => handleOptionsChange('include_detailed_breakdown', e.target.checked)}
                  />
                  Include Detailed Breakdown
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={builderState.options.include_recommendations}
                    onChange={(e) => handleOptionsChange('include_recommendations', e.target.checked)}
                  />
                  Include AI Recommendations
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={builderState.options.include_insights}
                    onChange={(e) => handleOptionsChange('include_insights', e.target.checked)}
                  />
                  Include Insights
                </label>
              </div>
            </div>

            {/* Export Format */}
            <div className="config-section">
              <label htmlFor="format-select">Export Format</label>
              <select
                id="format-select"
                value={builderState.options.format}
                onChange={(e) => handleOptionsChange('format', e.target.value as ReportFormat)}
              >
                <option value={ReportFormat.JSON}>JSON</option>
                <option value={ReportFormat.PDF}>PDF</option>
                <option value={ReportFormat.CSV}>CSV</option>
              </select>
            </div>
          </div>

          {/* Data Sources Panel */}
          <div className="data-sources-panel">
            <h3>Data Sources</h3>
            <div className="draggable-items">
              {availableDataSources.map((source, index) => (
                <div
                  key={index}
                  className="draggable-item"
                  draggable
                  onDragStart={() => handleDragStart({
                    type: 'data_field',
                    id: source.id,
                    content: source,
                    preview: source.name
                  })}
                >
                  <span className="item-icon">📊</span>
                  <span className="item-name">{source.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Templates Panel */}
          {reportTemplates.length > 0 && (
            <div className="templates-panel">
              <h3>Report Templates</h3>
              <div className="template-list">
                {reportTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="template-item"
                    onClick={() => loadTemplate(template)}
                  >
                    <span className="template-name">{template.name}</span>
                    <span className="template-description">{template.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Canvas Area */}
        <div className="report-builder-canvas">
          <div className="canvas-header">
            <h3>Report Preview</h3>
            {builderState.report_type && (
              <span className="report-type-badge">
                {builderState.report_type.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          <div
            ref={canvasRef}
            className={`canvas-area ${dragContext.is_dragging ? 'drag-active' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop({
                id: 'main-canvas',
                type: 'canvas',
                accepts: ['widget', 'data_field']
              });
            }}
          >
            {previewData ? (
              <div className="report-preview">
                <div className="preview-summary">
                  <h4>Report Summary</h4>
                  <div className="summary-metrics">
                    {previewData.summary && Object.entries(previewData.summary).map(([key, value]) => (
                      <div key={key} className="metric-item">
                        <span className="metric-label">{key.replace('_', ' ')}</span>
                        <span className="metric-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {previewData.charts && (
                  <div className="preview-charts">
                    <h4>Visualizations</h4>
                    <div className="chart-placeholder">
                      <p>Chart visualization would appear here</p>
                      <p>Data points: {previewData.data_points || 0}</p>
                    </div>
                  </div>
                )}

                {previewData.insights && previewData.insights.length > 0 && (
                  <div className="preview-insights">
                    <h4>Key Insights</h4>
                    <ul>
                      {previewData.insights.slice(0, 3).map((insight: unknown, index: number) => (
                        <li key={index}>{insight.description || insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="canvas-placeholder">
                <div className="placeholder-content">
                  <h4>Report Canvas</h4>
                  <p>
                    {builderState.report_type 
                      ? 'Configure your report settings to see a preview'
                      : 'Select a report type to get started'
                    }
                  </p>
                  <div className="placeholder-icons">
                    <span>📊</span>
                    <span>📈</span>
                    <span>📋</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;