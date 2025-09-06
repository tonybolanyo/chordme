/**
 * Metronome Service
 * Provides accurate metronome functionality using Web Audio API
 */

import {
  IMetronomeService,
  MetronomeConfig,
  TimeSignature,
  MetronomeSubdivision,
  MetronomeSound,
  MetronomeEventMap,
} from '../types/audio';

type EventListener<K extends keyof MetronomeEventMap> = (event: MetronomeEventMap[K]) => void;

export class MetronomeService implements IMetronomeService {
  private audioContext?: AudioContext;
  private isActive = false;
  private currentBeat = 0;
  private currentMeasure = 0;
  private nextBeatTime = 0;
  private timerID?: number;
  private eventListeners = new Map<keyof MetronomeEventMap, Set<EventListener<any>>>();
  
  private config: MetronomeConfig = {
    enabled: true,
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    subdivision: 'quarter',
    volume: 0.7,
    sound: 'click',
    visualCue: true,
    countIn: 0,
    accentBeats: true,
  };

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Handle audio context state changes
      this.audioContext.addEventListener('statechange', () => {
        if (this.audioContext?.state === 'suspended' && this.isActive) {
          this.audioContext.resume();
        }
      });
    } catch (error) {
      console.error('Failed to initialize metronome audio context:', error);
    }
  }

  // Basic controls
  start(): void {
    if (!this.audioContext) {
      console.error('Audio context not initialized');
      return;
    }

    if (this.isActive) return;

    this.isActive = true;
    this.currentBeat = 0;
    this.currentMeasure = 1;
    this.nextBeatTime = this.audioContext.currentTime;
    
    this.scheduleNextBeat();
    this.emit('started', { config: { ...this.config } });
  }

  stop(): void {
    if (!this.isActive) return;

    const totalBeats = (this.currentMeasure - 1) * this.config.timeSignature.numerator + this.currentBeat;
    const duration = this.audioContext ? this.audioContext.currentTime - (this.nextBeatTime - this.getBeatInterval()) : 0;
    
    this.isActive = false;
    this.currentBeat = 0;
    this.currentMeasure = 1;
    
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = undefined;
    }
    
    this.emit('stopped', { totalBeats, duration });
  }

  pause(): void {
    this.isActive = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = undefined;
    }
  }

  resume(): void {
    if (!this.audioContext || this.isActive) return;
    
    this.isActive = true;
    this.nextBeatTime = this.audioContext.currentTime;
    this.scheduleNextBeat();
  }

  // Configuration methods
  setBPM(bpm: number): void {
    if (bpm < 30 || bpm > 300) {
      console.warn('BPM must be between 30 and 300');
      return;
    }
    
    this.config.bpm = bpm;
    this.emit('bpm_changed', { bpm });
  }

  setTimeSignature(timeSignature: TimeSignature): void {
    this.config.timeSignature = { ...timeSignature };
    this.currentBeat = 0; // Reset beat count
    this.emit('time_signature_changed', { timeSignature: { ...timeSignature } });
  }

  setSubdivision(subdivision: MetronomeSubdivision): void {
    this.config.subdivision = subdivision;
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  setSound(sound: MetronomeSound): void {
    this.config.sound = sound;
  }

  // State methods
  isRunning(): boolean {
    return this.isActive;
  }

  getCurrentBeat(): number {
    return this.currentBeat;
  }

  getCurrentMeasure(): number {
    return this.currentMeasure;
  }

  getConfig(): MetronomeConfig {
    return { ...this.config };
  }

  // Private methods
  private scheduleNextBeat(): void {
    if (!this.isActive || !this.audioContext) return;

    // Schedule beats ahead of time for accuracy
    const lookAhead = 0.1; // 100ms look ahead
    const scheduleAheadTime = 0.1;

    while (this.nextBeatTime < this.audioContext.currentTime + scheduleAheadTime) {
      this.scheduleBeat(this.nextBeatTime);
      this.nextNote();
    }

    this.timerID = window.setTimeout(() => this.scheduleNextBeat(), lookAhead * 1000);
  }

  private scheduleBeat(time: number): void {
    if (!this.audioContext) return;

    const isAccent = this.currentBeat === 0 && this.config.accentBeats;
    
    // Create and schedule the sound
    this.createBeatSound(time, isAccent);
    
    // Emit beat event
    this.emit('beat', {
      beat: this.currentBeat + 1,
      measure: this.currentMeasure,
      accent: isAccent,
      time,
    });
  }

  private createBeatSound(time: number, isAccent: boolean): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure sound based on type and accent
    const frequency = this.getSoundFrequency(isAccent);
    const duration = this.getSoundDuration();

    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.type = this.getOscillatorType();

    // Configure gain envelope
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(this.config.volume * (isAccent ? 1.2 : 1), time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

    // Start and stop oscillator
    oscillator.start(time);
    oscillator.stop(time + duration);
  }

  private getSoundFrequency(isAccent: boolean): number {
    const baseFrequencies = {
      click: isAccent ? 1000 : 800,
      beep: isAccent ? 880 : 660,
      wood: isAccent ? 2000 : 1500,
      rim: isAccent ? 3000 : 2000,
      cowbell: isAccent ? 800 : 600,
    };
    
    return baseFrequencies[this.config.sound] || baseFrequencies.click;
  }

  private getSoundDuration(): number {
    const durations = {
      click: 0.05,
      beep: 0.1,
      wood: 0.08,
      rim: 0.03,
      cowbell: 0.15,
    };
    
    return durations[this.config.sound] || durations.click;
  }

  private getOscillatorType(): OscillatorType {
    const types = {
      click: 'square' as OscillatorType,
      beep: 'sine' as OscillatorType,
      wood: 'sawtooth' as OscillatorType,
      rim: 'triangle' as OscillatorType,
      cowbell: 'square' as OscillatorType,
    };
    
    return types[this.config.sound] || types.click;
  }

  private nextNote(): void {
    const secondsPerBeat = this.getBeatInterval();
    this.nextBeatTime += secondsPerBeat;

    this.currentBeat++;
    if (this.currentBeat >= this.getBeatsPerMeasure()) {
      this.currentBeat = 0;
      this.currentMeasure++;
      this.emit('measure', { measure: this.currentMeasure, time: this.nextBeatTime });
    }
  }

  private getBeatInterval(): number {
    const beatsPerMinute = this.config.bpm * this.getSubdivisionMultiplier();
    return 60.0 / beatsPerMinute;
  }

  private getBeatsPerMeasure(): number {
    return this.config.timeSignature.numerator * this.getSubdivisionMultiplier();
  }

  private getSubdivisionMultiplier(): number {
    const multipliers = {
      quarter: 1,
      eighth: 2,
      sixteenth: 4,
      triplet: 3,
    };
    
    return multipliers[this.config.subdivision] || 1;
  }

  // Event handling
  addEventListener<K extends keyof MetronomeEventMap>(
    type: K,
    listener: EventListener<K>
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener<K extends keyof MetronomeEventMap>(
    type: K,
    listener: EventListener<K>
  ): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit<K extends keyof MetronomeEventMap>(type: K, event: MetronomeEventMap[K]): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in metronome event listener for ${type}:`, error);
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.eventListeners.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
    }
  }
}

// Export singleton instance
export const metronomeService = new MetronomeService();