# Song Database Schema Design Documentation

## Overview

The ChordMe song database schema has been enhanced to support comprehensive song metadata, tagging, categorization, search functionality, and collaborative features. This document outlines the design decisions, relationships, and capabilities of the enhanced schema.

## Schema Version: 003_enhance_song_schema

### Core Design Principles

1. **Searchability**: Full-text search capabilities with trigram matching for fuzzy search
2. **Metadata Rich**: Comprehensive song metadata for filtering and organization
3. **Scalable Relationships**: Efficient many-to-many relationships for tags and categories
4. **Data Integrity**: Proper constraints, foreign keys, and validation
5. **Performance**: Strategic indexing for common query patterns
6. **Internationalization**: UTF-8 support and multi-language metadata
7. **Soft Delete**: Non-destructive deletion with archival capabilities
8. **Versioning**: Complete revision history for collaborative editing

## Enhanced Tables

### 1. Songs Table (Enhanced)

The core songs table has been significantly enhanced with metadata fields:

```sql
ALTER TABLE songs ADD COLUMN genre VARCHAR(100);
ALTER TABLE songs ADD COLUMN song_key VARCHAR(10);    -- Musical key (C, Am, etc.)
ALTER TABLE songs ADD COLUMN tempo INTEGER;           -- BPM
ALTER TABLE songs ADD COLUMN capo INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium';
ALTER TABLE songs ADD COLUMN duration INTEGER;       -- Duration in seconds
ALTER TABLE songs ADD COLUMN language VARCHAR(10) DEFAULT 'en';
ALTER TABLE songs ADD COLUMN lyrics TEXT;            -- Extracted lyrics
ALTER TABLE songs ADD COLUMN chords_used TEXT[];     -- Array of chords
```

**Key Features:**
- **Automatic Extraction**: Chords and lyrics are automatically extracted from ChordPro content via triggers
- **Metadata Validation**: Constraints ensure data quality (tempo range, capo range, difficulty enum)
- **Search Optimization**: Separate lyrics field for efficient full-text search
- **Musical Metadata**: Key, tempo, capo for musical organization

### 2. Tags System

A flexible tagging system supporting both user-created and system tags:

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7),        -- Hex color code
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- **System Tags**: Pre-defined tags (Rock, Pop, Gospel, etc.) with curated colors
- **User Tags**: Users can create custom tags for personal organization
- **Visual Organization**: Color coding for better visual categorization
- **Search Support**: Full-text search on tag names with trigram matching

### 3. Categories System (Hierarchical)

A hierarchical categorization system for broader organization:

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),  -- Hierarchical support
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- **Hierarchical Structure**: Categories can have parent-child relationships
- **System Categories**: Pre-defined categories (Genres → Rock, Occasions → Wedding, etc.)
- **Flexible Organization**: Support for multiple organizational schemes

### 4. Song Versioning (Enhanced)

Comprehensive version control for collaborative editing:

```sql
CREATE TABLE song_versions (
    id UUID PRIMARY KEY,
    song_id UUID REFERENCES songs(id),
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    content TEXT NOT NULL,
    lyrics TEXT,             -- Extracted lyrics
    chords_used TEXT[],      -- Extracted chords
    created_by UUID REFERENCES users(id),
    version_note TEXT,       -- Optional change description
    is_major_version BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, version_number)
);
```

**Key Features:**
- **Complete Snapshots**: Each version stores the full song state
- **Sequential Versioning**: Automatic version numbering per song
- **Change Tracking**: Optional notes and major version flagging
- **Metadata Preservation**: Extracted lyrics and chords stored with each version

### 5. User Favorites

Simple but efficient favorite songs tracking:

```sql
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    song_id UUID REFERENCES songs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_id)
);
```

**Key Features:**
- **Automatic Counting**: Triggers maintain favorite_count on songs table
- **Fast Queries**: Optimized indexes for user-based and song-based queries
- **Data Integrity**: Unique constraints prevent duplicate favorites

## Soft Delete and Archival System

Songs support both soft deletion and archival:

```sql
ALTER TABLE songs ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE songs ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
```

**Benefits:**
- **Data Recovery**: Soft-deleted songs can be restored
- **Audit Trail**: Timestamp tracking for deletion and archival
- **Performance**: Deleted/archived songs excluded from normal queries via indexes
- **Compliance**: Support for data retention policies

## Full-Text Search Implementation

### PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram matching
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- Accent removal
```

### Search Indexes

```sql
-- Trigram indexes for fuzzy search
CREATE INDEX idx_songs_title_trgm ON songs USING gin(title gin_trgm_ops);
CREATE INDEX idx_songs_artist_trgm ON songs USING gin(artist gin_trgm_ops);
CREATE INDEX idx_songs_content_trgm ON songs USING gin(content gin_trgm_ops);
CREATE INDEX idx_songs_lyrics_trgm ON songs USING gin(lyrics gin_trgm_ops);

-- GIN indexes for array searches
CREATE INDEX idx_songs_chords_gin ON songs USING gin(chords_used);
```

### Search Function

A comprehensive search function supports:
- **Text Search**: Fuzzy matching across title, artist, lyrics, content
- **Metadata Filtering**: Genre, key, tempo, difficulty, language
- **Tag/Category Filtering**: Multiple tag and category filters
- **Relevance Scoring**: Weighted scoring based on field importance
- **Performance**: Optimized with proper indexing

## Performance Optimization

### Strategic Indexing

1. **Basic Indexes**: Genre, key, tempo, difficulty, language
2. **Composite Indexes**: Common filter combinations (user + active, public + active)
3. **Partial Indexes**: Only on non-null or active records
4. **Full-Text Indexes**: Trigram and GIN indexes for search
5. **Relationship Indexes**: Foreign keys and junction tables

### Query Optimization

- **Active Songs View**: Pre-filtered view excluding deleted/archived songs
- **Index-Only Scans**: Covering indexes for common queries
- **Efficient Joins**: Optimized relationship queries
- **Pagination Support**: Efficient offset/limit queries

## Row Level Security (RLS)

Comprehensive security policies ensure data isolation:

```sql
-- Example: Users can only view their own songs or public songs
CREATE POLICY "Users can view own songs" ON songs FOR SELECT 
    USING (user_id = current_setting('jwt.claims.user_id', true)::uuid 
           OR is_public = true);
```

**Security Features:**
- **User Isolation**: Users can only access their own data
- **Public Sharing**: Public songs accessible to all users
- **Inheritance**: Related data inherits permissions from parent songs
- **System Data**: System tags/categories are publicly readable

## Internationalization Support

### UTF-8 Encoding

All text fields support full UTF-8 encoding for international content.

### Collation Settings

Proper collation ensures correct sorting across languages:

```sql
-- Example custom collation for case-insensitive sorting
CREATE COLLATION IF NOT EXISTS case_insensitive (provider = icu, locale = 'und-u-ks-level2');
```

### Multi-language Metadata

- **Language Field**: ISO language codes for content language
- **Search Support**: Language-specific search and filtering
- **Accent Handling**: Unaccent extension for better search matching

## Data Extraction and Processing

### Automatic Processing

Database triggers automatically extract data from ChordPro content:

1. **Chord Extraction**: Regular expressions extract chord names from content
2. **Lyrics Extraction**: ChordPro directives and chord annotations removed
3. **Trigger Updates**: Extracted data updated on content changes

### ChordPro Format Support

The schema fully supports ChordPro format features:
- **Directives**: Title, artist, key, tempo metadata extraction
- **Chord Annotations**: [C] style chord markers
- **Section Markers**: Verse, chorus, bridge identification
- **Comments**: Support for embedded comments and notes

## Integration Guidelines

### Backend Model Alignment

The SQLAlchemy models have been updated to match the PostgreSQL schema:

- **Field Mapping**: All new fields represented in models
- **Relationships**: Proper relationship definitions for joins
- **Search Methods**: Model-level search functionality
- **Soft Delete**: Model methods for soft deletion and archival

### API Integration

New endpoints should leverage:
- **Search Function**: Use the comprehensive search_songs() function
- **Active Songs View**: Query the active_songs view for normal operations
- **Metadata Filters**: Support all metadata filtering options
- **Pagination**: Implement proper pagination for large result sets

## Migration Strategy

### Zero-Downtime Migration

The migration is designed for zero-downtime deployment:

1. **Additive Changes**: All new columns are nullable or have defaults
2. **Backward Compatibility**: Existing functionality unchanged
3. **Trigger-Based Processing**: Automatic data extraction for existing songs
4. **Index Creation**: Concurrent index creation where possible

### Data Backfill

For existing songs without metadata:
1. **ChordPro Parsing**: Automatic extraction of metadata from content
2. **Default Values**: Sensible defaults for missing fields
3. **Gradual Enhancement**: Metadata can be added incrementally

## Testing Strategy

### Comprehensive Test Suite

The migration includes extensive tests:

1. **Schema Validation**: All tables, columns, constraints exist
2. **Index Verification**: Performance indexes are created
3. **Function Testing**: Custom functions work correctly
4. **Trigger Testing**: Automatic data extraction functions
5. **RLS Testing**: Security policies are properly enforced
6. **Data Integrity**: Cascade deletions and constraint validation

### Sample Data

Included seeding script provides:
- **Realistic Songs**: ChordPro formatted sample songs
- **System Tags**: Pre-defined genre and category tags
- **User Relationships**: Sample users with songs and favorites
- **Test Scenarios**: Various metadata combinations for testing

## Future Enhancements

### Planned Features

1. **Machine Learning**: AI-powered song recommendations
2. **Advanced Search**: Semantic search and chord progression matching
3. **Real-time Collaboration**: Live editing with conflict resolution
4. **Audio Integration**: Support for audio files and synchronization
5. **Advanced Analytics**: Usage statistics and popularity tracking

### Scalability Considerations

1. **Partitioning**: Table partitioning for very large datasets
2. **Read Replicas**: Separate read/write database instances
3. **Caching**: Redis caching for frequently accessed data
4. **Search Engine**: Elasticsearch integration for advanced search

## Monitoring and Maintenance

### Performance Monitoring

- **Query Analysis**: Regular analysis of slow queries
- **Index Usage**: Monitoring index effectiveness
- **Storage Growth**: Tracking table and index sizes
- **Search Performance**: Monitoring search query performance

### Maintenance Tasks

- **Statistics Updates**: Regular table statistics updates
- **Index Maintenance**: Periodic index rebuilding
- **Data Cleanup**: Cleanup of old deleted records
- **Performance Tuning**: Ongoing query optimization

## Conclusion

The enhanced song database schema provides a robust foundation for ChordMe's song management and search capabilities. The design balances functionality, performance, and maintainability while supporting future growth and feature development.

Key benefits:
- **Rich Metadata**: Comprehensive song information for better organization
- **Powerful Search**: Full-text search with relevance ranking
- **Flexible Organization**: Tags and hierarchical categories
- **Collaboration Ready**: Versioning and sharing capabilities
- **Performance Optimized**: Strategic indexing for fast queries
- **Internationally Ready**: Full UTF-8 and multi-language support
- **Data Safe**: Soft delete and archival for data preservation

The schema is designed to grow with the application while maintaining backward compatibility and performance.