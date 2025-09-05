"""
Database migration to populate the chord database with 200+ essential chords.

This migration populates the chords table with comprehensive chord diagrams
for guitar, ukulele, and mandolin instruments.
"""

import json
from datetime import datetime, UTC
import sys
import os

# Add the backend directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.insert(0, backend_dir)

try:
    from chordme.models import db, Chord
    from flask import current_app
except ImportError:
    # For standalone testing, we'll define minimal stubs
    db = None
    Chord = None
    current_app = None


def utc_now():
    """Helper function to get current UTC time."""
    return datetime.now(UTC)


class ChordDatabaseSeeder:
    """Seeder class for populating the chord database."""
    
    def __init__(self):
        self.spanish_chord_names = {
            'C': 'Do', 'C#': 'Do#', 'Db': 'Reb', 'D': 'Re', 'D#': 'Re#', 'Eb': 'Mib',
            'E': 'Mi', 'F': 'Fa', 'F#': 'Fa#', 'Gb': 'Solb', 'G': 'Sol',
            'G#': 'Sol#', 'Ab': 'Lab', 'A': 'La', 'A#': 'La#', 'Bb': 'Sib', 'B': 'Si'
        }
    
    def create_chord_diagram(self, name, instrument, positions, difficulty='intermediate'):
        """Create a chord diagram data structure."""
        # Convert positions to string positions
        string_positions = []
        string_count = 4 if instrument == 'ukulele' else (6 if instrument == 'guitar' else 8)
        
        for i, pos in enumerate(positions[:string_count]):
            if pos == 'x':
                fret, finger = -1, -1
            elif pos == 0:
                fret, finger = 0, 0
            else:
                fret, finger = int(pos), 1  # Default finger assignment
            
            string_positions.append({
                'stringNumber': i + 1,
                'fret': fret,
                'finger': finger
            })
        
        # Create Spanish localization
        root = name[0:2] if len(name) > 1 and name[1] in '#b' else name[0]
        spanish_root = self.spanish_chord_names.get(root, root)
        suffix = name[len(root):]
        spanish_name = spanish_root + suffix
        
        # Create chord diagram structure
        chord_diagram = {
            'id': f"{instrument}_{name.lower().replace('#', 's').replace('b', 'f')}_{int(datetime.now().timestamp())}",
            'name': name,
            'instrument': {
                'type': instrument,
                'stringCount': string_count,
                'standardTuning': self.get_standard_tuning(instrument),
                'fretRange': {'min': 0, 'max': 24 if instrument != 'ukulele' else 15},
                'commonCapoPositions': [0, 1, 2, 3, 4, 5] if instrument != 'mandolin' else [0, 2, 3, 5, 7]
            },
            'positions': string_positions,
            'difficulty': difficulty,
            'alternatives': [],
            'notes': {
                'root': root,
                'notes': [],
                'intervals': [],
                'isStandardTuning': True
            },
            'localization': {
                'names': {'en': name, 'es': spanish_name},
                'descriptions': {
                    'en': f"{name} chord for {instrument}",
                    'es': f"Acorde de {spanish_name} para {'guitarra' if instrument == 'guitar' else ('ukulele' if instrument == 'ukulele' else 'mandolina')}"
                },
                'fingeringInstructions': {
                    'en': 'Standard fingering',
                    'es': 'Digitación estándar'
                }
            },
            'metadata': {
                'createdAt': utc_now().isoformat(),
                'updatedAt': utc_now().isoformat(),
                'source': 'official',
                'popularityScore': 0.8,
                'isVerified': True,
                'tags': [
                    instrument,
                    'minor' if 'm' in name and 'maj' not in name else 'major',
                    'seventh' if '7' in name else 'triad',
                    difficulty
                ]
            }
        }
        
        return chord_diagram
    
    def get_standard_tuning(self, instrument):
        """Get standard tuning for instrument."""
        tunings = {
            'guitar': ['E', 'A', 'D', 'G', 'B', 'E'],
            'ukulele': ['G', 'C', 'E', 'A'],
            'mandolin': ['G', 'G', 'D', 'D', 'A', 'A', 'E', 'E']
        }
        return tunings.get(instrument, [])
    
    def get_guitar_chords(self):
        """Generate guitar chord diagrams."""
        chords = []
        
        # Major chords - open position
        major_open = [
            ('C', ['x', 3, 2, 0, 1, 0], 'beginner'),
            ('D', ['x', 'x', 0, 2, 3, 2], 'beginner'),
            ('E', [0, 2, 2, 1, 0, 0], 'beginner'),
            ('F', [1, 3, 3, 2, 1, 1], 'intermediate'),
            ('G', [3, 2, 0, 0, 3, 3], 'beginner'),
            ('A', ['x', 0, 2, 2, 2, 0], 'beginner'),
            ('B', ['x', 2, 4, 4, 4, 2], 'advanced'),
        ]
        
        # Minor chords
        minor = [
            ('Am', ['x', 0, 2, 2, 1, 0], 'beginner'),
            ('Dm', ['x', 'x', 0, 2, 3, 1], 'beginner'),
            ('Em', [0, 2, 2, 0, 0, 0], 'beginner'),
            ('Fm', [1, 3, 3, 1, 1, 1], 'intermediate'),
            ('Gm', [3, 5, 5, 3, 3, 3], 'intermediate'),
            ('Bm', ['x', 2, 4, 4, 3, 2], 'intermediate'),
            ('Cm', ['x', 3, 5, 5, 4, 3], 'intermediate'),
        ]
        
        # Dominant 7th chords
        dominant_7th = [
            ('C7', ['x', 3, 2, 3, 1, 0], 'intermediate'),
            ('D7', ['x', 'x', 0, 2, 1, 2], 'intermediate'),
            ('E7', [0, 2, 0, 1, 0, 0], 'beginner'),
            ('F7', [1, 3, 1, 2, 1, 1], 'intermediate'),
            ('G7', [3, 2, 0, 0, 0, 1], 'beginner'),
            ('A7', ['x', 0, 2, 0, 2, 0], 'beginner'),
            ('B7', ['x', 2, 1, 2, 0, 2], 'intermediate'),
        ]
        
        # Major 7th chords
        major_7th = [
            ('Cmaj7', ['x', 3, 2, 0, 0, 0], 'intermediate'),
            ('Dmaj7', ['x', 'x', 0, 2, 2, 2], 'intermediate'),
            ('Emaj7', [0, 2, 1, 1, 0, 0], 'intermediate'),
            ('Fmaj7', [1, 3, 2, 2, 1, 1], 'advanced'),
            ('Gmaj7', [3, 2, 0, 0, 0, 2], 'intermediate'),
            ('Amaj7', ['x', 0, 2, 1, 2, 0], 'intermediate'),
            ('Bmaj7', ['x', 2, 4, 3, 4, 2], 'advanced'),
        ]
        
        # Minor 7th chords
        minor_7th = [
            ('Am7', ['x', 0, 2, 0, 1, 0], 'beginner'),
            ('Dm7', ['x', 'x', 0, 2, 1, 1], 'intermediate'),
            ('Em7', [0, 2, 0, 0, 0, 0], 'beginner'),
            ('Fm7', [1, 3, 1, 1, 1, 1], 'intermediate'),
            ('Gm7', [3, 5, 3, 3, 3, 3], 'intermediate'),
            ('Bm7', ['x', 2, 0, 2, 0, 2], 'intermediate'),
            ('Cm7', ['x', 3, 1, 3, 1, 3], 'intermediate'),
        ]
        
        # Suspended chords
        suspended = [
            ('Csus2', ['x', 3, 0, 0, 1, 3], 'intermediate'),
            ('Csus4', ['x', 3, 3, 0, 1, 1], 'intermediate'),
            ('Dsus2', ['x', 'x', 0, 2, 3, 0], 'intermediate'),
            ('Dsus4', ['x', 'x', 0, 2, 3, 3], 'intermediate'),
            ('Esus2', [0, 2, 4, 4, 0, 0], 'intermediate'),
            ('Esus4', [0, 2, 2, 2, 0, 0], 'intermediate'),
            ('Gsus2', [3, 0, 0, 0, 3, 3], 'intermediate'),
            ('Gsus4', [3, 3, 0, 0, 1, 3], 'intermediate'),
            ('Asus2', ['x', 0, 2, 2, 0, 0], 'intermediate'),
            ('Asus4', ['x', 0, 2, 2, 3, 0], 'intermediate'),
        ]
        
        # Diminished and augmented
        dim_aug = [
            ('Cdim', ['x', 3, 1, 2, 1, 'x'], 'advanced'),
            ('Ddim', ['x', 'x', 0, 1, 0, 1], 'advanced'),
            ('Edim', [0, 1, 2, 0, 2, 0], 'advanced'),
            ('Fdim', [1, 2, 3, 1, 3, 1], 'advanced'),
            ('Gdim', [3, 'x', 2, 3, 2, 'x'], 'advanced'),
            ('Adim', ['x', 0, 1, 2, 1, 'x'], 'advanced'),
            ('Bdim', ['x', 2, 0, 1, 0, 'x'], 'advanced'),
            ('Caug', ['x', 3, 2, 1, 1, 0], 'advanced'),
            ('Daug', ['x', 'x', 0, 3, 3, 2], 'advanced'),
            ('Eaug', [0, 3, 2, 1, 1, 0], 'advanced'),
            ('Faug', [1, 4, 3, 2, 2, 1], 'advanced'),
            ('Gaug', [3, 2, 1, 0, 0, 3], 'advanced'),
            ('Aaug', ['x', 0, 3, 2, 2, 1], 'advanced'),
            ('Baug', ['x', 2, 1, 0, 0, 3], 'advanced'),
        ]
        
        # Additional variations
        additional = [
            ('C6', ['x', 3, 2, 2, 1, 0], 'intermediate'),
            ('Cm6', ['x', 3, 1, 2, 1, 3], 'intermediate'),
            ('C9', ['x', 3, 2, 3, 3, 0], 'advanced'),
            ('Cadd9', ['x', 3, 2, 0, 3, 0], 'intermediate'),
            ('D6', ['x', 'x', 0, 2, 0, 2], 'intermediate'),
            ('G6', [3, 2, 0, 0, 0, 0], 'intermediate'),
            ('A6', ['x', 0, 2, 2, 2, 2], 'intermediate'),
        ]
        
        # Sharp and flat variations
        sharp_flat = [
            ('C#', [4, 6, 6, 5, 4, 4], 'intermediate'),  # Barre chord
            ('Db', [4, 6, 6, 5, 4, 4], 'intermediate'),  # Same as C#
            ('D#', [6, 8, 8, 7, 6, 6], 'advanced'),     # Barre chord
            ('Eb', [6, 8, 8, 7, 6, 6], 'advanced'),     # Same as D#
            ('F#', [2, 4, 4, 3, 2, 2], 'intermediate'), # Barre chord
            ('Gb', [2, 4, 4, 3, 2, 2], 'intermediate'), # Same as F#
            ('G#', [4, 6, 6, 5, 4, 4], 'intermediate'), # Barre chord
            ('Ab', [4, 6, 6, 5, 4, 4], 'intermediate'), # Same as G#
            ('A#', [6, 8, 8, 7, 6, 6], 'advanced'),     # Barre chord
            ('Bb', [6, 8, 8, 7, 6, 6], 'advanced'),     # Same as A#
        ]
        
        # Sharp and flat minor chords
        sharp_flat_minor = [
            ('C#m', [4, 6, 6, 4, 4, 4], 'intermediate'),
            ('Dbm', [4, 6, 6, 4, 4, 4], 'intermediate'),
            ('D#m', [6, 8, 8, 6, 6, 6], 'advanced'),
            ('Ebm', [6, 8, 8, 6, 6, 6], 'advanced'),
            ('F#m', [2, 4, 4, 2, 2, 2], 'intermediate'),
            ('Gbm', [2, 4, 4, 2, 2, 2], 'intermediate'),
            ('G#m', [4, 6, 6, 4, 4, 4], 'intermediate'),
            ('Abm', [4, 6, 6, 4, 4, 4], 'intermediate'),
            ('A#m', [6, 8, 8, 6, 6, 6], 'advanced'),
            ('Bbm', [6, 8, 8, 6, 6, 6], 'advanced'),
        ]
        
        # Extended chords
        extended = [
            ('C11', ['x', 3, 3, 2, 1, 1], 'advanced'),
            ('C13', ['x', 3, 2, 3, 5, 5], 'expert'),
            ('Cmaj9', ['x', 3, 2, 4, 3, 0], 'advanced'),
            ('Cm11', ['x', 3, 1, 3, 4, 1], 'advanced'),
            ('D11', ['x', 'x', 0, 2, 1, 0], 'advanced'),
            ('D13', ['x', 'x', 0, 2, 1, 4], 'expert'),
            ('Dmaj9', ['x', 'x', 0, 2, 2, 4], 'advanced'),
            ('Em11', [0, 2, 2, 0, 3, 0], 'intermediate'),
            ('Em9', [0, 2, 2, 0, 3, 2], 'intermediate'),
            ('Fmaj9', [1, 3, 3, 2, 1, 0], 'advanced'),
            ('Gmaj9', [3, 'x', 0, 2, 0, 2], 'intermediate'),
            ('Am11', ['x', 0, 0, 0, 1, 0], 'intermediate'),
            ('Am9', ['x', 0, 2, 4, 1, 0], 'intermediate'),
        ]
        
        # Power chords
        power_chords = [
            ('C5', ['x', 3, 5, 5, 'x', 'x'], 'beginner'),
            ('D5', ['x', 'x', 0, 2, 3, 'x'], 'beginner'),
            ('E5', [0, 2, 2, 'x', 'x', 'x'], 'beginner'),
            ('F5', [1, 3, 3, 'x', 'x', 'x'], 'beginner'),
            ('G5', [3, 5, 5, 'x', 'x', 'x'], 'beginner'),
            ('A5', ['x', 0, 2, 2, 'x', 'x'], 'beginner'),
            ('B5', ['x', 2, 4, 4, 'x', 'x'], 'beginner'),
        ]
        
        all_guitar_chords = major_open + minor + dominant_7th + major_7th + minor_7th + suspended + dim_aug + additional + sharp_flat + sharp_flat_minor + extended + power_chords
        
        for name, positions, difficulty in all_guitar_chords:
            chords.append(self.create_chord_diagram(name, 'guitar', positions, difficulty))
        
        return chords
    
    def get_ukulele_chords(self):
        """Generate ukulele chord diagrams."""
        chords = []
        
        # Major chords
        major = [
            ('C', [0, 0, 0, 3], 'beginner'),
            ('D', [2, 2, 2, 0], 'beginner'),
            ('E', [4, 4, 4, 2], 'intermediate'),
            ('F', [2, 0, 1, 0], 'beginner'),
            ('G', [0, 2, 3, 2], 'beginner'),
            ('A', [2, 1, 0, 0], 'beginner'),
            ('B', [4, 3, 2, 2], 'intermediate'),
        ]
        
        # Minor chords
        minor = [
            ('Am', [2, 0, 0, 0], 'beginner'),
            ('Dm', [2, 2, 1, 0], 'beginner'),
            ('Em', [0, 4, 3, 2], 'intermediate'),
            ('Fm', [1, 0, 1, 3], 'intermediate'),
            ('Gm', [0, 2, 3, 1], 'intermediate'),
            ('Bm', [4, 2, 2, 2], 'intermediate'),
            ('Cm', [0, 3, 3, 3], 'intermediate'),
        ]
        
        # Dominant 7th chords
        dominant_7th = [
            ('C7', [0, 0, 0, 1], 'beginner'),
            ('D7', [2, 2, 2, 3], 'intermediate'),
            ('E7', [1, 2, 0, 2], 'intermediate'),
            ('F7', [2, 3, 1, 0], 'intermediate'),
            ('G7', [0, 2, 1, 2], 'beginner'),
            ('A7', [0, 1, 0, 0], 'beginner'),
            ('B7', [2, 3, 2, 2], 'intermediate'),
        ]
        
        # Major 7th and minor 7th chords
        major_7th = [
            ('Cmaj7', [0, 0, 0, 2], 'intermediate'),
            ('Dmaj7', [2, 2, 2, 4], 'intermediate'),
            ('Emaj7', [1, 1, 0, 2], 'intermediate'),
            ('Fmaj7', [2, 4, 1, 0], 'intermediate'),
            ('Gmaj7', [0, 2, 2, 2], 'intermediate'),
            ('Amaj7', [1, 1, 0, 0], 'intermediate'),
            ('Bmaj7', [4, 3, 2, 1], 'advanced'),
        ]
        
        minor_7th = [
            ('Am7', [0, 0, 0, 0], 'beginner'),
            ('Dm7', [2, 2, 1, 3], 'intermediate'),
            ('Em7', [0, 2, 0, 2], 'intermediate'),
            ('Fm7', [1, 3, 1, 3], 'intermediate'),
            ('Gm7', [0, 2, 1, 1], 'intermediate'),
            ('Bm7', [2, 2, 2, 2], 'intermediate'),
            ('Cm7', [3, 3, 3, 3], 'intermediate'),
        ]
        
        # Suspended chords
        suspended = [
            ('Csus2', [0, 2, 3, 3], 'intermediate'),
            ('Csus4', [0, 0, 1, 3], 'intermediate'),
            ('Dsus2', [2, 2, 0, 0], 'intermediate'),
            ('Dsus4', [2, 2, 3, 0], 'intermediate'),
            ('Esus2', [4, 4, 2, 2], 'intermediate'),
            ('Esus4', [2, 4, 0, 0], 'intermediate'),
            ('Fsus2', [0, 0, 1, 0], 'intermediate'),
            ('Fsus4', [3, 0, 1, 0], 'intermediate'),
            ('Gsus2', [0, 2, 3, 0], 'intermediate'),
            ('Gsus4', [0, 2, 3, 3], 'intermediate'),
            ('Asus2', [2, 4, 5, 2], 'intermediate'),
            ('Asus4', [2, 2, 0, 0], 'intermediate'),
        ]
        
        # Sharp and flat chords
        sharp_flat = [
            ('C#', [1, 1, 1, 4], 'intermediate'),
            ('Db', [1, 1, 1, 4], 'intermediate'),
            ('D#', [0, 3, 3, 1], 'intermediate'),
            ('Eb', [0, 3, 3, 1], 'intermediate'),
            ('F#', [3, 1, 2, 1], 'intermediate'),
            ('Gb', [3, 1, 2, 1], 'intermediate'),
            ('G#', [5, 3, 4, 3], 'advanced'),
            ('Ab', [5, 3, 4, 3], 'advanced'),
            ('A#', [3, 2, 1, 1], 'intermediate'),
            ('Bb', [3, 2, 1, 1], 'intermediate'),
        ]
        
        # Sharp and flat minor chords
        sharp_flat_minor = [
            ('C#m', [1, 1, 0, 4], 'intermediate'),
            ('Dbm', [1, 1, 0, 4], 'intermediate'),
            ('D#m', [3, 3, 2, 1], 'intermediate'),
            ('Ebm', [3, 3, 2, 1], 'intermediate'),
            ('F#m', [2, 1, 2, 0], 'intermediate'),
            ('Gbm', [2, 1, 2, 0], 'intermediate'),
            ('G#m', [1, 3, 4, 2], 'intermediate'),
            ('Abm', [1, 3, 4, 2], 'intermediate'),
            ('A#m', [3, 1, 1, 1], 'intermediate'),
            ('Bbm', [3, 1, 1, 1], 'intermediate'),
        ]
        
        all_ukulele_chords = major + minor + dominant_7th + major_7th + minor_7th + suspended + sharp_flat + sharp_flat_minor
        
        for name, positions, difficulty in all_ukulele_chords:
            chords.append(self.create_chord_diagram(name, 'ukulele', positions, difficulty))
        
        return chords
    
    def get_mandolin_chords(self):
        """Generate mandolin chord diagrams."""
        chords = []
        
        # Major chords (8-string, paired)
        major = [
            ('C', [3, 3, 2, 2, 0, 0, 1, 1], 'intermediate'),
            ('D', [0, 0, 0, 0, 2, 2, 3, 3], 'beginner'),
            ('E', [2, 2, 1, 1, 0, 0, 0, 0], 'beginner'),
            ('F', [3, 3, 2, 2, 1, 1, 1, 1], 'intermediate'),
            ('G', [0, 0, 0, 0, 0, 0, 0, 0], 'beginner'),
            ('A', [2, 2, 2, 2, 2, 2, 0, 0], 'intermediate'),
            ('B', [4, 4, 4, 4, 4, 4, 2, 2], 'advanced'),
        ]
        
        # Minor chords
        minor = [
            ('Am', [2, 2, 2, 2, 0, 0, 0, 0], 'beginner'),
            ('Dm', [0, 0, 0, 0, 2, 2, 1, 1], 'beginner'),
            ('Em', [2, 2, 0, 0, 0, 0, 0, 0], 'beginner'),
            ('Fm', [3, 3, 1, 1, 1, 1, 1, 1], 'intermediate'),
            ('Gm', [0, 0, 0, 0, 3, 3, 1, 1], 'intermediate'),
            ('Bm', [4, 4, 2, 2, 4, 4, 2, 2], 'advanced'),
            ('Cm', [3, 3, 1, 1, 0, 0, 1, 1], 'intermediate'),
        ]
        
        # Dominant 7th chords
        dominant_7th = [
            ('C7', [3, 3, 2, 2, 0, 0, 3, 3], 'intermediate'),
            ('D7', [0, 0, 0, 0, 2, 2, 1, 1], 'intermediate'),
            ('E7', [2, 2, 1, 1, 0, 0, 2, 2], 'intermediate'),
            ('F7', [3, 3, 2, 2, 1, 1, 3, 3], 'advanced'),
            ('G7', [0, 0, 0, 0, 0, 0, 1, 1], 'beginner'),
            ('A7', [2, 2, 2, 2, 2, 2, 2, 2], 'intermediate'),
            ('B7', [4, 4, 4, 4, 4, 4, 4, 4], 'advanced'),
        ]
        
        # Sharp and flat major chords
        sharp_flat_major = [
            ('C#', [4, 4, 3, 3, 1, 1, 2, 2], 'advanced'),
            ('Db', [4, 4, 3, 3, 1, 1, 2, 2], 'advanced'),
            ('D#', [1, 1, 1, 1, 3, 3, 4, 4], 'intermediate'),
            ('Eb', [1, 1, 1, 1, 3, 3, 4, 4], 'intermediate'),
            ('F#', [4, 4, 3, 3, 2, 2, 2, 2], 'intermediate'),
            ('Gb', [4, 4, 3, 3, 2, 2, 2, 2], 'intermediate'),
            ('G#', [1, 1, 1, 1, 1, 1, 1, 1], 'intermediate'),
            ('Ab', [1, 1, 1, 1, 1, 1, 1, 1], 'intermediate'),
            ('A#', [3, 3, 3, 3, 3, 3, 1, 1], 'advanced'),
            ('Bb', [3, 3, 3, 3, 3, 3, 1, 1], 'advanced'),
        ]
        
        # Sharp and flat minor chords
        sharp_flat_minor = [
            ('C#m', [4, 4, 2, 2, 1, 1, 2, 2], 'advanced'),
            ('Dbm', [4, 4, 2, 2, 1, 1, 2, 2], 'advanced'),
            ('D#m', [1, 1, 1, 1, 3, 3, 2, 2], 'intermediate'),
            ('Ebm', [1, 1, 1, 1, 3, 3, 2, 2], 'intermediate'),
            ('F#m', [4, 4, 2, 2, 2, 2, 2, 2], 'intermediate'),
            ('Gbm', [4, 4, 2, 2, 2, 2, 2, 2], 'intermediate'),
            ('G#m', [1, 1, 1, 1, 4, 4, 2, 2], 'intermediate'),
            ('Abm', [1, 1, 1, 1, 4, 4, 2, 2], 'intermediate'),
            ('A#m', [3, 3, 1, 1, 3, 3, 1, 1], 'advanced'),
            ('Bbm', [3, 3, 1, 1, 3, 3, 1, 1], 'advanced'),
        ]
        
        all_mandolin_chords = major + minor + dominant_7th + sharp_flat_major + sharp_flat_minor
        
        for name, positions, difficulty in all_mandolin_chords:
            chords.append(self.create_chord_diagram(name, 'mandolin', positions, difficulty))
        
        return chords
    
    def generate_all_chords(self):
        """Generate all chord diagrams."""
        all_chords = []
        all_chords.extend(self.get_guitar_chords())
        all_chords.extend(self.get_ukulele_chords())
        all_chords.extend(self.get_mandolin_chords())
        return all_chords


def populate_chord_database():
    """Main function to populate the chord database."""
    if db is None or Chord is None:
        print("Database models not available. Skipping database population.")
        return False
        
    try:
        print("Starting chord database population...")
        
        # Create seeder instance
        seeder = ChordDatabaseSeeder()
        
        # Generate all chord diagrams
        chord_diagrams = seeder.generate_all_chords()
        
        print(f"Generated {len(chord_diagrams)} chord diagrams")
        
        # Clear existing chords if needed (uncomment if you want to start fresh)
        # print("Clearing existing chords...")
        # Chord.query.delete()
        
        # Add chords to database
        print("Adding chords to database...")
        added_count = 0
        
        for chord_diagram in chord_diagrams:
            # Check if chord already exists
            existing_chord = Chord.query.filter_by(
                name=chord_diagram['name'],
                definition=json.dumps(chord_diagram)
            ).first()
            
            if not existing_chord:
                # Create new chord record
                chord = Chord(
                    name=chord_diagram['name'],
                    definition=json.dumps(chord_diagram),
                    description=chord_diagram['localization']['descriptions']['en'],
                    user_id=1  # System user - you may need to adjust this
                )
                
                db.session.add(chord)
                added_count += 1
        
        # Commit changes
        db.session.commit()
        
        print(f"Successfully added {added_count} chords to the database")
        
        # Print statistics
        guitar_count = len([c for c in chord_diagrams if c['instrument']['type'] == 'guitar'])
        ukulele_count = len([c for c in chord_diagrams if c['instrument']['type'] == 'ukulele'])
        mandolin_count = len([c for c in chord_diagrams if c['instrument']['type'] == 'mandolin'])
        
        beginner_count = len([c for c in chord_diagrams if c['difficulty'] == 'beginner'])
        intermediate_count = len([c for c in chord_diagrams if c['difficulty'] == 'intermediate'])
        advanced_count = len([c for c in chord_diagrams if c['difficulty'] == 'advanced'])
        
        print("\nChord Database Statistics:")
        print(f"  Total chords: {len(chord_diagrams)}")
        print(f"  Guitar chords: {guitar_count}")
        print(f"  Ukulele chords: {ukulele_count}")
        print(f"  Mandolin chords: {mandolin_count}")
        print(f"  Beginner chords: {beginner_count}")
        print(f"  Intermediate chords: {intermediate_count}")
        print(f"  Advanced chords: {advanced_count}")
        
        return True
        
    except Exception as e:
        print(f"Error populating chord database: {str(e)}")
        db.session.rollback()
        return False


if __name__ == "__main__":
    # This can be run directly or imported into a Flask application
    populate_chord_database()