import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';
import {
  PersonalizedRecommendations,
  TrendingSongsResponse,
  SimilarSongsResponse,
  ArtistExploration,
  GenreExploration,
  DiscoveryPreferences,
  DiscoveryTimeframe,
} from '../types/analytics';

interface UseDiscoveryOptions {
  autoLoad?: boolean;
  defaultTimeframe?: DiscoveryTimeframe;
}

interface DiscoveryData {
  recommendations: PersonalizedRecommendations | null;
  trending: TrendingSongsResponse | null;
  preferences: DiscoveryPreferences | null;
}

interface DiscoveryState {
  data: DiscoveryData;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing music discovery and recommendation data
 */
export function useDiscovery(options: UseDiscoveryOptions = {}) {
  const { autoLoad = true, defaultTimeframe = '7d' } = options;
  
  const [state, setState] = useState<DiscoveryState>({
    data: {
      recommendations: null,
      trending: null,
      preferences: null,
    },
    loading: false,
    error: null,
  });

  const [timeframe, setTimeframe] = useState<DiscoveryTimeframe>(defaultTimeframe);

  // Load all discovery data
  const loadDiscoveryData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [recommendations, trending, preferences] = await Promise.all([
        analyticsService.getPersonalizedRecommendations(10),
        analyticsService.getTrendingSongs(timeframe, 10),
        analyticsService.getDiscoveryPreferences(),
      ]);

      setState(prev => ({
        ...prev,
        data: {
          recommendations,
          trending,
          preferences: preferences.discovery_preferences,
        },
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load discovery data',
        loading: false,
      }));
    }
  }, [timeframe]);

  // Load recommendations only
  const loadRecommendations = useCallback(async (limit: number = 10) => {
    try {
      const recommendations = await analyticsService.getPersonalizedRecommendations(limit);
      setState(prev => ({
        ...prev,
        data: { ...prev.data, recommendations },
      }));
      return recommendations;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load recommendations');
    }
  }, []);

  // Load trending songs
  const loadTrending = useCallback(async (newTimeframe?: DiscoveryTimeframe, limit: number = 10) => {
    const effectiveTimeframe = newTimeframe || timeframe;
    
    try {
      const trending = await analyticsService.getTrendingSongs(effectiveTimeframe, limit);
      setState(prev => ({
        ...prev,
        data: { ...prev.data, trending },
      }));
      
      if (newTimeframe) {
        setTimeframe(newTimeframe);
      }
      
      return trending;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load trending songs');
    }
  }, [timeframe]);

  // Update timeframe and reload trending
  const updateTimeframe = useCallback((newTimeframe: DiscoveryTimeframe) => {
    setTimeframe(newTimeframe);
    loadTrending(newTimeframe);
  }, [loadTrending]);

  // Update discovery preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<DiscoveryPreferences>) => {
    try {
      const response = await analyticsService.updateDiscoveryPreferences(newPreferences);
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          preferences: response.discovery_preferences,
        },
      }));
      return response.discovery_preferences;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update preferences');
    }
  }, []);

  // Refresh all data
  const refresh = useCallback(() => {
    loadDiscoveryData();
  }, [loadDiscoveryData]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-load data on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadDiscoveryData();
    }
  }, [autoLoad, loadDiscoveryData]);

  return {
    // State
    recommendations: state.data.recommendations,
    trending: state.data.trending,
    preferences: state.data.preferences,
    loading: state.loading,
    error: state.error,
    timeframe,

    // Actions
    loadRecommendations,
    loadTrending,
    updateTimeframe,
    updatePreferences,
    refresh,
    clearError,
  };
}

/**
 * Hook for finding similar songs
 */
export function useSimilarSongs() {
  const [similarData, setSimilarData] = useState<SimilarSongsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findSimilarSongs = useCallback(async (songId: number, limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getSimilarSongs(songId, limit);
      setSimilarData(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find similar songs';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSimilarData = useCallback(() => {
    setSimilarData(null);
    setError(null);
  }, []);

  return {
    similarSongs: similarData?.similar_songs || [],
    referenceSong: similarData?.reference_song || null,
    similarityFactors: similarData?.similarity_factors || [],
    loading,
    error,
    findSimilarSongs,
    clearSimilarData,
  };
}

/**
 * Hook for exploring artists and genres
 */
export function useExploration() {
  const [artistData, setArtistData] = useState<ArtistExploration | null>(null);
  const [genreData, setGenreData] = useState<GenreExploration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exploreArtist = useCallback(async (artist: string, limit: number = 20) => {
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.exploreArtist(artist, limit);
      setArtistData(data);
      setGenreData(null); // Clear genre data when exploring artist
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to explore artist';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const exploreGenre = useCallback(async (genre: string, limit: number = 20) => {
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.exploreGenre(genre, limit);
      setGenreData(data);
      setArtistData(null); // Clear artist data when exploring genre
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to explore genre';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearExplorationData = useCallback(() => {
    setArtistData(null);
    setGenreData(null);
    setError(null);
  }, []);

  return {
    // Current exploration data
    artistData,
    genreData,
    loading,
    error,

    // Actions
    exploreArtist,
    exploreGenre,
    clearExplorationData,

    // Computed values
    currentExploration: artistData || genreData,
    isExploringArtist: !!artistData,
    isExploringGenre: !!genreData,
  };
}

/**
 * Hook for managing discovery preferences
 */
export function useDiscoveryPreferences() {
  const [preferences, setPreferences] = useState<DiscoveryPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await analyticsService.getDiscoveryPreferences();
      setPreferences(response.discovery_preferences);
      return response.discovery_preferences;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load preferences';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<DiscoveryPreferences>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await analyticsService.updateDiscoveryPreferences(updates);
      setPreferences(response.discovery_preferences);
      return response.discovery_preferences;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
  };
}

export default useDiscovery;