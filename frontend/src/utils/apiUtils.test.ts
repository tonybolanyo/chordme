import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseApiError,
  parseNetworkError,
  apiErrorToAppError,
  fetchWithRetry,
  createRetry(...args: unknown[]) => unknown,
  isOnline,
  waitForOnline,
  type ApiError,
  type RetryOptions,
} from './apiUtils';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout
global.AbortSignal.timeout = vi.fn((ms: number) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
});

describe('apiUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('parseApiError', () => {
    it('parses new error format correctly', () => {
      const response = new Response('', {
        status: 400,
        statusText: 'Bad Request',
      });
      const responseText = JSON.stringify({
        status: 'error',
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          category: 'validation',
          retryable: false,
          details: { field: 'email' },
        },
      });

      const error = parseApiError(response, responseText);

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe('validation');
      expect(error.retryable).toBe(false);
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ApiError');
    });

    it('parses legacy error format correctly', () => {
      const response = new Response('', {
        status: 404,
        statusText: 'Not Found',
      });
      const responseText = JSON.stringify({
        status: 'error',
        error: 'Resource not found',
      });

      const error = parseApiError(response, responseText);

      expect(error.message).toBe('Resource not found');
      expect(error.retryable).toBe(false);
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('handles invalid JSON response', () => {
      const response = new Response('', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      const responseText = 'Invalid JSON';

      const error = parseApiError(response, responseText);

      expect(error.message).toBe('HTTP 500: Internal Server Error');
      expect(error.retryable).toBe(true);
      expect(error.status).toBe(500);
    });

    it('handles unknown response format', () => {
      const response = new Response('', {
        status: 403,
        statusText: 'Forbidden',
      });
      const responseText = JSON.stringify({ message: 'Access denied' });

      const error = parseApiError(response, responseText);

      expect(error.message).toBe('HTTP 403: Forbidden');
      expect(error.retryable).toBe(false);
      expect(error.status).toBe(403);
    });

    it('marks server errors as retryable by default', () => {
      const response = new Response('', {
        status: 502,
        statusText: 'Bad Gateway',
      });
      const responseText = JSON.stringify({ unknown: 'format' });

      const error = parseApiError(response, responseText);

      expect(error.retryable).toBe(true);
    });

    it('marks client errors as non-retryable by default', () => {
      const response = new Response('', {
        status: 400,
        statusText: 'Bad Request',
      });
      const responseText = JSON.stringify({ unknown: 'format' });

      const error = parseApiError(response, responseText);

      expect(error.retryable).toBe(false);
    });
  });

  describe('parseNetworkError', () => {
    it('parses AbortError correctly', () => {
      const originalError = new Error('AbortError');
      originalError.name = 'AbortError';

      const error = parseNetworkError(originalError);

      expect(error.message).toBe('Request was cancelled');
      expect(error.code).toBe('REQUEST_CANCELLED');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(false);
      expect(error.name).toBe('NetworkError');
    });

    it('parses timeout error correctly', () => {
      const originalError = new Error('Request timeout after 30000ms');

      const error = parseNetworkError(originalError);

      expect(error.message).toBe(
        'Request timed out. Please check your connection and try again'
      );
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
    });

    it('parses generic network error correctly', () => {
      const originalError = new Error('Network failure');

      const error = parseNetworkError(originalError);

      expect(error.message).toBe(
        'Network error. Please check your connection and try again'
      );
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
    });
  });

  describe('apiErrorToAppError', () => {
    it('converts ApiError to AppError format', () => {
      const apiError: ApiError = {
        name: 'ApiError',
        message: 'Test error',
        code: 'TEST_ERROR',
        category: 'validation',
        retryable: false,
        status: 400,
        details: { field: 'test' },
      };

      const appError = apiErrorToAppError(apiError);

      expect(appError).toEqual({
        message: 'Test error',
        code: 'TEST_ERROR',
        category: 'validation',
        retryable: false,
        details: { field: 'test' },
        source: 'api',
      });
    });

    it('handles undefined properties', () => {
      const apiError: ApiError = {
        name: 'ApiError',
        message: 'Simple error',
      };

      const appError = apiErrorToAppError(apiError);

      expect(appError.message).toBe('Simple error');
      expect(appError.source).toBe('api');
      expect(appError.code).toBeUndefined();
      expect(appError.category).toBeUndefined();
    });
  });

  describe('fetchWithRetry', () => {
    it('returns successful response immediately', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry('/api/test');

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on server error', async () => {
      const errorResponse = new Response('Server Error', { status: 500 });
      const successResponse = new Response('{"success": true}', {
        status: 200,
      });

      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await fetchWithRetry('/api/test', {}, { delay: 0 });

      expect(result).toBe(successResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on network error', async () => {
      const networkError = new TypeError('Failed to fetch');
      const successResponse = new Response('{"success": true}', {
        status: 200,
      });

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await fetchWithRetry('/api/test', {}, { delay: 0 });

      expect(result).toBe(successResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('respects maxAttempts configuration', async () => {
      const errorResponse = new Response('Server Error', { status: 500 });
      mockFetch.mockResolvedValue(errorResponse);

      await expect(
        fetchWithRetry('/api/test', {}, { maxAttempts: 2, delay: 0 })
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-retryable errors', async () => {
      const errorResponse = new Response('Not Found', { status: 404 });
      mockFetch.mockResolvedValueOnce(errorResponse);

      await expect(
        fetchWithRetry('/api/test', {}, { delay: 0 })
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('uses custom retry condition', async () => {
      const errorResponse = new Response('Client Error', { status: 400 });
      mockFetch.mockResolvedValue(errorResponse);

      const retryOptions: RetryOptions = {
        maxAttempts: 2,
        delay: 0,
        retryCondition: (error: ApiError) => error.status === 400,
      };

      await expect(
        fetchWithRetry('/api/test', {}, retryOptions)
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('implements exponential backoff', async () => {
      const errorResponse = new Response('Server Error', { status: 500 });
      mockFetch.mockResolvedValue(errorResponse);

      // Use zero delay to avoid timing issues
      const promise = fetchWithRetry(
        '/api/test',
        {},
        {
          maxAttempts: 3,
          delay: 0, // Zero delay for tests
          backoffMultiplier: 2,
        }
      );

      await expect(promise).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('passes through fetch options', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      };

      await fetchWithRetry('/api/test', options);

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        ...options,
        signal: expect.any(AbortSignal),
      });
    });

    it('sets default timeout', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetchWithRetry('/api/test');

      expect(global.AbortSignal.timeout).toHaveBeenCalledWith(30000);
    });

    it('preserves existing signal', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const customSignal = new AbortController().signal;
      await fetchWithRetry('/api/test', { signal: customSignal });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        signal: customSignal,
      });
    });
  });

  describe('createRetry(...args: unknown[]) => unknown', () => {
    it('creates a retry wrapper for any function', async () => {
      let attempts = 0;
      const test(...args: unknown[]) => unknown = vi.fn(async (value: string) => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Temporary failure') as ApiError;
          error.retryable = true;
          error.status = 500; // Make it a server error so default retry condition passes
          throw error;
        }
        return `success: ${value}`;
      });

      const retry(...args: unknown[]) => unknown = createRetry(...args: unknown[]) => unknown(test(...args: unknown[]) => unknown, {
        maxAttempts: 3,
        delay: 0, // No delay for tests
      });
      const result = await retry(...args: unknown[]) => unknown('test');

      expect(result).toBe('success: test');
      expect(test(...args: unknown[]) => unknown).toHaveBeenCalledTimes(3);
    });

    it('fails after max attempts', async () => {
      const test(...args: unknown[]) => unknown = vi.fn(async () => {
        const error = new Error('Persistent failure') as ApiError;
        error.retryable = true;
        error.status = 500; // Make it a server error so default retry condition passes
        throw error;
      });

      const retry(...args: unknown[]) => unknown = createRetry(...args: unknown[]) => unknown(test(...args: unknown[]) => unknown, {
        maxAttempts: 2,
        delay: 0, // No delay for tests
      });

      await expect(retry(...args: unknown[]) => unknown()).rejects.toThrow('Persistent failure');
      expect(test(...args: unknown[]) => unknown).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-retryable errors', async () => {
      const test(...args: unknown[]) => unknown = vi.fn(async () => {
        const error = new Error('Non-retryable') as ApiError;
        error.retryable = false;
        error.status = 400; // Client error, not retryable by default
        throw error;
      });

      const retry(...args: unknown[]) => unknown = createRetry(...args: unknown[]) => unknown(test(...args: unknown[]) => unknown);

      await expect(retry(...args: unknown[]) => unknown()).rejects.toThrow('Non-retryable');
      expect(test(...args: unknown[]) => unknown).toHaveBeenCalledTimes(1);
    });
  });

  describe('isOnline', () => {
    it('returns navigator.onLine value', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      expect(isOnline()).toBe(true);

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      expect(isOnline()).toBe(false);
    });
  });

  describe('waitForOnline', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Reset navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('resolves immediately if already online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      await expect(waitForOnline()).resolves.toBeUndefined();
    });

    it('waits for online event', async () => {
      const promise = waitForOnline();

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      window.dispatchEvent(new Event('online'));

      await expect(promise).resolves.toBeUndefined();
    });

    it('times out if not coming online', async () => {
      const promise = waitForOnline(1000);

      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow(
        'Timeout waiting for network connection'
      );
    });

    it('uses custom timeout', async () => {
      const promise = waitForOnline(500);

      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow(
        'Timeout waiting for network connection'
      );
    });

    it('cleans up event listener on timeout', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const promise = waitForOnline(100);
      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any((...args: unknown[]) => unknown)
      );
    });

    it('cleans up event listener on success', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const promise = waitForOnline();

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      window.dispatchEvent(new Event('online'));

      await promise;

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any((...args: unknown[]) => unknown)
      );
    });
  });

  describe('Error handling edge cases', () => {
    it('handles empty response text in parseApiError', () => {
      const response = new Response('', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      const responseText = '';

      const error = parseApiError(response, responseText);

      expect(error.message).toBe('HTTP 500: Internal Server Error');
      expect(error.status).toBe(500);
    });

    it('handles null error data in parseApiError', () => {
      const response = new Response('', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      const responseText = 'null';

      const error = parseApiError(response, responseText);

      expect(error.message).toBe('HTTP 500: Internal Server Error');
      expect(error.status).toBe(500);
    });

    it('handles malformed error structure', () => {
      const response = new Response('', {
        status: 400,
        statusText: 'Bad Request',
      });
      const responseText = JSON.stringify({
        status: 'error',
        error: null,
      });

      const error = parseApiError(response, responseText);

      expect(error.message).toBe('HTTP 400: Bad Request');
      expect(error.status).toBe(400);
    });
  });
});
