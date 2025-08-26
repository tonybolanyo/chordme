"""
Tests for logging configuration and performance monitoring.
"""
import pytest
import json
import time
from unittest.mock import patch, MagicMock
from flask import Flask
from chordme.logging_config import StructuredLogger, PerformanceLogger, setup_logging, log_request_metrics, log_database_operation


class TestStructuredLogger:
    """Test structured logging functionality."""
    
    def test_structured_logger_initialization(self):
        """Test that structured logger initializes correctly."""
        logger = StructuredLogger('test')
        assert logger.logger.name == 'test'
    
    def test_log_entry_creation(self):
        """Test that log entries are created with proper structure."""
        logger = StructuredLogger('test')
        
        # Test without request context (should work fine)
        entry = logger._create_log_entry('INFO', 'Test message', custom_field='test_value')
        
        assert entry['level'] == 'INFO'
        assert entry['message'] == 'Test message'
        assert entry['service'] == 'chordme-backend'
        assert entry['custom_field'] == 'test_value'
        assert 'timestamp' in entry
    
    def test_audit_logging(self):
        """Test audit logging functionality."""
        logger = StructuredLogger('test')
        
        with patch.object(logger.logger, 'info') as mock_log:
            logger.audit('USER_LOGIN', {'user_id': 123}, 'INFO')
            
            mock_log.assert_called_once()
            log_call = mock_log.call_args[0][0]
            log_data = json.loads(log_call)
            
            assert log_data['level'] == 'INFO'
            assert log_data['event_type'] == 'USER_LOGIN'
            assert log_data['audit_details']['user_id'] == 123
            assert log_data['category'] == 'audit'


class TestPerformanceLogger:
    """Test performance logging functionality."""
    
    def test_performance_logger_initialization(self):
        """Test that performance logger initializes correctly."""
        structured_logger = StructuredLogger('test')
        perf_logger = PerformanceLogger(structured_logger)
        assert perf_logger.logger == structured_logger
    
    def test_request_performance_logging(self):
        """Test request performance logging."""
        structured_logger = StructuredLogger('test')
        perf_logger = PerformanceLogger(structured_logger)
        
        with patch.object(structured_logger, 'info') as mock_log:
            perf_logger.log_request_performance(1.5, 200, endpoint='/test')
            
            mock_log.assert_called_once()
            call_args = mock_log.call_args
            
            assert 'Request completed in 1.500s' in call_args[0][0]
            assert call_args[1]['duration_ms'] == 1500
            assert call_args[1]['status_code'] == 200
            assert call_args[1]['category'] == 'performance'
    
    def test_database_query_logging(self):
        """Test database query performance logging."""
        structured_logger = StructuredLogger('test')
        perf_logger = PerformanceLogger(structured_logger)
        
        with patch.object(structured_logger, 'info') as mock_log:
            perf_logger.log_database_query('SELECT', 0.5, table='users')
            
            mock_log.assert_called_once()
            call_args = mock_log.call_args
            
            assert 'Database query (SELECT) completed in 0.500s' in call_args[0][0]
            assert call_args[1]['query_type'] == 'SELECT'
            assert call_args[1]['duration_ms'] == 500
            assert call_args[1]['table'] == 'users'
    
    def test_slow_operation_logging(self):
        """Test slow operation detection and logging."""
        structured_logger = StructuredLogger('test')
        perf_logger = PerformanceLogger(structured_logger)
        
        with patch.object(structured_logger, 'warning') as mock_log:
            # Should log warning for slow operation
            perf_logger.log_slow_operation('file_upload', 2.5, threshold=1.0)
            
            mock_log.assert_called_once()
            call_args = mock_log.call_args
            
            assert 'Slow operation detected' in call_args[0][0]
            assert call_args[1]['operation'] == 'file_upload'
            assert call_args[1]['duration_ms'] == 2500
        
        with patch.object(structured_logger, 'warning') as mock_log:
            # Should not log for fast operation
            perf_logger.log_slow_operation('fast_operation', 0.5, threshold=1.0)
            
            mock_log.assert_not_called()


class TestLoggingDecorators:
    """Test logging decorators."""
    
    def test_log_request_metrics_decorator(self):
        """Test request metrics logging decorator."""
        app = Flask(__name__)
        app.logger_performance = MagicMock()
        
        with app.app_context():
            @log_request_metrics
            def test_endpoint():
                time.sleep(0.1)  # Simulate some work
                return 'success', 200
            
            with app.test_request_context('/test'):
                result = test_endpoint()
                
                assert result == ('success', 200)
                app.logger_performance.log_request_performance.assert_called_once()
                
                call_args = app.logger_performance.log_request_performance.call_args[1]
                assert call_args['status_code'] == 200
                assert call_args['success'] is True
                assert call_args['duration'] > 0
    
    def test_log_request_metrics_decorator_error_handling(self):
        """Test request metrics decorator handles errors correctly."""
        app = Flask(__name__)
        app.logger_performance = MagicMock()
        
        with app.app_context():
            @log_request_metrics
            def failing_endpoint():
                raise ValueError("Test error")
            
            with app.test_request_context('/test'):
                with pytest.raises(ValueError):
                    failing_endpoint()
                
                app.logger_performance.log_request_performance.assert_called_once()
                
                call_args = app.logger_performance.log_request_performance.call_args[1]
                assert call_args['status_code'] == 500
                assert call_args['success'] is False
                assert 'error' in call_args
    
    def test_log_database_operation_decorator(self):
        """Test database operation logging decorator."""
        app = Flask(__name__)
        app.logger_performance = MagicMock()
        
        with app.app_context():
            @log_database_operation('INSERT')
            def insert_user():
                time.sleep(0.05)  # Simulate database operation
                return {'id': 1, 'name': 'Test User'}
            
            result = insert_user()
            
            assert result == {'id': 1, 'name': 'Test User'}
            app.logger_performance.log_database_query.assert_called_once()
            
            call_args = app.logger_performance.log_database_query.call_args[1]
            assert call_args['query_type'] == 'INSERT'
            assert call_args['success'] is True
            assert call_args['duration'] > 0


class TestLoggingSetup:
    """Test logging setup functionality."""
    
    def test_setup_logging(self):
        """Test that logging setup configures the application correctly."""
        app = Flask(__name__)
        app.config['LOG_LEVEL'] = 'DEBUG'
        
        setup_logging(app)
        
        assert hasattr(app, 'logger_structured')
        assert hasattr(app, 'logger_performance')
        assert app.logger_structured.__class__.__name__ == 'StructuredLogger'
        assert app.logger_performance.__class__.__name__ == 'PerformanceLogger'
    
    def test_setup_logging_default_level(self):
        """Test that logging setup uses default log level when not specified."""
        app = Flask(__name__)
        
        with patch('chordme.logging_config.logging.basicConfig') as mock_config:
            setup_logging(app)
            
            mock_config.assert_called_once()
            # Check that INFO level is used as default
            assert mock_config.call_args[1]['level'] == 20  # logging.INFO = 20


if __name__ == '__main__':
    pytest.main([__file__])