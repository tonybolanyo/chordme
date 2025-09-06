---
layout: default
lang: en
title: Advanced Filtering System Guide
---

# Advanced Filtering System Guide

The ChordMe Advanced Filtering System provides comprehensive search and filtering capabilities for songs, allowing users to find exactly what they're looking for using multiple criteria and saved filter presets.

## Overview

The advanced filtering system enables users to:
- Filter songs by multiple criteria simultaneously
- Combine filters using AND/OR logic
- Save and share custom filter presets
- Apply date range filtering
- Search with real-time results

## Core Features

### 1. Basic Filters

#### Genre Filtering
Filter songs by musical genre:
- Rock, Pop, Folk, Country, Blues, Jazz, Classical
- Gospel, Worship, Christmas, Hymns
- Alternative, Indie, and more

```typescript
// Example: Filter for worship songs
{
  genre: "Worship"
}
```

#### Key Signature Filtering
Filter by musical key (both major and minor):
- Major keys: C, D, E, F, G, A, B (with sharps/flats)
- Minor keys: Am, Bm, Cm, Dm, Em, Fm, Gm (with sharps/flats)

```typescript
// Example: Filter for songs in C major
{
  key: "C"
}
```

#### Difficulty Level Filtering
Filter by skill level required:
- **Beginner**: Simple chord progressions, easy strumming patterns
- **Intermediate**: Moderate complexity, some barre chords
- **Advanced**: Complex progressions, challenging techniques
- **Expert**: Professional-level material

```typescript
// Example: Filter for beginner-friendly songs
{
  difficulty: "beginner"
}
```

#### Tempo Range Filtering
Filter by beats per minute (BPM):
- Range: 40-300 BPM
- Supports minimum and maximum values
- Useful for finding songs suitable for specific occasions

```typescript
// Example: Filter for medium tempo songs (80-120 BPM)
{
  minTempo: 80,
  maxTempo: 120
}
```

#### Time Signature Filtering
Filter by rhythmic pattern:
- Common signatures: 4/4, 3/4, 2/4
- Complex signatures: 6/8, 9/8, 12/8, 5/4, 7/8

```typescript
// Example: Filter for waltz-time songs
{
  timeSignature: "3/4"
}
```

### 2. Advanced Filters

#### Tag-Based Filtering
Filter using custom user tags:
- Tags are comma-separated values
- Examples: "worship", "acoustic", "fingerpicking", "capo"

```typescript
// Example: Filter for acoustic worship songs
{
  tags: ["worship", "acoustic"]
}
```

#### Category Filtering
Filter by song categories:
- Examples: "hymns", "contemporary", "traditional", "seasonal"

```typescript
// Example: Filter for traditional hymns
{
  categories: ["hymns", "traditional"]
}
```

#### Date Range Filtering
Filter by creation or modification dates:
- **Date Field Options**: 
  - `created_at`: When song was originally added
  - `updated_at`: When song was last modified
- **Date Format**: ISO 8601 (YYYY-MM-DD)

```typescript
// Example: Filter for songs added in 2024
{
  dateFrom: "2024-01-01T00:00:00Z",
  dateTo: "2024-12-31T23:59:59Z",
  dateField: "created_at"
}
```

#### Text Search with Boolean Operators
Advanced text search with operator support:
- **AND**: All terms must be present (`love AND peace`)
- **OR**: Any term can be present (`guitar OR piano`)
- **NOT**: Exclude terms (`jazz NOT blues`)
- **Phrases**: Exact phrase matching (`"amazing grace"`)
- **Prefix operators**: 
  - `+term`: Required term
  - `-term`: Excluded term

```typescript
// Example: Complex search query
{
  q: '"amazing grace" AND worship NOT instrumental'
}
```

### 3. Filter Combination Logic

#### AND Logic (Default)
All specified filters must match:
```typescript
{
  genre: "Rock",
  difficulty: "beginner",
  combineMode: "AND"
}
// Returns: Songs that are BOTH Rock genre AND beginner difficulty
```

#### OR Logic
Any specified filter can match:
```typescript
{
  genre: "Rock",
  difficulty: "beginner", 
  combineMode: "OR"
}
// Returns: Songs that are EITHER Rock genre OR beginner difficulty
```

### 4. Filter Presets

Filter presets allow users to save and reuse complex filter combinations.

#### Creating Filter Presets
```typescript
const presetData = {
  name: "Worship Songs for Beginners",
  description: "Easy worship songs in common keys",
  filter_config: {
    genre: "Worship",
    difficulty: "beginner",
    key: "C",
    maxTempo: 100
  },
  is_public: false,
  is_shared: false
};

await songSearchService.createFilterPreset(presetData);
```

#### Loading Filter Presets
```typescript
// Get all accessible presets
const presets = await songSearchService.getFilterPresets();

// Load a specific preset
const preset = await songSearchService.getFilterPreset(presetId);

// Apply preset filters
setFilters(preset.filter_config);
```

#### Sharing Filter Presets
```typescript
// Share with specific user
await songSearchService.shareFilterPreset(presetId, "user@example.com");

// Make preset public
await songSearchService.updateFilterPreset(presetId, { 
  is_public: true 
});
```

## API Reference

### Search Endpoint
```
GET /api/v1/songs/search
```

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Text search query with boolean operators |
| `genre` | string | Filter by genre |
| `key` | string | Filter by musical key |
| `difficulty` | string | Filter by difficulty level |
| `language` | string | Filter by language (default: 'en') |
| `time_signature` | string | Filter by time signature |
| `tags` | string | Comma-separated list of tags |
| `categories` | string | Comma-separated list of categories |
| `min_tempo` | integer | Minimum tempo (BPM) |
| `max_tempo` | integer | Maximum tempo (BPM) |
| `date_from` | string | Start date (ISO 8601) |
| `date_to` | string | End date (ISO 8601) |
| `date_field` | string | Date field to filter on ('created_at' or 'updated_at') |
| `include_public` | boolean | Include public songs (default: true) |
| `limit` | integer | Maximum results (default: 20, max: 100) |
| `offset` | integer | Pagination offset (default: 0) |

#### Example Request
```bash
curl "https://api.chordme.com/api/v1/songs/search?genre=Rock&difficulty=beginner&min_tempo=80&max_tempo=120" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response
```json
{
  "status": "success",
  "results": [
    {
      "id": "123",
      "title": "Wonderwall", 
      "artist": "Oasis",
      "genre": "Rock",
      "difficulty": "beginner",
      "tempo": 87,
      "time_signature": "4/4",
      "song_key": "Em",
      "relevance_score": 0.95,
      "highlights": {
        "title": "<mark>Wonderwall</mark>",
        "artist": "Oasis"
      }
    }
  ],
  "total_count": 1,
  "search_time_ms": 45,
  "query_info": {
    "original_query": "",
    "parsed_query": {
      "phrases": [],
      "and_terms": [],
      "or_terms": [],
      "not_terms": [],
      "has_operators": false
    },
    "filters_applied": {
      "genre": "Rock",
      "difficulty": "beginner",
      "min_tempo": 80,
      "max_tempo": 120
    }
  }
}
```

### Filter Presets API

#### Get Filter Presets
```
GET /api/v1/filter-presets
```

#### Create Filter Preset
```
POST /api/v1/filter-presets
Content-Type: application/json

{
  "name": "My Custom Filter",
  "description": "Description of the filter",
  "filter_config": {
    "genre": "Rock",
    "difficulty": "intermediate"
  },
  "is_public": false
}
```

#### Update Filter Preset
```
PUT /api/v1/filter-presets/{id}
Content-Type: application/json

{
  "name": "Updated Filter Name",
  "is_public": true
}
```

#### Share Filter Preset
```
POST /api/v1/filter-presets/{id}/share
Content-Type: application/json

{
  "user_email": "friend@example.com"
}
```

## Frontend Integration

### Using FilterContext
```tsx
import { useFilterContext } from '../contexts/FilterContext';

function MySearchComponent() {
  const {
    state,
    setFilter,
    clearFilters,
    search,
    hasActiveFilters,
    getFilterSummary
  } = useFilterContext();

  // Set individual filter
  const handleGenreChange = (genre: string) => {
    setFilter('genre', genre);
  };

  // Execute search
  const handleSearch = async () => {
    const results = await search();
    console.log('Search results:', results);
  };

  return (
    <div>
      {hasActiveFilters() && (
        <p>Active filters: {getFilterSummary()}</p>
      )}
      <button onClick={() => setFilter('genre', 'Rock')}>
        Filter Rock Songs
      </button>
      <button onClick={handleSearch}>Search</button>
      <button onClick={clearFilters}>Clear All</button>
    </div>
  );
}
```

### Using AdvancedFilterPanel
```tsx
import { AdvancedFilterPanel } from '../components/AdvancedFilterPanel';
import { FilterProvider } from '../contexts/FilterContext';

function App() {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchResults = (results: any[]) => {
    console.log('New search results:', results);
    setShowFilters(false);
  };

  return (
    <FilterProvider>
      <button onClick={() => setShowFilters(true)}>
        Advanced Filters
      </button>
      
      <AdvancedFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onSearch={handleSearchResults}
      />
    </FilterProvider>
  );
}
```

## Performance Considerations

### Search Optimization
- Results are cached for 5 minutes to improve performance
- Database queries are optimized with proper indexing
- Pagination limits prevent excessive data transfer

### Filter Validation
- Client-side validation prevents invalid API calls
- Server-side validation ensures data integrity
- Filter configurations are validated before saving

### Real-time Updates
- Search results update immediately as filters change
- Debounced input prevents excessive API calls
- Loading states provide user feedback

## Best Practices

### Filter Design
1. **Start Simple**: Begin with basic filters before adding complex criteria
2. **Use Presets**: Save frequently used filter combinations
3. **Combine Logically**: Use AND for restrictive searches, OR for broader results
4. **Test Thoroughly**: Verify filter combinations return expected results

### Performance
1. **Limit Results**: Use reasonable pagination limits
2. **Cache Wisely**: Enable caching for repeated searches
3. **Validate Early**: Check filters client-side before API calls

### User Experience
1. **Provide Feedback**: Show loading states and result counts
2. **Clear Communication**: Display active filters clearly
3. **Easy Reset**: Allow users to clear filters quickly
4. **Save Progress**: Use presets for complex filter combinations

## Troubleshooting

### Common Issues

#### No Results Found
- Check if filters are too restrictive
- Try using OR logic instead of AND
- Verify filter values are valid (e.g., correct genre names)

#### Slow Search Performance
- Reduce the number of active filters
- Use more specific text queries
- Enable result caching

#### Filter Preset Not Loading
- Check user permissions for the preset
- Verify preset hasn't been deleted
- Ensure valid filter configuration

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid filter configuration" | Filter contains unsupported fields | Use only supported filter parameters |
| "Preset name already exists" | Duplicate preset name for user | Choose a different preset name |
| "Access denied to preset" | Insufficient permissions | Request access from preset owner |
| "Invalid date format" | Malformed date string | Use ISO 8601 format (YYYY-MM-DD) |

## Migration from Simple Search

### Updating Existing Code
Old simple search:
```typescript
// Old way
const results = await api.get('/songs?q=rock&genre=Rock');
```

New advanced search:
```typescript
// New way
const results = await songSearchService.searchSongs({
  q: 'rock',
  genre: 'Rock',
  difficulty: 'beginner',
  combineMode: 'AND'
});
```

### Backwards Compatibility
- All existing search parameters continue to work
- Simple searches are automatically upgraded to advanced format
- No breaking changes to existing API endpoints

## Future Enhancements

### Planned Features
- **Smart Recommendations**: AI-powered filter suggestions
- **Collaborative Filtering**: Social filtering based on user behavior
- **Advanced Analytics**: Filter usage statistics and insights
- **Export/Import**: Backup and restore filter presets
- **Voice Search**: Voice-activated filter commands

### Extensibility
The filtering system is designed to be easily extensible:
- New filter types can be added without breaking changes
- Custom filter logic can be implemented for specific use cases
- Third-party integrations can leverage the filter API

## Support

For additional help with the advanced filtering system:
- Check the [API Documentation](api-reference.md)
- Review [Example Use Cases](filtering-examples.md)
- Submit issues on [GitHub](https://github.com/tonybolanyo/chordme/issues)
- Join the [Community Discord](https://discord.gg/chordme)