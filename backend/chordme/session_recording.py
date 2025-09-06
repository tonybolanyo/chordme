"""
Session recording and playback functionality.
Provides the ability to record collaboration sessions and play them back.
"""

from datetime import datetime
from chordme.models import CollaborationSession, SessionActivity, db
from chordme import app
import json
import logging

logger = logging.getLogger(__name__)


class SessionRecording:
    """Model for storing session recordings."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.recording_started = None
        self.recording_data = []
        self.is_recording = False
    
    def start_recording(self):
        """Start recording the session."""
        self.recording_started = datetime.utcnow()
        self.is_recording = True
        self.recording_data = []
        
        # Log recording start
        SessionActivity.log(
            session_id=self.session_id,
            user_id=0,  # System user
            activity_type='recording_started',
            description='Session recording started'
        )
    
    def stop_recording(self):
        """Stop recording the session."""
        self.is_recording = False
        
        # Log recording stop
        SessionActivity.log(
            session_id=self.session_id,
            user_id=0,  # System user
            activity_type='recording_stopped',
            description=f'Session recording stopped. Captured {len(self.recording_data)} events.'
        )
    
    def record_event(self, event_type: str, user_id: int, data: dict, timestamp: datetime = None):
        """Record an event during the session."""
        if not self.is_recording:
            return
        
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Calculate relative timestamp from recording start
        relative_time = (timestamp - self.recording_started).total_seconds()
        
        event = {
            'type': event_type,
            'user_id': user_id,
            'data': data,
            'timestamp': timestamp.isoformat(),
            'relative_time': relative_time
        }
        
        self.recording_data.append(event)
    
    def get_recording_data(self):
        """Get the recording data."""
        return {
            'session_id': self.session_id,
            'started': self.recording_started.isoformat() if self.recording_started else None,
            'duration': len(self.recording_data),
            'events': self.recording_data
        }
    
    def export_recording(self, format='json'):
        """Export recording data in specified format."""
        data = self.get_recording_data()
        
        if format == 'json':
            return json.dumps(data, indent=2)
        elif format == 'csv':
            # Simple CSV export
            lines = ['type,user_id,relative_time,timestamp,data']
            for event in data['events']:
                lines.append(f"{event['type']},{event['user_id']},{event['relative_time']},{event['timestamp']},\"{json.dumps(event['data'])}\"")
            return '\n'.join(lines)
        else:
            raise ValueError(f"Unsupported export format: {format}")


class SessionPlayback:
    """Service for playing back recorded sessions."""
    
    def __init__(self, recording_data: dict):
        self.recording_data = recording_data
        self.events = recording_data.get('events', [])
        self.current_position = 0
        self.playback_speed = 1.0
    
    def get_events_at_time(self, relative_time: float):
        """Get all events that should be played at the given relative time."""
        events = []
        
        for event in self.events:
            if event['relative_time'] <= relative_time:
                if event not in events:
                    events.append(event)
        
        return events
    
    def get_next_event(self):
        """Get the next event in the playback."""
        if self.current_position < len(self.events):
            event = self.events[self.current_position]
            self.current_position += 1
            return event
        return None
    
    def seek_to_time(self, relative_time: float):
        """Seek to a specific time in the recording."""
        self.current_position = 0
        
        for i, event in enumerate(self.events):
            if event['relative_time'] > relative_time:
                break
            self.current_position = i + 1
    
    def get_playback_info(self):
        """Get information about the playback state."""
        total_duration = self.events[-1]['relative_time'] if self.events else 0
        current_time = self.events[self.current_position - 1]['relative_time'] if self.current_position > 0 else 0
        
        return {
            'total_events': len(self.events),
            'current_position': self.current_position,
            'total_duration': total_duration,
            'current_time': current_time,
            'playback_speed': self.playback_speed,
            'progress_percentage': (current_time / total_duration * 100) if total_duration > 0 else 0
        }


class SessionRecordingManager:
    """Manager for session recordings."""
    
    def __init__(self):
        self.active_recordings = {}
    
    def start_session_recording(self, session_id: str):
        """Start recording a session."""
        try:
            with app.app_context():
                session = CollaborationSession.query.get(session_id)
                if not session:
                    raise ValueError("Session not found")
                
                if session_id in self.active_recordings:
                    raise ValueError("Session is already being recorded")
                
                recording = SessionRecording(session_id)
                recording.start_recording()
                
                self.active_recordings[session_id] = recording
                
                # Update session model
                session.is_recording = True
                db.session.commit()
                
                logger.info(f"Started recording session {session_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error starting recording for session {session_id}: {str(e)}")
            return False
    
    def stop_session_recording(self, session_id: str):
        """Stop recording a session."""
        try:
            with app.app_context():
                if session_id not in self.active_recordings:
                    raise ValueError("Session is not being recorded")
                
                recording = self.active_recordings[session_id]
                recording.stop_recording()
                
                # Update session model
                session = CollaborationSession.query.get(session_id)
                if session:
                    session.is_recording = False
                    db.session.commit()
                
                # Save recording data (in a real implementation, this would go to persistent storage)
                recording_data = recording.get_recording_data()
                
                # Remove from active recordings
                del self.active_recordings[session_id]
                
                logger.info(f"Stopped recording session {session_id}")
                return recording_data
                
        except Exception as e:
            logger.error(f"Error stopping recording for session {session_id}: {str(e)}")
            return None
    
    def record_event(self, session_id: str, event_type: str, user_id: int, data: dict):
        """Record an event for a session."""
        if session_id in self.active_recordings:
            recording = self.active_recordings[session_id]
            recording.record_event(event_type, user_id, data)
    
    def get_recording_status(self, session_id: str):
        """Get recording status for a session."""
        if session_id in self.active_recordings:
            recording = self.active_recordings[session_id]
            return {
                'is_recording': recording.is_recording,
                'started': recording.recording_started.isoformat() if recording.recording_started else None,
                'events_count': len(recording.recording_data)
            }
        return {'is_recording': False}
    
    def create_playback(self, recording_data: dict):
        """Create a playback instance for recorded data."""
        return SessionPlayback(recording_data)


# Global recording manager instance
recording_manager = SessionRecordingManager()


# Event types that can be recorded
RECORDABLE_EVENTS = {
    'user_joined': 'User joined session',
    'user_left': 'User left session',
    'content_edited': 'Content was edited',
    'cursor_moved': 'User moved cursor',
    'comment_added': 'Comment was added',
    'permission_changed': 'User permission changed',
    'session_paused': 'Session was paused',
    'session_resumed': 'Session was resumed'
}


def record_session_event(session_id: str, event_type: str, user_id: int, data: dict = None):
    """
    Convenience function to record session events.
    
    Args:
        session_id: ID of the session
        event_type: Type of event (from RECORDABLE_EVENTS)
        user_id: ID of the user who triggered the event
        data: Additional event data
    """
    if event_type not in RECORDABLE_EVENTS:
        logger.warning(f"Unknown event type for recording: {event_type}")
        return
    
    recording_manager.record_event(session_id, event_type, user_id, data or {})


# Integration with existing collaboration service
def integrate_with_collaboration():
    """
    This function would integrate recording with the existing collaboration service.
    In practice, you would call record_session_event() from various points in the
    collaboration system where events occur.
    """
    pass