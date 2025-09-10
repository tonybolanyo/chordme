/**
 * Tests for the FavoritesModal component
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FavoritesModal from '../components/FavoritesModal/FavoritesModal';
import { favoritesService } from '../services/favoritesService';

// Mock the favoritesService
vi.mock('../services/favoritesService', () => ({
  favoritesService: {
    getFavoriteSongs: vi.fn(),
    getFavoriteQueries: vi.fn(),
    getSearchHistory: vi.fn(),
    getSearchPrivacySettings: vi.fn(),
    toggleSongFavorite: vi.fn(),
    saveFavoriteQuery: vi.fn(),
    deleteFavoriteQuery: vi.fn(),
    useFavoriteQuery: vi.fn(),
    clearSearchHistory: vi.fn(),
    setSearchPrivacySettings: vi.fn(),
    exportFavorites: vi.fn(),
  },
}));

// Mock URL.createObjectURL and related functions
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement and related DOM methods
const mockElement = {
  href: '',
  download: '',
  click: vi.fn(),
};

const originalCreateElement = document.createElement;
document.createElement = vi.fn((tagName) => {
  if (tagName === 'a') {
    return mockElement as HTMLAnchorElement;
  }
  return originalCreateElement(tagName);
});

const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
document.body.appendChild = mockAppendChild;
document.body.removeChild = mockRemoveChild;

describe('FavoritesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectSong: vi.fn(),
    onSelectQuery: vi.fn(),
  };

  const mockFavoriteSongs = [
    {
      id: 1,
      song_id: 1,
      title: 'Amazing Grace',
      artist: 'Traditional',
      genre: 'Hymn',
      created_at: '2023-01-01T00:00:00Z',
      favorited_at: '2023-01-02T00:00:00Z',
    },
  ];

  const mockFavoriteQueries = [
    {
      id: 'query1',
      name: 'Rock Songs',
      query: 'rock AND guitar',
      filters: { genre: 'rock' },
      created_at: '2023-01-01T00:00:00Z',
      usage_count: 5,
    },
  ];

  const mockSearchHistory = [
    {
      query: 'amazing grace',
      timestamp: Date.now(),
      results_count: 3,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (favoritesService.getFavoriteSongs as vi.MockedFunction<typeof favoritesService.getFavoriteSongs>).mockResolvedValue({
      data: { favorites: mockFavoriteSongs, total_count: 1 }
    });
    (favoritesService.getFavoriteQueries as vi.MockedFunction<typeof favoritesService.getFavoriteQueries>).mockReturnValue(mockFavoriteQueries);
    (favoritesService.getSearchHistory as vi.MockedFunction<typeof favoritesService.getSearchHistory>).mockReturnValue(mockSearchHistory);
    (favoritesService.getSearchPrivacySettings as vi.MockedFunction<typeof favoritesService.getSearchPrivacySettings>).mockReturnValue({
      clearOnExit: false,
      trackHistory: true,
    });
  });

  it('should render the modal when open', () => {
    render(<FavoritesModal {...defaultProps} />);
    
    expect(screen.getByText('Favorites & History')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<FavoritesModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Favorites & History')).not.toBeInTheDocument();
  });

  it('should display all tabs', () => {
    render(<FavoritesModal {...defaultProps} />);
    
    expect(screen.getByText(/Favorite Songs/)).toBeInTheDocument();
    expect(screen.getByText(/Saved Searches/)).toBeInTheDocument();
    expect(screen.getByText(/Search History/)).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should show favorite songs in the songs tab', async () => {
    render(<FavoritesModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
      expect(screen.getByText('Traditional')).toBeInTheDocument();
    });
  });

  it('should switch tabs when clicked', async () => {
    render(<FavoritesModal {...defaultProps} />);
    
    const queriesTab = screen.getByText(/Saved Searches/);
    fireEvent.click(queriesTab);
    
    await waitFor(() => {
      expect(screen.getByText('Rock Songs')).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', () => {
    render(<FavoritesModal {...defaultProps} />);
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose when overlay is clicked', () => {
    render(<FavoritesModal {...defaultProps} />);
    
    const overlay = screen.getByText('Favorites & History').closest('.favorites-modal-overlay');
    fireEvent.click(overlay!);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should not close when modal content is clicked', () => {
    render(<FavoritesModal {...defaultProps} />);
    
    const modal = screen.getByText('Favorites & History').closest('.favorites-modal');
    fireEvent.click(modal!);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should remove favorite song when remove button is clicked', async () => {
    (favoritesService.toggleSongFavorite as any).mockResolvedValue({
      data: { is_favorited: false }
    });
    
    render(<FavoritesModal {...defaultProps} />);
    
    await waitFor(() => {
      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);
    });
    
    expect(favoritesService.toggleSongFavorite).toHaveBeenCalledWith(1);
  });

  it('should save favorite query when form is submitted', async () => {
    render(<FavoritesModal {...defaultProps} />);
    
    // Switch to queries tab
    const queriesTab = screen.getByText(/Saved Searches/);
    fireEvent.click(queriesTab);
    
    await waitFor(() => {
      const saveButton = screen.getByText('Save Current Search');
      fireEvent.click(saveButton);
    });
    
    // Fill in form
    const nameInput = screen.getByPlaceholderText('Name for this search...');
    const queryInput = screen.getByPlaceholderText('Search query...');
    
    fireEvent.change(nameInput, { target: { value: 'New Search' } });
    fireEvent.change(queryInput, { target: { value: 'test query' } });
    
    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);
    
    expect(favoritesService.saveFavoriteQuery).toHaveBeenCalledWith(
      'New Search',
      'test query',
      {}
    );
  });

  it('should show error when form is submitted with empty fields', async () => {
    render(<FavoritesModal {...defaultProps} />);
    
    // Switch to queries tab and open form
    const queriesTab = screen.getByText(/Saved Searches/);
    fireEvent.click(queriesTab);
    
    await waitFor(() => {
      const saveButton = screen.getByText('Save Current Search');
      fireEvent.click(saveButton);
    });
    
    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name and query are required')).toBeInTheDocument();
    });
  });

  it('should clear search history when clear button is clicked', async () => {
    render(<FavoritesModal {...defaultProps} />);
    
    // Switch to history tab
    const historyTab = screen.getByText(/Search History/);
    fireEvent.click(historyTab);
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true);
    
    await waitFor(() => {
      const clearButton = screen.getByText('Clear History');
      fireEvent.click(clearButton);
    });
    
    expect(favoritesService.clearSearchHistory).toHaveBeenCalled();
  });

  it('should update privacy settings when checkboxes are changed', async () => {
    render(<FavoritesModal {...defaultProps} />);
    
    // Switch to privacy tab
    const privacyTab = screen.getByText('Privacy');
    fireEvent.click(privacyTab);
    
    await waitFor(() => {
      const clearOnExitCheckbox = screen.getByLabelText('Clear history when closing app');
      fireEvent.click(clearOnExitCheckbox);
    });
    
    expect(favoritesService.setSearchPrivacySettings).toHaveBeenCalledWith({
      clearOnExit: true,
      trackHistory: true,
    });
  });

  it('should export data when export button is clicked', async () => {
    const mockExportData = {
      export_date: '2023-01-01T00:00:00Z',
      user_id: 1,
      favorite_songs: mockFavoriteSongs,
      favorite_queries: mockFavoriteQueries,
    };
    
    (favoritesService.exportFavorites as any).mockResolvedValue(mockExportData);
    
    render(<FavoritesModal {...defaultProps} />);
    
    // Switch to export tab
    const exportTab = screen.getByText('Export');
    fireEvent.click(exportTab);
    
    await waitFor(() => {
      const exportButton = screen.getByText('Download JSON');
      fireEvent.click(exportButton);
    });
    
    expect(favoritesService.exportFavorites).toHaveBeenCalledWith('json');
    expect(mockElement.click).toHaveBeenCalled();
  });

  it('should call onSelectSong when song open button is clicked', async () => {
    render(<FavoritesModal {...defaultProps} />);
    
    await waitFor(() => {
      const openButton = screen.getByText('Open');
      fireEvent.click(openButton);
    });
    
    expect(defaultProps.onSelectSong).toHaveBeenCalledWith(1);
  });

  it('should call onSelectQuery when favorite query is used', async () => {
    (favoritesService.useFavoriteQuery as any).mockReturnValue(mockFavoriteQueries[0]);
    
    render(<FavoritesModal {...defaultProps} />);
    
    // Switch to queries tab
    const queriesTab = screen.getByText(/Saved Searches/);
    fireEvent.click(queriesTab);
    
    await waitFor(() => {
      const useButton = screen.getByText('Use');
      fireEvent.click(useButton);
    });
    
    expect(favoritesService.useFavoriteQuery).toHaveBeenCalledWith('query1');
    expect(defaultProps.onSelectQuery).toHaveBeenCalledWith(mockFavoriteQueries[0]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show empty state when no favorites exist', async () => {
    (favoritesService.getFavoriteSongs as any).mockResolvedValue({
      data: { favorites: [], total_count: 0 }
    });
    
    render(<FavoritesModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/No favorite songs yet/)).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching data', () => {
    (favoritesService.getFavoriteSongs as any).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );
    
    render(<FavoritesModal {...defaultProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});