import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatRelativeTime } from './index';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const formatted = formatDate(date);

      // The exact format may vary by locale, but should contain year, month, day
      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/March|Mar/);
      expect(formatted).toMatch(/15/);
    });

    it('should handle different dates', () => {
      const testDates = [
        new Date('2023-01-01T00:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
        new Date('2024-07-04T12:00:00Z'),
      ];

      testDates.forEach((date) => {
        const formatted = formatDate(date);
        expect(formatted).toBeTruthy();
        expect(typeof formatted).toBe('string');
      });
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // Mock the current time to have consistent test results
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for very recent times', () => {
      const recent = new Date('2024-03-15T11:59:30Z').toISOString(); // 30 seconds ago
      expect(formatRelativeTime(recent)).toBe('Just now');
    });

    it('should return minutes for times less than an hour ago', () => {
      const thirtyMinutesAgo = new Date('2024-03-15T11:30:00Z').toISOString();
      expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30 minutes ago');

      const oneMinuteAgo = new Date('2024-03-15T11:59:00Z').toISOString();
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should return hours for times less than a day ago', () => {
      const twoHoursAgo = new Date('2024-03-15T10:00:00Z').toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');

      const oneHourAgo = new Date('2024-03-15T11:00:00Z').toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should return days for times less than a week ago', () => {
      const twoDaysAgo = new Date('2024-03-13T12:00:00Z').toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');

      const oneDayAgo = new Date('2024-03-14T12:00:00Z').toISOString();
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });

    it('should return formatted date for times more than a week ago', () => {
      const twoWeeksAgo = new Date('2024-03-01T12:00:00Z').toISOString();
      const result = formatRelativeTime(twoWeeksAgo);

      // Should return a formatted date, not relative time
      expect(result).toMatch(/March|Mar/);
      expect(result).toMatch(/1/);
      expect(result).toMatch(/2024/);
    });

    it('should handle invalid date strings', () => {
      expect(formatRelativeTime('invalid-date')).toBe('Invalid date');
      expect(formatRelativeTime('')).toBe('Invalid date');
      expect(formatRelativeTime('not-a-date')).toBe('Invalid date');
    });

    it('should handle edge cases correctly', () => {
      // Exactly 1 minute ago
      const exactlyOneMinute = new Date('2024-03-15T11:59:00Z').toISOString();
      expect(formatRelativeTime(exactlyOneMinute)).toBe('1 minute ago');

      // Exactly 1 hour ago
      const exactlyOneHour = new Date('2024-03-15T11:00:00Z').toISOString();
      expect(formatRelativeTime(exactlyOneHour)).toBe('1 hour ago');

      // Exactly 1 day ago
      const exactlyOneDay = new Date('2024-03-14T12:00:00Z').toISOString();
      expect(formatRelativeTime(exactlyOneDay)).toBe('1 day ago');
    });
  });
});
