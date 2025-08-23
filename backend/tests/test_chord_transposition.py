"""
Test cases for chord transposition utilities and API endpoints.
"""

import pytest
from chordme.chordpro_utils import transpose_chord, transpose_chordpro_content, parse_chord


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
        # Only root note should be transposed, not bass note
        assert transpose_chord('C/E', 2) == 'D/E'
        assert transpose_chord('G/B', 1) == 'G#/B'
    
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
        expected = '[D#maj7]Test [Am7]progression [C#]with [A#/B]various chords'
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