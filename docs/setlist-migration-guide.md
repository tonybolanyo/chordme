---
layout: default
lang: en
title: Setlist Migration Guide
---

# Setlist Migration Guide

## Overview

This guide provides comprehensive instructions for migrating from the existing ChordMe collections system to the new setlist architecture. The migration preserves all existing data while unlocking advanced performance management capabilities.

## Migration Benefits

### Enhanced Features

- **Performance-Specific Metadata**: Set key, tempo, and arrangement notes per song per setlist
- **Template System**: Create reusable setlist structures for recurring events
- **Collaboration**: Share setlists with team members with granular permissions
- **Version Control**: Track all changes with complete history
- **Analytics**: Record and analyze performance data
- **Section Organization**: Organize songs into logical sections (opening, worship, etc.)

### Preserved Data

- All existing songs and their metadata
- User ownership and permissions
- Creation and modification dates
- Song order and relationships
- Public/private visibility settings

## Pre-Migration Checklist

### 1. Database Backup

**Critical**: Always backup your database before migration.

```bash
# PostgreSQL backup
pg_dump chordme_production > chordme_backup_$(date +%Y%m%d).sql

# Verify backup
pg_restore --list chordme_backup_$(date +%Y%m%d).sql
```

### 2. Environment Preparation

```bash
# Ensure latest migration is applied
cd backend
python migrate.py --check

# Verify existing collections
python -c "
from chordme.models import Collection, CollectionSong
print(f'Collections: {Collection.query.count()}')
print(f'Collection Songs: {CollectionSong.query.count()}')
"
```

### 3. User Communication

Notify users about:
- Migration timeline and expected downtime
- New features available after migration
- Any interface changes
- Training resources for new functionality

## Migration Process

### Phase 1: Schema Deployment

#### 1. Apply Setlist Migration

```bash
# Deploy setlist architecture migration
cd database/migrations
psql -d chordme_production -f 005_setlist_architecture.sql
```

#### 2. Verify Schema

```sql
-- Verify all setlist tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'setlist%'
ORDER BY table_name;

-- Expected tables:
-- setlist_collaborators
-- setlist_performance_songs
-- setlist_performances  
-- setlist_songs
-- setlist_template_sections
-- setlist_templates
-- setlist_versions
-- setlists
```

### Phase 2: Data Migration

#### 1. Create Migration Script

```python
# migration_script.py
from chordme.models import db, Collection, CollectionSong, Setlist, SetlistSong
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_collections_to_setlists():
    """Migrate all collections to setlists."""
    
    collections = Collection.query.filter_by(is_deleted=False).all()
    logger.info(f"Found {len(collections)} collections to migrate")
    
    migrated_count = 0
    error_count = 0
    
    for collection in collections:
        try:
            # Create setlist from collection
            setlist = Setlist(
                name=collection.name,
                user_id=collection.user_id,
                description=collection.description,
                event_type='performance',  # Default event type
                is_public=collection.is_public,
                status='draft'
            )
            
            # Copy timestamps
            setlist.created_at = collection.created_at
            setlist.updated_at = collection.updated_at
            
            db.session.add(setlist)
            db.session.flush()  # Get setlist ID
            
            # Migrate collection songs
            collection_songs = CollectionSong.query.filter_by(
                collection_id=collection.id
            ).order_by(CollectionSong.sort_order).all()
            
            for col_song in collection_songs:
                setlist_song = SetlistSong(
                    setlist_id=setlist.id,
                    song_id=col_song.song_id,
                    sort_order=col_song.sort_order
                )
                setlist_song.created_at = col_song.created_at
                
                db.session.add(setlist_song)
            
            # Mark original collection as migrated (don't delete yet)
            collection.description = f"[MIGRATED] {collection.description or ''}"
            
            db.session.commit()
            migrated_count += 1
            logger.info(f"Migrated collection '{collection.name}' to setlist")
            
        except Exception as e:
            db.session.rollback()
            error_count += 1
            logger.error(f"Failed to migrate collection '{collection.name}': {str(e)}")
    
    logger.info(f"Migration complete: {migrated_count} successful, {error_count} errors")
    return migrated_count, error_count

if __name__ == "__main__":
    migrate_collections_to_setlists()
```

#### 2. Run Migration

```bash
# Execute migration script
cd backend
python migration_script.py

# Verify migration results
python -c "
from chordme.models import Setlist, SetlistSong
print(f'Setlists: {Setlist.query.count()}')
print(f'Setlist Songs: {SetlistSong.query.count()}')
"
```

#### 3. Data Validation

```sql
-- Compare collection vs setlist counts
SELECT 
    'collections' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN is_public THEN 1 END) as public_count
FROM collections
WHERE description NOT LIKE '[MIGRATED]%'

UNION ALL

SELECT 
    'setlists' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN is_public THEN 1 END) as public_count
FROM setlists;

-- Verify song relationships
SELECT 
    c.name as collection_name,
    s.name as setlist_name,
    cs.song_count as collection_songs,
    ss.song_count as setlist_songs
FROM (
    SELECT 
        c.id, c.name, COUNT(cs.id) as song_count
    FROM collections c
    LEFT JOIN collection_songs cs ON c.id = cs.collection_id
    WHERE c.description NOT LIKE '[MIGRATED]%'
    GROUP BY c.id, c.name
) c
JOIN (
    SELECT 
        s.id, s.name, COUNT(ss.id) as song_count
    FROM setlists s
    LEFT JOIN setlist_songs ss ON s.id = ss.setlist_id
    GROUP BY s.id, s.name
) s ON c.name = s.name;
```

### Phase 3: Enhanced Migration (Optional)

#### 1. Detect Event Types

```python
def enhance_setlist_metadata():
    """Enhance migrated setlists with better metadata."""
    
    setlists = Setlist.query.filter_by(event_type='performance').all()
    
    for setlist in setlists:
        # Detect event type from name patterns
        name_lower = setlist.name.lower()
        
        if any(word in name_lower for word in ['worship', 'service', 'sunday']):
            setlist.event_type = 'worship'
        elif any(word in name_lower for word in ['concert', 'show', 'gig']):
            setlist.event_type = 'concert'
        elif any(word in name_lower for word in ['rehearsal', 'practice', 'jam']):
            setlist.event_type = 'rehearsal'
        elif any(word in name_lower for word in ['wedding', 'marriage']):
            setlist.event_type = 'wedding'
        
        # Estimate duration based on song count
        song_count = len(setlist.setlist_songs)
        if song_count > 0:
            # Rough estimate: 4 minutes per song average
            setlist.estimated_duration = song_count * 4
        
        db.session.commit()
```

#### 2. Create Default Sections

```python
def add_default_sections():
    """Add default sections to migrated setlists."""
    
    setlists = Setlist.query.all()
    
    for setlist in setlists:
        songs = SetlistSong.query.filter_by(setlist_id=setlist.id).order_by(SetlistSong.sort_order).all()
        
        if len(songs) == 0:
            continue
            
        # Simple section assignment based on position
        total_songs = len(songs)
        
        for i, song in enumerate(songs):
            if i == 0:
                song.section = 'opening'
            elif i < total_songs // 3:
                song.section = 'opening'
            elif i < 2 * total_songs // 3:
                song.section = 'main'
            else:
                song.section = 'closing'
        
        db.session.commit()
```

## Post-Migration Tasks

### 1. User Training

#### Create User Guide

```markdown
# Setlist Quick Start Guide

## What's New

Your collections have been upgraded to setlists with new features:

### Performance Metadata
- Set specific key and tempo for each song in each setlist
- Add arrangement and performance notes
- Mark songs as optional or highlights

### Templates
- Create reusable setlist structures
- Use system templates for common formats
- Share templates with your team

### Collaboration
- Invite team members to edit setlists
- Set different permission levels
- Track who made what changes

### Analytics
- Record performance details
- Track audience response
- Analyze setlist effectiveness over time

## Getting Started

1. **View Your Setlists**: All your collections are now setlists
2. **Try Templates**: Create a new setlist from a template
3. **Add Performance Notes**: Edit a song in a setlist to add arrangement notes
4. **Share a Setlist**: Invite a team member to collaborate
```

#### Training Sessions

- Schedule user training sessions
- Create video tutorials
- Set up help desk for migration questions
- Provide migration feedback channel

### 2. Data Cleanup

#### Remove Old Collections (After Verification)

```python
def cleanup_migrated_collections():
    """Remove original collections after successful migration."""
    
    # Wait at least 30 days after migration
    # Only after user verification and approval
    
    migrated_collections = Collection.query.filter(
        Collection.description.like('[MIGRATED]%')
    ).all()
    
    logger.info(f"Found {len(migrated_collections)} migrated collections")
    
    # Archive instead of delete for safety
    for collection in migrated_collections:
        collection.is_deleted = True
        collection.deleted_at = datetime.utcnow()
    
    db.session.commit()
    logger.info("Migrated collections archived")
```

### 3. Performance Optimization

#### Update Statistics

```sql
-- Update table statistics after migration
ANALYZE setlists;
ANALYZE setlist_songs;
ANALYZE setlist_versions;
ANALYZE setlist_templates;
ANALYZE setlist_template_sections;
ANALYZE setlist_collaborators;
ANALYZE setlist_performances;
ANALYZE setlist_performance_songs;
```

#### Monitor Performance

```sql
-- Monitor query performance
SELECT 
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements 
WHERE query LIKE '%setlist%'
ORDER BY total_time DESC
LIMIT 10;
```

## Rollback Plan

### Emergency Rollback

If critical issues are discovered:

#### 1. Immediate Rollback

```sql
-- Temporarily disable setlist functionality
UPDATE setlists SET is_deleted = true;

-- Re-enable collections
UPDATE collections 
SET description = REPLACE(description, '[MIGRATED] ', '')
WHERE description LIKE '[MIGRATED]%';
```

#### 2. Full Schema Rollback

```sql
-- Drop setlist tables (DESTRUCTIVE)
DROP TABLE IF EXISTS setlist_performance_songs CASCADE;
DROP TABLE IF EXISTS setlist_performances CASCADE;
DROP TABLE IF EXISTS setlist_collaborators CASCADE;
DROP TABLE IF EXISTS setlist_template_sections CASCADE;
DROP TABLE IF EXISTS setlist_templates CASCADE;
DROP TABLE IF EXISTS setlist_versions CASCADE;
DROP TABLE IF EXISTS setlist_songs CASCADE;
DROP TABLE IF EXISTS setlists CASCADE;
```

### Partial Rollback

For selective issues:

```python
def rollback_specific_setlists(setlist_ids):
    """Rollback specific problematic setlists."""
    
    for setlist_id in setlist_ids:
        setlist = Setlist.query.get(setlist_id)
        if setlist:
            # Find original collection
            original_collection = Collection.query.filter(
                Collection.name == setlist.name,
                Collection.user_id == setlist.user_id,
                Collection.description.like('[MIGRATED]%')
            ).first()
            
            if original_collection:
                # Restore original collection
                original_collection.description = original_collection.description.replace('[MIGRATED] ', '')
                
                # Remove problematic setlist
                db.session.delete(setlist)
                
                db.session.commit()
```

## Testing Strategy

### Pre-Migration Testing

1. **Backup Validation**: Verify backup can be restored
2. **Schema Testing**: Test migration on copy of production data
3. **Performance Testing**: Verify query performance with real data volume
4. **Integration Testing**: Test with existing application code

### Post-Migration Testing

1. **Data Integrity**: Verify all data migrated correctly
2. **Feature Testing**: Test new setlist features work properly
3. **Performance Testing**: Monitor system performance under load
4. **User Acceptance**: Gather user feedback on migration

### Test Scripts

```python
def test_migration_integrity():
    """Test data integrity after migration."""
    
    # Test 1: All collections have corresponding setlists
    collections = Collection.query.filter(
        Collection.description.like('[MIGRATED]%')
    ).all()
    
    for collection in collections:
        setlist = Setlist.query.filter_by(
            name=collection.name,
            user_id=collection.user_id
        ).first()
        
        assert setlist is not None, f"No setlist found for collection {collection.name}"
        
        # Test song counts match
        col_song_count = CollectionSong.query.filter_by(collection_id=collection.id).count()
        setlist_song_count = SetlistSong.query.filter_by(setlist_id=setlist.id).count()
        
        assert col_song_count == setlist_song_count, f"Song count mismatch for {collection.name}"
    
    print("Migration integrity tests passed")

def test_new_features():
    """Test that new setlist features work."""
    
    # Test template creation
    template = SetlistTemplate.query.filter_by(is_system=True).first()
    assert template is not None, "No system templates found"
    
    # Test setlist creation from template
    # ... additional feature tests
    
    print("New feature tests passed")
```

## Monitoring and Alerts

### Key Metrics

Monitor these metrics post-migration:

1. **User Adoption**: Setlist creation rate vs collection creation rate
2. **Feature Usage**: Template usage, collaboration invitations, performance recordings
3. **Performance**: Query response times, error rates
4. **User Feedback**: Support tickets, feature requests

### Alert Thresholds

```python
# monitoring_config.py
MIGRATION_ALERTS = {
    'setlist_creation_rate': {
        'threshold': 0.5,  # At least 50% of previous collection creation rate
        'window': '24h'
    },
    'query_performance': {
        'threshold': 2.0,  # No more than 2x slower than collections
        'window': '1h'
    },
    'error_rate': {
        'threshold': 0.01,  # Less than 1% error rate
        'window': '5m'
    }
}
```

## Success Criteria

### Technical Success

- ✅ All collections successfully migrated to setlists
- ✅ No data loss during migration
- ✅ Query performance within acceptable limits
- ✅ All new features functioning correctly
- ✅ Zero critical bugs in production

### User Success

- ✅ User adoption rate >80% within 30 days
- ✅ Support ticket volume returns to baseline within 14 days
- ✅ User satisfaction score >4.0/5.0
- ✅ Feature utilization >25% for templates, >15% for collaboration

### Business Success

- ✅ Platform differentiation through advanced features
- ✅ Increased user engagement and retention
- ✅ Foundation for future premium features
- ✅ Positive community feedback and testimonials

## Conclusion

This migration guide provides a comprehensive approach to transitioning from collections to setlists while preserving data integrity and ensuring user success. The phased approach minimizes risk while maximizing the benefits of the new setlist architecture.

Key recommendations:
1. **Take your time**: Don't rush the migration process
2. **Test thoroughly**: Use a copy of production data for testing
3. **Communicate clearly**: Keep users informed throughout the process
4. **Monitor closely**: Watch metrics and user feedback post-migration
5. **Have a rollback plan**: Be prepared to rollback if issues arise

The setlist architecture represents a significant enhancement to ChordMe's capabilities, and proper migration ensures users can take full advantage of these new features while maintaining their existing workflows.