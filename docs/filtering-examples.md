---
layout: default
lang: en
title: Advanced Filtering Examples
---

# Advanced Filtering Examples

This document provides practical examples of using the ChordMe Advanced Filtering System for common scenarios.

## Common Use Cases

### 1. Finding Beginner-Friendly Songs

**Scenario**: A new guitarist wants to find easy songs to practice.

**Filters**:
```json
{
  "difficulty": "beginner",
  "maxTempo": 100,
  "key": "C",
  "combineMode": "AND"
}
```

**Explanation**: 
- Limits to beginner difficulty
- Keeps tempo under 100 BPM for easier practice
- Focuses on C major (no sharps/flats)
- All conditions must be met

### 2. Worship Team Song Selection

**Scenario**: A worship leader needs contemporary worship songs in singable keys.

**Filters**:
```json
{
  "genre": "Worship",
  "key": "G",
  "tags": ["contemporary", "congregational"],
  "minTempo": 70,
  "maxTempo": 120,
  "combineMode": "AND"
}
```

**Saved Preset**: "Sunday Morning Worship"

### 3. Christmas Service Preparation

**Scenario**: Planning music for Christmas services with varying skill levels.

**Filters**:
```json
{
  "tags": ["christmas", "holiday"],
  "difficulty": "beginner",
  "combineMode": "OR",
  "categories": ["traditional", "contemporary"]
}
```

**Alternative for Advanced Players**:
```json
{
  "tags": ["christmas"],
  "difficulty": "advanced",
  "timeSignature": "3/4"
}
```

### 4. Coffee Shop Performance Prep

**Scenario**: Preparing for an acoustic coffee shop performance.

**Filters**:
```json
{
  "tags": ["acoustic", "fingerpicking"],
  "minTempo": 60,
  "maxTempo": 90,
  "genre": "Folk",
  "difficulty": "intermediate",
  "combineMode": "AND"
}
```

### 5. Learning Jazz Standards

**Scenario**: Jazz student wants to explore different chord progressions.

**Filters**:
```json
{
  "genre": "Jazz",
  "difficulty": "advanced",
  "tags": ["standards", "bebop"],
  "dateField": "created_at",
  "dateFrom": "1940-01-01T00:00:00Z",
  "dateTo": "1960-12-31T23:59:59Z"
}
```

### 6. Kids' Music Ministry

**Scenario**: Finding appropriate songs for children's services.

**Filters**:
```json
{
  "tags": ["kids", "children", "sunday-school"],
  "difficulty": "beginner",
  "maxTempo": 130,
  "combineMode": "OR"
}
```

### 7. Campfire Songs Collection

**Scenario**: Building a repertoire for outdoor gatherings.

**Filters**:
```json
{
  "tags": ["campfire", "singalong", "acoustic"],
  "genre": "Folk",
  "difficulty": "beginner",
  "combineMode": "AND"
}
```

## Advanced Search Queries

### 8. Complex Text Search

**Scenario**: Finding songs about hope but not specifically hymns.

**Search Query**: `hope AND (faith OR love) NOT hymn`

**Complete Filter**:
```json
{
  "q": "hope AND (faith OR love) NOT hymn",
  "genre": "Contemporary",
  "language": "en"
}
```

### 9. Seasonal Song Discovery

**Scenario**: Finding Easter songs from the last 5 years.

**Filters**:
```json
{
  "q": "\"easter\" OR \"resurrection\" OR \"he is risen\"",
  "dateField": "created_at",
  "dateFrom": "2019-01-01T00:00:00Z",
  "categories": ["seasonal", "easter"]
}
```

### 10. Band Practice Session

**Scenario**: Rock band preparing for a show with specific requirements.

**Filters**:
```json
{
  "genre": "Rock",
  "difficulty": "intermediate",
  "minTempo": 120,
  "maxTempo": 160,
  "timeSignature": "4/4",
  "tags": ["electric", "band"]
}
```

## Filter Preset Examples

### Preset 1: "Sunday Morning Worship"
```json
{
  "name": "Sunday Morning Worship",
  "description": "Contemporary worship songs for Sunday services",
  "filter_config": {
    "genre": "Worship",
    "difficulty": "intermediate",
    "key": "G",
    "minTempo": 70,
    "maxTempo": 120,
    "tags": ["contemporary", "congregational"],
    "combineMode": "AND"
  },
  "is_public": true
}
```

### Preset 2: "Beginner Guitar"
```json
{
  "name": "Beginner Guitar",
  "description": "Easy songs for new guitar players",
  "filter_config": {
    "difficulty": "beginner",
    "maxTempo": 100,
    "key": "C",
    "tags": ["simple-chords", "no-barre"],
    "combineMode": "AND"
  },
  "is_public": true
}
```

### Preset 3: "Acoustic Coffee Shop"
```json
{
  "name": "Acoustic Coffee Shop",
  "description": "Mellow acoustic songs for intimate venues",
  "filter_config": {
    "tags": ["acoustic", "mellow", "fingerpicking"],
    "genre": "Folk",
    "minTempo": 60,
    "maxTempo": 90,
    "difficulty": "intermediate",
    "combineMode": "AND"
  },
  "is_public": false
}
```

## API Usage Examples

### JavaScript/TypeScript Examples

#### Basic Search
```typescript
import { songSearchService } from './services/songSearchService';

// Simple genre search
const rockSongs = await songSearchService.searchSongs({
  genre: 'Rock',
  difficulty: 'beginner'
});

console.log(`Found ${rockSongs.total_count} rock songs for beginners`);
```

#### Complex Search with Multiple Filters
```typescript
const worshipSongs = await songSearchService.searchSongs({
  genre: 'Worship',
  tags: ['contemporary', 'uplifting'],
  key: 'G',
  minTempo: 70,
  maxTempo: 120,
  difficulty: 'intermediate',
  combineMode: 'AND',
  limit: 50
});

// Process results
worshipSongs.results.forEach(song => {
  console.log(`${song.title} by ${song.artist} - ${song.tempo} BPM`);
});
```

#### Working with Filter Presets
```typescript
// Create a new preset
const newPreset = await songSearchService.createFilterPreset({
  name: 'Christmas Songs',
  description: 'Holiday songs for Christmas services',
  filter_config: {
    tags: ['christmas', 'holiday'],
    difficulty: 'intermediate',
    maxTempo: 120
  },
  is_public: true
});

// Load an existing preset
const presets = await songSearchService.getFilterPresets();
const christmasPreset = presets.find(p => p.name === 'Christmas Songs');

if (christmasPreset) {
  const results = await songSearchService.searchSongs(
    christmasPreset.filter_config
  );
}
```

### React Component Examples

#### Filter Hook Usage
```tsx
import { useFilterContext } from '../contexts/FilterContext';

function QuickFilters() {
  const { setFilter, clearFilters, hasActiveFilters } = useFilterContext();

  return (
    <div className="quick-filters">
      <button onClick={() => setFilter('genre', 'Worship')}>
        Worship Songs
      </button>
      <button onClick={() => setFilter('difficulty', 'beginner')}>
        Beginner Level
      </button>
      <button onClick={() => setFilter('key', 'C')}>
        Key of C
      </button>
      
      {hasActiveFilters() && (
        <button onClick={clearFilters} className="clear-btn">
          Clear All Filters
        </button>
      )}
    </div>
  );
}
```

#### Advanced Filter Component
```tsx
function CustomFilterPanel() {
  const { state, setFilter, search } = useFilterContext();
  const [tempoRange, setTempoRange] = useState([60, 120]);

  const handleTempoChange = (values: number[]) => {
    setTempoRange(values);
    setFilter('minTempo', values[0]);
    setFilter('maxTempo', values[1]);
  };

  const handleSearch = async () => {
    const results = await search();
    console.log(`Found ${results.length} songs`);
  };

  return (
    <div className="custom-filter-panel">
      <div className="tempo-slider">
        <label>Tempo Range: {tempoRange[0]} - {tempoRange[1]} BPM</label>
        <input
          type="range"
          min="40"
          max="200"
          value={tempoRange[0]}
          onChange={(e) => handleTempoChange([Number(e.target.value), tempoRange[1]])}
        />
        <input
          type="range"
          min="40"
          max="200"
          value={tempoRange[1]}
          onChange={(e) => handleTempoChange([tempoRange[0], Number(e.target.value)])}
        />
      </div>
      
      <button onClick={handleSearch} disabled={state.isLoading}>
        {state.isLoading ? 'Searching...' : 'Search Songs'}
      </button>
    </div>
  );
}
```

## cURL Examples

### Basic API Calls

#### Search for Worship Songs
```bash
curl "https://api.chordme.com/api/v1/songs/search?genre=Worship&difficulty=intermediate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json"
```

#### Complex Search with Multiple Parameters
```bash
curl -G "https://api.chordme.com/api/v1/songs/search" \
  -d "genre=Rock" \
  -d "min_tempo=100" \
  -d "max_tempo=140" \
  -d "difficulty=intermediate" \
  -d "tags=electric,band" \
  -d "time_signature=4/4" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Filter Preset
```bash
curl -X POST "https://api.chordme.com/api/v1/filter-presets" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rock Band Practice",
    "description": "Songs for rock band practice sessions",
    "filter_config": {
      "genre": "Rock",
      "difficulty": "intermediate",
      "min_tempo": 120,
      "max_tempo": 160,
      "tags": ["electric", "band"]
    },
    "is_public": false
  }'
```

## Performance Tips

### Optimizing Search Queries

1. **Use Specific Filters First**
   ```json
   // Better: Start with restrictive filters
   {
     "genre": "Jazz",        // Narrows down significantly
     "difficulty": "advanced", // Further restriction
     "tags": ["bebop"]       // Final refinement
   }
   
   // Avoid: Starting with broad text search
   {
     "q": "music song guitar" // Too broad, slow
   }
   ```

2. **Limit Result Sets**
   ```json
   {
     "genre": "Rock",
     "limit": 20,    // Don't request more than needed
     "offset": 0     // Use pagination for large sets
   }
   ```

3. **Use Caching Wisely**
   ```typescript
   // Enable caching for repeated searches
   const results = await songSearchService.searchSongs({
     genre: 'Worship',
     enableCache: true  // Results cached for 5 minutes
   });
   ```

### Filter Combination Strategies

1. **AND for Precision**
   ```json
   {
     "genre": "Worship",
     "difficulty": "beginner",
     "key": "C",
     "combineMode": "AND"  // All must match
   }
   ```

2. **OR for Discovery**
   ```json
   {
     "tags": ["acoustic", "fingerpicking", "classical"],
     "combineMode": "OR"  // Any can match
   }
   ```

## Troubleshooting Common Scenarios

### Too Many Results
**Problem**: Search returns thousands of results
**Solution**: Add more specific filters
```json
{
  "genre": "Rock",           // Start broad
  "difficulty": "beginner",  // Add restriction
  "maxTempo": 120,          // Further limit
  "key": "C"                // Final refinement
}
```

### No Results Found
**Problem**: No songs match the criteria
**Solution**: Relax some filters or use OR logic
```json
{
  "genre": "Rock",
  "difficulty": "beginner",
  "combineMode": "OR"  // Change from AND to OR
}
```

### Slow Search Performance
**Problem**: Searches take too long
**Solution**: Optimize filter order and use caching
```json
{
  "genre": "Worship",     // Most selective first
  "enableCache": true,    // Enable caching
  "limit": 25            // Reduce result set
}
```

## Best Practices Summary

1. **Start Simple**: Begin with basic filters, add complexity gradually
2. **Use Presets**: Save frequently used filter combinations
3. **Optimize Performance**: Put most selective filters first
4. **Test Combinations**: Verify filter logic produces expected results
5. **Document Presets**: Add clear descriptions to shared presets
6. **Monitor Usage**: Track which filters provide the best results

These examples should help you get the most out of the ChordMe Advanced Filtering System!