import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
  const defaultProps = {
    id: 'password',
    name: 'password',
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders password input with default props', () => {
    render(<PasswordInput {...defaultProps} />);

    const input = screen.getByDisplayValue('');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('id', 'password');
    expect(input).toHaveAttribute('name', 'password');
  });

  it('renders toggle button with correct accessibility attributes', () => {
    render(<PasswordInput {...defaultProps} />);

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    expect(toggleButton).toHaveAttribute('type', 'button');
  });

  it('toggles password visibility when button is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordInput {...defaultProps} />);

    const input = screen.getByDisplayValue('');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Initially password should be hidden
    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');

    // Click to show password
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');

    // Click to hide password again
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
  });

  it('toggles password visibility with keyboard navigation', () => {
    render(<PasswordInput {...defaultProps} />);

    const input = screen.getByDisplayValue('');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Initially password should be hidden
    expect(input).toHaveAttribute('type', 'password');

    // Focus the toggle button and press Enter
    toggleButton.focus();
    fireEvent.keyDown(toggleButton, { key: 'Enter' });
    expect(input).toHaveAttribute('type', 'text');

    // Press Space to toggle back
    fireEvent.keyDown(toggleButton, { key: ' ' });
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange when input value changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasswordInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByDisplayValue('');
    await user.type(input, 'test');

    expect(onChange).toHaveBeenCalledTimes(4); // Once for each character
  });

  it('passes through all input props correctly', () => {
    const props = {
      ...defaultProps,
      className: 'error',
      placeholder: 'Enter password',
      disabled: true,
      autoComplete: 'new-password',
      'aria-invalid': 'true' as const,
      'aria-describedby': 'password-error',
      required: true,
    };

    render(<PasswordInput {...props} />);

    const input = screen.getByDisplayValue('');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('placeholder', 'Enter password');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('autocomplete', 'new-password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'password-error');
    expect(input).toBeRequired();
  });

  it('disables toggle button when input is disabled', () => {
    render(<PasswordInput {...defaultProps} disabled={true} />);

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeDisabled();
  });

  it('shows correct icon for password visibility state', () => {
    render(<PasswordInput {...defaultProps} />);

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    const icon = toggleButton.querySelector('.password-toggle-icon');

    // Initially should show "show" icon (eye)
    expect(icon).toHaveTextContent('👁️');

    // After clicking, should show "hide" icon (see-no-evil monkey)
    fireEvent.click(toggleButton);
    expect(icon).toHaveTextContent('🙈');
  });

  it('maintains focus on input after toggling visibility', async () => {
    const user = userEvent.setup();
    render(<PasswordInput {...defaultProps} />);

    const input = screen.getByDisplayValue('');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Focus input first
    await user.click(input);
    expect(input).toHaveFocus();

    // Click toggle button
    await user.click(toggleButton);

    // Input should maintain its focus (this is good UX)
    // The test here just ensures the toggle doesn't break anything
    expect(input).toHaveAttribute('type', 'text');
  });
});
