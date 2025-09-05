"""
Enhanced Chord Recognition Engine for Python Backend

This module provides comprehensive chord recognition and parsing capabilities
supporting various chord formats and notations.
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass


@dataclass
class ChordComponents:
    """Structure representing chord components"""
    root: str = ""
    accidental: Optional[str] = None
    quality: Optional[str] = None
    extension: Optional[str] = None
    suspension: Optional[str] = None
    addition: Optional[str] = None
    modification: Optional[str] = None
    bass_note: Optional[str] = None


@dataclass
class ParsedChord:
    """Structure representing a parsed chord"""
    original: str
    normalized: str
    components: ChordComponents
    is_valid: bool
    quality: str  # 'major', 'minor', 'diminished', 'augmented', 'suspended', 'unknown'
    enharmonic_equivalents: List[str]
    errors: Optional[List[str]] = None


class ChordRecognitionEngine:
    """Enhanced chord recognition engine for Python backend"""
    
    # Enhanced chord patterns
    CHORD_PATTERNS = {
        'root': re.compile(r'^([A-G])'),
        'accidental': re.compile(r'^[A-G]([#b])'),
        'quality': re.compile(r'^[A-G][#b]?(maj|min|dim|aug|m|°|o|\+)(?![a-z])', re.IGNORECASE),
        'extension': re.compile(r'(?:maj|min|dim|aug|M)?([67]|9|11|13|add[29]|add11|add13)', re.IGNORECASE),
        'suspension': re.compile(r'(sus[24]?)', re.IGNORECASE),
        'modification': re.compile(r'([#b][59]|[#b]11|[#b]13)'),
        'slash_chord': re.compile(r'/([A-G][#b]?)'),
        'full': re.compile(r'^[A-G][#b]?(?:(?:maj|min|major|dim|aug|sus[24]?|add[29]|add1[13]|M|m|°|o|\+)?(?:[67]|9|11|13)?(?:[#b][59]|[#b]1[13])*(?:/[A-G][#b]?)?)?$', re.IGNORECASE)
    }
    
    # Enharmonic equivalents mapping
    ENHARMONIC_EQUIVALENTS = {
        'C#': ['Db'],
        'Db': ['C#'],
        'D#': ['Eb'],
        'Eb': ['D#'],
        'F#': ['Gb'],
        'Gb': ['F#'],
        'G#': ['Ab'],
        'Ab': ['G#'],
        'A#': ['Bb'],
        'Bb': ['A#']
    }
    
    # Note translations for different languages/notations
    NOTE_TRANSLATIONS = {
        # Spanish/Latin notation
        'Do': 'C',
        'Re': 'D',
        'Mi': 'E',
        'Fa': 'F',
        'Sol': 'G',
        'La': 'A',
        'Si': 'B',
        # German notation
        'H': 'B'
    }
    
    # Quality detection patterns
    QUALITY_PATTERNS = {
        'major': re.compile(r'^[A-G][#b]?(?!.*(?:m|min|dim|aug|°|o|\+))', re.IGNORECASE),
        'minor': re.compile(r'^[A-G][#b]?(?:m|min)(?!aj)', re.IGNORECASE),
        'diminished': re.compile(r'^[A-G][#b]?(?:dim|°|o)', re.IGNORECASE),
        'augmented': re.compile(r'^[A-G][#b]?(?:aug|\+)', re.IGNORECASE),
        'suspended': re.compile(r'^[A-G][#b]?.*sus', re.IGNORECASE)
    }
    
    def parse_chord(self, input_chord: str) -> ParsedChord:
        """Parse a chord notation into its components"""
        original = input_chord.strip()
        errors = []
        
        if not original:
            return self._create_invalid_chord(original, ['Empty chord notation'])
        
        # Normalize input (handle different notations)
        normalized = self._normalize_chord_notation(original)
        
        # Basic validation using comprehensive pattern
        if not self.CHORD_PATTERNS['full'].match(normalized):
            errors.append(f'Invalid chord format: {original}')
            return self._create_invalid_chord(original, errors)
        
        # Extract components
        components = self._extract_components(normalized)
        
        # Determine chord quality
        quality = self._determine_quality(normalized)
        
        # Get enharmonic equivalents
        root_with_accidental = components.root + (components.accidental or '')
        enharmonic_equivalents = self.get_enharmonic_equivalents(root_with_accidental)
        
        return ParsedChord(
            original=original,
            normalized=normalized,
            components=components,
            is_valid=True,
            quality=quality,
            enharmonic_equivalents=enharmonic_equivalents
        )
    
    def is_valid_chord(self, chord: str) -> bool:
        """Validate if a chord notation is valid"""
        return self.parse_chord(chord).is_valid
    
    def get_enharmonic_equivalents(self, note: str) -> List[str]:
        """Get all possible enharmonic equivalents for a note"""
        # Handle both uppercase and preserve proper case for flats/sharps
        normalized_note = note[0].upper() + note[1:] if len(note) > 1 else note.upper()
        return self.ENHARMONIC_EQUIVALENTS.get(normalized_note, [])
    
    def _normalize_chord_notation(self, chord: str) -> str:
        """Normalize chord notation (handle different languages/formats)"""
        normalized = chord.strip()
        
        # Handle Spanish/Latin notation
        for foreign, english in self.NOTE_TRANSLATIONS.items():
            pattern = re.compile(f'^{foreign}(?![a-z])', re.IGNORECASE)
            normalized = pattern.sub(english, normalized)
        
        # Normalize quality indicators
        normalized = re.sub(r'major', 'maj', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'minor', 'min', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'dim', 'dim', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'aug', 'aug', normalized, flags=re.IGNORECASE)
        normalized = normalized.replace('°', 'dim')
        normalized = normalized.replace('o', 'dim')
        normalized = normalized.replace('+', 'aug')
        
        return normalized
    
    def _extract_components(self, chord: str) -> ChordComponents:
        """Extract chord components"""
        components = ChordComponents()
        
        # Extract root note
        root_match = self.CHORD_PATTERNS['root'].match(chord)
        if root_match:
            components.root = root_match.group(1)
        
        # Extract accidental
        accidental_match = self.CHORD_PATTERNS['accidental'].match(chord)
        if accidental_match:
            components.accidental = accidental_match.group(1)
        
        # Extract quality
        quality_match = self.CHORD_PATTERNS['quality'].match(chord)
        if quality_match:
            components.quality = quality_match.group(1)
        
        # Extract extension
        extension_match = self.CHORD_PATTERNS['extension'].search(chord)
        if extension_match:
            components.extension = extension_match.group(1)
        
        # Extract suspension
        suspension_match = self.CHORD_PATTERNS['suspension'].search(chord)
        if suspension_match:
            components.suspension = suspension_match.group(1)
        
        # Extract modifications
        modification_matches = self.CHORD_PATTERNS['modification'].findall(chord)
        if modification_matches:
            components.modification = ','.join(modification_matches)
        
        # Extract bass note (slash chord)
        slash_match = self.CHORD_PATTERNS['slash_chord'].search(chord)
        if slash_match:
            components.bass_note = slash_match.group(1)
        
        return components
    
    def _determine_quality(self, chord: str) -> str:
        """Determine chord quality"""
        if self.QUALITY_PATTERNS['suspended'].match(chord):
            return 'suspended'
        if self.QUALITY_PATTERNS['diminished'].match(chord):
            return 'diminished'
        if self.QUALITY_PATTERNS['augmented'].match(chord):
            return 'augmented'
        if self.QUALITY_PATTERNS['minor'].match(chord):
            return 'minor'
        if self.QUALITY_PATTERNS['major'].match(chord):
            return 'major'
        return 'unknown'
    
    def _create_invalid_chord(self, original: str, errors: List[str]) -> ParsedChord:
        """Create invalid chord result"""
        return ParsedChord(
            original=original,
            normalized=original,
            components=ChordComponents(),
            is_valid=False,
            quality='unknown',
            enharmonic_equivalents=[],
            errors=errors
        )
    
    def parse_chords(self, chords: List[str]) -> List[ParsedChord]:
        """Batch parse multiple chords"""
        return [self.parse_chord(chord) for chord in chords]
    
    def extract_chords_from_content(self, content: str) -> List[ParsedChord]:
        """Extract chords from ChordPro content"""
        chord_pattern = re.compile(r'\[([^\]]+)\]')
        chords = []
        unique_chords = set()
        
        for match in chord_pattern.finditer(content):
            chord_name = match.group(1).strip()
            if chord_name and chord_name not in unique_chords:
                chords.append(chord_name)
                unique_chords.add(chord_name)
        
        return self.parse_chords(chords)
    
    def validate_chordpro_content(self, content: str) -> Dict[str, Any]:
        """Validate ChordPro content and return detailed analysis"""
        parsed_chords = self.extract_chords_from_content(content)
        invalid_chords = [chord for chord in parsed_chords if not chord.is_valid]
        valid_chords = [chord for chord in parsed_chords if chord.is_valid]
        
        # Analyze unique roots
        unique_roots = list(set(
            chord.components.root + (chord.components.accidental or '')
            for chord in valid_chords
            if chord.components.root
        ))
        
        # Analyze qualities
        qualities = {}
        for chord in valid_chords:
            quality = chord.quality
            qualities[quality] = qualities.get(quality, 0) + 1
        
        return {
            'is_valid': len(invalid_chords) == 0,
            'total_chords': len(parsed_chords),
            'valid_chords': len(valid_chords),
            'invalid_chords': [
                {
                    'chord': chord.original,
                    'errors': chord.errors or []
                }
                for chord in invalid_chords
            ],
            'unique_roots': unique_roots,
            'qualities': qualities
        }


# Create singleton instance
chord_recognition_engine = ChordRecognitionEngine()


# Legacy compatibility functions
def is_valid_chord(chord: str) -> bool:
    """Legacy compatibility function for chord validation"""
    return chord_recognition_engine.is_valid_chord(chord)


def parse_chord(chord: str) -> Dict[str, Any]:
    """Legacy compatibility function for chord parsing"""
    result = chord_recognition_engine.parse_chord(chord)
    return {
        'original': result.original,
        'normalized': result.normalized,
        'is_valid': result.is_valid,
        'quality': result.quality,
        'components': {
            'root': result.components.root,
            'accidental': result.components.accidental,
            'quality': result.components.quality,
            'extension': result.components.extension,
            'suspension': result.components.suspension,
            'bass_note': result.components.bass_note
        },
        'enharmonic_equivalents': result.enharmonic_equivalents,
        'errors': result.errors
    }