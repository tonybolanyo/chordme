// Types for Search Results Interface functionality

// View mode for search results display
export type SearchResultsViewMode = 'list' | 'grid';

// Sort options for search results
export type SearchSortOption = 'relevance' | 'alphabetical' | 'date' | 'popularity';

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Page size options for pagination
export type PageSize = 10 | 25 | 50 | 100;

// Action types for result items
export type ResultAction = 'edit' | 'favorite' | 'share' | 'delete' | 'preview';

// Bulk operation types
export type BulkOperation = 'export' | 'delete' | 'addToPlaylist' | 'share';

// Export format options
export type ExportFormat = 'pdf' | 'txt' | 'json' | 'csv';

// Search analytics data
export interface SearchAnalytics {
  totalQueries: number;
  averageSearchTime: number;
  popularTerms: Array<{
    term: string;
    count: number;
  }>;
  resultsDistribution: {
    withResults: number;
    noResults: number;
  };
  timeRange: string;
}

// Search results interface configuration
export interface SearchResultsConfig {
  viewMode: SearchResultsViewMode;
  sortBy: SearchSortOption;
  sortDirection: SortDirection;
  pageSize: PageSize;
  showAnalytics: boolean;
  enableBulkActions: boolean;
  availableActions: ResultAction[];
}

// Individual result item with action state
export interface ResultItemState {
  id: string;
  selected: boolean;
  favorited: boolean;
  lastViewed?: string;
}

// Bulk action context
export interface BulkActionContext {
  selectedIds: string[];
  totalSelected: number;
  availableOperations: BulkOperation[];
}

// Export configuration
export interface ExportConfig {
  format: ExportFormat;
  includeMetadata: boolean;
  includeLyrics: boolean;
  includeChords: boolean;
  fileName?: string;
}

// Search result statistics
export interface ResultStatistics {
  totalResults: number;
  searchTime: number;
  resultsByGenre: Record<string, number>;
  resultsByDifficulty: Record<string, number>;
  averageRelevanceScore: number;
}

// Pagination info
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Search results interface state
export interface SearchResultsState {
  config: SearchResultsConfig;
  selectedItems: Set<string>;
  statistics: ResultStatistics | null;
  analytics: SearchAnalytics | null;
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
}

// Action handlers interface
export interface SearchResultsActions {
  onViewModeChange: (mode: SearchResultsViewMode) => void;
  onSortChange: (sortBy: SearchSortOption, direction?: SortDirection) => void;
  onPageSizeChange: (size: PageSize) => void;
  onItemSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onItemAction: (id: string, action: ResultAction) => void;
  onBulkAction: (operation: BulkOperation, config?: Record<string, unknown>) => void;
  onExport: (config: ExportConfig) => void;
  onAnalyticsToggle: (show: boolean) => void;
}