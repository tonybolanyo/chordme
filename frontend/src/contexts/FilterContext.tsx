/**
 * Advanced Filter Context
 * 
 * Provides centralized state management for complex filter combinations,
 * filter presets, and real-time filter application.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { SearchQuery, FilterPreset, songSearchService } from '../services/songSearchService';

// Filter state and action types
export interface FilterState {
  currentFilters: SearchQuery;
  isAdvancedMode: boolean;
  combineMode: 'AND' | 'OR';
  activePreset: FilterPreset | null;
  availablePresets: FilterPreset[];
  isLoading: boolean;
  error: string | null;
  lastSearchResults: unknown[];
  searchHistory: SearchQuery[];
}

export type FilterAction =
  | { type: 'SET_FILTER'; payload: { key: keyof SearchQuery; value: any } }
  | { type: 'SET_FILTERS'; payload: SearchQuery }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_ADVANCED_MODE'; payload: boolean }
  | { type: 'SET_COMBINE_MODE'; payload: 'AND' | 'OR' }
  | { type: 'SET_ACTIVE_PRESET'; payload: FilterPreset | null }
  | { type: 'SET_AVAILABLE_PRESETS'; payload: FilterPreset[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_RESULTS'; payload: unknown[] }
  | { type: 'ADD_TO_HISTORY'; payload: SearchQuery }
  | { type: 'CLEAR_HISTORY' };

// Initial state
const initialState: FilterState = {
  currentFilters: {
    includePublic: true,
    language: 'en',
    combineMode: 'AND'
  },
  isAdvancedMode: false,
  combineMode: 'AND',
  activePreset: null,
  availablePresets: [],
  isLoading: false,
  error: null,
  lastSearchResults: [],
  searchHistory: []
};

// Reducer function
function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        currentFilters: {
          ...state.currentFilters,
          [action.payload.key]: action.payload.value
        },
        activePreset: null // Clear active preset when filters change manually
      };

    case 'SET_FILTERS':
      return {
        ...state,
        currentFilters: { ...action.payload },
        activePreset: null
      };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        currentFilters: {
          includePublic: true,
          language: 'en',
          combineMode: state.combineMode
        },
        activePreset: null
      };

    case 'SET_ADVANCED_MODE':
      return {
        ...state,
        isAdvancedMode: action.payload
      };

    case 'SET_COMBINE_MODE':
      return {
        ...state,
        combineMode: action.payload,
        currentFilters: {
          ...state.currentFilters,
          combineMode: action.payload
        }
      };

    case 'SET_ACTIVE_PRESET':
      return {
        ...state,
        activePreset: action.payload,
        currentFilters: action.payload?.filter_config || state.currentFilters
      };

    case 'SET_AVAILABLE_PRESETS':
      return {
        ...state,
        availablePresets: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        lastSearchResults: action.payload,
        isLoading: false,
        error: null
      };

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        searchHistory: [
          action.payload,
          ...state.searchHistory.filter(h => JSON.stringify(h) !== JSON.stringify(action.payload))
        ].slice(0, 10) // Keep last 10 searches
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        searchHistory: []
      };

    default:
      return state;
  }
}

// Context definition
interface FilterContextType {
  state: FilterState;
  
  // Filter actions
  setFilter: (key: keyof SearchQuery, value: unknown) => void;
  setFilters: (filters: SearchQuery) => void;
  clearFilters: () => void;
  toggleAdvancedMode: () => void;
  setCombineMode: (mode: 'AND' | 'OR') => void;
  
  // Preset actions
  loadPreset: (preset: FilterPreset) => void;
  clearActivePreset: () => void;
  refreshPresets: () => Promise<void>;
  createPreset: (name: string, description?: string, isPublic?: boolean) => Promise<FilterPreset>;
  updatePreset: (presetId: number, updates: Partial<FilterPreset>) => Promise<void>;
  deletePreset: (presetId: number) => Promise<void>;
  sharePreset: (presetId: number, userEmail: string) => Promise<void>;
  
  // Search actions
  search: () => Promise<any[]>;
  searchWithFilters: (filters: SearchQuery) => Promise<any[]>;
  
  // Utility functions
  hasActiveFilters: () => boolean;
  getFilterSummary: () => string;
  canSaveAsPreset: () => boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Custom hook to use filter context
export function useFilterContext(): FilterContextType {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
}

// Filter provider component
interface FilterProviderProps {
  children: React.ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  // Load available presets on mount
  useEffect(() => {
    refreshPresets();
  }, []);

  // Filter actions
  const setFilter = useCallback((key: keyof SearchQuery, value: unknown) => {
    dispatch({ type: 'SET_FILTER', payload: { key, value } });
  }, []);

  const setFilters = useCallback((filters: SearchQuery) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const toggleAdvancedMode = useCallback(() => {
    dispatch({ type: 'SET_ADVANCED_MODE', payload: !state.isAdvancedMode });
  }, [state.isAdvancedMode]);

  const setCombineMode = useCallback((mode: 'AND' | 'OR') => {
    dispatch({ type: 'SET_COMBINE_MODE', payload: mode });
  }, []);

  // Preset actions
  const loadPreset = useCallback((preset: FilterPreset) => {
    dispatch({ type: 'SET_ACTIVE_PRESET', payload: preset });
  }, []);

  const clearActivePreset = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_PRESET', payload: null });
  }, []);

  const refreshPresets = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const presets = await songSearchService.getFilterPresets();
      dispatch({ type: 'SET_AVAILABLE_PRESETS', payload: presets });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load presets' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createPreset = useCallback(async (name: string, description?: string, isPublic: boolean = false): Promise<FilterPreset> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const preset = await songSearchService.createFilterPreset({
        name,
        description,
        filter_config: state.currentFilters,
        is_public: isPublic
      });
      
      // Refresh presets list
      await refreshPresets();
      dispatch({ type: 'SET_ACTIVE_PRESET', payload: preset });
      
      return preset;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create preset' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentFilters, refreshPresets]);

  const updatePreset = useCallback(async (presetId: number, updates: Partial<FilterPreset>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await songSearchService.updateFilterPreset(presetId, updates);
      await refreshPresets();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update preset' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [refreshPresets]);

  const deletePreset = useCallback(async (presetId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await songSearchService.deleteFilterPreset(presetId);
      
      // Clear active preset if it was deleted
      if (state.activePreset?.id === presetId) {
        dispatch({ type: 'SET_ACTIVE_PRESET', payload: null });
      }
      
      await refreshPresets();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete preset' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.activePreset, refreshPresets]);

  const sharePreset = useCallback(async (presetId: number, userEmail: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await songSearchService.shareFilterPreset(presetId, userEmail);
      await refreshPresets();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to share preset' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [refreshPresets]);

  // Search actions
  const search = useCallback(async (): Promise<any[]> => {
    return searchWithFilters(state.currentFilters);
  }, [state.currentFilters]);

  const searchWithFilters = useCallback(async (filters: SearchQuery): Promise<any[]> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await songSearchService.searchSongs(filters);
      const results = response.results || [];
      
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
      dispatch({ type: 'ADD_TO_HISTORY', payload: filters });
      
      return results;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Search failed' });
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Utility functions
  const hasActiveFilters = useCallback((): boolean => {
    const { currentFilters } = state;
    return !!(
      currentFilters.q ||
      currentFilters.genre ||
      currentFilters.key ||
      currentFilters.difficulty ||
      currentFilters.timeSignature ||
      (currentFilters.tags && currentFilters.tags.length > 0) ||
      (currentFilters.categories && currentFilters.categories.length > 0) ||
      currentFilters.minTempo ||
      currentFilters.maxTempo ||
      currentFilters.dateFrom ||
      currentFilters.dateTo
    );
  }, [state.currentFilters]);

  const getFilterSummary = useCallback((): string => {
    const { currentFilters } = state;
    const parts: string[] = [];
    
    if (currentFilters.q) parts.push(`"${currentFilters.q}"`);
    if (currentFilters.genre) parts.push(`Genre: ${currentFilters.genre}`);
    if (currentFilters.key) parts.push(`Key: ${currentFilters.key}`);
    if (currentFilters.difficulty) parts.push(`Difficulty: ${currentFilters.difficulty}`);
    if (currentFilters.timeSignature) parts.push(`Time: ${currentFilters.timeSignature}`);
    if (currentFilters.tags?.length) parts.push(`Tags: ${currentFilters.tags.join(', ')}`);
    if (currentFilters.categories?.length) parts.push(`Categories: ${currentFilters.categories.join(', ')}`);
    if (currentFilters.minTempo || currentFilters.maxTempo) {
      const tempoRange = [currentFilters.minTempo, currentFilters.maxTempo].filter(Boolean).join('-');
      parts.push(`Tempo: ${tempoRange} BPM`);
    }
    if (currentFilters.dateFrom || currentFilters.dateTo) {
      const dateRange = [currentFilters.dateFrom, currentFilters.dateTo].filter(Boolean).join(' to ');
      parts.push(`Date: ${dateRange}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No filters applied';
  }, [state.currentFilters]);

  const canSaveAsPreset = useCallback((): boolean => {
    return hasActiveFilters() && !state.activePreset;
  }, [hasActiveFilters, state.activePreset]);

  const contextValue: FilterContextType = {
    state,
    setFilter,
    setFilters,
    clearFilters,
    toggleAdvancedMode,
    setCombineMode,
    loadPreset,
    clearActivePreset,
    refreshPresets,
    createPreset,
    updatePreset,
    deletePreset,
    sharePreset,
    search,
    searchWithFilters,
    hasActiveFilters,
    getFilterSummary,
    canSaveAsPreset
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}

export default FilterContext;