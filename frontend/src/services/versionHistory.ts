import { apiService } from './api';

export interface SongVersion {
  id: number;
  song_id: number;
  version_number: number;
  title: string;
  content: string;
  user_id: number;
  created_at: string;
}

export interface VersionHistoryResponse {
  status: string;
  message: string;
  data: {
    versions: SongVersion[];
  };
}

export interface SingleVersionResponse {
  status: string;
  message: string;
  data: SongVersion;
}

export interface RestoreVersionResponse {
  status: string;
  message: string;
  data: {
    id: number;
    title: string;
    content: string;
    author_id: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Service for managing song version history
 */
export class VersionHistoryService {
  /**
   * Get all versions for a song
   */
  async getVersions(songId: string | number): Promise<SongVersion[]> {
    try {
      const response = await apiService.getSongVersions(songId);
      return response.data.versions;
    } catch (error) {
      console.error('Failed to fetch song versions:', error);
      throw new Error('Failed to fetch version history');
    }
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(
    songId: string | number,
    versionId: string | number
  ): Promise<SongVersion> {
    try {
      const response = await apiService.getSongVersion(songId, versionId);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch song version:', error);
      throw new Error('Failed to fetch song version');
    }
  }

  /**
   * Restore a song to a specific version
   */
  async restoreVersion(
    songId: string | number,
    versionId: string | number
  ): Promise<void> {
    try {
      await apiService.restoreSongVersion(songId, versionId);
    } catch (error) {
      console.error('Failed to restore song version:', error);
      throw new Error('Failed to restore song version');
    }
  }

  /**
   * Format a version for display in the history panel
   */
  formatVersionForDisplay(version: SongVersion): {
    title: string;
    subtitle: string;
    timestamp: string;
    content: string;
  } {
    const date = new Date(version.created_at);
    const relativeTime = this.formatRelativeTime(date);

    return {
      title: `Version ${version.version_number}`,
      subtitle: version.title,
      timestamp: relativeTime,
      content: version.content,
    };
  }

  /**
   * Format relative time for display
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

export const versionHistoryService = new VersionHistoryService();
