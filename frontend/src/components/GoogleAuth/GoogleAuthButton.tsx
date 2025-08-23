import React, { useState, useEffect } from 'react';
import { googleOAuth2Service } from '../../services/googleOAuth';
import type { GoogleUserInfo } from '../../types';

interface GoogleAuthButtonProps {
  onAuthSuccess?: (userInfo: GoogleUserInfo) => void;
  onAuthError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  // onAuthSuccess is kept for future use but not currently needed since auth is handled via redirect
  // onAuthSuccess,
  onAuthError,
  className = '',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);

  useEffect(() => {
    // Check if already authenticated
    const authenticated = googleOAuth2Service.isAuthenticated();
    setIsAuthenticated(authenticated);
    
    if (authenticated) {
      const storedUserInfo = googleOAuth2Service.getStoredUserInfo();
      setUserInfo(storedUserInfo);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await googleOAuth2Service.startAuthFlow();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      onAuthError?.(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await googleOAuth2Service.signOut();
      setIsAuthenticated(false);
      setUserInfo(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && userInfo) {
    return (
      <div className={`google-auth-container ${className}`}>
        <div className="google-user-info">
          <div className="user-details">
            {userInfo.picture && (
              <img
                src={userInfo.picture}
                alt={userInfo.name}
                className="user-avatar"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  marginRight: '8px',
                }}
              />
            )}
            <span className="user-name">{userInfo.name}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={disabled || isLoading}
            type="button"
            className="sign-out-button"
            style={{
              marginLeft: '12px',
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'white',
              cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
              opacity: disabled || isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={disabled || isLoading}
      type="button"
      className={`google-sign-in-button ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 16px',
        border: '1px solid #dadce0',
        borderRadius: '4px',
        background: 'white',
        color: '#3c4043',
        fontSize: '14px',
        fontWeight: '500',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: 'box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <svg
        style={{ marginRight: '8px' }}
        width="18"
        height="18"
        viewBox="0 0 18 18"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#000" fillRule="evenodd">
          <path
            d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"
            fill="#EA4335"
          />
          <path
            d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
            fill="#4285F4"
          />
          <path
            d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
            fill="#FBBC05"
          />
          <path
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"
            fill="#34A853"
          />
        </g>
      </svg>
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
};