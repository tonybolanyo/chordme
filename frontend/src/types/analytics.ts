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
    performances?: any[];
    songs?: any[];
    trends?: any;
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
  details?: any;
}

export interface AnalyticsErrorBoundaryState {
  hasError: boolean;
  error?: AnalyticsError;
  errorId?: string;
}