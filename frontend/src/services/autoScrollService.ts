/**
 * Enhanced Auto-Scroll Service
 * Provides intelligent auto-scrolling functionality with configurable speed,
 * smart scrolling that follows song structure, and tempo synchronization
 */

import { ChordTimeMapping } from '../types/audio';

export interface AutoScrollConfig {
  enabled: boolean;
  speed: number; // Scroll speed multiplier (0.1 - 5.0)
  smoothness: number; // Smoothness factor (0.1 - 1.0)
  followTempo: boolean; // Synchronize with audio playback tempo
  smartScrolling: boolean; // Use intelligent scrolling based on song structure
  anticipation: number; // How far ahead to scroll (in seconds, 0-5)
  behavior: 'smooth' | 'instant' | 'progressive';
  centerThreshold: number; // Percentage of viewport for centering (0-1)
  emergencyStop: boolean; // Emergency stop capability
  manualOverride: boolean; // Allow manual override
}

export interface ScrollPosition {
  element: HTMLElement;
  offsetTop: number;
  timestamp: number;
  chordId?: string;
  sectionType?: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';
}

export interface SmartScrollContext {
  currentSection?: string;
  nextSection?: string;
  sectionBoundaries: Array<{
    time: number;
    section: string;
    element?: HTMLElement;
  }>;
  tempo: number; // Current BPM
  timeSignature: string;
}

export class AutoScrollService {
  private config: AutoScrollConfig = {
    enabled: false,
    speed: 1.0,
    smoothness: 0.8,
    followTempo: true,
    smartScrolling: true,
    anticipation: 2.0,
    behavior: 'smooth',
    centerThreshold: 0.3,
    emergencyStop: true,
    manualOverride: true,
  };

  private isScrolling = false;
  private isEmergencyStopped = false;
  private manualOverrideActive = false;
  private scrollQueue: ScrollPosition[] = [];
  private currentPosition: ScrollPosition | null = null;
  private animationFrame: number | null = null;
  private lastScrollTime = 0;
  private scrollContainer: HTMLElement | null = null;
  private smartContext: SmartScrollContext | null = null;
  private eventListeners = new Map<string, Set<Function>>();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Set up event listeners for emergency stop
    if (this.config.emergencyStop) {
      this.setupEmergencyControls();
    }
  }

  private setupEmergencyControls(): void {
    // Escape key for emergency stop
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && event.ctrlKey) {
        this.emergencyStop();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
  }

  // Configuration management
  updateConfig(newConfig: Partial<AutoScrollConfig>): void {
    const previousEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    // If disabled, stop any active scrolling
    if (previousEnabled && !this.config.enabled) {
      this.stop();
    }

    this.emit('configUpdate', { config: this.config });
  }

  getConfig(): AutoScrollConfig {
    return { ...this.config };
  }

  // Scroll container management
  setScrollContainer(container: HTMLElement): void {
    this.scrollContainer = container;
    
    if (this.config.manualOverride) {
      this.setupManualOverrideDetection(container);
    }
  }

  private setupManualOverrideDetection(container: HTMLElement): void {
    let manualScrollTimeout: NodeJS.Timeout;

    const handleManualScroll = () => {
      if (!this.isScrolling) {
        this.manualOverrideActive = true;
        this.emit('manualOverride', { active: true });

        // Clear previous timeout
        clearTimeout(manualScrollTimeout);

        // Reset override after inactivity
        manualScrollTimeout = setTimeout(() => {
          this.manualOverrideActive = false;
          this.emit('manualOverride', { active: false });
        }, 3000);
      }
    };

    container.addEventListener('wheel', handleManualScroll, { passive: true });
    container.addEventListener('touchmove', handleManualScroll, { passive: true });
    container.addEventListener('scroll', handleManualScroll, { passive: true });
  }

  // Smart scrolling context
  setSmartContext(context: SmartScrollContext): void {
    this.smartContext = context;
  }

  updateTempo(bpm: number): void {
    if (this.smartContext) {
      this.smartContext.tempo = bpm;
    }
  }

  // Main scrolling methods
  scrollToChord(
    chordMapping: ChordTimeMapping,
    element: HTMLElement,
    currentTime: number
  ): void {
    if (!this.config.enabled || this.isEmergencyStopped || 
        (this.config.manualOverride && this.manualOverrideActive)) {
      return;
    }

    const scrollPosition: ScrollPosition = {
      element,
      offsetTop: element.offsetTop,
      timestamp: currentTime,
      chordId: chordMapping.id,
      sectionType: this.inferSectionType(chordMapping),
    };

    if (this.config.smartScrolling) {
      this.smartScroll(scrollPosition);
    } else {
      this.basicScroll(scrollPosition);
    }
  }

  private basicScroll(position: ScrollPosition): void {
    if (!this.scrollContainer) return;

    this.isScrolling = true;
    this.currentPosition = position;

    const targetScrollTop = this.calculateScrollTop(position);
    
    if (this.config.behavior === 'instant') {
      this.scrollContainer.scrollTop = targetScrollTop;
      this.isScrolling = false;
    } else {
      this.animateScroll(targetScrollTop);
    }
  }

  private smartScroll(position: ScrollPosition): void {
    if (!this.smartContext || !this.scrollContainer) {
      this.basicScroll(position);
      return;
    }

    // Anticipatory scrolling based on tempo and song structure
    const anticipationOffset = this.calculateAnticipationOffset();
    const smartTargetTop = this.calculateSmartScrollTop(position, anticipationOffset);

    this.isScrolling = true;
    this.currentPosition = position;

    if (this.config.behavior === 'progressive') {
      this.progressiveScroll(smartTargetTop);
    } else {
      this.animateScroll(smartTargetTop);
    }
  }

  private calculateScrollTop(position: ScrollPosition): number {
    if (!this.scrollContainer) return 0;

    const containerHeight = this.scrollContainer.clientHeight;
    const centerPoint = containerHeight * this.config.centerThreshold;
    
    return Math.max(0, position.offsetTop - centerPoint);
  }

  private calculateSmartScrollTop(position: ScrollPosition, anticipationOffset: number): number {
    const basicScrollTop = this.calculateScrollTop(position);
    
    // Apply anticipation offset based on tempo and structure
    return Math.max(0, basicScrollTop - anticipationOffset);
  }

  private calculateAnticipationOffset(): number {
    if (!this.smartContext || !this.config.followTempo) {
      return this.config.anticipation * 20; // Default pixel offset
    }

    // Calculate offset based on tempo
    const beatsPerSecond = this.smartContext.tempo / 60;
    const anticipationBeats = this.config.anticipation * beatsPerSecond;
    
    // Convert to approximate pixel offset
    return anticipationBeats * 15; // ~15 pixels per beat estimate
  }

  private animateScroll(targetScrollTop: number): void {
    if (!this.scrollContainer) return;

    const startScrollTop = this.scrollContainer.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const duration = this.calculateScrollDuration(Math.abs(distance));
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      if (this.isEmergencyStopped) {
        this.isScrolling = false;
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply easing based on smoothness config
      const easedProgress = this.easeInOutQuad(progress);
      const currentScrollTop = startScrollTop + (distance * easedProgress);
      
      this.scrollContainer!.scrollTop = currentScrollTop;

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.isScrolling = false;
        this.animationFrame = null;
        this.emit('scrollComplete', { position: this.currentPosition });
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  private progressiveScroll(targetScrollTop: number): void {
    // Progressive scrolling that adapts to tempo changes
    if (!this.scrollContainer || !this.smartContext) return;

    const tempoFactor = this.smartContext.tempo / 120; // Normalize to 120 BPM
    const adjustedSpeed = this.config.speed * tempoFactor;
    const stepSize = Math.max(1, adjustedSpeed * 2);

    const step = () => {
      if (this.isEmergencyStopped || !this.scrollContainer) {
        this.isScrolling = false;
        return;
      }

      const current = this.scrollContainer.scrollTop;
      const distance = targetScrollTop - current;
      
      if (Math.abs(distance) < stepSize) {
        this.scrollContainer.scrollTop = targetScrollTop;
        this.isScrolling = false;
        this.emit('scrollComplete', { position: this.currentPosition });
        return;
      }

      const direction = distance > 0 ? 1 : -1;
      this.scrollContainer.scrollTop += stepSize * direction;
      
      this.animationFrame = requestAnimationFrame(step);
    };

    this.animationFrame = requestAnimationFrame(step);
  }

  private calculateScrollDuration(distance: number): number {
    // Base duration adjusted by speed and smoothness
    const baseDuration = Math.max(200, Math.min(1000, distance * 2));
    const speedAdjusted = baseDuration / this.config.speed;
    return speedAdjusted * this.config.smoothness;
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  private inferSectionType(chordMapping: ChordTimeMapping): ScrollPosition['sectionType'] {
    // Try to infer section type from chord metadata
    if (chordMapping.metadata?.notes) {
      const notes = chordMapping.metadata.notes.join(' ').toLowerCase();
      if (notes.includes('verse')) return 'verse';
      if (notes.includes('chorus')) return 'chorus';
      if (notes.includes('bridge')) return 'bridge';
      if (notes.includes('intro')) return 'intro';
      if (notes.includes('outro')) return 'outro';
    }
    return undefined;
  }

  // Control methods
  pause(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.isScrolling = false;
    this.emit('pause', {});
  }

  resume(): void {
    if (this.currentPosition && !this.isScrolling) {
      // Resume scrolling to the last target
      this.scrollToChord(
        { id: this.currentPosition.chordId || '' } as ChordTimeMapping,
        this.currentPosition.element,
        this.currentPosition.timestamp
      );
    }
    this.emit('resume', {});
  }

  stop(): void {
    this.pause();
    this.currentPosition = null;
    this.scrollQueue = [];
    this.emit('stop', {});
  }

  emergencyStop(): void {
    this.isEmergencyStopped = true;
    this.stop();
    this.emit('emergencyStop', {});
  }

  clearEmergencyStop(): void {
    this.isEmergencyStopped = false;
    this.emit('emergencyStopCleared', {});
  }

  // Event handling
  addEventListener(type: string, listener: (...args: unknown[]) => unknown): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (...args: unknown[]) => unknown): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit(type: string, data: unknown): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in auto-scroll event listener for ${type}:`, error);
        }
      });
    }
  }

  // State getters
  isActive(): boolean {
    return this.config.enabled && !this.isEmergencyStopped;
  }

  isManualOverrideActive(): boolean {
    return this.manualOverrideActive;
  }

  getCurrentPosition(): ScrollPosition | null {
    return this.currentPosition;
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.eventListeners.clear();
    
    // Remove event listeners
    document.removeEventListener('keydown', this.setupEmergencyControls);
  }
}

// Export singleton instance
export const autoScrollService = new AutoScrollService();