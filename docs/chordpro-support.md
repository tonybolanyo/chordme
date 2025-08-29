---
layout: default
lang: en
title: ChordPro Format Support
---

# ChordPro Format Support

ChordMe fully supports the ChordPro format for storing and displaying songs with chords and lyrics. The backend preserves all ChordPro formatting exactly as entered, without any modifications.

## What is ChordPro?

ChordPro is a simple text format for songs that includes:
- **Directives**: Metadata like `{title: Song Name}`, `{artist: Artist Name}`
- **Chords**: Chord notations in square brackets like `[C]`, `[G]`, `[Am]`
- **Lyrics**: Plain text lyrics with chords positioned inline
- **Structure**: Song sections like `{start_of_verse}`, `{start_of_chorus}`

## Supported Features

### [PASSED] Directives
All ChordPro directives are fully supported and preserved:

```
{title: Amazing Grace}
{artist: John Newton}
{key: G}
{capo: 3}
{tempo: 120}
{comment: Traditional hymn}
```

### [PASSED] Chord Notations
Chord notations in square brackets are preserved exactly:

```
[C]Amazing [G]grace, how [Am]sweet the [F]sound
[C]That saved a [G]wretch like [C]me
```

### [PASSED] Song Structure
Structural directives for organizing song sections:

```
{start_of_verse}
[C]Verse lyrics [G]go here
{end_of_verse}

{start_of_chorus}
[F]Chorus lyrics [C]go here
{end_of_chorus}
```

### [PASSED] Special Characters and Unicode
Full support for accented characters, symbols, and international text:

```
{title: Café del Mar}
{artist: José González}
[Em]Música [Am]española
```

### [PASSED] Tab Notation
Guitar tablature and special formatting is preserved:

```
{comment: Tab notation}
E|--0--2--3--|
B|--0--1--0--|
G|--0--2--0--|
```

### [PASSED] Whitespace Preservation
Line breaks, spacing, and formatting are maintained exactly:

```
{title: Song with Formatting}

{start_of_verse}
[C]Line one
[G]Line two with    extra spaces
[Am]Line three
{end_of_verse}


{comment: Empty lines above and below are preserved}
```

## API Endpoints

### Core Song Management
All standard song endpoints work with ChordPro content:

- `GET /api/v1/songs` - List all songs (preserves ChordPro formatting)
- `POST /api/v1/songs` - Create song with ChordPro content
- `GET /api/v1/songs/{id}` - Get specific song (returns exact content)
- `PUT /api/v1/songs/{id}` - Update song (preserves ChordPro formatting)
- `DELETE /api/v1/songs/{id}` - Delete song

### ChordPro Validation (Optional)
Additional endpoint for validating ChordPro content:

- `POST /api/v1/songs/validate-chordpro` - Validate and analyze ChordPro content

#### Example Request:
```json
{
  "content": "{title: Test Song}\n[C]Test [G]lyrics"
}
```

#### Example Response:
```json
{
  "status": "success",
  "data": {
    "is_valid": true,
    "warnings": [],
    "metadata": {
      "title": "Test Song",
      "chords": ["C", "G"],
      "chord_count": 2
    },
    "directives": {
      "title": "Test Song"
    },
    "chords": ["C", "G"],
    "statistics": {
      "line_count": 2,
      "character_count": 28,
      "directive_count": 1,
      "unique_chord_count": 2
    }
  }
}
```

## Content Preservation Guarantee

The ChordMe backend provides these guarantees:

1. **Exact Storage**: Content is stored exactly as provided
2. **Perfect Retrieval**: Content is returned exactly as stored
3. **No Modifications**: The system never alters ChordPro formatting
4. **Unicode Support**: Full support for international characters
5. **Whitespace Preservation**: All spacing and line breaks maintained

## Example ChordPro Song

Here's a complete example of a ChordPro song that works perfectly in ChordMe:

```
{title: Amazing Grace}
{artist: John Newton}
{key: G}
{capo: 0}
{tempo: 90}

{comment: Verse 1}
{start_of_verse}
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
[G]I [G7]once was [C]lost, but [G]now I'm [Em]found
Was [G]blind but [D]now I [G]see
{end_of_verse}

{comment: Verse 2}
{start_of_verse}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [G]grace my [Em]fears re[D]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [D]first be[G]lieved
{end_of_verse}

{comment: Traditional hymn, public domain}
```

This song can be created, stored, updated, and retrieved through the API with perfect formatting preservation.

## Testing

The backend includes comprehensive tests that verify:
- All ChordPro elements are preserved exactly
- Unicode and special characters work correctly  
- CRUD operations maintain formatting
- User authentication and authorization
- ChordPro validation utilities

## Getting Started

1. Register a user account via `/api/v1/auth/register`
2. Login to get a JWT token via `/api/v1/auth/login`
3. Create songs with ChordPro content via `/api/v1/songs`
4. Optionally validate ChordPro formatting via `/api/v1/songs/validate-chordpro`

Your ChordPro content will be stored and retrieved exactly as you provide it!