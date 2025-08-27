"""
Comprehensive tests for ChordPro utilities functionality.
"""

import pytest
from chordme.chordpro_utils import (
    ChordProValidator, validate_chordpro_content
)


class TestChordProValidator:
    """Test ChordProValidator class functionality."""
    
    def test_validator_init(self):
        """Test validator initialization."""
        validator = ChordProValidator()
        assert validator is not None
        
    def test_is_valid_directive_basic(self):
        """Test basic directive validation."""
        validator = ChordProValidator()
        
        # Valid directives
        assert validator.is_valid_directive("{title: Test Song}") is True
        assert validator.is_valid_directive("{artist: Test Artist}") is True
        assert validator.is_valid_directive("{key: C}") is True
        assert validator.is_valid_directive("{tempo: 120}") is True
        assert validator.is_valid_directive("{capo: 2}") is True
        
    def test_is_valid_directive_invalid(self):
        """Test invalid directive validation."""
        validator = ChordProValidator()
        
        # Invalid directives
        assert validator.is_valid_directive("title: Test Song") is False  # Missing braces
        assert validator.is_valid_directive("{invalid}") is False  # No colon
        assert validator.is_valid_directive("") is False  # Empty string
        assert validator.is_valid_directive("not a directive") is False
        
    def test_is_valid_directive_edge_cases(self):
        """Test directive validation edge cases."""
        validator = ChordProValidator()
        
        # Edge cases
        assert validator.is_valid_directive("{title:}") is True  # Empty value
        assert validator.is_valid_directive("{title: }") is True  # Space only value
        assert validator.is_valid_directive("{title:Test}") is True  # No space after colon
        assert validator.is_valid_directive("{ title: Test }") is True  # Extra spaces
        
    def test_is_valid_chord_basic(self):
        """Test basic chord validation."""
        validator = ChordProValidator()
        
        # Basic major chords
        assert validator.is_valid_chord("C") is True
        assert validator.is_valid_chord("G") is True
        assert validator.is_valid_chord("F") is True
        assert validator.is_valid_chord("A") is True
        assert validator.is_valid_chord("D") is True
        assert validator.is_valid_chord("E") is True
        assert validator.is_valid_chord("B") is True
        
    def test_is_valid_chord_with_modifiers(self):
        """Test chord validation with modifiers."""
        validator = ChordProValidator()
        
        # Chords with sharps and flats
        assert validator.is_valid_chord("C#") is True
        assert validator.is_valid_chord("Bb") is True
        assert validator.is_valid_chord("F#") is True
        assert validator.is_valid_chord("Ab") is True
        
        # Minor chords
        assert validator.is_valid_chord("Am") is True
        assert validator.is_valid_chord("Dm") is True
        assert validator.is_valid_chord("Em") is True
        
        # Extended chords
        assert validator.is_valid_chord("C7") is True
        assert validator.is_valid_chord("Gmaj7") is True
        assert validator.is_valid_chord("Am7") is True
        assert validator.is_valid_chord("F#m7b5") is True
        
    def test_is_valid_chord_complex(self):
        """Test complex chord validation."""
        validator = ChordProValidator()
        
        # Complex chords
        assert validator.is_valid_chord("Cmaj9") is True
        assert validator.is_valid_chord("G13") is True
        assert validator.is_valid_chord("Am9") is True
        assert validator.is_valid_chord("F#dim7") is True
        assert validator.is_valid_chord("Baug") is True
        assert validator.is_valid_chord("Csus4") is True
        assert validator.is_valid_chord("G/B") is True  # Slash chord
        
    def test_is_valid_chord_invalid(self):
        """Test invalid chord validation."""
        validator = ChordProValidator()
        
        # Invalid chords
        assert validator.is_valid_chord("") is False
        assert validator.is_valid_chord("X") is False  # Invalid root note
        assert validator.is_valid_chord("C##") is False  # Double sharp not standard
        assert validator.is_valid_chord("123") is False  # Numbers only
        assert validator.is_valid_chord("not_a_chord") is False
        
    def test_extract_directives_basic(self):
        """Test basic directive extraction."""
        validator = ChordProValidator()
        
        content = """{title: Test Song}
{artist: Test Artist}
{key: C}
This is lyrics with [C]chord [G]notation"""
        
        directives = validator.extract_directives(content)
        
        assert len(directives) == 3
        assert ("title", "Test Song") in directives
        assert ("artist", "Test Artist") in directives
        assert ("key", "C") in directives
        
    def test_extract_directives_empty(self):
        """Test directive extraction with no directives."""
        validator = ChordProValidator()
        
        content = "Just lyrics with [C]some [G]chords"
        directives = validator.extract_directives(content)
        
        assert len(directives) == 0
        
    def test_extract_directives_mixed_content(self):
        """Test directive extraction with mixed content."""
        validator = ChordProValidator()
        
        content = """{title: Song Title}
Verse with [Am]chords
{artist: Song Artist}
More lyrics [F]here
{tempo: 120}"""
        
        directives = validator.extract_directives(content)
        
        assert len(directives) == 3
        assert ("title", "Song Title") in directives
        assert ("artist", "Song Artist") in directives
        assert ("tempo", "120") in directives
        
    def test_extract_chords_basic(self):
        """Test basic chord extraction."""
        validator = ChordProValidator()
        
        content = "This is [C]lyrics with [G]chords and [Am]more [F]chords"
        chords = validator.extract_chords(content)
        
        assert len(chords) == 4
        assert "C" in chords
        assert "G" in chords
        assert "Am" in chords
        assert "F" in chords
        
    def test_extract_chords_no_chords(self):
        """Test chord extraction with no chords."""
        validator = ChordProValidator()
        
        content = "This is just lyrics without any chord notation"
        chords = validator.extract_chords(content)
        
        assert len(chords) == 0
        
    def test_extract_chords_complex(self):
        """Test chord extraction with complex chords."""
        validator = ChordProValidator()
        
        content = "Complex [Cmaj7]chords [F#m7b5]here [G13]and [Am9]there"
        chords = validator.extract_chords(content)
        
        assert len(chords) == 4
        assert "Cmaj7" in chords
        assert "F#m7b5" in chords
        assert "G13" in chords
        assert "Am9" in chords
        
    def test_extract_chords_duplicate_removal(self):
        """Test that duplicate chords are removed."""
        validator = ChordProValidator()
        
        content = "[C]First [G]chord [C]repeated [G]again"
        chords = validator.extract_chords(content)
        
        assert len(chords) == 2  # Should remove duplicates
        assert "C" in chords
        assert "G" in chords
        
    def test_validate_content_valid(self):
        """Test validation of valid ChordPro content."""
        validator = ChordProValidator()
        
        content = """{title: Test Song}
{artist: Test Artist}
{key: C}

[C]This is a [G]valid ChordPro [Am]song
With [F]proper formatting [G]and [C]chords"""
        
        result = validator.validate_content(content)
        
        assert result['valid'] is True
        assert 'message' in result
        assert len(result.get('errors', [])) == 0
        
    def test_validate_content_warnings(self):
        """Test validation with warnings."""
        validator = ChordProValidator()
        
        content = """{artist: Test Artist}
{key: C}

[C]This song has [G]no title [Am]directive"""
        
        result = validator.validate_content(content)
        
        # Might be valid but with warnings
        assert 'warnings' in result or 'message' in result
        
    def test_validate_content_invalid_chords(self):
        """Test validation with invalid chords."""
        validator = ChordProValidator()
        
        content = """{title: Test Song}
[X]Invalid [Y]chord [Z]notation"""
        
        result = validator.validate_content(content)
        
        # Should detect invalid chords
        assert result['valid'] is False or 'warnings' in result
        
    def test_validate_content_empty(self):
        """Test validation of empty content."""
        validator = ChordProValidator()
        
        result = validator.validate_content("")
        
        assert result['valid'] is False
        assert 'message' in result
        
    def test_get_song_metadata_basic(self):
        """Test song metadata extraction."""
        validator = ChordProValidator()
        
        content = """{title: My Song}
{artist: My Artist}
{album: My Album}
{key: G}
{tempo: 120}
{capo: 2}"""
        
        metadata = validator.get_song_metadata(content)
        
        assert metadata['title'] == 'My Song'
        assert metadata['artist'] == 'My Artist'
        assert metadata['album'] == 'My Album'
        assert metadata['key'] == 'G'
        assert metadata['tempo'] == '120'
        assert metadata['capo'] == '2'
        
    def test_get_song_metadata_partial(self):
        """Test metadata extraction with missing fields."""
        validator = ChordProValidator()
        
        content = """{title: Partial Song}
{key: A}"""
        
        metadata = validator.get_song_metadata(content)
        
        assert metadata['title'] == 'Partial Song'
        assert metadata['key'] == 'A'
        assert metadata.get('artist') is None or metadata.get('artist') == ''
        
    def test_get_song_metadata_no_metadata(self):
        """Test metadata extraction with no metadata."""
        validator = ChordProValidator()
        
        content = "[C]Just chords [G]and lyrics [Am]here"
        metadata = validator.get_song_metadata(content)
        
        # Should return empty or default metadata
        assert isinstance(metadata, dict)


class TestValidateChordProContent:
    """Test standalone validate_chordpro_content function."""
    
    def test_validate_chordpro_content_function_valid(self):
        """Test validate_chordpro_content function with valid content."""
        content = """{title: Test Song}
{artist: Test Artist}
[C]Valid ChordPro [G]content [Am]here"""
        
        result = validate_chordpro_content(content)
        
        assert isinstance(result, dict)
        assert 'valid' in result
        assert 'message' in result
        
    def test_validate_chordpro_content_function_invalid(self):
        """Test validate_chordpro_content function with invalid content."""
        content = "[X]Invalid [Y]chords"
        
        result = validate_chordpro_content(content)
        
        assert isinstance(result, dict)
        assert 'valid' in result
        assert 'message' in result
        
    def test_validate_chordpro_content_function_empty(self):
        """Test validate_chordpro_content function with empty content."""
        result = validate_chordpro_content("")
        
        assert isinstance(result, dict)
        assert result['valid'] is False
        
    def test_validate_chordpro_content_function_none(self):
        """Test validate_chordpro_content function with None content."""
        result = validate_chordpro_content(None)
        
        assert isinstance(result, dict)
        assert result['valid'] is False


class TestChordProValidatorEdgeCases:
    """Test ChordPro validator edge cases and special scenarios."""
    
    def test_multiline_directives(self):
        """Test directives spanning multiple lines."""
        validator = ChordProValidator()
        
        content = """{title: Very Long Song Title That Might
        Span Multiple Lines}
{artist: Artist Name}"""
        
        # Should handle multiline gracefully
        directives = validator.extract_directives(content)
        assert len(directives) >= 1
        
    def test_chords_in_comments(self):
        """Test chords within comment sections."""
        validator = ChordProValidator()
        
        content = """# This is a comment with [C]fake chords
{title: Real Song}
[G]Real chords [Am]here"""
        
        chords = validator.extract_chords(content)
        # Should extract real chords, might include comment chords
        assert "G" in chords
        assert "Am" in chords
        
    def test_special_characters_in_content(self):
        """Test handling of special characters."""
        validator = ChordProValidator()
        
        content = """{title: Café Song}
{artist: José María}
[C]Lyrics with ñ, ü, and [G]other special characters"""
        
        metadata = validator.get_song_metadata(content)
        assert metadata['title'] == 'Café Song'
        assert metadata['artist'] == 'José María'
        
    def test_very_long_content(self):
        """Test validation of very long content."""
        validator = ChordProValidator()
        
        # Create long content
        verses = []
        for i in range(50):
            verses.append(f"[C]Verse {i} with [G]some [Am]chords [F]here")
            
        content = f"""{'{title: Long Song}'}
{'{artist: Long Artist}'}

{chr(10).join(verses)}"""
        
        result = validator.validate_content(content)
        assert isinstance(result, dict)
        assert 'valid' in result
        
    def test_nested_brackets(self):
        """Test handling of nested or malformed brackets."""
        validator = ChordProValidator()
        
        content = "This has [C[G]]nested [Am]brackets"
        chords = validator.extract_chords(content)
        
        # Should handle gracefully and extract valid chords
        assert "Am" in chords
        
    def test_performance_large_content(self):
        """Test performance with large content."""
        validator = ChordProValidator()
        
        # Create large content
        large_content = "{title: Performance Test}\n"
        for i in range(1000):
            large_content += f"[C]Line {i} with [G]chords [Am]here\n"
            
        import time
        start_time = time.time()
        result = validator.validate_content(large_content)
        end_time = time.time()
        
        # Should complete in reasonable time
        assert (end_time - start_time) < 2.0  # Less than 2 seconds
        assert isinstance(result, dict)
        
    def test_unicode_handling(self):
        """Test Unicode character handling."""
        validator = ChordProValidator()
        
        content = """{title: 🎵 Unicode Song 🎵}
{artist: Artist with émojis 🎸}
[C]Lyrics with 音楽 and [G]mixed 한국어 content"""
        
        metadata = validator.get_song_metadata(content)
        chords = validator.extract_chords(content)
        
        assert "🎵 Unicode Song 🎵" in metadata['title']
        assert "C" in chords
        assert "G" in chords
        
    def test_malformed_directive_handling(self):
        """Test handling of malformed directives."""
        validator = ChordProValidator()
        
        content = """{title Test Song  # Missing colon
{artist: Test Artist}
{key C}  # Missing colon
{tempo: 120}"""
        
        directives = validator.extract_directives(content)
        
        # Should extract valid directives and ignore malformed ones
        assert ("artist", "Test Artist") in directives
        assert ("tempo", "120") in directives
        
    def test_chord_validation_comprehensive(self):
        """Test comprehensive chord validation scenarios."""
        validator = ChordProValidator()
        
        test_chords = [
            # Valid chords
            ("C", True), ("G", True), ("Am", True), ("F#", True),
            ("Bb", True), ("Cmaj7", True), ("Gm7", True), ("F#dim", True),
            ("Baug", True), ("Csus2", True), ("Gsus4", True), ("Am7b5", True),
            ("C/E", True), ("G/B", True), ("Dm/F", True),
            
            # Invalid chords  
            ("", False), ("X", False), ("123", False), ("C##", False),
            ("invalid", False), ("C#b", False),
        ]
        
        for chord, expected in test_chords:
            result = validator.is_valid_chord(chord)
            assert result == expected, f"Chord '{chord}' expected {expected}, got {result}"