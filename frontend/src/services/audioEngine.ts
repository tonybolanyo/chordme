/**
 * Core Audio Engine Service
 * Implements audio playback with Web Audio API and HTML5 Audio fallback
 */

import {
  AudioSource,
  PlaybackState,
  PlaybackConfig,
  AudioEngineState,
  AudioError,
  AudioErrorCode,
  AudioCapabilities,
  AudioEventMap,
  IAudioEngine,
  CrossfadeType,
  VisualizationData,
  Playlist,
  PlaylistItem,
} from '../types/audio';

type EventListener<K extends keyof AudioEventMap> = (event: AudioEventMap[K]) => void;

export class AudioEngine implements IAudioEngine {
  private audioContext?: AudioContext;
  private audioElement?: HTMLAudioElement;
  private gainNode?: GainNode;
  private analyserNode?: AnalyserNode;
  private sourceNode?: AudioBufferSourceNode | MediaElementAudioSourceNode;
  
  private state: AudioEngineState = {
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isBuffering: false,
    bufferProgress: 0,
    isSupported: false,
    usingFallback: false,
  };
  
  private config: PlaybackConfig = {
    volume: 1,
    playbackRate: 1,
    loop: false,
    shuffle: false,
    crossfade: {
      enabled: false,
      duration: 2,
      type: 'linear',
    },
    preloadNext: true,
    gaplessPlayback: false,
  };
  
  private eventListeners = new Map<keyof AudioEventMap, Set<EventListener<any>>>();
  private currentAudioBuffer?: AudioBuffer;
  private nextAudioBuffer?: AudioBuffer;
  private crossfadeTimeoutId?: number;
  private updateIntervalId?: number;
  private loadedMetadata = false;
  
  constructor() {
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    try {
      const capabilities = this.detectCapabilities();
      this.state.isSupported = capabilities.webAudioSupported || capabilities.html5AudioSupported;
      
      if (capabilities.webAudioSupported) {
        await this.initializeWebAudio();
      } else if (capabilities.html5AudioSupported) {
        this.initializeHTML5Audio();
        this.state.usingFallback = true;
      } else {
        this.handleError({
          code: AudioErrorCode.NOT_SUPPORTED,
          message: 'Audio playback is not supported in this browser',
          timestamp: new Date(),
          recoverable: false,
        });
      }
    } catch (error) {
      this.handleError({
        code: AudioErrorCode.PLAYBACK_FAILED,
        message: 'Failed to initialize audio engine',
        details: error,
        timestamp: new Date(),
        recoverable: false,
      });
    }
  }
  
  private async initializeWebAudio(): Promise<void> {
    try {
      // Create AudioContext with cross-browser compatibility
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Create audio nodes
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      
      // Configure analyser for visualization
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      
      // Connect nodes
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      
      // Handle audio context state changes
      this.audioContext.addEventListener('statechange', () => {
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
      });
      
    } catch (error) {
      throw new Error(`Failed to initialize Web Audio API: ${error}`);
    }
  }
  
  private initializeHTML5Audio(): void {
    this.audioElement = document.createElement('audio');
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'metadata';
    
    // Add event listeners
    this.audioElement.addEventListener('loadstart', () => this.updateState({ isBuffering: true }));
    this.audioElement.addEventListener('loadedmetadata', () => {
      this.loadedMetadata = true;
      this.updateState({ 
        duration: this.audioElement?.duration || 0,
        isBuffering: false 
      });
    });
    this.audioElement.addEventListener('canplay', () => this.updateState({ isBuffering: false }));
    this.audioElement.addEventListener('playing', () => this.updateState({ playbackState: 'playing' }));
    this.audioElement.addEventListener('pause', () => this.updateState({ playbackState: 'paused' }));
    this.audioElement.addEventListener('ended', () => this.handleTrackEnded());
    this.audioElement.addEventListener('error', (e) => this.handleHTMLAudioError(e));
    this.audioElement.addEventListener('progress', () => this.updateBufferProgress());
    this.audioElement.addEventListener('timeupdate', () => this.updateTime());
    
    // Set up regular time updates
    this.startTimeUpdates();
  }
  
  private detectCapabilities(): AudioCapabilities {
    const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
    const hasHTML5Audio = !!document.createElement('audio').canPlayType;
    
    const audio = document.createElement('audio');
    const supportedFormats: string[] = [];
    
    // Test format support
    const formatTests = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
    };
    
    Object.entries(formatTests).forEach(([format, mimeType]) => {
      if (audio.canPlayType(mimeType)) {
        supportedFormats.push(format);
      }
    });
    
    return {
      webAudioSupported: hasAudioContext,
      html5AudioSupported: hasHTML5Audio,
      supportedFormats: supportedFormats as any[],
      maxChannels: hasAudioContext ? 2 : 2, // Default to stereo
      maxSampleRate: hasAudioContext ? 48000 : 44100,
      canPlayType: (format) => audio.canPlayType(formatTests[format as keyof typeof formatTests]) !== '',
      hasAudioContext,
      hasGainNode: hasAudioContext,
      hasAnalyserNode: hasAudioContext,
      hasPannerNode: hasAudioContext,
      hasConvolverNode: hasAudioContext,
    };
  }
  
  // Public API Implementation
  
  async play(): Promise<void> {
    try {
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      if (this.audioElement) {
        await this.audioElement.play();
      } else if (this.sourceNode && this.audioContext) {
        // For Web Audio API, we need to recreate the source node
        if (this.currentAudioBuffer) {
          this.createBufferSource(this.currentAudioBuffer);
          this.sourceNode?.start(0, this.state.currentTime);
        }
      }
      
      this.updateState({ playbackState: 'playing' });
      this.emit('statechange', { state: 'playing', previousState: this.state.playbackState });
    } catch (error) {
      this.handleError({
        code: AudioErrorCode.PLAYBACK_FAILED,
        message: 'Failed to start playback',
        details: error,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }
  
  pause(): void {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
      } else if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode = undefined;
      }
      
      this.updateState({ playbackState: 'paused' });
      this.emit('statechange', { state: 'paused', previousState: this.state.playbackState });
    } catch (error) {
      this.handleError({
        code: AudioErrorCode.PLAYBACK_FAILED,
        message: 'Failed to pause playback',
        details: error,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }
  
  stop(): void {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } else if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode = undefined;
      }
      
      this.updateState({ 
        playbackState: 'stopped',
        currentTime: 0 
      });
      this.emit('statechange', { state: 'stopped', previousState: this.state.playbackState });
    } catch (error) {
      this.handleError({
        code: AudioErrorCode.PLAYBACK_FAILED,
        message: 'Failed to stop playback',
        details: error,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }
  
  seek(time: number): void {
    try {
      const clampedTime = Math.max(0, Math.min(time, this.state.duration));
      
      if (this.audioElement) {
        this.audioElement.currentTime = clampedTime;
      } else if (this.sourceNode && this.currentAudioBuffer) {
        // For Web Audio API, we need to recreate the source
        const wasPlaying = this.state.playbackState === 'playing';
        this.sourceNode.stop();
        this.createBufferSource(this.currentAudioBuffer);
        
        if (wasPlaying) {
          this.sourceNode?.start(0, clampedTime);
        }
      }
      
      this.updateState({ currentTime: clampedTime });
      this.emit('timeupdate', { 
        currentTime: clampedTime, 
        duration: this.state.duration,
        progress: clampedTime / this.state.duration 
      });
    } catch (error) {
      this.handleError({
        code: AudioErrorCode.PLAYBACK_FAILED,
        message: 'Failed to seek',
        details: error,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }
  
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.config.volume = clampedVolume;
    
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext!.currentTime);
    } else if (this.audioElement) {
      this.audioElement.volume = clampedVolume;
    }
    
    this.updateState({ volume: clampedVolume });
    this.emit('volumechange', { volume: clampedVolume });
  }
  
  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    this.config.playbackRate = clampedRate;
    
    if (this.audioElement) {
      this.audioElement.playbackRate = clampedRate;
    }
    // Note: Web Audio API playback rate requires more complex implementation
    
    this.updateState({ playbackRate: clampedRate });
    this.emit('ratechange', { playbackRate: clampedRate });
  }
  
  async loadTrack(source: AudioSource): Promise<void> {
    try {
      this.updateState({ playbackState: 'loading' });
      this.emit('loading', { progress: 0 });
      
      if (this.audioContext) {
        await this.loadTrackWebAudio(source);
      } else {
        await this.loadTrackHTML5(source);
      }
      
      this.updateState({ 
        currentTrack: source,
        playbackState: 'idle',
        currentTime: 0 
      });
      this.emit('loaded', { track: source });
      this.emit('trackchange', { track: source, index: 0 });
    } catch (error) {
      this.handleError({
        code: AudioErrorCode.NETWORK_ERROR,
        message: 'Failed to load audio track',
        details: error,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }
  
  private async loadTrackWebAudio(source: AudioSource): Promise<void> {
    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      this.currentAudioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      this.updateState({ duration: this.currentAudioBuffer.duration });
    } catch (error) {
      throw new Error(`Failed to load Web Audio track: ${error}`);
    }
  }
  
  private async loadTrackHTML5(source: AudioSource): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioElement) {
        reject(new Error('HTML5 Audio element not initialized'));
        return;
      }
      
      const handleLoad = () => {
        this.audioElement!.removeEventListener('canplaythrough', handleLoad);
        this.audioElement!.removeEventListener('error', handleError);
        resolve();
      };
      
      const handleError = () => {
        this.audioElement!.removeEventListener('canplaythrough', handleLoad);
        this.audioElement!.removeEventListener('error', handleError);
        reject(new Error('Failed to load HTML5 audio'));
      };
      
      this.audioElement.addEventListener('canplaythrough', handleLoad);
      this.audioElement.addEventListener('error', handleError);
      this.audioElement.src = source.url;
      this.audioElement.load();
    });
  }
  
  private createBufferSource(buffer: AudioBuffer): void {
    if (!this.audioContext || !this.gainNode) return;
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.playbackRate.value = this.config.playbackRate;
    this.sourceNode.connect(this.gainNode);
    
    this.sourceNode.addEventListener('ended', () => this.handleTrackEnded());
  }
  
  // Placeholder implementations for remaining methods
  async preloadTrack(source: AudioSource): Promise<void> {
    // TODO: Implement preloading
  }
  
  loadPlaylist(playlist: Playlist): void {
    this.updateState({ currentPlaylist: playlist });
    this.emit('playlistchange', { playlist });
  }
  
  async next(): Promise<void> {
    // TODO: Implement next track
  }
  
  async previous(): Promise<void> {
    // TODO: Implement previous track
  }
  
  async skipToTrack(index: number): Promise<void> {
    // TODO: Implement skip to track
  }
  
  updateConfig(config: Partial<PlaybackConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getCapabilities(): AudioCapabilities {
    return this.detectCapabilities();
  }
  
  getState(): AudioEngineState {
    return { ...this.state };
  }
  
  // Event handling
  addEventListener<K extends keyof AudioEventMap>(
    type: K,
    listener: EventListener<K>
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }
  
  removeEventListener<K extends keyof AudioEventMap>(
    type: K,
    listener: EventListener<K>
  ): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }
  
  private emit<K extends keyof AudioEventMap>(type: K, data: AudioEventMap[K]): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in audio event listener for ${type}:`, error);
        }
      });
    }
  }
  
  // Helper methods
  private updateState(updates: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...updates };
  }
  
  private handleError(error: AudioError): void {
    this.updateState({ error });
    this.emit('error', { error });
  }
  
  private handleHTMLAudioError(event: Event): void {
    const audioElement = event.target as HTMLAudioElement;
    const error = audioElement.error;
    
    let errorCode = AudioErrorCode.PLAYBACK_FAILED;
    let message = 'Audio playback error';
    
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_NETWORK:
          errorCode = AudioErrorCode.NETWORK_ERROR;
          message = 'Network error while loading audio';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorCode = AudioErrorCode.DECODE_ERROR;
          message = 'Error decoding audio data';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorCode = AudioErrorCode.NOT_SUPPORTED;
          message = 'Audio format not supported';
          break;
        case MediaError.MEDIA_ERR_ABORTED:
          errorCode = AudioErrorCode.PLAYBACK_FAILED;
          message = 'Audio playback aborted';
          break;
      }
    }
    
    this.handleError({
      code: errorCode,
      message,
      details: error,
      timestamp: new Date(),
      recoverable: errorCode !== AudioErrorCode.NOT_SUPPORTED,
    });
  }
  
  private handleTrackEnded(): void {
    if (this.state.currentTrack) {
      this.emit('ended', { track: this.state.currentTrack });
    }
    
    if (this.config.loop) {
      this.seek(0);
      this.play();
    } else {
      this.updateState({ playbackState: 'stopped', currentTime: 0 });
    }
  }
  
  private updateBufferProgress(): void {
    if (!this.audioElement) return;
    
    const buffered = this.audioElement.buffered;
    if (buffered.length > 0) {
      const bufferEnd = buffered.end(buffered.length - 1);
      const progress = bufferEnd / this.state.duration;
      this.updateState({ bufferProgress: progress });
    }
  }
  
  private updateTime(): void {
    if (this.audioElement) {
      const currentTime = this.audioElement.currentTime;
      this.updateState({ currentTime });
      this.emit('timeupdate', {
        currentTime,
        duration: this.state.duration,
        progress: currentTime / this.state.duration,
      });
    }
  }
  
  private startTimeUpdates(): void {
    this.updateIntervalId = window.setInterval(() => {
      if (this.state.playbackState === 'playing') {
        this.updateTime();
      }
    }, 100);
  }
  
  getVisualizationData(): VisualizationData | null {
    if (!this.analyserNode) return null;
    
    const bufferLength = this.analyserNode.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);
    
    this.analyserNode.getByteFrequencyData(frequencyData);
    this.analyserNode.getByteTimeDomainData(timeData);
    
    return {
      frequencyData,
      timeData,
      analyserNode: this.analyserNode,
      bufferLength,
      sampleRate: this.audioContext?.sampleRate || 44100,
      nyquist: (this.audioContext?.sampleRate || 44100) / 2,
    };
  }
  
  destroy(): void {
    // Clear intervals
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }
    
    if (this.crossfadeTimeoutId) {
      clearTimeout(this.crossfadeTimeoutId);
    }
    
    // Stop playback
    this.stop();
    
    // Disconnect Web Audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Remove HTML5 audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
    }
    
    // Clear event listeners
    this.eventListeners.clear();
  }
}

// Create singleton instance
export const audioEngine = new AudioEngine();