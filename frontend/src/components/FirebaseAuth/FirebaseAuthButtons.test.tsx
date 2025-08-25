// Comprehensive tests for Firebase Auth UI components
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FirebaseAuthButtons from './FirebaseAuthButtons';

// Mock Firebase Auth service
vi.mock('../../services/firebaseAuth', () => ({
  firebaseAuthService: {
    signInWithGoogle: vi.fn(),
    isAvailable: vi.fn(),
  },
}));

// Mock Auth Context
vi.mock('../../contexts/AuthContext', () => ({
  default: {
    useAuth: vi.fn(() => ({
      loginWithFirebase: vi.fn(),
    })),
  },
}));

// Mock CSS import
vi.mock('./FirebaseAuth.css', () => ({}));

describe('FirebaseAuthButtons Component', () => {
  const defaultProps = {
    mode: 'login' as const,
    disabled: false,
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get the mocked services and set default returns
    const { firebaseAuthService } = require('../../services/firebaseAuth');
    vi.mocked(firebaseAuthService.isAvailable).mockReturnValue(true);
    
    // Mock window.location.hash
    Object.defineProperty(window, 'location', {
      value: { hash: '#login' },
      writable: true,
    });
  });

  describe('Component Rendering', () => {
    it('should render Google sign-in button when Firebase is available', () => {
      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should not render anything when Firebase is not available', () => {
      mockIsAvailable.mockReturnValue(false);
      
      const { container } = render(<FirebaseAuthButtons {...defaultProps} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should show Google logo in the button', () => {
      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
    });

    it('should disable button when disabled prop is true', () => {
      render(<FirebaseAuthButtons {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Google Sign-In Flow', () => {
    it('should handle successful Google sign-in for existing user', async () => {
      const mockUser = {
        uid: 'google-uid',
        email: 'test@gmail.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      mockSignInWithGoogle.mockResolvedValue({
        user: mockUser,
        isNewUser: false,
      });

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
        expect(mockLoginWithFirebase).toHaveBeenCalledWith(mockUser);
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(
          'Welcome back! You have been signed in.'
        );
      });

      // Should redirect to home
      expect(window.location.hash).toBe('');
    });

    it('should handle successful Google sign-in for new user', async () => {
      const mockUser = {
        uid: 'new-google-uid',
        email: 'new@gmail.com',
        displayName: 'New User',
        photoURL: null,
      };

      mockSignInWithGoogle.mockResolvedValue({
        user: mockUser,
        isNewUser: true,
      });

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(
          'Welcome! Your account has been created successfully.'
        );
      });
    });

    it('should handle Google sign-in errors', async () => {
      const error = new Error('Google sign-in failed');
      mockSignInWithGoogle.mockRejectedValue(error);

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Google sign-in failed');
      });

      // Button should not be in loading state after error
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('should handle popup blocked error', async () => {
      const error = { 
        code: 'auth/popup-blocked',
        message: 'Popup blocked' 
      };
      mockSignInWithGoogle.mockRejectedValue(error);

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Pop-up was blocked by your browser. Please allow pop-ups and try again'
        );
      });
    });

    it('should prevent multiple concurrent sign-in attempts', async () => {
      mockSignInWithGoogle.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only call sign-in once
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase not available during sign-in', async () => {
      // Firebase becomes unavailable after component renders
      mockIsAvailable.mockReturnValue(false);

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Firebase authentication is not available'
        );
      });
    });

    it('should handle missing auth context', async () => {
      mockUseAuth.mockReturnValue(null);

      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      mockSignInWithGoogle.mockResolvedValue({
        user: mockUser,
        isNewUser: false,
      });

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Authentication context is not available'
        );
      });
    });

    it('should handle unknown error types', async () => {
      const error = 'Unknown error type';
      mockSignInWithGoogle.mockRejectedValue(error);

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Google sign-in failed');
      });
    });
  });

  describe('Component State Management', () => {
    it('should manage loading state correctly', async () => {
      let resolveSignIn: ((value: any) => void) | undefined;
      mockSignInWithGoogle.mockImplementation(() => 
        new Promise(resolve => { resolveSignIn = resolve; })
      );

      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Initial state
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      
      // Click to start sign-in
      fireEvent.click(button);
      
      // Loading state
      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
      
      // Complete sign-in
      resolveSignIn?.({
        user: { uid: 'test', email: 'test@example.com', displayName: null, photoURL: null },
        isNewUser: false,
      });
      
      // Back to normal state
      await waitFor(() => {
        expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      });
    });

    it('should handle mode prop variations', () => {
      const { rerender } = render(<FirebaseAuthButtons {...defaultProps} mode="login" />);
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();

      rerender(<FirebaseAuthButtons {...defaultProps} mode="register" />);
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should be keyboard accessible', () => {
      render(<FirebaseAuthButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });

    it('should properly disable button when disabled', () => {
      render(<FirebaseAuthButtons {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      fireEvent.click(button);
      expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    });
  });
});