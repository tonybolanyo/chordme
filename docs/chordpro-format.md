# ChordPro Format Guide

ChordMe fully supports the ChordPro format, the industry standard for storing and displaying songs with chords and lyrics. This guide explains everything you need to know about using ChordPro in ChordMe.

## What is ChordPro?

ChordPro is a simple text format that allows you to:

- Store lyrics with chord notations
- Add metadata like title, artist, and key
- Structure songs with sections like verses and choruses
- Include performance instructions and comments
- Maintain professional formatting

## Basic Syntax

### Chords

Chords are enclosed in square brackets `[chord]` and positioned directly above the lyrics:

```
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [Em]saved a [D]wretch like [G]me
```

### Directives

Directives provide metadata and structure, enclosed in curly braces `{directive: value}`:

```
{title: Amazing Grace}
{artist: John Newton}
{key: G}
```

## Complete ChordPro Reference

### Metadata Directives

#### Basic Song Information

```
{title: Song Title}              # Song title
{artist: Artist Name}            # Primary artist
{composer: Composer Name}        # Song composer
{lyricist: Lyricist Name}        # Lyrics writer
{copyright: Copyright Info}      # Copyright notice
{album: Album Name}              # Album title
{year: 2024}                     # Release year
```

#### Musical Information

```
{key: G}                         # Song key
{capo: 3}                        # Capo position
{tempo: 120}                     # Beats per minute
{time: 4/4}                      # Time signature
{duration: 3:45}                 # Song length
```

#### Technical Directives

```
{comment: Performance notes}     # General comments
{highlight: Important text}      # Highlighted text
{subtitle: Additional info}      # Song subtitle
```

### Structural Directives

#### Verse Sections

```
{start_of_verse}
[G]This is the first line of the verse
[C]This is the second line [G]with chords
{end_of_verse}

# Or abbreviated form:
{sov}
Verse content here
{eov}
```

#### Chorus Sections

```
{start_of_chorus}
[F]This is the chorus line
[C]Everyone sings [G]along
{end_of_chorus}

# Or abbreviated form:
{soc}
Chorus content here
{eoc}
```

#### Bridge Sections

```
{start_of_bridge}
[Am]Bridge section content
[F]Different melody [C]here
{end_of_bridge}

# Or abbreviated form:
{sob}
Bridge content here
{eob}
```

#### Custom Sections

```
{start_of_tab}
E|--0--2--3--|
B|--0--1--0--|
G|--0--2--0--|
{end_of_tab}

{start_of_grid}
| G | G | C | C |
| G | Em| D | G |
{end_of_grid}
```

### Advanced Features

#### Multiple Verses

You can number verses for organization:

```
{start_of_verse: 1}
[G]First verse content
{end_of_verse}

{start_of_verse: 2}
[G]Second verse content
{end_of_verse}
```

#### Chorus References

Reference previously defined choruses:

```
{start_of_chorus}
[G]Main chorus content
{end_of_chorus}

{start_of_verse}
[G]Verse content
{end_of_verse}

{chorus}  # References the defined chorus
```

#### Comments and Instructions

```
{comment: Slow tempo for intro}
{comment: Key change after bridge}
{comment: Repeat chorus 2x}
```

#### Text Formatting

```
{highlight: Important performance note}
{comment: Whisper this line}
{comment: Loud and energetic}
```

## Chord Notation

### Basic Chords

```
[C] [Dm] [G7] [Am]              # Major, minor, 7th chords
[C/E] [G/B]                     # Slash chords (bass notes)
[Cmaj7] [Dm7] [G7sus4]          # Complex chords
```

### Chord Positioning

#### Inline with Lyrics

```
[G]Amazing [G7]grace, how [C]sweet the [G]sound
```

#### Chord-Only Lines

```
[G] [G7] [C] [G]                # Instrumental section
[Em] [D] [G] [C]
```

#### Mixed Positioning

```
[G]Amazing grace           # Chord at start of word
how [C]sweet the sound     # Chord in middle of line
that saved a wretch[G]     # Chord at end
```

### Special Chord Notations

#### No Chord

```
[NC]Spoken word section    # NC = No Chord
```

#### Chord Continuations

```
[G]Long [.]held [.]note    # [.] continues previous chord
```

#### Parenthetical Chords

```
[G(add9)]Optional chord    # Additional notation
[(G)]Quiet/optional        # Truly optional chord
```

## Song Structure Examples

### Simple Song Structure

```
{title: Simple Song}
{artist: Example Artist}
{key: G}

{start_of_verse}
[G]This is the first verse
[C]With some simple [G]chords
{end_of_verse}

{start_of_chorus}
[F]This is the chorus
[C]Everyone sings [G]along
{end_of_chorus}

{start_of_verse}
[G]This is the second verse
[C]Building on the [G]theme
{end_of_verse}

{chorus}
```

### Complex Song Structure

```
{title: Complex Song}
{artist: Advanced Artist}
{key: Em}
{capo: 2}
{tempo: 76}

{comment: Soft fingerpicking intro}
{start_of_verse: Intro}
[Em] [Am] [C] [G]
[Em] [Am] [B7] [Em]
{end_of_verse}

{start_of_verse: 1}
[Em]In the quiet of the [Am]morning
[C]When the world is [G]still asleep
[Em]I can hear your [Am]whisper
[B7]Promises you'll [Em]keep
{end_of_verse}

{start_of_chorus}
[C]Hold me [G]close, don't [D]let me [Em]go
[C]In this [G]moment [D]time moves [Em]slow
[Am]Everything we [C]need to [G]know
[B7]Is right here [Em]now
{end_of_chorus}

{start_of_bridge}
{comment: Key change to G major}
[G]When the storms of [D]life come calling
[Em]And the winds begin to [C]blow
[G]I'll remember [D]this moment
[C]And the love that [D]we both [G]know
{end_of_bridge}

{comment: Return to Em for final chorus}
{chorus}

{start_of_verse: Outro}
{comment: Slow down and fade}
[Em] [Am] [C] [G]
[Em] [Am] [B7] [Em]
{end_of_verse}
```

## ChordMe-Specific Features

### Content Preservation

ChordMe guarantees:

- **Exact storage** of your ChordPro content
- **Perfect retrieval** with all formatting intact
- **No modifications** to your original text
- **Unicode support** for international characters
- **Whitespace preservation** including line breaks and spacing

### Validation

ChordMe can validate your ChordPro content:

```json
POST /api/v1/songs/validate-chordpro
{
  "content": "{title: Test}\n[C]Test [G]lyrics"
}
```

Response includes:
- Validation status and any warnings
- Extracted metadata (title, artist, key)
- Chord analysis (unique chords, count)
- Content statistics (lines, characters)

### Editor Features

ChordMe's editor provides:

- **Syntax highlighting** for ChordPro elements
- **Auto-completion** for common directives
- **Real-time preview** of formatted output
- **Error detection** for invalid syntax
- **Line numbers** for reference

## Best Practices

### Formatting Guidelines

1. **Consistent spacing**: Use consistent spacing around chords
2. **Logical grouping**: Group related content together
3. **Clear sections**: Use structural directives for organization
4. **Meaningful comments**: Add helpful performance notes
5. **Proper metadata**: Include all relevant song information

### Chord Placement

1. **Above syllables**: Place chords directly above sung syllables
2. **Consistent timing**: Maintain consistent chord timing
3. **Clear notation**: Use standard chord names and symbols
4. **Slash chords**: Indicate bass notes when important
5. **Optional chords**: Mark optional or alternative chords clearly

### Organization Tips

1. **Title first**: Always start with the title directive
2. **Metadata block**: Group all metadata at the top
3. **Structural order**: Follow logical song structure
4. **Comments placement**: Add comments before relevant sections
5. **Consistent naming**: Use consistent section naming

## Common Patterns

### Verse-Chorus Songs

```
{title: Standard Pop Song}
{artist: Artist Name}

{start_of_verse: 1}
Verse 1 content
{end_of_verse}

{start_of_chorus}
Chorus content
{end_of_chorus}

{start_of_verse: 2}
Verse 2 content
{end_of_verse}

{chorus}

{start_of_bridge}
Bridge content
{end_of_bridge}

{chorus}
```

### Folk/Traditional Songs

```
{title: Traditional Folk Song}
{artist: Traditional}
{key: D}
{capo: 0}

{start_of_verse: 1}
Traditional verse structure
{end_of_verse}

{start_of_verse: 2}
More verses following
{end_of_verse}

{comment: Repeat verses as desired}
```

### Contemporary Worship

```
{title: Worship Song}
{artist: Worship Leader}
{key: G}
{tempo: 72}

{comment: Quiet, contemplative start}
{start_of_verse: 1}
Worship verse content
{end_of_verse}

{start_of_chorus}
Uplifting chorus
{end_of_chorus}

{comment: Build energy}
{start_of_verse: 2}
Building verse
{end_of_verse}

{start_of_chorus}
{comment: Full band, energetic}
Chorus with energy
{end_of_chorus}

{start_of_bridge}
{comment: Strip down to acoustic}
Contemplative bridge
{end_of_bridge}

{comment: Big finish}
{chorus}
```

## Troubleshooting

### Common Issues

#### Chords Not Displaying

- Check for proper square bracket syntax `[C]`
- Ensure no spaces inside brackets `[C ]` ❌ `[C]` ✅
- Verify chord names are valid

#### Directives Not Working

- Check for proper curly brace syntax `{title: Song}`
- Ensure colon and space after directive name
- Verify directive names are spelled correctly

#### Formatting Problems

- Check for matching start/end directive pairs
- Ensure proper line breaks between sections
- Verify no extra characters in directive lines

### Validation Errors

Use ChordMe's validation endpoint to check for:

- Invalid directive syntax
- Mismatched section markers
- Unsupported chord notations
- Formatting inconsistencies

## Migration from Other Formats

### From Plain Text

1. Add `{title:}` and `{artist:}` directives
2. Wrap chords in square brackets
3. Add structural directives for sections
4. Include any performance notes as comments

### From Chord Charts

1. Convert chord symbols to ChordPro format
2. Add lyrics below chord lines
3. Include timing and rhythm information
4. Add metadata and structure

### From Other ChordPro Tools

ChordMe accepts standard ChordPro format, so most files will work directly. If you encounter issues:

1. Check for non-standard directives
2. Verify character encoding (UTF-8 recommended)
3. Review chord notation for compatibility
4. Test with ChordMe's validation tool

---

*For more information about using ChordPro in ChordMe, see the [User Guide](user-guide.md) and [API Reference](api-reference.md).*