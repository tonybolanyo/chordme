"""
Test coverage for permission_helpers module to improve overall test coverage.
"""

import pytest
from unittest.mock import patch, MagicMock
from flask import g, request
from datetime import datetime, UTC

from chordme.permission_helpers import SecurityAuditLogger, check_song_permission, require_song_access


class TestSecurityAuditLogger:
    """Test SecurityAuditLogger functionality."""
    
    def test_log_security_event_with_all_params(self, app, caplog):
        """Test logging security event with all parameters."""
        with app.app_context():
            with app.test_request_context('/', headers={'User-Agent': 'TestAgent'}):
                g.current_user_id = 123
                
                SecurityAuditLogger.log_security_event(
                    event_type='PERMISSION_CHECK',
                    details={'action': 'read', 'resource': 'song_123'},
                    user_id=456,
                    ip_address='192.168.1.1',
                    severity='WARNING'
                )
                
                assert 'SECURITY_AUDIT: PERMISSION_CHECK' in caplog.text
                assert 'User: 456' in caplog.text
                assert 'IP: 192.168.1.1' in caplog.text
    
    def test_log_security_event_with_defaults(self, app, caplog):
        """Test logging security event with default parameters."""
        with app.app_context():
            with app.test_request_context('/', environ_base={'REMOTE_ADDR': '127.0.0.1'}):
                g.current_user_id = 789
                
                SecurityAuditLogger.log_security_event(
                    event_type='ACCESS_DENIED',
                    details={'reason': 'insufficient_permissions'}
                )
                
                assert 'SECURITY_AUDIT: ACCESS_DENIED' in caplog.text
                assert 'User: 789' in caplog.text
    
    def test_log_security_event_different_severities(self, app, caplog):
        """Test logging with different severity levels."""
        with app.app_context():
            with app.test_request_context('/'):
                test_cases = [
                    ('CRITICAL', 'CRITICAL'),
                    ('ERROR', 'ERROR'), 
                    ('WARNING', 'WARNING'),
                    ('INFO', 'INFO')
                ]
                
                for severity, expected_level in test_cases:
                    caplog.clear()
                    SecurityAuditLogger.log_security_event(
                        event_type=f'TEST_{severity}',
                        details={'test': True},
                        severity=severity
                    )
                    
                    assert f'TEST_{severity}' in caplog.text


class TestPermissionHelpers:
    """Test permission checking helper functions."""
    
    @patch('chordme.permission_helpers.Song')
    def test_check_song_permission_owner(self, mock_song_class, app):
        """Test permission check for song owner."""
        with app.app_context():
            # Mock song instance
            mock_song = MagicMock()
            mock_song.author_id = 123
            mock_song.is_public = False
            mock_song_class.query.filter_by.return_value.first.return_value = mock_song
            
            result = check_song_permission(song_id=1, user_id=123, permission_level='read')
            assert result is True
    
    @patch('chordme.permission_helpers.Song')
    def test_check_song_permission_public_song(self, mock_song_class, app):
        """Test permission check for public song."""
        with app.app_context():
            # Mock song instance
            mock_song = MagicMock()
            mock_song.author_id = 456
            mock_song.is_public = True
            mock_song_class.query.filter_by.return_value.first.return_value = mock_song
            
            result = check_song_permission(song_id=1, user_id=123, permission_level='read')
            assert result is True
    
    @patch('chordme.permission_helpers.Song')
    def test_check_song_permission_nonexistent_song(self, mock_song_class, app):
        """Test permission check for nonexistent song."""
        with app.app_context():
            mock_song_class.query.filter_by.return_value.first.return_value = None
            
            result = check_song_permission(song_id=999, user_id=123, permission_level='read')
            assert result is False
    
    @patch('chordme.permission_helpers.Song')
    def test_check_song_permission_no_access(self, mock_song_class, app):
        """Test permission check with no access."""
        with app.app_context():
            # Mock song instance
            mock_song = MagicMock()
            mock_song.author_id = 456
            mock_song.is_public = False
            mock_song_class.query.filter_by.return_value.first.return_value = mock_song
            
            result = check_song_permission(song_id=1, user_id=123, permission_level='read')
            assert result is False


class TestPermissionEdgeCases:
    """Test edge cases in permission helpers."""
    
    def test_check_song_permission_no_user(self, app):
        """Test permission check when no user is provided."""
        with app.app_context():
            result = check_song_permission(song_id=1, user_id=None, permission_level='read')
            assert result is False
    
    @patch('chordme.permission_helpers.Song')
    def test_check_song_permission_invalid_permission_type(self, mock_song_class, app):
        """Test permission check with invalid permission type."""
        with app.app_context():
            mock_song = MagicMock()
            mock_song.author_id = 123
            mock_song_class.query.filter_by.return_value.first.return_value = mock_song
            
            # Test with invalid permission type (should still work for owner)
            result = check_song_permission(song_id=1, user_id=123, permission_level='invalid_permission')
            assert result is True
    
    def test_security_audit_logger_no_request_context(self, app, caplog):
        """Test security audit logger outside request context."""
        with app.app_context():
            SecurityAuditLogger.log_security_event(
                event_type='NO_REQUEST_CONTEXT',
                details={'test': True}
            )
            
            assert 'SECURITY_AUDIT: NO_REQUEST_CONTEXT' in caplog.text