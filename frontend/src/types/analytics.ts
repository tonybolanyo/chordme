// Performance Analytics and Insights Types
import type { Song } from './index';

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

// Music Discovery and Recommendation Types
export interface MusicRecommendation {
  song_id: number;
  title: string;
  artist: string;
  genre?: string;
  relevance_score: number;
  explanation: string;
  recommendation_type: 'content_based' | 'collaborative' | 'popular';
}

export interface PersonalizedRecommendations {
  user_id: number;
  recommendations: MusicRecommendation[];
  recommendation_sources: {
    content_based: number;
    collaborative_filtering: number;
  };
  privacy_notice: PrivacyNotice;
  generated_at: string;
}

export interface SimilarSong {
  song_id: number;
  title: string;
  artist: string;
  genre?: string;
  similarity_score: number;
  similarity_explanation: string;
}

export interface SimilarSongsResponse {
  reference_song: {
    id: number;
    title: string;
    artist: string;
    genre?: string;
    key?: string;
    tempo?: number;
    difficulty?: string;
  };
  similar_songs: SimilarSong[];
  similarity_factors: string[];
  generated_at: string;
}

export interface ArtistExploration {
  artist: string;
  total_songs: number;
  songs: Song[]; // Song objects
  artist_characteristics: {
    primary_genres: Record<string, number>;
    common_keys: Record<string, number>;
    difficulty_levels: Record<string, number>;
  };
  related_artists: string[];
  generated_at: string;
}

export interface GenreExploration {
  genre: string;
  total_songs: number;
  songs: Song[]; // Song objects
  genre_characteristics: {
    popular_artists: Record<string, number>;
    common_keys: Record<string, number>;
    average_tempo?: number;
    difficulty_distribution: Record<string, number>;
  };
  generated_at: string;
}

export interface TrendingSong {
  song_id: number;
  title: string;
  artist: string;
  genre?: string;
  trending_score: number;
  view_count: number;
  favorite_count: number;
  trend_explanation: string;
}

export interface TrendingSongsResponse {
  timeframe: string;
  period: {
    start_date: string;
    end_date: string;
  };
  trending_songs: TrendingSong[];
  trending_factors: string[];
  generated_at: string;
}

export interface DiscoveryPreferences {
  enable_personalized_recommendations: boolean;
  enable_collaborative_filtering: boolean;
  enable_trending_notifications: boolean;
  preferred_genres: string[];
  discovery_privacy_level: 'private' | 'anonymous' | 'public';
}

export interface DiscoveryPreferencesResponse {
  discovery_preferences: DiscoveryPreferences;
  privacy_controls: {
    data_usage: string;
    collaborative_filtering: string;
    privacy_levels: Record<string, string>;
  };
}

export type DiscoveryTimeframe = '1d' | '7d' | '30d';

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
}

// Comprehensive Analytics Dashboard Types

export interface ComprehensiveDashboardData {
  user_activity: UserActivityAnalytics;
  song_popularity: SongPopularityAnalytics;
  collaboration_patterns: CollaborationPatternsAnalytics;
  performance_statistics: PerformanceStatistics;
  geographic_distribution?: GeographicDistribution;
  summary_metrics: SummaryMetrics;
  real_time_status: RealTimeStatus;
  timeframe: AnalyticsTimeframe;
  generated_at: string;
  privacy_notice: PrivacyNotice;
}

export interface UserActivityAnalytics {
  total_sessions: number;
  total_practice_time: number;
  average_session_length: number;
  device_distribution: Record<string, number>;
  session_type_distribution: Record<string, number>;
  most_active_day: string;
  consistency_score: number;
  activity_timeline?: ActivityTimelinePoint[];
}

export interface ActivityTimelinePoint {
  period: string;
  session_count: number;
  average_duration: number;
  device_variety: number;
}

export interface SongPopularityAnalytics {
  top_songs: PopularSong[];
  chord_popularity: ChordPopularity[];
  trending_analysis: TrendingAnalysis;
}

export interface PopularSong {
  song_id: number;
  title: string;
  artist?: string;
  performance_count: number;
  average_rating?: number;
  trend_direction?: 'up' | 'down' | 'stable';
}

export interface ChordPopularity {
  chord: string;
  count: number;
  percentage: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

export interface TrendingAnalysis {
  trending_up: string[];
  trending_down: string[];
  new_favorites: string[];
}

export interface CollaborationPatternsAnalytics {
  total_collaboration_sessions: number;
  average_participants: number;
  collaboration_frequency: string;
  most_collaborative_songs: CollaborativeSong[];
  collaboration_patterns: CollaborationPatterns;
}

export interface CollaborativeSong {
  song_id: number;
  title: string;
  collaboration_count: number;
  average_participants: number;
}

export interface CollaborationPatterns {
  peak_hours: string[];
  average_duration: number;
  most_common_roles: string[];
}

export interface PerformanceStatistics {
  total_practice_time: number;
  completion_rate: number;
  improvement_score: number;
  problem_areas: ProblemArea[];
  performance_trends: PerformanceTrends;
}

export interface ProblemArea {
  problem_type: string;
  frequency: number;
}

export interface PerformanceTrends {
  completion_trend: 'improving' | 'declining' | 'stable';
  improvement_trend: 'improving' | 'declining' | 'stable';
  consistency: 'stable' | 'variable';
}

export interface GeographicDistribution {
  note: string;
  available: boolean;
  privacy_compliant: boolean;
  regions?: Record<string, number>;
}

export interface SummaryMetrics {
  total_sessions: number;
  total_songs: number;
  total_collaborations: number;
  active_period: string;
}

export interface RealTimeStatus {
  websocket_connected: boolean;
  last_update: string;
  update_frequency: string;
}

export interface WidgetConfig {
  layout: string;
  enabled_widgets: string[];
  widget_positions: Record<string, WidgetPosition>;
  refresh_interval: number;
  theme: 'light' | 'dark';
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardWidget {
  id: string;
  name: string;
  description: string;
  component?: string;
  default_position?: WidgetPosition;
  min_size?: { width: number; height: number };
  max_size?: { width: number; height: number };
}

export interface AnalyticsExportConfig {
  format: 'json' | 'csv';
  timeframe: AnalyticsTimeframe;
  include_sections: string[];
}

// Hook types for comprehensive analytics

export interface UseComprehensiveAnalyticsOptions {
  timeframe?: AnalyticsTimeframe;
  includeAnonymous?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseComprehensiveAnalyticsReturn {
  dashboardData: ComprehensiveDashboardData | null;
  userActivity: UserActivityAnalytics | null;
  songPopularity: SongPopularityAnalytics | null;
  collaborationPatterns: CollaborationPatternsAnalytics | null;
  widgetConfig: WidgetConfig | null;
  availableWidgets: DashboardWidget[];
  updateWidgetConfig: (config: Partial<WidgetConfig>) => Promise<void>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isRealTimeConnected: boolean;
  refresh: () => Promise<void>;
  setTimeframe: (timeframe: AnalyticsTimeframe) => void;
  exportData: (config: AnalyticsExportConfig) => Promise<AnalyticsExportData>;
  subscribeToRealTimeUpdates: () => void;
  unsubscribeFromRealTimeUpdates: () => void;
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