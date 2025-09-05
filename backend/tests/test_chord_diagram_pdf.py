"""
Unit tests for chord diagram PDF generation functionality.
"""

import pytest
from chordme.chord_diagram_pdf import (
    ChordDiagramGenerator, ChordPosition, ChordDiagram,
    create_chord_diagram_for_pdf, COMMON_CHORDS
)
from reportlab.graphics.shapes import Drawing


class TestChordPosition:
    """Test cases for ChordPosition dataclass."""
    
    def test_chord_position_creation(self):
        """Test creating a chord position."""
        pos = ChordPosition(string=1, fret=3, finger=3)
        assert pos.string == 1
        assert pos.fret == 3
        assert pos.finger == 3
    
    def test_chord_position_open_string(self):
        """Test chord position for open string."""
        pos = ChordPosition(string=6, fret=0, finger=0)
        assert pos.string == 6
        assert pos.fret == 0
        assert pos.finger == 0
    
    def test_chord_position_muted_string(self):
        """Test chord position for muted string."""
        pos = ChordPosition(string=6, fret=-1, finger=-1)
        assert pos.string == 6
        assert pos.fret == -1
        assert pos.finger == -1


class TestChordDiagram:
    """Test cases for ChordDiagram dataclass."""
    
    def test_chord_diagram_creation(self):
        """Test creating a chord diagram."""
        positions = [
            ChordPosition(1, 3, 3),
            ChordPosition(2, 2, 2),
            ChordPosition(3, 0, 0)
        ]
        diagram = ChordDiagram(
            name="C",
            instrument="guitar",
            positions=positions,
            difficulty="beginner"
        )
        assert diagram.name == "C"
        assert diagram.instrument == "guitar"
        assert len(diagram.positions) == 3
        assert diagram.difficulty == "beginner"
    
    def test_chord_diagram_with_barre(self):
        """Test chord diagram with barre chord."""
        positions = [ChordPosition(1, 1, 1)]
        barre = (1, 1, 6)  # First fret, strings 1-6
        diagram = ChordDiagram(
            name="F",
            positions=positions,
            barre=barre
        )
        assert diagram.barre == (1, 1, 6)
    
    def test_chord_diagram_default_positions(self):
        """Test chord diagram with default empty positions."""
        diagram = ChordDiagram(name="Test")
        assert diagram.positions == []
        assert diagram.instrument == "guitar"
        assert diagram.difficulty == "beginner"


class TestChordDiagramGenerator:
    """Test cases for ChordDiagramGenerator class."""
    
    def test_generator_initialization(self):
        """Test generator initialization with default parameters."""
        generator = ChordDiagramGenerator()
        assert generator.width > 0
        assert generator.height > 0
        assert generator.margin > 0
    
    def test_generator_custom_dimensions(self):
        """Test generator with custom dimensions."""
        width = 100
        height = 150
        generator = ChordDiagramGenerator(width=width, height=height)
        assert generator.width == width
        assert generator.height == height
    
    def test_parse_chord_definition_simple_notation(self):
        """Test parsing simple fret notation."""
        generator = ChordDiagramGenerator()
        
        # Test C major chord: x32010
        chord = generator.parse_chord_definition("x32010", "guitar")
        assert chord is not None
        assert chord.instrument == "guitar"
        assert len(chord.positions) == 6
        
        # Check specific positions
        assert chord.positions[0].fret == -1  # Muted string
        assert chord.positions[1].fret == 3   # 3rd fret
        assert chord.positions[2].fret == 2   # 2nd fret
        assert chord.positions[3].fret == 0   # Open string
        assert chord.positions[4].fret == 1   # 1st fret
        assert chord.positions[5].fret == 0   # Open string
    
    def test_parse_chord_definition_json_format(self):
        """Test parsing JSON format chord definition."""
        generator = ChordDiagramGenerator()
        
        json_def = '''
        {
            "name": "Am",
            "positions": [
                {"string": 1, "fret": 0, "finger": 0},
                {"string": 2, "fret": 1, "finger": 1},
                {"string": 3, "fret": 2, "finger": 2}
            ],
            "difficulty": "beginner"
        }
        '''
        
        chord = generator.parse_chord_definition(json_def, "guitar")
        assert chord is not None
        assert chord.name == "Am"
        assert chord.difficulty == "beginner"
        assert len(chord.positions) == 3
        assert chord.positions[0].string == 1
        assert chord.positions[0].fret == 0
        assert chord.positions[1].finger == 1
    
    def test_parse_chord_definition_invalid(self):
        """Test parsing invalid chord definition."""
        generator = ChordDiagramGenerator()
        
        # Test empty definition
        assert generator.parse_chord_definition("", "guitar") is None
        assert generator.parse_chord_definition(None, "guitar") is None
        
        # Test invalid JSON
        assert generator.parse_chord_definition("{invalid json", "guitar") is None
        
        # Test invalid simple notation
        assert generator.parse_chord_definition("invalid", "guitar") is None
    
    def test_create_diagram_drawing(self):
        """Test creating a ReportLab drawing from chord diagram."""
        generator = ChordDiagramGenerator()
        
        positions = [
            ChordPosition(1, 3, 3),
            ChordPosition(2, 2, 2),
            ChordPosition(3, 0, 0),
            ChordPosition(4, 0, 0),
            ChordPosition(5, 1, 1),
            ChordPosition(6, -1, -1)  # Muted
        ]
        
        chord = ChordDiagram(name="C", positions=positions)
        drawing = generator.create_diagram_drawing(chord)
        
        assert isinstance(drawing, Drawing)
        assert drawing.width == generator.width
        assert drawing.height == generator.height
    
    def test_create_diagram_drawing_with_barre(self):
        """Test creating drawing with barre chord."""
        generator = ChordDiagramGenerator()
        
        positions = [ChordPosition(1, 1, 1)]
        barre = (1, 1, 6)
        chord = ChordDiagram(name="F", positions=positions, barre=barre)
        
        drawing = generator.create_diagram_drawing(chord)
        assert isinstance(drawing, Drawing)
    
    def test_generate_chord_diagram_pdf_element(self):
        """Test generating PDF element from chord definition."""
        generator = ChordDiagramGenerator()
        
        drawing = generator.generate_chord_diagram_pdf_element("x32010", "C", "guitar")
        assert isinstance(drawing, Drawing)
        
        # Test with invalid definition
        invalid_drawing = generator.generate_chord_diagram_pdf_element("invalid", "C", "guitar")
        assert invalid_drawing is None


class TestChordDiagramInstruments:
    """Test cases for different instruments."""
    
    def test_guitar_configuration(self):
        """Test guitar instrument configuration."""
        generator = ChordDiagramGenerator()
        config = generator.INSTRUMENT_CONFIG['guitar']
        
        assert config['strings'] == 6
        assert config['frets'] == 5
        assert len(config['string_names']) == 6
        assert config['string_names'] == ['E', 'A', 'D', 'G', 'B', 'E']
    
    def test_ukulele_configuration(self):
        """Test ukulele instrument configuration."""
        generator = ChordDiagramGenerator()
        config = generator.INSTRUMENT_CONFIG['ukulele']
        
        assert config['strings'] == 4
        assert config['frets'] == 4
        assert len(config['string_names']) == 4
        assert config['string_names'] == ['G', 'C', 'E', 'A']
    
    def test_ukulele_chord_parsing(self):
        """Test parsing ukulele chord."""
        generator = ChordDiagramGenerator()
        
        # Test C chord on ukulele: 0003
        chord = generator.parse_chord_definition("0003", "ukulele")
        assert chord is not None
        assert chord.instrument == "ukulele"
        assert len(chord.positions) == 4
        assert chord.positions[3].fret == 3


class TestConvenienceFunction:
    """Test cases for convenience function."""
    
    def test_create_chord_diagram_for_pdf(self):
        """Test convenience function for creating chord diagrams."""
        drawing = create_chord_diagram_for_pdf("x32010", "C", "guitar")
        assert isinstance(drawing, Drawing)
    
    def test_create_chord_diagram_for_pdf_custom_size(self):
        """Test convenience function with custom size."""
        from reportlab.lib.units import inch
        width = 2 * inch
        height = 2.5 * inch
        
        drawing = create_chord_diagram_for_pdf("x32010", "C", "guitar", width, height)
        assert isinstance(drawing, Drawing)
        assert drawing.width == width
        assert drawing.height == height
    
    def test_create_chord_diagram_for_pdf_invalid(self):
        """Test convenience function with invalid input."""
        drawing = create_chord_diagram_for_pdf("invalid", "C", "guitar")
        assert drawing is None


class TestCommonChords:
    """Test cases for common chord definitions."""
    
    def test_common_chords_structure(self):
        """Test that common chords data structure is valid."""
        assert 'guitar' in COMMON_CHORDS
        assert 'ukulele' in COMMON_CHORDS
        
        # Test that guitar chords exist
        guitar_chords = COMMON_CHORDS['guitar']
        assert 'C' in guitar_chords
        assert 'G' in guitar_chords
        assert 'Am' in guitar_chords
        
        # Test that ukulele chords exist
        ukulele_chords = COMMON_CHORDS['ukulele']
        assert 'C' in ukulele_chords
        assert 'F' in ukulele_chords
    
    def test_common_chord_definitions_parseable(self):
        """Test that common chord definitions can be parsed."""
        generator = ChordDiagramGenerator()
        
        # Test guitar chords
        for chord_name, definition in COMMON_CHORDS['guitar'].items():
            chord = generator.parse_chord_definition(definition, 'guitar')
            assert chord is not None, f"Failed to parse {chord_name}: {definition}"
        
        # Test ukulele chords
        for chord_name, definition in COMMON_CHORDS['ukulele'].items():
            chord = generator.parse_chord_definition(definition, 'ukulele')
            assert chord is not None, f"Failed to parse {chord_name}: {definition}"


class TestErrorHandling:
    """Test cases for error handling."""
    
    def test_invalid_string_number(self):
        """Test handling of invalid string numbers."""
        generator = ChordDiagramGenerator()
        
        # Create chord with invalid string numbers
        positions = [ChordPosition(10, 1, 1)]  # String 10 doesn't exist
        chord = ChordDiagram(name="Invalid", positions=positions)
        
        # Should not crash
        drawing = generator.create_diagram_drawing(chord)
        assert isinstance(drawing, Drawing)
    
    def test_invalid_fret_number(self):
        """Test handling of invalid fret numbers."""
        generator = ChordDiagramGenerator()
        
        # Create chord with very high fret number
        positions = [ChordPosition(1, 50, 1)]
        chord = ChordDiagram(name="HighFret", positions=positions)
        
        # Should not crash
        drawing = generator.create_diagram_drawing(chord)
        assert isinstance(drawing, Drawing)
    
    def test_empty_chord_diagram(self):
        """Test handling of empty chord diagram."""
        generator = ChordDiagramGenerator()
        
        chord = ChordDiagram(name="Empty", positions=[])
        drawing = generator.create_diagram_drawing(chord)
        assert isinstance(drawing, Drawing)