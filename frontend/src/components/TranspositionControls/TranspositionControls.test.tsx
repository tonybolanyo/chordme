import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TranspositionControls, { NotationSystem } from './TranspositionControls';

describe('TranspositionControls', () => {
  const defaultProps = {
    onTranspose: vi.fn(),
  };

  const advancedProps = {
    onTranspose: vi.fn(),
    onKeyChange: vi.fn(),
    onNotationSystemChange: vi.fn(),
    onReset: vi.fn(),
    currentTransposition: 2,
    originalKey: 'C',
    currentKey: 'D',
    notationSystem: 'american' as NotationSystem,
    enableAdvancedFeatures: true,
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

      const container = screen.getByText('Transpose:').closest('.transposition-controls');
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
      render(
        <TranspositionControls onTranspose={onTranspose} disabled={true} />
      );

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
      expect(transposeDownButton).toHaveAttribute(
        'aria-label',
        'Transpose down'
      );
    });

    it('has helpful title attributes with keyboard shortcuts', () => {
      render(<TranspositionControls {...advancedProps} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      expect(transposeUpButton).toHaveAttribute(
        'title',
        'Transpose up by one semitone (Ctrl+↑ or Ctrl++)'
      );
      expect(transposeDownButton).toHaveAttribute(
        'title',
        'Transpose down by one semitone (Ctrl+↓ or Ctrl+-)'
      );
    });

    it('buttons have correct type attribute', () => {
      render(<TranspositionControls {...defaultProps} />);

      const transposeUpButton = screen.getByLabelText('Transpose up');
      const transposeDownButton = screen.getByLabelText('Transpose down');

      expect(transposeUpButton).toHaveAttribute('type', 'button');
      expect(transposeDownButton).toHaveAttribute('type', 'button');
    });

    it('key selection dropdown has proper accessibility', () => {
      render(<TranspositionControls {...advancedProps} />);

      const keySelect = screen.getByLabelText('Select key signature');
      expect(keySelect).toHaveAttribute('aria-label', 'Select key signature');
    });

    it('notation toggle has proper accessibility', () => {
      render(<TranspositionControls {...advancedProps} />);

      const notationToggle = screen.getByRole('button', { name: /Current notation/ });
      expect(notationToggle).toHaveAttribute('aria-label');
    });
  });

  describe('Advanced Features', () => {
    describe('Key Selection', () => {
      it('renders key selection dropdown when onKeyChange is provided', () => {
        render(<TranspositionControls {...advancedProps} />);

        expect(screen.getByLabelText('Select key signature')).toBeInTheDocument();
        expect(screen.getByDisplayValue('D')).toBeInTheDocument();
      });

      it('calls onKeyChange when key is selected', () => {
        const onKeyChange = vi.fn();
        render(<TranspositionControls {...advancedProps} onKeyChange={onKeyChange} />);

        const keySelect = screen.getByLabelText('Select key signature');
        fireEvent.change(keySelect, { target: { value: 'G' } });

        expect(onKeyChange).toHaveBeenCalledWith('G');
      });

      it('does not render key selection when onKeyChange is not provided', () => {
        render(<TranspositionControls {...defaultProps} />);

        expect(screen.queryByLabelText('Select key signature')).not.toBeInTheDocument();
      });

      it('disables key selection when disabled', () => {
        render(<TranspositionControls {...advancedProps} disabled={true} />);

        const keySelect = screen.getByLabelText('Select key signature');
        expect(keySelect).toBeDisabled();
      });
    });

    describe('Key Display', () => {
      it('shows original key when provided', () => {
        render(<TranspositionControls {...advancedProps} />);

        expect(screen.getByText('Original:')).toBeInTheDocument();
        const originalKeyElement = screen.getByText('C', { selector: '.original-key' });
        expect(originalKeyElement).toBeInTheDocument();
      });

      it('shows current key when different from original', () => {
        render(<TranspositionControls {...advancedProps} />);

        expect(screen.getByText('→')).toBeInTheDocument();
        // Use more specific selector for current key
        const currentKeyElement = screen.getByText('D', { selector: '.current-key' });
        expect(currentKeyElement).toBeInTheDocument();
      });

      it('does not show current key when same as original', () => {
        render(<TranspositionControls {...advancedProps} currentKey="C" />);

        expect(screen.queryByText('→')).not.toBeInTheDocument();
      });

      it('does not show key display when no original key', () => {
        render(<TranspositionControls {...defaultProps} enableAdvancedFeatures={true} />);

        expect(screen.queryByText('Original:')).not.toBeInTheDocument();
      });
    });

    describe('Notation System Toggle', () => {
      it('renders notation toggle when onNotationSystemChange is provided', () => {
        render(<TranspositionControls {...advancedProps} />);

        expect(screen.getByText('ABC')).toBeInTheDocument();
      });

      it('shows correct text for American notation', () => {
        render(<TranspositionControls {...advancedProps} notationSystem="american" />);

        expect(screen.getByText('ABC')).toBeInTheDocument();
      });

      it('shows correct text for Latin notation', () => {
        render(<TranspositionControls {...advancedProps} notationSystem="latin" />);

        expect(screen.getByText('DoReMi')).toBeInTheDocument();
      });

      it('calls onNotationSystemChange when clicked', () => {
        const onNotationSystemChange = vi.fn();
        render(<TranspositionControls {...advancedProps} onNotationSystemChange={onNotationSystemChange} />);

        const notationToggle = screen.getByText('ABC');
        fireEvent.click(notationToggle);

        expect(onNotationSystemChange).toHaveBeenCalledWith('latin');
      });

      it('toggles from latin to american', () => {
        const onNotationSystemChange = vi.fn();
        render(<TranspositionControls {...advancedProps} notationSystem="latin" onNotationSystemChange={onNotationSystemChange} />);

        const notationToggle = screen.getByText('DoReMi');
        fireEvent.click(notationToggle);

        expect(onNotationSystemChange).toHaveBeenCalledWith('american');
      });

      it('disables notation toggle when disabled', () => {
        render(<TranspositionControls {...advancedProps} disabled={true} />);

        const notationToggle = screen.getByText('ABC');
        expect(notationToggle).toBeDisabled();
      });
    });

    describe('Reset Button', () => {
      it('renders reset button when onReset is provided', () => {
        render(<TranspositionControls {...advancedProps} />);

        expect(screen.getByText('Reset')).toBeInTheDocument();
      });

      it('calls onReset when clicked', () => {
        const onReset = vi.fn();
        render(<TranspositionControls {...advancedProps} onReset={onReset} />);

        const resetButton = screen.getByText('Reset');
        fireEvent.click(resetButton);

        expect(onReset).toHaveBeenCalled();
      });

      it('disables reset button when currentTransposition is 0', () => {
        render(<TranspositionControls {...advancedProps} currentTransposition={0} />);

        const resetButton = screen.getByText('Reset');
        expect(resetButton).toBeDisabled();
      });

      it('enables reset button when currentTransposition is not 0', () => {
        render(<TranspositionControls {...advancedProps} currentTransposition={3} />);

        const resetButton = screen.getByText('Reset');
        expect(resetButton).not.toBeDisabled();
      });

      it('disables reset button when disabled prop is true', () => {
        render(<TranspositionControls {...advancedProps} disabled={true} />);

        const resetButton = screen.getByText('Reset');
        expect(resetButton).toBeDisabled();
      });
    });

    describe('Transposition Display', () => {
      it('shows current transposition amount', () => {
        render(<TranspositionControls {...advancedProps} currentTransposition={3} />);

        expect(screen.getByText('+3')).toBeInTheDocument();
      });

      it('shows negative transposition', () => {
        render(<TranspositionControls {...advancedProps} currentTransposition={-2} />);

        expect(screen.getByText('-2')).toBeInTheDocument();
      });

      it('shows zero transposition', () => {
        render(<TranspositionControls {...advancedProps} currentTransposition={0} />);

        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    describe('Keyboard Shortcuts Hint', () => {
      it('shows keyboard shortcuts hint when advanced features enabled', () => {
        render(<TranspositionControls {...advancedProps} />);

        expect(screen.getByText('Ctrl+↑/↓, Ctrl+±, Ctrl+0')).toBeInTheDocument();
      });

      it('does not show keyboard shortcuts hint when advanced features disabled', () => {
        render(<TranspositionControls {...defaultProps} enableAdvancedFeatures={false} />);

        expect(screen.queryByText('Ctrl+↑/↓, Ctrl+±, Ctrl+0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('transposes up with Ctrl+ArrowUp', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...advancedProps} onTranspose={onTranspose} />);

      fireEvent.keyDown(document, { key: 'ArrowUp', ctrlKey: true });

      expect(onTranspose).toHaveBeenCalledWith(1);
    });

    it('transposes down with Ctrl+ArrowDown', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...advancedProps} onTranspose={onTranspose} />);

      fireEvent.keyDown(document, { key: 'ArrowDown', ctrlKey: true });

      expect(onTranspose).toHaveBeenCalledWith(-1);
    });

    it('transposes up with Ctrl++', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...advancedProps} onTranspose={onTranspose} />);

      fireEvent.keyDown(document, { key: '+', ctrlKey: true });

      expect(onTranspose).toHaveBeenCalledWith(1);
    });

    it('transposes down with Ctrl+-', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...advancedProps} onTranspose={onTranspose} />);

      fireEvent.keyDown(document, { key: '-', ctrlKey: true });

      expect(onTranspose).toHaveBeenCalledWith(-1);
    });

    it('resets with Ctrl+0', () => {
      const onReset = vi.fn();
      render(<TranspositionControls {...advancedProps} onReset={onReset} />);

      fireEvent.keyDown(document, { key: '0', ctrlKey: true });

      expect(onReset).toHaveBeenCalled();
    });

    it('works with Cmd key on Mac', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...advancedProps} onTranspose={onTranspose} />);

      fireEvent.keyDown(document, { key: 'ArrowUp', metaKey: true });

      expect(onTranspose).toHaveBeenCalledWith(1);
    });

    it('ignores shortcuts when disabled', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...advancedProps} onTranspose={onTranspose} disabled={true} />);

      fireEvent.keyDown(document, { key: 'ArrowUp', ctrlKey: true });

      expect(onTranspose).not.toHaveBeenCalled();
    });

    it('ignores shortcuts when advanced features disabled', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...defaultProps} onTranspose={onTranspose} enableAdvancedFeatures={false} />);

      fireEvent.keyDown(document, { key: 'ArrowUp', ctrlKey: true });

      expect(onTranspose).not.toHaveBeenCalled();
    });

    it('ignores shortcuts without modifier keys', () => {
      const onTranspose = vi.fn();
      render(<TranspositionControls {...advancedProps} onTranspose={onTranspose} />);

      fireEvent.keyDown(document, { key: 'ArrowUp' });

      expect(onTranspose).not.toHaveBeenCalled();
    });
  });

  describe('Feature Toggle', () => {
    it('shows basic controls only when enableAdvancedFeatures is false', () => {
      render(<TranspositionControls {...defaultProps} enableAdvancedFeatures={false} />);

      expect(screen.getByText('Transpose:')).toBeInTheDocument();
      expect(screen.getByLabelText('Transpose up')).toBeInTheDocument();
      expect(screen.getByLabelText('Transpose down')).toBeInTheDocument();
      
      expect(screen.queryByText('Key:')).not.toBeInTheDocument();
      expect(screen.queryByText('Notation:')).not.toBeInTheDocument();
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('shows all controls when enableAdvancedFeatures is true', () => {
      render(<TranspositionControls {...advancedProps} />);

      expect(screen.getByText('Transpose:')).toBeInTheDocument();
      expect(screen.getByText('Key:')).toBeInTheDocument();
      expect(screen.getByText('Notation:')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });
});
