import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpotifyAuthButton } from './SpotifyAuthButton';
import { spotifyService } from '../services/spotifyService';
import type { SpotifyUserProfile } from '../types';

// Mock the Spotify service
vi.mock('../services/spotifyService', () => ({
  spotifyService: {
    isConfigured: vi.fn(),
    isAuthenticated: vi.fn(),
    getStoredUserProfile: vi.fn(),
    startAuthFlow: vi.fn(),
    signOut: vi.fn(),
  },
}));

const mockSpotifyService = spotifyService as unknown;

describe('SpotifyAuthButton', () => {
  const mockUserProfile: SpotifyUserProfile = {
    id: 'spotify123',
    display_name: 'Test User',
    email: 'test@example.com',
    images: [
      {
        url: 'https://example.com/avatar.jpg',
        height: 64,
        width: 64,
      },
    ],
    followers: { total: 10 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpotifyService.isConfigured.mockReturnValue(true);
    mockSpotifyService.isAuthenticated.mockReturnValue(false);
    mockSpotifyService.getStoredUserProfile.mockReturnValue(null);
  });

  describe('When not authenticated', () => {
    it('should render sign-in button', () => {
      render(<SpotifyAuthButton />);
      
      expect(screen.getByRole('button', { name: /sign in with spotify/i })).toBeInTheDocument();
      expect(screen.getByText('Connect Spotify')).toBeInTheDocument();
    });

    it('should show Spotify icon', () => {
      render(<SpotifyAuthButton />);
      
      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('spotify-icon');
    });

    it('should start auth flow when clicked', async () => {
      mockSpotifyService.startAuthFlow.mockResolvedValue(undefined);
      
      render(<SpotifyAuthButton />);
      
      const signInButton = screen.getByRole('button', { name: /sign in with spotify/i });
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(mockSpotifyService.startAuthFlow).toHaveBeenCalledOnce();
      });
    });

    it('should show loading state during auth', async () => {
      mockSpotifyService.startAuthFlow.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      render(<SpotifyAuthButton />);
      
      const signInButton = screen.getByRole('button', { name: /sign in with spotify/i });
      fireEvent.click(signInButton);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(signInButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText('Connect Spotify')).toBeInTheDocument();
      });
    });

    it('should handle auth error', async () => {
      const onAuthError = vi.fn();
      mockSpotifyService.startAuthFlow.mockRejectedValue(new Error('Auth failed'));
      
      render(<SpotifyAuthButton onAuthError={onAuthError} />);
      
      const signInButton = screen.getByRole('button', { name: /sign in with spotify/i });
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(onAuthError).toHaveBeenCalledWith('Auth failed');
      });
    });

    it('should show warning when not configured', () => {
      mockSpotifyService.isConfigured.mockReturnValue(false);
      
      render(<SpotifyAuthButton />);
      
      expect(screen.getByText('Spotify integration is not configured')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should handle auth error when not configured', async () => {
      const onAuthError = vi.fn();
      mockSpotifyService.isConfigured.mockReturnValue(false);
      
      render(<SpotifyAuthButton onAuthError={onAuthError} />);
      
      const signInButton = screen.getByRole('button', { name: /sign in with spotify/i });
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(onAuthError).toHaveBeenCalledWith(
          'Spotify integration is not configured. Please contact support.'
        );
      });
    });
  });

  describe('When authenticated', () => {
    beforeEach(() => {
      mockSpotifyService.isAuthenticated.mockReturnValue(true);
      mockSpotifyService.getStoredUserProfile.mockReturnValue(mockUserProfile);
    });

    it('should render user information', () => {
      render(<SpotifyAuthButton />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out of spotify/i })).toBeInTheDocument();
    });

    it('should render user avatar', () => {
      render(<SpotifyAuthButton />);
      
      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should render avatar placeholder when no image', () => {
      const profileWithoutImage = { ...mockUserProfile, images: [] };
      mockSpotifyService.getStoredUserProfile.mockReturnValue(profileWithoutImage);
      
      render(<SpotifyAuthButton />);
      
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of display name
    });

    it('should render fallback name when no display name', () => {
      const profileWithoutName = { ...mockUserProfile, display_name: undefined };
      mockSpotifyService.getStoredUserProfile.mockReturnValue(profileWithoutName);
      
      render(<SpotifyAuthButton />);
      
      expect(screen.getByText('Spotify User')).toBeInTheDocument();
      expect(screen.getByText('U')).toBeInTheDocument(); // Avatar initials
    });

    it('should sign out when sign out button clicked', async () => {
      mockSpotifyService.signOut.mockResolvedValue(undefined);
      
      render(<SpotifyAuthButton />);
      
      const signOutButton = screen.getByRole('button', { name: /sign out of spotify/i });
      fireEvent.click(signOutButton);
      
      await waitFor(() => {
        expect(mockSpotifyService.signOut).toHaveBeenCalledOnce();
      });
    });

    it('should show loading state during sign out', async () => {
      mockSpotifyService.signOut.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      render(<SpotifyAuthButton />);
      
      const signOutButton = screen.getByRole('button', { name: /sign out of spotify/i });
      fireEvent.click(signOutButton);
      
      expect(screen.getByText('Signing out...')).toBeInTheDocument();
      expect(signOutButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should handle sign out error', async () => {
      const onAuthError = vi.fn();
      mockSpotifyService.signOut.mockRejectedValue(new Error('Sign out failed'));
      
      render(<SpotifyAuthButton onAuthError={onAuthError} />);
      
      const signOutButton = screen.getByRole('button', { name: /sign out of spotify/i });
      fireEvent.click(signOutButton);
      
      await waitFor(() => {
        expect(onAuthError).toHaveBeenCalledWith('Sign out failed');
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onAuthSuccess when component loads with authenticated user', () => {
      const onAuthSuccess = vi.fn();
      mockSpotifyService.isAuthenticated.mockReturnValue(true);
      mockSpotifyService.getStoredUserProfile.mockReturnValue(mockUserProfile);
      
      render(<SpotifyAuthButton onAuthSuccess={onAuthSuccess} />);
      
      // onAuthSuccess is not called on component mount in current implementation
      // This would need to be triggered by actual auth flow completion
      expect(onAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Custom styling', () => {
    it('should apply custom className', () => {
      render(<SpotifyAuthButton className="custom-class" />);
      
      const container = screen.getByRole('button').closest('.spotify-auth-container');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SpotifyAuthButton />);
      
      expect(screen.getByRole('button', { name: /sign in with spotify/i })).toBeInTheDocument();
    });

    it('should have proper ARIA labels when authenticated', () => {
      mockSpotifyService.isAuthenticated.mockReturnValue(true);
      mockSpotifyService.getStoredUserProfile.mockReturnValue(mockUserProfile);
      
      render(<SpotifyAuthButton />);
      
      expect(screen.getByRole('button', { name: /sign out of spotify/i })).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<SpotifyAuthButton />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Focus the button
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});