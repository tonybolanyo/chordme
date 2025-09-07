/**
 * Practice Mode Service
 * Comprehensive practice features for musicians
 */

import {
  IPracticeModeService,
  PracticeSession,
  PracticeGoal,
  PracticeStatistics,
  Achievement,
  ChordTimingFeedback,
  PracticeRecording,
  PracticeSessionConfig,
  PracticeModeEventMap,
  DifficultyLevel,
  MetronomeConfig,
  ChordTimeMapping,
  LoopSection,
} from '../types/audio';

import { metronomeService } from './metronomeService';

type EventListener<K extends keyof PracticeModeEventMap> = (event: PracticeModeEventMap[K]) => void;

export class PracticeModeService implements IPracticeModeService {
  private currentSession?: PracticeSession;
  private isRecording = false;
  private recordingData?: PracticeRecording;
  private timingHistory: ChordTimingFeedback[] = [];
  private eventListeners = new Map<keyof PracticeModeEventMap, Set<EventListener<any>>>();
  private progressData: PracticeStatistics;

  constructor() {
    this.loadProgressData();
    this.initializeAchievements();
  }

  // Session management
  async startPracticeSession(config: PracticeSessionConfig): Promise<PracticeSession> {
    if (this.currentSession) {
      await this.endPracticeSession();
    }

    const session: PracticeSession = {
      id: this.generateId(),
      startTime: new Date(),
      duration: 0,
      songId: config.songId,
      practiceGoals: [...config.goals],
      statistics: { ...this.progressData },
      achievements: [],
      loopSections: config.loopSections || [],
      metronomeSettings: { ...config.metronome },
      difficultyLevel: config.difficulty,
      recordingEnabled: config.enableRecording,
    };

    this.currentSession = session;
    
    // Start metronome if enabled
    if (config.metronome.enabled) {
      this.configureMetronome(config.metronome);
      metronomeService.start();
    }

    // Start recording if enabled
    if (config.enableRecording) {
      await this.startRecording();
    }

    this.emit('practice:session_started', { session });
    return session;
  }

  async endPracticeSession(): Promise<void> {
    if (!this.currentSession) return;

    const endTime = new Date();
    const duration = (endTime.getTime() - this.currentSession.startTime.getTime()) / 1000;
    
    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;

    // Stop metronome
    if (metronomeService.isRunning()) {
      metronomeService.stop();
    }

    // Stop recording
    if (this.isRecording) {
      await this.stopRecording();
    }

    // Update statistics
    this.updateSessionStatistics(this.currentSession);
    
    // Check for achievements
    const newAchievements = this.checkAchievements();
    this.currentSession.achievements = newAchievements;

    // Save session data
    this.saveSessionData(this.currentSession);

    this.emit('practice:session_ended', { 
      session: this.currentSession, 
      statistics: this.progressData 
    });

    this.currentSession = undefined;
  }

  pausePracticeSession(): void {
    if (!this.currentSession) return;
    
    if (metronomeService.isRunning()) {
      metronomeService.pause();
    }
  }

  resumePracticeSession(): void {
    if (!this.currentSession) return;
    
    if (this.currentSession.metronomeSettings.enabled) {
      metronomeService.resume();
    }
  }

  getCurrentSession(): PracticeSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  // Goals and progress
  setGoals(goals: PracticeGoal[]): void {
    if (this.currentSession) {
      this.currentSession.practiceGoals = [...goals];
    }
  }

  updateProgress(statistics: Partial<PracticeStatistics>): void {
    this.progressData = { ...this.progressData, ...statistics };
    this.saveProgressData();
    this.emit('practice:progress_updated', { statistics: this.progressData });
  }

  getProgress(): PracticeStatistics {
    return { ...this.progressData };
  }

  checkAchievements(): Achievement[] {
    const achievements = this.getAvailableAchievements();
    const newAchievements: Achievement[] = [];

    achievements.forEach(achievement => {
      if (!achievement.unlockedAt && this.isAchievementUnlocked(achievement)) {
        achievement.unlockedAt = new Date();
        newAchievements.push(achievement);
        this.emit('practice:achievement_unlocked', { achievement });
      }
    });

    if (newAchievements.length > 0) {
      this.saveAchievements(achievements);
    }

    return newAchievements;
  }

  // Timing feedback
  analyzeChordTiming(mapping: ChordTimeMapping, actualTime: number): ChordTimingFeedback {
    const expectedTime = mapping.startTime;
    const timeDiff = actualTime - expectedTime;
    const tolerance = 0.1; // 100ms tolerance
    
    let timing: 'early' | 'late' | 'perfect';
    let accuracy: number;
    
    if (Math.abs(timeDiff) <= tolerance / 3) {
      timing = 'perfect';
      accuracy = 1.0;
    } else if (timeDiff < 0) {
      timing = 'early';
      accuracy = Math.max(0, 1 - Math.abs(timeDiff) / tolerance);
    } else {
      timing = 'late';
      accuracy = Math.max(0, 1 - Math.abs(timeDiff) / tolerance);
    }

    const feedback: ChordTimingFeedback = {
      chordName: mapping.chordName,
      expectedTime,
      actualTime,
      accuracy,
      timing,
      feedback: this.generateTimingFeedback(timing, accuracy),
      suggestion: this.generateTimingSuggestion(timing, timeDiff),
    };

    this.timingHistory.push(feedback);
    this.emit('practice:timing_feedback', { feedback });

    return feedback;
  }

  getTimingHistory(): ChordTimingFeedback[] {
    return [...this.timingHistory];
  }

  // Recording
  async startRecording(): Promise<void> {
    if (this.isRecording || !this.currentSession) return;

    try {
      // This would integrate with existing recording capabilities
      // For now, we'll create a placeholder structure
      this.recordingData = {
        id: this.generateId(),
        sessionId: this.currentSession.id,
        timingData: [],
        metronomeData: [],
        startTime: new Date(),
        duration: 0,
        quality: 'medium',
      };

      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start practice recording:', error);
      throw new Error('Recording initialization failed');
    }
  }

  async stopRecording(): Promise<PracticeRecording> {
    if (!this.isRecording || !this.recordingData) {
      throw new Error('No active recording');
    }

    const endTime = new Date();
    this.recordingData.duration = (endTime.getTime() - this.recordingData.startTime.getTime()) / 1000;
    this.recordingData.timingData = [...this.timingHistory];

    this.isRecording = false;
    
    // Save recording data
    this.saveRecording(this.recordingData);

    if (this.currentSession) {
      this.currentSession.recordingData = this.recordingData;
    }

    const recording = this.recordingData;
    this.recordingData = undefined;

    return recording;
  }

  getRecordings(): PracticeRecording[] {
    const recordings = localStorage.getItem('chordme_practice_recordings');
    return recordings ? JSON.parse(recordings) : [];
  }

  // Difficulty adjustment
  adjustDifficulty(level: DifficultyLevel): void {
    if (this.currentSession) {
      this.currentSession.difficultyLevel = level;
    }
  }

  getSimplifiedChords(chords: string[]): string[] {
    if (!this.currentSession) return chords;

    const level = this.currentSession.difficultyLevel;
    
    return chords.map(chord => this.simplifyChord(chord, level));
  }

  // Private methods
  private configureMetronome(config: MetronomeConfig): void {
    metronomeService.setBPM(config.bpm);
    metronomeService.setTimeSignature(config.timeSignature);
    metronomeService.setSubdivision(config.subdivision);
    metronomeService.setVolume(config.volume);
    metronomeService.setSound(config.sound);
  }

  private generateTimingFeedback(timing: 'early' | 'late' | 'perfect', accuracy: number): string {
    if (timing === 'perfect') {
      return accuracy > 0.95 ? 'Excellent timing!' : 'Good timing!';
    } else if (timing === 'early') {
      return accuracy > 0.7 ? 'Slightly early, but close!' : 'Try to wait a bit longer';
    } else {
      return accuracy > 0.7 ? 'Slightly late, but close!' : 'Try to anticipate the chord change';
    }
  }

  private generateTimingSuggestion(timing: 'early' | 'late' | 'perfect', timeDiff: number): string | undefined {
    if (timing === 'perfect') return undefined;
    
    const diffMs = Math.abs(timeDiff * 1000);
    
    if (timing === 'early') {
      return `Try waiting ${diffMs.toFixed(0)}ms longer before changing chords`;
    } else {
      return `Try changing chords ${diffMs.toFixed(0)}ms earlier`;
    }
  }

  private simplifyChord(chord: string, level: DifficultyLevel): string {
    // Basic chord simplification based on difficulty level
    const simplifications = {
      beginner: {
        'Fmaj7': 'F',
        'Cmaj7': 'C',
        'Gmaj7': 'G',
        'Am7': 'Am',
        'Dm7': 'Dm',
        'Em7': 'Em',
        'F/C': 'F',
        'C/E': 'C',
        'G/B': 'G',
      },
      intermediate: {
        'Fmaj7': 'F',
        'Cmaj7': 'C',
        'Gmaj7': 'G',
      },
      advanced: {},
      expert: {},
    };

    return simplifications[level][chord] || chord;
  }

  private loadProgressData(): void {
    const saved = localStorage.getItem('chordme_practice_progress');
    this.progressData = saved ? JSON.parse(saved) : {
      totalPracticeTime: 0,
      sessionsCount: 0,
      averageAccuracy: 0,
      chordChangeAccuracy: 0,
      tempoConsistency: 0,
      sectionsCompleted: 0,
      streak: 0,
      lastPracticeDate: new Date(),
      improvementRate: 0,
    };
  }

  private saveProgressData(): void {
    try {
      localStorage.setItem('chordme_practice_progress', JSON.stringify(this.progressData));
    } catch (error) {
      console.error('Failed to save practice progress:', error);
    }
  }

  private saveSessionData(session: PracticeSession): void {
    try {
      const sessions = this.getSavedSessions();
      sessions.push(session);
      localStorage.setItem('chordme_practice_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save practice session:', error);
    }
  }

  private getSavedSessions(): PracticeSession[] {
    const saved = localStorage.getItem('chordme_practice_sessions');
    return saved ? JSON.parse(saved) : [];
  }

  private saveRecording(recording: PracticeRecording): void {
    try {
      const recordings = this.getRecordings();
      recordings.push(recording);
      localStorage.setItem('chordme_practice_recordings', JSON.stringify(recordings));
    } catch (error) {
      console.error('Failed to save practice recording:', error);
    }
  }

  private updateSessionStatistics(session: PracticeSession): void {
    this.progressData.totalPracticeTime += session.duration;
    this.progressData.sessionsCount += 1;
    this.progressData.lastPracticeDate = session.endTime || new Date();
    
    // Calculate accuracy from timing history
    if (this.timingHistory.length > 0) {
      const averageAccuracy = this.timingHistory.reduce((sum, feedback) => sum + feedback.accuracy, 0) / this.timingHistory.length;
      this.progressData.chordChangeAccuracy = (this.progressData.chordChangeAccuracy + averageAccuracy) / 2;
      this.progressData.averageAccuracy = this.progressData.chordChangeAccuracy;
    }

    // Update streak
    this.updatePracticeStreak();
    
    this.saveProgressData();
  }

  private updatePracticeStreak(): void {
    const today = new Date();
    const lastPractice = new Date(this.progressData.lastPracticeDate);
    const daysDiff = Math.floor((today.getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      this.progressData.streak += 1;
    } else if (daysDiff > 1) {
      this.progressData.streak = 1;
    }
  }

  private initializeAchievements(): void {
    try {
      const saved = localStorage.getItem('chordme_practice_achievements');
      if (!saved) {
        const defaultAchievements = this.createDefaultAchievements();
        localStorage.setItem('chordme_practice_achievements', JSON.stringify(defaultAchievements));
      }
    } catch (error) {
      console.error('Failed to initialize achievements:', error);
    }
  }

  private createDefaultAchievements(): Achievement[] {
    return [
      {
        id: 'first_session',
        title: 'First Steps',
        description: 'Complete your first practice session',
        type: 'practice_time',
        level: 'bronze',
        progress: 0,
        requirement: 1,
        icon: '🎵',
        reward: 'Practice Mode unlocked!',
      },
      {
        id: 'accuracy_80',
        title: 'Getting Accurate',
        description: 'Achieve 80% accuracy in chord changes',
        type: 'accuracy',
        level: 'silver',
        progress: 0,
        requirement: 0.8,
        icon: '🎯',
      },
      {
        id: 'accuracy_95',
        title: 'Precision Master',
        description: 'Achieve 95% accuracy in chord changes',
        type: 'accuracy',
        level: 'gold',
        progress: 0,
        requirement: 0.95,
        icon: '🏆',
      },
      {
        id: 'streak_7',
        title: 'Week Warrior',
        description: 'Practice for 7 consecutive days',
        type: 'streak',
        level: 'silver',
        progress: 0,
        requirement: 7,
        icon: '🔥',
      },
      {
        id: 'practice_time_1h',
        title: 'Dedicated Musician',
        description: 'Complete 1 hour of total practice time',
        type: 'practice_time',
        level: 'bronze',
        progress: 0,
        requirement: 3600,
        icon: '⏰',
      },
      {
        id: 'practice_time_10h',
        title: 'Serious Practitioner',
        description: 'Complete 10 hours of total practice time',
        type: 'practice_time',
        level: 'gold',
        progress: 0,
        requirement: 36000,
        icon: '🌟',
      },
    ];
  }

  private getAvailableAchievements(): Achievement[] {
    const saved = localStorage.getItem('chordme_practice_achievements');
    return saved ? JSON.parse(saved) : [];
  }

  private saveAchievements(achievements: Achievement[]): void {
    try {
      localStorage.setItem('chordme_practice_achievements', JSON.stringify(achievements));
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  }

  private isAchievementUnlocked(achievement: Achievement): boolean {
    switch (achievement.type) {
      case 'practice_time':
        return this.progressData.totalPracticeTime >= achievement.requirement;
      case 'accuracy':
        return this.progressData.averageAccuracy >= achievement.requirement;
      case 'streak':
        return this.progressData.streak >= achievement.requirement;
      default:
        return false;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Event handling
  addEventListener<K extends keyof PracticeModeEventMap>(
    type: K,
    listener: EventListener<K>
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener<K extends keyof PracticeModeEventMap>(
    type: K,
    listener: EventListener<K>
  ): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit<K extends keyof PracticeModeEventMap>(type: K, event: PracticeModeEventMap[K]): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in practice mode event listener for ${type}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const practiceModeService = new PracticeModeService();