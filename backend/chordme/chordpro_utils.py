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
        Check if a chord notation is valid.
        
        Args:
            chord: The chord string (e.g., "C", "Am", "F#m7")
            
        Returns:
            bool: True if chord has valid syntax
        """
        if not chord.strip():
            return False
            
        # Updated chord pattern: note + optional modifiers + extended notations + slash chords
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