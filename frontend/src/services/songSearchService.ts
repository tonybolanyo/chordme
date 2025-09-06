/**
 * Enhanced Full-Text Search Service
 * 
 * Provides comprehensive search functionality for songs with:
 * - Boolean operators (AND, OR, NOT)
 * - Phrase searching with quotes
 * - Search suggestions and autocomplete  
 * - Result highlighting and ranking
 * - Performance optimization with caching
 */

import { apiRequest, ApiError } from '../utils/apiUtils';

// Types for search functionality
export interface SearchQuery {
  q?: string;
  genre?: string;
  key?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  language?: string;
  tags?: string[];
  minTempo?: number;
  maxTempo?: number;
  includePublic?: boolean;
  limit?: number;
  offset?: number;
  enableCache?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  genre: string;
  song_key: string;
  tempo: number;
  difficulty: string;
  language: string;
  view_count: number;
  favorite_count: number;
  created_at: string;
  relevance_score: number;
  match_type: string;
  matched_fields: string[];
  highlights?: {
    title?: string;
    artist?: string;
    lyrics?: string;
  };
}

export interface ParsedQuery {
  original: string;
  phrases: string[];
  and_terms: string[];
  or_terms: string[];
  not_terms: string[];
  has_operators: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  search_time_ms: number;
  query_info: {
    original_query: string;
    parsed_query: ParsedQuery;
    filters_applied: Record<string, any>;
  };
  suggestions?: string[];
}

export interface SearchSuggestion {
  text: string;
  type: 'title' | 'artist' | 'tag';
  count: number;
  relevance_score: number;
}

export interface SuggestionsResponse {
  suggestions: SearchSuggestion[];
  query: string;
}

// Search history management
interface SearchHistoryItem {
  query: string;
  timestamp: number;
  results_count: number;
}

class SearchHistoryManager {
  private readonly STORAGE_KEY = 'chordme_search_history';
  private readonly MAX_HISTORY = 50;

  getHistory(): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  addToHistory(query: string, resultsCount: number = 0): void {
    if (!query.trim()) return;

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
}

// Query parser for boolean operators
export class SearchQueryParser {
  static parseQuery(query: string): ParsedQuery {
    if (!query) {
      return {
        original: '',
        phrases: [],
        and_terms: [],
        or_terms: [],
        not_terms: [],
        has_operators: false
      };
    }

    const result: ParsedQuery = {
      original: query,
      phrases: [],
      and_terms: [],
      or_terms: [],
      not_terms: [],
      has_operators: false
    };

    // Extract quoted phrases
    const phraseMatches = query.match(/"([^"]+)"/g);
    if (phraseMatches) {
      result.phrases = phraseMatches.map(match => match.slice(1, -1));
    }

    // Remove phrases from query for further parsing
    let cleanQuery = query.replace(/"[^"]+"/g, '');

    // Split into terms
    const terms = cleanQuery.split(/\s+/).filter(term => term.trim());

    let currentTerms: string[] = [];
    let i = 0;

    while (i < terms.length) {
      const term = terms[i].trim();

      if (term.toUpperCase() === 'AND') {
        result.has_operators = true;
        i++;
        continue;
      } else if (term.toUpperCase() === 'OR') {
        result.has_operators = true;
        if (currentTerms.length > 0) {
          result.or_terms.push(...currentTerms);
          currentTerms = [];
        }
        // Add the next term to OR terms if it exists
        if (i + 1 < terms.length) {
          result.or_terms.push(terms[i + 1]);
          i += 2;
        } else {
          i++;
        }
        continue;
      } else if (term.toUpperCase() === 'NOT' && i + 1 < terms.length) {
        result.has_operators = true;
        result.not_terms.push(terms[i + 1]);
        i += 2;
        continue;
      } else if (term.startsWith('-')) {
        result.has_operators = true;
        result.not_terms.push(term.slice(1));
      } else if (term.startsWith('+')) {
        currentTerms.push(term.slice(1));
      } else if (term) {
        currentTerms.push(term);
      }

      i++;
    }

    // Add remaining terms as AND terms
    result.and_terms.push(...currentTerms);

    return result;
  }

  static buildQueryString(parsed: ParsedQuery): string {
    const parts: string[] = [];

    // Add phrases
    if (parsed.phrases.length > 0) {
      parts.push(...parsed.phrases.map(phrase => `"${phrase}"`));
    }

    // Add AND terms
    if (parsed.and_terms.length > 0) {
      parts.push(...parsed.and_terms);
    }

    // Add OR terms
    if (parsed.or_terms.length > 0) {
      parts.push(...parsed.or_terms.map(term => `OR ${term}`));
    }

    // Add NOT terms
    if (parsed.not_terms.length > 0) {
      parts.push(...parsed.not_terms.map(term => `NOT ${term}`));
    }

    return parts.join(' ');
  }

  static hasAdvancedSyntax(query: string): boolean {
    const parsed = this.parseQuery(query);
    return parsed.has_operators || parsed.phrases.length > 0;
  }
}

// Main search service class
export class SongSearchService {
  private historyManager = new SearchHistoryManager();
  private abortController: AbortController | null = null;

  /**
   * Search songs with advanced query capabilities
   */
  async searchSongs(searchQuery: SearchQuery): Promise<SearchResponse> {
    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      const params = new URLSearchParams();

      // Add search parameters
      if (searchQuery.q) params.append('q', searchQuery.q);
      if (searchQuery.genre) params.append('genre', searchQuery.genre);
      if (searchQuery.key) params.append('key', searchQuery.key);
      if (searchQuery.difficulty) params.append('difficulty', searchQuery.difficulty);
      if (searchQuery.language) params.append('language', searchQuery.language);
      if (searchQuery.tags && searchQuery.tags.length > 0) {
        params.append('tags', searchQuery.tags.join(','));
      }
      if (searchQuery.minTempo !== undefined) params.append('min_tempo', searchQuery.minTempo.toString());
      if (searchQuery.maxTempo !== undefined) params.append('max_tempo', searchQuery.maxTempo.toString());
      if (searchQuery.includePublic !== undefined) params.append('include_public', searchQuery.includePublic.toString());
      if (searchQuery.limit) params.append('limit', searchQuery.limit.toString());
      if (searchQuery.offset) params.append('offset', searchQuery.offset.toString());
      if (searchQuery.enableCache !== undefined) params.append('enable_cache', searchQuery.enableCache.toString());

      const response = await apiRequest<SearchResponse>(
        `/songs/search?${params.toString()}`,
        {
          method: 'GET',
          signal: this.abortController.signal
        }
      );

      // Add to search history if this was a text search
      if (searchQuery.q) {
        this.historyManager.addToHistory(searchQuery.q, response.total_count);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search cancelled');
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(
    query: string,
    type: 'title' | 'artist' | 'tag' | 'all' = 'all',
    limit: number = 10
  ): Promise<SuggestionsResponse> {
    if (!query || query.length < 2) {
      return { suggestions: [], query };
    }

    const params = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString()
    });

    try {
      const response = await apiRequest<SuggestionsResponse>(
        `/songs/suggestions?${params.toString()}`,
        { method: 'GET' }
      );

      return response;
    } catch (error) {
      console.warn('Failed to get suggestions:', error);
      return { suggestions: [], query };
    }
  }

  /**
   * Get recent search queries from history
   */
  getRecentQueries(limit: number = 10): string[] {
    return this.historyManager.getRecentQueries(limit);
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.historyManager.clearHistory();
  }

  /**
   * Cancel ongoing search request
   */
  cancelSearch(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Parse search query to understand structure
   */
  parseQuery(query: string): ParsedQuery {
    return SearchQueryParser.parseQuery(query);
  }

  /**
   * Check if query uses advanced syntax
   */
  hasAdvancedSyntax(query: string): boolean {
    return SearchQueryParser.hasAdvancedSyntax(query);
  }

  /**
   * Get search help text for advanced syntax
   */
  getSearchHelp(): Array<{ syntax: string; description: string; example: string }> {
    return [
      {
        syntax: 'AND',
        description: 'Find songs containing all terms',
        example: 'love AND peace'
      },
      {
        syntax: 'OR',
        description: 'Find songs containing any term',
        example: 'guitar OR piano'
      },
      {
        syntax: 'NOT',
        description: 'Exclude songs containing term',
        example: 'jazz NOT blues'
      },
      {
        syntax: '"phrase"',
        description: 'Find exact phrase',
        example: '"amazing grace"'
      },
      {
        syntax: '-term',
        description: 'Exclude term (shorthand for NOT)',
        example: 'rock -metal'
      },
      {
        syntax: '+term',
        description: 'Require term (shorthand for AND)',
        example: '+classical +piano'
      }
    ];
  }

  /**
   * Build a search URL for sharing or bookmarking
   */
  buildSearchUrl(searchQuery: SearchQuery, baseUrl: string = ''): string {
    const params = new URLSearchParams();

    if (searchQuery.q) params.append('q', searchQuery.q);
    if (searchQuery.genre) params.append('genre', searchQuery.genre);
    if (searchQuery.key) params.append('key', searchQuery.key);
    if (searchQuery.difficulty) params.append('difficulty', searchQuery.difficulty);
    if (searchQuery.language && searchQuery.language !== 'en') params.append('language', searchQuery.language);
    if (searchQuery.tags && searchQuery.tags.length > 0) params.append('tags', searchQuery.tags.join(','));
    if (searchQuery.minTempo !== undefined) params.append('minTempo', searchQuery.minTempo.toString());
    if (searchQuery.maxTempo !== undefined) params.append('maxTempo', searchQuery.maxTempo.toString());

    const queryString = params.toString();
    return queryString ? `${baseUrl}/search?${queryString}` : `${baseUrl}/search`;
  }

  /**
   * Parse search URL parameters into SearchQuery object
   */
  parseSearchUrl(url: string): SearchQuery {
    const urlObj = new URL(url, window.location.origin);
    const params = urlObj.searchParams;

    const query: SearchQuery = {};

    if (params.has('q')) query.q = params.get('q') || undefined;
    if (params.has('genre')) query.genre = params.get('genre') || undefined;
    if (params.has('key')) query.key = params.get('key') || undefined;
    if (params.has('difficulty')) query.difficulty = params.get('difficulty') as any;
    if (params.has('language')) query.language = params.get('language') || undefined;
    if (params.has('tags')) {
      const tagsString = params.get('tags');
      query.tags = tagsString ? tagsString.split(',').map(tag => tag.trim()) : undefined;
    }
    if (params.has('minTempo')) {
      const minTempo = parseInt(params.get('minTempo') || '0');
      if (!isNaN(minTempo)) query.minTempo = minTempo;
    }
    if (params.has('maxTempo')) {
      const maxTempo = parseInt(params.get('maxTempo') || '0');
      if (!isNaN(maxTempo)) query.maxTempo = maxTempo;
    }

    return query;
  }
}

// Create singleton instance
export const songSearchService = new SongSearchService();

// Utility functions for search result processing
export class SearchResultUtils {
  /**
   * Extract plain text from highlighted content
   */
  static extractPlainText(highlightedText: string): string {
    return highlightedText.replace(/<mark>|<\/mark>/g, '');
  }

  /**
   * Count highlighted terms in text
   */
  static countHighlights(highlightedText: string): number {
    const matches = highlightedText.match(/<mark>/g);
    return matches ? matches.length : 0;
  }

  /**
   * Create search result summary
   */
  static createSummary(result: SearchResult): string {
    const parts: string[] = [];
    
    if (result.artist) parts.push(`by ${result.artist}`);
    if (result.genre) parts.push(result.genre);
    if (result.difficulty) parts.push(result.difficulty);
    if (result.tempo) parts.push(`${result.tempo} BPM`);

    return parts.join(' • ');
  }

  /**
   * Format relevance score as percentage
   */
  static formatRelevanceScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  /**
   * Get match type description
   */
  static getMatchTypeDescription(matchType: string): string {
    const descriptions: Record<string, string> = {
      'exact_title': 'Exact title match',
      'title_contains': 'Title contains search term',
      'artist_contains': 'Artist contains search term',
      'lyrics_contains': 'Lyrics contain search term',
      'fuzzy_match': 'Similar content found',
      'browse': 'Browsing results'
    };

    return descriptions[matchType] || 'Match found';
  }
}

// Export types and utilities
export {
  SearchHistoryManager
};