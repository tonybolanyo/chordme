"""
Additional unit tests for PDF generator with chord diagram functionality.
"""

import pytest
from chordme.pdf_generator import ChordProPDFGenerator, generate_song_pdf
from chordme.chord_diagram_pdf import ChordDiagramGenerator


class TestChordProPDFGeneratorWithDiagrams:
    """Test cases for ChordProPDFGenerator with chord diagram support."""
    
    def test_init_with_chord_diagrams(self):
        """Test generator initialization with chord diagram support."""
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='guitar')
        
        assert generator.include_chord_diagrams is True
        assert generator.diagram_instrument == 'guitar'
        assert generator.chord_diagram_generator is not None
        assert isinstance(generator.chord_diagram_generator, ChordDiagramGenerator)
    
    def test_init_without_chord_diagrams(self):
        """Test generator initialization without chord diagrams."""
        generator = ChordProPDFGenerator(include_chord_diagrams=False)
        
        assert generator.include_chord_diagrams is False
        assert generator.chord_diagram_generator is None
    
    def test_init_ukulele_instrument(self):
        """Test generator initialization with ukulele instrument."""
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='ukulele')
        
        assert generator.diagram_instrument == 'ukulele'
        assert generator.chord_diagram_generator is not None
    
    def test_extract_unique_chords_basic(self):
        """Test extracting unique chords from parsed content."""
        generator = ChordProPDFGenerator()
        
        parsed_data = {
            'sections': [
                {
                    'lines': [
                        {'chords': [{'chord': 'C'}, {'chord': 'G'}], 'lyrics': 'Hello world'},
                        {'chords': [{'chord': 'Am'}, {'chord': 'F'}], 'lyrics': 'Second line'},
                        {'chords': [{'chord': 'C'}], 'lyrics': 'Repeat chord'}  # Duplicate
                    ]
                }
            ]
        }
        
        chords = generator._extract_unique_chords(parsed_data)
        assert isinstance(chords, set)
        assert chords == {'C', 'G', 'Am', 'F'}
    
    def test_extract_unique_chords_complex(self):
        """Test extracting chords with complex chord names."""
        generator = ChordProPDFGenerator()
        
        parsed_data = {
            'sections': [
                {
                    'lines': [
                        {'chords': [{'chord': 'Cmaj7'}, {'chord': 'G/B'}], 'lyrics': 'Complex chords'},
                        {'chords': [{'chord': 'Dm7'}, {'chord': 'F#dim'}], 'lyrics': 'More chords'}
                    ]
                }
            ]
        }
        
        chords = generator._extract_unique_chords(parsed_data)
        assert 'Cmaj7' in chords
        assert 'G/B' in chords
        assert 'Dm7' in chords
        assert 'F#dim' in chords
    
    def test_extract_unique_chords_empty(self):
        """Test extracting chords from empty content."""
        generator = ChordProPDFGenerator()
        
        parsed_data = {'sections': []}
        chords = generator._extract_unique_chords(parsed_data)
        assert chords == set()
        
        parsed_data = {'sections': [{'lines': []}]}
        chords = generator._extract_unique_chords(parsed_data)
        assert chords == set()
    
    def test_extract_unique_chords_no_chords(self):
        """Test extracting chords from content with no chords."""
        generator = ChordProPDFGenerator()
        
        parsed_data = {
            'sections': [
                {
                    'lines': [
                        {'chords': [], 'lyrics': 'No chords here'},
                        {'chords': [], 'lyrics': 'Still no chords'}
                    ]
                }
            ]
        }
        
        chords = generator._extract_unique_chords(parsed_data)
        assert chords == set()
    
    def test_create_chord_diagram_section_disabled(self):
        """Test chord diagram section creation when disabled."""
        generator = ChordProPDFGenerator(include_chord_diagrams=False)
        
        chords = {'C', 'G', 'Am', 'F'}
        elements = generator._create_chord_diagram_section(chords)
        
        assert elements == []
    
    def test_create_chord_diagram_section_enabled(self):
        """Test chord diagram section creation when enabled."""
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='guitar')
        
        chords = {'C', 'G', 'Am'}  # Use chords that exist in COMMON_CHORDS
        elements = generator._create_chord_diagram_section(chords)
        
        assert len(elements) > 0
        # Should have section title, spacer, and table
        assert len(elements) >= 3
    
    def test_create_chord_diagram_section_empty_chords(self):
        """Test chord diagram section with empty chord set."""
        generator = ChordProPDFGenerator(include_chord_diagrams=True)
        
        chords = set()
        elements = generator._create_chord_diagram_section(chords)
        
        assert elements == []
    
    def test_create_chord_diagram_section_unknown_chords(self):
        """Test chord diagram section with unknown chords."""
        generator = ChordProPDFGenerator(include_chord_diagrams=True)
        
        chords = {'UnknownChord1', 'UnknownChord2'}
        elements = generator._create_chord_diagram_section(chords)
        
        # Should still create elements, but with text instead of diagrams
        assert len(elements) > 0
    
    def test_generate_pdf_with_chord_diagrams(self):
        """Test PDF generation with chord diagrams enabled."""
        content = """{title: Test Song}
{artist: Test Artist}

[C]Hello [G]world
This is a [Am]test [F]song"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='guitar')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_pdf_without_chord_diagrams(self):
        """Test PDF generation without chord diagrams."""
        content = """{title: Test Song}
{artist: Test Artist}

[C]Hello [G]world
This is a [Am]test [F]song"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=False)
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_pdf_ukulele_diagrams(self):
        """Test PDF generation with ukulele chord diagrams."""
        content = """{title: Ukulele Song}
{artist: Test Artist}

[C]Hello [F]world
This is a [G]test [Am]song"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='ukulele')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')


class TestGenerateSongPDFWithDiagrams:
    """Test cases for generate_song_pdf convenience function with chord diagrams."""
    
    def test_generate_song_pdf_with_chord_diagrams(self):
        """Test convenience function with chord diagrams enabled."""
        content = """{title: Test Song}
[C]Hello [G]world"""
        
        pdf_bytes = generate_song_pdf(
            content,
            title="Test Song",
            artist="Test Artist",
            include_chord_diagrams=True,
            diagram_instrument='guitar'
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_song_pdf_without_chord_diagrams(self):
        """Test convenience function without chord diagrams."""
        content = """{title: Test Song}
[C]Hello [G]world"""
        
        pdf_bytes = generate_song_pdf(
            content,
            title="Test Song",
            artist="Test Artist",
            include_chord_diagrams=False
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_song_pdf_ukulele_instrument(self):
        """Test convenience function with ukulele instrument."""
        content = """{title: Ukulele Song}
[C]Hello [F]world"""
        
        pdf_bytes = generate_song_pdf(
            content,
            include_chord_diagrams=True,
            diagram_instrument='ukulele'
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_song_pdf_all_parameters(self):
        """Test convenience function with all parameters."""
        content = """{title: Full Test}
[C]Hello [G]world [Am]this [F]is [Dm]a [Em]test"""
        
        pdf_bytes = generate_song_pdf(
            content=content,
            title="Full Test Song",
            artist="Full Test Artist",
            paper_size="letter",
            orientation="landscape",
            template_name="modern",
            include_chord_diagrams=True,
            diagram_instrument="guitar"
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')


class TestChordDiagramIntegration:
    """Integration tests for chord diagram functionality."""
    
    def test_complex_song_with_chord_diagrams(self):
        """Test complex song with multiple sections and chord diagrams."""
        content = """{title: Amazing Grace}
{artist: John Newton}
{key: G}
{tempo: 90}

{sov}
A[G]mazing [G7]grace how [C]sweet the [G]sound
That [Em]saved a [C]wretch like [G]me
I [G]once was [G7]lost but [C]now am [G]found
Was [Em]blind but [C]now I [G]see
{eov}

{soc}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [Em]grace my [C]fears re[G]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [C]first be[G]lieved
{eoc}"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='guitar')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # Check that unique chords were extracted
        parsed_data = generator.parse_chordpro_content(content)
        chords = generator._extract_unique_chords(parsed_data)
        expected_chords = {'G', 'G7', 'C', 'Em'}
        assert chords == expected_chords
    
    def test_song_with_no_recognizable_chords(self):
        """Test song with chords not in the common chord database."""
        content = """{title: Exotic Chords}

[Cmaj13#11]Very [Bbaug/F#]exotic [F#dim7]chords [Dbsus4add9]here"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='guitar')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_song_with_mixed_known_unknown_chords(self):
        """Test song with mix of known and unknown chords."""
        content = """{title: Mixed Chords}

[C]Known [G]chords [Cmaj13#11]and [Am]unknown [Bbaug/F#]ones [F]together"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='guitar')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # Check chord extraction
        parsed_data = generator.parse_chordpro_content(content)
        chords = generator._extract_unique_chords(parsed_data)
        assert 'C' in chords
        assert 'G' in chords
        assert 'Am' in chords
        assert 'F' in chords
    
    def test_performance_with_many_chords(self):
        """Test performance with a song containing many different chords."""
        # Create content with many unique chords
        chords_list = ['C', 'D', 'E', 'F', 'G', 'A', 'Am', 'Dm', 'Em', 'Cmaj7', 'Dm7', 'G7']
        chord_line = ' '.join(f'[{chord}]word' for chord in chords_list)
        
        content = f"""{"{title: Many Chords}"}

{chord_line}
Another line with chords
{chord_line}"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='guitar')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')


class TestErrorHandlingWithDiagrams:
    """Test error handling with chord diagrams enabled."""
    
    def test_invalid_instrument(self):
        """Test handling of invalid instrument type."""
        # Should not crash, just use default guitar settings
        generator = ChordProPDFGenerator(include_chord_diagrams=True, diagram_instrument='invalid')
        assert generator.diagram_instrument == 'invalid'  # Stored as is, handled gracefully
    
    def test_chord_diagram_generation_failure(self):
        """Test handling when chord diagram generation fails."""
        content = """{title: Test}
[C]Test"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True)
        
        # Should not crash even if diagram generation has issues
        pdf_bytes = generator.generate_pdf(content)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
    
    def test_empty_chord_extraction(self):
        """Test handling of content with no extractable chords."""
        content = """{title: No Chords}
Just plain lyrics with no chords
Another line without any chord markup"""
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True)
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # Verify no chords extracted
        parsed_data = generator.parse_chordpro_content(content)
        chords = generator._extract_unique_chords(parsed_data)
        assert chords == set()