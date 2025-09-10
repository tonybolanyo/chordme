/**
 * AdvancedFilterPanel Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedFilterPanel from '../AdvancedFilterPanel';
import { FilterProvider } from '../../contexts/FilterContext';
import { songSearchService } from '../../services/songSearchService';

// Mock the search service
jest.mock('../../services/songSearchService', () => ({
  songSearchService: {
    getFilterPresets: jest.fn(),
    createFilterPreset: jest.fn(),
    searchSongs: jest.fn(),
  }
}));

const mockSearchService = songSearchService as jest.Mocked<typeof songSearchService>;

// Define the type for filter presets
interface FilterPreset {
  id: number;
  name: string;
  description: string;
  filter_config: Record<string, unknown>;
  is_public: boolean;
  is_shared: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  user_id: number;
}

// Mock filter presets
const mockPresets = [
  {
    id: 1,
    name: 'Rock Songs',
    description: 'Rock genre songs',
    filter_config: { genre: 'Rock', difficulty: 'intermediate' },
    is_public: true,
    is_shared: false,
    usage_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 1
  },
  {
    id: 2,
    name: 'Beginner Songs',
    description: 'Easy songs for beginners',
    filter_config: { difficulty: 'beginner', maxTempo: 100 },
    is_public: false,
    is_shared: true,
    usage_count: 12,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    user_id: 1
  }
];

function renderWithProvider(props: Partial<{ isOpen: boolean; onClose: () => void; onSearch: (results: FilterPreset[]) => void }> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSearch: jest.fn(),
    ...props
  };

  return render(
    <FilterProvider>
      <AdvancedFilterPanel {...defaultProps} />
    </FilterProvider>
  );
}

describe('AdvancedFilterPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchService.getFilterPresets.mockResolvedValue(mockPresets);
    mockSearchService.searchSongs.mockResolvedValue({
      results: [],
      total_count: 0,
      search_time_ms: 100,
      query_info: {
        original_query: '',
        parsed_query: {
          original: '',
          phrases: [],
          and_terms: [],
          or_terms: [],
          not_terms: [],
          has_operators: false
        },
        filters_applied: {}
      }
    });
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      renderWithProvider();
      
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
      expect(screen.getByText('Filter Presets')).toBeInTheDocument();
      expect(screen.getByText('Search Query')).toBeInTheDocument();
      expect(screen.getByText('Basic Filters')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderWithProvider({ isOpen: false });
      
      expect(screen.queryByText('Advanced Filters')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      renderWithProvider();
      
      expect(screen.getByRole('button', { name: 'Close filters' })).toBeInTheDocument();
    });
  });

  describe('Filter Presets', () => {
    it('should load and display available presets', async () => {
      renderWithProvider();
      
      await waitFor(() => {
        expect(screen.getByText('Rock Songs (Public)')).toBeInTheDocument();
      });
      
      const presetSelect = screen.getByRole('combobox', { name: /select a preset/i });
      expect(presetSelect).toBeInTheDocument();
    });

    it('should load preset when selected', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      await waitFor(() => {
        expect(screen.getByText('Rock Songs (Public)')).toBeInTheDocument();
      });
      
      const presetSelect = screen.getByRole('combobox', { name: /select a preset/i });
      await user.selectOptions(presetSelect, '1');
      
      await waitFor(() => {
        expect(screen.getByText('Using preset: Rock Songs')).toBeInTheDocument();
      });
    });

    it('should show save preset button when filters are active', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Set a filter
      const genreSelect = screen.getByLabelText('Genre:');
      await user.selectOptions(genreSelect, 'Rock');
      
      await waitFor(() => {
        expect(screen.getByText('Save as Preset')).toBeInTheDocument();
      });
    });
  });

  describe('Basic Filters', () => {
    it('should render all basic filter controls', () => {
      renderWithProvider();
      
      expect(screen.getByLabelText('Genre:')).toBeInTheDocument();
      expect(screen.getByLabelText('Key:')).toBeInTheDocument();
      expect(screen.getByLabelText('Difficulty:')).toBeInTheDocument();
      expect(screen.getByLabelText('Time Signature:')).toBeInTheDocument();
      expect(screen.getByLabelText('Language:')).toBeInTheDocument();
    });

    it('should update filters when values change', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const genreSelect = screen.getByLabelText('Genre:');
      await user.selectOptions(genreSelect, 'Rock');
      
      expect(genreSelect).toHaveValue('Rock');
    });

    it('should handle tempo range inputs', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const minTempoInput = screen.getByLabelText('Min:');
      const maxTempoInput = screen.getByLabelText('Max:');
      
      await user.type(minTempoInput, '80');
      await user.type(maxTempoInput, '120');
      
      expect(minTempoInput).toHaveValue(80);
      expect(maxTempoInput).toHaveValue(120);
    });
  });

  describe('Search Query', () => {
    it('should render search input', () => {
      renderWithProvider();
      
      const searchInput = screen.getByPlaceholderText('Search songs, artists, lyrics...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search query on input', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const searchInput = screen.getByPlaceholderText('Search songs, artists, lyrics...');
      await user.type(searchInput, 'amazing grace');
      
      expect(searchInput).toHaveValue('amazing grace');
    });

    it('should show search tips', () => {
      renderWithProvider();
      
      expect(screen.getByText(/Use quotes for exact phrases/)).toBeInTheDocument();
    });
  });

  describe('Tags and Categories', () => {
    it('should render tag and category inputs', () => {
      renderWithProvider();
      
      expect(screen.getByLabelText('Tags (comma-separated):')).toBeInTheDocument();
      expect(screen.getByLabelText('Categories (comma-separated):')).toBeInTheDocument();
    });

    it('should handle comma-separated values', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const tagsInput = screen.getByLabelText('Tags (comma-separated):');
      await user.type(tagsInput, 'worship, acoustic, fingerpicking');
      
      expect(tagsInput).toHaveValue('worship, acoustic, fingerpicking');
    });
  });

  describe('Date Range Filtering', () => {
    it('should render date range controls', () => {
      renderWithProvider();
      
      expect(screen.getByLabelText('Date Field:')).toBeInTheDocument();
      expect(screen.getByLabelText('From:')).toBeInTheDocument();
      expect(screen.getByLabelText('To:')).toBeInTheDocument();
    });

    it('should handle date field selection', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const dateFieldSelect = screen.getByLabelText('Date Field:');
      await user.selectOptions(dateFieldSelect, 'updated_at');
      
      expect(dateFieldSelect).toHaveValue('updated_at');
    });

    it('should handle date inputs', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const fromDateInput = screen.getByLabelText('From:');
      const toDateInput = screen.getByLabelText('To:');
      
      await user.type(fromDateInput, '2024-01-01');
      await user.type(toDateInput, '2024-12-31');
      
      expect(fromDateInput).toHaveValue('2024-01-01');
      expect(toDateInput).toHaveValue('2024-12-31');
    });
  });

  describe('Filter Logic', () => {
    it('should render combine mode options', () => {
      renderWithProvider();
      
      expect(screen.getByText('AND (all filters must match)')).toBeInTheDocument();
      expect(screen.getByText('OR (any filter can match)')).toBeInTheDocument();
    });

    it('should update combine mode', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const orOption = screen.getByRole('radio', { name: /OR \(any filter can match\)/ });
      await user.click(orOption);
      
      expect(orOption).toBeChecked();
    });
  });

  describe('Filter Actions', () => {
    it('should render action buttons', () => {
      renderWithProvider();
      
      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
      expect(screen.getByText('Search Songs')).toBeInTheDocument();
    });

    it('should clear filters when clear button clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Set a filter first
      const genreSelect = screen.getByLabelText('Genre:');
      await user.selectOptions(genreSelect, 'Rock');
      
      // Clear filters
      const clearButton = screen.getByText('Clear All Filters');
      await user.click(clearButton);
      
      expect(genreSelect).toHaveValue('');
    });

    it('should execute search when search button clicked', async () => {
      const user = userEvent.setup();
      const onSearch = jest.fn();
      renderWithProvider({ onSearch });
      
      const searchButton = screen.getByText('Search Songs');
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(mockSearchService.searchSongs).toHaveBeenCalled();
      });
    });
  });

  describe('Preset Creation Modal', () => {
    it('should open preset modal when save button clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Set a filter to enable save button
      const genreSelect = screen.getByLabelText('Genre:');
      await user.selectOptions(genreSelect, 'Rock');
      
      await waitFor(() => {
        expect(screen.getByText('Save as Preset')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save as Preset');
      await user.click(saveButton);
      
      expect(screen.getByText('Save Filter Preset')).toBeInTheDocument();
      expect(screen.getByLabelText('Preset Name:')).toBeInTheDocument();
    });

    it('should create preset when modal form submitted', async () => {
      const user = userEvent.setup();
      mockSearchService.createFilterPreset.mockResolvedValue({
        id: 3,
        name: 'Test Preset',
        description: 'Test description',
        filter_config: { genre: 'Rock' },
        is_public: false,
        is_shared: false,
        usage_count: 0,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        user_id: 1
      });
      
      renderWithProvider();
      
      // Set a filter and open modal
      const genreSelect = screen.getByLabelText('Genre:');
      await user.selectOptions(genreSelect, 'Rock');
      
      const saveButton = screen.getByText('Save as Preset');
      await user.click(saveButton);
      
      // Fill modal form
      const nameInput = screen.getByLabelText('Preset Name:');
      const descriptionInput = screen.getByLabelText('Description (optional):');
      
      await user.type(nameInput, 'Test Preset');
      await user.type(descriptionInput, 'Test description');
      
      const submitButton = screen.getByText('Save Preset');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSearchService.createFilterPreset).toHaveBeenCalledWith({
          name: 'Test Preset',
          description: 'Test description',
          filter_config: expect.objectContaining({ genre: 'Rock' }),
          is_public: false
        });
      });
    });
  });

  describe('Filter Summary', () => {
    it('should show filter summary when filters are active', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const genreSelect = screen.getByLabelText('Genre:');
      await user.selectOptions(genreSelect, 'Rock');
      
      await waitFor(() => {
        expect(screen.getByText('Active Filters:')).toBeInTheDocument();
        expect(screen.getByText(/Genre: Rock/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProvider();
      
      expect(screen.getByRole('button', { name: 'Close filters' })).toBeInTheDocument();
      expect(screen.getByLabelText('Genre:')).toBeInTheDocument();
      expect(screen.getByLabelText('Key:')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      await user.tab();
      
      // Should be able to tab to the first input
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Search songs, artists, lyrics...'));
    });
  });

  describe('Loading States', () => {
    it('should show loading state during search', async () => {
      const user = userEvent.setup();
      
      // Mock delayed search
      mockSearchService.searchSongs.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_info: {
            original_query: '',
            parsed_query: {
              original: '',
              phrases: [],
              and_terms: [],
              or_terms: [],
              not_terms: [],
              has_operators: false
            },
            filters_applied: {}
          }
        }), 100))
      );
      
      renderWithProvider();
      
      const searchButton = screen.getByText('Search Songs');
      await user.click(searchButton);
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Search Songs')).toBeInTheDocument();
      });
    });
  });
});