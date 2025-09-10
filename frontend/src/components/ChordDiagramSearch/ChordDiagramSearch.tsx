/**
 * ChordDiagramSearch Component
 * 
 * A comprehensive search interface for chord diagrams with filtering, sorting, and pagination.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChordDiagram,
  ChordDiagramSearchOptions,
  ChordDiagramSearchResults,
  ChordDiagramSearchCriteria,
  SortOption
} from '../../types/chordDiagram';
import { searchChordDiagramsAdvanced } from '../../services/chordDiagramUtils';
import ChordFilterPanel from './ChordFilterPanel';
import SearchResultsDisplay from './SearchResultsDisplay';
import SortControls from './SortControls';
import './ChordDiagramSearch.css';

interface ChordDiagramSearchProps {
  /** Available chord diagrams to search */
  chordDiagrams: ChordDiagram[];
  /** Callback when a chord is selected */
  onChordSelect?: (chord: ChordDiagram) => void;
  /** Initial search criteria */
  initialCriteria?: Partial<ChordDiagramSearchCriteria>;
  /** Whether to show advanced filters */
  showAdvancedFilters?: boolean;
  /** Maximum number of results per page */
  pageSize?: number;
  /** Whether to show search history */
  showSearchHistory?: boolean;
}

interface SearchHistory {
  id: string;
  criteria: ChordDiagramSearchCriteria;
  timestamp: Date;
  resultCount: number;
}

const ChordDiagramSearch: React.FC<ChordDiagramSearchProps> = ({
  chordDiagrams,
  onChordSelect,
  initialCriteria = {},
  showAdvancedFilters = true,
  pageSize = 20,
  showSearchHistory = true
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState(initialCriteria.name || '');
  const [criteria, setCriteria] = useState<ChordDiagramSearchCriteria>(initialCriteria);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [results, setResults] = useState<ChordDiagramSearchResults | null>(null);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Debounced search
  const searchOptions = useMemo<ChordDiagramSearchOptions>(() => ({
    criteria: {
      ...criteria,
      name: searchTerm,
      fuzzySearch: true,
      fuzzyThreshold: 30
    },
    sortBy,
    sortDirection,
    page: currentPage,
    pageSize,
    maxResults: 1000
  }), [criteria, searchTerm, sortBy, sortDirection, currentPage, pageSize]);

  // Perform search
  useEffect(() => {
    if (chordDiagrams.length === 0) return;

    setIsSearching(true);
    
    // Simulate async search with timeout to show loading state
    const timeoutId = setTimeout(() => {
      const searchResults = searchChordDiagramsAdvanced(chordDiagrams, searchOptions);
      setResults(searchResults);
      setIsSearching(false);
      
      // Add to search history if we have a meaningful search
      if (searchTerm || Object.keys(criteria).length > 0) {
        const historyEntry: SearchHistory = {
          id: Date.now().toString(),
          criteria: searchOptions.criteria,
          timestamp: new Date(),
          resultCount: searchResults.totalCount
        };
        
        setSearchHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10 searches
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [chordDiagrams, searchOptions, searchTerm, criteria]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, criteria, sortBy, sortDirection]);

  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleCriteriaChange = (newCriteria: Partial<ChordDiagramSearchCriteria>) => {
    setCriteria(prev => ({ ...prev, ...newCriteria }));
  };

  const handleSortChange = (newSortBy: SortOption, newDirection?: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    if (newDirection) {
      setSortDirection(newDirection);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCriteria({});
    setSortBy('relevance');
    setSortDirection('desc');
    setCurrentPage(0);
  };

  const handleHistorySelect = (historyEntry: SearchHistory) => {
    setCriteria(historyEntry.criteria);
    setSearchTerm(historyEntry.criteria.name || '');
    setShowHistory(false);
  };

  return (
    <div className="chord-diagram-search">
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search chords (e.g., C, Am7, F#maj7)..."
            value={searchTerm}
            onChange={(e) => handleSearchTermChange(e.target.value)}
            aria-label="Search chord diagrams"
          />
          
          {showSearchHistory && (
            <button
              type="button"
              className="history-button"
              onClick={() => setShowHistory(!showHistory)}
              aria-label="Show search history"
              title="Search history"
            >
              🕒
            </button>
          )}
          
          {isSearching && (
            <div className="search-loading" aria-live="polite">
              Searching...
            </div>
          )}
        </div>

        <div className="search-actions">
          {showAdvancedFilters && (
            <button
              type="button"
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-label="Toggle filters"
            >
              🔽 Filters
            </button>
          )}
          
          <button
            type="button"
            className="clear-button"
            onClick={handleClearFilters}
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Search History */}
      {showHistory && searchHistory.length > 0 && (
        <div className="search-history" role="region" aria-label="Search history">
          <h3>Recent Searches</h3>
          <ul>
            {searchHistory.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="history-item"
                  onClick={() => handleHistorySelect(entry)}
                >
                  <span className="history-term">
                    {entry.criteria.name || 'Advanced search'}
                  </span>
                  <span className="history-count">
                    {entry.resultCount} results
                  </span>
                  <span className="history-time">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && showFilters && (
        <ChordFilterPanel
          criteria={criteria}
          onChange={handleCriteriaChange}
        />
      )}

      {/* Results */}
      {results && (
        <>
          <div className="search-controls">
            <div className="result-count" aria-live="polite">
              {results.totalCount === 0 ? (
                'No chords found'
              ) : (
                `${results.totalCount} chord${results.totalCount === 1 ? '' : 's'} found`
              )}
              {results.totalPages > 1 && (
                <span> (Page {results.page + 1} of {results.totalPages})</span>
              )}
            </div>

            <SortControls
              sortBy={sortBy}
              sortDirection={sortDirection}
              onChange={handleSortChange}
            />
          </div>

          <SearchResultsDisplay
            results={results}
            onChordSelect={onChordSelect}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default ChordDiagramSearch;