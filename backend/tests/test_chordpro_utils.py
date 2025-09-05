"""
Tests for ChordPro utilities and validation helpers.
"""

import pytest
from chordme.chordpro_utils import ChordProValidator, validate_chordpro_content, detect_key_signature


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
        assert validator.is_valid_chord('H')  # Valid German notation (H = B)
        assert validator.is_valid_chord('c')  # Now valid with enhanced engine (case-insensitive)
        assert not validator.is_valid_chord('123')  # Numbers only
        assert not validator.is_valid_chord('X')  # Truly invalid note

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


class TestKeyDetection:
    """Test automatic key detection functionality."""

    def test_manual_key_override(self):
        """Test that manual key signatures override detection."""
        content = "{key: G} [C] [G] [Am] [D]"
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'G'
        assert result['confidence'] == 1.0
        assert not result['is_minor']
        assert result['alternative_keys'] == []

    def test_manual_minor_key(self):
        """Test manual minor key specification."""
        content = "{key: Am} [Am] [F] [C] [G]"
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'Am'
        assert result['confidence'] == 1.0
        assert result['is_minor']
        assert result['alternative_keys'] == []

    def test_c_major_detection(self):
        """Test detection of C major from typical progression."""
        content = "[C] [F] [G] [C] [Am] [F] [G] [C]"
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'C'
        assert result['confidence'] > 0.7
        assert not result['is_minor']

    def test_g_major_detection(self):
        """Test detection of G major from chord progression."""
        content = "[G] [C] [D] [G] [Em] [C] [D] [G]"
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'G'
        assert result['confidence'] > 0.7
        assert not result['is_minor']

    def test_f_major_detection(self):
        """Test detection of F major with flat preferences."""
        content = "[F] [Bb] [C] [F] [Dm] [Bb] [C] [F]"
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'F'
        assert result['confidence'] > 0.7
        assert not result['is_minor']

    def test_a_minor_detection(self):
        """Test detection of A minor from typical progression."""
        content = "[Am] [F] [C] [G] [Am] [F] [C] [G]"
        result = detect_key_signature(content)
        
        # Am and C are related, either could be detected
        assert result['detected_key'] in ['Am', 'C']
        assert result['confidence'] > 0.5

    def test_alternative_keys(self):
        """Test that alternative key suggestions are provided."""
        content = "[C] [G] [Am] [F]"  # Common progression
        result = detect_key_signature(content)
        
        assert 'alternative_keys' in result
        assert isinstance(result['alternative_keys'], list)
        assert len(result['alternative_keys']) >= 0
        assert len(result['alternative_keys']) <= 3
        
        # Alternative keys should have lower confidence
        for alt in result['alternative_keys']:
            assert alt['confidence'] <= result['confidence']
            assert alt['confidence'] > 0

    def test_empty_content(self):
        """Test handling of empty content."""
        result = detect_key_signature('')
        
        assert result['detected_key'] == 'C'
        assert result['confidence'] == 0.0
        assert not result['is_minor']

    def test_no_chords_content(self):
        """Test handling of content with no chords."""
        content = 'Just some lyrics without any chords'
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'C'
        assert result['confidence'] == 0.0
        assert not result['is_minor']

    def test_invalid_chords_only(self):
        """Test handling of content with only invalid chords."""
        content = '[invalid] [X] [notachord]'
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'C'
        assert result['confidence'] == 0.0
        assert not result['is_minor']

    def test_mixed_valid_invalid_chords(self):
        """Test handling of mixed valid and invalid chords."""
        content = '[C] [invalid] [G] [notachord] [Am]'
        result = detect_key_signature(content)
        
        assert result['detected_key'] is not None
        assert result['confidence'] > 0

    def test_jazz_progression(self):
        """Test handling of jazz progressions with extended chords."""
        content = '[Cmaj7] [Am7] [Dm7] [G7] [Cmaj7]'
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'C'
        assert result['confidence'] > 0.7
        assert not result['is_minor']

    def test_slash_chords(self):
        """Test handling of progressions with slash chords."""
        content = '[C] [C/E] [F] [G/B] [Am] [F] [G] [C]'
        result = detect_key_signature(content)
        
        assert result['detected_key'] == 'C'
        assert result['confidence'] > 0.6
        assert not result['is_minor']

    def test_confidence_scoring(self):
        """Test confidence scoring logic."""
        clear_progression = '[C] [F] [G] [C] [Am] [F] [G] [C]'
        ambiguous_progression = '[C] [D] [E] [F]'
        
        clear_result = detect_key_signature(clear_progression)
        ambiguous_result = detect_key_signature(ambiguous_progression)
        
        assert clear_result['confidence'] > ambiguous_result['confidence']

    def test_atonal_progression(self):
        """Test handling of atonal progressions."""
        atonal_progression = '[C] [F#] [Bb] [E]'
        result = detect_key_signature(atonal_progression)
        
        assert result['confidence'] < 0.7

    def test_chord_frequency_importance(self):
        """Test that chord frequency affects confidence."""
        strong_tonic = '[C] [C] [C] [F] [G] [C] [C] [C]'
        weak_tonic = '[C] [F] [G] [Am] [Dm] [Em]'
        
        strong_result = detect_key_signature(strong_tonic)
        weak_result = detect_key_signature(weak_tonic)
        
        assert strong_result['confidence'] > weak_result['confidence']

    def test_result_structure(self):
        """Test that detection results have correct structure."""
        content = '[C] [G] [Am] [F]'
        result = detect_key_signature(content)
        
        # Check required keys
        assert 'detected_key' in result
        assert 'confidence' in result
        assert 'is_minor' in result
        assert 'alternative_keys' in result
        
        # Check types
        assert isinstance(result['detected_key'], str)
        assert isinstance(result['confidence'], (int, float))
        assert isinstance(result['is_minor'], bool)
        assert isinstance(result['alternative_keys'], list)
        
        # Check confidence range
        assert 0.0 <= result['confidence'] <= 1.0
        
        # Check alternative keys structure
        for alt in result['alternative_keys']:
            assert 'key' in alt
            assert 'confidence' in alt
            assert 'is_minor' in alt
            assert isinstance(alt['key'], str)
            assert isinstance(alt['confidence'], (int, float))
            assert isinstance(alt['is_minor'], bool)
            assert 0.0 <= alt['confidence'] <= 1.0