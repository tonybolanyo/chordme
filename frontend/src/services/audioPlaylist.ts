/**
 * Audio Playlist Management Service
 * Handles playlist creation, management, and operations
 */

import { 
  Playlist, 
  PlaylistItem, 
  AudioSource, 
  AudioCacheEntry,
  AudioCacheConfig,
} from '../types/audio';

export class AudioPlaylistService {
  private playlists: Map<string, Playlist> = new Map();
  private cache: Map<string, AudioCacheEntry> = new Map();
  private cacheConfig: AudioCacheConfig = {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxEntries: 50,
    ttl: 24 * 60 * 60, // 24 hours
    preloadNext: true,
    preloadCount: 2,
    compressionEnabled: false,
    persistToStorage: true,
  };

  constructor(config?: Partial<AudioCacheConfig>) {
    if (config) {
      this.cacheConfig = { ...this.cacheConfig, ...config };
    }
    this.loadPlaylistsFromStorage();
    this.setupCacheCleanup();
  }

  // Playlist Management

  createPlaylist(name: string, description?: string): Playlist {
    const playlist: Playlist = {
      id: this.generateId(),
      name,
      description,
      items: [],
      currentIndex: -1,
      shuffle: false,
      repeat: 'none',
      createdAt: new Date(),
      updatedAt: new Date(),
      duration: 0,
      tags: [],
    };

    this.playlists.set(playlist.id, playlist);
    this.savePlaylistsToStorage();
    return playlist;
  }

  getPlaylist(id: string): Playlist | undefined {
    return this.playlists.get(id);
  }

  getAllPlaylists(): Playlist[] {
    return Array.from(this.playlists.values());
  }

  updatePlaylist(id: string, updates: Partial<Playlist>): Playlist | null {
    const playlist = this.playlists.get(id);
    if (!playlist) return null;

    const updatedPlaylist = {
      ...playlist,
      ...updates,
      updatedAt: new Date(),
    };

    this.playlists.set(id, updatedPlaylist);
    this.savePlaylistsToStorage();
    return updatedPlaylist;
  }

  deletePlaylist(id: string): boolean {
    const deleted = this.playlists.delete(id);
    if (deleted) {
      this.savePlaylistsToStorage();
    }
    return deleted;
  }

  // Playlist Items Management

  addTrackToPlaylist(playlistId: string, audioSource: AudioSource): PlaylistItem | null {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return null;

    const item: PlaylistItem = {
      id: this.generateId(),
      audioSource,
      order: playlist.items.length,
      addedAt: new Date(),
      playCount: 0,
    };

    playlist.items.push(item);
    playlist.duration = (playlist.duration || 0) + (audioSource.duration || 0);
    playlist.updatedAt = new Date();

    // Set current index if this is the first item
    if (playlist.currentIndex === -1) {
      playlist.currentIndex = 0;
    }

    this.playlists.set(playlistId, playlist);
    this.savePlaylistsToStorage();

    // Preload if enabled
    if (this.cacheConfig.preloadNext) {
      this.preloadTrack(audioSource);
    }

    return item;
  }

  removeTrackFromPlaylist(playlistId: string, itemId: string): boolean {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;

    const itemIndex = playlist.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return false;

    const removedItem = playlist.items[itemIndex];
    playlist.items.splice(itemIndex, 1);
    playlist.duration = (playlist.duration || 0) - (removedItem.audioSource.duration || 0);
    playlist.updatedAt = new Date();

    // Update order for remaining items
    playlist.items.forEach((item, index) => {
      item.order = index;
    });

    // Adjust current index if necessary
    if (playlist.currentIndex > itemIndex) {
      playlist.currentIndex--;
    } else if (playlist.currentIndex === itemIndex) {
      if (playlist.items.length === 0) {
        playlist.currentIndex = -1;
      } else if (playlist.currentIndex >= playlist.items.length) {
        playlist.currentIndex = playlist.items.length - 1;
      }
    }

    this.playlists.set(playlistId, playlist);
    this.savePlaylistsToStorage();
    return true;
  }

  reorderPlaylistItems(playlistId: string, fromIndex: number, toIndex: number): boolean {
    const playlist = this.playlists.get(playlistId);
    if (!playlist || fromIndex < 0 || toIndex < 0 || 
        fromIndex >= playlist.items.length || toIndex >= playlist.items.length) {
      return false;
    }

    const [movedItem] = playlist.items.splice(fromIndex, 1);
    playlist.items.splice(toIndex, 0, movedItem);

    // Update order for all items
    playlist.items.forEach((item, index) => {
      item.order = index;
    });

    // Adjust current index
    if (playlist.currentIndex === fromIndex) {
      playlist.currentIndex = toIndex;
    } else if (fromIndex < playlist.currentIndex && toIndex >= playlist.currentIndex) {
      playlist.currentIndex--;
    } else if (fromIndex > playlist.currentIndex && toIndex <= playlist.currentIndex) {
      playlist.currentIndex++;
    }

    playlist.updatedAt = new Date();
    this.playlists.set(playlistId, playlist);
    this.savePlaylistsToStorage();
    return true;
  }

  // Playback Navigation

  getNextTrack(playlist: Playlist): PlaylistItem | null {
    if (playlist.items.length === 0) return null;

    if (playlist.shuffle) {
      // Random track selection
      const availableIndices = playlist.items
        .map((_, index) => index)
        .filter(index => index !== playlist.currentIndex);
      
      if (availableIndices.length === 0) return null;
      
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      return playlist.items[randomIndex];
    } else {
      const nextIndex = playlist.currentIndex + 1;
      
      if (nextIndex < playlist.items.length) {
        return playlist.items[nextIndex];
      } else if (playlist.repeat === 'all') {
        return playlist.items[0];
      }
    }

    return null;
  }

  getPreviousTrack(playlist: Playlist): PlaylistItem | null {
    if (playlist.items.length === 0) return null;

    if (playlist.shuffle) {
      // For shuffle, we'd need to maintain a history of played tracks
      // For now, just return a random track
      const availableIndices = playlist.items
        .map((_, index) => index)
        .filter(index => index !== playlist.currentIndex);
      
      if (availableIndices.length === 0) return null;
      
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      return playlist.items[randomIndex];
    } else {
      const prevIndex = playlist.currentIndex - 1;
      
      if (prevIndex >= 0) {
        return playlist.items[prevIndex];
      } else if (playlist.repeat === 'all') {
        return playlist.items[playlist.items.length - 1];
      }
    }

    return null;
  }

  setCurrentTrack(playlistId: string, index: number): boolean {
    const playlist = this.playlists.get(playlistId);
    if (!playlist || index < 0 || index >= playlist.items.length) {
      return false;
    }

    playlist.currentIndex = index;
    playlist.updatedAt = new Date();
    this.playlists.set(playlistId, playlist);
    this.savePlaylistsToStorage();
    return true;
  }

  incrementPlayCount(playlistId: string, itemId: string): void {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return;

    const item = playlist.items.find(item => item.id === itemId);
    if (item) {
      item.playCount++;
      item.lastPlayed = new Date();
      playlist.updatedAt = new Date();
      this.playlists.set(playlistId, playlist);
      this.savePlaylistsToStorage();
    }
  }

  // Audio Caching

  async preloadTrack(audioSource: AudioSource): Promise<void> {
    try {
      if (this.cache.has(audioSource.id)) {
        // Update access time
        const entry = this.cache.get(audioSource.id)!;
        entry.lastAccessed = new Date();
        entry.accessCount++;
        return;
      }

      // Check cache limits
      this.enforeCacheLimits();

      const response = await fetch(audioSource.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      const cacheEntry: AudioCacheEntry = {
        id: audioSource.id,
        url: audioSource.url,
        buffer: arrayBuffer,
        size: arrayBuffer.byteLength,
        cachedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        quality: audioSource.quality,
        format: audioSource.format,
        expires: new Date(Date.now() + this.cacheConfig.ttl * 1000),
      };

      this.cache.set(audioSource.id, cacheEntry);
      
      if (this.cacheConfig.persistToStorage) {
        this.saveCacheToStorage(cacheEntry);
      }
    } catch (error) {
      console.warn('Failed to preload track:', audioSource.title, error);
    }
  }

  getCachedTrack(id: string): AudioCacheEntry | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    // Check expiration
    if (entry.expires && entry.expires < new Date()) {
      this.cache.delete(id);
      this.removeCacheFromStorage(id);
      return null;
    }

    // Update access
    entry.lastAccessed = new Date();
    entry.accessCount++;
    return entry;
  }

  clearCache(): void {
    this.cache.clear();
    if (this.cacheConfig.persistToStorage) {
      localStorage.removeItem('chordme-audio-cache');
    }
  }

  getCacheStats(): { size: number; entries: number; totalSize: number } {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });

    return {
      size: this.cache.size,
      entries: this.cache.size,
      totalSize,
    };
  }

  // Search and Filter

  searchPlaylists(query: string): Playlist[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.playlists.values()).filter(playlist =>
      playlist.name.toLowerCase().includes(lowerQuery) ||
      playlist.description?.toLowerCase().includes(lowerQuery) ||
      playlist.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  getPlaylistsByTag(tag: string): Playlist[] {
    return Array.from(this.playlists.values()).filter(playlist =>
      playlist.tags?.includes(tag)
    );
  }

  // Import/Export

  exportPlaylist(id: string): string | null {
    const playlist = this.playlists.get(id);
    if (!playlist) return null;

    return JSON.stringify({
      ...playlist,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
    }, null, 2);
  }

  importPlaylist(data: string): Playlist | null {
    try {
      const playlistData = JSON.parse(data);
      
      // Validate required fields
      if (!playlistData.name || !Array.isArray(playlistData.items)) {
        throw new Error('Invalid playlist format');
      }

      const playlist: Playlist = {
        id: this.generateId(),
        name: playlistData.name,
        description: playlistData.description,
        items: playlistData.items.map((item: any, index: number) => ({
          id: this.generateId(),
          audioSource: item.audioSource,
          order: index,
          addedAt: new Date(),
          playCount: 0,
        })),
        currentIndex: -1,
        shuffle: false,
        repeat: 'none',
        createdAt: new Date(),
        updatedAt: new Date(),
        duration: playlistData.items.reduce((total: number, item: any) => 
          total + (item.audioSource?.duration || 0), 0),
        tags: playlistData.tags || [],
      };

      this.playlists.set(playlist.id, playlist);
      this.savePlaylistsToStorage();
      return playlist;
    } catch (error) {
      console.error('Failed to import playlist:', error);
      return null;
    }
  }

  // Private Helper Methods

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private enforeCacheLimits(): void {
    // Remove expired entries
    const now = new Date();
    Array.from(this.cache.entries()).forEach(([id, entry]) => {
      if (entry.expires && entry.expires < now) {
        this.cache.delete(id);
        this.removeCacheFromStorage(id);
      }
    });

    // Enforce size limits
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });

    // Remove oldest/least accessed entries if over limits
    if (this.cache.size > this.cacheConfig.maxEntries || totalSize > this.cacheConfig.maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => {
          // Sort by access count (ascending) then by last accessed (ascending)
          if (a.accessCount !== b.accessCount) {
            return a.accessCount - b.accessCount;
          }
          return a.lastAccessed.getTime() - b.lastAccessed.getTime();
        });

      // Remove entries until we're under the limits
      for (const [id, entry] of sortedEntries) {
        if (this.cache.size <= this.cacheConfig.maxEntries && totalSize <= this.cacheConfig.maxSize) {
          break;
        }
        this.cache.delete(id);
        this.removeCacheFromStorage(id);
        totalSize -= entry.size;
      }
    }
  }

  private setupCacheCleanup(): void {
    // Clean up cache every hour
    setInterval(() => {
      this.enforeCacheLimits();
    }, 60 * 60 * 1000);
  }

  private loadPlaylistsFromStorage(): void {
    try {
      const stored = localStorage.getItem('chordme-playlists');
      if (stored) {
        const playlists = JSON.parse(stored);
        Object.entries(playlists).forEach(([id, playlist]: [string, any]) => {
          // Convert date strings back to Date objects
          playlist.createdAt = new Date(playlist.createdAt);
          playlist.updatedAt = new Date(playlist.updatedAt);
          playlist.items.forEach((item: any) => {
            item.addedAt = new Date(item.addedAt);
            if (item.lastPlayed) {
              item.lastPlayed = new Date(item.lastPlayed);
            }
          });
          this.playlists.set(id, playlist);
        });
      }
    } catch (error) {
      console.warn('Failed to load playlists from storage:', error);
    }
  }

  private savePlaylistsToStorage(): void {
    try {
      const playlistsObject = Object.fromEntries(this.playlists.entries());
      localStorage.setItem('chordme-playlists', JSON.stringify(playlistsObject));
    } catch (error) {
      console.warn('Failed to save playlists to storage:', error);
    }
  }

  private saveCacheToStorage(entry: AudioCacheEntry): void {
    try {
      // Don't store the actual buffer in localStorage (too large)
      // Just store metadata for cache management
      const cacheMetadata = {
        [entry.id]: {
          id: entry.id,
          url: entry.url,
          size: entry.size,
          cachedAt: entry.cachedAt,
          lastAccessed: entry.lastAccessed,
          accessCount: entry.accessCount,
          quality: entry.quality,
          format: entry.format,
          expires: entry.expires,
        }
      };
      
      const existing = localStorage.getItem('chordme-audio-cache-metadata');
      const metadata = existing ? JSON.parse(existing) : {};
      Object.assign(metadata, cacheMetadata);
      
      localStorage.setItem('chordme-audio-cache-metadata', JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save cache metadata to storage:', error);
    }
  }

  private removeCacheFromStorage(id: string): void {
    try {
      const existing = localStorage.getItem('chordme-audio-cache-metadata');
      if (existing) {
        const metadata = JSON.parse(existing);
        delete metadata[id];
        localStorage.setItem('chordme-audio-cache-metadata', JSON.stringify(metadata));
      }
    } catch (error) {
      console.warn('Failed to remove cache metadata from storage:', error);
    }
  }
}

// Create singleton instance
export const audioPlaylistService = new AudioPlaylistService();