// Tests for real-time single song hook
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeSong } from './useRealtimeSong';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    supportsRealTimeUpdates: vi.fn(),
    subscribeToSong: vi.fn(),
    getSong: vi.fn(),
  },
}));

import { apiService } from '../services/api';

const mockApiService = vi.mocked(apiService);

describe('useRealtimeSong', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use real-time updates when supported', async () => {
    const mockSong = {
      id: '1',
      title: 'Test Song',
      author_id: 'user1',
      content: 'test content',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    const mockUnsubscribe = vi.fn();
    mockApiService.supportsRealTimeUpdates.mockReturnValue(true);
    mockApiService.subscribeToSong.mockImplementation((songId, callback) => {
      // Simulate real-time callback
      setTimeout(() => callback(mockSong), 0);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useRealtimeSong('1'));

    // Initial state - isRealTime will be set immediately when supportsRealTimeUpdates returns true
    expect(result.current.loading).toBe(true);
    expect(result.current.song).toBe(null);
    expect(result.current.isRealTime).toBe(true); // Changed from false to true

    // Wait for real-time data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.song).toEqual(mockSong);
    expect(result.current.isRealTime).toBe(true);
    expect(result.current.error).toBe(null);
    expect(mockApiService.subscribeToSong).toHaveBeenCalledWith(
      '1',
      expect.any(Function)
    );
  });

  it('should fall back to API when real-time not supported', async () => {
    const mockSong = {
      id: '1',
      title: 'Test Song',
      author_id: 'user1',
      content: 'test content',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    mockApiService.supportsRealTimeUpdates.mockReturnValue(false);
    mockApiService.getSong.mockResolvedValue({
      status: 'success',
      data: { song: mockSong },
    });

    const { result } = renderHook(() => useRealtimeSong('1'));

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.song).toBe(null);
    expect(result.current.isRealTime).toBe(false);

    // Wait for API data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.song).toEqual(mockSong);
    expect(result.current.isRealTime).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockApiService.getSong).toHaveBeenCalledWith('1');
  });

  it('should handle null songId', async () => {
    const { result } = renderHook(() => useRealtimeSong(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.song).toBe(null);
    expect(result.current.error).toBe(null);
    expect(mockApiService.subscribeToSong).not.toHaveBeenCalled();
    expect(mockApiService.getSong).not.toHaveBeenCalled();
  });

  it('should handle song not found in real-time', async () => {
    const mockUnsubscribe = vi.fn();
    mockApiService.supportsRealTimeUpdates.mockReturnValue(true);
    mockApiService.subscribeToSong.mockImplementation((songId, callback) => {
      // Simulate song not found
      setTimeout(() => callback(null), 0);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useRealtimeSong('nonexistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.song).toBe(null);
    expect(result.current.isRealTime).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors in fallback mode', async () => {
    mockApiService.supportsRealTimeUpdates.mockReturnValue(false);
    mockApiService.getSong.mockRejectedValue(new Error('Song not found'));

    const { result } = renderHook(() => useRealtimeSong('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.song).toBe(null);
    expect(result.current.isRealTime).toBe(false);
    expect(result.current.error).toBe('Song not found');
  });

  it('should cleanup subscription on unmount', () => {
    const mockUnsubscribe = vi.fn();
    mockApiService.supportsRealTimeUpdates.mockReturnValue(true);
    mockApiService.subscribeToSong.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useRealtimeSong('1'));

    expect(mockApiService.subscribeToSong).toHaveBeenCalledWith(
      '1',
      expect.any(Function)
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });

  it('should provide refetch functionality', async () => {
    const mockSong = {
      id: '1',
      title: 'Test Song',
      author_id: 'user1',
      content: 'test content',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    mockApiService.supportsRealTimeUpdates.mockReturnValue(false);
    mockApiService.getSong.mockResolvedValue({
      status: 'success',
      data: { song: mockSong },
    });

    const { result } = renderHook(() => useRealtimeSong('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock to test refetch
    mockApiService.getSong.mockClear();

    // Test refetch
    await result.current.refetch();

    expect(mockApiService.getSong).toHaveBeenCalledWith('1');
  });
});
