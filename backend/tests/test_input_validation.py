"""
Tests for enhanced input validation and sanitization features.
"""

import pytest
import json
from chordme.utils import sanitize_input, validate_positive_integer
from chordme.chordpro_utils import ChordProValidator


class TestEnhancedSanitization:
    """Test cases for the enhanced sanitization function."""
    
    def test_nested_dict_sanitization(self):
        """Test that nested dictionaries are properly sanitized."""
        data = {
            'user': {
                'name': '  John Doe  ',
                'email': 'john@example.com',
                'metadata': {
                    'preferences': '  dark_mode  '
                }
            },
            'content': 'Some content\x00with\x01control\x02chars'
        }
        
        sanitized = sanitize_input(data)
        
        assert sanitized['user']['name'] == 'John Doe'
        assert sanitized['user']['email'] == 'john@example.com'
        assert sanitized['user']['metadata']['preferences'] == 'dark_mode'
        assert '\x00' not in sanitized['content']
        assert sanitized['content'] == 'Some contentwithcontrolchars'
    
    def test_list_sanitization(self):
        """Test that lists are properly sanitized."""
        data = {
            'tags': ['  tag1  ', 'tag2\x00', '  tag3  '],
            'numbers': [1, 2, 3],
            'mixed': ['string\x01', 42, True, {'nested': '  value  '}]
        }
        
        sanitized = sanitize_input(data)
        
        assert sanitized['tags'] == ['tag1', 'tag2', 'tag3']
        assert sanitized['numbers'] == [1, 2, 3]
        assert sanitized['mixed'] == ['string', 42, True, {'nested': 'value'}]
    
    def test_custom_length_limit(self):
        """Test custom length limiting."""
        long_string = "A" * 500
        data = {'content': long_string}
        
        # Test with default limit
        sanitized = sanitize_input(data)
        assert len(sanitized['content']) == 500  # Default is 1000
        
        # Test with custom limit
        sanitized = sanitize_input(data, max_string_length=100)
        assert len(sanitized['content']) == 100
    
    def test_none_input(self):
        """Test handling of None input."""
        assert sanitize_input(None) == {}
    
    def test_non_dict_preservation(self):
        """Test that non-dict/list/string types are preserved."""
        test_cases = [
            42,
            3.14,
            True,
            False,
        ]
        
        for test_input in test_cases:
            result = sanitize_input(test_input)
            assert result == test_input
            assert type(result) == type(test_input)


class TestChordProSecurityValidation:
    """Test cases for ChordPro security validation."""
    
    def test_script_injection_detection(self):
        """Test detection of script injection attempts."""
        malicious_content = """
        {title: Test Song}
        <script>alert('xss')</script>
        [C]This is a test song[G]
        """
        
        validator = ChordProValidator()
        is_valid, warnings = validator.validate_content(malicious_content)
        
        assert not is_valid
        assert any('dangerous' in warning.lower() for warning in warnings)
    
    def test_sql_injection_detection(self):
        """Test detection of SQL injection attempts."""
        malicious_content = """
        {title: Test'; DROP TABLE songs; --}
        [C]This is a test[G]
        UNION SELECT * FROM users WHERE 1=1
        """
        
        validator = ChordProValidator()
        is_valid, warnings = validator.validate_content(malicious_content)
        
        assert not is_valid
        assert any('sql injection' in warning.lower() for warning in warnings)
    
    def test_high_special_character_concentration(self):
        """Test detection of high special character concentration."""
        malicious_content = "<>&\"'<>&\"'<>&\"'<>&\"'<>&\"'"
        
        validator = ChordProValidator()
        is_valid, warnings = validator.validate_content(malicious_content)
        
        assert not is_valid
        assert any('special characters' in warning.lower() for warning in warnings)
    
    def test_clean_chordpro_content(self):
        """Test that clean ChordPro content passes validation."""
        clean_content = """
        {title: My Song}
        {artist: Artist Name}
        {key: C}
        
        [C]This is a clean [G]song with normal
        [Am]chords and [F]lyrics
        
        {start_of_chorus}
        [C]Chorus section [G]here
        {end_of_chorus}
        """
        
        validator = ChordProValidator()
        is_valid, warnings = validator.validate_content(clean_content)
        
        assert is_valid
        assert len(warnings) == 0


class TestAPIInputValidation:
    """Test input validation on API endpoints."""
    
    def test_song_creation_with_malicious_content(self, client, auth_token):
        """Test song creation with potentially malicious content."""
        auth_headers = {'Authorization': f'Bearer {auth_token}'}
        
        malicious_song_data = {
            'title': 'Test Song',
            'content': '{title: Test}<script>alert("xss")</script>[C]Test[G]'
        }
        
        response = client.post(
            '/api/v1/songs',
            json=malicious_song_data,
            headers=auth_headers,
            content_type='application/json'
        )
        
        # Should either reject or clean the content
        assert response.status_code in [201, 400]
        
        if response.status_code == 201:
            # If accepted, content should be cleaned
            data = json.loads(response.data)
            assert '<script>' not in data['data']['content']
    
    def test_large_content_validation(self, client, auth_token):
        """Test validation of large content uploads."""
        auth_headers = {'Authorization': f'Bearer {auth_token}'}
        large_content = "A" * 15000  # Larger than 10KB limit
        
        song_data = {
            'title': 'Large Song',
            'content': large_content
        }
        
        response = client.post(
            '/api/v1/songs',
            json=song_data,
            headers=auth_headers,
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'too large' in data['error'].lower() or 'characters' in data['error'].lower()
    
    def test_file_upload_security_validation(self, client, auth_token):
        """Test security validation in file uploads."""
        auth_headers = {'Authorization': f'Bearer {auth_token}'}
        from io import BytesIO
        
        malicious_content = b"""
        {title: Test Song}
        <script>alert('xss')</script>
        [C]Test song[G]
        """
        
        data = {
            'file': (BytesIO(malicious_content), 'malicious.cho')
        }
        
        response = client.post(
            '/api/v1/songs/upload',
            data=data,
            headers=auth_headers,
            content_type='multipart/form-data'
        )
        
        # Should reject due to dangerous content
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'dangerous' in response_data['error'].lower()