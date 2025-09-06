---
layout: default
lang: es
title: Referencia de Base de Datos de Acordes
---

# Referencia de Base de Datos de Acordes - ChordMe

## Resumen

La base de datos de acordes de ChordMe contiene **214+ diagramas de acordes esenciales** cubriendo guitarra, ukelele y mandolina. Todos los acordes incluyen información completa de digitación, calificaciones de dificultad y localización en español.

## Instrumentos Soportados

### 🎸 Guitarra (6 cuerdas)
- **Afinación estándar**: E-A-D-G-B-E (Mi-La-Re-Sol-Si-Mi)
- **Rango de trastes**: 0-24 trastes
- **Acordes incluidos**: 120+ diagramas
- **Características especiales**: Acordes barré, digitaciones alternativas

### 🎻 Ukelele (4 cuerdas)
- **Afinación estándar**: G-C-E-A (Sol-Do-Mi-La)
- **Rango de trastes**: 0-15 trastes
- **Acordes incluidos**: 60+ diagramas
- **Características especiales**: Acordes hawaianos tradicionales

### 🎺 Mandolina (8 cuerdas/4 pares)
- **Afinación estándar**: G-D-A-E (Sol-Re-La-Mi)
- **Rango de trastes**: 0-24 trastes
- **Acordes incluidos**: 34+ diagramas
- **Características especiales**: Acordes dobles, técnicas de tremolo

## Categorías de Acordes

### Acordes Básicos (Dificultad 1-2)
- **Mayores**: C, D, E, F, G, A, B
- **Menores**: Cm, Dm, Em, Fm, Gm, Am, Bm
- **Séptimas dominantes**: C7, D7, E7, F7, G7, A7, B7

### Acordes Intermedios (Dificultad 3-4)
- **Mayores con séptima**: Cmaj7, Dmaj7, Emaj7, etc.
- **Menores con séptima**: Cm7, Dm7, Em7, etc.
- **Sextas**: C6, D6, E6, etc.
- **Suspendidos**: Csus2, Csus4, etc.

### Acordes Avanzados (Dificultad 5)
- **Extendidos**: C9, D11, E13, etc.
- **Alterados**: C#dim, Bb+, F#m7b5, etc.
- **Complejos**: Cmaj9#11, Dm13, etc.

## Estructura de Datos

### Esquema Principal
```typescript
interface ChordDiagram {
  id: string;                    // Identificador único
  name: string;                  // Nombre en inglés (C, Dm7, etc.)
  nameEs: string;               // Nombre en español (Do, Rem7, etc.)
  fullName: string;             // Nombre completo en inglés
  fullNameEs: string;           // Nombre completo en español
  instrument: Instrument;       // guitarra, ukelele, mandolina
  tuning: string;              // standard, alternate, etc.
  frets: number[];             // Posiciones de traste (0=cuerda al aire, -1=no tocar)
  fingers: number[];           // Dedos usados (0=abierta, 1-4=dedos)
  barres: BarreInfo[];         // Información de acordes barré
  difficulty: number;          // 1-5 (principiante a avanzado)
  alternatives: string[];      // IDs de digitaciones alternativas
  tags: string[];             // Etiquetas de categorización
}
```

### Información de Barré
```typescript
interface BarreInfo {
  fret: number;                // Traste del barré
  fromString: number;          // Cuerda inicial (0-indexado)
  toString: number;            // Cuerda final (0-indexado)
  finger: number;              // Dedo usado (típicamente 1)
}
```

### Configuración de Instrumentos
```typescript
interface InstrumentConfig {
  id: string;                  // ID del instrumento
  name: string;                // Nombre en inglés
  nameEs: string;              // Nombre en español
  strings: number;             // Número de cuerdas
  tuning: string[];           // Afinación estándar
  fretCount: number;          // Número de trastes
  openStrings: number[];      // Notas de cuerdas al aire (MIDI)
}
```

## Convenciones de Nomenclatura

### Nomenclatura de Acordes en Inglés
- **Mayores**: C, D, E, F, G, A, B
- **Menores**: Cm, Dm, Em (agregando 'm')
- **Séptimas**: C7, Cm7, Cmaj7
- **Extensiones**: C9, C11, C13
- **Alteraciones**: C#, Db, F#m7b5

### Nomenclatura de Acordes en Español
- **Mayores**: Do, Re, Mi, Fa, Sol, La, Si
- **Menores**: Dom, Rem, Mim (agregando 'm')
- **Séptimas**: Do7, Dom7, DoMaj7
- **Extensiones**: Do9, Do11, Do13
- **Alteraciones**: Do#, Reb, Fa#m7b5

### Mapeo de Notas
| Inglés | Español | Enarmónico |
|--------|---------|------------|
| C      | Do      | -          |
| C#     | Do#     | Reb        |
| D      | Re      | -          |
| D#     | Re#     | Mib        |
| E      | Mi      | -          |
| F      | Fa      | -          |
| F#     | Fa#     | Solb       |
| G      | Sol     | -          |
| G#     | Sol#    | Lab        |
| A      | La      | -          |
| A#     | La#     | Sib        |
| B      | Si      | -          |

## Algoritmos de Búsqueda

### Búsqueda por Nombre
```typescript
function findChordByName(name: string, language: 'en' | 'es' = 'en'): ChordDiagram[] {
  const searchField = language === 'es' ? 'nameEs' : 'name';
  return chords.filter(chord => 
    chord[searchField].toLowerCase().includes(name.toLowerCase())
  );
}
```

### Búsqueda Difusa
```typescript
function fuzzyChordSearch(query: string, threshold: number = 0.7): ChordDiagram[] {
  return chords.filter(chord => {
    const similarity = calculateSimilarity(query, chord.name);
    return similarity >= threshold;
  });
}
```

### Filtrado por Instrumento
```typescript
function getChordsByInstrument(instrument: Instrument): ChordDiagram[] {
  return chords.filter(chord => chord.instrument === instrument);
}
```

### Filtrado por Dificultad
```typescript
function getChordsByDifficulty(maxDifficulty: number): ChordDiagram[] {
  return chords.filter(chord => chord.difficulty <= maxDifficulty);
}
```

## Validación de Datos

### Validación de Digitación
```typescript
function validateFingering(chord: ChordDiagram): ValidationResult {
  const errors: string[] = [];
  
  // Verificar longitud de arrays
  if (chord.frets.length !== chord.fingers.length) {
    errors.push('Frets and fingers arrays must have same length');
  }
  
  // Verificar rango de trastes
  chord.frets.forEach((fret, index) => {
    if (fret < -1 || fret > 24) {
      errors.push(`Invalid fret ${fret} at string ${index}`);
    }
  });
  
  // Verificar dedos
  chord.fingers.forEach((finger, index) => {
    if (finger < 0 || finger > 4) {
      errors.push(`Invalid finger ${finger} at string ${index}`);
    }
  });
  
  return { isValid: errors.length === 0, errors };
}
```

### Validación de Barré
```typescript
function validateBarre(barre: BarreInfo, stringCount: number): boolean {
  return barre.fromString >= 0 && 
         barre.toString < stringCount && 
         barre.fromString <= barre.toString &&
         barre.fret > 0 && 
         barre.finger >= 1 && barre.finger <= 4;
}
```

## Análisis Musical

### Detección de Tipo de Acorde
```typescript
function analyzeChordType(chord: ChordDiagram): ChordAnalysis {
  const notes = getNotesFromFingering(chord);
  const intervals = calculateIntervals(notes);
  
  return {
    type: detectChordType(intervals),
    quality: detectQuality(intervals),
    extensions: detectExtensions(intervals),
    inversions: detectInversions(notes)
  };
}
```

### Cálculo de Dificultad
```typescript
function calculateDifficulty(chord: ChordDiagram): number {
  let difficulty = 1;
  
  // Barré adds difficulty
  if (chord.barres.length > 0) difficulty += 2;
  
  // High fret positions add difficulty
  const maxFret = Math.max(...chord.frets.filter(f => f > 0));
  if (maxFret > 7) difficulty += 1;
  if (maxFret > 12) difficulty += 1;
  
  // Wide finger stretches add difficulty
  const fingerSpread = calculateFingerSpread(chord);
  if (fingerSpread > 3) difficulty += 1;
  
  return Math.min(difficulty, 5);
}
```

## Localización

### Sistema de Traducciones
```json
{
  "chords": {
    "es": {
      "names": {
        "C": "Do",
        "D": "Re",
        "E": "Mi",
        "F": "Fa",
        "G": "Sol",
        "A": "La",
        "B": "Si"
      },
      "qualities": {
        "major": "Mayor",
        "minor": "menor",
        "seventh": "séptima",
        "major_seventh": "séptima mayor",
        "diminished": "disminuido",
        "augmented": "aumentado",
        "suspended": "suspendido"
      },
      "extensions": {
        "ninth": "novena",
        "eleventh": "oncena",
        "thirteenth": "trecena"
      }
    }
  }
}
```

### Formateo de Nombres
```typescript
function formatChordName(chord: ChordDiagram, language: 'en' | 'es'): string {
  if (language === 'es') {
    return translateChordName(chord.name);
  }
  return chord.name;
}

function translateChordName(englishName: string): string {
  // Implementar lógica de traducción
  const translations = getTranslations('es');
  return applyTranslations(englishName, translations);
}
```

## Métricas y Estadísticas

### Estadísticas de Uso
```typescript
interface ChordUsageStats {
  totalChords: number;           // Total de acordes en DB
  byInstrument: {
    guitar: number;
    ukulele: number;
    mandolin: number;
  };
  byDifficulty: {
    beginner: number;            // Dificultad 1-2
    intermediate: number;        // Dificultad 3-4
    advanced: number;           // Dificultad 5
  };
  mostUsed: ChordDiagram[];     // Acordes más usados
  recentlyAdded: ChordDiagram[]; // Acordes agregados recientemente
}
```

### Métricas de Calidad
```typescript
interface QualityMetrics {
  completeness: number;         // % de acordes básicos cubiertos
  accuracy: number;            // % de digitaciones correctas
  consistency: number;         // % de naming consistente
  localization: number;        // % de traducciones completas
}
```

## API de Acceso

### Endpoints Principales
```typescript
// Obtener todos los acordes
GET /api/chords

// Obtener acordes por instrumento
GET /api/chords?instrument=guitar

// Buscar acordes
GET /api/chords/search?q=Cmaj7

// Obtener acorde específico
GET /api/chords/:id

// Obtener estadísticas
GET /api/chords/stats
```

### Respuesta de Ejemplo
```json
{
  "id": "C_major_guitar_001",
  "name": "C",
  "nameEs": "Do",
  "fullName": "C Major",
  "fullNameEs": "Do Mayor",
  "instrument": "guitar",
  "tuning": "standard",
  "frets": [0, 1, 0, 2, 1, 0],
  "fingers": [0, 1, 0, 3, 2, 0],
  "barres": [],
  "difficulty": 1,
  "alternatives": ["C_major_guitar_002"],
  "tags": ["major", "open", "basic", "beginner"]
}
```

## Mantenimiento

### Scripts de Mantenimiento
```bash
# Validar toda la base de datos
npm run validate-chord-database

# Generar estadísticas
npm run chord-stats

# Verificar traducciones
npm run validate-translations

# Actualizar índices de búsqueda
npm run rebuild-search-index
```

### Monitoreo de Calidad
```bash
# Reporte de calidad diario
npm run daily-quality-report

# Verificación de integridad
npm run integrity-check

# Análisis de uso
npm run usage-analytics
```

---

**Idioma:** [English](chord-database-reference.md) | **Español**

*Para información de mantenimiento, consulte la [Guía de Mantenimiento](chord-database-maintenance-es.md) y la [Guía del Desarrollador](chord-diagram-developer-guide-es.md).*