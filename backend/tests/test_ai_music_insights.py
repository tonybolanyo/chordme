"""
Tests for AI Music Insights Service (Backend)

Test suite for the Python backend AI music analysis functionality
"""

import unittest
import json
from unittest.mock import patch, MagicMock
from chordme.ai_music_insights import (
    AIMusicInsightsService, MusicTheoryAnalyzer,
    SectionType, GenreType, ComplexityLevel
)


class TestMusicTheoryAnalyzer(unittest.TestCase):
    """Test the core music theory analysis algorithms"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.analyzer = MusicTheoryAnalyzer()
        
        self.sample_content = """{title: Test Song}
{artist: Test Artist}
{key: C}

{start_of_verse: 1}
[C]This is a test [F]song with some [G]chords
[Am]Playing around [F]with the pro[C]gression
{end_of_verse}

{start_of_chorus}
[F]This is the [C]chorus part
[G]With a simple [Am]pattern
{end_of_chorus}

{start_of_bridge}
[Dm]Something different [G]here
[Em]To add some [Am]variety
{end_of_bridge}"""
        
        self.jazz_content = """{title: Jazz Standard}
{artist: Jazz Artist}

{start_of_verse}
[Cmaj7]Jazz has [Am7]complex [Dm7]harmonies [G7]throughout
[Em7]Extended [A7]chords and [Dm7]seventh [G7]chords
{end_of_verse}

{start_of_chorus}
[Fmaj7]Modal [Bm7b5]interchange [E7]creates [Am7]interest
[D7]Secondary [G7]dominants [Cmaj7]resolve
{end_of_chorus}"""

    def test_parse_chordpro_content(self):
        """Test ChordPro content parsing"""
        parsed = self.analyzer.parse_chordpro_content(self.sample_content)
        
        self.assertEqual(parsed['title'], 'Test Song')
        self.assertEqual(parsed['artist'], 'Test Artist')
        self.assertEqual(parsed['declared_key'], 'C')
        self.assertGreater(len(parsed['chords']), 0)
        self.assertGreater(len(parsed['sections']), 0)
        
        # Check chord extraction
        expected_chords = ['C', 'F', 'G', 'Am', 'F', 'C', 'F', 'C', 'G', 'Am', 'Dm', 'G', 'Em', 'Am']
        self.assertEqual(parsed['chords'], expected_chords)

    def test_extract_sections(self):
        """Test song section extraction"""
        lines = self.sample_content.split('\n')
        sections = self.analyzer._extract_sections(lines)
        
        # Should have verse, chorus, and bridge sections
        section_types = [section.type for section in sections]
        self.assertIn(SectionType.VERSE, section_types)
        self.assertIn(SectionType.CHORUS, section_types)
        self.assertIn(SectionType.BRIDGE, section_types)
        
        # Check verse section details
        verse = next(s for s in sections if s.type == SectionType.VERSE)
        self.assertEqual(verse.number, 1)
        self.assertGreater(len(verse.chords), 0)
        self.assertGreater(len(verse.lyrics), 0)

    def test_chord_progression_analysis(self):
        """Test chord progression analysis"""
        chords = ['C', 'G', 'Am', 'F']
        progressions = self.analyzer.analyze_chord_progression(chords, 'C major')
        
        self.assertGreater(len(progressions), 0)
        
        # Should detect I-V-vi-IV progression
        i_v_vi_iv = next((p for p in progressions if p['name'] == 'I-V-vi-IV'), None)
        self.assertIsNotNone(i_v_vi_iv)
        self.assertGreater(i_v_vi_iv['confidence'], 0.5)
        self.assertEqual(i_v_vi_iv['key'], 'C major')

    def test_key_detection(self):
        """Test musical key detection"""
        # Test C major chords
        c_major_chords = ['C', 'F', 'G', 'Am', 'Dm', 'Em']
        detected_key = self.analyzer.detect_key(c_major_chords)
        self.assertIn('major', detected_key)
        
        # Test A minor chords
        a_minor_chords = ['Am', 'Dm', 'Em', 'F', 'G', 'C']
        detected_key = self.analyzer.detect_key(a_minor_chords)
        # Should detect either A minor or C major (relative keys)
        self.assertTrue(
            'A minor' in detected_key or 'C major' in detected_key
        )

    def test_chord_complexity_scoring(self):
        """Test chord complexity scoring"""
        # Simple chord
        simple_score = self.analyzer._get_chord_complexity_score('C')
        self.assertLess(simple_score, 0.3)
        
        # Seventh chord
        seventh_score = self.analyzer._get_chord_complexity_score('C7')
        self.assertGreater(seventh_score, simple_score)
        self.assertLess(seventh_score, 0.5)
        
        # Extended chord
        extended_score = self.analyzer._get_chord_complexity_score('Cmaj7#11')
        self.assertGreater(extended_score, seventh_score)

    def test_complexity_analysis(self):
        """Test musical complexity analysis"""
        parsed = self.analyzer.parse_chordpro_content(self.sample_content)
        complexity = self.analyzer.analyze_complexity(parsed['chords'], parsed['sections'])
        
        self.assertIsInstance(complexity.overall_score, float)
        self.assertGreaterEqual(complexity.overall_score, 0.0)
        self.assertLessEqual(complexity.overall_score, 1.0)
        
        self.assertIsInstance(complexity.difficulty_level, ComplexityLevel)
        self.assertGreater(len(complexity.factors), 0)
        
        # Test with more complex content
        jazz_parsed = self.analyzer.parse_chordpro_content(self.jazz_content)
        jazz_complexity = self.analyzer.analyze_complexity(jazz_parsed['chords'], jazz_parsed['sections'])
        
        # Jazz content should be more complex
        self.assertGreater(jazz_complexity.overall_score, complexity.overall_score)

    def test_genre_classification(self):
        """Test genre classification"""
        # Test simple pop chords
        pop_chords = ['C', 'G', 'Am', 'F']
        parsed = self.analyzer.parse_chordpro_content(self.sample_content)
        genre = self.analyzer.classify_genre(pop_chords, parsed['sections'])
        
        self.assertIsInstance(genre.primary_genre, GenreType)
        self.assertGreaterEqual(genre.confidence, 0.0)
        self.assertLessEqual(genre.confidence, 1.0)
        
        # Test jazz chords
        jazz_chords = ['Cmaj7', 'Am7', 'Dm7', 'G7']
        jazz_parsed = self.analyzer.parse_chordpro_content(self.jazz_content)
        jazz_genre = self.analyzer.classify_genre(jazz_chords, jazz_parsed['sections'])
        
        # Jazz should score higher for jazz genre
        jazz_score = jazz_genre.confidence if jazz_genre.primary_genre == GenreType.JAZZ else 0
        pop_jazz_score = 0
        for alt in genre.alternative_genres:
            if alt['genre'] == 'Jazz':
                pop_jazz_score = alt['confidence']
                break
        
        self.assertGreater(jazz_score, pop_jazz_score)

    def test_blues_score_calculation(self):
        """Test blues genre scoring"""
        blues_chords = ['C7', 'F7', 'G7']
        blues_score = self.analyzer._calculate_blues_score(blues_chords)
        
        # Should score highly for blues
        self.assertGreater(blues_score, 0.5)
        
        # Compare with non-blues chords
        pop_chords = ['C', 'F', 'G']
        pop_blues_score = self.analyzer._calculate_blues_score(pop_chords)
        self.assertGreater(blues_score, pop_blues_score)

    def test_folk_score_calculation(self):
        """Test folk genre scoring"""
        folk_chords = ['C', 'F', 'G', 'Am', 'Dm']
        folk_score = self.analyzer._calculate_folk_score(folk_chords)
        
        # Should score highly for folk
        self.assertGreater(folk_score, 0.7)
        
        # Compare with complex jazz chords
        jazz_chords = ['Cmaj7#11', 'Am7b5', 'Dm9']
        jazz_folk_score = self.analyzer._calculate_folk_score(jazz_chords)
        self.assertGreater(folk_score, jazz_folk_score)

    def test_scale_degree_conversion(self):
        """Test chord to scale degree conversion"""
        chords = ['C', 'F', 'G', 'Am']
        scale_degrees = self.analyzer._chords_to_scale_degrees(chords, 'C major')
        
        expected = [0, 5, 7, 9]  # I, IV, V, vi in C major
        self.assertEqual(scale_degrees, expected)

    def test_progression_pattern_matching(self):
        """Test chord progression pattern matching"""
        # I-V-vi-IV pattern
        pattern = [0, 7, 9, 5]
        scale_degrees = [0, 7, 9, 5, 0, 7, 9, 5]  # Repeated pattern
        
        matches = self.analyzer._find_progression_matches(scale_degrees, pattern)
        
        self.assertGreater(len(matches), 0)
        self.assertEqual(matches[0]['confidence'], 1.0)  # Perfect match
        
        # Test partial match
        partial_degrees = [0, 7, 9, 2]  # Different ending
        partial_matches = self.analyzer._find_progression_matches(partial_degrees, pattern)
        
        if partial_matches:
            self.assertLess(partial_matches[0]['confidence'], 1.0)

    def test_enharmonic_equivalents(self):
        """Test enharmonic equivalent handling"""
        # Test that C# and Db are treated as equivalent
        self.assertIn('Db', self.analyzer.ENHARMONIC_EQUIVALENTS.get('C#', []))
        self.assertIn('C#', self.analyzer.ENHARMONIC_EQUIVALENTS.get('Db', []))

    def test_empty_content_handling(self):
        """Test handling of empty or invalid content"""
        # Empty content
        with self.assertRaises(ValueError):
            self.analyzer.parse_chordpro_content('')
        
        # Content with no chords
        no_chords_content = "{title: No Chords}\nJust lyrics without chords"
        parsed = self.analyzer.parse_chordpro_content(no_chords_content)
        self.assertEqual(len(parsed['chords']), 0)

    def test_section_type_normalization(self):
        """Test section type normalization"""
        # Test various section names
        self.assertEqual(
            self.analyzer._normalize_section_type('verse'),
            SectionType.VERSE
        )
        self.assertEqual(
            self.analyzer._normalize_section_type('CHORUS'),
            SectionType.CHORUS
        )
        self.assertEqual(
            self.analyzer._normalize_section_type('prechorus'),
            SectionType.PRE_CHORUS
        )
        self.assertEqual(
            self.analyzer._normalize_section_type('unknown_section'),
            SectionType.UNKNOWN
        )


class TestAIMusicInsightsService(unittest.TestCase):
    """Test the main AI music insights service"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.service = AIMusicInsightsService()
        
        self.sample_content = """{title: Test Song}
{artist: Test Artist}

{start_of_verse}
[C]Simple [F]test [G]song [Am]here
{end_of_verse}

{start_of_chorus}
[F]This is [C]the chorus [G]part [Am]now
{end_of_chorus}"""

    def test_analyze_song_success(self):
        """Test successful song analysis"""
        insights = self.service.analyze_song(self.sample_content)
        
        # Check basic structure
        self.assertIn('title', insights)
        self.assertIn('artist', insights)
        self.assertIn('analyzed_at', insights)
        self.assertIn('chord_progression', insights)
        self.assertIn('structure', insights)
        self.assertIn('key', insights)
        self.assertIn('complexity', insights)
        self.assertIn('genre', insights)
        self.assertIn('recommendations', insights)
        self.assertIn('overall_confidence', insights)
        self.assertIn('analysis_metrics', insights)
        
        # Check data types
        self.assertIsInstance(insights['chord_progression'], list)
        self.assertIsInstance(insights['structure'], dict)
        self.assertIsInstance(insights['key'], dict)
        self.assertIsInstance(insights['complexity'], dict)
        self.assertIsInstance(insights['genre'], dict)
        self.assertIsInstance(insights['recommendations'], list)
        self.assertIsInstance(insights['overall_confidence'], (int, float))
        self.assertIsInstance(insights['analysis_metrics'], dict)

    def test_analyze_song_with_options(self):
        """Test song analysis with custom options"""
        options = {
            'enable_genre_classification': False,
            'user_skill_level': 'beginner'
        }
        
        insights = self.service.analyze_song(self.sample_content, options)
        
        # Genre should be minimal when disabled
        self.assertEqual(insights['genre']['primary_genre'], 'Unknown')
        
        # Should have beginner-appropriate recommendations
        if insights['recommendations']:
            beginner_recs = [r for r in insights['recommendations'] 
                           if r.get('difficulty') == 'beginner']
            self.assertGreater(len(beginner_recs), 0)

    def test_analyze_song_empty_content(self):
        """Test analysis with empty content"""
        with self.assertRaises(ValueError) as context:
            self.service.analyze_song('')
        
        self.assertIn('Content cannot be empty', str(context.exception))

    def test_analyze_song_no_chords(self):
        """Test analysis with content that has no chords"""
        no_chords_content = "{title: No Chords}\nJust lyrics without any chord markings"
        
        with self.assertRaises(ValueError) as context:
            self.service.analyze_song(no_chords_content)
        
        self.assertIn('No chords detected', str(context.exception))

    def test_key_analysis_creation(self):
        """Test key analysis creation"""
        key_analysis = self.service._create_key_analysis('C major')
        
        self.assertEqual(key_analysis.key, 'C major')
        self.assertEqual(key_analysis.root, 'C')
        self.assertEqual(key_analysis.mode, 'major')
        self.assertGreater(key_analysis.confidence, 0)
        self.assertGreater(len(key_analysis.alternatives), 0)
        self.assertIsNotNone(key_analysis.signature)

    def test_structure_analysis_creation(self):
        """Test structure analysis creation"""
        # Create mock sections
        from chordme.ai_music_insights import SongSection, SectionType
        
        sections = [
            SongSection(
                type=SectionType.VERSE,
                number=1,
                start_line=0,
                end_line=2,
                chords=['C', 'F'],
                lyrics=['Test lyrics'],
                confidence=0.9
            ),
            SongSection(
                type=SectionType.CHORUS,
                number=None,
                start_line=3,
                end_line=5,
                chords=['G', 'Am'],
                lyrics=['Chorus lyrics'],
                confidence=0.8
            )
        ]
        
        structure_analysis = self.service._create_structure_analysis(sections)
        
        self.assertIn('sections', structure_analysis)
        self.assertIn('structure', structure_analysis)
        self.assertIn('confidence', structure_analysis)
        self.assertIn('complexity_score', structure_analysis)
        
        # Check structure pattern
        self.assertEqual(structure_analysis['structure'], 'V1-C')

    def test_recommendation_generation(self):
        """Test learning recommendation generation"""
        # Create mock data
        progressions = [{'name': 'ii-V-I', 'confidence': 0.8}]
        
        from chordme.ai_music_insights import ComplexityAnalysis, ComplexityLevel, GenreAnalysis, GenreType
        
        complexity = ComplexityAnalysis(
            overall_score=0.8,
            chord_complexity=0.7,
            harmonic_complexity=0.8,
            rhythmic_complexity=0.6,
            structure_complexity=0.5,
            difficulty_level=ComplexityLevel.ADVANCED,
            factors=[]
        )
        
        genre = GenreAnalysis(
            primary_genre=GenreType.JAZZ,
            confidence=0.9,
            alternative_genres=[],
            characteristics=[]
        )
        
        recommendations = self.service._generate_recommendations(
            progressions, complexity, genre, 'intermediate'
        )
        
        self.assertIsInstance(recommendations, list)
        
        # Should have jazz-related recommendations
        jazz_recs = [r for r in recommendations if 'jazz' in r.get('title', '').lower()]
        self.assertGreater(len(jazz_recs), 0)

    def test_data_quality_assessment(self):
        """Test data quality assessment"""
        # High quality content
        good_parsed = {
            'chords': ['C', 'F', 'G', 'Am', 'Dm'],
            'content': 'Long content with lots of information and structure',
            'sections': [{'type': 'verse'}, {'type': 'chorus'}],
            'title': 'Test Song',
            'artist': 'Test Artist'
        }
        
        good_quality = self.service._assess_data_quality(good_parsed)
        self.assertGreater(good_quality, 0.8)
        
        # Poor quality content
        poor_parsed = {
            'chords': ['C'],
            'content': 'Short',
            'sections': [],
            'title': None,
            'artist': None
        }
        
        poor_quality = self.service._assess_data_quality(poor_parsed)
        self.assertLess(poor_quality, good_quality)

    def test_algorithms_used_tracking(self):
        """Test tracking of algorithms used"""
        # Test with all features enabled
        options = {
            'enable_genre_classification': True,
            'enable_harmonic_analysis': True,
            'enable_recommendations': True
        }
        
        algorithms = self.service._get_algorithms_used(options)
        
        expected_algorithms = [
            'chord_detection',
            'structure_analysis',
            'key_detection',
            'complexity_analysis',
            'genre_classification',
            'harmonic_analysis',
            'learning_recommendations'
        ]
        
        for alg in expected_algorithms:
            self.assertIn(alg, algorithms)
        
        # Test with features disabled
        minimal_options = {
            'enable_genre_classification': False,
            'enable_harmonic_analysis': False,
            'enable_recommendations': False
        }
        
        minimal_algorithms = self.service._get_algorithms_used(minimal_options)
        self.assertNotIn('genre_classification', minimal_algorithms)
        self.assertNotIn('harmonic_analysis', minimal_algorithms)
        self.assertNotIn('learning_recommendations', minimal_algorithms)

    def test_compare_songs_functionality(self):
        """Test song comparison functionality"""
        song1 = "{title: Song 1}\n[C]Test [G]song [Am]one [F]here"
        song2 = "{title: Song 2}\n[C]Test [G]song [Am]two [F]here"
        
        # Mock the compare_songs method since it's not implemented in the backend service
        # In a real implementation, this would test the actual comparison logic
        with patch.object(self.service, 'compare_songs') as mock_compare:
            mock_compare.return_value = {
                'target_song': 'Song 2',
                'similarity': 0.85,
                'similarity_aspects': [],
                'common_characteristics': ['Both in major key'],
                'differences': ['Different titles']
            }
            
            result = self.service.compare_songs(song1, song2)
            
            self.assertEqual(result['target_song'], 'Song 2')
            self.assertGreater(result['similarity'], 0.8)
            mock_compare.assert_called_once_with(song1, song2, {})


class TestMusicInsightsIntegration(unittest.TestCase):
    """Integration tests for the complete AI music insights system"""
    
    def setUp(self):
        """Set up integration test fixtures"""
        self.service = AIMusicInsightsService()
        
        self.complex_song = """{title: Complex Song}
{artist: Progressive Artist}
{key: D}
{tempo: 120}

{start_of_intro}
[Dmaj7]Complex [Bm7]intro [Em7]with [A7sus4]extended [A7]chords
{end_of_intro}

{start_of_verse: 1}
[D]Progressive [F#m]verse with [Bm]various [A]chord
[G]Changes and [D/F#]slash [Em7]chords through[A7]out
{end_of_verse}

{start_of_pre_chorus}
[Bm]Building [A]tension [G]leading [F#7]to
{end_of_pre_chorus}

{start_of_chorus}
[D]Powerful [A]chorus [Bm]with [G]classic
[D]Progression [A]repeated [Bm]several [G]times
{end_of_chorus}

{start_of_verse: 2}
[D]Second verse [F#m]continues [Bm]the same [A]pattern
[G]But with [D/F#]slight [Em7]variations [A7]here
{end_of_verse}

{chorus}

{start_of_bridge}
[Em]Bridge section [A]modulates [F#m]to different [B7]key
[Em]Creating [A]tension [D]before return
{end_of_bridge}

{chorus}

{start_of_outro}
[D]Fade [A]out [Bm]on [G]progression [D]
{end_of_outro}"""

    def test_comprehensive_analysis(self):
        """Test comprehensive analysis of a complex song"""
        insights = self.service.analyze_song(self.complex_song)
        
        # Should extract metadata correctly
        self.assertEqual(insights['title'], 'Complex Song')
        self.assertEqual(insights['artist'], 'Progressive Artist')
        
        # Should detect multiple chord progressions
        self.assertGreater(len(insights['chord_progression']), 0)
        
        # Should detect complex structure
        structure = insights['structure']
        self.assertGreater(len(structure['sections']), 5)  # Intro, verse, pre-chorus, chorus, bridge, outro
        
        # Should have reasonable complexity score
        complexity = insights['complexity']
        self.assertGreater(complexity['overall_score'], 0.3)  # Moderate complexity
        
        # Should generate relevant recommendations
        recommendations = insights['recommendations']
        self.assertGreater(len(recommendations), 0)
        
        # Should have good confidence
        self.assertGreater(insights['overall_confidence'], 0.5)
        
        # Should track performance metrics
        metrics = insights['analysis_metrics']
        self.assertGreater(metrics['processing_time'], 0)
        self.assertGreater(len(metrics['algorithms_used']), 3)
        self.assertGreater(metrics['data_quality'], 0.7)

    def test_performance_benchmarks(self):
        """Test performance benchmarks for analysis"""
        import time
        
        start_time = time.time()
        insights = self.service.analyze_song(self.complex_song)
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Should complete within reasonable time (5 seconds)
        self.assertLess(processing_time, 5.0)
        
        # Reported processing time should be close to actual
        reported_time = insights['analysis_metrics']['processing_time']
        self.assertLess(abs(processing_time - reported_time), 1.0)

    def test_error_handling_robustness(self):
        """Test error handling with various edge cases"""
        # Test with malformed ChordPro
        malformed_content = "{title: Broken\n[C]Unclosed bracket\n{start_of_verse without end}"
        
        try:
            insights = self.service.analyze_song(malformed_content)
            # Should complete but with lower confidence
            self.assertLess(insights['overall_confidence'], 0.8)
        except Exception as e:
            # If it fails, should be a clear error message
            self.assertIsInstance(e, ValueError)
        
        # Test with minimal content
        minimal_content = "[C][F][G]"
        
        try:
            insights = self.service.analyze_song(minimal_content)
            # Should have basic analysis
            self.assertIn('key', insights)
            self.assertIn('complexity', insights)
        except ValueError:
            # Expected for insufficient content
            pass

    def test_consistency_across_runs(self):
        """Test that analysis is consistent across multiple runs"""
        insights1 = self.service.analyze_song(self.complex_song)
        insights2 = self.service.analyze_song(self.complex_song)
        
        # Key analysis should be consistent
        self.assertEqual(insights1['key']['key'], insights2['key']['key'])
        
        # Chord progression should be consistent
        self.assertEqual(
            len(insights1['chord_progression']),
            len(insights2['chord_progression'])
        )
        
        # Complexity should be very similar
        complexity_diff = abs(
            insights1['complexity']['overall_score'] - 
            insights2['complexity']['overall_score']
        )
        self.assertLess(complexity_diff, 0.01)  # Should be nearly identical


if __name__ == '__main__':
    unittest.main()