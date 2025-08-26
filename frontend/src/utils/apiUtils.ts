// Enhanced API utilities with retry logic and comprehensive error handling
import type { AppError } from '../contexts/ErrorContext';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: ApiError) => boolean;
}

export interface ApiError extends Error {
  code?: string;
  category?: string;
  retryable?: boolean;
  status?: number;
  details?: Record<string, unknown>;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoffMultiplier: 2,
  retryCondition: (error: ApiError) => {
    // Default retry condition: retry on network errors and 5xx server errors
    return error.retryable === true || 
           (error.status !== undefined && error.status >= 500) ||
           error.code === 'NETWORK_ERROR' ||
           error.code === 'TIMEOUT_ERROR';
  },
};

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse error response from API
 */
export function parseApiError(response: Response, responseText: string): ApiError {
  let errorData: any = {};
  
  try {
    errorData = JSON.parse(responseText);
  } catch {
    // If not valid JSON, use default error structure
  }

  const error = new Error() as ApiError;
  
  // Handle new error format
  if (errorData.status === 'error' && errorData.error && typeof errorData.error === 'object') {
    error.message = errorData.error.message || `HTTP ${response.status}: ${response.statusText}`;
    error.code = errorData.error.code;
    error.category = errorData.error.category;
    error.retryable = errorData.error.retryable;
    error.details = errorData.error.details;
  }
  // Handle legacy error format
  else if (errorData.error && typeof errorData.error === 'string') {
    error.message = errorData.error;
    error.retryable = false; // Legacy errors are non-retryable by default
  }
  // Fallback for unknown format
  else {
    error.message = `HTTP ${response.status}: ${response.statusText}`;
    error.retryable = response.status >= 500; // Server errors are retryable
  }

  error.status = response.status;
  error.name = 'ApiError';

  return error;
}

/**
 * Parse network error (fetch failure)
 */
export function parseNetworkError(originalError: Error): ApiError {
  const error = new Error() as ApiError;
  
  // Check for specific network error types
  if (originalError.name === 'AbortError') {
    error.message = 'Request was cancelled';
    error.code = 'REQUEST_CANCELLED';
    error.category = 'network';
    error.retryable = false;
  } else if (originalError.message.includes('timeout')) {
    error.message = 'Request timed out. Please check your connection and try again';
    error.code = 'TIMEOUT_ERROR';
    error.category = 'network';
    error.retryable = true;
  } else {
    error.message = 'Network error. Please check your connection and try again';
    error.code = 'NETWORK_ERROR';
    error.category = 'network';
    error.retryable = true;
  }

  error.name = 'NetworkError';
  return error;
}

/**
 * Convert ApiError to AppError format
 */
export function apiErrorToAppError(apiError: ApiError): Omit<AppError, 'id' | 'timestamp'> {
  return {
    message: apiError.message,
    code: apiError.code,
    category: apiError.category,
    retryable: apiError.retryable,
    details: apiError.details,
    source: 'api',
  };
}

/**
 * Fetch with automatic retry logic
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: ApiError;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal || AbortSignal.timeout(30000), // 30 second timeout
      });

      // If response is successful, return it
      if (response.ok) {
        return response;
      }

      // Parse error from response
      const responseText = await response.text();
      const apiError = parseApiError(response, responseText);
      
      // If this is the last attempt or error is not retryable, throw
      if (attempt === config.maxAttempts || !config.retryCondition(apiError)) {
        throw apiError;
      }

      lastError = apiError;
      
    } catch (error) {
      // Handle network errors (fetch failures)
      if (error instanceof TypeError || error.name === 'AbortError') {
        const networkError = parseNetworkError(error as Error);
        
        // If this is the last attempt or error is not retryable, throw
        if (attempt === config.maxAttempts || !config.retryCondition(networkError)) {
          throw networkError;
        }

        lastError = networkError;
      } else {
        // Re-throw API errors that were already parsed
        throw error;
      }
    }

    // Wait before retrying (exponential backoff)
    if (attempt < config.maxAttempts) {
      const delay = config.delay * Math.pow(config.backoffMultiplier, attempt - 1);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError!;
}

/**
 * Create a retry function for a specific operation
 */
export function createRetryFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  retryOptions?: RetryOptions
) {
  return async (...args: T): Promise<R> => {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        const apiError = error as ApiError;
        
        // If this is the last attempt or error is not retryable, throw
        if (attempt === config.maxAttempts || !config.retryCondition(apiError)) {
          throw error;
        }

        lastError = error;

        // Wait before retrying
        if (attempt < config.maxAttempts) {
          const delay = config.delay * Math.pow(config.backoffMultiplier, attempt - 1);
          await sleep(delay);
        }
      }
    }

    throw lastError;
  };
}

/**
 * Check if the device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Wait for the device to come back online
 */
export function waitForOnline(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (navigator.onLine) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      reject(new Error('Timeout waiting for network connection'));
    }, timeout);

    const handleOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}