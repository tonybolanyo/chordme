---
layout: default
lang: es
title: Motor de Reconocimiento de Acordes
---

# Documentación del Motor de Reconocimiento de Acordes Mejorado

## Resumen

El Motor de Reconocimiento de Acordes Mejorado es un sistema completo para analizar, validar y analizar notaciones de acordes en formato ChordPro. Soporta múltiples idiomas, extensiones complejas de acordes y proporciona capacidades detalladas de análisis de acordes.

## Características

### Soporte de Formato de Acordes

#### Notaciones Básicas de Acordes
- **Acordes Mayores**: C, D, E, F, G, A, B
- **Acordes Menores**: Cm, Dm, Em, Fm, Gm, Am, Bm
- **Acordes de Séptima**: C7, Cmaj7, Cm7, Cdim7, C+7
- **Acordes Suspendidos**: Csus2, Csus4, Csus2sus4

#### Notaciones Avanzadas
- **Extensiones**: C9, C11, C13, Cmaj9, Cm11
- **Alteraciones**: C7#5, Dm7b5, F#m7#11, Bb7alt
- **Acordes Slash**: C/E, G/B, Am/C, F/A
- **Poliacordes**: C/D, G/A (acordes sobre acordes)

#### Soporte Multi-Idioma
- **Inglés**: C, D, E, F, G, A, B
- **Latino**: Do, Re, Mi, Fa, Sol, La, Si
- **Alemán**: C, D, E, F, G, A, H
- **Francés**: Do, Ré, Mi, Fa, Sol, La, Si

### Motor de Análisis

```typescript
class ChordRecognitionEngine {
  private chordPatterns: ChordPattern[];
  private keySignatures: KeySignature[];
  private scalePatterns: ScalePattern[];
  
  constructor() {
    this.initializePatterns();
    this.initializeKeySignatures();
    this.initializeScales();
  }
  
  // Reconocer y analizar un acorde individual
  recognizeChord(chordNotation: string, language: Language = 'en'): ChordAnalysis {
    // 1. Normalizar notación
    const normalized = this.normalizeNotation(chordNotation, language);
    
    // 2. Parsear componentes
    const components = this.parseChordComponents(normalized);
    
    // 3. Validar estructura
    const validation = this.validateChordStructure(components);
    
    // 4. Analizar intervalos
    const intervals = this.analyzeIntervals(components);
    
    // 5. Determinar función tonal
    const function = this.determineTonalFunction(components, intervals);
    
    return {
      original: chordNotation,
      normalized,
      components,
      intervals,
      function,
      isValid: validation.isValid,
      errors: validation.errors,
      suggestions: this.generateSuggestions(components, validation)
    };
  }
}
```

### Analizador de Componentes de Acordes

```typescript
interface ChordComponents {
  root: Note;                    // Nota fundamental
  quality: ChordQuality;         // Mayor, menor, disminuido, aumentado
  extensions: Extension[];       // 7, 9, 11, 13
  alterations: Alteration[];     // #5, b9, #11, etc.
  bass: Note | null;            // Nota del bajo (para acordes slash)
  inversion: number;            // Número de inversión
  polytonal: ChordComponents | null; // Para poliacordes
}

class ChordComponentParser {
  parseChordComponents(notation: string): ChordComponents {
    // Regex complejo para capturar todos los componentes
    const chordRegex = /^([A-G][#b]?)([^\/\s]*)(\/([A-G][#b]?))?(\s*\|\s*([A-G][#b]?)([^\/\s]*))?$/;
    
    const match = notation.match(chordRegex);
    if (!match) {
      throw new ChordParseError(`Invalid chord notation: ${notation}`);
    }
    
    const [, root, quality, , bass, , polyRoot, polyQuality] = match;
    
    return {
      root: this.parseNote(root),
      quality: this.parseQuality(quality),
      extensions: this.parseExtensions(quality),
      alterations: this.parseAlterations(quality),
      bass: bass ? this.parseNote(bass) : null,
      inversion: this.calculateInversion(root, bass),
      polytonal: polyRoot ? {
        root: this.parseNote(polyRoot),
        quality: this.parseQuality(polyQuality),
        extensions: this.parseExtensions(polyQuality),
        alterations: this.parseAlterations(polyQuality),
        bass: null,
        inversion: 0,
        polytonal: null
      } : null
    };
  }
  
  private parseQuality(qualityString: string): ChordQuality {
    // Patrones para diferentes calidades de acordes
    const qualityPatterns = {
      major: /^$|^maj$|^M$/,
      minor: /^m$|^min$|^-$/,
      diminished: /^dim$|^°$|^o$/,
      augmented: /^\+$|^aug$/,
      dominant: /^7$/,
      majorSeventh: /^maj7$|^M7$|^Δ7$/,
      minorSeventh: /^m7$|^min7$|^-7$/,
      diminishedSeventh: /^dim7$|^°7$|^o7$/,
      halfDiminished: /^m7b5$|^ø$/,
      augmentedSeventh: /^\+7$|^aug7$/,
      suspended2: /^sus2$/,
      suspended4: /^sus4$/,
      sixth: /^6$/,
      minorSixth: /^m6$/,
      ninth: /^9$/,
      majorNinth: /^maj9$|^M9$/,
      minorNinth: /^m9$/,
      eleventh: /^11$/,
      thirteenth: /^13$/
    };
    
    for (const [quality, pattern] of Object.entries(qualityPatterns)) {
      if (pattern.test(qualityString)) {
        return quality as ChordQuality;
      }
    }
    
    return 'unknown';
  }
  
  private parseExtensions(qualityString: string): Extension[] {
    const extensions: Extension[] = [];
    
    // Buscar extensiones numéricas
    const extensionMatches = qualityString.match(/(\d+)/g);
    if (extensionMatches) {
      extensionMatches.forEach(match => {
        const num = parseInt(match);
        if ([7, 9, 11, 13].includes(num)) {
          extensions.push(num as Extension);
        }
      });
    }
    
    // Buscar extensiones especiales
    if (/add/.test(qualityString)) {
      const addMatch = qualityString.match(/add(\d+)/);
      if (addMatch) {
        extensions.push(`add${addMatch[1]}` as Extension);
      }
    }
    
    return extensions;
  }
  
  private parseAlterations(qualityString: string): Alteration[] {
    const alterations: Alteration[] = [];
    
    // Buscar alteraciones con # y b
    const alterationMatches = qualityString.match(/([#b])(\d+)/g);
    if (alterationMatches) {
      alterationMatches.forEach(match => {
        alterations.push(match as Alteration);
      });
    }
    
    // Alteraciones especiales
    if (/alt/.test(qualityString)) {
      alterations.push('alt');
    }
    
    return alterations;
  }
}
```

### Análisis de Intervalos

```typescript
class IntervalAnalyzer {
  analyzeIntervals(components: ChordComponents): IntervalAnalysis {
    const root = components.root;
    const intervals: Interval[] = [];
    
    // Agregar fundamental
    intervals.push({ degree: 1, semitones: 0, name: 'Fundamental' });
    
    // Analizar calidad básica
    switch (components.quality) {
      case 'major':
        intervals.push({ degree: 3, semitones: 4, name: 'Tercera Mayor' });
        intervals.push({ degree: 5, semitones: 7, name: 'Quinta Justa' });
        break;
        
      case 'minor':
        intervals.push({ degree: 3, semitones: 3, name: 'Tercera Menor' });
        intervals.push({ degree: 5, semitones: 7, name: 'Quinta Justa' });
        break;
        
      case 'diminished':
        intervals.push({ degree: 3, semitones: 3, name: 'Tercera Menor' });
        intervals.push({ degree: 5, semitones: 6, name: 'Quinta Disminuida' });
        break;
        
      case 'augmented':
        intervals.push({ degree: 3, semitones: 4, name: 'Tercera Mayor' });
        intervals.push({ degree: 5, semitones: 8, name: 'Quinta Aumentada' });
        break;
    }
    
    // Agregar extensiones
    components.extensions.forEach(extension => {
      intervals.push(...this.getExtensionIntervals(extension));
    });
    
    // Aplicar alteraciones
    components.alterations.forEach(alteration => {
      this.applyAlteration(intervals, alteration);
    });
    
    return {
      intervals,
      chordTones: intervals.filter(i => [1, 3, 5, 7].includes(i.degree)),
      tensions: intervals.filter(i => [9, 11, 13].includes(i.degree)),
      avoid: this.identifyAvoidNotes(intervals, components),
      quality: this.determineOverallQuality(intervals)
    };
  }
  
  private getExtensionIntervals(extension: Extension): Interval[] {
    const extensionMap: Record<Extension, Interval[]> = {
      7: [{ degree: 7, semitones: 10, name: 'Séptima Menor' }],
      'maj7': [{ degree: 7, semitones: 11, name: 'Séptima Mayor' }],
      9: [
        { degree: 7, semitones: 10, name: 'Séptima Menor' },
        { degree: 9, semitones: 14, name: 'Novena Mayor' }
      ],
      'maj9': [
        { degree: 7, semitones: 11, name: 'Séptima Mayor' },
        { degree: 9, semitones: 14, name: 'Novena Mayor' }
      ],
      11: [
        { degree: 7, semitones: 10, name: 'Séptima Menor' },
        { degree: 9, semitones: 14, name: 'Novena Mayor' },
        { degree: 11, semitones: 17, name: 'Oncena Justa' }
      ],
      13: [
        { degree: 7, semitones: 10, name: 'Séptima Menor' },
        { degree: 9, semitones: 14, name: 'Novena Mayor' },
        { degree: 11, semitones: 17, name: 'Oncena Justa' },
        { degree: 13, semitones: 21, name: 'Trecena Mayor' }
      ]
    };
    
    return extensionMap[extension] || [];
  }
}
```

### Reconocimiento de Patrones Avanzados

```typescript
class AdvancedPatternRecognizer {
  // Reconocer progresiones de acordes comunes
  recognizeProgression(chords: ChordAnalysis[]): ProgressionAnalysis {
    const progression = chords.map(chord => chord.components.root);
    
    // Patrones comunes
    const commonProgressions = [
      { name: 'I-V-vi-IV', pattern: [0, 7, 9, 5], description: 'Progresión Pop Clásica' },
      { name: 'ii-V-I', pattern: [2, 7, 0], description: 'Cadencia de Jazz' },
      { name: 'vi-IV-I-V', pattern: [9, 5, 0, 7], description: 'Progresión Descendente' },
      { name: 'I-vi-ii-V', pattern: [0, 9, 2, 7], description: 'Círculo de Quintas' },
      { name: 'Blues', pattern: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], description: 'Blues de 12 Compases' }
    ];
    
    const matches = commonProgressions.filter(prog => 
      this.matchesPattern(progression, prog.pattern)
    );
    
    return {
      chords,
      recognizedPatterns: matches,
      key: this.analyzeKey(chords),
      modulations: this.detectModulations(chords),
      cadences: this.identifyCadences(chords)
    };
  }
  
  // Detectar modulaciones (cambios de tonalidad)
  detectModulations(chords: ChordAnalysis[]): Modulation[] {
    const modulations: Modulation[] = [];
    let currentKey = this.analyzeKey(chords.slice(0, 4));
    
    for (let i = 4; i < chords.length; i += 4) {
      const segment = chords.slice(i, i + 4);
      const segmentKey = this.analyzeKey(segment);
      
      if (segmentKey && segmentKey !== currentKey) {
        modulations.push({
          fromKey: currentKey,
          toKey: segmentKey,
          position: i,
          type: this.classifyModulation(currentKey, segmentKey)
        });
        currentKey = segmentKey;
      }
    }
    
    return modulations;
  }
  
  // Identificar cadencias
  identifyCadences(chords: ChordAnalysis[]): Cadence[] {
    const cadences: Cadence[] = [];
    
    for (let i = 0; i < chords.length - 1; i++) {
      const from = chords[i];
      const to = chords[i + 1];
      
      const cadenceType = this.identifyCadenceType(from, to);
      if (cadenceType) {
        cadences.push({
          fromChord: from,
          toChord: to,
          position: i,
          type: cadenceType,
          strength: this.calculateCadenceStrength(cadenceType)
        });
      }
    }
    
    return cadences;
  }
}
```

### Análisis de Tonalidad

```typescript
class KeyAnalyzer {
  analyzeKey(chords: ChordAnalysis[]): KeyAnalysis | null {
    if (chords.length === 0) return null;
    
    // Contar frecuencia de notas
    const noteFrequency = new Map<string, number>();
    chords.forEach(chord => {
      const root = chord.components.root;
      noteFrequency.set(root, (noteFrequency.get(root) || 0) + 1);
    });
    
    // Analizar relaciones de quintas
    const fifthsAnalysis = this.analyzeCircleOfFifths(chords);
    
    // Buscar tónica probable
    const tonicCandidates = this.findTonicCandidates(chords, noteFrequency);
    
    // Determinar modo (mayor/menor)
    const modeAnalysis = this.analyzeMode(chords, tonicCandidates);
    
    return {
      tonic: modeAnalysis.mostLikelyTonic,
      mode: modeAnalysis.mode,
      confidence: modeAnalysis.confidence,
      alternatives: tonicCandidates.slice(1, 3),
      keySignature: this.generateKeySignature(modeAnalysis.mostLikelyTonic, modeAnalysis.mode),
      diatonicChords: this.generateDiatonicChords(modeAnalysis.mostLikelyTonic, modeAnalysis.mode)
    };
  }
  
  private analyzeMode(chords: ChordAnalysis[], tonicCandidates: TonicCandidate[]): ModeAnalysis {
    const results: ModeAnalysis[] = [];
    
    tonicCandidates.forEach(candidate => {
      // Probar modo mayor
      const majorScore = this.calculateModeScore(chords, candidate.note, 'major');
      results.push({
        tonic: candidate.note,
        mode: 'major',
        score: majorScore,
        confidence: this.calculateConfidence(majorScore, chords.length)
      });
      
      // Probar modo menor
      const minorScore = this.calculateModeScore(chords, candidate.note, 'minor');
      results.push({
        tonic: candidate.note,
        mode: 'minor',
        score: minorScore,
        confidence: this.calculateConfidence(minorScore, chords.length)
      });
    });
    
    // Devolver el análisis con mayor puntuación
    const best = results.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return {
      mostLikelyTonic: best.tonic,
      mode: best.mode,
      confidence: best.confidence,
      alternatives: results.filter(r => r !== best).slice(0, 2)
    };
  }
}
```

### Sistema de Validación

```typescript
class ChordValidator {
  validateChord(components: ChordComponents): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    
    // Validar nota fundamental
    if (!this.isValidNote(components.root)) {
      errors.push({
        type: 'INVALID_ROOT',
        message: `Nota fundamental inválida: ${components.root}`,
        severity: 'error'
      });
    }
    
    // Validar combinaciones de intervalos
    const intervalValidation = this.validateIntervals(components);
    errors.push(...intervalValidation.errors);
    warnings.push(...intervalValidation.warnings);
    
    // Validar legibilidad práctica
    const practicalValidation = this.validatePracticality(components);
    warnings.push(...practicalValidation.warnings);
    suggestions.push(...practicalValidation.suggestions);
    
    // Verificar ortografía enarmónica
    const enharmonicSuggestion = this.suggestEnharmonicSpelling(components);
    if (enharmonicSuggestion) {
      suggestions.push(enharmonicSuggestion);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  private validateIntervals(components: ChordComponents): IntervalValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Verificar que no haya intervalos duplicados
    const intervals = this.getChordIntervals(components);
    const uniqueIntervals = new Set(intervals.map(i => i.degree));
    
    if (intervals.length !== uniqueIntervals.size) {
      warnings.push({
        type: 'DUPLICATE_INTERVALS',
        message: 'El acorde contiene intervalos duplicados',
        severity: 'warning'
      });
    }
    
    // Verificar intervalos problemáticos
    if (this.hasAvoidNotes(intervals)) {
      warnings.push({
        type: 'AVOID_NOTES',
        message: 'El acorde contiene notas de evitación que pueden sonar disonantes',
        severity: 'warning'
      });
    }
    
    return { errors, warnings };
  }
}
```

### Generador de Sugerencias

```typescript
class ChordSuggestionGenerator {
  generateSuggestions(components: ChordComponents): ChordSuggestion[] {
    const suggestions: ChordSuggestion[] = [];
    
    // Sugerir simplificaciones
    if (this.isComplex(components)) {
      const simplified = this.simplifyChord(components);
      suggestions.push({
        type: 'simplification',
        original: this.componentsToString(components),
        suggested: this.componentsToString(simplified),
        reason: 'Versión más simple del acorde'
      });
    }
    
    // Sugerir extensiones
    if (this.canExtend(components)) {
      const extended = this.extendChord(components);
      suggestions.push({
        type: 'extension',
        original: this.componentsToString(components),
        suggested: this.componentsToString(extended),
        reason: 'Versión extendida con más color harmónico'
      });
    }
    
    // Sugerir sustituciones
    const substitutions = this.findSubstitutions(components);
    suggestions.push(...substitutions);
    
    // Sugerir inversiones
    const inversions = this.generateInversions(components);
    suggestions.push(...inversions);
    
    return suggestions.slice(0, 5); // Limitar a 5 sugerencias
  }
  
  private findSubstitutions(components: ChordComponents): ChordSuggestion[] {
    const substitutions: ChordSuggestion[] = [];
    
    // Sustitución tritonal (para acordes dominantes)
    if (this.isDominant(components)) {
      const tritoneSubstitute = this.createTritoneSubstitute(components);
      substitutions.push({
        type: 'tritone_substitution',
        original: this.componentsToString(components),
        suggested: this.componentsToString(tritoneSubstitute),
        reason: 'Sustitución tritonal para movimiento de bajo más suave'
      });
    }
    
    // Sustitución relativa (mayor/menor)
    const relative = this.findRelativeChord(components);
    if (relative) {
      substitutions.push({
        type: 'relative_substitution',
        original: this.componentsToString(components),
        suggested: this.componentsToString(relative),
        reason: 'Acorde relativo con sonoridad similar'
      });
    }
    
    return substitutions;
  }
}
```

### API de Reconocimiento

```typescript
// API principal para reconocimiento de acordes
export class ChordRecognitionAPI {
  private engine: ChordRecognitionEngine;
  private validator: ChordValidator;
  private suggestionGenerator: ChordSuggestionGenerator;
  
  constructor() {
    this.engine = new ChordRecognitionEngine();
    this.validator = new ChordValidator();
    this.suggestionGenerator = new ChordSuggestionGenerator();
  }
  
  // Reconocer un acorde individual
  async recognizeChord(notation: string, options?: RecognitionOptions): Promise<ChordRecognitionResult> {
    try {
      const analysis = this.engine.recognizeChord(notation, options?.language);
      const validation = this.validator.validateChord(analysis.components);
      const suggestions = this.suggestionGenerator.generateSuggestions(analysis.components);
      
      return {
        success: true,
        analysis,
        validation,
        suggestions,
        metadata: {
          processingTime: Date.now() - startTime,
          confidence: this.calculateOverallConfidence(analysis, validation)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestions: this.generateErrorSuggestions(notation)
      };
    }
  }
  
  // Analizar una progresión completa
  async analyzeProgression(chordNotations: string[]): Promise<ProgressionAnalysisResult> {
    const chordAnalyses = await Promise.all(
      chordNotations.map(notation => this.recognizeChord(notation))
    );
    
    const validChords = chordAnalyses
      .filter(result => result.success)
      .map(result => result.analysis!);
    
    const progressionAnalysis = this.engine.recognizeProgression(validChords);
    
    return {
      success: true,
      chords: chordAnalyses,
      progression: progressionAnalysis,
      keyAnalysis: this.engine.analyzeKey(validChords),
      recommendations: this.generateProgressionRecommendations(progressionAnalysis)
    };
  }
}

// Uso de la API
const recognizer = new ChordRecognitionAPI();

// Reconocer un acorde individual
const result = await recognizer.recognizeChord('Cmaj7#11');

// Analizar una progresión
const progression = await recognizer.analyzeProgression([
  'Cmaj7', 'Am7', 'Dm7', 'G7'
]);
```

---

**Idioma:** [English](chord-recognition-engine.md) | **Español**

*Para más información sobre acordes, consulte el [Algoritmo de Transposición](chord-transposition-algorithm-es.md) y la [Referencia de Base de Datos](chord-database-reference-es.md).*