/**
 * ChordDiagramSearchDemo Page
 * 
 * Demonstrates the enhanced chord diagram search functionality with comprehensive filtering,
 * sorting, and pagination capabilities.
 */

import React, { useState } from 'react';
import { ChordDiagramSearch } from '../components/ChordDiagramSearch';
import { 
  ALL_SAMPLE_CHORDS,
  SAMPLE_GUITAR_CHORDS, 
  SAMPLE_UKULELE_CHORDS, 
  SAMPLE_MANDOLIN_CHORDS 
} from '../utils/sampleChordData';
import { ChordDiagram, InstrumentType } from '../types/chordDiagram';
import './ChordDiagramSearchDemo.css';

const ChordDiagramSearchDemo: React.FC = () => {
  const [selectedChord, setSelectedChord] = useState<ChordDiagram | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<'all' | InstrumentType>('all');

  // Get the appropriate dataset based on selection
  const getChordDataset = () => {
    switch (selectedDataset) {
      case 'guitar':
        return SAMPLE_GUITAR_CHORDS;
      case 'ukulele':
        return SAMPLE_UKULELE_CHORDS;
      case 'mandolin':
        return SAMPLE_MANDOLIN_CHORDS;
      case 'all':
      default:
        return ALL_SAMPLE_CHORDS;
    }
  };

  const handleChordSelect = (chord: ChordDiagram) => {
    setSelectedChord(chord);
  };

  return (
    <div className="chord-search-demo">
      <header className="demo-header">
        <h1>🎸 Enhanced Chord Diagram Search</h1>
        <p>
          Discover the power of advanced chord diagram search with intelligent filtering, 
          fuzzy search, and comprehensive sorting options. Find exactly the chord you need 
          from our extensive library.
        </p>
      </header>

      <div className="demo-controls">
        <div className="dataset-selector">
          <label htmlFor="dataset-select">Search Dataset:</label>
          <select
            id="dataset-select"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value as unknown)}
          >
            <option value="all">All Instruments ({ALL_SAMPLE_CHORDS.length} chords)</option>
            <option value="guitar">Guitar Only ({SAMPLE_GUITAR_CHORDS.length} chords)</option>
            <option value="ukulele">Ukulele Only ({SAMPLE_UKULELE_CHORDS.length} chords)</option>
            <option value="mandolin">Mandolin Only ({SAMPLE_MANDOLIN_CHORDS.length} chords)</option>
          </select>
        </div>
      </div>

      <div className="demo-content">
        <div className="search-section">
          <h2>🔍 Search & Filter Chords</h2>
          <div className="search-features">
            <div className="feature-highlights">
              <div className="feature">
                <span className="feature-icon">🎯</span>
                <span>Fuzzy Search - finds chords even with typos</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎼</span>
                <span>Chord Type Filtering - major, minor, 7th, sus, and more</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎸</span>
                <span>Multi-Instrument Support - guitar, ukulele, mandolin</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📊</span>
                <span>Smart Sorting - by relevance, difficulty, popularity</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🔧</span>
                <span>Advanced Filters - difficulty, fret range, barre chords</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📄</span>
                <span>Pagination - efficient browsing of large result sets</span>
              </div>
            </div>
          </div>

          <ChordDiagramSearch
            chordDiagrams={getChordDataset()}
            onChordSelect={handleChordSelect}
            showAdvancedFilters={true}
            showSearchHistory={true}
            pageSize={12}
            initialCriteria={{
              fuzzySearch: true,
              fuzzyThreshold: 30
            }}
          />
        </div>

        {selectedChord && (
          <div className="selected-chord-section">
            <h2>🎵 Selected Chord</h2>
            <div className="chord-details">
              <div className="chord-header">
                <h3>{selectedChord.name}</h3>
                <div className="chord-badges">
                  <span className={`difficulty-badge difficulty-${selectedChord.difficulty}`}>
                    {selectedChord.difficulty}
                  </span>
                  <span className="instrument-badge">
                    {selectedChord.instrument.type}
                  </span>
                  {selectedChord.barre && (
                    <span className="barre-badge">Barre</span>
                  )}
                </div>
              </div>

              <div className="chord-info-grid">
                <div className="chord-positions">
                  <h4>Finger Positions:</h4>
                  <div className="position-display">
                    {selectedChord.positions.map((pos, index) => (
                      <div key={index} className="position-item">
                        String {pos.stringNumber}: {pos.fret === -1 ? 'Muted' : `Fret ${pos.fret}`}
                        {pos.finger > 0 && ` (Finger ${pos.finger})`}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chord-metadata">
                  <h4>Metadata:</h4>
                  <div className="metadata-item">
                    <strong>Max Fret:</strong> {Math.max(...selectedChord.positions.map(p => p.fret))}
                  </div>
                  <div className="metadata-item">
                    <strong>Popularity:</strong> {Math.round((selectedChord.metadata.popularityScore || 0) * 100)}%
                  </div>
                  <div className="metadata-item">
                    <strong>Verified:</strong> {selectedChord.metadata.isVerified ? 'Yes' : 'No'}
                  </div>
                  <div className="metadata-item">
                    <strong>Tags:</strong> {selectedChord.metadata.tags.join(', ')}
                  </div>
                </div>

                {selectedChord.barre && (
                  <div className="barre-info">
                    <h4>Barre Information:</h4>
                    <div className="metadata-item">
                      <strong>Fret:</strong> {selectedChord.barre.fret}
                    </div>
                    <div className="metadata-item">
                      <strong>Strings:</strong> {selectedChord.barre.startString} - {selectedChord.barre.endString}
                    </div>
                    <div className="metadata-item">
                      <strong>Finger:</strong> {selectedChord.barre.finger}
                    </div>
                  </div>
                )}

                {selectedChord.alternatives.length > 0 && (
                  <div className="alternatives-info">
                    <h4>Alternative Fingerings:</h4>
                    <div className="metadata-item">
                      {selectedChord.alternatives.length} alternative(s) available
                    </div>
                  </div>
                )}
              </div>

              <div className="chord-description">
                <h4>Description:</h4>
                <p>{selectedChord.localization.descriptions.en}</p>
                {selectedChord.description && (
                  <p><em>{selectedChord.description}</em></p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="demo-examples">
        <h2>🚀 Try These Search Examples</h2>
        <div className="example-searches">
          <div className="example-category">
            <h3>Basic Searches</h3>
            <ul>
              <li><code>C</code> - Find all C chords</li>
              <li><code>Am</code> - Find A minor chords</li>
              <li><code>G7</code> - Find G dominant 7th chords</li>
            </ul>
          </div>
          
          <div className="example-category">
            <h3>Fuzzy Searches</h3>
            <ul>
              <li><code>Cmjr7</code> - Finds "Cmaj7" (typo tolerance)</li>
              <li><code>Aminor</code> - Finds "Am" variations</li>
              <li><code>Fshrp</code> - Finds "F#" chords</li>
            </ul>
          </div>

          <div className="example-category">
            <h3>Advanced Filters</h3>
            <ul>
              <li>Search for <code>major</code> + Difficulty: Beginner</li>
              <li>Search for <code>7th</code> + Instrument: Guitar + No Barre</li>
              <li>Search for <code>sus</code> + Max Fret: 3</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="technical-info">
        <h2>🛠️ Technical Features</h2>
        <div className="tech-grid">
          <div className="tech-feature">
            <h3>Fuzzy Search Algorithm</h3>
            <p>
              Uses Levenshtein distance with configurable thresholds to find chords
              even when there are typos or variations in naming.
            </p>
          </div>
          
          <div className="tech-feature">
            <h3>Multi-Criteria Filtering</h3>
            <p>
              Combine multiple filters simultaneously: chord type, instrument,
              difficulty, fret range, and more for precise results.
            </p>
          </div>

          <div className="tech-feature">
            <h3>Intelligent Sorting</h3>
            <p>
              Sort by relevance score, alphabetical order, difficulty level,
              popularity, or fret position with ascending/descending options.
            </p>
          </div>

          <div className="tech-feature">
            <h3>Performance Optimized</h3>
            <p>
              Handles large chord libraries efficiently with pagination,
              debounced search, and optimized filtering algorithms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordDiagramSearchDemo;