/**
 * AdvancedFilterPanel Component
 * 
 * Comprehensive filtering interface for songs with:
 * - Multiple filter criteria (genre, key, difficulty, tempo, time signature)
 * - Date range filtering
 * - AND/OR logic combination
 * - Filter preset management
 * - Real-time search result updates
 */

import React, { useState, useEffect } from 'react';
import { useFilterContext } from '../../contexts/FilterContext';
import { SearchQuery, SearchResult } from '../../services/songSearchService';
import './AdvancedFilterPanel.css';

interface AdvancedFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (results: SearchResult[]) => void;
}

// Predefined options for dropdowns
const GENRE_OPTIONS = [
  'Rock', 'Pop', 'Folk', 'Country', 'Blues', 'Jazz', 'Classical', 
  'Gospel', 'Worship', 'Christmas', 'Hymns', 'Alternative', 'Indie'
];

const KEY_OPTIONS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Am', 'A#m', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
];

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];

const TIME_SIGNATURE_OPTIONS = [
  '4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '5/4', '7/8'
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' }
];

export default function AdvancedFilterPanel({ isOpen, onClose, onSearch }: AdvancedFilterPanelProps): JSX.Element | null {
  const {
    state,
    setFilter,
    clearFilters,
    setCombineMode,
    search,
    hasActiveFilters,
    getFilterSummary,
    canSaveAsPreset,
    createPreset,
    loadPreset,
    clearActivePreset
  } = useFilterContext();

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetIsPublic, setPresetIsPublic] = useState(false);

  // Local state for form inputs to avoid excessive re-renders
  const [localFilters, setLocalFilters] = useState<SearchQuery>(state.currentFilters);

  // Update local filters when context state changes
  useEffect(() => {
    setLocalFilters(state.currentFilters);
  }, [state.currentFilters]);

  // Handle input changes
  const handleFilterChange = (key: keyof SearchQuery, value: string | number | boolean | string[]) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    setFilter(key, value);
  };

  // Handle array inputs (tags, categories)
  const handleArrayInput = (key: 'tags' | 'categories', value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    handleFilterChange(key, arrayValue.length > 0 ? arrayValue : undefined);
  };

  // Handle date inputs
  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    handleFilterChange(key, value || undefined);
  };

  // Handle search execution
  const handleSearch = async () => {
    try {
      const results = await search();
      if (onSearch) {
        onSearch(results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Handle preset creation
  const handleCreatePreset = async () => {
    if (!presetName.trim()) return;

    try {
      await createPreset(presetName.trim(), presetDescription.trim() || undefined, presetIsPublic);
      setShowPresetModal(false);
      setPresetName('');
      setPresetDescription('');
      setPresetIsPublic(false);
    } catch (error) {
      console.error('Failed to create preset:', error);
    }
  };

  // Handle preset loading
  const handleLoadPreset = (presetId: number) => {
    const preset = state.availablePresets.find(p => p.id === presetId);
    if (preset) {
      loadPreset(preset);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="advanced-filter-panel">
      <div className="advanced-filter-backdrop" onClick={onClose} />
      <div className="advanced-filter-content">
        <div className="advanced-filter-header">
          <h2>Advanced Filters</h2>
          <button className="close-button" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="advanced-filter-body">
          {/* Filter Preset Section */}
          <div className="filter-section">
            <h3>Filter Presets</h3>
            <div className="preset-controls">
              <select 
                value={state.activePreset?.id || ''} 
                onChange={(e) => e.target.value ? handleLoadPreset(Number(e.target.value)) : clearActivePreset()}
                className="preset-select"
              >
                <option value="">Select a preset...</option>
                {state.availablePresets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} {preset.is_public ? '(Public)' : ''}
                  </option>
                ))}
              </select>
              
              {canSaveAsPreset() && (
                <button 
                  className="create-preset-btn"
                  onClick={() => setShowPresetModal(true)}
                >
                  Save as Preset
                </button>
              )}
            </div>
            
            {state.activePreset && (
              <div className="active-preset-info">
                <span className="preset-badge">Using preset: {state.activePreset.name}</span>
                {state.activePreset.description && (
                  <p className="preset-description">{state.activePreset.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Search Query */}
          <div className="filter-section">
            <h3>Search Query</h3>
            <input
              type="text"
              placeholder="Search songs, artists, lyrics..."
              value={localFilters.q || ''}
              onChange={(e) => handleFilterChange('q', e.target.value || undefined)}
              className="search-input"
            />
            <div className="search-tips">
              <small>
                Use quotes for exact phrases, AND/OR for combinations, NOT to exclude terms
              </small>
            </div>
          </div>

          {/* Basic Filters */}
          <div className="filter-section">
            <h3>Basic Filters</h3>
            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="genre-filter">Genre:</label>
                <select
                  id="genre-filter"
                  value={localFilters.genre || ''}
                  onChange={(e) => handleFilterChange('genre', e.target.value || undefined)}
                >
                  <option value="">Any Genre</option>
                  {GENRE_OPTIONS.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="key-filter">Key:</label>
                <select
                  id="key-filter"
                  value={localFilters.key || ''}
                  onChange={(e) => handleFilterChange('key', e.target.value || undefined)}
                >
                  <option value="">Any Key</option>
                  {KEY_OPTIONS.map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="difficulty-filter">Difficulty:</label>
                <select
                  id="difficulty-filter"
                  value={localFilters.difficulty || ''}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
                >
                  <option value="">Any Difficulty</option>
                  {DIFFICULTY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="time-signature-filter">Time Signature:</label>
                <select
                  id="time-signature-filter"
                  value={localFilters.timeSignature || ''}
                  onChange={(e) => handleFilterChange('timeSignature', e.target.value || undefined)}
                >
                  <option value="">Any Time Signature</option>
                  {TIME_SIGNATURE_OPTIONS.map(sig => (
                    <option key={sig} value={sig}>{sig}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="language-filter">Language:</label>
                <select
                  id="language-filter"
                  value={localFilters.language || 'en'}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                >
                  {LANGUAGE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tempo Range */}
          <div className="filter-section">
            <h3>Tempo Range (BPM)</h3>
            <div className="tempo-range">
              <div className="tempo-input">
                <label htmlFor="min-tempo">Min:</label>
                <input
                  id="min-tempo"
                  type="number"
                  min="40"
                  max="300"
                  placeholder="40"
                  value={localFilters.minTempo || ''}
                  onChange={(e) => handleFilterChange('minTempo', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div className="tempo-input">
                <label htmlFor="max-tempo">Max:</label>
                <input
                  id="max-tempo"
                  type="number"
                  min="40"
                  max="300"
                  placeholder="300"
                  value={localFilters.maxTempo || ''}
                  onChange={(e) => handleFilterChange('maxTempo', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
          </div>

          {/* Tags and Categories */}
          <div className="filter-section">
            <h3>Tags and Categories</h3>
            <div className="tag-category-grid">
              <div className="filter-group">
                <label htmlFor="tags-filter">Tags (comma-separated):</label>
                <input
                  id="tags-filter"
                  type="text"
                  placeholder="worship, acoustic, fingerpicking"
                  value={localFilters.tags?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('tags', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="categories-filter">Categories (comma-separated):</label>
                <input
                  id="categories-filter"
                  type="text"
                  placeholder="hymns, contemporary, traditional"
                  value={localFilters.categories?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('categories', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="filter-section">
            <h3>Date Range</h3>
            <div className="date-filter-grid">
              <div className="filter-group">
                <label htmlFor="date-field">Date Field:</label>
                <select
                  id="date-field"
                  value={localFilters.dateField || 'created_at'}
                  onChange={(e) => handleFilterChange('dateField', e.target.value)}
                >
                  <option value="created_at">Date Created</option>
                  <option value="updated_at">Date Modified</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="date-from">From:</label>
                <input
                  id="date-from"
                  type="date"
                  value={localFilters.dateFrom?.split('T')[0] || ''}
                  onChange={(e) => handleDateChange('dateFrom', e.target.value ? `${e.target.value}T00:00:00Z` : '')}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="date-to">To:</label>
                <input
                  id="date-to"
                  type="date"
                  value={localFilters.dateTo?.split('T')[0] || ''}
                  onChange={(e) => handleDateChange('dateTo', e.target.value ? `${e.target.value}T23:59:59Z` : '')}
                />
              </div>
            </div>
          </div>

          {/* Filter Combination Logic */}
          <div className="filter-section">
            <h3>Filter Logic</h3>
            <div className="combine-mode">
              <label>
                <input
                  type="radio"
                  name="combineMode"
                  value="AND"
                  checked={state.combineMode === 'AND'}
                  onChange={() => setCombineMode('AND')}
                />
                AND (all filters must match)
              </label>
              <label>
                <input
                  type="radio"
                  name="combineMode"
                  value="OR"
                  checked={state.combineMode === 'OR'}
                  onChange={() => setCombineMode('OR')}
                />
                OR (any filter can match)
              </label>
            </div>
          </div>

          {/* Additional Options */}
          <div className="filter-section">
            <h3>Options</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={localFilters.includePublic ?? true}
                onChange={(e) => handleFilterChange('includePublic', e.target.checked)}
              />
              Include public songs
            </label>
          </div>

          {/* Filter Summary */}
          {hasActiveFilters() && (
            <div className="filter-summary">
              <h4>Active Filters:</h4>
              <p>{getFilterSummary()}</p>
            </div>
          )}
        </div>

        <div className="advanced-filter-footer">
          <div className="filter-actions">
            <button 
              className="clear-filters-btn" 
              onClick={clearFilters}
              disabled={!hasActiveFilters()}
            >
              Clear All Filters
            </button>
            
            <button 
              className="search-btn primary" 
              onClick={handleSearch}
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Searching...' : 'Search Songs'}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Creation Modal */}
      {showPresetModal && (
        <div className="preset-modal">
          <div className="preset-modal-backdrop" onClick={() => setShowPresetModal(false)} />
          <div className="preset-modal-content">
            <h3>Save Filter Preset</h3>
            
            <div className="preset-form">
              <div className="form-group">
                <label htmlFor="preset-name">Preset Name:</label>
                <input
                  id="preset-name"
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="preset-description">Description (optional):</label>
                <textarea
                  id="preset-description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Describe what this preset filters for..."
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={presetIsPublic}
                    onChange={(e) => setPresetIsPublic(e.target.checked)}
                  />
                  Make this preset public (visible to all users)
                </label>
              </div>
            </div>

            <div className="preset-modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowPresetModal(false)}
              >
                Cancel
              </button>
              <button 
                className="save-btn primary" 
                onClick={handleCreatePreset}
                disabled={!presetName.trim() || state.isLoading}
              >
                {state.isLoading ? 'Saving...' : 'Save Preset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="filter-error">
          <p>Error: {state.error}</p>
        </div>
      )}
    </div>
  );
}