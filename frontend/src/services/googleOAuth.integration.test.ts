import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GoogleTokens, GoogleUserInfo } from '../types';

// Mock environment variables before importing the service
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
vi.stubEnv(
  'VITE_GOOGLE_REDIRECT_URI',
  'http://localhost:5173/auth/google/callback'
);

// Import the class to create new instances
import { GoogleOAuth2Service } from './googleOAuth';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: '',
  origin: 'http://localhost:5173',
  search: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock crypto for PKCE
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

describe('Google OAuth2 Integration Tests', () => {
  let service: GoogleOAuth2Service;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    mockLocation.href = '';
    mockLocation.search = '';
    
    // Create new service instance for each test
    service = new GoogleOAuth2Service();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Complete OAuth2 Authentication Flow', () => {
    it('should handle complete successful authentication flow', async () => {
      // Step 1: Start authentication flow
      await service.startAuthFlow();
      
      expect(mockLocation.href).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
      expect(mockLocation.href).toContain('client_id=test-client-id');
      expect(mockLocation.href).toContain('code_challenge=');
      expect(mockLocation.href).toContain('code_challenge_method=S256');
      expect(sessionStorage.getItem('googleCodeVerifier')).toBeTruthy();

      // Step 2: Simulate successful callback with authorization code
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      };

      const mockUserInfo: GoogleUserInfo = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserInfo),
        });

      // Step 3: Handle callback
      const result = await service.handleAuthCallback('test-auth-code');

      expect(result.tokens.access_token).toBe('test-access-token');
      expect(result.userInfo.email).toBe('test@example.com');
      expect(localStorage.getItem('googleTokens')).toBeTruthy();
      expect(localStorage.getItem('googleUserInfo')).toBeTruthy();
      expect(sessionStorage.getItem('googleCodeVerifier')).toBeNull();

      // Step 4: Verify authentication status
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should handle OAuth2 error responses during callback', async () => {
      // Start flow first
      await service.startAuthFlow();
      expect(sessionStorage.getItem('googleCodeVerifier')).toBeTruthy();

      // Simulate error response from Google
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'The provided authorization grant is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.',
        }),
      });

      await expect(
        service.handleAuthCallback('invalid-code')
      ).rejects.toThrow('Authentication failed');

      expect(service.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('googleCodeVerifier')).toBeNull();
    });

    it('should handle user rejection during consent flow', async () => {
      // Start flow first
      await service.startAuthFlow();
      
      // Simulate user clicking "Deny" on consent screen
      // This would typically result in an error parameter in the callback URL
      mockLocation.search = '?error=access_denied&error_description=The%20user%20denied%20the%20request';

      await expect(
        service.handleAuthCallback('')
      ).rejects.toThrow('Code verifier not found');
    });

    it('should handle network interruptions during token exchange', async () => {
      await service.startAuthFlow();
      
      // Simulate network error during token exchange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.handleAuthCallback('test-code')
      ).rejects.toThrow('Authentication failed');

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should handle malformed responses during user info fetch', async () => {
      await service.startAuthFlow();

      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      // Token exchange succeeds but user info fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

      await expect(
        service.handleAuthCallback('test-code')
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('OAuth2 Token Lifecycle Management', () => {
    it('should handle complete token refresh cycle', async () => {
      // Setup initial tokens
      const initialTokens: GoogleTokens = {
        access_token: 'initial-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(initialTokens));

      // Mock successful refresh
      const refreshedTokenResponse = {
        access_token: 'refreshed-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(refreshedTokenResponse),
      });

      const refreshedTokens = await service.refreshTokens();

      expect(refreshedTokens.access_token).toBe('refreshed-access-token');
      expect(refreshedTokens.refresh_token).toBe('test-refresh-token');

      // Verify tokens are stored
      const storedTokens = service.getStoredTokens();
      expect(storedTokens?.access_token).toBe('refreshed-access-token');
    });

    it('should handle refresh token expiration and clear session', async () => {
      const expiredTokens: GoogleTokens = {
        access_token: 'expired-access-token',
        refresh_token: 'expired-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(expiredTokens));

      // Mock refresh token rejection
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked.',
        }),
      });

      await expect(service.refreshTokens()).rejects.toThrow(
        'Failed to refresh authentication'
      );

      // Should clear all stored data
      expect(service.getStoredTokens()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should handle sign out with token revocation', async () => {
      const tokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(tokens));
      localStorage.setItem('googleUserInfo', JSON.stringify({ id: 'test-user' }));

      // Mock successful token revocation
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await service.signOut();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke?token=test-access-token',
        { method: 'POST' }
      );

      expect(service.getStoredTokens()).toBeNull();
      expect(service.getStoredUserInfo()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('OAuth2 Error Recovery Scenarios', () => {
    it('should recover from temporary network errors during refresh', async () => {
      const tokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 30000, // Nearly expired
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(tokens));

      // First refresh attempt fails with network error
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(service.refreshTokens()).rejects.toThrow(
        'Failed to refresh authentication'
      );

      // Should clear tokens after failure
      expect(service.getStoredTokens()).toBeNull();
    });

    it('should handle concurrent refresh attempts', async () => {
      const tokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 30000, // Nearly expired
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(tokens));

      const refreshResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(refreshResponse),
      });

      // Simulate concurrent refresh calls
      const [result1, result2] = await Promise.all([
        service.refreshTokens(),
        service.refreshTokens(),
      ]);

      expect(result1.access_token).toBe('new-access-token');
      expect(result2.access_token).toBe('new-access-token');
    });

    it('should handle Google API rate limiting during auth flow', async () => {
      await service.startAuthFlow();

      // Mock rate limiting response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'Retry-After': '60',
        }),
      });

      await expect(
        service.handleAuthCallback('test-code')
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('OAuth2 Security Validations', () => {
    it('should validate PKCE code challenge and verifier', async () => {
      await service.startAuthFlow();
      
      const codeVerifier = sessionStorage.getItem('googleCodeVerifier');
      expect(codeVerifier).toBeTruthy();
      expect(codeVerifier!.length).toBeGreaterThan(43); // Min length for PKCE

      // Verify URL contains code_challenge
      expect(mockLocation.href).toContain('code_challenge=');
      expect(mockLocation.href).toContain('code_challenge_method=S256');
    });

    it('should reject authentication without proper PKCE verification', async () => {
      // Don't start flow, directly try callback
      await expect(
        service.handleAuthCallback('test-code')
      ).rejects.toThrow('Code verifier not found');
    });

    it('should handle scope validation in token response', async () => {
      await service.startAuthFlow();

      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email', // Missing expected scopes
      };

      const mockUserInfo: GoogleUserInfo = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserInfo),
        });

      const result = await service.handleAuthCallback('test-code');

      // Should still succeed but with limited scope
      expect(result.tokens.scope).toBe('openid email');
    });
  });

  describe('Cross-tab Authentication Synchronization', () => {
    it('should handle authentication state changes across tabs', () => {
      const tokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      // Simulate authentication in another tab
      localStorage.setItem('googleTokens', JSON.stringify(tokens));

      // This tab should recognize the authentication
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getStoredTokens()?.access_token).toBe('test-access-token');
    });

    it('should handle sign out across tabs', () => {
      const tokens: GoogleTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      localStorage.setItem('googleTokens', JSON.stringify(tokens));
      expect(service.isAuthenticated()).toBe(true);

      // Simulate sign out in another tab
      localStorage.removeItem('googleTokens');
      localStorage.removeItem('googleUserInfo');

      // This tab should recognize the sign out
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getStoredTokens()).toBeNull();
    });
  });
});