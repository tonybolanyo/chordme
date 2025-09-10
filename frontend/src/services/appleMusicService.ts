// Apple Music API service for MusicKit integration and music data access
import type {
  AppleMusicConfig,
  AppleMusicTokens,
  AppleMusicUserInfo,
  AppleMusicAuthResponse,
  AppleMusicSearchParams,
  AppleMusicSearchResult,
  AppleMusicTrack,
  AppleMusicAlbum,
  AppleMusicArtist,
  AppleMusicPlaylist,
  AppleMusicRecommendationParams,
  AppleMusicRecommendations,
  AppleMusicSubscriptionStatus,
  MusicPlatformTrack,
} from '../types';

// MusicKit types for better integration
declare global {
  interface Window {
    MusicKit: unknown;
  }
}

class AppleMusicService {
  private config: AppleMusicConfig;
  private musicKitInstance: unknown = null;
  private isInitialized: boolean = false;

  constructor() {
    this.config = {
      developerToken: (import.meta.env?.VITE_APPLE_MUSIC_DEVELOPER_TOKEN as string) || '',
      app: {
        name: 'ChordMe',
        build: (import.meta.env?.VITE_APP_VERSION as string) || '1.0.0',
      },
    };
  }

  /**
   * Check if Apple Music API is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.developerToken);
  }

  /**
   * Initialize MusicKit
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.isConfigured()) {
      throw new Error('Apple Music developer token not configured');
    }

    // Load MusicKit if not already loaded
    if (!window.MusicKit) {
      await this.loadMusicKit();
    }

    try {
      await window.MusicKit.configure({
        developerToken: this.config.developerToken,
        app: this.config.app,
      });

      this.musicKitInstance = window.MusicKit.getInstance();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MusicKit:', error);
      throw new Error('Failed to initialize Apple Music integration');
    }
  }

  /**
   * Load MusicKit script dynamically
   */
  private async loadMusicKit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MusicKit'));
      document.head.appendChild(script);
    });
  }

  /**
   * Check if user is authenticated with Apple Music
   */
  isAuthenticated(): boolean {
    return this.musicKitInstance?.isAuthorized || false;
  }

  /**
   * Get current authorization status
   */
  getAuthorizationStatus(): string {
    if (!this.musicKitInstance) {
      return 'notDetermined';
    }
    return this.musicKitInstance.authorizationStatus;
  }

  /**
   * Authorize user with Apple Music
   */
  async authorize(): Promise<AppleMusicAuthResponse> {
    await this.initialize();

    try {
      const musicUserToken = await this.musicKitInstance.authorize();
      
      const userInfo = await this.getUserInfo();
      const subscriptionStatus = await this.getSubscriptionStatus();

      const tokens: AppleMusicTokens = {
        developerToken: this.config.developerToken,
        musicUserToken,
        userInfo,
      };

      this.storeTokens(tokens);

      return {
        tokens,
        userInfo,
        subscriptionStatus,
      };
    } catch (error) {
      console.error('Apple Music authorization failed:', error);
      throw new Error('Failed to authorize with Apple Music');
    }
  }

  /**
   * Get user information
   */
  private async getUserInfo(): Promise<AppleMusicUserInfo | undefined> {
    if (!this.isAuthenticated()) {
      return undefined;
    }

    try {
      const response = await this.musicKitInstance.api.v1.me();
      return {
        id: response.id,
        attributes: response.attributes,
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      return undefined;
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(): Promise<AppleMusicSubscriptionStatus> {
    await this.initialize();

    if (!this.isAuthenticated()) {
      return {
        active: false,
        canPlayCatalogContent: false,
        canPlayback: false,
        hasCloudLibraryEnabled: false,
      };
    }

    try {
      return {
        active: this.musicKitInstance.hasPlayback,
        canPlayCatalogContent: this.musicKitInstance.canPlayCatalogContent,
        canPlayback: this.musicKitInstance.hasPlayback,
        hasCloudLibraryEnabled: this.musicKitInstance.hasCloudLibraryEnabled,
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return {
        active: false,
        canPlayCatalogContent: false,
        canPlayback: false,
        hasCloudLibraryEnabled: false,
      };
    }
  }

  /**
   * Search Apple Music catalog
   */
  async search(params: AppleMusicSearchParams): Promise<AppleMusicSearchResult> {
    await this.initialize();

    const searchParams = {
      term: params.term,
      types: params.types.join(','),
      limit: params.limit || 25,
      offset: params.offset || 0,
    };

    if (params.l) {
      (searchParams as unknown).l = params.l;
    }

    try {
      const response = await this.musicKitInstance.api.v1.search(searchParams);
      return response;
    } catch (error) {
      console.error('Apple Music search failed:', error);
      throw new Error('Failed to search Apple Music catalog');
    }
  }

  /**
   * Get track details by ID
   */
  async getTrack(id: string): Promise<AppleMusicTrack> {
    await this.initialize();

    try {
      const response = await this.musicKitInstance.api.v1.songs([id]);
      if (!response.data || response.data.length === 0) {
        throw new Error('Track not found');
      }
      return response.data[0];
    } catch (error) {
      console.error('Failed to get track details:', error);
      throw new Error('Failed to get track details');
    }
  }

  /**
   * Get album details by ID
   */
  async getAlbum(id: string): Promise<AppleMusicAlbum> {
    await this.initialize();

    try {
      const response = await this.musicKitInstance.api.v1.albums([id]);
      if (!response.data || response.data.length === 0) {
        throw new Error('Album not found');
      }
      return response.data[0];
    } catch (error) {
      console.error('Failed to get album details:', error);
      throw new Error('Failed to get album details');
    }
  }

  /**
   * Get artist details by ID
   */
  async getArtist(id: string): Promise<AppleMusicArtist> {
    await this.initialize();

    try {
      const response = await this.musicKitInstance.api.v1.artists([id]);
      if (!response.data || response.data.length === 0) {
        throw new Error('Artist not found');
      }
      return response.data[0];
    } catch (error) {
      console.error('Failed to get artist details:', error);
      throw new Error('Failed to get artist details');
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(params: AppleMusicRecommendationParams): Promise<AppleMusicRecommendations> {
    await this.initialize();

    try {
      const response = await this.musicKitInstance.api.v1.catalog.recommendations({
        id: params.id,
        limit: params.limit || 25,
        types: params.types?.join(',') || 'songs',
      });
      return response;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw new Error('Failed to get recommendations');
    }
  }

  /**
   * Create playlist
   */
  async createPlaylist(name: string, description?: string, trackIds?: string[]): Promise<AppleMusicPlaylist> {
    await this.initialize();

    if (!this.isAuthenticated()) {
      throw new Error('User must be authenticated to create playlists');
    }

    try {
      const playlistData = {
        attributes: {
          name,
          description: description ? { standard: description } : undefined,
        },
        relationships: trackIds ? {
          tracks: {
            data: trackIds.map(id => ({ id, type: 'songs' })),
          },
        } : undefined,
      };

      const response = await this.musicKitInstance.api.v1.me.library.playlists.create(playlistData);
      return response.data[0];
    } catch (error) {
      console.error('Failed to create playlist:', error);
      throw new Error('Failed to create playlist');
    }
  }

  /**
   * Play preview of a track
   */
  async playPreview(track: AppleMusicTrack): Promise<void> {
    if (!track.attributes.previews || track.attributes.previews.length === 0) {
      throw new Error('No preview available for this track');
    }

    try {
      // Use the audio engine service to play the preview
      const previewUrl = track.attributes.previews[0].url;
      
      // Create an audio element to play the preview
      const audio = new Audio(previewUrl);
      audio.crossOrigin = 'anonymous';
      
      await audio.play();
      
      // Return promise that resolves when preview ends or after 30 seconds
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          audio.pause();
          resolve();
        }, 30000); // 30 second preview

        audio.addEventListener('ended', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      console.error('Failed to play preview:', error);
      throw new Error('Failed to play preview');
    }
  }

  /**
   * Convert Apple Music track to platform-agnostic format
   */
  convertToPlatformTrack(track: AppleMusicTrack): MusicPlatformTrack {
    return {
      platform: 'apple-music',
      id: track.id,
      name: track.attributes.name,
      artistName: track.attributes.artistName,
      albumName: track.attributes.albumName,
      durationMs: track.attributes.durationInMillis,
      isrc: track.attributes.isrc,
      previewUrl: track.attributes.previews?.[0]?.url,
      externalUrl: track.attributes.url,
      artwork: track.attributes.artwork ? {
        url: track.attributes.artwork.url.replace('{w}', '400').replace('{h}', '400'),
        width: track.attributes.artwork.width,
        height: track.attributes.artwork.height,
      } : undefined,
    };
  }

  /**
   * Sign out from Apple Music
   */
  async signOut(): Promise<void> {
    try {
      if (this.musicKitInstance?.isAuthorized) {
        await this.musicKitInstance.unauthorize();
      }
      this.clearStoredData();
    } catch (error) {
      console.error('Error during sign out:', error);
      // Clear data even if sign out fails
      this.clearStoredData();
    }
  }

  /**
   * Store tokens in localStorage
   */
  private storeTokens(tokens: AppleMusicTokens): void {
    localStorage.setItem('appleMusicTokens', JSON.stringify(tokens));
  }

  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): AppleMusicTokens | null {
    try {
      const stored = localStorage.getItem('appleMusicTokens');
      if (!stored) return null;

      const tokens = JSON.parse(stored) as AppleMusicTokens;
      return tokens;
    } catch (error) {
      console.error('Error parsing stored tokens:', error);
      this.clearStoredData();
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  private clearStoredData(): void {
    localStorage.removeItem('appleMusicTokens');
  }
}

export const appleMusicService = new AppleMusicService();