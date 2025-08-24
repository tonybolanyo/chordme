// Custom hook for managing real-time single song data
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { Song } from '../types';
import type { Unsubscribe } from 'firebase/firestore';

interface UseRealtimeSongResult {
  song: Song | null;
  loading: boolean;
  error: string | null;
  isRealTime: boolean;
  refetch: () => Promise<void>;
}

export function useRealtimeSong(songId: string | null): UseRealtimeSongResult {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(false);

  // Function to fetch song via regular API (for Flask backend or initial load)
  const fetchSong = useCallback(async () => {
    if (!songId) {
      setLoading(false);
      setSong(null);
      return;
    }

    try {
      setError(null);
      const response = await apiService.getSong(songId);
      if (response.status === 'success' && response.data?.song) {
        setSong(response.data.song);
      } else {
        setSong(null);
      }
    } catch (err) {
      console.error('Error fetching song:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch song');
      setSong(null);
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    if (!songId) {
      setLoading(false);
      setSong(null);
      return;
    }

    setLoading(true);

    // Check if real-time updates are supported
    if (apiService.supportsRealTimeUpdates()) {
      setIsRealTime(true);
      
      // Set up real-time subscription
      unsubscribe = apiService.subscribeToSong(songId, (realtimeSong: Song | null) => {
        setSong(realtimeSong);
        setLoading(false);
        setError(null);
      });
    } else {
      setIsRealTime(false);
      
      // Fall back to regular API fetch for Flask backend
      fetchSong();
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [songId, fetchSong]);

  return {
    song,
    loading,
    error,
    isRealTime,
    refetch: fetchSong,
  };
}