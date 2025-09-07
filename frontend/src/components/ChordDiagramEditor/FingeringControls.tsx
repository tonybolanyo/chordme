/**
 * Fingering Controls Component
 * 
 * Provides detailed controls for editing individual string positions and barre chords.
 */

import React from 'react';
import { StringPosition, BarreChord, FingerNumber } from '../../types/chordDiagram';
import './FingeringControls.css';

interface FingeringControlsProps {
  positions: StringPosition[];
  barre?: BarreChord;
  onPositionChange: (stringNumber: number, fret: number, finger: FingerNumber) => void;
  onBarreRemove: () => void;
}

export const FingeringControls: React.FC<FingeringControlsProps> = ({
  positions,
  barre,
  onPositionChange,
  onBarreRemove
}) => {
  const getFingerColor = (finger: FingerNumber): string => {
    const colors = {
      0: '#4CAF50', // open - green
      1: '#ff6b6b', // index - red
      2: '#4ecdc4', // middle - teal
      3: '#45b7d1', // ring - blue
      4: '#96ceb4', // pinky - green
      [-1]: '#757575' // muted - gray
    };
    return colors[finger] || '#ddd';
  };

  const getFingerName = (finger: FingerNumber): string => {
    const names = {
      0: 'Open',
      1: 'Index',
      2: 'Middle',
      3: 'Ring',
      4: 'Pinky',
      [-1]: 'Muted'
    };
    return names[finger] || 'Unknown';
  };

  const getPositionLabel = (position: StringPosition): string => {
    if (position.fret === 0) return 'Open';
    if (position.fret === -1) return 'Muted';
    return `Fret ${position.fret}`;
  };

  return (
    <div className="fingering-controls">
      <div className="controls-header">
        <h3>Fingering Details</h3>
      </div>

      {/* Barre chord info */}
      {barre && (
        <div className="barre-section">
          <div className="section-header">
            <h4>Barre Chord</h4>
            <button
              className="remove-barre-button"
              onClick={onBarreRemove}
              title="Remove barre chord"
            >
              ×
            </button>
          </div>
          <div className="barre-info">
            <div className="barre-detail">
              <span className="label">Fret:</span>
              <span className="value">{barre.fret}</span>
            </div>
            <div className="barre-detail">
              <span className="label">Finger:</span>
              <span className="value" style={{ color: getFingerColor(barre.finger) }}>
                {barre.finger} ({getFingerName(barre.finger)})
              </span>
            </div>
            <div className="barre-detail">
              <span className="label">Strings:</span>
              <span className="value">{barre.startString}–{barre.endString}</span>
            </div>
            <div className="barre-detail">
              <span className="label">Type:</span>
              <span className="value">{barre.isPartial ? 'Partial' : 'Full'}</span>
            </div>
          </div>
        </div>
      )}

      {/* String positions */}
      <div className="positions-section">
        <h4>String Positions</h4>
        <div className="positions-list">
          {positions.map((position) => (
            <div key={position.stringNumber} className="position-item">
              <div className="string-info">
                <span className="string-number">{position.stringNumber}</span>
                <div className="position-details">
                  <div className="position-summary">
                    <span className="fret-label">{getPositionLabel(position)}</span>
                    {position.finger >= 0 && (
                      <span 
                        className="finger-label"
                        style={{ 
                          backgroundColor: getFingerColor(position.finger),
                          color: position.finger === 0 ? '#000' : '#fff'
                        }}
                      >
                        {position.finger === 0 ? 'O' : position.finger}
                      </span>
                    )}
                  </div>
                  
                  {position.isBarre && (
                    <div className="barre-indicator">
                      <span className="barre-tag">BARRE</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick edit controls */}
              <div className="quick-controls">
                <button
                  className={`quick-button ${position.fret === 0 ? 'active' : ''}`}
                  onClick={() => onPositionChange(position.stringNumber, 0, 0)}
                  title="Set as open string"
                >
                  O
                </button>
                <button
                  className={`quick-button ${position.fret === -1 ? 'active' : ''}`}
                  onClick={() => onPositionChange(position.stringNumber, -1, -1)}
                  title="Mute string"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fingering legend */}
      <div className="legend-section">
        <h4>Finger Legend</h4>
        <div className="finger-legend">
          {[
            { finger: 0 as FingerNumber, name: 'Open' },
            { finger: 1 as FingerNumber, name: 'Index' },
            { finger: 2 as FingerNumber, name: 'Middle' },
            { finger: 3 as FingerNumber, name: 'Ring' },
            { finger: 4 as FingerNumber, name: 'Pinky' },
            { finger: -1 as FingerNumber, name: 'Muted' }
          ].map((item) => (
            <div key={item.finger} className="legend-item">
              <span 
                className="legend-color"
                style={{ backgroundColor: getFingerColor(item.finger) }}
              >
                {item.finger === 0 ? 'O' : item.finger === -1 ? '×' : item.finger}
              </span>
              <span className="legend-name">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FingeringControls;