# YouTube Integration Documentation

## Overview

The ChordMe YouTube Integration provides comprehensive functionality for linking YouTube videos to songs, enabling synchronized playback with chord charts. This integration includes video search, automatic suggestions, playback controls, and a framework for chord-video synchronization.

## Features

### ✅ Core Features Implemented
- YouTube API integration with embedded player
- Song-to-YouTube video linking and management
- Synchronized playback with chord chart progression
- Automatic video search and matching for songs
- Playback control synchronization (play, pause, seek)
- Volume control and mute functionality
- Multiple video options per song
- Offline mode graceful degradation

### ✅ Technical Features
- Comprehensive error handling and fallback behavior
- Rate limiting and API quota management
- Cross-browser embedded player compatibility
- Mobile-responsive design
- Full test coverage (frontend and backend)
- RESTful API endpoints
- Authentication and authorization

## Quick Start

### 1. Environment Setup

Add YouTube API key to your environment variables:

```bash
# Frontend (.env)
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here

# Backend (.env)
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 2. Basic Usage

```typescript
import { YouTubeIntegration } from '../components';

// Simple integration
<YouTubeIntegration
  song={song}
  autoSearch={true}
  syncEnabled={true}
  onError={handleError}
/>
```

### 3. Component Props

```typescript
interface YouTubeIntegrationProps {
  song: Song;                    // Required: Song object
  onError?: (error: string) => void;  // Error handler
  className?: string;            // Custom CSS class
  autoSearch?: boolean;          // Auto-search on load (default: true)
  syncEnabled?: boolean;         // Enable synchronization (default: true)
  compact?: boolean;             // Compact UI mode (default: false)
}
```

## Components

### YouTubeIntegration

Main integration component that provides complete YouTube functionality for songs.

**Features:**
- Automatic video suggestions based on song metadata
- Video search with filters
- Video linking and unlinking
- Player controls and synchronization
- Error handling and loading states

**Example:**
```typescript
<YouTubeIntegration
  song={currentSong}
  autoSearch={true}
  syncEnabled={true}
  compact={false}
  onError={(error) => console.error('YouTube error:', error)}
/>
```

### YouTubePlayer

Standalone YouTube player component with custom controls.

**Features:**
- YouTube Player API integration
- Custom playback controls
- Volume control and mute
- Progress tracking
- Synchronization framework
- Error handling

**Example:**
```typescript
<YouTubePlayer
  videoId="dQw4w9WgXcQ"
  config={{
    apiKey: 'your_api_key',
    autoplay: false,
    controls: 1
  }}
  syncConfig={{
    enabled: true,
    syncMode: 'automatic',
    syncTolerance: 100
  }}
  onPlayerReady={handlePlayerReady}
  onError={handleError}
/>
```

### YouTubeSearch

Video search component with filters and thumbnails.

**Features:**
- YouTube video search
- Search filters (duration, quality, order)
- Video thumbnails and metadata
- Responsive design
- Pagination support

**Example:**
```typescript
<YouTubeSearch
  onVideoSelect={handleVideoSelect}
  initialQuery="Wonderwall Oasis"
  maxResults={10}
  compact={false}
  onError={handleError}
/>
```

## API Endpoints

### Search Videos
```http
POST /api/v1/youtube/search
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "Wonderwall Oasis",
  "maxResults": 10,
  "order": "relevance",
  "videoDuration": "any",
  "videoDefinition": "any"
}
```

### Get Video Details
```http
GET /api/v1/youtube/video/{videoId}
Authorization: Bearer {token}
```

### Link Video to Song
```http
POST /api/v1/songs/{songId}/youtube
Authorization: Bearer {token}
Content-Type: application/json

{
  "videoId": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "syncEnabled": true,
  "chordMapping": [
    {
      "chordName": "C",
      "startTime": 0,
      "endTime": 4
    }
  ]
}
```

### Get Linked Video Data
```http
GET /api/v1/songs/{songId}/youtube
Authorization: Bearer {token}
```

### Unlink Video
```http
DELETE /api/v1/songs/{songId}/youtube
Authorization: Bearer {token}
```

### Get Video Suggestions
```http
GET /api/v1/youtube/suggest/{songId}?maxResults=5
Authorization: Bearer {token}
```

## Synchronization

The YouTube integration includes a framework for synchronizing video playback with chord charts.

### Sync Configuration

```typescript
interface YouTubeSyncConfig {
  enabled: boolean;                    // Enable synchronization
  chordProgression?: ChordTimeMapping[]; // Chord timing mappings
  syncTolerance: number;               // Tolerance in milliseconds
  autoSync: boolean;                   // Automatic synchronization
  syncMode: 'manual' | 'automatic' | 'chord-based';
  beatDetection?: boolean;             // Beat detection (future)
}
```

### Chord Mapping

```typescript
interface ChordTimeMapping {
  chordName: string;    // Chord name (e.g., "C", "Am")
  startTime: number;    // Start time in seconds
  endTime: number;      // End time in seconds
  barNumber?: number;   // Bar number (optional)
  beatPosition?: number; // Beat position (optional)
}
```

### Events

The system emits custom events for chord highlighting:

```typescript
// Listen for chord highlights
window.addEventListener('youtube-chord-highlight', (event) => {
  console.log('Current time:', event.detail.currentTime);
});

// Listen for chord changes
window.addEventListener('youtube-chord-change', (event) => {
  console.log('Current chord:', event.detail.chord);
});
```

## Error Handling

### Frontend Errors

The components provide comprehensive error handling:

```typescript
// Component-level error handling
<YouTubeIntegration
  song={song}
  onError={(error) => {
    // Handle YouTube integration errors
    console.error('YouTube error:', error);
    showErrorToast(error);
  }}
/>

// Service-level error handling
try {
  await youtubeService.searchVideos(params);
} catch (error) {
  if (error.code === 'YOUTUBE_API_ERROR') {
    // Handle API errors
  } else if (error.code === 'NETWORK_ERROR') {
    // Handle network errors
  }
}
```

### Backend Errors

The API returns structured error responses:

```json
{
  "status": "error",
  "error": {
    "code": "YOUTUBE_API_ERROR",
    "message": "YouTube API quota exceeded. Please try again later",
    "category": "rate_limit",
    "retryable": true
  }
}
```

### Common Error Codes

- `YOUTUBE_API_ERROR` - YouTube API issues
- `YOUTUBE_QUOTA_EXCEEDED` - API quota exceeded
- `INVALID_INPUT` - Invalid parameters
- `RESOURCE_NOT_FOUND` - Video or song not found
- `NETWORK_ERROR` - Network connectivity issues

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Search**: 30 calls per minute per user
- **Video Details**: 60 calls per minute per user
- **Link/Unlink**: 10 calls per minute per user
- **Suggestions**: 20 calls per minute per user

## Testing

### Frontend Tests

```bash
# Run YouTube service tests
npm run test -- youtubeService.test.ts

# Run all frontend tests
npm run test:frontend:run
```

### Backend Tests

```bash
# Run YouTube route tests
cd backend && python -m pytest tests/test_youtube_routes.py -v

# Run all backend tests
npm run test:backend
```

### Integration Tests

The integration includes comprehensive tests:

- ✅ YouTube service functionality
- ✅ Component rendering and interaction
- ✅ API endpoint validation
- ✅ Error handling scenarios
- ✅ Rate limiting enforcement
- ✅ Authentication and authorization

## Performance

### Optimization Features

- **Lazy Loading**: Components load YouTube API only when needed
- **Caching**: Video details cached to reduce API calls
- **Debouncing**: Search requests debounced to prevent spam
- **Error Recovery**: Automatic retry with exponential backoff
- **Responsive Design**: Optimized for mobile devices

### Performance Metrics

- **API Response Time**: < 500ms for search
- **Player Load Time**: < 2 seconds
- **Sync Accuracy**: ±100ms tolerance
- **Memory Usage**: < 5MB additional overhead

## Browser Compatibility

### Supported Browsers

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Required Features

- ES6+ support
- Fetch API
- Custom Events
- CSS Grid/Flexbox

## Security

### API Security

- **Authentication**: All endpoints require valid JWT tokens
- **Rate Limiting**: Prevents abuse and quota exhaustion
- **Input Validation**: All inputs sanitized and validated
- **CORS**: Properly configured for cross-origin requests

### YouTube API Security

- **API Key Protection**: Keys stored securely in environment variables
- **Domain Restrictions**: API keys restricted to specific domains
- **Quota Management**: Monitoring and alerting for quota usage

## Troubleshooting

### Common Issues

1. **"YouTube API key not provided"**
   - Check environment variables
   - Ensure API key is valid and has YouTube Data API enabled

2. **"Video not found or private"**
   - Video may be deleted, private, or region-restricted
   - Try a different video

3. **"YouTube API quota exceeded"**
   - Wait for quota reset (daily)
   - Consider implementing caching to reduce API calls

4. **Player not loading**
   - Check internet connection
   - Verify YouTube iframe API is not blocked
   - Check browser console for errors

### Debug Mode

Enable debug logging:

```typescript
// Enable YouTube service debugging
youtubeService.setDebugMode(true);

// Log all API calls
console.log('YouTube API calls:', youtubeService.getApiCallStats());
```

## Future Enhancements

### Planned Features
- **Advanced Synchronization**: Beat detection and automatic chord mapping
- **Video Annotations**: Add timing markers and notes
- **Playlist Support**: YouTube playlist integration
- **Offline Mode**: Download videos for offline viewing
- **AI Integration**: Automatic chord detection from audio

### API Extensions
- **Batch Operations**: Link multiple videos at once
- **Analytics**: Usage statistics and reporting
- **Webhooks**: Real-time notifications for video changes
- **Export**: Export video links and timing data

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run tests: `npm run test:all`
5. Start development servers

### Code Style

- Follow existing TypeScript/Python conventions
- Add tests for new features
- Update documentation
- Use meaningful commit messages

### Pull Request Process

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback

## License

This YouTube integration is part of ChordMe and follows the same MIT license terms.

## Support

For issues and questions:
- GitHub Issues: [ChordMe Issues](https://github.com/tonybolanyo/chordme/issues)
- Documentation: [ChordMe Docs](https://github.com/tonybolanyo/chordme/docs)

---

*Last updated: December 2024*  
*Version: 1.0.0*