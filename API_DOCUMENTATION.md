# API Documentation Implementation

This document describes the API documentation implementation for ChordMe using Swagger/OpenAPI.

## Overview

The ChordMe API documentation is automatically generated from the Flask application code using [Flasgger](https://github.com/flasgger/flasgger), which creates Swagger/OpenAPI 2.0 specifications.

## Components

### 1. Backend Integration

**File**: `backend/chordme/__init__.py`

- Configures Flasgger with comprehensive Swagger template
- Defines data models (User, Song, Error, Success)
- Sets up Swagger UI at `/apidocs/`
- Provides API spec at `/apispec.json`

**File**: `backend/chordme/api.py`

- Enhanced docstrings with Swagger YAML specifications
- Comprehensive endpoint documentation including:
  - Parameters and request bodies
  - Response schemas and status codes
  - Authentication requirements
  - Rate limiting information

### 2. Documentation Generation

**File**: `backend/generate_docs.py`

Automated script that:
- Starts Flask server temporarily
- Fetches Swagger JSON specification
- Generates static documentation files:
  - `docs/swagger.json` - OpenAPI specification
  - `docs/index.html` - Swagger UI interface
  - `docs/README.md` - Documentation overview

**Usage**:
```bash
cd backend
python generate_docs.py
```

### 3. GitHub Actions Workflows

**File**: `.github/workflows/update-api-docs.yml`

Triggers on:
- Push to main branch
- Pull requests to main branch
- Changes to API-related files

Actions:
- Installs dependencies
- Generates documentation
- Commits changes (on push)
- Uploads artifacts (on PR)

**File**: `.github/workflows/deploy-api-docs.yml`

Triggers on:
- Push to main branch with docs changes
- Manual workflow dispatch

Actions:
- Builds Jekyll site from docs
- Deploys to GitHub Pages

### 4. GitHub Pages Configuration

**File**: `docs/_config.yml`

- Configures Jekyll theme
- Sets up proper metadata
- Enables required plugins

## API Documentation Access

- **Development**: http://localhost:5000/apidocs/
- **Production**: https://tonybolanyo.github.io/chordme/

## Documented Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### System
- `GET /api/v1/health` - Health check
- `GET /api/v1/csrf-token` - CSRF token generation

### Songs
- `GET /api/v1/songs` - List user's songs
- `POST /api/v1/songs` - Create new song
- `GET /api/v1/songs/{id}` - Get specific song
- `PUT /api/v1/songs/{id}` - Update song
- `DELETE /api/v1/songs/{id}` - Delete song
- `GET /api/v1/songs/{id}/download` - Download song file
- `POST /api/v1/songs/validate-chordpro` - Validate ChordPro content
- `POST /api/v1/songs/transpose-chordpro` - Transpose ChordPro content

## Data Models

### User
- `id` (integer): User ID
- `email` (string): Email address
- `created_at` (datetime): Account creation timestamp

### Song
- `id` (integer): Song ID
- `title` (string): Song title
- `content` (string): ChordPro content
- `author_id` (integer): Owner user ID
- `created_at` (datetime): Creation timestamp
- `updated_at` (datetime): Last update timestamp
- `shared_with` (array): List of user IDs that have access to this song
- `permissions` (object): Mapping of user IDs to permission levels ("read", "edit", "admin")
- `share_settings` (string): Visibility setting ("private", "public", "link-shared")

### Response Models
- `Success`: Standard success response wrapper
- `Error`: Standard error response wrapper

## Sharing Model

### Overview

The ChordMe API supports comprehensive song sharing capabilities with granular permission controls and real-time collaboration features.

### Permission Levels

- **read**: User can view the song content and download it
- **edit**: User can view and modify the song content in real-time
- **admin**: User can view, modify, and manage sharing settings
- **owner**: Complete control over song and sharing (assigned automatically)

### Share Settings

- **private**: Song is only accessible to the owner and explicitly shared users
- **public**: Song is accessible to all authenticated users (future feature)
- **link-shared**: Song is accessible via shareable links (future feature)

### Sharing Workflow

1. **Create a song**: Song starts as private by default
2. **Share with users**: Use POST `/songs/{id}/share` to add collaborators
3. **Modify permissions**: Use PUT `/songs/{id}/permissions` to update access levels
4. **Monitor collaboration**: Use GET `/songs/{id}/collaborators` to view all users
5. **Remove access**: Use DELETE `/songs/{id}/share/{user_id}` to revoke access

### Real-Time Collaboration Features

When Firebase integration is enabled, the API supports:

- **Operational Transformation**: Conflict-free concurrent editing
- **Live Cursor Tracking**: Real-time cursor position sharing
- **Presence Management**: Active user status and indicators
- **Automatic Conflict Resolution**: Smart merging of simultaneous edits
- **Session Management**: Collaborative editing session lifecycle

### API Endpoints for Collaboration

#### Core Sharing Endpoints

- `POST /api/v1/songs/{id}/share` - Share song with user
- `GET /api/v1/songs/{id}/collaborators` - List all collaborators
- `PUT /api/v1/songs/{id}/permissions` - Update user permissions
- `DELETE /api/v1/songs/{id}/share/{user_id}` - Remove collaborator access
- `GET /api/v1/songs/shared` - List songs shared with current user

#### Real-Time Session Endpoints

- `POST /api/v1/collaboration/{song_id}/start` - Start collaboration session
- `GET /api/v1/collaboration/{song_id}/status` - Get session status
- `POST /api/v1/collaboration/{song_id}/operations` - Submit text operations
- `GET /api/v1/collaboration/{song_id}/cursors` - Get cursor positions
- `POST /api/v1/collaboration/{song_id}/presence` - Update user presence

### Permission Validation

The API implements hierarchical permission checking:

1. **Owner**: Has all permissions automatically
2. **Admin**: Can perform owner actions except transferring ownership
3. **Edit**: Can modify content and view metadata
4. **Read**: Can view and download content only

Server-side validation ensures:
- All operations check user permissions before execution
- Permission changes are logged for audit purposes
- Users cannot escalate their own permissions
- Owner permissions cannot be removed or transferred

### Database Indexing

Efficient querying is supported through indexes on:
- `author_id`: Fast lookup of user's own songs
- `share_settings`: Efficient filtering by visibility level
- JSON field querying may vary by database implementation

## Authentication

Most endpoints require JWT authentication:
```
Authorization: Bearer <jwt-token>
```

Obtain tokens via the authentication endpoints.

## Testing

### Swagger Functionality
```bash
cd backend
python test_swagger.py
```

### API Coverage
```bash
cd backend
python test_api_coverage.py
```

## Maintenance

The documentation is automatically updated when:
1. API endpoints are modified
2. Documentation strings are updated
3. Models are changed
4. GitHub Actions detect changes in relevant files

To manually update documentation:
1. Run `python generate_docs.py` in the backend directory
2. Commit the changes to the `docs/` directory
3. GitHub Actions will handle deployment to GitHub Pages

## Future Improvements

1. **OpenAPI 3.0**: Upgrade from Swagger 2.0 to OpenAPI 3.0
2. **Interactive Examples**: Add more interactive examples in Swagger UI
3. **API Versioning**: Document multiple API versions if needed
4. **Postman Collection**: Generate Postman collection from OpenAPI spec
5. **SDK Generation**: Auto-generate client SDKs from the specification