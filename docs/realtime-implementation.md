---
layout: default
lang: en
title: Real-time Implementation
---

# Real-time Firestore Updates Implementation

This document outlines the real-time Firestore updates feature implementation for ChordMe.

## Overview

The real-time updates feature provides instant synchronization of songs data between Firestore and the UI using Firebase's `onSnapshot()` listeners. Changes made to songs in the database are immediately reflected in the UI without requiring manual refreshes.

## Features Implemented

### 1. Firestore Service Extensions

**File**: `frontend/src/services/firestore.ts`

Added real-time subscription methods:

```typescript
// Subscribe to real-time updates for all songs for a user
subscribeToSongs(userId: string, callback: (songs: Song[]) => void): Unsubscribe

// Subscribe to real-time updates for a specific song
subscribeToSong(songId: string, callback: (song: Song | null) => void): Unsubscribe
```

**Key Features:**
- Uses Firebase `onSnapshot()` for real-time listeners
- Automatic error handling with fallback callbacks
- Proper cleanup with unsubscribe functions
- Ordered by `updated_at` descending for songs list

### 2. API Service Integration

**File**: `frontend/src/services/api.ts`

Added real-time support methods:

```typescript
// Subscribe to real-time updates for all songs
subscribeToSongs(callback: (songs: Song[]) => void): Unsubscribe

// Subscribe to real-time updates for a specific song  
subscribeToSong(songId: string, callback: (song: Song | null) => void): Unsubscribe

// Check if real-time updates are supported
supportsRealTimeUpdates(): boolean
```

**Behavior:**
- Real-time updates only work with Firebase backend
- Falls back to no-op functions for Flask backend
- Automatic user authentication checks for Firebase operations

### 3. React Hooks for Real-time Data

**Files**: 
- `frontend/src/hooks/useRealtimeSongs.ts`
- `frontend/src/hooks/useRealtimeSong.ts`

#### useRealtimeSongs Hook

```typescript
const { songs, loading, error, isRealTime, refetch } = useRealtimeSongs();
```

**Features:**
- Automatically subscribes to songs updates when Firebase is available
- Falls back to regular API calls for Flask backend
- Proper cleanup on component unmount
- Loading and error state management
- Manual refetch capability for non-real-time scenarios

#### useRealtimeSong Hook

```typescript
const { song, loading, error, isRealTime, refetch } = useRealtimeSong(songId);
```

**Features:**
- Subscribes to individual song updates
- Handles null songId gracefully
- Same fallback and cleanup behavior as songs hook

### 4. UI Integration

**File**: `frontend/src/pages/Home/Home.tsx`

**Changes Made:**
- Replaced manual song state management with `useRealtimeSongs` hook
- Added real-time status indicator in UI
- Conditional manual refresh only when real-time is not available
- Combined error handling for both local and real-time errors

**UI Enhancements:**
- Real-time status badge: "[READY] Real-time" indicator
- Automatic updates without manual refresh buttons
- Seamless fallback experience for Flask backend users

## Technical Details

### Real-time Data Flow

1. **Component Mount** → Hook checks `apiService.supportsRealTimeUpdates()`
2. **Firebase Available** → Sets up `onSnapshot()` listener
3. **Data Changes** → Firestore triggers callback with updated data
4. **UI Update** → React state updates trigger re-render
5. **Component Unmount** → Unsubscribe function called for cleanup

### Error Handling

- **Connection Errors**: Logged to console, empty array/null returned to callback
- **Permission Errors**: Logged with IP tracking for security monitoring
- **Authentication Errors**: Graceful degradation to non-real-time mode

### Performance Considerations

- **Memory Management**: Automatic cleanup prevents memory leaks
- **Minimal Re-renders**: State updates only when data actually changes
- **Efficient Queries**: Firestore queries optimized with `where` and `orderBy`
- **Conditional Loading**: Real-time vs API loading states properly managed

## Configuration

### Firebase Backend (Real-time)

Set environment variables:
```bash
VITE_DATA_SOURCE=firebase
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config
```

### Flask Backend (Non-real-time)

```bash
VITE_DATA_SOURCE=api
# OR remove VITE_DATA_SOURCE entirely
```

## Testing

### Unit Tests Added

- **useRealtimeSongs**: 5 comprehensive tests covering real-time and fallback scenarios
- **useRealtimeSong**: 7 comprehensive tests covering all edge cases
- **FirestoreService**: Extended existing tests to include new real-time methods
- **API Service**: Updated mocks to include real-time support

### Test Coverage

- [PASSED] Real-time subscription setup and teardown
- [PASSED] Fallback to regular API calls
- [PASSED] Error handling in both modes
- [PASSED] Component unmount cleanup
- [PASSED] Edge cases (null songId, missing data)

## Browser Compatibility

Real-time updates work in all modern browsers that support:
- ES6 Promises
- WebSocket connections (for Firebase real-time)
- React 18+ hooks

## Security

- **Authentication Required**: All real-time operations require valid user authentication
- **User Isolation**: Users can only subscribe to their own songs
- **Error Logging**: Security events logged with IP tracking
- **Firestore Rules**: Compatible with user-based security rules

## Migration Path

The implementation is fully backward compatible:

1. **Existing Flask Users**: Continue to work without changes
2. **New Firebase Users**: Automatically get real-time updates
3. **Hybrid Deployments**: Can switch data sources without code changes

## Future Enhancements

Potential extensions to the real-time system:

- **Collaborative Editing**: Multiple users editing same song
- **Presence Indicators**: Show who's currently viewing songs
- **Conflict Resolution**: Handle simultaneous edits
- **Offline Sync**: Queue changes when offline
- **Push Notifications**: Notify users of changes to shared songs

## Troubleshooting

### Real-time Not Working

1. Check Firebase configuration in environment variables
2. Verify Firestore security rules allow read access
3. Check browser console for authentication errors
4. Confirm `VITE_DATA_SOURCE=firebase` is set

### Performance Issues

1. Monitor Firestore read quota usage
2. Check for unnecessary re-renders with React DevTools
3. Verify cleanup functions are being called
4. Consider pagination for large song collections

### Development Testing

For testing real-time functionality during development:

1. Set up Firebase project with test data
2. Configure environment variables
3. Open multiple browser tabs/windows
4. Make changes in one tab and observe updates in others
5. Check browser network tab for WebSocket connections