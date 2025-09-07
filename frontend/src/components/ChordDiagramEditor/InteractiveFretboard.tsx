/**
 * Interactive Fretboard Component
 * 
 * Provides an interactive SVG fretboard that users can click to place/modify fingerings.
 * Features:
 * - Click-to-place finger positions
 * - Visual feedback for different edit modes
 * - Barre chord creation support
 * - Real-time validation highlighting
 */

import React, { useState, useCallback } from 'react';
import { 
  ChordDiagram, 
  FingerNumber, 
  ChordDiagramValidationResult 
} from '../../types/chordDiagram';
import './InteractiveFretboard.css';

interface InteractiveFretboardProps {
  chord: ChordDiagram;
  editMode: 'finger' | 'barre' | 'mute';
  selectedFinger: FingerNumber;
  onStringClick: (stringNumber: number, fret: number) => void;
  isCreatingBarre?: boolean;
  barreStart?: { string: number; fret: number } | null;
  validation?: ChordDiagramValidationResult;
  width?: number;
  height?: number;
}

export const InteractiveFretboard: React.FC<InteractiveFretboardProps> = ({
  chord,
  editMode,
  selectedFinger,
  onStringClick,
  isCreatingBarre = false,
  barreStart = null,
  validation,
  width = 400,
  height = 300
}) => {
  const [hoveredPosition, setHoveredPosition] = useState<{ string: number; fret: number } | null>(null);

  const stringCount = chord.instrument.stringCount;
  const fretCount = 5; // Show 5 frets by default
  const margin = { top: 40, right: 30, bottom: 40, left: 50 };
  const diagramWidth = width - margin.left - margin.right;
  const diagramHeight = height - margin.top - margin.bottom;

  // Calculate positions
  const stringSpacing = diagramWidth / (stringCount - 1);
  const fretSpacing = diagramHeight / fretCount;

  const getStringX = (stringNumber: number) => margin.left + (stringNumber - 1) * stringSpacing;
  const getFretY = (fret: number) => margin.top + fret * fretSpacing;

  // Handle click on fretboard
  const handleFretboardClick = useCallback((event: React.MouseEvent<SVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert click position to string and fret
    const stringNumber = Math.round((x - margin.left) / stringSpacing) + 1;
    const fret = Math.round((y - margin.top) / fretSpacing);

    // Validate bounds
    if (stringNumber >= 1 && stringNumber <= stringCount && fret >= 0 && fret <= fretCount) {
      onStringClick(stringNumber, fret);
    }
  }, [stringCount, fretCount, margin, stringSpacing, fretSpacing, onStringClick]);

  // Handle hover for preview
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const stringNumber = Math.round((x - margin.left) / stringSpacing) + 1;
    const fret = Math.round((y - margin.top) / fretSpacing);

    if (stringNumber >= 1 && stringNumber <= stringCount && fret >= 0 && fret <= fretCount) {
      setHoveredPosition({ string: stringNumber, fret });
    } else {
      setHoveredPosition(null);
    }
  }, [stringCount, fretCount, margin, stringSpacing, fretSpacing]);

  const handleMouseLeave = () => setHoveredPosition(null);

  // Get finger color based on finger number
  const getFingerColor = (finger: FingerNumber): string => {
    const colors = {
      0: 'transparent', // open
      1: '#ff6b6b', // index - red
      2: '#4ecdc4', // middle - teal
      3: '#45b7d1', // ring - blue
      4: '#96ceb4', // pinky - green
      [-1]: 'transparent' // muted
    };
    return colors[finger] || '#ddd';
  };

  // Check if position has validation error
  const hasValidationError = (stringNumber: number, fret: number): boolean => {
    if (!validation || !validation.errors) return false;
    return validation.errors.some(error => 
      error.stringNumber === stringNumber && error.fret === fret
    );
  };

  // Render fretboard grid
  const renderFretboard = () => {
    const elements: JSX.Element[] = [];

    // Horizontal fret lines
    for (let fret = 0; fret <= fretCount; fret++) {
      const y = getFretY(fret);
      const isNut = fret === 0;
      elements.push(
        <line
          key={`fret-${fret}`}
          x1={margin.left}
          y1={y}
          x2={margin.left + diagramWidth}
          y2={y}
          stroke={isNut ? '#333' : '#999'}
          strokeWidth={isNut ? 3 : 1}
          className={`fret-line ${isNut ? 'nut' : ''}`}
        />
      );
    }

    // Vertical string lines
    for (let string = 1; string <= stringCount; string++) {
      const x = getStringX(string);
      elements.push(
        <line
          key={`string-${string}`}
          x1={x}
          y1={getFretY(0)}
          x2={x}
          y2={getFretY(fretCount)}
          stroke="#999"
          strokeWidth={1}
          className="string-line"
        />
      );
    }

    return elements;
  };

  // Render finger positions
  const renderFingerPositions = () => {
    return chord.positions.map((position) => {
      if (position.fret <= 0) return null; // Skip open/muted strings

      const x = getStringX(position.stringNumber);
      const y = getFretY(position.fret - 0.5); // Place between frets
      const hasError = hasValidationError(position.stringNumber, position.fret);

      return (
        <g key={`position-${position.stringNumber}`}>
          <circle
            cx={x}
            cy={y}
            r={12}
            fill={getFingerColor(position.finger)}
            stroke={hasError ? '#ff0000' : '#333'}
            strokeWidth={hasError ? 3 : 1}
            className={`finger-position ${hasError ? 'error' : ''} ${position.isBarre ? 'barre' : ''}`}
          />
          {position.finger > 0 && (
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="12"
              fill="white"
              fontWeight="bold"
              className="finger-number"
            >
              {position.finger}
            </text>
          )}
        </g>
      );
    });
  };

  // Render barre chord line
  const renderBarre = () => {
    if (!chord.barre) return null;

    const startX = getStringX(chord.barre.startString);
    const endX = getStringX(chord.barre.endString);
    const y = getFretY(chord.barre.fret - 0.5);

    return (
      <line
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        stroke={getFingerColor(chord.barre.finger)}
        strokeWidth={20}
        strokeLinecap="round"
        opacity={0.8}
        className="barre-line"
      />
    );
  };

  // Render open/muted indicators
  const renderStringIndicators = () => {
    return chord.positions.map((position) => {
      const x = getStringX(position.stringNumber);
      const y = margin.top - 20;

      if (position.fret === 0) {
        // Open string
        return (
          <circle
            key={`open-${position.stringNumber}`}
            cx={x}
            cy={y}
            r={6}
            fill="none"
            stroke="#4CAF50"
            strokeWidth={2}
            className="open-indicator"
          />
        );
      } else if (position.fret === -1) {
        // Muted string
        return (
          <text
            key={`muted-${position.stringNumber}`}
            x={x}
            y={y + 4}
            textAnchor="middle"
            fontSize="16"
            fill="#f44336"
            fontWeight="bold"
            className="muted-indicator"
          >
            ×
          </text>
        );
      }
      return null;
    });
  };

  // Render hover preview
  const renderHoverPreview = () => {
    if (!hoveredPosition || editMode === 'mute') return null;

    const x = getStringX(hoveredPosition.string);
    const y = getFretY(hoveredPosition.fret === 0 ? hoveredPosition.fret : hoveredPosition.fret - 0.5);

    if (editMode === 'barre' && isCreatingBarre && barreStart) {
      // Show barre preview
      const startX = getStringX(barreStart.string);
      const endX = x;
      const barreY = getFretY(barreStart.fret - 0.5);

      if (hoveredPosition.fret === barreStart.fret) {
        return (
          <line
            x1={Math.min(startX, endX)}
            y1={barreY}
            x2={Math.max(startX, endX)}
            y2={barreY}
            stroke={getFingerColor(selectedFinger)}
            strokeWidth={20}
            strokeLinecap="round"
            opacity={0.5}
            className="barre-preview"
          />
        );
      }
    }

    // Regular finger preview
    if (hoveredPosition.fret === 0) {
      // Open string preview
      return (
        <circle
          cx={x}
          cy={margin.top - 20}
          r={8}
          fill="none"
          stroke="#4CAF50"
          strokeWidth={2}
          opacity={0.6}
          className="hover-preview open"
        />
      );
    } else {
      // Fretted position preview
      return (
        <circle
          cx={x}
          cy={y}
          r={12}
          fill={getFingerColor(selectedFinger)}
          opacity={0.6}
          className="hover-preview finger"
        />
      );
    }
  };

  // Render string labels
  const renderStringLabels = () => {
    return chord.instrument.standardTuning.map((note, index) => {
      const stringNumber = index + 1;
      const x = getStringX(stringNumber);
      const y = margin.top + diagramHeight + 25;

      return (
        <text
          key={`label-${stringNumber}`}
          x={x}
          y={y}
          textAnchor="middle"
          fontSize="12"
          fill="#666"
          className="string-label"
        >
          {note}
        </text>
      );
    });
  };

  // Render fret numbers
  const renderFretNumbers = () => {
    const elements: JSX.Element[] = [];
    for (let fret = 1; fret <= fretCount; fret++) {
      const x = margin.left - 20;
      const y = getFretY(fret - 0.5) + 4;
      elements.push(
        <text
          key={`fret-number-${fret}`}
          x={x}
          y={y}
          textAnchor="middle"
          fontSize="12"
          fill="#666"
          className="fret-label"
        >
          {fret}
        </text>
      );
    }
    return elements;
  };

  return (
    <div className="interactive-fretboard">
      <div className="fretboard-instructions">
        <p>
          {editMode === 'finger' && `Click to place finger ${selectedFinger}`}
          {editMode === 'barre' && !isCreatingBarre && 'Click to start barre chord'}
          {editMode === 'barre' && isCreatingBarre && 'Click to complete barre chord'}
          {editMode === 'mute' && 'Click to mute strings'}
        </p>
      </div>

      <svg
        width={width}
        height={height}
        className={`fretboard-svg ${editMode}-mode ${isCreatingBarre ? 'creating-barre' : ''}`}
        onClick={handleFretboardClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label={`Interactive fretboard for ${chord.name} chord`}
      >
        {/* Fretboard grid */}
        {renderFretboard()}
        
        {/* Barre chord line */}
        {renderBarre()}
        
        {/* Finger positions */}
        {renderFingerPositions()}
        
        {/* Open/muted indicators */}
        {renderStringIndicators()}
        
        {/* Hover preview */}
        {renderHoverPreview()}
        
        {/* Labels */}
        {renderStringLabels()}
        {renderFretNumbers()}
      </svg>
    </div>
  );
};

export default InteractiveFretboard;