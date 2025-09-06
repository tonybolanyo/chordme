---
layout: default
lang: es
title: Estructura de Datos de Diagramas de Acordes
---

# Estructura de Datos de Diagramas de Acordes - Documentación Técnica

## Resumen

La estructura de datos de diagramas de acordes de ChordMe proporciona una implementación TypeScript completa y con tipado seguro para almacenar y manipular diagramas de acordes a través de múltiples instrumentos (guitarra, ukelele, mandolina). El sistema soporta digitaciones complejas de acordes, acordes barré, digitaciones alternativas, internacionalización y validación extensa.

## Características Clave

### ✅ Soporte Multi-Instrumento
- **Guitarra** (6 cuerdas): Soporte completo para afinación estándar con rango de 24 trastes
- **Ukelele** (4 cuerdas): Soporte para afinación estándar con rango de 15 trastes  
- **Mandolina** (8 cuerdas/4 pares): Soporte para afinación estándar con rango de 24 trastes

### ✅ Digitaciones Complejas
- **Acordes abiertos**: Uso de cuerdas al aire
- **Acordes barré**: Soporte completo para barré parcial y completo
- **Digitaciones alternativas**: Múltiples formas de tocar el mismo acorde
- **Extensiones avanzadas**: Novenas, oncenas, trecenas

### ✅ Sistema de Validación
- **Validación de digitación**: Verifica posiciones físicamente posibles
- **Validación de teoría musical**: Confirma corrección armónica
- **Validación de dificultad**: Calcula automáticamente el nivel de dificultad
- **Detección de errores**: Identifica digitaciones problemáticas

### ✅ Internacionalización
- **Múltiples notaciones**: Inglés (C, D, E), Latino (Do, Re, Mi), Alemán (C, D, E, H)
- **Traducciones completas**: Nombres de acordes y descripciones
- **Formatos culturales**: Adaptación a preferencias regionales

## Esquema de Datos Principal

### Interfaz ChordDiagram

```typescript
interface ChordDiagram {
  // Identificación
  id: string;                    // Identificador único (ej: "C_major_guitar_001")
  name: string;                  // Nombre estándar (ej: "C", "Dm7", "F#maj9")
  nameEs: string;               // Nombre en español (ej: "Do", "Rem7", "Fa#Maj9")
  fullName: string;             // Nombre completo en inglés
  fullNameEs: string;           // Nombre completo en español
  
  // Especificaciones del instrumento
  instrument: Instrument;       // "guitar" | "ukulele" | "mandolin"
  tuning: string;              // "standard" | "alternate" | nombre personalizado
  
  // Información de digitación
  frets: number[];             // Posiciones de traste (-1=no tocar, 0=al aire, 1-24=traste)
  fingers: number[];           // Dedos usados (0=abierta, 1-4=dedos, -1=silenciada)
  barres: BarreInfo[];         // Información de barré (puede estar vacío)
  
  // Metadata
  difficulty: DifficultyLevel; // 1-5 (principiante a avanzado)
  alternatives: string[];      // IDs de digitaciones alternativas
  tags: string[];             // Etiquetas para categorización y búsqueda
  
  // Información musical
  musicalInfo?: MusicalInfo;   // Análisis teórico opcional
  
  // Configuración de visualización
  displayOptions?: DisplayOptions; // Opciones de renderizado
}
```

### Información de Barré

```typescript
interface BarreInfo {
  fret: number;                // Traste donde se coloca el barré (1-24)
  fromString: number;          // Cuerda inicial (0-indexado desde la más aguda)
  toString: number;            // Cuerda final (0-indexado desde la más aguda)
  finger: number;              // Dedo usado para el barré (típicamente 1)
  partial?: boolean;           // true si es barré parcial, false si es completo
}
```

### Información Musical

```typescript
interface MusicalInfo {
  root: Note;                  // Nota fundamental
  quality: ChordQuality;       // Mayor, menor, disminuido, etc.
  extensions: string[];        // Extensiones (7, 9, 11, 13, etc.)
  alterations: string[];       // Alteraciones (#5, b9, etc.)
  inversion?: number;          // Número de inversión (0=posición fundamental)
  notes: Note[];              // Todas las notas del acorde
}
```

### Tipos de Instrumento

```typescript
type Instrument = "guitar" | "ukulele" | "mandolin";

interface InstrumentSpec {
  id: Instrument;
  name: string;
  nameEs: string;
  strings: number;
  standardTuning: Note[];
  fretCount: number;
  stringSpacing: number;      // Espaciado visual entre cuerdas
}
```

### Configuración de Instrumentos

```typescript
const INSTRUMENT_CONFIGS: Record<Instrument, InstrumentSpec> = {
  guitar: {
    id: "guitar",
    name: "Guitar",
    nameEs: "Guitarra", 
    strings: 6,
    standardTuning: ["E4", "B3", "G3", "D3", "A2", "E2"], // De agudo a grave
    fretCount: 24,
    stringSpacing: 12
  },
  
  ukulele: {
    id: "ukulele",
    name: "Ukulele", 
    nameEs: "Ukelele",
    strings: 4,
    standardTuning: ["A4", "E4", "C4", "G4"], // Afinación re-entrante
    fretCount: 15,
    stringSpacing: 10
  },
  
  mandolin: {
    id: "mandolin",
    name: "Mandolin",
    nameEs: "Mandolina",
    strings: 8, // 4 pares
    standardTuning: ["E5", "E5", "A4", "A4", "D4", "D4", "G3", "G3"],
    fretCount: 24,
    stringSpacing: 8
  }
};
```

## Sistema de Dificultad

### Niveles de Dificultad

```typescript
enum DifficultyLevel {
  BEGINNER = 1,      // Principiante - acordes abiertos básicos
  EASY = 2,          // Fácil - acordes con algunas pisadas
  INTERMEDIATE = 3,  // Intermedio - barré parcial, posiciones medias
  ADVANCED = 4,      // Avanzado - barré completo, posiciones altas
  EXPERT = 5         // Experto - digitaciones complejas, estiramientos
}
```

### Algoritmo de Cálculo de Dificultad

```typescript
function calculateDifficulty(chord: ChordDiagram): DifficultyLevel {
  let score = 1;
  
  // Factor de barré
  if (chord.barres.length > 0) {
    score += 2; // Barré agrega dificultad significativa
    const fullBarres = chord.barres.filter(b => !b.partial);
    score += fullBarres.length; // Barré completo es más difícil
  }
  
  // Factor de posición en el cuello
  const maxFret = Math.max(...chord.frets.filter(f => f > 0));
  if (maxFret > 7) score += 1;   // Posiciones medias
  if (maxFret > 12) score += 1;  // Posiciones altas
  if (maxFret > 15) score += 1;  // Posiciones muy altas
  
  // Factor de estiramiento de dedos
  const fingerSpread = calculateFingerSpread(chord);
  if (fingerSpread > 3) score += 1; // Estiramiento amplio
  if (fingerSpread > 5) score += 1; // Estiramiento muy amplio
  
  // Factor de dedos utilizados
  const fingersUsed = new Set(chord.fingers.filter(f => f > 0)).size;
  if (fingersUsed >= 4) score += 1; // Uso de todos los dedos
  
  // Factor de cuerdas silenciadas
  const mutedStrings = chord.fingers.filter(f => f === -1).length;
  if (mutedStrings > 2) score += 1; // Múltiples cuerdas silenciadas
  
  return Math.min(score, 5) as DifficultyLevel;
}
```

## Validación Avanzada

### Validador de Digitación

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: Suggestion[];
}

class ChordValidator {
  static validate(chord: ChordDiagram): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: Suggestion[] = [];
    
    // Validar longitud de arrays
    if (chord.frets.length !== chord.fingers.length) {
      errors.push({
        type: "ARRAY_LENGTH_MISMATCH",
        message: "Arrays de trastes y dedos deben tener la misma longitud",
        severity: "error"
      });
    }
    
    // Validar rango de trastes
    chord.frets.forEach((fret, index) => {
      if (fret < -1 || fret > INSTRUMENT_CONFIGS[chord.instrument].fretCount) {
        errors.push({
          type: "INVALID_FRET",
          message: `Traste inválido ${fret} en cuerda ${index}`,
          severity: "error"
        });
      }
    });
    
    // Validar posibilidad física
    if (!this.isPhysicallyPossible(chord)) {
      warnings.push({
        type: "DIFFICULT_FINGERING",
        message: "Esta digitación puede ser físicamente difícil",
        severity: "warning"
      });
    }
    
    // Sugerir mejoras
    const betterAlternative = this.findBetterAlternative(chord);
    if (betterAlternative) {
      suggestions.push({
        type: "ALTERNATIVE_FINGERING",
        message: "Considere digitación alternativa más fácil",
        alternative: betterAlternative
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
}
```

## Búsqueda y Filtrado

### Motor de Búsqueda

```typescript
class ChordSearchEngine {
  // Búsqueda por nombre
  static searchByName(query: string, language: 'en' | 'es' = 'en'): ChordDiagram[] {
    const searchField = language === 'es' ? 'nameEs' : 'name';
    return chordDatabase.filter(chord =>
      chord[searchField].toLowerCase().includes(query.toLowerCase())
    );
  }
  
  // Búsqueda difusa
  static fuzzySearch(query: string, threshold: number = 0.7): ChordDiagram[] {
    return chordDatabase.filter(chord => {
      const similarity = this.calculateSimilarity(query, chord.name);
      return similarity >= threshold;
    });
  }
  
  // Filtrado avanzado
  static advancedFilter(filters: ChordFilters): ChordDiagram[] {
    return chordDatabase.filter(chord => {
      if (filters.instrument && chord.instrument !== filters.instrument) return false;
      if (filters.difficulty && chord.difficulty > filters.difficulty) return false;
      if (filters.hasBarres !== undefined && (chord.barres.length > 0) !== filters.hasBarres) return false;
      if (filters.tags && !filters.tags.every(tag => chord.tags.includes(tag))) return false;
      if (filters.root && !chord.name.startsWith(filters.root)) return false;
      return true;
    });
  }
}
```

### Filtros de Búsqueda

```typescript
interface ChordFilters {
  instrument?: Instrument;
  difficulty?: DifficultyLevel;
  hasBarres?: boolean;
  tags?: string[];
  root?: string;
  quality?: ChordQuality;
  minFret?: number;
  maxFret?: number;
  openStrings?: boolean;
}
```

## Renderizado y Visualización

### Opciones de Visualización

```typescript
interface DisplayOptions {
  showFingerNumbers?: boolean;  // Mostrar números de dedos
  showFretNumbers?: boolean;    // Mostrar números de trastes
  showOpenStrings?: boolean;    // Destacar cuerdas al aire
  showMutedStrings?: boolean;   // Marcar cuerdas silenciadas
  showBarres?: boolean;         // Renderizar barré
  colorScheme?: ColorScheme;    // Esquema de colores
  size?: 'small' | 'medium' | 'large'; // Tamaño del diagrama
}

interface ColorScheme {
  fretboard: string;           // Color del diapasón
  strings: string;             // Color de las cuerdas
  fingers: string;             // Color de las posiciones de dedos
  barre: string;              // Color del barré
  openString: string;         // Color de cuerdas al aire
  mutedString: string;        // Color de cuerdas silenciadas
}
```

## Internacionalización

### Sistema de Traducciones

```typescript
interface ChordTranslations {
  en: ChordNameMapping;
  es: ChordNameMapping;
  de?: ChordNameMapping;
  fr?: ChordNameMapping;
}

interface ChordNameMapping {
  notes: Record<string, string>;     // C -> Do
  qualities: Record<string, string>; // major -> Mayor
  extensions: Record<string, string>; // seventh -> séptima
}

const CHORD_TRANSLATIONS: ChordTranslations = {
  en: {
    notes: { C: "C", D: "D", E: "E", F: "F", G: "G", A: "A", B: "B" },
    qualities: { major: "Major", minor: "minor", dim: "diminished" },
    extensions: { "7": "seventh", "9": "ninth", "11": "eleventh" }
  },
  es: {
    notes: { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" },
    qualities: { major: "Mayor", minor: "menor", dim: "disminuido" },
    extensions: { "7": "séptima", "9": "novena", "11": "oncena" }
  }
};
```

## Utilidades y Herramientas

### Generador de Acordes

```typescript
class ChordGenerator {
  static createBasicChord(
    root: string,
    quality: ChordQuality,
    instrument: Instrument
  ): ChordDiagram {
    // Implementar generación automática de digitación
  }
  
  static generateAlternatives(chord: ChordDiagram): ChordDiagram[] {
    // Generar digitaciones alternativas
  }
  
  static optimizeForProgression(chords: ChordDiagram[]): ChordDiagram[] {
    // Optimizar digitaciones para progresión suave
  }
}
```

### Análisis Musical

```typescript
class ChordAnalyzer {
  static analyzeHarmony(chord: ChordDiagram): MusicalInfo {
    const notes = this.extractNotes(chord);
    return {
      root: this.findRoot(notes),
      quality: this.analyzeQuality(notes),
      extensions: this.findExtensions(notes),
      alterations: this.findAlterations(notes),
      inversion: this.findInversion(notes),
      notes
    };
  }
  
  static suggestProgressions(chord: ChordDiagram): ChordDiagram[] {
    // Sugerir progresiones comunes que incluyan este acorde
  }
}
```

## Persistencia y Almacenamiento

### Formato de Serialización

```typescript
// Formato JSON optimizado para almacenamiento
interface SerializedChord {
  id: string;
  n: string;      // name (comprimido)
  ne: string;     // nameEs
  i: Instrument;  // instrument
  f: number[];    // frets
  fg: number[];   // fingers
  b?: BarreInfo[]; // barres (opcional)
  d: number;      // difficulty
  t: string[];    // tags
}

class ChordSerializer {
  static serialize(chord: ChordDiagram): SerializedChord {
    // Convertir a formato comprimido
  }
  
  static deserialize(data: SerializedChord): ChordDiagram {
    // Restaurar desde formato comprimido
  }
}
```

## Métricas y Análisis

### Estadísticas de Uso

```typescript
interface ChordUsageStats {
  totalChords: number;
  byInstrument: Record<Instrument, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  mostUsed: Array<{ chord: ChordDiagram; usage: number }>;
  trends: Array<{ period: string; popular: string[] }>;
}
```

---

**Idioma:** [English](chord-diagram-data-structure.md) | **Español**

*Para más información técnica, consulte la [Guía del Desarrollador](chord-diagram-developer-guide-es.md) y la [Referencia de Base de Datos](chord-database-reference-es.md).*