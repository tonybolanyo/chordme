/**
 * Interactive Chord Diagram Editor Component
 * 
 * Allows users to create and modify chord diagrams through an interactive interface.
 * Features:
 * - Visual fretboard editing with click-to-place fingerings
 * - Real-time validation with visual feedback
 * - Barre chord creation and editing
 * - Custom chord naming and notation
 * - Save/export functionality
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  ChordDiagram, 
  InstrumentType, 
  DifficultyLevel,
  FingerNumber,
  INSTRUMENT_CONFIGS 
} from '../../types/chordDiagram';
import { validateChordDiagram } from '../../services/chordDiagramValidation';
import { InteractiveFretboard } from './InteractiveFretboard';
import { FingeringControls } from './FingeringControls';
import { ChordNamingEditor } from './ChordNamingEditor';
import { EditorToolbar } from './EditorToolbar';
import { ValidationPanel } from './ValidationPanel';
import './ChordDiagramEditor.css';

interface ChordDiagramEditorProps {
  /** Initial chord diagram to edit (optional) */
  initialChord?: ChordDiagram;
  /** Instrument type for the editor */
  instrument?: InstrumentType;
  /** Callback when chord is saved */
  onSave?: (chord: ChordDiagram) => void;
  /** Callback when chord is exported */
  onExport?: (chord: ChordDiagram, format: string) => void;
  /** Callback when editor is closed */
  onClose?: () => void;
  /** Whether to show advanced editing options */
  showAdvancedOptions?: boolean;
  /** Maximum width of the editor */
  maxWidth?: number;
}

export const ChordDiagramEditor: React.FC<ChordDiagramEditorProps> = ({
  initialChord,
  instrument = 'guitar',
  onSave,
  onExport,
  onClose,
  showAdvancedOptions = true,
  maxWidth = 800
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Initialize chord diagram state
  const [currentChord, setCurrentChord] = useState<ChordDiagram>(() => {
    if (initialChord) {
      return { ...initialChord };
    }
    
    // Create new empty chord diagram
    const instrumentConfig = INSTRUMENT_CONFIGS[instrument];
    return {
      id: crypto.randomUUID(),
      name: 'Custom Chord',
      instrument: instrumentConfig,
      positions: Array.from({ length: instrumentConfig.stringCount }, (_, i) => ({
        stringNumber: i + 1,
        fret: -1, // muted by default
        finger: -1
      })),
      difficulty: 'intermediate' as DifficultyLevel,
      alternatives: [],
      notes: {
        root: 'C',
        notes: [],
        intervals: [],
        isStandardTuning: true
      },
      localization: {
        names: { en: 'Custom Chord' },
        descriptions: { en: 'Custom chord created with ChordMe editor' },
        fingeringInstructions: { en: 'Place fingers as shown' }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'user-created',
        popularityScore: 0,
        isVerified: false,
        tags: ['custom']
      }
    };
  });

  const [selectedFinger, setSelectedFinger] = useState<FingerNumber>(1);
  const [editMode, setEditMode] = useState<'finger' | 'barre' | 'mute'>('finger');
  const [showValidation, setShowValidation] = useState(true);
  const [isCreatingBarre, setIsCreatingBarre] = useState(false);
  const [barreStart, setBarreStart] = useState<{ string: number; fret: number } | null>(null);

  // Validation state
  const validation = validateChordDiagram(currentChord);

  // Handle string position updates
  const handleStringClick = useCallback((stringNumber: number, fret: number) => {
    if (editMode === 'mute') {
      // Mute the string
      updateStringPosition(stringNumber, -1, -1);
      return;
    }

    if (editMode === 'barre') {
      if (!isCreatingBarre) {
        // Start creating barre
        setBarreStart({ string: stringNumber, fret });
        setIsCreatingBarre(true);
      } else {
        // Complete barre creation
        if (barreStart && fret === barreStart.fret) {
          createBarre(barreStart.string, stringNumber, fret, selectedFinger);
        }
        setIsCreatingBarre(false);
        setBarreStart(null);
      }
      return;
    }

    // Regular finger placement
    if (editMode === 'finger') {
      if (fret === 0) {
        // Open string
        updateStringPosition(stringNumber, 0, 0);
      } else {
        // Fretted position
        updateStringPosition(stringNumber, fret, selectedFinger);
      }
    }
  }, [editMode, selectedFinger, isCreatingBarre, barreStart]);

  const updateStringPosition = (stringNumber: number, fret: number, finger: FingerNumber) => {
    setCurrentChord(prev => ({
      ...prev,
      positions: prev.positions.map(pos => 
        pos.stringNumber === stringNumber 
          ? { ...pos, fret, finger }
          : pos
      ),
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const createBarre = (startString: number, endString: number, fret: number, finger: FingerNumber) => {
    const minString = Math.min(startString, endString);
    const maxString = Math.max(startString, endString);
    
    setCurrentChord(prev => ({
      ...prev,
      barre: {
        fret,
        finger,
        startString: minString,
        endString: maxString,
        isPartial: maxString - minString + 1 < prev.instrument.stringCount
      },
      positions: prev.positions.map(pos => {
        if (pos.stringNumber >= minString && pos.stringNumber <= maxString) {
          return {
            ...pos,
            fret,
            finger,
            isBarre: true,
            barreSpan: maxString - minString + 1
          };
        }
        return pos;
      }),
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const handleNameChange = (name: string) => {
    setCurrentChord(prev => ({
      ...prev,
      name,
      localization: {
        ...prev.localization,
        names: { ...prev.localization.names, en: name }
      },
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const handleSave = () => {
    if (validation.isValid && onSave) {
      onSave(currentChord);
    }
  };

  const handleExport = (format: string) => {
    if (onExport) {
      onExport(currentChord, format);
    }
  };

  const handleClear = () => {
    const instrumentConfig = INSTRUMENT_CONFIGS[instrument];
    setCurrentChord(prev => ({
      ...prev,
      positions: Array.from({ length: instrumentConfig.stringCount }, (_, i) => ({
        stringNumber: i + 1,
        fret: -1,
        finger: -1
      })),
      barre: undefined,
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const handleInstrumentChange = (newInstrument: InstrumentType) => {
    const instrumentConfig = INSTRUMENT_CONFIGS[newInstrument];
    setCurrentChord(prev => ({
      ...prev,
      instrument: instrumentConfig,
      positions: Array.from({ length: instrumentConfig.stringCount }, (_, i) => ({
        stringNumber: i + 1,
        fret: -1,
        finger: -1
      })),
      barre: undefined,
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  return (
    <div 
      ref={editorRef}
      className="chord-diagram-editor"
      style={{ maxWidth: `${maxWidth}px` }}
    >
      <div className="editor-header">
        <h2>Chord Diagram Editor</h2>
        {onClose && (
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close editor"
          >
            ×
          </button>
        )}
      </div>

      <div className="editor-content">
        <div className="editor-main">
          {/* Toolbar */}
          <EditorToolbar
            editMode={editMode}
            selectedFinger={selectedFinger}
            instrument={currentChord.instrument.type}
            isCreatingBarre={isCreatingBarre}
            onEditModeChange={setEditMode}
            onFingerChange={setSelectedFinger}
            onInstrumentChange={handleInstrumentChange}
            onClear={handleClear}
            onSave={handleSave}
            onExport={handleExport}
            canSave={validation.isValid}
          />

          {/* Main editing area */}
          <div className="editor-workspace">
            <div className="fretboard-section">
              <InteractiveFretboard
                chord={currentChord}
                editMode={editMode}
                selectedFinger={selectedFinger}
                onStringClick={handleStringClick}
                isCreatingBarre={isCreatingBarre}
                barreStart={barreStart}
                validation={validation}
              />
            </div>

            <div className="controls-section">
              {/* Chord naming */}
              <ChordNamingEditor
                name={currentChord.name}
                onNameChange={handleNameChange}
                suggestions={[]} // TODO: Implement chord name suggestions
              />

              {/* Fingering controls */}
              <FingeringControls
                positions={currentChord.positions}
                barre={currentChord.barre}
                onPositionChange={updateStringPosition}
                onBarreRemove={() => setCurrentChord(prev => ({ ...prev, barre: undefined }))}
              />

              {/* Validation panel */}
              {showValidation && (
                <ValidationPanel
                  validation={validation}
                  onToggle={() => setShowValidation(!showValidation)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Advanced options */}
        {showAdvancedOptions && (
          <div className="editor-advanced">
            <details>
              <summary>Advanced Options</summary>
              <div className="advanced-content">
                {/* TODO: Add advanced options like alternative fingerings, metadata editing, etc. */}
                <p>Advanced editing options will be available here.</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChordDiagramEditor;