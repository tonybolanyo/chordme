/**
 * Tuning Selector Component
 * 
 * This component provides a user interface for selecting and managing
 * alternative guitar tunings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { tuningService } from '../../services/tuningService';
import { TuningInfo, TuningSuggestion } from '../../types/tuning';
import { InstrumentType } from '../../types/chordDiagram';
import './TuningSelector.css';

interface TuningSelectorProps {
  /** Current instrument type */
  instrument: InstrumentType;
  /** Currently selected tuning */
  currentTuning?: TuningInfo;
  /** Callback when tuning is changed */
  onTuningChange: (tuning: TuningInfo) => void;
  /** Whether to show tuning suggestions */
  showSuggestions?: boolean;
  /** Music genre for suggestions */
  genre?: string;
  /** User's preferred difficulty level */
  preferredDifficulty?: 'easy' | 'medium' | 'hard';
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
}

export const TuningSelector: React.FC<TuningSelectorProps> = ({
  instrument = 'guitar',
  currentTuning,
  onTuningChange,
  showSuggestions = true,
  genre,
  preferredDifficulty,
  disabled = false,
  className = ''
}) => {
  const [availableTunings, setAvailableTunings] = useState<TuningInfo[]>([]);
  const [suggestions, setSuggestions] = useState<TuningSuggestion[]>([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Load available tunings
  useEffect(() => {
    const loadTunings = async () => {
      setLoading(true);
      try {
        const tunings = tuningService.getAllTunings(instrument);
        setAvailableTunings(tunings);
        
        if (showSuggestions) {
          const tuninSuggestions = tuningService.suggestTunings({
            genre,
            preferredDifficulty,
            currentTuning,
            instrument
          });
          setSuggestions(tuninSuggestions);
        }
      } catch (error) {
        console.error('Failed to load tunings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTunings();
  }, [instrument, currentTuning, genre, preferredDifficulty, showSuggestions]);

  // Filter tunings based on search term
  const filteredTunings = availableTunings.filter(tuning =>
    tuning.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tuning.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tuning.genres.some(g => g.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTuningSelect = useCallback((tuning: TuningInfo) => {
    onTuningChange(tuning);
  }, [onTuningChange]);

  const handleCreateCustomTuning = () => {
    setIsCreatingCustom(true);
  };

  if (loading) {
    return (
      <div className={`tuning-selector loading ${className}`}>
        <div className="loading-spinner">Loading tunings...</div>
      </div>
    );
  }

  return (
    <div className={`tuning-selector ${className}`}>
      {/* Current Tuning Display */}
      {currentTuning && (
        <div className="current-tuning">
          <h3>Current Tuning</h3>
          <TuningDisplay tuning={currentTuning} />
        </div>
      )}

      {/* Search and Filter */}
      <div className="tuning-search">
        <input
          type="text"
          placeholder="Search tunings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="search-input"
        />
      </div>

      {/* Suggestions Section */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="tuning-suggestions">
          <h4>Suggested Tunings</h4>
          <div className="suggestions-list">
            {suggestions.slice(0, 3).map((suggestion, _index) => (
              <TuningSuggestionCard
                key={suggestion.tuning.id}
                suggestion={suggestion}
                onSelect={() => handleTuningSelect(suggestion.tuning)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Tunings */}
      <div className="available-tunings">
        <h4>All Tunings</h4>
        <div className="tunings-grid">
          {filteredTunings.map(tuning => (
            <TuningCard
              key={tuning.id}
              tuning={tuning}
              isSelected={currentTuning?.id === tuning.id}
              onSelect={() => handleTuningSelect(tuning)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Custom Tuning Button */}
      <div className="custom-tuning-section">
        <button
          onClick={handleCreateCustomTuning}
          disabled={disabled}
          className="create-custom-button"
        >
          Create Custom Tuning
        </button>
      </div>

      {/* Custom Tuning Modal */}
      {isCreatingCustom && (
        <CustomTuningModal
          instrument={instrument}
          onSave={(tuning) => {
            setIsCreatingCustom(false);
            handleTuningSelect(tuning);
          }}
          onCancel={() => setIsCreatingCustom(false)}
        />
      )}
    </div>
  );
};

// Individual tuning display component
interface TuningDisplayProps {
  tuning: TuningInfo;
  showDetails?: boolean;
}

const TuningDisplay: React.FC<TuningDisplayProps> = ({ 
  tuning, 
  showDetails = true 
}) => (
  <div className="tuning-display">
    <div className="tuning-header">
      <span className="tuning-name">{tuning.name}</span>
      {!tuning.isStandard && (
        <span className="alternative-badge">ALT</span>
      )}
    </div>
    
    <div className="tuning-notes">
      {tuning.notes.map((note, index) => (
        <span key={index} className="note">
          {note}
        </span>
      ))}
    </div>
    
    {showDetails && (
      <div className="tuning-details">
        <span className="difficulty">{tuning.difficulty}</span>
        <span className="genres">{tuning.genres.slice(0, 2).join(', ')}</span>
      </div>
    )}
  </div>
);

// Tuning card component
interface TuningCardProps {
  tuning: TuningInfo;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

const TuningCard: React.FC<TuningCardProps> = ({
  tuning,
  isSelected,
  onSelect,
  disabled
}) => (
  <div
    className={`tuning-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
    onClick={disabled ? undefined : onSelect}
    role="button"
    tabIndex={disabled ? -1 : 0}
    onKeyPress={(e) => {
      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
        onSelect();
      }
    }}
  >
    <TuningDisplay tuning={tuning} />
    
    {tuning.artists && tuning.artists.length > 0 && (
      <div className="tuning-artists">
        <small>Used by: {tuning.artists.slice(0, 2).join(', ')}</small>
      </div>
    )}
  </div>
);

// Tuning suggestion card component
interface TuningSuggestionCardProps {
  suggestion: TuningSuggestion;
  onSelect: () => void;
  disabled: boolean;
}

const TuningSuggestionCard: React.FC<TuningSuggestionCardProps> = ({
  suggestion,
  onSelect,
  disabled
}) => (
  <div className={`suggestion-card ${disabled ? 'disabled' : ''}`}>
    <TuningDisplay tuning={suggestion.tuning} showDetails={false} />
    
    <div className="suggestion-info">
      <div className="suggestion-reason">{suggestion.reason}</div>
      <div className="confidence-score">
        Confidence: {suggestion.confidence}%
      </div>
      
      {suggestion.benefits.length > 0 && (
        <div className="benefits">
          <strong>Benefits:</strong>
          <ul>
            {suggestion.benefits.slice(0, 2).map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
    
    <button
      onClick={onSelect}
      disabled={disabled}
      className="select-suggestion-button"
    >
      Try This Tuning
    </button>
  </div>
);

// Custom tuning creation modal
interface CustomTuningModalProps {
  instrument: InstrumentType;
  onSave: (tuning: TuningInfo) => void;
  onCancel: () => void;
}

const CustomTuningModal: React.FC<CustomTuningModalProps> = ({
  instrument,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [genres, setGenres] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Initialize notes array based on instrument
    const standardTuning = tuningService.getStandardTuning(instrument);
    setNotes([...standardTuning.notes]);
  }, [instrument]);

  const handleSave = () => {
    const validationErrors: string[] = [];
    
    if (!name.trim()) {
      validationErrors.push('Tuning name is required');
    }
    
    if (!description.trim()) {
      validationErrors.push('Description is required');
    }
    
    if (notes.some(note => !note.trim())) {
      validationErrors.push('All string notes must be specified');
    }
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const customTuning = tuningService.createCustomTuning(
        name.trim(),
        description.trim(),
        notes,
        instrument,
        {
          genres: genres.filter(g => g.trim()),
          difficulty
        }
      );
      
      onSave(customTuning);
    } catch (_error) {
      setErrors(['Failed to create custom tuning']);
    }
  };

  return (
    <div className="custom-tuning-modal-overlay">
      <div className="custom-tuning-modal">
        <h3>Create Custom Tuning</h3>
        
        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <div key={index} className="error-message">{error}</div>
            ))}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="tuning-name">Tuning Name</label>
          <input
            id="tuning-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Custom Tuning"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tuning-description">Description</label>
          <textarea
            id="tuning-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe when and how to use this tuning"
          />
        </div>
        
        <div className="form-group">
          <label>String Notes (from lowest to highest)</label>
          <div className="string-notes">
            {notes.map((note, index) => (
              <input
                key={index}
                type="text"
                value={note}
                onChange={(e) => {
                  const newNotes = [...notes];
                  newNotes[index] = e.target.value;
                  setNotes(newNotes);
                }}
                placeholder={`String ${index + 1}`}
                className="note-input"
              />
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="tuning-difficulty">Difficulty</label>
          <select
            id="tuning-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="tuning-genres">Genres (comma-separated)</label>
          <input
            id="tuning-genres"
            type="text"
            value={genres.join(', ')}
            onChange={(e) => setGenres(e.target.value.split(',').map(g => g.trim()))}
            placeholder="e.g., rock, metal, blues"
          />
        </div>
        
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button onClick={handleSave} className="save-button">
            Create Tuning
          </button>
        </div>
      </div>
    </div>
  );
};

export default TuningSelector;