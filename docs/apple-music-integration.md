# Apple Music Integration for ChordMe

## Overview

The Apple Music API integration enables ChordMe users to:

- **Authenticate with Apple Music**: Secure MusicKit authentication with developer tokens
- **Search for Music**: Find tracks, artists, and albums from Apple Music's catalog
- **Enrich Song Metadata**: Get detailed track information, album artwork, and additional metadata
- **Audio Previews**: Access 30-second track previews for listening and learning
- **Cross-Platform Matching**: Match songs between Spotify and Apple Music
- **Playlist Management**: Create and manage Apple Music playlists
- **Subscription Detection**: Detect Apple Music subscription status and capabilities

## Setup Requirements

### 1. Apple Developer Account

1. **Apple Developer Program**: Enroll in the Apple Developer Program
2. **MusicKit Identifier**: Create a MusicKit identifier in your Apple Developer account
3. **Private Key**: Generate a private key for MusicKit authentication
4. **Developer Token**: Create and configure developer tokens for server-side API access

### 2. Environment Configuration

**Frontend Environment Variables** (`.env.frontend`):
```bash
# Apple Music MusicKit Configuration
VITE_APPLE_MUSIC_DEVELOPER_TOKEN=your_developer_token_here
VITE_APP_VERSION=1.0.0
```

**Backend Environment Variables** (`.env.backend`):
```bash
# Apple Music API Configuration
APPLE_MUSIC_DEVELOPER_TOKEN=your_developer_token_here
```

### 3. Developer Token Generation

Developer tokens must be generated server-side using your Apple Developer credentials:

```python
import jwt
import datetime

def generate_developer_token(key_id, team_id, private_key):
    headers = {
        'alg': 'ES256',
        'kid': key_id
    }
    
    payload = {
        'iss': team_id,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)  # Max 6 months
    }
    
    token = jwt.encode(payload, private_key, algorithm='ES256', headers=headers)
    return token
```

## Usage

### Frontend Integration

#### Basic Authentication
```typescript
import { appleMusicService } from '../services/appleMusicService';

// Check if Apple Music is configured
if (appleMusicService.isConfigured()) {
    // Initialize MusicKit
    await appleMusicService.initialize();
    
    // Check authorization status
    const status = appleMusicService.getAuthorizationStatus();
    
    if (status === 'notDetermined') {
        // Request authorization
        const authResult = await appleMusicService.authorize();
        console.log('User authorized:', authResult.subscriptionStatus.active);
    }
}
```

#### Searching for Music
```typescript
import { appleMusicService } from '../services/appleMusicService';

// Search for tracks
const searchResults = await appleMusicService.search({
    term: 'acoustic guitar',
    types: ['songs'],
    limit: 25
});

// Process results
if (searchResults.results.songs) {
    for (const track of searchResults.results.songs.data) {
        console.log(`${track.attributes.name} by ${track.attributes.artistName}`);
    }
}
```

#### Getting Track Details
```typescript
// Get specific track
const track = await appleMusicService.getTrack('1234567890');
console.log('Track duration:', track.attributes.durationInMillis);

// Play 30-second preview
if (track.attributes.previews && track.attributes.previews.length > 0) {
    await appleMusicService.playPreview(track);
}
```

#### Cross-Platform Matching
```typescript
import { crossPlatformMusicService } from '../services/crossPlatformMusicService';

// Convert Spotify track to platform-agnostic format
const spotifyTrack = {
    platform: 'spotify',
    id: 'spotify123',
    name: 'Song Title',
    artistName: 'Artist Name',
    albumName: 'Album Name',
    durationMs: 180000
};

// Find matching Apple Music track
const matchResult = await crossPlatformMusicService.matchTrack({
    track: spotifyTrack,
    targetPlatform: 'apple-music',
    matchCriteria: {
        titleSimilarityThreshold: 0.8,
        artistSimilarityThreshold: 0.8,
        durationToleranceMs: 5000
    }
});

if (matchResult.bestMatch) {
    console.log('Found match:', matchResult.bestMatch.name);
    console.log('Confidence:', matchResult.matches[0].confidence);
}
```

#### Creating Playlists
```typescript
// Create new playlist
const playlist = await appleMusicService.createPlaylist(
    'My ChordMe Playlist',
    'Songs from ChordMe practice sessions',
    ['song1', 'song2', 'song3']  // Track IDs
);

console.log('Playlist created:', playlist.id);
```

### Backend API Usage

#### Search Tracks
```bash
POST /api/v1/apple-music/search
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "term": "acoustic guitar",
    "types": ["songs"],
    "limit": 25,
    "language": "en"
}
```

#### Get Track Details
```bash
GET /api/v1/apple-music/songs/1234567890
Authorization: Bearer <jwt_token>
Music-User-Token: <optional_user_token>
```

#### Cross-Platform Matching
```bash
POST /api/v1/apple-music/cross-platform-match
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "track": {
        "name": "Song Title",
        "artist_name": "Artist Name",
        "album_name": "Album Name",
        "duration_ms": 180000
    }
}
```

#### Link Apple Music Metadata to Song
```bash
POST /api/v1/apple-music/link-metadata
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "song_id": "123",
    "apple_music_id": "1234567890"
}
```

## Rate Limits

Apple Music API has the following rate limits:

- **Catalog API**: 1,000 requests per hour per developer token
- **Library API**: 1,000 requests per hour per user token
- **Search API**: 20 requests per minute per developer token

ChordMe implements automatic rate limiting and retry logic to handle these limits gracefully.

## Security Features

### Developer Token Security
- Tokens are generated server-side with proper expiration
- Never expose private keys in client-side code
- Implement token rotation for long-running applications

### User Token Management
- User tokens are stored securely in browser storage
- Automatic token refresh when needed
- Proper cleanup on sign out

### Error Handling
- Comprehensive error handling for API failures
- Graceful degradation when Apple Music is unavailable
- User-friendly error messages

## Error Handling

Common error scenarios and their handling:

```typescript
try {
    const results = await appleMusicService.search({
        term: 'test query',
        types: ['songs']
    });
} catch (error) {
    if (error.message.includes('Rate limited')) {
        // Handle rate limiting
        console.log('Too many requests, please wait');
    } else if (error.message.includes('not configured')) {
        // Handle missing configuration
        console.log('Apple Music not configured');
    } else {
        // Handle other errors
        console.log('Search failed:', error.message);
    }
}
```

## Testing

### Unit Tests
```bash
# Frontend tests
cd frontend && npm run test -- appleMusicService.test.ts
cd frontend && npm run test -- crossPlatformMusicService.test.ts

# Backend tests
cd backend && python -m pytest tests/test_apple_music_routes.py -v
```

### Integration Tests
```bash
# Test Apple Music health endpoint
curl -X GET "http://localhost:5000/api/v1/apple-music/health"

# Test search with authentication
curl -X POST "http://localhost:5000/api/v1/apple-music/search" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"term": "test", "types": ["songs"]}'
```

## Cross-Platform Features

### Song Matching Algorithm

The cross-platform matching uses multiple criteria:

1. **ISRC Matching** (Highest Priority)
   - International Standard Recording Code
   - Unique identifier for recordings
   - 100% accuracy when available

2. **Metadata Matching**
   - Track title similarity (configurable threshold)
   - Artist name similarity (configurable threshold)
   - Album name similarity (bonus points)

3. **Duration Matching**
   - Allows for small differences in track length
   - Configurable tolerance (default: 5 seconds)

4. **Combined Scoring**
   - Weighted combination of all factors
   - Confidence score from 0.0 to 1.0
   - Filters out low-confidence matches

### Matching Configuration

```typescript
const customCriteria = {
    requireISRC: false,                    // Require ISRC for match
    titleSimilarityThreshold: 0.8,        // 80% title similarity
    artistSimilarityThreshold: 0.8,       // 80% artist similarity
    durationToleranceMs: 5000              // 5-second tolerance
};
```

### Batch Processing

For processing multiple tracks:

```typescript
const tracks = [track1, track2, track3];
const results = await crossPlatformMusicService.batchMatchTracks(
    tracks,
    'apple-music',
    customCriteria
);

// Process results
results.forEach((result, index) => {
    if (result.bestMatch) {
        console.log(`Track ${index + 1} matched with confidence ${result.matches[0].confidence}`);
    } else {
        console.log(`Track ${index + 1} no match found`);
    }
});
```

## Troubleshooting

### Common Issues

1. **"Apple Music integration is not configured"**
   - Ensure `VITE_APPLE_MUSIC_DEVELOPER_TOKEN` is set in frontend environment
   - Ensure `APPLE_MUSIC_DEVELOPER_TOKEN` is set in backend environment
   - Check that the token is valid and not expired

2. **"Failed to initialize Apple Music integration"**
   - Verify MusicKit script is loading correctly
   - Check browser console for JavaScript errors
   - Ensure developer token has proper permissions

3. **"User must be authenticated to create playlists"**
   - User needs to authorize with Apple Music first
   - Check subscription status and capabilities
   - Verify user has Apple Music subscription

4. **Rate limiting issues**
   - Monitor API usage in Apple Developer dashboard
   - Implement request queuing for high-volume usage
   - Consider caching frequently accessed data

### Development Tips

- Use Apple Music for Artists to monitor API usage
- Test with different market codes for regional availability
- Cache track metadata to reduce API calls
- Implement fallback UI when Apple Music is unavailable

### Browser Compatibility

- **MusicKit Web**: Requires modern browsers with Promise support
- **Supported Browsers**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **Mobile Support**: iOS Safari 11+, Android Chrome 60+

## Privacy Considerations

When using Apple Music integration:

- **User Consent**: Always inform users about Apple Music data usage
- **Data Minimization**: Only request necessary permissions and data
- **Secure Storage**: Use secure, encrypted storage for user tokens
- **Data Retention**: Implement appropriate data retention policies
- **Privacy Policy**: Update privacy policy to include Apple Music data usage

## Production Deployment

1. **Update Configuration**: Set production Apple Music credentials
2. **HTTPS**: Ensure HTTPS is enabled for MusicKit security
3. **Token Rotation**: Implement automatic developer token rotation
4. **Monitoring**: Set up monitoring for API usage and errors
5. **Backup**: Implement token backup and recovery procedures
6. **Compliance**: Ensure compliance with Apple Music API guidelines

## Support

For issues related to Apple Music integration:

1. Check the [Apple Music API Documentation](https://developer.apple.com/documentation/applemusicapi/)
2. Review ChordMe integration logs for specific error messages
3. Contact ChordMe support with detailed error information
4. Check Apple Developer Dashboard for API status and quota usage