import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TranspositionControls from './TranspositionControls';

describe('TranspositionControls', () => {
  const defaultProps = {
    onTranspose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders transpose controls with label and buttons', () => {
      render(<TranspositionControls {...defaultProps} />);

      expect(screen.getByText('Transpose:')).toBeInTheDocument();
      expect(screen.getByLabelText('Transpose up')).toBeInTheDocument();
      expect(screen.getByLabelText('Transpose down')).toBeInTheDocument();
    });

    it('renders flat and sharp symbols', () => {
      render(<TranspositionControls {...defaultProps} />);

      expect(screen.getByText('♭')).toBeInTheDocument();
      expect(screen.getByText('♯')).toBeInTheDocument();
    });

    it('applies custom className and style', () => {
      const customClassName = 'custom-class';
      const customStyle = { marginTop: '10px' };

      render(
        <TranspositionControls
          {...defaultProps}
          className={customClassName}
          style={customStyle}
        />
      );

      const container = screen.getByText('Transpose:').parentElement;
      expect(container).toHaveClass('transposition-controls');
      expect(container).toHaveClass(customClassName);
      expect(container).toHaveStyle('margin-top: 10px');
    });
  });

  describe('User Interactions', () => {
    it('calls onTranspose with +1 when transpose up button is clicked', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls onTranspose={onTranspose} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      fireEvent.click(transposeUpButton);

      expect(onTranspose).toHaveBeenCalledWith(1);
      expect(onTranspose).toHaveBeenCalledTimes(1);
    });

    it('calls onTranspose with -1 when transpose down button is clicked', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls onTranspose={onTranspose} />);

      const transposeDownButton = screen.getByLabelText('Transpose down');
      fireEvent.click(transposeDownButton);

      expect(onTranspose).toHaveBeenCalledWith(-1);
      expect(onTranspose).toHaveBeenCalledTimes(1);
    });

    it('allows multiple transpose operations', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls onTranspose={onTranspose} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      fireEvent.click(transposeUpButton);
      fireEvent.click(transposeUpButton);
      fireEvent.click(transposeDownButton);

      expect(onTranspose).toHaveBeenNthCalledWith(1, 1);
      expect(onTranspose).toHaveBeenNthCalledWith(2, 1);
      expect(onTranspose).toHaveBeenNthCalledWith(3, -1);
      expect(onTranspose).toHaveBeenCalledTimes(3);
    });
  });

  describe('Disabled State', () => {
    it('disables both buttons when disabled prop is true', () => {
      render(<TranspositionControls {...defaultProps} disabled={true} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      expect(transposeUpButton).toBeDisabled();
      expect(transposeDownButton).toBeDisabled();
    });

    it('does not call onTranspose when buttons are disabled', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls onTranspose={onTranspose} disabled={true} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      fireEvent.click(transposeUpButton);
      fireEvent.click(transposeDownButton);

      expect(onTranspose).not.toHaveBeenCalled();
    });

    it('enables buttons when disabled prop is false', () => {
      render(<TranspositionControls {...defaultProps} disabled={false} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      expect(transposeUpButton).not.toBeDisabled();
      expect(transposeDownButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TranspositionControls {...defaultProps} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      expect(transposeUpButton).toHaveAttribute('aria-label', 'Transpose up');
      expect(transposeDownButton).toHaveAttribute('aria-label', 'Transpose down');
    });

    it('has helpful title attributes', () => {
      render(<TranspositionControls {...defaultProps} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      expect(transposeUpButton).toHaveAttribute('title', 'Transpose up by one semitone');
      expect(transposeDownButton).toHaveAttribute('title', 'Transpose down by one semitone');
    });

    it('buttons have correct type attribute', () => {
      render(<TranspositionControls {...defaultProps} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      expect(transposeUpButton).toHaveAttribute('type', 'button');
      expect(transposeDownButton).toHaveAttribute('type', 'button');
    });
  });
});