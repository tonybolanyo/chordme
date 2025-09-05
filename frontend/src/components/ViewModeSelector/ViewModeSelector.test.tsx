import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ViewModeSelector from './ViewModeSelector';

describe('ViewModeSelector', () => {
  const defaultProps = {
    viewMode: 'split' as const,
    splitOrientation: 'vertical' as const,
    onViewModeChange: vi.fn(),
    onSplitOrientationChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all view mode buttons', () => {
      render(<ViewModeSelector {...defaultProps} />);
      
      expect(screen.getByRole('radio', { name: /switch to edit only/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /switch to split view/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /switch to preview only/i })).toBeInTheDocument();
    });

    it('should highlight the active view mode', () => {
      render(<ViewModeSelector {...defaultProps} viewMode="edit-only" />);
      
      const editOnlyButton = screen.getByRole('radio', { name: /switch to edit only/i });
      const splitViewButton = screen.getByRole('radio', { name: /switch to split view/i });
      
      expect(editOnlyButton).toHaveClass('active');
      expect(splitViewButton).not.toHaveClass('active');
    });

    it('should show orientation controls only in split mode', () => {
      const { rerender } = render(<ViewModeSelector {...defaultProps} viewMode="split" />);
      
      expect(screen.getByRole('button', { name: /switch to side by side/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to top bottom/i })).toBeInTheDocument();
      
      rerender(<ViewModeSelector {...defaultProps} viewMode="edit-only" />);
      
      expect(screen.queryByRole('button', { name: /switch to side by side/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /switch to top bottom/i })).not.toBeInTheDocument();
    });

    it('should highlight the active orientation', () => {
      render(<ViewModeSelector {...defaultProps} splitOrientation="horizontal" />);
      
      const verticalButton = screen.getByRole('button', { name: /switch to side by side/i });
      const horizontalButton = screen.getByRole('button', { name: /switch to top bottom/i });
      
      expect(horizontalButton).toHaveClass('active');
      expect(verticalButton).not.toHaveClass('active');
    });
  });

  describe('Interactions', () => {
    it('should call onViewModeChange when a mode button is clicked', () => {
      render(<ViewModeSelector {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('radio', { name: /switch to edit only/i }));
      
      expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('edit-only');
    });

    it('should call onSplitOrientationChange when orientation button is clicked', () => {
      render(<ViewModeSelector {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button', { name: /switch to top bottom/i }));
      
      expect(defaultProps.onSplitOrientationChange).toHaveBeenCalledWith('horizontal');
    });

    it('should not change mode if the same mode is clicked', () => {
      render(<ViewModeSelector {...defaultProps} viewMode="split" />);
      
      fireEvent.click(screen.getByRole('radio', { name: /switch to split view/i }));
      
      expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('split');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for radiogroup', () => {
      render(<ViewModeSelector {...defaultProps} />);
      
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-label', 'View mode selection');
    });

    it('should have proper radio button attributes', () => {
      render(<ViewModeSelector {...defaultProps} viewMode="edit-only" />);
      
      const editOnlyButton = screen.getByRole('radio', { name: /switch to edit only/i });
      const splitViewButton = screen.getByRole('radio', { name: /switch to split view/i });
      
      expect(editOnlyButton).toHaveAttribute('aria-checked', 'true');
      expect(splitViewButton).toHaveAttribute('aria-checked', 'false');
    });

    it('should have descriptive labels for orientation buttons', () => {
      render(<ViewModeSelector {...defaultProps} />);
      
      const verticalButton = screen.getByRole('button', { name: /switch to side by side/i });
      const horizontalButton = screen.getByRole('button', { name: /switch to top bottom/i });
      
      expect(verticalButton).toHaveAttribute('title', 'Side by Side');
      expect(horizontalButton).toHaveAttribute('title', 'Top Bottom');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key press on mode buttons', () => {
      render(<ViewModeSelector {...defaultProps} />);
      
      const editOnlyButton = screen.getByRole('radio', { name: /switch to edit only/i });
      fireEvent.keyDown(editOnlyButton, { key: 'Enter' });
      fireEvent.click(editOnlyButton);
      
      expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('edit-only');
    });

    it('should handle Space key press on orientation buttons', () => {
      render(<ViewModeSelector {...defaultProps} />);
      
      const horizontalButton = screen.getByRole('button', { name: /switch to top bottom/i });
      fireEvent.keyDown(horizontalButton, { key: ' ' });
      fireEvent.click(horizontalButton);
      
      expect(defaultProps.onSplitOrientationChange).toHaveBeenCalledWith('horizontal');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ViewModeSelector {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('view-mode-selector', 'custom-class');
    });
  });
});