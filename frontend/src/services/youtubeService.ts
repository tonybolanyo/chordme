/**
 * YouTube Service Implementation
 * Provides integration with YouTube Player API for video playback and management
 */

import {
  IYouTubeService,
  YouTubePlayerConfig,
  YouTubeSearchParams,
  YouTubeSearchResult,
  YouTubeVideoData,
  YouTubeSyncConfig,
  ChordTimeMapping,
} from '../types/audio';

// YouTube Player API types (from YouTube IFrame API)
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export class YouTubeService implements IYouTubeService {
  private apiKey: string = '';
  private isApiReady: boolean = false;
  private isApiLoaded: boolean = false;
  private players: Map<string, any> = new Map();
  private eventListeners: Map<string, Map<string, Function[]>> = new Map();
  private syncConfigs: Map<string, YouTubeSyncConfig> = new Map();
  private pendingInitPromise: Promise<void> | null = null;

  /**
   * Initialize YouTube API with API key
   */
  async initialize(apiKey: string): Promise<void> {
    if (this.pendingInitPromise) {
      return this.pendingInitPromise;
    }

    this.apiKey = apiKey;

    this.pendingInitPromise = new Promise((resolve, reject) => {
      try {
        if (this.isApiReady) {
          resolve();
          return;
        }

        // Set up the global callback
        window.onYouTubeIframeAPIReady = () => {
          this.isApiReady = true;
          resolve();
        };

        // Load the YouTube IFrame API if not already loaded
        if (!this.isApiLoaded) {
          this.loadYouTubeAPI();
          this.isApiLoaded = true;
        }

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isApiReady) {
            reject(new Error('YouTube API failed to load within timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });

    return this.pendingInitPromise;
  }

  /**
   * Load YouTube IFrame API script
   */
  private loadYouTubeAPI(): void {
    if (document.getElementById('youtube-api-script')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'youtube-api-script';
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error('Failed to load YouTube API script');
    };

    document.head.appendChild(script);
  }

  /**
   * Check if API is initialized
   */
  isInitialized(): boolean {
    return this.isApiReady && this.apiKey !== '';
  }

  /**
   * Create a YouTube player
   */
  async createPlayer(containerId: string, config: YouTubePlayerConfig): Promise<any> {
    if (!this.isInitialized()) {
      throw new Error('YouTube service not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const playerConfig = {
          height: '360',
          width: '640',
          videoId: '', // Will be set when loading video
          playerVars: {
            autoplay: config.autoplay ? 1 : 0,
            loop: config.loop ? 1 : 0,
            controls: config.controls ?? 1,
            showinfo: config.showinfo ?? 1,
            rel: config.rel ?? 0,
            modestbranding: config.modestbranding ?? 1,
            cc_load_policy: config.cc_load_policy ?? 0,
            iv_load_policy: config.iv_load_policy ?? 1,
            fs: config.fs ?? 1,
            disablekb: config.disablekb ?? 0,
            enablejsapi: config.enablejsapi ?? 1,
            origin: config.origin || window.location.origin,
            start: config.start,
            end: config.end,
            playlist: config.playlist,
          },
          events: {
            onReady: (event: any) => {
              const player = event.target;
              this.players.set(containerId, player);
              this.eventListeners.set(containerId, new Map());
              resolve(player);
            },
            onStateChange: (event: any) => {
              this.handlePlayerStateChange(containerId, event);
            },
            onError: (event: any) => {
              this.handlePlayerError(containerId, event);
              reject(new Error(`YouTube player error: ${event.data}`));
            },
          },
        };

        // Create the player
        new window.YT.Player(containerId, playerConfig);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Destroy a YouTube player
   */
  destroyPlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      try {
        player.destroy();
      } catch (error) {
        console.warn('Error destroying YouTube player:', error);
      }
      this.players.delete(playerId);
      this.eventListeners.delete(playerId);
      this.syncConfigs.delete(playerId);
    }
  }

  /**
   * Search for YouTube videos
   */
  async searchVideos(params: YouTubeSearchParams): Promise<YouTubeSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not set');
    }

    const searchParams = new URLSearchParams({
      part: 'snippet,statistics',
      type: 'video',
      key: this.apiKey,
      q: params.query,
      maxResults: (params.maxResults || 10).toString(),
    });

    if (params.order) searchParams.append('order', params.order);
    if (params.videoDuration) searchParams.append('videoDuration', params.videoDuration);
    if (params.videoDefinition) searchParams.append('videoDefinition', params.videoDefinition);
    if (params.videoCategoryId) searchParams.append('videoCategoryId', params.videoCategoryId);
    if (params.regionCode) searchParams.append('regionCode', params.regionCode);
    if (params.relevanceLanguage) searchParams.append('relevanceLanguage', params.relevanceLanguage);
    if (params.publishedAfter) searchParams.append('publishedAfter', params.publishedAfter);
    if (params.publishedBefore) searchParams.append('publishedBefore', params.publishedBefore);

    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`YouTube API error: ${data.error.message}`);
      }

      return data.items?.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails?.duration || '',
        viewCount: parseInt(item.statistics?.viewCount || '0'),
        likeCount: parseInt(item.statistics?.likeCount || '0'),
      })) || [];
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed video information
   */
  async getVideoDetails(videoId: string): Promise<YouTubeVideoData> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not set');
    }

    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoId,
      key: this.apiKey,
    });

    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`YouTube API error: ${data.error.message}`);
      }

      const item = data.items?.[0];
      if (!item) {
        throw new Error('Video not found');
      }

      return {
        videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        thumbnails: item.snippet.thumbnails,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails.duration,
        viewCount: parseInt(item.statistics?.viewCount || '0'),
        likeCount: parseInt(item.statistics?.likeCount || '0'),
        tags: item.snippet.tags,
        categoryId: item.snippet.categoryId,
        defaultLanguage: item.snippet.defaultLanguage,
        defaultAudioLanguage: item.snippet.defaultAudioLanguage,
      };
    } catch (error) {
      console.error('YouTube video details error:', error);
      throw error;
    }
  }

  /**
   * Playback control methods
   */
  playVideo(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.playVideo();
    }
  }

  pauseVideo(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.pauseVideo();
    }
  }

  seekTo(playerId: string, seconds: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.seekTo(seconds, true);
    }
  }

  setVolume(playerId: string, volume: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.setVolume(Math.max(0, Math.min(100, volume * 100)));
    }
  }

  mute(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.mute();
    }
  }

  unMute(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.unMute();
    }
  }

  /**
   * State query methods
   */
  getPlayerState(playerId: string): number {
    const player = this.players.get(playerId);
    return player ? player.getPlayerState() : -1;
  }

  getCurrentTime(playerId: string): number {
    const player = this.players.get(playerId);
    return player ? player.getCurrentTime() : 0;
  }

  getDuration(playerId: string): number {
    const player = this.players.get(playerId);
    return player ? player.getDuration() : 0;
  }

  getVolume(playerId: string): number {
    const player = this.players.get(playerId);
    return player ? player.getVolume() / 100 : 0;
  }

  isMuted(playerId: string): boolean {
    const player = this.players.get(playerId);
    return player ? player.isMuted() : false;
  }

  /**
   * Event handling
   */
  addEventListener(playerId: string, event: string, handler: Function): void {
    const playerListeners = this.eventListeners.get(playerId);
    if (playerListeners) {
      if (!playerListeners.has(event)) {
        playerListeners.set(event, []);
      }
      playerListeners.get(event)!.push(handler);
    }
  }

  removeEventListener(playerId: string, event: string, handler: Function): void {
    const playerListeners = this.eventListeners.get(playerId);
    if (playerListeners && playerListeners.has(event)) {
      const handlers = playerListeners.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Synchronization methods
   */
  syncWithChords(playerId: string, syncConfig: YouTubeSyncConfig): void {
    this.syncConfigs.set(playerId, syncConfig);
    
    if (syncConfig.enabled && syncConfig.autoSync) {
      this.startAutoSync(playerId);
    }
  }

  updateSyncMapping(playerId: string, mapping: ChordTimeMapping[]): void {
    const syncConfig = this.syncConfigs.get(playerId);
    if (syncConfig) {
      syncConfig.chordProgression = mapping;
      this.syncConfigs.set(playerId, syncConfig);
    }
  }

  /**
   * Private helper methods
   */
  private handlePlayerStateChange(playerId: string, event: any): void {
    const listeners = this.eventListeners.get(playerId)?.get('stateChange');
    if (listeners) {
      listeners.forEach(handler => handler(event));
    }

    // Handle synchronization
    this.handleSynchronization(playerId, event);
  }

  private handlePlayerError(playerId: string, event: any): void {
    const listeners = this.eventListeners.get(playerId)?.get('error');
    if (listeners) {
      listeners.forEach(handler => handler(event));
    }
  }

  private startAutoSync(playerId: string): void {
    const syncConfig = this.syncConfigs.get(playerId);
    if (!syncConfig || !syncConfig.enabled) return;

    // Implement auto-synchronization logic
    const player = this.players.get(playerId);
    if (!player) return;

    const syncInterval = setInterval(() => {
      if (this.getPlayerState(playerId) === 1) { // Playing
        const currentTime = this.getCurrentTime(playerId);
        this.updateChordHighlight(playerId, currentTime);
      }
    }, 100); // Update every 100ms for smooth synchronization

    // Store interval for cleanup
    this.eventListeners.get(playerId)?.set('syncInterval', [syncInterval]);
  }

  private handleSynchronization(playerId: string, event: any): void {
    const syncConfig = this.syncConfigs.get(playerId);
    if (!syncConfig || !syncConfig.enabled) return;

    // Handle different synchronization modes
    switch (syncConfig.syncMode) {
      case 'automatic':
        this.handleAutomaticSync(playerId, event);
        break;
      case 'chord-based':
        this.handleChordBasedSync(playerId, event);
        break;
      case 'manual':
        // Manual sync - no automatic behavior
        break;
    }
  }

  private handleAutomaticSync(playerId: string, event: any): void {
    // Implement automatic synchronization logic
    const currentTime = this.getCurrentTime(playerId);
    this.updateChordHighlight(playerId, currentTime);
  }

  private handleChordBasedSync(playerId: string, event: any): void {
    // Implement chord-based synchronization logic
    const syncConfig = this.syncConfigs.get(playerId);
    if (!syncConfig?.chordProgression) return;

    const currentTime = this.getCurrentTime(playerId);
    const tolerance = syncConfig.syncTolerance / 1000; // Convert ms to seconds

    // Find current chord based on timing
    const currentChord = syncConfig.chordProgression.find(chord => 
      currentTime >= chord.startTime - tolerance && 
      currentTime <= chord.endTime + tolerance
    );

    if (currentChord) {
      this.highlightChord(playerId, currentChord);
    }
  }

  private updateChordHighlight(playerId: string, currentTime: number): void {
    // Emit custom event for chord highlighting
    const event = new CustomEvent('youtube-chord-highlight', {
      detail: { playerId, currentTime }
    });
    window.dispatchEvent(event);
  }

  private highlightChord(playerId: string, chord: ChordTimeMapping): void {
    // Emit custom event for specific chord highlighting
    const event = new CustomEvent('youtube-chord-change', {
      detail: { playerId, chord }
    });
    window.dispatchEvent(event);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all sync intervals
    this.eventListeners.forEach((listeners, playerId) => {
      const syncInterval = listeners.get('syncInterval')?.[0];
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    });

    // Destroy all players
    this.players.forEach((player, playerId) => {
      this.destroyPlayer(playerId);
    });

    // Clear all data
    this.players.clear();
    this.eventListeners.clear();
    this.syncConfigs.clear();
    this.isApiReady = false;
    this.isApiLoaded = false;
    this.pendingInitPromise = null;
  }
}

// Create singleton instance
export const youtubeService = new YouTubeService();

// YouTube Player API constants
export const YouTubePlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export const YouTubeError = {
  INVALID_PARAM: 2,
  HTML5_ERROR: 5,
  VIDEO_NOT_FOUND: 100,
  VIDEO_NOT_EMBEDDABLE: 101,
  VIDEO_NOT_EMBEDDABLE_DOMAIN: 150,
} as const;