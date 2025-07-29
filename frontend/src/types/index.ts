// Common type definitions for the ChordMe application
export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Chord {
  name: string;
  fingering: string;
  diagram?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    user?: User;
  };
  error?: string;
}
