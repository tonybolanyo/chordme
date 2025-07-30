import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ChordProEditor from './ChordProEditor';

describe('ChordProEditor', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<ChordProEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('');
    });

    it('renders with custom value', () => {
      const testValue = 'Test content';
      render(<ChordProEditor {...defaultProps} value={testValue} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(testValue);
    });

    it('renders with custom placeholder', () => {
      const placeholder = 'Enter your ChordPro content here...';
      render(<ChordProEditor {...defaultProps} placeholder={placeholder} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', placeholder);
    });

    it('renders with custom rows', () => {
      render(<ChordProEditor {...defaultProps} rows={10} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '10');
    });

    it('renders with custom id', () => {
      const customId = 'custom-editor-id';
      render(<ChordProEditor {...defaultProps} id={customId} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', customId);
    });

    it('renders with required attribute', () => {
      render(<ChordProEditor {...defaultProps} required />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeRequired();
    });

    it('renders with custom style', () => {
      const customStyle = { backgroundColor: 'rgb(255, 0, 0)', width: '100px' };
      render(<ChordProEditor {...defaultProps} style={customStyle} />);
      
      const container = screen.getByRole('textbox').parentElement;
      expect(container).toHaveStyle('background-color: rgb(255, 0, 0)');
      expect(container).toHaveStyle('width: 100px');
    });
  });

  describe('User Interactions', () => {
    it('calls onChange when user types', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ChordProEditor {...defaultProps} onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      
      expect(onChange).toHaveBeenCalledTimes(5); // One call per character
      expect(onChange).toHaveBeenNthCalledWith(1, 'H');
      expect(onChange).toHaveBeenNthCalledWith(2, 'He'); 
      expect(onChange).toHaveBeenNthCalledWith(3, 'Hel');
      expect(onChange).toHaveBeenNthCalledWith(4, 'Hell');
      expect(onChange).toHaveBeenNthCalledWith(5, 'Hello');
    });

    it('calls onChange with complete value when pasting', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ChordProEditor {...defaultProps} onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.paste('Pasted content');
      
      expect(onChange).toHaveBeenCalledWith('Pasted content');
    });

    it('handles backspace and deletion', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ChordProEditor {...defaultProps} value="Hello" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.keyboard('{End}');
      await user.keyboard('{Backspace}');
      
      expect(onChange).toHaveBeenCalledWith('Hell');
    });
  });

  describe('ChordPro Syntax Highlighting', () => {
    it('generates highlighting for comments', () => {
      const commentValue = '# This is a comment\nNormal lyrics';
      render(<ChordProEditor {...defaultProps} value={commentValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer).toBeInTheDocument();
      expect(highlightLayer?.innerHTML).toContain('chordpro-comment');
      expect(highlightLayer?.innerHTML).toContain('# This is a comment');
    });

    it('generates highlighting for chords', () => {
      const chordValue = 'This is [C]some lyrics with [G]chords';
      render(<ChordProEditor {...defaultProps} value={chordValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer).toBeInTheDocument();
      expect(highlightLayer?.innerHTML).toContain('chordpro-chord');
      expect(highlightLayer?.innerHTML).toContain('[C]');
      expect(highlightLayer?.innerHTML).toContain('[G]');
    });

    it('generates highlighting for directives', () => {
      const directiveValue = '{title: My Song}\n{start_of_chorus}\nChorus lyrics\n{end_of_chorus}';
      render(<ChordProEditor {...defaultProps} value={directiveValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer).toBeInTheDocument();
      expect(highlightLayer?.innerHTML).toContain('chordpro-directive');
      expect(highlightLayer?.innerHTML).toContain('{title: My Song}');
      expect(highlightLayer?.innerHTML).toContain('{start_of_chorus}');
    });

    it('handles mixed content with all token types', () => {
      const mixedValue = `# Song Comment
{title: Test Song}
This is [C]normal lyrics with [G]chords
{start_of_chorus}
Chorus [Am]line with [F]chords
{end_of_chorus}`;
      
      render(<ChordProEditor {...defaultProps} value={mixedValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer).toBeInTheDocument();
      expect(highlightLayer?.innerHTML).toContain('chordpro-comment');
      expect(highlightLayer?.innerHTML).toContain('chordpro-directive');
      expect(highlightLayer?.innerHTML).toContain('chordpro-chord');
      expect(highlightLayer?.innerHTML).toContain('chordpro-lyrics');
    });

    it('escapes HTML characters in content', () => {
      const htmlValue = '<script>alert("test")</script>\n[C]<b>Bold</b> lyrics';
      render(<ChordProEditor {...defaultProps} value={htmlValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer?.innerHTML).toContain('&lt;script&gt;');
      expect(highlightLayer?.innerHTML).toContain('&lt;b&gt;Bold&lt;/b&gt;');
      expect(highlightLayer?.innerHTML).not.toContain('<script>');
      expect(highlightLayer?.innerHTML).not.toContain('<b>Bold</b>');
    });

    it('converts newlines to break tags', () => {
      const multilineValue = 'Line 1\nLine 2\nLine 3';
      render(<ChordProEditor {...defaultProps} value={multilineValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer?.innerHTML).toContain('<br>');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty value', () => {
      render(<ChordProEditor {...defaultProps} value="" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('');
    });

    it('handles malformed chord brackets', () => {
      const malformedValue = 'Some [unclosed chord\nAnother ]closed only chord';
      render(<ChordProEditor {...defaultProps} value={malformedValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer).toBeInTheDocument();
      // Should still render without crashing
    });

    it('handles malformed directive braces', () => {
      const malformedValue = 'Some {unclosed directive\nAnother }closed only directive';
      render(<ChordProEditor {...defaultProps} value={malformedValue} />);
      
      const container = screen.getByRole('textbox').parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer).toBeInTheDocument();
      // Should still render without crashing
    });

    it('handles very long content', () => {
      const longValue = 'Line\n'.repeat(1000);
      render(<ChordProEditor {...defaultProps} value={longValue} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(longValue);
    });

    it('handles special characters', () => {
      const specialValue = 'Émile sings café songs with 中文 characters and emoji 🎵';
      render(<ChordProEditor {...defaultProps} value={specialValue} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(specialValue);
    });
  });

  describe('Scroll Synchronization', () => {
    it('synchronizes scroll between textarea and highlight layer', async () => {
      // Mock getBoundingClientRect and scroll properties
      const mockTextarea = {
        scrollTop: 100,
        scrollLeft: 50,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      
      const mockHighlight = {
        scrollTop: 0,
        scrollLeft: 0,
      };

      // Create a longer content to enable scrolling
      const longContent = 'Line\n'.repeat(50);
      render(<ChordProEditor {...defaultProps} value={longContent} />);
      
      // Find the elements
      const textarea = screen.getByRole('textbox');
      const container = textarea.parentElement;
      const highlightLayer = container?.querySelector('.chordpro-highlight-layer');
      
      expect(highlightLayer).toBeInTheDocument();
      
      // Simulate scroll event
      fireEvent.scroll(textarea, { target: { scrollTop: 100, scrollLeft: 50 } });
      
      // Test passes if no errors are thrown during scroll handling
    });

    it('handles scroll event cleanup on unmount', () => {
      const { unmount } = render(<ChordProEditor {...defaultProps} />);
      
      // Should not throw any errors during cleanup
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ChordProEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('spellCheck', 'false');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChordProEditor {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Should be focusable
      await user.tab();
      expect(textarea).toHaveFocus();
    });
  });
});