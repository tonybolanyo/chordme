"""
Chord diagram generation for PDF documents.
Converts chord definitions to visual diagrams embedded in PDF output.
"""

from typing import Dict, List, Optional, Tuple
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing, Group, Line, Circle, String
from reportlab.lib.units import inch
from reportlab.lib.colors import black, white, Color
from reportlab.graphics.charts.textlabels import Label
import re
import json
from dataclasses import dataclass


@dataclass
class ChordPosition:
    """Represents a finger position on a chord diagram."""
    string: int  # String number (1-6 for guitar, 1-4 for ukulele)
    fret: int    # Fret number (0 = open, -1 = muted)
    finger: int  # Finger number (0 = open, 1-4 = fingers, -1 = muted)


@dataclass
class ChordDiagram:
    """Represents a complete chord diagram."""
    name: str
    instrument: str = 'guitar'
    positions: List[ChordPosition] = None
    barre: Optional[Tuple[int, int, int]] = None  # (fret, start_string, end_string)
    difficulty: str = 'beginner'
    
    def __post_init__(self):
        if self.positions is None:
            self.positions = []


class ChordDiagramGenerator:
    """Generates chord diagrams for PDF documents."""
    
    # Standard configurations for different instruments
    INSTRUMENT_CONFIG = {
        'guitar': {
            'strings': 6,
            'frets': 5,  # Usually show first 5 frets
            'string_names': ['E', 'A', 'D', 'G', 'B', 'E'],
            'tuning': ['E', 'A', 'D', 'G', 'B', 'E']
        },
        'ukulele': {
            'strings': 4,
            'frets': 4,
            'string_names': ['G', 'C', 'E', 'A'],
            'tuning': ['G', 'C', 'E', 'A']
        }
    }
    
    def __init__(self, width: float = 1.2 * inch, height: float = 1.5 * inch):
        """
        Initialize chord diagram generator.
        
        Args:
            width: Width of the chord diagram in points
            height: Height of the chord diagram in points
        """
        self.width = width
        self.height = height
        self.margin = 0.1 * inch
        
    def parse_chord_definition(self, definition: str, instrument: str = 'guitar') -> Optional[ChordDiagram]:
        """
        Parse chord definition string into ChordDiagram object.
        
        Supports formats:
        - Simple fret notation: "x32010" (for Am)
        - JSON format: {"positions": [{"string": 1, "fret": 3, "finger": 3}], ...}
        
        Args:
            definition: String representation of chord
            instrument: Instrument type ('guitar', 'ukulele')
            
        Returns:
            ChordDiagram object or None if parsing fails
        """
        if not definition:
            return None
            
        try:
            # Try JSON format first
            if definition.strip().startswith('{'):
                data = json.loads(definition)
                positions = []
                for pos in data.get('positions', []):
                    positions.append(ChordPosition(
                        string=pos['string'],
                        fret=pos['fret'],
                        finger=pos.get('finger', 0)
                    ))
                
                barre = data.get('barre')
                if barre:
                    barre = (barre['fret'], barre['start_string'], barre['end_string'])
                
                return ChordDiagram(
                    name=data.get('name', 'Unknown'),
                    instrument=instrument,
                    positions=positions,
                    barre=barre,
                    difficulty=data.get('difficulty', 'beginner')
                )
            
            # Try simple fret notation (e.g., "x32010" for Am)
            elif re.match(r'^[x0-9]+$', definition):
                config = self.INSTRUMENT_CONFIG.get(instrument, self.INSTRUMENT_CONFIG['guitar'])
                positions = []
                
                for i, char in enumerate(definition):
                    if i >= config['strings']:
                        break
                        
                    string_num = i + 1
                    if char == 'x':
                        # Muted string
                        positions.append(ChordPosition(string_num, -1, -1))
                    else:
                        fret = int(char)
                        finger = fret if fret > 0 else 0
                        positions.append(ChordPosition(string_num, fret, finger))
                
                return ChordDiagram(
                    name='Unknown',
                    instrument=instrument,
                    positions=positions
                )
                
        except (json.JSONDecodeError, ValueError, KeyError):
            pass
            
        return None
    
    def create_diagram_drawing(self, chord: ChordDiagram) -> Drawing:
        """
        Create a ReportLab Drawing object for the chord diagram.
        
        Args:
            chord: ChordDiagram object
            
        Returns:
            ReportLab Drawing object
        """
        drawing = Drawing(self.width, self.height)
        
        config = self.INSTRUMENT_CONFIG.get(chord.instrument, self.INSTRUMENT_CONFIG['guitar'])
        num_strings = config['strings']
        num_frets = config['frets']
        
        # Calculate dimensions
        inner_width = self.width - 2 * self.margin
        inner_height = self.height - 2 * self.margin
        string_spacing = inner_width / (num_strings - 1)
        fret_spacing = inner_height / (num_frets + 1)
        
        # Create diagram group
        diagram = Group()
        
        # Draw strings (vertical lines)
        for i in range(num_strings):
            x = self.margin + i * string_spacing
            line = Line(x, self.margin, x, self.height - self.margin)
            line.strokeColor = black
            line.strokeWidth = 1
            diagram.add(line)
        
        # Draw frets (horizontal lines)
        for i in range(num_frets + 1):
            y = self.height - self.margin - i * fret_spacing
            line = Line(self.margin, y, self.width - self.margin, y)
            line.strokeColor = black
            line.strokeWidth = 2 if i == 0 else 1  # Nut is thicker
            diagram.add(line)
        
        # Draw finger positions
        for pos in chord.positions:
            if pos.string > num_strings or pos.fret < -1:
                continue
                
            x = self.margin + (pos.string - 1) * string_spacing
            
            if pos.fret == -1:
                # Muted string - draw X above nut
                y = self.height - self.margin + 0.15 * inch
                label = Label()
                label.setText('×')
                label.setOrigin(x, y)
                label.fontSize = 8
                label.textAnchor = 'middle'
                diagram.add(label)
            elif pos.fret == 0:
                # Open string - draw O above nut
                y = self.height - self.margin + 0.15 * inch
                circle = Circle(x, y, 0.05 * inch)
                circle.fillColor = white
                circle.strokeColor = black
                circle.strokeWidth = 1
                diagram.add(circle)
            else:
                # Fretted note - draw filled circle
                y = self.height - self.margin - (pos.fret - 0.5) * fret_spacing
                circle = Circle(x, y, 0.08 * inch)
                circle.fillColor = black
                circle.strokeColor = black
                diagram.add(circle)
                
                # Add finger number if specified
                if pos.finger > 0:
                    label = Label()
                    label.setText(str(pos.finger))
                    label.setOrigin(x, y)
                    label.fontSize = 6
                    label.textAnchor = 'middle'
                    label.fontName = 'Helvetica-Bold'
                    label.fillColor = white
                    diagram.add(label)
        
        # Draw barre if present
        if chord.barre:
            fret, start_string, end_string = chord.barre
            if fret > 0 and start_string <= end_string:
                x1 = self.margin + (start_string - 1) * string_spacing
                x2 = self.margin + (end_string - 1) * string_spacing
                y = self.height - self.margin - (fret - 0.5) * fret_spacing
                
                # Draw barre line
                line = Line(x1, y, x2, y)
                line.strokeColor = black
                line.strokeWidth = 4
                diagram.add(line)
        
        drawing.add(diagram)
        
        # Add chord name below diagram
        if chord.name and chord.name != 'Unknown':
            label = Label()
            label.setText(chord.name)
            label.setOrigin(self.width / 2, 0.05 * inch)
            label.fontSize = 10
            label.textAnchor = 'middle'
            label.fontName = 'Helvetica-Bold'
            drawing.add(label)
        
        return drawing
    
    def generate_chord_diagram_pdf_element(self, chord_definition: str, chord_name: str = None, 
                                         instrument: str = 'guitar') -> Optional[Drawing]:
        """
        Generate a PDF-embeddable chord diagram from a chord definition.
        
        Args:
            chord_definition: String representation of the chord
            chord_name: Name of the chord (optional)
            instrument: Instrument type
            
        Returns:
            ReportLab Drawing object or None if generation fails
        """
        chord = self.parse_chord_definition(chord_definition, instrument)
        if not chord:
            return None
            
        if chord_name:
            chord.name = chord_name
            
        return self.create_diagram_drawing(chord)


def create_chord_diagram_for_pdf(chord_definition: str, chord_name: str = None, 
                               instrument: str = 'guitar', 
                               width: float = 1.2 * inch, height: float = 1.5 * inch) -> Optional[Drawing]:
    """
    Convenience function to create a chord diagram for PDF embedding.
    
    Args:
        chord_definition: String representation of the chord
        chord_name: Name of the chord
        instrument: Instrument type ('guitar', 'ukulele')
        width: Diagram width in points
        height: Diagram height in points
        
    Returns:
        ReportLab Drawing object or None if creation fails
    """
    generator = ChordDiagramGenerator(width, height)
    return generator.generate_chord_diagram_pdf_element(chord_definition, chord_name, instrument)


# Common chord definitions for testing
COMMON_CHORDS = {
    'guitar': {
        'C': 'x32010',
        'D': 'xx0232',
        'E': '022100',
        'F': '133211',
        'G': '320003',
        'A': 'x02220',
        'Am': 'x02210',
        'Em': '022000',
        'Dm': 'xx0231'
    },
    'ukulele': {
        'C': '0003',
        'F': '2010',
        'G': '0232',
        'Am': '2000'
    }
}