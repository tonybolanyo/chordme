/**
 * SearchResultsDisplay Component
 * 
 * Displays search results with pagination and chord selection.
 */

import React from 'react';
import { ChordDiagram, ChordDiagramSearchResults } from '../../types/chordDiagram';

interface SearchResultsDisplayProps {
  results: ChordDiagramSearchResults;
  onChordSelect?: (chord: ChordDiagram) => void;
  onPageChange: (page: number) => void;
}

const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  results,
  onChordSelect,
  onPageChange
}) => {
  const handleChordClick = (chord: ChordDiagram) => {
    if (onChordSelect) {
      onChordSelect(chord);
    }
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };

  const renderPagination = () => {
    if (results.totalPages <= 1) return null;

    const pages = [];
    const currentPage = results.page;
    const totalPages = results.totalPages;
    
    // Show up to 5 page numbers around current page
    const startPage = Math.max(0, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);

    // Previous button
    if (currentPage > 0) {
      pages.push(
        <button
          key="prev"
          type="button"
          className="pagination-button"
          onClick={() => handlePageClick(currentPage - 1)}
          aria-label="Previous page"
        >
          ← Prev
        </button>
      );
    }

    // First page
    if (startPage > 0) {
      pages.push(
        <button
          key={0}
          type="button"
          className="pagination-button"
          onClick={() => handlePageClick(0)}
        >
          1
        </button>
      );
      
      if (startPage > 1) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">…</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          className={`pagination-button ${i === currentPage ? 'active' : ''}`}
          onClick={() => handlePageClick(i)}
          aria-label={`Page ${i + 1}`}
          aria-current={i === currentPage ? 'page' : undefined}
        >
          {i + 1}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">…</span>);
      }
      
      pages.push(
        <button
          key={totalPages - 1}
          type="button"
          className="pagination-button"
          onClick={() => handlePageClick(totalPages - 1)}
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    if (currentPage < totalPages - 1) {
      pages.push(
        <button
          key="next"
          type="button"
          className="pagination-button"
          onClick={() => handlePageClick(currentPage + 1)}
          aria-label="Next page"
        >
          Next →
        </button>
      );
    }

    return (
      <nav className="pagination" role="navigation" aria-label="Search results pagination">
        {pages}
      </nav>
    );
  };

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'difficulty-beginner';
      case 'intermediate': return 'difficulty-intermediate';
      case 'advanced': return 'difficulty-advanced';
      case 'expert': return 'difficulty-expert';
      default: return 'difficulty-unknown';
    }
  };

  const getMaxFret = (chord: ChordDiagram) => {
    return Math.max(...chord.positions.map(p => p.fret));
  };

  if (results.totalCount === 0) {
    return (
      <div className="search-results-empty" role="status">
        <p>No chord diagrams found matching your criteria.</p>
        <p>Try:</p>
        <ul>
          <li>Checking the spelling of chord names</li>
          <li>Using simpler search terms</li>
          <li>Removing some filters</li>
          <li>Enabling fuzzy search for typo tolerance</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="search-results-display">
      <div className="results-grid" role="region" aria-label="Search results">
        {results.results.map((result) => (
          <div
            key={result.diagram.id}
            className="result-card"
            role="article"
            aria-labelledby={`chord-${result.diagram.id}-name`}
          >
            <div className="result-header">
              <h3 id={`chord-${result.diagram.id}-name`} className="chord-name">
                {result.diagram.name}
              </h3>
              <div className="result-badges">
                <span className={`difficulty-badge ${getDifficultyBadgeClass(result.diagram.difficulty)}`}>
                  {result.diagram.difficulty}
                </span>
                <span className="instrument-badge">
                  {result.diagram.instrument.type}
                </span>
                {result.diagram.barre && (
                  <span className="barre-badge">Barre</span>
                )}
              </div>
            </div>

            <div className="result-details">
              <div className="chord-info">
                <span className="fret-info">
                  Max Fret: {getMaxFret(result.diagram)}
                </span>
                <span className="popularity-info">
                  Popularity: {Math.round((result.diagram.metadata.popularityScore || 0) * 100)}%
                </span>
              </div>
              
              <div className="match-info">
                <span className="relevance-score">
                  {result.score}% match
                </span>
                <span className="match-reason">
                  {result.matchReason}
                </span>
              </div>
            </div>

            {/* Simple chord diagram preview */}
            <div className="chord-preview">
              <div className="fret-numbers">
                {result.diagram.positions.map((pos, i) => (
                  <span key={i} className="fret-number">
                    {pos.fret === -1 ? 'x' : pos.fret}
                  </span>
                ))}
              </div>
            </div>

            <div className="result-actions">
              <button
                type="button"
                className="select-chord-button"
                onClick={() => handleChordClick(result.diagram)}
                aria-label={`Select ${result.diagram.name} chord`}
              >
                Select Chord
              </button>
              
              {result.diagram.alternatives.length > 0 && (
                <span className="alternatives-count">
                  +{result.diagram.alternatives.length} alternatives
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {renderPagination()}
    </div>
  );
};

export default SearchResultsDisplay;