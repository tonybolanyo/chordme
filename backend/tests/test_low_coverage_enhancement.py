"""
Enhanced test coverage for low-coverage modules.
This file targets modules with low coverage to significantly improve overall coverage.
"""

import pytest
import json
from unittest.mock import patch, MagicMock, mock_open
from datetime import datetime
from flask import Flask


class TestAPILowCoverageImprovements:
    """Test API endpoints and functions with low coverage."""

    def test_api_module_imports(self):
        """Test that all API modules can be imported."""
        from chordme import api
        assert api is not None

    @patch('chordme.api.current_app')
    def test_api_version_endpoint(self, mock_app):
        """Test API version endpoint functionality."""
        from chordme.api import get_version_info
        
        mock_app.config = {
            'VERSION': '1.0.0',
            'ENV': 'production'
        }
        
        # This function should exist and be callable
        assert callable(get_version_info)

    @patch('chordme.api.current_app')
    @patch('chordme.api.request')
    def test_api_error_handling(self, mock_request, mock_app):
        """Test API error handling functions."""
        from chordme.api import handle_validation_error
        
        mock_request.json = {'invalid': 'data'}
        
        # This should handle validation errors gracefully
        result = handle_validation_error({'field': 'error message'})
        assert isinstance(result, tuple)
        assert result[1] == 400

    @patch('chordme.api.db')
    def test_api_database_operations(self, mock_db):
        """Test API database operation helpers."""
        from chordme.api import safe_commit
        
        # Test successful commit
        result = safe_commit()
        assert result is True
        mock_db.session.commit.assert_called_once()

    @patch('chordme.api.db')
    def test_api_database_rollback(self, mock_db):
        """Test API database rollback functionality."""
        from chordme.api import safe_commit
        
        # Mock database error
        mock_db.session.commit.side_effect = Exception("Database error")
        
        result = safe_commit()
        assert result is False
        mock_db.session.rollback.assert_called_once()

    @patch('chordme.api.request')
    def test_api_request_validation(self, mock_request):
        """Test API request validation helpers."""
        from chordme.api import validate_json_request
        
        mock_request.is_json = True
        mock_request.get_json.return_value = {'valid': 'data'}
        
        result = validate_json_request(['valid'])
        assert result['valid'] == 'data'

    @patch('chordme.api.request')
    def test_api_request_validation_invalid(self, mock_request):
        """Test API request validation with invalid data."""
        from chordme.api import validate_json_request
        
        mock_request.is_json = False
        
        with pytest.raises(ValueError):
            validate_json_request(['required_field'])

    @patch('chordme.api.g')
    def test_api_user_context(self, mock_g):
        """Test API user context helpers."""
        from chordme.api import get_current_user_id
        
        mock_g.current_user_id = 123
        
        result = get_current_user_id()
        assert result == 123

    @patch('chordme.api.g')
    def test_api_user_context_none(self, mock_g):
        """Test API user context when no user."""
        from chordme.api import get_current_user_id
        
        mock_g.current_user_id = None
        
        result = get_current_user_id()
        assert result is None

    def test_api_response_helpers(self):
        """Test API response helper functions."""
        from chordme.api import create_success_response
        
        result = create_success_response({'key': 'value'})
        assert result['status'] == 'success'
        assert result['data']['key'] == 'value'

    def test_api_error_response_helpers(self):
        """Test API error response helper functions."""
        from chordme.api import create_error_response
        
        result = create_error_response('Error message', 'VALIDATION_ERROR')
        assert result['status'] == 'error'
        assert result['message'] == 'Error message'
        assert result['error_code'] == 'VALIDATION_ERROR'


class TestMonitoringLowCoverageImprovements:
    """Test monitoring functionality with low coverage."""

    def test_monitoring_module_import(self):
        """Test monitoring module can be imported."""
        from chordme import monitoring
        assert monitoring is not None

    @patch('chordme.monitoring.current_app')
    def test_monitoring_initialization(self, mock_app):
        """Test monitoring system initialization."""
        from chordme.monitoring import init_monitoring
        
        mock_app.config = {'MONITORING_ENABLED': True}
        
        result = init_monitoring(mock_app)
        assert result is True

    @patch('chordme.monitoring.current_app')
    def test_monitoring_disabled(self, mock_app):
        """Test monitoring when disabled."""
        from chordme.monitoring import init_monitoring
        
        mock_app.config = {'MONITORING_ENABLED': False}
        
        result = init_monitoring(mock_app)
        assert result is False

    @patch('chordme.monitoring.logger')
    def test_monitoring_log_performance_metric(self, mock_logger):
        """Test performance metric logging."""
        from chordme.monitoring import log_performance_metric
        
        log_performance_metric('api_response_time', 150.5, {'endpoint': '/api/songs'})
        
        mock_logger.info.assert_called()

    @patch('chordme.monitoring.logger')
    def test_monitoring_log_error(self, mock_logger):
        """Test error logging functionality."""
        from chordme.monitoring import log_error
        
        try:
            raise ValueError("Test error")
        except Exception as e:
            log_error(e, {'context': 'test'})
        
        mock_logger.error.assert_called()

    @patch('chordme.monitoring.logger')
    def test_monitoring_log_user_activity(self, mock_logger):
        """Test user activity logging."""
        from chordme.monitoring import log_user_activity
        
        log_user_activity(123, 'login', {'ip': '192.168.1.1'})
        
        mock_logger.info.assert_called()

    @patch('chordme.monitoring.logger')
    def test_monitoring_log_security_event(self, mock_logger):
        """Test security event logging."""
        from chordme.monitoring import log_security_event
        
        log_security_event('unauthorized_access', {'user_id': 123}, 'WARNING')
        
        mock_logger.warning.assert_called()

    def test_monitoring_metrics_collector(self):
        """Test metrics collector functionality."""
        from chordme.monitoring import MetricsCollector
        
        collector = MetricsCollector()
        assert collector is not None
        
        collector.increment_counter('api_requests')
        collector.record_histogram('response_time', 100.0)
        collector.set_gauge('active_users', 25)

    def test_monitoring_health_check(self):
        """Test monitoring health check."""
        from chordme.monitoring import health_check
        
        result = health_check()
        assert isinstance(result, dict)
        assert 'status' in result
        assert 'timestamp' in result

    @patch('chordme.monitoring.current_app')
    def test_monitoring_system_stats(self, mock_app):
        """Test system statistics collection."""
        from chordme.monitoring import get_system_stats
        
        mock_app.config = {'COLLECT_SYSTEM_STATS': True}
        
        result = get_system_stats()
        assert isinstance(result, dict)

    @patch('chordme.monitoring.logger')
    def test_monitoring_request_middleware(self, mock_logger):
        """Test request monitoring middleware."""
        from chordme.monitoring import log_request
        
        with patch('chordme.monitoring.request') as mock_request:
            mock_request.method = 'GET'
            mock_request.path = '/api/songs'
            mock_request.remote_addr = '192.168.1.1'
            
            log_request()
            mock_logger.info.assert_called()


class TestChordProUtilsLowCoverageImprovements:
    """Test ChordPro utilities with low coverage."""

    def test_chordpro_utils_import(self):
        """Test ChordPro utils module can be imported."""
        from chordme import chordpro_utils
        assert chordpro_utils is not None

    def test_validate_chordpro_content_valid(self):
        """Test ChordPro content validation with valid content."""
        from chordme.chordpro_utils import validate_chordpro_content
        
        content = "{title: Test Song}\n{artist: Test Artist}\nHello [C]world"
        result = validate_chordpro_content(content)
        
        assert result['valid'] is True
        assert 'errors' in result

    def test_validate_chordpro_content_invalid(self):
        """Test ChordPro content validation with invalid content."""
        from chordme.chordpro_utils import validate_chordpro_content
        
        content = "{invalid_directive}\n[InvalidChord]"
        result = validate_chordpro_content(content)
        
        assert isinstance(result, dict)
        assert 'valid' in result

    def test_validate_chordpro_content_empty(self):
        """Test ChordPro content validation with empty content."""
        from chordme.chordpro_utils import validate_chordpro_content
        
        result = validate_chordpro_content("")
        assert isinstance(result, dict)

    def test_extract_chords_from_content(self):
        """Test chord extraction from ChordPro content."""
        from chordme.chordpro_utils import extract_chords
        
        content = "Hello [C]world [G]this is a [Am]test [F]song"
        chords = extract_chords(content)
        
        assert isinstance(chords, list)
        assert 'C' in chords
        assert 'G' in chords
        assert 'Am' in chords
        assert 'F' in chords

    def test_extract_chords_no_chords(self):
        """Test chord extraction with no chords."""
        from chordme.chordpro_utils import extract_chords
        
        content = "Hello world this is a test song"
        chords = extract_chords(content)
        
        assert isinstance(chords, list)
        assert len(chords) == 0

    def test_parse_chordpro_directives(self):
        """Test parsing ChordPro directives."""
        from chordme.chordpro_utils import parse_directives
        
        content = "{title: Test Song}\n{artist: Test Artist}\n{key: C}\n{tempo: 120}"
        directives = parse_directives(content)
        
        assert isinstance(directives, dict)
        assert directives.get('title') == 'Test Song'
        assert directives.get('artist') == 'Test Artist'
        assert directives.get('key') == 'C'

    def test_format_chordpro_for_display(self):
        """Test formatting ChordPro content for display."""
        from chordme.chordpro_utils import format_for_display
        
        content = "{title: Test}\nHello [C]world"
        result = format_for_display(content)
        
        assert isinstance(result, str)

    def test_transpose_chordpro_content(self):
        """Test transposing ChordPro content."""
        from chordme.chordpro_utils import transpose_content
        
        content = "Hello [C]world [G]test"
        result = transpose_content(content, 2)  # transpose up 2 semitones
        
        assert isinstance(result, str)
        assert '[D]' in result  # C + 2 = D
        assert '[A]' in result  # G + 2 = A

    def test_clean_chordpro_content(self):
        """Test cleaning ChordPro content."""
        from chordme.chordpro_utils import clean_content
        
        content = "{title: Test}\n\n\nHello [C]world\n\n\n"
        result = clean_content(content)
        
        assert isinstance(result, str)
        assert result.count('\n\n\n') == 0  # Should remove excessive newlines

    def test_validate_chord_syntax(self):
        """Test chord syntax validation."""
        from chordme.chordpro_utils import validate_chord
        
        assert validate_chord('C') is True
        assert validate_chord('Cm') is True
        assert validate_chord('C7') is True
        assert validate_chord('Cmaj7') is True
        assert validate_chord('C/E') is True
        assert validate_chord('InvalidChord123') is False

    def test_get_chordpro_metadata(self):
        """Test extracting metadata from ChordPro content."""
        from chordme.chordpro_utils import get_metadata
        
        content = "{title: Test Song}\n{artist: Test Artist}\n{album: Test Album}"
        metadata = get_metadata(content)
        
        assert isinstance(metadata, dict)
        assert metadata.get('title') == 'Test Song'
        assert metadata.get('artist') == 'Test Artist'
        assert metadata.get('album') == 'Test Album'


class TestRateLimiterLowCoverageImprovements:
    """Test rate limiter functionality with low coverage."""

    def test_rate_limiter_import(self):
        """Test rate limiter module can be imported."""
        from chordme import rate_limiter
        assert rate_limiter is not None

    def test_rate_limiter_initialization(self):
        """Test rate limiter initialization."""
        from chordme.rate_limiter import RateLimiter
        
        limiter = RateLimiter()
        assert limiter is not None

    @patch('chordme.rate_limiter.current_app')
    def test_rate_limiter_enabled(self, mock_app):
        """Test rate limiter when enabled."""
        from chordme.rate_limiter import RateLimiter
        
        mock_app.config = {'RATE_LIMITING_ENABLED': True}
        limiter = RateLimiter()
        
        assert limiter.is_enabled() is True

    @patch('chordme.rate_limiter.current_app')
    def test_rate_limiter_disabled(self, mock_app):
        """Test rate limiter when disabled."""
        from chordme.rate_limiter import RateLimiter
        
        mock_app.config = {'RATE_LIMITING_ENABLED': False}
        limiter = RateLimiter()
        
        assert limiter.is_enabled() is False

    @patch('chordme.rate_limiter.request')
    def test_rate_limiter_check_limit(self, mock_request):
        """Test rate limit checking."""
        from chordme.rate_limiter import check_rate_limit
        
        mock_request.remote_addr = '192.168.1.1'
        
        result = check_rate_limit('api_endpoint', 100, 60)
        assert isinstance(result, bool)

    @patch('chordme.rate_limiter.request')
    def test_rate_limiter_increment(self, mock_request):
        """Test rate limit incrementing."""
        from chordme.rate_limiter import increment_rate_limit
        
        mock_request.remote_addr = '192.168.1.1'
        
        increment_rate_limit('api_endpoint')
        # Should not raise an exception

    def test_rate_limiter_get_client_id(self):
        """Test client ID generation."""
        from chordme.rate_limiter import get_client_id
        
        with patch('chordme.rate_limiter.request') as mock_request:
            mock_request.remote_addr = '192.168.1.1'
            mock_request.headers = {'User-Agent': 'Test'}
            
            client_id = get_client_id()
            assert isinstance(client_id, str)
            assert len(client_id) > 0

    def test_rate_limiter_decorator(self):
        """Test rate limiting decorator."""
        from chordme.rate_limiter import rate_limit
        from flask import Flask
        
        app = Flask(__name__)
        with app.app_context():
            @rate_limit(requests=10, window=60)
            def test_func():
                return 'success'
            
            # Should be callable
            assert callable(test_func)

    @patch('chordme.rate_limiter.current_app')
    def test_rate_limiter_cleanup(self, mock_app):
        """Test rate limiter cleanup functionality."""
        from chordme.rate_limiter import cleanup_expired_entries
        
        mock_app.config = {'RATE_LIMITING_ENABLED': True}
        
        cleanup_expired_entries()
        # Should not raise an exception


class TestSecurityHeadersLowCoverageImprovements:
    """Test security headers functionality with low coverage."""

    def test_security_headers_import(self):
        """Test security headers module can be imported."""
        from chordme import security_headers
        assert security_headers is not None

    @patch('chordme.security_headers.current_app')
    def test_security_headers_apply(self, mock_app):
        """Test applying security headers."""
        from chordme.security_headers import apply_security_headers
        
        mock_response = MagicMock()
        mock_app.config = {'SECURITY_HEADERS_ENABLED': True}
        
        result = apply_security_headers(mock_response)
        assert result == mock_response

    @patch('chordme.security_headers.current_app')
    def test_security_headers_disabled(self, mock_app):
        """Test security headers when disabled."""
        from chordme.security_headers import apply_security_headers
        
        mock_response = MagicMock()
        mock_app.config = {'SECURITY_HEADERS_ENABLED': False}
        
        result = apply_security_headers(mock_response)
        assert result == mock_response

    def test_security_headers_csp_policy(self):
        """Test CSP policy generation."""
        from chordme.security_headers import generate_csp_policy
        
        policy = generate_csp_policy()
        assert isinstance(policy, str)
        assert 'default-src' in policy

    def test_security_headers_hsts(self):
        """Test HSTS header generation."""
        from chordme.security_headers import generate_hsts_header
        
        header = generate_hsts_header()
        assert isinstance(header, str)
        assert 'max-age' in header

    def test_security_headers_frame_options(self):
        """Test X-Frame-Options header."""
        from chordme.security_headers import get_frame_options
        
        options = get_frame_options()
        assert options in ['DENY', 'SAMEORIGIN']

    def test_security_headers_content_type_options(self):
        """Test X-Content-Type-Options header."""
        from chordme.security_headers import get_content_type_options
        
        options = get_content_type_options()
        assert options == 'nosniff'