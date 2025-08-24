"""
Permission checking helpers and audit logging for collaborative song editing.
"""

from flask import g, request, current_app
from functools import wraps
from .models import Song
from .utils import create_error_response
import logging

logger = logging.getLogger(__name__)


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
                return create_error_response("Song not found", 404)
            
            # Check access permission
            if not song.can_user_access(g.current_user_id):
                return create_error_response("Song not found", 404)  # Don't reveal existence
            
            # Check specific permission level
            if permission_level == 'edit' and not song.can_user_edit(g.current_user_id):
                return create_error_response("Insufficient permissions to edit this song", 403)
            elif permission_level == 'admin' and not song.can_user_manage(g.current_user_id):
                return create_error_response("Insufficient permissions to manage this song", 403)
            
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
        return None, False
    
    # Check access permission first - if no access, pretend song doesn't exist
    if not song.can_user_access(user_id):
        return None, False  # Return None to trigger 404, not 403
    
    # Check specific permission level
    if permission_level == 'read':
        return song, True
    elif permission_level == 'edit':
        return song, song.can_user_edit(user_id)
    elif permission_level == 'admin':
        return song, song.can_user_manage(user_id)
    
    return song, False


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
    
    # Log the activity
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
    return permission_level in ['read', 'edit', 'admin']


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