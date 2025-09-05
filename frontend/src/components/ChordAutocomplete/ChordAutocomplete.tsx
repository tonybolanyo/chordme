import React, { useState, useEffect, useRef } from 'react';
import './ChordAutocomplete.css';
import {
  getChordSuggestions,
  getDirectiveSuggestions,
  getEnhancedChordSuggestions,
  getContextAwareChordSuggestions,
  detectInputContext,
  type ChordSuggestion,
  type DirectiveSuggestion,
} from '../../services/chordService';
import { autocompletionSettingsService } from '../../services/autocompletionSettings';

interface ChordAutocompleteProps {
  inputText: string;
  onSelectChord: (chord: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
  visible: boolean;
  inputType?: 'chord' | 'directive' | 'auto'; // New prop to specify suggestion type
  keySignature?: string; // For context-aware suggestions
  chordProContent?: string; // For extracting context
  cursorPosition?: number; // For auto-detection
}

const ChordAutocomplete: React.FC<ChordAutocompleteProps> = ({
  inputText,
  onSelectChord,
  onClose,
  position,
  visible,
  inputType = 'auto',
  keySignature,
  chordProContent,
  cursorPosition,
}) => {
  const [suggestions, setSuggestions] = useState<(ChordSuggestion | DirectiveSuggestion)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestionType, setSuggestionType] = useState<'chord' | 'directive'>('chord');
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !inputText) {
      setSuggestions([]);
      return;
    }

    const settings = autocompletionSettingsService.getSettings();
    if (!settings.enabled) {
      setSuggestions([]);
      return;
    }

    let currentInputType = inputType;
    
    // Auto-detect input type if needed
    if (inputType === 'auto' && chordProContent && cursorPosition !== undefined) {
      const context = detectInputContext(chordProContent, cursorPosition);
      currentInputType = context.type === 'none' ? 'chord' : context.type;
    }

    let newSuggestions: (ChordSuggestion | DirectiveSuggestion)[] = [];

    if (currentInputType === 'directive' && settings.showDirectives) {
      newSuggestions = getDirectiveSuggestions(inputText, settings.maxSuggestions);
      setSuggestionType('directive');
    } else if (currentInputType === 'chord' && settings.showChords) {
      const customChords = settings.customChords;
      
      if (settings.contextAware && keySignature) {
        // Use context-aware suggestions if key signature is available
        newSuggestions = getContextAwareChordSuggestions(inputText, keySignature, settings.maxSuggestions);
      } else {
        // Use enhanced suggestions with custom chords
        newSuggestions = getEnhancedChordSuggestions(inputText, customChords, settings.maxSuggestions);
      }
      setSuggestionType('chord');
    }

    setSuggestions(newSuggestions);
    setSelectedIndex(0);
  }, [inputText, visible, inputType, keySignature, chordProContent, cursorPosition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            const suggestion = suggestions[selectedIndex];
            const suggestionText = 'chord' in suggestion ? suggestion.chord : suggestion.directive;
            onSelectChord(suggestionText);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, suggestions, selectedIndex, onSelectChord, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={autocompleteRef}
      className="chord-autocomplete"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
    >
      <div className="chord-autocomplete-header">
        <span className="chord-autocomplete-title">
          {suggestionType === 'directive' ? 'Directive Suggestions' : 'Chord Suggestions'}
        </span>
        <span className="chord-autocomplete-hint">
          ↑↓ navigate, Enter/Tab select, Esc close
        </span>
      </div>
      <ul className="chord-autocomplete-list">
        {suggestions.map((suggestion, index) => {
          const isChord = 'chord' in suggestion;
          const displayText = isChord ? suggestion.chord : suggestion.directive;
          const isValid = isChord ? suggestion.isValid : true;
          
          return (
            <li
              key={displayText}
              className={`chord-autocomplete-item ${
                index === selectedIndex ? 'selected' : ''
              } ${isValid ? 'valid' : 'invalid'} ${
                suggestionType === 'directive' ? 'directive-item' : 'chord-item'
              }`}
              onClick={() => onSelectChord(displayText)}
            >
              <span className="suggestion-main">{displayText}</span>
              {suggestionType === 'directive' && 'description' in suggestion && (
                <span className="directive-description">{suggestion.description}</span>
              )}
              <span className="suggestion-validity-indicator">
                {isValid ? '✓' : '!'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChordAutocomplete;
