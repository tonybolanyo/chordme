---
layout: default
lang: en
title: Google Drive Server Integration
---

# Server-Side Google Drive Integration

This document describes the server-side Google Drive integration implemented in ChordMe's backend API.

## Overview

ChordMe now supports server-side Google Drive operations that complement the existing client-side Google OAuth2 integration. This enables:

- Server-side ChordPro validation before saving to Google Drive
- Batch validation of multiple files
- Automated backup of user songs to Google Drive
- Enhanced security through server-side processing

## Configuration

### Enabling Google Drive Integration

Google Drive integration is **disabled by default** for security. To enable it:

1. Edit `backend/config.py`:
```python
# Google Drive API configuration
GOOGLE_DRIVE_ENABLED = True  # Enable server-side Google Drive features
GOOGLE_CLIENT_ID = 'your-google-client-id'  # Same as frontend
GOOGLE_CLIENT_SECRET = 'your-google-client-secret'  # Server-side only
GOOGLE_REDIRECT_URI = 'https://your-domain.com/auth/google/callback'
```

2. Ensure the Google Drive API dependencies are installed:
```bash
pip install google-api-python-client google-auth google-auth-oauthlib
```

### Security Considerations

- Server-side integration uses OAuth2 tokens from frontend authentication
- No permanent credentials are stored server-side
- Rate limiting protects against abuse
- Request size validation prevents large uploads
- All operations require user authentication

## API Endpoints

### 1. Validate and Save ChordPro File

**POST** `/api/v1/google-drive/validate-and-save`

Validates ChordPro content on the server before saving to Google Drive.

**Request:**
```json
{
  "access_token": "user-oauth2-token",
  "file_name": "my-song.pro",
  "content": "{title: My Song}\n[C]Hello [G]world",
  "parent_folder_id": "optional-folder-id"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "validation": {
      "valid": true,
      "message": "Valid ChordPro content"
    },
    "file": {
      "id": "google-drive-file-id",
      "name": "my-song.pro",
      "webViewLink": "https://drive.google.com/..."
    },
    "message": "ChordPro content validated and saved successfully"
  }
}
```

**Rate Limiting:** 10 requests per 5 minutes
**Max Size:** 1MB

### 2. Batch Validate Files

**POST** `/api/v1/google-drive/batch-validate`

Validates multiple ChordPro files from Google Drive in a single operation.

**Request:**
```json
{
  "access_token": "user-oauth2-token",
  "file_ids": ["file-id-1", "file-id-2", "file-id-3"]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "results": [
      {
        "file_id": "file-id-1",
        "file_name": "song1.pro",
        "validation": {
          "valid": true,
          "message": "Valid ChordPro content"
        },
        "success": true
      }
    ],
    "total": 3,
    "processed": 3
  }
}
```

**Rate Limiting:** 5 requests per 5 minutes
**Max Files:** 20 files per request
**Max Size:** 512KB

### 3. Backup User Songs

**POST** `/api/v1/google-drive/backup-songs`

Creates a backup of all user songs in Google Drive organized in a dedicated folder.

**Request:**
```json
{
  "access_token": "user-oauth2-token",
  "backup_folder_name": "ChordMe Backup"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "folder_id": "backup-folder-id",
    "folder_name": "ChordMe Backup",
    "files": [
      {
        "song_id": 1,
        "song_title": "My Song",
        "drive_file_id": "file-id",
        "drive_file_name": "My_Song.pro",
        "drive_link": "https://drive.google.com/..."
      }
    ],
    "total_songs": 10,
    "backed_up": 10
  }
}
```

**Rate Limiting:** 2 requests per hour
**Max Size:** 5MB

## Usage Examples

### Frontend Integration

```javascript
// Assuming you have a Google OAuth2 token from the frontend
const googleToken = googleOAuth2Service.getStoredTokens()?.access_token;

// Validate and save a ChordPro file
const response = await fetch('/api/v1/google-drive/validate-and-save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userJwtToken}`
  },
  body: JSON.stringify({
    access_token: googleToken,
    file_name: 'my-song.pro',
    content: '{title: My Song}\n[C]Hello [G]world'
  })
});

const result = await response.json();
if (result.data.success) {
  console.log('File saved:', result.data.file.webViewLink);
}
```

### Batch Validation

```javascript
// Validate multiple files at once
const fileIds = ['file1', 'file2', 'file3'];

const response = await fetch('/api/v1/google-drive/batch-validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userJwtToken}`
  },
  body: JSON.stringify({
    access_token: googleToken,
    file_ids: fileIds
  })
});

const result = await response.json();
result.data.results.forEach(file => {
  if (file.validation.valid) {
    console.log(`${file.file_name} is valid`);
  } else {
    console.log(`${file.file_name} has errors:`, file.validation.errors);
  }
});
```

### Automated Backup

```javascript
// Create a backup of all user songs
const response = await fetch('/api/v1/google-drive/backup-songs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userJwtToken}`
  },
  body: JSON.stringify({
    access_token: googleToken,
    backup_folder_name: 'ChordMe Backup ' + new Date().toISOString().split('T')[0]
  })
});

const result = await response.json();
if (result.data.success) {
  console.log(`Backed up ${result.data.backed_up} songs to Google Drive`);
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "error": "Error message describing what went wrong"
}
```

Common error scenarios:

- **Service Disabled:** `Google Drive integration is not enabled on this server`
- **Missing Token:** `Access token is required`
- **Invalid Content:** `ChordPro validation failed`
- **Rate Limited:** `Rate limit exceeded, try again later`
- **Google API Error:** `Google Drive error: [specific error]`

## Testing

The server-side Google Drive integration includes comprehensive tests:

```bash
# Run Google Drive service tests
cd backend && python -m pytest tests/test_google_drive_service.py -v

# Run Google Drive API endpoint tests
cd backend && python -m pytest tests/test_google_drive_endpoints.py -v
```

## Security Features

- **Authentication Required:** All endpoints require valid JWT tokens
- **Rate Limiting:** Prevents abuse with configurable limits per endpoint
- **Request Size Validation:** Limits request sizes to prevent large uploads
- **Input Sanitization:** All input data is sanitized before processing
- **CSRF Protection:** Optional CSRF token validation
- **Security Headers:** Comprehensive security headers on all responses
- **Error Logging:** Security-focused logging for audit trails

## Integration with Existing Features

The server-side Google Drive integration works seamlessly with:

- **Client-side Google OAuth2:** Uses tokens from frontend authentication
- **ChordPro Validation:** Leverages existing server-side ChordPro parser
- **User Authentication:** Integrates with existing JWT authentication
- **Song Management:** Works with existing song storage and retrieval
- **Security Framework:** Uses existing rate limiting and security headers

## Deployment

For production deployment:

1. Enable Google Drive integration in production config
2. Configure Google OAuth2 credentials
3. Ensure HTTPS is enabled (required for Google OAuth2)
4. Monitor rate limiting logs for usage patterns
5. Set up log rotation for Google Drive operation logs

## Future Enhancements

Potential improvements for the server-side integration:

- Real-time sync between ChordMe and Google Drive
- Automatic conflict resolution for concurrent edits
- Support for Google Workspace shared drives
- Integration with other Google services (Sheets, Docs)
- Advanced batch operations (move, rename, organize)
- Webhook support for Drive change notifications