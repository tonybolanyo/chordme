import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleAuthButton } from './GoogleAuthButton';
import { googleOAuth2Service } from '../../services/googleOAuth';
import type { GoogleUserInfo } from '../../types';

// Mock the Google OAuth service
vi.mock('../../services/googleOAuth', () => ({
  googleOAuth2Service: {
    isAuthenticated: vi.fn(),
    getStoredUserInfo: vi.fn(),
    startAuthFlow: vi.fn(),
    signOut: vi.fn(),
  },
}));

const mockGoogleService = vi.mocked(googleOAuth2Service);

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('When not authenticated', () => {
    beforeEach(() => {
      mockGoogleService.isAuthenticated.mockReturnValue(false);
      mockGoogleService.getStoredUserInfo.mockReturnValue(null);
    });

    it('should render sign in button', () => {
      render(<GoogleAuthButton />);

      expect(
        screen.getByRole('button', { name: /sign in with google/i })
      ).toBeInTheDocument();
    });

    it('should show loading state when starting auth flow', async () => {
      mockGoogleService.startAuthFlow.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<GoogleAuthButton />);

      const signInButton = screen.getByRole('button', {
        name: /sign in with google/i,
      });
      fireEvent.click(signInButton);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    it('should call startAuthFlow when sign in button is clicked', async () => {
      render(<GoogleAuthButton />);

      const signInButton = screen.getByRole('button', {
        name: /sign in with google/i,
      });
      fireEvent.click(signInButton);

      expect(mockGoogleService.startAuthFlow).toHaveBeenCalledTimes(1);
    });

    it('should call onAuthError when startAuthFlow fails', async () => {
      const onAuthError = vi.fn();
      const errorMessage = 'Authentication failed';

      mockGoogleService.startAuthFlow.mockRejectedValue(
        new Error(errorMessage)
      );

      render(<GoogleAuthButton onAuthError={onAuthError} />);

      const signInButton = screen.getByRole('button', {
        name: /sign in with google/i,
      });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(onAuthError).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should be disabled when disabled prop is true', () => {
      render(<GoogleAuthButton disabled />);

      const signInButton = screen.getByRole('button', {
        name: /sign in with google/i,
      });
      expect(signInButton).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(<GoogleAuthButton className="custom-class" />);

      const signInButton = screen.getByRole('button', {
        name: /sign in with google/i,
      });
      expect(signInButton).toHaveClass('custom-class');
    });
  });

  describe('When authenticated', () => {
    const mockUserInfo: GoogleUserInfo = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/picture.jpg',
    };

    beforeEach(() => {
      mockGoogleService.isAuthenticated.mockReturnValue(true);
      mockGoogleService.getStoredUserInfo.mockReturnValue(mockUserInfo);
    });

    it('should render user info and sign out button', () => {
      render(<GoogleAuthButton />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sign out/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Test User' })).toHaveAttribute(
        'src',
        mockUserInfo.picture
      );
    });

    it('should render without user picture when not provided', () => {
      const userWithoutPicture = { ...mockUserInfo, picture: undefined };
      mockGoogleService.getStoredUserInfo.mockReturnValue(userWithoutPicture);

      render(<GoogleAuthButton />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should call signOut when sign out button is clicked', async () => {
      mockGoogleService.signOut.mockResolvedValue();

      render(<GoogleAuthButton />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      expect(mockGoogleService.signOut).toHaveBeenCalledTimes(1);
    });

    it('should show loading state when signing out', async () => {
      mockGoogleService.signOut.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<GoogleAuthButton />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      expect(screen.getByText('Signing out...')).toBeInTheDocument();
    });

    it('should handle sign out error', async () => {
      const onAuthError = vi.fn();
      const errorMessage = 'Sign out failed';

      mockGoogleService.signOut.mockRejectedValue(new Error(errorMessage));

      render(<GoogleAuthButton onAuthError={onAuthError} />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(onAuthError).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should be disabled when disabled prop is true', () => {
      render(<GoogleAuthButton disabled />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      expect(signOutButton).toBeDisabled();
    });

    it('should update state after successful sign out', async () => {
      mockGoogleService.signOut.mockResolvedValue();

      render(<GoogleAuthButton />);

      // Initially authenticated
      expect(screen.getByText('Test User')).toBeInTheDocument();

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /sign in with google/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onAuthSuccess when provided (though not used in current implementation)', () => {
      const onAuthSuccess = vi.fn();

      render(<GoogleAuthButton onAuthSuccess={onAuthSuccess} />);

      // This test ensures the prop is accepted, even though it's not currently used
      // in the component implementation since auth success is handled via redirect
      expect(onAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<GoogleAuthButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should have proper alt text for user avatar', () => {
      const mockUserInfo: GoogleUserInfo = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
      };

      mockGoogleService.isAuthenticated.mockReturnValue(true);
      mockGoogleService.getStoredUserInfo.mockReturnValue(mockUserInfo);

      render(<GoogleAuthButton />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('alt', 'Test User');
    });
  });
});
