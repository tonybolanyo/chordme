"""
Enhanced logging configuration and utilities for ChordMe application.
Provides structured logging, performance monitoring, and audit capabilities.
"""

import logging
import json
import time
from datetime import datetime
from functools import wraps
from flask import request, g, current_app
from typing import Dict, Any, Optional

# Configure logging format
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

class StructuredLogger:
    """Enhanced structured logging with performance and audit capabilities."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        
    def _create_log_entry(self, level: str, message: str, **kwargs) -> Dict[str, Any]:
        """Create a structured log entry with context information."""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'message': message,
            'service': 'chordme-backend',
        }
        
        # Add request context if available
        try:
            if request:
                entry.update({
                    'request_id': getattr(g, 'request_id', None),
                    'method': request.method,
                    'url': request.url,
                    'remote_addr': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent', ''),
                    'user_id': getattr(g, 'current_user_id', None),
                })
        except RuntimeError:
            # Request context not available (e.g., during testing)
            pass
        
        # Add any additional context
        entry.update(kwargs)
        
        return entry
    
    def info(self, message: str, **kwargs):
        """Log info level message with structured data."""
        entry = self._create_log_entry('INFO', message, **kwargs)
        self.logger.info(json.dumps(entry))
    
    def warning(self, message: str, **kwargs):
        """Log warning level message with structured data."""
        entry = self._create_log_entry('WARNING', message, **kwargs)
        self.logger.warning(json.dumps(entry))
    
    def error(self, message: str, **kwargs):
        """Log error level message with structured data."""
        entry = self._create_log_entry('ERROR', message, **kwargs)
        self.logger.error(json.dumps(entry))
    
    def critical(self, message: str, **kwargs):
        """Log critical level message with structured data."""
        entry = self._create_log_entry('CRITICAL', message, **kwargs)
        self.logger.critical(json.dumps(entry))
    
    def audit(self, event_type: str, details: Dict[str, Any], severity: str = 'INFO'):
        """Log audit events for compliance and security monitoring."""
        entry = self._create_log_entry(severity, f'AUDIT: {event_type}', 
                                     event_type=event_type, 
                                     audit_details=details,
                                     category='audit')
        getattr(self.logger, severity.lower())(json.dumps(entry))


class PerformanceLogger:
    """Performance monitoring and metrics logging."""
    
    def __init__(self, logger: StructuredLogger):
        self.logger = logger
    
    def log_request_performance(self, duration: float, status_code: int, **kwargs):
        """Log request performance metrics."""
        self.logger.info(
            f"Request completed in {duration:.3f}s",
            duration_ms=duration * 1000,
            status_code=status_code,
            category='performance',
            metric_type='request_duration',
            **kwargs
        )
    
    def log_database_query(self, query_type: str, duration: float, **kwargs):
        """Log database query performance."""
        self.logger.info(
            f"Database query ({query_type}) completed in {duration:.3f}s",
            query_type=query_type,
            duration_ms=duration * 1000,
            category='performance',
            metric_type='database_query',
            **kwargs
        )
    
    def log_slow_operation(self, operation: str, duration: float, threshold: float = 1.0, **kwargs):
        """Log operations that exceed performance thresholds."""
        if duration > threshold:
            self.logger.warning(
                f"Slow operation detected: {operation} took {duration:.3f}s",
                operation=operation,
                duration_ms=duration * 1000,
                threshold_ms=threshold * 1000,
                category='performance',
                metric_type='slow_operation',
                **kwargs
            )


def setup_logging(app):
    """Initialize application logging configuration."""
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, app.config.get('LOG_LEVEL', 'INFO')),
        format=LOG_FORMAT
    )
    
    # Create application logger
    app_logger = StructuredLogger('chordme')
    
    # Add performance logger
    perf_logger = PerformanceLogger(app_logger)
    
    # Store loggers in app context
    app.logger_structured = app_logger
    app.logger_performance = perf_logger
    
    app_logger.info("Logging system initialized", 
                   log_level=app.config.get('LOG_LEVEL', 'INFO'))


def log_request_metrics(f):
    """Decorator to log request performance metrics."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        try:
            # Execute the request
            result = f(*args, **kwargs)
            status_code = getattr(result, 'status_code', 200)
            
            # Log successful request
            duration = time.time() - start_time
            current_app.logger_performance.log_request_performance(
                duration=duration,
                status_code=status_code,
                endpoint=request.endpoint,
                success=True
            )
            
            return result
            
        except Exception as e:
            # Log failed request
            duration = time.time() - start_time
            current_app.logger_performance.log_request_performance(
                duration=duration,
                status_code=500,
                endpoint=request.endpoint,
                success=False,
                error=str(e)
            )
            
            # Re-raise the exception
            raise
    
    return decorated_function


def log_database_operation(operation_type: str):
    """Decorator to log database operation performance."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = f(*args, **kwargs)
                duration = time.time() - start_time
                
                current_app.logger_performance.log_database_query(
                    query_type=operation_type,
                    duration=duration,
                    success=True
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                current_app.logger_performance.log_database_query(
                    query_type=operation_type,
                    duration=duration,
                    success=False,
                    error=str(e)
                )
                
                raise
        
        return decorated_function
    return decorator