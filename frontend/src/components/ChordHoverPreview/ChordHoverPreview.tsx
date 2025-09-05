/**
 * Chord Hover Preview Component
 * 
 * Displays chord diagrams in a tooltip-style preview when hovering over
 * chord symbols in the editor.
 */

import React, { useState, useRef, useEffect } from 'react';
import ChordDiagramRenderer from '../ChordDiagramRenderer';
import { ChordDiagram, InstrumentType } from '../../types/chordDiagram';
import { searchChordDiagramsAdvanced } from '../../services/chordDiagramUtils';
import './ChordHoverPreview.css';

interface ChordHoverPreviewProps {
  /** Chord name to show diagram for */
  chordName: string;
  /** Available chord diagrams */
  availableDiagrams: ChordDiagram[];
  /** Current instrument type */
  instrument?: InstrumentType;
  /** Position to show the preview */
  position: { x: number; y: number };
  /** Whether the preview is visible */
  visible: boolean;
  /** Callback when preview is clicked */
  onClick?: () => void;
  /** Callback when chord is selected for insertion */
  onChordSelect?: (chordName: string) => void;
  /** Maximum number of diagrams to show */
  maxDiagrams?: number;
  /** Whether to show in compact mode */
  compact?: boolean;
}

const ChordHoverPreview: React.FC<ChordHoverPreviewProps> = ({
  chordName,
  availableDiagrams,
  instrument = 'guitar',
  position,
  visible,
  onClick,
  onChordSelect,
  maxDiagrams = 2,
  compact = false
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Find diagrams for the chord
  const chordDiagrams = React.useMemo(() => {
    if (!chordName || !visible) return [];

    const searchResults = searchChordDiagramsAdvanced(
      availableDiagrams,
      {
        criteria: {
          name: chordName,
          instrument,
          fuzzySearch: true,
          fuzzyThreshold: 20
        },
        sortBy: 'popularity',
        sortDirection: 'desc',
        maxResults: maxDiagrams
      }
    );

    return searchResults.results.map(r => r.diagram);
  }, [chordName, availableDiagrams, instrument, maxDiagrams, visible]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!visible || !previewRef.current) return;

    const element = previewRef.current;
    const rect = element.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewport.width) {
      newX = viewport.width - rect.width - 10;
    }
    if (newX < 10) {
      newX = 10;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewport.height) {
      newY = position.y - rect.height - 10;
    }
    if (newY < 10) {
      newY = 10;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position, visible]);

  if (!visible || !chordName) {
    return null;
  }

  return (
    <div
      ref={previewRef}
      className={`chord-hover-preview ${compact ? 'compact' : ''}`}
      style={{
        position: 'fixed',
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        zIndex: 1000
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="preview-header">
        <span className="chord-name">{chordName}</span>
        {onChordSelect && (
          <button
            className="insert-button"
            onClick={(e) => {
              e.stopPropagation();
              onChordSelect(`[${chordName}]`);
            }}
            title={`Insert [${chordName}] into editor`}
          >
            +
          </button>
        )}
      </div>

      {/* Diagrams */}
      <div className="preview-diagrams">
        {chordDiagrams.length > 0 ? (
          chordDiagrams.map((diagram, index) => (
            <div key={`${diagram.id}-${index}`} className="preview-diagram">
              <ChordDiagramRenderer
                chord={diagram}
                width={compact ? 80 : 120}
                showTooltips={false}
                printMode={false}
                className="hover-diagram"
              />
              {chordDiagrams.length > 1 && !compact && (
                <span className="diagram-label">
                  {index === 0 ? 'Primary' : `Alt ${index}`}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="no-diagram">
            <span className="no-diagram-text">No diagram available</span>
            {onChordSelect && (
              <button
                className="insert-button small"
                onClick={(e) => {
                  e.stopPropagation();
                  onChordSelect(`[${chordName}]`);
                }}
                title={`Insert [${chordName}] into editor`}
              >
                Insert {chordName}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer for non-compact mode */}
      {!compact && chordDiagrams.length > 0 && (
        <div className="preview-footer">
          <span className="instrument-info">{instrument}</span>
          {chordDiagrams.length === maxDiagrams && (
            <span className="more-info">Click for more variations</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChordHoverPreview;