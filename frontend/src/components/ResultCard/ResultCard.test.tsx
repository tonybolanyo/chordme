import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultCard from './ResultCard';
import { SearchResult } from '../../services/songSearchService';

// Mock SearchResultUtils
vi.mock('../../services/songSearchService', async () => {
  const actual = await vi.importActual('../../services/songSearchService');
  return {
    ...actual,
    SearchResultUtils: {
      createSummary: vi.fn().mockReturnValue('Test summary'),
      formatRelevanceScore: vi.fn().mockReturnValue('85%'),
      getMatchTypeDescription: vi.fn().mockReturnValue('Title match'),
    }
  };
});

describe('ResultCard', () => {
  const mockResult: SearchResult = {
    id: '1',
    title: 'Amazing Grace',
    artist: 'Traditional',
    genre: 'gospel',
    song_key: 'G',
    tempo: 80,
    difficulty: 'beginner',
    language: 'en',
    view_count: 100,
    favorite_count: 10,
    created_at: '2023-01-01T00:00:00Z',
    relevance_score: 0.85,
    match_type: 'title_contains',
    matched_fields: ['title', 'genre'],
    highlights: {
      title: '<mark>Amazing</mark> Grace',
      artist: 'Traditional'
    }
  };

  const mockOnSelect = vi.fn();
  const mockOnAction = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnAction.mockClear();
  });

  it('renders result information', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview', 'edit', 'favorite']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('Traditional')).toBeInTheDocument();
    expect(screen.getByText('100 views')).toBeInTheDocument();
    expect(screen.getByText('10 favorites')).toBeInTheDocument();
  });

  it('renders highlighted title when available', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    const titleElement = screen.getByRole('heading', { level: 3 });
    expect(titleElement.innerHTML).toContain('<mark>Amazing</mark> Grace');
  });

  it('shows checkbox when enabled', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
        showCheckbox={true}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-label', 'Select Amazing Grace by Traditional');
  });

  it('hides checkbox when disabled', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
        showCheckbox={false}
      />
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('calls onSelect when checkbox is clicked', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(checkbox);

    expect(mockOnSelect).toHaveBeenCalledWith(true);
  });

  it('renders only available action buttons', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview', 'edit']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByRole('button', { name: /Preview/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Share/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });

  it('shows correct favorite icon based on state', () => {
    const { rerender } = render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['favorite']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('🤍')).toBeInTheDocument();

    rerender(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={true}
        availableActions={['favorite']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('❤️')).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview', 'edit']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    const editButton = screen.getByRole('button', { name: /Edit/ });
    fireEvent.click(editButton);

    expect(mockOnAction).toHaveBeenCalledWith('edit');
  });

  it('calls onAction with preview when card content is clicked', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    const cardContent = screen.getByText('Traditional').closest('.result-card-content');
    fireEvent.click(cardContent!);

    expect(mockOnAction).toHaveBeenCalledWith('preview');
  });

  it('applies selected styling when selected', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={true}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    const card = screen.getByRole('checkbox').closest('.result-card');
    expect(card).toHaveClass('selected');
  });

  it('applies view mode class', () => {
    const { rerender } = render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    let card = screen.getByRole('checkbox').closest('.result-card');
    expect(card).toHaveClass('list');

    rerender(
      <ResultCard
        result={mockResult}
        viewMode="grid"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    card = screen.getByRole('checkbox').closest('.result-card');
    expect(card).toHaveClass('grid');
  });

  it('renders field badges', () => {
    render(
      <ResultCard
        result={mockResult}
        viewMode="list"
        selected={false}
        favorited={false}
        availableActions={['preview']}
        onSelect={mockOnSelect}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('genre')).toBeInTheDocument();
  });
});