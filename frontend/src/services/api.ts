// API service functions for interacting with the backend
import type {
  Song,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  // User, // removed as it is unused
} from '../types';
import { isTokenExpired } from '../utils/jwt';
import { firebaseService } from './firebase';
import { firestoreService } from './firestore';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class ApiService {
  /**
   * Determine if we should use Firebase/Firestore or the Flask backend
   */
  private shouldUseFirebase(): boolean {
    return firebaseService.isEnabled();
  }

  /**
   * Get current user ID from authentication
   */
  private getCurrentUserId(): string | null {
    const user = localStorage.getItem('authUser');
    if (!user) return null;
    
    try {
      const parsedUser = JSON.parse(user);
      return parsedUser.id;
    } catch {
      return null;
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = this.getAuthToken();

    // Check if token is expired before making the request
    if (token && isTokenExpired(token)) {
      console.log('Token has expired, clearing authentication data');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.hash = 'login';
      throw new Error('Your session has expired. Please log in again.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
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
        window.location.hash = 'login';
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
    if (this.shouldUseFirebase()) {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated for Firebase operations');
      }
      
      try {
        const songs = await firestoreService.getSongs(userId);
        return {
          status: 'success',
          data: { songs }
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch songs from Firebase');
      }
    }
    
    return this.fetchApi('/api/v1/songs');
  }

  async getSong(id: string) {
    if (this.shouldUseFirebase()) {
      try {
        const song = await firestoreService.getSong(id);
        if (!song) {
          throw new Error('Song not found');
        }
        return {
          status: 'success',
          data: { song }
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch song from Firebase');
      }
    }
    
    return this.fetchApi(`/api/v1/songs/${id}`);
  }

  async createSong(songData: Partial<Song>) {
    if (this.shouldUseFirebase()) {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated for Firebase operations');
      }
      
      try {
        const song = await firestoreService.createSong(songData, userId);
        return {
          status: 'success',
          data: { song }
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to create song in Firebase');
      }
    }
    
    return this.fetchApi('/api/v1/songs', {
      method: 'POST',
      body: JSON.stringify(songData),
    });
  }

  async updateSong(id: string, songData: Partial<Song>) {
    if (this.shouldUseFirebase()) {
      try {
        const song = await firestoreService.updateSong(id, songData);
        return {
          status: 'success',
          data: { song }
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to update song in Firebase');
      }
    }
    
    return this.fetchApi(`/api/v1/songs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(songData),
    });
  }

  async deleteSong(id: string) {
    if (this.shouldUseFirebase()) {
      try {
        await firestoreService.deleteSong(id);
        return {
          status: 'success',
          message: 'Song deleted successfully'
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to delete song from Firebase');
      }
    }
    
    return this.fetchApi(`/api/v1/songs/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadSong(id: string): Promise<void> {
    if (this.shouldUseFirebase()) {
      // For Firebase, we'll implement a simple download by fetching the song content
      try {
        const song = await firestoreService.getSong(id);
        if (!song) {
          throw new Error('Song not found');
        }
        
        // Create a blob with the song content
        const blob = new Blob([song.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.cho`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to download song from Firebase');
      }
    }
    
    // Original Flask backend implementation
    const token = this.getAuthToken();

    // Check if token is expired before making the request
    if (token && isTokenExpired(token)) {
      console.log('Token has expired, clearing authentication data');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.hash = 'login';
      throw new Error('Your session has expired. Please log in again.');
    }

    const headers: Record<string, string> = {};

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/songs/${id}/download`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      // If we get a 401, it means the token is invalid
      if (response.status === 401 && token) {
        // Clear invalid token and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.hash = 'login';
        throw new Error('Authentication failed. Please log in again.');
      }

      const errorText = await response.text();
      let errorMessage = `Download failed: ${response.statusText}`;

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

    // Get the filename from the Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'song.cho'; // default filename

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create a blob from the response
    const blob = await response.blob();

    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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

  // Utility methods
  
  /**
   * Get information about the current data source
   */
  getDataSourceInfo() {
    return {
      source: this.shouldUseFirebase() ? 'firebase' : 'api',
      isFirebaseEnabled: firebaseService.isInitialized(),
      isFirebaseConfigured: firebaseService.isEnabled(),
    };
  }
}

export const apiService = new ApiService();
