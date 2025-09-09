import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Extend global interface for test environment
declare global {
  var fetch: typeof globalThis.fetch;
}

// Mock localStorage before importing i18n config
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => null),
      removeItem: vi.fn(() => null),
      clear: vi.fn(() => null),
      length: 0,
      key: vi.fn(() => null),
    },
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => null),
      removeItem: vi.fn(() => null),
      clear: vi.fn(() => null),
      length: 0,
      key: vi.fn(() => null),
    },
    writable: true,
  });
});

// Initialize i18n after localStorage mock is set up
import '../i18n/config';

// Clean up after each test to prevent memory leaks
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  
  // Reset any global state that might persist between tests
  if (typeof window !== 'undefined') {
    // Clear any performance observers
    if (window.performance && window.performance.clearMarks) {
      window.performance.clearMarks();
    }
    if (window.performance && window.performance.clearMeasures) {
      window.performance.clearMeasures();
    }
  }
  
  // Force garbage collection if available (helps in test environments)
  if (global.gc) {
    global.gc();
  }
});

// Mock problematic browser APIs that cause memory issues
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn().mockReturnValue({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine'
    }),
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { value: 0 }
    }),
    destination: {},
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    state: 'running'
  }))
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext
});

// Mock Speech Recognition API
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    onresult: null,
    onerror: null,
    onend: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: window.SpeechRecognition
});
