"""
Unit tests for enhanced PDF generation features.
Tests intelligent page breaks, file size optimization, multi-song PDFs, and embedded fonts.
"""

import pytest
from chordme.pdf_generator import ChordProPDFGenerator, generate_song_pdf


class TestIntelligentPageBreaks:
    """Test cases for intelligent page break functionality."""
    
    def test_init_with_intelligent_page_breaks_enabled(self):
        """Test generator initialization with intelligent page breaks enabled."""
        generator = ChordProPDFGenerator(intelligent_page_breaks=True)
        assert generator.intelligent_page_breaks is True
    
    def test_init_with_intelligent_page_breaks_disabled(self):
        """Test generator initialization with intelligent page breaks disabled."""
        generator = ChordProPDFGenerator(intelligent_page_breaks=False)
        assert generator.intelligent_page_breaks is False
    
    def test_group_sections_for_page_layout_enabled(self):
        """Test section grouping when intelligent page breaks are enabled."""
        generator = ChordProPDFGenerator(intelligent_page_breaks=True)
        
        # Create test sections
        sections = [
            {'type': 'verse', 'lines': [{'chords': [], 'lyrics': 'Line 1'}] * 5},  # Small section
            {'type': 'chorus', 'lines': [{'chords': [], 'lyrics': 'Chorus'}] * 3},  # Small section
            {'type': 'verse', 'lines': [{'chords': [], 'lyrics': 'Long verse'}] * 25},  # Large section
            {'type': 'bridge', 'lines': [{'chords': [], 'lyrics': 'Bridge'}] * 4}   # Small section
        ]
        
        groups = generator._group_sections_for_page_layout(sections)
        assert isinstance(groups, list)
        assert len(groups) >= 1  # Should create at least one group
        
        # Verify all sections are included
        total_sections = sum(len(group) for group in groups)
        assert total_sections == len(sections)
    
    def test_group_sections_for_page_layout_disabled(self):
        """Test section grouping when intelligent page breaks are disabled."""
        generator = ChordProPDFGenerator(intelligent_page_breaks=False)
        
        sections = [
            {'type': 'verse', 'lines': [{'chords': [], 'lyrics': 'Line 1'}]},
            {'type': 'chorus', 'lines': [{'chords': [], 'lyrics': 'Chorus'}]}
        ]
        
        groups = generator._group_sections_for_page_layout(sections)
        assert len(groups) == 1
        assert groups[0] == sections  # Should return all sections as one group
    
    def test_should_break_page_before_section_enabled(self):
        """Test page break decision when intelligent page breaks are enabled."""
        generator = ChordProPDFGenerator(intelligent_page_breaks=True)
        
        # Test case where section should not trigger page break (plenty of space)
        section = {'type': 'verse', 'lines': [{'chords': [], 'lyrics': 'Short'}] * 2}
        should_break = generator._should_break_page_before_section(section, 100, 600)
        assert should_break is False
        
        # Test case where section should trigger page break (limited space)
        large_section = {'type': 'verse', 'lines': [{'chords': [], 'lyrics': 'Long'}] * 20}
        should_break = generator._should_break_page_before_section(large_section, 500, 600)
        assert should_break is True
    
    def test_should_break_page_before_section_disabled(self):
        """Test page break decision when intelligent page breaks are disabled."""
        generator = ChordProPDFGenerator(intelligent_page_breaks=False)
        
        # Should always return False when disabled
        section = {'type': 'verse', 'lines': [{'chords': [], 'lyrics': 'Long'}] * 20}
        should_break = generator._should_break_page_before_section(section, 500, 600)
        assert should_break is False
    
    def test_pdf_generation_with_intelligent_page_breaks(self):
        """Test PDF generation with intelligent page breaks enabled."""
        content = """{title: Long Song}
{artist: Test Artist}

{sov}
[C]This is a [G]very long [Am]verse
With [F]many [C]lines [G]that should
[Am]Test the [F]intelligent [C]page break
[G]Algorithm to [Am]see if it [F]works properly
[C]More lines [G]here [Am]to make [F]it longer
[C]Even more [G]content [Am]to test [F]grouping
{eov}

{soc}
[F]This is [C]the chorus [G]section
[Am]With some [F]content [C]here [G]too
{eoc}

{sob}
[Am]Bridge section [F]with different
[C]Content that [G]should be
[Am]Handled [F]properly [C]by the [G]algorithm
{eob}"""
        
        generator = ChordProPDFGenerator(intelligent_page_breaks=True)
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')


class TestFileOptimization:
    """Test cases for PDF file size optimization."""
    
    def test_init_with_optimization_enabled(self):
        """Test generator initialization with file optimization enabled."""
        generator = ChordProPDFGenerator(optimize_file_size=True)
        assert generator.optimize_file_size is True
    
    def test_init_with_optimization_disabled(self):
        """Test generator initialization with file optimization disabled."""
        generator = ChordProPDFGenerator(optimize_file_size=False)
        assert generator.optimize_file_size is False
    
    def test_create_optimized_document(self):
        """Test optimized document creation."""
        from io import BytesIO
        
        generator = ChordProPDFGenerator(optimize_file_size=True)
        buffer = BytesIO()
        
        doc = generator._create_optimized_document(buffer, [])
        assert doc is not None
        assert hasattr(doc, 'build')
    
    def test_create_unoptimized_document(self):
        """Test regular document creation."""
        from io import BytesIO
        
        generator = ChordProPDFGenerator(optimize_file_size=False)
        buffer = BytesIO()
        
        doc = generator._create_optimized_document(buffer, [])
        assert doc is not None
        assert hasattr(doc, 'build')
    
    def test_pdf_optimization_comparison(self):
        """Test that optimization affects file size."""
        content = """{title: Test Song}
[C]Simple [G]test [Am]content [F]here
Another [C]line [G]with [Am]chords [F]too"""
        
        # Generate optimized PDF
        generator_opt = ChordProPDFGenerator(optimize_file_size=True)
        pdf_opt = generator_opt.generate_pdf(content)
        
        # Generate unoptimized PDF
        generator_std = ChordProPDFGenerator(optimize_file_size=False)
        pdf_std = generator_std.generate_pdf(content)
        
        assert isinstance(pdf_opt, bytes)
        assert isinstance(pdf_std, bytes)
        assert len(pdf_opt) > 0
        assert len(pdf_std) > 0
        
        # Optimized version should typically be smaller or same size
        # (Though with very small files, the difference might be minimal)
        assert len(pdf_opt) <= len(pdf_std) * 1.1  # Allow 10% tolerance


class TestEmbeddedFonts:
    """Test cases for embedded font functionality."""
    
    def test_register_embedded_fonts(self):
        """Test font registration process."""
        generator = ChordProPDFGenerator()
        
        # Should not raise an exception
        generator._register_embedded_fonts()
    
    def test_pdf_generation_with_embedded_fonts(self):
        """Test PDF generation uses embedded font registration."""
        content = """{title: Font Test}
[C]Testing [G]fonts [Am]in [F]PDF"""
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')


class TestMultiSongPDFs:
    """Test cases for multi-song PDF generation."""
    
    def test_create_multi_song_pdf_with_toc(self):
        """Test creating multi-song PDF with table of contents."""
        songs = [
            {
                'title': 'Amazing Grace',
                'artist': 'John Newton',
                'content': """{title: Amazing Grace}
{artist: John Newton}

[G]Amazing [G7]grace how [C]sweet the [G]sound"""
            },
            {
                'title': 'House of the Rising Sun',
                'artist': 'Traditional',
                'content': """{title: House of the Rising Sun}
{artist: Traditional}

There [Am]is a [C]house in [D]New [F]Orleans"""
            }
        ]
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.create_multi_song_pdf(songs, include_toc=True)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_create_multi_song_pdf_without_toc(self):
        """Test creating multi-song PDF without table of contents."""
        songs = [
            {
                'title': 'Song 1',
                'content': '[C]First song [G]content'
            },
            {
                'title': 'Song 2',
                'content': '[Am]Second song [F]content'
            }
        ]
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.create_multi_song_pdf(songs, include_toc=False)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_create_multi_song_pdf_single_song(self):
        """Test creating multi-song PDF with only one song."""
        songs = [
            {
                'title': 'Solo Song',
                'content': '[C]Only one [G]song here'
            }
        ]
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.create_multi_song_pdf(songs, include_toc=True)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_create_multi_song_pdf_with_chord_diagrams(self):
        """Test creating multi-song PDF with chord diagrams."""
        songs = [
            {
                'title': 'Song with Chords',
                'content': '[C]Test [G]with [Am]chord [F]diagrams'
            },
            {
                'title': 'Another Song',
                'content': '[Dm]More [C]chord [G]content'
            }
        ]
        
        generator = ChordProPDFGenerator(include_chord_diagrams=True)
        pdf_bytes = generator.create_multi_song_pdf(songs)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')


class TestEnhancedConvenienceFunction:
    """Test cases for enhanced convenience function."""
    
    def test_generate_song_pdf_with_all_enhancements(self):
        """Test convenience function with all enhancement parameters."""
        content = """{title: Enhanced Test}
[C]Testing [G]all [Am]the [F]enhancements
[Dm]Including [C]page [G]breaks
[Am]And [F]optimization [C]features"""
        
        pdf_bytes = generate_song_pdf(
            content=content,
            title="Enhanced Test Song",
            artist="Test Artist",
            paper_size="letter",
            orientation="portrait",
            template_name="modern",
            include_chord_diagrams=True,
            diagram_instrument="guitar",
            intelligent_page_breaks=True,
            optimize_file_size=True
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_song_pdf_minimal_enhancements(self):
        """Test convenience function with minimal enhancement settings."""
        content = "[C]Simple [G]test"
        
        pdf_bytes = generate_song_pdf(
            content=content,
            intelligent_page_breaks=False,
            optimize_file_size=False
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')


class TestIntegrationEnhancements:
    """Integration tests for all enhanced features together."""
    
    def test_all_features_integration(self):
        """Test all enhanced features working together."""
        content = """{title: Complete Feature Test}
{artist: Test Artist}
{key: C}
{tempo: 120}

{sov}
[C]This song [G]tests all
[Am]The enhanced [F]features
[C]Including chord [G]diagrams
[Am]Intelligent [F]page breaks
[C]And file [G]optimization
{eov}

{soc}
[F]All these [C]features
[G]Working [Am]together
[F]In one [C]comprehensive [G]test
{eoc}

{sob}
[Am]Bridge with [F]different
[C]Content to [G]test
[Am]Section [F]grouping [C]algorithms [G]properly
{eob}"""
        
        generator = ChordProPDFGenerator(
            include_chord_diagrams=True,
            diagram_instrument='guitar',
            intelligent_page_breaks=True,
            optimize_file_size=True,
            template_name='modern'
        )
        
        pdf_bytes = generator.generate_pdf(content, title="Integration Test", artist="Test Suite")
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # PDF should be reasonably sized for the content
        assert len(pdf_bytes) > 2000  # Has substantial content
        assert len(pdf_bytes) < 50000  # But not excessively large
    
    def test_backward_compatibility(self):
        """Test that enhanced features don't break backward compatibility."""
        content = """{title: Compatibility Test}
[C]Simple [G]song [Am]content [F]here"""
        
        # Test with old-style initialization (should still work)
        generator = ChordProPDFGenerator(paper_size='a4', orientation='portrait')
        pdf_bytes = generator.generate_pdf(content)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # Test with old-style convenience function call
        pdf_bytes2 = generate_song_pdf(
            content=content,
            title="Compatibility Test",
            paper_size="letter"
        )
        
        assert isinstance(pdf_bytes2, bytes)
        assert len(pdf_bytes2) > 0
        assert pdf_bytes2.startswith(b'%PDF')


class TestErrorHandlingEnhancements:
    """Test error handling for enhanced features."""
    
    def test_empty_sections_list(self):
        """Test handling of empty sections list for page layout."""
        generator = ChordProPDFGenerator(intelligent_page_breaks=True)
        
        groups = generator._group_sections_for_page_layout([])
        assert groups == []
    
    def test_multi_song_pdf_empty_songs(self):
        """Test multi-song PDF with empty songs list."""
        generator = ChordProPDFGenerator()
        
        pdf_bytes = generator.create_multi_song_pdf([])
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_multi_song_pdf_invalid_song_data(self):
        """Test multi-song PDF with incomplete song data."""
        songs = [
            {'title': 'Good Song', 'content': '[C]Good content'},
            {'content': '[G]Missing title'},  # Missing title
            {}  # Completely empty
        ]
        
        generator = ChordProPDFGenerator()
        pdf_bytes = generator.create_multi_song_pdf(songs)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')