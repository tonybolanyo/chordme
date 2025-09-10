/**
 * Tests for the FavoritesService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { favoritesService } from '../services/favoritesService';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock apiRequest
vi.mock('../utils/apiUtils', () => ({
  apiRequest: vi.fn(),
}));

describe('FavoritesService', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });
  });

  describe('Search History Management', () => {
    it('should initialize with empty history when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const history = favoritesService.getSearchHistory();
      expect(history).toEqual([]);
    });

    it('should add search queries to history', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      favoritesService.addToSearchHistory('test query', 5);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_search_history',
        expect.stringContaining('test query')
      );
    });

    it('should get recent search queries', () => {
      const mockHistory = [
        { query: 'query1', timestamp: Date.now(), results_count: 5 },
        { query: 'query2', timestamp: Date.now() - 1000, results_count: 3 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));
      
      const recent = favoritesService.getRecentSearchQueries(2);
      expect(recent).toEqual(['query1', 'query2']);
    });

    it('should clear search history', () => {
      favoritesService.clearSearchHistory();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('chordme_search_history');
    });
  });

  describe('Privacy Settings', () => {
    it('should return default privacy settings', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const settings = favoritesService.getSearchPrivacySettings();
      expect(settings).toEqual({
        clearOnExit: false,
        trackHistory: true,
      });
    });

    it('should update privacy settings', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        clearOnExit: false,
        trackHistory: true,
      }));
      
      favoritesService.setSearchPrivacySettings({ clearOnExit: true });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_search_privacy',
        expect.stringContaining('"clearOnExit":true')
      );
    });

    it('should not track history when disabled', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify({ trackHistory: false })) // privacy settings
        .mockReturnValueOnce(JSON.stringify([])); // history
      
      favoritesService.addToSearchHistory('test query');
      
      // Should not call setItem for history when tracking is disabled
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'chordme_search_history',
        expect.any(String)
      );
    });
  });

  describe('Favorite Queries Management', () => {
    it('should get empty favorite queries initially', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const queries = favoritesService.getFavoriteQueries();
      expect(queries).toEqual([]);
    });

    it('should save favorite query', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      favoritesService.saveFavoriteQuery('My Search', 'rock AND guitar', { genre: 'rock' });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_favorite_queries',
        expect.stringContaining('My Search')
      );
    });

    it('should delete favorite query', () => {
      const mockQueries = [
        { id: 'test-id', name: 'Test', query: 'test', filters: {}, created_at: '2023-01-01', usage_count: 0 }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueries));
      
      favoritesService.deleteFavoriteQuery('test-id');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_favorite_queries',
        '[]'
      );
    });

    it('should increment usage count when using favorite query', () => {
      const mockQueries = [
        { id: 'test-id', name: 'Test', query: 'test', filters: {}, created_at: '2023-01-01', usage_count: 0 }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueries));
      
      const result = favoritesService.useFavoriteQuery('test-id');
      
      expect(result?.usage_count).toBe(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chordme_favorite_queries',
        expect.stringContaining('"usage_count":1')
      );
    });

    it('should throw error for duplicate query names', () => {
      const mockQueries = [
        { id: 'existing', name: 'Existing Query', query: 'test', filters: {}, created_at: '2023-01-01', usage_count: 0 }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueries));
      
      expect(() => {
        favoritesService.saveFavoriteQuery('Existing Query', 'new query');
      }).toThrow('A favorite query with this name already exists');
    });
  });

  describe('Export (...args: unknown[]) => unknownality', () => {
    it('should export local data', () => {
      const mockHistory = [{ query: 'test', timestamp: Date.now(), results_count: 1 }];
      const mockQueries = [{ id: '1', name: 'Test', query: 'test', filters: {}, created_at: '2023-01-01', usage_count: 0 }];
      const mockPrivacy = { clearOnExit: false, trackHistory: true };
      
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockHistory))    // search history
        .mockReturnValueOnce(JSON.stringify(mockQueries))    // favorite queries
        .mockReturnValueOnce(JSON.stringify(mockPrivacy));   // privacy settings
      
      const exportData = favoritesService.historyManager.exportData();
      
      expect(exportData).toHaveProperty('search_history', mockHistory);
      expect(exportData).toHaveProperty('favorite_queries', mockQueries);
      expect(exportData).toHaveProperty('privacy_settings', mockPrivacy);
      expect(exportData).toHaveProperty('export_date');
    });
  });

  describe('App Exit Handling', () => {
    it('should clear history on exit when privacy setting is enabled', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        clearOnExit: true,
        trackHistory: true,
      }));
      
      favoritesService.handleAppExit();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('chordme_search_history');
    });

    it('should not clear history on exit when privacy setting is disabled', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        clearOnExit: false,
        trackHistory: true,
      }));
      
      favoritesService.handleAppExit();
      
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('chordme_search_history');
    });
  });
});