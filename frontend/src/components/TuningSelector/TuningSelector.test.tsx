/**
 * Tests for TuningSelector component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TuningSelector } from './TuningSelector';
import { tuningService } from '../../services/tuningService';
import { TuningInfo } from '../../types/tuning';

// Mock the tuning service
vi.mock('../../services/tuningService');

const mockTuningService = vi.mocked(tuningService);

describe('TuningSelector', () => {
  const mockOnTuningChange = vi.fn();
  
  const mockStandardTuning: TuningInfo = {
    id: 'guitar_standard',
    name: 'Standard Tuning',
    description: 'The most common guitar tuning',
    preset: 'standard',
    instrument: 'guitar',
    notes: ['E', 'A', 'D', 'G', 'B', 'E'],
    semitoneOffsets: [0, 0, 0, 0, 0, 0],
    isStandard: true,
    difficulty: 'easy',
    genres: ['rock', 'pop'],
    localization: {
      names: { en: 'Standard Tuning' },
      descriptions: { en: 'The most common guitar tuning' }
    },
    metadata: {
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      isCustom: false,
      isVerified: true,
      popularityScore: 1.0
    }
  };

  const mockDropDTuning: TuningInfo = {
    id: 'guitar_drop_d',
    name: 'Drop D',
    description: 'Lower the low E string to D',
    preset: 'drop_d',
    instrument: 'guitar',
    notes: ['D', 'A', 'D', 'G', 'B', 'E'],
    semitoneOffsets: [-2, 0, 0, 0, 0, 0],
    isStandard: false,
    difficulty: 'easy',
    genres: ['metal', 'rock'],
    artists: ['Foo Fighters'],
    localization: {
      names: { en: 'Drop D' },
      descriptions: { en: 'Lower the low E string to D' }
    },
    metadata: {
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      isCustom: false,
      isVerified: true,
      popularityScore: 0.8
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTuningService.getAllTunings.mockReturnValue([
      mockStandardTuning,
      mockDropDTuning
    ]);
    
    mockTuningService.suggestTunings.mockReturnValue([
      {
        tuning: mockDropDTuning,
        reason: 'Good for rock music',
        confidence: 85,
        benefits: ['Easier power chords', 'Popular in rock'],
        challenges: ['Need to retune']
      }
    ]);
    
    mockTuningService.getStandardTuning.mockReturnValue(mockStandardTuning);
  });

  it('renders loading state initially', async () => {
    // Mock the service to return a promise that resolves after a delay
    mockTuningService.getAllTunings.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve([mockStandardTuning, mockDropDTuning]), 100);
      });
    });

    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    // Should show loading initially
    expect(screen.getByText('Loading tunings...')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Standard Tuning')).toBeInTheDocument();
    });
  });

  it('displays available tunings after loading', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Standard Tuning')).toBeInTheDocument();
      expect(screen.getByText('Drop D')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows current tuning when provided', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        currentTuning={mockStandardTuning}
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Current Tuning')).toBeInTheDocument();
    });
  });

  it('displays tuning suggestions when enabled', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
        showSuggestions={true}
        genre="rock"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Suggested Tunings')).toBeInTheDocument();
      expect(screen.getByText('Good for rock music')).toBeInTheDocument();
    });
  });

  it('calls onTuningChange when a tuning is selected', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Drop D')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Drop D'));

    expect(mockOnTuningChange).toHaveBeenCalledWith(mockDropDTuning);
  });

  it('filters tunings based on search term', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Standard Tuning')).toBeInTheDocument();
      expect(screen.getByText('Drop D')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tunings...');
    fireEvent.change(searchInput, { target: { value: 'drop' } });

    await waitFor(() => {
      expect(screen.queryByText('Standard Tuning')).not.toBeInTheDocument();
      expect(screen.getByText('Drop D')).toBeInTheDocument();
    });
  });

  it('shows create custom tuning button', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create Custom Tuning')).toBeInTheDocument();
    });
  });

  it('opens custom tuning modal when create button is clicked', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create Custom Tuning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Custom Tuning'));

    await waitFor(() => {
      expect(screen.getByText('Create Custom Tuning')).toBeInTheDocument();
      // Check for modal-specific elements
      expect(screen.getByLabelText('Tuning Name')).toBeInTheDocument();
    });
  });

  it('displays tuning notes correctly', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      // Standard tuning notes
      expect(screen.getAllByText('E')).toHaveLength(2); // Two E notes in standard tuning
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });

  it('shows alternative badge for non-standard tunings', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      // Drop D should have alternative badge
      const dropDCard = screen.getByText('Drop D').closest('.tuning-card');
      expect(dropDCard).toBeInTheDocument();
      expect(dropDCard?.querySelector('.alternative-badge')).toBeInTheDocument();
    });
  });

  it('displays artist information when available', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Used by: Foo Fighters/)).toBeInTheDocument();
    });
  });

  it('handles disabled state correctly', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
        disabled={true}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search tunings...');
      expect(searchInput).toBeDisabled();
      
      const createButton = screen.getByText('Create Custom Tuning');
      expect(createButton).toBeDisabled();
    });
  });

  it('can select from suggestions', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
        showSuggestions={true}
        genre="rock"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Try This Tuning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try This Tuning'));

    expect(mockOnTuningChange).toHaveBeenCalledWith(mockDropDTuning);
  });

  it('calls tuning service with correct parameters', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
        showSuggestions={true}
        genre="rock"
        preferredDifficulty="easy"
      />
    );

    await waitFor(() => {
      expect(mockTuningService.getAllTunings).toHaveBeenCalledWith('guitar');
      expect(mockTuningService.suggestTunings).toHaveBeenCalledWith({
        genre: 'rock',
        preferredDifficulty: 'easy',
        currentTuning: undefined,
        instrument: 'guitar'
      });
    });
  });

  it('updates suggestions when currentTuning changes', async () => {
    const { rerender } = render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={mockOnTuningChange}
        showSuggestions={true}
      />
    );

    await waitFor(() => {
      expect(mockTuningService.suggestTunings).toHaveBeenCalledTimes(1);
    });

    rerender(
      <TuningSelector
        instrument="guitar"
        currentTuning={mockStandardTuning}
        onTuningChange={mockOnTuningChange}
        showSuggestions={true}
      />
    );

    await waitFor(() => {
      expect(mockTuningService.suggestTunings).toHaveBeenCalledTimes(2);
    });
  });
});

describe('CustomTuningModal', () => {
  const _mockOnSave = vi.fn();
  const _mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTuningService.getStandardTuning.mockReturnValue({
      id: 'guitar_standard',
      name: 'Standard Tuning',
      notes: ['E', 'A', 'D', 'G', 'B', 'E']
    } as TuningInfo);
    
    mockTuningService.createCustomTuning.mockReturnValue({
      id: 'custom_tuning',
      name: 'Test Custom',
      notes: ['D', 'A', 'D', 'F#', 'A', 'D']
    } as TuningInfo);
  });

  it('can create custom tuning through modal', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={vi.fn()}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Create Custom Tuning'));
    });

    // Fill in the form
    const nameInput = screen.getByLabelText('Tuning Name');
    const descriptionInput = screen.getByLabelText('Description');
    
    fireEvent.change(nameInput, { target: { value: 'Test Custom' } });
    fireEvent.change(descriptionInput, { target: { value: 'A test custom tuning' } });

    // Save the tuning
    fireEvent.click(screen.getByText('Create Tuning'));

    await waitFor(() => {
      expect(mockTuningService.createCustomTuning).toHaveBeenCalledWith(
        'Test Custom',
        'A test custom tuning',
        expect.arrayContaining(['E', 'A', 'D', 'G', 'B', 'E']),
        'guitar',
        expect.any(Object)
      );
    });
  });

  it('validates required fields in custom tuning form', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={vi.fn()}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Create Custom Tuning'));
    });

    // Try to save without filling required fields
    fireEvent.click(screen.getByText('Create Tuning'));

    await waitFor(() => {
      expect(screen.getByText('Tuning name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('can cancel custom tuning creation', async () => {
    render(
      <TuningSelector
        instrument="guitar"
        onTuningChange={vi.fn()}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Create Custom Tuning'));
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByLabelText('Tuning Name')).not.toBeInTheDocument();
    });
  });
});