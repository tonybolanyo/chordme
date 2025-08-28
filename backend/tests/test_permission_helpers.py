"""
Comprehensive tests for permission_helpers module.

This module tests all functions and classes in permission_helpers.py
to achieve >90% test coverage while following the existing test patterns.
"""

import pytest
import json
import logging
from unittest.mock import Mock, patch, MagicMock
from flask import Flask, g, request
from datetime import datetime, UTC

# Import test fixtures - using pytest fixtures properly

# Import the modules under test
from chordme.permission_helpers import (
    SecurityAuditLogger,
    require_song_access,
    check_song_permission,
    log_sharing_activity,
    validate_permission_level,
    get_effective_permission
)
from chordme.models import User, Song
from chordme.utils import create_error_response


class TestSecurityAuditLogger:
    """Test SecurityAuditLogger class functionality."""

    def test_log_security_event_basic(self, app):
        """Test basic security event logging."""
        with app.app_context():
            details = {'test': 'data', 'action': 'test_action'}
            result = SecurityAuditLogger.log_security_event(
                'TEST_EVENT', details, user_id=123, severity='INFO'
            )
            
            assert result is not None
            assert result['event_type'] == 'TEST_EVENT'
            assert result['user_id'] == 123
            assert result['details'] == details
            assert result['severity'] == 'INFO'
            assert 'timestamp' in result

    def test_log_security_event_with_request_context(self, client):
        """Test security event logging with Flask request context."""
        with client.application.app_context():
            with client.session_transaction() as sess:
                # Simulate a request context
                with client.application.test_request_context('/test', headers={'User-Agent': 'TestAgent'}):
                    details = {'action': 'test_request'}
                    result = SecurityAuditLogger.log_security_event(
                        'REQUEST_EVENT', details, severity='WARNING'
                    )
                    
                    assert result['event_type'] == 'REQUEST_EVENT'
                    assert result['severity'] == 'WARNING'
                    # Note: user_agent will be empty in test context unless set explicitly

    def test_log_security_event_all_severity_levels(self, app):
        """Test logging with all severity levels."""
        with app.app_context():
            severities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
            
            for severity in severities:
                result = SecurityAuditLogger.log_security_event(
                    f'TEST_{severity}', {'level': severity}, severity=severity
                )
                assert result['severity'] == severity

    def test_log_access_attempt_success(self, app):
        """Test successful access attempt logging."""
        with app.app_context():
            result = SecurityAuditLogger.log_access_attempt(
                song_id=123, permission_level='read', granted=True, user_id=456
            )
            
            assert result['event_type'] == 'SONG_ACCESS_ATTEMPT'
            assert result['details']['song_id'] == 123
            assert result['details']['permission_level'] == 'read'
            assert result['details']['access_granted'] is True
            assert result['user_id'] == 456
            assert result['severity'] == 'INFO'

    def test_log_access_attempt_failure(self, app):
        """Test failed access attempt logging."""
        with app.app_context():
            details = {'reason': 'insufficient_permissions'}
            result = SecurityAuditLogger.log_access_attempt(
                song_id=123, permission_level='edit', granted=False, 
                user_id=456, details=details
            )
            
            assert result['event_type'] == 'SONG_ACCESS_ATTEMPT'
            assert result['details']['access_granted'] is False
            assert result['details']['additional_details'] == details
            assert result['severity'] == 'WARNING'

    def test_log_permission_bypass_attempt(self, app):
        """Test permission bypass attempt logging."""
        with app.app_context():
            result = SecurityAuditLogger.log_permission_bypass_attempt(
                song_id=789, attempted_action='edit_without_permission', user_id=123
            )
            
            assert result['event_type'] == 'PERMISSION_BYPASS_ATTEMPT'
            assert result['details']['song_id'] == 789
            assert result['details']['attempted_action'] == 'edit_without_permission'
            assert result['user_id'] == 123
            assert result['severity'] == 'CRITICAL'

    def test_log_permission_bypass_attempt_with_details(self, app):
        """Test permission bypass attempt logging with additional details."""
        with app.app_context():
            extra_details = {'ip': '192.168.1.100', 'method': 'POST'}
            result = SecurityAuditLogger.log_permission_bypass_attempt(
                song_id=789, attempted_action='unauthorized_edit', 
                user_id=123, details=extra_details
            )
            
            assert result['details']['additional_details'] == extra_details

    def test_log_suspicious_activity_default_severity(self, app):
        """Test suspicious activity logging with default severity."""
        with app.app_context():
            details = {'pattern': 'unusual_access', 'count': 10}
            result = SecurityAuditLogger.log_suspicious_activity(
                'UNUSUAL_PATTERN', details, user_id=999
            )
            
            assert result['event_type'] == 'SUSPICIOUS_ACTIVITY'
            assert result['details']['activity_type'] == 'UNUSUAL_PATTERN'
            assert result['details']['details'] == details
            assert result['user_id'] == 999
            assert result['severity'] == 'WARNING'

    def test_log_suspicious_activity_custom_severity(self, app):
        """Test suspicious activity logging with custom severity."""
        with app.app_context():
            result = SecurityAuditLogger.log_suspicious_activity(
                'CRITICAL_THREAT', {'threat_level': 'high'}, 
                user_id=999, severity='CRITICAL'
            )
            
            assert result['severity'] == 'CRITICAL'

    @patch('chordme.permission_helpers.current_app')
    def test_log_security_event_with_structured_logger(self, mock_current_app, app):
        """Test logging with structured logger available."""
        with app.app_context():
            # Mock structured logger
            mock_structured_logger = Mock()
            mock_current_app.logger_structured = mock_structured_logger
            
            details = {'test': 'structured_logging'}
            SecurityAuditLogger.log_security_event('STRUCTURED_TEST', details)
            
            mock_structured_logger.audit.assert_called_once()

    def test_log_security_event_without_g_context(self, app):
        """Test logging when g context is not available."""
        with app.app_context():
            # Clear g context
            if hasattr(g, 'current_user_id'):
                delattr(g, 'current_user_id')
            
            result = SecurityAuditLogger.log_security_event(
                'NO_G_CONTEXT', {'test': 'no_g'}, severity='INFO'
            )
            
            assert result['user_id'] is None


class TestRequireSongAccessDecorator:
    """Test require_song_access decorator functionality."""

    @pytest.fixture
    def mock_song(self):
        """Create a mock Song object."""
        song = Mock()
        song.id = 123
        song.can_user_access.return_value = True
        song.can_user_edit.return_value = True
        song.can_user_manage.return_value = True
        return song

    def test_require_song_access_read_permission_success(self, app, mock_song):
        """Test successful read permission check."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456  # Set explicitly for test
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('read')
                    def test_function(song_id):
                        return f"Success: {song_id}"
                    
                    result = test_function(123)
                    
                    assert result == "Success: 123"
                    mock_song.can_user_access.assert_called_with(456)
                    assert g.current_song == mock_song

    def test_require_song_access_edit_permission_success(self, app, mock_song):
        """Test successful edit permission check."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('edit')
                    def test_function(song_id):
                        return f"Edit Success: {song_id}"
                    
                    result = test_function(123)
                    
                    assert result == "Edit Success: 123"
                    mock_song.can_user_edit.assert_called_with(456)

    def test_require_song_access_admin_permission_success(self, app, mock_song):
        """Test successful admin permission check."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('admin')
                    def test_function(song_id):
                        return f"Admin Success: {song_id}"
                    
                    result = test_function(123)
                    
                    assert result == "Admin Success: 123"
                    mock_song.can_user_manage.assert_called_with(456)

    def test_require_song_access_song_not_found(self, app):
        """Test decorator when song is not found."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = None
                    
                    @require_song_access('read')
                    def test_function(song_id):
                        return f"Should not reach here: {song_id}"
                    
                    response, status_code = test_function(999)
                    
                    assert status_code == 404
                    response_data = json.loads(response.data)
                    assert response_data['error']['message'] == "Song not found"

    def test_require_song_access_no_access_permission(self, app, mock_song):
        """Test decorator when user has no access to song."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                mock_song.can_user_access.return_value = False
                
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('read')
                    def test_function(song_id):
                        return f"Should not reach here: {song_id}"
                    
                    response, status_code = test_function(123)
                    
                    assert status_code == 404  # Don't reveal existence
                    response_data = json.loads(response.data)
                    assert response_data['error']['message'] == "Song not found"

    def test_require_song_access_insufficient_edit_permission(self, app, mock_song):
        """Test decorator when user has insufficient edit permission."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                mock_song.can_user_edit.return_value = False
                
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('edit')
                    def test_function(song_id):
                        return f"Should not reach here: {song_id}"
                    
                    response, status_code = test_function(123)
                    
                    assert status_code == 403
                    response_data = json.loads(response.data)
                    assert "Insufficient permissions to edit" in response_data['error']['message']

    def test_require_song_access_insufficient_admin_permission(self, app, mock_song):
        """Test decorator when user has insufficient admin permission."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                mock_song.can_user_manage.return_value = False
                
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('admin')
                    def test_function(song_id):
                        return f"Should not reach here: {song_id}"
                    
                    response, status_code = test_function(123)
                    
                    assert status_code == 403
                    response_data = json.loads(response.data)
                    assert "Insufficient permissions to manage" in response_data['error']['message']

    def test_require_song_access_with_args_and_kwargs(self, app, mock_song):
        """Test decorator preserves function arguments and keyword arguments."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('read')
                    def test_function(song_id, arg1, arg2, kwarg1=None, kwarg2=None):
                        return f"Song: {song_id}, Args: {arg1}, {arg2}, Kwargs: {kwarg1}, {kwarg2}"
                    
                    result = test_function(123, "test1", "test2", kwarg1="kw1", kwarg2="kw2")
                    
                    assert "Song: 123" in result
                    assert "Args: test1, test2" in result
                    assert "Kwargs: kw1, kw2" in result

    def test_require_song_access_default_read_permission(self, app, mock_song):
        """Test decorator with default read permission."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 456
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access()  # Default to 'read'
                    def test_function(song_id):
                        return f"Default read: {song_id}"
                    
                    result = test_function(123)
                    
                    assert result == "Default read: 123"
                    mock_song.can_user_access.assert_called_with(456)


class TestCheckSongPermission:
    """Test check_song_permission function."""

    @pytest.fixture
    def mock_song(self):
        """Create a mock Song object."""
        song = Mock()
        song.id = 123
        song.can_user_access.return_value = True
        song.can_user_edit.return_value = True
        song.can_user_manage.return_value = True
        return song

    def test_check_song_permission_read_success(self, app, mock_song):
        """Test successful read permission check."""
        with app.app_context():
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                
                song, has_permission = check_song_permission(123, 456, 'read')
                
                assert song == mock_song
                assert has_permission is True
                mock_song.can_user_access.assert_called_with(456)

    def test_check_song_permission_edit_success(self, app, mock_song):
        """Test successful edit permission check."""
        with app.app_context():
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                
                song, has_permission = check_song_permission(123, 456, 'edit')
                
                assert song == mock_song
                assert has_permission is True
                mock_song.can_user_edit.assert_called_with(456)

    def test_check_song_permission_admin_success(self, app, mock_song):
        """Test successful admin permission check."""
        with app.app_context():
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                
                song, has_permission = check_song_permission(123, 456, 'admin')
                
                assert song == mock_song
                assert has_permission is True
                mock_song.can_user_manage.assert_called_with(456)

    def test_check_song_permission_song_not_found(self, app):
        """Test permission check when song doesn't exist."""
        with app.app_context():
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = None
                
                song, has_permission = check_song_permission(999, 456, 'read')
                
                assert song is None
                assert has_permission is False

    def test_check_song_permission_no_access(self, app, mock_song):
        """Test permission check when user has no access."""
        with app.app_context():
            mock_song.can_user_access.return_value = False
            
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                
                song, has_permission = check_song_permission(123, 456, 'read')
                
                assert song is None  # Return None for security (pretend song doesn't exist)
                assert has_permission is False

    def test_check_song_permission_insufficient_edit(self, app, mock_song):
        """Test edit permission check when user has insufficient permissions."""
        with app.app_context():
            mock_song.can_user_edit.return_value = False
            
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                
                song, has_permission = check_song_permission(123, 456, 'edit')
                
                assert song == mock_song
                assert has_permission is False

    def test_check_song_permission_insufficient_admin(self, app, mock_song):
        """Test admin permission check when user has insufficient permissions."""
        with app.app_context():
            mock_song.can_user_manage.return_value = False
            
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                
                song, has_permission = check_song_permission(123, 456, 'admin')
                
                assert song == mock_song
                assert has_permission is False

    def test_check_song_permission_default_read(self, app, mock_song):
        """Test permission check with default read level."""
        with app.app_context():
            with patch('chordme.permission_helpers.Song') as mock_song_model:
                mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                
                song, has_permission = check_song_permission(123, 456)  # Default to 'read'
                
                assert song == mock_song
                assert has_permission is True


class TestLogSharingActivity:
    """Test log_sharing_activity function."""

    def test_log_sharing_activity_basic(self, app):
        """Test basic sharing activity logging."""
        with app.app_context():
            with app.test_request_context('/test', headers={'User-Agent': 'TestAgent'}):
                log_sharing_activity(
                    action='share_added',
                    song_id=123,
                    actor_user_id=456,
                    target_user_id=789,
                    permission_level='read'
                )
                # Test passes if no exception is raised

    def test_log_sharing_activity_without_target_user(self, app):
        """Test sharing activity logging without target user."""
        with app.app_context():
            with app.test_request_context('/test'):
                log_sharing_activity(
                    action='share_settings_changed',
                    song_id=123,
                    actor_user_id=456
                )
                # Test passes if no exception is raised

    def test_log_sharing_activity_with_details(self, app):
        """Test sharing activity logging with additional details."""
        with app.app_context():
            with app.test_request_context('/test'):
                details = {'previous_level': 'read', 'new_level': 'edit'}
                log_sharing_activity(
                    action='permission_changed',
                    song_id=123,
                    actor_user_id=456,
                    target_user_id=789,
                    permission_level='edit',
                    details=details
                )
                # Test passes if no exception is raised

    def test_log_sharing_activity_without_request_context(self, app):
        """Test sharing activity logging without request context."""
        with app.app_context():
            log_sharing_activity(
                action='share_removed',
                song_id=123,
                actor_user_id=456,
                target_user_id=789
            )
            # Test passes if no exception is raised


class TestValidatePermissionLevel:
    """Test validate_permission_level function."""

    def test_validate_permission_level_valid_read(self, app):
        """Test validation with valid 'read' permission."""
        with app.app_context():
            result = validate_permission_level('read')
            assert result is True

    def test_validate_permission_level_valid_edit(self, app):
        """Test validation with valid 'edit' permission."""
        with app.app_context():
            result = validate_permission_level('edit')
            assert result is True

    def test_validate_permission_level_valid_admin(self, app):
        """Test validation with valid 'admin' permission."""
        with app.app_context():
            result = validate_permission_level('admin')
            assert result is True

    def test_validate_permission_level_invalid_permission(self, app):
        """Test validation with invalid permission level."""
        with app.app_context():
            result = validate_permission_level('invalid')
            assert result is False

    def test_validate_permission_level_empty_string(self, app):
        """Test validation with empty string."""
        with app.app_context():
            result = validate_permission_level('')
            assert result is False

    def test_validate_permission_level_none(self, app):
        """Test validation with None value."""
        with app.app_context():
            result = validate_permission_level(None)
            assert result is False

    def test_validate_permission_level_case_sensitive(self, app):
        """Test validation is case-sensitive."""
        with app.app_context():
            result = validate_permission_level('READ')  # Uppercase
            assert result is False

    def test_validate_permission_level_numeric(self, app):
        """Test validation with numeric input."""
        with app.app_context():
            result = validate_permission_level(123)
            assert result is False


class TestGetEffectivePermission:
    """Test get_effective_permission function."""

    @pytest.fixture
    def mock_song(self):
        """Create a mock Song object."""
        song = Mock()
        song.author_id = 123  # Owner user ID
        song.share_settings = 'private'
        song.get_user_permission.return_value = None
        return song

    def test_get_effective_permission_owner(self, mock_song):
        """Test effective permission for song owner."""
        result = get_effective_permission(mock_song, 123)  # Same as author_id
        assert result == 'admin'

    def test_get_effective_permission_explicit_read(self, mock_song):
        """Test effective permission with explicit read permission."""
        mock_song.get_user_permission.return_value = 'read'
        
        result = get_effective_permission(mock_song, 456)
        assert result == 'read'

    def test_get_effective_permission_explicit_edit(self, mock_song):
        """Test effective permission with explicit edit permission."""
        mock_song.get_user_permission.return_value = 'edit'
        
        result = get_effective_permission(mock_song, 456)
        assert result == 'edit'

    def test_get_effective_permission_explicit_admin(self, mock_song):
        """Test effective permission with explicit admin permission."""
        mock_song.get_user_permission.return_value = 'admin'
        
        result = get_effective_permission(mock_song, 456)
        assert result == 'admin'

    def test_get_effective_permission_public_song(self, mock_song):
        """Test effective permission for public song."""
        mock_song.share_settings = 'public'
        
        result = get_effective_permission(mock_song, 456)
        assert result == 'read'

    def test_get_effective_permission_private_no_access(self, mock_song):
        """Test effective permission for private song with no explicit permission."""
        result = get_effective_permission(mock_song, 456)
        assert result is None

    def test_get_effective_permission_non_public_no_access(self, mock_song):
        """Test effective permission for non-public song with no access."""
        mock_song.share_settings = 'link-shared'
        
        result = get_effective_permission(mock_song, 456)
        assert result is None

    def test_get_effective_permission_owner_overrides_explicit(self, mock_song):
        """Test that owner status overrides explicit permissions."""
        mock_song.get_user_permission.return_value = 'read'  # Would be read, but user is owner
        
        result = get_effective_permission(mock_song, 123)  # Same as author_id
        assert result == 'admin'  # Owner always gets admin


class TestPermissionHelpersIntegration:
    """Integration tests for permission helpers working together."""

    @pytest.fixture
    def mock_song_with_permissions(self):
        """Create a mock Song with various permission scenarios."""
        song = Mock()
        song.id = 123
        song.author_id = 100  # Owner
        song.share_settings = 'private'
        
        # Setup permission checks
        def can_user_access(user_id):
            return user_id in [100, 200, 300]  # Owner + collaborators
        
        def can_user_edit(user_id):
            return user_id in [100, 200]  # Owner + edit permission
        
        def can_user_manage(user_id):
            return user_id == 100  # Only owner
        
        def get_user_permission(user_id):
            permissions = {200: 'edit', 300: 'read'}
            return permissions.get(user_id)
        
        song.can_user_access = can_user_access
        song.can_user_edit = can_user_edit
        song.can_user_manage = can_user_manage
        song.get_user_permission = get_user_permission
        
        return song

    def test_integration_owner_full_access(self, app, mock_song_with_permissions):
        """Test full integration for song owner."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 100  # Owner
                
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song_with_permissions
                    
                    # Test decorator access
                    @require_song_access('admin')
                    def test_admin_access(song_id):
                        return "Admin access granted"
                    
                    result = test_admin_access(123)
                    assert result == "Admin access granted"
                    
                    # Test direct permission check
                    song, has_permission = check_song_permission(123, 100, 'admin')
                    assert has_permission is True
                    
                    # Test effective permission
                    effective = get_effective_permission(mock_song_with_permissions, 100)
                    assert effective == 'admin'

    def test_integration_collaborator_edit_access(self, app, mock_song_with_permissions):
        """Test integration for collaborator with edit access."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 200  # Edit collaborator
                
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song_with_permissions
                    
                    # Test edit access
                    @require_song_access('edit')
                    def test_edit_access(song_id):
                        return "Edit access granted"
                    
                    result = test_edit_access(123)
                    assert result == "Edit access granted"
                    
                    # Test admin access should fail
                    @require_song_access('admin')
                    def test_admin_access(song_id):
                        return "Should not reach here"
                    
                    response, status_code = test_admin_access(123)
                    assert status_code == 403

    def test_integration_collaborator_read_only_access(self, app, mock_song_with_permissions):
        """Test integration for read-only collaborator."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 300  # Read-only collaborator
                
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song_with_permissions
                    
                    # Test read access
                    song, has_permission = check_song_permission(123, 300, 'read')
                    assert has_permission is True
                    
                    # Test edit access should fail
                    song, has_permission = check_song_permission(123, 300, 'edit')
                    assert has_permission is False

    def test_integration_unauthorized_user(self, app, mock_song_with_permissions):
        """Test integration for unauthorized user."""
        with app.app_context():
            with app.test_request_context():
                g.current_user_id = 999  # Unauthorized user
                
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song_with_permissions
                    
                    # Test access should fail
                    song, has_permission = check_song_permission(123, 999, 'read')
                    assert song is None  # Security: don't reveal song exists
                    assert has_permission is False
                    
                    # Test effective permission
                    effective = get_effective_permission(mock_song_with_permissions, 999)
                    assert effective is None


# Additional edge case tests
class TestPermissionHelpersEdgeCases:
    """Test edge cases and error conditions."""

    def test_require_song_access_without_g_context(self, app):
        """Test decorator behavior when g context is missing current_user_id."""
        with app.app_context():
            with app.test_request_context():
                # NOTE: In the current implementation, g.current_user_id is required
                # This test demonstrates that the decorator expects auth_required to have been called first
                # An improvement would be to handle missing g.current_user_id gracefully
                with patch('chordme.permission_helpers.Song') as mock_song_model:
                    mock_song = Mock()
                    mock_song.can_user_access.return_value = True
                    mock_song_model.query.filter_by.return_value.first.return_value = mock_song
                    
                    @require_song_access('read')
                    def test_function(song_id):
                        return "Success"
                    
                    # This should raise AttributeError because g.current_user_id is not set
                    with pytest.raises(AttributeError, match="current_user_id"):
                        test_function(123)

    def test_security_audit_logger_no_request_context(self, app):
        """Test SecurityAuditLogger without request context."""
        with app.app_context():
            # No request context
            result = SecurityAuditLogger.log_security_event(
                'NO_REQUEST_CONTEXT', {'test': 'data'}
            )
            
            assert result['ip_address'] is None
            assert result['user_agent'] == ''

    def test_validate_permission_level_edge_cases(self, app):
        """Test validate_permission_level with various edge cases."""
        with app.app_context():
            edge_cases = [
                ('read ', False),  # Trailing space
                (' read', False),  # Leading space
                ('Read', False),   # Capitalized
                ('EDIT', False),   # All caps
                ('admin123', False),  # With numbers
                ('read-write', False),  # Hyphenated
                ('edit/admin', False),  # With slash
            ]
            
            for value, expected in edge_cases:
                result = validate_permission_level(value)
                assert result == expected, f"Failed for value: {value}"