import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SplitViewLayout from './SplitViewLayout';

describe('SplitViewLayout', () => {
  const defaultProps = {
    viewMode: 'split' as const,
    splitOrientation: 'vertical' as const,
    splitRatio: 0.5,
    onSplitRatioChange: vi.fn(),
    editorContent: <div data-testid="editor-content">Editor Content</div>,
    previewContent: <div data-testid="preview-content">Preview Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both editor and preview panes in split mode', () => {
      render(<SplitViewLayout {...defaultProps} />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      expect(screen.getByTestId('preview-content')).toBeInTheDocument();
    });

    it('should render only editor pane in edit-only mode', () => {
      render(<SplitViewLayout {...defaultProps} viewMode="edit-only" />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      expect(screen.getByTestId('preview-content')).toBeInTheDocument(); // Still in DOM but hidden
      
      // Check CSS classes
      const container = screen.getByTestId('editor-content').closest('.split-view-container');
      expect(container).toHaveClass('edit-only');
    });

    it('should render only preview pane in preview-only mode', () => {
      render(<SplitViewLayout {...defaultProps} viewMode="preview-only" />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      expect(screen.getByTestId('preview-content')).toBeInTheDocument();
      
      // Check CSS classes
      const container = screen.getByTestId('editor-content').closest('.split-view-container');
      expect(container).toHaveClass('preview-only');
    });

    it('should apply correct orientation class', () => {
      const { container, rerender } = render(<SplitViewLayout {...defaultProps} splitOrientation="vertical" />);
      
      expect(container.querySelector('.split-view-container')).toHaveClass('vertical');
      
      rerender(<SplitViewLayout {...defaultProps} splitOrientation="horizontal" />);
      
      expect(container.querySelector('.split-view-container')).toHaveClass('horizontal');
    });

    it('should show resizer in split mode only', () => {
      const { rerender } = render(<SplitViewLayout {...defaultProps} viewMode="split" />);
      
      expect(screen.getByRole('separator')).toBeInTheDocument();
      
      rerender(<SplitViewLayout {...defaultProps} viewMode="edit-only" />);
      
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });
  });

  describe('Resizer Functionality', () => {
    it('should have proper ARIA attributes on resizer', () => {
      render(<SplitViewLayout {...defaultProps} />);
      
      const resizer = screen.getByRole('separator');
      expect(resizer).toHaveAttribute('aria-orientation', 'vertical');
      expect(resizer).toHaveAttribute('aria-valuenow', '50');
      expect(resizer).toHaveAttribute('aria-valuemin', '10');
      expect(resizer).toHaveAttribute('aria-valuemax', '90');
      expect(resizer).toHaveAttribute('aria-label', 'Resize horizontal split');
    });

    it('should handle mouse down on resizer', () => {
      render(<SplitViewLayout {...defaultProps} />);
      
      const resizer = screen.getByRole('separator');
      fireEvent.mouseDown(resizer);
      
      // Check that cursor and user-select styles are applied to body
      expect(document.body.style.cursor).toBe('col-resize');
      expect(document.body.style.userSelect).toBe('none');
    });

    it('should calculate correct split ratio on mouse move', () => {
      const mockGetBoundingClientRect = vi.fn();
      mockGetBoundingClientRect.mockReturnValue({
        left: 100,
        top: 100,
        width: 800,
        height: 600,
      });

      const { container } = render(<SplitViewLayout {...defaultProps} />);
      const splitContainer = container.querySelector('.split-view-container');
      if (splitContainer) {
        splitContainer.getBoundingClientRect = mockGetBoundingClientRect;
      }

      const resizer = screen.getByRole('separator');
      
      // Simulate mouse down
      fireEvent.mouseDown(resizer);
      
      // Simulate mouse move to 60% position (clientX = 580)
      fireEvent.mouseMove(document, { clientX: 580 });
      
      expect(defaultProps.onSplitRatioChange).toHaveBeenCalledWith(0.6);
    });

    it('should clamp split ratio between 0.1 and 0.9', () => {
      const mockGetBoundingClientRect = vi.fn();
      mockGetBoundingClientRect.mockReturnValue({
        left: 100,
        top: 100,
        width: 800,
        height: 600,
      });

      const { container } = render(<SplitViewLayout {...defaultProps} />);
      const splitContainer = container.querySelector('.split-view-container');
      if (splitContainer) {
        splitContainer.getBoundingClientRect = mockGetBoundingClientRect;
      }

      const resizer = screen.getByRole('separator');
      
      // Simulate mouse down
      fireEvent.mouseDown(resizer);
      
      // Test minimum clamp (clientX = 50, which would be 50/800 = 0.0625)
      fireEvent.mouseMove(document, { clientX: 50 });
      expect(defaultProps.onSplitRatioChange).toHaveBeenCalledWith(0.1);
      
      // Test maximum clamp (clientX = 950, which would be 850/800 = 1.0625)
      fireEvent.mouseMove(document, { clientX: 950 });
      expect(defaultProps.onSplitRatioChange).toHaveBeenCalledWith(0.9);
    });

    it('should clean up on mouse up', () => {
      render(<SplitViewLayout {...defaultProps} />);
      
      const resizer = screen.getByRole('separator');
      fireEvent.mouseDown(resizer);
      fireEvent.mouseUp(document);
      
      // Check that cursor and user-select styles are reset
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });
  });

  describe('Horizontal Split Mode', () => {
    it('should calculate split ratio based on Y position for horizontal orientation', () => {
      const mockGetBoundingClientRect = vi.fn();
      mockGetBoundingClientRect.mockReturnValue({
        left: 100,
        top: 100,
        width: 800,
        height: 600,
      });

      const { container } = render(
        <SplitViewLayout {...defaultProps} splitOrientation="horizontal" />
      );
      const splitContainer = container.querySelector('.split-view-container');
      if (splitContainer) {
        splitContainer.getBoundingClientRect = mockGetBoundingClientRect;
      }

      const resizer = screen.getByRole('separator');
      
      // Simulate mouse down
      fireEvent.mouseDown(resizer);
      
      // Simulate mouse move to 40% position vertically (clientY = 340)
      fireEvent.mouseMove(document, { clientY: 340 });
      
      expect(defaultProps.onSplitRatioChange).toHaveBeenCalledWith(0.4);
    });

    it('should have correct ARIA orientation for horizontal split', () => {
      render(<SplitViewLayout {...defaultProps} splitOrientation="horizontal" />);
      
      const resizer = screen.getByRole('separator');
      expect(resizer).toHaveAttribute('aria-orientation', 'horizontal');
      expect(resizer).toHaveAttribute('aria-label', 'Resize vertical split');
    });
  });

  describe('Style Application', () => {
    it('should apply correct flex styles based on split ratio', () => {
      render(<SplitViewLayout {...defaultProps} splitRatio={0.3} />);
      
      const editorPane = screen.getByTestId('editor-content').closest('.editor-pane');
      const previewPane = screen.getByTestId('preview-content').closest('.preview-pane');
      
      expect(editorPane).toHaveStyle({ width: '30%' });
      expect(previewPane).toHaveStyle({ width: '70%' });
    });

    it('should apply height styles for horizontal orientation', () => {
      render(<SplitViewLayout {...defaultProps} splitOrientation="horizontal" splitRatio={0.7} />);
      
      const editorPane = screen.getByTestId('editor-content').closest('.editor-pane');
      const previewPane = screen.getByTestId('preview-content').closest('.preview-pane');
      
      // Check that height styles are applied (allow for floating point precision)
      expect(editorPane).toHaveAttribute('style', expect.stringContaining('height: 70'));
      expect(previewPane).toHaveAttribute('style', expect.stringContaining('height: 30'));
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SplitViewLayout {...defaultProps} className="custom-split" />
      );
      
      expect(container.querySelector('.split-view-container')).toHaveClass('custom-split');
    });
  });
});