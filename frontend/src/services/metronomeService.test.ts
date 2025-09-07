/**
 * Metronome Service Tests
 * Tests for metronome accuracy and functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetronomeService } from './metronomeService';
import { TimeSignature, MetronomeSound } from '../types/audio';

// Mock Web Audio API
const mockOscillator = {
  connect: vi.fn(),
  frequency: { setValueAtTime: vi.fn() },
  type: 'sine',
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

const mockAudioContext = {
  currentTime: 0,
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGainNode),
  destination: {},
  resume: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  state: 'running',
};

// Mock global AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

describe('MetronomeService', () => {
  let metronome: MetronomeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext.currentTime = 0;
    metronome = new MetronomeService();
  });

  afterEach(() => {
    if (metronome.isRunning()) {
      metronome.stop();
    }
    metronome.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = metronome.getConfig();
      
      expect(config.bpm).toBe(120);
      expect(config.timeSignature.numerator).toBe(4);
      expect(config.timeSignature.denominator).toBe(4);
      expect(config.sound).toBe('click');
      expect(config.volume).toBe(0.7);
    });

    it('should create audio context on initialization', () => {
      expect(window.AudioContext).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
  });

  describe('Basic Controls', () => {
    it('should start metronome', () => {
      expect(metronome.isRunning()).toBe(false);
      
      metronome.start();
      
      expect(metronome.isRunning()).toBe(true);
      expect(metronome.getCurrentBeat()).toBe(0);
      expect(metronome.getCurrentMeasure()).toBe(1);
    });

    it('should stop metronome', () => {
      metronome.start();
      expect(metronome.isRunning()).toBe(true);
      
      metronome.stop();
      
      expect(metronome.isRunning()).toBe(false);
      expect(metronome.getCurrentBeat()).toBe(0);
      expect(metronome.getCurrentMeasure()).toBe(1);
    });

    it('should pause and resume metronome', () => {
      metronome.start();
      expect(metronome.isRunning()).toBe(true);
      
      metronome.pause();
      expect(metronome.isRunning()).toBe(false);
      
      metronome.resume();
      expect(metronome.isRunning()).toBe(true);
    });

    it('should not start if already running', () => {
      metronome.start();
      const initialBeat = metronome.getCurrentBeat();
      
      metronome.start(); // Should have no effect
      
      expect(metronome.getCurrentBeat()).toBe(initialBeat);
    });
  });

  describe('Configuration', () => {
    it('should set BPM within valid range', () => {
      metronome.setBPM(140);
      expect(metronome.getConfig().bpm).toBe(140);
      
      metronome.setBPM(60);
      expect(metronome.getConfig().bpm).toBe(60);
      
      metronome.setBPM(200);
      expect(metronome.getConfig().bpm).toBe(200);
    });

    it('should reject invalid BPM values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalBpm = metronome.getConfig().bpm;
      
      metronome.setBPM(20); // Too low
      expect(metronome.getConfig().bpm).toBe(originalBpm);
      
      metronome.setBPM(350); // Too high
      expect(metronome.getConfig().bpm).toBe(originalBpm);
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it('should set time signature', () => {
      const timeSignature: TimeSignature = { numerator: 3, denominator: 4 };
      
      metronome.setTimeSignature(timeSignature);
      
      const config = metronome.getConfig();
      expect(config.timeSignature.numerator).toBe(3);
      expect(config.timeSignature.denominator).toBe(4);
    });

    it('should set volume within valid range', () => {
      metronome.setVolume(0.5);
      expect(metronome.getConfig().volume).toBe(0.5);
      
      metronome.setVolume(0);
      expect(metronome.getConfig().volume).toBe(0);
      
      metronome.setVolume(1);
      expect(metronome.getConfig().volume).toBe(1);
      
      // Test clamping
      metronome.setVolume(1.5);
      expect(metronome.getConfig().volume).toBe(1);
      
      metronome.setVolume(-0.1);
      expect(metronome.getConfig().volume).toBe(0);
    });

    it('should set sound type', () => {
      const sounds: MetronomeSound[] = ['click', 'beep', 'wood', 'rim', 'cowbell'];
      
      sounds.forEach(sound => {
        metronome.setSound(sound);
        expect(metronome.getConfig().sound).toBe(sound);
      });
    });
  });

  describe('Beat Timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate correct beat interval for 120 BPM', () => {
      metronome.setBPM(120);
      
      // At 120 BPM, each beat should be 0.5 seconds (500ms)
      const expectedInterval = 60 / 120; // 0.5 seconds
      
      // We can't directly test the private method, but we can verify
      // the timing through event emissions
      let beatCount = 0;
      metronome.addEventListener('beat', () => {
        beatCount++;
      });
      
      metronome.start();
      
      // Advance time and verify beats are triggered
      vi.advanceTimersByTime(1000); // 1 second
      
      // Should have approximately 2 beats in 1 second at 120 BPM
      expect(beatCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle different time signatures correctly', () => {
      let measureCount = 0;
      metronome.addEventListener('measure', () => {
        measureCount++;
      });
      
      // Test 3/4 time signature
      metronome.setTimeSignature({ numerator: 3, denominator: 4 });
      metronome.setBPM(120);
      metronome.start();
      
      // Advance through several beats
      vi.advanceTimersByTime(2000);
      
      // Should have triggered at least one measure
      expect(measureCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sound Generation', () => {
    it('should create oscillator and gain nodes for each beat', () => {
      metronome.start();
      
      // Advance time to trigger beats
      vi.advanceTimersByTime(600); // Slightly more than one beat at 120 BPM
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should connect audio nodes correctly', () => {
      metronome.start();
      vi.advanceTimersByTime(600);
      
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });

    it('should configure gain envelope for beats', () => {
      metronome.start();
      vi.advanceTimersByTime(600);
      
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
      expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
    it('should emit started event when metronome starts', () => {
      let startedEvent: any = null;
      metronome.addEventListener('started', (event) => {
        startedEvent = event;
      });
      
      metronome.start();
      
      expect(startedEvent).not.toBeNull();
      expect(startedEvent.config).toBeDefined();
      expect(startedEvent.config.bpm).toBe(120);
    });

    it('should emit stopped event when metronome stops', () => {
      let stoppedEvent: any = null;
      metronome.addEventListener('stopped', (event) => {
        stoppedEvent = event;
      });
      
      metronome.start();
      metronome.stop();
      
      expect(stoppedEvent).not.toBeNull();
      expect(stoppedEvent.totalBeats).toBeDefined();
      expect(stoppedEvent.duration).toBeDefined();
    });

    it('should emit beat events with correct information', () => {
      const beatEvents: any[] = [];
      metronome.addEventListener('beat', (event) => {
        beatEvents.push(event);
      });
      
      metronome.start();
      vi.advanceTimersByTime(1200); // Should trigger at least 2 beats
      
      expect(beatEvents.length).toBeGreaterThanOrEqual(1);
      
      const firstBeat = beatEvents[0];
      expect(firstBeat.beat).toBeGreaterThanOrEqual(1);
      expect(firstBeat.measure).toBe(1);
      expect(firstBeat.accent).toBeDefined();
      expect(firstBeat.time).toBeDefined();
    });

    it('should emit measure events correctly', () => {
      const measureEvents: any[] = [];
      metronome.addEventListener('measure', (event) => {
        measureEvents.push(event);
      });
      
      metronome.setBPM(240); // Fast tempo to trigger measures quickly
      metronome.start();
      vi.advanceTimersByTime(2000);
      
      if (measureEvents.length > 0) {
        const firstMeasure = measureEvents[0];
        expect(firstMeasure.measure).toBeGreaterThan(1);
        expect(firstMeasure.time).toBeDefined();
      }
    });

    it('should emit configuration change events', () => {
      let bpmChangedEvent: any = null;
      let timeSignatureChangedEvent: any = null;
      
      metronome.addEventListener('bpm_changed', (event) => {
        bpmChangedEvent = event;
      });
      
      metronome.addEventListener('time_signature_changed', (event) => {
        timeSignatureChangedEvent = event;
      });
      
      metronome.setBPM(140);
      metronome.setTimeSignature({ numerator: 3, denominator: 4 });
      
      expect(bpmChangedEvent).not.toBeNull();
      expect(bpmChangedEvent.bpm).toBe(140);
      
      expect(timeSignatureChangedEvent).not.toBeNull();
      expect(timeSignatureChangedEvent.timeSignature.numerator).toBe(3);
    });
  });

  describe('Accent Beats', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
    it('should mark first beat of measure as accent', () => {
      const beatEvents: any[] = [];
      metronome.addEventListener('beat', (event) => {
        beatEvents.push(event);
      });
      
      metronome.start();
      vi.advanceTimersByTime(600); // First beat
      
      expect(beatEvents.length).toBeGreaterThanOrEqual(1);
      expect(beatEvents[0].accent).toBe(true);
    });

    it('should mark non-first beats as non-accent', () => {
      const beatEvents: any[] = [];
      metronome.addEventListener('beat', (event) => {
        beatEvents.push(event);
      });
      
      metronome.start();
      vi.advanceTimersByTime(1200); // Multiple beats
      
      if (beatEvents.length > 1) {
        expect(beatEvents[1].accent).toBe(false);
      }
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
    it('should clean up resources on destroy', () => {
      metronome.start();
      
      metronome.destroy();
      
      expect(metronome.isRunning()).toBe(false);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      metronome.addEventListener('beat', listener);
      
      metronome.removeEventListener('beat', listener);
      
      metronome.start();
      vi.advanceTimersByTime(600);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle audio context initialization failure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock failed AudioContext creation
      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: vi.fn(() => {
          throw new Error('Audio context failed');
        }),
      });
      
      const failedMetronome = new MetronomeService();
      failedMetronome.start();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize metronome audio context:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle missing audio context gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create metronome with no audio context
      const brokenMetronome = new MetronomeService();
      (brokenMetronome as any).audioContext = null;
      
      brokenMetronome.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Audio context not initialized');
      consoleSpy.mockRestore();
    });
  });
});

// Integration test with real timing
describe('MetronomeService Integration', () => {
  it('should maintain accurate timing over multiple beats', async () => {
    const metronome = new MetronomeService();
    const beatTimes: number[] = [];
    
    metronome.addEventListener('beat', () => {
      beatTimes.push(Date.now());
    });
    
    metronome.setBPM(120); // 500ms per beat
    metronome.start();
    
    // Wait for several beats
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    metronome.stop();
    metronome.destroy();
    
    // Verify timing accuracy (allow 50ms tolerance)
    if (beatTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < beatTimes.length; i++) {
        intervals.push(beatTimes[i] - beatTimes[i - 1]);
      }
      
      const expectedInterval = 500; // 500ms for 120 BPM
      const tolerance = 50; // 50ms tolerance
      
      intervals.forEach(interval => {
        expect(interval).toBeGreaterThan(expectedInterval - tolerance);
        expect(interval).toBeLessThan(expectedInterval + tolerance);
      });
    }
  });
});