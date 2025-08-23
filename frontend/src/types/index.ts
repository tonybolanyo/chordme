// Common type definitions for the ChordMe application
export interface Song {
  id: string;
  title: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Chord {
  name: string;
  fingering: string;
  diagram?: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
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
  status: string;
  message: string;
  data?: {
    token?: string;
    user?: User;
  };
  error?: string;
}

// Google OAuth2 types
export interface GoogleOAuth2Config {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAuthResponse {
  tokens: GoogleTokens;
  userInfo: GoogleUserInfo;
}

// Google Drive file types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}
