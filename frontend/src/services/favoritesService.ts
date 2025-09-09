/**
 * Favorites Management Service
 * 
 * Provides functionality for managing user favorites including:
 * - Song favorites (add/remove/list)
 * - Search query favorites (save/list/delete)
 * - Export functionality for user data
 * - Cross-session persistence and sync
 */

import { apiRequest } from '../utils/apiUtils';
import type { ApiError } from '../utils/apiUtils';

// Helper function to create ApiError instances
function createApiError(message: string, status: number = 500): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.name = 'ApiError';
  return error;
}

// Types for favorites functionality
export interface FavoriteSong {
  id: number;
  song_id: number;
  title: string;
  artist: string;
  genre: string;
  created_at: string;
  favorited_at: string;
}

export interface FavoriteQuery {
  id: number | string;
  name: string;
  query: string;
  filters: Record<string, string | number | boolean | string[]>;
  created_at: string;
  usage_count: number;
}

export interface FavoritesResponse {
  status: string;
  data: {
    favorites: FavoriteSong[];
    total_count: number;
  };
}

export interface FavoriteToggleResponse {
  status: string;
  message: string;
  data: {
    song_id: number;
    is_favorited: boolean;
    favorite_count: number;
  };
}

export interface ExportData {
  export_date: string;
  user_id: number;
  favorite_songs: FavoriteSong[];
  favorite_queries: FavoriteQuery[];
  total_favorite_songs: number;
  total_favorite_queries: number;
}

// Enhanced Search History Manager with privacy controls
class EnhancedSearchHistoryManager {
  private readonly STORAGE_KEY = 'chordme_search_history';
  private readonly PRIVACY_KEY = 'chordme_search_privacy';
  private readonly FAVORITE_QUERIES_KEY = 'chordme_favorite_queries';
  private readonly MAX_HISTORY = 50;
  private readonly MAX_FAVORITE_QUERIES = 20;

  // Privacy settings
  getPrivacySettings(): { clearOnExit: boolean; trackHistory: boolean } {
    try {
      const stored = localStorage.getItem(this.PRIVACY_KEY);
      return stored ? JSON.parse(stored) : { clearOnExit: false, trackHistory: true };
    } catch {
      return { clearOnExit: false, trackHistory: true };
    }
  }

  setPrivacySettings(settings: { clearOnExit?: boolean; trackHistory?: boolean }): void {
    try {
      const current = this.getPrivacySettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(this.PRIVACY_KEY, JSON.stringify(updated));
      
      // If tracking is disabled, clear existing history
      if (!updated.trackHistory) {
        this.clearHistory();
      }
    } catch {
      // Storage failed, continue silently
    }
  }

  // Search history methods (existing)
  getHistory(): SearchHistoryItem[] {
    const privacy = this.getPrivacySettings();
    if (!privacy.trackHistory) return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  addToHistory(query: string, resultsCount: number = 0): void {
    const privacy = this.getPrivacySettings();
    if (!privacy.trackHistory || !query.trim()) return;

    const history = this.getHistory();
    const newItem: SearchHistoryItem = {
      query: query.trim(),
      timestamp: Date.now(),
      results_count: resultsCount
    };

    // Remove existing entry if it exists
    const filteredHistory = history.filter(item => item.query !== newItem.query);
    
    // Add new item to beginning
    filteredHistory.unshift(newItem);
    
    // Keep only the most recent items
    const trimmedHistory = filteredHistory.slice(0, this.MAX_HISTORY);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch {
      // Storage failed, continue silently
    }
  }

  getRecentQueries(limit: number = 10): string[] {
    return this.getHistory()
      .slice(0, limit)
      .map(item => item.query);
  }

  clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Storage failed, continue silently
    }
  }

  // Favorite queries management
  getFavoriteQueries(): FavoriteQuery[] {
    try {
      const stored = localStorage.getItem(this.FAVORITE_QUERIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveFavoriteQuery(name: string, query: string, filters: Record<string, string | number | boolean | string[]> = {}): void {
    if (!name.trim() || !query.trim()) return;

    const favorites = this.getFavoriteQueries();
    
    // Check for duplicate names
    if (favorites.some(fav => fav.name === name.trim())) {
      throw new Error('A favorite query with this name already exists');
    }

    const newFavorite: FavoriteQuery = {
      id: Date.now().toString(),
      name: name.trim(),
      query: query.trim(),
      filters,
      created_at: new Date().toISOString(),
      usage_count: 0
    };

    favorites.unshift(newFavorite);
    
    // Keep only the most recent favorite queries
    const trimmedFavorites = favorites.slice(0, this.MAX_FAVORITE_QUERIES);
    
    try {
      localStorage.setItem(this.FAVORITE_QUERIES_KEY, JSON.stringify(trimmedFavorites));
    } catch {
      throw new Error('Failed to save favorite query');
    }
  }

  deleteFavoriteQuery(id: string | number): void {
    const favorites = this.getFavoriteQueries();
    const filtered = favorites.filter(fav => fav.id !== id);
    
    try {
      localStorage.setItem(this.FAVORITE_QUERIES_KEY, JSON.stringify(filtered));
    } catch {
      // Storage failed, continue silently
    }
  }

  useFavoriteQuery(id: string | number): FavoriteQuery | null {
    const favorites = this.getFavoriteQueries();
    const favorite = favorites.find(fav => fav.id === id);
    
    if (favorite) {
      // Increment usage count
      favorite.usage_count += 1;
      try {
        localStorage.setItem(this.FAVORITE_QUERIES_KEY, JSON.stringify(favorites));
      } catch {
        // Storage failed, continue silently
      }
    }
    
    return favorite || null;
  }

  // Export functionality
  exportData(): {
    search_history: SearchHistoryItem[];
    favorite_queries: FavoriteQuery[];
    privacy_settings: { clearOnExit: boolean; trackHistory: boolean };
    export_date: string;
  } {
    return {
      search_history: this.getHistory(),
      favorite_queries: this.getFavoriteQueries(),
      privacy_settings: this.getPrivacySettings(),
      export_date: new Date().toISOString()
    };
  }

  importData(data: {
    search_history?: SearchHistoryItem[];
    favorite_queries?: FavoriteQuery[];
    privacy_settings?: { clearOnExit?: boolean; trackHistory?: boolean };
  }): void {
    try {
      if (data.search_history) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.search_history));
      }
      if (data.favorite_queries) {
        localStorage.setItem(this.FAVORITE_QUERIES_KEY, JSON.stringify(data.favorite_queries));
      }
      if (data.privacy_settings) {
        this.setPrivacySettings(data.privacy_settings);
      }
    } catch (error) {
      throw new Error('Failed to import data');
    }
  }

  // Clear on exit functionality
  handleAppExit(): void {
    const privacy = this.getPrivacySettings();
    if (privacy.clearOnExit) {
      this.clearHistory();
    }
  }
}

// Search history item interface
interface SearchHistoryItem {
  query: string;
  timestamp: number;
  results_count: number;
}

// Main Favorites Service class
export class FavoritesService {
  private static instance: FavoritesService;
  public historyManager: EnhancedSearchHistoryManager;
  private favoriteSongs: Set<number> = new Set();

  constructor() {
    this.historyManager = new EnhancedSearchHistoryManager();
    this.initializeFavoriteSongs();
  }

  static getInstance(): FavoritesService {
    if (!FavoritesService.instance) {
      FavoritesService.instance = new FavoritesService();
    }
    return FavoritesService.instance;
  }

  // Song favorites methods
  async toggleSongFavorite(songId: number): Promise<FavoriteToggleResponse> {
    try {
      const response = await apiRequest<FavoriteToggleResponse>(
        `/api/v1/favorites/songs/${songId}`,
        {
          method: 'POST'
        }
      );

      // Update local cache
      if (response.data.is_favorited) {
        this.favoriteSongs.add(songId);
      } else {
        this.favoriteSongs.delete(songId);
      }

      return response;
    } catch (error) {
      throw createApiError(
        error instanceof Error ? error.message : 'Failed to toggle favorite',
        500
      );
    }
  }

  async getFavoriteSongs(options: {
    limit?: number;
    offset?: number;
    sort?: 'recent' | 'title' | 'artist';
  } = {}): Promise<FavoritesResponse> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.sort) params.append('sort', options.sort);

      const response = await apiRequest<FavoritesResponse>(
        `/api/v1/favorites/songs?${params.toString()}`
      );

      // Update local cache
      this.favoriteSongs.clear();
      response.data.favorites.forEach(song => {
        this.favoriteSongs.add(song.song_id);
      });

      return response;
    } catch (error) {
      throw createApiError(
        error instanceof Error ? error.message : 'Failed to get favorite songs',
        500
      );
    }
  }

  isSongFavorited(songId: number): boolean {
    return this.favoriteSongs.has(songId);
  }

  // Export functionality
  async exportFavorites(format: 'json' | 'csv' = 'json'): Promise<ExportData> {
    try {
      const response = await apiRequest<{ status: string; data: ExportData }>(
        `/api/v1/favorites/export?format=${format}`
      );

      // Merge with local data
      const localData = this.historyManager.exportData();
      const exportData = {
        ...response.data,
        search_history: localData.search_history,
        local_favorite_queries: localData.favorite_queries,
        privacy_settings: localData.privacy_settings
      };

      return exportData;
    } catch (error) {
      throw createApiError(
        error instanceof Error ? error.message : 'Failed to export favorites',
        500
      );
    }
  }

  // Privacy methods
  getSearchPrivacySettings() {
    return this.historyManager.getPrivacySettings();
  }

  setSearchPrivacySettings(settings: { clearOnExit?: boolean; trackHistory?: boolean }) {
    this.historyManager.setPrivacySettings(settings);
  }

  // Search history methods (delegated)
  getSearchHistory() {
    return this.historyManager.getHistory();
  }

  addToSearchHistory(query: string, resultsCount: number = 0) {
    this.historyManager.addToHistory(query, resultsCount);
  }

  getRecentSearchQueries(limit: number = 10) {
    return this.historyManager.getRecentQueries(limit);
  }

  clearSearchHistory() {
    this.historyManager.clearHistory();
  }

  // Favorite queries methods (delegated)
  getFavoriteQueries() {
    return this.historyManager.getFavoriteQueries();
  }

  saveFavoriteQuery(name: string, query: string, filters: Record<string, string | number | boolean | string[]> = {}) {
    return this.historyManager.saveFavoriteQuery(name, query, filters);
  }

  deleteFavoriteQuery(id: string | number) {
    this.historyManager.deleteFavoriteQuery(id);
  }

  useFavoriteQuery(id: string | number) {
    return this.historyManager.useFavoriteQuery(id);
  }

  // Initialize favorite songs cache
  private async initializeFavoriteSongs(): Promise<void> {
    try {
      // Try to get favorites to populate cache
      await this.getFavoriteSongs({ limit: 1000 });
    } catch {
      // Silently fail if not authenticated or network issues
    }
  }

  // Cleanup on app exit
  handleAppExit(): void {
    this.historyManager.handleAppExit();
  }
}

// Export singleton instance
export const favoritesService = FavoritesService.getInstance();