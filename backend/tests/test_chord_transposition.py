"""
Test cases for chord transposition utilities and API endpoints.
"""

import pytest
from chordme.chordpro_utils import (
    transpose_chord, 
    transpose_chordpro_content, 
    parse_chord,
    transpose_chord_with_key,
    transpose_chord_intelligent,
    transpose_chordpro_content_with_key,
    convert_notation,
    extract_key_signature,
    parse_chord_enhanced
)


class TestChordParsing:
    """Test chord parsing functionality."""
    
    def test_parse_natural_chords(self):
        """Test parsing of natural chords."""
        result = parse_chord('C')
        assert result == {'root': 'C', 'modifiers': ''}
        
        result = parse_chord('Am')
        assert result == {'root': 'A', 'modifiers': 'm'}
        
        result = parse_chord('G7')
        assert result == {'root': 'G', 'modifiers': '7'}
    
    def test_parse_sharp_chords(self):
        """Test parsing of sharp chords."""
        result = parse_chord('C#')
        assert result == {'root': 'C#', 'modifiers': ''}
        
        result = parse_chord('F#m')
        assert result == {'root': 'F#', 'modifiers': 'm'}
        
        result = parse_chord('D#maj7')
        assert result == {'root': 'D#', 'modifiers': 'maj7'}
    
    def test_parse_flat_chords(self):
        """Test parsing of flat chords."""
        result = parse_chord('Bb')
        assert result == {'root': 'Bb', 'modifiers': ''}
        
        result = parse_chord('Ebm')
        assert result == {'root': 'Eb', 'modifiers': 'm'}
        
        result = parse_chord('Abmaj7')
        assert result == {'root': 'Ab', 'modifiers': 'maj7'}
    
    def test_parse_complex_chords(self):
        """Test parsing of complex chords."""
        result = parse_chord('Cmaj7')
        assert result == {'root': 'C', 'modifiers': 'maj7'}
        
        result = parse_chord('Am7')
        assert result == {'root': 'A', 'modifiers': 'm7'}
        
        result = parse_chord('F#sus4')
        assert result == {'root': 'F#', 'modifiers': 'sus4'}
        
        result = parse_chord('C/E')
        assert result == {'root': 'C', 'modifiers': '/E'}
    
    def test_parse_empty_chord(self):
        """Test parsing of empty chord."""
        result = parse_chord('')
        assert result == {'root': '', 'modifiers': ''}
        
        result = parse_chord('   ')
        assert result == {'root': '', 'modifiers': ''}


class TestChordTransposition:
    """Test individual chord transposition functionality."""
    
    def test_transpose_basic_chords(self):
        """Test transposition of basic major chords."""
        # C up 2 semitones = D
        assert transpose_chord('C', 2) == 'D'
        
        # G up 1 semitone = G#
        assert transpose_chord('G', 1) == 'G#'
        
        # A up 3 semitones = C
        assert transpose_chord('A', 3) == 'C'
    
    def test_transpose_minor_chords(self):
        """Test transposition of minor chords."""
        # Am up 2 semitones = Bm
        assert transpose_chord('Am', 2) == 'Bm'
        
        # Em down 1 semitone = D#m
        assert transpose_chord('Em', -1) == 'D#m'
        
        # Fm up 7 semitones = Cm
        assert transpose_chord('Fm', 7) == 'Cm'
    
    def test_transpose_complex_chords(self):
        """Test transposition of complex chords."""
        # Cmaj7 up 1 semitone = C#maj7
        assert transpose_chord('Cmaj7', 1) == 'C#maj7'
        
        # F#m7 up 3 semitones = Am7
        assert transpose_chord('F#m7', 3) == 'Am7'
        
        # Gsus4 down 2 semitones = Fsus4
        assert transpose_chord('Gsus4', -2) == 'Fsus4'
    
    def test_transpose_flat_chords(self):
        """Test transposition of flat chords (should convert to sharps)."""
        # Bb up 1 semitone = B (using enharmonic conversion)
        assert transpose_chord('Bb', 1) == 'B'
        
        # Eb up 2 semitones = F
        assert transpose_chord('Eb', 2) == 'F'
        
        # Ab down 1 semitone = G
        assert transpose_chord('Ab', -1) == 'G'
    
    def test_transpose_wrap_around(self):
        """Test transposition wrapping around the chromatic scale."""
        # B up 1 semitone = C (wraps around)
        assert transpose_chord('B', 1) == 'C'
        
        # C down 1 semitone = B (wraps around)
        assert transpose_chord('C', -1) == 'B'
        
        # A up 15 semitones = A (full octave + 3 semitones)
        assert transpose_chord('A', 15) == 'C'
    
    def test_transpose_zero_semitones(self):
        """Test transposition by zero semitones."""
        assert transpose_chord('C', 0) == 'C'
        assert transpose_chord('Am7', 0) == 'Am7'
        assert transpose_chord('F#sus4', 0) == 'F#sus4'
    
    def test_transpose_slash_chords(self):
        """Test transposition of slash chords."""
        # Both root note and bass note should be transposed to maintain relationships
        assert transpose_chord('C/E', 2) == 'D/F#'
        assert transpose_chord('G/B', 1) == 'G#/C'
    
    def test_transpose_invalid_chords(self):
        """Test transposition of invalid chords."""
        # Invalid chords should return unchanged
        assert transpose_chord('', 2) == ''
        assert transpose_chord('invalid', 2) == 'invalid'
        assert transpose_chord('H', 2) == 'H'  # Invalid note
    
    def test_transpose_negative_large_values(self):
        """Test transposition with large negative values."""
        # Test wrapping with large negative values
        assert transpose_chord('C', -13) == 'B'  # -13 % 12 = -1, then +12 = 11 (B)
        assert transpose_chord('G', -25) == 'F#'  # G index=7, (7-25)%12 = 6, which is F#


class TestChordProContentTransposition:
    """Test ChordPro content transposition functionality."""
    
    def test_transpose_simple_content(self):
        """Test transposition of simple ChordPro content."""
        content = '[C]Hello [G]world [Am]test'
        result = transpose_chordpro_content(content, 2)
        expected = '[D]Hello [A]world [Bm]test'
        assert result == expected
    
    def test_transpose_with_lyrics(self):
        """Test transposition preserving lyrics and formatting."""
        content = """[C]Amazing [G]grace, how [Am]sweet the [F]sound
[C]That saved a [G]wretch like [C]me"""
        result = transpose_chordpro_content(content, 1)
        expected = """[C#]Amazing [G#]grace, how [A#m]sweet the [F#]sound
[C#]That saved a [G#]wretch like [C#]me"""
        assert result == expected
    
    def test_transpose_with_directives(self):
        """Test transposition preserving ChordPro directives."""
        content = """{title: Test Song}
{artist: Test Artist}
{key: C}

[C]Test [G]content [Am]here
{comment: Verse 1}
[F]More [C]chords"""
        result = transpose_chordpro_content(content, 2)
        expected = """{title: Test Song}
{artist: Test Artist}
{key: C}

[D]Test [A]content [Bm]here
{comment: Verse 1}
[G]More [D]chords"""
        assert result == expected
    
    def test_transpose_complex_chords(self):
        """Test transposition of complex chord progressions."""
        content = '[Cmaj7]Test [F#m7]progression [Bb]with [G/B]various chords'
        result = transpose_chordpro_content(content, 3)
        expected = '[D#maj7]Test [Am7]progression [C#]with [A#/D]various chords'
        assert result == expected
    
    def test_transpose_zero_semitones(self):
        """Test transposition by zero semitones."""
        content = '[C]Test [G]content'
        result = transpose_chordpro_content(content, 0)
        assert result == content
    
    def test_transpose_empty_content(self):
        """Test transposition of empty content."""
        assert transpose_chordpro_content('', 2) == ''
        assert transpose_chordpro_content('No chords here', 2) == 'No chords here'
    
    def test_transpose_negative_semitones(self):
        """Test transposition with negative semitones."""
        content = '[C]Hello [G]world'
        result = transpose_chordpro_content(content, -1)
        expected = '[B]Hello [F#]world'
        assert result == expected
    
    def test_transpose_mixed_valid_invalid_chords(self):
        """Test transposition with mix of valid and invalid chords."""
        content = '[C]Valid [invalid]Invalid [G]Valid [xyz]Invalid'
        result = transpose_chordpro_content(content, 2)
        expected = '[D]Valid [invalid]Invalid [A]Valid [xyz]Invalid'
        assert result == expected
    
    def test_transpose_with_empty_brackets(self):
        """Test transposition with empty chord brackets."""
        content = '[C]Test [] [G]content'
        result = transpose_chordpro_content(content, 2)
        expected = '[D]Test [] [A]content'
        assert result == expected
    
    def test_transpose_preserves_formatting(self):
        """Test that transposition preserves whitespace and formatting."""
        content = """  [C]  Spaced   [G]  content  
        
[Am] Indented chord"""
        result = transpose_chordpro_content(content, 1)
        expected = """  [C#]  Spaced   [G#]  content  
        
[A#m] Indented chord"""
        assert result == expected


class TestChordTranspositionEdgeCases:
    """Test edge cases for chord transposition."""
    
    def test_transpose_large_positive_values(self):
        """Test transposition with large positive semitone values."""
        # Should wrap around correctly
        assert transpose_chord('C', 12) == 'C'  # Full octave
        assert transpose_chord('C', 13) == 'C#'  # Octave + 1
        assert transpose_chord('C', 24) == 'C'  # Two octaves
    
    def test_transpose_maximum_range(self):
        """Test transposition across maximum theoretical range."""
        # Test all 12 semitones up
        expected_progression = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        for i, expected in enumerate(expected_progression):
            assert transpose_chord('C', i) == expected
    
    def test_transpose_all_chromatic_notes(self):
        """Test transposition starting from each chromatic note."""
        chromatic_scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        for start_note in chromatic_scale:
            # Each note up 1 semitone should give the next note in the scale
            start_index = chromatic_scale.index(start_note)
            next_index = (start_index + 1) % 12
            expected = chromatic_scale[next_index]
            assert transpose_chord(start_note, 1) == expected
    
    def test_content_with_special_characters(self):
        """Test transposition of content with special characters."""
        content = '[C]Test with "quotes" [G]and \'apostrophes\' [Am]& symbols!'
        result = transpose_chordpro_content(content, 2)
        expected = '[D]Test with "quotes" [A]and \'apostrophes\' [Bm]& symbols!'
        assert result == expected


class TestEnhancedChordTransposition:
    """Test enhanced chord transposition functionality."""
    
    def test_transpose_with_key_signature_sharp_keys(self):
        """Test transposition with sharp key preferences."""
        # G major (1 sharp) should prefer sharps
        assert transpose_chord_with_key('C', 1, 'G') == 'C#'
        assert transpose_chord_with_key('F', 1, 'D') == 'F#'  # D major (2 sharps)
    
    def test_transpose_with_key_signature_flat_keys(self):
        """Test transposition with flat key preferences.""" 
        # F major (1 flat) should prefer flats
        assert transpose_chord_with_key('C', 1, 'F') == 'Db'
        assert transpose_chord_with_key('A', 1, 'Bb') == 'Bb'  # Bb major (2 flats)
    
    def test_transpose_with_minor_keys(self):
        """Test transposition with minor key signatures."""
        # E minor (1 sharp) should prefer sharps
        assert transpose_chord_with_key('C', 1, 'Em') == 'C#'
        # D minor (1 flat) should prefer flats
        assert transpose_chord_with_key('C', 1, 'Dm') == 'Db'
    
    def test_transpose_slash_chords_with_key(self):
        """Test slash chord transposition with key signature."""
        assert transpose_chord_with_key('C/E', 2, 'G') == 'D/F#'
        assert transpose_chord_with_key('F/A', -1, 'F') == 'E/Ab'
    
    def test_transpose_content_with_key_detection(self):
        """Test content transposition with automatic key detection."""
        content = """{key: F}
[C]Test [G]content"""
        result = transpose_chordpro_content_with_key(content, 1)
        expected = """{key: F}
[Db]Test [Ab]content"""
        assert result == expected
    
    def test_transpose_intelligent_preserve_enharmonics(self):
        """Test intelligent transposition preserving enharmonics."""
        # Should maintain flat preference
        result = transpose_chord_intelligent('Bb', 1, preserve_enharmonics=True)
        assert result == 'B'
        
        # Should maintain sharp preference  
        result = transpose_chord_intelligent('C#', 1, preserve_enharmonics=True)
        assert result == 'D'
    
    def test_transpose_with_preferred_accidentals(self):
        """Test transposition with preferred accidental styles."""
        # Force flat preference
        result = transpose_chord_intelligent('C', 1, preferred_accidentals='flats')
        assert result == 'Db'
        
        # Force sharp preference
        result = transpose_chord_intelligent('C', 1, preferred_accidentals='sharps')
        assert result == 'C#'
    
    def test_notation_system_conversion(self):
        """Test conversion between notation systems."""
        # American to Latin
        assert convert_notation('C', 'american', 'latin') == 'Do'
        assert convert_notation('D', 'american', 'latin') == 'Re'
        
        # Latin to American
        assert convert_notation('Do', 'latin', 'american') == 'C'
        assert convert_notation('Re', 'latin', 'american') == 'D'
        
        # Unknown notes should be unchanged
        assert convert_notation('X', 'american', 'latin') == 'X'
    
    def test_large_semitone_values(self):
        """Test transposition with large semitone values."""
        # Should wrap around correctly
        assert transpose_chord('C', 15) == 'D#'  # 15 % 12 = 3 semitones
        assert transpose_chord('C', -15) == 'A'  # -15 + 24 = 9 semitones
    
    def test_invalid_key_signature_handling(self):
        """Test graceful handling of invalid key signatures."""
        # Should default to sharp preference
        assert transpose_chord_with_key('C', 1, 'InvalidKey') == 'C#'
        assert transpose_chord_with_key('C', 1, '') == 'C#'
    
    def test_extract_key_signature(self):
        """Test key signature extraction from content."""
        content1 = "{key: G}\n[C]Test content"
        assert extract_key_signature(content1) == 'G'
        
        content2 = "{Key: Am}\n[C]Test content"  
        assert extract_key_signature(content2) == 'Am'
        
        content3 = "[C]No key signature"
        assert extract_key_signature(content3) is None
    
    def test_enhanced_chord_parsing(self):
        """Test enhanced chord parsing functionality."""
        # Regular chord
        result = parse_chord_enhanced('Cmaj7')
        assert result['root'] == 'C'
        assert result['modifiers'] == 'maj7'
        assert result['bass_note'] is None
        assert result['is_slash_chord'] is False
        
        # Slash chord
        result = parse_chord_enhanced('C/E')
        assert result['root'] == 'C'
        assert result['modifiers'] == ''
        assert result['bass_note'] == 'E'
        assert result['is_slash_chord'] is True