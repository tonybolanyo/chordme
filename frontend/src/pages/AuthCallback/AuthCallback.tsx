import React, { useEffect, useState } from 'react';
import { googleOAuth2Service } from '../../services/googleOAuth';

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        // const state = urlParams.get('state'); // Future use for CSRF validation

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        // Exchange code for tokens
        const authResponse = await googleOAuth2Service.handleAuthCallback(code);
        
        setStatus('success');
        setMessage(`Welcome, ${authResponse.userInfo.name}! You are now connected to Google Drive.`);

        // Redirect to home page after successful authentication
        setTimeout(() => {
          window.location.hash = '';
        }, 2000);

      } catch (error) {
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setMessage(`Authentication failed: ${errorMessage}`);
      }
    };

    handleCallback();
  }, []);

  const handleRetry = () => {
    window.location.hash = '';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '20px',
      textAlign: 'center',
    }}>
      <div style={{
        maxWidth: '500px',
        padding: '40px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #4285f4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>Authenticating...</h2>
            <p style={{ color: '#666' }}>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#4caf50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h2 style={{ color: '#4caf50', marginBottom: '10px' }}>Success!</h2>
            <p style={{ color: '#666' }}>{message}</p>
            <p style={{ color: '#999', fontSize: '14px', marginTop: '15px' }}>
              Redirecting you back to the application...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#f44336',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
            <h2 style={{ color: '#f44336', marginBottom: '10px' }}>Authentication Failed</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>{message}</p>
            <button
              onClick={handleRetry}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;