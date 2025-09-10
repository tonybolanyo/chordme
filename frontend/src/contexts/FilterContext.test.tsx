/**
 * FilterContext Tests
 * 
 * Tests for the advanced filter state management context.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterProvider, useFilterContext } from '../FilterContext';
import { songSearchService } from '../../services/songSearchService';

// Mock the search service
jest.mock('../../services/songSearchService', () => ({
  songSearchService: {
    getFilterPresets: jest.fn(),
    createFilterPreset: jest.fn(),
    searchSongs: jest.fn(),
  }
}));

const mockSearchService = songSearchService as jest.Mocked<typeof songSearchService>;

// Test component that uses the filter context
function TestComponent() {
  const {
    state,
    setFilter,
    clearFilters,
    setCombineMode,
    hasActiveFilters,
    getFilterSummary,
    canSaveAsPreset,
    search
  } = useFilterContext();

  return (
    <div>
      <div data-testid="current-filters">{JSON.stringify(state.currentFilters)}</div>
      <div data-testid="combine-mode">{state.combineMode}</div>
      <div data-testid="has-active-filters">{hasActiveFilters().toString()}</div>
      <div data-testid="can-save-preset">{canSaveAsPreset().toString()}</div>
      <div data-testid="filter-summary">{getFilterSummary()}</div>
      <div data-testid="loading">{state.isLoading.toString()}</div>
      <div data-testid="error">{state.error || 'none'}</div>
      
      <button onClick={() => setFilter('genre', 'Rock')}>Set Rock Genre</button>
      <button onClick={() => setFilter('difficulty', 'beginner')}>Set Beginner</button>
      <button onClick={() => setFilter('q', 'test search')}>Set Search Query</button>
      <button onClick={() => setCombineMode('OR')}>Set OR Mode</button>
      <button onClick={clearFilters}>Clear Filters</button>
      <button onClick={search}>Search</button>
    </div>
  );
}

function renderWithProvider(component: React.ReactElement) {
  return render(
    <FilterProvider>
      {component}
    </FilterProvider>
  );
}

describe('FilterContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchService.getFilterPresets.mockResolvedValue([]);
    mockSearchService.searchSongs.mockResolvedValue({
      results: [],
      total_count: 0,
      search_time_ms: 100,
      query_info: {
        original_query: '',
        parsed_query: {
          original: '',
          phrases: [],
          and_terms: [],
          or_terms: [],
          not_terms: [],
          has_operators: false
        },
        filters_applied: {}
      }
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      renderWithProvider(<TestComponent />);
      
      expect(screen.getByTestId('combine-mode')).toHaveTextContent('AND');
      expect(screen.getByTestId('has-active-filters')).toHaveTextContent('false');
      expect(screen.getByTestId('can-save-preset')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
    });

    it('should load filter presets on mount', async () => {
      renderWithProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(mockSearchService.getFilterPresets).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Filter Management', () => {
    it('should set individual filters', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      await user.click(screen.getByText('Set Rock Genre'));
      
      const currentFilters = JSON.parse(screen.getByTestId('current-filters').textContent!);
      expect(currentFilters.genre).toBe('Rock');
      expect(screen.getByTestId('has-active-filters')).toHaveTextContent('true');
    });

    it('should combine multiple filters', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      await user.click(screen.getByText('Set Rock Genre'));
      await user.click(screen.getByText('Set Beginner'));
      
      const currentFilters = JSON.parse(screen.getByTestId('current-filters').textContent!);
      expect(currentFilters.genre).toBe('Rock');
      expect(currentFilters.difficulty).toBe('beginner');
      expect(screen.getByTestId('has-active-filters')).toHaveTextContent('true');
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      // Set some filters first
      await user.click(screen.getByText('Set Rock Genre'));
      await user.click(screen.getByText('Set Beginner'));
      
      expect(screen.getByTestId('has-active-filters')).toHaveTextContent('true');
      
      // Clear filters
      await user.click(screen.getByText('Clear Filters'));
      
      expect(screen.getByTestId('has-active-filters')).toHaveTextContent('false');
      const currentFilters = JSON.parse(screen.getByTestId('current-filters').textContent!);
      expect(currentFilters.genre).toBeUndefined();
      expect(currentFilters.difficulty).toBeUndefined();
    });

    it('should change combine mode', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      expect(screen.getByTestId('combine-mode')).toHaveTextContent('AND');
      
      await user.click(screen.getByText('Set OR Mode'));
      
      expect(screen.getByTestId('combine-mode')).toHaveTextContent('OR');
      const currentFilters = JSON.parse(screen.getByTestId('current-filters').textContent!);
      expect(currentFilters.combineMode).toBe('OR');
    });
  });

  describe('Filter Summary', () => {
    it('should generate correct filter summary for single filter', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      await user.click(screen.getByText('Set Rock Genre'));
      
      expect(screen.getByTestId('filter-summary')).toHaveTextContent('Genre: Rock');
    });

    it('should generate correct filter summary for multiple filters', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      await user.click(screen.getByText('Set Rock Genre'));
      await user.click(screen.getByText('Set Beginner'));
      await user.click(screen.getByText('Set Search Query'));
      
      const summary = screen.getByTestId('filter-summary').textContent!;
      expect(summary).toContain('"test search"');
      expect(summary).toContain('Genre: Rock');
      expect(summary).toContain('Difficulty: beginner');
    });

    it('should show no filters message when no filters active', () => {
      renderWithProvider(<TestComponent />);
      
      expect(screen.getByTestId('filter-summary')).toHaveTextContent('No filters applied');
    });
  });

  describe('Preset Management', () => {
    it('should indicate when filters can be saved as preset', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      expect(screen.getByTestId('can-save-preset')).toHaveTextContent('false');
      
      await user.click(screen.getByText('Set Rock Genre'));
      
      expect(screen.getByTestId('can-save-preset')).toHaveTextContent('true');
    });
  });

  describe('Search Functionality', () => {
    it('should perform search with current filters', async () => {
      const user = userEvent.setup();
      renderWithProvider(<TestComponent />);
      
      await user.click(screen.getByText('Set Rock Genre'));
      await user.click(screen.getByText('Search'));
      
      await waitFor(() => {
        expect(mockSearchService.searchSongs).toHaveBeenCalledWith(
          expect.objectContaining({
            genre: 'Rock'
          })
        );
      });
    });

    it('should handle search loading state', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed search response
      mockSearchService.searchSongs.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_info: {
            original_query: '',
            parsed_query: {
              original: '',
              phrases: [],
              and_terms: [],
              or_terms: [],
              not_terms: [],
              has_operators: false
            },
            filters_applied: {}
          }
        }), 100))
      );
      
      renderWithProvider(<TestComponent />);
      
      await user.click(screen.getByText('Search'));
      
      // Should show loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      
      // Wait for search to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should handle search errors', async () => {
      const user = userEvent.setup();
      
      mockSearchService.searchSongs.mockRejectedValue(new Error('Search failed'));
      
      renderWithProvider(<TestComponent />);
      
      await user.click(screen.getByText('Search'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Search failed');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle filter preset loading errors', async () => {
      mockSearchService.getFilterPresets.mockRejectedValue(new Error('Failed to load presets'));
      
      renderWithProvider(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to load presets');
      });
    });
  });
});

describe('FilterContext Error Cases', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useFilterContext must be used within a FilterProvider');
    
    consoleSpy.mockRestore();
  });
});