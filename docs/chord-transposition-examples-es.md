---
layout: default
lang: es
title: Ejemplos de Transposición de Acordes
---

# Ejemplos de Transposición de Acordes

Este documento proporciona ejemplos prácticos del algoritmo de transposición de acordes mejorado en ChordMe, demostrando varias características y casos de uso.

## Ejemplos de Transposición Básica

### Transposición Ascendente

#### Subir un Semitono (C → C#)
```
Original:  [C] [Am] [F] [G]
+1 semitono: [C#] [A#m] [F#] [G#]
```

#### Subir una Quinta Justa (C → G)
```
Original:  [C] [Dm] [Em] [F] [G] [Am] [Bdim]
+7 semitonos: [G] [Am] [Bm] [C] [D] [Em] [F#dim]
```

### Transposición Descendente

#### Bajar un Tono (C → Bb)
```
Original:  [C] [F] [G] [C]
-2 semitonos: [Bb] [Eb] [F] [Bb]
```

#### Bajar una Cuarta (C → G)
```
Original:  [C] [Am] [Dm] [G]
-5 semitonos: [G] [Em] [Am] [D]
```

## Ejemplos de Selección Enarmónica

### Contexto de Tonalidad con Sostenidos

#### En tonalidad de G Mayor (1 sostenido)
```
Original en C:  [C] [Am] [F] [G]
Transponer +7:  [G] [Em] [C] [D]  ✓ (usa notas naturales)
NO:            [G] [Em] [B#] [D]  ✗ (evita B# innecesario)
```

#### En tonalidad de D Mayor (2 sostenidos)
```
Original en C:  [F] [Bb] [C] [Dm]
Transponer +2:  [G] [C] [D] [Em]  ✓ (óptimo para D Mayor)
```

### Contexto de Tonalidad con Bemoles

#### En tonalidad de F Mayor (1 bemol)
```
Original en C:  [C] [G] [Am] [F]
Transponer -7:  [F] [Bb] [Dm] [Bb]  ✓ (usa Bb natural de la tonalidad)
NO:            [F] [A#] [Dm] [A#]  ✗ (A# no está en F Mayor)
```

#### En tonalidad de Eb Mayor (3 bemoles)
```
Original en C:  [C] [F] [G] [Am]
Transponer +3:  [Eb] [Ab] [Bb] [Cm]  ✓ (todas notas en la tonalidad)
```

## Ejemplos de Acordes Complejos

### Acordes de Séptima

#### Progresión de Jazz ii-V-I
```
Original en C:   [Dm7] [G7] [Cmaj7]
Transponer +2:   [Em7] [A7] [Dmaj7]  (a D Mayor)
Transponer +7:   [Am7] [D7] [Gmaj7]  (a G Mayor)
Transponer -2:   [Cm7] [F7] [Bbmaj7] (a Bb Mayor)
```

#### Acordes Alterados
```
Original:      [C7alt] [F7#11] [Bbmaj7#5]
Transponer +7: [G7alt] [C7#11] [Fmaj7#5]
```

### Acordes con Extensiones

#### Acordes de Jazz Extendidos
```
Original:      [Cmaj9] [Am11] [Dm9] [G13]
Transponer +5: [Fmaj9] [Dm11] [Gm9] [C13]
```

#### Acordes Suspendidos
```
Original:      [Csus2] [Fsus4] [Gsus2] [Asus4]
Transponer +2: [Dsus2] [Gsus4] [Asus2] [Bsus4]
```

## Ejemplos por Instrumento

### Optimización para Guitarra

#### Evitar Acordes Difíciles
```
Original difícil:  [F#] [C#] [G#m] [D#m]
Optimizado (-1):   [F] [C] [Gm] [Dm]     (acordes más fáciles)
Alternativa (+5):  [B] [F#] [C#m] [G#m]  (usar capo en 2do traste)
```

#### Usar Acordes Abiertos
```
Progresión en F#:  [F#] [D#m] [B] [C#]    (requiere barré)
Transponer a G:    [G] [Em] [C] [D]       (todos abiertos)
```

### Optimización para Ukelele

#### Tonalidades Favorables
```
Original en Bb:    [Bb] [Gm] [Eb] [F]     (difícil en ukelele)
Transponer a C:    [C] [Am] [F] [G]       (posiciones fáciles)
Transponer a G:    [G] [Em] [C] [D]       (muy fácil)
```

### Optimización para Piano

#### Evitar Tonalidades con Muchas Alteraciones
```
Original en F#:    [F#] [G#m] [C#] [D#m]  (6 sostenidos)
Transponer a G:    [G] [Am] [D] [Em]      (1 sostenido)
Transponer a F:    [F] [Gm] [C] [Dm]      (1 bemol)
```

## Ejemplos de Conversión de Sistemas de Notación

### Inglés a Latino

#### Acordes Básicos
```
Inglés:  [C] [D] [E] [F] [G] [A] [B]
Latino:  [Do] [Re] [Mi] [Fa] [Sol] [La] [Si]
```

#### Acordes con Alteraciones
```
Inglés:  [C#] [Db] [F#] [Bb] [G#m] [Ebmaj7]
Latino:  [Do#] [Reb] [Fa#] [Sib] [Sol#m] [MibMaj7]
```

### Inglés a Alemán

#### Diferencia en Si
```
Inglés:  [B] [Bb] [Bm] [Bb7]
Alemán:  [H] [B] [Hm] [B7]
```

### Conversión Completa de Progresión
```
Original (Inglés):  [Am] [F] [C] [G] [E7] [Am]
Latino:            [Lam] [Fa] [Do] [Sol] [Mi7] [Lam]
Alemán:            [Am] [F] [C] [G] [E7] [Am]
```

## Ejemplos de Detección Automática de Tonalidad

### Progresión en Do Mayor
```
Acordes: [C] [Am] [F] [G] [Em] [Am] [Dm] [G] [C]
Análisis:
- Nota más frecuente: C (3 veces)
- Acordes en C Mayor: C, Am, F, G, Em, Dm ✓
- Cadencia V-I: G → C ✓
Resultado: Do Mayor (confianza: 95%)
```

### Progresión en La menor
```
Acordes: [Am] [Dm] [G] [C] [F] [Bb] [E7] [Am]
Análisis:
- Nota más frecuente: A (2 veces)
- Acordes en A menor: Am, Dm, G, C, F ✓
- Dominante secundario: E7 → Am ✓
- Bb sugiere modo menor ✓
Resultado: La menor (confianza: 88%)
```

### Progresión Ambigua
```
Acordes: [C] [G] [Am] [F]
Análisis:
- Candidatos: Do Mayor o La menor
- Sin cadencia clara
- C más prominente al inicio
Resultado: Do Mayor (confianza: 65%)
Alternativa: La menor (confianza: 35%)
```

## Ejemplos de Casos Especiales

### Acordes Slash (con Bajo Específico)

#### Inversiones
```
Original:   [C/E] [F/A] [G/B] [C]
Transponer +2: [D/F#] [G/B] [A/C#] [D]
```

#### Poliacordes
```
Original:   [C/D] [G/A] [F/G]
Transponer +7: [G/A] [D/E] [C/D]
```

### Acordes con Múltiples Alteraciones

#### Acordes Muy Alterados
```
Original:      [C7alt] = [C7b5#9b13]
Transponer +6: [F#7alt] = [F#7b5#9b13]
Enarmónico:    [Gb7alt] = [Gb7b5#9b13]  (en contexto de bemoles)
```

### Modulaciones Temporales

#### Dominante Secundario
```
En Do Mayor:
[C] [Am] [D7] [G] [C]
     ↑
Dominante de G (modulación temporal)

Transponer +2 (a Re Mayor):
[D] [Bm] [E7] [A] [D]
     ↑
Dominante de A
```

## Ejemplos de Optimización Contextual

### Para Jam Session

#### Tonalidades Amigables para Jam
```
Original complicado: [F#] [C#] [G#m] [D#m]
Optimizado para jam: [G] [D] [Am] [Em]    (+1 semitono)
Razón: Tonalidades que todos los músicos conocen
```

### Para Principiantes

#### Acordes Básicos Solamente
```
Original avanzado:  [Cmaj9] [Am11] [Dm9] [G13sus4]
Simplificado:       [C] [Am] [Dm] [G]
Transponer si necesario para evitar barré
```

### Para Voz

#### Rango Vocal Cómodo
```
Original alto:     [A] [F#m] [D] [E]    (para tenor)
Transponer -3:     [F#] [D#m] [B] [C#]   (para barítono)
Transponer +3:     [C] [Am] [F] [G]      (para soprano)
```

## Ejemplos de Corrección Automática

### Corrección de Errores Comunes

#### Dobles Alteraciones
```
Incorrecto:  [C##] [F##] [G##]
Corregido:   [D] [G] [A]
```

#### Enarmónicos Inconsistentes
```
Inconsistente: [F#] [Gb] [C#] [Db]
Corregido:     [F#] [F#] [C#] [C#]  (todo sostenidos)
O:            [Gb] [Gb] [Db] [Db]  (todo bemoles)
```

### Validación de Intervalos

#### Verificar Transposición Correcta
```
Original: [C] (+7 semitonos debería dar [G])
Error:    [A]  (intervalo incorrecto: +9 semitonos)
Corregido: [G]  (intervalo correcto: +7 semitonos)
```

## Ejemplos de Uso en Código

### API Básica
```typescript
// Transponer contenido completo
const result = await transposer.transposeContent(
  "{title: Yesterday}\n[F]Yesterday [Em7]all my [A7]troubles seemed so [Dm]far away",
  2,  // +2 semitonos
  {
    instrument: 'guitar',
    optimizeForInstrument: true
  }
);

console.log(result.content);
// {title: Yesterday}
// [G]Yesterday [F#m7]all my [B7]troubles seemed so [Em]far away
```

### Transponer Acorde Individual
```typescript
const chordResult = await transposer.transposeChord(
  'Cmaj7',
  5,  // +5 semitonos
  {
    preferEnharmonic: 'flat',
    instrument: 'piano'
  }
);

console.log(chordResult.transposed); // "Fmaj7"
```

### Detectar Tonalidad
```typescript
const keyResult = await transposer.detectKey(
  "[C] [Am] [F] [G] [Em] [Am] [Dm] [G] [C]"
);

console.log(keyResult.detectedKey);    // "C"
console.log(keyResult.confidence);     // 0.95
```

### Conversión de Sistemas
```typescript
const converted = await transposer.convertNotationSystem(
  "[Do] [Lam] [Fa] [Sol]",
  'latin',
  'english'
);

console.log(converted); // "[C] [Am] [F] [G]"
```

## Casos de Prueba para Validación

### Test de Transposición Simétrica
```typescript
// Transponer +12 semitonos debería devolver el mismo acorde
test('symmetric transposition', () => {
  const original = 'Cmaj7';
  const result = transposer.transposeChord(original, 12);
  expect(result.transposed).toBe(original);
});
```

### Test de Equivalencia Enarmónica
```typescript
// C# y Db deberían ser equivalentes funcionalmente
test('enharmonic equivalence', () => {
  const sharp = transposer.transposeChord('C', 1);    // C#
  const flat = transposer.transposeChord('C', 1, { preferEnharmonic: 'flat' }); // Db
  
  expect(sharp.semitones).toBe(flat.semitones);
});
```

### Test de Optimización de Instrumento
```typescript
// F debe optimizarse a G para guitarra principiante
test('guitar optimization', () => {
  const result = transposer.transposeContent(
    "[F] [Dm] [Bb] [C]",
    2,  // F → G
    { instrument: 'guitar', optimizeForInstrument: true }
  );
  
  expect(result.content).toBe("[G] [Em] [C] [D]");
});
```

---

**Idioma:** [English](chord-transposition-examples.md) | **Español**

*Para más información sobre transposición, consulte el [Algoritmo de Transposición](chord-transposition-algorithm-es.md) y los [Componentes de UI](transposition-ui-components-es.md).*