import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from './Register';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    register: vi.fn(),
  },
}));

import { apiService } from '../../services/api';

const mockApiService = vi.mocked(apiService);

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders registration form', () => {
      render(<Register />);

      expect(
        screen.getByRole('heading', { name: 'Join ChordMe' })
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create Account' })
      ).toBeInTheDocument();
    });

    it('has correct input types', () => {
      render(<Register />);

      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText('Password')).toHaveAttribute(
        'type',
        'password'
      );
      expect(screen.getByLabelText('Confirm Password')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('has proper form structure', () => {
      render(<Register />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', {
        name: 'Create Account',
      });

      // Fill in valid passwords but invalid email
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(emailInput, 'not-an-email');
      await user.click(submitButton);

      // The main behavior we want to test is that API is not called with invalid email
      expect(mockApiService.register).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', {
        name: 'Create Account',
      });

      // Enter short password
      await user.type(passwordInput, '123');
      await user.click(submitButton);

      expect(
        screen.getByText('Password must be at least 8 characters long')
      ).toBeInTheDocument();
      expect(mockApiService.register).not.toHaveBeenCalled();
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', {
        name: 'Create Account',
      });

      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'different123');
      await user.click(submitButton);

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(mockApiService.register).not.toHaveBeenCalled();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const submitButton = screen.getByRole('button', {
        name: 'Create Account',
      });

      // Submit with empty form
      await user.click(submitButton);

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(mockApiService.register).not.toHaveBeenCalled();
    });

    it('clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', {
        name: 'Create Account',
      });

      // Trigger validation error
      await user.click(submitButton);
      expect(screen.getByText('Email is required')).toBeInTheDocument();

      // Start typing - error should clear
      await user.type(emailInput, 'test@example.com');
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  describe('Successful Registration', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();

      mockApiService.register.mockResolvedValue({
        status: 'success',
        data: {
          message:
            'Registration successful! Please check your email to verify your account.',
        },
      });

      render(<Register />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', {
        name: 'Create Account',
      });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiService.register).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!',
        });
      });
    });

    it('displays success message after registration', async () => {
      const user = userEvent.setup();
      const successMessage =
        'Registration successful! Please check your email to verify your account.';

      mockApiService.register.mockResolvedValue({
        status: 'success',
        message: successMessage,
        data: {},
      });

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!'
      );
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Registration successful! You can now sign in with your account.'
          )
        ).toBeInTheDocument();
      });
    });

    it('clears form after successful registration', async () => {
      const user = userEvent.setup();

      mockApiService.register.mockResolvedValue({
        status: 'success',
        message: 'Registration successful!',
        data: {},
      });

      render(<Register />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
        expect(confirmPasswordInput).toHaveValue('');
      });
    });
  });

  describe('Registration Errors', () => {
    it('displays API error message', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already exists';

      mockApiService.register.mockResolvedValue({
        status: 'error',
        error: errorMessage,
      });

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!'
      );
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('displays generic error for unknown errors', async () => {
      const user = userEvent.setup();

      mockApiService.register.mockRejectedValue('Unknown error');

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!'
      );
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'An error occurred during registration. Please try again.'
          )
        ).toBeInTheDocument();
      });
    });

    it('handles API error response format', async () => {
      const user = userEvent.setup();

      mockApiService.register.mockResolvedValue({
        status: 'error',
        error: 'Validation failed',
      });

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!'
      );
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state during registration', async () => {
      const user = userEvent.setup();

      // Create a promise that we can control
      let resolvePromise: (value: {
        status: string;
        data?: unknown;
        error?: string;
      }) => void;
      const registrationPromise = new Promise<{
        status: string;
        data?: unknown;
        error?: string;
      }>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiService.register.mockReturnValue(registrationPromise);

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!'
      );
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      // Check loading state
      expect(
        screen.getByRole('button', { name: 'Creating account...' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Creating account...' })
      ).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        status: 'success',
        message: 'Success!',
        data: {},
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Create Account' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Create Account' })
        ).not.toBeDisabled();
      });
    });

    it('disables form during registration', async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: {
        status: string;
        data?: unknown;
        error?: string;
      }) => void;
      const registrationPromise = new Promise<{
        status: string;
        data?: unknown;
        error?: string;
      }>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiService.register.mockReturnValue(registrationPromise);

      render(<Register />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      // Check that inputs are disabled during loading
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();

      resolvePromise!({ status: 'success', message: 'Success!', data: {} });

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
        expect(confirmPasswordInput).not.toBeDisabled();
      });
    });
  });

  describe('User Interactions', () => {
    it('handles form field changes', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'mypassword');
      await user.type(confirmPasswordInput, 'mypassword');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('mypassword');
      expect(confirmPasswordInput).toHaveValue('mypassword');
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Register />);

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText('Email')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Password')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Confirm Password')).toHaveFocus();

      await user.tab();
      expect(
        screen.getByRole('button', { name: 'Create Account' })
      ).toHaveFocus();
    });

    it('submits form on Enter key', async () => {
      const user = userEvent.setup();

      mockApiService.register.mockResolvedValue({
        status: 'success',
        message: 'Success!',
        data: {},
      });

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!{enter}'
      );

      await waitFor(() => {
        expect(mockApiService.register).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in email', async () => {
      const user = userEvent.setup();

      mockApiService.register.mockResolvedValue({
        status: 'success',
        message: 'Success!',
        data: {},
      });

      render(<Register />);

      const specialEmail = 'test+special@example-domain.co.uk';

      await user.type(screen.getByLabelText('Email'), specialEmail);
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!'
      );
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(mockApiService.register).toHaveBeenCalledWith({
          email: specialEmail,
          password: 'Password123!',
        });
      });
    });

    it('handles very long passwords', async () => {
      const user = userEvent.setup();
      // Create a long valid password with all required character types
      const longPassword = 'Password123!'.repeat(8); // 96 characters, contains all required types

      mockApiService.register.mockResolvedValue({
        status: 'success',
        message: 'Success!',
        data: {},
      });

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), longPassword);
      await user.type(screen.getByLabelText('Confirm Password'), longPassword);
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(mockApiService.register).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: longPassword,
        });
      });
    });

    it('trims whitespace from email', async () => {
      const user = userEvent.setup();

      mockApiService.register.mockResolvedValue({
        status: 'success',
        message: 'Success!',
        data: {},
      });

      render(<Register />);

      await user.type(screen.getByLabelText('Email'), '  test@example.com  ');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(
        screen.getByLabelText('Confirm Password'),
        'Password123!'
      );
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(mockApiService.register).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!',
        });
      });
    });
  });
});
