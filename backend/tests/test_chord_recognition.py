"""
Comprehensive test suite for Enhanced Chord Recognition Engine (Python)
"""

import pytest
import time
from typing import List

from chordme.chord_recognition import (
    ChordRecognitionEngine, 
    chord_recognition_engine, 
    is_valid_chord, 
    parse_chord
)


class TestChordRecognitionEngine:
    """Test suite for the enhanced chord recognition engine"""
    
    def setup_method(self):
        """Setup test environment"""
        self.engine = ChordRecognitionEngine()
    
    def test_basic_major_chords(self):
        """Test recognition of simple major chords"""
        test_chords = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        
        for chord in test_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert result.components.root == chord
            assert result.quality == 'major'
    
    def test_basic_minor_chords(self):
        """Test recognition of simple minor chords"""
        test_chords = ['Am', 'Dm', 'Em', 'Fm', 'Gm', 'Cm', 'Bm']
        
        for chord in test_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert result.quality == 'minor'
            assert result.components.quality == 'm'
    
    def test_sharp_and_flat_chords(self):
        """Test recognition of sharp and flat chords"""
        sharp_chords = ['C#', 'D#', 'F#', 'G#', 'A#']
        flat_chords = ['Db', 'Eb', 'Gb', 'Ab', 'Bb']
        
        for chord in sharp_chords + flat_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert result.components.accidental is not None
    
    def test_seventh_chords(self):
        """Test recognition of 7th chords"""
        seventh_chords = ['C7', 'Dm7', 'G7', 'Am7', 'Fmaj7', 'Cmaj7']
        
        for chord in seventh_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert '7' in (result.components.extension or '')
    
    def test_extended_chords(self):
        """Test recognition of 9th, 11th, and 13th chords"""
        extended_chords = ['C9', 'D11', 'G13', 'Am9', 'F11', 'B13']
        
        for chord in extended_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            extension = result.components.extension or ''
            assert any(ext in extension for ext in ['9', '11', '13'])
    
    def test_add_chords(self):
        """Test recognition of add chords"""
        add_chords = ['Cadd9', 'Dadd9', 'Fadd11', 'Gadd13']
        
        for chord in add_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert 'add' in (result.components.extension or '')
    
    def test_suspended_chords(self):
        """Test recognition of sus2 and sus4 chords"""
        sus_chords = ['Csus2', 'Dsus4', 'Gsus2', 'Asus4', 'Fsus4']
        
        for chord in sus_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert result.quality == 'suspended'
            assert 'sus' in (result.components.suspension or '')
    
    def test_diminished_chords(self):
        """Test recognition of diminished chords"""
        dim_chords = ['Cdim', 'Ddim', 'Edim']
        
        for chord in dim_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert result.quality == 'diminished'
    
    def test_augmented_chords(self):
        """Test recognition of augmented chords"""
        aug_chords = ['Caug', 'Daug', 'Gaug']
        
        for chord in aug_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert result.quality == 'augmented'
    
    def test_slash_chords(self):
        """Test recognition of slash chords"""
        slash_chords = ['C/E', 'G/B', 'F/A', 'Am/C', 'D/F#']
        
        for chord in slash_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
            assert result.components.bass_note is not None
    
    def test_spanish_notation(self):
        """Test Spanish chord notation support"""
        spanish_chords = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
        expected_roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        
        for spanish, expected in zip(spanish_chords, expected_roots):
            result = self.engine.parse_chord(spanish)
            assert result.is_valid, f"Spanish chord {spanish} should be valid"
            assert result.components.root == expected
    
    def test_german_notation(self):
        """Test German notation (H = B)"""
        result = self.engine.parse_chord('H')
        assert result.is_valid
        assert result.components.root == 'B'
    
    def test_complex_jazz_chords(self):
        """Test recognition of complex jazz chords"""
        jazz_chords = ['Cmaj7#11', 'Dm7b5', 'G7#9', 'Amaj9#11', 'F#m7b5']
        
        for chord in jazz_chords:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Jazz chord {chord} should be valid"
    
    def test_enharmonic_equivalents(self):
        """Test enharmonic equivalents"""
        equivalents = self.engine.get_enharmonic_equivalents('C#')
        assert 'Db' in equivalents
        
        equivalents2 = self.engine.get_enharmonic_equivalents('Bb')
        assert 'A#' in equivalents2
    
    def test_invalid_chords(self):
        """Test rejection of invalid chord names"""
        invalid_chords = ['X', 'Z7', '123', '', '   ', 'XYZ']
        
        for chord in invalid_chords:
            result = self.engine.parse_chord(chord)
            assert not result.is_valid, f"Chord {chord} should be invalid"
            assert result.errors is not None
            assert len(result.errors) > 0
    
    def test_empty_input_handling(self):
        """Test handling of empty input"""
        result = self.engine.parse_chord('')
        assert not result.is_valid
        assert 'Empty chord notation' in (result.errors or [])
        
        result2 = self.engine.parse_chord('   ')
        assert not result2.is_valid
    
    def test_content_extraction(self):
        """Test extracting chords from ChordPro content"""
        content = """{title: Test Song}
[C]Amazing [G]grace how [Am]sweet the [F]sound
[C]That saved a [G]wretch like [C]me"""
        
        chords = self.engine.extract_chords_from_content(content)
        chord_names = [c.original for c in chords]
        
        assert len(chords) == 4  # C, G, Am, F
        assert 'C' in chord_names
        assert 'G' in chord_names
        assert 'Am' in chord_names
        assert 'F' in chord_names
    
    def test_content_validation(self):
        """Test comprehensive content validation"""
        content = """{title: Test Song}
[C]Valid [G]chord [X]Invalid [Am]content [Z7]here"""
        
        analysis = self.engine.validate_chordpro_content(content)
        
        assert analysis['total_chords'] >= 3  # At least C, G, Am valid
        assert analysis['valid_chords'] >= 3
        assert len(analysis['invalid_chords']) >= 1  # X should be invalid
        assert 'C' in analysis['unique_roots']
        assert 'G' in analysis['unique_roots']
        assert 'A' in analysis['unique_roots']
        assert 'major' in analysis['qualities']
        assert 'minor' in analysis['qualities']
    
    def test_performance_large_dataset(self):
        """Test performance with large chord datasets"""
        chord_roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        qualities = ['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', 'dim', 'aug']
        
        large_chord_list = []
        for root in chord_roots:
            for quality in qualities:
                large_chord_list.append(root + quality)
        
        start_time = time.time()
        results = self.engine.parse_chords(large_chord_list)
        end_time = time.time()
        
        assert (end_time - start_time) < 2.0  # Should complete in under 2 seconds
        assert len(results) == len(large_chord_list)
        
        # Most should be valid
        valid_count = sum(1 for r in results if r.is_valid)
        assert valid_count > len(large_chord_list) * 0.8
    
    def test_performance_large_content(self):
        """Test performance with large ChordPro content"""
        large_content = '{title: Large Song}\n'
        for i in range(1000):
            large_content += '[C]Test [G]content [Am]with [F]many [Dm]chords [G7]here\n'
        
        start_time = time.time()
        analysis = self.engine.validate_chordpro_content(large_content)
        end_time = time.time()
        
        assert (end_time - start_time) < 3.0  # Should complete in under 3 seconds
        assert analysis['total_chords'] == 6  # Unique chords: C, G, Am, F, Dm, G7
    
    def test_batch_parsing(self):
        """Test batch parsing functionality"""
        chords = ['C', 'Dm', 'G7', 'Am', 'F', 'Invalid']
        results = self.engine.parse_chords(chords)
        
        assert len(results) == len(chords)
        valid_results = [r for r in results if r.is_valid]
        assert len(valid_results) >= 5  # All except 'Invalid' should be valid
    
    def test_legacy_compatibility_functions(self):
        """Test legacy compatibility functions"""
        # Test is_valid_chord function
        assert is_valid_chord('C') == True
        assert is_valid_chord('Am') == True
        assert is_valid_chord('X') == False
        
        # Test parse_chord function
        result = parse_chord('Cmaj7')
        assert result['is_valid'] == True
        assert result['components']['root'] == 'C'
        assert '7' in result['components']['extension']
    
    def test_singleton_consistency(self):
        """Test singleton instance consistency"""
        result1 = chord_recognition_engine.parse_chord('C')
        result2 = chord_recognition_engine.parse_chord('C')
        
        assert result1.normalized == result2.normalized
        assert result1.quality == result2.quality
    
    def test_case_insensitive_notation(self):
        """Test case-insensitive chord notation"""
        variations = ['cmaj', 'CMAJ', 'CmAj', 'dmin', 'DMIN', 'DmIn']
        
        for chord in variations:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid"
    
    def test_whitespace_handling(self):
        """Test handling of whitespace in chord input"""
        chords_with_whitespace = ['  C  ', '\tDm\t', '\nG\n', ' Am ']
        
        for chord in chords_with_whitespace:
            result = self.engine.parse_chord(chord)
            assert result.is_valid, f"Chord {chord} should be valid after trimming"
    
    def test_error_messages(self):
        """Test that error messages are helpful"""
        result = self.engine.parse_chord('XYZ')
        assert result.errors is not None
        assert len(result.errors) > 0
        assert 'Invalid chord format' in result.errors[0]
    
    def test_component_extraction_accuracy(self):
        """Test accurate extraction of chord components"""
        # Test complex chord
        result = self.engine.parse_chord('Cmaj7#11/E')
        
        assert result.components.root == 'C'
        assert result.components.accidental is None  # C has no accidental
        assert 'maj' in (result.components.quality or '')
        assert '7' in (result.components.extension or '')
        assert '#11' in (result.components.modification or '')
        assert result.components.bass_note == 'E'
    
    def test_quality_determination_accuracy(self):
        """Test accurate determination of chord qualities"""
        test_cases = [
            ('C', 'major'),
            ('Cm', 'minor'),
            ('Cdim', 'diminished'),
            ('Caug', 'augmented'),
            ('Csus4', 'suspended')
        ]
        
        for chord, expected_quality in test_cases:
            result = self.engine.parse_chord(chord)
            assert result.quality == expected_quality, \
                f"Chord {chord} should have quality {expected_quality}, got {result.quality}"


class TestLegacyCompatibility:
    """Test legacy compatibility functions"""
    
    def test_is_valid_chord_compatibility(self):
        """Test that legacy is_valid_chord function works"""
        assert is_valid_chord('C') == True
        assert is_valid_chord('Am7') == True
        assert is_valid_chord('F#maj7') == True
        assert is_valid_chord('X') == False
        assert is_valid_chord('') == False
    
    def test_parse_chord_compatibility(self):
        """Test that legacy parse_chord function works"""
        result = parse_chord('Dm7')
        
        assert isinstance(result, dict)
        assert result['is_valid'] == True
        assert result['original'] == 'Dm7'
        assert result['components']['root'] == 'D'
        assert result['quality'] == 'minor'
        assert '7' in result['components']['extension']
    
    def test_error_handling_compatibility(self):
        """Test error handling in legacy functions"""
        result = parse_chord('INVALID')
        
        assert result['is_valid'] == False
        assert 'errors' in result
        assert isinstance(result['errors'], list)


# Performance benchmarks
class TestPerformanceBenchmarks:
    """Performance benchmark tests"""
    
    def test_single_chord_parsing_speed(self):
        """Benchmark single chord parsing speed"""
        engine = ChordRecognitionEngine()
        
        start_time = time.time()
        for _ in range(10000):
            engine.parse_chord('Cmaj7')
        end_time = time.time()
        
        # Should be able to parse 10,000 chords in under 1 second
        assert (end_time - start_time) < 1.0
    
    def test_batch_parsing_speed(self):
        """Benchmark batch parsing speed"""
        engine = ChordRecognitionEngine()
        chords = ['C', 'Dm', 'G7', 'Am', 'F'] * 1000  # 5,000 chords
        
        start_time = time.time()
        results = engine.parse_chords(chords)
        end_time = time.time()
        
        # Should process 5,000 chords in under 2 seconds
        assert (end_time - start_time) < 2.0
        assert len(results) == 5000
    
    def test_content_extraction_speed(self):
        """Benchmark content extraction speed"""
        engine = ChordRecognitionEngine()
        
        # Create large content
        content = '{title: Performance Test}\n'
        chord_line = '[C]Test [Dm]line [G7]with [Am]several [F]chords\n'
        content += chord_line * 1000  # ~5,000 chord occurrences
        
        start_time = time.time()
        chords = engine.extract_chords_from_content(content)
        end_time = time.time()
        
        # Should extract chords from large content in under 1 second
        assert (end_time - start_time) < 1.0
        assert len(chords) == 5  # Unique chords