---
layout: default
lang: es
title: Soporte del formato ChordPro
---

# Soporte del formato ChordPro

ChordMe soporta completamente el formato ChordPro para almacenar y mostrar canciones con acordes y letras. El backend preserva todo el formato ChordPro exactamente como se ingresa, sin ninguna modificación.

## ¿Qué es ChordPro?

ChordPro es un formato de texto simple para canciones que incluye:
- **Directivas**: Metadatos como `{title: Nombre de canción}`, `{artist: Nombre de artista}`
- **Acordes**: Notaciones de acordes en corchetes como `[C]`, `[G]`, `[Am]`
- **Letras**: Texto plano de letras con acordes posicionados en línea
- **Estructura**: Secciones de canciones como `{start_of_verse}`, `{start_of_chorus}`

## Características soportadas

### [PASSED] Directivas
Todas las directivas ChordPro son completamente soportadas y preservadas:

```
{title: Gracia Sublime}
{artist: John Newton}
{key: G}
{capo: 3}
{tempo: 120}
{comment: Himno tradicional}
```

### [PASSED] Notaciones de acordes
Las notaciones de acordes en corchetes se preservan exactamente:

```
[C]Gracia [G]sublime, que [Am]dulce es el [F]son
[C]Que salvó a [G]quien perdido [C]estaba
```

### [PASSED] Estructura de canciones
Directivas estructurales para organizar secciones de canciones:

```
{start_of_verse}
[C]Letras del verso [G]van aquí
{end_of_verse}

{start_of_chorus}
[F]Letras del coro [C]van aquí
{end_of_chorus}
```

### [PASSED] Caracteres especiales y Unicode
Soporte completo para caracteres acentuados, símbolos y texto internacional:

```
{title: Café del Mar}
{artist: José González}
[Em]Música [Am]española
```

### [PASSED] Notación de tablatura
La tablatura de guitarra y formato especial se preserva:

```
{comment: Notación de tablatura}
E|--0--2--3--|
B|--0--1--0--|
G|--0--2--0--|
```

### [PASSED] Preservación de espacios en blanco
Los saltos de línea, espaciado y formato se mantienen exactamente:

```
{title: Canción con formato}

{start_of_verse}
[C]Línea uno
[G]Línea dos con    espacios extra
[Am]Línea tres
{end_of_verse}


{comment: Las líneas vacías arriba y abajo se preservan}
```

## Endpoints de la API

### Gestión básica de canciones
Todos los endpoints estándar de canciones funcionan con contenido ChordPro:

- `GET /api/v1/songs` - Listar todas las canciones (preserva formato ChordPro)
- `POST /api/v1/songs` - Crear canción con contenido ChordPro
- `GET /api/v1/songs/{id}` - Obtener canción específica (devuelve contenido exacto)
- `PUT /api/v1/songs/{id}` - Actualizar canción (preserva formato ChordPro)
- `DELETE /api/v1/songs/{id}` - Eliminar canción

### Validación ChordPro (Opcional)
Endpoint adicional para validar contenido ChordPro:

- `POST /api/v1/songs/validate-chordpro` - Validar y analizar contenido ChordPro

#### Ejemplo de petición:
```json
{
  "content": "{title: Canción de prueba}\n[C]Prueba [G]letras"
}
```

#### Ejemplo de respuesta:
```json
{
  "status": "success",
  "data": {
    "is_valid": true,
    "warnings": [],
    "metadata": {
      "title": "Canción de prueba",
      "chords": ["C", "G"],
      "chord_count": 2
    },
    "directives": {
      "title": "Canción de prueba"
    },
    "chords": ["C", "G"],
    "statistics": {
      "line_count": 2,
      "character_count": 40,
      "directive_count": 1,
      "unique_chord_count": 2
    }
  }
}
```

## Garantía de preservación de contenido

El backend de ChordMe proporciona estas garantías:

1. **Almacenamiento exacto**: El contenido se almacena exactamente como se proporciona
2. **Recuperación perfecta**: El contenido se devuelve exactamente como se almacenó
3. **Sin modificaciones**: El sistema nunca altera el formato ChordPro
4. **Soporte Unicode**: Soporte completo para caracteres internacionales
5. **Preservación de espacios en blanco**: Todo el espaciado y saltos de línea se mantienen

## Ejemplo de canción ChordPro

Aquí hay un ejemplo completo de una canción ChordPro que funciona perfectamente en ChordMe:

```
{title: Gracia Sublime}
{artist: John Newton}
{key: G}
{capo: 0}
{tempo: 90}

{comment: Verso 1}
{start_of_verse}
[G]Gracia [G7]sublime es el [C]dulce [G]son
Que [G]salvó a un [Em]infeliz como [D]yo
[G]Perdido [G7]anduve mas [C]ya me [G]halló
Fui [Em]ciego mas [D]hoy miro a [G]Dios
{end_of_verse}

{comment: Verso 2}
{start_of_verse}
Su [G]gracia me [G7]enseñó a [C]temer [G]Sus
Y [G]mis temores [Em]alivió [D]El
Cuán [G]precioso [G7]fue a mi [C]corazón [G]el
Cuando [Em]él me [D]transformó [G]
{end_of_verse}

{comment: Himno tradicional, dominio público}
```

Esta canción puede ser creada, almacenada, actualizada y recuperada a través de la API con preservación perfecta del formato.

## Pruebas

El backend incluye pruebas integrales que verifican:
- Todos los elementos ChordPro se preservan exactamente
- Los caracteres Unicode y especiales funcionan correctamente  
- Las operaciones CRUD mantienen el formato
- Autenticación y autorización de usuarios
- Utilidades de validación ChordPro

## Comenzar

1. Registrar una cuenta de usuario vía `/api/v1/auth/register`
2. Iniciar sesión para obtener un token JWT vía `/api/v1/auth/login`
3. Crear canciones con contenido ChordPro vía `/api/v1/songs`
4. Opcionalmente validar formato ChordPro vía `/api/v1/songs/validate-chordpro`

¡Tu contenido ChordPro será almacenado y recuperado exactamente como lo proporciones!