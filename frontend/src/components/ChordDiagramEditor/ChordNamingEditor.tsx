/**
 * Chord Naming Editor Component
 * 
 * Allows users to edit chord names with suggestions and validation.
 */

import React, { useState, useRef, useEffect } from 'react';
import './ChordNamingEditor.css';

interface ChordNamingEditorProps {
  name: string;
  onNameChange: (name: string) => void;
  suggestions?: string[];
}

export const ChordNamingEditor: React.FC<ChordNamingEditorProps> = ({
  name,
  onNameChange,
  suggestions = []
}) => {
  const [inputValue, setInputValue] = useState(name);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(name);
  }, [name]);

  useEffect(() => {
    if (inputValue && suggestions.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 150);
    onNameChange(inputValue);
  };

  const handleInputFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onNameChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="chord-naming-editor">
      <label htmlFor="chord-name-input" className="chord-name-label">
        Chord Name
      </label>
      <div className="input-container">
        <input
          ref={inputRef}
          id="chord-name-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="chord-name-input"
          placeholder="Enter chord name (e.g., C, Am7, F#dim)"
          maxLength={20}
        />
        
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="suggestions-dropdown">
            <div className="suggestions-header">Suggestions</div>
            {filteredSuggestions.slice(0, 8).map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="naming-tips">
        <p className="tip-text">
          💡 Use standard notation: C, Dm, F#7, Bbmaj7, etc.
        </p>
      </div>
    </div>
  );
};

export default ChordNamingEditor;