---
layout: default
lang: en
title: Dashboard Layout and Sharing Features
---

# Dashboard Layout and Sharing Features

This document describes the enhanced dashboard layout that separates songs into distinct sections based on ownership and sharing permissions.

## Dashboard Sections

### My Songs
- **Purpose**: Shows songs owned by the current user
- **Criteria**: Songs where `author_id` matches the current user's ID
- **Features**:
  - Owner badge display
  - Full editing and sharing capabilities
  - Sorting controls (title, created date, last modified)
  - Song management actions (View, Edit, Download, Share, Delete)

### Shared with Me
- **Purpose**: Shows songs that have been shared with the current user
- **Criteria**: Songs where user has `read`, `edit`, or `admin` permissions but is not the owner
- **Features**:
  - Permission level badges (Admin, Editor, Reader)
  - Permission-based filtering controls
  - Sorting controls (title, created date, last modified)
  - Permission-appropriate actions (View always available, Edit/Share based on permission level)

## Visual Indicators

### Permission Badges
- **Owner** (Blue): Full control over the song
- **Admin** (Red): Can manage sharing and edit content
- **Editor** (Purple): Can edit song content
- **Reader** (Light Blue): View-only access

### Collaboration Indicators
- **Collaborator Count**: Shows number of users with access (👥 N)
- **Real-time Status**: Green indicator when real-time sync is active (🔄 Real-time)

### Activity Information
- **Last Modified**: Shows relative time since last update
- **Created Date**: Available in sorting options

## Filtering and Sorting

### My Songs Controls
- **Sort Options**:
  - Last Modified (default)
  - Title (alphabetical)
  - Created Date (newest first)

### Shared Songs Controls
- **Filter Options**:
  - All Permissions (default)
  - Admin Access only
  - Edit Access only
  - Read Only access
- **Sort Options**:
  - Last Modified (default)
  - Title (alphabetical)
  - Created Date (newest first)

## User Experience

### Empty States
- **My Songs**: Encouraging message to create first song
- **Shared with Me**: Informative message about waiting for shared content

### Real-time Features
- Automatic updates when Firestore is available
- Real-time status indicators in section headers
- Instant reflection of sharing changes

### Responsive Design
- Controls only appear when songs are present
- Clean, consistent styling
- Mobile-friendly layout

## Technical Implementation

### Song Categorization Logic
```typescript
// Determine if song belongs in "My Songs"
const getMySongs = (): Song[] => {
  return songs.filter(song => getUserPermission(song) === 'owner');
};

// Determine if song belongs in "Shared with Me"  
const getSharedSongs = (): Song[] => {
  return songs.filter(song => {
    const permission = getUserPermission(song);
    return permission === 'read' || permission === 'edit' || permission === 'admin';
  });
};
```

### Permission Checking
```typescript
const getUserPermission = (song: Song): string => {
  const currentUser = localStorage.getItem('authUser');
  if (!currentUser) return 'none';
  
  try {
    const user = JSON.parse(currentUser);
    if (song.author_id === user.id) return 'owner';
    return song.user_permission || 'none';
  } catch {
    return 'none';
  }
};
```

### Action Availability
- **View**: Available for all accessible songs
- **Edit**: Available for owner, admin, and edit permissions
- **Share**: Available for owner and admin permissions only
- **Delete**: Available for owners only (not shown in shared section)
- **Download**: Available for all accessible songs

## Accessibility Features

- Proper ARIA labels for all controls
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly descriptions
- Clear visual hierarchy

## Testing Coverage

- Song categorization logic
- Permission badge display
- Filtering and sorting functionality
- Empty state handling
- Real-time indicator display
- Action button availability based on permissions