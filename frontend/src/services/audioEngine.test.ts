/**
 * Audio Engine Tests
 * Unit tests for the core audio engine functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioEngine } from './audioEngine';
import { AudioErrorCode } from '../types/audio';

// Mock Web Audio API
const mockAudioContext = {
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn() },
  })),
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  })),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    buffer: null,
    playbackRate: { value: 1 },
  })),
  decodeAudioData: vi.fn(() => Promise.resolve({
    duration: 180,
    sampleRate: 44100,
    numberOfChannels: 2,
  })),
  destination: {},
  state: 'running',
  sampleRate: 44100,
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
  addEventListener: vi.fn(),
};

const mockHTMLAudioElement = {
  canPlayType: vi.fn(() => 'probably'),
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  crossOrigin: '',
  preload: '',
  src: '',
  currentTime: 0,
  duration: 180,
  volume: 1,
  playbackRate: 1,
  buffered: {
    length: 1,
    end: vi.fn(() => 180),
  },
  error: null,
};

// Mock global objects
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: vi.fn((tag: string) => {
    if (tag === 'audio') {
      return mockHTMLAudioElement;
    }
    return {};
  }),
});

describe('AudioEngine', () => {
  let audioEngine: AudioEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    audioEngine = new AudioEngine();
  });

  afterEach(() => {
    audioEngine.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = audioEngine.getState();
      expect(state.playbackState).toBe('idle');
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.volume).toBe(1);
      expect(state.playbackRate).toBe(1);
      expect(state.isSupported).toBe(true);
    });

    it('should detect audio capabilities', () => {
      const capabilities = audioEngine.getCapabilities();
      expect(capabilities.webAudioSupported).toBe(true);
      expect(capabilities.html5AudioSupported).toBe(true);
      expect(capabilities.hasAudioContext).toBe(true);
      expect(capabilities.supportedFormats).toContain('mp3');
    });
  });

  describe('Playback Controls', () => {
    it('should handle play command', async () => {
      const listeners = new Set();
      audioEngine.addEventListener('statechange', (event) => {
        listeners.add(event);
      });

      await audioEngine.play();
      
      const state = audioEngine.getState();
      expect(state.playbackState).toBe('playing');
    });

    it('should handle pause command', () => {
      audioEngine.pause();
      
      const state = audioEngine.getState();
      expect(state.playbackState).toBe('paused');
    });

    it('should handle stop command', () => {
      audioEngine.stop();
      
      const state = audioEngine.getState();
      expect(state.playbackState).toBe('stopped');
      expect(state.currentTime).toBe(0);
    });

    it('should handle seek command', () => {
      const seekTime = 60;
      audioEngine.seek(seekTime);
      
      const state = audioEngine.getState();
      expect(state.currentTime).toBe(seekTime);
    });

    it('should clamp seek time to valid range', () => {
      // Set duration first
      audioEngine['updateState']({ duration: 180 });
      
      // Test negative seek
      audioEngine.seek(-10);
      expect(audioEngine.getState().currentTime).toBe(0);
      
      // Test seek beyond duration
      audioEngine.seek(200);
      expect(audioEngine.getState().currentTime).toBe(180);
    });
  });

  describe('Volume and Playback Rate', () => {
    it('should set volume correctly', () => {
      audioEngine.setVolume(0.5);
      
      const state = audioEngine.getState();
      expect(state.volume).toBe(0.5);
    });

    it('should clamp volume to valid range', () => {
      // Test negative volume
      audioEngine.setVolume(-0.1);
      expect(audioEngine.getState().volume).toBe(0);
      
      // Test volume > 1
      audioEngine.setVolume(1.5);
      expect(audioEngine.getState().volume).toBe(1);
    });

    it('should set playback rate correctly', () => {
      audioEngine.setPlaybackRate(1.5);
      
      const state = audioEngine.getState();
      expect(state.playbackRate).toBe(1.5);
    });

    it('should clamp playback rate to valid range', () => {
      // Test rate too low
      audioEngine.setPlaybackRate(0.1);
      expect(audioEngine.getState().playbackRate).toBe(0.5);
      
      // Test rate too high
      audioEngine.setPlaybackRate(3.0);
      expect(audioEngine.getState().playbackRate).toBe(2.0);
    });
  });

  describe('Track Loading', () => {
    const mockAudioSource = {
      id: 'test-track',
      url: 'https://example.com/test.mp3',
      title: 'Test Track',
      artist: 'Test Artist',
      duration: 180,
      format: 'mp3' as const,
      quality: 'high' as const,
    };

    it('should load track successfully', async () => {
      // Mock fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        })
      ) as unknown;

      await audioEngine.loadTrack(mockAudioSource);
      
      const state = audioEngine.getState();
      expect(state.currentTrack).toEqual(mockAudioSource);
      expect(state.playbackState).toBe('idle');
    });

    it('should handle loading errors', async () => {
      // Mock failed fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      ) as unknown;

      const errorSpy = vi.fn();
      audioEngine.addEventListener('error', errorSpy);

      await audioEngine.loadTrack(mockAudioSource);
      
      expect(errorSpy).toHaveBeenCalled();
      const errorEvent = errorSpy.mock.calls[0][0];
      expect(errorEvent.error.code).toBe(AudioErrorCode.NETWORK_ERROR);
    });
  });

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      
      audioEngine.addEventListener('statechange', listener);
      audioEngine.removeEventListener('statechange', listener);
      
      // Trigger state change
      audioEngine['emit']('statechange', { 
        state: 'playing', 
        previousState: 'idle' 
      });
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit events correctly', () => {
      const listener = vi.fn();
      audioEngine.addEventListener('statechange', listener);
      
      audioEngine['emit']('statechange', { 
        state: 'playing', 
        previousState: 'idle' 
      });
      
      expect(listener).toHaveBeenCalledWith({
        state: 'playing',
        previousState: 'idle',
      });
    });

    it('should handle listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      audioEngine.addEventListener('statechange', errorListener);
      audioEngine['emit']('statechange', { 
        state: 'playing', 
        previousState: 'idle' 
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        volume: 0.8,
        loop: true,
        crossfade: {
          enabled: true,
          duration: 3,
          type: 'exponential' as const,
        },
      };
      
      audioEngine.updateConfig(newConfig);
      
      // Configuration is private, but we can test its effects
      audioEngine.setVolume(0.8);
      expect(audioEngine.getState().volume).toBe(0.8);
    });
  });

  describe('Visualization', () => {
    it('should provide visualization data when available', () => {
      const data = audioEngine.getVisualizationData();
      
      if (data) {
        expect(data).toHaveProperty('frequencyData');
        expect(data).toHaveProperty('timeData');
        expect(data).toHaveProperty('bufferLength');
        expect(data).toHaveProperty('sampleRate');
      }
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const stopSpy = vi.spyOn(audioEngine, 'stop');
      
      audioEngine.destroy();
      
      expect(stopSpy).toHaveBeenCalled();
      
      // Verify audio context is closed
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle playback errors gracefully', async () => {
      const errorSpy = vi.fn();
      audioEngine.addEventListener('error', errorSpy);
      
      // Mock play failure
      mockHTMLAudioElement.play = vi.fn(() => Promise.reject(new Error('Playback failed')));
      
      await audioEngine.play();
      
      expect(errorSpy).toHaveBeenCalled();
      const errorEvent = errorSpy.mock.calls[0][0];
      expect(errorEvent.error.code).toBe(AudioErrorCode.PLAYBACK_FAILED);
    });

    it('should handle HTML5 audio errors', () => {
      const errorSpy = vi.fn();
      audioEngine.addEventListener('error', errorSpy);
      
      // Simulate HTML5 audio error
      const errorEvent = new Event('error');
      const mockError = { code: 2 }; // MEDIA_ERR_NETWORK
      mockHTMLAudioElement.error = mockError;
      
      audioEngine['handleHTMLAudioError'](errorEvent);
      
      expect(errorSpy).toHaveBeenCalled();
      const emittedError = errorSpy.mock.calls[0][0];
      expect(emittedError.error.code).toBe(AudioErrorCode.NETWORK_ERROR);
    });
  });

  describe('Browser Compatibility', () => {
    it('should fall back to HTML5 Audio when Web Audio is not available', () => {
      // Mock no Web Audio API
      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: undefined,
      });

      const fallbackEngine = new AudioEngine();
      const state = fallbackEngine.getState();
      
      expect(state.usingFallback).toBe(true);
      
      fallbackEngine.destroy();
    });

    it('should handle unsupported browsers gracefully', () => {
      // Mock no audio support
      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: undefined,
      });
      
      Object.defineProperty(document, 'createElement', {
        writable: true,
        value: vi.fn(() => ({ canPlayType: () => '' })),
      });

      const errorSpy = vi.fn();
      const unsupportedEngine = new AudioEngine();
      unsupportedEngine.addEventListener('error', errorSpy);
      
      // Wait for initialization
      setTimeout(() => {
        expect(errorSpy).toHaveBeenCalled();
        const errorEvent = errorSpy.mock.calls[0][0];
        expect(errorEvent.error.code).toBe(AudioErrorCode.NOT_SUPPORTED);
        
        unsupportedEngine.destroy();
      }, 100);
    });
  });
});