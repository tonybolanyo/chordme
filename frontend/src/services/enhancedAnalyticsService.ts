/**
 * Enhanced Performance Analytics Service
 * 
 * Provides client-side interface for performance analytics including:
 * - Performance session tracking
 * - Problem section identification
 * - AI-powered improvement recommendations
 * - Privacy-compliant data collection
 * - Real-time analytics and insights
 */

import {
  PerformanceSession,
  PerformanceEvent,
  ProblemSection,
  PerformanceInsights,
  AIRecommendation,
  AnonymousUsageAnalytics,
  EnhancedAnalyticsPrivacySettings,
  PerformanceDataExport,
  StartSessionRequest,
  StartSessionResponse,
  RecordEventRequest,
  EndSessionRequest,
  ProblemSectionsResponse,
  PrivacySettingsUpdateRequest,
  DataDeletionRequest,
  DataDeletionResponse,
  PerformanceAnalyticsError
} from '../types/analytics';

class EnhancedAnalyticsService {
  private baseUrl: string;
  private currentSessionId: number | null = null;
  private eventQueue: RecordEventRequest[] = [];
  private isOnline: boolean = navigator.onLine;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries: number = 3;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    // Set up event listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processEventQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // Auto-flush event queue periodically
    setInterval(() => {
      if (this.isOnline && this.eventQueue.length > 0) {
        this.processEventQueue();
      }
    }, 5000); // Every 5 seconds
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
      const errorData = await response.json().catch(() => ({
        message: 'Network error occurred',
        code: 'NETWORK_ERROR'
      }));
      
      const error: PerformanceAnalyticsError = {
        code: errorData.code || 'API_ERROR',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData
      };
      
      throw error;
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * Retry failed requests with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<Response>,
    requestId: string
  ): Promise<T> {
    const attempts = this.retryAttempts.get(requestId) || 0;
    
    try {
      const response = await requestFn();
      const result = await this.handleResponse<T>(response);
      this.retryAttempts.delete(requestId);
      return result;
    } catch (error) {
      if (attempts < this.maxRetries) {
        this.retryAttempts.set(requestId, attempts + 1);
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(requestFn, requestId);
      } else {
        this.retryAttempts.delete(requestId);
        throw error;
      }
    }
  }

  /**
   * Start a new performance session
   */
  async startPerformanceSession(request: StartSessionRequest): Promise<number> {
    const response = await fetch(`${this.baseUrl}/api/v1/performance/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    const result = await this.handleResponse<StartSessionResponse>(response);
    this.currentSessionId = result.session_id;
    
    // Clear any existing event queue for previous session
    this.eventQueue = [];
    
    return result.session_id;
  }

  /**
   * Record a performance event
   */
  async recordPerformanceEvent(
    sessionId: number | null, 
    event: RecordEventRequest
  ): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId;
    
    if (!targetSessionId) {
      console.warn('No active session to record event');
      return;
    }

    if (!this.isOnline) {
      // Queue event for later processing
      this.eventQueue.push(event);
      return;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/performance/sessions/${targetSessionId}/events`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(event),
        }
      );

      await this.handleResponse(response);
    } catch (error) {
      // Queue for retry if it fails
      this.eventQueue.push(event);
      console.warn('Failed to record event, queued for retry:', error);
    }
  }

  /**
   * End the current performance session
   */
  async endPerformanceSession(
    sessionId: number | null, 
    request?: EndSessionRequest
  ): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId;
    
    if (!targetSessionId) {
      console.warn('No active session to end');
      return;
    }

    // Process any queued events first
    if (this.eventQueue.length > 0) {
      await this.processEventQueue();
    }

    const response = await fetch(
      `${this.baseUrl}/api/v1/performance/sessions/${targetSessionId}/end`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request || {}),
      }
    );

    await this.handleResponse(response);
    
    if (this.currentSessionId === targetSessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * Get problem sections for analysis
   */
  async getProblemSections(
    sessionId?: number,
    songId?: number,
    limit: number = 10
  ): Promise<ProblemSectionsResponse> {
    const params = new URLSearchParams();
    if (sessionId) params.append('session_id', sessionId.toString());
    if (songId) params.append('song_id', songId.toString());
    params.append('limit', limit.toString());

    const response = await fetch(
      `${this.baseUrl}/api/v1/performance/problem-sections?${params}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<ProblemSectionsResponse>(response);
  }

  /**
   * Get comprehensive performance insights
   */
  async getPerformanceInsights(
    songId?: number,
    periodDays: number = 30
  ): Promise<PerformanceInsights> {
    const params = new URLSearchParams();
    if (songId) params.append('song_id', songId.toString());
    params.append('period_days', periodDays.toString());

    const response = await fetch(
      `${this.baseUrl}/api/v1/performance/insights?${params}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<PerformanceInsights>(response);
  }

  /**
   * Get anonymous usage analytics
   */
  async getAnonymousUsageAnalytics(
    timePeriod: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<AnonymousUsageAnalytics> {
    const params = new URLSearchParams();
    params.append('time_period', timePeriod);

    const response = await fetch(
      `${this.baseUrl}/api/v1/performance/analytics/anonymous?${params}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<AnonymousUsageAnalytics>(response);
  }

  /**
   * Get user's analytics privacy settings
   */
  async getPrivacySettings(): Promise<EnhancedAnalyticsPrivacySettings> {
    const response = await fetch(`${this.baseUrl}/api/v1/performance/privacy/settings`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<EnhancedAnalyticsPrivacySettings>(response);
  }

  /**
   * Update user's analytics privacy settings
   */
  async updatePrivacySettings(
    settings: PrivacySettingsUpdateRequest
  ): Promise<{ message: string; updated_settings: EnhancedAnalyticsPrivacySettings }> {
    const response = await fetch(`${this.baseUrl}/api/v1/performance/privacy/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });

    return this.handleResponse<{ message: string; updated_settings: EnhancedAnalyticsPrivacySettings }>(response);
  }

  /**
   * Export user's performance data
   */
  async exportPerformanceData(): Promise<PerformanceDataExport> {
    const response = await fetch(`${this.baseUrl}/api/v1/performance/data/export`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PerformanceDataExport>(response);
  }

  /**
   * Delete user's performance data
   */
  async deletePerformanceData(request: DataDeletionRequest): Promise<DataDeletionResponse> {
    const params = new URLSearchParams();
    if (request.delete_all) params.append('delete_all', 'true');
    if (request.older_than_days) params.append('older_than_days', request.older_than_days.toString());

    const response = await fetch(
      `${this.baseUrl}/api/v1/performance/data/delete?${params}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    );

    return this.handleResponse<DataDeletionResponse>(response);
  }

  /**
   * Process queued events when back online
   */
  private async processEventQueue(): Promise<void> {
    if (!this.currentSessionId || this.eventQueue.length === 0) {
      return;
    }

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToProcess) {
      try {
        await this.recordPerformanceEvent(this.currentSessionId, event);
      } catch (error) {
        // Re-queue failed events
        this.eventQueue.push(event);
        console.warn('Failed to process queued event:', error);
      }
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): number | null {
    return this.currentSessionId;
  }

  /**
   * Check if there are pending events
   */
  hasPendingEvents(): boolean {
    return this.eventQueue.length > 0;
  }

  /**
   * Clear current session and event queue
   */
  clearSession(): void {
    this.currentSessionId = null;
    this.eventQueue = [];
    this.retryAttempts.clear();
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Force process event queue (for manual retry)
   */
  async forceProcessQueue(): Promise<void> {
    await this.processEventQueue();
  }

  // Utility methods for common event recording

  /**
   * Record a pause event
   */
  async recordPause(position?: number, chord?: string, section?: string): Promise<void> {
    await this.recordPerformanceEvent(this.currentSessionId, {
      event_type: 'pause',
      position_seconds: position,
      chord_at_position: chord,
      section_name: section,
    });
  }

  /**
   * Record a play event
   */
  async recordPlay(position?: number, chord?: string, section?: string): Promise<void> {
    await this.recordPerformanceEvent(this.currentSessionId, {
      event_type: 'play',
      position_seconds: position,
      chord_at_position: chord,
      section_name: section,
    });
  }

  /**
   * Record a rewind event
   */
  async recordRewind(fromPosition?: number, toPosition?: number): Promise<void> {
    await this.recordPerformanceEvent(this.currentSessionId, {
      event_type: 'rewind',
      position_seconds: fromPosition,
      seek_target: toPosition,
    });
  }

  /**
   * Record a tempo change event
   */
  async recordTempoChange(position?: number, newTempo?: number): Promise<void> {
    await this.recordPerformanceEvent(this.currentSessionId, {
      event_type: 'tempo_change',
      position_seconds: position,
      tempo_bpm: newTempo,
    });
  }

  /**
   * Record a seek event
   */
  async recordSeek(fromPosition?: number, toPosition?: number): Promise<void> {
    await this.recordPerformanceEvent(this.currentSessionId, {
      event_type: 'seek',
      position_seconds: fromPosition,
      seek_target: toPosition,
    });
  }

  /**
   * Auto-track common audio events
   */
  setupAutoTracking(audioElement?: HTMLAudioElement): () => void {
    if (!audioElement) {
      return () => {}; // No-op cleanup function
    }

    let lastPosition = 0;
    let isPlaying = false;

    const handlePlay = () => {
      if (!isPlaying) {
        this.recordPlay(audioElement.currentTime);
        isPlaying = true;
      }
    };

    const handlePause = () => {
      if (isPlaying) {
        this.recordPause(audioElement.currentTime);
        isPlaying = false;
      }
    };

    const handleSeeked = () => {
      const currentTime = audioElement.currentTime;
      if (Math.abs(currentTime - lastPosition) > 2) { // Significant seek (>2 seconds)
        if (currentTime < lastPosition) {
          this.recordRewind(lastPosition, currentTime);
        } else {
          this.recordSeek(lastPosition, currentTime);
        }
      }
      lastPosition = currentTime;
    };

    const handleTimeUpdate = () => {
      lastPosition = audioElement.currentTime;
    };

    // Add event listeners
    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('seeked', handleSeeked);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);

    // Return cleanup function
    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('seeked', handleSeeked);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }
}

// Export singleton instance
export const enhancedAnalyticsService = new EnhancedAnalyticsService();
export default enhancedAnalyticsService;