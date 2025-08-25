"""
PDF generation utilities for ChordPro songs.
Handles rendering chords above lyrics with proper layout and styling.
"""

from reportlab.lib.pagesizes import letter, A4, legal
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import black, blue, red
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from io import BytesIO
import re
from typing import Dict, List, Tuple, Optional


class ChordProPDFGenerator:
    """
    Generates PDF documents from ChordPro formatted songs.
    Supports customizable paper sizes, orientations, and styling.
    """
    
    # Supported paper sizes
    PAPER_SIZES = {
        'letter': letter,
        'a4': A4,
        'legal': legal
    }
    
    def __init__(self, paper_size: str = 'a4', orientation: str = 'portrait'):
        """
        Initialize PDF generator with specified paper size and orientation.
        
        Args:
            paper_size: Paper size ('letter', 'a4', 'legal')
            orientation: Orientation ('portrait' or 'landscape')
        """
        self.paper_size = self.PAPER_SIZES.get(paper_size.lower(), A4)
        self.orientation = orientation.lower()
        
        if self.orientation == 'landscape':
            self.page_size = (self.paper_size[1], self.paper_size[0])
        else:
            self.page_size = self.paper_size
            
        self.styles = self._create_styles()
    
    def _create_styles(self) -> Dict:
        """Create custom styles for PDF document."""
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'SongTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=black
        )
        
        # Author style
        author_style = ParagraphStyle(
            'SongAuthor',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=16,
            alignment=TA_CENTER,
            textColor=black,
            fontName='Helvetica-Oblique'
        )
        
        # Chord style (for chords above lyrics)
        chord_style = ParagraphStyle(
            'ChordStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=blue,
            fontName='Helvetica-Bold',
            spaceBefore=2,
            spaceAfter=0
        )
        
        # Lyrics style
        lyrics_style = ParagraphStyle(
            'LyricsStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=black,
            fontName='Helvetica',
            spaceBefore=0,
            spaceAfter=4
        )
        
        # Section style (for verse, chorus, etc.)
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=red,
            fontName='Helvetica-Bold',
            spaceBefore=12,
            spaceAfter=6
        )
        
        return {
            'title': title_style,
            'author': author_style,
            'chord': chord_style,
            'lyrics': lyrics_style,
            'section': section_style,
            'normal': styles['Normal']
        }
    
    def parse_chordpro_content(self, content: str) -> Dict:
        """
        Parse ChordPro content and extract metadata and song structure.
        
        Args:
            content: ChordPro formatted content
            
        Returns:
            Dictionary with parsed song data
        """
        lines = content.split('\n')
        parsed_data = {
            'title': None,
            'artist': None,
            'key': None,
            'tempo': None,
            'sections': []
        }
        
        current_section = {'type': 'verse', 'lines': []}
        
        for line in lines:
            line = line.strip()
            
            # Parse directives
            if line.startswith('{') and line.endswith('}'):
                directive_full = line[1:-1]
                directive_lower = directive_full.lower()
                
                if directive_lower.startswith('title:') or directive_lower.startswith('t:'):
                    parsed_data['title'] = directive_full.split(':', 1)[1].strip()
                elif directive_lower.startswith('artist:') or directive_lower.startswith('subtitle:'):
                    parsed_data['artist'] = directive_full.split(':', 1)[1].strip()
                elif directive_lower.startswith('key:'):
                    parsed_data['key'] = directive_full.split(':', 1)[1].strip()
                elif directive_lower.startswith('tempo:'):
                    parsed_data['tempo'] = directive_full.split(':', 1)[1].strip()
                elif directive_lower in ['soc', 'start_of_chorus']:
                    if current_section['lines']:
                        parsed_data['sections'].append(current_section)
                    current_section = {'type': 'chorus', 'lines': []}
                elif directive_lower in ['eoc', 'end_of_chorus']:
                    parsed_data['sections'].append(current_section)
                    current_section = {'type': 'verse', 'lines': []}
                elif directive_lower in ['sov', 'start_of_verse']:
                    if current_section['lines']:
                        parsed_data['sections'].append(current_section)
                    current_section = {'type': 'verse', 'lines': []}
                elif directive_lower in ['eov', 'end_of_verse']:
                    parsed_data['sections'].append(current_section)
                    current_section = {'type': 'verse', 'lines': []}
                elif directive_lower in ['sob', 'start_of_bridge']:
                    if current_section['lines']:
                        parsed_data['sections'].append(current_section)
                    current_section = {'type': 'bridge', 'lines': []}
                elif directive_lower in ['eob', 'end_of_bridge']:
                    parsed_data['sections'].append(current_section)
                    current_section = {'type': 'verse', 'lines': []}
            
            # Parse chord and lyric lines
            elif line:
                chord_line, lyric_line = self._parse_chord_line(line)
                current_section['lines'].append({
                    'chords': chord_line,
                    'lyrics': lyric_line
                })
        
        # Add final section if it has content
        if current_section['lines']:
            parsed_data['sections'].append(current_section)
        
        return parsed_data
    
    def _parse_chord_line(self, line: str) -> Tuple[List[Dict], str]:
        """
        Parse a line containing chords and lyrics.
        
        Args:
            line: Line with chord notation like "[C]Hello [G]world"
            
        Returns:
            Tuple of (chord_positions, lyrics_text)
        """
        chord_pattern = r'\[([^\]]+)\]'
        chords = []
        lyrics = line
        
        # Find all chord matches with their positions
        for match in re.finditer(chord_pattern, line):
            chord = match.group(1)
            start_pos = match.start()
            # Calculate position in lyrics after removing previous chords
            lyrics_pos = start_pos - sum(len(f"[{c['chord']}]") for c in chords)
            
            chords.append({
                'chord': chord,
                'position': lyrics_pos
            })
        
        # Remove chord notation from lyrics
        lyrics = re.sub(chord_pattern, '', lyrics)
        
        return chords, lyrics
    
    def generate_pdf(self, content: str, title: str = None, artist: str = None) -> bytes:
        """
        Generate PDF document from ChordPro content.
        
        Args:
            content: ChordPro formatted content
            title: Override title (optional)
            artist: Override artist (optional)
            
        Returns:
            PDF content as bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch
        )
        
        story = []
        
        # Parse ChordPro content
        parsed_data = self.parse_chordpro_content(content)
        
        # Use provided title/artist or fallback to parsed values
        song_title = title or parsed_data['title'] or 'Untitled Song'
        song_artist = artist or parsed_data['artist']
        
        # Add title
        story.append(Paragraph(song_title, self.styles['title']))
        
        # Add artist if available
        if song_artist:
            story.append(Paragraph(f"by {song_artist}", self.styles['author']))
        
        # Add key and tempo if available
        metadata_parts = []
        if parsed_data['key']:
            metadata_parts.append(f"Key: {parsed_data['key']}")
        if parsed_data['tempo']:
            metadata_parts.append(f"Tempo: {parsed_data['tempo']}")
        
        if metadata_parts:
            story.append(Paragraph(" | ".join(metadata_parts), self.styles['normal']))
            story.append(Spacer(1, 12))
        
        # Add song sections
        for section in parsed_data['sections']:
            # Add section header if not a basic verse
            if section['type'] != 'verse':
                section_title = section['type'].title()
                story.append(Paragraph(section_title, self.styles['section']))
            
            # Add chord and lyric lines
            for line_data in section['lines']:
                if line_data['chords'] or line_data['lyrics'].strip():
                    chord_paragraph, lyric_paragraph = self._create_chord_lyric_paragraphs(line_data)
                    
                    if chord_paragraph:
                        story.append(chord_paragraph)
                    story.append(lyric_paragraph)
                else:
                    # Empty line for spacing
                    story.append(Spacer(1, 6))
            
            # Add spacing between sections
            story.append(Spacer(1, 12))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _create_chord_lyric_paragraphs(self, line_data: Dict) -> Tuple[Optional[object], object]:
        """
        Create paragraphs for chord and lyric lines with proper alignment.
        
        Args:
            line_data: Dictionary with 'chords' and 'lyrics' keys
            
        Returns:
            Tuple of (chord_paragraph, lyric_paragraph)
        """
        chords = line_data['chords']
        lyrics = line_data['lyrics']
        
        chord_paragraph = None
        
        # Create chord line if chords exist
        if chords:
            chord_text = self._format_chord_line(chords, lyrics)
            if chord_text.strip():
                chord_paragraph = Paragraph(chord_text, self.styles['chord'])
        
        # Create lyric line
        lyric_text = lyrics if lyrics.strip() else "&nbsp;"  # Non-breaking space for empty lines
        lyric_paragraph = Paragraph(lyric_text, self.styles['lyrics'])
        
        return chord_paragraph, lyric_paragraph
    
    def _format_chord_line(self, chords: List[Dict], lyrics: str) -> str:
        """
        Format chord line to align with lyrics.
        
        Args:
            chords: List of chord dictionaries with 'chord' and 'position'
            lyrics: Lyrics text for reference
            
        Returns:
            Formatted chord line text
        """
        if not chords:
            return ""
        
        # Create a character array to place chords
        max_length = max(len(lyrics), max(c['position'] + len(c['chord']) for c in chords) if chords else 0)
        chord_line = [' '] * (max_length + 10)  # Extra space for safety
        
        # Place chords at their positions
        for chord_data in chords:
            chord = chord_data['chord']
            pos = max(0, chord_data['position'])
            
            # Place chord at position, ensuring it doesn't overwrite other chords
            for i, char in enumerate(chord):
                if pos + i < len(chord_line):
                    chord_line[pos + i] = char
        
        return ''.join(chord_line).rstrip()


def generate_song_pdf(content: str, title: str = None, artist: str = None, 
                     paper_size: str = 'a4', orientation: str = 'portrait') -> bytes:
    """
    Convenience function to generate PDF for a song.
    
    Args:
        content: ChordPro formatted content
        title: Song title (optional)
        artist: Song artist (optional)
        paper_size: Paper size ('letter', 'a4', 'legal')
        orientation: Orientation ('portrait' or 'landscape')
        
    Returns:
        PDF content as bytes
    """
    generator = ChordProPDFGenerator(paper_size=paper_size, orientation=orientation)
    return generator.generate_pdf(content, title=title, artist=artist)