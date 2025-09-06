---
layout: default
title: Chord Transposition Examples
---

# Chord Transposition Examples

This document provides practical examples of the enhanced chord transposition algorithm in ChordMe, demonstrating various features and use cases.

## Basic Transposition Examples

### Simple Major and Minor Chords

```typescript
// Basic major chords
transposeChord('C', 2)      // 'D'
transposeChord('G', 1)      // 'G#'
transposeChord('F', 4)      // 'A'

// Basic minor chords  
transposeChord('Am', 3)     // 'Cm'
transposeChord('Em', -2)    // 'Dm'
transposeChord('Bm', 5)     // 'Em'
```

### Complex Chords with Extensions

```typescript
// 7th chords
transposeChord('Cmaj7', 2)  // 'Dmaj7'
transposeChord('Am7', 4)    // 'C#m7'
transposeChord('G7', -1)    // 'F#7'

// Suspended chords
transposeChord('Csus4', 3)  // 'D#sus4'
transposeChord('Fsus2', -2) // 'Ebsus2'

// Extended chords
transposeChord('Dm9', 5)    // 'Gm9'
transposeChord('C13', 1)    // 'C#13'
```

## Key Signature Aware Transposition

### Sharp Keys Examples

Sharp keys (G, D, A, E, B, F#) prefer sharp accidentals:

```typescript
// G major (1 sharp): F#
transposeChordWithKey('C', 1, 'G')    // 'C#' (preferred over 'Db')
transposeChordWithKey('F', 1, 'G')    // 'F#' (natural choice)
transposeChordWithKey('A', 1, 'G')    // 'A#' (preferred over 'Bb')

// D major (2 sharps): F#, C#  
transposeChordWithKey('C', 1, 'D')    // 'C#'
transposeChordWithKey('G', 1, 'D')    // 'G#' (preferred over 'Ab')

// E major (4 sharps): F#, C#, G#, D#
transposeChordWithKey('A', 1, 'E')    // 'A#' (preferred over 'Bb')
transposeChordWithKey('C', 3, 'E')    // 'D#' (preferred over 'Eb')
```

### Flat Keys Examples

Flat keys (F, Bb, Eb, Ab, Db, Gb) prefer flat accidentals:

```typescript
// F major (1 flat): Bb
transposeChordWithKey('A', 1, 'F')    // 'Bb' (natural choice)
transposeChordWithKey('C', 1, 'F')    // 'Db' (preferred over 'C#')
transposeChordWithKey('G', 1, 'F')    // 'Ab' (preferred over 'G#')

// Bb major (2 flats): Bb, Eb
transposeChordWithKey('C', 1, 'Bb')   // 'Db' (preferred over 'C#')
transposeChordWithKey('F', 1, 'Bb')   // 'Gb' (preferred over 'F#')

// Eb major (3 flats): Bb, Eb, Ab
transposeChordWithKey('A', 1, 'Eb')   // 'Bb'
transposeChordWithKey('D', 1, 'Eb')   // 'Eb'
transposeChordWithKey('G', 1, 'Eb')   // 'Ab'
```

### Minor Keys Follow Relative Major

Minor keys use the same key signature as their relative major:

```typescript
// Em (relative to G major - 1 sharp)
transposeChordWithKey('C', 1, 'Em')   // 'C#' (sharp preference)

// Dm (relative to F major - 1 flat)  
transposeChordWithKey('C', 1, 'Dm')   // 'Db' (flat preference)

// Am (relative to C major - no accidentals)
transposeChordWithKey('C', 1, 'Am')   // 'C#' (default sharp preference)
```

## Slash Chord Transposition

### Maintaining Harmonic Relationships

The enhanced algorithm transposes both root and bass notes to preserve intervallic relationships:

```typescript
// Major third relationships (root to bass)
transposeChord('C/E', 2)      // 'D/F#' (both up 2 semitones)
transposeChord('F/A', 1)      // 'F#/A#' (preserves major third)
transposeChord('G/B', -1)     // 'F#/A#' (maintains interval)

// Perfect fifth relationships
transposeChord('C/G', 3)      // 'D#/A#' (both up 3 semitones) 
transposeChord('F/C', -2)     // 'Eb/Bb' (preserves fifth)

// Complex slash chords
transposeChord('Am/C', 4)     // 'C#m/E' (minor third preserved)
transposeChord('Dm/F', -3)    // 'Bm/D' (maintains relationship)
```

### Key Signature Aware Slash Chords

```typescript
// Sharp key context
transposeChordWithKey('C/E', 2, 'G')   // 'D/F#' (both use sharp preference)
transposeChordWithKey('F/A', 1, 'D')   // 'F#/A#' (consistent with D major)

// Flat key context  
transposeChordWithKey('C/E', 2, 'F')   // 'D/Gb' (both use flat preference)
transposeChordWithKey('G/B', 1, 'Bb')  // 'Ab/C' (consistent with Bb major)
```

## ChordPro Content Transposition

### Auto-Detection of Key Signature

```typescript
const content1 = `{title: Amazing Grace}
{key: G}
{artist: John Newton}

[G]Amazing [C]grace, how [Em]sweet the [C]sound
[G]That saved a [D]wretch like [G]me`;

// Transposes up 2 semitones with G major preferences
const result1 = transposeChordProContentWithKey(content1, 2);
// Result uses sharp preferences due to G major key signature:
// [A]Amazing [D]grace, how [F#m]sweet the [D]sound  
// [A]That saved a [E]wretch like [A]me
```

```typescript
const content2 = `{title: Let It Be}
{key: F}
{artist: The Beatles}

[F]When I find myself in [C]times of trouble
[Dm]Mother Mary [Bb]comes to me`;

// Transposes up 1 semitone with F major preferences
const result2 = transposeChordProContentWithKey(content2, 1);
// Result uses flat preferences due to F major key signature:
// [Gb]When I find myself in [Db]times of trouble
// [Ebm]Mother Mary [B]comes to me
```

### Manual Key Signature Override

```typescript
const content = `[C]Some [G]content [Am]without [F]key`;

// Force sharp preferences
const sharpResult = transposeChordProContentWithKey(content, 1, 'G');
// [C#]Some [G#]content [A#m]without [F#]key

// Force flat preferences  
const flatResult = transposeChordProContentWithKey(content, 1, 'F');
// [Db]Some [Ab]content [Bbm]without [Gb]key
```

## Notation System Conversion

### American to Latin Notation

```typescript
// Basic transposition with Latin output
transposeChordIntelligent('C', 2, { notationSystem: 'latin' });    // 'Re'
transposeChordIntelligent('F', -1, { notationSystem: 'latin' });   // 'Mi'
transposeChordIntelligent('G', 4, { notationSystem: 'latin' });    // 'Si'

// Complex chords with Latin notation
transposeChordIntelligent('Am7', 3, { notationSystem: 'latin' });  // 'Dom7'
transposeChordIntelligent('Fsus4', 2, { notationSystem: 'latin' }); // 'Solsus4'
```

### Content Transposition with Notation Conversion

```typescript
const content = `{title: Canción}
[C]Do, [D]Re, [E]Mi, [F]Fa
[G]Sol, [A]La, [B]Si, [C]Do`;

const latinResult = transposeChordProContentWithKey(content, 0, null, 'latin');
// [Do]Do, [Re]Re, [Mi]Mi, [Fa]Fa
// [Sol]Sol, [La]La, [Si]Si, [Do]Do
```

## Advanced Transposition Options

### Preserving Original Enharmonic Style

```typescript
// Maintain flat style from original
transposeChordIntelligent('Bb', 1, { preserveEnharmonics: true });     // 'B'
transposeChordIntelligent('Ebm', 2, { preserveEnharmonics: true });    // 'Fm'
transposeChordIntelligent('Abmaj7', -1, { preserveEnharmonics: true }); // 'Gmaj7'

// Maintain sharp style from original
transposeChordIntelligent('C#', 1, { preserveEnharmonics: true });     // 'D'
transposeChordIntelligent('F#m', 2, { preserveEnharmonics: true });    // 'G#m'
transposeChordIntelligent('A#dim', -1, { preserveEnharmonics: true }); // 'Adim'
```

### Forcing Accidental Preferences

```typescript
// Force flat accidentals regardless of key
transposeChordIntelligent('C', 1, { preferredAccidentals: 'flats' });  // 'Db'
transposeChordIntelligent('F', 1, { preferredAccidentals: 'flats' });  // 'Gb'
transposeChordIntelligent('A', 1, { preferredAccidentals: 'flats' });  // 'Bb'

// Force sharp accidentals regardless of key
transposeChordIntelligent('C', 1, { preferredAccidentals: 'sharps' }); // 'C#'
transposeChordIntelligent('F', 1, { preferredAccidentals: 'sharps' }); // 'F#'
transposeChordIntelligent('A', 1, { preferredAccidentals: 'sharps' }); // 'A#'
```

### Combined Advanced Options

```typescript
// Complex example: Latin notation with flat preference and key context
const options = {
  keySignature: 'F',
  notationSystem: 'latin' as const,
  preferredAccidentals: 'flats' as const
};

transposeChordIntelligent('C', 1, options);     // 'Réb' (if implemented)
transposeChordIntelligent('Am', 3, options);   // 'Dom' (C major in Latin)
```

## Edge Cases and Error Handling

### Large Semitone Values

```typescript
// Algorithm handles wrap-around automatically
transposeChord('C', 12);    // 'C' (full octave)
transposeChord('C', 13);    // 'C#' (octave + 1)
transposeChord('C', -12);   // 'C' (octave down)
transposeChord('C', 15);    // 'D#' (15 % 12 = 3)
transposeChord('C', -15);   // 'A' (equivalent to +9)
```

### Invalid Inputs

```typescript
// Invalid chords return unchanged
transposeChord('', 2);        // ''
transposeChord('invalid', 2); // 'invalid'
transposeChord('H', 2);       // 'H' (invalid note)

// Zero transposition
transposeChord('C', 0);       // 'C'
transposeChord('Am7', 0);     // 'Am7'
```

### Unknown Key Signatures

```typescript
// Unknown keys default to sharp preference
transposeChordWithKey('C', 1, 'InvalidKey');  // 'C#'
transposeChordWithKey('C', 1, '');            // 'C#'
transposeChordWithKey('C', 1, null);          // 'C#'
```

## Performance Examples

### Batch Processing

```typescript
const chords = ['C', 'Am', 'F', 'G', 'Em', 'Dm'];
const semitones = 2;
const keySignature = 'F'; // Flat preference

const transposed = chords.map(chord => 
  transposeChordWithKey(chord, semitones, keySignature)
);
// Result: ['D', 'Bm', 'G', 'A', 'Gbm', 'Em']
// Note: Uses flat preferences where applicable
```

### Large Content Processing

```typescript
const largeSong = `{title: Complex Song}
{key: Bb}

{start_of_verse}
[Bb]Verse with [F]many [Gm]chords and [Eb]progressions
[Cm]Including [F7]seventh [Bb/D]slash [Eb]chords
{end_of_verse}

{start_of_chorus}  
[Eb]Chorus [Bb/F]section [F]with [Gm]more [Cm]complexity
[F]Leading [Bb]back to [Eb]verse
{end_of_chorus}`;

// Efficiently processes all chords while preserving structure
const transposed = transposeChordProContentWithKey(largeSong, 2);
// All chords transposed with Bb major flat preferences
```

## Real-World Use Cases

### Capo Simulation

```typescript
// Simulating capo on 2nd fret (transpose down 2, play with capo)
const originalKey = 'D'; // Song in D major
const capoFret = 2;
const newChords = transposeChordWithKey('D', -capoFret, 'D'); // 'C'

// Original: [D] [A] [Bm] [G]
// With capo: [C] [G] [Am] [F] (play these shapes with capo on 2nd fret)
```

### Singer Range Adjustment

```typescript
// Adjusting for vocalist range
const originalContent = `{key: G}
[G]Amazing [C]grace [Em]how [C]sweet [G]the sound`;

// Too high for singer - transpose down 3 semitones
const lowerKey = transposeChordProContentWithKey(originalContent, -3);
// Result in Eb major: [Eb]Amazing [Ab]grace [Cm]how [Ab]sweet [Eb]the sound
```

### Instrument Transposition

```typescript
// Bb instruments (trumpet, tenor sax) read 2 semitones higher
const concertPitch = `[C] [F] [G] [C]`; // Piano part
const bbInstrument = transposeChordProContent(concertPitch, 2);
// Result: [D] [G] [A] [D] (what Bb instrument reads)

// Eb instruments (alto sax) read 9 semitones higher (or 3 lower)
const ebInstrument = transposeChordProContent(concertPitch, -3);
// Result: [A] [D] [E] [A] (what Eb instrument reads)
```

These examples demonstrate the flexibility and power of the enhanced chord transposition algorithm, showing how it handles real-world musical scenarios while maintaining theoretical accuracy.