import React, { useState, useEffect, useRef } from 'react';
import './ChordAutocomplete.css';
import {
  getChordSuggestions,
  type ChordSuggestion,
} from '../../services/chordService';

interface ChordAutocompleteProps {
  inputText: string;
  onSelectChord: (chord: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
  visible: boolean;
}

const ChordAutocomplete: React.FC<ChordAutocompleteProps> = ({
  inputText,
  onSelectChord,
  onClose,
  position,
  visible,
}) => {
  const [suggestions, setSuggestions] = useState<ChordSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && inputText) {
      const newSuggestions = getChordSuggestions(inputText, 8);
      setSuggestions(newSuggestions);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [inputText, visible]);

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
            onSelectChord(suggestions[selectedIndex].chord);
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
        <span className="chord-autocomplete-title">Chord Suggestions</span>
        <span className="chord-autocomplete-hint">
          ↑↓ navigate, Enter/Tab select, Esc close
        </span>
      </div>
      <ul className="chord-autocomplete-list">
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.chord}
            className={`chord-autocomplete-item ${
              index === selectedIndex ? 'selected' : ''
            } ${suggestion.isValid ? 'valid' : 'invalid'}`}
            onClick={() => onSelectChord(suggestion.chord)}
          >
            <span className="chord-name">{suggestion.chord}</span>
            <span className="chord-validity-indicator">
              {suggestion.isValid ? '✓' : '!'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChordAutocomplete;
