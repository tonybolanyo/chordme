/**
 * Chord Diagram Panel Component
 * 
 * A sidebar panel that displays chord diagrams for chords detected in the editor.
 * Supports click-to-insert, multiple diagrams per chord, and real-time synchronization.
 */

import React, { useState, useMemo, useCallback } from 'react';
import ChordDiagramRenderer from '../ChordDiagramRenderer';
import { 
  ChordDiagram, 
  InstrumentType,
  ChordDiagramSearchCriteria 
} from '../../types/chordDiagram';
import { ChordDetectionResult } from '../../services/chordDetectionService';
import { searchChordDiagramsAdvanced } from '../../services/chordDiagramUtils';
import './ChordDiagramPanel.css';

interface ChordDiagramPanelProps {
  /** Chord detection results from the editor */
  chordDetection: ChordDetectionResult;
  /** Available chord diagrams to display */
  availableDiagrams: ChordDiagram[];
  /** Current instrument type */
  instrument?: InstrumentType;
  /** Whether the panel is visible */
  visible?: boolean;
  /** Callback when a chord is clicked to insert */
  onChordInsert?: (chordName: string) => void;
  /** Currently highlighted chord (from cursor position) */
  highlightedChord?: string;
  /** Width of the panel in pixels */
  width?: number;
  /** Maximum number of diagrams to show per chord */
  maxDiagramsPerChord?: number;
  /** Whether to show alternative fingerings */
  showAlternatives?: boolean;
  /** Callback when panel visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
}

interface ChordWithDiagrams {
  chord: string;
  diagrams: ChordDiagram[];
  isHighlighted: boolean;
}

const ChordDiagramPanel: React.FC<ChordDiagramPanelProps> = ({
  chordDetection,
  availableDiagrams,
  instrument = 'guitar',
  visible = true,
  onChordInsert,
  highlightedChord,
  width = 300,
  maxDiagramsPerChord = 3,
  showAlternatives = true,
  onVisibilityChange
}) => {
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [showOnlyHighlighted, setShowOnlyHighlighted] = useState(false);

  // Prepare chord data with diagrams
  const chordsWithDiagrams = useMemo<ChordWithDiagrams[]>(() => {
    if (!chordDetection.uniqueChords.length) {
      return [];
    }

    return chordDetection.uniqueChords.map(chord => {
      // Search for diagrams for this chord
      const searchCriteria: ChordDiagramSearchCriteria = {
        name: chord,
        instrument,
        fuzzySearch: true,
        fuzzyThreshold: 20
      };

      const searchResults = searchChordDiagramsAdvanced(
        availableDiagrams,
        {
          criteria: searchCriteria,
          sortBy: 'popularity',
          sortDirection: 'desc',
          maxResults: maxDiagramsPerChord * 2 // Get extra for alternatives
        }
      );

      let diagrams = searchResults.results.map(r => r.diagram);

      // Filter to get primary and alternative diagrams
      if (!showAlternatives) {
        // Only show primary diagrams (first match per chord)
        diagrams = diagrams.slice(0, maxDiagramsPerChord);
      } else {
        // Include alternatives but respect the limit
        diagrams = diagrams.slice(0, maxDiagramsPerChord);
      }

      return {
        chord,
        diagrams,
        isHighlighted: chord === highlightedChord
      };
    });
  }, [
    chordDetection.uniqueChords,
    availableDiagrams,
    instrument,
    highlightedChord,
    maxDiagramsPerChord,
    showAlternatives
  ]);

  // Filter chords based on current view mode
  const displayChords = useMemo(() => {
    if (showOnlyHighlighted && highlightedChord) {
      return chordsWithDiagrams.filter(c => c.chord === highlightedChord);
    }
    return chordsWithDiagrams;
  }, [chordsWithDiagrams, showOnlyHighlighted, highlightedChord]);

  // Handle chord insertion
  const handleChordClick = useCallback((chordName: string) => {
    if (onChordInsert) {
      onChordInsert(`[${chordName}]`);
    }
  }, [onChordInsert]);

  // Handle diagram click for detailed view
  const handleDiagramClick = useCallback((chord: string) => {
    setSelectedChord(selectedChord === chord ? null : chord);
  }, [selectedChord]);

  // Toggle panel visibility
  const handleToggleVisibility = useCallback(() => {
    const newVisible = !visible;
    if (onVisibilityChange) {
      onVisibilityChange(newVisible);
    }
  }, [visible, onVisibilityChange]);

  if (!visible) {
    return (
      <div className="chord-diagram-panel collapsed">
        <button
          className="panel-toggle-button"
          onClick={handleToggleVisibility}
          title="Show Chord Diagrams"
          aria-label="Show chord diagram panel"
        >
          <span className="toggle-icon">🎸</span>
        </button>
      </div>
    );
  }

  return (
    <div 
      className="chord-diagram-panel"
      style={{ width: `${width}px` }}
    >
      {/* Panel Header */}
      <div className="panel-header">
        <h3 className="panel-title">Chord Diagrams</h3>
        
        <div className="panel-controls">
          {highlightedChord && (
            <button
              className={`filter-button ${showOnlyHighlighted ? 'active' : ''}`}
              onClick={() => setShowOnlyHighlighted(!showOnlyHighlighted)}
              title={showOnlyHighlighted ? 'Show all chords' : 'Show only highlighted chord'}
            >
              {showOnlyHighlighted ? '🎯' : '📋'}
            </button>
          )}
          
          <button
            className="panel-toggle-button"
            onClick={handleToggleVisibility}
            title="Hide Chord Diagrams"
            aria-label="Hide chord diagram panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="panel-content">
        {displayChords.length === 0 ? (
          <div className="empty-state">
            <p>No chords detected in the editor.</p>
            <p>Start typing chords like [C] or [Am] to see diagrams here.</p>
          </div>
        ) : (
          <div className="chords-list">
            {displayChords.map(({ chord, diagrams, isHighlighted }) => (
              <div
                key={chord}
                className={`chord-section ${isHighlighted ? 'highlighted' : ''}`}
              >
                {/* Chord Header */}
                <div className="chord-header">
                  <button
                    className="chord-name-button"
                    onClick={() => handleChordClick(chord)}
                    title={`Insert [${chord}] into editor`}
                  >
                    <span className="chord-name">{chord}</span>
                    <span className="insert-icon">+</span>
                  </button>
                  
                  {diagrams.length > 1 && (
                    <button
                      className={`expand-button ${selectedChord === chord ? 'expanded' : ''}`}
                      onClick={() => handleDiagramClick(chord)}
                      title={`${selectedChord === chord ? 'Collapse' : 'Expand'} alternatives`}
                    >
                      {selectedChord === chord ? '−' : '+'}
                    </button>
                  )}
                </div>

                {/* Chord Diagrams */}
                <div className="chord-diagrams">
                  {diagrams.length > 0 ? (
                    <>
                      {/* Primary diagram (always shown) */}
                      <div className="primary-diagram">
                        <ChordDiagramRenderer
                          chord={diagrams[0]}
                          width={120}
                          showTooltips={true}
                          onFingerClick={() => handleChordClick(chord)}
                          className="panel-diagram"
                        />
                      </div>

                      {/* Alternative diagrams (shown when expanded) */}
                      {selectedChord === chord && diagrams.length > 1 && (
                        <div className="alternative-diagrams">
                          {diagrams.slice(1).map((diagram, index) => (
                            <div key={`${chord}-alt-${index}`} className="alternative-diagram">
                              <ChordDiagramRenderer
                                chord={diagram}
                                width={100}
                                showTooltips={true}
                                onFingerClick={() => handleChordClick(chord)}
                                className="panel-diagram alternative"
                              />
                              <span className="alternative-label">
                                Alt {index + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-diagram">
                      <span className="no-diagram-text">No diagram available</span>
                      <button
                        className="chord-name-button small"
                        onClick={() => handleChordClick(chord)}
                        title={`Insert [${chord}] into editor`}
                      >
                        {chord}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="panel-footer">
        <div className="chord-count">
          {chordDetection.chordCount} chord{chordDetection.chordCount !== 1 ? 's' : ''} 
          {' '}({chordDetection.uniqueChordCount} unique)
        </div>
        
        {showAlternatives && (
          <button
            className="toggle-alternatives"
            onClick={() => setShowOnlyHighlighted(!showOnlyHighlighted)}
            title="Toggle alternative fingerings"
          >
            Alt fingerings
          </button>
        )}
      </div>
    </div>
  );
};

export default ChordDiagramPanel;