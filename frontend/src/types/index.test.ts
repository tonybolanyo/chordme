import { describe, it, expect } from 'vitest';
import * as types from './index';

describe('Type Definitions', () => {
  it('exports all required types', () => {
    // Verify that the main types are exported correctly
    expect(typeof types).toBe('object');
    
    // Check that we can access type properties via typeof checks
    const song: types.Song = {
      id: 'test-id',
      title: 'Test Song',
      author_id: 'author-1',
      content: 'Test content',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };
    
    expect(song.id).toBe('test-id');
    expect(song.title).toBe('Test Song');
  });

  it('validates User type structure', () => {
    const user: types.User = {
      id: 'user-1',
      email: 'test@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };
    
    expect(user.id).toBe('user-1');
    expect(user.email).toBe('test@example.com');
  });

  it('validates Chord type structure', () => {
    const chord: types.Chord = {
      name: 'C',
      fingering: '0-3-2-0-1-0',
      diagram: 'chord-diagram-data',
    };
    
    expect(chord.name).toBe('C');
    expect(chord.fingering).toBe('0-3-2-0-1-0');
  });

  it('validates authentication request types', () => {
    const loginRequest: types.LoginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };
    
    const registerRequest: types.RegisterRequest = {
      email: 'test@example.com',
      password: 'password123',
    };
    
    expect(loginRequest.email).toBe('test@example.com');
    expect(registerRequest.email).toBe('test@example.com');
  });

  it('validates Google OAuth types', () => {
    const googleConfig: types.GoogleOAuth2Config = {
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['drive.readonly'],
    };
    
    const googleTokens: types.GoogleTokens = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'Bearer',
      scope: 'drive.readonly',
    };
    
    expect(googleConfig.clientId).toBe('test-client-id');
    expect(googleTokens.access_token).toBe('access-token');
  });

  it('validates Drive file types', () => {
    const driveFile: types.DriveFile = {
      id: 'file-id',
      name: 'test-file.txt',
      mimeType: 'text/plain',
      modifiedTime: '2023-01-01T00:00:00Z',
      size: '1024',
      webViewLink: 'https://drive.google.com/file/d/file-id/view',
      parents: ['parent-folder-id'],
    };
    
    const driveFileList: types.DriveFileList = {
      files: [driveFile],
      nextPageToken: 'next-page-token',
      incompleteSearch: false,
    };
    
    expect(driveFile.id).toBe('file-id');
    expect(driveFileList.files).toHaveLength(1);
  });
});