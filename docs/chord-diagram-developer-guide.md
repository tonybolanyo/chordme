---
layout: default
title: Chord Diagram Developer Guide
---

# Developer Guide: Adding New Chord Diagrams

This guide explains how to create, validate, and integrate new chord diagrams into the ChordMe application using the comprehensive chord diagram data structure.

## Quick Start

### 1. Basic Chord Creation

```typescript
import { createChordDiagram } from '../services/chordDiagramUtils';
import { validateChordDiagram } from '../services/chordDiagramValidation';

// Create a simple chord diagram
const eMajor = createChordDiagram('E', 'guitar', [
  { stringNumber: 1, fret: 0, finger: 0 },
  { stringNumber: 2, fret: 0, finger: 0 },
  { stringNumber: 3, fret: 1, finger: 1 },
  { stringNumber: 4, fret: 2, finger: 3 },
  { stringNumber: 5, fret: 2, finger: 2 },
  { stringNumber: 6, fret: 0, finger: 0 }
]);

// Always validate before using
const validation = validateChordDiagram(eMajor);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### 2. String Position Guidelines

String positions use 1-based numbering from highest to lowest pitch:

**Guitar (Standard Tuning)**
- String 1: High E (1st string)
- String 2: B (2nd string)  
- String 3: G (3rd string)
- String 4: D (4th string)
- String 5: A (5th string)
- String 6: Low E (6th string)

**Fret Values**
- `0`: Open string
- `1-24`: Fretted positions
- `-1`: Muted/not played

**Finger Values**
- `0`: Open string (no finger)
- `1-4`: Index, middle, ring, pinky fingers
- `-1`: Muted string

## Advanced Chord Types

### Barre Chords

```typescript
import { createBarreChord } from '../services/chordDiagramUtils';

// F major barre chord
const fMajorBarre = createChordDiagram('F', 'guitar', [
  { stringNumber: 1, fret: 1, finger: 1, isBarre: true, barreSpan: 6 },
  { stringNumber: 2, fret: 1, finger: 1, isBarre: true, barreSpan: 6 },
  { stringNumber: 3, fret: 2, finger: 2 },
  { stringNumber: 4, fret: 3, finger: 4 },
  { stringNumber: 5, fret: 3, finger: 3 },
  { stringNumber: 6, fret: 1, finger: 1, isBarre: true, barreSpan: 6 }
]);

// Add barre information
fMajorBarre.barre = createBarreChord(1, 1, 1, 6); // fret, finger, startString, endString
fMajorBarre.difficulty = 'intermediate';
```

### Partial Barres

```typescript
// B minor (partial barre)
const bMinor = createChordDiagram('Bm', 'guitar', [
  { stringNumber: 1, fret: 2, finger: 1, isBarre: true, barreSpan: 5 },
  { stringNumber: 2, fret: 3, finger: 2 },
  { stringNumber: 3, fret: 4, finger: 4 },
  { stringNumber: 4, fret: 4, finger: 3 },
  { stringNumber: 5, fret: 2, finger: 1, isBarre: true, barreSpan: 5 },
  { stringNumber: 6, fret: -1, finger: -1 } // Muted
]);

bMinor.barre = createBarreChord(2, 1, 1, 5, true); // isPartial = true
```

## Alternative Fingerings

```typescript
import { addAlternativeFingering } from '../services/chordDiagramUtils';

// Start with basic C major
const cMajor = createChordDiagram('C', 'guitar', [
  { stringNumber: 1, fret: 3, finger: 3 },
  { stringNumber: 2, fret: 2, finger: 2 },
  { stringNumber: 3, fret: 0, finger: 0 },
  { stringNumber: 4, fret: 0, finger: 0 },
  { stringNumber: 5, fret: 1, finger: 1 },
  { stringNumber: 6, fret: -1, finger: -1 }
]);

// Add alternative fingering for smaller hands
const cMajorWithAlt = addAlternativeFingering(
  cMajor,
  [
    { stringNumber: 1, fret: 0, finger: 0 },
    { stringNumber: 2, fret: 1, finger: 1 },
    { stringNumber: 3, fret: 0, finger: 0 },
    { stringNumber: 4, fret: 2, finger: 3 },
    { stringNumber: 5, fret: 3, finger: 4 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ],
  'Easier fingering for small hands',
  'beginner'
);

// Add high position alternative
const cMajorComplete = addAlternativeFingering(
  cMajorWithAlt,
  [
    { stringNumber: 1, fret: 8, finger: 3 },
    { stringNumber: 2, fret: 8, finger: 4 },
    { stringNumber: 3, fret: 9, finger: 2 },
    { stringNumber: 4, fret: 10, finger: 1 },
    { stringNumber: 5, fret: -1, finger: -1 },
    { stringNumber: 6, fret: -1, finger: -1 }
  ],
  'High position (8th fret)',
  'advanced'
);
```

## Different Instruments

### Ukulele Chords

```typescript
// C major on ukulele
const ukuleleC = createChordDiagram('C', 'ukulele', [
  { stringNumber: 1, fret: 0, finger: 0 },  // A string (high)
  { stringNumber: 2, fret: 0, finger: 0 },  // E string
  { stringNumber: 3, fret: 0, finger: 0 },  // C string
  { stringNumber: 4, fret: 3, finger: 3 }   // G string (low)
]);

// F major on ukulele
const ukuleleF = createChordDiagram('F', 'ukulele', [
  { stringNumber: 1, fret: 1, finger: 1 },
  { stringNumber: 2, fret: 0, finger: 0 },
  { stringNumber: 3, fret: 1, finger: 2 },
  { stringNumber: 4, fret: 2, finger: 3 }
]);
```

### Mandolin Chords

```typescript
// G major on mandolin (paired strings)
const mandolinG = createChordDiagram('G', 'mandolin', [
  { stringNumber: 1, fret: 0, finger: 0 },  // High E
  { stringNumber: 2, fret: 0, finger: 0 },  // High E (paired)
  { stringNumber: 3, fret: 2, finger: 2 },  // A
  { stringNumber: 4, fret: 2, finger: 2 },  // A (paired)
  { stringNumber: 5, fret: 3, finger: 3 },  // D
  { stringNumber: 6, fret: 3, finger: 3 },  // D (paired)
  { stringNumber: 7, fret: 0, finger: 0 },  // G
  { stringNumber: 8, fret: 0, finger: 0 }   // G (paired)
]);
```

## Validation Best Practices

### 1. Always Validate

```typescript
function createAndValidateChord(name: string, instrument: InstrumentType, positions: StringPosition[]): ChordDiagram | null {
  const chord = createChordDiagram(name, instrument, positions);
  const validation = validateChordDiagram(chord);
  
  if (!validation.isValid) {
    console.error(`Invalid chord ${name}:`, validation.errors);
    return null;
  }
  
  if (validation.warnings.length > 0) {
    console.warn(`Chord ${name} warnings:`, validation.warnings);
  }
  
  return chord;
}
```

### 2. Handle Validation Errors

```typescript
function handleValidationErrors(result: ChordDiagramValidationResult): void {
  result.errors.forEach(error => {
    switch (error.type) {
      case 'invalid_fret':
        console.error(`Invalid fret ${error.fret} on string ${error.stringNumber}`);
        break;
      case 'invalid_finger':
        console.error(`Invalid finger assignment: ${error.message}`);
        break;
      case 'impossible_stretch':
        console.error(`Impossible finger stretch: ${error.message}`);
        break;
      default:
        console.error(`Validation error: ${error.message}`);
    }
  });
}
```

### 3. Check Physical Playability

```typescript
function assessDifficulty(chord: ChordDiagram): DifficultyLevel {
  const validation = validateChordDiagram(chord);
  
  // Check for barre chords
  if (chord.barre) {
    return 'intermediate';
  }
  
  // Check finger stretch
  const frettedPositions = chord.positions.filter(p => p.fret > 0);
  if (frettedPositions.length > 0) {
    const frets = frettedPositions.map(p => p.fret);
    const stretch = Math.max(...frets) - Math.min(...frets);
    
    if (stretch > 3) return 'advanced';
    if (stretch > 2) return 'intermediate';
  }
  
  // Check high fret positions
  const highFrets = frettedPositions.filter(p => p.fret > 12);
  if (highFrets.length > 0) return 'advanced';
  
  return 'beginner';
}
```

## Metadata and Localization

### Adding Rich Metadata

```typescript
function enhanceChordMetadata(chord: ChordDiagram): ChordDiagram {
  const enhanced = { ...chord };
  
  enhanced.metadata = {
    ...enhanced.metadata,
    tags: [
      chord.instrument.type,
      chord.difficulty,
      chord.name.includes('m') && !chord.name.includes('maj') ? 'minor' : 'major',
      chord.barre ? 'barre' : 'open',
      `${chord.positions.filter(p => p.fret > 0).length}-fingers`
    ],
    popularityScore: calculatePopularity(chord),
    isVerified: true,
    source: 'official'
  };
  
  return enhanced;
}

function calculatePopularity(chord: ChordDiagram): number {
  // Simple popularity algorithm
  const basicChords = ['C', 'G', 'D', 'A', 'E', 'F', 'Am', 'Em', 'Dm'];
  if (basicChords.includes(chord.name)) return 0.9;
  
  if (chord.barre) return 0.6;
  if (chord.difficulty === 'beginner') return 0.8;
  if (chord.difficulty === 'advanced') return 0.4;
  
  return 0.5;
}
```

### Internationalization

```typescript
function localizeChord(chord: ChordDiagram): ChordDiagram {
  const localized = { ...chord };
  
  localized.localization = {
    names: {
      en: chord.name,
      es: convertToSpanishNotation(chord.name),
      fr: convertToFrenchNotation(chord.name),
      de: convertToGermanNotation(chord.name)
    },
    descriptions: {
      en: `${chord.name} ${chord.difficulty} chord for ${chord.instrument.type}`,
      es: `Acorde de ${convertToSpanishNotation(chord.name)} ${translateDifficulty(chord.difficulty, 'es')} para ${translateInstrument(chord.instrument.type, 'es')}`,
      fr: `Accord de ${convertToFrenchNotation(chord.name)} ${translateDifficulty(chord.difficulty, 'fr')} pour ${translateInstrument(chord.instrument.type, 'fr')}`,
      de: `${convertToGermanNotation(chord.name)} ${translateDifficulty(chord.difficulty, 'de')} Akkord für ${translateInstrument(chord.instrument.type, 'de')}`
    },
    fingeringInstructions: generateFingeringInstructions(chord)
  };
  
  return localized;
}

function convertToSpanishNotation(chordName: string): string {
  const noteMap: Record<string, string> = {
    'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa',
    'G': 'Sol', 'A': 'La', 'B': 'Si'
  };
  
  return chordName.replace(/^[A-G]/, match => noteMap[match] || match);
}
```

## Collections and Organization

### Creating Chord Collections

```typescript
import { createChordDiagramCollection } from '../services/chordDiagramUtils';

function createBeginnerCollection(): ChordDiagramCollection {
  const beginnerChords = [
    createChordDiagram('Em', 'guitar', [
      { stringNumber: 1, fret: 0, finger: 0 },
      { stringNumber: 2, fret: 0, finger: 0 },
      { stringNumber: 3, fret: 0, finger: 0 },
      { stringNumber: 4, fret: 2, finger: 2 },
      { stringNumber: 5, fret: 2, finger: 3 },
      { stringNumber: 6, fret: 0, finger: 0 }
    ]),
    // Add more beginner chords...
  ];

  beginnerChords.forEach(chord => {
    chord.difficulty = 'beginner';
    chord.metadata.isVerified = true;
  });

  return createChordDiagramCollection(
    'Beginner Guitar Chords',
    'Essential chords for starting guitar players',
    'guitar',
    beginnerChords
  );
}
```

### Organizing by Difficulty

```typescript
function organizeChordsByDifficulty(chords: ChordDiagram[]): Record<DifficultyLevel, ChordDiagram[]> {
  return chords.reduce((groups, chord) => {
    if (!groups[chord.difficulty]) {
      groups[chord.difficulty] = [];
    }
    groups[chord.difficulty].push(chord);
    return groups;
  }, {} as Record<DifficultyLevel, ChordDiagram[]>);
}
```

## Storage and Serialization

### Saving Chord Diagrams

```typescript
import { serializeChordDiagram } from '../services/chordDiagramSerialization';

function saveChordDiagram(chord: ChordDiagram): Promise<void> {
  // Validate before saving
  const validation = validateChordDiagram(chord);
  if (!validation.isValid) {
    throw new Error(`Cannot save invalid chord: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  // Serialize to JSON
  const json = serializeChordDiagram(chord, {
    includeMetadata: true,
    includeAlternatives: true,
    validate: true
  });
  
  // Save to storage (implementation depends on your storage system)
  return saveToStorage(chord.id, json);
}

async function loadChordDiagram(id: string): Promise<ChordDiagram> {
  const json = await loadFromStorage(id);
  return deserializeChordDiagram(json, {
    validate: true,
    fillDefaults: true
  });
}
```

### Compact Storage for Large Collections

```typescript
import { toCompactFormat, fromCompactFormat } from '../services/chordDiagramSerialization';

function saveCompactCollection(chords: ChordDiagram[]): string[] {
  return chords.map(chord => {
    // Use compact format for basic chords
    if (chord.alternatives.length === 0 && !chord.barre) {
      return toCompactFormat(chord);
    }
    // Use full JSON for complex chords
    return serializeChordDiagram(chord);
  });
}
```

## Testing New Chord Diagrams

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('Custom Chord Diagrams', () => {
  it('should create valid jazz chord', () => {
    const cmaj7 = createChordDiagram('Cmaj7', 'guitar', [
      { stringNumber: 1, fret: 0, finger: 0 },
      { stringNumber: 2, fret: 0, finger: 0 },
      { stringNumber: 3, fret: 0, finger: 0 },
      { stringNumber: 4, fret: 2, finger: 2 },
      { stringNumber: 5, fret: 3, finger: 3 },
      { stringNumber: 6, fret: -1, finger: -1 }
    ]);
    
    const validation = validateChordDiagram(cmaj7);
    expect(validation.isValid).toBe(true);
    expect(cmaj7.name).toBe('Cmaj7');
  });
  
  it('should handle alternative fingerings', () => {
    const chord = createChordDiagram('F', 'guitar', []);
    const withAlt = addAlternativeFingering(chord, [], 'Alternative');
    
    expect(withAlt.alternatives).toHaveLength(1);
    expect(withAlt.alternatives[0].description).toBe('Alternative');
  });
});
```

### Integration Testing

```typescript
function testChordInContext(chord: ChordDiagram): boolean {
  // Test serialization round-trip
  const json = serializeChordDiagram(chord);
  const restored = deserializeChordDiagram(json);
  
  if (JSON.stringify(chord.positions) !== JSON.stringify(restored.positions)) {
    console.error('Serialization round-trip failed');
    return false;
  }
  
  // Test validation
  const validation = validateChordDiagram(chord);
  if (!validation.isValid) {
    console.error('Validation failed:', validation.errors);
    return false;
  }
  
  // Test compatibility with existing systems
  const tab = chordDiagramToTab(chord);
  if (!tab || tab.length !== chord.instrument.stringCount) {
    console.error('Tab conversion failed');
    return false;
  }
  
  return true;
}
```

## Common Patterns and Best Practices

### 1. Finger Optimization

```typescript
function optimizeFingerAssignments(positions: StringPosition[]): StringPosition[] {
  const frettedPositions = positions.filter(p => p.fret > 0);
  
  // Sort by fret to assign fingers logically
  frettedPositions.sort((a, b) => a.fret - b.fret);
  
  let fingerCounter = 1;
  let lastFret = -1;
  
  frettedPositions.forEach(pos => {
    if (pos.fret !== lastFret) {
      lastFret = pos.fret;
    }
    pos.finger = fingerCounter as any;
    if (pos.fret !== lastFret) {
      fingerCounter++;
    }
  });
  
  return positions;
}
```

### 2. Automatic Difficulty Assessment

```typescript
function assessDifficultyAutomatically(chord: ChordDiagram): DifficultyLevel {
  let score = 0;
  
  // Barre chords are automatically intermediate+
  if (chord.barre) score += 30;
  
  // Check finger stretch
  const frettedPositions = chord.positions.filter(p => p.fret > 0);
  if (frettedPositions.length > 0) {
    const frets = frettedPositions.map(p => p.fret);
    const stretch = Math.max(...frets) - Math.min(...frets);
    score += stretch * 10;
  }
  
  // High fret positions
  const highFrets = frettedPositions.filter(p => p.fret > 7);
  score += highFrets.length * 10;
  
  // Number of fingers used
  const fingersUsed = new Set(frettedPositions.map(p => p.finger)).size;
  score += fingersUsed * 5;
  
  if (score < 10) return 'beginner';
  if (score < 30) return 'intermediate';
  if (score < 50) return 'advanced';
  return 'expert';
}
```

### 3. Error Recovery

```typescript
function createChordWithFallback(
  name: string, 
  instrument: InstrumentType, 
  positions: StringPosition[]
): ChordDiagram {
  try {
    const chord = createChordDiagram(name, instrument, positions);
    const validation = validateChordDiagram(chord);
    
    if (!validation.isValid) {
      // Try to fix common issues
      const fixed = attemptAutoFix(chord, validation.errors);
      if (fixed) return fixed;
      
      // Fall back to simplified version
      return createSimplifiedChord(name, instrument);
    }
    
    return chord;
  } catch (error) {
    console.warn(`Failed to create chord ${name}, using fallback`);
    return createSimplifiedChord(name, instrument);
  }
}

function attemptAutoFix(chord: ChordDiagram, errors: ChordDiagramValidationError[]): ChordDiagram | null {
  // Implement automatic fixes for common issues
  // This is a simplified example
  
  for (const error of errors) {
    if (error.type === 'invalid_finger') {
      // Try to reassign fingers automatically
      chord.positions = optimizeFingerAssignments(chord.positions);
      
      const revalidation = validateChordDiagram(chord);
      if (revalidation.isValid) return chord;
    }
  }
  
  return null;
}
```

## Migration from Existing Systems

### Converting from Simple Chord Format

```typescript
function migrateFromSimpleChord(oldChord: { name: string; fingering: string }): ChordDiagram {
  // Parse the old fingering format (e.g., "320003" for C major)
  const positions = parseFingeringString(oldChord.fingering, 'guitar');
  
  return createChordDiagram(oldChord.name, 'guitar', positions);
}

function parseFingeringString(fingering: string, instrument: InstrumentType): StringPosition[] {
  const config = INSTRUMENT_CONFIGS[instrument];
  const positions: StringPosition[] = [];
  
  for (let i = 0; i < Math.min(fingering.length, config.stringCount); i++) {
    const char = fingering[i];
    let fret: number;
    let finger: number;
    
    if (char === 'x' || char === 'X') {
      fret = -1;
      finger = -1;
    } else if (char === '0') {
      fret = 0;
      finger = 0;
    } else {
      fret = parseInt(char, 10);
      finger = 1; // Will be optimized later
    }
    
    positions.push({
      stringNumber: i + 1,
      fret,
      finger: finger as any
    });
  }
  
  return optimizeFingerAssignments(positions);
}
```

This developer guide provides comprehensive instructions for creating, validating, and integrating new chord diagrams into the ChordMe system. Follow these patterns and best practices to ensure high-quality, maintainable chord diagram implementations.