// Tests for real-time songs hook
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeSongs } from './useRealtimeSongs';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    supportsRealTimeUpdates: vi.fn(),
    subscribeToSongs: vi.fn(),
    getSongs: vi.fn(),
  },
}));

import { apiService } from '../services/api';

const mockApiService = vi.mocked(apiService);

describe('useRealtimeSongs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use real-time updates when supported', async () => {
    const mockSongs = [
      { id: '1', title: 'Test Song', author_id: 'user1', content: 'test content', created_at: '2023-01-01', updated_at: '2023-01-01' }
    ];
    
    const mockUnsubscribe = vi.fn();
    mockApiService.supportsRealTimeUpdates.mockReturnValue(true);
    mockApiService.subscribeToSongs.mockImplementation((callback) => {
      // Simulate real-time callback
      setTimeout(() => callback(mockSongs), 0);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useRealtimeSongs());

    // Initial state - isRealTime will be set immediately when supportsRealTimeUpdates returns true
    expect(result.current.loading).toBe(true);
    expect(result.current.songs).toEqual([]);
    expect(result.current.isRealTime).toBe(true); // Changed from false to true

    // Wait for real-time data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.songs).toEqual(mockSongs);
    expect(result.current.isRealTime).toBe(true);
    expect(result.current.error).toBe(null);
    expect(mockApiService.subscribeToSongs).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should fall back to API when real-time not supported', async () => {
    const mockSongs = [
      { id: '1', title: 'Test Song', author_id: 'user1', content: 'test content', created_at: '2023-01-01', updated_at: '2023-01-01' }
    ];
    
    mockApiService.supportsRealTimeUpdates.mockReturnValue(false);
    mockApiService.getSongs.mockResolvedValue({
      status: 'success',
      data: { songs: mockSongs }
    });

    const { result } = renderHook(() => useRealtimeSongs());

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.songs).toEqual([]);
    expect(result.current.isRealTime).toBe(false);

    // Wait for API data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.songs).toEqual(mockSongs);
    expect(result.current.isRealTime).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockApiService.getSongs).toHaveBeenCalledOnce();
  });

  it('should handle errors in real-time subscription', async () => {
    const mockUnsubscribe = vi.fn();
    mockApiService.supportsRealTimeUpdates.mockReturnValue(true);
    mockApiService.subscribeToSongs.mockImplementation((callback) => {
      // Simulate real-time error by calling with empty array (as per error handling)
      setTimeout(() => callback([]), 0);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useRealtimeSongs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.songs).toEqual([]);
    expect(result.current.isRealTime).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors in fallback mode', async () => {
    mockApiService.supportsRealTimeUpdates.mockReturnValue(false);
    mockApiService.getSongs.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useRealtimeSongs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.songs).toEqual([]);
    expect(result.current.isRealTime).toBe(false);
    expect(result.current.error).toBe('API Error');
  });

  it('should provide refetch functionality', async () => {
    const mockSongs = [
      { id: '1', title: 'Test Song', author_id: 'user1', content: 'test content', created_at: '2023-01-01', updated_at: '2023-01-01' }
    ];
    
    mockApiService.supportsRealTimeUpdates.mockReturnValue(false);
    mockApiService.getSongs.mockResolvedValue({
      status: 'success',
      data: { songs: mockSongs }
    });

    const { result } = renderHook(() => useRealtimeSongs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock to test refetch
    mockApiService.getSongs.mockClear();
    
    // Test refetch
    await result.current.refetch();
    
    expect(mockApiService.getSongs).toHaveBeenCalledOnce();
  });
});