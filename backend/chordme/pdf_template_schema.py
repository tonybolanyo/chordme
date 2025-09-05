"""
PDF Template Configuration Schema.
Defines the structure and validation for PDF template configurations.
"""

from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
import json


@dataclass
class FontConfig:
    """Configuration for font settings."""
    family: str = 'Helvetica'
    size: int = 12
    bold: bool = False
    italic: bool = False
    color: str = '#000000'  # Hex color code
    
    def to_reportlab_font(self) -> str:
        """Convert to ReportLab font name."""
        # Handle specific font families that already include style in name
        if any(style in self.family.lower() for style in ['-bold', '-italic', '-oblique']):
            return self.family
        
        base_name = self.family
        if self.bold and self.italic:
            return f"{base_name}-BoldOblique"
        elif self.bold:
            return f"{base_name}-Bold"
        elif self.italic:
            return f"{base_name}-Oblique"
        return base_name


@dataclass
class SpacingConfig:
    """Configuration for spacing and margins."""
    top_margin: float = 0.5  # inches
    bottom_margin: float = 0.5
    left_margin: float = 0.75
    right_margin: float = 0.75
    line_spacing: float = 1.2  # multiplier
    paragraph_spacing: int = 6  # points
    section_spacing: int = 12  # points


@dataclass
class ColorScheme:
    """Configuration for color scheme."""
    title: str = '#000000'
    artist: str = '#333333'
    metadata: str = '#666666'
    section_headers: str = '#8B0000'  # dark red
    chords: str = '#0066CC'  # blue
    lyrics: str = '#000000'
    background: str = '#FFFFFF'
    accent: str = '#CCCCCC'


@dataclass
class HeaderFooterConfig:
    """Configuration for headers and footers."""
    enabled: bool = False
    content: str = ''  # Template string with placeholders
    font: FontConfig = None
    alignment: str = 'center'  # left, center, right
    margin: float = 0.25  # inches from edge
    
    def __post_init__(self):
        if self.font is None:
            self.font = FontConfig(family='Helvetica', size=10, color='#666666')


@dataclass
class WatermarkConfig:
    """Configuration for watermarks."""
    enabled: bool = False
    text: str = ''
    font: FontConfig = None
    opacity: float = 0.1  # 0.0 to 1.0
    rotation: int = 45  # degrees
    position: str = 'center'  # center, top-left, top-right, bottom-left, bottom-right
    
    def __post_init__(self):
        if self.font is None:
            self.font = FontConfig(family='Helvetica', size=72, color='#CCCCCC')


@dataclass
class LogoConfig:
    """Configuration for logo placement."""
    enabled: bool = False
    path: str = ''  # Path to logo image
    position: str = 'top-right'  # top-left, top-right, bottom-left, bottom-right
    width: float = 1.0  # inches
    height: float = 1.0  # inches
    margin: float = 0.25  # inches from edges


@dataclass
class PageConfig:
    """Configuration for page settings."""
    size: str = 'a4'  # a4, letter, legal
    orientation: str = 'portrait'  # portrait, landscape
    numbering: bool = False
    numbering_format: str = 'Page {page} of {total}'
    numbering_position: str = 'bottom-center'  # bottom-left, bottom-center, bottom-right


@dataclass
class StyleConfig:
    """Configuration for text styles."""
    title: FontConfig = None
    artist: FontConfig = None
    metadata: FontConfig = None
    section_headers: FontConfig = None
    chords: FontConfig = None
    lyrics: FontConfig = None
    
    def __post_init__(self):
        if self.title is None:
            self.title = FontConfig(family='Helvetica', size=18, bold=True)
        if self.artist is None:
            self.artist = FontConfig(family='Helvetica', size=12, italic=True)
        if self.metadata is None:
            self.metadata = FontConfig(family='Helvetica', size=10, color='#666666')
        if self.section_headers is None:
            self.section_headers = FontConfig(family='Helvetica', size=12, bold=True, color='#8B0000')
        if self.chords is None:
            self.chords = FontConfig(family='Helvetica', size=10, bold=True, color='#0066CC')
        if self.lyrics is None:
            self.lyrics = FontConfig(family='Helvetica', size=11)


@dataclass
class PDFTemplateConfig:
    """Complete PDF template configuration."""
    name: str
    description: str = ''
    version: str = '1.0'
    author: str = ''
    
    # Core configuration sections
    page: PageConfig = None
    spacing: SpacingConfig = None
    colors: ColorScheme = None
    styles: StyleConfig = None
    header: HeaderFooterConfig = None
    footer: HeaderFooterConfig = None
    watermark: WatermarkConfig = None
    logo: LogoConfig = None
    
    # Advanced options
    chord_position_adjustment: float = 0.0  # Fine-tune chord positioning
    auto_page_breaks: bool = True
    optimize_spacing: bool = True
    preserve_blank_lines: bool = True
    
    def __post_init__(self):
        """Initialize default configurations if not provided."""
        if self.page is None:
            self.page = PageConfig()
        if self.spacing is None:
            self.spacing = SpacingConfig()
        if self.colors is None:
            self.colors = ColorScheme()
        if self.styles is None:
            self.styles = StyleConfig()
        if self.header is None:
            self.header = HeaderFooterConfig()
        if self.footer is None:
            self.footer = HeaderFooterConfig()
        if self.watermark is None:
            self.watermark = WatermarkConfig()
        if self.logo is None:
            self.logo = LogoConfig()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert template configuration to dictionary."""
        def dataclass_to_dict(obj):
            if hasattr(obj, '__dataclass_fields__'):
                return {k: dataclass_to_dict(v) for k, v in obj.__dict__.items()}
            elif isinstance(obj, (list, tuple)):
                return [dataclass_to_dict(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: dataclass_to_dict(v) for k, v in obj.items()}
            else:
                return obj
        
        return dataclass_to_dict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PDFTemplateConfig':
        """Create template configuration from dictionary."""
        def dict_to_dataclass(target_class, data_dict):
            if not isinstance(data_dict, dict):
                return data_dict
            
            field_types = target_class.__annotations__ if hasattr(target_class, '__annotations__') else {}
            kwargs = {}
            
            for field_name, field_value in data_dict.items():
                if field_name in field_types:
                    field_type = field_types[field_name]
                    # Handle Optional types
                    if hasattr(field_type, '__origin__') and field_type.__origin__ is Union:
                        field_type = field_type.__args__[0]
                    
                    if hasattr(field_type, '__dataclass_fields__'):
                        kwargs[field_name] = dict_to_dataclass(field_type, field_value)
                    else:
                        kwargs[field_name] = field_value
                else:
                    kwargs[field_name] = field_value
            
            return target_class(**kwargs)
        
        return dict_to_dataclass(cls, data)
    
    def to_json(self) -> str:
        """Convert template configuration to JSON string."""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'PDFTemplateConfig':
        """Create template configuration from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def validate(self) -> List[str]:
        """Validate template configuration and return list of errors."""
        errors = []
        
        # Validate page size
        valid_page_sizes = ['a4', 'letter', 'legal']
        if self.page.size.lower() not in valid_page_sizes:
            errors.append(f"Invalid page size: {self.page.size}. Must be one of {valid_page_sizes}")
        
        # Validate page orientation
        valid_orientations = ['portrait', 'landscape']
        if self.page.orientation.lower() not in valid_orientations:
            errors.append(f"Invalid page orientation: {self.page.orientation}. Must be one of {valid_orientations}")
        
        # Validate colors (hex format)
        color_fields = [
            ('title color', self.colors.title),
            ('artist color', self.colors.artist),
            ('metadata color', self.colors.metadata),
            ('section headers color', self.colors.section_headers),
            ('chords color', self.colors.chords),
            ('lyrics color', self.colors.lyrics),
            ('background color', self.colors.background),
            ('accent color', self.colors.accent),
        ]
        
        for field_name, color_value in color_fields:
            if not self._is_valid_hex_color(color_value):
                errors.append(f"Invalid {field_name}: {color_value}. Must be a valid hex color code (e.g., #FF0000)")
        
        # Validate margins (must be positive)
        margin_fields = [
            ('top margin', self.spacing.top_margin),
            ('bottom margin', self.spacing.bottom_margin),
            ('left margin', self.spacing.left_margin),
            ('right margin', self.spacing.right_margin),
        ]
        
        for field_name, margin_value in margin_fields:
            if margin_value < 0:
                errors.append(f"Invalid {field_name}: {margin_value}. Must be positive")
        
        # Validate font sizes (must be positive)
        font_configs = [
            ('title font', self.styles.title),
            ('artist font', self.styles.artist),
            ('metadata font', self.styles.metadata),
            ('section headers font', self.styles.section_headers),
            ('chords font', self.styles.chords),
            ('lyrics font', self.styles.lyrics),
        ]
        
        for field_name, font_config in font_configs:
            if font_config.size <= 0:
                errors.append(f"Invalid {field_name} size: {font_config.size}. Must be positive")
        
        # Validate watermark opacity
        if not 0.0 <= self.watermark.opacity <= 1.0:
            errors.append(f"Invalid watermark opacity: {self.watermark.opacity}. Must be between 0.0 and 1.0")
        
        return errors
    
    def _is_valid_hex_color(self, color: str) -> bool:
        """Check if color is a valid hex color code."""
        if not isinstance(color, str):
            return False
        
        if not color.startswith('#'):
            return False
        
        if len(color) not in [4, 7]:  # #RGB or #RRGGBB
            return False
        
        try:
            int(color[1:], 16)
            return True
        except ValueError:
            return False


# Helper functions for creating common configurations
def create_font_config(family: str = 'Helvetica', size: int = 12, 
                      bold: bool = False, italic: bool = False, 
                      color: str = '#000000') -> FontConfig:
    """Helper function to create font configuration."""
    return FontConfig(
        family=family,
        size=size,
        bold=bold,
        italic=italic,
        color=color
    )


def create_spacing_config(top: float = 0.5, bottom: float = 0.5,
                         left: float = 0.75, right: float = 0.75,
                         line_spacing: float = 1.2, paragraph: int = 6,
                         section: int = 12) -> SpacingConfig:
    """Helper function to create spacing configuration."""
    return SpacingConfig(
        top_margin=top,
        bottom_margin=bottom,
        left_margin=left,
        right_margin=right,
        line_spacing=line_spacing,
        paragraph_spacing=paragraph,
        section_spacing=section
    )


def create_color_scheme(title: str = '#000000', artist: str = '#333333',
                       metadata: str = '#666666', sections: str = '#8B0000',
                       chords: str = '#0066CC', lyrics: str = '#000000',
                       background: str = '#FFFFFF', accent: str = '#CCCCCC') -> ColorScheme:
    """Helper function to create color scheme."""
    return ColorScheme(
        title=title,
        artist=artist,
        metadata=metadata,
        section_headers=sections,
        chords=chords,
        lyrics=lyrics,
        background=background,
        accent=accent
    )