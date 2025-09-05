/**
 * SortControls Component
 * 
 * Controls for sorting chord diagram search results.
 */

import React from 'react';
import { SortOption } from '../../types/chordDiagram';

interface SortControlsProps {
  sortBy: SortOption;
  sortDirection: 'asc' | 'desc';
  onChange: (sortBy: SortOption, direction?: 'asc' | 'desc') => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'fretPosition', label: 'Fret Position' }
];

const SortControls: React.FC<SortControlsProps> = ({ sortBy, sortDirection, onChange }) => {
  const handleSortByChange = (newSortBy: SortOption) => {
    onChange(newSortBy);
  };

  const handleDirectionToggle = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    onChange(sortBy, newDirection);
  };

  const getDirectionIcon = () => {
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getDirectionLabel = () => {
    switch (sortBy) {
      case 'alphabetical':
        return sortDirection === 'asc' ? 'A-Z' : 'Z-A';
      case 'difficulty':
        return sortDirection === 'asc' ? 'Easy to Hard' : 'Hard to Easy';
      case 'popularity':
        return sortDirection === 'asc' ? 'Least Popular' : 'Most Popular';
      case 'fretPosition':
        return sortDirection === 'asc' ? 'Low to High' : 'High to Low';
      case 'relevance':
      default:
        return sortDirection === 'asc' ? 'Least Relevant' : 'Most Relevant';
    }
  };

  return (
    <div className="sort-controls" role="region" aria-label="Sort options">
      <div className="sort-by">
        <label htmlFor="sort-select">Sort by:</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => handleSortByChange(e.target.value as SortOption)}
          aria-label="Sort results by"
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="sort-direction"
        onClick={handleDirectionToggle}
        aria-label={`Sort direction: ${getDirectionLabel()}`}
        title={getDirectionLabel()}
      >
        {getDirectionIcon()}
      </button>
    </div>
  );
};

export default SortControls;