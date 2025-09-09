// Spotify Web API service for authentication and music data access
import type {
  SpotifyOAuth2Config,
  SpotifyTokens,
  SpotifyUserProfile,
  SpotifyAuthResponse,
  SpotifySearchParams,
  SpotifySearchResult,
  SpotifyTrack,
  SpotifyAudioFeatures,
  SpotifyPlaylist,
  SpotifyRecommendationParams,
  SpotifyRecommendations,
} from '../types';

class SpotifyService {
  private config: SpotifyOAuth2Config;
  private codeVerifier: string | null = null;

  constructor() {
    this.config = {
      clientId: (import.meta.env?.VITE_SPOTIFY_CLIENT_ID as string) || '',
      redirectUri:
        (import.meta.env?.VITE_SPOTIFY_REDIRECT_URI as string) ||
        `${window.location.origin}/auth/spotify/callback`,
      scopes: [
        'user-read-private',
        'user-read-email',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-top-read',
        'user-read-recently-played',
      ],
    };
  }

  /**
   * Check if Spotify API is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.clientId);
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
   * Generate code challenge for PKCE
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Check if user is authenticated with Spotify
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return tokens !== null;
  }

  /**
   * Start Spotify OAuth2 authentication flow with PKCE
   */
  async startAuthFlow(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Spotify API not configured. Please set VITE_SPOTIFY_CLIENT_ID environment variable.');
    }

    try {
      this.codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
      const state = this.generateState();

      // Store code verifier and state in session storage for callback
      sessionStorage.setItem('spotifyCodeVerifier', this.codeVerifier);
      sessionStorage.setItem('spotifyState', state);

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        response_type: 'code',
        redirect_uri: this.config.redirectUri,
        scope: this.config.scopes.join(' '),
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        state: state,
      });

      const authUrl = `https://accounts.spotify.com/authorize?${params}`;

      // Redirect to Spotify for authentication
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting Spotify auth flow:', error);
      throw new Error('Failed to start authentication. Please try again.');
    }
  }

  /**
   * Handle OAuth2 callback and exchange code for tokens
   */
  async handleAuthCallback(code: string, state?: string): Promise<SpotifyAuthResponse> {
    const codeVerifier = sessionStorage.getItem('spotifyCodeVerifier');
    const storedState = sessionStorage.getItem('spotifyState');

    if (!codeVerifier) {
      throw new Error(
        'Code verifier not found. Please restart the authentication flow.'
      );
    }

    if (state && storedState && state !== storedState) {
      throw new Error('Invalid state parameter. Possible CSRF attack.');
    }

    // Clear stored code verifier and state
    sessionStorage.removeItem('spotifyCodeVerifier');
    sessionStorage.removeItem('spotifyState');

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        console.error('Token exchange failed:', errorData);
        throw new Error('Failed to exchange code for tokens');
      }

      const tokenData = await tokenResponse.json();

      // Calculate token expiration time
      const tokens: SpotifyTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
      };

      // Get user profile information
      const userProfile = await this.getUserProfile(tokens.access_token);

      // Store tokens and user info
      this.storeTokens(tokens);
      this.storeUserProfile(userProfile);

      return { tokens, userProfile };
    } catch (error) {
      console.error('Error handling auth callback:', error);
      this.clearStoredData();
      throw error;
    }
  }

  /**
   * Refresh expired access token using refresh token
   */
  async refreshTokens(): Promise<SpotifyTokens> {
    const currentTokens = this.getStoredTokens();
    if (!currentTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentTokens.refresh_token,
          client_id: this.config.clientId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh tokens');
      }

      const tokenData = await response.json();

      const newTokens: SpotifyTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || currentTokens.refresh_token,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
      };

      this.storeTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      this.clearStoredData();
      throw error;
    }
  }

  /**
   * Make authenticated request to Spotify API with automatic token refresh
   */
  private async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let tokens = this.getStoredTokens();
    if (!tokens) {
      throw new Error('Not authenticated');
    }

    // Check if token needs refresh (refresh 1 minute before expiry)
    if (tokens.expires_at && Date.now() >= tokens.expires_at - 60000) {
      try {
        tokens = await this.refreshTokens();
      } catch (error) {
        console.error('Token refresh failed:', error);
        throw new Error('Authentication expired. Please sign in again.');
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      throw new Error(`Rate limited. Retry after ${retryMs}ms`);
    }

    return response;
  }

  /**
   * Get user profile information from Spotify
   */
  async getUserProfile(accessToken?: string): Promise<SpotifyUserProfile> {
    const token = accessToken || this.getStoredTokens()?.access_token;
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    return await response.json();
  }

  /**
   * Search for tracks, artists, albums, or playlists
   */
  async search(params: SpotifySearchParams): Promise<SpotifySearchResult> {
    const searchParams = new URLSearchParams({
      q: params.query,
      type: params.type,
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
    });

    if (params.market) {
      searchParams.set('market', params.market);
    }

    const response = await this.makeAuthenticatedRequest(
      `https://api.spotify.com/v1/search?${searchParams}`
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    return await response.json();
  }

  /**
   * Get audio features for a track
   */
  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
    const response = await this.makeAuthenticatedRequest(
      `https://api.spotify.com/v1/audio-features/${trackId}`
    );

    if (!response.ok) {
      throw new Error('Failed to get audio features');
    }

    return await response.json();
  }

  /**
   * Get track by ID
   */
  async getTrack(trackId: string, market?: string): Promise<SpotifyTrack> {
    const url = new URL(`https://api.spotify.com/v1/tracks/${trackId}`);
    if (market) {
      url.searchParams.set('market', market);
    }

    const response = await this.makeAuthenticatedRequest(url.toString());

    if (!response.ok) {
      throw new Error('Failed to get track');
    }

    return await response.json();
  }

  /**
   * Get user's saved tracks
   */
  async getSavedTracks(limit: number = 20, offset: number = 0): Promise<{
    items: { added_at: string; track: SpotifyTrack }[];
    total: number;
    limit: number;
    offset: number;
    next?: string;
    previous?: string;
  }> {
    const searchParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this.makeAuthenticatedRequest(
      `https://api.spotify.com/v1/me/tracks?${searchParams}`
    );

    if (!response.ok) {
      throw new Error('Failed to get saved tracks');
    }

    return await response.json();
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(limit: number = 20, offset: number = 0): Promise<{
    items: SpotifyPlaylist[];
    total: number;
    limit: number;
    offset: number;
    next?: string;
    previous?: string;
  }> {
    const searchParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this.makeAuthenticatedRequest(
      `https://api.spotify.com/v1/me/playlists?${searchParams}`
    );

    if (!response.ok) {
      throw new Error('Failed to get playlists');
    }

    return await response.json();
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(
    userId: string,
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<SpotifyPlaylist> {
    const response = await this.makeAuthenticatedRequest(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          public: isPublic,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create playlist');
    }

    return await response.json();
  }

  /**
   * Add tracks to a playlist
   */
  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[]
  ): Promise<{ snapshot_id: string }> {
    const response = await this.makeAuthenticatedRequest(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: 'POST',
        body: JSON.stringify({
          uris: trackUris,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to add tracks to playlist');
    }

    return await response.json();
  }

  /**
   * Get recommendations based on seed data
   */
  async getRecommendations(params: SpotifyRecommendationParams): Promise<SpotifyRecommendations> {
    const searchParams = new URLSearchParams();

    if (params.seed_artists?.length) {
      searchParams.set('seed_artists', params.seed_artists.join(','));
    }
    if (params.seed_genres?.length) {
      searchParams.set('seed_genres', params.seed_genres.join(','));
    }
    if (params.seed_tracks?.length) {
      searchParams.set('seed_tracks', params.seed_tracks.join(','));
    }
    if (params.limit) {
      searchParams.set('limit', params.limit.toString());
    }

    // Add target audio features
    Object.entries(params).forEach(([key, value]) => {
      if (key.startsWith('target_') && value !== undefined) {
        searchParams.set(key, value.toString());
      }
    });

    const response = await this.makeAuthenticatedRequest(
      `https://api.spotify.com/v1/recommendations?${searchParams}`
    );

    if (!response.ok) {
      throw new Error('Failed to get recommendations');
    }

    return await response.json();
  }

  /**
   * Sign out and revoke tokens
   */
  async signOut(): Promise<void> {
    try {
      // Spotify doesn't have a token revocation endpoint in their Web API
      // We just clear local storage
      this.clearStoredData();
    } catch (error) {
      console.error('Error revoking token:', error);
      // Always clear stored data even if revocation fails
      this.clearStoredData();
    }
  }

  /**
   * Store tokens in localStorage
   */
  private storeTokens(tokens: SpotifyTokens): void {
    localStorage.setItem('spotifyTokens', JSON.stringify(tokens));
  }

  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): SpotifyTokens | null {
    try {
      const stored = localStorage.getItem('spotifyTokens');
      if (!stored) return null;

      const tokens = JSON.parse(stored) as SpotifyTokens;
      
      // Check if tokens are expired
      if (tokens.expires_at && Date.now() >= tokens.expires_at) {
        // Token expired, try to refresh if we have refresh token
        if (!tokens.refresh_token) {
          this.clearStoredData();
          return null;
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error parsing stored tokens:', error);
      this.clearStoredData();
      return null;
    }
  }

  /**
   * Store user profile in localStorage
   */
  private storeUserProfile(userProfile: SpotifyUserProfile): void {
    localStorage.setItem('spotifyUserProfile', JSON.stringify(userProfile));
  }

  /**
   * Get stored user profile from localStorage
   */
  getStoredUserProfile(): SpotifyUserProfile | null {
    try {
      const stored = localStorage.getItem('spotifyUserProfile');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error parsing stored user profile:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  private clearStoredData(): void {
    localStorage.removeItem('spotifyTokens');
    localStorage.removeItem('spotifyUserProfile');
    sessionStorage.removeItem('spotifyCodeVerifier');
    sessionStorage.removeItem('spotifyState');
  }
}

export { SpotifyService };
export const spotifyService = new SpotifyService();