import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import Header from './Header';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock hooks and dependencies
const mockUseAuth = {
  isAuthenticated: false,
  user: null,
  logout: vi.fn(),
};

const mockUseViewport = {
  isMobile: false,
};

// Mock all dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth,
}));

vi.mock('../../utils/responsive', () => ({
  useViewport: () => mockUseViewport,
}));

vi.mock('../../services/api', () => ({
  apiService: {
    setStorageBackend: vi.fn(),
    getCurrentBackend: () => 'localstorage',
    isBackendAvailable: vi.fn(() => true),
  },
}));

vi.mock('../StorageIndicator', () => ({
  default: () => <div data-testid="storage-indicator">Storage</div>,
}));

vi.mock('../StorageSettings', () => ({
  default: () => <div data-testid="storage-settings">Settings</div>,
}));

describe('Header Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(<Header />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper landmark roles', () => {
    render(<Header />);

    // Should have banner role
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Should have navigation role
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should have proper ARIA labels', () => {
    render(<Header />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');

    const homeLink = screen.getByLabelText('ChordMe homepage');
    expect(homeLink).toBeInTheDocument();
  });

  it('should have keyboard accessible mobile menu', () => {
    mockUseViewport.isMobile = true;
    render(<Header />);

    const menuButton = screen.getByLabelText(/navigation menu/i);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'main-navigation');
  });

  it('should have proper heading hierarchy', () => {
    render(<Header />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('ChordMe');
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuth.isAuthenticated = true;
      mockUseAuth.user = { email: 'test@example.com' };
    });

    it('should show user info with proper semantics', () => {
      render(<Header />);

      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('should show login and register links', () => {
      render(<Header />);

      expect(screen.getByRole('link', { name: /demo/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /sign up/i })
      ).toBeInTheDocument();
    });
  });
});
