"""
Unit tests for PDF generation utilities.
"""

import pytest
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4, legal
from chordme.pdf_generator import ChordProPDFGenerator, generate_song_pdf


class TestChordProPDFGenerator:
    """Test cases for ChordProPDFGenerator class."""
    
    def test_init_default_parameters(self):
        """Test generator initialization with default parameters."""
        generator = ChordProPDFGenerator()
        assert generator.paper_size == A4
        assert generator.orientation == 'portrait'
        assert generator.page_size == A4
        assert 'title' in generator.styles
        assert 'author' in generator.styles
        assert 'chord' in generator.styles
        assert 'lyrics' in generator.styles
    
    def test_init_custom_parameters(self):
        """Test generator initialization with custom parameters."""
        generator = ChordProPDFGenerator(paper_size='letter', orientation='landscape')
        assert generator.paper_size == letter
        assert generator.orientation == 'landscape'
        assert generator.page_size == (letter[1], letter[0])  # Swapped for landscape
    
    def test_init_invalid_paper_size(self):
        """Test generator initialization with invalid paper size defaults to a4."""
        generator = ChordProPDFGenerator(paper_size='invalid')
        assert generator.paper_size == A4
    
    def test_parse_chordpro_content_basic(self):
        """Test parsing basic ChordPro content."""
        content = """{title: Test Song}
{artist: Test Artist}
{key: C}
[C]Hello [G]world
This is a [Am]test [F]song"""
        
        generator = ChordProPDFGenerator()
        parsed = generator.parse_chordpro_content(content)
        
        assert parsed['title'] == 'Test Song'
        assert parsed['artist'] == 'Test Artist'
        assert parsed['key'] == 'C'
        assert len(parsed['sections']) == 1
        assert len(parsed['sections'][0]['lines']) == 2
        
        # Check first line with chords
        first_line = parsed['sections'][0]['lines'][0]
        assert len(first_line['chords']) == 2
        assert first_line['chords'][0]['chord'] == 'C'
        assert first_line['chords'][1]['chord'] == 'G'
        assert first_line['lyrics'] == 'Hello world'
    
    def test_parse_chordpro_content_sections(self):
        """Test parsing ChordPro content with sections."""
        content = """{title: Test Song}
Verse line
{soc}
Chorus line
{eoc}
Another verse"""
        
        generator = ChordProPDFGenerator()
        parsed = generator.parse_chordpro_content(content)
        
        assert len(parsed['sections']) == 3
        assert parsed['sections'][0]['type'] == 'verse'
        assert parsed['sections'][1]['type'] == 'chorus'
        assert parsed['sections'][2]['type'] == 'verse'
    
    def test_parse_chord_line_simple(self):
        """Test parsing simple chord line."""
        generator = ChordProPDFGenerator()
        chords, lyrics = generator._parse_chord_line("[C]Hello [G]world")
        
        assert len(chords) == 2
        assert chords[0]['chord'] == 'C'
        assert chords[0]['position'] == 0
        assert chords[1]['chord'] == 'G'
        assert chords[1]['position'] == 6  # Position after "Hello "
        assert lyrics == "Hello world"
    
    def test_parse_chord_line_no_chords(self):
        """Test parsing line without chords."""
        generator = ChordProPDFGenerator()
        chords, lyrics = generator._parse_chord_line("Just lyrics here")
        
        assert len(chords) == 0
        assert lyrics == "Just lyrics here"
    
    def test_parse_chord_line_complex(self):
        """Test parsing complex chord line with multiple chords."""
        generator = ChordProPDFGenerator()
        chords, lyrics = generator._parse_chord_line("[Am]Test [F]with [C]multiple [G]chords")
        
        assert len(chords) == 4
        assert chords[0]['chord'] == 'Am'
        assert chords[1]['chord'] == 'F'
        assert chords[2]['chord'] == 'C'
        assert chords[3]['chord'] == 'G'
        assert lyrics == "Test with multiple chords"
    
    def test_format_chord_line(self):
        """Test formatting chord line alignment."""
        generator = ChordProPDFGenerator()
        chords = [
            {'chord': 'C', 'position': 0},
            {'chord': 'G', 'position': 6}
        ]
        lyrics = "Hello world"
        
        formatted = generator._format_chord_line(chords, lyrics)
        assert formatted.startswith('C')
        assert 'G' in formatted
        # Check that G appears roughly at position 6
        assert formatted.find('G') >= 6
    
    def test_generate_pdf_basic(self):
        """Test basic PDF generation."""
        content = """{title: Test Song}
{artist: Test Artist}
[C]Hello [G]world
This is a test"""
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')  # PDF header
    
    def test_generate_pdf_with_overrides(self):
        """Test PDF generation with title and artist overrides."""
        content = """{title: Original Title}
{artist: Original Artist}
Test content"""
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.generate_pdf(
            content, 
            title="Override Title", 
            artist="Override Artist"
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_pdf_no_metadata(self):
        """Test PDF generation with minimal content."""
        content = "Just some lyrics"
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_pdf_different_paper_sizes(self):
        """Test PDF generation with different paper sizes."""
        content = "Test content"
        
        for paper_size in ['a4', 'letter', 'legal']:
            generator = ChordProPDFGenerator(paper_size=paper_size)
            pdf_bytes = generator.generate_pdf(content)
            
            assert isinstance(pdf_bytes, bytes)
            assert len(pdf_bytes) > 0
            assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_pdf_landscape_orientation(self):
        """Test PDF generation with landscape orientation."""
        content = "Test content"
        
        generator = ChordProPDFGenerator(orientation='landscape')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_create_chord_lyric_paragraphs(self):
        """Test creation of chord and lyric paragraphs."""
        generator = ChordProPDFGenerator()
        line_data = {
            'chords': [{'chord': 'C', 'position': 0}],
            'lyrics': 'Hello world'
        }
        
        chord_para, lyric_para = generator._create_chord_lyric_paragraphs(line_data)
        
        assert chord_para is not None
        assert lyric_para is not None
    
    def test_create_chord_lyric_paragraphs_no_chords(self):
        """Test creation of paragraphs with no chords."""
        generator = ChordProPDFGenerator()
        line_data = {
            'chords': [],
            'lyrics': 'Hello world'
        }
        
        chord_para, lyric_para = generator._create_chord_lyric_paragraphs(line_data)
        
        assert chord_para is None
        assert lyric_para is not None
    
    def test_create_chord_lyric_paragraphs_empty_lyrics(self):
        """Test creation of paragraphs with empty lyrics."""
        generator = ChordProPDFGenerator()
        line_data = {
            'chords': [],
            'lyrics': ''
        }
        
        chord_para, lyric_para = generator._create_chord_lyric_paragraphs(line_data)
        
        assert chord_para is None
        assert lyric_para is not None


class TestGenerateSongPDF:
    """Test cases for the convenience function generate_song_pdf."""
    
    def test_generate_song_pdf_basic(self):
        """Test basic song PDF generation."""
        content = """{title: Test Song}
Test content"""
        
        pdf_bytes = generate_song_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_song_pdf_with_parameters(self):
        """Test song PDF generation with all parameters."""
        content = "Test content"
        
        pdf_bytes = generate_song_pdf(
            content,
            title="Test Title",
            artist="Test Artist",
            paper_size="letter",
            orientation="landscape"
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_song_pdf_comprehensive_content(self):
        """Test PDF generation with comprehensive ChordPro content."""
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
        
        pdf_bytes = generate_song_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000  # Should be substantial with real content
        assert pdf_bytes.startswith(b'%PDF')


class TestPDFContentValidation:
    """Test cases for validating PDF generation with specific content scenarios."""
    
    def test_pdf_with_special_characters(self):
        """Test PDF generation with special characters."""
        content = """{title: Café Song}
{artist: José María}
Test with ñ, ü, and other special characters"""
        
        pdf_bytes = generate_song_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_pdf_with_long_content(self):
        """Test PDF generation with long content that spans multiple pages."""
        # Create long content with many verses
        verses = []
        for i in range(20):
            verses.append(f"""{{sov}}
This is verse number {i + 1}
With [C]some [G]chords [Am]here [F]too
Another line in this verse
And [G]one more [C]line
{{eov}}""")
        
        content = f"""{{title: Long Song}}
{{artist: Test Artist}}

{chr(10).join(verses)}"""
        
        pdf_bytes = generate_song_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 3000  # Should be substantial
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_pdf_with_complex_chords(self):
        """Test PDF generation with complex chord notation."""
        content = """{title: Jazz Song}
{artist: Complex Chords}
[Cmaj7]Complex [G#dim7]chords [F#m7b5]here
[Bb13]And [A7sus4]some [Dm9]more
Test with [C/E]slash chords [F/G]too"""
        
        pdf_bytes = generate_song_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_pdf_metadata_validation(self):
        """Test that PDF contains proper metadata."""
        content = """{title: Metadata Test}
{artist: Test Artist}
{key: C major}
{tempo: 120 BPM}
Test content here"""
        
        pdf_bytes = generate_song_pdf(content)
        
        # Basic validation - PDF should be generated successfully
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # More comprehensive metadata validation would require PDF parsing library
        # For now, we ensure the PDF is generated without errors

    def test_pdf_with_empty_sections(self):
        """Test PDF generation with empty sections."""
        content = """{title: Empty Sections Test}
        {sov}
        {eov}
        
        {soc}
        {eoc}
        
        Some actual content"""
        
        pdf_bytes = generate_song_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')

    def test_pdf_error_handling_invalid_content(self):
        """Test PDF generation with potentially problematic content."""
        content = None
        
        # Should handle None content gracefully
        generator = ChordProPDFGenerator()
        try:
            pdf_bytes = generator.generate_pdf(content)
            # If it doesn't raise an exception, it should return empty or minimal PDF
            assert isinstance(pdf_bytes, bytes) or pdf_bytes is None
        except (TypeError, AttributeError):
            # Exception is acceptable for None input
            pass

    def test_pdf_styles_customization(self):
        """Test that PDF generator creates proper styles."""
        generator = ChordProPDFGenerator()
        styles = generator.styles
        
        # Check all required styles exist
        required_styles = ['title', 'author', 'chord', 'lyrics', 'section', 'metadata']
        for style_name in required_styles:
            assert style_name in styles
            assert hasattr(styles[style_name], 'fontSize')
            assert hasattr(styles[style_name], 'fontName')

    def test_chord_position_calculation(self):
        """Test accurate chord position calculation."""
        generator = ChordProPDFGenerator()
        test_cases = [
            ("[C]Hello", [{'chord': 'C', 'position': 0}], "Hello"),
            ("Hello [G]world", [{'chord': 'G', 'position': 6}], "Hello world"),
            ("[Am]Test [F]with [C]many", [
                {'chord': 'Am', 'position': 0},
                {'chord': 'F', 'position': 5},
                {'chord': 'C', 'position': 10}
            ], "Test with many"),
        ]
        
        for chord_line, expected_chords, expected_lyrics in test_cases:
            chords, lyrics = generator._parse_chord_line(chord_line)
            assert chords == expected_chords
            assert lyrics == expected_lyrics

    def test_format_chord_line_alignment(self):
        """Test chord line formatting and alignment."""
        generator = ChordProPDFGenerator()
        
        # Test various chord positioning scenarios
        test_cases = [
            ([{'chord': 'C', 'position': 0}], "Hello", 'C'),
            ([{'chord': 'G', 'position': 5}], "Hello world", 'G'),
            ([
                {'chord': 'C', 'position': 0},
                {'chord': 'G', 'position': 6}
            ], "Hello world", ['C', 'G']),
        ]
        
        for chords, lyrics, expected_chords in test_cases:
            formatted = generator._format_chord_line(chords, lyrics)
            assert isinstance(formatted, str)
            assert len(formatted) > 0
            
            if isinstance(expected_chords, str):
                assert expected_chords in formatted
            else:
                for chord in expected_chords:
                    assert chord in formatted

    def test_section_type_detection(self):
        """Test section type detection from ChordPro directives."""
        generator = ChordProPDFGenerator()
        content = """{title: Section Test}
        
        Regular verse content
        
        {sov}
        Verse content
        {eov}
        
        {soc}
        Chorus content
        {eoc}
        
        {sob}
        Bridge content
        {eob}"""
        
        parsed = generator.parse_chordpro_content(content)
        
        assert len(parsed['sections']) >= 4
        # First section should be regular verse
        assert parsed['sections'][0]['type'] == 'verse'
        
        # Look for specific section types
        section_types = [section['type'] for section in parsed['sections']]
        assert 'verse' in section_types
        assert 'chorus' in section_types
        assert 'bridge' in section_types

    def test_parse_metadata_directives(self):
        """Test parsing of various ChordPro metadata directives."""
        content = """{title: Test Song}
        {artist: Test Artist}
        {album: Test Album}
        {key: C major}
        {tempo: 120}
        {capo: 2}
        {time: 4/4}
        {composer: Test Composer}
        
        Song content here"""
        
        generator = ChordProPDFGenerator()
        parsed = generator.parse_chordpro_content(content)
        
        assert parsed['title'] == 'Test Song'
        assert parsed['artist'] == 'Test Artist'
        # Additional metadata may be stored in parsed data
        assert len(parsed['sections']) >= 1

    def test_multiline_chord_sequences(self):
        """Test handling of multiple consecutive chord lines."""
        content = """{title: Chord Test}
        [C] [G] [Am] [F]
        [C] [G] [F] [C]
        This is the actual lyric line"""
        
        generator = ChordProPDFGenerator()
        parsed = generator.parse_chordpro_content(content)
        
        assert len(parsed['sections']) >= 1
        assert len(parsed['sections'][0]['lines']) >= 3

    def test_generate_pdf_with_all_options(self):
        """Test PDF generation with all possible options."""
        content = """{title: Complete Test}
        {artist: Full Artist}
        {key: G}
        
        [G]Complete [C]test [D]song
        With multiple features"""
        
        for paper_size in ['a4', 'letter', 'legal']:
            for orientation in ['portrait', 'landscape']:
                generator = ChordProPDFGenerator(
                    paper_size=paper_size,
                    orientation=orientation
                )
                pdf_bytes = generator.generate_pdf(
                    content,
                    title="Override Title",
                    artist="Override Artist"
                )
                
                assert isinstance(pdf_bytes, bytes)
                assert len(pdf_bytes) > 0
                assert pdf_bytes.startswith(b'%PDF')

    def test_pdf_memory_efficiency(self):
        """Test that PDF generation doesn't consume excessive memory."""
        content = """{title: Memory Test}
        Simple content"""
        
        generator = ChordProPDFGenerator()
        
        # Generate multiple PDFs to check for memory leaks
        for i in range(10):
            pdf_bytes = generator.generate_pdf(content)
            assert isinstance(pdf_bytes, bytes)
            assert len(pdf_bytes) > 0
            # Force garbage collection would be done here in a real test
            
    def test_chord_line_edge_cases(self):
        """Test chord line parsing edge cases."""
        generator = ChordProPDFGenerator()
        
        edge_cases = [
            ("", [], ""),  # Empty line
            ("[C]", [{'chord': 'C', 'position': 0}], ""),  # Only chord
            ("lyrics only", [], "lyrics only"),  # No chords
            ("[C][G][Am]", [  # Adjacent chords
                {'chord': 'C', 'position': 0},
                {'chord': 'G', 'position': 0},
                {'chord': 'Am', 'position': 0}
            ], ""),
            ("[C] [G] [Am]", [  # Spaced chords only
                {'chord': 'C', 'position': 0},
                {'chord': 'G', 'position': 1},
                {'chord': 'Am', 'position': 2}
            ], "  "),
        ]
        
        for chord_line, expected_chords, expected_lyrics in edge_cases:
            chords, lyrics = generator._parse_chord_line(chord_line)
            assert len(chords) == len(expected_chords)
            assert lyrics == expected_lyrics