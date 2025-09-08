/**
 * Business Intelligence and Reporting Types
 * 
 * TypeScript definitions for BI features including:
 * - Report generation and configuration
 * - Custom dashboard and widget types
 * - Analytics and metrics
 * - Scheduling and automation
 */

export enum ReportType {
  STUDENT_PROGRESS = 'student_progress',
  BAND_COLLABORATION = 'band_collaboration',
  USAGE_PATTERNS = 'usage_patterns',
  PERFORMANCE_TRENDS = 'performance_trends',
  COMPARATIVE_ANALYSIS = 'comparative_analysis',
  CUSTOM = 'custom'
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  CSV = 'csv'
}

export enum WidgetType {
  CHART = 'chart',
  TABLE = 'table',
  METRIC = 'metric',
  TEXT = 'text'
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  AREA = 'area',
  SCATTER = 'scatter'
}

// Report Configuration
export interface ReportConfig {
  report_type: ReportType;
  period: ReportPeriod;
  start_date?: string;
  end_date?: string;
  user_ids?: number[];
  organization_id?: number;
  include_detailed_breakdown?: boolean;
  include_recommendations?: boolean;
  format?: ReportFormat;
  delivery_method?: 'api' | 'email' | 'webhook';
}

// Generated Report
export interface GeneratedReport {
  report_id: string;
  generated_at: string;
  generated_by: number;
  config: {
    type: string;
    period: string;
    start_date: string;
    end_date: string;
    format: string;
  };
  summary: ReportSummary;
  data: ReportData;
  insights: Insight[];
  recommendations: Recommendation[];
}

export interface ReportSummary {
  report_type: string;
  key_metrics: Record<string, number>;
  status: 'excellent' | 'normal' | 'needs_attention';
}

export interface ReportData {
  [key: string]: any;
}

// Student Progress Report Data
export interface StudentProgressData {
  period_summary: {
    total_students: number;
    total_sessions: number;
    average_completion_rate: number;
  };
  student_details: Record<string, StudentMetrics>;
  top_performers: StudentPerformance[];
  struggling_students: StudentPerformance[];
}

export interface StudentMetrics {
  sessions_count: number;
  total_practice_time: number;
  completion_rate: number;
  problem_areas: string[];
  improvement_metrics: Record<string, number>;
  goals_progress: Record<string, number>;
  songs_practiced: number;
  performance_scores: number[];
  average_session_length: number;
}

export interface StudentPerformance {
  user_id: number;
  completion_rate: number;
  sessions_count: number;
  total_practice_time: number;
  concerns?: string[];
}

// Band Collaboration Report Data
export interface CollaborationData {
  total_performances: number;
  unique_setlists: number;
  average_performance_rating: number;
  collaboration_patterns: {
    most_performed_setlists: [number, number][];
    performance_frequency: Record<string, number>;
  };
  team_effectiveness: Record<string, any>;
  rehearsal_to_performance_ratio: number;
}

// Usage Patterns Report Data
export interface UsagePatternsData {
  usage_patterns: {
    peak_usage_hours: Record<string, number>;
    peak_usage_days: Record<string, number>;
    session_duration_distribution: Record<string, number>;
    device_usage: Record<string, number>;
    feature_usage: Record<string, number>;
  };
  optimization_opportunities: string[];
  user_engagement_score: number;
}

// Performance Trends Report Data
export interface PerformanceTrendsData {
  trend_data: TrendDataPoint[];
  growth_metrics: {
    growth_rate: number;
    trend: 'growing' | 'declining' | 'stable';
  };
  seasonality: {
    day_of_week_patterns: Record<string, number>;
    peak_day: string | null;
  };
}

export interface TrendDataPoint {
  date: string;
  sessions: number;
  total_duration: number;
  average_completion: number;
  unique_users: number;
}

// Comparative Analysis Report Data
export interface ComparativeAnalysisData {
  current_period: {
    start_date: string;
    end_date: string;
    metrics: PeriodMetrics;
  };
  previous_period: {
    start_date: string;
    end_date: string;
    metrics: PeriodMetrics;
  };
  changes: Record<string, number>;
  significant_changes: SignificantChange[];
}

export interface PeriodMetrics {
  total_sessions: number;
  unique_users: number;
  total_duration: number;
  average_duration: number;
  average_completion: number;
}

export interface SignificantChange {
  metric: string;
  change_percentage: number;
  significance: 'high' | 'medium';
}

// AI Insights and Recommendations
export interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  confidence: number;
  data_points: number;
}

export interface Recommendation {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggested_actions: string[];
  expected_impact: string;
}

export interface AIRecommendations {
  recommendations: Recommendation[];
  insights: Insight[];
  priority_actions: PriorityAction[];
  generated_at: string;
  period: string;
  user_id?: number;
  organization_id?: number;
}

export interface PriorityAction {
  action: string;
  urgency: 'high' | 'medium' | 'low';
  description: string;
  deadline: string;
}

// Custom Dashboard Configuration
export interface DashboardConfig {
  dashboard_id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  sharing: DashboardSharing;
  created_by: number;
  created_at: string;
  status: 'active' | 'draft' | 'archived';
}

export interface DashboardLayout {
  columns: number;
  rows: string | number;
  responsive?: boolean;
}

export interface DashboardWidget {
  widget_id?: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  data_source: string;
  config: WidgetConfig;
  styling?: WidgetStyling;
}

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  min_width?: number;
  min_height?: number;
  max_width?: number;
  max_height?: number;
}

export interface WidgetConfig {
  chart_type?: ChartType;
  data_fields?: string[];
  filters?: Record<string, any>;
  refresh_interval?: number;
  display_options?: Record<string, any>;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  time_range?: {
    start: string;
    end: string;
    relative?: string;
  };
}

export interface WidgetStyling {
  background_color?: string;
  border_color?: string;
  border_width?: number;
  border_radius?: number;
  text_color?: string;
  font_size?: number;
  padding?: number;
  margin?: number;
}

export interface DashboardSharing {
  is_public: boolean;
  shared_with_users: number[];
  shared_with_roles?: string[];
  view_permissions?: string[];
  edit_permissions?: string[];
}

// Report Scheduling
export interface ScheduledReport {
  schedule_id: string;
  config: ReportConfig;
  schedule: string;
  created_by: number;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
  next_run: string;
  last_run?: string;
  delivery_settings?: DeliverySettings;
  created_at: string;
  updated_at: string;
}

export interface DeliverySettings {
  email_recipients?: string[];
  webhook_url?: string;
  include_attachments?: boolean;
  notification_preferences?: {
    on_success: boolean;
    on_failure: boolean;
    summary_only: boolean;
  };
}

// Data Export
export interface DataExport {
  export_id: string;
  data_type: 'sessions' | 'performances' | 'users' | 'songs' | 'analytics';
  start_date: string;
  end_date: string;
  format: 'json' | 'csv';
  record_count: number;
  data: any[];
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  exported_at: string;
  exported_by: number;
  filters_applied: Record<string, any>;
  schema_version?: string;
  data_quality_score?: number;
}

// Report Builder State
export interface ReportBuilderState {
  report_type: ReportType | null;
  period: ReportPeriod;
  date_range: {
    start: Date | null;
    end: Date | null;
  };
  filters: ReportFilters;
  visualization: VisualizationConfig;
  options: ReportOptions;
  preview_data?: any;
  is_generating: boolean;
  errors: string[];
}

export interface ReportFilters {
  user_ids: number[];
  organization_id?: number;
  song_ids: number[];
  setlist_ids: number[];
  device_types: string[];
  performance_rating_range?: [number, number];
  completion_rate_range?: [number, number];
  session_duration_range?: [number, number];
}

export interface VisualizationConfig {
  chart_types: ChartType[];
  show_trends: boolean;
  show_comparisons: boolean;
  breakdown_by: string[];
  aggregation_level: 'daily' | 'weekly' | 'monthly';
}

export interface ReportOptions {
  include_detailed_breakdown: boolean;
  include_recommendations: boolean;
  include_insights: boolean;
  include_raw_data: boolean;
  format: ReportFormat;
  auto_refresh: boolean;
  refresh_interval?: number;
}

// Chart Data Structures
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    title: {
      display: boolean;
      text: string;
    };
    tooltip: {
      enabled: boolean;
      mode: string;
      intersect: boolean;
    };
  };
  scales?: {
    x: ScaleConfig;
    y: ScaleConfig;
  };
  animation?: {
    duration: number;
    easing: string;
  };
}

export interface ScaleConfig {
  display: boolean;
  title: {
    display: boolean;
    text: string;
  };
  beginAtZero?: boolean;
  min?: number;
  max?: number;
  ticks?: {
    stepSize?: number;
    callback?: (value: any) => string;
  };
}

// Drag and Drop Interfaces
export interface DragItem {
  type: 'widget' | 'data_field' | 'filter';
  id: string;
  content: any;
  preview?: string;
}

export interface DropZone {
  id: string;
  type: 'canvas' | 'widget_container' | 'filter_area';
  accepts: string[];
  position?: WidgetPosition;
  size?: WidgetSize;
}

export interface DragContext {
  drag_item: DragItem | null;
  drop_zones: DropZone[];
  is_dragging: boolean;
  hover_zone: string | null;
}

// API Response Types
export interface BIApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    category: string;
    retryable: boolean;
    details?: any;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    report_generation: 'operational' | 'degraded' | 'outage';
    scheduler: 'operational' | 'degraded' | 'outage';
    ai_insights: 'operational' | 'degraded' | 'outage';
    data_export: 'operational' | 'degraded' | 'outage';
  };
}

// External BI Integration Types
export interface ExternalBIConnection {
  connection_id: string;
  platform: 'tableau' | 'powerbi' | 'looker' | 'qlik' | 'custom';
  name: string;
  description: string;
  connection_string?: string;
  api_endpoint?: string;
  authentication: BIAuthentication;
  data_sources: string[];
  sync_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  last_sync?: string;
  status: 'connected' | 'disconnected' | 'error';
  created_by: number;
  created_at: string;
}

export interface BIAuthentication {
  type: 'api_key' | 'oauth' | 'basic' | 'token';
  credentials: Record<string, string>;
  expires_at?: string;
  refresh_token?: string;
}

export interface SyncJob {
  job_id: string;
  connection_id: string;
  data_source: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  records_processed: number;
  errors: string[];
  progress_percentage: number;
}

// Goal Setting and Tracking
export interface Goal {
  goal_id: string;
  user_id: number;
  title: string;
  description: string;
  type: 'completion_rate' | 'practice_time' | 'song_count' | 'performance_score' | 'custom';
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress_percentage: number;
  milestones: GoalMilestone[];
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  milestone_id: string;
  title: string;
  target_value: number;
  target_date: string;
  completed_at?: string;
  status: 'pending' | 'completed' | 'overdue';
}

export interface GoalProgress {
  goal_id: string;
  date: string;
  value: number;
  notes?: string;
  recorded_at: string;
}

// Utility Types
export type TimeRange = {
  start: Date;
  end: Date;
  label: string;
};

export type MetricValue = {
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  change_percentage?: number;
  comparison_period?: string;
};

export type FilterOption = {
  value: string | number;
  label: string;
  count?: number;
  selected?: boolean;
};

export type SortOption = {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
};

export type PaginationInfo = {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};