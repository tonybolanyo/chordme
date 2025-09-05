"""
ChordPro format utilities and validation helpers.

This module provides optional utilities for working with ChordPro formatted content.
The core song storage and retrieval works with any text format, but these utilities
can help validate and parse ChordPro content.
"""

import re
from typing import Dict, List, Optional, Tuple


class ChordProValidator:
    """Utility class for validating ChordPro format content."""
    
    # Common ChordPro directives
    COMMON_DIRECTIVES = {
        'title', 'artist', 'album', 'year', 'key', 'capo', 'tempo',
        'time', 'duration', 'comment', 'start_of_verse', 'end_of_verse',
        'start_of_chorus', 'end_of_chorus', 'start_of_bridge', 'end_of_bridge',
        'verse', 'chorus', 'bridge'
    }
    
    @staticmethod
    def is_valid_directive(directive: str) -> bool:
        """
        Check if a directive is valid ChordPro syntax.
        
        Args:
            directive: The directive string (e.g., "title: Song Name")
            
        Returns:
            bool: True if directive has valid syntax
        """
        if not directive.strip():
            return False
            
        # Basic directive pattern: {directive: value} or {directive}
        directive_pattern = r'^\{[^}]+\}$'
        return bool(re.match(directive_pattern, directive.strip()))
    
    @staticmethod
    def is_valid_chord(chord: str) -> bool:
        """
        Check if a chord notation is valid using enhanced chord recognition.
        
        Args:
            chord: The chord string (e.g., "C", "Am", "F#m7")
            
        Returns:
            bool: True if chord has valid syntax
        """
        if not chord.strip():
            return False
        
        # Use enhanced chord recognition engine
        try:
            from .chord_recognition import chord_recognition_engine
            return chord_recognition_engine.is_valid_chord(chord.strip())
        except ImportError:
            # Fallback to original regex pattern if enhanced engine not available
            chord_pattern = r'^[A-G][#b]?[mM]?(?:maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?[0-9]*)?(?:/[A-G][#b]?)?$'
            return bool(re.match(chord_pattern, chord.strip()))
    
    @staticmethod
    def extract_directives(content: str) -> Dict[str, str]:
        """
        Extract ChordPro directives from content.
        
        Args:
            content: The ChordPro formatted content
            
        Returns:
            dict: Dictionary mapping directive names to values
        """
        directives = {}
        
        # Pattern to match {directive: value} or {directive}
        pattern = r'\{([^}]+)\}'
        
        for match in re.finditer(pattern, content):
            directive_full = match.group(1)
            
            if ':' in directive_full:
                # Directive with value
                parts = directive_full.split(':', 1)
                if len(parts) == 2:
                    key = parts[0].strip()
                    value = parts[1].strip()
                    directives[key] = value
            else:
                # Directive without value (like {start_of_verse})
                directives[directive_full.strip()] = True
        
        return directives
    
    @staticmethod
    def extract_chords(content: str) -> List[str]:
        """
        Extract chord notations from content.
        
        Args:
            content: The ChordPro formatted content
            
        Returns:
            list: List of unique chords found
        """
        # Pattern to match [chord] notations
        pattern = r'\[([^\]]+)\]'
        
        chords = set()
        for match in re.finditer(pattern, content):
            chord = match.group(1).strip()
            if chord:  # Skip empty chord notations
                chords.add(chord)
        
        return sorted(list(chords))
    
    @staticmethod
    def validate_content(content: str) -> Tuple[bool, List[str]]:
        """
        Validate ChordPro content and return validation results.
        Enhanced with security checks for potential injection attempts.
        
        Args:
            content: The content to validate
            
        Returns:
            tuple: (is_valid, list_of_warnings)
        """
        warnings = []
        
        # Security checks for potential injection attempts
        dangerous_patterns = [
            r'<script[^>]*>',  # Script tags
            r'javascript:',     # JavaScript protocol
            r'on\w+\s*=',      # Event handlers
            r'<iframe[^>]*>',   # Iframe tags  
            r'<object[^>]*>',   # Object tags
            r'<embed[^>]*>',    # Embed tags
            r'<link[^>]*>',     # Link tags
            r'<meta[^>]*>',     # Meta tags
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append(f"Potentially dangerous content detected: {pattern}")
        
        # Check for SQL injection patterns (basic detection)
        sql_patterns = [
            r"(union\s+select|drop\s+table|delete\s+from|insert\s+into)",
            r"(-{2,}|\/\*|\*\/)",  # SQL comments
            r"(\b(or|and)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+['\"]?)",  # Basic SQL injection
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append(f"Potential SQL injection pattern detected")
                break  # Only warn once for SQL patterns
        
        # Check for excessive special characters that might indicate malicious content
        special_char_count = len(re.findall(r'[<>&"\']', content))
        if special_char_count > len(content) * 0.1:  # More than 10% special chars
            warnings.append("High concentration of special characters detected")
        
        # Check for unclosed brackets
        open_directives = content.count('{')
        close_directives = content.count('}')
        if open_directives != close_directives:
            warnings.append(f"Mismatched directive brackets: {open_directives} opening, {close_directives} closing")
        
        open_chords = content.count('[')
        close_chords = content.count(']')
        if open_chords != close_chords:
            warnings.append(f"Mismatched chord brackets: {open_chords} opening, {close_chords} closing")
        
        # Check for empty directives or chords
        if re.search(r'\{\s*\}', content):
            warnings.append("Found empty directive {}")
        
        if re.search(r'\[\s*\]', content):
            warnings.append("Found empty chord notation []")
        
        # Check for common directive typos
        directives = ChordProValidator.extract_directives(content)
        for directive in directives:
            if directive.lower() in ['titel', 'artis', 'tite']:  # Common typos
                warnings.append(f"Possible typo in directive: '{directive}'")
        
        # Overall validation
        is_valid = len(warnings) == 0
        
        return is_valid, warnings
    
    @staticmethod
    def get_song_metadata(content: str) -> Dict[str, str]:
        """
        Extract common song metadata from ChordPro content.
        
        Args:
            content: The ChordPro formatted content
            
        Returns:
            dict: Dictionary with extracted metadata
        """
        directives = ChordProValidator.extract_directives(content)
        
        metadata = {}
        common_fields = ['title', 'artist', 'album', 'year', 'key', 'capo', 'tempo']
        
        for field in common_fields:
            if field in directives:
                metadata[field] = directives[field]
        
        # Add chord information
        chords = ChordProValidator.extract_chords(content)
        if chords:
            metadata['chords'] = chords
            metadata['chord_count'] = len(chords)
        
        return metadata

    @staticmethod
    def extract_sections(content: str) -> List[Dict[str, str]]:
        """
        Extract song sections from ChordPro content.
        
        Args:
            content: The ChordPro formatted content
            
        Returns:
            list: List of section dictionaries with type, number, content, and order
        """
        if not content:
            return []
            
        lines = content.split('\n')
        sections = []
        current_section = None
        current_content = []
        order_index = 0
        
        for line in lines:
            stripped = line.strip()
            
            # Check for section start directive
            if stripped.startswith('{start_of_'):
                # Save previous section if exists
                if current_section is not None:
                    sections.append({
                        'section_type': current_section['type'],
                        'section_number': current_section.get('number'),
                        'content': '\n'.join(current_content),
                        'order_index': order_index
                    })
                    order_index += 1
                
                # Parse new section
                directive = stripped[1:-1]  # Remove { and }
                section_type, section_number = ChordProValidator._parse_section_directive(directive)
                
                current_section = {
                    'type': section_type,
                    'number': section_number
                }
                current_content = []
                
            elif stripped.startswith('{end_of_'):
                # End current section
                if current_section is not None:
                    sections.append({
                        'section_type': current_section['type'],
                        'section_number': current_section.get('number'),
                        'content': '\n'.join(current_content),
                        'order_index': order_index
                    })
                    order_index += 1
                    current_section = None
                    current_content = []
                    
            elif stripped.startswith('{') and stripped.endswith('}'):
                # Other directives (not section-related)
                if current_section is None:
                    # Add as a metadata section if we're not in a song section
                    sections.append({
                        'section_type': 'metadata',
                        'section_number': None,
                        'content': line,
                        'order_index': order_index
                    })
                    order_index += 1
                else:
                    # Add to current section content
                    current_content.append(line)
                    
            else:
                # Regular content line
                if current_section is not None:
                    # Add to current section
                    current_content.append(line)
                else:
                    # Add as general content section
                    if current_content or line.strip():  # Only create section if there's content
                        if current_content:
                            current_content.append(line)
                        else:
                            current_content = [line]
                        
                        # Check if this is the end of a standalone content block
                        # We'll finalize it when we hit a section directive or end of content
        
        # Handle any remaining content
        if current_section is not None:
            sections.append({
                'section_type': current_section['type'],
                'section_number': current_section.get('number'),
                'content': '\n'.join(current_content),
                'order_index': order_index
            })
        elif current_content and any(line.strip() for line in current_content):
            # Standalone content without section markers
            sections.append({
                'section_type': 'content',
                'section_number': None,
                'content': '\n'.join(current_content),
                'order_index': order_index
            })
        
        return sections

    @staticmethod
    def _parse_section_directive(directive: str) -> tuple:
        """
        Parse a section directive to extract type and number.
        
        Args:
            directive: Section directive like "start_of_verse" or "start_of_verse: 1"
            
        Returns:
            tuple: (section_type, section_number) where section_number may be None
        """
        if ':' in directive:
            # Handle parameterized sections like "start_of_verse: 1"
            full_type, param = directive.split(':', 2)
            section_type = full_type.replace('start_of_', '').replace('end_of_', '')
            section_number = param.strip()
        else:
            # Handle simple sections like "start_of_verse"
            section_type = directive.replace('start_of_', '').replace('end_of_', '')
            section_number = None
            
        return section_type, section_number


# Chord transposition utilities
# Chromatic scale for chord transposition (sharp preference)
CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Chromatic scale with flat preference
CHROMATIC_SCALE_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

# Enharmonic equivalents mapping (flats to sharps)
ENHARMONIC_MAP = {
    'Db': 'C#',
    'Eb': 'D#', 
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#'
}

# Enharmonic equivalents mapping (sharps to flats)
ENHARMONIC_MAP_REVERSE = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb'
}

# Circle of fifths for determining key signature preferences
# Positive numbers = sharp keys, negative = flat keys
CIRCLE_OF_FIFTHS = {
    'C': 0, 'Am': 0,
    'G': 1, 'Em': 1,
    'D': 2, 'Bm': 2,
    'A': 3, 'F#m': 3,
    'E': 4, 'C#m': 4,
    'B': 5, 'G#m': 5,
    'F#': 6, 'D#m': 6,
    'F': -1, 'Dm': -1,
    'Bb': -2, 'Gm': -2,
    'Eb': -3, 'Cm': -3,
    'Ab': -4, 'Fm': -4,
    'Db': -5, 'Bbm': -5,
    'Gb': -6, 'Ebm': -6,
}

# Latin notation to American notation mapping
LATIN_TO_AMERICAN = {
    'Do': 'C',
    'Re': 'D', 
    'Mi': 'E',
    'Fa': 'F',
    'Sol': 'G',
    'La': 'A',
    'Si': 'B',
}

# American notation to Latin notation mapping
AMERICAN_TO_LATIN = {
    'C': 'Do',
    'D': 'Re',
    'E': 'Mi', 
    'F': 'Fa',
    'G': 'Sol',
    'A': 'La',
    'B': 'Si',
}


def parse_chord(chord: str) -> Dict[str, str]:
    """
    Parse a chord name into root note and modifiers.
    
    Args:
        chord: The chord string (e.g., "C", "Am", "F#m7")
        
    Returns:
        dict: Dictionary with 'root' and 'modifiers' keys
    """
    trimmed = chord.strip()
    if not trimmed:
        return {'root': '', 'modifiers': ''}
    
    # Handle flat notes (e.g., Bb, Db)
    if len(trimmed) >= 2 and trimmed[1] == 'b':
        return {
            'root': trimmed[:2],
            'modifiers': trimmed[2:]
        }
    
    # Handle sharp notes (e.g., C#, F#)
    if len(trimmed) >= 2 and trimmed[1] == '#':
        return {
            'root': trimmed[:2],
            'modifiers': trimmed[2:]
        }
    
    # Handle natural notes (e.g., C, D, E)
    return {
        'root': trimmed[:1],
        'modifiers': trimmed[1:]
    }


def parse_chord_enhanced(chord: str) -> Dict[str, str]:
    """
    Enhanced chord parsing that handles slash chords separately.
    
    Args:
        chord: The chord string
        
    Returns:
        dict: Dictionary with 'root', 'modifiers', 'bass_note', and 'is_slash_chord' keys
    """
    trimmed = chord.strip()
    if not trimmed:
        return {'root': '', 'modifiers': '', 'bass_note': None, 'is_slash_chord': False}

    # Check for slash chord
    slash_index = trimmed.find('/')
    if slash_index > 0:
        chord_part = trimmed[:slash_index]
        bass_note_part = trimmed[slash_index + 1:]
        chord_parsed = parse_chord(chord_part)
        bass_parsed = parse_chord(bass_note_part)
        
        return {
            'root': chord_parsed['root'],
            'modifiers': chord_parsed['modifiers'],
            'bass_note': bass_parsed['root'],
            'is_slash_chord': True,
        }

    # Regular chord parsing
    parsed = parse_chord(trimmed)
    return {
        'root': parsed['root'],
        'modifiers': parsed['modifiers'],
        'bass_note': None,
        'is_slash_chord': False
    }


def convert_notation(note: str, from_system: str = 'american', to_system: str = 'american') -> str:
    """
    Convert between notation systems.
    
    Args:
        note: The note to convert
        from_system: Source notation system ('american' or 'latin')
        to_system: Target notation system ('american' or 'latin')
        
    Returns:
        str: Converted note
    """
    if from_system == to_system:
        return note
    
    if from_system == 'latin' and to_system == 'american':
        return LATIN_TO_AMERICAN.get(note, note)
    
    if from_system == 'american' and to_system == 'latin':
        return AMERICAN_TO_LATIN.get(note, note)
    
    return note


def get_preferred_enharmonic(note: str, key_signature: str = None) -> str:
    """
    Determine the preferred enharmonic spelling based on key signature.
    
    Args:
        note: The note to get enharmonic preference for
        key_signature: Optional key signature for context
        
    Returns:
        str: Preferred enharmonic spelling
    """
    if not key_signature:
        # Default to sharp preference for no key context
        return ENHARMONIC_MAP.get(note, note)

    key_preference = CIRCLE_OF_FIFTHS.get(key_signature)
    if key_preference is None:
        # Unknown key, use sharp preference
        return ENHARMONIC_MAP.get(note, note)

    # Sharp keys (positive values) prefer sharps
    # Flat keys (negative values) prefer flats
    if key_preference >= 0:
        # Prefer sharps
        return ENHARMONIC_MAP.get(note, note)
    else:
        # Prefer flats - convert sharps to flats if available
        return ENHARMONIC_MAP_REVERSE.get(note, note)


def transpose_chord(chord: str, semitones: int) -> str:
    """
    Transpose a single chord by a given number of semitones.
    
    Args:
        chord: The chord string (e.g., "C", "Am", "F#m7")
        semitones: Number of semitones to transpose (positive = up, negative = down)
        
    Returns:
        str: The transposed chord
    """
    return transpose_chord_with_key(chord, semitones)


def transpose_chord_with_key(
    chord: str, 
    semitones: int, 
    key_signature: str = None,
    notation_system: str = 'american'
) -> str:
    """
    Enhanced transpose chord with key signature awareness and notation system support.
    
    Args:
        chord: The chord string
        semitones: Number of semitones to transpose
        key_signature: Optional key signature for enharmonic preference
        notation_system: Target notation system ('american' or 'latin')
        
    Returns:
        str: The transposed chord
    """
    if not chord or not ChordProValidator.is_valid_chord(chord):
        return chord  # Return unchanged if invalid

    if semitones == 0:
        return chord  # No transposition needed

    # Ensure semitones are within reasonable range
    semitones = ((semitones % 12) + 12) % 12
    if semitones > 6:
        semitones = semitones - 12  # Use shorter path on circle

    parsed = parse_chord_enhanced(chord)
    root = parsed['root']
    modifiers = parsed['modifiers']
    bass_note = parsed['bass_note']
    is_slash_chord = parsed['is_slash_chord']

    # Transpose root note
    transposed_root = transpose_note(root, semitones, key_signature)
    
    # Handle slash chords - transpose bass note as well
    result = transposed_root + modifiers
    if is_slash_chord and bass_note:
        transposed_bass = transpose_note(bass_note, semitones, key_signature)
        result += '/' + transposed_bass

    # Convert notation system if needed
    if notation_system == 'latin':
        result = convert_chord_to_latin(result)

    return result


def transpose_note(note: str, semitones: int, key_signature: str = None) -> str:
    """
    Transpose a single note by semitones with key signature awareness.
    
    Args:
        note: The note to transpose
        semitones: Number of semitones to transpose
        key_signature: Optional key signature for enharmonic preference
        
    Returns:
        str: The transposed note
    """
    if not note:
        return note

    # Convert flat to sharp for chromatic scale lookup
    normalized_note = ENHARMONIC_MAP.get(note, note)

    # Find current position in chromatic scale
    try:
        current_index = CHROMATIC_SCALE.index(normalized_note)
    except ValueError:
        return note  # Return unchanged if note not found

    # Calculate new position with proper wrap-around
    new_index = (current_index + semitones) % 12
    if new_index < 0:
        new_index += 12

    # Get the new note from appropriate scale based on key signature
    if key_signature and key_signature in CIRCLE_OF_FIFTHS:
        key_preference = CIRCLE_OF_FIFTHS[key_signature]
        if key_preference < 0:
            # Flat key - prefer flat spelling
            new_note = CHROMATIC_SCALE_FLATS[new_index]
        else:
            # Sharp key or C major - prefer sharp spelling
            new_note = CHROMATIC_SCALE[new_index]
    else:
        # No key context - use sharp preference (default behavior)
        new_note = CHROMATIC_SCALE[new_index]

    return new_note


def convert_chord_to_latin(chord: str) -> str:
    """
    Convert a chord to Latin notation system.
    
    Args:
        chord: The chord in American notation
        
    Returns:
        str: The chord in Latin notation
    """
    parsed = parse_chord_enhanced(chord)
    root = parsed['root']
    modifiers = parsed['modifiers']
    bass_note = parsed['bass_note']
    is_slash_chord = parsed['is_slash_chord']
    
    result = convert_notation(root, 'american', 'latin') + modifiers
    
    if is_slash_chord and bass_note:
        latin_bass = convert_notation(bass_note, 'american', 'latin')
        result += '/' + latin_bass
    
    return result


def transpose_chordpro_content(content: str, semitones: int) -> str:
    """
    Transpose all chords in ChordPro content by a given number of semitones.
    
    Args:
        content: The ChordPro formatted content
        semitones: Number of semitones to transpose (positive = up, negative = down)
        
    Returns:
        str: The content with all chords transposed
    """
    return transpose_chordpro_content_with_key(content, semitones)


def transpose_chordpro_content_with_key(
    content: str, 
    semitones: int,
    key_signature: str = None,
    notation_system: str = 'american'
) -> str:
    """
    Enhanced transpose ChordPro content with key signature awareness.
    
    Args:
        content: The ChordPro formatted content
        semitones: Number of semitones to transpose
        key_signature: Optional key signature for enharmonic preference
        notation_system: Target notation system ('american' or 'latin')
        
    Returns:
        str: The content with all chords transposed
    """
    if not content or semitones == 0:
        return content

    # Auto-detect key signature if not provided
    detected_key = key_signature or extract_key_signature(content)

    # Regular expression to find chord notation in ChordPro format [ChordName]
    chord_pattern = re.compile(r'\[([^\]]+)\]')

    def transpose_match(match):
        chord_name = match.group(1)
        transposed_chord = transpose_chord_with_key(
            chord_name, 
            semitones, 
            detected_key,
            notation_system
        )
        return f'[{transposed_chord}]'

    return chord_pattern.sub(transpose_match, content)


def extract_key_signature(content: str) -> str:
    """
    Extract key signature from ChordPro content.
    
    Args:
        content: The ChordPro formatted content
        
    Returns:
        str: The key signature if found, None otherwise
    """
    key_pattern = re.compile(r'\{key\s*:\s*([A-G][#b]?m?)\s*\}', re.IGNORECASE)
    match = key_pattern.search(content)
    return match.group(1).strip() if match else None


def transpose_chord_intelligent(
    chord: str,
    semitones: int,
    key_signature: str = None,
    notation_system: str = 'american',
    preserve_enharmonics: bool = False,
    preferred_accidentals: str = 'auto'
) -> str:
    """
    Transpose chord with intelligent enharmonic selection.
    
    Args:
        chord: The chord to transpose
        semitones: Number of semitones to transpose
        key_signature: Optional key signature for context
        notation_system: Target notation system ('american' or 'latin')
        preserve_enharmonics: Whether to preserve original accidental style
        preferred_accidentals: Preferred accidental style ('sharps', 'flats', 'auto')
        
    Returns:
        str: The intelligently transposed chord
    """
    if not chord or not ChordProValidator.is_valid_chord(chord):
        return chord

    if semitones == 0:
        return chord

    # If preserving enharmonics, try to maintain the original accidental style
    if preserve_enharmonics:
        original_has_flats = 'b' in chord
        original_has_sharps = '#' in chord
        
        if original_has_flats and preferred_accidentals == 'auto':
            return transpose_chord_with_flat_preference(chord, semitones, key_signature)
        if original_has_sharps and preferred_accidentals == 'auto':
            return transpose_chord_with_sharp_preference(chord, semitones, key_signature)

    # Handle preferred accidentals
    if preferred_accidentals == 'flats':
        return transpose_chord_with_flat_preference(chord, semitones, key_signature)
    if preferred_accidentals == 'sharps':
        return transpose_chord_with_sharp_preference(chord, semitones, key_signature)

    # Default intelligent transposition
    return transpose_chord_with_key(chord, semitones, key_signature, notation_system)


def transpose_chord_with_flat_preference(
    chord: str,
    semitones: int,
    key_signature: str = None
) -> str:
    """
    Transpose chord with preference for flat accidentals.
    
    Args:
        chord: The chord to transpose
        semitones: Number of semitones to transpose
        key_signature: Optional key signature
        
    Returns:
        str: The transposed chord with flat preference
    """
    parsed = parse_chord_enhanced(chord)
    root = parsed['root']
    modifiers = parsed['modifiers']
    bass_note = parsed['bass_note']
    is_slash_chord = parsed['is_slash_chord']

    transposed_root = transpose_note_with_preference(root, semitones, 'flats')
    
    result = transposed_root + modifiers
    if is_slash_chord and bass_note:
        transposed_bass = transpose_note_with_preference(bass_note, semitones, 'flats')
        result += '/' + transposed_bass

    return result


def transpose_chord_with_sharp_preference(
    chord: str,
    semitones: int,
    key_signature: str = None
) -> str:
    """
    Transpose chord with preference for sharp accidentals.
    
    Args:
        chord: The chord to transpose
        semitones: Number of semitones to transpose
        key_signature: Optional key signature
        
    Returns:
        str: The transposed chord with sharp preference
    """
    parsed = parse_chord_enhanced(chord)
    root = parsed['root']
    modifiers = parsed['modifiers']
    bass_note = parsed['bass_note']
    is_slash_chord = parsed['is_slash_chord']

    transposed_root = transpose_note_with_preference(root, semitones, 'sharps')
    
    result = transposed_root + modifiers
    if is_slash_chord and bass_note:
        transposed_bass = transpose_note_with_preference(bass_note, semitones, 'sharps')
        result += '/' + transposed_bass

    return result


def transpose_note_with_preference(
    note: str,
    semitones: int,
    preference: str
) -> str:
    """
    Transpose note with accidental preference.
    
    Args:
        note: The note to transpose
        semitones: Number of semitones to transpose
        preference: Accidental preference ('sharps' or 'flats')
        
    Returns:
        str: The transposed note with preferred accidentals
    """
    if not note:
        return note

    normalized_note = ENHARMONIC_MAP.get(note, note)
    try:
        current_index = CHROMATIC_SCALE.index(normalized_note)
    except ValueError:
        return note

    new_index = (current_index + semitones) % 12
    if new_index < 0:
        new_index += 12

    return CHROMATIC_SCALE_FLATS[new_index] if preference == 'flats' else CHROMATIC_SCALE[new_index]


def validate_chordpro_content(content: str) -> Dict:
    """
    Comprehensive ChordPro content validation.
    
    Args:
        content: The content to validate
        
    Returns:
        dict: Validation results with metadata
    """
    validator = ChordProValidator()
    
    is_valid, warnings = validator.validate_content(content)
    metadata = validator.get_song_metadata(content)
    directives = validator.extract_directives(content)
    chords = validator.extract_chords(content)
    
    return {
        'is_valid': is_valid,
        'warnings': warnings,
        'metadata': metadata,
        'directives': directives,
        'chords': chords,
        'statistics': {
            'line_count': content.count('\n') + 1 if content else 0,
            'character_count': len(content),
            'directive_count': len(directives),
            'unique_chord_count': len(chords)
        }
    }


def detect_key_signature(content: str) -> Dict:
    """
    Automatically detect the key signature from ChordPro content
    using chord frequency analysis and circle of fifths.
    
    Args:
        content: ChordPro formatted content
        
    Returns:
        dict: Key detection results with confidence scores
    """
    # First check if there's a manual key signature
    manual_key = extract_key_signature(content)
    if manual_key:
        return {
            'detected_key': manual_key,
            'confidence': 1.0,
            'is_minor': 'm' in manual_key.lower(),
            'alternative_keys': []
        }
    
    # Extract all chords from the content
    chords = _extract_chords_from_content(content)
    if not chords:
        return {
            'detected_key': 'C',
            'confidence': 0.0,
            'is_minor': False,
            'alternative_keys': []
        }
    
    # Analyze chord frequencies
    chord_frequency = _analyze_chord_frequency(chords)
    
    # Calculate key probabilities using circle of fifths
    key_probabilities = _calculate_key_probabilities(chord_frequency)
    
    # Find the best key
    sorted_keys = sorted(key_probabilities.items(), key=lambda x: x[1], reverse=True)
    sorted_keys = [(k, v) for k, v in sorted_keys if v > 0]  # Only include keys with positive scores
    
    if not sorted_keys:
        return {
            'detected_key': 'C',
            'confidence': 0.0,
            'is_minor': False,
            'alternative_keys': []
        }
    
    best_key = sorted_keys[0]
    alternative_keys = [
        {
            'key': key,
            'confidence': round(confidence, 2),
            'is_minor': 'm' in key.lower()
        }
        for key, confidence in sorted_keys[1:4]
    ]
    
    return {
        'detected_key': best_key[0],
        'confidence': round(best_key[1], 2),
        'is_minor': 'm' in best_key[0].lower(),
        'alternative_keys': alternative_keys
    }


def _extract_chords_from_content(content: str) -> List[str]:
    """Extract chord names from ChordPro content."""
    chord_pattern = re.compile(r'\[([^\]]+)\]')
    chords = []
    
    for match in chord_pattern.finditer(content):
        chord = match.group(1).strip()
        if _is_valid_chord_simple(chord):
            chords.append(chord)
    
    return chords


def _is_valid_chord_simple(chord: str) -> bool:
    """Simple chord validation for key detection."""
    if not chord.strip():
        return False
    
    # Basic chord pattern: Root + optional modifiers
    chord_pattern = r'^[A-G][#b]?[mM]?(?:maj|min|dim|aug|sus|add)?[0-9]*(?:[#b]?[0-9]*)?(?:/[A-G][#b]?)?$'
    return bool(re.match(chord_pattern, chord.strip()))


def _analyze_chord_frequency(chords: List[str]) -> Dict[str, int]:
    """Analyze frequency of chord roots."""
    frequency = {}
    
    for chord in chords:
        root = _extract_chord_root(chord)
        if root:
            # Normalize enharmonic equivalents
            normalized_root = ENHARMONIC_MAP.get(root, root)
            frequency[normalized_root] = frequency.get(normalized_root, 0) + 1
    
    return frequency


def _extract_chord_root(chord: str) -> Optional[str]:
    """Extract the root note from a chord."""
    # Simple pattern to extract root: first 1-2 characters (note + optional accidental)
    root_pattern = r'^([A-G][#b]?)'
    match = re.match(root_pattern, chord.strip())
    return match.group(1) if match else None


def _calculate_key_probabilities(chord_frequency: Dict[str, int]) -> Dict[str, float]:
    """Calculate probabilities for each possible key using music theory analysis."""
    key_probabilities = {}
    
    # Initialize all keys with base probability
    for key in CIRCLE_OF_FIFTHS.keys():
        key_probabilities[key] = 0.0
    
    # Get total number of chords for normalization
    total_chords = sum(chord_frequency.values())
    if total_chords == 0:
        return key_probabilities
    
    # Major scale diatonic pattern
    major_diatonic_pattern = [
        {'interval': 0, 'quality': 'major', 'weight': 3.0},    # I - tonic
        {'interval': 2, 'quality': 'minor', 'weight': 1.0},    # ii
        {'interval': 4, 'quality': 'minor', 'weight': 1.0},    # iii  
        {'interval': 5, 'quality': 'major', 'weight': 2.0},    # IV - subdominant
        {'interval': 7, 'quality': 'major', 'weight': 2.5},    # V - dominant
        {'interval': 9, 'quality': 'minor', 'weight': 1.5},    # vi
        {'interval': 11, 'quality': 'diminished', 'weight': 0.5} # vii°
    ]
    
    # Minor scale diatonic pattern
    minor_diatonic_pattern = [
        {'interval': 0, 'quality': 'minor', 'weight': 3.0},    # i - tonic
        {'interval': 2, 'quality': 'diminished', 'weight': 0.5}, # ii°
        {'interval': 3, 'quality': 'major', 'weight': 1.5},    # III
        {'interval': 5, 'quality': 'minor', 'weight': 2.0},    # iv - subdominant
        {'interval': 7, 'quality': 'minor', 'weight': 2.0},    # v
        {'interval': 8, 'quality': 'major', 'weight': 1.5},    # VI
        {'interval': 10, 'quality': 'major', 'weight': 1.0}    # VII
    ]
    
    for key in CIRCLE_OF_FIFTHS.keys():
        is_minor_key = 'm' in key.lower()
        root_note = key[:-1] if is_minor_key else key
        
        # Get the root note index in chromatic scale
        try:
            root_index = CHROMATIC_SCALE.index(ENHARMONIC_MAP.get(root_note, root_note))
        except ValueError:
            continue
        
        pattern = minor_diatonic_pattern if is_minor_key else major_diatonic_pattern
        score = 0.0
        
        for chord_info in pattern:
            interval = chord_info['interval']
            weight = chord_info['weight']
            
            scale_note_index = (root_index + interval) % 12
            scale_note = CHROMATIC_SCALE[scale_note_index]
            frequency = chord_frequency.get(scale_note, 0)
            
            if frequency > 0:
                score += frequency * weight
        
        # Normalize score by total chords and convert to probability (0-1)
        if total_chords > 0:
            key_probabilities[key] = score / (total_chords * 3.0)  # Divide by max possible weight
    
    return key_probabilities