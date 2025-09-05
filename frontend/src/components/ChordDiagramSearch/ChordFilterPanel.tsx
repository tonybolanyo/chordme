/**
 * ChordFilterPanel Component
 * 
 * Advanced filtering controls for chord diagram search.
 */

import React from 'react';
import {
  ChordDiagramSearchCriteria,
  InstrumentType,
  DifficultyLevel,
  ChordType,
  FretRange
} from '../../types/chordDiagram';

interface ChordFilterPanelProps {
  criteria: ChordDiagramSearchCriteria;
  onChange: (criteria: Partial<ChordDiagramSearchCriteria>) => void;
}

const INSTRUMENT_OPTIONS: { value: InstrumentType; label: string }[] = [
  { value: 'guitar', label: 'Guitar' },
  { value: 'ukulele', label: 'Ukulele' },
  { value: 'mandolin', label: 'Mandolin' }
];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];

const CHORD_TYPE_OPTIONS: { value: ChordType; label: string }[] = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: '7th', label: 'Dominant 7th' },
  { value: 'maj7', label: 'Major 7th' },
  { value: 'min7', label: 'Minor 7th' },
  { value: 'sus2', label: 'Sus2' },
  { value: 'sus4', label: 'Sus4' },
  { value: 'dim', label: 'Diminished' },
  { value: 'aug', label: 'Augmented' },
  { value: '9th', label: '9th' },
  { value: '11th', label: '11th' },
  { value: '13th', label: '13th' },
  { value: 'add9', label: 'Add9' },
  { value: 'power', label: 'Power Chord' }
];

const FRET_RANGE_OPTIONS: { value: FretRange; label: string }[] = [
  { value: 'open', label: 'Open Position (0-3 frets)' },
  { value: 'barre', label: 'Barre Chords' },
  { value: 'high', label: 'High Position (5+ frets)' },
  { value: 'custom', label: 'Custom Range' }
];

const ChordFilterPanel: React.FC<ChordFilterPanelProps> = ({ criteria, onChange }) => {
  const handleInstrumentChange = (instrument: InstrumentType | '') => {
    onChange({ instrument: instrument || undefined });
  };

  const handleDifficultyChange = (difficulty: DifficultyLevel, checked: boolean) => {
    const currentDifficulties = criteria.difficulty || [];
    const newDifficulties = checked
      ? [...currentDifficulties, difficulty]
      : currentDifficulties.filter(d => d !== difficulty);
    
    onChange({ difficulty: newDifficulties.length > 0 ? newDifficulties : undefined });
  };

  const handleChordTypeChange = (chordType: ChordType, checked: boolean) => {
    const currentTypes = criteria.chordType || [];
    const newTypes = checked
      ? [...currentTypes, chordType]
      : currentTypes.filter(t => t !== chordType);
    
    onChange({ chordType: newTypes.length > 0 ? newTypes : undefined });
  };

  const handleFretRangeChange = (fretRange: FretRange | '') => {
    onChange({ fretRange: fretRange || undefined });
  };

  const handleFretLimitChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    if (type === 'min') {
      onChange({ minFret: numValue });
    } else {
      onChange({ maxFret: numValue });
    }
  };

  const handleBarreChange = (includeBarre: boolean | null) => {
    onChange({ includeBarre });
  };

  const handleFuzzySearchChange = (fuzzySearch: boolean) => {
    onChange({ fuzzySearch });
  };

  const handlePopularityChange = (value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onChange({ minPopularity: numValue });
  };

  return (
    <div className="chord-filter-panel" role="region" aria-label="Search filters">
      <div className="filter-grid">
        {/* Instrument Filter */}
        <div className="filter-group">
          <label htmlFor="instrument-filter">Instrument:</label>
          <select
            id="instrument-filter"
            value={criteria.instrument || ''}
            onChange={(e) => handleInstrumentChange(e.target.value as InstrumentType)}
          >
            <option value="">All Instruments</option>
            {INSTRUMENT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="filter-group">
          <fieldset>
            <legend>Difficulty Level:</legend>
            {DIFFICULTY_OPTIONS.map(option => (
              <label key={option.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={criteria.difficulty?.includes(option.value) || false}
                  onChange={(e) => handleDifficultyChange(option.value, e.target.checked)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        </div>

        {/* Chord Type Filter */}
        <div className="filter-group">
          <fieldset>
            <legend>Chord Type:</legend>
            <div className="chord-type-grid">
              {CHORD_TYPE_OPTIONS.map(option => (
                <label key={option.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={criteria.chordType?.includes(option.value) || false}
                    onChange={(e) => handleChordTypeChange(option.value, e.target.checked)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Fret Range Filter */}
        <div className="filter-group">
          <label htmlFor="fret-range-filter">Fret Range:</label>
          <select
            id="fret-range-filter"
            value={criteria.fretRange || ''}
            onChange={(e) => handleFretRangeChange(e.target.value as FretRange)}
          >
            <option value="">Any Range</option>
            {FRET_RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Fret Limits */}
        <div className="filter-group">
          <div className="fret-limits">
            <div className="fret-limit">
              <label htmlFor="min-fret">Min Fret:</label>
              <input
                id="min-fret"
                type="number"
                min="0"
                max="24"
                value={criteria.minFret ?? ''}
                onChange={(e) => handleFretLimitChange('min', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="fret-limit">
              <label htmlFor="max-fret">Max Fret:</label>
              <input
                id="max-fret"
                type="number"
                min="0"
                max="24"
                value={criteria.maxFret ?? ''}
                onChange={(e) => handleFretLimitChange('max', e.target.value)}
                placeholder="24"
              />
            </div>
          </div>
        </div>

        {/* Barre Chords Filter */}
        <div className="filter-group">
          <fieldset>
            <legend>Barre Chords:</legend>
            <label className="radio-label">
              <input
                type="radio"
                name="barre-filter"
                checked={criteria.includeBarre === undefined}
                onChange={() => handleBarreChange(undefined)}
              />
              Include All
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="barre-filter"
                checked={criteria.includeBarre === true}
                onChange={() => handleBarreChange(true)}
              />
              Barre Chords Only
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="barre-filter"
                checked={criteria.includeBarre === false}
                onChange={() => handleBarreChange(false)}
              />
              No Barre Chords
            </label>
          </fieldset>
        </div>

        {/* Search Options */}
        <div className="filter-group">
          <div className="search-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={criteria.fuzzySearch ?? true}
                onChange={(e) => handleFuzzySearchChange(e.target.checked)}
              />
              Fuzzy Search (allows typos)
            </label>
          </div>
        </div>

        {/* Popularity Filter */}
        <div className="filter-group">
          <label htmlFor="popularity-filter">Min Popularity:</label>
          <input
            id="popularity-filter"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={criteria.minPopularity ?? 0}
            onChange={(e) => handlePopularityChange(e.target.value)}
          />
          <span className="popularity-value">
            {((criteria.minPopularity ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChordFilterPanel;