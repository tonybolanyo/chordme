"""
Comprehensive test suite targeting 85% backend coverage.
This module systematically tests all major components with focus on high-impact modules.
"""

import pytest
import json
import io
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime
from flask import current_app, g
from werkzeug.test import Client

from chordme import app as flask_app, db
from chordme.models import User, Song
from chordme.google_drive_service import GoogleDriveService
from chordme.pdf_generator import ChordProPDFGenerator
from chordme.permission_helpers import SecurityAuditLogger, check_song_permission, require_song_access
from chordme.csrf_protection import CSRFProtection
from chordme.monitoring import SecurityMonitor
from chordme.rate_limiter import RateLimiter
from chordme.https_enforcement import HTTPSEnforcement
from chordme.logging_config import SecurityLogger


class TestGoogleDriveService:
    """Comprehensive tests for Google Drive service."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['GOOGLE_DRIVE_ENABLED'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        with flask_app.app_context():
            db.create_all()
            yield flask_app
            db.drop_all()
    
    @pytest.fixture 
    def drive_service(self, app):
        with app.app_context():
            return GoogleDriveService()
    
    def test_google_drive_service_init(self, drive_service):
        """Test GoogleDriveService initialization."""
        assert drive_service._enabled is None
    
    def test_is_enabled_when_configured(self, drive_service):
        """Test is_enabled returns True when configured."""
        assert drive_service.is_enabled() is True
    
    def test_is_enabled_when_disabled(self):
        """Test is_enabled returns False when disabled."""
        flask_app.config['GOOGLE_DRIVE_ENABLED'] = False
        with flask_app.app_context():
            service = GoogleDriveService()
            assert service.is_enabled() is False
    
    def test_is_enabled_default_disabled(self):
        """Test is_enabled returns False by default."""
        if 'GOOGLE_DRIVE_ENABLED' in flask_app.config:
            del flask_app.config['GOOGLE_DRIVE_ENABLED']
        with flask_app.app_context():
            service = GoogleDriveService()
            assert service.is_enabled() is False
    
    @patch('chordme.google_drive_service.build')
    @patch('chordme.google_drive_service.credentials.UserAccessTokenCredentials')
    def test_create_drive_service_success(self, mock_creds, mock_build, drive_service):
        """Test successful drive service creation."""
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        
        result = drive_service._create_drive_service('test_token')
        
        mock_creds.assert_called_once_with('test_token')
        mock_build.assert_called_once()
        assert result == mock_service
    
    @patch('chordme.google_drive_service.build')
    def test_create_drive_service_failure(self, mock_build, drive_service):
        """Test drive service creation failure."""
        mock_build.side_effect = Exception("API Error")
        
        result = drive_service._create_drive_service('invalid_token')
        assert result is None
    
    def test_validate_token_invalid_format(self, drive_service):
        """Test token validation with invalid format."""
        result = drive_service.validate_token('')
        assert result is False
        
        result = drive_service.validate_token(None)
        assert result is False
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_validate_token_service_creation_fails(self, mock_create, drive_service):
        """Test token validation when service creation fails."""
        mock_create.return_value = None
        
        result = drive_service.validate_token('test_token')
        assert result is False
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_validate_token_success(self, mock_create, drive_service):
        """Test successful token validation."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        mock_service.about.return_value.get.return_value.execute.return_value = {'user': {'emailAddress': 'test@example.com'}}
        
        result = drive_service.validate_token('valid_token')
        assert result is True
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_get_user_info_success(self, mock_create, drive_service):
        """Test successful user info retrieval."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        user_info = {'user': {'emailAddress': 'test@example.com', 'displayName': 'Test User'}}
        mock_service.about.return_value.get.return_value.execute.return_value = user_info
        
        result = drive_service.get_user_info('valid_token')
        assert result == user_info['user']
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_get_user_info_failure(self, mock_create, drive_service):
        """Test user info retrieval failure."""
        mock_create.return_value = None
        
        result = drive_service.get_user_info('invalid_token')
        assert result is None
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_list_files_success(self, mock_create, drive_service):
        """Test successful file listing."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        files_data = {'files': [{'id': '1', 'name': 'test.txt'}]}
        mock_service.files.return_value.list.return_value.execute.return_value = files_data
        
        result = drive_service.list_files('valid_token')
        assert result == files_data['files']
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_list_files_with_params(self, mock_create, drive_service):
        """Test file listing with query parameters."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        mock_service.files.return_value.list.return_value.execute.return_value = {'files': []}
        
        drive_service.list_files('valid_token', query="name='test'", page_size=50)
        
        mock_service.files.return_value.list.assert_called_with(
            q="name='test'",
            pageSize=50,
            fields='files(id, name, mimeType, modifiedTime, size, parents)'
        )
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_upload_file_success(self, mock_create, drive_service):
        """Test successful file upload."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        upload_result = {'id': 'new_file_id', 'name': 'test.txt'}
        mock_service.files.return_value.create.return_value.execute.return_value = upload_result
        
        result = drive_service.upload_file('valid_token', 'test.txt', b'file content')
        assert result == upload_result
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_upload_file_with_parent(self, mock_create, drive_service):
        """Test file upload with parent folder."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        mock_service.files.return_value.create.return_value.execute.return_value = {'id': 'file_id'}
        
        drive_service.upload_file('valid_token', 'test.txt', b'content', parent_folder_id='parent_id')
        
        # Verify the upload was called with correct metadata
        call_args = mock_service.files.return_value.create.call_args
        assert call_args[1]['body']['parents'] == ['parent_id']
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_download_file_success(self, mock_create, drive_service):
        """Test successful file download."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        mock_request = MagicMock()
        mock_request.execute.return_value = b'file content'
        mock_service.files.return_value.get_media.return_value = mock_request
        
        result = drive_service.download_file('valid_token', 'file_id')
        assert result == b'file content'
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_delete_file_success(self, mock_create, drive_service):
        """Test successful file deletion."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        mock_service.files.return_value.delete.return_value.execute.return_value = None
        
        result = drive_service.delete_file('valid_token', 'file_id')
        assert result is True
    
    @patch.object(GoogleDriveService, '_create_drive_service')
    def test_create_folder_success(self, mock_create, drive_service):
        """Test successful folder creation."""
        mock_service = MagicMock()
        mock_create.return_value = mock_service
        folder_result = {'id': 'folder_id', 'name': 'Test Folder'}
        mock_service.files.return_value.create.return_value.execute.return_value = folder_result
        
        result = drive_service.create_folder('valid_token', 'Test Folder')
        assert result == folder_result
    
    def test_backup_song_data_disabled(self):
        """Test song backup when service is disabled."""
        flask_app.config['GOOGLE_DRIVE_ENABLED'] = False
        with flask_app.app_context():
            service = GoogleDriveService()
            result = service.backup_song_data('token', {'title': 'Test Song'})
            assert result is None


class TestPDFGenerator:
    """Comprehensive tests for PDF generator."""
    
    @pytest.fixture
    def generator(self):
        return ChordProPDFGenerator()
    
    def test_pdf_generator_init_default(self, generator):
        """Test PDF generator initialization with defaults."""
        assert generator.paper_size == ChordProPDFGenerator.PAPER_SIZES['a4']
        assert generator.orientation == 'portrait'
        assert generator.page_size == generator.paper_size
    
    def test_pdf_generator_init_landscape(self):
        """Test PDF generator initialization with landscape orientation."""
        generator = ChordProPDFGenerator(orientation='landscape')
        assert generator.orientation == 'landscape'
        assert generator.page_size == (generator.paper_size[1], generator.paper_size[0])
    
    def test_pdf_generator_init_different_paper(self):
        """Test PDF generator with different paper sizes."""
        letter_gen = ChordProPDFGenerator(paper_size='letter')
        assert letter_gen.paper_size == ChordProPDFGenerator.PAPER_SIZES['letter']
        
        legal_gen = ChordProPDFGenerator(paper_size='legal')
        assert legal_gen.paper_size == ChordProPDFGenerator.PAPER_SIZES['legal']
    
    def test_pdf_generator_invalid_paper_size(self):
        """Test PDF generator with invalid paper size defaults to A4."""
        generator = ChordProPDFGenerator(paper_size='invalid')
        assert generator.paper_size == ChordProPDFGenerator.PAPER_SIZES['a4']
    
    def test_create_styles(self, generator):
        """Test style creation."""
        styles = generator._create_styles()
        assert 'title' in styles
        assert 'artist' in styles
        assert 'normal' in styles
        assert 'chord' in styles
    
    def test_parse_chordpro_line_simple(self, generator):
        """Test parsing simple ChordPro lines."""
        result = generator._parse_chordpro_line("Hello world")
        assert result == [('', 'Hello world')]
    
    def test_parse_chordpro_line_with_chords(self, generator):
        """Test parsing ChordPro lines with chords."""
        result = generator._parse_chordpro_line("[C]Hello [G]world")
        assert result == [('C', 'Hello '), ('G', 'world')]
    
    def test_parse_chordpro_line_chord_only(self, generator):
        """Test parsing ChordPro lines with chord only."""
        result = generator._parse_chordpro_line("[C]")
        assert result == [('C', '')]
    
    def test_parse_chordpro_content_with_directives(self, generator):
        """Test parsing ChordPro content with directives."""
        content = "{title: Test Song}\n{artist: Test Artist}\n[C]Hello world"
        title, artist, lines = generator._parse_chordpro_content(content)
        assert title == "Test Song"
        assert artist == "Test Artist"
        assert len(lines) == 1
    
    def test_parse_chordpro_content_no_directives(self, generator):
        """Test parsing ChordPro content without directives."""
        content = "[C]Hello world\n[G]Goodbye"
        title, artist, lines = generator._parse_chordpro_content(content)
        assert title == ""
        assert artist == ""
        assert len(lines) == 2
    
    def test_create_chord_line_paragraph(self, generator):
        """Test chord line paragraph creation."""
        parsed_line = [('C', 'Hello '), ('G', 'world')]
        para = generator._create_chord_line_paragraph(parsed_line)
        assert para is not None
    
    def test_generate_pdf_simple_song(self, generator):
        """Test PDF generation for simple song."""
        chordpro_content = "{title: Test Song}\n{artist: Test Artist}\n[C]Hello [G]world"
        pdf_bytes = generator.generate_pdf(chordpro_content)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    def test_generate_pdf_empty_content(self, generator):
        """Test PDF generation with empty content."""
        pdf_bytes = generator.generate_pdf("")
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
    
    def test_generate_pdf_with_metadata(self, generator):
        """Test PDF generation with custom metadata."""
        metadata = {'title': 'Custom Title', 'author': 'Custom Author'}
        pdf_bytes = generator.generate_pdf("[C]Test", metadata=metadata)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
    
    def test_generate_pdf_complex_song(self, generator):
        """Test PDF generation for complex song structure."""
        content = """
{title: Complex Song}
{artist: Test Artist}

[C]Verse 1 line 1
[Am]Verse 1 line 2

{start_of_chorus}
[F]Chorus line 1
[G]Chorus line 2
{end_of_chorus}

[C]Verse 2 line 1
[Am]Verse 2 line 2
"""
        pdf_bytes = generator.generate_pdf(content)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0


class TestPermissionHelpers:
    """Comprehensive tests for permission helpers."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        with flask_app.app_context():
            db.create_all()
            yield flask_app
            db.drop_all()
    
    @pytest.fixture
    def user(self, app):
        with app.app_context():
            user = User(email='test@example.com', password_hash='hashed')
            db.session.add(user)
            db.session.commit()
            return user
    
    @pytest.fixture
    def song(self, app, user):
        with app.app_context():
            song = Song(title='Test Song', content='[C]Test', user_id=user.id)
            db.session.add(song)
            db.session.commit()
            return song
    
    def test_security_audit_logger_basic(self, app):
        """Test basic security audit logging."""
        with app.test_request_context():
            SecurityAuditLogger.log_security_event(
                'TEST_EVENT',
                {'action': 'test'},
                user_id=1,
                ip_address='127.0.0.1'
            )
    
    def test_security_audit_logger_severity_levels(self, app):
        """Test security audit logging with different severity levels."""
        with app.test_request_context():
            for severity in ['INFO', 'WARNING', 'ERROR', 'CRITICAL']:
                SecurityAuditLogger.log_security_event(
                    'TEST_EVENT',
                    {'severity_test': severity},
                    severity=severity
                )
    
    def test_security_audit_logger_from_request_context(self, app, user):
        """Test security audit logging gets info from request context."""
        with app.test_request_context('/', headers={'User-Agent': 'Test Agent'}):
            g.current_user_id = user.id
            SecurityAuditLogger.log_security_event('REQUEST_TEST', {'test': True})
    
    def test_check_song_permission_owner(self, app, user, song):
        """Test song permission check for owner."""
        with app.app_context():
            g.current_user_id = user.id
            result = check_song_permission(song.id, 'read')
            assert result is True
    
    def test_check_song_permission_nonexistent_song(self, app, user):
        """Test song permission check for nonexistent song."""
        with app.app_context():
            g.current_user_id = user.id
            result = check_song_permission(99999, 'read')
            assert result is False
    
    def test_check_song_permission_different_user(self, app, song):
        """Test song permission check for different user."""
        with app.app_context():
            # Create another user
            other_user = User(email='other@example.com', password_hash='hashed')
            db.session.add(other_user)
            db.session.commit()
            
            g.current_user_id = other_user.id
            result = check_song_permission(song.id, 'read')
            assert result is False
    
    def test_check_song_permission_no_user(self, app, song):
        """Test song permission check with no current user."""
        with app.app_context():
            g.current_user_id = None
            result = check_song_permission(song.id, 'read')
            assert result is False
    
    def test_require_permission_decorator_success(self, app, user, song):
        """Test require_permission decorator with successful permission."""
        @require_permission('read')
        def test_function(song_id):
            return f"Success: {song_id}"
        
        with app.app_context():
            g.current_user_id = user.id
            result = test_function(song.id)
            assert result == f"Success: {song.id}"
    
    def test_require_permission_decorator_failure(self, app, song):
        """Test require_permission decorator with failed permission."""
        @require_permission('read')
        def test_function(song_id):
            return f"Success: {song_id}"
        
        with app.app_context():
            other_user = User(email='other@example.com', password_hash='hashed')
            db.session.add(other_user)
            db.session.commit()
            
            g.current_user_id = other_user.id
            result = test_function(song.id)
            
            # Should return error response
            assert isinstance(result, tuple)
            assert result[1] == 403  # Forbidden status


class TestCSRFProtection:
    """Comprehensive tests for CSRF protection."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['CSRF_ENABLED'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        return flask_app
    
    @pytest.fixture
    def csrf_protection(self, app):
        return CSRFProtection(app)
    
    def test_csrf_protection_init(self, csrf_protection):
        """Test CSRF protection initialization."""
        assert csrf_protection.app is not None
    
    def test_generate_csrf_token(self, app, csrf_protection):
        """Test CSRF token generation."""
        with app.test_request_context():
            token = csrf_protection.generate_csrf_token()
            assert isinstance(token, str)
            assert len(token) > 0
    
    def test_validate_csrf_token_valid(self, app, csrf_protection):
        """Test CSRF token validation with valid token."""
        with app.test_request_context():
            token = csrf_protection.generate_csrf_token()
            result = csrf_protection.validate_csrf_token(token)
            assert result is True
    
    def test_validate_csrf_token_invalid(self, app, csrf_protection):
        """Test CSRF token validation with invalid token."""
        with app.test_request_context():
            result = csrf_protection.validate_csrf_token('invalid_token')
            assert result is False
    
    def test_validate_csrf_token_empty(self, app, csrf_protection):
        """Test CSRF token validation with empty token."""
        with app.test_request_context():
            result = csrf_protection.validate_csrf_token('')
            assert result is False
            
            result = csrf_protection.validate_csrf_token(None)
            assert result is False
    
    def test_csrf_protection_before_request(self, app, csrf_protection):
        """Test CSRF protection in before_request handler."""
        with app.test_request_context('/', method='POST'):
            # Should handle the request without raising exception
            csrf_protection.before_request()
    
    def test_csrf_protection_exempt_methods(self, app, csrf_protection):
        """Test CSRF protection exempts GET, HEAD, OPTIONS."""
        for method in ['GET', 'HEAD', 'OPTIONS']:
            with app.test_request_context('/', method=method):
                # Should not require CSRF token
                result = csrf_protection.before_request()
                assert result is None


class TestMonitoring:
    """Comprehensive tests for security monitoring."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        return flask_app
    
    @pytest.fixture
    def monitor(self, app):
        return SecurityMonitor(app)
    
    def test_security_monitor_init(self, monitor):
        """Test security monitor initialization."""
        assert monitor.app is not None
        assert hasattr(monitor, 'threat_detection_rules')
    
    def test_log_security_event(self, app, monitor):
        """Test security event logging."""
        with app.app_context():
            monitor.log_security_event(
                'TEST_EVENT',
                {'test': True},
                'INFO'
            )
    
    def test_detect_brute_force_attack(self, app, monitor):
        """Test brute force attack detection."""
        with app.app_context():
            # Simulate multiple failed login attempts
            for i in range(10):
                monitor.record_failed_login('test@example.com', '127.0.0.1')
            
            result = monitor.detect_brute_force('test@example.com', '127.0.0.1')
            assert result is True
    
    def test_detect_suspicious_activity(self, app, monitor):
        """Test suspicious activity detection."""
        with app.app_context():
            # Test different types of suspicious activities
            result = monitor.detect_suspicious_user_agent('BadBot/1.0')
            assert result is True
            
            result = monitor.detect_suspicious_user_agent('Mozilla/5.0')
            assert result is False
    
    def test_rate_limit_tracking(self, app, monitor):
        """Test rate limit tracking."""
        with app.app_context():
            # Test rate limit for IP
            for i in range(100):
                monitor.record_request('127.0.0.1', '/api/songs')
            
            result = monitor.check_rate_limit('127.0.0.1')
            assert result is False  # Should be rate limited
    
    def test_security_metrics_collection(self, app, monitor):
        """Test security metrics collection."""
        with app.app_context():
            metrics = monitor.get_security_metrics()
            assert isinstance(metrics, dict)
            assert 'total_requests' in metrics
            assert 'failed_logins' in metrics
            assert 'blocked_ips' in metrics


class TestRateLimiter:
    """Comprehensive tests for rate limiter."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        return flask_app
    
    @pytest.fixture
    def rate_limiter(self, app):
        return RateLimiter(app)
    
    def test_rate_limiter_init(self, rate_limiter):
        """Test rate limiter initialization."""
        assert rate_limiter.app is not None
    
    def test_check_rate_limit_within_limit(self, app, rate_limiter):
        """Test rate limit check within limits."""
        with app.app_context():
            result = rate_limiter.check_rate_limit('127.0.0.1', 'api')
            assert result is True
    
    def test_check_rate_limit_exceeded(self, app, rate_limiter):
        """Test rate limit check when exceeded."""
        with app.app_context():
            # Exceed rate limit
            for i in range(1000):
                rate_limiter.record_request('127.0.0.1', 'api')
            
            result = rate_limiter.check_rate_limit('127.0.0.1', 'api')
            assert result is False
    
    def test_rate_limit_different_endpoints(self, app, rate_limiter):
        """Test rate limiting for different endpoints."""
        with app.app_context():
            # Should track different endpoints separately
            result1 = rate_limiter.check_rate_limit('127.0.0.1', 'auth')
            result2 = rate_limiter.check_rate_limit('127.0.0.1', 'songs')
            
            assert result1 is True
            assert result2 is True
    
    def test_rate_limit_cleanup(self, app, rate_limiter):
        """Test rate limit cleanup functionality."""
        with app.app_context():
            rate_limiter.cleanup_expired_entries()
            # Should complete without errors


class TestHTTPSEnforcement:
    """Comprehensive tests for HTTPS enforcement."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['HTTPS_ENFORCED'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        return flask_app
    
    @pytest.fixture
    def https_enforcement(self, app):
        return HTTPSEnforcement(app)
    
    def test_https_enforcement_init(self, https_enforcement):
        """Test HTTPS enforcement initialization."""
        assert https_enforcement.app is not None
    
    def test_is_https_request_secure(self, app, https_enforcement):
        """Test HTTPS request detection for secure requests."""
        with app.test_request_context('/', environ_base={'wsgi.url_scheme': 'https'}):
            result = https_enforcement.is_https_request()
            assert result is True
    
    def test_is_https_request_insecure(self, app, https_enforcement):
        """Test HTTPS request detection for insecure requests."""
        with app.test_request_context('/', environ_base={'wsgi.url_scheme': 'http'}):
            result = https_enforcement.is_https_request()
            assert result is False
    
    def test_should_redirect_to_https(self, app, https_enforcement):
        """Test HTTPS redirect logic."""
        with app.test_request_context('/', environ_base={'wsgi.url_scheme': 'http'}):
            result = https_enforcement.should_redirect_to_https()
            assert result is True
    
    def test_get_https_url(self, app, https_enforcement):
        """Test HTTPS URL generation."""
        with app.test_request_context('http://example.com/test'):
            https_url = https_enforcement.get_https_url()
            assert https_url.startswith('https://')
            assert 'example.com/test' in https_url
    
    def test_https_enforcement_disabled(self):
        """Test HTTPS enforcement when disabled."""
        flask_app.config['HTTPS_ENFORCED'] = False
        enforcement = HTTPSEnforcement(flask_app)
        
        with flask_app.test_request_context('/', environ_base={'wsgi.url_scheme': 'http'}):
            result = enforcement.should_redirect_to_https()
            assert result is False


class TestSecurityLogger:
    """Comprehensive tests for security logger."""
    
    @pytest.fixture
    def app(self):
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        return flask_app
    
    @pytest.fixture
    def security_logger(self, app):
        return SecurityLogger(app)
    
    def test_security_logger_init(self, security_logger):
        """Test security logger initialization."""
        assert security_logger.app is not None
    
    def test_log_authentication_event(self, app, security_logger):
        """Test authentication event logging."""
        with app.app_context():
            security_logger.log_authentication_event(
                'LOGIN_SUCCESS',
                'test@example.com',
                '127.0.0.1'
            )
    
    def test_log_authorization_event(self, app, security_logger):
        """Test authorization event logging."""
        with app.app_context():
            security_logger.log_authorization_event(
                'PERMISSION_GRANTED',
                1,  # user_id
                'song',  # resource
                'read'  # action
            )
    
    def test_log_data_access_event(self, app, security_logger):
        """Test data access event logging."""
        with app.app_context():
            security_logger.log_data_access_event(
                'SONG_ACCESSED',
                1,  # user_id
                {'song_id': 123}
            )
    
    def test_log_security_violation(self, app, security_logger):
        """Test security violation logging."""
        with app.app_context():
            security_logger.log_security_violation(
                'CSRF_TOKEN_INVALID',
                '127.0.0.1',
                {'attempted_action': 'delete_song'}
            )
    
    def test_get_security_logs(self, app, security_logger):
        """Test security logs retrieval."""
        with app.app_context():
            logs = security_logger.get_security_logs(limit=10)
            assert isinstance(logs, list)
    
    def test_security_log_filtering(self, app, security_logger):
        """Test security log filtering."""
        with app.app_context():
            # Add some logs
            security_logger.log_authentication_event('LOGIN_SUCCESS', 'user1@example.com', '127.0.0.1')
            security_logger.log_authentication_event('LOGIN_FAILED', 'user2@example.com', '192.168.1.1')
            
            # Filter by event type
            success_logs = security_logger.get_security_logs(event_type='LOGIN_SUCCESS')
            assert len(success_logs) >= 1
            
            # Filter by IP
            ip_logs = security_logger.get_security_logs(ip_address='127.0.0.1')
            assert len(ip_logs) >= 1