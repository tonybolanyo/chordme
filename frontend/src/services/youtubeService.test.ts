/**
 * YouTube Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeService } from './youtubeService';
import { YouTubePlayerConfig, YouTubeSearchParams } from '../types/audio';

// Mock the global YT object
const mockYTPlayer = {
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  seekTo: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unMute: vi.fn(),
  getPlayerState: vi.fn(() => 1),
  getCurrentTime: vi.fn(() => 30),
  getDuration: vi.fn(() => 180),
  getVolume: vi.fn(() => 50),
  isMuted: vi.fn(() => false),
  destroy: vi.fn(),
  loadVideoById: vi.fn(),
};

const mockYT = {
  Player: vi.fn((containerId: string, config: unknown) => {
    // Simulate async player creation
    setTimeout(() => {
      config.events.onReady({ target: mockYTPlayer });
    }, 10);
    return mockYTPlayer;
  }),
};

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    id: '',
    src: '',
    async: false,
    defer: false,
    onerror: null,
  })),
});

Object.defineProperty(document, 'getElementById', {
  value: vi.fn(() => null),
});

Object.defineProperty(document.head, 'appendChild', {
  value: vi.fn(),
});

describe('YouTubeService', () => {
  let youtubeService: YouTubeService;

  beforeEach(() => {
    youtubeService = new YouTubeService();
    
    // Set up global YT mock
    (global as any).window = {
      YT: mockYT,
      onYouTubeIframeAPIReady: undefined,
      location: { origin: 'http://localhost:3000' },
      dispatchEvent: vi.fn(),
    };

    // Reset mocks
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    youtubeService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with API key', async () => {
      const apiKey = 'test-api-key';
      
      // Mock successful initialization
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);

      await youtubeService.initialize(apiKey);
      
      expect(youtubeService.isInitialized()).toBe(true);
    });

    it('should handle initialization timeout', async () => {
      const apiKey = 'test-api-key';
      
      // Don't call the ready callback to simulate timeout
      
      await expect(youtubeService.initialize(apiKey)).rejects.toThrow(
        'YouTube API failed to load within timeout'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      const apiKey = 'test-api-key';
      
      // Mock successful initialization
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);

      await youtubeService.initialize(apiKey);
      await youtubeService.initialize(apiKey); // Second call should resolve immediately
      
      expect(youtubeService.isInitialized()).toBe(true);
    });
  });

  describe('Player Management', () => {
    beforeEach(async () => {
      // Initialize service first
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);
      
      await youtubeService.initialize('test-api-key');
    });

    it('should create a player', async () => {
      const containerId = 'test-container';
      const config: YouTubePlayerConfig = {
        apiKey: 'test-api-key',
        autoplay: true,
        controls: 1,
      };

      const player = await youtubeService.createPlayer(containerId, config);
      
      expect(mockYT.Player).toHaveBeenCalledWith(
        containerId,
        expect.objectContaining({
          playerVars: expect.objectContaining({
            autoplay: 1,
            controls: 1,
          }),
        })
      );
      expect(player).toBe(mockYTPlayer);
    });

    it('should destroy a player', async () => {
      const containerId = 'test-container';
      const config: YouTubePlayerConfig = {
        apiKey: 'test-api-key',
      };

      await youtubeService.createPlayer(containerId, config);
      youtubeService.destroyPlayer(containerId);
      
      expect(mockYTPlayer.destroy).toHaveBeenCalled();
    });

    it('should handle player creation error', async () => {
      const containerId = 'test-container';
      const config: YouTubePlayerConfig = {
        apiKey: 'test-api-key',
      };

      // Mock player creation error
      mockYT.Player.mockImplementationOnce((containerId: string, config: unknown) => {
        setTimeout(() => {
          config.events.onError({ data: 100 });
        }, 10);
        return mockYTPlayer;
      });

      await expect(
        youtubeService.createPlayer(containerId, config)
      ).rejects.toThrow('YouTube player error: 100');
    });
  });

  describe('Video Search', () => {
    beforeEach(async () => {
      // Initialize service first
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);
      
      await youtubeService.initialize('test-api-key');
    });

    it('should search for videos', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { videoId: 'test-video-1' },
            snippet: {
              title: 'Test Video 1',
              description: 'Test description',
              channelTitle: 'Test Channel',
              thumbnails: {
                default: { url: 'thumb1.jpg', width: 120, height: 90 },
              },
              publishedAt: '2023-01-01T00:00:00Z',
            },
            contentDetails: {
              duration: 'PT3M30S',
            },
            statistics: {
              viewCount: '1000',
              likeCount: '50',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      });

      const searchParams: YouTubeSearchParams = {
        query: 'test song',
        maxResults: 10,
      };

      const results = await youtubeService.searchVideos(searchParams);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/youtube/v3/search')
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        videoId: 'test-video-1',
        title: 'Test Video 1',
        description: 'Test description',
        channelTitle: 'Test Channel',
        thumbnails: {
          default: { url: 'thumb1.jpg', width: 120, height: 90 },
        },
        publishedAt: '2023-01-01T00:00:00Z',
        duration: 'PT3M30S',
        viewCount: 1000,
        likeCount: 50,
      });
    });

    it('should handle search API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const searchParams: YouTubeSearchParams = {
        query: 'test song',
      };

      await expect(youtubeService.searchVideos(searchParams)).rejects.toThrow(
        'YouTube API error: 403 Forbidden'
      );
    });

    it('should handle API response errors', async () => {
      const mockErrorResponse = {
        error: {
          message: 'Quota exceeded',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse,
      });

      const searchParams: YouTubeSearchParams = {
        query: 'test song',
      };

      await expect(youtubeService.searchVideos(searchParams)).rejects.toThrow(
        'YouTube API error: Quota exceeded'
      );
    });

    it('should require API key for search', async () => {
      const uninitializedService = new YouTubeService();

      const searchParams: YouTubeSearchParams = {
        query: 'test song',
      };

      await expect(uninitializedService.searchVideos(searchParams)).rejects.toThrow(
        'YouTube API key not set'
      );
    });
  });

  describe('Video Details', () => {
    beforeEach(async () => {
      // Initialize service first
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);
      
      await youtubeService.initialize('test-api-key');
    });

    it('should get video details', async () => {
      const mockVideoResponse = {
        items: [
          {
            snippet: {
              title: 'Test Video',
              channelTitle: 'Test Channel',
              description: 'Test description',
              thumbnails: {
                default: { url: 'thumb.jpg', width: 120, height: 90 },
              },
              publishedAt: '2023-01-01T00:00:00Z',
              tags: ['music', 'test'],
              categoryId: '10',
            },
            contentDetails: {
              duration: 'PT3M30S',
            },
            statistics: {
              viewCount: '1000',
              likeCount: '50',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVideoResponse,
      });

      const videoDetails = await youtubeService.getVideoDetails('test-video-id');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/youtube/v3/videos')
      );
      expect(videoDetails).toEqual({
        videoId: 'test-video-id',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        description: 'Test description',
        thumbnails: {
          default: { url: 'thumb.jpg', width: 120, height: 90 },
        },
        publishedAt: '2023-01-01T00:00:00Z',
        duration: 'PT3M30S',
        viewCount: 1000,
        likeCount: 50,
        tags: ['music', 'test'],
        categoryId: '10',
      });
    });

    it('should handle video not found', async () => {
      const mockEmptyResponse = {
        items: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse,
      });

      await expect(youtubeService.getVideoDetails('invalid-video-id')).rejects.toThrow(
        'Video not found'
      );
    });
  });

  describe('Playback Controls', () => {
    let playerId: string;

    beforeEach(async () => {
      // Initialize service and create player
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);
      
      await youtubeService.initialize('test-api-key');
      
      playerId = 'test-player';
      await youtubeService.createPlayer(playerId, { apiKey: 'test-api-key' });
    });

    it('should control video playback', () => {
      youtubeService.playVideo(playerId);
      expect(mockYTPlayer.playVideo).toHaveBeenCalled();

      youtubeService.pauseVideo(playerId);
      expect(mockYTPlayer.pauseVideo).toHaveBeenCalled();
    });

    it('should control video seeking', () => {
      youtubeService.seekTo(playerId, 60);
      expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(60, true);
    });

    it('should control volume', () => {
      youtubeService.setVolume(playerId, 0.8);
      expect(mockYTPlayer.setVolume).toHaveBeenCalledWith(80);

      youtubeService.mute(playerId);
      expect(mockYTPlayer.mute).toHaveBeenCalled();

      youtubeService.unMute(playerId);
      expect(mockYTPlayer.unMute).toHaveBeenCalled();
    });

    it('should query player state', () => {
      const state = youtubeService.getPlayerState(playerId);
      expect(state).toBe(1);
      expect(mockYTPlayer.getPlayerState).toHaveBeenCalled();

      const currentTime = youtubeService.getCurrentTime(playerId);
      expect(currentTime).toBe(30);
      expect(mockYTPlayer.getCurrentTime).toHaveBeenCalled();

      const duration = youtubeService.getDuration(playerId);
      expect(duration).toBe(180);
      expect(mockYTPlayer.getDuration).toHaveBeenCalled();

      const volume = youtubeService.getVolume(playerId);
      expect(volume).toBe(0.5);
      expect(mockYTPlayer.getVolume).toHaveBeenCalled();

      const isMuted = youtubeService.isMuted(playerId);
      expect(isMuted).toBe(false);
      expect(mockYTPlayer.isMuted).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    let playerId: string;

    beforeEach(async () => {
      // Initialize service and create player
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);
      
      await youtubeService.initialize('test-api-key');
      
      playerId = 'test-player';
      await youtubeService.createPlayer(playerId, { apiKey: 'test-api-key' });
    });

    it('should add and remove event listeners', () => {
      const handler = vi.fn();
      
      youtubeService.addEventListener(playerId, 'stateChange', handler);
      youtubeService.removeEventListener(playerId, 'stateChange', handler);
      
      // No assertions needed, just testing that methods don't throw
    });
  });

  describe('Synchronization', () => {
    let playerId: string;

    beforeEach(async () => {
      // Initialize service and create player
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);
      
      await youtubeService.initialize('test-api-key');
      
      playerId = 'test-player';
      await youtubeService.createPlayer(playerId, { apiKey: 'test-api-key' });
    });

    it('should configure chord synchronization', () => {
      const syncConfig = {
        enabled: true,
        syncTolerance: 100,
        autoSync: true,
        syncMode: 'chord-based' as const,
        chordProgression: [
          {
            chordName: 'C',
            startTime: 0,
            endTime: 4,
          },
          {
            chordName: 'F',
            startTime: 4,
            endTime: 8,
          },
        ],
      };

      youtubeService.syncWithChords(playerId, syncConfig);
      
      // No assertions needed, just testing that method doesn't throw
    });

    it('should update sync mapping', () => {
      const mapping = [
        {
          chordName: 'G',
          startTime: 8,
          endTime: 12,
        },
      ];

      youtubeService.updateSyncMapping(playerId, mapping);
      
      // No assertions needed, just testing that method doesn't throw
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', async () => {
      // Initialize service and create player
      setTimeout(() => {
        if ((global as any).window.onYouTubeIframeAPIReady) {
          (global as any).window.onYouTubeIframeAPIReady();
        }
      }, 5);
      
      await youtubeService.initialize('test-api-key');
      
      const playerId = 'test-player';
      await youtubeService.createPlayer(playerId, { apiKey: 'test-api-key' });
      
      youtubeService.cleanup();
      
      expect(mockYTPlayer.destroy).toHaveBeenCalled();
      expect(youtubeService.isInitialized()).toBe(false);
    });
  });
});