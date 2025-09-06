---
layout: default
title: Chord Database Maintenance Guide
---

# Chord Database Maintenance Guide

## Overview

This guide covers the maintenance, troubleshooting, and extension of the ChordMe chord database system.

## Database Management

### Initial Setup

1. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure Database**
```bash
cp config.template.py config.py
# Edit config.py as needed
```

3. **Populate Chord Database**
```bash
flask populate-chords
```

4. **Verify Installation**
```bash
flask chord-stats
```

### Regular Maintenance Tasks

#### Database Health Check
```bash
# Check database statistics
flask chord-stats

# Verify API endpoints
curl http://localhost:5000/api/v1/chords/?limit=1
```

#### Backup and Restore
```bash
# For SQLite (development)
cp chordme.db chordme_backup_$(date +%Y%m%d).db

# For PostgreSQL (production)
pg_dump $DATABASE_URL > chord_backup_$(date +%Y%m%d).sql
```

## Adding New Chords

### 1. Edit the Seeder

Edit `database/populate_chord_database.py`:

```python
# Add to appropriate instrument method
def get_guitar_chords(self):
    # Add new chord to existing categories or create new ones
    new_chords = [
        ('Chord_Name', [fret_pattern], 'difficulty_level'),
        # Example: ('Cmaj9', ['x', 3, 2, 4, 3, 0], 'advanced'),
    ]
    
    # Add to the all_guitar_chords list
    all_guitar_chords = existing_chords + new_chords
```

### 2. Chord Definition Format

```python
# Basic format: (name, positions, difficulty)
('C', ['x', 3, 2, 0, 1, 0], 'beginner')

# Position values:
# 'x' = muted string (not played)
# 0 = open string
# 1-24 = fret number

# Difficulty levels:
# 'beginner' = easy open chords
# 'intermediate' = barre chords, 7th chords
# 'advanced' = complex fingerings, high positions
# 'expert' = very difficult or unusual chords
```

### 3. Spanish Localization

The seeder automatically generates Spanish names using the mapping:

```python
spanish_chord_names = {
    'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa',
    'G': 'Sol', 'A': 'La', 'B': 'Si',
    'C#': 'Do#', 'Bb': 'Sib', # etc.
}
```

### 4. Update Database

```bash
# Re-populate database with new chords
flask populate-chords

# Check new statistics
flask chord-stats
```

## Validation and Testing

### Chord Data Validation

```python
# Test chord creation
from database.populate_chord_database import ChordDatabaseSeeder

seeder = ChordDatabaseSeeder()
test_chord = seeder.create_chord_diagram('C', 'guitar', ['x', 3, 2, 0, 1, 0], 'beginner')

# Validate structure
assert test_chord['name'] == 'C'
assert test_chord['instrument']['type'] == 'guitar'
assert test_chord['localization']['names']['es'] == 'Do'
```

### API Testing

```bash
# Test all endpoints
curl http://localhost:5000/api/v1/chords/
curl http://localhost:5000/api/v1/chords/search?q=C
curl http://localhost:5000/api/v1/chords/instruments/guitar

# Test filters
curl "http://localhost:5000/api/v1/chords/?instrument=guitar&difficulty=beginner"
curl "http://localhost:5000/api/v1/chords/?language=es&limit=5"
```

### Unit Tests

```bash
# Run chord database tests
cd backend
python -m pytest tests/test_chord_database.py -v

# Run API tests
python -m pytest tests/test_chord_routes.py -v
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: Cannot connect to database
```

**Solution:**
- Check database configuration in `config.py`
- Ensure database server is running
- Verify connection string format

#### 2. Import Errors
```
ModuleNotFoundError: No module named 'chordme'
```

**Solution:**
```bash
# From backend directory
export PYTHONPATH=.
flask populate-chords
```

#### 3. Duplicate Chord Error
```
Error: Chord already exists
```

**Solution:**
- Clear existing chords before re-population
- Or modify seeder to skip duplicates

#### 4. API Endpoint Not Found
```
404 Not Found: /api/v1/chords/
```

**Solution:**
- Verify Flask server is running
- Check if chord routes are registered in `api.py`
- Ensure imports are correct

### Performance Issues

#### Large Dataset Performance
```python
# Add database indexes for common queries
db.Index('idx_chords_name', Chord.name)
db.Index('idx_chords_definition', Chord.definition)  # JSON index if supported
```

#### API Response Optimization
```python
# Use pagination for large results
curl "http://localhost:5000/api/v1/chords/?limit=50&page=1"

# Filter early to reduce processing
curl "http://localhost:5000/api/v1/chords/?instrument=guitar&limit=20"
```

## Scaling and Extensions

### Adding New Instruments

1. **Update Instrument Configs**
```python
# In populate_chord_database.py
def get_standard_tuning(self, instrument):
    tunings = {
        'guitar': ['E', 'A', 'D', 'G', 'B', 'E'],
        'ukulele': ['G', 'C', 'E', 'A'],
        'mandolin': ['G', 'G', 'D', 'D', 'A', 'A', 'E', 'E'],
        'banjo': ['G', 'D', 'G', 'B', 'D'],  # New instrument
    }
    return tunings.get(instrument, [])
```

2. **Create Chord Method**
```python
def get_banjo_chords(self):
    """Generate banjo chord diagrams."""
    chords = []
    
    # Define banjo-specific chords
    major = [
        ('C', [0, 2, 0, 1, 0], 'beginner'),
        ('G', [0, 0, 0, 0, 0], 'beginner'),  # Open G
        # Add more chords...
    ]
    
    for name, positions, difficulty in major:
        chords.append(self.create_chord_diagram(name, 'banjo', positions, difficulty))
    
    return chords
```

3. **Update Main Generator**
```python
def generate_all_chords(self):
    all_chords = []
    all_chords.extend(self.get_guitar_chords())
    all_chords.extend(self.get_ukulele_chords())
    all_chords.extend(self.get_mandolin_chords())
    all_chords.extend(self.get_banjo_chords())  # New instrument
    return all_chords
```

### Adding New Chord Types

```python
# Add to appropriate instrument method
def get_guitar_chords(self):
    # ... existing chords ...
    
    # New category: slash chords
    slash_chords = [
        ('C/G', [3, 3, 2, 0, 1, 0], 'intermediate'),
        ('D/F#', [2, 0, 0, 2, 3, 2], 'intermediate'),
        ('F/C', ['x', 3, 3, 2, 1, 1], 'intermediate'),
    ]
    
    # New category: suspended variations
    sus_variations = [
        ('Csus2add9', ['x', 3, 0, 2, 3, 0], 'advanced'),
        ('Dsus4add9', ['x', 'x', 0, 2, 3, 5], 'advanced'),
    ]
    
    all_guitar_chords = existing + slash_chords + sus_variations
```

### Advanced Features

#### Chord Progression Support
```python
# Add progression metadata
chord_data['progression_context'] = {
    'common_progressions': ['I-V-vi-IV', 'ii-V-I'],
    'key_centers': ['C major', 'A minor'],
    'function': 'tonic'  # or 'subdominant', 'dominant'
}
```

#### Alternative Tunings
```python
# Support for different tunings
def create_chord_diagram_with_tuning(self, name, instrument, positions, tuning, difficulty):
    chord = self.create_chord_diagram(name, instrument, positions, difficulty)
    chord['instrument']['tuning'] = tuning
    chord['notes']['isStandardTuning'] = tuning == self.get_standard_tuning(instrument)
    return chord

# Example: DADGAD tuning
dadgad_chord = seeder.create_chord_diagram_with_tuning(
    'Dsus4', 'guitar', [0, 0, 0, 0, 0, 0], 
    ['D', 'A', 'D', 'G', 'A', 'D'], 'beginner'
)
```

## Monitoring and Analytics

### Database Metrics
```python
# Add to Flask CLI
@click.command()
def chord_analytics():
    """Show detailed chord analytics."""
    # Most popular chords
    # Difficulty distribution
    # Instrument usage statistics
    # Language preference stats
```

### API Usage Tracking
```python
# Add request logging to chord routes
@chord_bp.before_request
def log_chord_request():
    logger.info(f"Chord API request: {request.endpoint} - {request.args}")
```

## Best Practices

### Code Quality
- Always validate chord diagrams before adding
- Include comprehensive tests for new features
- Follow existing naming conventions
- Document complex chord fingerings

### Performance
- Use database indexes for frequent queries
- Implement caching for static chord data
- Paginate large result sets
- Optimize JSON serialization

### Maintenance
- Regular database backups
- Monitor API performance
- Update documentation with changes
- Version control chord data changes

---

**Remember:** The chord database is a living system that can be continuously improved and expanded based on user needs and musical requirements.