/**
 * Editor Toolbar Component
 * 
 * Provides editing controls for the chord diagram editor.
 * Features:
 * - Edit mode selection (finger, barre, mute)
 * - Finger selection
 * - Instrument selection
 * - Clear, save, and export actions
 */

import React from 'react';
import { InstrumentType, FingerNumber } from '../../types/chordDiagram';
import './EditorToolbar.css';

interface EditorToolbarProps {
  editMode: 'finger' | 'barre' | 'mute';
  selectedFinger: FingerNumber;
  instrument: InstrumentType;
  isCreatingBarre: boolean;
  onEditModeChange: (mode: 'finger' | 'barre' | 'mute') => void;
  onFingerChange: (finger: FingerNumber) => void;
  onInstrumentChange: (instrument: InstrumentType) => void;
  onClear: () => void;
  onSave: () => void;
  onExport: (format: string) => void;
  canSave: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editMode,
  selectedFinger,
  instrument,
  isCreatingBarre,
  onEditModeChange,
  onFingerChange,
  onInstrumentChange,
  onClear,
  onSave,
  onExport,
  canSave
}) => {
  const handleExportClick = (format: string) => {
    onExport(format);
  };

  return (
    <div className="editor-toolbar">
      {/* Edit Mode Section */}
      <div className="toolbar-section">
        <label className="section-label">Edit Mode</label>
        <div className="button-group">
          <button
            className={`mode-button ${editMode === 'finger' ? 'active' : ''}`}
            onClick={() => onEditModeChange('finger')}
            disabled={isCreatingBarre}
            title="Place finger positions"
          >
            <span className="icon">👆</span>
            Finger
          </button>
          <button
            className={`mode-button ${editMode === 'barre' ? 'active' : ''}`}
            onClick={() => onEditModeChange('barre')}
            title="Create barre chords"
          >
            <span className="icon">📏</span>
            Barre
          </button>
          <button
            className={`mode-button ${editMode === 'mute' ? 'active' : ''}`}
            onClick={() => onEditModeChange('mute')}
            disabled={isCreatingBarre}
            title="Mute strings"
          >
            <span className="icon">🚫</span>
            Mute
          </button>
        </div>
      </div>

      {/* Finger Selection */}
      {editMode === 'finger' && (
        <div className="toolbar-section">
          <label className="section-label">Finger</label>
          <div className="button-group">
            {[1, 2, 3, 4].map((finger) => (
              <button
                key={finger}
                className={`finger-button ${selectedFinger === finger ? 'active' : ''}`}
                onClick={() => onFingerChange(finger as FingerNumber)}
                title={`Finger ${finger} (${['Index', 'Middle', 'Ring', 'Pinky'][finger - 1]})`}
              >
                {finger}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barre Finger Selection */}
      {editMode === 'barre' && (
        <div className="toolbar-section">
          <label className="section-label">Barre Finger</label>
          <div className="button-group">
            {[1, 2, 3, 4].map((finger) => (
              <button
                key={finger}
                className={`finger-button ${selectedFinger === finger ? 'active' : ''}`}
                onClick={() => onFingerChange(finger as FingerNumber)}
                title={`Barre with finger ${finger}`}
              >
                {finger}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instrument Selection */}
      <div className="toolbar-section">
        <label className="section-label">Instrument</label>
        <select
          className="instrument-select"
          value={instrument}
          onChange={(e) => onInstrumentChange(e.target.value as InstrumentType)}
          title="Select instrument type"
        >
          <option value="guitar">Guitar (6 strings)</option>
          <option value="ukulele">Ukulele (4 strings)</option>
          <option value="mandolin">Mandolin (8 strings)</option>
        </select>
      </div>

      {/* Actions */}
      <div className="toolbar-section actions">
        <button
          className="action-button clear"
          onClick={onClear}
          title="Clear all finger positions"
        >
          <span className="icon">🗑️</span>
          Clear
        </button>
        
        <div className="export-group">
          <button
            className="action-button export"
            onClick={() => handleExportClick('json')}
            title="Export as JSON"
          >
            <span className="icon">📄</span>
            JSON
          </button>
          <button
            className="action-button export"
            onClick={() => handleExportClick('svg')}
            title="Export as SVG"
          >
            <span className="icon">🖼️</span>
            SVG
          </button>
        </div>

        <button
          className={`action-button save ${canSave ? 'enabled' : 'disabled'}`}
          onClick={onSave}
          disabled={!canSave}
          title={canSave ? 'Save chord diagram' : 'Fix validation errors before saving'}
        >
          <span className="icon">💾</span>
          Save
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;