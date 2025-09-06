# Setlist API Design Documentation

## Overview

This document outlines the REST API design for the ChordMe setlist management system. The API provides comprehensive endpoints for setlist CRUD operations, collaboration, performance tracking, and template management.

## Base URL

```
/api/v1/setlists
```

## Authentication

All endpoints require JWT authentication via the `Authorization: Bearer <token>` header, following the existing ChordMe authentication pattern.

## Core Setlist Operations

### 1. List Setlists

**GET** `/api/v1/setlists`

Retrieve user's setlists with filtering and pagination.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `status` | string | Filter by status (draft, ready, in_progress, completed, archived) | all |
| `event_type` | string | Filter by event type (performance, rehearsal, lesson, etc.) | all |
| `is_template` | boolean | Filter templates only | false |
| `include_shared` | boolean | Include shared setlists | true |
| `include_public` | boolean | Include public setlists | false |
| `search` | string | Search setlist names and descriptions | - |
| `limit` | integer | Results per page (1-100) | 20 |
| `offset` | integer | Pagination offset | 0 |
| `sort` | string | Sort field (name, created_at, updated_at, last_performed) | updated_at |
| `order` | string | Sort order (asc, desc) | desc |

#### Response

```json
{
  "setlists": [
    {
      "id": "uuid",
      "name": "Sunday Service - Dec 3",
      "description": "Contemporary worship service",
      "user_id": "uuid",
      "event_type": "worship",
      "venue": "Main Sanctuary",
      "event_date": "2023-12-03T10:00:00Z",
      "estimated_duration": 75,
      "status": "ready",
      "is_template": false,
      "template_id": "uuid",
      "is_public": false,
      "is_recurring": true,
      "recurring_pattern": "weekly",
      "tags": ["contemporary", "worship"],
      "song_count": 8,
      "view_count": 15,
      "usage_count": 3,
      "last_performed": "2023-11-26T10:00:00Z",
      "created_at": "2023-11-01T14:30:00Z",
      "updated_at": "2023-11-28T09:15:00Z",
      "template": {
        "id": "uuid",
        "name": "Contemporary Worship Template"
      },
      "collaborator_count": 2,
      "permission_level": "owner"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### 2. Get Setlist Details

**GET** `/api/v1/setlists/{setlist_id}`

Retrieve complete setlist information including songs.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `include_songs` | boolean | Include setlist songs | true |
| `include_versions` | boolean | Include version history | false |
| `include_collaborators` | boolean | Include collaborator list | false |
| `include_performances` | boolean | Include performance history | false |

#### Response

```json
{
  "id": "uuid",
  "name": "Sunday Service - Dec 3",
  "description": "Contemporary worship service",
  "user_id": "uuid",
  "event_type": "worship",
  "venue": "Main Sanctuary",
  "event_date": "2023-12-03T10:00:00Z",
  "estimated_duration": 75,
  "status": "ready",
  "is_template": false,
  "template_id": "uuid",
  "tags": ["contemporary", "worship"],
  "notes": "Remember to adjust lighting for acoustic set",
  "created_at": "2023-11-01T14:30:00Z",
  "updated_at": "2023-11-28T09:15:00Z",
  "songs": [
    {
      "id": "uuid",
      "setlist_id": "uuid",
      "song_id": "uuid",
      "sort_order": 1,
      "section": "opening",
      "performance_key": "G",
      "performance_tempo": 120,
      "performance_capo": 0,
      "estimated_duration": 240,
      "arrangement_notes": "Start with piano only",
      "performance_notes": "Watch for tempo in chorus",
      "is_highlight": true,
      "song": {
        "id": "uuid",
        "title": "How Great Thou Art",
        "artist": "Traditional",
        "genre": "Hymn",
        "song_key": "F",
        "tempo": 110,
        "duration": 260
      }
    }
  ],
  "permission_level": "owner",
  "can_edit": true,
  "can_share": true
}
```

### 3. Create Setlist

**POST** `/api/v1/setlists`

Create a new setlist.

#### Request Body

```json
{
  "name": "Christmas Eve Service",
  "description": "Special Christmas Eve celebration",
  "event_type": "worship",
  "venue": "Main Sanctuary",
  "event_date": "2023-12-24T19:00:00Z",
  "estimated_duration": 90,
  "template_id": "uuid", // Optional
  "is_public": false,
  "is_recurring": false,
  "tags": ["christmas", "special"],
  "notes": "Special lighting and decorations"
}
```

#### Response

```json
{
  "id": "uuid",
  "name": "Christmas Eve Service",
  "status": "draft",
  "created_at": "2023-11-01T14:30:00Z",
  "message": "Setlist created successfully"
}
```

### 4. Update Setlist

**PUT** `/api/v1/setlists/{setlist_id}`

Update setlist metadata.

#### Request Body

```json
{
  "name": "Christmas Eve Service - Updated",
  "description": "Updated description",
  "event_date": "2023-12-24T19:30:00Z",
  "estimated_duration": 95,
  "status": "ready",
  "notes": "Updated notes"
}
```

#### Response

```json
{
  "id": "uuid",
  "updated_at": "2023-11-28T10:15:00Z",
  "version_number": 3,
  "message": "Setlist updated successfully"
}
```

### 5. Delete Setlist

**DELETE** `/api/v1/setlists/{setlist_id}`

Soft delete a setlist (sets `is_deleted = true`).

#### Response

```json
{
  "message": "Setlist deleted successfully",
  "deleted_at": "2023-11-28T10:20:00Z"
}
```

## Setlist Songs Management

### 6. Add Song to Setlist

**POST** `/api/v1/setlists/{setlist_id}/songs`

Add a song to the setlist.

#### Request Body

```json
{
  "song_id": "uuid",
  "sort_order": 5, // Optional, auto-assigned if not provided
  "section": "worship",
  "performance_key": "A",
  "performance_tempo": 130,
  "performance_capo": 2,
  "estimated_duration": 300,
  "arrangement_notes": "Extended bridge on repeat",
  "performance_notes": "Watch dynamics in verse 2",
  "intro_notes": "Piano solo intro",
  "outro_notes": "Fade on repeat",
  "is_optional": false,
  "is_highlight": true,
  "requires_preparation": false
}
```

#### Response

```json
{
  "id": "uuid",
  "setlist_id": "uuid",
  "song_id": "uuid",
  "sort_order": 5,
  "created_at": "2023-11-28T10:25:00Z",
  "message": "Song added to setlist successfully"
}
```

### 7. Update Song in Setlist

**PUT** `/api/v1/setlists/{setlist_id}/songs/{setlist_song_id}`

Update song performance details.

#### Request Body

```json
{
  "performance_key": "B",
  "performance_tempo": 125,
  "arrangement_notes": "Updated arrangement",
  "is_highlight": false
}
```

### 8. Remove Song from Setlist

**DELETE** `/api/v1/setlists/{setlist_id}/songs/{setlist_song_id}`

Remove a song from the setlist.

### 9. Reorder Songs

**PUT** `/api/v1/setlists/{setlist_id}/songs/reorder`

Reorder songs in the setlist.

#### Request Body

```json
{
  "song_order": [
    {
      "setlist_song_id": "uuid",
      "sort_order": 1,
      "section": "opening"
    },
    {
      "setlist_song_id": "uuid", 
      "sort_order": 2,
      "section": "opening"
    }
  ]
}
```

## Template Management

### 10. List Templates

**GET** `/api/v1/setlists/templates`

Retrieve available setlist templates.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `category` | string | Filter by category | all |
| `include_system` | boolean | Include system templates | true |
| `include_public` | boolean | Include public templates | true |
| `include_own` | boolean | Include user's own templates | true |

#### Response

```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Contemporary Worship",
      "description": "Modern worship service template",
      "category": "worship",
      "subcategory": "contemporary",
      "target_duration": 90,
      "song_count_min": 6,
      "song_count_max": 10,
      "default_sections": ["pre_service", "opening", "worship_set", "message", "response", "closing"],
      "is_system": true,
      "is_public": true,
      "usage_count": 142,
      "rating_average": 4.7,
      "rating_count": 23,
      "created_by": "system"
    }
  ]
}
```

### 11. Get Template Details

**GET** `/api/v1/setlists/templates/{template_id}`

Get complete template information including sections.

#### Response

```json
{
  "id": "uuid",
  "name": "Contemporary Worship",
  "description": "Modern worship service template",
  "category": "worship",
  "default_sections": ["opening", "worship", "message", "closing"],
  "sections": [
    {
      "id": "uuid",
      "section_name": "opening",
      "section_order": 1,
      "min_songs": 1,
      "max_songs": 3,
      "target_duration": 10,
      "energy_level": "medium",
      "suggested_keys": ["G", "C", "D"],
      "tempo_range_min": 100,
      "tempo_range_max": 140,
      "required_tags": ["opening"],
      "notes": "Welcoming songs to gather the congregation"
    }
  ]
}
```

### 12. Create Template

**POST** `/api/v1/setlists/templates`

Create a new setlist template.

#### Request Body

```json
{
  "name": "Small Group Worship",
  "description": "Intimate worship for small groups",
  "category": "worship",
  "subcategory": "small_group",
  "target_duration": 45,
  "default_sections": ["opening", "worship", "closing"],
  "is_public": false
}
```

### 13. Create Setlist from Template

**POST** `/api/v1/setlists/templates/{template_id}/create-setlist`

Create a new setlist based on a template.

#### Request Body

```json
{
  "name": "Sunday Service - Dec 10",
  "event_date": "2023-12-10T10:00:00Z",
  "venue": "Main Sanctuary",
  "customize_sections": true // Whether to include template sections
}
```

## Collaboration and Sharing

### 14. Share Setlist

**POST** `/api/v1/setlists/{setlist_id}/collaborators`

Add a collaborator to a setlist.

#### Request Body

```json
{
  "user_email": "collaborator@example.com",
  "permission_level": "edit", // view, comment, edit, admin
  "message": "Would you like to help with this setlist?"
}
```

#### Response

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "permission_level": "edit",
  "status": "pending",
  "invited_at": "2023-11-28T10:30:00Z",
  "message": "Collaboration invitation sent"
}
```

### 15. List Collaborators

**GET** `/api/v1/setlists/{setlist_id}/collaborators`

Get list of setlist collaborators.

#### Response

```json
{
  "collaborators": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "permission_level": "edit",
      "status": "accepted",
      "invited_at": "2023-11-25T09:00:00Z",
      "accepted_at": "2023-11-25T14:30:00Z",
      "last_accessed": "2023-11-28T08:15:00Z",
      "user": {
        "id": "uuid",
        "email": "collaborator@example.com",
        "display_name": "John Smith"
      }
    }
  ]
}
```

### 16. Update Collaborator Permissions

**PUT** `/api/v1/setlists/{setlist_id}/collaborators/{collaborator_id}`

Update collaborator permission level.

#### Request Body

```json
{
  "permission_level": "admin"
}
```

### 17. Remove Collaborator

**DELETE** `/api/v1/setlists/{setlist_id}/collaborators/{collaborator_id}`

Remove a collaborator from the setlist.

## Version Control

### 18. List Setlist Versions

**GET** `/api/v1/setlists/{setlist_id}/versions`

Get setlist version history.

#### Response

```json
{
  "versions": [
    {
      "id": "uuid",
      "version_number": 3,
      "name": "Sunday Service - Dec 3",
      "created_by": "uuid",
      "version_note": "Updated song order and added new song",
      "is_major_version": false,
      "change_summary": {
        "songs_added": 1,
        "songs_removed": 0,
        "songs_reordered": 3,
        "metadata_changed": ["name", "estimated_duration"]
      },
      "created_at": "2023-11-28T09:15:00Z",
      "creator": {
        "display_name": "Jane Doe"
      }
    }
  ]
}
```

### 19. Get Version Details

**GET** `/api/v1/setlists/{setlist_id}/versions/{version_id}`

Get specific version details.

### 20. Restore Version

**POST** `/api/v1/setlists/{setlist_id}/versions/{version_id}/restore`

Restore setlist to a previous version.

#### Request Body

```json
{
  "version_note": "Restored to working version before sound issues"
}
```

## Performance Tracking

### 21. Record Performance

**POST** `/api/v1/setlists/{setlist_id}/performances`

Record a performance of the setlist.

#### Request Body

```json
{
  "performance_date": "2023-12-03T10:00:00Z",
  "venue": "Main Sanctuary",
  "event_type": "worship",
  "audience_size": 150,
  "total_duration": 78,
  "songs_performed": 8,
  "songs_skipped": 0,
  "overall_rating": 4,
  "technical_rating": 5,
  "audience_engagement": "excellent",
  "notes": "Great energy throughout the service",
  "highlights": "New song was very well received",
  "weather_conditions": "indoor",
  "equipment_used": ["piano", "guitar", "drums", "vocals"],
  "team_members": ["John Smith", "Jane Doe", "Bob Wilson"]
}
```

### 22. Update Performance Details

**PUT** `/api/v1/setlists/{setlist_id}/performances/{performance_id}`

Update performance information.

### 23. Record Song Performance

**POST** `/api/v1/setlists/{setlist_id}/performances/{performance_id}/songs`

Record individual song performance data.

#### Request Body

```json
{
  "setlist_song_id": "uuid",
  "actual_order": 3,
  "was_performed": true,
  "actual_key": "G",
  "actual_tempo": 118,
  "actual_duration": 245,
  "performance_rating": 4,
  "audience_response": "excellent",
  "performance_notes": "Great vocal harmonies",
  "technical_issues": "Minor feedback in verse 2"
}
```

### 24. Get Performance Analytics

**GET** `/api/v1/setlists/{setlist_id}/analytics`

Get comprehensive analytics for the setlist.

#### Response

```json
{
  "setlist_id": "uuid",
  "total_performances": 12,
  "average_rating": 4.2,
  "average_duration": 76,
  "most_performed_songs": [
    {
      "song_id": "uuid",
      "song_title": "How Great Thou Art",
      "performance_count": 11,
      "average_rating": 4.8
    }
  ],
  "performance_trends": {
    "by_month": [
      {
        "month": "2023-11",
        "performances": 4,
        "average_rating": 4.3
      }
    ]
  },
  "audience_feedback": {
    "excellent": 8,
    "good": 3,
    "fair": 1,
    "poor": 0
  }
}
```

## Search and Discovery

### 25. Search Setlists

**GET** `/api/v1/setlists/search`

Advanced setlist search.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (names, descriptions, songs) |
| `event_type` | string | Filter by event type |
| `venue` | string | Filter by venue |
| `tags` | string | Comma-separated tags |
| `date_from` | date | Performances after date |
| `date_to` | date | Performances before date |
| `min_duration` | integer | Minimum duration in minutes |
| `max_duration` | integer | Maximum duration in minutes |
| `include_public` | boolean | Include public setlists |

### 26. Public Setlists

**GET** `/api/v1/setlists/public`

Browse public setlists for inspiration.

## Error Responses

All endpoints return appropriate HTTP status codes with error details:

```json
{
  "error": {
    "code": "SETLIST_NOT_FOUND",
    "message": "Setlist not found or access denied",
    "details": {
      "setlist_id": "uuid"
    }
  }
}
```

### Common Error Codes

- `SETLIST_NOT_FOUND` (404)
- `INSUFFICIENT_PERMISSIONS` (403)
- `SONG_ALREADY_IN_SETLIST` (400)
- `INVALID_SORT_ORDER` (400)
- `TEMPLATE_NOT_FOUND` (404)
- `COLLABORATION_LIMIT_REACHED` (400)
- `INVALID_VERSION_NUMBER` (400)

## Rate Limiting

- **Standard operations**: 100 requests per minute
- **Search operations**: 30 requests per minute
- **Bulk operations**: 10 requests per minute

## Webhooks (Future Enhancement)

Support for real-time notifications:

- `setlist.created`
- `setlist.updated`
- `setlist.shared`
- `performance.recorded`
- `collaboration.invited`

## Conclusion

This API design provides comprehensive functionality for setlist management while maintaining consistency with existing ChordMe patterns. The design emphasizes flexibility, collaboration, and detailed analytics while ensuring proper access control and data integrity.