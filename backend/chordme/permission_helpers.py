"""
Permission checking helpers and audit logging for collaborative song editing.
"""

from flask import g, request, current_app
from functools import wraps
from .models import Song
from .utils import create_error_response
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class SecurityAuditLogger:
    """Enhanced security audit logging for collaboration activities."""
    
    @staticmethod
    def log_security_event(event_type, details, user_id=None, ip_address=None, severity='INFO'):
        """
        Log security events with comprehensive details.
        
        Args:
            event_type (str): Type of security event
            details (dict): Event details
            user_id (int): User ID involved
            ip_address (str): IP address
            severity (str): Event severity (INFO, WARNING, ERROR, CRITICAL)
        """
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'user_id': user_id or getattr(g, 'current_user_id', None),
            'ip_address': ip_address or getattr(request, 'remote_addr', None),
            'user_agent': request.headers.get('User-Agent', '') if request else '',
            'details': details,
            'severity': severity
        }
        
        # Log with appropriate level
        log_message = f"SECURITY_AUDIT: {event_type} | User: {log_entry['user_id']} | IP: {log_entry['ip_address']} | Details: {json.dumps(details)}"
        
        if severity == 'CRITICAL':
            logger.critical(log_message)
        elif severity == 'ERROR':
            logger.error(log_message)
        elif severity == 'WARNING':
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        # Also log to application logger for centralized monitoring
        current_app.logger.info(f"AUDIT: {json.dumps(log_entry)}")
        
        # Log to structured logger if available
        if hasattr(current_app, 'logger_structured'):
            current_app.logger_structured.audit(event_type, details, severity)
        
        return log_entry

    @staticmethod
    def log_access_attempt(song_id, permission_level, granted, user_id=None, details=None):
        """Log song access attempts."""
        return SecurityAuditLogger.log_security_event(
            'SONG_ACCESS_ATTEMPT',
            {
                'song_id': song_id,
                'permission_level': permission_level,
                'access_granted': granted,
                'additional_details': details or {}
            },
            user_id=user_id,
            severity='WARNING' if not granted else 'INFO'
        )

    @staticmethod
    def log_permission_bypass_attempt(song_id, attempted_action, user_id=None, details=None):
        """Log attempts to bypass permission checks."""
        return SecurityAuditLogger.log_security_event(
            'PERMISSION_BYPASS_ATTEMPT',
            {
                'song_id': song_id,
                'attempted_action': attempted_action,
                'additional_details': details or {}
            },
            user_id=user_id,
            severity='CRITICAL'
        )

    @staticmethod
    def log_suspicious_activity(activity_type, details, user_id=None, severity='WARNING'):
        """Log suspicious activities."""
        return SecurityAuditLogger.log_security_event(
            'SUSPICIOUS_ACTIVITY',
            {
                'activity_type': activity_type,
                'details': details
            },
            user_id=user_id,
            severity=severity
        )


def require_song_access(permission_level='read'):
    """
    Decorator to require specific permission level for song access.
    
    Args:
        permission_level (str): Required permission level ('read', 'edit', 'admin')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(song_id, *args, **kwargs):
            # Find the song
            song = Song.query.filter_by(id=song_id).first()
            
            if not song:
                # Log attempt to access non-existent song
                SecurityAuditLogger.log_access_attempt(
                    song_id, permission_level, False,
                    details={'reason': 'song_not_found'}
                )
                return create_error_response("Song not found", 404)
            
            # Check access permission
            has_access = song.can_user_access(g.current_user_id)
            if not has_access:
                # Log unauthorized access attempt
                SecurityAuditLogger.log_access_attempt(
                    song_id, permission_level, False,
                    details={'reason': 'no_access_permission'}
                )
                return create_error_response("Song not found", 404)  # Don't reveal existence
            
            # Check specific permission level
            if permission_level == 'edit' and not song.can_user_edit(g.current_user_id):
                SecurityAuditLogger.log_permission_bypass_attempt(
                    song_id, f'edit_without_{permission_level}_permission'
                )
                return create_error_response("Insufficient permissions to edit this song", 403)
            elif permission_level == 'admin' and not song.can_user_manage(g.current_user_id):
                SecurityAuditLogger.log_permission_bypass_attempt(
                    song_id, f'manage_without_{permission_level}_permission'
                )
                return create_error_response("Insufficient permissions to manage this song", 403)
            
            # Log successful access
            SecurityAuditLogger.log_access_attempt(
                song_id, permission_level, True
            )
            
            # Add song to request context for use in the handler
            g.current_song = song
            
            return f(song_id, *args, **kwargs)
        return decorated_function
    return decorator


def check_song_permission(song_id, user_id, permission_level='read'):
    """
    Check if user has required permission for a song.
    
    Args:
        song_id (int): ID of the song
        user_id (int): ID of the user
        permission_level (str): Required permission level ('read', 'edit', 'admin')
        
    Returns:
        tuple: (song_object, has_permission) or (None, False) if song not found or no access
    """
    song = Song.query.filter_by(id=song_id).first()
    
    if not song:
        SecurityAuditLogger.log_access_attempt(
            song_id, permission_level, False, user_id,
            details={'reason': 'song_not_found'}
        )
        return None, False
    
    # Check access permission first - if no access, pretend song doesn't exist
    if not song.can_user_access(user_id):
        SecurityAuditLogger.log_access_attempt(
            song_id, permission_level, False, user_id,
            details={'reason': 'no_access_permission'}
        )
        return None, False  # Return None to trigger 404, not 403
    
    # Check specific permission level
    has_permission = False
    if permission_level == 'read':
        has_permission = True
    elif permission_level == 'edit':
        has_permission = song.can_user_edit(user_id)
    elif permission_level == 'admin':
        has_permission = song.can_user_manage(user_id)
    
    # Log the permission check result
    SecurityAuditLogger.log_access_attempt(
        song_id, permission_level, has_permission, user_id
    )
    
    if not has_permission:
        SecurityAuditLogger.log_permission_bypass_attempt(
            song_id, f'insufficient_{permission_level}_permission', user_id
        )
    
    return song, has_permission


def log_sharing_activity(action, song_id, actor_user_id, target_user_id=None, permission_level=None, details=None):
    """
    Log sharing and permission change activities for audit purposes.
    
    Args:
        action (str): Action performed ('share_added', 'share_removed', 'permission_changed', etc.)
        song_id (int): ID of the song
        actor_user_id (int): ID of the user performing the action
        target_user_id (int, optional): ID of the user being granted/removed access
        permission_level (str, optional): Permission level involved
        details (dict, optional): Additional details to log
    """
    log_entry = {
        'action': action,
        'song_id': song_id,
        'actor_user_id': actor_user_id,
        'target_user_id': target_user_id,
        'permission_level': permission_level,
        'ip_address': getattr(request, 'remote_addr', None),
        'user_agent': request.headers.get('User-Agent', '') if request else '',
        'details': details or {}
    }
    
    # Enhanced security logging
    SecurityAuditLogger.log_security_event(
        'COLLABORATION_ACTIVITY',
        log_entry,
        user_id=actor_user_id
    )
    
    # Log the activity with original format for backward compatibility
    logger.info(f"Song sharing activity: {action} | Song: {song_id} | Actor: {actor_user_id} | Target: {target_user_id} | Permission: {permission_level} | IP: {log_entry['ip_address']}")
    
    # In a production environment, this could also:
    # - Store in a dedicated audit table
    # - Send to an external audit system
    # - Trigger notifications
    
    current_app.logger.info(f"AUDIT: {log_entry}")


def validate_permission_level(permission_level):
    """
    Validate that a permission level is valid.
    
    Args:
        permission_level (str): Permission level to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    is_valid = permission_level in ['read', 'edit', 'admin']
    
    if not is_valid:
        SecurityAuditLogger.log_suspicious_activity(
            'INVALID_PERMISSION_LEVEL',
            {'attempted_permission': permission_level},
            severity='WARNING'
        )
    
    return is_valid


def get_effective_permission(song, user_id):
    """
    Get the effective permission level for a user on a song.
    
    Args:
        song (Song): Song object
        user_id (int): User ID
        
    Returns:
        str: Effective permission level ('admin', 'edit', 'read', or None)
    """
    # Author has admin access
    if song.author_id == user_id:
        return 'admin'
    
    # Get explicit permission
    permission = song.get_user_permission(user_id)
    if permission:
        return permission
    
    # Public songs give read access
    if song.share_settings == 'public':
        return 'read'
    
    return None