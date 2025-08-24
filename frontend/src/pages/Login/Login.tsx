import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { validateEmail, validateRequired } from '../../utils';
import { GoogleAuthButton } from '../../components/GoogleAuth';
import type { LoginRequest, GoogleUserInfo } from '../../types';
import './Login.css';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    submit?: string;
    google?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

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
    const passwordValidation = validateRequired(formData.password, 'Password');
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
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
      const response = await apiService.login(formData);

      if (
        response.status === 'success' &&
        response.data?.token &&
        response.data?.user
      ) {
        setSuccessMessage('Login successful!');
        // Use the auth context to log in
        login(response.data.token, response.data.user);
        // Redirect to home page
        window.location.hash = '';
      } else {
        setErrors({ submit: response.error || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({
        submit: 'An error occurred during login. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuthSuccess = (userInfo: GoogleUserInfo) => {
    setSuccessMessage(
      `Welcome, ${userInfo.name}! Google Drive access enabled.`
    );
    // Note: Google OAuth is for Drive access, not replacing main authentication
    // Users still need to sign in with their ChordMe account
    setErrors({ google: undefined });
  };

  const handleGoogleAuthError = (error: string) => {
    setErrors({ google: error });
  };

  return (
    <div className="login">
      <div className="login-container">
        <h1>Login to ChordMe</h1>
        <p className="login-subtitle">
          Sign in to access your chords and songs
        </p>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
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
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
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
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <div className="google-auth-section">
          <h3>Connect Google Drive</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            Optional: Connect your Google Drive to access and save your chord
            files
          </p>
          <GoogleAuthButton
            onAuthSuccess={handleGoogleAuthSuccess}
            onAuthError={handleGoogleAuthError}
            disabled={isLoading}
          />
          {errors.google && (
            <div className="error-message" style={{ marginTop: '8px' }}>
              {errors.google}
            </div>
          )}
        </div>

        <p className="login-footer">
          Don't have an account? <a href="#register">Sign up here</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
