"""
Session cleanup and archival utilities.
Provides automatic cleanup of inactive sessions and archival of old sessions.
"""

from datetime import datetime, timedelta
from chordme.models import CollaborationSession, SessionActivity, db
from chordme import app
import logging

logger = logging.getLogger(__name__)


class SessionCleanupService:
    """Service for managing session lifecycle and cleanup."""
    
    @staticmethod
    def cleanup_inactive_sessions(dry_run=False):
        """
        Cleanup sessions that have been inactive for too long.
        
        Args:
            dry_run (bool): If True, only report what would be cleaned up
            
        Returns:
            dict: Cleanup statistics
        """
        stats = {
            'sessions_checked': 0,
            'sessions_ended': 0,
            'sessions_archived': 0,
            'errors': []
        }
        
        try:
            with app.app_context():
                # Get all active sessions
                active_sessions = CollaborationSession.query.filter_by(status='active').all()
                stats['sessions_checked'] = len(active_sessions)
                
                for session in active_sessions:
                    try:
                        should_end, should_archive = SessionCleanupService._should_cleanup_session(session)
                        
                        if should_archive:
                            if not dry_run:
                                session.status = 'archived'
                                session.ended_at = datetime.utcnow()
                                
                                # Log archival activity
                                SessionActivity.log(
                                    session_id=session.id,
                                    user_id=session.creator_id,
                                    activity_type='session_archived',
                                    description='Session automatically archived due to inactivity',
                                    is_private=True
                                )
                            
                            stats['sessions_archived'] += 1
                            logger.info(f"Session {session.id} {'would be' if dry_run else ''} archived")
                            
                        elif should_end:
                            if not dry_run:
                                session.status = 'ended'
                                session.ended_at = datetime.utcnow()
                                
                                # Log end activity
                                SessionActivity.log(
                                    session_id=session.id,
                                    user_id=session.creator_id,
                                    activity_type='session_ended',
                                    description='Session automatically ended due to inactivity',
                                    is_private=True
                                )
                            
                            stats['sessions_ended'] += 1
                            logger.info(f"Session {session.id} {'would be' if dry_run else ''} ended")
                    
                    except Exception as e:
                        error_msg = f"Error processing session {session.id}: {str(e)}"
                        stats['errors'].append(error_msg)
                        logger.error(error_msg)
                
                if not dry_run:
                    db.session.commit()
                    
        except Exception as e:
            error_msg = f"Error during session cleanup: {str(e)}"
            stats['errors'].append(error_msg)
            logger.error(error_msg)
            if not dry_run:
                db.session.rollback()
        
        return stats
    
    @staticmethod
    def _should_cleanup_session(session):
        """
        Determine if a session should be cleaned up.
        
        Args:
            session (CollaborationSession): Session to check
            
        Returns:
            tuple: (should_end, should_archive)
        """
        now = datetime.utcnow()
        last_activity = session.last_activity
        
        # Calculate time since last activity
        inactive_hours = (now - last_activity).total_seconds() / 3600
        
        # Check for archival (longer inactivity)
        archive_threshold_days = session.archive_after or 30
        if inactive_hours >= (archive_threshold_days * 24):
            return False, True
        
        # Check for ending (shorter inactivity)
        cleanup_threshold_days = session.auto_cleanup_after or 7
        if inactive_hours >= (cleanup_threshold_days * 24):
            return True, False
        
        return False, False
    
    @staticmethod
    def create_default_templates():
        """Create default session templates if they don't exist."""
        templates = [
            {
                'name': 'Band Practice',
                'category': 'rehearsal',
                'description': 'Template for band practice sessions with structured roles',
                'max_participants': 8,
                'auto_recording': True,
                'auto_save_interval': 30,
                'permissions': {
                    'owner': ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
                    'editor': ['read', 'edit', 'comment'],
                    'viewer': ['read', 'comment'],
                    'commenter': ['read', 'comment']
                }
            },
            {
                'name': 'Music Lesson',
                'category': 'lesson',
                'description': 'Template for music lessons with teacher-student hierarchy',
                'max_participants': 5,
                'auto_recording': True,
                'auto_save_interval': 60,
                'permissions': {
                    'owner': ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
                    'editor': ['read', 'comment'],  # More restrictive for lessons
                    'viewer': ['read'],
                    'commenter': ['read', 'comment']
                }
            },
            {
                'name': 'Jam Session',
                'category': 'jamming',
                'description': 'Template for informal jamming sessions with open collaboration',
                'max_participants': 12,
                'auto_recording': False,
                'auto_save_interval': 15,
                'permissions': {
                    'owner': ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
                    'editor': ['read', 'edit', 'comment', 'add_participants'],  # More open
                    'viewer': ['read', 'comment'],
                    'commenter': ['read', 'comment']
                }
            },
            {
                'name': 'Song Arrangement',
                'category': 'arrangement',
                'description': 'Template for collaborative song arrangement work',
                'max_participants': 6,
                'auto_recording': True,
                'auto_save_interval': 20,
                'permissions': {
                    'owner': ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
                    'editor': ['read', 'edit', 'comment'],
                    'viewer': ['read', 'comment'],
                    'commenter': ['read', 'comment']
                }
            },
            {
                'name': 'Quick Review',
                'category': 'review',
                'description': 'Template for quick song reviews and feedback sessions',
                'max_participants': 4,
                'auto_recording': False,
                'auto_save_interval': 45,
                'permissions': {
                    'owner': ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
                    'editor': ['read', 'comment'],
                    'viewer': ['read', 'comment'],
                    'commenter': ['read', 'comment']
                }
            }
        ]
        
        try:
            with app.app_context():
                from chordme.models import SessionTemplate, User
                
                # Use first user as creator, or create a system user
                system_user = User.query.first()
                if not system_user:
                    logger.warning("No users found, skipping template creation")
                    return
                
                created_count = 0
                
                for template_data in templates:
                    # Check if template already exists
                    existing = SessionTemplate.query.filter_by(
                        name=template_data['name'],
                        category=template_data['category']
                    ).first()
                    
                    if not existing:
                        template = SessionTemplate(
                            name=template_data['name'],
                            category=template_data['category'],
                            created_by=system_user.id,
                            description=template_data['description'],
                            max_participants=template_data['max_participants']
                        )
                        template.auto_recording = template_data['auto_recording']
                        template.auto_save_interval = template_data['auto_save_interval']
                        template.permissions = template_data['permissions']
                        template.is_public = True
                        
                        db.session.add(template)
                        created_count += 1
                
                db.session.commit()
                logger.info(f"Created {created_count} default session templates")
                
        except Exception as e:
            logger.error(f"Error creating default templates: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def get_session_statistics():
        """Get overall session statistics."""
        try:
            with app.app_context():
                stats = {
                    'total_sessions': CollaborationSession.query.count(),
                    'active_sessions': CollaborationSession.query.filter_by(status='active').count(),
                    'ended_sessions': CollaborationSession.query.filter_by(status='ended').count(),
                    'archived_sessions': CollaborationSession.query.filter_by(status='archived').count(),
                    'total_activities': SessionActivity.query.count(),
                }
                
                # Average session duration for ended sessions
                ended_sessions = CollaborationSession.query.filter(
                    CollaborationSession.status == 'ended',
                    CollaborationSession.started_at.isnot(None),
                    CollaborationSession.ended_at.isnot(None)
                ).all()
                
                if ended_sessions:
                    total_duration = sum([
                        (session.ended_at - session.started_at).total_seconds()
                        for session in ended_sessions
                    ])
                    stats['average_session_duration_hours'] = total_duration / len(ended_sessions) / 3600
                else:
                    stats['average_session_duration_hours'] = 0
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting session statistics: {str(e)}")
            return {}


# CLI command for session cleanup (can be run via cron)
def cleanup_sessions_command():
    """CLI command for session cleanup."""
    import sys
    
    dry_run = '--dry-run' in sys.argv
    
    print(f"Running session cleanup{'(dry run)' if dry_run else ''}...")
    
    stats = SessionCleanupService.cleanup_inactive_sessions(dry_run=dry_run)
    
    print(f"Sessions checked: {stats['sessions_checked']}")
    print(f"Sessions ended: {stats['sessions_ended']}")
    print(f"Sessions archived: {stats['sessions_archived']}")
    
    if stats['errors']:
        print(f"Errors encountered: {len(stats['errors'])}")
        for error in stats['errors']:
            print(f"  - {error}")
    
    if dry_run:
        print("This was a dry run. No changes were made.")


if __name__ == '__main__':
    cleanup_sessions_command()