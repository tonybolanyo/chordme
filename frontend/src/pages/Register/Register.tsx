import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { validateEmail, validatePassword } from '../../utils';
import {
  FirebaseAuthButtons,
  FirebaseEmailForm,
} from '../../components/FirebaseAuth';
import PasswordInput from '../../components/PasswordInput';
import type { RegisterRequest } from '../../types';
import './Register.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    submit?: string;
    firebase?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    // Validate password confirmation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({ submit: undefined });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiService.register(formData);

      if (response.status === 'success') {
        setSuccessMessage(
          'Registration successful! You can now sign in with your account.'
        );
        // Clear form
        setFormData({ email: '', password: '' });
        setConfirmPassword('');
      } else {
        setErrors({ submit: response.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        submit: 'An error occurred during registration. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirebaseSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrors({ firebase: undefined });
  };

  const handleFirebaseError = (error: string) => {
    setErrors({ firebase: error });
  };

  return (
    <div className="register">
      <div className="register-container">
        <h1>Join ChordMe</h1>
        <p className="register-subtitle">
          Create your account to start organizing chords and songs
        </p>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <h3>Create a ChordMe account</h3>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
              placeholder="Create a strong password"
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
            <div className="password-requirements">
              <p>Password must contain:</p>
              <ul>
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character</li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleInputChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your password"
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>

          {errors.submit && (
            <div className="error-message">{errors.submit}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Firebase Authentication Options */}
        <FirebaseAuthButtons
          mode="register"
          disabled={isLoading}
          onSuccess={handleFirebaseSuccess}
          onError={handleFirebaseError}
        />

        <FirebaseEmailForm
          mode="register"
          disabled={isLoading}
          onSuccess={handleFirebaseSuccess}
          onError={handleFirebaseError}
        />

        {errors.firebase && (
          <div className="error-message" style={{ marginTop: '16px' }}>
            {errors.firebase}
          </div>
        )}

        <p className="register-footer">
          Already have an account? <a href="#login">Sign in here</a>
        </p>
      </div>
    </div>
  );
};

export default Register;
