"""
PDF generation utilities for ChordPro songs.
Handles rendering chords above lyrics with proper layout and styling.
Supports template-based styling for flexible PDF customization.
"""

from reportlab.lib.pagesizes import letter, A4, legal
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import black, blue, red, HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing

from io import BytesIO
import re
from typing import Dict, List, Tuple, Optional, Set

from .pdf_template_schema import PDFTemplateConfig, FontConfig
from .pdf_templates import get_template, get_template_manager
from .chord_diagram_pdf import ChordDiagramGenerator, create_chord_diagram_for_pdf


class ChordProPDFGenerator:
    """
    Generates PDF documents from ChordPro formatted songs.
    Supports customizable paper sizes, orientations, styling, and templates.
    """
    
    # Supported paper sizes
    PAPER_SIZES = {
        'letter': letter,
        'a4': A4,
        'legal': legal
    }
    
    def __init__(self, paper_size: str = 'a4', orientation: str = 'portrait', 
                 template: Optional[PDFTemplateConfig] = None, template_name: Optional[str] = None,
                 include_chord_diagrams: bool = False, diagram_instrument: str = 'guitar'):
        """
        Initialize PDF generator with specified paper size, orientation, and template.
        
        Args:
            paper_size: Paper size ('letter', 'a4', 'legal')
            orientation: Orientation ('portrait' or 'landscape')
            template: Template configuration object
            template_name: Name of predefined template to use
            include_chord_diagrams: Whether to include chord diagrams in PDF
            diagram_instrument: Instrument type for chord diagrams ('guitar', 'ukulele')
        """
        # Set up template
        self.template = None
        if template:
            self.template = template
        elif template_name:
            self.template = get_template(template_name)
        
        # Chord diagram settings
        self.include_chord_diagrams = include_chord_diagrams
        self.diagram_instrument = diagram_instrument
        self.chord_diagram_generator = ChordDiagramGenerator() if include_chord_diagrams else None
        
        # Use template settings if available, otherwise use parameters
        if self.template:
            self.paper_size = self.PAPER_SIZES.get(self.template.page.size.lower(), A4)
            self.orientation = self.template.page.orientation.lower()
        else:
            self.paper_size = self.PAPER_SIZES.get(paper_size.lower(), A4)
            self.orientation = orientation.lower()
        
        if self.orientation == 'landscape':
            self.page_size = (self.paper_size[1], self.paper_size[0])
        else:
            self.page_size = self.paper_size
            
        self.styles = self._create_styles()
    
    def _hex_to_color(self, hex_color: str):
        """Convert hex color string to ReportLab color object."""
        try:
            return HexColor(hex_color)
        except:
            return black  # Fallback to black if conversion fails
    
    def _get_alignment(self, alignment: str):
        """Convert alignment string to ReportLab constant."""
        alignment_map = {
            'left': TA_LEFT,
            'center': TA_CENTER,
            'right': TA_RIGHT
        }
        return alignment_map.get(alignment.lower(), TA_CENTER)
    
    def _create_styles(self) -> Dict:
        """Create custom styles for PDF document based on template or defaults."""
        styles = getSampleStyleSheet()
        
        # Use template styles if available, otherwise use defaults
        if self.template:
            # Template-based styles
            title_style = ParagraphStyle(
                'SongTitle',
                parent=styles['Heading1'],
                fontSize=self.template.styles.title.size,
                spaceAfter=self.template.spacing.paragraph_spacing,
                alignment=TA_CENTER,
                textColor=self._hex_to_color(self.template.styles.title.color),
                fontName=self.template.styles.title.to_reportlab_font()
            )
            
            author_style = ParagraphStyle(
                'SongAuthor',
                parent=styles['Normal'],
                fontSize=self.template.styles.artist.size,
                spaceAfter=self.template.spacing.paragraph_spacing + 4,
                alignment=TA_CENTER,
                textColor=self._hex_to_color(self.template.styles.artist.color),
                fontName=self.template.styles.artist.to_reportlab_font()
            )
            
            chord_style = ParagraphStyle(
                'ChordStyle',
                parent=styles['Normal'],
                fontSize=self.template.styles.chords.size,
                textColor=self._hex_to_color(self.template.styles.chords.color),
                fontName=self.template.styles.chords.to_reportlab_font(),
                spaceBefore=2,
                spaceAfter=0
            )
            
            lyrics_style = ParagraphStyle(
                'LyricsStyle',
                parent=styles['Normal'],
                fontSize=self.template.styles.lyrics.size,
                textColor=self._hex_to_color(self.template.styles.lyrics.color),
                fontName=self.template.styles.lyrics.to_reportlab_font(),
                spaceBefore=0,
                spaceAfter=self.template.spacing.paragraph_spacing - 2
            )
            
            section_style = ParagraphStyle(
                'SectionStyle',
                parent=styles['Normal'],
                fontSize=self.template.styles.section_headers.size,
                textColor=self._hex_to_color(self.template.styles.section_headers.color),
                fontName=self.template.styles.section_headers.to_reportlab_font(),
                spaceBefore=self.template.spacing.section_spacing,
                spaceAfter=self.template.spacing.paragraph_spacing
            )
            
            metadata_style = ParagraphStyle(
                'MetadataStyle',
                parent=styles['Normal'],
                fontSize=self.template.styles.metadata.size,
                textColor=self._hex_to_color(self.template.styles.metadata.color),
                fontName=self.template.styles.metadata.to_reportlab_font(),
                spaceBefore=0,
                spaceAfter=self.template.spacing.paragraph_spacing,
                alignment=TA_CENTER
            )
            
        else:
            # Default styles (original implementation)
            title_style = ParagraphStyle(
                'SongTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=12,
                alignment=TA_CENTER,
                textColor=black
            )
            
            author_style = ParagraphStyle(
                'SongAuthor',
                parent=styles['Normal'],
                fontSize=12,
                spaceAfter=16,
                alignment=TA_CENTER,
                textColor=black,
                fontName='Helvetica-Oblique'
            )
            
            chord_style = ParagraphStyle(
                'ChordStyle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=blue,
                fontName='Helvetica-Bold',
                spaceBefore=2,
                spaceAfter=0
            )
            
            lyrics_style = ParagraphStyle(
                'LyricsStyle',
                parent=styles['Normal'],
                fontSize=11,
                textColor=black,
                fontName='Helvetica',
                spaceBefore=0,
                spaceAfter=4
            )
            
            section_style = ParagraphStyle(
                'SectionStyle',
                parent=styles['Normal'],
                fontSize=12,
                textColor=red,
                fontName='Helvetica-Bold',
                spaceBefore=12,
                spaceAfter=6
            )
            
            metadata_style = ParagraphStyle(
                'MetadataStyle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=black,
                spaceBefore=0,
                spaceAfter=12,
                alignment=TA_CENTER
            )
        
        return {
            'title': title_style,
            'author': author_style,
            'chord': chord_style,
            'lyrics': lyrics_style,
            'section': section_style,
            'metadata': metadata_style,
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
        
        # Use template margins if available
        if self.template:
            top_margin = self.template.spacing.top_margin * inch
            bottom_margin = self.template.spacing.bottom_margin * inch
            left_margin = self.template.spacing.left_margin * inch
            right_margin = self.template.spacing.right_margin * inch
        else:
            top_margin = 0.5 * inch
            bottom_margin = 0.5 * inch
            left_margin = 0.75 * inch
            right_margin = 0.75 * inch
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            topMargin=top_margin,
            bottomMargin=bottom_margin,
            leftMargin=left_margin,
            rightMargin=right_margin
        )
        
        story = []
        
        # Parse ChordPro content
        parsed_data = self.parse_chordpro_content(content)
        
        # Use provided title/artist or fallback to parsed values
        song_title = title or parsed_data['title'] or 'Untitled Song'
        song_artist = artist or parsed_data['artist']
        
        # Add header if template specifies it
        if self.template and self.template.header.enabled:
            header_content = self._format_header_footer_content(
                self.template.header.content, song_title, song_artist, parsed_data
            )
            if header_content:
                header_style = ParagraphStyle(
                    'HeaderStyle',
                    parent=self.styles['normal'],
                    fontSize=self.template.header.font.size,
                    textColor=self._hex_to_color(self.template.header.font.color),
                    fontName=self.template.header.font.to_reportlab_font(),
                    alignment=self._get_alignment(self.template.header.alignment),
                    spaceBefore=0,
                    spaceAfter=8
                )
                story.append(Paragraph(header_content, header_style))
        
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
            story.append(Paragraph(" | ".join(metadata_parts), self.styles['metadata']))
            
            # Add extra spacing after metadata
            spacing = self.template.spacing.section_spacing if self.template else 12
            story.append(Spacer(1, spacing))
        
        # Add chord diagrams if enabled
        if self.include_chord_diagrams:
            unique_chords = self._extract_unique_chords(parsed_data)
            chord_diagram_elements = self._create_chord_diagram_section(unique_chords)
            story.extend(chord_diagram_elements)
        
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
            spacing = self.template.spacing.section_spacing if self.template else 12
            story.append(Spacer(1, spacing))
        
        # Add footer if template specifies it
        if self.template and self.template.footer.enabled:
            footer_content = self._format_header_footer_content(
                self.template.footer.content, song_title, song_artist, parsed_data
            )
            if footer_content:
                footer_style = ParagraphStyle(
                    'FooterStyle',
                    parent=self.styles['normal'],
                    fontSize=self.template.footer.font.size,
                    textColor=self._hex_to_color(self.template.footer.font.color),
                    fontName=self.template.footer.font.to_reportlab_font(),
                    alignment=self._get_alignment(self.template.footer.alignment),
                    spaceBefore=16,
                    spaceAfter=0
                )
                story.append(Paragraph(footer_content, footer_style))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _format_header_footer_content(self, template_content: str, title: str, 
                                    artist: str, parsed_data: Dict) -> str:
        """Format header/footer content with placeholders."""
        if not template_content:
            return ''
        
        # Replace placeholders
        content = template_content.replace('{title}', title or '')
        content = content.replace('{artist}', artist or '')
        content = content.replace('{key}', parsed_data.get('key', '') or '')
        content = content.replace('{tempo}', parsed_data.get('tempo', '') or '')
        # Add more placeholders as needed
        
        return content.strip()
    
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
    
    def _extract_unique_chords(self, parsed_data: Dict) -> Set[str]:
        """
        Extract unique chord names from parsed ChordPro data.
        
        Args:
            parsed_data: Parsed ChordPro content
            
        Returns:
            Set of unique chord names
        """
        chords = set()
        
        for section in parsed_data.get('sections', []):
            for line in section.get('lines', []):
                for chord_data in line.get('chords', []):
                    chord_name = chord_data.get('chord', '').strip()
                    if chord_name:
                        # Clean up chord name (remove extra formatting)
                        chord_name = re.sub(r'[^A-G#b/0-9maj\-min\+dim\*sus]+', '', chord_name)
                        if chord_name:
                            chords.add(chord_name)
        
        return chords
    
    def _create_chord_diagram_section(self, chords: Set[str]) -> List:
        """
        Create a chord diagram section for the PDF.
        
        Args:
            chords: Set of unique chord names
            
        Returns:
            List of story elements for the chord diagram section
        """
        if not chords or not self.include_chord_diagrams or not self.chord_diagram_generator:
            return []
        
        elements = []
        
        # Add section title
        section_style = self.styles.get('section', self.styles['normal'])
        elements.append(Paragraph("Chord Diagrams", section_style))
        elements.append(Spacer(1, 6))
        
        # Create chord diagrams in a table format (3 columns)
        diagrams_per_row = 3
        chord_list = sorted(list(chords))
        
        from .chord_diagram_pdf import COMMON_CHORDS
        
        # Create table data with chord diagrams
        table_data = []
        current_row = []
        
        for i, chord_name in enumerate(chord_list):
            # Try to get chord definition from common chords
            chord_def = COMMON_CHORDS.get(self.diagram_instrument, {}).get(chord_name)
            
            if chord_def:
                # Create chord diagram
                diagram = self.chord_diagram_generator.generate_chord_diagram_pdf_element(
                    chord_def, chord_name, self.diagram_instrument
                )
                
                if diagram:
                    current_row.append(diagram)
                else:
                    # Fallback: just add chord name as text
                    current_row.append(Paragraph(chord_name, self.styles['normal']))
            else:
                # Add chord name as text if no diagram available
                current_row.append(Paragraph(chord_name, self.styles['normal']))
            
            # Complete row when we have enough diagrams or reached end
            if len(current_row) == diagrams_per_row or i == len(chord_list) - 1:
                # Pad row if necessary
                while len(current_row) < diagrams_per_row:
                    current_row.append("")
                
                table_data.append(current_row[:])
                current_row = []
        
        if table_data:
            # Create table with chord diagrams
            col_width = (self.page_size[0] - 2 * inch) / diagrams_per_row
            table = Table(table_data, colWidths=[col_width] * diagrams_per_row)
            
            table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('SPACING', (0, 0), (-1, -1), 6),
            ]))
            
            elements.append(KeepTogether(table))
            elements.append(Spacer(1, 12))
        
        return elements


def generate_song_pdf(content: str, title: str = None, artist: str = None, 
                     paper_size: str = 'a4', orientation: str = 'portrait',
                     template_name: str = None, include_chord_diagrams: bool = False,
                     diagram_instrument: str = 'guitar') -> bytes:
    """
    Convenience function to generate PDF for a song.
    
    Args:
        content: ChordPro formatted content
        title: Song title (optional)
        artist: Song artist (optional)
        paper_size: Paper size ('letter', 'a4', 'legal')
        orientation: Orientation ('portrait' or 'landscape')
        template_name: Name of template to use (optional)
        include_chord_diagrams: Whether to include chord diagrams
        diagram_instrument: Instrument for chord diagrams ('guitar', 'ukulele')
        
    Returns:
        PDF content as bytes
    """
    generator = ChordProPDFGenerator(
        paper_size=paper_size, 
        orientation=orientation,
        template_name=template_name,
        include_chord_diagrams=include_chord_diagrams,
        diagram_instrument=diagram_instrument
    )
    return generator.generate_pdf(content, title=title, artist=artist)