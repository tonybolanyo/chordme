---
layout: default
title: Chord Transposition Algorithm
---

# Enhanced Chord Transposition Algorithm

## Overview

The enhanced chord transposition algorithm in ChordMe provides intelligent, music theory-aware chord transposition with key signature awareness, enharmonic selection, and multi-notation system support.

## Key Features

### 1. Intelligent Enharmonic Selection

The algorithm uses the circle of fifths to determine the most appropriate enharmonic spelling based on key signature context:

- **Sharp Keys** (G, D, A, E, B, F#): Prefer sharp accidentals (C# over Db)
- **Flat Keys** (F, Bb, Eb, Ab, Db, Gb): Prefer flat accidentals (Db over C#)
- **Neutral Keys** (C major/A minor): Default to sharp preference

#### Circle of Fifths Mapping

```typescript
const CIRCLE_OF_FIFTHS = {
  'C': 0, 'Am': 0,        // Neutral
  'G': 1, 'Em': 1,        // 1 sharp
  'D': 2, 'Bm': 2,        // 2 sharps
  'A': 3, 'F#m': 3,       // 3 sharps
  'E': 4, 'C#m': 4,       // 4 sharps
  'B': 5, 'G#m': 5,       // 5 sharps
  'F#': 6, 'D#m': 6,      // 6 sharps
  'F': -1, 'Dm': -1,      // 1 flat
  'Bb': -2, 'Gm': -2,     // 2 flats
  'Eb': -3, 'Cm': -3,     // 3 flats
  'Ab': -4, 'Fm': -4,     // 4 flats
  'Db': -5, 'Bbm': -5,    // 5 flats
  'Gb': -6, 'Ebm': -6,    // 6 flats
};
```

### 2. Complete Slash Chord Support

Unlike traditional transposition that only transposes the root note, the enhanced algorithm transposes both components to maintain harmonic relationships:

**Before (Incorrect):**
- C/E + 2 semitones → D/E (relationship broken)

**After (Correct):**
- C/E + 2 semitones → D/F# (relationship preserved)

### 3. Multi-Notation System Support

Seamlessly convert between American and Latin notation systems:

**American Notation:** C, D, E, F, G, A, B
**Latin Notation:** Do, Re, Mi, Fa, Sol, La, Si

### 4. Key Signature Auto-Detection

Automatically extracts key signatures from ChordPro content:

```chordpro
{key: F}
[C]Amazing [G]grace
```

The algorithm detects "F" as the key signature and applies flat preferences accordingly.

## API Reference

### Frontend (TypeScript)

#### Basic Transposition
```typescript
transposeChord(chord: string, semitones: number): string
```

#### Enhanced Transposition with Key Awareness
```typescript
transposeChordWithKey(
  chord: string, 
  semitones: number, 
  keySignature?: string,
  notationSystem?: 'american' | 'latin'
): string
```

#### Intelligent Transposition with Advanced Options
```typescript
transposeChordIntelligent(
  chord: string,
  semitones: number,
  options: {
    keySignature?: string;
    notationSystem?: 'american' | 'latin';
    preserveEnharmonics?: boolean;
    preferredAccidentals?: 'sharps' | 'flats' | 'auto';
  }
): string
```

#### Content Transposition
```typescript
transposeChordProContentWithKey(
  content: string,
  semitones: number,
  keySignature?: string,
  notationSystem?: 'american' | 'latin'
): string
```

### Backend (Python)

#### Basic Transposition
```python
transpose_chord(chord: str, semitones: int) -> str
```

#### Enhanced Transposition with Key Awareness
```python
transpose_chord_with_key(
    chord: str, 
    semitones: int, 
    key_signature: str = None,
    notation_system: str = 'american'
) -> str
```

#### Intelligent Transposition
```python
transpose_chord_intelligent(
    chord: str,
    semitones: int,
    key_signature: str = None,
    notation_system: str = 'american',
    preserve_enharmonics: bool = False,
    preferred_accidentals: str = 'auto'
) -> str
```

#### Content Transposition
```python
transpose_chordpro_content_with_key(
    content: str, 
    semitones: int,
    key_signature: str = None,
    notation_system: str = 'american'
) -> str
```

## Examples

### Basic Transposition
```typescript
transposeChord('C', 2)        // 'D'
transposeChord('Am', 3)       // 'Cm'
transposeChord('F#m7', -1)    // 'Fm7'
```

### Key Signature Aware Transposition
```typescript
// Sharp key preference (G major)
transposeChordWithKey('C', 1, 'G')    // 'C#' (not 'Db')

// Flat key preference (F major)  
transposeChordWithKey('C', 1, 'F')    // 'Db' (not 'C#')
```

### Slash Chord Transposition
```typescript
transposeChord('C/E', 2)      // 'D/F#' (both notes transposed)
transposeChord('G/B', 1)      // 'G#/C' (maintains interval relationship)
```

### Content Transposition with Auto-Detection
```typescript
const content = `{key: Bb}
[F]Amazing [C]grace [Dm]how [Bb]sweet`;

transposeChordProContentWithKey(content, 2)
// Result uses flat preferences due to Bb key signature
// '[G]Amazing [D]grace [Em]how [C]sweet'
```

### Notation System Conversion
```typescript
transposeChordIntelligent('C', 2, { notationSystem: 'latin' })  // 'Re'
transposeChordIntelligent('F', -1, { notationSystem: 'latin' }) // 'Mi'
```

### Advanced Options
```typescript
// Preserve original enharmonic style
transposeChordIntelligent('Bb', 1, { preserveEnharmonics: true })  // 'B'

// Force specific accidental preference
transposeChordIntelligent('C', 1, { preferredAccidentals: 'flats' })  // 'Db'
```

## Music Theory Background

### Why Enharmonic Selection Matters

In music theory, the choice between enharmonic equivalents (like C# vs Db) is not arbitrary:

1. **Key Signature Context**: Sharp keys naturally use sharp accidentals, flat keys use flat accidentals
2. **Harmonic Function**: The choice affects readability and harmonic analysis
3. **Performance**: Musicians expect certain enharmonic spellings in specific keys

### Interval Preservation in Slash Chords

Slash chords represent specific harmonic relationships:
- C/E represents a C major chord with E in the bass (major third interval)
- When transposed, this relationship must be preserved
- C/E → D/F# maintains the major third relationship (D to F#)

## Implementation Details

### Chromatic Scales

The algorithm uses two chromatic scales for different preferences:

**Sharp Preference:**
```
['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
```

**Flat Preference:**
```
['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
```

### Chord Parsing

Enhanced chord parsing handles complex chord structures:

```typescript
parseChordEnhanced('C/E') 
// Returns: { root: 'C', modifiers: '', bassNote: 'E', isSlashChord: true }

parseChordEnhanced('Dmaj7#11')
// Returns: { root: 'D', modifiers: 'maj7#11', bassNote: null, isSlashChord: false }
```

### Range Handling

The algorithm properly handles large semitone values:
- Wraps around the 12-semitone chromatic cycle
- Uses modulo arithmetic for efficiency
- Chooses shortest path for extreme values

## Testing and Validation

### Comprehensive Test Coverage

- **Frontend**: 45 tests covering all aspects of transposition
- **Backend**: 40 tests ensuring consistency across implementations
- **Music Theory Validation**: Tests verify correct enharmonic choices
- **Edge Cases**: Large values, invalid inputs, complex chords

### Test Examples

```typescript
// Key signature awareness
expect(transposeChordWithKey('C', 1, 'G')).toBe('C#');  // Sharp key
expect(transposeChordWithKey('C', 1, 'F')).toBe('Db');  // Flat key

// Slash chord relationships  
expect(transposeChord('C/E', 2)).toBe('D/F#');  // Both notes transposed

// Notation system support
expect(convertNotation('C', 'american', 'latin')).toBe('Do');
```

## Performance Considerations

- **O(1) Lookup**: Circle of fifths and enharmonic mappings use hash tables
- **Regex Optimization**: Compiled patterns for content processing
- **Memory Efficient**: No large data structures or caching required
- **Minimal Allocations**: Reuses existing string operations

## Backward Compatibility

The enhanced algorithm maintains full backward compatibility:

- Existing `transposeChord()` function unchanged
- Default behavior matches previous implementation  
- Optional parameters allow gradual adoption
- No breaking changes to public APIs

## Migration Guide

### From Basic to Enhanced Transposition

**Before:**
```typescript
const result = transposeChord('C/E', 2);  // 'D/E' (incorrect)
```

**After:**
```typescript
const result = transposeChord('C/E', 2);  // 'D/F#' (correct)
// No code changes needed - behavior automatically improved
```

### Adding Key Signature Awareness

**Before:**
```typescript
const result = transposeChordProContent(content, 2);
```

**After:**
```typescript
const result = transposeChordProContentWithKey(content, 2, 'F');
// Or let it auto-detect:
const result = transposeChordProContentWithKey(content, 2);
```

## Future Enhancements

### Planned Features

1. **Additional Notation Systems**: French (Do, Ré, Mi), German (H for B)
2. **Nashville Number System**: Numeric chord representation
3. **Modal Key Support**: Dorian, Mixolydian, etc.
4. **Custom Enharmonic Rules**: User-defined preferences
5. **Chord Function Analysis**: Roman numeral integration

### Performance Optimizations

1. **Caching**: Frequently transposed chords
2. **Batch Processing**: Multiple chord transposition
3. **WASM Integration**: High-performance core for large files
4. **Streaming**: Real-time transposition for live performance