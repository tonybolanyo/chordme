---
layout: default
lang: es
title: Guía del Desarrollador de Diagramas de Acordes
---

# Guía del Desarrollador: Agregar Nuevos Diagramas de Acordes

Esta guía explica cómo crear, validar e integrar nuevos diagramas de acordes en la aplicación ChordMe usando la estructura completa de datos de diagramas de acordes.

## Inicio Rápido

### 1. Creación Básica de Acordes

```typescript
import { createChordDiagram } from '../services/chordDiagramUtils';

// Crear un acorde Do Mayor básico para guitarra
const cMajor = createChordDiagram({
  name: 'C',
  nameEs: 'Do',
  instrument: 'guitar',
  frets: [0, 1, 0, 2, 1, 0],    // Posiciones de traste
  fingers: [0, 1, 0, 3, 2, 0],  // Dedos usados
  difficulty: 1
});
```

### 2. Acorde con Barré

```typescript
// Crear un Fa Mayor con barré
const fMajor = createChordDiagram({
  name: 'F',
  nameEs: 'Fa',
  instrument: 'guitar',
  frets: [1, 1, 3, 3, 2, 1],
  fingers: [1, 1, 4, 3, 2, 1],
  barres: [{
    fret: 1,
    fromString: 5,  // Cuerda Mi grave (0-indexado)
    toString: 0,    // Cuerda Mi aguda 
    finger: 1       // Dedo índice
  }],
  difficulty: 3
});
```

### 3. Acorde Complejo

```typescript
// Crear un acorde Cmaj9 avanzado
const cmaj9 = createChordDiagram({
  name: 'Cmaj9',
  nameEs: 'DoMaj9',
  fullName: 'C Major Ninth',
  fullNameEs: 'Do Mayor con Novena',
  instrument: 'guitar',
  frets: [0, 3, 0, 0, 0, 0],
  fingers: [0, 3, 0, 0, 0, 0],
  difficulty: 2,
  tags: ['major', 'ninth', 'jazz', 'open'],
  musicalInfo: {
    root: 'C',
    quality: 'major',
    extensions: ['9'],
    notes: ['C', 'E', 'G', 'B', 'D']
  }
});
```

## Estructura Detallada

### Campos Obligatorios

```typescript
interface MinimalChordDiagram {
  name: string;           // Nombre del acorde (ej: "C", "Dm7")
  nameEs: string;        // Nombre en español (ej: "Do", "Rem7")
  instrument: Instrument; // "guitar" | "ukulele" | "mandolin"
  frets: number[];       // Posiciones (-1=silenciar, 0=aire, 1-24=traste)
  fingers: number[];     // Dedos (0=aire/silenciar, 1-4=dedos)
  difficulty: number;    // 1-5 (principiante a experto)
}
```

### Campos Opcionales

```typescript
interface ExtendedChordDiagram extends MinimalChordDiagram {
  id?: string;              // Generado automáticamente si no se proporciona
  fullName?: string;        // Nombre completo en inglés
  fullNameEs?: string;      // Nombre completo en español
  tuning?: string;          // "standard" por defecto
  barres?: BarreInfo[];     // Información de barré
  alternatives?: string[];  // IDs de digitaciones alternativas
  tags?: string[];         // Etiquetas para búsqueda/categorización
  musicalInfo?: MusicalInfo; // Análisis teórico musical
  displayOptions?: DisplayOptions; // Opciones de renderizado
}
```

## Sistema de Coordenadas

### Convención de Numeración

#### Cuerdas (0-indexado desde la más aguda)
```
Guitarra:
0 = Mi aguda (1ª cuerda)
1 = Si (2ª cuerda)  
2 = Sol (3ª cuerda)
3 = Re (4ª cuerda)
4 = La (5ª cuerda)
5 = Mi grave (6ª cuerda)

Ukelele:
0 = La aguda (1ª cuerda)
1 = Mi (2ª cuerda)
2 = Do (3ª cuerda)  
3 = Sol (4ª cuerda)
```

#### Trastes
```
-1 = No tocar esta cuerda (silenciada)
 0 = Cuerda al aire
 1 = Primer traste
 2 = Segundo traste
...
24 = Traste 24 (máximo para guitarra)
```

#### Dedos
```
0 = Cuerda al aire o silenciada
1 = Dedo índice
2 = Dedo medio
3 = Dedo anular
4 = Dedo meñique
```

## Ejemplos por Instrumento

### Guitarra (6 cuerdas)

#### Acordes Abiertos Básicos
```typescript
const basicGuitarChords = [
  // Do Mayor
  {
    name: 'C', nameEs: 'Do',
    frets: [0, 1, 0, 2, 1, 0],
    fingers: [0, 1, 0, 3, 2, 0],
    difficulty: 1
  },
  
  // Sol Mayor
  {
    name: 'G', nameEs: 'Sol',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [3, 1, 0, 0, 0, 4],
    difficulty: 2
  },
  
  // Re menor
  {
    name: 'Dm', nameEs: 'Rem',
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 1, 3, 2],
    difficulty: 2
  }
];
```

#### Acordes con Barré
```typescript
const barreChords = [
  // Fa Mayor (barré en traste 1)
  {
    name: 'F', nameEs: 'Fa',
    frets: [1, 1, 3, 3, 2, 1],
    fingers: [1, 1, 4, 3, 2, 1],
    barres: [{
      fret: 1, fromString: 5, toString: 0, finger: 1
    }],
    difficulty: 3
  },
  
  // Si bemol Mayor (barré en traste 1, forma de La)
  {
    name: 'Bb', nameEs: 'Sib',
    frets: [-1, 1, 3, 3, 3, 1],
    fingers: [0, 1, 2, 3, 4, 1],
    barres: [{
      fret: 1, fromString: 4, toString: 0, finger: 1
    }],
    difficulty: 4
  }
];
```

### Ukelele (4 cuerdas)

```typescript
const ukuleleChords = [
  // Do Mayor
  {
    name: 'C', nameEs: 'Do',
    instrument: 'ukulele',
    frets: [0, 0, 0, 3],
    fingers: [0, 0, 0, 3],
    difficulty: 1
  },
  
  // Fa Mayor  
  {
    name: 'F', nameEs: 'Fa',
    instrument: 'ukulele',
    frets: [2, 0, 1, 0],
    fingers: [2, 0, 1, 0],
    difficulty: 2
  },
  
  // Sol séptima
  {
    name: 'G7', nameEs: 'Sol7',
    instrument: 'ukulele',
    frets: [0, 2, 1, 2],
    fingers: [0, 2, 1, 3],
    difficulty: 2
  }
];
```

### Mandolina (8 cuerdas/4 pares)

```typescript
const mandolinChords = [
  // Do Mayor
  {
    name: 'C', nameEs: 'Do',
    instrument: 'mandolin',
    frets: [0, 0, 1, 1, 0, 0, 3, 3],
    fingers: [0, 0, 1, 1, 0, 0, 3, 3],
    difficulty: 2
  },
  
  // Sol Mayor
  {
    name: 'G', nameEs: 'Sol',
    instrument: 'mandolin', 
    frets: [5, 5, 4, 4, 3, 3, 3, 3],
    fingers: [4, 4, 3, 3, 1, 1, 2, 2],
    difficulty: 3
  }
];
```

## Validación y Testing

### Validación Automática

```typescript
import { validateChordDiagram } from '../validation/chordValidator';

function createAndValidateChord(chordData: ChordDiagramInput): ChordDiagram {
  // Crear el acorde
  const chord = createChordDiagram(chordData);
  
  // Validar
  const validation = validateChordDiagram(chord);
  
  if (!validation.isValid) {
    console.error('Errores de validación:', validation.errors);
    validation.errors.forEach(error => {
      console.error(`- ${error.message}`);
    });
    throw new Error('Acorde inválido');
  }
  
  // Mostrar advertencias
  validation.warnings.forEach(warning => {
    console.warn(`Advertencia: ${warning.message}`);
  });
  
  return chord;
}
```

### Testing Unitario

```typescript
describe('ChordDiagram Creation', () => {
  test('should create valid C major chord', () => {
    const chord = createChordDiagram({
      name: 'C',
      nameEs: 'Do',
      instrument: 'guitar',
      frets: [0, 1, 0, 2, 1, 0],
      fingers: [0, 1, 0, 3, 2, 0],
      difficulty: 1
    });
    
    expect(chord.name).toBe('C');
    expect(chord.instrument).toBe('guitar');
    expect(chord.frets).toHaveLength(6);
    expect(chord.fingers).toHaveLength(6);
  });
  
  test('should validate barre chord correctly', () => {
    const chord = createChordDiagram({
      name: 'F',
      nameEs: 'Fa',
      instrument: 'guitar',
      frets: [1, 1, 3, 3, 2, 1],
      fingers: [1, 1, 4, 3, 2, 1],
      barres: [{
        fret: 1, fromString: 5, toString: 0, finger: 1
      }],
      difficulty: 3
    });
    
    const validation = validateChordDiagram(chord);
    expect(validation.isValid).toBe(true);
  });
});
```

## Integración con la Base de Datos

### Agregar a la Colección

```typescript
import { addChordToDatabase } from '../database/chordDatabase';

async function addNewChord(chordData: ChordDiagramInput): Promise<void> {
  try {
    // Crear y validar
    const chord = createAndValidateChord(chordData);
    
    // Generar ID único si no se proporciona
    if (!chord.id) {
      chord.id = generateChordId(chord);
    }
    
    // Verificar duplicados
    const existingChord = await findChordById(chord.id);
    if (existingChord) {
      throw new Error(`Acorde con ID ${chord.id} ya existe`);
    }
    
    // Agregar a la base de datos
    await addChordToDatabase(chord);
    
    // Actualizar índices de búsqueda
    await updateSearchIndex(chord);
    
    console.log(`Acorde ${chord.name} agregado exitosamente`);
  } catch (error) {
    console.error('Error al agregar acorde:', error);
    throw error;
  }
}
```

### Generación de IDs

```typescript
function generateChordId(chord: ChordDiagram): string {
  const baseName = chord.name.replace(/[^a-zA-Z0-9]/g, '_');
  const instrument = chord.instrument;
  const hash = generateHash(chord.frets, chord.fingers);
  
  return `${baseName}_${instrument}_${hash}`;
}

function generateHash(frets: number[], fingers: number[]): string {
  const combined = [...frets, ...fingers].join('');
  return btoa(combined).substring(0, 8);
}
```

## Herramientas de Desarrollo

### Generador Interactivo

```typescript
class ChordBuilder {
  private chord: Partial<ChordDiagram> = {};
  
  setName(name: string, nameEs: string): ChordBuilder {
    this.chord.name = name;
    this.chord.nameEs = nameEs;
    return this;
  }
  
  setInstrument(instrument: Instrument): ChordBuilder {
    this.chord.instrument = instrument;
    return this;
  }
  
  setFrets(...frets: number[]): ChordBuilder {
    this.chord.frets = frets;
    return this;
  }
  
  setFingers(...fingers: number[]): ChordBuilder {
    this.chord.fingers = fingers;
    return this;
  }
  
  addBarre(fret: number, fromString: number, toString: number, finger: number = 1): ChordBuilder {
    if (!this.chord.barres) this.chord.barres = [];
    this.chord.barres.push({ fret, fromString, toString, finger });
    return this;
  }
  
  setDifficulty(difficulty: number): ChordBuilder {
    this.chord.difficulty = difficulty;
    return this;
  }
  
  addTags(...tags: string[]): ChordBuilder {
    if (!this.chord.tags) this.chord.tags = [];
    this.chord.tags.push(...tags);
    return this;
  }
  
  build(): ChordDiagram {
    return createChordDiagram(this.chord as ChordDiagramInput);
  }
}

// Uso del builder
const chord = new ChordBuilder()
  .setName('Cmaj7', 'DoMaj7')
  .setInstrument('guitar')
  .setFrets(0, 3, 2, 0, 0, 0)
  .setFingers(0, 3, 2, 0, 0, 0)
  .setDifficulty(2)
  .addTags('major', 'seventh', 'jazz')
  .build();
```

### Importador desde ChordPro

```typescript
function importFromChordPro(chordProContent: string): ChordDiagram[] {
  const chords: ChordDiagram[] = [];
  const chordMatches = chordProContent.match(/\[([^\]]+)\]/g);
  
  if (chordMatches) {
    const uniqueChords = [...new Set(chordMatches.map(match => 
      match.substring(1, match.length - 1)
    ))];
    
    uniqueChords.forEach(chordName => {
      const chord = createChordFromName(chordName);
      if (chord) {
        chords.push(chord);
      }
    });
  }
  
  return chords;
}
```

## Mejores Prácticas

### 1. Naming Conventions

```typescript
// ✅ Correcto
const chordNames = {
  major: 'C',
  minor: 'Cm', 
  seventh: 'C7',
  majorSeventh: 'Cmaj7',
  minorSeventh: 'Cm7',
  ninth: 'C9',
  sus2: 'Csus2',
  sus4: 'Csus4'
};

// ❌ Incorrecto
const badNames = {
  'C major': 'C',  // No usar espacios
  'C-minor': 'Cm', // No usar guiones
  'CMaj7': 'Cmaj7' // Consistencia en mayúsculas
};
```

### 2. Validación Previa

```typescript
// Siempre validar antes de agregar
function addChordSafely(chordData: ChordDiagramInput): void {
  // 1. Validar estructura básica
  if (!chordData.name || !chordData.instrument) {
    throw new Error('Nombre e instrumento son obligatorios');
  }
  
  // 2. Validar arrays
  const expectedStringCount = getStringCount(chordData.instrument);
  if (chordData.frets.length !== expectedStringCount) {
    throw new Error(`${chordData.instrument} requiere ${expectedStringCount} cuerdas`);
  }
  
  // 3. Crear y validar
  const chord = createAndValidateChord(chordData);
  
  // 4. Agregar a la base de datos
  addChordToDatabase(chord);
}
```

### 3. Testing Exhaustivo

```typescript
// Probar todas las digitaciones en contexto real
function testChordInContext(chord: ChordDiagram): void {
  // Probar transposición
  const transposed = transposeChord(chord, 2);
  expect(transposed).toBeDefined();
  
  // Probar renderizado
  const rendered = renderChordDiagram(chord);
  expect(rendered).toContain('svg');
  
  // Probar en progresión
  const progression = [chord, findChord('G'), findChord('Am'), findChord('F')];
  const optimized = optimizeProgression(progression);
  expect(optimized).toHaveLength(4);
}
```

### 4. Documentación de Código

```typescript
/**
 * Crea un nuevo diagrama de acorde con validación completa
 * 
 * @param input - Datos del acorde a crear
 * @param options - Opciones adicionales de creación
 * @returns Diagrama de acorde validado y completo
 * 
 * @example
 * ```typescript
 * const chord = createChordDiagram({
 *   name: 'C',
 *   nameEs: 'Do', 
 *   instrument: 'guitar',
 *   frets: [0, 1, 0, 2, 1, 0],
 *   fingers: [0, 1, 0, 3, 2, 0],
 *   difficulty: 1
 * });
 * ```
 * 
 * @throws {ValidationError} Si el acorde no es válido
 * @throws {Error} Si faltan campos obligatorios
 */
function createChordDiagram(
  input: ChordDiagramInput,
  options?: ChordCreationOptions
): ChordDiagram {
  // Implementación...
}
```

## Solución de Problemas Comunes

### Error: "Array length mismatch"
```typescript
// Problema: Longitud de arrays no coincide
const problematic = {
  frets: [0, 1, 0, 2, 1],      // 5 elementos
  fingers: [0, 1, 0, 3, 2, 0]  // 6 elementos
};

// Solución: Asegurar misma longitud
const fixed = {
  frets: [0, 1, 0, 2, 1, 0],   // 6 elementos  
  fingers: [0, 1, 0, 3, 2, 0]  // 6 elementos
};
```

### Error: "Invalid fret position"
```typescript
// Problema: Posición de traste inválida
const problematic = {
  frets: [0, 1, 0, 25, 1, 0]  // 25 excede máximo de guitarra (24)
};

// Solución: Usar posiciones válidas
const fixed = {
  frets: [0, 1, 0, 12, 1, 0]  // Todas las posiciones ≤ 24
};
```

### Error: "Barre validation failed"
```typescript
// Problema: Barré inválido
const problematic = {
  barres: [{
    fret: 1,
    fromString: 6,  // Fuera de rango para guitarra (0-5)
    toString: 0,
    finger: 1
  }]
};

// Solución: Usar índices válidos
const fixed = {
  barres: [{
    fret: 1,
    fromString: 5,  // Cuerda más grave (0-indexado)
    toString: 0,    // Cuerda más aguda
    finger: 1
  }]
};
```

---

**Idioma:** [English](chord-diagram-developer-guide.md) | **Español**

*Para más información, consulte la [Estructura de Datos](chord-diagram-data-structure-es.md) y la [Referencia de Base de Datos](chord-database-reference-es.md).*