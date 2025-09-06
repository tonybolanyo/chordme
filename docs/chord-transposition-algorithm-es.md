---
layout: default
lang: es
title: Algoritmo de Transposición de Acordes
---

# Algoritmo de Transposición de Acordes Mejorado

## Resumen

El algoritmo de transposición de acordes mejorado en ChordMe proporciona transposición inteligente de acordes consciente de la teoría musical con selección enarmónica, detección de tonalidad y soporte para sistemas de notación múltiples.

## Características Clave

### 1. Selección Enarmónica Inteligente

El algoritmo selecciona automáticamente la ortografía enarmónica más apropiada basándose en:
- **Contexto de tonalidad**: Prefiere sostenidos en tonalidades con sostenidos, bemoles en tonalidades con bemoles
- **Dirección melódica**: Mantiene patrones lógicos de movimiento
- **Convenciones instrumentales**: Considera las preferencias del instrumento
- **Legibilidad**: Evita dobles alteraciones cuando es posible

### 2. Detección Automática de Tonalidad

```typescript
class KeyDetector {
  detectKey(chords: string[]): KeySignature {
    // Analizar frecuencia de notas fundamentales
    const noteFrequency = this.analyzeNoteFrequency(chords);
    
    // Identificar centro tonal
    const tonicCandidates = this.findTonicCandidates(noteFrequency);
    
    // Determinar modo (mayor/menor)
    const mode = this.analyzeMode(chords, tonicCandidates);
    
    // Calcular firma de tonalidad
    return this.generateKeySignature(tonicCandidates[0], mode);
  }
  
  private analyzeNoteFrequency(chords: string[]): Map<string, number> {
    const frequency = new Map<string, number>();
    
    chords.forEach(chord => {
      const root = this.extractRoot(chord);
      frequency.set(root, (frequency.get(root) || 0) + 1);
    });
    
    return frequency;
  }
  
  private findTonicCandidates(frequency: Map<string, number>): string[] {
    // Ordenar notas por frecuencia
    const sorted = Array.from(frequency.entries())
      .sort(([,a], [,b]) => b - a);
    
    // Analizar relaciones de quinta
    const fifthRelations = this.analyzeCircleOfFifths(sorted);
    
    return this.rankTonicCandidates(sorted, fifthRelations);
  }
}
```

### 3. Transposición Contextual

```typescript
class ContextualTransposer {
  transpose(chord: string, semitones: number, context: TranspositionContext): string {
    const components = this.parseChord(chord);
    
    // Transponer nota fundamental
    const newRoot = this.transposeNote(
      components.root, 
      semitones, 
      context.keySignature,
      context.enharmonicPreference
    );
    
    // Transponer nota del bajo si existe
    const newBass = components.bass ? 
      this.transposeNote(components.bass, semitones, context.keySignature) : null;
    
    // Reconstruir acorde
    return this.reconstructChord({
      root: newRoot,
      quality: components.quality,
      extensions: components.extensions,
      bass: newBass
    });
  }
  
  private transposeNote(
    note: string, 
    semitones: number, 
    keySignature: KeySignature,
    preference?: EnharmonicPreference
  ): string {
    const noteValue = this.noteToSemitones(note);
    const newValue = (noteValue + semitones + 12) % 12;
    
    // Obtener opciones enarmónicas
    const enharmonicOptions = this.getEnharmonicOptions(newValue);
    
    // Seleccionar la mejor opción
    return this.selectBestEnharmonic(
      enharmonicOptions,
      keySignature,
      preference
    );
  }
  
  private selectBestEnharmonic(
    options: string[],
    keySignature: KeySignature,
    preference?: EnharmonicPreference
  ): string {
    // Prioridad 1: Notas en la tonalidad
    const inKey = options.filter(note => 
      keySignature.naturalNotes.includes(this.getNaturalNote(note))
    );
    if (inKey.length > 0) {
      return this.selectByPreference(inKey, preference);
    }
    
    // Prioridad 2: Alteraciones consistentes con la tonalidad
    const consistentAccidentals = options.filter(note => {
      const accidental = this.getAccidental(note);
      return accidental === keySignature.accidentalType;
    });
    if (consistentAccidentals.length > 0) {
      return this.selectByPreference(consistentAccidentals, preference);
    }
    
    // Prioridad 3: Preferencia por defecto (evitar dobles alteraciones)
    return this.selectSimplestSpelling(options);
  }
}
```

### 4. Soporte Multi-Sistema de Notación

```typescript
interface NotationSystem {
  id: string;
  name: string;
  notes: string[];
  accidentalSymbols: {
    sharp: string;
    flat: string;
    natural: string;
  };
}

const NOTATION_SYSTEMS: Record<string, NotationSystem> = {
  english: {
    id: 'english',
    name: 'English',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    accidentalSymbols: { sharp: '#', flat: 'b', natural: '♮' }
  },
  
  latin: {
    id: 'latin',
    name: 'Latino',
    notes: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
    accidentalSymbols: { sharp: '#', flat: 'b', natural: '♮' }
  },
  
  german: {
    id: 'german', 
    name: 'Alemán',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'H'],
    accidentalSymbols: { sharp: '#', flat: 'b', natural: '♮' }
  },
  
  french: {
    id: 'french',
    name: 'Francés', 
    notes: ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
    accidentalSymbols: { sharp: '#', flat: 'b', natural: '♮' }
  }
};

class NotationSystemConverter {
  convert(
    chord: string, 
    fromSystem: string, 
    toSystem: string
  ): string {
    if (fromSystem === toSystem) return chord;
    
    const from = NOTATION_SYSTEMS[fromSystem];
    const to = NOTATION_SYSTEMS[toSystem];
    
    if (!from || !to) {
      throw new Error(`Sistema de notación no soportado`);
    }
    
    return this.performConversion(chord, from, to);
  }
  
  private performConversion(
    chord: string,
    from: NotationSystem,
    to: NotationSystem
  ): string {
    const components = this.parseChordWithSystem(chord, from);
    
    // Convertir nota fundamental
    const convertedRoot = this.convertNote(components.root, from, to);
    
    // Convertir nota del bajo si existe
    const convertedBass = components.bass ? 
      this.convertNote(components.bass, from, to) : null;
    
    // Reconstruir acorde en el nuevo sistema
    return this.reconstructChordInSystem({
      root: convertedRoot,
      quality: components.quality,
      extensions: components.extensions,
      bass: convertedBass
    }, to);
  }
  
  private convertNote(
    note: string,
    from: NotationSystem,
    to: NotationSystem
  ): string {
    // Encontrar índice en sistema origen
    const noteWithoutAccidental = this.stripAccidentals(note);
    const accidentals = this.extractAccidentals(note);
    
    const fromIndex = from.notes.findIndex(n => n === noteWithoutAccidental);
    if (fromIndex === -1) {
      throw new Error(`Nota no válida en sistema ${from.name}: ${note}`);
    }
    
    // Mapear al sistema destino
    const toNote = to.notes[fromIndex];
    
    // Convertir alteraciones
    const convertedAccidentals = this.convertAccidentals(accidentals, from, to);
    
    return toNote + convertedAccidentals;
  }
}
```

### 5. Algoritmo de Transposición Principal

```typescript
class EnhancedTransposer {
  transpose(
    content: string, 
    semitones: number, 
    options: TranspositionOptions = {}
  ): TranspositionResult {
    // Detectar tonalidad actual si no se proporciona
    const currentKey = options.currentKey || this.detectKey(content);
    
    // Calcular nueva tonalidad
    const newKey = this.transposeKey(currentKey, semitones);
    
    // Configurar contexto de transposición
    const context: TranspositionContext = {
      originalKey: currentKey,
      targetKey: newKey,
      keySignature: this.getKeySignature(newKey),
      enharmonicPreference: this.determineEnharmonicPreference(newKey),
      instrument: options.instrument,
      notationSystem: options.notationSystem || 'english'
    };
    
    // Transponer acordes en el contenido
    let transposedContent = this.transposeChords(content, semitones, context);
    
    // Actualizar directivas de tonalidad
    transposedContent = this.updateKeyDirectives(transposedContent, newKey);
    
    // Optimizar acordes resultantes
    if (options.optimizeForInstrument) {
      transposedContent = this.optimizeForInstrument(
        transposedContent, 
        options.instrument || 'guitar'
      );
    }
    
    return {
      originalKey: currentKey,
      newKey: newKey,
      semitones: semitones,
      content: transposedContent,
      warnings: this.generateWarnings(context),
      suggestions: this.generateSuggestions(context)
    };
  }
  
  private transposeChords(
    content: string,
    semitones: number,
    context: TranspositionContext
  ): string {
    const chordRegex = /\[([^\]]+)\]/g;
    
    return content.replace(chordRegex, (match, chord) => {
      try {
        const transposed = this.transposeChord(chord, semitones, context);
        return `[${transposed}]`;
      } catch (error) {
        console.warn(`Error transponiendo acorde ${chord}:`, error);
        return match; // Mantener original si hay error
      }
    });
  }
  
  private transposeChord(
    chord: string,
    semitones: number,
    context: TranspositionContext
  ): string {
    const components = this.parseChord(chord);
    
    // Transponer cada componente
    const transposedComponents = {
      root: this.transposeNote(components.root, semitones, context),
      quality: components.quality,
      extensions: components.extensions,
      alterations: components.alterations,
      bass: components.bass ? 
        this.transposeNote(components.bass, semitones, context) : null
    };
    
    // Validar el acorde resultante
    const validation = this.validateTransposedChord(transposedComponents);
    if (!validation.isValid) {
      // Intentar corrección automática
      return this.correctTransposedChord(transposedComponents, validation);
    }
    
    return this.reconstructChord(transposedComponents);
  }
}
```

### 6. Optimización para Instrumentos

```typescript
class InstrumentOptimizer {
  optimizeForGuitar(chord: string): OptimizationResult {
    const components = this.parseChord(chord);
    
    // Verificar si el acorde es tocable fácilmente
    const playability = this.assessGuitarPlayability(components);
    
    if (playability.difficulty > 4) {
      // Buscar alternativas más fáciles
      const alternatives = this.findEasierAlternatives(components, 'guitar');
      
      return {
        original: chord,
        optimized: alternatives[0]?.chord || chord,
        reason: alternatives[0]?.reason || 'Acorde original',
        difficulty: alternatives[0]?.difficulty || playability.difficulty,
        alternatives: alternatives.slice(1, 3)
      };
    }
    
    return {
      original: chord,
      optimized: chord,
      reason: 'Acorde ya es óptimo',
      difficulty: playability.difficulty,
      alternatives: []
    };
  }
  
  private assessGuitarPlayability(components: ChordComponents): PlayabilityAssessment {
    let difficulty = 1;
    const issues: string[] = [];
    
    // Factores que aumentan dificultad
    const root = components.root;
    
    // Tonalidades difíciles para guitarra
    if (['F#', 'C#', 'G#', 'D#', 'A#'].includes(root)) {
      difficulty += 2;
      issues.push('Tonalidad difícil para guitarra');
    }
    
    // Acordes que típicamente requieren barré
    if (['F', 'Bb', 'Eb', 'Ab', 'Db'].includes(root)) {
      difficulty += 1;
      issues.push('Puede requerir técnica de barré');
    }
    
    // Extensiones complejas
    if (components.extensions.some(ext => [11, 13].includes(ext as number))) {
      difficulty += 1;
      issues.push('Extensiones complejas');
    }
    
    // Alteraciones múltiples
    if (components.alterations.length > 1) {
      difficulty += 1;
      issues.push('Múltiples alteraciones');
    }
    
    return {
      difficulty: Math.min(difficulty, 5),
      issues,
      suggestions: this.generatePlayabilitySuggestions(components, issues)
    };
  }
  
  private findEasierAlternatives(
    components: ChordComponents,
    instrument: string
  ): ChordAlternative[] {
    const alternatives: ChordAlternative[] = [];
    
    // Sustitución por acorde más simple
    if (components.extensions.length > 0) {
      const simplified = this.simplifyChord(components);
      alternatives.push({
        chord: this.reconstructChord(simplified),
        reason: 'Versión simplificada',
        difficulty: this.calculateDifficulty(simplified, instrument)
      });
    }
    
    // Sustitución relativa
    const relative = this.findRelativeChord(components);
    if (relative) {
      alternatives.push({
        chord: this.reconstructChord(relative),
        reason: 'Acorde relativo más fácil',
        difficulty: this.calculateDifficulty(relative, instrument)
      });
    }
    
    // Inversión más fácil
    const easierInversion = this.findEasierInversion(components, instrument);
    if (easierInversion) {
      alternatives.push({
        chord: this.reconstructChord(easierInversion),
        reason: 'Inversión más fácil de tocar',
        difficulty: this.calculateDifficulty(easierInversion, instrument)
      });
    }
    
    return alternatives.sort((a, b) => a.difficulty - b.difficulty);
  }
}
```

### 7. Validación y Corrección

```typescript
class TranspositionValidator {
  validateTransposition(
    original: string,
    transposed: string,
    semitones: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validar que la transposición sea correcta matemáticamente
    const originalSemitones = this.chordToSemitones(original);
    const transposedSemitones = this.chordToSemitones(transposed);
    const actualInterval = (transposedSemitones - originalSemitones + 12) % 12;
    const expectedInterval = (semitones + 12) % 12;
    
    if (actualInterval !== expectedInterval) {
      errors.push({
        type: 'INCORRECT_INTERVAL',
        message: `Intervalo incorrecto: esperado ${expectedInterval}, obtenido ${actualInterval}`,
        original,
        transposed
      });
    }
    
    // Validar ortografía enarmónica
    const enharmonicValidation = this.validateEnharmonicSpelling(transposed);
    if (!enharmonicValidation.isValid) {
      warnings.push({
        type: 'ENHARMONIC_SPELLING',
        message: 'La ortografía enarmónica podría mejorarse',
        suggestion: enharmonicValidation.suggestion
      });
    }
    
    // Validar tocabilidad práctica
    const playabilityValidation = this.validatePlayability(transposed);
    warnings.push(...playabilityValidation.warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateCorrectionSuggestions(errors, warnings)
    };
  }
  
  autoCorrectTransposition(
    original: string,
    transposed: string,
    semitones: number,
    context: TranspositionContext
  ): string {
    const validation = this.validateTransposition(original, transposed, semitones);
    
    if (validation.isValid && validation.warnings.length === 0) {
      return transposed; // Ya es correcto
    }
    
    let corrected = transposed;
    
    // Corregir errores de intervalo
    validation.errors.forEach(error => {
      if (error.type === 'INCORRECT_INTERVAL') {
        corrected = this.recalculateTransposition(original, semitones, context);
      }
    });
    
    // Corregir ortografía enarmónica
    validation.warnings.forEach(warning => {
      if (warning.type === 'ENHARMONIC_SPELLING' && warning.suggestion) {
        corrected = warning.suggestion;
      }
    });
    
    return corrected;
  }
}
```

### 8. API de Transposición

```typescript
export class TranspositionAPI {
  private transposer: EnhancedTransposer;
  private validator: TranspositionValidator;
  private optimizer: InstrumentOptimizer;
  
  constructor() {
    this.transposer = new EnhancedTransposer();
    this.validator = new TranspositionValidator();
    this.optimizer = new InstrumentOptimizer();
  }
  
  // Transponer contenido ChordPro completo
  async transposeContent(
    content: string,
    semitones: number,
    options: TranspositionOptions = {}
  ): Promise<TranspositionResult> {
    try {
      const result = this.transposer.transpose(content, semitones, options);
      
      // Validar resultado
      const validation = this.validateResult(content, result);
      
      // Optimizar para instrumento si se especifica
      if (options.instrument && options.optimizeForInstrument) {
        result.content = this.optimizer.optimizeContent(result.content, options.instrument);
      }
      
      return {
        ...result,
        validation,
        metadata: {
          processingTime: Date.now() - startTime,
          algorithmsUsed: ['enhanced_transposer', 'enharmonic_selector'],
          confidence: this.calculateConfidence(validation)
        }
      };
    } catch (error) {
      throw new TranspositionError(`Error en transposición: ${error.message}`);
    }
  }
  
  // Transponer un acorde individual
  async transposeChord(
    chord: string,
    semitones: number,
    options: ChordTranspositionOptions = {}
  ): Promise<ChordTranspositionResult> {
    const context = this.buildTranspositionContext(options);
    const transposed = this.transposer.transposeChord(chord, semitones, context);
    const validation = this.validator.validateTransposition(chord, transposed, semitones);
    
    return {
      original: chord,
      transposed,
      semitones,
      validation,
      alternatives: this.generateAlternatives(transposed, options),
      metadata: {
        enharmonicSpelling: this.analyzeEnharmonicSpelling(transposed),
        difficulty: this.assessDifficulty(transposed, options.instrument)
      }
    };
  }
  
  // Detectar tonalidad automáticamente
  async detectKey(content: string): Promise<KeyDetectionResult> {
    const detector = new KeyDetector();
    const chords = this.extractChords(content);
    const analysis = detector.detectKey(chords);
    
    return {
      detectedKey: analysis.mostLikelyKey,
      confidence: analysis.confidence,
      alternatives: analysis.alternatives,
      evidence: analysis.evidence,
      chords: chords
    };
  }
  
  // Analizar progresión de acordes
  async analyzeProgression(chords: string[]): Promise<ProgressionAnalysis> {
    const analyzer = new ProgressionAnalyzer();
    return analyzer.analyze(chords);
  }
}

// Uso de la API
const transposer = new TranspositionAPI();

// Transponer contenido completo
const result = await transposer.transposeContent(chordProContent, 2, {
  instrument: 'guitar',
  optimizeForInstrument: true,
  notationSystem: 'english'
});

// Transponer acorde individual
const chordResult = await transposer.transposeChord('Cmaj7', 5, {
  preferEnharmonic: 'flat',
  instrument: 'guitar'
});
```

---

**Idioma:** [English](chord-transposition-algorithm.md) | **Español**

*Para más información sobre transposición, consulte los [Ejemplos de Transposición](chord-transposition-examples-es.md) y los [Componentes de UI](transposition-ui-components-es.md).*