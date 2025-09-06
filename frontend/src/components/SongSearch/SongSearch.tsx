import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { 
  songSearchService, 
  SearchQuery, 
  SearchResult, 
  SearchSuggestion,
  SearchQueryParser,
  SearchResultUtils
} from '../../services/songSearchService';
import './SongSearch.css';

interface SongSearchProps {
  onResultsChange?: (results: SearchResult[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  initialQuery?: SearchQuery;
  showAdvancedFilters?: boolean;
  showSearchHistory?: boolean;
  placeholder?: string;
  maxResults?: number;
}

interface SearchFilters {
  genre: string;
  key: string;
  difficulty: string;
  language: string;
  tags: string[];
  minTempo: string;
  maxTempo: string;
}

const SongSearch: React.FC<SongSearchProps> = ({
  onResultsChange,
  onLoadingChange,
  initialQuery = {},
  showAdvancedFilters = true,
  showSearchHistory = true,
  placeholder = "Search songs... (try: \"title\" AND artist, or rock NOT metal)",
  maxResults = 50
}) => {
  // State management
  const [query, setQuery] = useState(initialQuery.q || '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    genre: initialQuery.genre || '',
    key: initialQuery.key || '',
    difficulty: initialQuery.difficulty || '',
    language: initialQuery.language || 'en',
    tags: initialQuery.tags || [],
    minTempo: initialQuery.minTempo?.toString() || '',
    maxTempo: initialQuery.maxTempo?.toString() || ''
  });

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced query for suggestions
  const debouncedQuery = useDebounce(query, 300);
  const debouncedSearchQuery = useDebounce(query, 500);

  // Recent searches
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  // Load recent queries on mount
  useEffect(() => {
    setRecentQueries(songSearchService.getRecentQueries(10));
  }, []);

  // Parse query to show syntax help
  const parsedQuery = useMemo(() => {
    return SearchQueryParser.parseQuery(query);
  }, [query]);

  const hasAdvancedSyntax = useMemo(() => {
    return SearchQueryParser.hasAdvancedSyntax(query);
  }, [query]);

  // Get suggestions
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      const getSuggestions = async () => {
        try {
          const response = await songSearchService.getSuggestions(debouncedQuery, 'all', 8);
          setSuggestions(response.suggestions);
        } catch (error) {
          console.warn('Failed to get suggestions:', error);
          setSuggestions([]);
        }
      };

      getSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, page: number = 0) => {
    if (!searchQuery.trim() && !Object.values(filters).some(filter => 
      Array.isArray(filter) ? filter.length > 0 : filter !== ''
    )) {
      setSearchResults([]);
      setTotalResults(0);
      if (onResultsChange) onResultsChange([]);
      return;
    }

    setLoading(true);
    setError(null);
    if (onLoadingChange) onLoadingChange(true);

    try {
      const searchParams: SearchQuery = {
        q: searchQuery.trim() || undefined,
        genre: filters.genre || undefined,
        key: filters.key || undefined,
        difficulty: filters.difficulty as any || undefined,
        language: filters.language || undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        minTempo: filters.minTempo ? parseInt(filters.minTempo) : undefined,
        maxTempo: filters.maxTempo ? parseInt(filters.maxTempo) : undefined,
        includePublic: true,
        limit: maxResults,
        offset: page * maxResults,
        enableCache: true
      };

      const response = await songSearchService.searchSongs(searchParams);
      
      setSearchResults(response.results);
      setTotalResults(response.total_count);
      setSearchTime(response.search_time_ms);
      setCurrentPage(page);

      if (onResultsChange) {
        onResultsChange(response.results);
      }

      // Update recent queries
      if (searchQuery.trim()) {
        setRecentQueries(songSearchService.getRecentQueries(10));
      }
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
      setTotalResults(0);
      if (onResultsChange) onResultsChange([]);
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false);
    }
  }, [filters, maxResults, onResultsChange, onLoadingChange]);

  // Trigger search when query or filters change
  useEffect(() => {
    performSearch(debouncedSearchQuery, 0);
  }, [debouncedSearchQuery, performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedSuggestionIndex(-1);
    setShowSuggestions(true);
    setShowHistory(false);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (query.length >= 2) {
      setShowSuggestions(true);
    } else if (showSearchHistory && recentQueries.length > 0) {
      setShowHistory(true);
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking
    setTimeout(() => {
      setShowSuggestions(false);
      setShowHistory(false);
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions && !showHistory) return;

    const items = showSuggestions ? suggestions : recentQueries.map(q => ({ text: q }));
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
          const selectedItem = items[selectedSuggestionIndex];
          const selectedText = typeof selectedItem === 'string' ? selectedItem : selectedItem.text;
          setQuery(selectedText);
          setShowSuggestions(false);
          setShowHistory(false);
          performSearch(selectedText, 0);
        } else {
          setShowSuggestions(false);
          setShowHistory(false);
          performSearch(query, 0);
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setShowHistory(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion | string) => {
    const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
    setQuery(text);
    setShowSuggestions(false);
    setShowHistory(false);
    performSearch(text, 0);
    searchInputRef.current?.focus();
  };

  // Handle filter change
  const handleFilterChange = (filterName: keyof SearchFilters, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Handle clear search
  const handleClearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setError(null);
    if (onResultsChange) onResultsChange([]);
    searchInputRef.current?.focus();
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    performSearch(query, newPage);
  };

  // Render suggestions
  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div ref={suggestionsRef} className="search-suggestions">
        <div className="suggestions-header">
          <span>Suggestions</span>
          {hasAdvancedSyntax && (
            <span className="advanced-syntax-indicator">
              Advanced syntax detected
            </span>
          )}
        </div>
        <ul className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.text}`}
              className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="suggestion-text">{suggestion.text}</div>
              <div className="suggestion-meta">
                <span className={`suggestion-type type-${suggestion.type}`}>
                  {suggestion.type}
                </span>
                <span className="suggestion-count">
                  {suggestion.count} songs
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Render search history
  const renderSearchHistory = () => {
    if (!showHistory || recentQueries.length === 0) return null;

    return (
      <div className="search-history">
        <div className="history-header">
          <span>Recent Searches</span>
          <button 
            type="button"
            className="clear-history-btn"
            onClick={() => {
              songSearchService.clearSearchHistory();
              setRecentQueries([]);
              setShowHistory(false);
            }}
          >
            Clear
          </button>
        </div>
        <ul className="history-list">
          {recentQueries.map((recentQuery, index) => (
            <li
              key={index}
              className={`history-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(recentQuery)}
            >
              <span className="history-icon">🕒</span>
              <span className="history-query">{recentQuery}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Render advanced filters
  const renderAdvancedFilters = () => {
    if (!showAdvancedFilters || !showFilters) return null;

    return (
      <div className="advanced-filters">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="genre-filter">Genre</label>
            <input
              id="genre-filter"
              type="text"
              value={filters.genre}
              onChange={(e) => handleFilterChange('genre', e.target.value)}
              placeholder="e.g., rock, jazz, classical"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="key-filter">Key</label>
            <select
              id="key-filter"
              value={filters.key}
              onChange={(e) => handleFilterChange('key', e.target.value)}
            >
              <option value="">Any key</option>
              <option value="C">C</option>
              <option value="C#">C#</option>
              <option value="D">D</option>
              <option value="D#">D#</option>
              <option value="E">E</option>
              <option value="F">F</option>
              <option value="F#">F#</option>
              <option value="G">G</option>
              <option value="G#">G#</option>
              <option value="A">A</option>
              <option value="A#">A#</option>
              <option value="B">B</option>
              <option value="Am">Am</option>
              <option value="Bm">Bm</option>
              <option value="Cm">Cm</option>
              <option value="Dm">Dm</option>
              <option value="Em">Em</option>
              <option value="Fm">Fm</option>
              <option value="Gm">Gm</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="difficulty-filter">Difficulty</label>
            <select
              id="difficulty-filter"
              value={filters.difficulty}
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            >
              <option value="">Any difficulty</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="language-filter">Language</label>
            <select
              id="language-filter"
              value={filters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="min-tempo-filter">Min Tempo (BPM)</label>
            <input
              id="min-tempo-filter"
              type="number"
              min="60"
              max="200"
              value={filters.minTempo}
              onChange={(e) => handleFilterChange('minTempo', e.target.value)}
              placeholder="60"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="max-tempo-filter">Max Tempo (BPM)</label>
            <input
              id="max-tempo-filter"
              type="number"
              min="60"
              max="200"
              value={filters.maxTempo}
              onChange={(e) => handleFilterChange('maxTempo', e.target.value)}
              placeholder="200"
            />
          </div>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="clear-filters-btn"
            onClick={() => setFilters({
              genre: '',
              key: '',
              difficulty: '',
              language: 'en',
              tags: [],
              minTempo: '',
              maxTempo: ''
            })}
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  };

  // Render search results
  const renderSearchResults = () => {
    if (loading) {
      return (
        <div className="search-loading">
          <div className="loading-spinner" />
          <span>Searching...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="search-error">
          <span className="error-icon">⚠️</span>
          <span>Error: {error}</span>
          <button onClick={() => performSearch(query, currentPage)}>
            Try Again
          </button>
        </div>
      );
    }

    if (searchResults.length === 0 && (query || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== ''))) {
      return (
        <div className="no-results">
          <span>No songs found matching your search criteria.</span>
          {hasAdvancedSyntax && (
            <div className="syntax-help">
              <p>Your search uses advanced syntax:</p>
              <ul>
                {parsedQuery.phrases.length > 0 && (
                  <li>Phrases: {parsedQuery.phrases.map(p => `"${p}"`).join(', ')}</li>
                )}
                {parsedQuery.and_terms.length > 0 && (
                  <li>Required terms: {parsedQuery.and_terms.join(', ')}</li>
                )}
                {parsedQuery.not_terms.length > 0 && (
                  <li>Excluded terms: {parsedQuery.not_terms.join(', ')}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (searchResults.length === 0) {
      return null;
    }

    return (
      <div className="search-results">
        <div className="results-header">
          <div className="results-info">
            <span className="results-count">
              {totalResults.toLocaleString()} song{totalResults !== 1 ? 's' : ''} found
            </span>
            <span className="search-time">
              ({searchTime}ms)
            </span>
          </div>
          
          {totalResults > maxResults && (
            <div className="pagination">
              <button
                disabled={currentPage === 0}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage + 1} of {Math.ceil(totalResults / maxResults)}
              </span>
              <button
                disabled={(currentPage + 1) * maxResults >= totalResults}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="results-list">
          {searchResults.map((result) => (
            <div key={result.id} className="result-item">
              <div className="result-main">
                <h3 className="result-title">
                  {result.highlights?.title ? (
                    <span dangerouslySetInnerHTML={{ __html: result.highlights.title }} />
                  ) : (
                    result.title
                  )}
                </h3>
                
                <div className="result-artist">
                  {result.highlights?.artist ? (
                    <span dangerouslySetInnerHTML={{ __html: result.highlights.artist }} />
                  ) : (
                    result.artist
                  )}
                </div>

                {result.highlights?.lyrics && (
                  <div className="result-lyrics">
                    <span dangerouslySetInnerHTML={{ __html: result.highlights.lyrics }} />
                  </div>
                )}
              </div>

              <div className="result-meta">
                <div className="result-summary">
                  {SearchResultUtils.createSummary(result)}
                </div>
                
                <div className="result-stats">
                  <span className="relevance-score">
                    {SearchResultUtils.formatRelevanceScore(result.relevance_score)}
                  </span>
                  <span className="match-type">
                    {SearchResultUtils.getMatchTypeDescription(result.match_type)}
                  </span>
                </div>

                <div className="result-badges">
                  {result.matched_fields.map(field => (
                    <span key={field} className={`field-badge badge-${field}`}>
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="song-search">
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="search-input"
            autoComplete="off"
          />
          
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          
          {showAdvancedFilters && (
            <button
              type="button"
              className={`filters-toggle-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Toggle filters"
            >
              🔧
            </button>
          )}
        </div>

        {renderSuggestions()}
        {renderSearchHistory()}
      </div>

      {renderAdvancedFilters()}
      {renderSearchResults()}
    </div>
  );
};

export default SongSearch;