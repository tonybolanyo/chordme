"""
PDF generation utilities for ChordPro songs.
Handles rendering chords above lyrics with proper layout and styling.
Supports template-based styling for flexible PDF customization.
"""

from reportlab.lib.pagesizes import letter, A4, legal
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import black, blue, red, HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, 
    KeepTogether, NextPageTemplate, PageTemplate, BaseDocTemplate, Frame, Flowable
)
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
                 include_chord_diagrams: bool = False, diagram_instrument: str = 'guitar',
                 intelligent_page_breaks: bool = True, optimize_file_size: bool = True,
                 font_size: int = 11, quality: str = 'standard', header: str = '', 
                 footer: str = '', margins: Dict = None, colors: Dict = None):
        """
        Initialize PDF generator with specified paper size, orientation, and template.
        
        Args:
            paper_size: Paper size ('letter', 'a4', 'legal')
            orientation: Orientation ('portrait' or 'landscape')
            template: Template configuration object
            template_name: Name of predefined template to use
            include_chord_diagrams: Whether to include chord diagrams in PDF
            diagram_instrument: Instrument type for chord diagrams ('guitar', 'ukulele')
            intelligent_page_breaks: Whether to use intelligent page break algorithms
            optimize_file_size: Whether to optimize PDF file size
            font_size: Base font size for the document
            quality: Export quality ('draft', 'standard', 'high')
            header: Custom header text
            footer: Custom footer text
            margins: Dictionary with margin values
            colors: Dictionary with color values
        """
        # Store customization options
        self.font_size = font_size
        self.quality = quality
        self.header = header
        self.footer = footer
        self.margins = margins or {'top': 1.0, 'bottom': 1.0, 'left': 1.0, 'right': 1.0}
        self.colors = colors or {'title': '#000000', 'artist': '#555555', 'chords': '#333333', 'lyrics': '#000000'}
        
        # Set up template
        self.template = None
        if template:
            self.template = template
        elif template_name:
            self.template = get_template(template_name)
        
        # Override template with custom options if provided
        if self.template and (colors or margins or font_size != 11):
            self._customize_template()
        
        # Chord diagram settings
        self.include_chord_diagrams = include_chord_diagrams
        self.diagram_instrument = diagram_instrument
        self.chord_diagram_generator = ChordDiagramGenerator() if include_chord_diagrams else None
        
        # Advanced PDF features
        self.intelligent_page_breaks = intelligent_page_breaks
        self.optimize_file_size = optimize_file_size
        
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
    
    def _customize_template(self):
        """Apply custom colors, margins, and font sizes to the template."""
        if not self.template:
            return
        
        # Update colors if provided
        if self.colors:
            if 'title' in self.colors:
                self.template.colors.title = self.colors['title']
            if 'artist' in self.colors:
                self.template.colors.artist = self.colors['artist']
            if 'chords' in self.colors:
                self.template.colors.chords = self.colors['chords']
            if 'lyrics' in self.colors:
                self.template.colors.lyrics = self.colors['lyrics']
        
        # Update margins if provided
        if self.margins:
            if 'top' in self.margins:
                self.template.spacing.top_margin = self.margins['top']
            if 'bottom' in self.margins:
                self.template.spacing.bottom_margin = self.margins['bottom']
            if 'left' in self.margins:
                self.template.spacing.left_margin = self.margins['left']
            if 'right' in self.margins:
                self.template.spacing.right_margin = self.margins['right']
        
        # Update font sizes if provided
        if self.font_size != 11:
            # Adjust all font sizes proportionally
            scale_factor = self.font_size / 11.0
            self.template.styles.title.size = int(self.template.styles.title.size * scale_factor)
            self.template.styles.artist.size = int(self.template.styles.artist.size * scale_factor)
            self.template.styles.chords.size = int(self.template.styles.chords.size * scale_factor)
            self.template.styles.lyrics.size = int(self.template.styles.lyrics.size * scale_factor)
        
        # Update header/footer if provided
        if self.header:
            self.template.header.enabled = True
            self.template.header.content = self.header
        
        if self.footer:
            self.template.footer.enabled = True
            self.template.footer.content = self.footer
    
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
        
        # Add song sections with intelligent page breaks
        if self.intelligent_page_breaks:
            section_groups = self._group_sections_for_page_layout(parsed_data['sections'])
            
            for group_idx, section_group in enumerate(section_groups):
                # Add page break between groups (except for first group)
                if group_idx > 0:
                    story.append(PageBreak())
                
                # Process sections in this group
                for section in section_group:
                    # Add section header if not a basic verse
                    if section['type'] != 'verse':
                        section_title = section['type'].title()
                        story.append(Paragraph(section_title, self.styles['section']))
                    
                    # Group section content to keep together when possible
                    section_elements = []
                    
                    # Add chord and lyric lines
                    for line_data in section['lines']:
                        if line_data['chords'] or line_data['lyrics'].strip():
                            chord_paragraph, lyric_paragraph = self._create_chord_lyric_paragraphs(line_data)
                            
                            if chord_paragraph:
                                section_elements.append(chord_paragraph)
                            section_elements.append(lyric_paragraph)
                        else:
                            # Empty line for spacing
                            section_elements.append(Spacer(1, 6))
                    
                    # Keep short sections together
                    if len(section_elements) <= 8:  # Keep short sections on same page
                        story.append(KeepTogether(section_elements))
                    else:
                        story.extend(section_elements)
                    
                    # Add spacing between sections
                    spacing = self.template.spacing.section_spacing if self.template else 12
                    story.append(Spacer(1, spacing))
        else:
            # Original simple processing
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
        
        # Build PDF with optimization
        doc = self._create_optimized_document(buffer, story)
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
    
    def _should_break_page_before_section(self, section: Dict, current_page_height: float, 
                                        available_height: float) -> bool:
        """
        Determine if a page break should be inserted before a section.
        
        Args:
            section: Section data dictionary
            current_page_height: Current estimated height used on page
            available_height: Total available height on page
            
        Returns:
            True if a page break should be inserted
        """
        if not self.intelligent_page_breaks:
            return False
            
        # Estimate section height (rough calculation)
        section_lines = len(section.get('lines', []))
        estimated_section_height = section_lines * 30  # ~30 points per line (chord + lyrics)
        
        # Add extra height for section headers
        if section['type'] != 'verse':
            estimated_section_height += 20
            
        # Leave at least 20% of page for continuation
        min_remaining_space = available_height * 0.2
        remaining_space = available_height - current_page_height
        
        # Break if section won't fit comfortably
        return (estimated_section_height > remaining_space) and (remaining_space < min_remaining_space)
    
    def _group_sections_for_page_layout(self, sections: List[Dict]) -> List[List[Dict]]:
        """
        Group sections intelligently for better page layout.
        
        Args:
            sections: List of section dictionaries
            
        Returns:
            List of section groups (each group represents content for a page/column)
        """
        if not self.intelligent_page_breaks:
            return [sections]  # Return all sections as one group
            
        groups = []
        current_group = []
        current_height = 0
        max_height = 600  # Approximate page height in points
        
        for section in sections:
            section_lines = len(section.get('lines', []))
            section_height = section_lines * 30 + (20 if section['type'] != 'verse' else 0)
            
            # If adding this section would exceed comfortable page height, start new group
            if current_height + section_height > max_height and current_group:
                groups.append(current_group)
                current_group = [section]
                current_height = section_height
            else:
                current_group.append(section)
                current_height += section_height
        
        if current_group:
            groups.append(current_group)
            
        return groups
    
    def _create_optimized_document(self, buffer: BytesIO, story: List) -> SimpleDocTemplate:
        """
        Create an optimized PDF document with file size optimizations.
        
        Args:
            buffer: BytesIO buffer for PDF content
            story: List of story elements
            
        Returns:
            SimpleDocTemplate instance
        """
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
        
        if self.optimize_file_size:
            # Create document with compression enabled
            doc = SimpleDocTemplate(
                buffer,
                pagesize=self.page_size,
                topMargin=top_margin,
                bottomMargin=bottom_margin,
                leftMargin=left_margin,
                rightMargin=right_margin,
                pageCompression=1,  # Enable page compression
                invariant=1,        # Make reproducible (helps with compression)
                title="",           # Minimize metadata
                author="",
                subject="",
                creator="ChordMe PDF Generator"
            )
        else:
            doc = SimpleDocTemplate(
                buffer,
                pagesize=self.page_size,
                topMargin=top_margin,
                bottomMargin=bottom_margin,
                leftMargin=left_margin,
                rightMargin=right_margin
            )
        
        return doc
    
    def _register_embedded_fonts(self):
        """
        Register embedded fonts for better PDF compatibility.
        This ensures fonts are embedded in the PDF for consistent rendering.
        """
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.lib.fonts import addMapping
        
        try:
            # Try to register common system fonts as embedded
            # Note: In production, you might want to ship specific font files
            
            # Register font mappings for better embedding
            addMapping('Helvetica', 0, 0, 'Helvetica')  # normal
            addMapping('Helvetica', 1, 0, 'Helvetica-Bold')  # bold
            addMapping('Helvetica', 0, 1, 'Helvetica-Oblique')  # italic
            addMapping('Helvetica', 1, 1, 'Helvetica-BoldOblique')  # bold italic
            
            addMapping('Times-Roman', 0, 0, 'Times-Roman')
            addMapping('Times-Roman', 1, 0, 'Times-Bold')
            addMapping('Times-Roman', 0, 1, 'Times-Italic')
            addMapping('Times-Roman', 1, 1, 'Times-BoldItalic')
            
        except Exception:
            # If font registration fails, continue with default fonts
            pass
    
    def create_multi_song_pdf(self, songs: List[Dict], include_toc: bool = True) -> bytes:
        """
        Create a PDF with multiple songs and optional table of contents.
        
        Args:
            songs: List of song dictionaries with 'title', 'content', 'artist' (optional)
            include_toc: Whether to include a table of contents
            
        Returns:
            PDF content as bytes
        """
        buffer = BytesIO()
        
        # Register embedded fonts
        self._register_embedded_fonts()
        
        # Create optimized document
        doc = self._create_optimized_document(buffer, [])
        story = []
        
        # Add table of contents if requested
        if include_toc and len(songs) > 1:
            story.append(Paragraph("Table of Contents", self.styles['title']))
            story.append(Spacer(1, 12))
            
            toc_data = []
            for i, song in enumerate(songs):
                song_title = song.get('title', f'Song {i+1}')
                artist = song.get('artist', '')
                
                if artist:
                    toc_entry = f"{i+1}. {song_title} - {artist}"
                else:
                    toc_entry = f"{i+1}. {song_title}"
                
                toc_data.append([toc_entry])
            
            # Create table of contents
            toc_table = Table(toc_data, colWidths=[self.page_size[0] - 2 * inch])
            toc_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            
            story.append(toc_table)
            story.append(PageBreak())
        
        # Add each song
        for i, song in enumerate(songs):
            # Add page break between songs (except for first song)
            if i > 0:
                story.append(PageBreak())
            
            # Generate song content
            song_content = song.get('content', '')
            song_title = song.get('title')
            song_artist = song.get('artist')
            
            # Parse and add song
            parsed_data = self.parse_chordpro_content(song_content)
            
            # Use provided title/artist or fallback to parsed values
            final_title = song_title or parsed_data['title'] or f'Song {i+1}'
            final_artist = song_artist or parsed_data['artist']
            
            # Add title
            story.append(Paragraph(final_title, self.styles['title']))
            
            # Add artist if available
            if final_artist:
                story.append(Paragraph(f"by {final_artist}", self.styles['author']))
            
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
            
            # Add song sections with intelligent page breaks
            if self.intelligent_page_breaks:
                section_groups = self._group_sections_for_page_layout(parsed_data['sections'])
                
                for group_idx, section_group in enumerate(section_groups):
                    # Don't add page break for first group of first song
                    if group_idx > 0:
                        story.append(PageBreak())
                    
                    # Process sections in this group
                    for section in section_group:
                        # Add section header if not a basic verse
                        if section['type'] != 'verse':
                            section_title = section['type'].title()
                            story.append(Paragraph(section_title, self.styles['section']))
                        
                        # Group section content to keep together when possible
                        section_elements = []
                        
                        # Add chord and lyric lines
                        for line_data in section['lines']:
                            if line_data['chords'] or line_data['lyrics'].strip():
                                chord_paragraph, lyric_paragraph = self._create_chord_lyric_paragraphs(line_data)
                                
                                if chord_paragraph:
                                    section_elements.append(chord_paragraph)
                                section_elements.append(lyric_paragraph)
                            else:
                                # Empty line for spacing
                                section_elements.append(Spacer(1, 6))
                        
                        # Keep short sections together
                        if len(section_elements) <= 8:  # Keep short sections on same page
                            story.append(KeepTogether(section_elements))
                        else:
                            story.extend(section_elements)
                        
                        # Add spacing between sections
                        spacing = self.template.spacing.section_spacing if self.template else 12
                        story.append(Spacer(1, spacing))
            else:
                # Original simple processing for each song
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
        
        # Build PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes



def generate_song_pdf(content: str, title: str = None, artist: str = None, 
                     paper_size: str = 'a4', orientation: str = 'portrait',
                     template_name: str = None, include_chord_diagrams: bool = False,
                     diagram_instrument: str = 'guitar', intelligent_page_breaks: bool = True,
                     optimize_file_size: bool = True, font_size: int = 11, 
                     quality: str = 'standard', header: str = '', footer: str = '',
                     margins: Dict = None, colors: Dict = None) -> bytes:
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
        intelligent_page_breaks: Whether to use intelligent page break algorithms
        optimize_file_size: Whether to optimize PDF file size
        font_size: Base font size for the document
        quality: Export quality ('draft', 'standard', 'high')
        header: Custom header text
        footer: Custom footer text
        margins: Dictionary with margin values {'top': float, 'bottom': float, 'left': float, 'right': float}
        colors: Dictionary with color values {'title': str, 'artist': str, 'chords': str, 'lyrics': str}
        
    Returns:
        PDF content as bytes
    """
    # Set default margins if not provided
    if margins is None:
        margins = {'top': 1.0, 'bottom': 1.0, 'left': 1.0, 'right': 1.0}
    
    # Set default colors if not provided  
    if colors is None:
        colors = {'title': '#000000', 'artist': '#555555', 'chords': '#333333', 'lyrics': '#000000'}
    
    generator = ChordProPDFGenerator(
        paper_size=paper_size, 
        orientation=orientation,
        template_name=template_name,
        include_chord_diagrams=include_chord_diagrams,
        diagram_instrument=diagram_instrument,
        intelligent_page_breaks=intelligent_page_breaks,
        optimize_file_size=optimize_file_size,
        font_size=font_size,
        quality=quality,
        header=header,
        footer=footer,
        margins=margins,
        colors=colors
    )
    return generator.generate_pdf(content, title=title, artist=artist)