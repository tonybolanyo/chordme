// Tests for Apple Music service
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { appleMusicService } from './appleMusicService';

// Mock window.MusicKit
const mockMusicKitInstance = {
  isAuthorized: false,
  authorizationStatus: 'notDetermined',
  hasPlayback: false,
  canPlayCatalogContent: false,
  hasCloudLibraryEnabled: false,
  authorize: vi.fn(),
  unauthorize: vi.fn(),
  api: {
    v1: {
      search: vi.fn(),
      songs: vi.fn(),
      albums: vi.fn(),
      artists: vi.fn(),
      catalog: {
        recommendations: vi.fn(),
      },
      me: {
        library: {
          playlists: {
            create: vi.fn(),
          },
        },
      },
    },
  },
};

const mockMusicKit = {
  configure: vi.fn().mockResolvedValue(undefined),
  getInstance: vi.fn().mockReturnValue(mockMusicKitInstance),
};

// Mock global MusicKit
Object.defineProperty(window, 'MusicKit', {
  value: mockMusicKit,
  writable: true,
});

// Mock environment variables
vi.mock('../../../env', () => ({
  VITE_APPLE_MUSIC_DEVELOPER_TOKEN: 'test-developer-token',
  VITE_APP_VERSION: '1.0.0',
}));

describe('AppleMusicService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Reset service state
    (appleMusicService as unknown).isInitialized = false;
    (appleMusicService as unknown).musicKitInstance = null;
    
    // Reset mock instance state
    mockMusicKitInstance.isAuthorized = false;
    mockMusicKitInstance.authorizationStatus = 'notDetermined';
    mockMusicKitInstance.hasPlayback = false;
    mockMusicKitInstance.canPlayCatalogContent = false;
    mockMusicKitInstance.hasCloudLibraryEnabled = false;
  });

  describe('Configuration', () => {
    it('should be configured when developer token is available', () => {
      // Set environment variable
      (appleMusicService as unknown).config.developerToken = 'test-token';
      expect(appleMusicService.isConfigured()).toBe(true);
    });

    it('should not be configured when developer token is missing', () => {
      (appleMusicService as unknown).config.developerToken = '';
      expect(appleMusicService.isConfigured()).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should initialize MusicKit with correct configuration', async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      
      await appleMusicService.initialize();

      expect(mockMusicKit.configure).toHaveBeenCalledWith({
        developerToken: 'test-token',
        app: {
          name: 'ChordMe',
          build: '1.0.0',
        },
      });
      expect(mockMusicKit.getInstance).toHaveBeenCalled();
    });

    it('should throw error when not configured', async () => {
      (appleMusicService as unknown).config.developerToken = '';

      await expect(appleMusicService.initialize()).rejects.toThrow(
        'Apple Music developer token not configured'
      );
    });

    it('should handle MusicKit configuration failure', async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      mockMusicKit.configure.mockRejectedValue(new Error('MusicKit error'));

      await expect(appleMusicService.initialize()).rejects.toThrow(
        'Failed to initialize Apple Music integration'
      );
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      await appleMusicService.initialize();
    });

    it('should check authentication status', () => {
      mockMusicKitInstance.isAuthorized = true;
      expect(appleMusicService.isAuthenticated()).toBe(true);

      mockMusicKitInstance.isAuthorized = false;
      expect(appleMusicService.isAuthenticated()).toBe(false);
    });

    it('should get authorization status', () => {
      mockMusicKitInstance.authorizationStatus = 'authorized';
      expect(appleMusicService.getAuthorizationStatus()).toBe('authorized');

      mockMusicKitInstance.authorizationStatus = 'denied';
      expect(appleMusicService.getAuthorizationStatus()).toBe('denied');
    });

    it('should authorize user successfully', async () => {
      const mockUserToken = 'test-user-token';
      const mockUserInfo = { id: 'test-user', attributes: { handle: 'testuser' } };

      mockMusicKitInstance.authorize.mockResolvedValue(mockUserToken);
      mockMusicKitInstance.isAuthorized = true;
      mockMusicKitInstance.hasPlayback = true;
      mockMusicKitInstance.canPlayCatalogContent = true;
      mockMusicKitInstance.api.v1.me.mockResolvedValue(mockUserInfo);

      const result = await appleMusicService.authorize();

      expect(mockMusicKitInstance.authorize).toHaveBeenCalled();
      expect(result.tokens.musicUserToken).toBe(mockUserToken);
      expect(result.userInfo).toEqual(mockUserInfo);
      expect(result.subscriptionStatus.active).toBe(true);
    });

    it('should handle authorization failure', async () => {
      mockMusicKitInstance.authorize.mockRejectedValue(new Error('Auth failed'));

      await expect(appleMusicService.authorize()).rejects.toThrow(
        'Failed to authorize with Apple Music'
      );
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      await appleMusicService.initialize();
    });

    it('should search Apple Music catalog', async () => {
      const mockSearchResult = {
        results: {
          songs: {
            data: [
              {
                id: '123',
                type: 'songs',
                attributes: {
                  name: 'Test Song',
                  artistName: 'Test Artist',
                  albumName: 'Test Album',
                },
              },
            ],
          },
        },
      };

      mockMusicKitInstance.api.v1.search.mockResolvedValue(mockSearchResult);

      const params = {
        term: 'test song',
        types: ['songs'] as const,
        limit: 10,
      };

      const result = await appleMusicService.search(params);

      expect(mockMusicKitInstance.api.v1.search).toHaveBeenCalledWith({
        term: 'test song',
        types: 'songs',
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual(mockSearchResult);
    });

    it('should handle search with language parameter', async () => {
      const mockSearchResult = { results: {} };
      mockMusicKitInstance.api.v1.search.mockResolvedValue(mockSearchResult);

      const params = {
        term: 'test',
        types: ['songs'] as const,
        l: 'es',
      };

      await appleMusicService.search(params);

      expect(mockMusicKitInstance.api.v1.search).toHaveBeenCalledWith({
        term: 'test',
        types: 'songs',
        limit: 25,
        offset: 0,
        l: 'es',
      });
    });
  });

  describe('Track Operations', () => {
    beforeEach(async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      await appleMusicService.initialize();
    });

    it('should get track details', async () => {
      const mockTrack = {
        id: '123',
        type: 'songs',
        attributes: {
          name: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          durationInMillis: 180000,
        },
      };

      mockMusicKitInstance.api.v1.songs.mockResolvedValue({
        data: [mockTrack],
      });

      const result = await appleMusicService.getTrack('123');

      expect(mockMusicKitInstance.api.v1.songs).toHaveBeenCalledWith(['123']);
      expect(result).toEqual(mockTrack);
    });

    it('should handle track not found', async () => {
      mockMusicKitInstance.api.v1.songs.mockResolvedValue({
        data: [],
      });

      await expect(appleMusicService.getTrack('invalid')).rejects.toThrow('Track not found');
    });

    it('should convert track to platform format', () => {
      const appleMusicTrack = {
        id: '123',
        type: 'songs' as const,
        href: '/v1/catalog/us/songs/123',
        attributes: {
          name: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          durationInMillis: 180000,
          artwork: {
            url: 'https://example.com/{w}x{h}bb.jpg',
            width: 400,
            height: 400,
          },
          previews: [{ url: 'https://example.com/preview.m4a' }],
          url: 'https://music.apple.com/song/123',
          genreNames: ['Pop'],
        },
      };

      const result = appleMusicService.convertToPlatformTrack(appleMusicTrack);

      expect(result).toEqual({
        platform: 'apple-music',
        id: '123',
        name: 'Test Song',
        artistName: 'Test Artist',
        albumName: 'Test Album',
        durationMs: 180000,
        previewUrl: 'https://example.com/preview.m4a',
        externalUrl: 'https://music.apple.com/song/123',
        artwork: {
          url: 'https://example.com/400x400bb.jpg',
          width: 400,
          height: 400,
        },
        isrc: undefined,
      });
    });
  });

  describe('Playlist Operations', () => {
    beforeEach(async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      await appleMusicService.initialize();
      mockMusicKitInstance.isAuthorized = true;
    });

    it('should create playlist', async () => {
      const mockPlaylist = {
        id: 'pl123',
        type: 'playlists',
        attributes: {
          name: 'Test Playlist',
          description: { standard: 'Test Description' },
        },
      };

      mockMusicKitInstance.api.v1.me.library.playlists.create.mockResolvedValue({
        data: [mockPlaylist],
      });

      const result = await appleMusicService.createPlaylist(
        'Test Playlist',
        'Test Description',
        ['song1', 'song2']
      );

      expect(mockMusicKitInstance.api.v1.me.library.playlists.create).toHaveBeenCalledWith({
        attributes: {
          name: 'Test Playlist',
          description: { standard: 'Test Description' },
        },
        relationships: {
          tracks: {
            data: [
              { id: 'song1', type: 'songs' },
              { id: 'song2', type: 'songs' },
            ],
          },
        },
      });
      expect(result).toEqual(mockPlaylist);
    });

    it('should require authentication for playlist creation', async () => {
      mockMusicKitInstance.isAuthorized = false;

      await expect(appleMusicService.createPlaylist('Test')).rejects.toThrow(
        'User must be authenticated to create playlists'
      );
    });
  });

  describe('Preview Playback', () => {
    beforeEach(async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      await appleMusicService.initialize();
    });

    it('should handle track without preview', async () => {
      const track = {
        id: '123',
        type: 'songs' as const,
        href: '/v1/catalog/us/songs/123',
        attributes: {
          name: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          durationInMillis: 180000,
          artwork: {
            url: 'https://example.com/{w}x{h}bb.jpg',
            width: 400,
            height: 400,
          },
          genreNames: ['Pop'],
        },
      };

      await expect(appleMusicService.playPreview(track)).rejects.toThrow(
        'No preview available for this track'
      );
    });
  });

  describe('Token Management', () => {
    it('should store and retrieve tokens', () => {
      const tokens = {
        developerToken: 'dev-token',
        musicUserToken: 'user-token',
        userInfo: { id: 'user123' },
      };

      (appleMusicService as unknown).storeTokens(tokens);
      const stored = (appleMusicService as unknown).getStoredTokens();

      expect(stored).toEqual(tokens);
    });

    it('should handle invalid stored tokens', () => {
      localStorage.setItem('appleMusicTokens', 'invalid-json');
      const stored = (appleMusicService as unknown).getStoredTokens();
      expect(stored).toBeNull();
    });

    it('should clear stored data on sign out', async () => {
      localStorage.setItem('appleMusicTokens', JSON.stringify({ test: 'data' }));
      
      (appleMusicService as unknown).config.developerToken = 'test-token';
      await appleMusicService.initialize();
      mockMusicKitInstance.isAuthorized = true;

      await appleMusicService.signOut();

      expect(mockMusicKitInstance.unauthorize).toHaveBeenCalled();
      expect(localStorage.getItem('appleMusicTokens')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      (appleMusicService as unknown).config.developerToken = 'test-token';
      await appleMusicService.initialize();
    });

    it('should handle API errors gracefully', async () => {
      mockMusicKitInstance.api.v1.search.mockRejectedValue(new Error('API Error'));

      await expect(
        appleMusicService.search({ term: 'test', types: ['songs'] })
      ).rejects.toThrow('Failed to search Apple Music catalog');
    });

    it('should handle network errors', async () => {
      mockMusicKitInstance.api.v1.songs.mockRejectedValue(new Error('Network Error'));

      await expect(appleMusicService.getTrack('123')).rejects.toThrow(
        'Failed to get track details'
      );
    });
  });
});