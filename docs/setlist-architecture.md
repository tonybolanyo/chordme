---
layout: default
lang: en
title: Setlist Data Architecture Documentation
---

# Setlist Data Architecture Documentation

## Overview

The ChordMe setlist data architecture provides comprehensive management of musical setlists for performances, rehearsals, and other events. This system extends the existing song and collection infrastructure with specialized features for performance management, collaboration, analytics, and template-based setlist creation.

## Core Design Principles

1. **Performance-Oriented**: Each song in a setlist can have performance-specific metadata (key, tempo, notes)
2. **Template-Driven**: Reusable templates for recurring events and standardized formats
3. **Collaborative**: Full sharing and collaboration capabilities with granular permissions
4. **Analytics-Ready**: Comprehensive tracking of performances and metrics
5. **Version-Controlled**: Complete change history for collaborative editing
6. **Extensible**: Built to support future enhancements and integrations

## Database Schema

### Core Tables

#### 1. `setlists` - Main Setlist Management

```sql
CREATE TABLE setlists (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES users(id),
    
    -- Performance context
    event_type VARCHAR(50) DEFAULT 'performance',
    venue VARCHAR(255),
    event_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- Minutes
    
    -- Template and organization
    is_template BOOLEAN DEFAULT FALSE,
    template_id UUID REFERENCES setlists(id),
    is_public BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50),
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'draft',
    is_deleted BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Metadata and analytics
    tags TEXT[],
    notes TEXT,
    view_count INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_performed TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Hierarchical organization through templates
- Rich performance context metadata
- Lifecycle management (draft → ready → in_progress → completed)
- Usage analytics and view tracking

#### 2. `setlist_songs` - Performance-Specific Song Metadata

```sql
CREATE TABLE setlist_songs (
    id UUID PRIMARY KEY,
    setlist_id UUID REFERENCES setlists(id),
    song_id UUID REFERENCES songs(id),
    
    -- Position and organization
    sort_order INTEGER NOT NULL,
    section VARCHAR(50), -- opening, main, encore, etc.
    
    -- Performance overrides
    performance_key VARCHAR(10),
    performance_tempo INTEGER,
    performance_capo INTEGER DEFAULT 0,
    estimated_duration INTEGER, -- Seconds
    
    -- Performance notes and arrangements
    arrangement_notes TEXT,
    performance_notes TEXT,
    intro_notes TEXT,
    outro_notes TEXT,
    transition_notes TEXT,
    
    -- Status flags
    is_optional BOOLEAN DEFAULT FALSE,
    is_highlight BOOLEAN DEFAULT FALSE,
    requires_preparation BOOLEAN DEFAULT FALSE,
    
    -- Post-performance analytics
    actual_duration INTEGER,
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    audience_response VARCHAR(20),
    technical_notes TEXT,
    
    UNIQUE(setlist_id, song_id)
);
```

**Key Features:**
- Performance-specific metadata that can override song defaults
- Rich annotation system for arrangements and transitions
- Section-based organization
- Post-performance analytics and feedback

#### 3. `setlist_versions` - Version Control

```sql
CREATE TABLE setlist_versions (
    id UUID PRIMARY KEY,
    setlist_id UUID REFERENCES setlists(id),
    version_number INTEGER NOT NULL,
    
    -- Complete setlist snapshot
    name VARCHAR(255) NOT NULL,
    description TEXT,
    [... other setlist fields ...]
    
    -- Version metadata
    created_by UUID REFERENCES users(id),
    version_note TEXT,
    is_major_version BOOLEAN DEFAULT FALSE,
    change_summary JSONB, -- Detailed change information
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(setlist_id, version_number)
);
```

**Key Features:**
- Complete snapshots of setlist state
- Sequential version numbering per setlist
- Detailed change tracking and summaries
- Major version flagging for significant changes

### Template System

#### 4. `setlist_templates` - Reusable Setlist Structures

```sql
CREATE TABLE setlist_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    
    -- Template characteristics
    category VARCHAR(50), -- worship, concert, wedding, etc.
    subcategory VARCHAR(50),
    target_duration INTEGER, -- Minutes
    song_count_min INTEGER DEFAULT 0,
    song_count_max INTEGER,
    
    -- Template configuration
    default_sections TEXT[],
    required_tags TEXT[],
    preferred_keys TEXT[],
    tempo_guidelines JSONB,
    
    -- Sharing and usage
    is_public BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0
);
```

#### 5. `setlist_template_sections` - Template Section Definitions

```sql
CREATE TABLE setlist_template_sections (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES setlist_templates(id),
    
    -- Section definition
    section_name VARCHAR(50) NOT NULL,
    section_order INTEGER NOT NULL,
    
    -- Section requirements
    min_songs INTEGER DEFAULT 1,
    max_songs INTEGER,
    target_duration INTEGER, -- Minutes
    
    -- Musical guidelines
    suggested_keys TEXT[],
    tempo_range_min INTEGER,
    tempo_range_max INTEGER,
    energy_level VARCHAR(20), -- low, medium, high, building, falling
    
    -- Content guidelines
    required_tags TEXT[],
    preferred_themes TEXT[],
    notes TEXT
);
```

### Collaboration and Sharing

#### 6. `setlist_collaborators` - Sharing and Permissions

```sql
CREATE TABLE setlist_collaborators (
    id UUID PRIMARY KEY,
    setlist_id UUID REFERENCES setlists(id),
    user_id UUID REFERENCES users(id),
    
    -- Permission management
    permission_level VARCHAR(20) DEFAULT 'view', -- view, comment, edit, admin
    
    -- Collaboration metadata
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, revoked
    
    UNIQUE(setlist_id, user_id)
);
```

**Permission Levels:**
- **view**: Read-only access to setlist
- **comment**: Can add comments and feedback
- **edit**: Can modify setlist content and structure
- **admin**: Full access including collaboration management

### Analytics and Performance Tracking

#### 7. `setlist_performances` - Performance Records

```sql
CREATE TABLE setlist_performances (
    id UUID PRIMARY KEY,
    setlist_id UUID REFERENCES setlists(id),
    performed_by UUID REFERENCES users(id),
    
    -- Performance context
    performance_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255),
    event_type VARCHAR(50),
    audience_size INTEGER,
    
    -- Performance metrics
    total_duration INTEGER, -- Minutes
    songs_performed INTEGER,
    songs_skipped INTEGER DEFAULT 0,
    
    -- Quality assessment
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    technical_rating INTEGER CHECK (technical_rating >= 1 AND technical_rating <= 5),
    audience_engagement VARCHAR(20),
    
    -- Detailed tracking
    notes TEXT,
    improvements_needed TEXT,
    highlights TEXT,
    weather_conditions VARCHAR(50),
    equipment_used TEXT[],
    team_members TEXT[]
);
```

#### 8. `setlist_performance_songs` - Individual Song Performance

```sql
CREATE TABLE setlist_performance_songs (
    id UUID PRIMARY KEY,
    performance_id UUID REFERENCES setlist_performances(id),
    setlist_song_id UUID REFERENCES setlist_songs(id),
    
    -- Actual performance data
    actual_order INTEGER,
    was_performed BOOLEAN DEFAULT TRUE,
    actual_key VARCHAR(10),
    actual_tempo INTEGER,
    actual_duration INTEGER, -- Seconds
    
    -- Performance assessment
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    technical_issues TEXT,
    audience_response VARCHAR(20),
    performance_notes TEXT,
    improvement_notes TEXT
);
```

## Entity Relationships

```
User (1) ──────── (*) Setlist
 │                    │
 │                    ├── (*) SetlistSong ── (1) Song
 │                    ├── (*) SetlistVersion
 │                    ├── (*) SetlistCollaborator ── (1) User
 │                    └── (*) SetlistPerformance
 │                            └── (*) SetlistPerformanceSong ── (1) SetlistSong
 │
 └── (*) SetlistTemplate
         └── (*) SetlistTemplateSection

Setlist (*) ──── (1) SetlistTemplate [optional]
```

## System Templates

The migration includes several default system templates:

### 1. Basic Worship Service
- **Duration**: 75 minutes
- **Sections**: Opening → Worship → Message → Response → Closing
- **Use Case**: Traditional worship services

### 2. Contemporary Worship
- **Duration**: 90 minutes
- **Sections**: Pre-service → Opening → Worship Set → Message → Response → Closing
- **Use Case**: Modern worship services with extended music

### 3. Concert Performance
- **Duration**: 120 minutes
- **Sections**: Opening → Set One → Intermission → Set Two → Encore
- **Use Case**: Full concert performances

### 4. Band Rehearsal
- **Duration**: 180 minutes
- **Sections**: Warm-up → New Songs → Review → Full Run
- **Use Case**: Band practice sessions

### 5. Wedding Ceremony
- **Duration**: 45 minutes
- **Sections**: Prelude → Processional → Ceremony → Recessional
- **Use Case**: Wedding ceremony music

### 6. Acoustic Set
- **Duration**: 60 minutes
- **Sections**: Opening → Main Set → Encore
- **Use Case**: Intimate acoustic performances

## Data Access and Security

### Row Level Security (RLS)

All setlist tables implement comprehensive RLS policies:

1. **Owner Access**: Users have full access to their own setlists
2. **Collaborator Access**: Shared access based on permission levels
3. **Public Access**: Public setlists are readable by all users
4. **Template Access**: Public and system templates accessible to all

### Permission Matrix

| Action | Owner | Admin | Editor | Commenter | Viewer | Public |
|--------|-------|-------|--------|-----------|---------|---------|
| View | ✓ | ✓ | ✓ | ✓ | ✓ | ✓* |
| Comment | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit Content | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Collaborators | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

*Public access only for public setlists

## Performance Optimizations

### Strategic Indexing

1. **Primary Indexes**: User-based queries (`setlists.user_id`)
2. **Relationship Indexes**: Foreign key relationships
3. **Filter Indexes**: Common filters (status, event_type, is_public)
4. **Composite Indexes**: Multi-column queries (user + status)
5. **Partial Indexes**: Active records only (`WHERE is_deleted = FALSE`)

### Query Optimizations

1. **Efficient Joins**: Optimized relationship queries
2. **Pagination Support**: Limit/offset with proper ordering
3. **Covering Indexes**: Index-only scans for common queries
4. **Materialized Views**: For complex analytics queries (future enhancement)

## Migration and Deployment

### Migration Strategy

1. **Additive Design**: All new tables, no modifications to existing schema
2. **Zero Downtime**: Can be applied to production without interruption
3. **Backward Compatible**: Existing collections functionality unchanged
4. **Data Integrity**: Comprehensive constraints and validation
5. **Rollback Support**: Pure additive changes support easy rollback

### Deployment Steps

1. **Pre-migration**: Verify database connectivity and permissions
2. **Schema Creation**: Execute migration script
3. **Data Validation**: Verify table creation and constraints
4. **Template Population**: Confirm default templates are loaded
5. **Permission Testing**: Validate RLS policies
6. **Performance Testing**: Verify indexes and query performance

## Integration with Existing Systems

### Song Integration

- Setlists reference existing `songs` table
- Performance metadata can override song defaults
- Maintains song version history integration
- Supports existing tag and category systems

### User Integration

- Full integration with existing user authentication
- Leverages existing permission patterns
- Maintains user profile and preference systems
- Supports existing collaboration patterns

### Collection Compatibility

- Setlists extend collection concept
- Existing collections remain unchanged
- Migration path available for collections → setlists
- Shared search and filtering infrastructure

## Future Enhancements

### Planned Features

1. **Advanced Analytics**: Machine learning for setlist optimization
2. **Real-time Collaboration**: Live editing with conflict resolution
3. **Audio Integration**: Synchronized audio playback during performance
4. **Mobile Optimization**: Dedicated mobile performance interface
5. **Export Formats**: PDF, MIDI, and other format exports

### Scalability Considerations

1. **Partitioning**: Table partitioning for very large datasets
2. **Caching**: Redis caching for frequently accessed templates
3. **Search Enhancement**: Elasticsearch integration for advanced search
4. **Read Replicas**: Separate read/write database instances
5. **CDN Integration**: Static asset caching for template resources

## Monitoring and Maintenance

### Performance Monitoring

- **Query Analysis**: Regular slow query identification
- **Index Usage**: Monitoring index effectiveness
- **Storage Growth**: Table and index size tracking
- **User Activity**: Setlist creation and usage patterns

### Maintenance Tasks

- **Statistics Updates**: Regular table statistics refresh
- **Index Maintenance**: Periodic index rebuilding
- **Data Cleanup**: Archived setlist maintenance
- **Performance Tuning**: Ongoing query optimization

## Conclusion

The ChordMe setlist data architecture provides a comprehensive foundation for advanced performance management while maintaining compatibility with existing systems. The design emphasizes flexibility, collaboration, and analytics while ensuring data integrity and optimal performance.

The architecture supports the full lifecycle of setlist management from template creation through performance analytics, enabling musicians and teams to organize, collaborate, and continuously improve their performances.