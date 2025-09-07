/**
 * Chord Diagram Editor Demo Page
 * 
 * Demonstrates the usage of the ChordDiagramEditor component
 */

import React, { useState } from 'react';
import { ChordDiagramEditor } from '../components/ChordDiagramEditor';
import { ChordDiagram, InstrumentType } from '../types/chordDiagram';
import './ChordDiagramEditorDemo.css';

interface SavedChord {
  id: string;
  name: string;
  instrument: string;
  savedAt: string;
}

export const ChordDiagramEditorDemo: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('guitar');
  const [savedChords, setSavedChords] = useState<SavedChord[]>([]);
  const [exportedChord, setExportedChord] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<string>('');

  const handleOpenEditor = () => {
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setExportedChord(null);
    setExportFormat('');
  };

  const handleSaveChord = (chord: ChordDiagram) => {
    // Save chord to local storage or send to API
    const savedChord: SavedChord = {
      id: chord.id,
      name: chord.name,
      instrument: chord.instrument.type,
      savedAt: new Date().toLocaleString()
    };
    
    setSavedChords(prev => [savedChord, ...prev]);
    
    // You could also save to localStorage
    const existingChords = JSON.parse(localStorage.getItem('customChords') || '[]');
    existingChords.push(chord);
    localStorage.setItem('customChords', JSON.stringify(existingChords));
    
    alert(`Chord "${chord.name}" saved successfully!`);
  };

  const handleExportChord = (chord: ChordDiagram, format: string) => {
    if (format === 'json') {
      const jsonString = JSON.stringify(chord, null, 2);
      setExportedChord(jsonString);
      setExportFormat('JSON');
    } else if (format === 'svg') {
      // In a real implementation, you would generate an SVG
      const svgPlaceholder = `<svg><!-- SVG representation of ${chord.name} chord --></svg>`;
      setExportedChord(svgPlaceholder);
      setExportFormat('SVG');
    }
  };

  const downloadExport = () => {
    if (!exportedChord) return;
    
    const blob = new Blob([exportedChord], { 
      type: exportFormat === 'JSON' ? 'application/json' : 'image/svg+xml' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chord.${exportFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="chord-editor-demo">
      <div className="demo-header">
        <h1>🎸 Chord Diagram Editor Demo</h1>
        <p>Create custom chord diagrams with our interactive editor</p>
      </div>

      <div className="demo-content">
        {!isEditorOpen ? (
          <div className="start-section">
            <div className="intro-card">
              <h2>Create Custom Chord Diagrams</h2>
              <p>
                Use our interactive chord diagram editor to create custom chord diagrams
                for guitar, ukulele, and mandolin. Features include:
              </p>
              <ul>
                <li>✅ Interactive fretboard with click-to-place fingerings</li>
                <li>✅ Real-time validation with error detection</li>
                <li>✅ Barre chord creation support</li>
                <li>✅ Custom chord naming with suggestions</li>
                <li>✅ Export in JSON and SVG formats</li>
                <li>✅ Multiple instrument support</li>
              </ul>
            </div>

            <div className="controls-card">
              <h3>Get Started</h3>
              <div className="instrument-selector">
                <label htmlFor="instrument-select">Choose your instrument:</label>
                <select
                  id="instrument-select"
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value as InstrumentType)}
                >
                  <option value="guitar">Guitar (6 strings)</option>
                  <option value="ukulele">Ukulele (4 strings)</option>
                  <option value="mandolin">Mandolin (8 strings)</option>
                </select>
              </div>
              
              <button className="open-editor-btn" onClick={handleOpenEditor}>
                🎵 Open Chord Editor
              </button>
            </div>

            {savedChords.length > 0 && (
              <div className="saved-chords-card">
                <h3>Recently Saved Chords</h3>
                <div className="saved-chords-list">
                  {savedChords.slice(0, 5).map((chord) => (
                    <div key={chord.id} className="saved-chord-item">
                      <div className="chord-info">
                        <span className="chord-name">{chord.name}</span>
                        <span className="chord-instrument">{chord.instrument}</span>
                      </div>
                      <span className="chord-date">{chord.savedAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="editor-section">
            <ChordDiagramEditor
              instrument={selectedInstrument}
              onSave={handleSaveChord}
              onExport={handleExportChord}
              onClose={handleCloseEditor}
              showAdvancedOptions={true}
              maxWidth={1000}
            />
          </div>
        )}

        {exportedChord && (
          <div className="export-section">
            <div className="export-card">
              <div className="export-header">
                <h3>Exported Chord ({exportFormat})</h3>
                <button className="download-btn" onClick={downloadExport}>
                  📥 Download
                </button>
              </div>
              <pre className="export-content">{exportedChord}</pre>
            </div>
          </div>
        )}
      </div>

      <div className="demo-footer">
        <p>
          <strong>💡 Tip:</strong> Try creating different types of chords like barre chords,
          open chords, or complex jazz chords. The validation system will help ensure
          your chords are physically playable!
        </p>
      </div>
    </div>
  );
};

export default ChordDiagramEditorDemo;