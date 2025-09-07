import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spotifyService } from './spotifyService';
import type { SpotifyTokens, SpotifyUserProfile } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.subtle for PKCE code generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
  },
});

// Mock btoa
global.btoa = vi.fn((str: string) => Buffer.from(str).toString('base64'));

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_SPOTIFY_CLIENT_ID: 'test-client-id',
    VITE_SPOTIFY_REDIRECT_URI: 'http://localhost:3000/auth/spotify/callback',
  },
}));

describe('SpotifyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset location mock
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Configuration', () => {
    it('should be configured with client ID', () => {
      expect(spotifyService.isConfigured()).toBe(true);
    });

    it('should not be configured without client ID', () => {
      // Test with missing env var by mocking a new instance
      vi.doMock('import.meta', () => ({
        env: {},
      }));
      
      const unconfiguredService = new (require('./spotifyService').default)();
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe('Authentication Status', () => {
    it('should return false when not authenticated', () => {
      expect(spotifyService.isAuthenticated()).toBe(false);
    });

    it('should return true when authenticated with valid tokens', () => {
      const tokens: SpotifyTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };

      localStorage.setItem('spotifyTokens', JSON.stringify(tokens));
      expect(spotifyService.isAuthenticated()).toBe(true);
    });

    it('should return false with expired tokens and no refresh token', () => {
      const tokens: SpotifyTokens = {
        access_token: 'test-access-token',
        expires_in: 3600,
        expires_at: Date.now() - 1000, // Expired
        token_type: 'Bearer',
        scope: 'user-read-private',
      };

      localStorage.setItem('spotifyTokens', JSON.stringify(tokens));
      expect(spotifyService.isAuthenticated()).toBe(false);
    });
  });

  describe('OAuth2 Flow', () => {
    it('should start auth flow with PKCE', async () => {
      await spotifyService.startAuthFlow();

      expect(sessionStorage.getItem('spotifyCodeVerifier')).toBeTruthy();
      expect(sessionStorage.getItem('spotifyState')).toBeTruthy();
      expect(window.location.href).toContain('accounts.spotify.com/authorize');
      expect(window.location.href).toContain('code_challenge_method=S256');
      expect(window.location.href).toContain('client_id=test-client-id');
    });

    it('should throw error when not configured', async () => {
      const unconfiguredService = new (require('./spotifyService').default)();
      
      await expect(unconfiguredService.startAuthFlow()).rejects.toThrow(
        'Spotify API not configured'
      );
    });

    it('should handle auth callback successfully', async () => {
      // Set up stored data
      sessionStorage.setItem('spotifyCodeVerifier', 'test-verifier');
      sessionStorage.setItem('spotifyState', 'test-state');

      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };

      const mockUserProfile: SpotifyUserProfile = {
        id: 'test-user',
        display_name: 'Test User',
        email: 'test@example.com',
      };

      // Mock token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      // Mock user profile request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserProfile),
      });

      const result = await spotifyService.handleAuthCallback('test-code', 'test-state');

      expect(result.tokens.access_token).toBe('test-access-token');
      expect(result.userProfile.id).toBe('test-user');
      expect(localStorage.getItem('spotifyTokens')).toBeTruthy();
      expect(localStorage.getItem('spotifyUserProfile')).toBeTruthy();
    });

    it('should handle token exchange failure', async () => {
      sessionStorage.setItem('spotifyCodeVerifier', 'test-verifier');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      });

      await expect(
        spotifyService.handleAuthCallback('invalid-code')
      ).rejects.toThrow('Failed to exchange code for tokens');
    });

    it('should validate state parameter', async () => {
      sessionStorage.setItem('spotifyCodeVerifier', 'test-verifier');
      sessionStorage.setItem('spotifyState', 'correct-state');

      await expect(
        spotifyService.handleAuthCallback('test-code', 'wrong-state')
      ).rejects.toThrow('Invalid state parameter');
    });
  });

  describe('Token Management', () => {
    it('should refresh tokens successfully', async () => {
      const currentTokens: SpotifyTokens = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 1000,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };

      localStorage.setItem('spotifyTokens', JSON.stringify(currentTokens));

      const newTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTokenResponse),
      });

      const newTokens = await spotifyService.refreshTokens();

      expect(newTokens.access_token).toBe('new-access-token');
      expect(JSON.parse(localStorage.getItem('spotifyTokens')!).access_token).toBe('new-access-token');
    });

    it('should handle refresh failure', async () => {
      const currentTokens: SpotifyTokens = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 1000,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };

      localStorage.setItem('spotifyTokens', JSON.stringify(currentTokens));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      });

      await expect(spotifyService.refreshTokens()).rejects.toThrow('Failed to refresh tokens');
      expect(localStorage.getItem('spotifyTokens')).toBeNull();
    });
  });

  describe('API Requests', () => {
    beforeEach(() => {
      const validTokens: SpotifyTokens = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };
      localStorage.setItem('spotifyTokens', JSON.stringify(validTokens));
    });

    it('should search for tracks', async () => {
      const mockSearchResult = {
        tracks: {
          items: [
            {
              id: 'track1',
              name: 'Test Song',
              artists: [{ id: 'artist1', name: 'Test Artist' }],
              album: { id: 'album1', name: 'Test Album' },
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResult),
      });

      const result = await spotifyService.search({
        query: 'test song',
        type: 'track',
        limit: 20,
      });

      expect(result.tracks?.items).toHaveLength(1);
      expect(result.tracks?.items[0].name).toBe('Test Song');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.spotify.com/v1/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });

    it('should get audio features for a track', async () => {
      const mockAudioFeatures = {
        id: 'track1',
        danceability: 0.8,
        energy: 0.9,
        key: 1,
        tempo: 120.0,
        valence: 0.7,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAudioFeatures),
      });

      const result = await spotifyService.getAudioFeatures('track1');

      expect(result.danceability).toBe(0.8);
      expect(result.tempo).toBe(120.0);
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '30']]),
      });

      await expect(
        spotifyService.search({ query: 'test', type: 'track' })
      ).rejects.toThrow('Rate limited');
    });

    it('should get user playlists', async () => {
      const mockPlaylists = {
        items: [
          {
            id: 'playlist1',
            name: 'My Playlist',
            description: 'Test playlist',
            public: false,
            tracks: { total: 10 },
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlaylists),
      });

      const result = await spotifyService.getUserPlaylists();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('My Playlist');
    });

    it('should create a playlist', async () => {
      const mockCreatedPlaylist = {
        id: 'new-playlist',
        name: 'New Playlist',
        description: 'Test description',
        public: false,
        tracks: { total: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreatedPlaylist),
      });

      const result = await spotifyService.createPlaylist(
        'user123',
        'New Playlist',
        'Test description',
        false
      );

      expect(result.name).toBe('New Playlist');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/users/user123/playlists',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'New Playlist',
            description: 'Test description',
            public: false,
          }),
        })
      );
    });

    it('should get recommendations', async () => {
      const mockRecommendations = {
        tracks: [
          {
            id: 'rec-track1',
            name: 'Recommended Song',
            artists: [{ id: 'artist1', name: 'Artist' }],
          },
        ],
        seeds: [
          {
            initialPoolSize: 100,
            afterFilteringSize: 50,
            afterRelinkingSize: 25,
            id: 'artist1',
            type: 'artist',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRecommendations),
      });

      const result = await spotifyService.getRecommendations({
        seed_artists: ['artist1'],
        limit: 10,
        target_energy: 0.8,
      });

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].name).toBe('Recommended Song');
    });
  });

  describe('User Profile', () => {
    it('should get user profile', async () => {
      const mockProfile: SpotifyUserProfile = {
        id: 'user123',
        display_name: 'Test User',
        email: 'test@example.com',
        images: [{ url: 'https://example.com/avatar.jpg' }],
        followers: { total: 10 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const result = await spotifyService.getUserProfile('test-token');

      expect(result.id).toBe('user123');
      expect(result.display_name).toBe('Test User');
    });

    it('should get stored user profile', () => {
      const mockProfile: SpotifyUserProfile = {
        id: 'user123',
        display_name: 'Test User',
        email: 'test@example.com',
      };

      localStorage.setItem('spotifyUserProfile', JSON.stringify(mockProfile));

      const result = spotifyService.getStoredUserProfile();

      expect(result?.id).toBe('user123');
      expect(result?.display_name).toBe('Test User');
    });
  });

  describe('Sign Out', () => {
    it('should clear stored data on sign out', async () => {
      // Set up stored data
      localStorage.setItem('spotifyTokens', 'test-tokens');
      localStorage.setItem('spotifyUserProfile', 'test-profile');
      sessionStorage.setItem('spotifyCodeVerifier', 'test-verifier');

      await spotifyService.signOut();

      expect(localStorage.getItem('spotifyTokens')).toBeNull();
      expect(localStorage.getItem('spotifyUserProfile')).toBeNull();
      expect(sessionStorage.getItem('spotifyCodeVerifier')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const validTokens: SpotifyTokens = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'user-read-private',
      };
      localStorage.setItem('spotifyTokens', JSON.stringify(validTokens));
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request' }),
      });

      await expect(
        spotifyService.search({ query: 'test', type: 'track' })
      ).rejects.toThrow('Search failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        spotifyService.search({ query: 'test', type: 'track' })
      ).rejects.toThrow('Network error');
    });

    it('should handle corrupted stored data', () => {
      localStorage.setItem('spotifyTokens', 'invalid-json');
      
      expect(spotifyService.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('spotifyTokens')).toBeNull();
    });
  });
});