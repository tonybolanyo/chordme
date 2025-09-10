/**
 * Practice Mode Service Tests
 * Tests for practice mode functionality and progress tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PracticeModeService } from './practiceModeService';
import {
  PracticeGoal,
  PracticeSessionConfig,
  DifficultyLevel,
  ChordTimeMapping,
} from '../types/audio';

// Mock localStorage
const localStorageMock = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => localStorageMock.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    localStorageMock.store.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageMock.store.clear();
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock metronome service
vi.mock('./metronomeService', () => ({
  metronomeService: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isRunning: vi.fn(() => false),
    setBPM: vi.fn(),
    setTimeSignature: vi.fn(),
    setSubdivision: vi.fn(),
    setVolume: vi.fn(),
    setSound: vi.fn(),
  },
}));

describe('PracticeModeService', () => {
  let practiceService: PracticeModeService;
  
  const mockSessionConfig: PracticeSessionConfig = {
    songId: 'test-song-123',
    goals: [
      {
        id: '1',
        type: 'chord_changes',
        target: 80,
        current: 0,
        completed: false,
        description: 'Achieve 80% chord change accuracy',
      },
    ],
    metronome: {
      enabled: true,
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      subdivision: 'quarter',
      volume: 0.7,
      sound: 'click',
      visualCue: true,
      countIn: 0,
      accentBeats: true,
    },
    difficulty: 'intermediate',
    enableRecording: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store.clear();
    
    // Reset localStorage mock functions
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      localStorageMock.store.set(key, value);
    });
    
    practiceService = new PracticeModeService();
  });

  afterEach(() => {
    if (practiceService.getCurrentSession()) {
      practiceService.endPracticeSession();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default progress data', () => {
      const progress = practiceService.getProgress();
      
      expect(progress.totalPracticeTime).toBe(0);
      expect(progress.sessionsCount).toBe(0);
      expect(progress.averageAccuracy).toBe(0);
      expect(progress.streak).toBe(0);
    });

    it('should create default achievements', () => {
      // Check that achievements were created in localStorage
      const achievements = localStorage.getItem('chordme_practice_achievements');
      expect(achievements).not.toBeNull();
      
      const parsedAchievements = JSON.parse(achievements!);
      expect(parsedAchievements).toBeInstanceOf(Array);
      expect(parsedAchievements.length).toBeGreaterThan(0);
      
      // Check for specific achievements
      const firstSession = parsedAchievements.find((a: unknown) => a.id === 'first_session');
      expect(firstSession).toBeDefined();
      expect(firstSession.title).toBe('First Steps');
    });
  });

  describe('Session Management', () => {
    it('should start a practice session', async () => {
      expect(practiceService.getCurrentSession()).toBeNull();
      
      const session = await practiceService.startPracticeSession(mockSessionConfig);
      
      expect(session).toBeDefined();
      expect(session.songId).toBe('test-song-123');
      expect(session.practiceGoals).toHaveLength(1);
      expect(session.difficultyLevel).toBe('intermediate');
      expect(practiceService.getCurrentSession()).not.toBeNull();
    });

    it('should emit session started event', async () => {
      let sessionStartedEvent: any = null;
      practiceService.addEventListener('practice:session_started', (event) => {
        sessionStartedEvent = event;
      });
      
      await practiceService.startPracticeSession(mockSessionConfig);
      
      expect(sessionStartedEvent).not.toBeNull();
      expect(sessionStartedEvent.session).toBeDefined();
    });

    it('should end existing session when starting new one', async () => {
      const firstSession = await practiceService.startPracticeSession(mockSessionConfig);
      expect(practiceService.getCurrentSession()?.id).toBe(firstSession.id);
      
      const secondSession = await practiceService.startPracticeSession({
        ...mockSessionConfig,
        songId: 'test-song-456',
      });
      
      expect(practiceService.getCurrentSession()?.id).toBe(secondSession.id);
      expect(practiceService.getCurrentSession()?.songId).toBe('test-song-456');
    });

    it('should end practice session', async () => {
      await practiceService.startPracticeSession(mockSessionConfig);
      expect(practiceService.getCurrentSession()).not.toBeNull();
      
      let sessionEndedEvent: any = null;
      practiceService.addEventListener('practice:session_ended', (event) => {
        sessionEndedEvent = event;
      });
      
      await practiceService.endPracticeSession();
      
      expect(practiceService.getCurrentSession()).toBeNull();
      expect(sessionEndedEvent).not.toBeNull();
      expect(sessionEndedEvent.session).toBeDefined();
      expect(sessionEndedEvent.statistics).toBeDefined();
    });

    it('should pause and resume session', async () => {
      await practiceService.startPracticeSession(mockSessionConfig);
      
      practiceService.pausePracticeSession();
      // Metronome should be paused - this would be tested with actual metronome
      
      practiceService.resumePracticeSession();
      // Metronome should resume - this would be tested with actual metronome
    });

    it('should handle session duration tracking', async () => {
      const startTime = Date.now();
      await practiceService.startPracticeSession(mockSessionConfig);
      
      // Simulate some practice time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await practiceService.endPracticeSession();
      
      // Session should have been saved with duration
      const sessions = JSON.parse(localStorage.getItem('chordme_practice_sessions') || '[]');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].duration).toBeGreaterThan(0);
    });
  });

  describe('Goals Management', () => {
    it('should set practice goals', async () => {
      await practiceService.startPracticeSession(mockSessionConfig);
      
      const newGoals: PracticeGoal[] = [
        {
          id: '2',
          type: 'accuracy',
          target: 90,
          current: 0,
          completed: false,
          description: 'Achieve 90% overall accuracy',
        },
      ];
      
      practiceService.setGoals(newGoals);
      
      const session = practiceService.getCurrentSession();
      expect(session?.practiceGoals).toHaveLength(1);
      expect(session?.practiceGoals[0].target).toBe(90);
    });

    it('should update progress and save to localStorage', () => {
      const progressUpdate = {
        totalPracticeTime: 3600, // 1 hour
        averageAccuracy: 0.85,
      };
      
      let progressUpdatedEvent: any = null;
      practiceService.addEventListener('practice:progress_updated', (event) => {
        progressUpdatedEvent = event;
      });
      
      practiceService.updateProgress(progressUpdate);
      
      const progress = practiceService.getProgress();
      expect(progress.totalPracticeTime).toBe(3600);
      expect(progress.averageAccuracy).toBe(0.85);
      
      expect(progressUpdatedEvent).not.toBeNull();
      expect(progressUpdatedEvent.statistics.totalPracticeTime).toBe(3600);
      
      // Check that progress was saved to localStorage
      const saved = localStorage.getItem('chordme_practice_progress');
      expect(saved).not.toBeNull();
      const parsedProgress = JSON.parse(saved!);
      expect(parsedProgress.totalPracticeTime).toBe(3600);
    });
  });

  describe('Timing Feedback', () => {
    const mockChordMapping: ChordTimeMapping = {
      id: 'chord-1',
      chordName: 'C',
      startTime: 10.0,
      endTime: 12.0,
      source: 'manual',
      verified: true,
    };

    it('should analyze perfect chord timing', () => {
      const actualTime = 10.0; // Exactly on time
      
      const feedback = practiceService.analyzeChordTiming(mockChordMapping, actualTime);
      
      expect(feedback.chordName).toBe('C');
      expect(feedback.expectedTime).toBe(10.0);
      expect(feedback.actualTime).toBe(10.0);
      expect(feedback.timing).toBe('perfect');
      expect(feedback.accuracy).toBe(1.0);
      expect(feedback.feedback).toContain('Excellent timing');
    });

    it('should analyze early chord timing', () => {
      const actualTime = 9.8; // 200ms early
      
      const feedback = practiceService.analyzeChordTiming(mockChordMapping, actualTime);
      
      expect(feedback.timing).toBe('early');
      expect(feedback.accuracy).toBeLessThan(1.0);
      expect(feedback.accuracy).toBeGreaterThanOrEqual(0);
      expect(feedback.suggestion).toContain('waiting');
    });

    it('should analyze late chord timing', () => {
      const actualTime = 10.2; // 200ms late
      
      const feedback = practiceService.analyzeChordTiming(mockChordMapping, actualTime);
      
      expect(feedback.timing).toBe('late');
      expect(feedback.accuracy).toBeLessThan(1.0);
      expect(feedback.accuracy).toBeGreaterThanOrEqual(0);
      expect(feedback.suggestion).toContain('earlier');
    });

    it('should emit timing feedback events', () => {
      let timingFeedbackEvent: any = null;
      practiceService.addEventListener('practice:timing_feedback', (event) => {
        timingFeedbackEvent = event;
      });
      
      practiceService.analyzeChordTiming(mockChordMapping, 10.1);
      
      expect(timingFeedbackEvent).not.toBeNull();
      expect(timingFeedbackEvent.feedback).toBeDefined();
      expect(timingFeedbackEvent.feedback.chordName).toBe('C');
    });

    it('should maintain timing history', () => {
      practiceService.analyzeChordTiming(mockChordMapping, 10.0);
      practiceService.analyzeChordTiming(mockChordMapping, 10.1);
      
      const history = practiceService.getTimingHistory();
      expect(history).toHaveLength(2);
      expect(history[0].actualTime).toBe(10.0);
      expect(history[1].actualTime).toBe(10.1);
    });
  });

  describe('Difficulty Adjustment', () => {
    it('should adjust difficulty level', async () => {
      await practiceService.startPracticeSession(mockSessionConfig);
      
      practiceService.adjustDifficulty('expert');
      
      const session = practiceService.getCurrentSession();
      expect(session?.difficultyLevel).toBe('expert');
    });

    it('should simplify chords for beginner level', async () => {
      await practiceService.startPracticeSession({
        ...mockSessionConfig,
        difficulty: 'beginner',
      });
      
      const complexChords = ['Fmaj7', 'Cmaj7', 'Am7', 'F/C'];
      const simplifiedChords = practiceService.getSimplifiedChords(complexChords);
      
      expect(simplifiedChords).toContain('F'); // Fmaj7 → F
      expect(simplifiedChords).toContain('C'); // Cmaj7 → C
      expect(simplifiedChords).toContain('Am'); // Am7 → Am
      expect(simplifiedChords).toContain('F'); // F/C → F
    });

    it('should not simplify chords for expert level', async () => {
      await practiceService.startPracticeSession({
        ...mockSessionConfig,
        difficulty: 'expert',
      });
      
      const complexChords = ['Fmaj7', 'Cmaj7', 'Am7'];
      const simplifiedChords = practiceService.getSimplifiedChords(complexChords);
      
      expect(simplifiedChords).toEqual(complexChords); // No simplification
    });
  });

  describe('Achievement System', () => {
    it('should check and unlock achievements', () => {
      // Set progress that should unlock first session achievement
      practiceService.updateProgress({
        sessionsCount: 1,
        totalPracticeTime: 600, // 10 minutes
      });
      
      let achievementUnlockedEvent: any = null;
      practiceService.addEventListener('practice:achievement_unlocked', (event) => {
        achievementUnlockedEvent = event;
      });
      
      const newAchievements = practiceService.checkAchievements();
      
      expect(newAchievements.length).toBeGreaterThan(0);
      
      // Should unlock first session achievement
      const firstSessionAchievement = newAchievements.find(a => a.id === 'first_session');
      expect(firstSessionAchievement).toBeDefined();
      
      if (achievementUnlockedEvent) {
        expect(achievementUnlockedEvent.achievement).toBeDefined();
      }
    });

    it('should unlock accuracy-based achievements', () => {
      practiceService.updateProgress({
        averageAccuracy: 0.85,
        chordChangeAccuracy: 0.85,
      });
      
      const achievements = practiceService.checkAchievements();
      const accuracyAchievement = achievements.find(a => a.id === 'accuracy_80');
      
      expect(accuracyAchievement).toBeDefined();
      expect(accuracyAchievement?.unlockedAt).toBeDefined();
    });

    it('should not unlock same achievement twice', () => {
      // First unlock
      practiceService.updateProgress({ totalPracticeTime: 3600 });
      const firstCheck = practiceService.checkAchievements();
      
      // Second check with same progress
      const secondCheck = practiceService.checkAchievements();
      
      expect(secondCheck.length).toBe(0); // No new achievements
    });
  });

  describe('Recording Functionality', () => {
    it('should start recording when enabled', async () => {
      const configWithRecording = {
        ...mockSessionConfig,
        enableRecording: true,
      };
      
      await practiceService.startPracticeSession(configWithRecording);
      
      // Recording should start automatically
      const session = practiceService.getCurrentSession();
      expect(session?.recordingEnabled).toBe(true);
    });

    it('should handle manual recording start/stop', async () => {
      await practiceService.startPracticeSession(mockSessionConfig);
      
      await practiceService.startRecording();
      
      // Add some timing data
      const mockChordMapping: ChordTimeMapping = {
        id: 'chord-1',
        chordName: 'C',
        startTime: 10.0,
        endTime: 12.0,
        source: 'manual',
        verified: true,
      };
      practiceService.analyzeChordTiming(mockChordMapping, 10.1);
      
      const recording = await practiceService.stopRecording();
      
      expect(recording).toBeDefined();
      expect(recording.sessionId).toBe(practiceService.getCurrentSession()?.id);
      expect(recording.timingData).toHaveLength(1);
      expect(recording.duration).toBeGreaterThan(0);
    });

    it('should save recordings to localStorage', async () => {
      await practiceService.startPracticeSession(mockSessionConfig);
      await practiceService.startRecording();
      await practiceService.stopRecording();
      
      const recordings = practiceService.getRecordings();
      expect(recordings).toHaveLength(1);
      expect(recordings[0].sessionId).toBe(practiceService.getCurrentSession()?.id);
    });

    it('should throw error when stopping recording without starting', async () => {
      await expect(practiceService.stopRecording()).rejects.toThrow('No active recording');
    });
  });

  describe('Practice Streak Tracking', () => {
    it('should track consecutive practice days', async () => {
      // Mock different dates for streak testing
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      // Set last practice to yesterday
      practiceService.updateProgress({
        lastPracticeDate: yesterday,
        streak: 1,
      });
      
      // Start session today (should increment streak)
      await practiceService.startPracticeSession(mockSessionConfig);
      await practiceService.endPracticeSession();
      
      const progress = practiceService.getProgress();
      expect(progress.streak).toBe(2); // Should increment
    });

    it('should reset streak after missing days', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      practiceService.updateProgress({
        lastPracticeDate: threeDaysAgo,
        streak: 5,
      });
      
      await practiceService.startPracticeSession(mockSessionConfig);
      await practiceService.endPracticeSession();
      
      const progress = practiceService.getProgress();
      expect(progress.streak).toBe(1); // Should reset to 1
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session operations gracefully', async () => {
      // Try to end session when none is active
      await expect(practiceService.endPracticeSession()).resolves.not.toThrow();
      
      // Try to pause/resume when no session
      expect(() => practiceService.pausePracticeSession()).not.toThrow();
      expect(() => practiceService.resumePracticeSession()).not.toThrow();
    });

    it('should handle localStorage failures gracefully', () => {
      // Mock localStorage failure
      const originalSetItem = localStorage.setItem;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // The method should not throw even if localStorage fails
      expect(() => {
        practiceService.updateProgress({ totalPracticeTime: 100 });
      }).not.toThrow();
      
      // Restore original function
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('Event Listener Management', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      
      practiceService.addEventListener('practice:progress_updated', listener);
      practiceService.updateProgress({ totalPracticeTime: 100 });
      
      expect(listener).toHaveBeenCalledTimes(1);
      
      practiceService.removeEventListener('practice:progress_updated', listener);
      practiceService.updateProgress({ totalPracticeTime: 200 });
      
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle event listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      practiceService.addEventListener('practice:progress_updated', errorListener);
      
      expect(() => {
        practiceService.updateProgress({ totalPracticeTime: 100 });
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});