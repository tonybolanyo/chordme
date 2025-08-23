import React, { useState, useMemo } from 'react';
import './ChordPalette.css';

interface Chord {
  name: string;
  category: string;
  description?: string;
}

interface ChordPaletteProps {
  onChordSelect?: (chord: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Comprehensive list of commonly used chords
const COMMON_CHORDS: Chord[] = [
  // Major chords
  { name: 'C', category: 'major', description: 'C Major' },
  { name: 'D', category: 'major', description: 'D Major' },
  { name: 'E', category: 'major', description: 'E Major' },
  { name: 'F', category: 'major', description: 'F Major' },
  { name: 'G', category: 'major', description: 'G Major' },
  { name: 'A', category: 'major', description: 'A Major' },
  { name: 'B', category: 'major', description: 'B Major' },

  // Minor chords
  { name: 'Am', category: 'minor', description: 'A Minor' },
  { name: 'Bm', category: 'minor', description: 'B Minor' },
  { name: 'Cm', category: 'minor', description: 'C Minor' },
  { name: 'Dm', category: 'minor', description: 'D Minor' },
  { name: 'Em', category: 'minor', description: 'E Minor' },
  { name: 'Fm', category: 'minor', description: 'F Minor' },
  { name: 'Gm', category: 'minor', description: 'G Minor' },

  // 7th chords
  { name: 'C7', category: 'seventh', description: 'C Dominant 7th' },
  { name: 'D7', category: 'seventh', description: 'D Dominant 7th' },
  { name: 'E7', category: 'seventh', description: 'E Dominant 7th' },
  { name: 'F7', category: 'seventh', description: 'F Dominant 7th' },
  { name: 'G7', category: 'seventh', description: 'G Dominant 7th' },
  { name: 'A7', category: 'seventh', description: 'A Dominant 7th' },
  { name: 'B7', category: 'seventh', description: 'B Dominant 7th' },

  // Minor 7th chords
  { name: 'Am7', category: 'minor7', description: 'A Minor 7th' },
  { name: 'Bm7', category: 'minor7', description: 'B Minor 7th' },
  { name: 'Cm7', category: 'minor7', description: 'C Minor 7th' },
  { name: 'Dm7', category: 'minor7', description: 'D Minor 7th' },
  { name: 'Em7', category: 'minor7', description: 'E Minor 7th' },
  { name: 'Fm7', category: 'minor7', description: 'F Minor 7th' },
  { name: 'Gm7', category: 'minor7', description: 'G Minor 7th' },

  // Major 7th chords
  { name: 'Cmaj7', category: 'major7', description: 'C Major 7th' },
  { name: 'Dmaj7', category: 'major7', description: 'D Major 7th' },
  { name: 'Emaj7', category: 'major7', description: 'E Major 7th' },
  { name: 'Fmaj7', category: 'major7', description: 'F Major 7th' },
  { name: 'Gmaj7', category: 'major7', description: 'G Major 7th' },
  { name: 'Amaj7', category: 'major7', description: 'A Major 7th' },
  { name: 'Bmaj7', category: 'major7', description: 'B Major 7th' },

  // Sus chords
  { name: 'Csus4', category: 'sus', description: 'C Suspended 4th' },
  { name: 'Dsus4', category: 'sus', description: 'D Suspended 4th' },
  { name: 'Esus4', category: 'sus', description: 'E Suspended 4th' },
  { name: 'Fsus4', category: 'sus', description: 'F Suspended 4th' },
  { name: 'Gsus4', category: 'sus', description: 'G Suspended 4th' },
  { name: 'Asus4', category: 'sus', description: 'A Suspended 4th' },
  { name: 'Bsus4', category: 'sus', description: 'B Suspended 4th' },

  // Sus2 chords
  { name: 'Csus2', category: 'sus', description: 'C Suspended 2nd' },
  { name: 'Dsus2', category: 'sus', description: 'D Suspended 2nd' },
  { name: 'Gsus2', category: 'sus', description: 'G Suspended 2nd' },
  { name: 'Asus2', category: 'sus', description: 'A Suspended 2nd' },

  // Common slash chords
  { name: 'C/E', category: 'slash', description: 'C over E bass' },
  { name: 'D/F#', category: 'slash', description: 'D over F# bass' },
  { name: 'F/C', category: 'slash', description: 'F over C bass' },
  { name: 'G/B', category: 'slash', description: 'G over B bass' },
  { name: 'Am/C', category: 'slash', description: 'A minor over C bass' },

  // Diminished and augmented
  { name: 'Cdim', category: 'diminished', description: 'C Diminished' },
  { name: 'Ddim', category: 'diminished', description: 'D Diminished' },
  { name: 'Fdim', category: 'diminished', description: 'F Diminished' },
  { name: 'Gdim', category: 'diminished', description: 'G Diminished' },
  { name: 'Caug', category: 'augmented', description: 'C Augmented' },
  { name: 'Faug', category: 'augmented', description: 'F Augmented' },
];

const ChordPalette: React.FC<ChordPaletteProps> = ({
  onChordSelect,
  className = '',
  style,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = Array.from(new Set(COMMON_CHORDS.map((chord) => chord.category)));
    return ['all', ...cats.sort()];
  }, []);

  // Filter chords based on search term and category
  const filteredChords = useMemo(() => {
    return COMMON_CHORDS.filter((chord) => {
      const matchesSearch = chord.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chord.description && chord.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || chord.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const handleChordClick = (chordName: string) => {
    if (onChordSelect) {
      onChordSelect(`[${chordName}]`);
    }
  };

  const handleDragStart = (e: React.DragEvent, chordName: string) => {
    // Store the chord data for the drop handler
    e.dataTransfer.setData('text/plain', `[${chordName}]`);
    e.dataTransfer.setData('application/chord', chordName);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Add visual feedback class to the dragged element
    const target = e.target as HTMLElement;
    target.classList.add('chord-dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove visual feedback class
    const target = e.target as HTMLElement;
    target.classList.remove('chord-dragging');
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  return (
    <div className={`chord-palette ${className}`} style={style}>
      <div className="chord-palette-header">
        <h3 className="chord-palette-title">Chord Library</h3>
        <p className="chord-palette-subtitle">Click to insert chord or drag to position</p>
      </div>

      <div className="chord-palette-controls">
        <div className="chord-search-container">
          <input
            type="text"
            className="chord-search-input"
            placeholder="Search chords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search chords"
          />
          {(searchTerm || selectedCategory !== 'all') && (
            <button
              type="button"
              className="chord-search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="chord-category-container">
          <select
            className="chord-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chord-palette-content">
        {filteredChords.length > 0 ? (
          <div className="chord-grid">
            {filteredChords.map((chord) => (
              <button
                key={chord.name}
                type="button"
                className={`chord-button chord-button-${chord.category}`}
                onClick={() => handleChordClick(chord.name)}
                onDragStart={(e) => handleDragStart(e, chord.name)}
                onDragEnd={handleDragEnd}
                draggable={true}
                title={chord.description || chord.name}
                aria-label={`Insert ${chord.name} chord`}
              >
                <span className="chord-name">{chord.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="chord-palette-empty">
            <p>No chords found matching "{searchTerm}"</p>
            <button
              type="button"
              className="chord-clear-search-btn"
              onClick={handleClearSearch}
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      <div className="chord-palette-footer">
        <p className="chord-count">
          {filteredChords.length} of {COMMON_CHORDS.length} chords
        </p>
      </div>
    </div>
  );
};

export default ChordPalette;