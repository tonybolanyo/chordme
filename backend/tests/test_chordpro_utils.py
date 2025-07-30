"""
Tests for ChordPro utilities and validation helpers.
"""

import pytest
from chordme.chordpro_utils import ChordProValidator, validate_chordpro_content


class TestChordProValidator:
    """Test ChordPro validation utilities."""

    def test_is_valid_directive(self):
        """Test directive validation."""
        validator = ChordProValidator()
        
        # Valid directives
        assert validator.is_valid_directive('{title: Song Name}')
        assert validator.is_valid_directive('{artist: Artist Name}')
        assert validator.is_valid_directive('{start_of_verse}')
        assert validator.is_valid_directive('{capo: 3}')
        
        # Invalid directives
        assert not validator.is_valid_directive('title: Song Name')  # Missing braces
        assert not validator.is_valid_directive('{title: Song Name')  # Missing closing brace
        assert not validator.is_valid_directive('title: Song Name}')  # Missing opening brace
        assert not validator.is_valid_directive('')  # Empty
        assert not validator.is_valid_directive('{}')  # Empty directive

    def test_is_valid_chord(self):
        """Test chord validation."""
        validator = ChordProValidator()
        
        # Valid chords
        assert validator.is_valid_chord('C')
        assert validator.is_valid_chord('Am')
        assert validator.is_valid_chord('F#')
        assert validator.is_valid_chord('Bbm')
        assert validator.is_valid_chord('Cmaj7')
        assert validator.is_valid_chord('Dm7')
        assert validator.is_valid_chord('Gsus4')
        
        # Invalid chords
        assert not validator.is_valid_chord('')  # Empty
        assert not validator.is_valid_chord('H')  # Invalid note
        assert not validator.is_valid_chord('c')  # Lowercase note
        assert not validator.is_valid_chord('123')  # Numbers only

    def test_extract_directives(self):
        """Test directive extraction."""
        validator = ChordProValidator()
        
        content = """{title: Amazing Grace}
{artist: John Newton}
{key: G}
{start_of_verse}
Some lyrics here
{end_of_verse}
{comment: Traditional hymn}"""

        directives = validator.extract_directives(content)
        
        assert directives['title'] == 'Amazing Grace'
        assert directives['artist'] == 'John Newton'
        assert directives['key'] == 'G'
        assert directives['start_of_verse'] is True
        assert directives['end_of_verse'] is True
        assert directives['comment'] == 'Traditional hymn'

    def test_extract_chords(self):
        """Test chord extraction."""
        validator = ChordProValidator()
        
        content = """[C]Amazing [G]grace, how [Am]sweet the [F]sound
[C]That saved a [G]wretch like [C]me
[F]I once was [C]lost, but [Am]now I'm [F]found
Was [C]blind but [G]now I [C]see"""

        chords = validator.extract_chords(content)
        
        expected_chords = ['Am', 'C', 'F', 'G']  # Sorted unique chords
        assert chords == expected_chords

    def test_validate_content_valid(self):
        """Test validation of valid content."""
        validator = ChordProValidator()
        
        valid_content = """{title: Test Song}
{artist: Test Artist}

[C]Test [G]lyrics [Am]here [F]
{comment: This is valid}"""

        is_valid, warnings = validator.validate_content(valid_content)
        
        assert is_valid
        assert len(warnings) == 0

    def test_validate_content_warnings(self):
        """Test validation with warnings."""
        validator = ChordProValidator()
        
        # Content with mismatched brackets
        invalid_content = """{title: Test Song
[C]Test [G lyrics Am] here
{comment: Missing closing brace"""

        is_valid, warnings = validator.validate_content(invalid_content)
        
        assert not is_valid
        assert len(warnings) > 0
        assert any('bracket' in warning.lower() for warning in warnings)

    def test_get_song_metadata(self):
        """Test metadata extraction."""
        validator = ChordProValidator()
        
        content = """{title: House of the Rising Sun}
{artist: Traditional}
{key: Am}
{capo: 3}
{tempo: 120}

[Am]There is a [C]house in [D]New Or[F]leans
[Am]They call the [C]Rising [E]Sun"""

        metadata = validator.get_song_metadata(content)
        
        assert metadata['title'] == 'House of the Rising Sun'
        assert metadata['artist'] == 'Traditional'
        assert metadata['key'] == 'Am'
        assert metadata['capo'] == '3'
        assert metadata['tempo'] == '120'
        assert 'chords' in metadata
        assert len(metadata['chords']) > 0
        assert 'chord_count' in metadata


class TestValidateChordProContent:
    """Test the comprehensive validation function."""

    def test_comprehensive_validation(self):
        """Test the comprehensive validation function."""
        content = """{title: Yesterday}
{artist: The Beatles}
{key: F}

[F]Yesterday, [Em]all my [A7]troubles seemed so [Dm]far away
[Bb]Now it [C]looks as though they're [F]here to stay
Oh [Dm]I be[G]lieve in [Bb]yester[F]day"""

        result = validate_chordpro_content(content)
        
        # Check structure
        assert 'is_valid' in result
        assert 'warnings' in result
        assert 'metadata' in result
        assert 'directives' in result
        assert 'chords' in result
        assert 'statistics' in result
        
        # Check validity
        assert result['is_valid']
        assert len(result['warnings']) == 0
        
        # Check metadata
        assert result['metadata']['title'] == 'Yesterday'
        assert result['metadata']['artist'] == 'The Beatles'
        assert result['metadata']['key'] == 'F'
        
        # Check directives
        assert 'title' in result['directives']
        assert 'artist' in result['directives']
        assert 'key' in result['directives']
        
        # Check chords
        expected_chords = ['A7', 'Bb', 'C', 'Dm', 'Em', 'F', 'G']
        assert result['chords'] == expected_chords
        
        # Check statistics
        stats = result['statistics']
        assert stats['line_count'] > 0
        assert stats['character_count'] > 0
        assert stats['directive_count'] == 3
        assert stats['unique_chord_count'] == 7

    def test_validation_with_errors(self):
        """Test validation of content with errors."""
        # Content with various issues
        problematic_content = """{title: Test Song}
{artist: Test Artist}

[C]Test [G lyrics [] here {
{comment: Unclosed directive"""

        result = validate_chordpro_content(problematic_content)
        
        assert not result['is_valid']
        assert len(result['warnings']) > 0
        
        # Should still extract what it can
        assert 'artist' in result['directives']
        assert result['metadata']['artist'] == 'Test Artist'

    def test_empty_content(self):
        """Test validation of empty content."""
        result = validate_chordpro_content("")
        
        assert result['is_valid']  # Empty content is technically valid
        assert len(result['warnings']) == 0
        assert len(result['metadata']) == 0
        assert len(result['directives']) == 0
        assert len(result['chords']) == 0
        
        stats = result['statistics']
        assert stats['line_count'] == 0  # Empty string has 0 lines
        assert stats['character_count'] == 0
        assert stats['directive_count'] == 0
        assert stats['unique_chord_count'] == 0