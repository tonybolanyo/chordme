---
layout: default
lang: en
title: ChordMe User Guide
---

# ChordMe User Guide

This guide covers all the features and functionality available in ChordMe for end users.

## Overview

ChordMe provides a comprehensive platform for managing songs with lyrics and chords. Whether you're a musician, songwriter, or music teacher, ChordMe offers the tools you need to organize and display your musical content.

## User Authentication

### Registration

To start using ChordMe, you need to create an account:

1. Navigate to the registration page
2. Provide a valid email address
3. Create a secure password (minimum requirements apply)
4. Submit the registration form
5. You'll receive a success message upon successful registration

### Login

After registration, log in to access your personal song library:

1. Enter your email and password
2. Click the login button
3. You'll receive a JWT token for authenticated requests
4. The token automatically handles your session

### Password Security

ChordMe implements robust password security:

- Passwords are hashed using bcrypt
- Minimum length and complexity requirements
- Secure storage with no plain-text passwords
- JWT tokens for secure API access

## Song Management

### Creating Songs

ChordMe supports creating songs using the ChordPro format:

#### Using the Web Interface

1. Click "Create New Song" or similar button
2. Enter song metadata (title, artist, key, etc.)
3. Add your lyrics and chords using ChordPro format
4. Preview your song as you type
5. Save your song to your library

#### Using the API

Send a POST request to `/api/v1/songs`:

```json
{
  "title": "Amazing Grace",
  "artist": "John Newton",
  "content": "{title: Amazing Grace}\n{artist: John Newton}\n[G]Amazing [G7]grace..."
}
```

### Viewing Songs

#### Song List

- View all your songs in a organized list
- Search and filter functionality
- Sort by title, artist, or creation date
- Quick access to edit or view individual songs

#### Song Display

- Clean, readable display of lyrics and chords
- Proper formatting of ChordPro directives
- Responsive design for various screen sizes
- Print-friendly formatting

### Editing Songs

1. Select a song from your library
2. Click the edit button
3. Modify any song properties or content
4. Changes are preserved in real-time
5. Save your modifications

### Organizing Songs

- **Search**: Find songs by title, artist, or content
- **Categories**: Organize songs by genre, key, or custom tags
- **Favorites**: Mark frequently used songs as favorites
- **Recent**: Quick access to recently viewed or edited songs

## ChordPro Format Features

ChordMe fully supports the ChordPro format with these features:

### Directives

Add metadata and structure to your songs:

```
{title: Song Title}
{artist: Artist Name}
{key: G}
{capo: 3}
{tempo: 120}
{comment: Additional notes}
```

### Chord Notation

Place chords above lyrics using square brackets:

```
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [Em]saved a [D]wretch like [G]me
```

### Song Structure

Organize your songs with structural directives:

```
{start_of_verse}
[G]Verse lyrics go here
{end_of_verse}

{start_of_chorus}
[C]Chorus lyrics go here
{end_of_chorus}
```

### Advanced Features

- **Tablature**: Include guitar tabs and notation
- **Comments**: Add performance notes and instructions
- **Multiple verses**: Organize complex song structures
- **Key changes**: Handle modulations and key changes

## Interface Features

### ChordPro Editor

The built-in editor provides:

- **Syntax highlighting** for ChordPro format
- **Real-time preview** of your formatted song
- **Auto-completion** for common directives
- **Error detection** for invalid ChordPro syntax
- **Line numbers** for easy reference

### ChordPro Viewer

Display songs with:

- **Professional formatting** of chords and lyrics
- **Responsive layout** that adapts to screen size
- **Print optimization** for physical sheet music
- **Zoom controls** for accessibility
- **Color themes** for different viewing preferences

### Search and Filter

Find your content quickly with:

- **Full-text search** across titles, artists, and lyrics
- **Filter by key** to find songs in specific keys
- **Sort options** for different organizational preferences
- **Tag-based organization** for custom categorization

## Mobile Experience

ChordMe is fully responsive and works great on mobile devices:

- **Touch-friendly interface** optimized for phones and tablets
- **Swipe navigation** for easy song browsing
- **Zoom support** for easy reading on small screens
- **Offline capability** for previously loaded songs
- **Portrait and landscape** viewing modes

## Keyboard Shortcuts

Improve your workflow with keyboard shortcuts:

- **Ctrl/Cmd + S**: Save current song
- **Ctrl/Cmd + N**: Create new song
- **Ctrl/Cmd + F**: Search songs
- **Ctrl/Cmd + E**: Toggle edit mode
- **Escape**: Exit current mode
- **Tab**: Navigate between form fields

## Import and Export

### Importing Songs

- **ChordPro files**: Direct import of .pro or .chopro files
- **Text files**: Convert plain text with basic formatting
- **Batch import**: Upload multiple songs at once

### Exporting Songs

- **ChordPro format**: Export individual or multiple songs
- **PDF generation**: Create printable sheet music
- **Text format**: Simple text export for sharing
- **JSON export**: Machine-readable format for integration

## Collaboration Features

ChordMe provides comprehensive collaboration tools that allow you to work together with other musicians, share songs, and collaborate in real-time.

### Understanding Permission Levels

Before sharing songs, it's important to understand the different permission levels:

#### **Owner** (Blue Badge 🔵)
- **Full control** over the song and all sharing settings
- Can edit content, manage collaborators, and delete the song
- Cannot be removed from their own songs

#### **Admin** (Red Badge 🔴) 
- **Management access** including sharing and permission control
- Can edit song content and invite/remove other collaborators
- Can change permissions for other users (except owner)

#### **Editor** (Purple Badge 🟣)
- **Edit access** to modify song content and structure
- Can make changes to lyrics, chords, and song metadata
- Cannot manage sharing or permissions

#### **Reader** (Light Blue Badge 🔵)
- **View-only access** to song content
- Can view and download songs but cannot make changes
- Perfect for students, fans, or casual collaborators

### Sharing Songs with Others

#### Step 1: Access the Sharing Interface

1. **Navigate to your songs** on the dashboard
2. **Locate the song** you want to share
3. **Click the "Share" button** (📤) next to the song title
   - *Note: Share button only appears for songs you own or have admin access to*

#### Step 2: Invite Collaborators

1. **Enter the collaborator's email address** in the sharing form
2. **Select the appropriate permission level** from the dropdown:
   - Choose **Read** for viewers who just need to see the song
   - Choose **Edit** for collaborators who will modify content
   - Choose **Admin** for trusted partners who can manage sharing
3. **Click "Share Song"** to send the invitation

#### Step 3: Manage Existing Collaborators

1. **View current collaborators** in the bottom section of the sharing modal
2. **Change permissions** using the dropdown next to each user's name
3. **Remove access** by clicking the "Remove" button (with confirmation)
4. **Monitor collaboration count** (👥 N) showing total number of collaborators

### Working with Shared Songs

#### Accessing Shared Songs

1. **Check your dashboard** for the "Shared with Me" section
2. **Look for permission badges** next to song titles indicating your access level
3. **Use the filter options** to view songs by permission type:
   - All Permissions
   - Admin Access
   - Edit Access  
   - Read Only

#### Understanding Visual Indicators

- **Permission badges**: Color-coded indicators showing your access level
- **Collaboration count**: 👥 N shows how many people have access
- **Real-time indicator**: 🔄 appears when live collaboration is active
- **Last modified**: Shows when the song was last updated

### Real-Time Collaborative Editing

When Firebase integration is enabled, ChordMe supports sophisticated real-time collaboration:

#### Starting a Real-Time Session

1. **Open a shared song** with edit or admin permissions
2. **Click the "Edit" button** to enter editing mode
3. **Look for the real-time indicator** (🔄 Real-time editing enabled)
4. **See other collaborators** who are currently editing

#### Live Collaboration Features

**Live Cursor Tracking**:
- See color-coded cursors showing where other users are editing
- User names appear next to their cursor positions
- Selected text is highlighted in each user's color

**Presence Indicators**:
- View list of users currently editing the song
- See online/offline status of collaborators
- Monitor active editing sessions

**Automatic Synchronization**:
- Changes appear instantly across all users' screens
- Optimistic updates provide immediate feedback
- Automatic rollback if operations fail

#### Conflict Resolution

When multiple users edit the same content simultaneously:

**Automatic Resolution**:
- Simple conflicts are resolved automatically using operational transformation
- Most edits can be merged without user intervention
- Changes maintain their intended meaning

**Manual Resolution**:
- Complex conflicts show a resolution dialog
- View both versions side by side
- Choose to keep local changes, accept remote changes, or manually merge
- Preview merged content before accepting

**Conflict Prevention**:
- Real-time cursor positions help avoid editing conflicts
- Visual indicators show what others are currently editing
- Smart conflict detection prevents most issues

### Best Practices for Collaboration

#### For Song Owners/Admins

1. **Set appropriate permissions**:
   - Use **Read** for casual sharing or performances
   - Use **Edit** for active co-writing collaborations  
   - Use **Admin** only for trusted long-term partners

2. **Communicate with collaborators**:
   - Clearly explain the purpose of sharing
   - Set expectations about editing and changes
   - Use external communication for complex discussions

3. **Monitor collaboration activity**:
   - Check the collaborators list regularly
   - Review recent changes and updates
   - Remove access when collaboration ends

#### For Collaborators

1. **Respect permission levels**:
   - Don't ask for higher permissions unless necessary
   - Use read access responsibly for viewing/downloading
   - Coordinate with owners before major changes

2. **Collaborate effectively**:
   - Be aware of others' cursor positions during real-time editing
   - Make small, incremental changes rather than large rewrites
   - Test conflict resolution in non-critical situations

3. **Communicate changes**:
   - Let other collaborators know about significant edits
   - Use external communication for planning major changes
   - Be responsive during real-time editing sessions

### Troubleshooting Collaboration Issues

#### Sharing Problems

**"Share button not visible"**:
- Check that you have owner or admin permissions
- Ensure you're viewing your own songs, not shared songs
- Refresh the page and try again

**"User not found" error**:
- Verify the email address is typed correctly
- Ensure the user has a ChordMe account
- Ask them to register first if needed

**"Cannot share with yourself" error**:
- Double-check you're not entering your own email
- Use a different email address for the collaborator

#### Real-Time Editing Issues

**"Real-time not working"**:
- Check that Firebase integration is enabled
- Verify your internet connection
- Refresh the page and try again
- Check browser console for error messages

**"Conflicts not detected"**:
- Ensure real-time indicators are showing
- Check that WebSocket connections are active
- Try making small test edits first

**"Changes not syncing"**:
- Verify your permissions allow editing
- Check for network connectivity issues
- Look for error notifications or messages

#### Permission Issues

**"Access denied" errors**:
- Confirm you have appropriate permissions for the action
- Check if your permissions were recently changed
- Contact the song owner if you believe you should have access

**"Permission changed" notifications**:
- Check your current permission level in the song list
- Contact the song owner if you have questions about changes
- Adjust your workflow based on new permission level

### Advanced Collaboration Features

#### Bulk Operations

- **Multiple song sharing**: Select multiple songs to share with the same collaborator
- **Permission batch updates**: Change permissions for multiple users at once
- **Group management**: Organize collaborators into teams or groups (coming soon)

#### Integration Features

- **External notifications**: Email notifications for sharing events (when configured)
- **Activity feeds**: Detailed history of collaboration activities
- **Export shared songs**: Download collections including shared content

#### Performance and Optimization

- **Smart caching**: Collaboration data is cached for faster access
- **Optimized updates**: Only changed content is synchronized
- **Connection management**: Automatic reconnection and error recovery

## Performance and Optimization

ChordMe is optimized for performance:

- **Fast loading**: Optimized code and assets
- **Efficient caching**: Reduced server requests
- **Lazy loading**: Load content as needed
- **Offline support**: Access previously viewed content
- **Progressive enhancement**: Works on slower connections

## Accessibility

ChordMe follows accessibility best practices:

- **Screen reader support**: Full compatibility with assistive technology
- **Keyboard navigation**: Complete functionality without a mouse
- **High contrast modes**: Better visibility for users with visual impairments
- **Scalable text**: Support for different font sizes
- **Alternative text**: Descriptions for all visual elements

## Data Management

### Backup and Sync

- **Automatic backups**: Your data is regularly backed up
- **Cross-device sync**: Access your songs from any device
- **Export functionality**: Download your complete song library
- **Data portability**: Easy migration to other systems

### Privacy and Security

- **Data encryption**: All data is encrypted in transit and at rest
- **User privacy**: Your songs are private by default
- **GDPR compliance**: Full compliance with data protection regulations
- **Account security**: Strong authentication and session management

## Tips and Best Practices

### Writing Effective ChordPro

1. **Use consistent formatting** for better readability
2. **Include metadata** like key, tempo, and capo information
3. **Structure your songs** with verse/chorus markers
4. **Add comments** for performance notes
5. **Test your formatting** with the preview feature

### Organizing Your Library

1. **Use descriptive titles** for easy searching
2. **Tag songs consistently** with genres or themes
3. **Include artist information** for better organization
4. **Use favorites** for frequently accessed songs
5. **Regular maintenance** to keep your library clean

### Performance Tips

1. **Use keyboard shortcuts** for faster navigation
2. **Bookmark frequently used songs** for quick access
3. **Take advantage of search** instead of browsing
4. **Use the preview mode** for performance viewing
5. **Export backup copies** of important songs

## Getting Support

If you need help using ChordMe:

1. **Check the documentation** in this user manual
2. **Search the FAQ** for common questions
3. **Review troubleshooting guides** for technical issues
4. **Contact support** through the GitHub repository
5. **Join the community** for user discussions

---

**Language:** **English** | [Español](user-guide-es.md)

*For technical details and API usage, see the [API Reference](api-reference.md) and [Developer Guide](developer-guide.md).*