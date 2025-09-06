# Collaborative Session Management

This document describes the collaborative session management system implemented for ChordMe.

## Overview

The collaborative session management system provides comprehensive support for creating, managing, and participating in real-time collaborative editing sessions. It includes role-based access control, session templates, activity logging, recording capabilities, and automatic cleanup.

## Features

### Core Session Management
- **Session Creation**: Create collaborative sessions for any song with customizable settings
- **Access Control**: Three access modes - invite-only, link-access, and public
- **Role-Based Permissions**: Owner, editor, viewer, and commenter roles
- **Participant Management**: Add, remove, and manage session participants
- **Session Templates**: Pre-configured templates for common collaboration scenarios

### Activity & Recording
- **Activity Logging**: Comprehensive logging of all session activities with privacy controls
- **Session Recording**: Record and playback collaboration sessions
- **Session Health**: Health scoring based on participation and activity
- **Session Statistics**: Detailed analytics on session usage and performance

### Lifecycle Management
- **Automatic Cleanup**: Inactive sessions are automatically ended or archived
- **Session Archival**: Long-term storage of session data
- **Template Management**: Create and manage reusable session configurations

## Database Models

### CollaborationSession
Core session model with lifecycle tracking:
- Session identification and metadata
- Access control and participant limits
- Status tracking (active, paused, ended, archived)
- Integration with song and user models

### SessionTemplate
Reusable session configurations:
- Pre-defined role permissions
- Default settings for different collaboration types
- Usage tracking and analytics

### SessionParticipant
User participation tracking:
- Role assignment and permissions
- Activity metrics and contribution tracking
- Invitation management

### SessionActivity
Comprehensive activity logging:
- All session events with timestamps
- Privacy controls for sensitive activities
- User attribution and detailed context

## API Endpoints

### Session Operations
- `POST /api/v1/sessions` - Create new session
- `GET /api/v1/sessions/{id}` - Get session details
- `POST /api/v1/sessions/{id}/join` - Join session
- `POST /api/v1/sessions/{id}/leave` - Leave session

### Participant Management
- `GET /api/v1/sessions/{id}/participants` - List participants
- `POST /api/v1/sessions/{id}/invite` - Invite users

### Activity & Templates
- `GET /api/v1/sessions/{id}/activities` - Get activity log
- `GET /api/v1/sessions/templates` - List templates
- `GET /api/v1/sessions/my-sessions` - User's sessions

### Recording & Cleanup
- `POST /api/v1/sessions/{id}/recording/start` - Start recording
- `POST /api/v1/sessions/{id}/recording/stop` - Stop recording
- `GET /api/v1/sessions/{id}/recording/status` - Recording status
- `POST /api/v1/sessions/cleanup` - Cleanup inactive sessions

## Frontend Components

### SessionList
Displays user's sessions with filtering and status indicators:
```tsx
<SessionList
  onSessionSelect={(session) => console.log('Selected:', session)}
  onCreateSession={() => console.log('Create new session')}
  statusFilter="active"
  showCreateButton={true}
/>
```

### CreateSessionModal
Modal for creating new collaborative sessions:
```tsx
<CreateSessionModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSessionCreated={(sessionId) => navigateToSession(sessionId)}
  songId={selectedSong?.id}
/>
```

### SessionManagementService
TypeScript service for session operations:
```typescript
import { sessionManagementService } from './services/sessionManagementService';

// Create session
const session = await sessionManagementService.createSession({
  song_id: 123,
  name: 'Band Practice',
  access_mode: 'invite-only'
});

// Join session
await sessionManagementService.joinSession(sessionId);

// Get user's sessions
const sessions = await sessionManagementService.getMySessions();
```

## Session Templates

Five default templates are provided:

1. **Band Practice** (rehearsal) - Structured roles, auto-recording
2. **Music Lesson** (lesson) - Teacher-student hierarchy, restrictive permissions
3. **Jam Session** (jamming) - Open collaboration, larger participant limit
4. **Song Arrangement** (arrangement) - Collaborative editing focus
5. **Quick Review** (review) - Feedback-oriented, comment-focused

## Security Features

- **Authentication Required**: All operations require valid JWT tokens
- **Role-Based Access**: Granular permissions based on user roles
- **Session Isolation**: Users can only access sessions they have permissions for
- **Activity Privacy**: Sensitive activities hidden from non-owners
- **Input Validation**: All input sanitized and validated

## Usage Examples

### Creating a Session
```python
# Backend
session = CollaborationSession(
    session_id=str(uuid.uuid4()),
    song_id=song_id,
    creator_id=user_id,
    name="My Collaboration Session"
)
```

### Recording Session Events
```python
from chordme.session_recording import record_session_event

record_session_event(
    session_id="session-123",
    event_type="content_edited",
    user_id=user_id,
    data={"changes": "Added new verse"}
)
```

### Cleanup Management
```python
from chordme.session_cleanup import SessionCleanupService

# Run cleanup
stats = SessionCleanupService.cleanup_inactive_sessions(dry_run=True)
print(f"Would clean up {stats['sessions_ended']} sessions")
```

## Integration

The session management system integrates seamlessly with existing ChordMe features:

- **Song Sharing**: Leverages existing permission models
- **Real-time Collaboration**: Works with operational transformation
- **WebSocket Infrastructure**: Uses existing Socket.IO setup
- **User Management**: Integrates with authentication system

## Performance Considerations

- **Database Indexing**: Optimized queries for session lookups
- **Activity Logging**: Efficient storage with privacy controls
- **Cleanup Automation**: Background processes for maintenance
- **Recording Optimization**: Event-based recording with compression

## Future Enhancements

- **Email Notifications**: Automated invitation and update emails
- **Advanced Analytics**: Detailed collaboration insights
- **Session Persistence**: Cross-device session continuation
- **Integration APIs**: Third-party collaboration tools
- **Mobile Optimization**: Native mobile app support