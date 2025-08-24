// Custom hook for managing real-time songs data
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { Song } from '../types';
import type { Unsubscribe } from 'firebase/firestore';

interface UseRealtimeSongsResult {
  songs: Song[];
  loading: boolean;
  error: string | null;
  isRealTime: boolean;
  refetch: () => Promise<void>;
}

export function useRealtimeSongs(): UseRealtimeSongsResult {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(false);

  // Function to fetch songs via regular API (for Flask backend or initial load)
  const fetchSongs = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.getSongs();
      if (response.status === 'success' && response.data?.songs) {
        setSongs(response.data.songs);
      } else {
        setSongs([]);
      }
    } catch (err) {
      console.error('Error fetching songs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch songs');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    // Check if real-time updates are supported
    if (apiService.supportsRealTimeUpdates()) {
      setIsRealTime(true);
      
      // Set up real-time subscription
      unsubscribe = apiService.subscribeToSongs((realtimeSongs: Song[]) => {
        setSongs(realtimeSongs);
        setLoading(false);
        setError(null);
      });
    } else {
      setIsRealTime(false);
      
      // Fall back to regular API fetch for Flask backend
      fetchSongs();
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchSongs]);

  return {
    songs,
    loading,
    error,
    isRealTime,
    refetch: fetchSongs,
  };
}