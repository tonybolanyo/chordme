"""
Test coverage for chordpro_utils module to improve overall test coverage.
"""

import pytest
from chordme.chordpro_utils import ChordProValidator


class TestChordProValidatorDirectives:
    """Test ChordPro directive validation."""
    
    def test_is_valid_directive_basic_valid(self):
        """Test valid basic directives."""
        test_cases = [
            '{title: My Song}',
            '{artist: John Doe}',
            '{key: C}',
            '{tempo: 120}',
            '{start_of_chorus}',
            '{end_of_chorus}',
            '{comment: This is a comment}',
            '{new_song}',
            '{column_break}',
            '{subtitle: Additional info}'
        ]
        
        for directive in test_cases:
            assert ChordProValidator.is_valid_directive(directive), f"Should be valid: {directive}"
    
    def test_is_valid_directive_invalid(self):
        """Test invalid directives."""
        test_cases = [
            '',  # Empty string
            '   ',  # Whitespace only
            'title: My Song',  # Missing braces
            '{title: My Song',  # Missing closing brace
            'title: My Song}',  # Missing opening brace
            '{}',  # Empty braces
            '{   }',  # Whitespace only in braces
            'plain text',  # No braces at all
            '{title: My Song} extra text',  # Extra text after directive
        ]
        
        for directive in test_cases:
            assert not ChordProValidator.is_valid_directive(directive), f"Should be invalid: {directive}"
    
    def test_is_valid_directive_with_whitespace(self):
        """Test directive validation with various whitespace."""
        test_cases = [
            '  {title: My Song}  ',  # Leading/trailing whitespace
            '\t{artist: John}\t',  # Tab characters
            '\n{key: C}\n',  # Newlines
        ]
        
        for directive in test_cases:
            assert ChordProValidator.is_valid_directive(directive), f"Should be valid: {directive}"


class TestChordProValidatorChords:
    """Test ChordPro chord validation."""
    
    def test_is_valid_chord_basic_valid(self):
        """Test valid basic chords."""
        test_cases = [
            'C', 'D', 'E', 'F', 'G', 'A', 'B',  # Basic notes
            'Cm', 'Dm', 'Em', 'Am',  # Minor chords
            'CM', 'DM', 'GM',  # Major chords (explicit)
            'C#', 'Db', 'F#', 'Bb',  # Sharp and flat chords
            'C7', 'Am7', 'G9', 'F13',  # Numbered chords
            'Cmaj7', 'Dmin7', 'Gdim', 'Aaug',  # Extended chords
            'Csus2', 'Dsus4', 'Gsus',  # Suspended chords
            'Cadd9', 'Dadd11',  # Added note chords
            'C/G', 'Am/E', 'F/C',  # Slash chords
        ]
        
        for chord in test_cases:
            assert ChordProValidator.is_valid_chord(chord), f"Should be valid chord: {chord}"
    
    def test_is_valid_chord_invalid(self):
        """Test invalid chords."""
        test_cases = [
            '',  # Empty string
            '   ',  # Whitespace only
            'H',  # Invalid note (H not used in English notation)
            'C#b',  # Both sharp and flat
            'Xyz',  # Invalid letters
            'C-',  # Invalid modifier
            '123',  # Numbers only
            'C major',  # Word instead of abbreviation
            'C m',  # Space in chord
        ]
        
        for chord in test_cases:
            assert not ChordProValidator.is_valid_chord(chord), f"Should be invalid chord: {chord}"
    
    def test_is_valid_chord_with_whitespace(self):
        """Test chord validation with whitespace."""
        test_cases = [
            '  C  ',  # Leading/trailing whitespace
            '\tAm\t',  # Tab characters
            '\nG7\n',  # Newlines
        ]
        
        for chord in test_cases:
            assert ChordProValidator.is_valid_chord(chord), f"Should be valid chord: {chord}"


class TestChordProValidatorExtractDirectives:
    """Test directive extraction functionality."""
    
    def test_extract_directives_basic(self):
        """Test basic directive extraction."""
        content = """
        {title: My Test Song}
        {artist: Test Artist}
        {key: C}
        
        Verse content here
        """
        
        directives = ChordProValidator.extract_directives(content)
        
        assert 'title' in directives
        assert directives['title'] == 'My Test Song'
        assert 'artist' in directives
        assert directives['artist'] == 'Test Artist'
        assert 'key' in directives
        assert directives['key'] == 'C'
    
    def test_extract_directives_mixed_content(self):
        """Test directive extraction from mixed content."""
        content = """
        {title: Test Song}
        
        [C]This is a verse with [G]chords
        {comment: This is a comment}
        More lyrics here
        
        {start_of_chorus}
        [Am]Chorus lyrics [F]here
        {end_of_chorus}
        """
        
        directives = ChordProValidator.extract_directives(content)
        
        assert 'title' in directives
        assert directives['title'] == 'Test Song'
        assert 'comment' in directives
        assert directives['comment'] == 'This is a comment'
        assert 'start_of_chorus' in directives
        assert 'end_of_chorus' in directives
    
    def test_extract_directives_empty_content(self):
        """Test directive extraction from empty content."""
        content = ""
        directives = ChordProValidator.extract_directives(content)
        assert directives == {}
    
    def test_extract_directives_no_directives(self):
        """Test directive extraction when no directives present."""
        content = """
        This is just regular text
        [C]With some [G]chords
        But no directives
        """
        
        directives = ChordProValidator.extract_directives(content)
        assert directives == {}


class TestChordProValidatorExtractChords:
    """Test chord extraction functionality."""
    
    def test_extract_chords_basic(self):
        """Test basic chord extraction."""
        content = """
        [C]This is a [G]line with [Am]chords [F]here
        """
        
        chords = ChordProValidator.extract_chords(content)
        
        assert 'C' in chords
        assert 'G' in chords
        assert 'Am' in chords
        assert 'F' in chords
        assert len(chords) == 4
    
    def test_extract_chords_mixed_content(self):
        """Test chord extraction from mixed content."""
        content = """
        {title: Test Song}
        
        [C]Verse line [G]one
        [Am]Verse line [F]two
        
        {start_of_chorus}
        [Dm]Chorus [G]chords [C]here
        {end_of_chorus}
        """
        
        chords = ChordProValidator.extract_chords(content)
        
        expected_chords = {'C', 'G', 'Am', 'F', 'Dm'}
        assert set(chords) == expected_chords
    
    def test_extract_chords_empty_content(self):
        """Test chord extraction from empty content."""
        content = ""
        chords = ChordProValidator.extract_chords(content)
        assert chords == []
    
    def test_extract_chords_no_chords(self):
        """Test chord extraction when no chords present."""
        content = """
        {title: Test Song}
        This is just text without chords
        """
        
        chords = ChordProValidator.extract_chords(content)
        assert chords == []
    
    def test_extract_chords_duplicate_chords(self):
        """Test chord extraction with duplicate chords."""
        content = """
        [C]First line [G]here
        [C]Second line [G]there
        [C]Third line
        """
        
        chords = ChordProValidator.extract_chords(content)
        
        # Should return unique chords
        assert set(chords) == {'C', 'G'}
        # But may include duplicates in list
        assert 'C' in chords
        assert 'G' in chords


class TestChordProValidatorValidateContent:
    """Test content validation functionality."""
    
    def test_validate_content_valid_basic(self):
        """Test validation of basic valid content."""
        content = """
        {title: Test Song}
        {artist: Test Artist}
        
        [C]This is a [G]valid song
        [Am]With proper [F]formatting
        """
        
        result = ChordProValidator.validate_content(content)
        
        assert result['valid'] is True
        assert len(result['errors']) == 0
        assert 'warnings' in result
    
    def test_validate_content_with_warnings(self):
        """Test validation that produces warnings."""
        content = """
        {title: Test Song}
        
        [C]This song has [XYZ]invalid chords
        [G]But is otherwise [H]formatted
        """
        
        result = ChordProValidator.validate_content(content)
        
        # Should still be valid but with warnings
        assert result['valid'] is True
        assert len(result['warnings']) > 0
    
    def test_validate_content_empty(self):
        """Test validation of empty content."""
        content = ""
        
        result = ChordProValidator.validate_content(content)
        
        assert result['valid'] is True
        assert len(result['errors']) == 0
    
    def test_validate_content_invalid_directives(self):
        """Test validation with invalid directives."""
        content = """
        title: Missing Braces}
        {artist: Test Artist
        
        [C]Valid [G]chords
        """
        
        result = ChordProValidator.validate_content(content)
        
        # Should have errors for invalid directives
        assert len(result['errors']) > 0 or len(result['warnings']) > 0


class TestChordProValidatorGetSongMetadata:
    """Test song metadata extraction."""
    
    def test_get_song_metadata_complete(self):
        """Test metadata extraction with complete information."""
        content = """
        {title: My Test Song}
        {artist: Test Artist}
        {album: Test Album}
        {key: C}
        {tempo: 120}
        {year: 2023}
        
        [C]Song content here
        """
        
        metadata = ChordProValidator.get_song_metadata(content)
        
        assert metadata['title'] == 'My Test Song'
        assert metadata['artist'] == 'Test Artist'
        assert metadata['album'] == 'Test Album'
        assert metadata['key'] == 'C'
        assert metadata['tempo'] == '120'
        assert metadata['year'] == '2023'
    
    def test_get_song_metadata_partial(self):
        """Test metadata extraction with partial information."""
        content = """
        {title: Partial Song}
        {key: G}
        
        [G]Content without full metadata
        """
        
        metadata = ChordProValidator.get_song_metadata(content)
        
        assert metadata['title'] == 'Partial Song'
        assert metadata['key'] == 'G'
        assert metadata.get('artist') is None
        assert metadata.get('album') is None
    
    def test_get_song_metadata_empty(self):
        """Test metadata extraction from empty content."""
        content = ""
        
        metadata = ChordProValidator.get_song_metadata(content)
        
        assert isinstance(metadata, dict)
        # Should not crash and return empty dict or dict with None values
    
    def test_get_song_metadata_no_metadata(self):
        """Test metadata extraction when no metadata present."""
        content = """
        [C]Just song content
        [G]No metadata directives
        """
        
        metadata = ChordProValidator.get_song_metadata(content)
        
        assert isinstance(metadata, dict)
        # Should return empty dict or dict with None values


class TestChordProValidatorEdgeCases:
    """Test edge cases and error handling."""
    
    def test_validate_content_none_input(self):
        """Test validation with None input."""
        try:
            result = ChordProValidator.validate_content(None)
            # Should handle gracefully
            assert 'valid' in result
        except (TypeError, AttributeError):
            # Or raise appropriate error
            pass
    
    def test_extract_directives_malformed(self):
        """Test directive extraction with malformed content."""
        content = """
        {title: Unclosed directive
        {artist: Test} extra text
        {key:} empty value
        {: empty directive name}
        """
        
        # Should not crash
        directives = ChordProValidator.extract_directives(content)
        assert isinstance(directives, dict)
    
    def test_extract_chords_malformed(self):
        """Test chord extraction with malformed content."""
        content = """
        [Unclosed chord
        [C] normal chord
        [invalid_chord_name]
        []empty brackets
        """
        
        # Should not crash
        chords = ChordProValidator.extract_chords(content)
        assert isinstance(chords, list)
        assert 'C' in chords  # Should still extract valid chords