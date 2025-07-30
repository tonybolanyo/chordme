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

### Sharing Songs

- **Public links**: Share songs with non-users
- **Collaboration mode**: Work on songs with other users
- **Version history**: Track changes over time
- **Comments and notes**: Add collaborative feedback

### User Permissions

- **Private songs**: Keep songs personal to your account
- **Shared collections**: Collaborate with specific users
- **Public library**: Share songs with the community
- **Read-only sharing**: Allow viewing without editing

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