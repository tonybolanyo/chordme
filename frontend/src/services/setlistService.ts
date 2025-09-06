/**
 * Setlist Service for ChordMe API communication
 */

import {
  Setlist,
  SetlistSong,
  SetlistTemplate,
  SetlistCollaborator,
  SetlistPerformance,
  CreateSetlistRequest,
  UpdateSetlistRequest,
  AddSongToSetlistRequest,
  UpdateSetlistSongRequest,
  ReorderSongsRequest,
  SetlistSearchParams,
  SetlistSearchResult,
  BulkAddSongsRequest,
  SetlistAnalysis,
  Song
} from '../types/setlist';

class SetlistService {
  private baseURL = '/api/v1/setlists';

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Core setlist operations
  async getSetlists(params: SetlistSearchParams = {}): Promise<SetlistSearchResult> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.makeRequest<SetlistSearchResult>(endpoint);
  }

  async getSetlist(
    id: string, 
    options: {
      include_songs?: boolean;
      include_versions?: boolean;
      include_collaborators?: boolean;
      include_performances?: boolean;
    } = {}
  ): Promise<Setlist> {
    const searchParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, 'true');
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/${id}${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<Setlist>(endpoint);
  }

  async createSetlist(data: CreateSetlistRequest): Promise<Setlist> {
    return this.makeRequest<Setlist>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSetlist(id: string, data: UpdateSetlistRequest): Promise<Setlist> {
    return this.makeRequest<Setlist>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSetlist(id: string): Promise<void> {
    await this.makeRequest<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateSetlist(id: string, name?: string): Promise<Setlist> {
    return this.makeRequest<Setlist>(`/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Song management
  async addSongToSetlist(
    setlistId: string, 
    data: AddSongToSetlistRequest
  ): Promise<SetlistSong> {
    return this.makeRequest<SetlistSong>(`/${setlistId}/songs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSetlistSong(
    setlistId: string,
    songId: string,
    data: UpdateSetlistSongRequest
  ): Promise<SetlistSong> {
    return this.makeRequest<SetlistSong>(`/${setlistId}/songs/${songId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async removeSetlistSong(setlistId: string, songId: string): Promise<void> {
    await this.makeRequest<void>(`/${setlistId}/songs/${songId}`, {
      method: 'DELETE',
    });
  }

  async reorderSongs(setlistId: string, data: ReorderSongsRequest): Promise<void> {
    await this.makeRequest<void>(`/${setlistId}/songs/reorder`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async bulkAddSongs(
    setlistId: string, 
    data: BulkAddSongsRequest
  ): Promise<SetlistSong[]> {
    return this.makeRequest<SetlistSong[]>(`/${setlistId}/songs/bulk`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Templates
  async getTemplates(): Promise<SetlistTemplate[]> {
    return this.makeRequest<SetlistTemplate[]>('/templates');
  }

  async getTemplate(id: string): Promise<SetlistTemplate> {
    return this.makeRequest<SetlistTemplate>(`/templates/${id}`);
  }

  async createTemplate(data: Omit<SetlistTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SetlistTemplate> {
    return this.makeRequest<SetlistTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSetlistFromTemplate(templateId: string, data: CreateSetlistRequest): Promise<Setlist> {
    return this.makeRequest<Setlist>(`/templates/${templateId}/create-setlist`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Collaboration
  async getCollaborators(setlistId: string): Promise<SetlistCollaborator[]> {
    return this.makeRequest<SetlistCollaborator[]>(`/${setlistId}/collaborators`);
  }

  async addCollaborator(
    setlistId: string,
    email: string,
    permissionLevel: string
  ): Promise<SetlistCollaborator> {
    return this.makeRequest<SetlistCollaborator>(`/${setlistId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ email, permission_level: permissionLevel }),
    });
  }

  async updateCollaboratorPermission(
    setlistId: string,
    collaboratorId: string,
    permissionLevel: string
  ): Promise<SetlistCollaborator> {
    return this.makeRequest<SetlistCollaborator>(`/${setlistId}/collaborators/${collaboratorId}`, {
      method: 'PUT',
      body: JSON.stringify({ permission_level: permissionLevel }),
    });
  }

  async removeCollaborator(setlistId: string, collaboratorId: string): Promise<void> {
    await this.makeRequest<void>(`/${setlistId}/collaborators/${collaboratorId}`, {
      method: 'DELETE',
    });
  }

  // Performance tracking
  async getPerformances(setlistId: string): Promise<SetlistPerformance[]> {
    return this.makeRequest<SetlistPerformance[]>(`/${setlistId}/performances`);
  }

  async recordPerformance(
    setlistId: string,
    data: Omit<SetlistPerformance, 'id' | 'setlist_id' | 'created_at' | 'updated_at'>
  ): Promise<SetlistPerformance> {
    return this.makeRequest<SetlistPerformance>(`/${setlistId}/performances`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Analytics and analysis
  async getSetlistAnalysis(setlistId: string): Promise<SetlistAnalysis> {
    return this.makeRequest<SetlistAnalysis>(`/${setlistId}/analysis`);
  }

  // Search functionality
  async searchSongs(query: string, filters?: {
    tags?: string[];
    key?: string;
    tempo_min?: number;
    tempo_max?: number;
    duration_min?: number;
    duration_max?: number;
    limit?: number;
  }): Promise<Song[]> {
    const searchParams = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }

    return this.makeRequest<Song[]>(`/songs/search?${searchParams.toString()}`);
  }

  async getPublicSetlists(params: SetlistSearchParams = {}): Promise<SetlistSearchResult> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/public${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<SetlistSearchResult>(endpoint);
  }

  // Utility methods
  async exportSetlist(setlistId: string, format: 'pdf' | 'txt' | 'chordpro'): Promise<Blob> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseURL}/${setlistId}/export?format=${format}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async validateSetlist(setlistId: string): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    return this.makeRequest<{
      isValid: boolean;
      warnings: string[];
      errors: string[];
    }>(`/${setlistId}/validate`);
  }
}

// Export singleton instance
export const setlistService = new SetlistService();
export default setlistService;