"""
PDF Template Management System.
Handles creation, storage, and management of PDF templates.
"""

from typing import Dict, List, Optional
import json
import os
from pathlib import Path

from .pdf_template_schema import (
    PDFTemplateConfig, FontConfig, SpacingConfig, ColorScheme, 
    StyleConfig, PageConfig, HeaderFooterConfig, WatermarkConfig, LogoConfig,
    create_font_config, create_spacing_config, create_color_scheme
)


class PDFTemplateManager:
    """Manages PDF templates including predefined and custom templates."""
    
    def __init__(self, templates_dir: Optional[str] = None):
        """
        Initialize template manager.
        
        Args:
            templates_dir: Directory to store custom templates. If None, uses default.
        """
        self.templates_dir = templates_dir or self._get_default_templates_dir()
        self._templates: Dict[str, PDFTemplateConfig] = {}
        self._load_predefined_templates()
        self._load_custom_templates()
    
    def _get_default_templates_dir(self) -> str:
        """Get default templates directory."""
        current_dir = Path(__file__).parent
        templates_dir = current_dir / 'templates' / 'pdf'
        templates_dir.mkdir(parents=True, exist_ok=True)
        return str(templates_dir)
    
    def _load_predefined_templates(self):
        """Load predefined templates."""
        # Classic template - traditional sheet music appearance
        classic_template = self._create_classic_template()
        self._templates[classic_template.name] = classic_template
        
        # Modern template - clean contemporary design
        modern_template = self._create_modern_template()
        self._templates[modern_template.name] = modern_template
        
        # Minimal template - simplified layout
        minimal_template = self._create_minimal_template()
        self._templates[minimal_template.name] = minimal_template
    
    def _create_classic_template(self) -> PDFTemplateConfig:
        """Create classic template with traditional sheet music styling."""
        return PDFTemplateConfig(
            name='classic',
            description='Traditional sheet music appearance with serif fonts and classic styling',
            version='1.0',
            author='ChordMe',
            page=PageConfig(
                size='a4',
                orientation='portrait',
                numbering=True,
                numbering_format='Page {page}',
                numbering_position='bottom-center'
            ),
            spacing=create_spacing_config(
                top=0.75, bottom=0.75, left=1.0, right=1.0,
                line_spacing=1.3, paragraph=8, section=16
            ),
            colors=create_color_scheme(
                title='#000000',
                artist='#2C3E50',
                metadata='#7F8C8D',
                sections='#8B0000',
                chords='#2C3E50',
                lyrics='#000000',
                background='#FFFFFF',
                accent='#BDC3C7'
            ),
            styles=StyleConfig(
                title=create_font_config('Times-Bold', 20, bold=False, color='#000000'),
                artist=create_font_config('Times-Italic', 14, italic=False, color='#2C3E50'),
                metadata=create_font_config('Times-Roman', 10, color='#7F8C8D'),
                section_headers=create_font_config('Times-Bold', 13, bold=False, color='#8B0000'),
                chords=create_font_config('Times-Bold', 11, bold=False, color='#2C3E50'),
                lyrics=create_font_config('Times-Roman', 12, color='#000000')
            ),
            header=HeaderFooterConfig(
                enabled=False
            ),
            footer=HeaderFooterConfig(
                enabled=True,
                content='{title} - {artist}',
                font=create_font_config('Times-Roman', 9, color='#7F8C8D'),
                alignment='center',
                margin=0.5
            ),
            watermark=WatermarkConfig(enabled=False),
            logo=LogoConfig(enabled=False)
        )
    
    def _create_modern_template(self) -> PDFTemplateConfig:
        """Create modern template with contemporary design."""
        return PDFTemplateConfig(
            name='modern',
            description='Clean, contemporary design with sans-serif fonts and modern styling',
            version='1.0',
            author='ChordMe',
            page=PageConfig(
                size='a4',
                orientation='portrait',
                numbering=True,
                numbering_format='{page} / {total}',
                numbering_position='bottom-right'
            ),
            spacing=create_spacing_config(
                top=0.6, bottom=0.6, left=0.8, right=0.8,
                line_spacing=1.25, paragraph=6, section=14
            ),
            colors=create_color_scheme(
                title='#2C3E50',
                artist='#34495E',
                metadata='#95A5A6',
                sections='#E74C3C',
                chords='#3498DB',
                lyrics='#2C3E50',
                background='#FFFFFF',
                accent='#ECF0F1'
            ),
            styles=StyleConfig(
                title=create_font_config('Helvetica', 22, bold=True, color='#2C3E50'),
                artist=create_font_config('Helvetica', 14, color='#34495E'),
                metadata=create_font_config('Helvetica', 10, color='#95A5A6'),
                section_headers=create_font_config('Helvetica', 12, bold=True, color='#E74C3C'),
                chords=create_font_config('Helvetica', 10, bold=True, color='#3498DB'),
                lyrics=create_font_config('Helvetica', 11, color='#2C3E50')
            ),
            header=HeaderFooterConfig(
                enabled=True,
                content='{title}',
                font=create_font_config('Helvetica', 10, color='#95A5A6'),
                alignment='left',
                margin=0.4
            ),
            footer=HeaderFooterConfig(
                enabled=True,
                content='{artist}',
                font=create_font_config('Helvetica', 9, color='#95A5A6'),
                alignment='right',
                margin=0.4
            ),
            watermark=WatermarkConfig(enabled=False),
            logo=LogoConfig(enabled=False)
        )
    
    def _create_minimal_template(self) -> PDFTemplateConfig:
        """Create minimal template with simplified layout."""
        return PDFTemplateConfig(
            name='minimal',
            description='Simplified layout with maximum content focus and minimal styling',
            version='1.0',
            author='ChordMe',
            page=PageConfig(
                size='a4',
                orientation='portrait',
                numbering=False,
                numbering_format='',
                numbering_position='bottom-center'
            ),
            spacing=create_spacing_config(
                top=0.5, bottom=0.5, left=0.6, right=0.6,
                line_spacing=1.15, paragraph=4, section=10
            ),
            colors=create_color_scheme(
                title='#000000',
                artist='#555555',
                metadata='#888888',
                sections='#666666',
                chords='#333333',
                lyrics='#000000',
                background='#FFFFFF',
                accent='#F5F5F5'
            ),
            styles=StyleConfig(
                title=create_font_config('Helvetica', 18, bold=True, color='#000000'),
                artist=create_font_config('Helvetica', 12, color='#555555'),
                metadata=create_font_config('Helvetica', 9, color='#888888'),
                section_headers=create_font_config('Helvetica', 11, bold=True, color='#666666'),
                chords=create_font_config('Helvetica', 9, bold=True, color='#333333'),
                lyrics=create_font_config('Helvetica', 10, color='#000000')
            ),
            header=HeaderFooterConfig(enabled=False),
            footer=HeaderFooterConfig(enabled=False),
            watermark=WatermarkConfig(enabled=False),
            logo=LogoConfig(enabled=False)
        )
    
    def _load_custom_templates(self):
        """Load custom templates from templates directory."""
        templates_path = Path(self.templates_dir)
        if not templates_path.exists():
            return
        
        for template_file in templates_path.glob('*.json'):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    template_data = json.load(f)
                
                template = PDFTemplateConfig.from_dict(template_data)
                self._templates[template.name] = template
            except Exception as e:
                # Log error but continue loading other templates
                print(f"Warning: Failed to load template {template_file}: {e}")
    
    def get_template(self, name: str) -> Optional[PDFTemplateConfig]:
        """
        Get template by name.
        
        Args:
            name: Template name
            
        Returns:
            Template configuration or None if not found
        """
        return self._templates.get(name)
    
    def list_templates(self) -> List[Dict[str, str]]:
        """
        List all available templates.
        
        Returns:
            List of template information dictionaries
        """
        return [
            {
                'name': template.name,
                'description': template.description,
                'version': template.version,
                'author': template.author,
                'predefined': template.name in ['classic', 'modern', 'minimal']
            }
            for template in self._templates.values()
        ]
    
    def get_template_names(self) -> List[str]:
        """
        Get list of template names.
        
        Returns:
            List of template names
        """
        return list(self._templates.keys())
    
    def save_template(self, template: PDFTemplateConfig, overwrite: bool = False) -> bool:
        """
        Save custom template to disk.
        
        Args:
            template: Template configuration to save
            overwrite: Whether to overwrite existing template
            
        Returns:
            True if saved successfully, False otherwise
        """
        # Don't allow overwriting predefined templates
        if template.name in ['classic', 'modern', 'minimal'] and not overwrite:
            return False
        
        try:
            # Validate template before saving
            errors = template.validate()
            if errors:
                raise ValueError(f"Template validation failed: {errors}")
            
            # Save to disk
            template_path = Path(self.templates_dir) / f"{template.name}.json"
            with open(template_path, 'w', encoding='utf-8') as f:
                f.write(template.to_json())
            
            # Add to memory
            self._templates[template.name] = template
            return True
            
        except Exception as e:
            print(f"Error saving template {template.name}: {e}")
            return False
    
    def delete_template(self, name: str) -> bool:
        """
        Delete custom template.
        
        Args:
            name: Template name to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        # Don't allow deleting predefined templates
        if name in ['classic', 'modern', 'minimal']:
            return False
        
        try:
            # Remove from disk
            template_path = Path(self.templates_dir) / f"{name}.json"
            if template_path.exists():
                template_path.unlink()
            
            # Remove from memory
            if name in self._templates:
                del self._templates[name]
            
            return True
            
        except Exception as e:
            print(f"Error deleting template {name}: {e}")
            return False
    
    def create_custom_template(self, name: str, description: str = '',
                             base_template: str = 'classic') -> Optional[PDFTemplateConfig]:
        """
        Create new custom template based on existing template.
        
        Args:
            name: New template name
            description: Template description
            base_template: Base template to copy from
            
        Returns:
            New template configuration or None if base template not found
        """
        base = self.get_template(base_template)
        if not base:
            return None
        
        # Create copy of base template
        template_dict = base.to_dict()
        template_dict['name'] = name
        template_dict['description'] = description
        template_dict['version'] = '1.0'
        template_dict['author'] = 'Custom'
        
        return PDFTemplateConfig.from_dict(template_dict)
    
    def validate_template(self, template: PDFTemplateConfig) -> List[str]:
        """
        Validate template configuration.
        
        Args:
            template: Template to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        return template.validate()
    
    def get_template_preview_data(self, name: str) -> Optional[Dict]:
        """
        Get template data suitable for preview generation.
        
        Args:
            name: Template name
            
        Returns:
            Dictionary with template preview data
        """
        template = self.get_template(name)
        if not template:
            return None
        
        return {
            'name': template.name,
            'description': template.description,
            'styles': {
                'title': {
                    'font': template.styles.title.to_reportlab_font(),
                    'size': template.styles.title.size,
                    'color': template.styles.title.color
                },
                'artist': {
                    'font': template.styles.artist.to_reportlab_font(),
                    'size': template.styles.artist.size,
                    'color': template.styles.artist.color
                },
                'chords': {
                    'font': template.styles.chords.to_reportlab_font(),
                    'size': template.styles.chords.size,
                    'color': template.styles.chords.color
                },
                'lyrics': {
                    'font': template.styles.lyrics.to_reportlab_font(),
                    'size': template.styles.lyrics.size,
                    'color': template.styles.lyrics.color
                }
            },
            'colors': template.colors.__dict__,
            'spacing': template.spacing.__dict__,
            'page': template.page.__dict__
        }


# Global template manager instance
_template_manager = None


def get_template_manager() -> PDFTemplateManager:
    """Get global template manager instance."""
    global _template_manager
    if _template_manager is None:
        _template_manager = PDFTemplateManager()
    return _template_manager


def get_available_templates() -> List[str]:
    """Get list of available template names."""
    return get_template_manager().get_template_names()


def get_template(name: str) -> Optional[PDFTemplateConfig]:
    """Get template configuration by name."""
    return get_template_manager().get_template(name)


def validate_template_name(name: str) -> bool:
    """Check if template name is valid and available."""
    if not name or not isinstance(name, str):
        return False
    
    # Check if template exists
    template_manager = get_template_manager()
    return name in template_manager.get_template_names()