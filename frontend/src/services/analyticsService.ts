/**
 * Analytics Service
 * 
 * Frontend service for performance analytics and insights.
 * Handles API communication and data transformation for analytics features.
 */

import {
  SetlistAnalytics,
  SongAnalytics,
  PerformanceRecommendations,
  PopularSongsData,
  SetlistComparison,
  AnalyticsExportData,
  AnalyticsPrivacySettings,
  PrivacySettingsResponse,
  AnalyticsApiResponse,
  ExportRequest,
  SetlistComparisonRequest,
  DataDeletionRequest,
  DataDeletionResponse,
  AnalyticsTimeframe,
  AnalyticsScope,
  ExportType,
  DeleteType,
  // Music Discovery Types
  PersonalizedRecommendations,
  SimilarSongsResponse,
  ArtistExploration,
  GenreExploration,
  TrendingSongsResponse,
  DiscoveryPreferences,
  DiscoveryPreferencesResponse,
  DiscoveryTimeframe,
} from '../types/analytics';

class AnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }

  /**
   * Get authorization headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        throw new Error(`Rate limit exceeded. ${data.message || 'Please try again later.'}`);
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to view this data.');
      }
      
      if (response.status === 404) {
        throw new Error('Analytics data not found.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to retrieve analytics data');
    }

    const data: AnalyticsApiResponse<T> = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message || 'Analytics operation failed');
    }

    return data.data as T;
  }

  /**
   * Get comprehensive analytics for a specific setlist
   */
  async getSetlistAnalytics(setlistId: number): Promise<SetlistAnalytics> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/setlists/${setlistId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<SetlistAnalytics>(response);
  }

  /**
   * Get performance analytics for a specific song
   */
  async getSongAnalytics(songId: number): Promise<SongAnalytics> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/songs/${songId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<SongAnalytics>(response);
  }

  /**
   * Get setlist optimization recommendations
   */
  async getRecommendations(limit: number = 10): Promise<PerformanceRecommendations> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/recommendations?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PerformanceRecommendations>(response);
  }

  /**
   * Get popular songs and trending analysis
   */
  async getPopularSongs(
    timeframe: AnalyticsTimeframe = '30d',
    scope: AnalyticsScope = 'user',
    limit: number = 20
  ): Promise<PopularSongsData> {
    const params = new URLSearchParams({
      timeframe,
      scope,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/v1/analytics/popular?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PopularSongsData>(response);
  }

  /**
   * Compare performance metrics across different setlists
   */
  async compareSetlists(setlistIds: number[]): Promise<SetlistComparison> {
    const requestData: SetlistComparisonRequest = { setlist_ids: setlistIds };

    const response = await fetch(`${this.baseUrl}/api/v1/analytics/compare`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestData),
    });

    return this.handleResponse<SetlistComparison>(response);
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalytics(
    exportType: ExportType = 'comprehensive',
    format: 'json' | 'csv' = 'json',
    privacyConsent: boolean = false
  ): Promise<AnalyticsExportData> {
    if (!privacyConsent) {
      throw new Error('Privacy consent is required for data export');
    }

    const requestData: ExportRequest = {
      export_type: exportType,
      format,
      privacy_consent: privacyConsent,
    };

    const response = await fetch(`${this.baseUrl}/api/v1/analytics/export`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestData),
    });

    return this.handleResponse<AnalyticsExportData>(response);
  }

  /**
   * Get user's analytics privacy settings
   */
  async getPrivacySettings(): Promise<PrivacySettingsResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/privacy/settings`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PrivacySettingsResponse>(response);
  }

  /**
   * Update user's analytics privacy settings
   */
  async updatePrivacySettings(
    settings: Partial<AnalyticsPrivacySettings>
  ): Promise<{ updated_settings: Partial<AnalyticsPrivacySettings> }> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/privacy/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });

    return this.handleResponse<{ updated_settings: Partial<AnalyticsPrivacySettings> }>(response);
  }

  /**
   * Delete user's analytics data (GDPR Right to Erasure)
   */
  async deleteAnalyticsData(
    deleteType: DeleteType = 'all',
    confirmation: string = ''
  ): Promise<DataDeletionResponse> {
    if (confirmation !== 'I understand this action cannot be undone') {
      throw new Error('Explicit confirmation required for data deletion');
    }

    const requestData: DataDeletionRequest = {
      confirmation,
      delete_type: deleteType,
    };

    const response = await fetch(`${this.baseUrl}/api/v1/analytics/data/delete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestData),
    });

    return this.handleResponse<DataDeletionResponse>(response);
  }

  /**
   * Download exported analytics data as a file
   */
  async downloadExportData(exportData: AnalyticsExportData): Promise<void> {
    const filename = `chordme-analytics-${exportData.export_type}-${exportData.generated_at.split('T')[0]}.${exportData.format}`;
    
    let content: string;
    let mimeType: string;

    if (exportData.format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
    } else if (exportData.format === 'csv') {
      content = this.convertToCSV(exportData);
      mimeType = 'text/csv';
    } else {
      throw new Error('Unsupported export format');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert export data to CSV format
   */
  private convertToCSV(exportData: AnalyticsExportData): string {
    const lines: string[] = [];
    
    // Add header with export information
    lines.push(`# ChordMe Analytics Export`);
    lines.push(`# Export Type: ${exportData.export_type}`);
    lines.push(`# Generated: ${exportData.generated_at}`);
    lines.push(`# User ID: ${exportData.user_id}`);
    lines.push('');

    // Convert performances data if present
    if (exportData.data.performances) {
      lines.push('=== PERFORMANCES ===');
      lines.push('Setlist ID,Performance Date,Venue,Total Duration,Overall Rating,Songs Performed');
      
      exportData.data.performances.forEach((performance: any) => {
        lines.push([
          performance.setlist_id || '',
          performance.performance_date || '',
          performance.venue || '',
          performance.total_duration || '',
          performance.overall_rating || '',
          performance.songs_performed || '',
        ].join(','));
      });
      lines.push('');
    }

    // Convert songs data if present
    if (exportData.data.songs) {
      lines.push('=== SONGS ===');
      lines.push('Song ID,Title,Artist,Total Performances,Average Rating,Average Duration');
      
      exportData.data.songs.forEach((song: any) => {
        lines.push([
          song.song_id || '',
          `"${song.song_title || ''}"`,
          `"${song.song_artist || ''}"`,
          song.total_performances || '',
          song.average_rating || '',
          song.average_duration || '',
        ].join(','));
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Validate analytics data for privacy compliance
   */
  validateDataPrivacy(data: any): boolean {
    // Check for personally identifiable information
    const sensitiveFields = ['email', 'full_name', 'address', 'phone'];
    
    const checkForSensitiveData = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) {
        return false;
      }

      for (const key in obj) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          return true;
        }
        
        if (typeof obj[key] === 'object') {
          if (checkForSensitiveData(obj[key])) {
            return true;
          }
        }
      }
      
      return false;
    };

    return !checkForSensitiveData(data);
  }

  /**
   * Get analytics dashboard summary
   */
  async getDashboardSummary(): Promise<{
    recent_performances: number;
    total_songs: number;
    average_rating: number;
    trending_songs: number;
  }> {
    try {
      // Get data for dashboard summary
      const [popularSongs, recommendations] = await Promise.all([
        this.getPopularSongs('30d', 'user', 5),
        this.getRecommendations(5),
      ]);

      return {
        recent_performances: popularSongs.popular_songs.reduce((sum, song) => sum + song.performance_count, 0),
        total_songs: popularSongs.total_songs,
        average_rating: popularSongs.popular_songs.length > 0 
          ? popularSongs.popular_songs.reduce((sum, song) => sum + (song.average_rating || 0), 0) / popularSongs.popular_songs.length
          : 0,
        trending_songs: popularSongs.trending_songs.length,
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      return {
        recent_performances: 0,
        total_songs: 0,
        average_rating: 0,
        trending_songs: 0,
      };
    }
  }

  /**
   * Check if analytics features are available for the user
   */
  async checkAnalyticsAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/analytics/privacy/settings`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Error checking analytics availability:', error);
      return false;
    }
  }

  // Music Discovery and Recommendation Methods

  /**
   * Get personalized song recommendations
   */
  async getPersonalizedRecommendations(limit: number = 20): Promise<PersonalizedRecommendations> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/discovery/recommendations?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PersonalizedRecommendations>(response);
  }

  /**
   * Find songs similar to a specific song
   */
  async getSimilarSongs(songId: number, limit: number = 10): Promise<SimilarSongsResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/discovery/similar/${songId}?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<SimilarSongsResponse>(response);
  }

  /**
   * Explore songs by a specific artist
   */
  async exploreArtist(artist: string, limit: number = 20): Promise<ArtistExploration> {
    const encodedArtist = encodeURIComponent(artist);
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/discovery/artists/${encodedArtist}/explore?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<ArtistExploration>(response);
  }

  /**
   * Explore songs within a specific genre
   */
  async exploreGenre(genre: string, limit: number = 20): Promise<GenreExploration> {
    const encodedGenre = encodeURIComponent(genre);
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/discovery/genres/${encodedGenre}/explore?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<GenreExploration>(response);
  }

  /**
   * Get trending songs based on community activity
   */
  async getTrendingSongs(
    timeframe: DiscoveryTimeframe = '7d',
    limit: number = 20
  ): Promise<TrendingSongsResponse> {
    const params = new URLSearchParams({
      timeframe,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/v1/analytics/discovery/trending?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<TrendingSongsResponse>(response);
  }

  /**
   * Get user's music discovery preferences
   */
  async getDiscoveryPreferences(): Promise<DiscoveryPreferencesResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/discovery/preferences`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<DiscoveryPreferencesResponse>(response);
  }

  /**
   * Update user's music discovery preferences
   */
  async updateDiscoveryPreferences(preferences: Partial<DiscoveryPreferences>): Promise<DiscoveryPreferencesResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/discovery/preferences`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(preferences),
    });

    return this.handleResponse<DiscoveryPreferencesResponse>(response);
  }

  /**
   * Get music discovery dashboard data
   */
  async getDiscoveryDashboard(): Promise<{
    personalized_recommendations: PersonalizedRecommendations;
    trending_songs: TrendingSongsResponse;
    discovery_preferences: DiscoveryPreferencesResponse;
  }> {
    try {
      const [recommendations, trending, preferences] = await Promise.all([
        this.getPersonalizedRecommendations(10),
        this.getTrendingSongs('7d', 10),
        this.getDiscoveryPreferences(),
      ]);

      return {
        personalized_recommendations: recommendations,
        trending_songs: trending,
        discovery_preferences: preferences,
      };
    } catch (error) {
      console.error('Error getting discovery dashboard data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;