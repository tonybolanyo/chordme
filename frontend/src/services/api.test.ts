import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiService } from './api';
import type { Song, LoginRequest, RegisterRequest } from '../types';

// Mock the jwt utility
vi.mock('../utils/jwt', () => ({
  isTokenExpired: vi.fn(),
}));

import { isTokenExpired } from '../utils/jwt';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window properties
Object.defineProperty(window, 'location', {
  value: { hash: '' },
  writable: true,
});

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-blob-url'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

describe('ApiService', () => {
  const mockIsTokenExpired = vi.mocked(isTokenExpired);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.hash = '';
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Token Handling', () => {
    it('includes Authorization header when token exists', async () => {
      const mockToken = 'test-token';
      localStorage.setItem('authToken', mockToken);
      mockIsTokenExpired.mockReturnValue(false);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });

      await apiService.getSongs();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/songs'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('does not include Authorization header when no token', async () => {
      localStorage.clear();
      mockIsTokenExpired.mockReturnValue(false);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });

      await apiService.getSongs();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/songs'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });

    it('clears expired token before request', async () => {
      const expiredToken = 'expired-token';
      const mockUser = { id: '1', email: 'test@example.com' };

      localStorage.setItem('authToken', expiredToken);
      localStorage.setItem('authUser', JSON.stringify(mockUser));
      mockIsTokenExpired.mockReturnValue(true);

      await expect(apiService.getSongs()).rejects.toThrow(
        'Your session has expired. Please log in again.'
      );

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('authUser')).toBeNull();
      expect(window.location.hash).toBe('login');
    });
  });

  describe('Error Handling', () => {
    it('handles 401 authentication errors', async () => {
      const mockToken = 'invalid-token';
      localStorage.setItem('authToken', mockToken);
      localStorage.setItem(
        'authUser',
        JSON.stringify({ id: '1', email: 'test@example.com' })
      );
      mockIsTokenExpired.mockReturnValue(false);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ error: 'Invalid token' }),
      });

      await expect(apiService.getSongs()).rejects.toThrow(
        'Authentication failed. Please log in again.'
      );

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('authUser')).toBeNull();
      expect(window.location.hash).toBe('login');
    });

    it('handles API errors with JSON error response', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: 'Validation failed' }),
      });

      await expect(apiService.getSongs()).rejects.toThrow('Validation failed');
    });

    it('handles API errors with non-JSON response', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error occurred',
      });

      await expect(apiService.getSongs()).rejects.toThrow(
        'API Error: Internal Server Error'
      );
    });

    it('handles network errors', async () => {
      mockIsTokenExpired.mockReturnValue(false);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.getSongs()).rejects.toThrow('Network error');
    });
  });

  describe('Song API Methods', () => {
    beforeEach(() => {
      mockIsTokenExpired.mockReturnValue(false);
    });

    it('getSongs calls correct endpoint', async () => {
      const mockResponse = { status: 'success', data: { songs: [] } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.getSongs();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/songs'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('getSong calls correct endpoint with ID', async () => {
      const songId = '123';
      const mockResponse = {
        status: 'success',
        data: { song: { id: songId, title: 'Test Song' } },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.getSong(songId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/songs/${songId}`),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    it('createSong sends POST request with song data', async () => {
      const songData: Partial<Song> = {
        title: 'New Song',
        content: '[C]Test content',
      };
      const mockResponse = {
        status: 'success',
        data: { song: { id: '123', ...songData } },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.createSong(songData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/songs'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(songData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('updateSong sends PUT request with song data', async () => {
      const songId = '123';
      const songData: Partial<Song> = {
        title: 'Updated Song',
        content: '[G]Updated content',
      };
      const mockResponse = {
        status: 'success',
        data: { song: { id: songId, ...songData } },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.updateSong(songId, songData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/songs/${songId}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(songData),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('deleteSong sends DELETE request', async () => {
      const songId = '123';
      const mockResponse = { status: 'success', message: 'Song deleted' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.deleteSong(songId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/songs/${songId}`),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Download Functionality', () => {
    beforeEach(() => {
      mockIsTokenExpired.mockReturnValue(false);
      // Mock DOM methods
      document.createElement = vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn(),
      })) as unknown as HTMLAnchorElement;
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });

    it('downloads song with correct filename from header', async () => {
      const songId = '123';
      const mockBlob = new Blob(['song content'], { type: 'text/plain' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => {
            if (name === 'Content-Disposition') {
              return 'attachment; filename="my-song.cho"';
            }
            return null;
          },
        },
        blob: async () => mockBlob,
      });

      await apiService.downloadSong(songId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/songs/${songId}/download`),
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('uses default filename when header missing', async () => {
      const songId = '123';
      const mockBlob = new Blob(['song content'], { type: 'text/plain' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null, // No Content-Disposition header
        },
        blob: async () => mockBlob,
      });

      await apiService.downloadSong(songId);

      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it('handles download errors', async () => {
      const songId = '123';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Song not found' }),
      });

      await expect(apiService.downloadSong(songId)).rejects.toThrow(
        'Song not found'
      );
    });

    it('handles expired token during download', async () => {
      const songId = '123';
      const expiredToken = 'expired-token';

      localStorage.setItem('authToken', expiredToken);
      mockIsTokenExpired.mockReturnValue(true);

      await expect(apiService.downloadSong(songId)).rejects.toThrow(
        'Your session has expired. Please log in again.'
      );

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(window.location.hash).toBe('login');
    });
  });

  describe('Authentication API Methods', () => {
    it('register sends POST request to register endpoint', async () => {
      const userData: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResponse = {
        status: 'success',
        data: {
          token: 'new-token',
          user: { id: '1', email: userData.email },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.register(userData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(userData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('login sends POST request to login endpoint', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResponse = {
        status: 'success',
        data: {
          token: 'auth-token',
          user: { id: '1', email: credentials.email },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.login(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles login errors', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ error: 'Invalid credentials' }),
      });

      await expect(apiService.login(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('handles registration errors', async () => {
      const userData: RegisterRequest = {
        email: 'existing@example.com',
        password: 'password123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: 'Email already exists' }),
      });

      await expect(apiService.register(userData)).rejects.toThrow(
        'Email already exists'
      );
    });
  });

  describe('Configuration', () => {
    it('uses environment variable for API base URL', () => {
      // The API base URL is set during module load, so we can't easily test this
      // but we can verify that fetch is called with the expected URL format
      mockIsTokenExpired.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });

      apiService.getSongs();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\/.*\/api\/v1\/songs$/),
        expect.any(Object)
      );
    });

    it('includes correct Content-Type header', async () => {
      mockIsTokenExpired.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });

      await apiService.getSongs();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty localStorage gracefully', async () => {
      localStorage.clear();
      mockIsTokenExpired.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });

      const result = await apiService.getSongs();
      expect(result).toEqual({ status: 'success', data: [] });
    });

    it('handles malformed JSON in error responses', async () => {
      mockIsTokenExpired.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Invalid JSON {',
      });

      await expect(apiService.getSongs()).rejects.toThrow(
        'API Error: Internal Server Error'
      );
    });

    it('handles missing error field in JSON response', async () => {
      mockIsTokenExpired.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ message: 'Some other field' }),
      });

      await expect(apiService.getSongs()).rejects.toThrow(
        'API Error: Bad Request'
      );
    });
  });
});
