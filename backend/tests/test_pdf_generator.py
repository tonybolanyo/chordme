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