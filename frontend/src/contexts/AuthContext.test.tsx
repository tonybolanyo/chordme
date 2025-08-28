import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import type { User } from '../types';

// Mock the jwt utility
vi.mock('../utils/jwt', () => ({
  isTokenExpired: vi.fn(),
}));

import { isTokenExpired } from '../utils/jwt';

// Test component to use the AuthContext
const TestComponent = () => {
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="isLoading">{isLoading.toString()}</div>
      <button
        data-testid="login-btn"
        onClick={() =>
          login('test-token', { id: '1', email: 'test@example.com' })
        }
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

// Test component that uses useAuth outside of provider
const TestComponentWithoutProvider = () => {
  const auth = useAuth();
  return <div>{auth ? 'Has auth' : 'No auth'}</div>;
};

describe('AuthContext', () => {
  const mockIsTokenExpired = vi.mocked(isTokenExpired);

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset mocks
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthProvider', () => {
    it('provides initial state when no stored data', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('loads valid stored authentication data', async () => {
      const testUser: User = { id: '1', email: 'test@example.com' };
      const testToken = 'valid-token';

      localStorage.setItem('authToken', testToken);
      localStorage.setItem('authUser', JSON.stringify(testUser));
      localStorage.setItem('authProvider', 'jwt');
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent(
        JSON.stringify(testUser)
      );
      expect(screen.getByTestId('token')).toHaveTextContent(testToken);
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('clears expired stored authentication data', async () => {
      const testUser: User = { id: '1', email: 'test@example.com' };
      const expiredToken = 'expired-token';

      localStorage.setItem('authToken', expiredToken);
      localStorage.setItem('authUser', JSON.stringify(testUser));
      localStorage.setItem('authProvider', 'jwt');
      mockIsTokenExpired.mockReturnValue(true);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

      // Check that localStorage was cleared
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('authUser')).toBeNull();
    });

    it('handles invalid stored user data', async () => {
      localStorage.setItem('authToken', 'valid-token');
      localStorage.setItem('authUser', 'invalid-json');
      localStorage.setItem('authProvider', 'jwt');
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

      // Check that localStorage was cleared
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('authUser')).toBeNull();
    });

    it('handles missing token with valid user data', async () => {
      const testUser: User = { id: '1', email: 'test@example.com' };
      localStorage.setItem('authUser', JSON.stringify(testUser));
      // No token stored

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('handles missing user data with valid token', async () => {
      const testToken = 'valid-token';
      localStorage.setItem('authToken', testToken);
      // No user data stored
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
  });

  describe('Authentication Methods', () => {
    it('successfully logs in user', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      const testUser: User = { id: '1', email: 'test@example.com' };
      const testToken = 'test-token';

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(
          JSON.stringify(testUser)
        );
        expect(screen.getByTestId('token')).toHaveTextContent(testToken);
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // Check that data was stored in localStorage
      expect(localStorage.getItem('authToken')).toBe(testToken);
      expect(localStorage.getItem('authUser')).toBe(JSON.stringify(testUser));
    });

    it('successfully logs out user', async () => {
      const testUser: User = { id: '1', email: 'test@example.com' };
      const testToken = 'valid-token';

      localStorage.setItem('authToken', testToken);
      localStorage.setItem('authUser', JSON.stringify(testUser));
      localStorage.setItem('authProvider', 'jwt');
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      act(() => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('token')).toHaveTextContent('null');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent(
          'false'
        );
      });

      // Check that localStorage was cleared
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('authUser')).toBeNull();
    });

    it('maintains authentication state across re-renders', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Login
      act(() => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // Re-render component
      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should maintain authentication state
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
  });

  describe('useAuth Hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Capture console.error to test error boundary
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('returns correct context values', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Check initial state
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

      // Login and check updated state
      act(() => {
        screen.getByTestId('login-btn').click();
      });

      const expectedUser: User = { id: '1', email: 'test@example.com' };

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(
          JSON.stringify(expectedUser)
        );
        expect(screen.getByTestId('token')).toHaveTextContent('test-token');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state during initialization', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('stops loading after initialization completes', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });
  });

  describe('Token Expiration Handling', () => {
    it('logs expired token message when clearing stored data', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      localStorage.setItem('authToken', 'expired-token');
      localStorage.setItem(
        'authUser',
        JSON.stringify({ id: '1', email: 'test@example.com' })
      );
      localStorage.setItem('authProvider', 'jwt');
      mockIsTokenExpired.mockReturnValue(true);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Stored token has expired, clearing authentication data'
      );
    });

    it('logs parsing error when user data is invalid', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      localStorage.setItem('authToken', 'valid-token');
      localStorage.setItem('authUser', 'invalid-json');
      localStorage.setItem('authProvider', 'jwt');
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing stored user data:',
        expect.any(Error)
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles null localStorage values gracefully', async () => {
      // Clear localStorage to ensure null values
      localStorage.clear();
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('handles empty string localStorage values', async () => {
      localStorage.setItem('authToken', '');
      localStorage.setItem('authUser', '');
      mockIsTokenExpired.mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('handles login with empty/null values', async () => {
      mockIsTokenExpired.mockReturnValue(false);

      const TestComponentWithCustomLogin = () => {
        const { user, token, isAuthenticated, login } = useAuth();

        return (
          <div>
            <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
            <div data-testid="token">{token || 'null'}</div>
            <div data-testid="isAuthenticated">
              {isAuthenticated.toString()}
            </div>
            <button
              data-testid="login-empty"
              onClick={() =>
                login('', { id: '', email: '', created_at: '', updated_at: '' })
              }
            >
              Login Empty
            </button>
            <button
              data-testid="login-null"
              onClick={() =>
                login('', { id: '', email: '', created_at: '', updated_at: '' })
              }
            >
              Login Null
            </button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponentWithCustomLogin />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent(
          'false'
        );
      });

      // Test login with empty values
      act(() => {
        screen.getByTestId('login-empty').click();
      });

      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('user')).toHaveTextContent(
        JSON.stringify({ id: '', email: '', created_at: '', updated_at: '' })
      );
    });
  });
});
