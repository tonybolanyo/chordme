/**
 * Interactive Chord Diagram Renderer Component
 * 
 * Renders chord diagrams as scalable SVG graphics with support for multiple instruments,
 * interactive tooltips, and accessibility features.
 */

import React, { useState, useRef } from 'react';
import { ChordDiagram, StringPosition } from '../../types/chordDiagram';
import './ChordDiagramRenderer.css';

interface ChordDiagramRendererProps {
  /** Chord diagram data to render */
  chord: ChordDiagram;
  /** Width of the diagram in pixels (height is calculated automatically) */
  width?: number;
  /** Whether to show interactive tooltips */
  showTooltips?: boolean;
  /** CSS class name for the container */
  className?: string;
  /** Callback when a finger position is clicked */
  onFingerClick?: (stringNumber: number, fret: number) => void;
  /** Whether to use high contrast mode for better accessibility */
  highContrast?: boolean;
  /** Whether to use print-friendly styling */
  printMode?: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
  stringNumber: number;
  fret: number;
}

const ChordDiagramRenderer: React.FC<ChordDiagramRendererProps> = ({
  chord,
  width = 200,
  showTooltips = true,
  className = '',
  onFingerClick,
  highContrast = false,
  printMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    stringNumber: 0,
    fret: 0
  });

  const config = chord.instrument;
  const stringCount = config.stringCount;
  const fretCount = Math.max(5, Math.max(...chord.positions.map(p => p.fret)) + 1);
  
  // Calculate dimensions
  const height = (width * 1.4); // 1.4 aspect ratio
  const margin = { top: 40, right: 20, bottom: 40, left: 30 };
  const diagramWidth = width - margin.left - margin.right;
  const diagramHeight = height - margin.top - margin.bottom;
  
  const stringSpacing = diagramWidth / (stringCount - 1);
  const fretSpacing = diagramHeight / fretCount;

  // Calculate position for string and fret
  const getStringX = (stringNumber: number) => {
    return margin.left + (stringNumber - 1) * stringSpacing;
  };

  const getFretY = (fret: number) => {
    return margin.top + (fret * fretSpacing);
  };

  // Get finger color based on finger number
  const getFingerColor = (finger: number): string => {
    if (printMode) return '#000000';
    if (highContrast) {
      return finger === 0 ? '#000000' : '#ffffff';
    }
    
    const colors = {
      0: '#808080', // Open string - gray
      1: '#ff6b6b', // Index finger - red
      2: '#4ecdc4', // Middle finger - teal
      3: '#45b7d1', // Ring finger - blue
      4: '#96ceb4', // Pinky - green
      [-1]: '#666666' // Muted - dark gray
    };
    return colors[finger as keyof typeof colors] || '#000000';
  };

  // Handle finger position click/hover
  const handleFingerInteraction = (
    event: React.MouseEvent<SVGCircleElement>,
    position: StringPosition,
    action: 'click' | 'enter' | 'leave'
  ) => {
    if (action === 'click' && onFingerClick) {
      onFingerClick(position.stringNumber, position.fret);
    }

    if (!showTooltips || printMode) return;

    if (action === 'enter') {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const fingerText = position.finger === 0 ? 'Open' : 
                          position.finger === -1 ? 'Muted' : 
                          `Finger ${position.finger}`;
        
        setTooltip({
          visible: true,
          x: rect.left + getStringX(position.stringNumber),
          y: rect.top + getFretY(position.fret) - 30,
          content: `String ${position.stringNumber}, Fret ${position.fret} - ${fingerText}`,
          stringNumber: position.stringNumber,
          fret: position.fret
        });
      }
    } else if (action === 'leave') {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
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
          stroke={printMode || highContrast ? '#000000' : '#666666'}
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
          y1={margin.top}
          x2={x}
          y2={margin.top + diagramHeight}
          stroke={printMode || highContrast ? '#000000' : '#666666'}
          strokeWidth={1}
          className="string-line"
        />
      );
    }

    return elements;
  };

  // Render finger positions
  const renderFingerPositions = () => {
    return chord.positions.map((position, index) => {
      if (position.fret === -1) {
        // Muted string - render X above nut
        const x = getStringX(position.stringNumber);
        const y = margin.top - 15;
        return (
          <text
            key={`muted-${index}`}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="14"
            fill={printMode || highContrast ? '#000000' : '#666666'}
            className="muted-indicator"
            aria-label={`String ${position.stringNumber} muted`}
          >
            ×
          </text>
        );
      }

      if (position.fret === 0) {
        // Open string - render O above nut
        const x = getStringX(position.stringNumber);
        const y = margin.top - 15;
        return (
          <circle
            key={`open-${index}`}
            cx={x}
            cy={y}
            r="8"
            fill="none"
            stroke={printMode || highContrast ? '#000000' : '#666666'}
            strokeWidth="2"
            className="open-indicator"
            aria-label={`String ${position.stringNumber} open`}
          />
        );
      }

      // Fretted note
      const x = getStringX(position.stringNumber);
      const y = getFretY(position.fret - 0.5); // Position between fret lines
      
      return (
        <g key={`finger-${index}`}>
          <circle
            cx={x}
            cy={y}
            r="12"
            fill={getFingerColor(position.finger)}
            stroke={printMode || highContrast ? '#000000' : '#333333'}
            strokeWidth="2"
            className="finger-position"
            style={{ cursor: onFingerClick ? 'pointer' : 'default' }}
            onClick={(e) => handleFingerInteraction(e, position, 'click')}
            onMouseEnter={(e) => handleFingerInteraction(e, position, 'enter')}
            onMouseLeave={(e) => handleFingerInteraction(e, position, 'leave')}
            aria-label={`String ${position.stringNumber}, fret ${position.fret}, finger ${position.finger}`}
            role="button"
          />
          {position.finger > 0 && (
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="12"
              fill={highContrast ? '#000000' : '#ffffff'}
              className="finger-number"
              pointerEvents="none"
            >
              {position.finger}
            </text>
          )}
        </g>
      );
    });
  };

  // Render barre chord
  const renderBarre = () => {
    if (!chord.barre) return null;

    const barre = chord.barre;
    const y = getFretY(barre.fret - 0.5);
    const startX = getStringX(barre.startString);
    const endX = getStringX(barre.endString);

    return (
      <line
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        stroke={getFingerColor(barre.finger)}
        strokeWidth="20"
        strokeLinecap="round"
        className="barre-line"
        aria-label={`Barre on fret ${barre.fret}, strings ${barre.startString} to ${barre.endString}`}
      />
    );
  };

  // Render chord name and fret indicators
  const renderLabels = () => {
    const elements: JSX.Element[] = [];

    // Chord name
    elements.push(
      <text
        key="chord-name"
        x={width / 2}
        y={20}
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill={printMode || highContrast ? '#000000' : '#333333'}
        className="chord-name"
      >
        {chord.name}
      </text>
    );

    // Fret numbers (on the side)
    for (let fret = 1; fret <= fretCount; fret++) {
      elements.push(
        <text
          key={`fret-label-${fret}`}
          x={margin.left - 15}
          y={getFretY(fret - 0.5) + 4}
          textAnchor="middle"
          fontSize="10"
          fill={printMode || highContrast ? '#000000' : '#666666'}
          className="fret-label"
        >
          {fret}
        </text>
      );
    }

    return elements;
  };

  return (
    <div 
      className={`chord-diagram-container ${className} ${highContrast ? 'high-contrast' : ''} ${printMode ? 'print-mode' : ''}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="chord-diagram-svg"
        role="img"
        aria-label={`Chord diagram for ${chord.name} on ${chord.instrument.type}`}
      >
        {renderFretboard()}
        {renderBarre()}
        {renderFingerPositions()}
        {renderLabels()}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && showTooltips && (
        <div
          className="chord-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
          role="tooltip"
          aria-live="polite"
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default ChordDiagramRenderer;