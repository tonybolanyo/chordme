// API service functions for interacting with the backend
import type { Song, LoginRequest, RegisterRequest, AuthResponse } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = this.getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // If we get a 401, it means the token is invalid
      if (response.status === 401 && token) {
        // Clear invalid token and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        navigateTo('login');
        throw new Error('Authentication failed. Please log in again.');
      }
      
      const errorText = await response.text();
      let errorMessage = `API Error: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use status text
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Song-related API calls (these now require authentication)
  async getSongs() {
    return this.fetchApi('/api/v1/songs');
  }

  async getSong(id: string) {
    return this.fetchApi(`/api/v1/songs/${id}`);
  }

  async createSong(songData: Partial<Song>) {
    return this.fetchApi('/api/v1/songs', {
      method: 'POST',
      body: JSON.stringify(songData),
    });
  }

  async updateSong(id: string, songData: Partial<Song>) {
    return this.fetchApi(`/api/v1/songs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(songData),
    });
  }

  async deleteSong(id: string) {
    return this.fetchApi(`/api/v1/songs/${id}`, {
      method: 'DELETE',
    });
  }

  // Authentication API calls (these don't require authentication)
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
