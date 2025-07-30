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

*For more information about using the ChordMe API, see the [User Guide](user-guide.md) and [Developer Guide](developer-guide.md).*