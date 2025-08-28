import React, { useState } from 'react';
import './PasswordInput.css';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  'aria-invalid'?: 'true' | 'false';
  'aria-describedby'?: string;
  required?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  name,
  value,
  onChange,
  className = '',
  placeholder = 'Enter your password',
  disabled = false,
  autoComplete = 'current-password',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  required = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow toggle with Enter or Space when focused on the button
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePasswordVisibility();
    }
  };

  return (
    <div className="password-input-container">
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        required={required}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={togglePasswordVisibility}
        onKeyDown={handleKeyDown}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={0}
        disabled={disabled}
      >
        <span className="password-toggle-icon" aria-hidden="true">
          {showPassword ? '🙈' : '👁️'}
        </span>
      </button>
    </div>
  );
};

export default PasswordInput;
