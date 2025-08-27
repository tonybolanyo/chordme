---
layout: default
lang: en
title: ChordMe API Reference
---

# ChordMe API Reference

This document provides a complete reference for the ChordMe REST API. The API provides programmatic access to all ChordMe functionality, including user authentication, song management, and ChordPro validation.

## Base URL

```
http://localhost:5000/api/v1
```

For production deployments, replace with your actual domain.

## Authentication

ChordMe uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

Obtain a JWT token by logging in through the authentication endpoint.

## Response Format

All API responses follow this standard format:

### Success Response

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Endpoints

### Health Check

Check if the API is running and accessible.

#### `GET /health`

**Description**: Health check endpoint for monitoring and testing.

**Authentication**: Not required

**Response**:
```json
{
  "status": "success",
  "message": "ChordMe API is running",
  "data": {
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Example**:
```bash
curl -X GET http://localhost:5000/api/v1/health
```

---

## Authentication Endpoints

### User Registration

Register a new user account.

#### `POST /auth/register`

**Description**: Create a new user account with email and password.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Validation Rules**:
- Email must be valid format
- Email must be unique
- Password minimum 8 characters
- Password must contain letters and numbers

**Success Response** (201):
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Error Responses**:

*400 - Validation Error*:
```json
{
  "status": "error",
  "message": "Validation failed",
  "error": "Email already exists"
}
```

*400 - Invalid Email*:
```json
{
  "status": "error",
  "message": "Validation failed",
  "error": "Invalid email format"
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"mypassword123"}'
```

### User Login

Authenticate and receive a JWT token.

#### `POST /auth/login`

**Description**: Authenticate user and return JWT token for API access.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
}
```

**Error Responses**:

*401 - Invalid Credentials*:
```json
{
  "status": "error",
  "message": "Invalid credentials",
  "error": "Email or password is incorrect"
}
```

*400 - Missing Fields*:
```json
{
  "status": "error",
  "message": "Validation failed",
  "error": "Email and password are required"
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"mypassword123"}'
```

---

## Song Management Endpoints

All song endpoints require authentication.

### List All Songs

Retrieve all songs for the authenticated user.

#### `GET /songs`

**Description**: Get a list of all songs belonging to the authenticated user.

**Authentication**: Required

**Query Parameters**:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of songs per page (default: 50, max: 100)
- `search` (optional): Search term for filtering songs
- `sort` (optional): Sort order - `title`, `artist`, `created_at` (default: `created_at`)
- `order` (optional): Sort direction - `asc`, `desc` (default: `desc`)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Songs retrieved successfully",
  "data": {
    "songs": [
      {
        "id": 1,
        "title": "Amazing Grace",
        "artist": "John Newton",
        "key": "G",
        "content": "{title: Amazing Grace}\n{artist: John Newton}...",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "pages": 1
    }
  }
}
```

**Example**:
```bash
curl -X GET http://localhost:5000/api/v1/songs \
  -H "Authorization: Bearer <your-token>"
```

**With Query Parameters**:
```bash
curl -X GET "http://localhost:5000/api/v1/songs?search=amazing&sort=title&order=asc" \
  -H "Authorization: Bearer <your-token>"
```

### Get Single Song

Retrieve a specific song by ID.

#### `GET /songs/{id}`

**Description**: Get detailed information about a specific song.

**Authentication**: Required

**Path Parameters**:
- `id`: Song ID (integer)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Song retrieved successfully",
  "data": {
    "song": {
      "id": 1,
      "title": "Amazing Grace",
      "artist": "John Newton",
      "key": "G",
      "capo": 0,
      "tempo": 90,
      "content": "{title: Amazing Grace}\n{artist: John Newton}\n{key: G}...",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "user_id": 1
    }
  }
}
```

**Error Responses**:

*404 - Song Not Found*:
```json
{
  "status": "error",
  "message": "Song not found",
  "error": "Song with ID 999 does not exist"
}
```

*403 - Access Denied*:
```json
{
  "status": "error",
  "message": "Access denied",
  "error": "You do not have permission to access this song"
}
```

**Example**:
```bash
curl -X GET http://localhost:5000/api/v1/songs/1 \
  -H "Authorization: Bearer <your-token>"
```

### Create Song

Create a new song.

#### `POST /songs`

**Description**: Create a new song with ChordPro content.

**Authentication**: Required

**Request Body**:
```json
{
  "title": "Amazing Grace",
  "artist": "John Newton",
  "key": "G",
  "capo": 0,
  "tempo": 90,
  "content": "{title: Amazing Grace}\n{artist: John Newton}\n{key: G}\n\n{start_of_verse}\n[G]Amazing [G7]grace, how [C]sweet the [G]sound\n{end_of_verse}"
}
```

**Required Fields**:
- `title`: Song title
- `content`: ChordPro formatted song content

**Optional Fields**:
- `artist`: Artist name
- `key`: Musical key
- `capo`: Capo position (integer)
- `tempo`: Tempo in BPM (integer)

**Success Response** (201):
```json
{
  "status": "success",
  "message": "Song created successfully",
  "data": {
    "song": {
      "id": 2,
      "title": "Amazing Grace",
      "artist": "John Newton",
      "key": "G",
      "capo": 0,
      "tempo": 90,
      "content": "{title: Amazing Grace}...",
      "created_at": "2024-01-15T11:00:00Z",
      "updated_at": "2024-01-15T11:00:00Z",
      "user_id": 1
    }
  }
}
```

**Error Responses**:

*400 - Validation Error*:
```json
{
  "status": "error",
  "message": "Validation failed",
  "error": "Title and content are required"
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/v1/songs \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Amazing Grace",
    "artist": "John Newton",
    "content": "{title: Amazing Grace}\n[G]Amazing grace..."
  }'
```

### Update Song

Update an existing song.

#### `PUT /songs/{id}`

**Description**: Update an existing song's information and content.

**Authentication**: Required

**Path Parameters**:
- `id`: Song ID (integer)

**Request Body**:
```json
{
  "title": "Amazing Grace (Updated)",
  "artist": "John Newton",
  "key": "C",
  "capo": 0,
  "tempo": 85,
  "content": "{title: Amazing Grace (Updated)}\n{artist: John Newton}..."
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Song updated successfully",
  "data": {
    "song": {
      "id": 1,
      "title": "Amazing Grace (Updated)",
      "artist": "John Newton",
      "key": "C",
      "capo": 0,
      "tempo": 85,
      "content": "{title: Amazing Grace (Updated)}...",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:15:00Z",
      "user_id": 1
    }
  }
}
```

**Error Responses**:

*404 - Song Not Found*:
```json
{
  "status": "error",
  "message": "Song not found",
  "error": "Song with ID 999 does not exist"
}
```

*403 - Access Denied*:
```json
{
  "status": "error",
  "message": "Access denied",
  "error": "You do not have permission to modify this song"
}
```

**Example**:
```bash
curl -X PUT http://localhost:5000/api/v1/songs/1 \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Amazing Grace (Updated)",
    "key": "C"
  }'
```

### Delete Song

Delete a song permanently.

#### `DELETE /songs/{id}`

**Description**: Permanently delete a song from the user's library.

**Authentication**: Required

**Path Parameters**:
- `id`: Song ID (integer)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Song deleted successfully",
  "data": {
    "deleted_song_id": 1
  }
}
```

**Error Responses**:

*404 - Song Not Found*:
```json
{
  "status": "error",
  "message": "Song not found",
  "error": "Song with ID 999 does not exist"
}
```

*403 - Access Denied*:
```json
{
  "status": "error",
  "message": "Access denied",
  "error": "You do not have permission to delete this song"
}
```

**Example**:
```bash
curl -X DELETE http://localhost:5000/api/v1/songs/1 \
  -H "Authorization: Bearer <your-token>"
```

---

## ChordPro Validation

### Validate ChordPro Content

Validate and analyze ChordPro formatted content.

#### `POST /songs/validate-chordpro`

**Description**: Validate ChordPro syntax and extract metadata without creating a song.

**Authentication**: Required

**Request Body**:
```json
{
  "content": "{title: Test Song}\n{artist: Test Artist}\n[C]Test [G]lyrics"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "ChordPro content validated successfully",
  "data": {
    "is_valid": true,
    "warnings": [],
    "metadata": {
      "title": "Test Song",
      "artist": "Test Artist",
      "chords": ["C", "G"],
      "chord_count": 2
    },
    "directives": {
      "title": "Test Song",
      "artist": "Test Artist"
    },
    "chords": ["C", "G"],
    "statistics": {
      "line_count": 3,
      "character_count": 55,
      "directive_count": 2,
      "unique_chord_count": 2
    }
  }
}
```

**Validation with Warnings**:
```json
{
  "status": "success",
  "message": "ChordPro content validated with warnings",
  "data": {
    "is_valid": true,
    "warnings": [
      "Unknown directive: {custom_directive: value}",
      "Uncommon chord notation: [Xmaj7#11]"
    ],
    "metadata": {
      "title": "Test Song",
      "chords": ["C", "G", "Xmaj7#11"]
    }
  }
}
```

**Error Response with Invalid Content**:
```json
{
  "status": "error",
  "message": "Invalid ChordPro content",
  "error": "Mismatched section markers: {start_of_verse} without {end_of_verse}",
  "data": {
    "is_valid": false,
    "errors": [
      "Line 5: Mismatched section markers",
      "Line 12: Invalid directive syntax"
    ]
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/v1/songs/validate-chordpro \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{title: Test Song}\n[C]Test [G]lyrics"
  }'
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Validation error
- `401` - Unauthorized / Invalid token
- `403` - Forbidden / Access denied
- `404` - Resource not found
- `500` - Internal server error

### Common Error Scenarios

#### Authentication Errors

*Missing Token*:
```json
{
  "status": "error",
  "message": "Authentication required",
  "error": "Authorization header is missing"
}
```

*Invalid Token*:
```json
{
  "status": "error",
  "message": "Invalid token",
  "error": "JWT token is expired or invalid"
}
```

#### Validation Errors

*Missing Required Fields*:
```json
{
  "status": "error",
  "message": "Validation failed",
  "error": "Title and content are required fields"
}
```

*Invalid Data Format*:
```json
{
  "status": "error",
  "message": "Validation failed",
  "error": "Tempo must be a positive integer"
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Anonymous requests**: 100 requests per hour
- **Authenticated requests**: 1000 requests per hour
- **Bulk operations**: 50 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

**Response Format**:
```json
{
  "data": {
    "songs": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## Content Type

All requests should use `Content-Type: application/json` for JSON payloads.

All responses are returned as `Content-Type: application/json`.

## CORS

Cross-Origin Resource Sharing (CORS) is enabled for all origins in development. In production, configure CORS settings appropriately for your domain.

## API Versioning

The current API version is `v1`. The version is included in the URL path: `/api/v1/`

Future versions will be released as `/api/v2/`, etc., with backward compatibility maintained.

## SDK and Client Libraries

### JavaScript/Node.js Example

```javascript
class ChordMeAPI {
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.status === 'success') {
      this.token = data.data.token;
    }
    return data;
  }

  async getSongs() {
    const response = await fetch(`${this.baseUrl}/songs`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async createSong(songData) {
    const response = await fetch(`${this.baseUrl}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(songData)
    });
    return response.json();
  }
}

// Usage
const api = new ChordMeAPI('http://localhost:5000/api/v1');
await api.login('user@example.com', 'password');
const songs = await api.getSongs();
```

### Python Example

```python
import requests

class ChordMeAPI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token

    def login(self, email, password):
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        data = response.json()
        if data["status"] == "success":
            self.token = data["data"]["token"]
        return data

    def get_songs(self):
        response = requests.get(
            f"{self.base_url}/songs",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return response.json()

    def create_song(self, song_data):
        response = requests.post(
            f"{self.base_url}/songs",
            json=song_data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return response.json()

# Usage
api = ChordMeAPI("http://localhost:5000/api/v1")
api.login("user@example.com", "password")
songs = api.get_songs()
```

---

## Collaboration Endpoints

All collaboration endpoints require authentication and appropriate permissions.

### Share Song with User

Share a song with another user and grant them specific permissions.

#### `POST /songs/{id}/share`

**Description**: Share a song with another user by email and assign permission level.

**Authentication**: Required (Owner or Admin permissions)

**Path Parameters**:
- `id`: Song ID (integer)

**Request Body**:
```json
{
  "user_email": "collaborator@example.com",
  "permission_level": "edit"
}
```

**Permission Levels**:
- `read`: View song content only
- `edit`: View and modify song content
- `admin`: Full access including sharing management

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Song shared successfully with collaborator@example.com",
  "data": {
    "song_id": 1,
    "user_email": "collaborator@example.com",
    "permission_level": "edit",
    "shared_at": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses**:

*400 - Invalid Permission Level*:
```json
{
  "status": "error",
  "message": "Invalid permission level",
  "error": "Permission level must be read, edit, or admin"
}
```

*400 - User Not Found*:
```json
{
  "status": "error",
  "message": "User not found",
  "error": "No user found with email collaborator@example.com"
}
```

*400 - Cannot Share with Self*:
```json
{
  "status": "error",
  "message": "Cannot share song with yourself",
  "error": "You cannot share a song with your own email address"
}
```

*403 - Insufficient Permissions*:
```json
{
  "status": "error",
  "message": "Access denied",
  "error": "You need owner or admin permissions to share this song"
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/v1/songs/1/share \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "collaborator@example.com",
    "permission_level": "edit"
  }'
```

### Get Song Collaborators

Retrieve a list of all users who have access to a song.

#### `GET /songs/{id}/collaborators`

**Description**: Get detailed information about all collaborators for a song, including the owner.

**Authentication**: Required (Must have access to the song)

**Path Parameters**:
- `id`: Song ID (integer)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Retrieved 3 collaborators",
  "data": {
    "owner": {
      "user_id": 1,
      "email": "owner@example.com",
      "permission_level": "owner",
      "shared_at": "2024-01-10T10:00:00Z"
    },
    "collaborators": [
      {
        "user_id": 2,
        "email": "editor@example.com",
        "permission_level": "edit",
        "shared_at": "2024-01-12T14:30:00Z"
      },
      {
        "user_id": 3,
        "email": "reader@example.com",
        "permission_level": "read",
        "shared_at": "2024-01-13T09:15:00Z"
      }
    ],
    "total_collaborators": 2,
    "total_with_owner": 3
  }
}
```

**Error Responses**:

*404 - Song Not Found*:
```json
{
  "status": "error",
  "message": "Song not found",
  "error": "You do not have access to this song or it does not exist"
}
```

**Example**:
```bash
curl -X GET http://localhost:5000/api/v1/songs/1/collaborators \
  -H "Authorization: Bearer <your-token>"
```

### Update User Permissions

Change the permission level for an existing collaborator.

#### `PUT /songs/{id}/permissions`

**Description**: Update the permission level for a user who already has access to the song.

**Authentication**: Required (Owner or Admin permissions)

**Path Parameters**:
- `id`: Song ID (integer)

**Request Body**:
```json
{
  "user_email": "collaborator@example.com",
  "permission_level": "admin"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "User permissions updated successfully",
  "data": {
    "song_id": 1,
    "user_email": "collaborator@example.com",
    "old_permission": "edit",
    "new_permission": "admin",
    "updated_at": "2024-01-15T12:30:00Z"
  }
}
```

**Error Responses**:

*400 - User Not Collaborator*:
```json
{
  "status": "error",
  "message": "User is not a collaborator",
  "error": "collaborator@example.com does not have access to this song"
}
```

*400 - Cannot Change Owner*:
```json
{
  "status": "error",
  "message": "Cannot change owner permissions",
  "error": "Song owner permissions cannot be modified"
}
```

**Example**:
```bash
curl -X PUT http://localhost:5000/api/v1/songs/1/permissions \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "collaborator@example.com",
    "permission_level": "admin"
  }'
```

### Remove Collaborator Access

Remove a user's access to a song completely.

#### `DELETE /songs/{id}/share/{user_id}`

**Description**: Revoke all access permissions for a user on a specific song.

**Authentication**: Required (Owner or Admin permissions)

**Path Parameters**:
- `id`: Song ID (integer)
- `user_id`: User ID to remove (integer)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "User access revoked successfully",
  "data": {
    "song_id": 1,
    "removed_user_id": 3,
    "removed_user_email": "collaborator@example.com",
    "removed_at": "2024-01-15T13:00:00Z"
  }
}
```

**Error Responses**:

*400 - User Not Collaborator*:
```json
{
  "status": "error",
  "message": "User is not a collaborator",
  "error": "User does not have access to this song"
}
```

*400 - Cannot Remove Owner*:
```json
{
  "status": "error",
  "message": "Cannot remove owner access",
  "error": "Song owner access cannot be removed"
}
```

**Example**:
```bash
curl -X DELETE http://localhost:5000/api/v1/songs/1/share/3 \
  -H "Authorization: Bearer <your-token>"
```

### List Shared Songs

Get all songs that have been shared with the authenticated user.

#### `GET /songs/shared`

**Description**: Retrieve all songs that other users have shared with the authenticated user.

**Authentication**: Required

**Query Parameters**:
- `permission` (optional): Filter by permission level (`read`, `edit`, `admin`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of songs per page (default: 50, max: 100)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Retrieved 2 shared songs",
  "data": {
    "shared_songs": [
      {
        "id": 5,
        "title": "Shared Song 1",
        "artist": "Artist Name",
        "owner": {
          "user_id": 2,
          "email": "owner@example.com"
        },
        "my_permission": "edit",
        "shared_at": "2024-01-12T14:30:00Z",
        "last_modified": "2024-01-14T16:20:00Z",
        "content_preview": "{title: Shared Song 1}\n[C]Example content..."
      },
      {
        "id": 8,
        "title": "Shared Song 2", 
        "artist": "Another Artist",
        "owner": {
          "user_id": 4,
          "email": "another@example.com"
        },
        "my_permission": "read",
        "shared_at": "2024-01-13T09:15:00Z",
        "last_modified": "2024-01-13T09:15:00Z",
        "content_preview": "{title: Shared Song 2}\n[G]More content..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "pages": 1
    }
  }
}
```

**Example**:
```bash
curl -X GET http://localhost:5000/api/v1/songs/shared \
  -H "Authorization: Bearer <your-token>"

# Filter by permission level
curl -X GET "http://localhost:5000/api/v1/songs/shared?permission=edit" \
  -H "Authorization: Bearer <your-token>"
```

---

## Real-Time Collaboration Features

ChordMe supports real-time collaborative editing when Firebase integration is enabled. These features enhance the collaboration experience with live updates and conflict resolution.

### Real-Time Session Management

When multiple users edit the same song simultaneously, ChordMe automatically:

1. **Starts collaboration sessions** when multiple users access the same song
2. **Synchronizes text operations** using operational transformation (OT)
3. **Shows live cursor positions** of all active collaborators
4. **Displays user presence indicators** showing who is currently editing
5. **Handles conflict resolution** automatically or with user intervention

### Operational Transformation

ChordMe implements sophisticated operational transformation to ensure:
- **Conflict-free editing**: Multiple users can edit simultaneously without corruption
- **Intention preservation**: User edits maintain their intended meaning
- **Document consistency**: All users see the same final state
- **Real-time synchronization**: Changes appear instantly across all clients

### Live Cursor Tracking

Real-time features include:
- **Cursor position sharing**: See where other users are editing
- **User identification**: Color-coded cursors with user names
- **Selection highlighting**: Visual indication of selected text by collaborators
- **Presence indicators**: Online/offline status of collaborators

### Conflict Resolution

When conflicting edits occur:

1. **Automatic resolution**: Simple conflicts are resolved using OT algorithms
2. **Manual resolution**: Complex conflicts present a resolution dialog
3. **Merge preview**: Users can preview merged content before accepting
4. **Rollback capability**: Failed operations can be rolled back safely

---

## Version History Management

The ChordMe API provides comprehensive version history functionality, automatically creating snapshots of songs whenever they are modified. This enables users to track changes over time and restore previous versions when needed.

### Get Song Versions

Retrieve the version history for a specific song.

#### `GET /songs/{id}/versions`

**Description**: Get all version snapshots for a song, ordered by creation date (newest first).

**Authentication**: Required

**Path Parameters**:
- `id`: Song ID (integer)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Retrieved 3 versions",
  "data": {
    "versions": [
      {
        "id": 5,
        "song_id": 123,
        "version_number": 3,
        "title": "Amazing Grace (Updated)",
        "content": "{title: Amazing Grace (Updated)}\n{artist: John Newton}\n\n[C]Amazing [F]grace...",
        "user_id": 1,
        "created_at": "2024-01-15T14:30:00Z"
      },
      {
        "id": 4,
        "song_id": 123,
        "version_number": 2,
        "title": "Amazing Grace (Draft)",
        "content": "{title: Amazing Grace (Draft)}\n{artist: John Newton}\n\n[C]Amazing [F]grace...",
        "user_id": 1,
        "created_at": "2024-01-15T11:15:00Z"
      },
      {
        "id": 3,
        "song_id": 123,
        "version_number": 1,
        "title": "Amazing Grace",
        "content": "{title: Amazing Grace}\n{artist: John Newton}\n\n[C]Amazing [F]grace...",
        "user_id": 1,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Error Responses**:

*404 - Song Not Found*:
```json
{
  "status": "error",
  "message": "Song not found",
  "error": "Song with ID 999 does not exist or you don't have permission to access it"
}
```

**Example**:
```bash
curl -X GET http://localhost:5000/api/v1/songs/123/versions \
  -H "Authorization: Bearer <your-token>"
```

### Get Specific Version

Retrieve a specific version of a song by version ID.

#### `GET /songs/{id}/versions/{version_id}`

**Description**: Get detailed information about a specific version snapshot.

**Authentication**: Required

**Path Parameters**:
- `id`: Song ID (integer)
- `version_id`: Version ID (integer)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Version retrieved successfully",
  "data": {
    "id": 3,
    "song_id": 123,
    "version_number": 1,
    "title": "Amazing Grace",
    "content": "{title: Amazing Grace}\n{artist: John Newton}\n\n[C]Amazing [F]grace how [C]sweet the sound\n[Am]That saved a [F]wretch like [C]me",
    "user_id": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses**:

*404 - Version Not Found*:
```json
{
  "status": "error",
  "message": "Version not found",
  "error": "Version with ID 999 does not exist for this song"
}
```

**Example**:
```bash
curl -X GET http://localhost:5000/api/v1/songs/123/versions/3 \
  -H "Authorization: Bearer <your-token>"
```

### Restore Song Version

Restore a song to a previous version state.

#### `POST /songs/{id}/restore/{version_id}`

**Description**: Restore a song to the state of a specific version. This creates a new version with the restored content.

**Authentication**: Required

**Path Parameters**:
- `id`: Song ID (integer)
- `version_id`: Version ID to restore (integer)

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Song restored to version 1 successfully",
  "data": {
    "id": 123,
    "title": "Amazing Grace",
    "content": "{title: Amazing Grace}\n{artist: John Newton}\n\n[C]Amazing [F]grace how [C]sweet the sound",
    "author_id": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T15:45:00Z"
  }
}
```

**Error Responses**:

*403 - Insufficient Permissions*:
```json
{
  "status": "error",
  "message": "Insufficient permissions to edit this song",
  "error": "You need edit permissions to restore song versions"
}
```

*404 - Version Not Found*:
```json
{
  "status": "error", 
  "message": "Version not found",
  "error": "Version with ID 999 does not exist for this song"
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/v1/songs/123/restore/3 \
  -H "Authorization: Bearer <your-token>"
```

### Version History Behavior

#### Automatic Version Creation

Version snapshots are automatically created in the following scenarios:

1. **Song Updates**: Every time a song's title or content is modified via `PUT /songs/{id}`
2. **Version Restoration**: When a song is restored to a previous version
3. **Collaborative Edits**: When multiple users edit the same song

#### Version Numbering

- Version numbers start at 1 and increment sequentially
- Version numbers are unique per song
- Deleted versions maintain their numbers (no renumbering)

#### Storage Considerations

- Each version stores the complete song state (title and content)
- Versions include metadata: user who made the change, timestamp
- Old versions are never automatically deleted

#### Permission Requirements

| Operation | Required Permission |
|-----------|-------------------|
| View versions | Read access to song |
| Get specific version | Read access to song |
| Restore version | Edit access to song |

---

## Advanced Features

### Rate Limiting

All API endpoints are subject to rate limiting:

- **Authenticated users**: 1000 requests per hour
- **Anonymous users**: 100 requests per hour
- **Premium users**: 5000 requests per hour

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642781400
```

### Pagination

List endpoints support pagination with consistent parameters:

**Parameters:**
- `page`: Page number (starting from 1)
- `per_page`: Items per page (max 100)

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_FAILED` | Invalid credentials |
| `AUTHORIZATION_FAILED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `SONG_NOT_FOUND` | Song doesn't exist or no access |
| `INVALID_CHORDPRO` | ChordPro content validation failed |
| `COLLABORATION_ERROR` | Collaboration operation failed |

### Content Types

Supported content types:
- `application/json` (default)
- `application/xml` (limited endpoints)
- `text/plain` (ChordPro export)
- `application/pdf` (PDF export)

### Webhooks

ChordMe supports webhooks for real-time notifications:

**Events:**
- `song.created`
- `song.updated`
- `song.deleted`
- `collaboration.added`
- `collaboration.removed`

**Webhook payload example:**
```json
{
  "event": "song.updated",
  "timestamp": "2024-01-27T11:00:00Z",
  "data": {
    "song_id": 123,
    "user_id": 1,
    "changes": ["title", "content"]
  }
}
```

For more detailed technical information, see the [Developer Guide](developer-guide.md).

---

**Language:** **English** | [Español](api-reference-es.md)

*For interactive API documentation with live testing, visit the [Swagger UI](swagger.html).*

*For more information about using the ChordMe API, see the [User Guide](user-guide.md) and [Developer Guide](developer-guide.md).*