# Alternative Tuning Support - ChordMe

This document describes the comprehensive alternative tuning system implemented in ChordMe, providing support for 13+ common guitar tunings, automatic chord diagram adaptation, and tuning-specific chord libraries.

## Overview

The alternative tuning system consists of several key components:

- **TuningService**: Core service for managing tunings and chord conversions
- **TuningSelector Component**: React UI component for tuning selection and management
- **TuningChordService**: Extension service providing tuning-specific chord libraries
- **Enhanced ChordDiagram Types**: Extended type definitions supporting alternative tunings

## Supported Tunings

### Standard Tunings
- **Standard Tuning (EADGBE)**: The most common guitar tuning
- **Half Step Down (Eb Ab Db Gb Bb Eb)**: All strings lowered by one semitone
- **Whole Step Down (DGCFAD)**: All strings lowered by one whole tone

### Drop Tunings
- **Drop D (DADGBE)**: Low E string dropped to D
- **Drop C (CGCFAD)**: Drop D tuning lowered by one whole tone
- **Drop B (BF#BEGC#)**: Very low tuning for heavy genres
- **Double Drop D (DADGBD)**: Both E strings dropped to D

### Open Tunings
- **Open G (DGDGBD)**: Tuned to G major chord
- **Open D (DADF#AD)**: Tuned to D major chord
- **Open C (CGCGCE)**: Tuned to C major chord
- **Open E (EBEG#BE)**: Tuned to E major chord

### Modal/Folk Tunings
- **DADGAD**: Celtic and folk tuning with rich open chord voicings

### Custom Tunings
- User-defined custom tunings with full validation and management

## Core Features

### 1. Automatic Chord Conversion

The system can automatically convert chord diagrams between different tunings:

```typescript
import { tuningService } from './services/tuningService';

const standardTuning = tuningService.getStandardTuning('guitar');
const dropDTuning = tuningService.getTuningByPreset('drop_d', 'guitar');

const conversion = tuningService.convertChordBetweenTunings(
  cMajorChord,
  standardTuning,
  dropDTuning,
  {
    allowCapo: true,
    maxCapoPosition: 7,
    preferSimpleFingering: true
  }
);

if (conversion.success) {
  console.log(`Conversion confidence: ${conversion.confidence}%`);
  console.log(`Notes: ${conversion.notes.join('; ')}`);
}
```

### 2. Capo Position Calculation

Intelligent capo positioning for optimal chord voicings:

```typescript
const capoCalculation = tuningService.calculateOptimalCapo(
  chordPositions,
  fromTuning,
  toTuning,
  maxCapoPosition
);

console.log(`Recommended capo position: ${capoCalculation.position}`);
console.log(`Achieves chord: ${capoCalculation.achievesChord}`);
```

### 3. Smart Tuning Suggestions

Context-aware tuning recommendations based on musical style and user preferences:

```typescript
const suggestions = tuningService.suggestTunings({
  genre: 'blues',
  preferredDifficulty: 'medium',
  currentTuning: standardTuning,
  instrument: 'guitar'
});

suggestions.forEach(suggestion => {
  console.log(`${suggestion.tuning.name}: ${suggestion.reason}`);
  console.log(`Confidence: ${suggestion.confidence}%`);
});
```

### 4. Tuning Comparison and Analysis

Compare tunings to understand their relationships:

```typescript
const comparison = tuningService.compareTunings(tuning1, tuning2);

console.log(`Similarity: ${comparison.similarity}%`);
console.log(`Matching strings: ${comparison.matchingStrings.join(', ')}`);
console.log(`Conversion difficulty: ${comparison.conversionDifficulty}`);
```

## TuningSelector Component

The TuningSelector component provides a complete UI for tuning management:

### Basic Usage

```tsx
import { TuningSelector } from './components/TuningSelector';

function MyComponent() {
  const [currentTuning, setCurrentTuning] = useState(null);

  return (
    <TuningSelector
      instrument="guitar"
      currentTuning={currentTuning}
      onTuningChange={setCurrentTuning}
      showSuggestions={true}
      genre="rock"
      preferredDifficulty="medium"
    />
  );
}
```

### Features

- **Visual Tuning Display**: Shows current tuning with note layout
- **Search and Filtering**: Find tunings by name, genre, or description
- **Smart Suggestions**: Context-aware tuning recommendations
- **Custom Tuning Creation**: Modal interface for creating custom tunings
- **Artist Information**: Shows notable artists who use each tuning
- **Difficulty Indicators**: Visual difficulty ratings for each tuning
- **Responsive Design**: Works on desktop and mobile devices

### Props

| Prop | Type | Description |
|------|------|-------------|
| `instrument` | `InstrumentType` | Current instrument (guitar, ukulele, mandolin) |
| `currentTuning` | `TuningInfo` | Currently selected tuning |
| `onTuningChange` | `(tuning: TuningInfo) => void` | Callback when tuning changes |
| `showSuggestions` | `boolean` | Whether to show tuning suggestions |
| `genre` | `string` | Music genre for suggestions |
| `preferredDifficulty` | `'easy' \| 'medium' \| 'hard'` | User's preferred difficulty |
| `disabled` | `boolean` | Whether the selector is disabled |
| `className` | `string` | Additional CSS classes |

## Tuning-Specific Chord Libraries

The TuningChordService provides chord libraries optimized for specific tunings:

### Getting Chord Recommendations

```typescript
import { tuningChordService } from './services/tuningChordService';

const recommendations = tuningChordService.getChordRecommendationsForTuning(
  dropDTuning,
  {
    chordTypes: ['power', 'minor'],
    difficulty: 'beginner',
    genre: 'metal',
    maxResults: 5
  }
);

recommendations.forEach(rec => {
  console.log(`${rec.chord.name}: ${rec.reason}`);
  console.log(`Benefits: ${rec.benefits.join(', ')}`);
});
```

### Chord Progressions

Get progressions that work well in specific tunings:

```typescript
const progressions = tuningChordService.getProgressionsForTuning(
  dadgadTuning,
  {
    genre: 'folk',
    difficulty: 'intermediate'
  }
);

progressions.forEach(progression => {
  console.log(`${progression.name}: ${progression.chords.join(' - ')}`);
  console.log(`Why it works: ${progression.reason}`);
});
```

## Integration with Transposition

The tuning system integrates seamlessly with ChordMe's existing transposition features:

### Transposing with Tuning Awareness

```typescript
import { transposeChordDiagramToTuning } from './services/chordDiagramUtils';

const transposedChord = transposeChordDiagramToTuning(
  originalChord,
  targetTuning.notes,
  {
    allowCapo: true,
    maxCapoPosition: 5
  }
);
```

### Key Signature Integration

The system respects key signatures when suggesting enharmonic equivalents:

```typescript
// In key of Bb, suggests flat names for converted chords
const converted = adaptChordForTuning(chord, tuning, { keySignature: 'Bb' });
```

## Custom Tuning Creation

Users can create and manage custom tunings:

### Creating Custom Tunings

```typescript
const customTuning = tuningService.createCustomTuning(
  'My Metal Tuning',
  'Extended range tuning for progressive metal',
  ['B', 'E', 'A', 'D', 'G', 'B'],
  'guitar',
  {
    genres: ['metal', 'progressive'],
    difficulty: 'hard',
    createdBy: 'user123'
  }
);
```

### Validation

Custom tunings are validated for:
- Valid note names
- Appropriate string tension ranges
- Reasonable tuning intervals
- Duplicate prevention

## Performance Considerations

The tuning system is optimized for performance:

- **Lazy Loading**: Chord libraries loaded on demand
- **Caching**: Frequently accessed tunings cached in memory
- **Efficient Algorithms**: Optimized conversion algorithms with O(n) complexity
- **Minimal Re-renders**: React components optimized with useMemo and useCallback

## Testing

Comprehensive test coverage ensures reliability:

- **Unit Tests**: Core algorithms and functions
- **Integration Tests**: Service interactions
- **Component Tests**: UI component behavior
- **Performance Tests**: Algorithm efficiency under load

### Running Tests

```bash
# Run tuning service tests
npm run test src/services/tuningService.test.ts

# Run component tests
npm run test src/components/TuningSelector/TuningSelector.test.tsx

# Run all tuning-related tests
npm run test -- --testNamePattern="tuning"
```

## Localization Support

The tuning system supports internationalization:

### Tuning Names

```typescript
const tuning = {
  localization: {
    names: {
      en: 'Drop D',
      es: 'Drop D',
      fr: 'Ré Grave',
      de: 'Dropped D'
    },
    descriptions: {
      en: 'Lower the low E string to D for heavier sound',
      es: 'Baja la cuerda Mi grave a Re para un sonido más pesado'
    }
  }
};
```

### Adding New Languages

1. Update `COMMON_GUITAR_TUNINGS` in `types/tuning.ts`
2. Add translations for component text
3. Update documentation

## Common Use Cases

### 1. Genre-Specific Setup

```typescript
// Setup for metal music
const metalTunings = tuningService.suggestTunings({
  genre: 'metal',
  preferredDifficulty: 'medium'
});

// Get power chord recommendations
const powerChords = tuningChordService.getChordRecommendationsForTuning(
  metalTunings[0].tuning,
  { chordTypes: ['power'], maxResults: 10 }
);
```

### 2. Beginner-Friendly Tunings

```typescript
// Find easy tunings for beginners
const beginnerTunings = tuningService.getAllTunings('guitar')
  .filter(tuning => tuning.difficulty === 'easy')
  .sort((a, b) => b.metadata.popularityScore - a.metadata.popularityScore);
```

### 3. Slide Guitar Setup

```typescript
// Get open tunings suitable for slide guitar
const slideTunings = tuningService.getAllTunings('guitar')
  .filter(tuning => tuning.genres.includes('slide guitar'));

const slideProgressions = tuningChordService.getProgressionsForTuning(
  slideTunings[0],
  { genre: 'blues' }
);
```

## API Reference

### TuningService

| Method | Description |
|--------|-------------|
| `getAllTunings(instrument)` | Get all available tunings for an instrument |
| `getTuningByPreset(preset, instrument)` | Get a specific tuning by preset name |
| `getStandardTuning(instrument)` | Get the standard tuning for an instrument |
| `createCustomTuning(...)` | Create a new custom tuning |
| `convertChordBetweenTunings(...)` | Convert chord between tunings |
| `calculateOptimalCapo(...)` | Calculate optimal capo position |
| `compareTunings(tuning1, tuning2)` | Compare two tunings |
| `suggestTunings(criteria)` | Get tuning suggestions based on criteria |

### TuningChordService

| Method | Description |
|--------|-------------|
| `getChordRecommendationsForTuning(...)` | Get chord recommendations for a tuning |
| `getProgressionsForTuning(...)` | Get chord progressions for a tuning |
| `adaptChordForTuning(...)` | Adapt a chord for a specific tuning |
| `getSignatureChords(tuning)` | Get signature chords for a tuning |
| `findAlternativeVoicings(...)` | Find alternative chord voicings |

## Best Practices

### 1. Performance

- Use `useMemo` for expensive tuning calculations
- Cache tuning recommendations in component state
- Debounce search inputs to avoid excessive filtering

### 2. User Experience

- Provide clear visual feedback during tuning changes
- Show confidence scores for chord conversions
- Explain why certain tunings are recommended

### 3. Accessibility

- Include proper ARIA labels for tuning selectors
- Support keyboard navigation
- Provide audio feedback for tuning changes (future enhancement)

## Future Enhancements

Planned improvements to the tuning system:

1. **Audio Tuning Reference**: Play tuning notes for reference
2. **Automatic Tuner Integration**: Connect with web audio API for tuning assistance
3. **Machine Learning Recommendations**: Improve suggestions based on user behavior
4. **Tablature Integration**: Show tablature in alternative tunings
5. **Chord Voicing Analysis**: Analyze voice leading between chord changes
6. **Community Contributions**: Allow users to share custom tuning libraries
7. **Extended Instruments**: Support for bass guitar, banjo, and other stringed instruments

## Troubleshooting

### Common Issues

**Issue**: Chord conversion produces poor results
**Solution**: Try enabling capo mode or check if a tuning-specific version exists

**Issue**: Custom tuning won't save
**Solution**: Verify all string notes are valid and tuning name is unique

**Issue**: Suggestions seem irrelevant
**Solution**: Check genre and difficulty settings, provide more specific criteria

**Issue**: Component performance is slow
**Solution**: Reduce maxResults in tuning queries, implement search debouncing

### Support

For additional help with the alternative tuning system:

1. Check the component tests for usage examples
2. Review the service documentation in source files
3. Examine the tuning type definitions for data structure details
4. Refer to existing chord diagram utilities for integration patterns

---

This alternative tuning system provides a comprehensive foundation for advanced guitar playing techniques and musical exploration within ChordMe. The modular design allows for easy extension and customization while maintaining high performance and user experience standards.