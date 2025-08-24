import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AuthCallback from './AuthCallback';

// Mock the Google OAuth service
vi.mock('../../services/googleOAuth', () => ({
  googleOAuth2Service: {
    handleAuthCallback: vi.fn(),
  },
}));

import { googleOAuth2Service } from '../../services/googleOAuth';

// Mock window.location
const mockLocation = {
  search: '',
  hash: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockLocation.hash = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('renders loading state initially', () => {
      render(<AuthCallback />);
      
      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      expect(screen.getByText('Processing authentication...')).toBeInTheDocument();
    });

    it('displays loading spinner', () => {
      render(<AuthCallback />);
      
      const spinner = screen.getByText('Authenticating...').previousElementSibling;
      expect(spinner).toHaveStyle({
        width: '40px',
        height: '40px',
        borderRadius: '50%',
      });
    });
  });

  describe('Successful Authentication', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockLocation.search = '?code=test-auth-code';
      vi.mocked(googleOAuth2Service.handleAuthCallback).mockResolvedValue({
        userInfo: { name: 'John Doe', email: 'john@example.com' },
        tokens: { access_token: 'token123' },
      });
    });

    it('processes successful authentication', async () => {
      render(<AuthCallback />);
      
      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Welcome, John Doe!/)).toBeInTheDocument();
      expect(screen.getByText(/You are now connected to Google Drive/)).toBeInTheDocument();
    });

    it('calls handleAuthCallback with correct code', async () => {
      render(<AuthCallback />);
      
      await waitFor(() => {
        expect(googleOAuth2Service.handleAuthCallback).toHaveBeenCalledWith('test-auth-code');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles OAuth error parameter', async () => {
      mockLocation.search = '?error=access_denied';
      
      render(<AuthCallback />);
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Authentication failed: access_denied/)).toBeInTheDocument();
    });

    it('handles missing authorization code', async () => {
      mockLocation.search = '?state=test-state';
      
      render(<AuthCallback />);
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/No authorization code received/)).toBeInTheDocument();
    });

    it('handles authentication service error', async () => {
      mockLocation.search = '?code=test-code';
      vi.mocked(googleOAuth2Service.handleAuthCallback).mockRejectedValue(new Error('Service unavailable'));
      
      render(<AuthCallback />);
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Authentication failed: Service unavailable/)).toBeInTheDocument();
    });

    it('shows try again button on error', async () => {
      mockLocation.search = '?error=access_denied';
      
      render(<AuthCallback />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
    });

    it('handles try again button click', async () => {
      const user = userEvent.setup();
      mockLocation.search = '?error=access_denied';
      
      render(<AuthCallback />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: 'Try Again' }));
      
      expect(window.location.hash).toBe('');
    });
  });

  describe('Visual Design', () => {
    it('applies correct container styles', () => {
      render(<AuthCallback />);
      
      const container = screen.getByText('Authenticating...').closest('div').parentElement;
      expect(container).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '20px',
        textAlign: 'center',
      });
    });

    it('includes spinner animation styles', () => {
      render(<AuthCallback />);
      
      const styleElement = document.querySelector('style');
      expect(styleElement?.textContent).toContain('@keyframes spin');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      render(<AuthCallback />);
      
      expect(screen.getByRole('heading', { level: 2, name: /Authenticating/ })).toBeInTheDocument();
    });
  });
});