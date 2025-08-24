# Real-time Song Editing Implementation

This document describes the real-time collaborative editing functionality implemented for ChordMe song editing.

## Overview

The real-time song editing feature enables multiple users to collaborate on song editing with conflict detection and resolution. When a song is being edited, the system automatically detects external changes made by other users and provides conflict resolution options.

## Features Implemented

### 1. Real-time Song Monitoring During Editing

When a user starts editing a song, the system:
- Subscribes to real-time updates for that specific song using `useRealtimeSong` hook
- Monitors changes in song content, title, and timestamps
- Displays a real-time status indicator in the editing interface

### 2. Conflict Detection

The system detects conflicts when:
- Another user modifies the song being edited
- The external change has a newer timestamp than the current editing session
- The content or title differs from the local editing state

### 3. Conflict Resolution UI

When conflicts are detected, users see:
- **Warning notification**: "This song has been updated by another user"
- **Review changes button**: Opens the conflict resolution dialog
- **Conflict resolution dialog** with options:
  - **Accept external changes**: Replace local edits with the latest version
  - **Keep my changes**: Continue with local edits (user can save to overwrite)

### 4. Real-time Status Indicators

- **Real-time editing indicator**: Shows when Firebase real-time monitoring is active
- **Conflict notifications**: Visual warnings when external changes are detected
- **Timestamp display**: Shows when the song was last updated in conflict dialogs

## Implementation Details

### Files Modified

1. **`frontend/src/pages/Home/Home.tsx`**:
   - Added `useRealtimeSong` hook integration
   - Added conflict detection logic with `useEffect`
   - Added conflict resolution handlers
   - Added conflict resolution UI components

2. **`frontend/src/pages/Home/Home.realtime-editing.test.tsx`**:
   - New test file with 4 test cases covering real-time editing functionality
   - Tests real-time status indicators and editing form structure

### Key State Variables

```typescript
// Real-time editing state
const [hasExternalChanges, setHasExternalChanges] = useState(false);
const [showConflictDialog, setShowConflictDialog] = useState(false);

// Subscribe to real-time updates for the song being edited
const { 
  song: realtimeEditingSong, 
  isRealTime: isEditingRealTime 
} = useRealtimeSong(editingSong?.id || null);
```

### Conflict Detection Logic

```typescript
useEffect(() => {
  if (!editingSong || !realtimeEditingSong || !isEditingRealTime) {
    setHasExternalChanges(false);
    return;
  }

  // Check if the real-time song data differs from our editing state
  const hasContentChanged = realtimeEditingSong.content !== editSongData.content;
  const hasTitleChanged = realtimeEditingSong.title !== editSongData.title;
  const hasTimestampChanged = realtimeEditingSong.updated_at !== editingSong.updated_at;

  // Only consider it an external change if the timestamp is newer
  if ((hasContentChanged || hasTitleChanged) && hasTimestampChanged) {
    setHasExternalChanges(true);
  } else {
    setHasExternalChanges(false);
  }
}, [editingSong, realtimeEditingSong, editSongData, isEditingRealTime]);
```

## Manual Testing Guide

### Prerequisites

1. Set up Firebase/Firestore configuration in `.env`:
   ```bash
   VITE_DATA_SOURCE=firebase
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_PROJECT_ID=your-project-id
   # ... other Firebase config
   ```

2. Start the development server:
   ```bash
   npm run dev:frontend
   ```

### Testing Scenarios

#### Scenario 1: Real-time Status Indicator

1. Open ChordMe in browser
2. Create or select a song to edit
3. Click "Edit" button
4. **Expected**: See "🔄 Real-time editing enabled" indicator at top of edit form

#### Scenario 2: Conflict Detection (Single Browser)

1. Edit a song in the application
2. Make changes to the content (e.g., add some chords)
3. In browser dev tools, manually trigger a Firestore update to the same song
4. **Expected**: Warning notification appears about external changes

#### Scenario 3: Multi-Browser Collaboration

1. Open ChordMe in two different browser windows/tabs
2. Login as the same user in both
3. Start editing the same song in Window 1
4. In Window 2, edit and save changes to the same song
5. Return to Window 1
6. **Expected**: Conflict notification appears in Window 1

#### Scenario 4: Conflict Resolution

1. Continue from Scenario 3
2. Click "Review changes" button in the conflict notification
3. **Expected**: Conflict resolution dialog appears with two options
4. Test both options:
   - "Accept external changes": Form updates with new content
   - "Keep my changes": Conflict dialog closes, original edits remain

#### Scenario 5: Fallback Behavior

1. Configure environment to use Flask backend:
   ```bash
   VITE_DATA_SOURCE=api
   ```
2. Edit a song
3. **Expected**: No real-time indicator, normal editing behavior (no conflict detection)

## Architecture Integration

### Existing Infrastructure Used

- **`useRealtimeSong` hook**: Already existed, now integrated into editing workflow
- **`useRealtimeSongs` hook**: Used for song list updates (unchanged)
- **Firestore service**: Real-time subscriptions via `onSnapshot` (unchanged)
- **API service**: Unified interface supporting both Firebase and Flask backends

### Minimal Changes Principle

The implementation leverages existing real-time infrastructure with minimal new code:
- ~80 lines of new logic in Home.tsx
- ~60 lines of new UI components
- 4 focused test cases
- No changes to existing hooks or services

## Security Considerations

- **Firebase Security Rules**: Ensure proper read/write permissions for song documents
- **User Authentication**: Only authenticated users can edit songs they own
- **Conflict Resolution**: Users can choose to overwrite external changes (intentional design)

## Performance Considerations

- **Efficient Subscriptions**: Real-time subscription only active during editing
- **Automatic Cleanup**: Subscriptions properly cleaned up when editing ends
- **Minimal Re-renders**: State updates only when actual conflicts detected

## Future Enhancements

1. **Auto-save drafts**: Automatically save user edits during typing with debouncing
2. **Visual diff view**: Show side-by-side comparison of conflicting changes  
3. **Presence indicators**: Show who else is currently viewing/editing the song
4. **Merge conflict resolution**: More sophisticated merge options for complex conflicts
5. **Real-time cursors**: Show where other users are editing in real-time
6. **Lock-based editing**: Prevent multiple users from editing simultaneously

## Browser Compatibility

- **WebSocket support**: Required for Firestore real-time updates
- **Modern browsers**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **Graceful degradation**: Falls back to regular API calls if real-time not available

## Troubleshooting

### Real-time not working

1. Check Firebase configuration in environment variables
2. Verify Firestore security rules allow read access
3. Check browser console for authentication errors
4. Confirm `VITE_DATA_SOURCE=firebase` is set

### Conflicts not detected

1. Verify both users are editing the same song
2. Check that timestamps are different between versions
3. Ensure real-time subscription is active (green indicator visible)
4. Check browser network tab for WebSocket connections

### Performance issues

1. Monitor Firestore read quota usage in Firebase console
2. Check for unnecessary re-renders with React DevTools
3. Verify cleanup functions are being called on unmount
4. Consider implementing pagination for large song collections