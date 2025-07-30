import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../Header';

// Mock AuthContext
const mockLogout = vi.fn();
const mockAuthContext = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: mockLogout,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default title', () => {
    render(<Header />);
    expect(screen.getByText('ChordMe')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<Header title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('shows login and register links when not authenticated', () => {
    render(<Header />);
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('shows navigation links when authenticated', () => {
    // Update mock to simulate authenticated state
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = { id: 1, email: 'test@example.com' };
    
    render(<Header />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    // Update mock to simulate authenticated state
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = { id: 1, email: 'test@example.com' };
    
    render(<Header />);
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('title links to home', () => {
    render(<Header />);
    
    const titleLink = screen.getByText('ChordMe').closest('a');
    expect(titleLink).toHaveAttribute('href', '#home');
  });
});