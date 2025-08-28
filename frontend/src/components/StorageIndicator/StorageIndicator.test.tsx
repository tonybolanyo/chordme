import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StorageIndicator from './StorageIndicator';
import { apiService } from '../../services/api';
import type { StorageBackendType } from '../../services/storagePreference';

// Mock the CSS import
vi.mock('./StorageIndicator.css', () => ({}));

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getCurrentBackend: vi.fn(),
    isBackendAvailable: vi.fn(),
  },
}));

describe('StorageIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders API backend correctly', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('api');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    render(<StorageIndicator />);

    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('🔗')).toBeInTheDocument();
    expect(screen.getByTitle('Storage: API')).toBeInTheDocument();
  });

  it('renders Firebase backend correctly', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('firebase');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    render(<StorageIndicator />);

    expect(screen.getByText('Firebase')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByTitle('Storage: Firebase')).toBeInTheDocument();
  });

  it('renders Google Drive backend correctly', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('googledrive');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    render(<StorageIndicator />);

    expect(screen.getByText('Drive')).toBeInTheDocument();
    expect(screen.getByText('📱')).toBeInTheDocument();
    expect(screen.getByTitle('Storage: Drive')).toBeInTheDocument();
  });

  it('renders Local Storage backend correctly', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('localstorage');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    render(<StorageIndicator />);

    expect(screen.getByText('Local')).toBeInTheDocument();
    expect(screen.getByText('💾')).toBeInTheDocument();
    expect(screen.getByTitle('Storage: Local')).toBeInTheDocument();
  });

  it('renders unknown backend correctly', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue(
      'unknown' as StorageBackendType
    );
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    render(<StorageIndicator />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('❓')).toBeInTheDocument();
    expect(screen.getByTitle('Storage: Unknown')).toBeInTheDocument();
  });

  it('shows warning when backend is unavailable', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('api');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(false);

    render(<StorageIndicator />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
    expect(screen.getByTitle('Storage: API (Unavailable)')).toBeInTheDocument();
  });

  it('applies unavailable class when backend is unavailable', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('firebase');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(false);

    const { container } = render(<StorageIndicator />);
    const indicator = container.querySelector('.storage-indicator');

    expect(indicator).toHaveClass('unavailable');
  });

  it('handles click when onClick prop is provided', () => {
    const mockOnClick = vi.fn();
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('api');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    const { container } = render(<StorageIndicator onClick={mockOnClick} />);
    const indicator = container.querySelector('.storage-indicator');

    expect(indicator).toHaveClass('clickable');

    fireEvent.click(indicator!);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not apply clickable class when onClick is not provided', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('api');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    const { container } = render(<StorageIndicator />);
    const indicator = container.querySelector('.storage-indicator');

    expect(indicator).not.toHaveClass('clickable');
  });

  it('applies correct color styles to icon', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('firebase');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    const { container } = render(<StorageIndicator />);
    const icon = container.querySelector('.storage-icon');

    expect(icon).toHaveStyle({ color: '#ff9500' });
  });

  it('calls apiService methods correctly', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('api');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    render(<StorageIndicator />);

    expect(apiService.getCurrentBackend).toHaveBeenCalledTimes(1);
    expect(apiService.isBackendAvailable).toHaveBeenCalledWith('api');
  });

  it('handles multiple backend states correctly', () => {
    // Test different combinations of backend and availability
    const testCases = [
      {
        backend: 'api',
        available: true,
        expectedName: 'API',
        expectedIcon: '🔗',
      },
      {
        backend: 'firebase',
        available: false,
        expectedName: 'Firebase',
        expectedIcon: '🔥',
      },
      {
        backend: 'googledrive',
        available: true,
        expectedName: 'Drive',
        expectedIcon: '📱',
      },
      {
        backend: 'localstorage',
        available: false,
        expectedName: 'Local',
        expectedIcon: '💾',
      },
    ];

    testCases.forEach(({ backend, available, expectedName, expectedIcon }) => {
      vi.mocked(apiService.getCurrentBackend).mockReturnValue(
        backend as StorageBackendType
      );
      vi.mocked(apiService.isBackendAvailable).mockReturnValue(available);

      const { unmount } = render(<StorageIndicator />);

      expect(screen.getByText(expectedName)).toBeInTheDocument();
      expect(screen.getByText(expectedIcon)).toBeInTheDocument();

      if (!available) {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      }

      unmount();
    });
  });

  it('handles edge case with null backend response', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue(
      null as unknown as StorageBackendType
    );
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(false);

    render(<StorageIndicator />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('❓')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('api');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(true);

    const { container } = render(<StorageIndicator />);
    const indicator = container.querySelector('.storage-indicator');

    expect(indicator).toHaveAttribute('title', 'Storage: API');
  });

  it('updates accessibility title for unavailable backend', () => {
    vi.mocked(apiService.getCurrentBackend).mockReturnValue('firebase');
    vi.mocked(apiService.isBackendAvailable).mockReturnValue(false);

    const { container } = render(<StorageIndicator />);
    const indicator = container.querySelector('.storage-indicator');

    expect(indicator).toHaveAttribute(
      'title',
      'Storage: Firebase (Unavailable)'
    );
  });
});
