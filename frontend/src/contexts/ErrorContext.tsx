import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Error types and interfaces
export interface AppError {
  id: string;
  code?: string;
  message: string;
  category?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
  timestamp: number;
  source?: 'api' | 'network' | 'validation' | 'unknown';
}

export interface NotificationError extends AppError {
  type: 'error' | 'warning' | 'info';
  autoClose?: boolean;
  duration?: number;
}

interface ErrorState {
  errors: AppError[];
  notifications: NotificationError[];
  isOnline: boolean;
  retryAttempts: Record<string, number>;
}

type ErrorAction =
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationError }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'INCREMENT_RETRY_ATTEMPTS'; payload: string }
  | { type: 'RESET_RETRY_ATTEMPTS'; payload: string };

const initialState: ErrorState = {
  errors: [],
  notifications: [],
  isOnline: navigator.onLine,
  retryAttempts: {},
};

const MAX_RETRY_ATTEMPTS = 3;

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload),
      };
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif.id !== action.payload),
      };
    
    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      };
    
    case 'INCREMENT_RETRY_ATTEMPTS':
      return {
        ...state,
        retryAttempts: {
          ...state.retryAttempts,
          [action.payload]: (state.retryAttempts[action.payload] || 0) + 1,
        },
      };
    
    case 'RESET_RETRY_ATTEMPTS': {
      const { [action.payload]: _, ...remaining } = state.retryAttempts;
      return {
        ...state,
        retryAttempts: remaining,
      };
    }
    default:
      return state;
  }
}

interface ErrorContextValue {
  state: ErrorState;
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  addNotification: (notification: Omit<NotificationError, 'id' | 'timestamp'>) => void;
  removeNotification: (notificationId: string) => void;
  canRetry: (operationId: string) => boolean;
  incrementRetryAttempts: (operationId: string) => void;
  resetRetryAttempts: (operationId: string) => void;
  isRetryableError: (error: AppError) => boolean;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addError = useCallback((error: Omit<AppError, 'id' | 'timestamp'>) => {
    const fullError: AppError = {
      ...error,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_ERROR', payload: fullError });
  }, []);

  const removeError = useCallback((errorId: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: errorId });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationError, 'id' | 'timestamp'>) => {
    const fullNotification: NotificationError = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: notification.type || 'error',
      autoClose: notification.autoClose !== false,
      duration: notification.duration || 5000,
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
  }, []);

  const canRetry = useCallback((operationId: string) => {
    return (state.retryAttempts[operationId] || 0) < MAX_RETRY_ATTEMPTS;
  }, [state.retryAttempts]);

  const incrementRetryAttempts = useCallback((operationId: string) => {
    dispatch({ type: 'INCREMENT_RETRY_ATTEMPTS', payload: operationId });
  }, []);

  const resetRetryAttempts = useCallback((operationId: string) => {
    dispatch({ type: 'RESET_RETRY_ATTEMPTS', payload: operationId });
  }, []);

  const isRetryableError = useCallback((error: AppError) => {
    // Check if error is explicitly marked as retryable
    if (error.retryable === true) return true;
    if (error.retryable === false) return false;

    // Check by category
    if (error.category === 'network' || error.category === 'server_error') return true;
    if (error.category === 'validation' || error.category === 'authentication') return false;

    // Check by error code
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMIT_EXCEEDED', 'INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE'];
    if (error.code && retryableCodes.includes(error.code)) return true;

    // Check by source
    if (error.source === 'network') return true;

    return false;
  }, []);

  const contextValue: ErrorContextValue = {
    state,
    addError,
    removeError,
    clearErrors,
    addNotification,
    removeNotification,
    canRetry,
    incrementRetryAttempts,
    resetRetryAttempts,
    isRetryableError,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Utility functions for common error operations
export function createApiError(message: string, code?: string, category?: string, retryable?: boolean): Omit<AppError, 'id' | 'timestamp'> {
  return {
    message,
    code,
    category,
    retryable,
    source: 'api',
  };
}

export function createNetworkError(message: string = 'Network error occurred'): Omit<AppError, 'id' | 'timestamp'> {
  return {
    message,
    code: 'NETWORK_ERROR',
    category: 'network',
    retryable: true,
    source: 'network',
  };
}

export function createValidationError(message: string, field?: string): Omit<AppError, 'id' | 'timestamp'> {
  return {
    message,
    code: 'VALIDATION_ERROR',
    category: 'validation',
    retryable: false,
    source: 'validation',
    details: field ? { field } : undefined,
  };
}