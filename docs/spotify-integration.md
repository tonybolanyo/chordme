# Spotify Integration for ChordMe

## Overview

The Spotify Web API integration enables ChordMe users to:

- **Authenticate with Spotify**: Secure OAuth2 authentication with PKCE
- **Search for Music**: Find tracks, artists, and albums from Spotify's catalog
- **Enrich Song Metadata**: Get detailed track information, album artwork, and audio features
- **Audio Analysis**: Access tempo, key signature, energy, danceability, and other musical attributes
- **Get Recommendations**: Personalized song suggestions based on musical preferences
- **Playlist Management**: Create and synchronize playlists between ChordMe and Spotify
- **Library Integration**: Access user's saved tracks and playlists

## Setup Requirements

### 1. Spotify App Registration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add redirect URIs:
   - Development: `http://localhost:5173/auth/spotify/callback`
   - Production: `https://yourdomain.com/auth/spotify/callback`
4. Note your **Client ID** and **Client Secret**

### 2. Environment Configuration

#### Frontend (.env.frontend)
```bash
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/auth/spotify/callback
```

#### Backend (.env.backend)
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

## Usage

### Frontend Integration

#### Basic Authentication
```typescript
import { SpotifyAuthButton } from '../components/SpotifyAuthButton';

function MyComponent() {
  const handleAuthSuccess = (profile) => {
    console.log('Spotify user:', profile);
  };

  const handleAuthError = (error) => {
    console.error('Spotify auth error:', error);
  };

  return (
    <SpotifyAuthButton 
      onAuthSuccess={handleAuthSuccess}
      onAuthError={handleAuthError}
    />
  );
}
```

#### Using the Spotify Service
```typescript
import { spotifyService } from '../services/spotifyService';

// Search for tracks
const searchResults = await spotifyService.search({
  query: 'Wonderwall Oasis',
  type: 'track',
  limit: 20
});

// Get track details
const track = await spotifyService.getTrack('track_id');

// Get audio features
const audioFeatures = await spotifyService.getAudioFeatures('track_id');

// Get recommendations
const recommendations = await spotifyService.getRecommendations({
  seed_tracks: ['track_id1', 'track_id2'],
  target_energy: 0.8,
  target_tempo: 120
});
```

### Backend API Usage

#### Search Tracks
```bash
POST /api/v1/spotify/search
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "query": "Wonderwall Oasis",
  "limit": 20,
  "offset": 0,
  "market": "US"
}
```

#### Get Track Details
```bash
GET /api/v1/spotify/track/{track_id}
Authorization: Bearer {jwt_token}
```

#### Get Audio Features
```bash
GET /api/v1/spotify/audio-features/{track_id}
Authorization: Bearer {jwt_token}
```

#### Get Recommendations
```bash
POST /api/v1/spotify/recommendations
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "seed_tracks": ["track_id1"],
  "seed_artists": ["artist_id1"],
  "limit": 20,
  "target_energy": 0.8,
  "target_tempo": 120
}
```

#### Link Spotify Metadata to Song
```bash
POST /api/v1/songs/{song_id}/spotify-metadata
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "spotify_track_id": "spotify_track_id",
  "auto_sync": true
}
```

## Rate Limits

To prevent API quota issues, the following rate limits are enforced:

- **Search**: 30 requests per minute per user
- **Track Details**: 60 requests per minute per user
- **Audio Features**: 60 requests per minute per user  
- **Recommendations**: 20 requests per minute per user
- **Metadata Linking**: 10 requests per minute per user

## Security Features

- **OAuth2 with PKCE**: Enhanced security for authorization code flow
- **Secure Token Storage**: Automatic token refresh and secure storage
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: All user inputs are sanitized and validated
- **CSRF Protection**: State parameter validation for OAuth flows
- **HTTPS Enforcement**: Secure transport for production environments

## Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Clear user messaging and re-authentication prompts
- **API Errors**: Graceful degradation and user-friendly error messages
- **Rate Limiting**: Automatic retry after cooldown period
- **Token Expiration**: Transparent token refresh

## Testing

### Frontend Tests
```bash
cd frontend
npm run test -- spotifyService.test.ts
npm run test -- SpotifyAuthButton.test.tsx
```

### Backend Tests
```bash
cd backend
python -m pytest tests/test_spotify_routes.py -v
```

## Troubleshooting

### Common Issues

1. **"Spotify integration is not configured"**
   - Ensure `VITE_SPOTIFY_CLIENT_ID` is set in frontend environment
   - Check that the Client ID is correct

2. **OAuth redirect errors**
   - Verify redirect URI matches exactly in Spotify app settings
   - Check for typos in the callback URL

3. **API authentication failures**
   - Ensure both `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set in backend
   - Verify credentials are correct in Spotify Developer Dashboard

4. **Rate limiting issues**
   - Check API usage in Spotify Developer Dashboard
   - Implement request queuing if needed for high-volume usage

### Development Tips

- Use Spotify's Web Playback SDK for additional features
- Monitor API quota usage in the Spotify Developer Dashboard
- Test with different market codes for regional content availability
- Cache audio features data to reduce API calls

## Privacy Considerations

When using Spotify integration:

- **User Consent**: Always inform users about Spotify data usage
- **Data Minimization**: Only request necessary scopes and data
- **Secure Storage**: Use secure, encrypted storage for user tokens
- **Data Retention**: Implement appropriate data retention policies
- **Privacy Policy**: Update privacy policy to include Spotify data usage

## Production Deployment

1. **Update Redirect URIs**: Add production domain to Spotify app settings
2. **Environment Variables**: Set production Spotify credentials
3. **HTTPS**: Ensure HTTPS is enabled for OAuth security
4. **Monitoring**: Set up monitoring for API usage and errors
5. **Backup**: Implement token backup and recovery procedures

## Support

For issues related to Spotify integration:

1. Check the [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
2. Review ChordMe integration logs for specific error messages
3. Contact ChordMe support with detailed error information
4. Check Spotify Developer Dashboard for API status and quota usage