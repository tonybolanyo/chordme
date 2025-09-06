---
layout: default
title: Chord Database Reference
---

# Chord Database Reference - ChordMe

## Overview

The ChordMe chord database contains **214+ essential chord diagrams** covering guitar, ukulele, and mandolin instruments. All chords include comprehensive fingering information, difficulty ratings, and Spanish localization.

## Database Statistics

- **Total Chords:** 214
- **Guitar Chords:** 106 (includes open position, barre chords, extended chords)
- **Ukulele Chords:** 67 (major, minor, 7th, suspended, sharp/flat variations)
- **Mandolin Chords:** 41 (paired string configurations)

### By Difficulty Level
- **Beginner:** 38 chords (easy open chords, basic fingerings)
- **Intermediate:** 127 chords (standard barre chords, 7th chords)
- **Advanced:** 47 chords (complex fingerings, higher fret positions)
- **Expert:** 2 chords (extended and complex chord voicings)

## Chord Categories

### Major Chords
Complete set of major chords in multiple positions:
- **Basic Major:** C, D, E, F, G, A, B
- **Sharp/Flat Major:** C#/Db, D#/Eb, F#/Gb, G#/Ab, A#/Bb
- **Multiple Fingerings:** Open position and barre chord variations

### Minor Chords
Comprehensive minor chord collection:
- **Basic Minor:** Am, Dm, Em, Fm, Gm, Bm, Cm
- **Sharp/Flat Minor:** C#m/Dbm, D#m/Ebm, F#m/Gbm, G#m/Abm, A#m/Bbm

### 7th Chords
Essential seventh chord variations:
- **Dominant 7th:** C7, D7, E7, F7, G7, A7, B7 (+ sharp/flat)
- **Major 7th:** Cmaj7, Dmaj7, Emaj7, Fmaj7, Gmaj7, Amaj7, Bmaj7
- **Minor 7th:** Am7, Dm7, Em7, Fm7, Gm7, Bm7, Cm7

### Suspended Chords
Versatile suspended chord options:
- **Sus2 Chords:** Csus2, Dsus2, Esus2, Gsus2, Asus2
- **Sus4 Chords:** Csus4, Dsus4, Esus4, Gsus4, Asus4

### Extended & Advanced Chords
Complex chord voicings:
- **Extended:** 9th, 11th, 13th chords
- **Power Chords:** C5, D5, E5, F5, G5, A5, B5
- **Diminished:** Cdim, Ddim, Edim, Fdim, Gdim, Adim, Bdim
- **Augmented:** Caug, Daug, Eaug, Faug, Gaug, Aaug, Baug

## Instrument-Specific Features

### Guitar (106 chords)
- **Open Position Chords:** Easy beginner-friendly fingerings
- **Barre Chords:** Standard F-shape and A-shape barre chords
- **Extended Chords:** Jazz and advanced chord voicings
- **Power Chords:** Rock and metal essential chords
- **Fret Range:** Open position through 12th fret and beyond

### Ukulele (67 chords)
- **Standard Tuning:** G-C-E-A (High G and Low G compatible)
- **Essential Chords:** Complete set for popular songs
- **Ease of Play:** Optimized for smaller instrument
- **Fret Range:** Open position through 5th fret primarily

### Mandolin (41 chords)
- **Paired Strings:** 8-string configuration (G-G, D-D, A-A, E-E)
- **Classical Fingerings:** Traditional mandolin chord positions
- **Folk & Bluegrass:** Essential chords for traditional styles
- **Double Stops:** Paired string harmonies

## Spanish Localization (Sistema Do-Re-Mi)

All chords include Spanish names using the Do-Re-Mi system:

| English | Spanish |
|---------|---------|
| C | Do |
| C# | Do# |
| Db | Reb |
| D | Re |
| D# | Re# |
| Eb | Mib |
| E | Mi |
| F | Fa |
| F# | Fa# |
| Gb | Solb |
| G | Sol |
| G# | Sol# |
| Ab | Lab |
| A | La |
| A# | La# |
| Bb | Sib |
| B | Si |

### Example Spanish Chord Names
- **C major** → **Do mayor**
- **Am** → **Lam** (La menor)
- **G7** → **Sol7** (Sol séptima)
- **Fmaj7** → **Famaj7** (Fa mayor séptima)

## API Endpoints

### Get All Chords
```http
GET /api/v1/chords/
```

**Parameters:**
- `instrument` (guitar|ukulele|mandolin) - Filter by instrument
- `difficulty` (beginner|intermediate|advanced|expert) - Filter by difficulty
- `name` (string) - Filter by chord name (partial match)
- `language` (en|es) - Language for chord names (default: en)
- `page` (integer) - Page number for pagination
- `limit` (integer) - Results per page (max: 200)

**Example:**
```bash
curl "http://localhost:5000/api/v1/chords/?instrument=guitar&difficulty=beginner&limit=10"
```

### Search Chords
```http
GET /api/v1/chords/search
```

**Parameters:**
- `q` (string) - Search query (chord name)
- `instrument` (guitar|ukulele|mandolin) - Filter by instrument
- `language` (en|es) - Search language
- `limit` (integer) - Maximum results (max: 100)

**Example:**
```bash
curl "http://localhost:5000/api/v1/chords/search?q=C&instrument=guitar"
```

### Get Chords by Instrument
```http
GET /api/v1/chords/instruments/{instrument_type}
```

**Example:**
```bash
curl "http://localhost:5000/api/v1/chords/instruments/ukulele"
```

### Get Specific Chord
```http
GET /api/v1/chords/{chord_id}
```

**Example:**
```bash
curl "http://localhost:5000/api/v1/chords/1?language=es"
```

## Flask CLI Commands

### Populate Chord Database
```bash
flask populate-chords
```
Populates the database with all 214 chord diagrams.

### View Database Statistics
```bash
flask chord-stats
```
Displays comprehensive statistics about the chord database.

## Data Structure

Each chord diagram includes:

```json
{
  "id": "guitar_c_123456789",
  "name": "C",
  "instrument": {
    "type": "guitar",
    "stringCount": 6,
    "standardTuning": ["E", "A", "D", "G", "B", "E"]
  },
  "positions": [
    {"stringNumber": 1, "fret": -1, "finger": -1},
    {"stringNumber": 2, "fret": 3, "finger": 3},
    {"stringNumber": 3, "fret": 2, "finger": 2},
    {"stringNumber": 4, "fret": 0, "finger": 0},
    {"stringNumber": 5, "fret": 1, "finger": 1},
    {"stringNumber": 6, "fret": 0, "finger": 0}
  ],
  "difficulty": "beginner",
  "localization": {
    "names": {"en": "C", "es": "Do"},
    "descriptions": {
      "en": "C major chord for guitar",
      "es": "Acorde de Do mayor para guitarra"
    }
  },
  "metadata": {
    "isVerified": true,
    "source": "official",
    "popularityScore": 0.8,
    "tags": ["guitar", "major", "triad", "beginner"]
  }
}
```

## Validation Rules

All chord diagrams are validated for:

- **Physical Playability:** Realistic finger stretches and positions
- **Instrument Compatibility:** Correct string count and fret range
- **Data Integrity:** Complete position information and metadata
- **Localization:** Proper Spanish chord name translations

## Usage Examples

### Filter by Beginner Guitar Chords
```bash
curl "http://localhost:5000/api/v1/chords/?instrument=guitar&difficulty=beginner"
```

### Search for C Chords in Spanish
```bash
curl "http://localhost:5000/api/v1/chords/search?q=Do&language=es"
```

### Get All Ukulele Chords
```bash
curl "http://localhost:5000/api/v1/chords/instruments/ukulele"
```

### Paginate Through All Chords
```bash
curl "http://localhost:5000/api/v1/chords/?page=1&limit=50"
```

## Maintenance

The chord database can be:
- **Populated:** Using `flask populate-chords` command
- **Analyzed:** Using `flask chord-stats` command  
- **Extended:** By adding new chord definitions to the seeder
- **Backed up:** Standard database backup procedures

## Contributing

To add new chords to the database:

1. Edit `database/populate_chord_database.py`
2. Add chord definitions to the appropriate instrument method
3. Include Spanish localization
4. Set appropriate difficulty level
5. Run `flask populate-chords` to update database
6. Verify with `flask chord-stats`

---

**Total Implementation:** 214+ verified chord diagrams with comprehensive metadata, multi-language support, and full API integration.