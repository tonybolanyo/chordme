// Comprehensive tests for Firebase Email Form component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FirebaseEmailForm from './FirebaseEmailForm';

// Mock Firebase Auth service
vi.mock('../../services/firebaseAuth', () => ({
  firebaseAuthService: {
    signInWithEmailAndPassword: vi.fn(),
    signUpWithEmailAndPassword: vi.fn(),
    isAvailable: vi.fn().mockReturnValue(true),
  },
}));

// Mock Auth Context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    loginWithFirebase: vi.fn(),
  })),
}));

// Mock CSS import
vi.mock('./FirebaseAuth.css', () => ({}));

describe('FirebaseEmailForm Component', () => {
  const user = userEvent.setup();
  
  // Get references to mocked functions
  let mockSignInWithEmailAndPassword: ReturnType<typeof vi.fn> = vi.fn();
  let mockSignUpWithEmailAndPassword: ReturnType<typeof vi.fn> = vi.fn();
  let mockLoginWithFirebase: ReturnType<typeof vi.fn> = vi.fn();

  const defaultProps = {
    mode: 'login' as const,
    disabled: false,
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get references to the mocked functions
    const { firebaseAuthService } = await import('../../services/firebaseAuth');
    mockSignInWithEmailAndPassword = vi.mocked(firebaseAuthService.signInWithEmailAndPassword);
    mockSignUpWithEmailAndPassword = vi.mocked(firebaseAuthService.signUpWithEmailAndPassword);
    vi.mocked(firebaseAuthService.isAvailable).mockReturnValue(true);

    const { useAuth } = await import('../../contexts/AuthContext');
    const mockUseAuth = vi.mocked(useAuth);
    mockLoginWithFirebase = vi.fn();
    mockUseAuth.mockReturnValue({
      loginWithFirebase: mockLoginWithFirebase,
    });

    // Mock window.location.hash
    Object.defineProperty(window, 'location', {
      value: { hash: '#login' },
      writable: true,
    });
  });

  describe('Component Rendering', () => {
    it('should render email form when Firebase is available', () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sign in with firebase/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Sign in with Firebase')).toBeInTheDocument();
    });

    it('should not render anything when Firebase is not available', async () => {
      const { firebaseAuthService } = await import('../../services/firebaseAuth');
      vi.mocked(firebaseAuthService.isAvailable).mockReturnValue(false);

      const { container } = render(<FirebaseEmailForm {...defaultProps} />);

      expect(container.firstChild).toBeNull();
    });

    it('should show different text for register mode', () => {
      render(<FirebaseEmailForm {...defaultProps} mode="register" />);

      expect(screen.getByText(/sign up with firebase/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create account with firebase/i })
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/create a strong password/i)
      ).toBeInTheDocument();
    });

    it('should show different text for login mode', () => {
      render(<FirebaseEmailForm {...defaultProps} mode="login" />);

      expect(screen.getByText('Sign in with Firebase')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sign in with firebase/i })
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your password/i)
      ).toBeInTheDocument();
    });

    it('should disable form when disabled prop is true', () => {
      render(<FirebaseEmailForm {...defaultProps} disabled={true} />);

      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show error for invalid email format', async () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeInTheDocument();
      });

      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('should show error for missing email', async () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should show error for missing password', async () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('should show error for short password in register mode', async () => {
      render(<FirebaseEmailForm {...defaultProps} mode="register" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 6 characters long')
        ).toBeInTheDocument();
      });
    });

    it('should clear validation errors when input changes', async () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button');

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow - Login', () => {
    it('should handle successful login', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
        isNewUser: false,
      });

      render(<FirebaseEmailForm {...defaultProps} mode="login" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
        expect(mockLoginWithFirebase).toHaveBeenCalledWith(mockUser);
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(
          'Welcome back! You have been signed in.'
        );
      });

      // Should redirect to home
      expect(window.location.hash).toBe('');
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      render(<FirebaseEmailForm {...defaultProps} mode="login" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Invalid credentials'
        );
      });

      // Button should not be in loading state after error
      expect(screen.getByText('Sign In with Firebase')).toBeInTheDocument();
    });
  });

  describe('Authentication Flow - Register', () => {
    it('should handle successful registration', async () => {
      const mockUser = {
        uid: 'new-user-456',
        email: 'new@example.com',
        displayName: null,
        photoURL: null,
      };

      mockSignUpWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
        isNewUser: true,
      });

      render(<FirebaseEmailForm {...defaultProps} mode="register" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'new@example.com');
      await user.type(passwordInput, 'newpassword123');
      await user.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating account...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockSignUpWithEmailAndPassword).toHaveBeenCalledWith(
          'new@example.com',
          'newpassword123'
        );
        expect(mockLoginWithFirebase).toHaveBeenCalledWith(mockUser);
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(
          'Account created successfully! Welcome to ChordMe.'
        );
      });
    });

    it('should handle registration errors', async () => {
      const error = new Error('Email already in use');
      mockSignUpWithEmailAndPassword.mockRejectedValue(error);

      render(<FirebaseEmailForm {...defaultProps} mode="register" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Email already in use'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase not available during submission', async () => {
      // Firebase becomes unavailable after component renders
      mockIsAvailable.mockReturnValue(false);

      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

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

      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
        isNewUser: false,
      });

      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Authentication context is not available'
        );
      });
    });

    it('should handle unknown error types', async () => {
      const error = 'Unknown error type';
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Authentication failed'
        );
      });
    });
  });

  describe('Form State Management', () => {
    it('should manage loading state correctly', async () => {
      let resolveAuth: ((value: any) => void) | undefined;
      mockSignInWithEmailAndPassword.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAuth = resolve;
          })
      );

      render(<FirebaseEmailForm {...defaultProps} mode="login" />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Initial state
      expect(screen.getByText('Sign In with Firebase')).toBeInTheDocument();

      // Click to start authentication
      await user.click(submitButton);

      // Loading state
      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });

      // Complete authentication
      resolveAuth?.({
        user: {
          uid: 'test',
          email: 'test@example.com',
          displayName: null,
          photoURL: null,
        },
        isNewUser: false,
      });

      // Back to normal state
      await waitFor(() => {
        expect(screen.getByText('Sign In with Firebase')).toBeInTheDocument();
      });
    });

    it('should prevent multiple concurrent submissions', async () => {
      mockSignInWithEmailAndPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Click multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only call authentication once
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    });

    it('should clear form state on mode change', () => {
      const { rerender } = render(
        <FirebaseEmailForm {...defaultProps} mode="login" />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');

      rerender(<FirebaseEmailForm {...defaultProps} mode="register" />);

      // Form should be cleared
      expect(screen.getByLabelText(/email/i)).toHaveValue('');
      expect(screen.getByLabelText('Password')).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      const form = screen.getByRole('form', { hidden: true });
      expect(form).toBeInTheDocument();
    });

    it('should associate error messages with inputs', async () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const errorMessage = screen.getByText('Email is required');

        expect(emailInput).toHaveClass('error');
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', () => {
      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button');

      emailInput.focus();
      expect(emailInput).toHaveFocus();

      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(passwordInput).toHaveFocus();

      fireEvent.keyDown(passwordInput, { key: 'Tab' });
      expect(submitButton).toHaveFocus();
    });

    it('should support Enter key submission', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: {
          uid: 'test',
          email: 'test@example.com',
          displayName: null,
          photoURL: null,
        },
        isNewUser: false,
      });

      render(<FirebaseEmailForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
      });
    });
  });
});
