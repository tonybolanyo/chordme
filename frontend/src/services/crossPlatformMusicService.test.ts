// Tests for Cross-Platform Music service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crossPlatformMusicService } from './crossPlatformMusicService';
import type { MusicPlatformTrack, CrossPlatformMatchRequest } from '../types';

// Mock the services
vi.mock('./spotifyService', () => ({
  spotifyService: {
    search: vi.fn(),
  },
}));

vi.mock('./appleMusicService', () => ({
  appleMusicService: {
    search: vi.fn(),
    convertToPlatformTrack: vi.fn(),
  },
}));

const { spotifyService } = await import('./spotifyService');
const { appleMusicService } = await import('./appleMusicService');

describe('CrossPlatformMusicService', () => {
  const mockSpotifyTrack: MusicPlatformTrack = {
    platform: 'spotify',
    id: 'spotify123',
    name: 'Test Song',
    artistName: 'Test Artist',
    albumName: 'Test Album',
    durationMs: 180000,
    isrc: 'USRC17607839',
    previewUrl: 'https://spotify.com/preview.mp3',
    externalUrl: 'https://open.spotify.com/track/123',
    artwork: {
      url: 'https://spotify.com/image.jpg',
      width: 640,
      height: 640,
    },
  };

  const mockAppleMusicTrack: MusicPlatformTrack = {
    platform: 'apple-music',
    id: 'apple123',
    name: 'Test Song',
    artistName: 'Test Artist',
    albumName: 'Test Album',
    durationMs: 181000, // Slightly different duration
    isrc: 'USRC17607839', // Same ISRC
    previewUrl: 'https://apple.com/preview.m4a',
    externalUrl: 'https://music.apple.com/song/123',
    artwork: {
      url: 'https://apple.com/image.jpg',
      width: 400,
      height: 400,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Track Matching', () => {
    it('should match tracks with identical ISRC', async () => {
      const request: CrossPlatformMatchRequest = {
        track: mockSpotifyTrack,
        targetPlatform: 'apple-music',
      };

      (appleMusicService.search as any).mockResolvedValue({
        results: {
          songs: {
            data: [
              {
                id: 'apple123',
                attributes: {
                  name: 'Test Song',
                  artistName: 'Test Artist',
                  albumName: 'Test Album',
                  durationInMillis: 181000,
                  isrc: 'USRC17607839',
                },
              },
            ],
          },
        },
      });

      (appleMusicService.convertToPlatformTrack as any).mockReturnValue(mockAppleMusicTrack);

      const result = await crossPlatformMusicService.matchTrack(request);

      expect(result.sourceTrack).toEqual(mockSpotifyTrack);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].track).toEqual(mockAppleMusicTrack);
      expect(result.matches[0].matchedBy).toContain('isrc');
      expect(result.bestMatch).toEqual(mockAppleMusicTrack);
    });

    it('should match tracks by title and artist similarity', async () => {
      const trackWithoutISRC = { ...mockSpotifyTrack, isrc: undefined };
      const appleMusicTrackWithoutISRC = { ...mockAppleMusicTrack, isrc: undefined };

      const request: CrossPlatformMatchRequest = {
        track: trackWithoutISRC,
        targetPlatform: 'apple-music',
      };

      (appleMusicService.search as any).mockResolvedValue({
        results: {
          songs: {
            data: [
              {
                id: 'apple123',
                attributes: {
                  name: 'Test Song',
                  artistName: 'Test Artist',
                  albumName: 'Test Album',
                  durationInMillis: 181000,
                },
              },
            ],
          },
        },
      });

      (appleMusicService.convertToPlatformTrack as any).mockReturnValue(appleMusicTrackWithoutISRC);

      const result = await crossPlatformMusicService.matchTrack(request);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchedBy).toContain('title');
      expect(result.matches[0].matchedBy).toContain('artist');
      expect(result.matches[0].confidence).toBeGreaterThan(0.5);
    });

    it('should filter out low confidence matches', async () => {
      const request: CrossPlatformMatchRequest = {
        track: mockSpotifyTrack,
        targetPlatform: 'apple-music',
      };

      const poorMatch: MusicPlatformTrack = {
        platform: 'apple-music',
        id: 'poor123',
        name: 'Completely Different Song',
        artistName: 'Different Artist',
        albumName: 'Different Album',
        durationMs: 120000,
      };

      (appleMusicService.search as any).mockResolvedValue({
        results: {
          songs: {
            data: [
              {
                id: 'poor123',
                attributes: {
                  name: 'Completely Different Song',
                  artistName: 'Different Artist',
                  albumName: 'Different Album',
                  durationInMillis: 120000,
                },
              },
            ],
          },
        },
      });

      (appleMusicService.convertToPlatformTrack as any).mockReturnValue(poorMatch);

      const result = await crossPlatformMusicService.matchTrack(request);

      expect(result.matches).toHaveLength(0);
      expect(result.bestMatch).toBeUndefined();
    });

    it('should handle custom match criteria', async () => {
      const request: CrossPlatformMatchRequest = {
        track: mockSpotifyTrack,
        targetPlatform: 'apple-music',
        matchCriteria: {
          requireISRC: true,
          titleSimilarityThreshold: 0.9,
          artistSimilarityThreshold: 0.9,
          durationToleranceMs: 2000,
        },
      };

      const trackWithoutISRC = { ...mockAppleMusicTrack, isrc: undefined };

      (appleMusicService.search as any).mockResolvedValue({
        results: {
          songs: {
            data: [
              {
                id: 'apple123',
                attributes: {
                  name: 'Test Song',
                  artistName: 'Test Artist',
                  albumName: 'Test Album',
                  durationInMillis: 181000,
                },
              },
            ],
          },
        },
      });

      (appleMusicService.convertToPlatformTrack as any).mockReturnValue(trackWithoutISRC);

      const result = await crossPlatformMusicService.matchTrack(request);

      // Should have no matches because ISRC is required but missing
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('Search Query Building', () => {
    it('should build comprehensive search query', async () => {
      const request: CrossPlatformMatchRequest = {
        track: mockSpotifyTrack,
        targetPlatform: 'apple-music',
      };

      (appleMusicService.search as any).mockResolvedValue({ results: { songs: { data: [] } } });

      await crossPlatformMusicService.matchTrack(request);

      expect(appleMusicService.search).toHaveBeenCalledWith({
        term: 'track:"Test Song" artist:"Test Artist" album:"Test Album"',
        types: ['songs'],
        limit: 20,
      });
    });

    it('should handle track without album name', async () => {
      const trackWithoutAlbum = { ...mockSpotifyTrack, albumName: '' };
      const request: CrossPlatformMatchRequest = {
        track: trackWithoutAlbum,
        targetPlatform: 'apple-music',
      };

      (appleMusicService.search as any).mockResolvedValue({ results: { songs: { data: [] } } });

      await crossPlatformMusicService.matchTrack(request);

      expect(appleMusicService.search).toHaveBeenCalledWith({
        term: 'track:"Test Song" artist:"Test Artist"',
        types: ['songs'],
        limit: 20,
      });
    });
  });

  describe('String Similarity', () => {
    it('should calculate string similarity correctly', () => {
      const service = crossPlatformMusicService as any;

      // Identical strings
      expect(service.calculateStringSimilarity('test', 'test')).toBe(1);

      // Different strings
      expect(service.calculateStringSimilarity('test', 'different')).toBeLessThan(0.5);

      // Similar strings
      const similarity = service.calculateStringSimilarity('test song', 'test song title');
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1);

      // Empty strings
      expect(service.calculateStringSimilarity('', '')).toBe(1);
      expect(service.calculateStringSimilarity('test', '')).toBe(0);
    });

    it('should normalize strings for comparison', () => {
      const service = crossPlatformMusicService as any;

      expect(service.normalizeString('Test Song!')).toBe('test song');
      expect(service.normalizeString('  Multiple   Spaces  ')).toBe('multiple spaces');
      expect(service.normalizeString('Special-Characters@#$')).toBe('specialcharacters');
    });
  });

  describe('Platform Conversion', () => {
    it('should convert Spotify track to platform format', () => {
      const service = crossPlatformMusicService as any;
      const spotifyTrack = {
        id: '123',
        name: 'Test Song',
        artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }],
        album: {
          name: 'Test Album',
          images: [{ url: 'https://example.com/image.jpg', width: 640, height: 640 }],
        },
        duration_ms: 180000,
        preview_url: 'https://example.com/preview.mp3',
        external_urls: { spotify: 'https://open.spotify.com/track/123' },
      };

      const result = service.convertSpotifyTrack(spotifyTrack);

      expect(result).toEqual({
        platform: 'spotify',
        id: '123',
        name: 'Test Song',
        artistName: 'Artist 1, Artist 2',
        albumName: 'Test Album',
        durationMs: 180000,
        previewUrl: 'https://example.com/preview.mp3',
        externalUrl: 'https://open.spotify.com/track/123',
        artwork: {
          url: 'https://example.com/image.jpg',
          width: 640,
          height: 640,
        },
      });
    });
  });

  describe('Unified Metadata', () => {
    it('should create unified metadata from both platforms', async () => {
      const spotifyTrack = {
        id: '123',
        name: 'Test Song',
        artists: [{ name: 'Test Artist' }],
        album: {
          name: 'Test Album',
          release_date: '2023-01-01',
          images: [{ url: 'https://spotify.com/image.jpg', width: 640, height: 640 }],
        },
        duration_ms: 180000,
        preview_url: 'https://spotify.com/preview.mp3',
        external_urls: { spotify: 'https://open.spotify.com/track/123' },
        external_ids: { isrc: 'USRC17607839' },
      };

      const appleMusicTrack = {
        id: 'apple123',
        type: 'songs' as const,
        attributes: {
          name: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          durationInMillis: 180000,
          releaseDate: '2023-01-01',
          genreNames: ['Pop', 'Rock'],
          isrc: 'USRC17607839',
          artwork: {
            url: 'https://apple.com/{w}x{h}bb.jpg',
            width: 400,
            height: 400,
          },
          previews: [{ url: 'https://apple.com/preview.m4a' }],
          url: 'https://music.apple.com/song/apple123',
        },
      };

      const result = await crossPlatformMusicService.createUnifiedMetadata(
        spotifyTrack as any,
        appleMusicTrack
      );

      expect(result.platforms.spotify).toEqual(spotifyTrack);
      expect(result.platforms.appleMusic).toEqual(appleMusicTrack);
      expect(result.normalized.title).toBe('Test Song');
      expect(result.normalized.artists).toEqual(['Test Artist']);
      expect(result.normalized.album).toBe('Test Album');
      expect(result.normalized.durationMs).toBe(180000);
      expect(result.normalized.genres).toEqual(['Pop', 'Rock']);
      expect(result.normalized.isrc).toBe('USRC17607839');
      expect(result.normalized.previewUrls.spotify).toBe('https://spotify.com/preview.mp3');
      expect(result.normalized.previewUrls.appleMusic).toBe('https://apple.com/preview.m4a');
    });

    it('should prefer Apple Music artwork', async () => {
      const spotifyTrack = {
        id: '123',
        name: 'Test Song',
        artists: [{ name: 'Test Artist' }],
        album: {
          name: 'Test Album',
          images: [{ url: 'https://spotify.com/image.jpg', width: 640, height: 640 }],
        },
        duration_ms: 180000,
      };

      const appleMusicTrack = {
        id: 'apple123',
        type: 'songs' as const,
        attributes: {
          name: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          durationInMillis: 180000,
          genreNames: [],
          artwork: {
            url: 'https://apple.com/{w}x{h}bb.jpg',
            width: 1000,
            height: 1000,
          },
        },
      };

      const result = await crossPlatformMusicService.createUnifiedMetadata(
        spotifyTrack as any,
        appleMusicTrack
      );

      expect(result.normalized.artwork).toEqual({
        url: 'https://apple.com/400x400bb.jpg',
        width: 1000,
        height: 1000,
      });
    });
  });

  describe('Batch Matching', () => {
    it('should process multiple tracks in batches', async () => {
      const tracks = [mockSpotifyTrack, { ...mockSpotifyTrack, id: 'spotify456' }];

      (appleMusicService.search as any).mockResolvedValue({
        results: { songs: { data: [] } },
      });

      const results = await crossPlatformMusicService.batchMatchTracks(
        tracks,
        'apple-music'
      );

      expect(results).toHaveLength(2);
      expect(appleMusicService.search).toHaveBeenCalledTimes(2);
    });

    it('should handle failed matches in batch', async () => {
      const tracks = [mockSpotifyTrack];

      (appleMusicService.search as any).mockRejectedValue(new Error('Search failed'));

      const results = await crossPlatformMusicService.batchMatchTracks(
        tracks,
        'apple-music'
      );

      expect(results).toHaveLength(1);
      expect(results[0].sourceTrack).toEqual(mockSpotifyTrack);
      expect(results[0].matches).toHaveLength(0);
      expect(results[0].bestMatch).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle search failures gracefully', async () => {
      const request: CrossPlatformMatchRequest = {
        track: mockSpotifyTrack,
        targetPlatform: 'apple-music',
      };

      (appleMusicService.search as any).mockRejectedValue(new Error('API Error'));

      await expect(crossPlatformMusicService.matchTrack(request)).rejects.toThrow(
        'Failed to match track on apple-music'
      );
    });

    it('should require at least one platform track for unified metadata', async () => {
      await expect(
        crossPlatformMusicService.createUnifiedMetadata()
      ).rejects.toThrow('At least one platform track must be provided');
    });
  });
});