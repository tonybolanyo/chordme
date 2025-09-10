/**
 * Chord Diagram Demo Page
 * 
 * Demonstrates the ChordDiagramRenderer component with various chord examples,
 * interactive features, and different instrument types.
 */

import React, { useState } from 'react';
import ChordDiagramRenderer from '../components/ChordDiagramRenderer';
import { SAMPLE_GUITAR_CHORDS, SAMPLE_UKULELE_CHORDS, SAMPLE_MANDOLIN_CHORDS } from '../utils/sampleChordData';
import { InstrumentType } from '../types/chordDiagram';
import './ChordDiagramDemo.css';

const ChordDiagramDemo: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('guitar');
  const [showTooltips, setShowTooltips] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [diagramWidth, setDiagramWidth] = useState(200);

  // Get chords for selected instrument
  const getChordsByInstrument = () => {
    switch (selectedInstrument) {
      case 'guitar':
        return SAMPLE_GUITAR_CHORDS;
      case 'ukulele':
        return SAMPLE_UKULELE_CHORDS;
      case 'mandolin':
        return SAMPLE_MANDOLIN_CHORDS;
      default:
        return SAMPLE_GUITAR_CHORDS;
    }
  };

  const handleFingerClick = (stringNumber: number, fret: number) => {
    console.log(`Clicked finger position: String ${stringNumber}, Fret ${fret}`);
    // Could be used to play the note, highlight, etc.
  };

  return (
    <div className="chord-diagram-demo">
      <header className="demo-header">
        <h1>Interactive Chord Diagram Renderer</h1>
        <p>A comprehensive SVG-based chord diagram component with multi-instrument support, accessibility features, and responsive design.</p>
      </header>

      <div className="demo-controls">
        <div className="control-group">
          <label htmlFor="instrument-select">Instrument:</label>
          <select
            id="instrument-select"
            value={selectedInstrument}
            onChange={(e) => setSelectedInstrument(e.target.value as InstrumentType)}
          >
            <option value="guitar">Guitar</option>
            <option value="ukulele">Ukulele</option>
            <option value="mandolin">Mandolin</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="width-slider">Diagram Width: {diagramWidth}px</label>
          <input
            id="width-slider"
            type="range"
            min="150"
            max="400"
            value={diagramWidth}
            onChange={(e) => setDiagramWidth(Number(e.target.value))}
          />
        </div>

        <div className="control-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={showTooltips}
              onChange={(e) => setShowTooltips(e.target.checked)}
            />
            Show Tooltips
          </label>

          <label>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />
            High Contrast Mode
          </label>

          <label>
            <input
              type="checkbox"
              checked={printMode}
              onChange={(e) => setPrintMode(e.target.checked)}
            />
            Print Mode
          </label>
        </div>
      </div>

      <div className="chord-gallery">
        <h2>Sample Chords for {selectedInstrument.charAt(0).toUpperCase() + selectedInstrument.slice(1)}</h2>
        
        <div className="chord-grid">
          {getChordsByInstrument().map((chord) => (
            <div key={chord.id} className="chord-item">
              <ChordDiagramRenderer
                chord={chord}
                width={diagramWidth}
                showTooltips={showTooltips}
                highContrast={highContrast}
                printMode={printMode}
                onFingerClick={handleFingerClick}
                className="demo-chord-diagram"
              />
              <div className="chord-info">
                <h3>{chord.name}</h3>
                <p className="chord-description">{chord.description}</p>
                <div className="chord-details">
                  <span className={`difficulty-badge difficulty-${chord.difficulty}`}>
                    {chord.difficulty}
                  </span>
                  {chord.barre && (
                    <span className="barre-badge">Barre</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="feature-showcase">
        <h2>Features Demonstrated</h2>
        <div className="feature-list">
          <div className="feature-item">
            <h3>🎸 Multi-Instrument Support</h3>
            <p>Supports guitar (6 strings), ukulele (4 strings), and mandolin (8 strings) with automatic layout adjustment.</p>
          </div>
          
          <div className="feature-item">
            <h3>📱 Responsive Design</h3>
            <p>SVG-based rendering scales perfectly across all device sizes with touch-friendly targets on mobile.</p>
          </div>
          
          <div className="feature-item">
            <h3>♿ Accessibility</h3>
            <p>ARIA labels, screen reader support, high contrast mode, and keyboard navigation.</p>
          </div>
          
          <div className="feature-item">
            <h3>🎨 Interactive Tooltips</h3>
            <p>Hover over finger positions to see detailed information about string, fret, and finger assignments.</p>
          </div>
          
          <div className="feature-item">
            <h3>🖨️ Print-Friendly</h3>
            <p>Automatic black and white conversion for printing with clean, readable layouts.</p>
          </div>
          
          <div className="feature-item">
            <h3>🎯 Color-Coded Fingering</h3>
            <p>Each finger has a distinct color for easy visual identification (Index=Red, Middle=Teal, Ring=Blue, Pinky=Green).</p>
          </div>
        </div>
      </div>

      <div className="technical-info">
        <h2>Technical Implementation</h2>
        <div className="tech-details">
          <div className="tech-item">
            <h3>SVG Graphics</h3>
            <p>Pure SVG rendering ensures crisp visuals at any scale and excellent performance.</p>
          </div>
          
          <div className="tech-item">
            <h3>TypeScript Types</h3>
            <p>Comprehensive type definitions for chord diagrams, instruments, and validation.</p>
          </div>
          
          <div className="tech-item">
            <h3>CSS Custom Properties</h3>
            <p>Theme-aware styling with support for dark mode and custom color schemes.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordDiagramDemo;