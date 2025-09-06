/**
 * Tests for Song Search Service
 * Tests the enhanced search functionality including:
 * - Boolean operators and phrase search
 * - Search suggestions and autocomplete
 * - Search history management
 * - Query parsing and validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  songSearchService, 
  SearchQueryParser,
  SearchResultUtils,
  SearchHistoryManager
} from './songSearchService';

// Mock the apiRequest function
vi.mock('../utils/apiUtils', () => ({
  apiRequest: vi.fn()
}));

import { apiRequest } from '../utils/apiUtils';

const mockApiRequest = apiRequest as any;

const mockResult = {
  id: '1',
  title: 'Amazing Grace',
  artist: 'Traditional',
  genre: 'gospel',
  song_key: 'G',
  tempo: 80,
  difficulty: 'beginner',
  language: 'en',
  view_count: 100,
  favorite_count: 10,
  created_at: '2023-01-01T00:00:00Z',
  relevance_score: 0.85,
  match_type: 'title_contains',
  matched_fields: ['title', 'genre'],
  highlights: {
    title: '<mark>Amazing</mark> Grace',
    artist: 'Traditional'
  }
};

describe('SearchQueryParser', () => {
  describe('parseQuery', () => {
    it('should parse empty query', () => {
      const result = SearchQueryParser.parseQuery('');
      expect(result).toEqual({
        original: '',
        phrases: [],
        and_terms: [],
        or_terms: [],
        not_terms: [],
        has_operators: false
      });
    });

    it('should parse simple terms', () => {
      const result = SearchQueryParser.parseQuery('love peace');
      expect(result.original).toBe('love peace');
      expect(result.and_terms).toEqual(['love', 'peace']);
      expect(result.has_operators).toBe(false);
    });

    it('should parse quoted phrases', () => {
      const result = SearchQueryParser.parseQuery('"amazing grace" worship');
      expect(result.phrases).toEqual(['amazing grace']);
      expect(result.and_terms).toEqual(['worship']);
      expect(result.has_operators).toBe(false);
    });

    it('should parse AND operator', () => {
      const result = SearchQueryParser.parseQuery('love AND peace');
      expect(result.and_terms).toEqual(['love', 'peace']);
      expect(result.has_operators).toBe(true);
    });

    it('should parse OR operator', () => {
      const result = SearchQueryParser.parseQuery('guitar OR piano');
      expect(result.or_terms).toEqual(['guitar', 'piano']);
      expect(result.has_operators).toBe(true);
    });

    it('should parse NOT operator', () => {
      const result = SearchQueryParser.parseQuery('rock NOT metal');
      expect(result.and_terms).toEqual(['rock']);
      expect(result.not_terms).toEqual(['metal']);
      expect(result.has_operators).toBe(true);
    });

    it('should parse minus operator', () => {
      const result = SearchQueryParser.parseQuery('rock -metal');
      expect(result.and_terms).toEqual(['rock']);
      expect(result.not_terms).toEqual(['metal']);
      expect(result.has_operators).toBe(true);
    });

    it('should parse plus operator', () => {
      const result = SearchQueryParser.parseQuery('+jazz +piano');
      expect(result.and_terms).toEqual(['jazz', 'piano']);
      expect(result.has_operators).toBe(false); // Plus is not considered advanced
    });

    it('should parse complex queries', () => {
      const result = SearchQueryParser.parseQuery('"amazing grace" AND worship NOT contemporary');
      expect(result.phrases).toEqual(['amazing grace']);
      expect(result.and_terms).toEqual(['worship']);
      expect(result.not_terms).toEqual(['contemporary']);
      expect(result.has_operators).toBe(true);
    });
  });

  describe('hasAdvancedSyntax', () => {
    it('should detect boolean operators', () => {
      expect(SearchQueryParser.hasAdvancedSyntax('love AND peace')).toBe(true);
      expect(SearchQueryParser.hasAdvancedSyntax('guitar OR piano')).toBe(true);
      expect(SearchQueryParser.hasAdvancedSyntax('rock NOT metal')).toBe(true);
    });

    it('should detect phrases', () => {
      expect(SearchQueryParser.hasAdvancedSyntax('"amazing grace"')).toBe(true);
    });

    it('should detect minus operator', () => {
      expect(SearchQueryParser.hasAdvancedSyntax('rock -metal')).toBe(true);
    });

    it('should not detect simple queries', () => {
      expect(SearchQueryParser.hasAdvancedSyntax('simple query')).toBe(false);
      expect(SearchQueryParser.hasAdvancedSyntax('love peace')).toBe(false);
    });
  });

  describe('buildQueryString', () => {
    it('should rebuild query from parsed components', () => {
      const parsed = {
        original: 'test',
        phrases: ['amazing grace'],
        and_terms: ['worship'],
        or_terms: ['traditional'],
        not_terms: ['contemporary'],
        has_operators: true
      };

      const result = SearchQueryParser.buildQueryString(parsed);
      expect(result).toContain('"amazing grace"');
      expect(result).toContain('worship');
      expect(result).toContain('OR traditional');
      expect(result).toContain('NOT contemporary');
    });
  });
});

describe('SearchHistoryManager', () => {
  let historyManager: SearchHistoryManager;

  beforeEach(() => {
    historyManager = new SearchHistoryManager();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('addToHistory', () => {
    it('should add query to history', () => {
      historyManager.addToHistory('test query', 5);
      const history = historyManager.getHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('test query');
      expect(history[0].results_count).toBe(5);
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should not add empty queries', () => {
      historyManager.addToHistory('', 0);
      historyManager.addToHistory('   ', 0);
      
      const history = historyManager.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should move existing query to top', () => {
      historyManager.addToHistory('query1', 1);
      historyManager.addToHistory('query2', 2);
      historyManager.addToHistory('query1', 3); // Add again
      
      const history = historyManager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].query).toBe('query1');
      expect(history[0].results_count).toBe(3);
    });

    it('should limit history size', () => {
      // Add more than max history items
      for (let i = 0; i < 60; i++) {
        historyManager.addToHistory(`query${i}`, i);
      }
      
      const history = historyManager.getHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getRecentQueries', () => {
    it('should return recent queries in order', () => {
      historyManager.addToHistory('query1', 1);
      historyManager.addToHistory('query2', 2);
      historyManager.addToHistory('query3', 3);
      
      const recent = historyManager.getRecentQueries(2);
      expect(recent).toEqual(['query3', 'query2']);
    });

    it('should return empty array when no history', () => {
      const recent = historyManager.getRecentQueries();
      expect(recent).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      historyManager.addToHistory('query1', 1);
      historyManager.addToHistory('query2', 2);
      
      historyManager.clearHistory();
      
      const history = historyManager.getHistory();
      expect(history).toHaveLength(0);
    });
  });
});

describe('SearchResultUtils', () => {
  const mockResult = {
    id: '1',
    title: 'Amazing Grace',
    artist: 'Traditional',
    genre: 'gospel',
    song_key: 'G',
    tempo: 80,
    difficulty: 'beginner',
    language: 'en',
    view_count: 100,
    favorite_count: 10,
    created_at: '2023-01-01T00:00:00Z',
    relevance_score: 0.85,
    match_type: 'title_contains',
    matched_fields: ['title', 'genre'],
    highlights: {
      title: '<mark>Amazing</mark> Grace',
      artist: 'Traditional'
    }
  };

  describe('extractPlainText', () => {
    it('should remove HTML tags from highlighted text', () => {
      const result = SearchResultUtils.extractPlainText('<mark>Amazing</mark> Grace');
      expect(result).toBe('Amazing Grace');
    });

    it('should handle text without highlights', () => {
      const result = SearchResultUtils.extractPlainText('Amazing Grace');
      expect(result).toBe('Amazing Grace');
    });
  });

  describe('countHighlights', () => {
    it('should count highlighted terms', () => {
      const count = SearchResultUtils.countHighlights('<mark>Amazing</mark> <mark>Grace</mark>');
      expect(count).toBe(2);
    });

    it('should return 0 for non-highlighted text', () => {
      const count = SearchResultUtils.countHighlights('Amazing Grace');
      expect(count).toBe(0);
    });
  });

  describe('createSummary', () => {
    it('should create formatted summary', () => {
      const summary = SearchResultUtils.createSummary(mockResult);
      expect(summary).toContain('by Traditional');
      expect(summary).toContain('gospel');
      expect(summary).toContain('beginner');
      expect(summary).toContain('80 BPM');
    });

    it('should handle missing fields gracefully', () => {
      const partialResult = { ...mockResult, artist: '', genre: '' };
      const summary = SearchResultUtils.createSummary(partialResult);
      expect(summary).toContain('beginner');
      expect(summary).toContain('80 BPM');
    });
  });

  describe('formatRelevanceScore', () => {
    it('should format score as percentage', () => {
      expect(SearchResultUtils.formatRelevanceScore(0.85)).toBe('85%');
      expect(SearchResultUtils.formatRelevanceScore(0.123)).toBe('12%');
      expect(SearchResultUtils.formatRelevanceScore(1.0)).toBe('100%');
    });
  });

  describe('getMatchTypeDescription', () => {
    it('should return descriptions for match types', () => {
      expect(SearchResultUtils.getMatchTypeDescription('exact_title')).toBe('Exact title match');
      expect(SearchResultUtils.getMatchTypeDescription('title_contains')).toBe('Title contains search term');
      expect(SearchResultUtils.getMatchTypeDescription('unknown')).toBe('Match found');
    });
  });
});

describe('SongSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('searchSongs', () => {
    it('should make API request with correct parameters', async () => {
      const mockResponse = {
        results: [],
        total_count: 0,
        search_time_ms: 50,
        query_info: {
          original_query: 'test',
          parsed_query: { original: 'test', phrases: [], and_terms: ['test'], or_terms: [], not_terms: [], has_operators: false },
          filters_applied: {}
        }
      };

      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const query = {
        q: 'test query',
        genre: 'rock',
        difficulty: 'beginner' as const,
        limit: 20
      };

      const result = await songSearchService.searchSongs(query);

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/songs/search'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle search cancellation', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockApiRequest.mockRejectedValueOnce(abortError);

      const query = { q: 'test' };

      // Start search
      const searchPromise = songSearchService.searchSongs(query);
      
      // Cancel immediately
      songSearchService.cancelSearch();

      await expect(searchPromise).rejects.toThrow('Search cancelled');
    });

    it('should add successful searches to history', async () => {
      const mockResponse = {
        results: [mockResult],
        total_count: 1,
        search_time_ms: 50,
        query_info: {
          original_query: 'test',
          parsed_query: { original: 'test', phrases: [], and_terms: ['test'], or_terms: [], not_terms: [], has_operators: false },
          filters_applied: {}
        }
      };

      mockApiRequest.mockResolvedValueOnce(mockResponse);

      await songSearchService.searchSongs({ q: 'test query' });

      const recentQueries = songSearchService.getRecentQueries();
      expect(recentQueries).toContain('test query');
    });
  });

  describe('getSuggestions', () => {
    it('should get suggestions from API', async () => {
      const mockSuggestions = {
        suggestions: [
          { text: 'Amazing Grace', type: 'title' as const, count: 1, relevance_score: 0.9 }
        ],
        query: 'amaz'
      };

      mockApiRequest.mockResolvedValueOnce(mockSuggestions);

      const result = await songSearchService.getSuggestions('amaz', 'title', 5);

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/songs/suggestions'),
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual(mockSuggestions);
    });

    it('should return empty suggestions for short queries', async () => {
      const result = await songSearchService.getSuggestions('a');
      expect(result.suggestions).toEqual([]);
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('should handle suggestion errors gracefully', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('Network error'));

      const result = await songSearchService.getSuggestions('test');
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('buildSearchUrl', () => {
    it('should build URL with query parameters', () => {
      const query = {
        q: 'test query',
        genre: 'rock',
        difficulty: 'beginner' as const,
        tags: ['worship', 'contemporary']
      };

      const url = songSearchService.buildSearchUrl(query, 'https://example.com');
      
      expect(url).toContain('https://example.com/search');
      expect(url).toContain('q=test+query'); // + encoding for spaces is also valid
      expect(url).toContain('genre=rock');
      expect(url).toContain('difficulty=beginner');
      expect(url).toContain('tags=worship%2Ccontemporary');
    });

    it('should handle empty query', () => {
      const url = songSearchService.buildSearchUrl({}, 'https://example.com');
      expect(url).toBe('https://example.com/search');
    });
  });

  describe('parseSearchUrl', () => {
    it('should parse URL parameters into search query', () => {
      const url = 'https://example.com/search?q=test&genre=rock&difficulty=beginner&tags=worship,contemporary';
      
      const query = songSearchService.parseSearchUrl(url);
      
      expect(query).toEqual({
        q: 'test',
        genre: 'rock',
        difficulty: 'beginner',
        tags: ['worship', 'contemporary']
      });
    });

    it('should handle URL without parameters', () => {
      const url = 'https://example.com/search';
      
      const query = songSearchService.parseSearchUrl(url);
      
      expect(query).toEqual({});
    });

    it('should parse numeric parameters correctly', () => {
      const url = 'https://example.com/search?minTempo=80&maxTempo=120';
      
      const query = songSearchService.parseSearchUrl(url);
      
      expect(query.minTempo).toBe(80);
      expect(query.maxTempo).toBe(120);
    });
  });

  describe('getSearchHelp', () => {
    it('should return search help information', () => {
      const help = songSearchService.getSearchHelp();
      
      expect(help).toBeInstanceOf(Array);
      expect(help.length).toBeGreaterThan(0);
      
      const andHelp = help.find(item => item.syntax === 'AND');
      expect(andHelp).toBeDefined();
      expect(andHelp?.description).toContain('all terms');
      expect(andHelp?.example).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should handle complete search workflow', async () => {
    const mockSearchResponse = {
      results: [mockResult],
      total_count: 1,
      search_time_ms: 50,
      query_info: {
        original_query: 'amazing grace',
        parsed_query: {
          original: 'amazing grace',
          phrases: [],
          and_terms: ['amazing', 'grace'],
          or_terms: [],
          not_terms: [],
          has_operators: false
        },
        filters_applied: {}
      }
    };

    const mockSuggestionsResponse = {
      suggestions: [
        { text: 'Amazing Grace', type: 'title' as const, count: 1, relevance_score: 0.9 }
      ],
      query: 'amaz'
    };

    mockApiRequest
      .mockResolvedValueOnce(mockSuggestionsResponse) // For suggestions
      .mockResolvedValueOnce(mockSearchResponse); // For search

    // Get suggestions
    const suggestions = await songSearchService.getSuggestions('amaz');
    expect(suggestions.suggestions).toHaveLength(1);

    // Perform search
    const searchResults = await songSearchService.searchSongs({ q: 'amazing grace' });
    expect(searchResults.results).toHaveLength(1);
    expect(searchResults.results[0].title).toBe('Amazing Grace');

    // Check history
    const recentQueries = songSearchService.getRecentQueries();
    expect(recentQueries).toContain('amazing grace');
  });

  it('should handle advanced search syntax', async () => {
    const advancedQuery = '"amazing grace" AND worship NOT contemporary';
    const parsed = songSearchService.parseQuery(advancedQuery);
    
    expect(parsed.phrases).toEqual(['amazing grace']);
    expect(parsed.and_terms).toEqual(['worship']);
    expect(parsed.not_terms).toEqual(['contemporary']);
    expect(songSearchService.hasAdvancedSyntax(advancedQuery)).toBe(true);
  });
});