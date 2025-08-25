# Real-time Collaborative Editing - Technical Documentation

## Architecture Overview

The real-time collaborative editing system implements sophisticated operational transformation (OT) techniques to enable conflict-free concurrent editing while maintaining document consistency across multiple users. The system is built on a modern stack combining React frontend components with Firebase Firestore for real-time data synchronization.

### System Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User A        │    │   User B        │    │   User C        │
│   (React App)   │    │   (React App)   │    │   (React App)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Operations, Cursors, │                      │
          │ Presence Data        │                      │
          │                      │                      │
    ┌─────▼──────────────────────▼──────────────────────▼─────┐
    │                Firebase Firestore                       │
    │  - Real-time synchronization                           │
    │  - Operation transformation                             │
    │  - Conflict resolution                                  │
    │  - Presence management                                  │
    └─────┬──────────────────────┬──────────────────────┬─────┘
          │                      │                      │
    ┌─────▼───────┐        ┌─────▼───────┐        ┌─────▼───────┐
    │ Collaboration│        │ Collaboration│        │ Collaboration│
    │ Service A    │        │ Service B    │        │ Service C    │
    │ - OT Engine  │        │ - OT Engine  │        │ - OT Engine  │
    │ - State Mgmt │        │ - State Mgmt │        │ - State Mgmt │
    └─────────────┘        └─────────────┘        └─────────────┘
```

### Technology Stack

**Frontend**: 
- React 19 with TypeScript for type safety
- Custom hooks for collaboration state management
- Optimistic UI updates for responsiveness

**Backend**:
- Firebase Firestore for real-time data synchronization
- Flask API for song management and permissions
- JWT authentication for secure access

**Real-time Engine**:
- Operational Transformation (OT) algorithms
- WebSocket connections via Firestore
- Conflict detection and resolution

### Security and Permissions Integration

The collaborative editing system integrates seamlessly with ChordMe's permission model:

- **Authentication**: JWT tokens validate user identity
- **Authorization**: Server-side permission checks before allowing collaboration
- **Session Security**: Users can only join sessions for songs they have access to
- **Data Validation**: All operations are validated for security and consistency

### Core Components

#### 1. Operational Transformation Engine (`operationalTransform.ts`)

The OT engine provides conflict-free concurrent editing through mathematical transformation of operations:

```typescript
// Transform operations to maintain consistency
const transformedOp = OperationalTransform.transform(operation1, operation2);

// Apply operations to content
const newContent = OperationalTransform.applyOperation(content, operation);

// Generate diff between versions
const operations = OperationalTransform.generateDiff(oldText, newText);
```

**Key Features:**
- **Insert/Delete/Retain operations** with position-based indexing
- **Conflict detection** for overlapping operations  
- **Operation composition** for optimizing operation sequences
- **Operation inversion** for rollback capabilities
- **Diff generation** for comparing text versions

#### 2. Collaboration Service (`collaborationService.ts`)

Manages real-time collaboration sessions using Firestore:

```typescript
// Start collaboration session
const session = await collaborationService.startCollaborationSession(songId);

// Apply text operations with OT
const update = await collaborationService.applyTextOperation(songId, operations, true);

// Update cursor position
await collaborationService.updateCursorPosition(songId, { line: 5, column: 10 });
```

**Features:**
- **Session lifecycle management** (start/end collaboration)
- **Real-time subscriptions** to operations, cursors, presence
- **Optimistic updates** with automatic rollback on failures
- **Network status monitoring** and reconnection handling
- **Permission change detection** during active collaboration

#### 3. React Hooks (`useCollaborativeEditing.ts`)

Provide React integration for collaborative features:

```typescript
// Main collaboration hook
const {
  session,
  isCollaborating,
  applyTextOperation,
  updateCursor,
  participants,
  cursors,
  networkStatus
} = useCollaborativeEditing(songId, userId);

// Presence tracking
const { activePeerCount, getUserPresence } = useCollaborativePresence(songId);

// Network monitoring
const { isOnline, connectionQuality, reconnecting } = useCollaborativeNetwork();
```

### Data Flow

#### 1. User Edits Text
```
User Types → Generate Operations → Apply Optimistically → Send to Firestore
```

#### 2. Receive Remote Operations
```
Firestore Change → Transform Against Local Ops → Apply to Content → Update UI
```

#### 3. Conflict Resolution
```
Detect Conflict → Show Resolution Dialog → User Chooses Strategy → Apply Resolution
```

## Conflict Resolution Algorithms

### 1. Operational Transformation
Automatically resolves conflicts by transforming operations:

```typescript
// Example: Two users insert at same position
const user1Op = { type: 'insert', position: 5, content: 'A' };
const user2Op = { type: 'insert', position: 5, content: 'B' };

// After transformation:
// user1Op remains: { type: 'insert', position: 5, content: 'A' }
// user2Op becomes: { type: 'insert', position: 6, content: 'B' }
// Result: "A" then "B" at positions 5 and 6
```

### 2. Manual Merge
Provides visual merge interface with conflict markers:

```
<<<<<<< Your changes
Your version of the text
=======
Their version of the text
>>>>>>> Alice's changes
```

### 3. Resolution Strategies
- **Auto-merge**: Use OT to automatically resolve conflicts
- **Keep local**: Discard remote changes, keep local edits
- **Accept remote**: Discard local changes, accept remote edits  
- **Manual merge**: User manually resolves conflicts in editor

## Performance Optimizations

### 1. Efficient Real-time Subscriptions
- **Conditional subscriptions**: Only active during editing sessions
- **Automatic cleanup**: Unsubscribe when sessions end
- **Minimal re-renders**: State updates only on actual changes

### 2. Operation Optimization
- **Operation composition**: Combine adjacent operations
- **Debounced cursor updates**: Limit cursor position broadcasts
- **Selective synchronization**: Only sync relevant document sections

### 3. Network Optimization
- **Connection quality monitoring**: Adapt behavior based on network state
- **Retry logic**: Automatic retry for failed operations
- **Graceful degradation**: Continue working offline with sync on reconnect

## Error Handling

### 1. Network Failures
```typescript
// Automatic retry with exponential backoff
try {
  await collaborationService.applyTextOperation(songId, operations);
} catch (error) {
  if (error.code === 'network-error') {
    // Queue operation for retry
    queueForRetry(operation);
  }
}
```

### 2. Permission Changes
```typescript
// Handle permission downgrades during editing
collaborationService.onPermissionChange((change) => {
  if (change.newPermission === 'read') {
    // Switch to read-only mode
    setReadOnlyMode(true);
    showPermissionChangeNotification(change);
  }
});
```

### 3. Rollback Scenarios
```typescript
// Automatic rollback for failed optimistic updates
const optimisticUpdate = await applyTextOperation(operations, true);
if (optimisticUpdate.status === 'failed') {
  // Rollback to previous state
  revertToState(optimisticUpdate.rollbackData);
}
```

## Security Considerations

### 1. Authentication & Authorization
- **User authentication**: Required for all collaboration operations
- **Permission validation**: Server-side permission checks
- **Session isolation**: Users can only join sessions they have access to

### 2. Data Validation
- **Operation validation**: Validate operation data structure
- **Position bounds checking**: Ensure operation positions are valid
- **Content sanitization**: Sanitize user input before applying

### 3. Rate Limiting
- **Cursor update throttling**: Limit cursor position broadcasts
- **Operation rate limits**: Prevent operation spam
- **Session limits**: Maximum participants per session

## Troubleshooting Guide

### Common Issues

#### Real-time Not Working
1. **Check Firebase configuration**
   ```bash
   # Verify environment variables
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   ```

2. **Verify Firestore security rules**
   ```javascript
   // Allow authenticated users to read/write collaboration data
   match /collaboration/{songId} {
     allow read, write: if request.auth != null;
   }
   ```

3. **Check browser console for errors**
   - Authentication failures
   - Network connectivity issues
   - Permission denied errors

#### Conflicts Not Detected
1. **Verify real-time subscriptions are active**
   - Look for WebSocket connections in Network tab
   - Check for "🔄 Real-time editing enabled" indicator

2. **Check operation timestamps**
   - Operations must have different timestamps to detect conflicts
   - Server timestamps should be used for consistency

#### Performance Issues
1. **Monitor Firestore usage**
   - Check read/write quota in Firebase console
   - Optimize queries with proper indexing

2. **Check for memory leaks**
   - Verify cleanup functions are called on unmount
   - Monitor browser memory usage during long sessions

3. **Network optimization**
   - Use compression for large operations
   - Implement operation batching for bulk changes

### Debugging Tools

#### Browser DevTools
- **Network tab**: Monitor WebSocket connections and Firestore requests
- **Console**: Check for collaboration service logs and errors
- **React DevTools**: Inspect collaboration hooks state

#### Firebase Console
- **Firestore**: View real-time collaboration data structure
- **Usage metrics**: Monitor read/write operations
- **Rules simulator**: Test security rule permissions

## Browser Compatibility

### Supported Browsers
- **Chrome 60+**: Full support including WebSockets
- **Firefox 55+**: Full support with real-time features
- **Safari 11+**: Full support on macOS/iOS
- **Edge 79+**: Full support (Chromium-based)

### Graceful Degradation
- **No WebSocket support**: Falls back to polling-based updates
- **Offline mode**: Queues operations for sync when reconnected
- **Limited permissions**: Read-only mode for viewers

## Future Enhancements

### Planned Features
1. **Enhanced OT algorithms**: Support for rich text and formatting
2. **Voice/video chat integration**: Real-time communication during collaboration
3. **Advanced presence**: Show what users are currently viewing/editing
4. **Collaborative sessions**: Structured collaboration with moderators
5. **Real-time commenting**: Inline comments and suggestions

### Performance Improvements  
1. **WebRTC data channels**: Direct peer-to-peer communication
2. **Operation compression**: Reduce bandwidth usage
3. **Conflict prediction**: Prevent conflicts before they occur
4. **Smart caching**: Cache frequently accessed collaboration data

This documentation provides a comprehensive guide to the collaborative editing architecture, ensuring maintainability and enabling future enhancements.