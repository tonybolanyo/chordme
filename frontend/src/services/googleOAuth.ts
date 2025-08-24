// Google OAuth2 service for authentication and Drive access
import type {
  GoogleOAuth2Config,
  GoogleTokens,
  GoogleUserInfo,
  GoogleAuthResponse,
  DriveFile,
  DriveFileList,
} from '../types';

class GoogleOAuth2Service {
  private config: GoogleOAuth2Config;
  private codeVerifier: string | null = null;

  constructor() {
    this.config = {
      clientId: (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string) || '',
      redirectUri: (import.meta.env?.VITE_GOOGLE_REDIRECT_URI as string) || `${window.location.origin}/auth/google/callback`,
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
      ],
    };
  }

  /**
   * Generate a cryptographically secure random string for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate code challenge from verifier using SHA256
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Get stored Google tokens from localStorage
   */
  getStoredTokens(): GoogleTokens | null {
    const tokensJson = localStorage.getItem('googleTokens');
    if (!tokensJson) return null;

    try {
      const tokens: GoogleTokens = JSON.parse(tokensJson);
      
      // Check if tokens are expired
      if (Date.now() >= tokens.expires_at) {
        localStorage.removeItem('googleTokens');
        return null;
      }

      return tokens;
    } catch (error) {
      console.error('Error parsing stored Google tokens:', error);
      localStorage.removeItem('googleTokens');
      return null;
    }
  }

  /**
   * Store Google tokens securely in localStorage
   */
  private storeTokens(tokens: GoogleTokens): void {
    localStorage.setItem('googleTokens', JSON.stringify(tokens));
  }

  /**
   * Clear stored Google tokens
   */
  clearTokens(): void {
    localStorage.removeItem('googleTokens');
    localStorage.removeItem('googleUserInfo');
  }

  /**
   * Check if user is authenticated with Google
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return tokens !== null;
  }

  /**
   * Start Google OAuth2 authentication flow with PKCE
   */
  async startAuthFlow(): Promise<void> {
    if (!this.config.clientId) {
      throw new Error('Google Client ID not configured');
    }

    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

    // Store code verifier for later use
    sessionStorage.setItem('googleCodeVerifier', this.codeVerifier);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
      state: crypto.getRandomValues(new Uint32Array(1))[0].toString(),
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    
    // Redirect to Google for authentication
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth2 callback and exchange code for tokens
   */
  async handleAuthCallback(code: string): Promise<GoogleAuthResponse> {
    const codeVerifier = sessionStorage.getItem('googleCodeVerifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please restart the authentication flow.');
    }

    // Clear stored code verifier
    sessionStorage.removeItem('googleCodeVerifier');

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokenData = await tokenResponse.json();
      
      // Calculate absolute expiration time
      const tokens: GoogleTokens = {
        ...tokenData,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
      };

      // Get user info
      const userInfo = await this.getUserInfo(tokens.access_token);

      // Store tokens and user info
      this.storeTokens(tokens);
      localStorage.setItem('googleUserInfo', JSON.stringify(userInfo));

      return { tokens, userInfo };
    } catch (error) {
      console.error('Error handling auth callback:', error);
      throw new Error('Authentication failed. Please try again.');
    }
  }

  /**
   * Refresh expired access token using refresh token
   */
  async refreshTokens(): Promise<GoogleTokens> {
    const currentTokens = this.getStoredTokens();
    if (!currentTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          refresh_token: currentTokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh tokens');
      }

      const tokenData = await response.json();
      
      // Update tokens (preserve refresh_token if not provided)
      const newTokens: GoogleTokens = {
        ...tokenData,
        refresh_token: tokenData.refresh_token || currentTokens.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
      };

      this.storeTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      this.clearTokens();
      throw new Error('Failed to refresh authentication. Please sign in again.');
    }
  }

  /**
   * Make authenticated request to Google APIs with automatic token refresh
   */
  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    let tokens = this.getStoredTokens();
    
    if (!tokens) {
      throw new Error('Not authenticated with Google');
    }

    // Check if token needs refresh
    if (Date.now() >= tokens.expires_at - 60000) { // Refresh 1 minute before expiry
      tokens = await this.refreshTokens();
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    // If we get 401, try refreshing once more
    if (response.status === 401 && tokens.refresh_token) {
      try {
        tokens = await this.refreshTokens();
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        });
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        this.clearTokens();
        throw new Error('Authentication expired. Please sign in again.');
      }
    }

    return response;
  }

  /**
   * Get user information from Google
   */
  async getUserInfo(accessToken?: string): Promise<GoogleUserInfo> {
    const token = accessToken || this.getStoredTokens()?.access_token;
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user information');
    }

    return response.json();
  }

  /**
   * Get stored user information
   */
  getStoredUserInfo(): GoogleUserInfo | null {
    const userInfoJson = localStorage.getItem('googleUserInfo');
    if (!userInfoJson) return null;

    try {
      return JSON.parse(userInfoJson);
    } catch (error) {
      console.error('Error parsing stored user info:', error);
      localStorage.removeItem('googleUserInfo');
      return null;
    }
  }

  /**
   * List files in Google Drive
   */
  async listDriveFiles(options: {
    pageToken?: string;
    pageSize?: number;
    query?: string;
    orderBy?: string;
  } = {}): Promise<DriveFileList> {
    const params = new URLSearchParams({
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,parents),nextPageToken,incompleteSearch',
      pageSize: (options.pageSize || 10).toString(),
    });

    if (options.pageToken) params.set('pageToken', options.pageToken);
    if (options.query) params.set('q', options.query);
    if (options.orderBy) params.set('orderBy', options.orderBy);

    const response = await this.makeAuthenticatedRequest(
      `https://www.googleapis.com/drive/v3/files?${params}`
    );

    if (!response.ok) {
      throw new Error('Failed to list Drive files');
    }

    return response.json();
  }

  /**
   * Get file content from Google Drive
   */
  async getFileContent(fileId: string): Promise<string> {
    const response = await this.makeAuthenticatedRequest(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );

    if (!response.ok) {
      throw new Error('Failed to get file content');
    }

    return response.text();
  }

  /**
   * Create a new file in Google Drive
   */
  async createFile(
    name: string,
    content: string,
    mimeType: string = 'text/plain',
    parentId?: string
  ): Promise<DriveFile> {
    const metadata = {
      name,
      ...(parentId && { parents: [parentId] }),
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('media', new Blob([content], { type: mimeType }));

    const response = await this.makeAuthenticatedRequest(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,parents',
      {
        method: 'POST',
        body: form,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create file');
    }

    return response.json();
  }

  /**
   * Update file content in Google Drive
   */
  async updateFile(fileId: string, content: string, mimeType: string = 'text/plain'): Promise<DriveFile> {
    const response = await this.makeAuthenticatedRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime,size,webViewLink,parents`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': mimeType,
        },
        body: content,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update file');
    }

    return response.json();
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Revoke Google tokens and sign out
   */
  async signOut(): Promise<void> {
    const tokens = this.getStoredTokens();
    
    if (tokens?.access_token) {
      try {
        // Revoke the token
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error revoking token:', error);
      }
    }

    // Clear stored data
    this.clearTokens();
  }
}

export const googleOAuth2Service = new GoogleOAuth2Service();