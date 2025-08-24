import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  formatDate, 
  formatRelativeTime, 
  debounce, 
  capitalizeFirstLetter,
  validateEmail,
  validatePassword,
  isTokenExpired
} from './index';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2023-01-15T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('January 15, 2023');
    });

    it('handles different dates', () => {
      const date = new Date('2022-12-25T00:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('December 25, 2022');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Just now" for recent times', () => {
      const now = new Date('2023-01-15T12:00:00Z');
      vi.setSystemTime(now);
      
      const recent = new Date('2023-01-15T11:59:30Z').toISOString();
      expect(formatRelativeTime(recent)).toBe('Just now');
    });

    it('returns minutes ago for times within an hour', () => {
      const now = new Date('2023-01-15T12:00:00Z');
      vi.setSystemTime(now);
      
      const twoMinutesAgo = new Date('2023-01-15T11:58:00Z').toISOString();
      expect(formatRelativeTime(twoMinutesAgo)).toBe('2 minutes ago');
      
      const oneMinuteAgo = new Date('2023-01-15T11:59:00Z').toISOString();
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('returns hours ago for times within a day', () => {
      const now = new Date('2023-01-15T12:00:00Z');
      vi.setSystemTime(now);
      
      const twoHoursAgo = new Date('2023-01-15T10:00:00Z').toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
      
      const oneHourAgo = new Date('2023-01-15T11:00:00Z').toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('returns days ago for times within a week', () => {
      const now = new Date('2023-01-15T12:00:00Z');
      vi.setSystemTime(now);
      
      const twoDaysAgo = new Date('2023-01-13T12:00:00Z');
      expect(formatRelativeTime(twoDaysAgo.toISOString())).toBe('2 days ago');
      
      const oneDayAgo = new Date('2023-01-14T12:00:00Z');
      expect(formatRelativeTime(oneDayAgo.toISOString())).toBe('1 day ago');
    });

    it('returns formatted date for times older than a week', () => {
      const now = new Date('2023-01-15T12:00:00Z');
      vi.setSystemTime(now);
      
      const oldDate = new Date('2023-01-01T12:00:00Z').toISOString();
      expect(formatRelativeTime(oldDate)).toBe('Jan 1, 2023');
    });

    it('handles invalid date strings', () => {
      expect(formatRelativeTime('invalid-date')).toBe('Invalid date');
    });

    it('handles empty string', () => {
      expect(formatRelativeTime('')).toBe('Invalid date');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays function execution', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('cancels previous calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');
      
      vi.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('works with multiple arguments', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('arg1', 'arg2', 123);
      vi.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('handles multiple calls with different delays', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('first');
      vi.advanceTimersByTime(50);
      debouncedFn('second');
      vi.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('capitalizes first letter of lowercase string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
    });

    it('keeps first letter capitalized if already uppercase', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello');
    });

    it('handles single character strings', () => {
      expect(capitalizeFirstLetter('a')).toBe('A');
      expect(capitalizeFirstLetter('A')).toBe('A');
    });

    it('handles empty string', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    it('handles strings with numbers and special characters', () => {
      expect(capitalizeFirstLetter('123abc')).toBe('123abc');
      expect(capitalizeFirstLetter('!hello')).toBe('!hello');
    });

    it('only capitalizes first character, leaves rest unchanged', () => {
      expect(capitalizeFirstLetter('hELLO wORLD')).toBe('HELLO wORLD');
    });
  });

  describe('Re-exports', () => {
    it('exports validation functions', () => {
      expect(typeof validateEmail).toBe('function');
      expect(typeof validatePassword).toBe('function');
    });

    it('exports JWT functions', () => {
      expect(typeof isTokenExpired).toBe('function');
    });

    it('validation functions work correctly', () => {
      const validEmailResult = validateEmail('test@example.com');
      expect(validEmailResult.isValid).toBe(true);
      
      const invalidEmailResult = validateEmail('invalid-email');
      expect(invalidEmailResult.isValid).toBe(false);
      
      const validPasswordResult = validatePassword('Password123!');
      expect(validPasswordResult.isValid).toBe(true);
      
      const weakPasswordResult = validatePassword('weak');
      expect(weakPasswordResult.isValid).toBe(false);
    });
  });
});
