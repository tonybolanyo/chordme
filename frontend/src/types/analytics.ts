// Performance Analytics and Insights Types

export interface SetlistAnalytics {
  setlist_id: number;
  setlist_name: string;
  total_performances: number;
  average_rating?: number;
  average_duration?: number;
  most_performed_songs: PerformedSong[];
  performance_trends: PerformanceTrends;
  audience_feedback: AudienceFeedback;
  timing_analysis: TimingAnalysis;
  last_performed?: string;
  generated_at: string;
  privacy_notice?: PrivacyNotice;
}

export interface PerformedSong {
  song_id: number;
  song_title: string;
  artist?: string;
  performance_count: number;
  average_rating?: number;
}

export interface PerformanceTrends {
  by_month: MonthlyPerformance[];
}

export interface MonthlyPerformance {
  month: string;
  performances: number;
  average_rating?: number;
  average_duration?: number;
}

export interface AudienceFeedback {
  [key: string]: number; // e.g., "excellent": 8, "good": 3, etc.
}

export interface TimingAnalysis {
  total_songs: number;
  estimated_total_duration?: number;
  average_estimated_duration?: number;
  average_actual_duration?: number;
  prediction_accuracy?: {
    average_difference: number;
    accuracy_percentage: number;
  };
}

export interface SongAnalytics {
  song_id: number;
  song_title: string;
  song_artist?: string;
  total_performances: number;
  average_rating?: number;
  average_duration?: number;
  average_tempo?: number;
  key_distribution: { [key: string]: number };
  response_distribution: { [response: string]: number };
  performance_trend: SongPerformanceTrend[];
  generated_at: string;
  privacy_notice?: PrivacyNotice;
}

export interface SongPerformanceTrend {
  month: string;
  average_rating?: number;
  average_duration?: number;
  performance_count: number;
}

export interface PerformanceRecommendations {
  high_performing_songs: RecommendedSong[];
  optimal_durations: OptimalDurations;
  trending_combinations: TrendingCombination[];
  timing_recommendations: TimingRecommendations;
  generated_at: string;
  privacy_notice?: PrivacyNotice;
}

export interface RecommendedSong {
  song_id: number;
  title: string;
  artist?: string;
  performance_count: number;
  average_rating: number;
}

export interface OptimalDurations {
  duration_analysis: { [range: string]: DurationRange };
  optimal_range?: string;
  recommendation?: string;
}

export interface DurationRange {
  performance_count: number;
  average_rating: number;
  duration_range: string;
}

export interface TrendingCombination {
  setlist_name: string;
  songs: string[];
  rating: number;
  date: string;
}

export interface TimingRecommendations {
  average_performance_duration: number;
  recommended_preparation_time: number;
  recommended_break_frequency: string;
  optimal_song_count: number;
}

export interface PopularSongsData {
  timeframe: string;
  popular_songs: PopularSong[];
  trending_songs: TrendingSong[];
  total_songs: number;
  generated_at: string;
  privacy_notice?: PrivacyNotice;
}

export interface PopularSong {
  song_id: number;
  title: string;
  artist?: string;
  performance_count: number;
  average_rating?: number;
  average_duration?: number;
}

export interface TrendingSong {
  song_id: number;
  title: string;
  artist?: string;
  recent_performances: number;
  trend_status: string;
}

export interface SetlistComparison {
  setlists: SetlistComparisonData[];
  insights: string[];
  generated_at: string;
  privacy_notice?: PrivacyNotice;
}

export interface SetlistComparisonData {
  setlist_id: number;
  name: string;
  total_performances: number;
  average_rating?: number;
  average_duration?: number;
  songs_count: number;
  last_performed?: string;
}

export interface AnalyticsExportData {
  export_type: string;
  format: string;
  user_id: number;
  generated_at: string;
  data: {
    performances?: Record<string, unknown>[];
    songs?: Record<string, unknown>[];
    trends?: Record<string, unknown>;
  };
  gdpr_compliance?: GDPRCompliance;
}

export interface GDPRCompliance {
  data_controller: string;
  purpose: string;
  retention: string;
  rights: string;
  contact: string;
}

export interface PrivacyNotice {
  data_collection?: string;
  retention?: string;
  sharing?: string;
  data_usage?: string;
  personalization?: string;
  scope?: string;
  data_source?: string;
  anonymization?: string;
  data_access?: string;
  comparison_scope?: string;
}

export interface AnalyticsPrivacySettings {
  collect_performance_data: boolean;
  include_in_trends: boolean;
  allow_recommendations: boolean;
  data_retention_days: number;
  export_allowed: boolean;
}

export interface GDPRRights {
  access: string;
  rectification: string;
  erasure: string;
  portability: string;
  restriction: string;
  objection: string;
}

export interface PrivacySettingsResponse {
  privacy_settings: AnalyticsPrivacySettings;
  gdpr_rights: GDPRRights;
}

// API Request/Response types
export interface AnalyticsApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  retry_after?: number;
}

export interface ExportRequest {
  export_type: 'comprehensive' | 'performances' | 'songs' | 'trends';
  format: 'json' | 'csv';
  privacy_consent: boolean;
}

export interface SetlistComparisonRequest {
  setlist_ids: number[];
}

export interface DataDeletionRequest {
  confirmation: string;
  delete_type: 'all' | 'performances' | 'songs' | 'personal_data';
}

export interface DataDeletionResponse {
  deleted_items: string[];
  deletion_date: string;
  compliance_note: string;
}

// Chart and visualization types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TrendChartData {
  labels: string[];
  datasets: TrendDataset[];
}

export interface TrendDataset {
  label: string;
  data: number[];
  color: string;
  fill?: boolean;
}

export interface PerformanceMetrics {
  rating: number | null;
  duration: number | null;
  tempo: number | null;
  key: string | null;
  audience_response: string | null;
}

// Component prop types
export interface AnalyticsDashboardProps {
  user_id: number;
  timeframe?: string;
  className?: string;
}

export interface SetlistAnalyticsProps {
  setlist_id: number;
  onClose?: () => void;
  className?: string;
}

export interface SongAnalyticsProps {
  song_id: number;
  onClose?: () => void;
  className?: string;
}

export interface AnalyticsExportProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (data: ExportRequest) => void;
}

export interface PrivacySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AnalyticsPrivacySettings;
  onUpdate: (settings: Partial<AnalyticsPrivacySettings>) => void;
}

// Utility types
export type AnalyticsTimeframe = '7d' | '30d' | '90d' | '1y' | 'all';
export type AnalyticsScope = 'user' | 'public';
export type ExportFormat = 'json' | 'csv';
export type ExportType = 'comprehensive' | 'performances' | 'songs' | 'trends';
export type DeleteType = 'all' | 'performances' | 'songs' | 'personal_data';

// Error types
export interface AnalyticsError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AnalyticsErrorBoundaryState {
  hasError: boolean;
  error?: AnalyticsError;
  errorId?: string;
}

// Enhanced Performance Analytics Types

export interface PerformanceSession {
  id: number;
  user_id?: number;
  song_id?: number;
  setlist_id?: number;
  session_type: 'practice' | 'performance' | 'rehearsal';
  device_type?: 'mobile' | 'tablet' | 'desktop';
  started_at: string;
  ended_at?: string;
  total_duration?: number;
  active_duration?: number;
  tempo_changes: number;
  pause_count: number;
  rewind_count: number;
  fast_forward_count: number;
  completion_percentage: number;
  session_rating?: number;
  difficulty_rating?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  events?: PerformanceEvent[];
  problem_sections?: ProblemSection[];
}

export interface PerformanceEvent {
  id: number;
  session_id: number;
  event_type: 'pause' | 'play' | 'rewind' | 'fast_forward' | 'tempo_change' | 'seek';
  timestamp: string;
  position_seconds?: number;
  event_data?: Record<string, unknown>;
  chord_at_position?: string;
  section_name?: string;
  created_at: string;
}

export interface ProblemSection {
  id: number;
  session_id: number;
  song_id?: number;
  start_position: number;
  end_position: number;
  section_name?: string;
  problem_type: 'frequent_pauses' | 'multiple_rewinds' | 'tempo_struggles';
  severity_score: number;
  event_count: number;
  identified_issues: string[];
  suggested_improvements: string[];
  chord_changes?: string[];
  tempo_bpm?: number;
  difficulty_factors?: string[];
  created_at: string;
}

export interface PerformanceInsights {
  user_id: number;
  song_id?: number;
  analysis_period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  summary_metrics: {
    total_sessions: number;
    total_practice_time: number;
    average_session_length: number;
    average_completion_rate: number;
    total_problem_sections: number;
  };
  problem_analysis: {
    most_common_problems: Record<string, number>;
    problem_sections: ProblemSection[];
  };
  ai_recommendations: AIRecommendation[];
  improvement_trends: ImprovementTrends;
  session_comparison: SessionComparison;
  generated_at: string;
}

export interface AIRecommendation {
  type: 'completion_improvement' | 'pause_reduction' | 'consistency_improvement' | 'tempo_practice' | 'chord_focus';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable_steps: string[];
  confidence_score?: number;
  estimated_improvement_time?: string;
}

export interface ImprovementTrends {
  completion_trend: number;
  duration_trend: number;
  problem_reduction_trend: number;
  total_sessions_analyzed: number;
  trend_interpretation: {
    completion: 'improving' | 'stable' | 'declining';
    consistency: 'improving' | 'variable';
    problems: 'reducing' | 'stable' | 'increasing';
  };
  insufficient_data?: boolean;
}

export interface SessionComparison {
  comparison_periods: {
    recent_sessions: number;
    earlier_sessions: number;
  };
  completion_rate_change: number;
  average_duration_change: number;
  problem_count_change: number;
  improvement_summary: {
    completion_improved: boolean;
    duration_more_consistent: boolean;
    fewer_problems: boolean;
  };
  insufficient_data_for_comparison?: boolean;
  insufficient_historical_data?: boolean;
}

export interface AnonymousUsageAnalytics {
  time_period: 'daily' | 'weekly' | 'monthly';
  analysis_period: {
    start_date: string;
    end_date: string;
  };
  session_metrics: {
    total_sessions: number;
    average_duration_seconds: number;
    device_distribution: Record<string, number>;
    session_type_distribution: Record<string, number>;
  };
  interaction_patterns: {
    event_type_distribution: Record<string, number>;
    tempo_adjustment_usage: number;
    high_pause_rate_sessions: number;
  };
  feature_optimization_insights: FeatureInsight[];
  generated_at: string;
}

export interface FeatureInsight {
  feature: string;
  usage_rate?: number;
  average_adjustments_per_session?: number;
  high_usage_rate?: number;
  average_completion_rate?: number;
  sample_size?: number;
  insight: string;
  optimization_suggestion: string;
}

export interface EnhancedAnalyticsPrivacySettings {
  anonymous_only: boolean;
  data_retention_days: number;
  analytics_consent: boolean;
  feature_optimization_consent: boolean;
  detailed_tracking: boolean;
  cross_session_analysis: boolean;
}

export interface PerformanceDataExport {
  user_id: number;
  export_date: string;
  performance_sessions: PerformanceSession[];
  analytics_snapshots: PerformanceAnalyticsSnapshot[];
  privacy_settings: EnhancedAnalyticsPrivacySettings;
  data_summary: {
    total_sessions: number;
    total_analytics_snapshots: number;
    earliest_session?: string;
    latest_session?: string;
  };
}

export interface PerformanceAnalyticsSnapshot {
  id: number;
  user_id?: number;
  song_id?: number;
  setlist_id?: number;
  analytics_period: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  total_sessions: number;
  total_practice_time: number;
  average_session_length: number;
  completion_rate: number;
  most_common_problems: string[];
  problem_sections_count: number;
  improvement_score: number;
  ai_recommendations: AIRecommendation[];
  practice_suggestions: string[];
  difficulty_assessment: Record<string, unknown>;
  previous_period_comparison: Record<string, unknown>;
  progress_trends: Record<string, unknown>;
  created_at: string;
  expires_at?: string;
}

// API Request/Response types for enhanced analytics

export interface StartSessionRequest {
  session_type: 'practice' | 'performance' | 'rehearsal';
  song_id?: number;
  setlist_id?: number;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  analytics_consent?: boolean;
}

export interface StartSessionResponse {
  session_id: number;
  message: string;
}

export interface RecordEventRequest {
  event_type: 'pause' | 'play' | 'rewind' | 'fast_forward' | 'tempo_change' | 'seek';
  position_seconds?: number;
  chord_at_position?: string;
  section_name?: string;
  tempo_bpm?: number;
  seek_target?: number;
}

export interface EndSessionRequest {
  completion_percentage?: number;
  session_rating?: number;
  difficulty_rating?: number;
}

export interface ProblemSectionsResponse {
  problem_sections: ProblemSection[];
  total_count: number;
}

export interface PrivacySettingsUpdateRequest {
  anonymous_only?: boolean;
  data_retention_days?: number;
  analytics_consent?: boolean;
  feature_optimization_consent?: boolean;
  detailed_tracking?: boolean;
  cross_session_analysis?: boolean;
}

export interface DataDeletionRequest {
  delete_all?: boolean;
  older_than_days?: number;
}

export interface DataDeletionResponse {
  deleted_sessions: number;
  deleted_analytics: number;
  message: string;
}

// Component prop types for enhanced analytics

export interface PerformanceSessionTrackerProps {
  sessionId?: number;
  onSessionStart?: (sessionId: number) => void;
  onSessionEnd?: () => void;
  autoTrack?: boolean;
  className?: string;
}

export interface ProblemSectionIndicatorProps {
  problemSections: ProblemSection[];
  currentPosition?: number;
  onSectionClick?: (section: ProblemSection) => void;
  className?: string;
}

export interface AIRecommendationsPanelProps {
  recommendations: AIRecommendation[];
  onImplement?: (recommendation: AIRecommendation) => void;
  onDismiss?: (recommendation: AIRecommendation) => void;
  className?: string;
}

export interface ImprovementTrendsChartProps {
  trends: ImprovementTrends;
  timeframe?: AnalyticsTimeframe;
  className?: string;
}

export interface SessionComparisonViewProps {
  comparison: SessionComparison;
  onNavigateToSession?: (sessionId: number) => void;
  className?: string;
}

export interface PrivacyControlsProps {
  settings: EnhancedAnalyticsPrivacySettings;
  onUpdate: (settings: Partial<EnhancedAnalyticsPrivacySettings>) => void;
  showAdvanced?: boolean;
  className?: string;
}

export interface AnonymousAnalyticsViewProps {
  analytics?: AnonymousUsageAnalytics;
  timePeriod?: 'daily' | 'weekly' | 'monthly';
  onTimePeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void;
  className?: string;
}

// Hook types for enhanced analytics

export interface UsePerformanceSessionOptions {
  autoStart?: boolean;
  sessionType?: 'practice' | 'performance' | 'rehearsal';
  songId?: number;
  setlistId?: number;
  analyticsConsent?: boolean;
}

export interface UsePerformanceSessionReturn {
  sessionId?: number;
  isTracking: boolean;
  startSession: (options?: UsePerformanceSessionOptions) => Promise<number>;
  endSession: (options?: EndSessionRequest) => Promise<void>;
  recordEvent: (event: RecordEventRequest) => Promise<void>;
  currentSession?: PerformanceSession;
  error?: string;
}

export interface UsePerformanceInsightsOptions {
  userId?: number;
  songId?: number;
  periodDays?: number;
  autoRefresh?: boolean;
}

export interface UsePerformanceInsightsReturn {
  insights?: PerformanceInsights;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  lastUpdated?: string;
}

export interface UseProblemSectionsOptions {
  sessionId?: number;
  songId?: number;
  userId?: number;
  limit?: number;
  autoRefresh?: boolean;
}

export interface UseProblemSectionsReturn {
  problemSections: ProblemSection[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  totalCount: number;
}

// Utility types for enhanced analytics

export type ProblemType = 'frequent_pauses' | 'multiple_rewinds' | 'tempo_struggles';
export type SessionType = 'practice' | 'performance' | 'rehearsal';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type EventType = 'pause' | 'play' | 'rewind' | 'fast_forward' | 'tempo_change' | 'seek';
export type RecommendationType = 'completion_improvement' | 'pause_reduction' | 'consistency_improvement' | 'tempo_practice' | 'chord_focus';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type TrendDirection = 'improving' | 'stable' | 'declining' | 'variable' | 'reducing' | 'increasing';
export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

// Error types for enhanced analytics

export interface PerformanceAnalyticsError extends AnalyticsError {
  sessionId?: number;
  eventType?: string;
  context?: 'session_start' | 'event_recording' | 'session_end' | 'insights_retrieval' | 'privacy_update';
}