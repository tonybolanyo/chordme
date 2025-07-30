---
layout: default
lang: es
title: Formato ChordPro
---

# Formato ChordPro

ChordMe utiliza el formato ChordPro estándar de la industria para representar letras y acordes de canciones. Esta guía completa cubre todo lo que necesitas saber sobre cómo escribir y formatear canciones usando ChordPro.

## ¿Qué es ChordPro?

ChordPro es un formato de texto simple para escribir letras con notación de acordes. Fue desarrollado específicamente para músicos que necesitan representar tanto las letras como los acordes de una canción de manera clara y estructurada.

### Ventajas del formato ChordPro

- **Simplicidad**: Texto plano que es fácil de escribir y editar
- **Portabilidad**: Funciona en cualquier editor de texto
- **Estandardización**: Formato ampliamente adoptado en la comunidad musical
- **Flexibilidad**: Soporta desde canciones simples hasta arreglos complejos

## Sintaxis básica

### Acordes

Los acordes se escriben entre corchetes `[]` y se colocan directamente encima de la palabra o sílaba donde deben tocarse:

```
[C]Twinkle, twinkle, [F]little [C]star
[F]How I [C]wonder [G]what you [C]are
```

### Líneas de solo acordes

Puedes tener líneas que contengan solo acordes sin letras:

```
[C] [F] [G] [C]
Twinkle, twinkle, little star
```

### Acordes complejos

ChordPro soporta notación compleja de acordes:

```
[Cmaj7]Beautiful [Am7]melody [Dm7]flows [G7]gently
[F#dim]Disminuido [Bb/F]bajo específico
```

## Directivas de metadatos

Las directivas proporcionan información sobre la canción y están escritas entre llaves `{}`:

### Directivas básicas

```
{title: Mi canción favorita}
{artist: Nombre del artista}
{album: Nombre del álbum}
{year: 2024}
{key: C}
{tempo: 120 BPM}
{capo: 2}
```

### Directivas de información

```
{composer: Juan Pérez}
{lyricist: María García}
{copyright: © 2024 Editorial Musical}
{genre: Folk}
{duration: 3:45}
```

## Estructura de canciones

### Secciones

Usa etiquetas de sección para organizar tu canción:

```
{verse}
[C]Primera estrofa aquí
[F]Con algunos [G]acordes [C]bonitos

{chorus}
[Am]Este es el [F]coro
[C]Que todos [G]cantarán

{verse}
[C]Segunda estrofa continúa
[F]La historia [G]de la can[C]ción

{bridge}
[Dm]Una sección [Am]puente
[F]Para cambiar el [G]ambiente
```

### Etiquetas de sección disponibles

- `{verse}` o `{v}` - Estrofa
- `{chorus}` o `{c}` - Coro
- `{bridge}` - Puente
- `{intro}` - Introducción
- `{outro}` - Final
- `{instrumental}` - Sección instrumental
- `{solo}` - Solo instrumental

### Secciones numeradas

Puedes numerar las secciones:

```
{verse 1}
Primera estrofa

{verse 2}
Segunda estrofa

{chorus 1}
Primer coro
```

## Directivas de formato

### Control de columnas

```
{columns: 2}
{column_break}
```

### Espaciado

```
{new_page}
{new_physical_page}
```

### Fuentes y tamaños

```
{textfont: Arial}
{textsize: 12}
{chordfont: Helvetica}
{chordsize: 10}
```

## Directivas avanzadas

### Transposición

```
{key: C}
{transpose: +2}
```

### Comentarios

```
{comment: Tocar suavemente durante la estrofa}
{c: Aumentar volumen en el coro}
```

### Repeticiones

```
{start_of_chorus}
[C]Este es el coro
[F]Que se repite
{end_of_chorus}

{chorus}
```

## Ejemplos prácticos

### Canción simple

```
{title: Twinkle, Twinkle, Little Star}
{artist: Tradicional}
{key: C}

{verse}
[C]Twinkle, twinkle, [F]little [C]star
[F]How I [C]wonder [G]what you [C]are
[C]Up above the [F]world so [C]high
[F]Like a [C]diamond [G]in the [C]sky
[C]Twinkle, twinkle, [F]little [C]star
[F]How I [C]wonder [G]what you [C]are
```

### Canción con estructura

```
{title: Amazing Grace}
{artist: John Newton}
{key: G}
{tempo: 90}

{verse 1}
[G]Amazing [G7]grace how [C]sweet the [G]sound
That saved a [Em]wretch like [D]me
[G]I once was [G7]lost but [C]now I'm [G]found
Was blind but [D]now I [G]see

{verse 2}
[G]'Twas grace that [G7]taught my [C]heart to [G]fear
And grace my [Em]fears re[D]lieved
[G]How precious [G7]did that [C]grace ap[G]pear
The hour I [D]first be[G]lieved
```

### Canción moderna con puente

```
{title: Canción moderna}
{artist: Artista ejemplo}
{key: Am}
{capo: 2}
{tempo: 128}

{intro}
[Am] [F] [C] [G]

{verse 1}
[Am]Walking down the [F]street tonight
[C]Thinking about [G]you
[Am]Stars are shining [F]oh so bright
[C]What are we gonna [G]do

{chorus}
[F]We can make it [C]through
[G]If we stick to[Am]gether
[F]Nothing's gonna [C]stop us
[G]We'll last for[Am]ever

{verse 2}
[Am]Dreams are calling [F]out our names
[C]Time to make a [G]move
[Am]Playing life like [F]it's a game
[C]Got nothing to [G]lose

{chorus}

{bridge}
[Dm]When the world gets [Am]heavy
[F]And the road gets [C]long
[Dm]We'll remember [Am]this moment
[G]We'll sing this [G]song

{chorus}

{outro}
[Am] [F] [C] [G] [Am]
```

## Mejores prácticas

### Escritura consistente

1. **Usa nomenclatura estándar** para acordes (C, Dm, F#, etc.)
2. **Sé consistente con el espaciado** entre acordes y letras
3. **Usa etiquetas de sección** para canciones largas
4. **Incluye metadatos relevantes** en la parte superior

### Legibilidad

1. **Alinea los acordes** correctamente con las letras
2. **Usa líneas en blanco** para separar secciones
3. **Agrupa líneas relacionadas** juntas
4. **Evita líneas demasiado largas**

### Organización

1. **Comienza con metadatos** (título, artista, etc.)
2. **Organiza secciones lógicamente** (intro, verso, coro, etc.)
3. **Usa comentarios** para instrucciones especiales
4. **Termina con información de copyright** si es aplicable

## Herramientas y recursos

### Validación

ChordMe valida automáticamente la sintaxis ChordPro y resalta errores comunes.

### Transposición

Usa las características de transposición integradas para cambiar tonalidades fácilmente.

### Exportación

Exporta tus canciones en varios formatos manteniendo el formato ChordPro original.

## Solución de problemas

### Errores comunes

1. **Corchetes desbalanceados**: Asegúrate de que cada `[` tenga su `]` correspondiente
2. **Directivas mal formadas**: Verifica que las directivas usen `{` y `}` correctamente
3. **Espaciado inconsistente**: Mantén el espaciado consistente entre acordes
4. **Nombres de acordes inválidos**: Usa nombres de acordes estándar

### Consejos de depuración

1. **Usa la vista previa** para verificar el formato
2. **Revisa línea por línea** para errores de sintaxis
3. **Valida acordes** usando recursos de teoría musical
4. **Prueba diferentes navegadores** si hay problemas de visualización

---

**Cambia idioma:** [English](chordpro-format.md) | **Español**