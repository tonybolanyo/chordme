import React, { useState, useEffect } from 'react';
import { spotifyService } from '../services/spotifyService';
import type { SpotifyUserProfile } from '../types';

interface SpotifyAuthButtonProps {
  onAuthSuccess?: (profile: SpotifyUserProfile) => void;
  onAuthError?: (error: string) => void;
  className?: string;
}

export const SpotifyAuthButton: React.FC<SpotifyAuthButtonProps> = ({
  onAuthSuccess: _onAuthSuccess,
  onAuthError,
  className = '',
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check authentication status on component mount
    const checkAuthStatus = () => {
      if (spotifyService.isAuthenticated()) {
        const profile = spotifyService.getStoredUserProfile();
        if (profile) {
          setIsAuthenticated(true);
          setUserProfile(profile);
        }
      }
    };

    checkAuthStatus();
  }, []);

  const handleSignIn = async () => {
    if (!spotifyService.isConfigured()) {
      const error = 'Spotify integration is not configured. Please contact support.';
      onAuthError?.(error);
      return;
    }

    setIsLoading(true);
    try {
      await spotifyService.startAuthFlow();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start authentication';
      onAuthError?.(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await spotifyService.signOut();
      setIsAuthenticated(false);
      setUserProfile(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && userProfile) {
    return (
      <div className={`spotify-auth-container ${className}`}>
        <div className="spotify-user-info">
          <div className="user-avatar">
            {userProfile.images && userProfile.images.length > 0 ? (
              <img
                src={userProfile.images[0].url}
                alt={userProfile.display_name || 'Spotify User'}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                <span className="avatar-initials">
                  {(userProfile.display_name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">
              {userProfile.display_name || 'Spotify User'}
            </span>
            <span className="user-email">{userProfile.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="spotify-sign-out-btn"
            aria-label="Sign out of Spotify"
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`spotify-auth-container ${className}`}>
      <button
        onClick={handleSignIn}
        disabled={isLoading || !spotifyService.isConfigured()}
        className="spotify-sign-in-btn"
        aria-label="Sign in with Spotify"
      >
        <div className="spotify-btn-content">
          <svg
            className="spotify-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span className="spotify-btn-text">
            {isLoading ? 'Connecting...' : 'Connect Spotify'}
          </span>
        </div>
      </button>
      {!spotifyService.isConfigured() && (
        <p className="spotify-config-warning">
          Spotify integration is not configured
        </p>
      )}
    </div>
  );
};

export default SpotifyAuthButton;