import React, { useState } from 'react';
import { firebaseAuthService } from '../../services/firebaseAuth';
import { validateEmail, validatePassword } from '../../utils';
import './FirebaseAuth.css';

interface FirebaseEmailFormProps {
  mode: 'login' | 'register';
  disabled?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

const FirebaseEmailForm: React.FC<FirebaseEmailFormProps> = ({
  mode,
  disabled = false,
  onSuccess,
  onError,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic import to avoid breaking tests that don't have AuthProvider
  const [authContext, setAuthContext] = useState<any>(null);
  
  React.useEffect(() => {
    const loadAuthContext = async () => {
      try {
        const { useAuth } = await import('../../contexts/AuthContext');
        setAuthContext({ useAuth });
      } catch (error) {
        console.warn('AuthContext not available');
      }
    };
    loadAuthContext();
  }, []);

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
    if (mode === 'register') {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.error;
      }

      // Validate password confirmation
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.confirmPassword !== formData.password) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      // For login, just check password is not empty
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firebaseAuthService.isAvailable()) {
      onError?.('Firebase authentication is not available');
      return;
    }

    if (!authContext) {
      onError?.('Authentication context is not available');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (mode === 'register') {
        result = await firebaseAuthService.signUpWithEmailAndPassword(
          formData.email,
          formData.password
        );
      } else {
        result = await firebaseAuthService.signInWithEmailAndPassword(
          formData.email,
          formData.password
        );
      }

      // Use auth context if available
      if (authContext.useAuth) {
        const { loginWithFirebase } = authContext.useAuth();
        loginWithFirebase(result.user);
      }

      const message = mode === 'register'
        ? 'Account created successfully! Welcome to ChordMe.'
        : 'Welcome back! You have been signed in.';

      onSuccess?.(message);

      // Redirect to home page
      window.location.hash = '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything if Firebase is not available
  if (!firebaseAuthService.isAvailable()) {
    return null;
  }

  return (
    <div className="firebase-auth-form">
      <div className="auth-divider">
        <span>
          {mode === 'login' ? 'Sign in' : 'Sign up'} with Firebase
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="firebase-email">Email</label>
          <input
            type="email"
            id="firebase-email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'error' : ''}
            placeholder="Enter your email"
            disabled={disabled || isLoading}
            autoComplete="email"
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="firebase-password">Password</label>
          <input
            type="password"
            id="firebase-password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={errors.password ? 'error' : ''}
            placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
            disabled={disabled || isLoading}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          {errors.password && (
            <span className="error-text">{errors.password}</span>
          )}
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label htmlFor="firebase-confirm-password">Confirm Password</label>
            <input
              type="password"
              id="firebase-confirm-password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your password"
              disabled={disabled || isLoading}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn-firebase"
          disabled={disabled || isLoading}
        >
          {isLoading
            ? mode === 'register' ? 'Creating account...' : 'Signing in...'
            : mode === 'register' ? 'Create Account with Firebase' : 'Sign In with Firebase'
          }
        </button>
      </form>
    </div>
  );
};

export default FirebaseEmailForm;