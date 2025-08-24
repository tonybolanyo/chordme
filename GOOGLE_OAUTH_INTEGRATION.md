# Google OAuth2 Integration for ChordMe

This document describes the Google OAuth2 integration implemented in ChordMe for accessing Google Drive files.

## Overview

The Google OAuth2 integration allows users to:
- Authenticate with their Google accounts
- Access their Google Drive files
- Import ChordPro files directly from Google Drive
- Securely manage OAuth2 tokens with automatic refresh

## Security Features

### OAuth2 with PKCE
- Uses PKCE (Proof Key for Code Exchange) for enhanced security
- Generates cryptographically secure code verifiers and challenges
- Protects against authorization code interception attacks

### Secure Token Management
- Tokens are stored securely in localStorage with expiration timestamps
- Automatic token refresh before expiration (1 minute buffer)
- Secure token revocation on sign out
- Handles expired tokens gracefully

### Best Practices Implementation
- Uses state parameter for CSRF protection
- Implements proper error handling for all OAuth flows
- Validates tokens before use
- Clears sensitive data on errors

## Components

### GoogleAuthButton
A React component that handles Google authentication:
- Displays sign-in button when not authenticated
- Shows user info and sign-out button when authenticated
- Handles loading states and error messaging
- Responsive design with Google branding

### GoogleDriveFileList
A React component for browsing Google Drive files:
- Lists files with filtering by MIME type
- Supports pagination for large file collections
- Displays file metadata (name, size, modified date)
- Handles file selection for import

## Services

### GoogleOAuth2Service
Main service class for OAuth2 operations:

#### Configuration
```typescript
interface GoogleOAuth2Config {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}
```

#### Key Methods
- `startAuthFlow()`: Initiates OAuth2 authentication with PKCE
- `handleAuthCallback(code)`: Exchanges authorization code for tokens
- `refreshTokens()`: Refreshes expired access tokens
- `listDriveFiles(options)`: Lists files from Google Drive
- `getFileContent(fileId)`: Downloads file content
- `createFile(name, content)`: Creates new file in Drive
- `updateFile(fileId, content)`: Updates existing file
- `deleteFile(fileId)`: Deletes file from Drive
- `signOut()`: Revokes tokens and clears stored data

## Configuration

### Environment Variables
Set these in your `.env` file:

```bash
# Google OAuth2 Client ID (required)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# OAuth2 Redirect URI (optional, defaults to current origin + /auth/google/callback)
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

### Google Cloud Console Setup
1. Create a project in Google Cloud Console
2. Enable Google Drive API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URIs:
   - `http://localhost:5173/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)
5. Configure OAuth consent screen
6. Add required scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`

## Usage

### Basic Authentication
```typescript
import { GoogleAuthButton } from './components/GoogleAuth';

function MyComponent() {
  const handleAuthSuccess = (userInfo) => {
    console.log('User authenticated:', userInfo);
  };

  const handleAuthError = (error) => {
    console.error('Auth error:', error);
  };

  return (
    <GoogleAuthButton
      onAuthSuccess={handleAuthSuccess}
      onAuthError={handleAuthError}
    />
  );
}
```

### Drive File Access
```typescript
import { googleOAuth2Service } from './services/googleOAuth';

// List files
const files = await googleOAuth2Service.listDriveFiles({
  query: "mimeType='text/plain'",
  pageSize: 10
});

// Get file content
const content = await googleOAuth2Service.getFileContent(fileId);

// Create new file
const newFile = await googleOAuth2Service.createFile(
  'My Song.cho',
  '{title: My Song}\n[C]Hello [G]world',
  'text/plain'
);
```

### Error Handling
```typescript
try {
  await googleOAuth2Service.startAuthFlow();
} catch (error) {
  if (error.message === 'Google Client ID not configured') {
    // Handle configuration error
  } else {
    // Handle other errors
  }
}
```

## Integration Points

### Login Page
The Google Auth button is integrated into the login page as an optional feature:
- Users can sign in with their ChordMe account normally
- Additionally connect Google Drive for enhanced functionality
- Google authentication is supplementary, not a replacement

### Home Page
Google Drive integration appears on the home page when authenticated:
- Browse Google Drive files button
- File selection for importing ChordPro files
- Automatic content parsing and form population

### Routing
Added OAuth callback route to handle Google redirects:
- Route: `/auth/google/callback`
- Handles authorization code exchange
- Displays success/error states
- Redirects back to application

## Security Considerations

### Token Storage
- Access tokens stored in localStorage with expiration
- Refresh tokens handled securely
- Automatic cleanup on errors or sign out

### CORS and CSP
- OAuth flows use proper CORS headers
- CSP policies allow Google OAuth domains
- No sensitive data exposed in client-side code

### Error Handling
- Comprehensive error messaging without exposing internals
- Graceful degradation when OAuth is unavailable
- Proper cleanup of partial authentication states

## Testing

### Unit Tests
- Complete test coverage for GoogleOAuth2Service
- Component tests for GoogleAuthButton
- Mock implementations for testing environments

### Test Environment Setup
```typescript
// Mock Google OAuth service
vi.mock('./services/googleOAuth', () => ({
  googleOAuth2Service: {
    isAuthenticated: vi.fn(() => false),
    startAuthFlow: vi.fn(),
    // ... other methods
  }
}));
```

## Deployment Considerations

### Production Setup
- Use HTTPS for all OAuth redirects
- Configure proper CORS policies
- Set production redirect URIs in Google Console
- Monitor OAuth usage and quotas

### Environment Configuration
- Keep client ID in environment variables
- Use different client IDs for different environments
- Configure appropriate redirect URIs per environment

## Troubleshooting

### Common Issues
1. **"Google Client ID not configured"**
   - Set `VITE_GOOGLE_CLIENT_ID` environment variable

2. **"Invalid redirect URI"**
   - Ensure redirect URI matches Google Console configuration
   - Check for trailing slashes and protocol mismatches

3. **"Authentication failed"**
   - Check OAuth consent screen configuration
   - Verify required scopes are enabled

4. **Token refresh failures**
   - Check if refresh token is properly stored
   - Verify token hasn't been revoked

### Debug Mode
Enable debug logging:
```typescript
// Add to development environment
console.log('OAuth Config:', googleOAuth2Service.config);
```

## Future Enhancements

Potential improvements for the OAuth2 integration:
- Support for team/shared drives
- Batch file operations
- Real-time sync with Drive changes
- Offline access capabilities
- Integration with other Google services

## Compliance

The implementation follows:
- OAuth 2.0 RFC 6749 specification
- PKCE RFC 7636 for enhanced security
- Google's OAuth 2.0 best practices
- GDPR considerations for user data