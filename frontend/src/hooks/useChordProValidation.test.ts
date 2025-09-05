/**
 * Tests for useChordProValidation hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChordProValidation } from './useChordProValidation';
import { ChordProValidator } from '../services/chordProValidation';

// Mock timers
vi.useFakeTimers();

describe('useChordProValidation', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => 
      useChordProValidation('', { enableRealTime: false })
    );

    expect(result.current.isValidating).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.hasWarnings).toBe(false);
    expect(result.current.errorCount).toBe(0);
    expect(result.current.warningCount).toBe(0);
  });

  it('validates content when enabled', async () => {
    const onValidationChange = vi.fn();
    const { result } = renderHook(() => 
      useChordProValidation('{title: Test}\n[C]Valid chord', {
        enableRealTime: true,
        debounceMs: 100,
        onValidationChange
      })
    );

    // Fast-forward timers to trigger debounced validation
    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    expect(result.current.hasErrors).toBe(false);
    expect(result.current.hasWarnings).toBe(false);
    expect(onValidationChange).toHaveBeenCalled();
  });

  it('detects validation errors', async () => {
    const { result } = renderHook(() => 
      useChordProValidation('[X]Invalid chord', {
        enableRealTime: true,
        debounceMs: 100
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.hasErrors).toBe(true);
    });

    expect(result.current.errorCount).toBeGreaterThan(0);
    expect(result.current.result?.errors).toHaveLength(result.current.errorCount);
  });

  it('handles content updates with debouncing', async () => {
    const { result, rerender } = renderHook(
      ({ content }) => useChordProValidation(content, {
        enableRealTime: true,
        debounceMs: 100
      }),
      { initialProps: { content: '[C]' } }
    );

    // Update content multiple times quickly
    rerender({ content: '[C]Valid' });
    rerender({ content: '[C]Valid [G]' });
    rerender({ content: '[C]Valid [G]Also valid' });

    // Should not validate yet (debounced)
    expect(result.current.isValidating).toBe(false);

    // Fast-forward past debounce time
    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    expect(result.current.hasErrors).toBe(false);
  });

  it('validates manually when requested', async () => {
    const { result } = renderHook(() => 
      useChordProValidation('{title: Test}', {
        enableRealTime: false
      })
    );

    expect(result.current.result).toBeNull();

    act(() => {
      result.current.validateNow();
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    expect(result.current.hasErrors).toBe(false);
  });

  it('gets errors at specific position', async () => {
    const { result } = renderHook(() => 
      useChordProValidation('[X]Invalid at position 1', {
        enableRealTime: true,
        debounceMs: 100
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.hasErrors).toBe(true);
    });

    const errorsAt1 = result.current.getErrorsAtPosition(1);
    expect(errorsAt1).toHaveLength(1);

    const errorsAt10 = result.current.getErrorsAtPosition(10);
    expect(errorsAt10).toHaveLength(0);
  });

  it('gets errors in range', async () => {
    const { result } = renderHook(() => 
      useChordProValidation('[X]Invalid [Y]Also invalid', {
        enableRealTime: true,
        debounceMs: 100
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.errorCount).toBeGreaterThan(0);
    });

    const errorsInRange = result.current.getErrorsInRange(0, 10);
    expect(errorsInRange.length).toBeGreaterThan(0);
  });

  it('filters errors by type', async () => {
    const { result } = renderHook(() => 
      useChordProValidation('[X]Invalid chord', {
        enableRealTime: true,
        debounceMs: 100
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.hasErrors).toBe(true);
    });

    const chordErrors = result.current.getErrorsByType('chord');
    expect(chordErrors.length).toBeGreaterThan(0);

    const directiveErrors = result.current.getErrorsByType('directive');
    expect(directiveErrors).toHaveLength(0);
  });

  it('updates validator configuration', async () => {
    const { result } = renderHook(() => 
      useChordProValidation('{titel: Typo}', {
        enableRealTime: true,
        debounceMs: 100
      })
    );

    // Initially shouldn't flag typos (not in strict mode)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    const initialWarnings = result.current.warningCount;

    // Enable strict mode and typo checking
    act(() => {
      result.current.updateConfig({ 
        strictMode: true, 
        checkTypos: true 
      });
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.warningCount).toBeGreaterThanOrEqual(initialWarnings);
    });
  });

  it('handles disabled real-time validation', () => {
    const { result } = renderHook(() => 
      useChordProValidation('[X]Invalid', {
        enableRealTime: false
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not auto-validate
    expect(result.current.result).toBeNull();
  });

  it('uses custom validator', async () => {
    const customValidator = new ChordProValidator({
      strictMode: true,
      checkTypos: false
    });

    const { result } = renderHook(() => 
      useChordProValidation('{unknown: directive}', {
        validator: customValidator,
        enableRealTime: true,
        debounceMs: 100
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    // Should flag unknown directive in strict mode
    expect(result.current.hasWarnings).toBe(true);
  });

  it('handles validation errors gracefully', async () => {
    const mockValidator = {
      validateContent: vi.fn().mockImplementation(() => {
        throw new Error('Validation failed');
      }),
      updateConfig: vi.fn(),
      getConfig: vi.fn().mockReturnValue({})
    };

    // Spy on console.error to suppress error logging in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => 
      useChordProValidation('test content', {
        // @ts-ignore - using mock validator for testing
        validator: mockValidator,
        enableRealTime: true,
        debounceMs: 100
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.result?.isValid).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Validation error:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});