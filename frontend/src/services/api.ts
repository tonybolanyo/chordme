// API service functions for interacting with the backend
import type { Song, LoginRequest, RegisterRequest, AuthResponse } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class ApiService {
  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Song-related API calls
  async getSongs() {
    return this.fetchApi('/api/songs');
  }

  async getSong(id: string) {
    return this.fetchApi(`/api/songs/${id}`);
  }

  async createSong(songData: Partial<Song>) {
    return this.fetchApi('/api/songs', {
      method: 'POST',
      body: JSON.stringify(songData),
    });
  }

  async updateSong(id: string, songData: Partial<Song>) {
    return this.fetchApi(`/api/songs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(songData),
    });
  }

  async deleteSong(id: string) {
    return this.fetchApi(`/api/songs/${id}`, {
      method: 'DELETE',
    });
  }

  // Authentication API calls
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.fetchApi('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.fetchApi('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }
}

export const apiService = new ApiService();
