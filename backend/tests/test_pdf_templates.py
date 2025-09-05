"""
Unit tests for PDF template system.
"""

import pytest
import json
import tempfile
import os
from pathlib import Path

from chordme.pdf_template_schema import (
    PDFTemplateConfig, FontConfig, SpacingConfig, ColorScheme, 
    StyleConfig, PageConfig, HeaderFooterConfig, WatermarkConfig, LogoConfig,
    create_font_config, create_spacing_config, create_color_scheme
)
from chordme.pdf_templates import PDFTemplateManager, get_template_manager, get_template


class TestFontConfig:
    """Test cases for FontConfig class."""
    
    def test_font_config_defaults(self):
        """Test font config with default values."""
        font = FontConfig()
        assert font.family == 'Helvetica'
        assert font.size == 12
        assert font.bold == False
        assert font.italic == False
        assert font.color == '#000000'
    
    def test_font_config_custom(self):
        """Test font config with custom values."""
        font = FontConfig(
            family='Times-Roman',
            size=14,
            bold=True,
            italic=True,
            color='#FF0000'
        )
        assert font.family == 'Times-Roman'
        assert font.size == 14
        assert font.bold == True
        assert font.italic == True
        assert font.color == '#FF0000'
    
    def test_to_reportlab_font(self):
        """Test conversion to ReportLab font names."""
        # Regular font
        font1 = FontConfig(family='Helvetica')
        assert font1.to_reportlab_font() == 'Helvetica'
        
        # Bold font
        font2 = FontConfig(family='Helvetica', bold=True)
        assert font2.to_reportlab_font() == 'Helvetica-Bold'
        
        # Italic font
        font3 = FontConfig(family='Helvetica', italic=True)
        assert font3.to_reportlab_font() == 'Helvetica-Oblique'
        
        # Bold italic font
        font4 = FontConfig(family='Helvetica', bold=True, italic=True)
        assert font4.to_reportlab_font() == 'Helvetica-BoldOblique'


class TestSpacingConfig:
    """Test cases for SpacingConfig class."""
    
    def test_spacing_config_defaults(self):
        """Test spacing config with default values."""
        spacing = SpacingConfig()
        assert spacing.top_margin == 0.5
        assert spacing.bottom_margin == 0.5
        assert spacing.left_margin == 0.75
        assert spacing.right_margin == 0.75
        assert spacing.line_spacing == 1.2
        assert spacing.paragraph_spacing == 6
        assert spacing.section_spacing == 12
    
    def test_spacing_config_custom(self):
        """Test spacing config with custom values."""
        spacing = SpacingConfig(
            top_margin=1.0,
            bottom_margin=0.75,
            left_margin=1.25,
            right_margin=1.0,
            line_spacing=1.5,
            paragraph_spacing=8,
            section_spacing=16
        )
        assert spacing.top_margin == 1.0
        assert spacing.bottom_margin == 0.75
        assert spacing.left_margin == 1.25
        assert spacing.right_margin == 1.0
        assert spacing.line_spacing == 1.5
        assert spacing.paragraph_spacing == 8
        assert spacing.section_spacing == 16


class TestColorScheme:
    """Test cases for ColorScheme class."""
    
    def test_color_scheme_defaults(self):
        """Test color scheme with default values."""
        colors = ColorScheme()
        assert colors.title == '#000000'
        assert colors.artist == '#333333'
        assert colors.metadata == '#666666'
        assert colors.section_headers == '#8B0000'
        assert colors.chords == '#0066CC'
        assert colors.lyrics == '#000000'
        assert colors.background == '#FFFFFF'
        assert colors.accent == '#CCCCCC'
    
    def test_color_scheme_custom(self):
        """Test color scheme with custom values."""
        colors = ColorScheme(
            title='#FF0000',
            artist='#00FF00',
            metadata='#0000FF',
            section_headers='#FFFF00',
            chords='#FF00FF',
            lyrics='#00FFFF',
            background='#F0F0F0',
            accent='#808080'
        )
        assert colors.title == '#FF0000'
        assert colors.artist == '#00FF00'
        assert colors.metadata == '#0000FF'
        assert colors.section_headers == '#FFFF00'
        assert colors.chords == '#FF00FF'
        assert colors.lyrics == '#00FFFF'
        assert colors.background == '#F0F0F0'
        assert colors.accent == '#808080'


class TestPDFTemplateConfig:
    """Test cases for PDFTemplateConfig class."""
    
    def test_template_config_minimal(self):
        """Test template config with minimal required fields."""
        template = PDFTemplateConfig(name='test')
        assert template.name == 'test'
        assert template.description == ''
        assert template.version == '1.0'
        assert template.author == ''
        
        # Check that default configs are created
        assert template.page is not None
        assert template.spacing is not None
        assert template.colors is not None
        assert template.styles is not None
        assert template.header is not None
        assert template.footer is not None
        assert template.watermark is not None
        assert template.logo is not None
    
    def test_template_config_validation_valid(self):
        """Test template validation with valid configuration."""
        template = PDFTemplateConfig(name='valid_template')
        errors = template.validate()
        assert len(errors) == 0
    
    def test_template_config_validation_invalid_page_size(self):
        """Test template validation with invalid page size."""
        template = PDFTemplateConfig(name='invalid_template')
        template.page.size = 'invalid_size'
        errors = template.validate()
        assert len(errors) > 0
        assert any('Invalid page size' in error for error in errors)
    
    def test_template_config_validation_invalid_orientation(self):
        """Test template validation with invalid orientation."""
        template = PDFTemplateConfig(name='invalid_template')
        template.page.orientation = 'invalid_orientation'
        errors = template.validate()
        assert len(errors) > 0
        assert any('Invalid page orientation' in error for error in errors)
    
    def test_template_config_validation_invalid_color(self):
        """Test template validation with invalid color."""
        template = PDFTemplateConfig(name='invalid_template')
        template.colors.title = 'invalid_color'
        errors = template.validate()
        assert len(errors) > 0
        assert any('Invalid title color' in error for error in errors)
    
    def test_template_config_validation_negative_margin(self):
        """Test template validation with negative margin."""
        template = PDFTemplateConfig(name='invalid_template')
        template.spacing.top_margin = -1.0
        errors = template.validate()
        assert len(errors) > 0
        assert any('Invalid top margin' in error for error in errors)
    
    def test_template_config_validation_invalid_font_size(self):
        """Test template validation with invalid font size."""
        template = PDFTemplateConfig(name='invalid_template')
        template.styles.title.size = 0
        errors = template.validate()
        assert len(errors) > 0
        assert any('Invalid title font size' in error for error in errors)
    
    def test_template_config_validation_invalid_watermark_opacity(self):
        """Test template validation with invalid watermark opacity."""
        template = PDFTemplateConfig(name='invalid_template')
        template.watermark.opacity = 1.5
        errors = template.validate()
        assert len(errors) > 0
        assert any('Invalid watermark opacity' in error for error in errors)
    
    def test_template_to_dict(self):
        """Test template conversion to dictionary."""
        template = PDFTemplateConfig(name='test_template')
        template_dict = template.to_dict()
        
        assert isinstance(template_dict, dict)
        assert template_dict['name'] == 'test_template'
        assert 'page' in template_dict
        assert 'spacing' in template_dict
        assert 'colors' in template_dict
        assert 'styles' in template_dict
    
    def test_template_from_dict(self):
        """Test template creation from dictionary."""
        template_dict = {
            'name': 'test_template',
            'description': 'Test template',
            'page': {
                'size': 'letter',
                'orientation': 'landscape'
            },
            'colors': {
                'title': '#FF0000'
            }
        }
        
        template = PDFTemplateConfig.from_dict(template_dict)
        assert template.name == 'test_template'
        assert template.description == 'Test template'
        assert template.page.size == 'letter'
        assert template.page.orientation == 'landscape'
        assert template.colors.title == '#FF0000'
    
    def test_template_to_json(self):
        """Test template conversion to JSON."""
        template = PDFTemplateConfig(name='test_template')
        json_str = template.to_json()
        
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert parsed['name'] == 'test_template'
    
    def test_template_from_json(self):
        """Test template creation from JSON."""
        json_str = '{"name": "test_template", "description": "Test template"}'
        template = PDFTemplateConfig.from_json(json_str)
        
        assert template.name == 'test_template'
        assert template.description == 'Test template'


class TestPDFTemplateManager:
    """Test cases for PDFTemplateManager class."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for templates."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def template_manager(self, temp_dir):
        """Create template manager with temporary directory."""
        return PDFTemplateManager(templates_dir=temp_dir)
    
    def test_template_manager_initialization(self, template_manager):
        """Test template manager initialization."""
        assert template_manager is not None
        
        # Check that predefined templates are loaded
        template_names = template_manager.get_template_names()
        assert 'classic' in template_names
        assert 'modern' in template_names
        assert 'minimal' in template_names
    
    def test_get_template(self, template_manager):
        """Test getting template by name."""
        classic_template = template_manager.get_template('classic')
        assert classic_template is not None
        assert classic_template.name == 'classic'
        assert classic_template.description != ''
        
        # Test non-existent template
        non_existent = template_manager.get_template('non_existent')
        assert non_existent is None
    
    def test_list_templates(self, template_manager):
        """Test listing all templates."""
        templates = template_manager.list_templates()
        assert len(templates) >= 3  # At least classic, modern, minimal
        
        # Check template info structure
        for template_info in templates:
            assert 'name' in template_info
            assert 'description' in template_info
            assert 'version' in template_info
            assert 'author' in template_info
            assert 'predefined' in template_info
    
    def test_get_template_names(self, template_manager):
        """Test getting template names."""
        names = template_manager.get_template_names()
        assert isinstance(names, list)
        assert len(names) >= 3
        assert 'classic' in names
        assert 'modern' in names
        assert 'minimal' in names
    
    def test_save_template(self, template_manager):
        """Test saving custom template."""
        # Create custom template
        custom_template = PDFTemplateConfig(
            name='custom_test',
            description='Custom test template'
        )
        
        # Save template
        success = template_manager.save_template(custom_template)
        assert success == True
        
        # Verify template is available
        saved_template = template_manager.get_template('custom_test')
        assert saved_template is not None
        assert saved_template.name == 'custom_test'
        assert saved_template.description == 'Custom test template'
    
    def test_save_template_invalid(self, template_manager):
        """Test saving invalid template."""
        # Create invalid template
        invalid_template = PDFTemplateConfig(name='invalid_test')
        invalid_template.page.size = 'invalid_size'
        
        # Save should fail
        success = template_manager.save_template(invalid_template)
        assert success == False
    
    def test_save_predefined_template(self, template_manager):
        """Test attempting to save over predefined template."""
        classic_template = template_manager.get_template('classic')
        classic_template.description = 'Modified description'
        
        # Should fail without overwrite flag
        success = template_manager.save_template(classic_template)
        assert success == False
        
        # Should succeed with overwrite flag
        success = template_manager.save_template(classic_template, overwrite=True)
        assert success == True
    
    def test_delete_template(self, template_manager):
        """Test deleting custom template."""
        # Create and save custom template
        custom_template = PDFTemplateConfig(
            name='delete_test',
            description='Template to delete'
        )
        template_manager.save_template(custom_template)
        
        # Verify template exists
        assert template_manager.get_template('delete_test') is not None
        
        # Delete template
        success = template_manager.delete_template('delete_test')
        assert success == True
        
        # Verify template is gone
        assert template_manager.get_template('delete_test') is None
    
    def test_delete_predefined_template(self, template_manager):
        """Test attempting to delete predefined template."""
        success = template_manager.delete_template('classic')
        assert success == False
        
        # Template should still exist
        assert template_manager.get_template('classic') is not None
    
    def test_create_custom_template(self, template_manager):
        """Test creating custom template from base template."""
        custom_template = template_manager.create_custom_template(
            name='custom_classic',
            description='Custom version of classic',
            base_template='classic'
        )
        
        assert custom_template is not None
        assert custom_template.name == 'custom_classic'
        assert custom_template.description == 'Custom version of classic'
        assert custom_template.author == 'Custom'
        assert custom_template.version == '1.0'
    
    def test_create_custom_template_invalid_base(self, template_manager):
        """Test creating custom template from non-existent base template."""
        custom_template = template_manager.create_custom_template(
            name='custom_invalid',
            base_template='non_existent'
        )
        
        assert custom_template is None
    
    def test_validate_template(self, template_manager):
        """Test template validation."""
        # Valid template
        valid_template = PDFTemplateConfig(name='valid_test')
        errors = template_manager.validate_template(valid_template)
        assert len(errors) == 0
        
        # Invalid template
        invalid_template = PDFTemplateConfig(name='invalid_test')
        invalid_template.page.size = 'invalid_size'
        errors = template_manager.validate_template(invalid_template)
        assert len(errors) > 0
    
    def test_get_template_preview_data(self, template_manager):
        """Test getting template preview data."""
        preview_data = template_manager.get_template_preview_data('classic')
        
        assert preview_data is not None
        assert 'name' in preview_data
        assert 'description' in preview_data
        assert 'styles' in preview_data
        assert 'colors' in preview_data
        assert 'spacing' in preview_data
        assert 'page' in preview_data
        
        # Check styles structure
        assert 'title' in preview_data['styles']
        assert 'artist' in preview_data['styles']
        assert 'chords' in preview_data['styles']
        assert 'lyrics' in preview_data['styles']
        
        # Test non-existent template
        preview_data_invalid = template_manager.get_template_preview_data('non_existent')
        assert preview_data_invalid is None
    
    def test_load_custom_templates_from_disk(self, temp_dir):
        """Test loading custom templates from disk."""
        # Create a custom template file
        custom_template_data = {
            'name': 'disk_template',
            'description': 'Template loaded from disk',
            'version': '1.0',
            'author': 'Test'
        }
        
        template_path = Path(temp_dir) / 'disk_template.json'
        with open(template_path, 'w') as f:
            json.dump(custom_template_data, f)
        
        # Create new template manager that should load the file
        template_manager = PDFTemplateManager(templates_dir=temp_dir)
        
        # Check that template was loaded
        loaded_template = template_manager.get_template('disk_template')
        assert loaded_template is not None
        assert loaded_template.name == 'disk_template'
        assert loaded_template.description == 'Template loaded from disk'


class TestHelperFunctions:
    """Test cases for helper functions."""
    
    def test_create_font_config(self):
        """Test create_font_config helper function."""
        font = create_font_config(
            family='Times-Roman',
            size=14,
            bold=True,
            italic=False,
            color='#FF0000'
        )
        
        assert isinstance(font, FontConfig)
        assert font.family == 'Times-Roman'
        assert font.size == 14
        assert font.bold == True
        assert font.italic == False
        assert font.color == '#FF0000'
    
    def test_create_spacing_config(self):
        """Test create_spacing_config helper function."""
        spacing = create_spacing_config(
            top=1.0,
            bottom=0.8,
            left=1.2,
            right=0.9,
            line_spacing=1.4,
            paragraph=8,
            section=16
        )
        
        assert isinstance(spacing, SpacingConfig)
        assert spacing.top_margin == 1.0
        assert spacing.bottom_margin == 0.8
        assert spacing.left_margin == 1.2
        assert spacing.right_margin == 0.9
        assert spacing.line_spacing == 1.4
        assert spacing.paragraph_spacing == 8
        assert spacing.section_spacing == 16
    
    def test_create_color_scheme(self):
        """Test create_color_scheme helper function."""
        colors = create_color_scheme(
            title='#FF0000',
            artist='#00FF00',
            metadata='#0000FF',
            sections='#FFFF00',
            chords='#FF00FF',
            lyrics='#00FFFF',
            background='#F0F0F0',
            accent='#808080'
        )
        
        assert isinstance(colors, ColorScheme)
        assert colors.title == '#FF0000'
        assert colors.artist == '#00FF00'
        assert colors.metadata == '#0000FF'
        assert colors.section_headers == '#FFFF00'
        assert colors.chords == '#FF00FF'
        assert colors.lyrics == '#00FFFF'
        assert colors.background == '#F0F0F0'
        assert colors.accent == '#808080'


class TestGlobalFunctions:
    """Test cases for global template functions."""
    
    def test_get_template_manager(self):
        """Test getting global template manager."""
        manager1 = get_template_manager()
        manager2 = get_template_manager()
        
        # Should return same instance
        assert manager1 is manager2
        assert manager1 is not None
    
    def test_get_template_global(self):
        """Test getting template using global function."""
        template = get_template('classic')
        assert template is not None
        assert template.name == 'classic'
        
        # Test non-existent template
        non_existent = get_template('non_existent')
        assert non_existent is None