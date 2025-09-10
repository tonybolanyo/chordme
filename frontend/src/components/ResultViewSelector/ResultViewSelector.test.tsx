import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultViewSelector from './ResultViewSelector';

describe('ResultViewSelector', () => {
  const mockOnViewModeChange = vi.fn();

  beforeEach(() => {
    mockOnViewModeChange.mockClear();
  });

  it('renders view mode buttons', () => {
    render(
      <ResultViewSelector
        viewMode="list"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    expect(screen.getByText('List View')).toBeInTheDocument();
    expect(screen.getByText('Grid View')).toBeInTheDocument();
  });

  it('highlights active view mode', () => {
    render(
      <ResultViewSelector
        viewMode="grid"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const gridButton = screen.getByRole('radio', { name: 'Switch to Grid View' });
    expect(gridButton).toHaveClass('active');
    expect(gridButton).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onViewModeChange when button is clicked', () => {
    render(
      <ResultViewSelector
        viewMode="list"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const gridButton = screen.getByRole('radio', { name: 'Switch to Grid View' });
    fireEvent.click(gridButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('has proper accessibility attributes', () => {
    render(
      <ResultViewSelector
        viewMode="list"
        onViewModeChange={mockOnViewModeChange}
      />
    );

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-label', 'Result view mode selection');

    const buttons = screen.getAllByRole('radio');
    expect(buttons).toHaveLength(2);
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-checked');
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResultViewSelector
        viewMode="list"
        onViewModeChange={mockOnViewModeChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('result-view-selector', 'custom-class');
  });
});