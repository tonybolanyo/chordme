import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultSortSelector from './ResultSortSelector';

describe('ResultSortSelector', () => {
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    mockOnSortChange.mockClear();
  });

  it('renders sort option buttons', () => {
    render(
      <ResultSortSelector
        sortBy="relevance"
        sortDirection="desc"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Relevance')).toBeInTheDocument();
    expect(screen.getByText('Alphabetical')).toBeInTheDocument();
    expect(screen.getByText('Date Created')).toBeInTheDocument();
    expect(screen.getByText('Popularity')).toBeInTheDocument();
  });

  it('highlights active sort option with direction indicator', () => {
    render(
      <ResultSortSelector
        sortBy="alphabetical"
        sortDirection="asc"
        onSortChange={mockOnSortChange}
      />
    );

    const activeButton = screen.getByRole('button', { name: /Sort by Alphabetical.*ascending/ });
    expect(activeButton).toHaveClass('active');
    expect(activeButton).toHaveTextContent('↑');
  });

  it('shows descending indicator correctly', () => {
    render(
      <ResultSortSelector
        sortBy="popularity"
        sortDirection="desc"
        onSortChange={mockOnSortChange}
      />
    );

    const activeButton = screen.getByRole('button', { name: /Sort by Popularity.*descending/ });
    expect(activeButton).toHaveClass('active');
    expect(activeButton).toHaveTextContent('↓');
  });

  it('calls onSortChange with default direction for new sort', () => {
    render(
      <ResultSortSelector
        sortBy="relevance"
        sortDirection="desc"
        onSortChange={mockOnSortChange}
      />
    );

    const alphabeticalButton = screen.getByRole('button', { name: 'Sort by Alphabetical' });
    fireEvent.click(alphabeticalButton);

    expect(mockOnSortChange).toHaveBeenCalledWith('alphabetical', 'asc');
  });

  it('toggles direction when clicking same sort option', () => {
    render(
      <ResultSortSelector
        sortBy="alphabetical"
        sortDirection="asc"
        onSortChange={mockOnSortChange}
      />
    );

    const alphabeticalButton = screen.getByRole('button', { name: /Sort by Alphabetical.*ascending/ });
    fireEvent.click(alphabeticalButton);

    expect(mockOnSortChange).toHaveBeenCalledWith('alphabetical', 'desc');
  });

  it('uses correct default directions', () => {
    render(
      <ResultSortSelector
        sortBy="relevance"
        sortDirection="desc"
        onSortChange={mockOnSortChange}
      />
    );

    // Relevance and popularity should default to desc
    const popularityButton = screen.getByRole('button', { name: 'Sort by Popularity' });
    fireEvent.click(popularityButton);
    expect(mockOnSortChange).toHaveBeenCalledWith('popularity', 'desc');

    mockOnSortChange.mockClear();

    // Date should default to asc
    const dateButton = screen.getByRole('button', { name: 'Sort by Date Created' });
    fireEvent.click(dateButton);
    expect(mockOnSortChange).toHaveBeenCalledWith('date', 'asc');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResultSortSelector
        sortBy="relevance"
        sortDirection="desc"
        onSortChange={mockOnSortChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('result-sort-selector', 'custom-class');
  });
});