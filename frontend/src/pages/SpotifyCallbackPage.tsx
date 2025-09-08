import React, { useEffect, useState } from 'react';
import { spotifyService } from '../services/spotifyService';
import type { SpotifyUserProfile } from '../types';

interface SpotifyCallbackPageProps {
  onAuthSuccess?: (profile: SpotifyUserProfile) => void;
  onAuthError?: (error: string) => void;
}

export const SpotifyCallbackPage: React.FC<SpotifyCallbackPageProps> = ({
  onAuthSuccess,
  onAuthError,
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Spotify authentication...');
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code and state from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        // Check for OAuth errors
        if (error) {
          let errorMessage = 'Authentication failed';
          
          switch (error) {
            case 'access_denied':
              errorMessage = 'You denied access to your Spotify account';
              break;
            case 'invalid_request':
              errorMessage = 'Invalid authentication request';
              break;
            case 'unauthorized_client':
              errorMessage = 'Unauthorized client application';
              break;
            case 'unsupported_response_type':
              errorMessage = 'Unsupported response type';
              break;
            case 'invalid_scope':
              errorMessage = 'Invalid scope requested';
              break;
            case 'server_error':
              errorMessage = 'Spotify server error occurred';
              break;
            case 'temporarily_unavailable':
              errorMessage = 'Spotify service temporarily unavailable';
              break;
            default:
              errorMessage = `Authentication error: ${error}`;
          }
          
          setStatus('error');
          setMessage(errorMessage);
          onAuthError?.(errorMessage);
          return;
        }

        // Check if authorization code is present
        if (!code) {
          const errorMessage = 'No authorization code received from Spotify';
          setStatus('error');
          setMessage(errorMessage);
          onAuthError?.(errorMessage);
          return;
        }

        // Exchange authorization code for tokens
        const authResponse = await spotifyService.handleAuthCallback(code, state || undefined);
        
        setStatus('success');
        setMessage('Successfully connected to Spotify!');
        setUserProfile(authResponse.userProfile);
        onAuthSuccess?.(authResponse.userProfile);

        // Redirect to the main app after a short delay
        setTimeout(() => {
          // Try to get the return URL from session storage or default to home
          const returnUrl = sessionStorage.getItem('spotifyAuthReturnUrl') || '/';
          sessionStorage.removeItem('spotifyAuthReturnUrl');
          window.location.href = returnUrl;
        }, 2000);

      } catch (error) {
        console.error('Spotify auth callback error:', error);
        
        let errorMessage = 'Failed to complete authentication';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        setStatus('error');
        setMessage(errorMessage);
        onAuthError?.(errorMessage);
      }
    };

    handleCallback();
  }, [onAuthSuccess, onAuthError]);

  const handleRetry = () => {
    // Clear any stored authentication state and try again
    sessionStorage.removeItem('spotifyCodeVerifier');
    sessionStorage.removeItem('spotifyState');
    localStorage.removeItem('spotifyTokens');
    localStorage.removeItem('spotifyUserProfile');
    
    // Redirect to main app where user can try authentication again
    window.location.href = '/';
  };

  const handleReturnToApp = () => {
    const returnUrl = sessionStorage.getItem('spotifyAuthReturnUrl') || '/';
    sessionStorage.removeItem('spotifyAuthReturnUrl');
    window.location.href = returnUrl;
  };

  return (
    <div className="spotify-callback-page">
      <div className="callback-container">
        <div className="callback-content">
          {/* Spotify logo and branding */}
          <div className="spotify-branding">
            <svg
              className="spotify-logo"
              viewBox="0 0 24 24"
              width="48"
              height="48"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <h1>Spotify Authentication</h1>
          </div>

          {/* Status indicator */}
          <div className={`status-indicator status-${status}`}>
            {status === 'loading' && (
              <div className="loading-spinner" aria-label="Loading">
                <div className="spinner"></div>
              </div>
            )}
            
            {status === 'success' && (
              <div className="success-icon" aria-label="Success">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm-2 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"/>
                </svg>
              </div>
            )}
            
            {status === 'error' && (
              <div className="error-icon" aria-label="Error">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm1 17h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Status message */}
          <div className="status-message">
            <p className="message-text">{message}</p>
            
            {status === 'success' && userProfile && (
              <div className="user-welcome">
                <p>Welcome, {userProfile.display_name || 'Spotify User'}!</p>
                <p className="redirect-notice">You will be redirected shortly...</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="callback-actions">
            {status === 'error' && (
              <>
                <button 
                  onClick={handleRetry}
                  className="retry-button"
                  aria-label="Try authentication again"
                >
                  Try Again
                </button>
                <button 
                  onClick={handleReturnToApp}
                  className="return-button"
                  aria-label="Return to application"
                >
                  Return to App
                </button>
              </>
            )}
            
            {status === 'success' && (
              <button 
                onClick={handleReturnToApp}
                className="continue-button"
                aria-label="Continue to application"
              >
                Continue to App
              </button>
            )}
          </div>

          {/* Troubleshooting help */}
          {status === 'error' && (
            <div className="troubleshooting">
              <details>
                <summary>Troubleshooting</summary>
                <div className="troubleshooting-content">
                  <p>If you're having trouble connecting to Spotify:</p>
                  <ul>
                    <li>Make sure you're signed in to your Spotify account</li>
                    <li>Check that pop-ups are enabled for this site</li>
                    <li>Try clearing your browser's cache and cookies</li>
                    <li>Ensure your browser supports modern JavaScript features</li>
                    <li>If the problem persists, contact support</li>
                  </ul>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotifyCallbackPage;