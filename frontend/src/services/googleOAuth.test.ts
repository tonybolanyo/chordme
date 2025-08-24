import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GoogleTokens, GoogleUserInfo } from '../types';
import { googleOAuth2Service } from './googleOAuth';

// Mock environment variables
vi.mock('import.meta.env', () => ({
  default: {
    VITE_GOOGLE_CLIENT_ID: 'test-client-id',
    VITE_GOOGLE_REDIRECT_URI: 'http://localhost:5173/auth/google/callback',
  }
}));

// Mock crypto.getRandomValues
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
  },
  writable: true,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GoogleOAuth2Service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Token Management', () => {
    it('should return null when no tokens are stored', () => {
      const tokens = googleOAuth2Service.getStoredTokens();
      expect(tokens).toBeNull();
    });

    it('should store and retrieve valid tokens', () => {
      const mockTokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(mockTokens));
      const retrievedTokens = googleOAuth2Service.getStoredTokens();
      
      expect(retrievedTokens).toEqual(mockTokens);
    });

    it('should return null and clear expired tokens', () => {
      const expiredTokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() - 1000, // Expired 1 second ago
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(expiredTokens));
      const retrievedTokens = googleOAuth2Service.getStoredTokens();
      
      expect(retrievedTokens).toBeNull();
      expect(localStorage.getItem('googleTokens')).toBeNull();
    });

    it('should handle malformed token data', () => {
      localStorage.setItem('googleTokens', 'invalid-json');
      const tokens = googleOAuth2Service.getStoredTokens();
      
      expect(tokens).toBeNull();
      expect(localStorage.getItem('googleTokens')).toBeNull();
    });

    it('should clear tokens and user info', () => {
      localStorage.setItem('googleTokens', JSON.stringify({ test: 'data' }));
      localStorage.setItem('googleUserInfo', JSON.stringify({ test: 'user' }));
      
      googleOAuth2Service.clearTokens();
      
      expect(localStorage.getItem('googleTokens')).toBeNull();
      expect(localStorage.getItem('googleUserInfo')).toBeNull();
    });
  });

  describe('Authentication Status', () => {
    it('should return false when not authenticated', () => {
      expect(googleOAuth2Service.isAuthenticated()).toBe(false);
    });

    it('should return true when valid tokens exist', () => {
      const validTokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(validTokens));
      expect(googleOAuth2Service.isAuthenticated()).toBe(true);
    });

    it('should return false when tokens are expired', () => {
      const expiredTokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() - 1000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(expiredTokens));
      expect(googleOAuth2Service.isAuthenticated()).toBe(false);
    });
  });

  describe('OAuth2 Flow', () => {
    it('should throw error when client ID is not configured', async () => {
      // Create a new service instance with empty client ID
      const GoogleOAuth2ServiceClass = (await import('./googleOAuth')).googleOAuth2Service.constructor as new () => typeof googleOAuth2Service;
      const service = new GoogleOAuth2ServiceClass();
      // Override the config for this test
      (service as unknown as { config: { clientId: string } }).config.clientId = '';
      
      await expect(service.startAuthFlow()).rejects.toThrow('Google Client ID not configured');
    });

    it('should start auth flow and redirect to Google', async () => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: '', origin: 'http://localhost:5173' },
        writable: true,
      });

      await googleOAuth2Service.startAuthFlow();

      expect(window.location.href).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
      expect(window.location.href).toContain('client_id=test-client-id');
      expect(window.location.href).toContain('code_challenge=');
      expect(window.location.href).toContain('code_challenge_method=S256');
      expect(sessionStorage.getItem('googleCodeVerifier')).toBeTruthy();
    });

    it('should handle auth callback successfully', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      const mockUserInfo: GoogleUserInfo = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
      };

      sessionStorage.setItem('googleCodeVerifier', 'test-verifier');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserInfo),
        });

      const result = await googleOAuth2Service.handleAuthCallback('test-auth-code');

      expect(result.tokens.access_token).toBe('test-access-token');
      expect(result.userInfo.email).toBe('test@example.com');
      expect(localStorage.getItem('googleTokens')).toBeTruthy();
      expect(localStorage.getItem('googleUserInfo')).toBeTruthy();
      expect(sessionStorage.getItem('googleCodeVerifier')).toBeNull();
    });

    it('should throw error when code verifier is missing', async () => {
      await expect(googleOAuth2Service.handleAuthCallback('test-code')).rejects.toThrow(
        'Code verifier not found'
      );
    });

    it('should handle token exchange failure', async () => {
      sessionStorage.setItem('googleCodeVerifier', 'test-verifier');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(googleOAuth2Service.handleAuthCallback('test-code')).rejects.toThrow(
        'Authentication failed'
      );
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens successfully', async () => {
      const currentTokens: GoogleTokens = {
        access_token: 'old-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      const newTokenResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(currentTokens));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTokenResponse),
      });

      const refreshedTokens = await googleOAuth2Service.refreshTokens();

      expect(refreshedTokens.access_token).toBe('new-access-token');
      expect(refreshedTokens.refresh_token).toBe('test-refresh-token'); // Should preserve old refresh token
    });

    it('should throw error when no refresh token available', async () => {
      await expect(googleOAuth2Service.refreshTokens()).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('should handle refresh failure and clear tokens', async () => {
      const currentTokens: GoogleTokens = {
        access_token: 'old-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(currentTokens));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(googleOAuth2Service.refreshTokens()).rejects.toThrow(
        'Failed to refresh authentication'
      );

      expect(localStorage.getItem('googleTokens')).toBeNull();
    });
  });

  describe('User Info', () => {
    it('should get user info with access token', async () => {
      const mockUserInfo: GoogleUserInfo = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      });

      const userInfo = await googleOAuth2Service.getUserInfo('test-access-token');

      expect(userInfo).toEqual(mockUserInfo);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-access-token',
          },
        })
      );
    });

    it('should get stored user info', () => {
      const mockUserInfo: GoogleUserInfo = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };

      localStorage.setItem('googleUserInfo', JSON.stringify(mockUserInfo));

      const userInfo = googleOAuth2Service.getStoredUserInfo();
      expect(userInfo).toEqual(mockUserInfo);
    });

    it('should return null when no stored user info', () => {
      const userInfo = googleOAuth2Service.getStoredUserInfo();
      expect(userInfo).toBeNull();
    });

    it('should handle malformed stored user info', () => {
      localStorage.setItem('googleUserInfo', 'invalid-json');
      const userInfo = googleOAuth2Service.getStoredUserInfo();
      
      expect(userInfo).toBeNull();
      expect(localStorage.getItem('googleUserInfo')).toBeNull();
    });
  });

  describe('Sign Out', () => {
    it('should revoke tokens and clear stored data', async () => {
      const mockTokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(mockTokens));
      localStorage.setItem('googleUserInfo', JSON.stringify({ test: 'user' }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await googleOAuth2Service.signOut();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke?token=test-access-token',
        { method: 'POST' }
      );
      expect(localStorage.getItem('googleTokens')).toBeNull();
      expect(localStorage.getItem('googleUserInfo')).toBeNull();
    });

    it('should clear data even if revoke fails', async () => {
      const mockTokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(mockTokens));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await googleOAuth2Service.signOut();

      expect(localStorage.getItem('googleTokens')).toBeNull();
    });
  });
});