import { describe, it, expect, vi, beforeEach } from 'vitest';
import { versionHistoryService, SongVersion } from './versionHistory';

// Mock the API service
vi.mock('./api', () => ({
  apiService: {
    request: vi.fn(),
  },
}));

// Skip all tests as version history is not yet implemented
describe.skip('VersionHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVersions: SongVersion[] = [
    {
      id: 1,
      song_id: 123,
      version_number: 2,
      title: 'Updated Song',
      content: 'Updated content',
      user_id: 1,
      created_at: '2024-01-15T10:30:00Z',
    },
    {
      id: 2,
      song_id: 123,
      version_number: 1,
      title: 'Original Song',
      content: 'Original content',
      user_id: 1,
      created_at: '2024-01-15T09:00:00Z',
    },
  ];

  describe('getVersions', () => {
    it('should fetch versions successfully', async () => {
      const { apiService } = await import('./api');
      const mockRequest = vi.mocked(apiService.request);

      mockRequest.mockResolvedValue({
        status: 'success',
        message: 'Versions retrieved',
        data: { versions: mockVersions },
      });

      const result = await versionHistoryService.getVersions(123);

      expect(result).toEqual(mockVersions);
      expect(mockRequest).toHaveBeenCalledWith({
        endpoint: '/songs/123/versions',
        method: 'GET',
      });
    });

    it('should handle API errors', async () => {
      const { apiService } = await import('./api');
      const mockRequest = vi.mocked(apiService.request);

      mockRequest.mockResolvedValue({
        status: 'error',
        message: 'Song not found',
        data: { versions: [] },
      });

      await expect(versionHistoryService.getVersions(123)).rejects.toThrow(
        'Song not found'
      );
    });

    it('should handle API errors without message', async () => {
      const { apiService } = await import('./api');
      const mockRequest = vi.mocked(apiService.request);

      mockRequest.mockResolvedValue({
        status: 'error',
        message: '',
        data: { versions: [] },
      });

      await expect(versionHistoryService.getVersions(123)).rejects.toThrow(
        'Failed to fetch version history'
      );
    });
  });

  describe('getVersion', () => {
    it('should fetch a specific version successfully', async () => {
      const { apiService } = await import('./api');
      const mockRequest = vi.mocked(apiService.request);
      const mockVersion = mockVersions[0];

      mockRequest.mockResolvedValue({
        status: 'success',
        message: 'Version retrieved',
        data: mockVersion,
      });

      const result = await versionHistoryService.getVersion(123, 1);

      expect(result).toEqual(mockVersion);
      expect(mockRequest).toHaveBeenCalledWith({
        endpoint: '/songs/123/versions/1',
        method: 'GET',
      });
    });

    it('should handle version not found', async () => {
      const { apiService } = await import('./api');
      const mockRequest = vi.mocked(apiService.request);

      mockRequest.mockResolvedValue({
        status: 'error',
        message: 'Version not found',
        data: mockVersions[0],
      });

      await expect(versionHistoryService.getVersion(123, 999)).rejects.toThrow(
        'Version not found'
      );
    });
  });

  describe('restoreVersion', () => {
    it('should restore version successfully', async () => {
      const { apiService } = await import('./api');
      const mockRequest = vi.mocked(apiService.request);

      mockRequest.mockResolvedValue({
        status: 'success',
        message: 'Version restored',
        data: {
          id: 123,
          title: 'Restored Song',
          content: 'Restored content',
          author_id: 1,
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T11:00:00Z',
        },
      });

      await expect(
        versionHistoryService.restoreVersion(123, 1)
      ).resolves.not.toThrow();

      expect(mockRequest).toHaveBeenCalledWith({
        endpoint: '/songs/123/restore/1',
        method: 'POST',
      });
    });

    it('should handle restore errors', async () => {
      const { apiService } = await import('./api');
      const mockRequest = vi.mocked(apiService.request);

      mockRequest.mockResolvedValue({
        status: 'error',
        message: 'Insufficient permissions',
        data: {
          id: 123,
          title: 'Song',
          content: 'Content',
          author_id: 1,
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T11:00:00Z',
        },
      });

      await expect(
        versionHistoryService.restoreVersion(123, 1)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('formatVersionForDisplay', () => {
    it('should format version for display correctly', () => {
      const version = mockVersions[0];
      const display = versionHistoryService.formatVersionForDisplay(version);

      expect(display.title).toBe('Version 2');
      expect(display.subtitle).toBe('Updated Song');
      expect(display.content).toBe('Updated content');
      expect(display.timestamp).toMatch(/ago|Just now|[0-9]/); // Should contain relative time
    });
  });

  describe('formatRelativeTime', () => {
    // Test the private method indirectly through formatVersionForDisplay
    it('should format relative time correctly', () => {
      const now = new Date();

      // Test "Just now"
      const recentVersion: SongVersion = {
        ...mockVersions[0],
        created_at: now.toISOString(),
      };
      const recentDisplay =
        versionHistoryService.formatVersionForDisplay(recentVersion);
      expect(recentDisplay.timestamp).toBe('Just now');

      // Test minutes ago
      const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      const minutesVersion: SongVersion = {
        ...mockVersions[0],
        created_at: minutesAgo.toISOString(),
      };
      const minutesDisplay =
        versionHistoryService.formatVersionForDisplay(minutesVersion);
      expect(minutesDisplay.timestamp).toBe('5 minutes ago');

      // Test hours ago
      const hoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const hoursVersion: SongVersion = {
        ...mockVersions[0],
        created_at: hoursAgo.toISOString(),
      };
      const hoursDisplay =
        versionHistoryService.formatVersionForDisplay(hoursVersion);
      expect(hoursDisplay.timestamp).toBe('2 hours ago');

      // Test days ago
      const daysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const daysVersion: SongVersion = {
        ...mockVersions[0],
        created_at: daysAgo.toISOString(),
      };
      const daysDisplay =
        versionHistoryService.formatVersionForDisplay(daysVersion);
      expect(daysDisplay.timestamp).toBe('3 days ago');

      // Test weeks ago (should show date)
      const weeksAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const weeksVersion: SongVersion = {
        ...mockVersions[0],
        created_at: weeksAgo.toISOString(),
      };
      const weeksDisplay =
        versionHistoryService.formatVersionForDisplay(weeksVersion);
      expect(weeksDisplay.timestamp).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should be a date format
    });

    it('should handle singular vs plural correctly', () => {
      const now = new Date();

      // Test 1 minute ago (singular)
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      const oneMinuteVersion: SongVersion = {
        ...mockVersions[0],
        created_at: oneMinuteAgo.toISOString(),
      };
      const oneMinuteDisplay =
        versionHistoryService.formatVersionForDisplay(oneMinuteVersion);
      expect(oneMinuteDisplay.timestamp).toBe('1 minute ago');

      // Test 1 hour ago (singular)
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const oneHourVersion: SongVersion = {
        ...mockVersions[0],
        created_at: oneHourAgo.toISOString(),
      };
      const oneHourDisplay =
        versionHistoryService.formatVersionForDisplay(oneHourVersion);
      expect(oneHourDisplay.timestamp).toBe('1 hour ago');

      // Test 1 day ago (singular)
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      const oneDayVersion: SongVersion = {
        ...mockVersions[0],
        created_at: oneDayAgo.toISOString(),
      };
      const oneDayDisplay =
        versionHistoryService.formatVersionForDisplay(oneDayVersion);
      expect(oneDayDisplay.timestamp).toBe('1 day ago');
    });
  });
});
