import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UndoRedoControls from './UndoRedoControls';

// Mock the CSS import
vi.mock('./UndoRedoControls.css', () => ({}));

describe('UndoRedoControls', () => {
  const defaultProps = {
    canUndo: true,
    canRedo: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders undo and redo buttons', () => {
    render(<UndoRedoControls {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Undo last action' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Redo last action' })
    ).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('calls onUndo when undo button is clicked', () => {
    const onUndo = vi.fn();
    render(<UndoRedoControls {...defaultProps} onUndo={onUndo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Undo last action' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onRedo when redo button is clicked', () => {
    const onRedo = vi.fn();
    render(<UndoRedoControls {...defaultProps} onRedo={onRedo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Redo last action' }));
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('disables undo button when canUndo is false', () => {
    render(<UndoRedoControls {...defaultProps} canUndo={false} />);

    const undoButton = screen.getByRole('button', { name: 'Undo last action' });
    expect(undoButton).toBeDisabled();
    expect(undoButton).toHaveClass('disabled');
  });

  it('disables redo button when canRedo is false', () => {
    render(<UndoRedoControls {...defaultProps} canRedo={false} />);

    const redoButton = screen.getByRole('button', { name: 'Redo last action' });
    expect(redoButton).toBeDisabled();
    expect(redoButton).toHaveClass('disabled');
  });

  it('does not call onUndo when undo button is disabled and clicked', () => {
    const onUndo = vi.fn();
    render(
      <UndoRedoControls {...defaultProps} canUndo={false} onUndo={onUndo} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo last action' }));
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('does not call onRedo when redo button is disabled and clicked', () => {
    const onRedo = vi.fn();
    render(
      <UndoRedoControls {...defaultProps} canRedo={false} onRedo={onRedo} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Redo last action' }));
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('renders history button when onShowHistory prop is provided', () => {
    const onShowHistory = vi.fn();
    render(
      <UndoRedoControls {...defaultProps} onShowHistory={onShowHistory} />
    );

    expect(
      screen.getByRole('button', { name: 'Show version history' })
    ).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('does not render history button when onShowHistory prop is not provided', () => {
    render(<UndoRedoControls {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: 'Show version history' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
  });

  it('calls onShowHistory when history button is clicked', () => {
    const onShowHistory = vi.fn();
    render(
      <UndoRedoControls {...defaultProps} onShowHistory={onShowHistory} />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Show version history' })
    );
    expect(onShowHistory).toHaveBeenCalledTimes(1);
  });

  it('renders separator when history button is present', () => {
    const onShowHistory = vi.fn();
    const { container } = render(
      <UndoRedoControls {...defaultProps} onShowHistory={onShowHistory} />
    );

    expect(container.querySelector('.separator')).toBeInTheDocument();
  });

  it('does not render separator when history button is not present', () => {
    const { container } = render(<UndoRedoControls {...defaultProps} />);

    expect(container.querySelector('.separator')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <UndoRedoControls {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass(
      'undo-redo-controls',
      'custom-class'
    );
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<UndoRedoControls {...defaultProps} />);

    const toolbar = container.firstChild;
    expect(toolbar).toHaveAttribute('role', 'toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Undo and Redo controls');
    expect(toolbar).toHaveAttribute('tabIndex', '0');
  });

  it('has proper button titles', () => {
    render(<UndoRedoControls {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Undo last action' })
    ).toHaveAttribute('title', 'Undo (Ctrl+Z)');
    expect(
      screen.getByRole('button', { name: 'Redo last action' })
    ).toHaveAttribute('title', 'Redo (Ctrl+Y)');
  });

  it('has proper history button title when present', () => {
    const onShowHistory = vi.fn();
    render(
      <UndoRedoControls {...defaultProps} onShowHistory={onShowHistory} />
    );

    expect(
      screen.getByRole('button', { name: 'Show version history' })
    ).toHaveAttribute('title', 'Show version history');
  });

  describe('Keyboard shortcuts', () => {
    it('handles Ctrl+Z for undo', () => {
      const onUndo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} onUndo={onUndo} />
      );

      fireEvent.keyDown(container.firstChild!, {
        key: 'z',
        ctrlKey: true,
      });

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('handles Cmd+Z for undo on Mac', () => {
      const onUndo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} onUndo={onUndo} />
      );

      fireEvent.keyDown(container.firstChild!, {
        key: 'z',
        metaKey: true,
      });

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('handles Ctrl+Y for redo', () => {
      const onRedo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} onRedo={onRedo} />
      );

      fireEvent.keyDown(container.firstChild!, {
        key: 'y',
        ctrlKey: true,
      });

      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('handles Ctrl+Shift+Z for redo', () => {
      const onRedo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} onRedo={onRedo} />
      );

      fireEvent.keyDown(container.firstChild!, {
        key: 'Z',
        ctrlKey: true,
        shiftKey: true,
      });

      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('handles Cmd+Shift+Z for redo on Mac', () => {
      const onRedo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} onRedo={onRedo} />
      );

      fireEvent.keyDown(container.firstChild!, {
        key: 'Z',
        metaKey: true,
        shiftKey: true,
      });

      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('does not trigger undo when canUndo is false', () => {
      const onUndo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} canUndo={false} onUndo={onUndo} />
      );

      fireEvent.keyDown(container.firstChild!, {
        key: 'z',
        ctrlKey: true,
      });

      expect(onUndo).not.toHaveBeenCalled();
    });

    it('does not trigger redo when canRedo is false', () => {
      const onRedo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} canRedo={false} onRedo={onRedo} />
      );

      fireEvent.keyDown(container.firstChild!, {
        key: 'y',
        ctrlKey: true,
      });

      expect(onRedo).not.toHaveBeenCalled();
    });

    it('ignores other key combinations', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      const { container } = render(
        <UndoRedoControls {...defaultProps} onUndo={onUndo} onRedo={onRedo} />
      );

      // Test various keys that should not trigger actions
      fireEvent.keyDown(container.firstChild!, { key: 'a', ctrlKey: true });
      fireEvent.keyDown(container.firstChild!, { key: 'z' }); // No modifier
      fireEvent.keyDown(container.firstChild!, { key: 'y' }); // No modifier

      expect(onUndo).not.toHaveBeenCalled();
      expect(onRedo).not.toHaveBeenCalled();
    });
  });

  describe('SVG icons', () => {
    it('renders undo icon SVG', () => {
      render(<UndoRedoControls {...defaultProps} />);

      const undoButton = screen.getByRole('button', {
        name: 'Undo last action',
      });
      const svg = undoButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('renders redo icon SVG', () => {
      render(<UndoRedoControls {...defaultProps} />);

      const redoButton = screen.getByRole('button', {
        name: 'Redo last action',
      });
      const svg = redoButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('renders history icon SVG when history button is present', () => {
      const onShowHistory = vi.fn();
      render(
        <UndoRedoControls {...defaultProps} onShowHistory={onShowHistory} />
      );

      const historyButton = screen.getByRole('button', {
        name: 'Show version history',
      });
      const svg = historyButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });
  });

  describe('Edge cases', () => {
    it('handles both canUndo and canRedo being false', () => {
      render(
        <UndoRedoControls {...defaultProps} canUndo={false} canRedo={false} />
      );

      expect(
        screen.getByRole('button', { name: 'Undo last action' })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Redo last action' })
      ).toBeDisabled();
    });

    it('handles empty className prop', () => {
      const { container } = render(
        <UndoRedoControls {...defaultProps} className="" />
      );

      expect(container.firstChild).toHaveClass('undo-redo-controls');
    });

    it('handles undefined className prop', () => {
      const { container } = render(
        <UndoRedoControls {...defaultProps} className={undefined} />
      );

      expect(container.firstChild).toHaveClass('undo-redo-controls');
    });
  });
});
