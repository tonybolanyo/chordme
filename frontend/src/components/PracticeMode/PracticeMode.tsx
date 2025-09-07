/**
 * Practice Mode Component
 * Comprehensive practice interface for musicians
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  PracticeSession,
  PracticeGoal,
  PracticeStatistics,
  Achievement,
  MetronomeConfig,
  DifficultyLevel,
  ChordTimingFeedback,
} from '../../types/audio';

import { practiceModeService } from '../../services/practiceModeService';
import { metronomeService } from '../../services/metronomeService';

import './PracticeMode.css';

interface PracticeModeProps {
  songId?: string;
  onClose?: () => void;
  className?: string;
}

export interface PracticeModeProps {
  songId?: string;
  onClose?: () => void;
  className?: string;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  songId,
  onClose,
  className = '',
}) => {
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [statistics, setStatistics] = useState<PracticeStatistics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [timingFeedback, setTimingFeedback] = useState<ChordTimingFeedback[]>([]);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  
  // Practice settings
  const [practiceGoals, setPracticeGoals] = useState<PracticeGoal[]>([]);
  const [metronomeConfig, setMetronomeConfig] = useState<MetronomeConfig>({
    enabled: false,
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    subdivision: 'quarter',
    volume: 0.7,
    sound: 'click',
    visualCue: true,
    countIn: 0,
    accentBeats: true,
  });
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  
  // Metronome visual state
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);

  const achievementTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Load initial statistics
    setStatistics(practiceModeService.getProgress());
    
    // Setup event listeners
    const handleSessionStarted = (event: { session: PracticeSession }) => {
      setCurrentSession(event.session);
      setIsSessionActive(true);
    };

    const handleSessionEnded = (event: { session: PracticeSession; statistics: PracticeStatistics }) => {
      setCurrentSession(null);
      setIsSessionActive(false);
      setStatistics(event.statistics);
    };

    const handleAchievementUnlocked = (event: { achievement: Achievement }) => {
      setShowAchievement(event.achievement);
      
      // Auto-hide achievement after 5 seconds
      achievementTimeoutRef.current = setTimeout(() => {
        setShowAchievement(null);
      }, 5000);
    };

    const handleTimingFeedback = (event: { feedback: ChordTimingFeedback }) => {
      setTimingFeedback(prev => [...prev.slice(-9), event.feedback]);
    };

    const handleProgressUpdated = (event: { statistics: PracticeStatistics }) => {
      setStatistics(event.statistics);
    };

    const handleMetronomeBeat = (event: { beat: number; accent: boolean }) => {
      setCurrentBeat(event.beat);
    };

    // Add listeners
    practiceModeService.addEventListener('practice:session_started', handleSessionStarted);
    practiceModeService.addEventListener('practice:session_ended', handleSessionEnded);
    practiceModeService.addEventListener('practice:achievement_unlocked', handleAchievementUnlocked);
    practiceModeService.addEventListener('practice:timing_feedback', handleTimingFeedback);
    practiceModeService.addEventListener('practice:progress_updated', handleProgressUpdated);
    metronomeService.addEventListener('beat', handleMetronomeBeat);

    return () => {
      // Cleanup listeners
      practiceModeService.removeEventListener('practice:session_started', handleSessionStarted);
      practiceModeService.removeEventListener('practice:session_ended', handleSessionEnded);
      practiceModeService.removeEventListener('practice:achievement_unlocked', handleAchievementUnlocked);
      practiceModeService.removeEventListener('practice:timing_feedback', handleTimingFeedback);
      practiceModeService.removeEventListener('practice:progress_updated', handleProgressUpdated);
      metronomeService.removeEventListener('beat', handleMetronomeBeat);
      
      if (achievementTimeoutRef.current) {
        clearTimeout(achievementTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsMetronomeActive(metronomeService.isRunning());
  }, [currentSession]);

  const handleStartSession = async () => {
    try {
      await practiceModeService.startPracticeSession({
        songId,
        goals: practiceGoals,
        metronome: metronomeConfig,
        difficulty,
        enableRecording: recordingEnabled,
      });
    } catch (error) {
      console.error('Failed to start practice session:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      await practiceModeService.endPracticeSession();
    } catch (error) {
      console.error('Failed to end practice session:', error);
    }
  };

  const handlePauseSession = () => {
    practiceModeService.pausePracticeSession();
    setIsMetronomeActive(false);
  };

  const handleResumeSession = () => {
    practiceModeService.resumePracticeSession();
    setIsMetronomeActive(metronomeService.isRunning());
  };

  const handleMetronomeToggle = () => {
    if (metronomeService.isRunning()) {
      metronomeService.stop();
      setIsMetronomeActive(false);
    } else {
      metronomeService.start();
      setIsMetronomeActive(true);
    }
  };

  const handleBPMChange = (bpm: number) => {
    setMetronomeConfig(prev => ({ ...prev, bpm }));
    metronomeService.setBPM(bpm);
  };

  const handleTimeSignatureChange = (numerator: number, denominator: number) => {
    const timeSignature = { numerator, denominator };
    setMetronomeConfig(prev => ({ ...prev, timeSignature }));
    metronomeService.setTimeSignature(timeSignature);
  };

  const addPracticeGoal = () => {
    const newGoal: PracticeGoal = {
      id: Date.now().toString(),
      type: 'chord_changes',
      target: 80,
      current: 0,
      completed: false,
      description: 'Achieve 80% chord change accuracy',
    };
    setPracticeGoals(prev => [...prev, newGoal]);
  };

  const removePracticeGoal = (goalId: string) => {
    setPracticeGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 0.9) return 'text-green-600';
    if (accuracy >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`practice-mode ${className}`}>
      {/* Header */}
      <div className="practice-mode__header">
        <h2 className="practice-mode__title">Practice Mode</h2>
        {onClose && (
          <button onClick={onClose} className="practice-mode__close-btn">
            ×
          </button>
        )}
      </div>

      {/* Achievement Notification */}
      {showAchievement && (
        <div className="achievement-notification">
          <div className="achievement-notification__content">
            <span className="achievement-notification__icon">{showAchievement.icon}</span>
            <div>
              <h3 className="achievement-notification__title">Achievement Unlocked!</h3>
              <p className="achievement-notification__description">{showAchievement.title}</p>
              <p className="achievement-notification__detail">{showAchievement.description}</p>
            </div>
            <button 
              onClick={() => setShowAchievement(null)}
              className="achievement-notification__close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="practice-mode__content">
        {/* Statistics Panel */}
        {statistics && (
          <div className="practice-mode__stats">
            <h3>Practice Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Time</span>
                <span className="stat-value">{formatTime(statistics.totalPracticeTime)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Sessions</span>
                <span className="stat-value">{statistics.sessionsCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Accuracy</span>
                <span className={`stat-value ${getAccuracyColor(statistics.averageAccuracy)}`}>
                  {(statistics.averageAccuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Streak</span>
                <span className="stat-value">{statistics.streak} days</span>
              </div>
            </div>
          </div>
        )}

        {/* Metronome Section */}
        <div className="practice-mode__metronome">
          <h3>Metronome</h3>
          <div className="metronome-controls">
            <button 
              onClick={handleMetronomeToggle}
              className={`metronome-toggle ${isMetronomeActive ? 'active' : ''}`}
            >
              {isMetronomeActive ? 'Stop' : 'Start'} Metronome
            </button>
            
            <div className="metronome-settings">
              <div className="setting-group">
                <label>BPM</label>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={metronomeConfig.bpm}
                  onChange={(e) => handleBPMChange(parseInt(e.target.value))}
                />
                <span>{metronomeConfig.bpm}</span>
              </div>

              <div className="setting-group">
                <label>Time Signature</label>
                <select
                  value={`${metronomeConfig.timeSignature.numerator}/${metronomeConfig.timeSignature.denominator}`}
                  onChange={(e) => {
                    const [num, den] = e.target.value.split('/').map(Number);
                    handleTimeSignatureChange(num, den);
                  }}
                >
                  <option value="4/4">4/4</option>
                  <option value="3/4">3/4</option>
                  <option value="2/4">2/4</option>
                  <option value="6/8">6/8</option>
                </select>
              </div>
            </div>

            {/* Visual Beat Indicator */}
            {isMetronomeActive && (
              <div className="beat-indicator">
                {Array.from({ length: metronomeConfig.timeSignature.numerator }, (_, i) => (
                  <div
                    key={i}
                    className={`beat-dot ${currentBeat === i + 1 ? 'active' : ''} ${i === 0 ? 'accent' : ''}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Practice Goals */}
        <div className="practice-mode__goals">
          <h3>Practice Goals</h3>
          <div className="goals-list">
            {practiceGoals.map(goal => (
              <div key={goal.id} className="goal-item">
                <div className="goal-info">
                  <span className="goal-description">{goal.description}</span>
                  <div className="goal-progress">
                    <div 
                      className="goal-progress-bar"
                      style={{ width: `${(goal.current / goal.target) * 100}%` }}
                    />
                  </div>
                  <span className="goal-percentage">
                    {((goal.current / goal.target) * 100).toFixed(0)}%
                  </span>
                </div>
                <button 
                  onClick={() => removePracticeGoal(goal.id)}
                  className="goal-remove"
                >
                  ×
                </button>
              </div>
            ))}
            <button onClick={addPracticeGoal} className="add-goal-btn">
              + Add Goal
            </button>
          </div>
        </div>

        {/* Session Controls */}
        <div className="practice-mode__session">
          <h3>Practice Session</h3>
          
          <div className="session-settings">
            <div className="setting-group">
              <label>Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={recordingEnabled}
                  onChange={(e) => setRecordingEnabled(e.target.checked)}
                />
                Enable Recording
              </label>
            </div>
          </div>

          <div className="session-controls">
            {!isSessionActive ? (
              <button onClick={handleStartSession} className="session-btn start">
                Start Practice Session
              </button>
            ) : (
              <div className="active-session-controls">
                <button onClick={handlePauseSession} className="session-btn pause">
                  Pause
                </button>
                <button onClick={handleResumeSession} className="session-btn resume">
                  Resume
                </button>
                <button onClick={handleEndSession} className="session-btn end">
                  End Session
                </button>
              </div>
            )}
          </div>

          {currentSession && (
            <div className="session-info">
              <p>Session Duration: {formatTime(currentSession.duration)}</p>
              <p>Difficulty: {currentSession.difficultyLevel}</p>
              {currentSession.recordingEnabled && <p>Recording: Active</p>}
            </div>
          )}
        </div>

        {/* Timing Feedback */}
        {timingFeedback.length > 0 && (
          <div className="practice-mode__feedback">
            <h3>Recent Timing Feedback</h3>
            <div className="feedback-list">
              {timingFeedback.slice(-5).map((feedback, index) => (
                <div key={index} className="feedback-item">
                  <span className="feedback-chord">{feedback.chordName}</span>
                  <span className={`feedback-timing ${feedback.timing}`}>
                    {feedback.timing.toUpperCase()}
                  </span>
                  <span className={`feedback-accuracy ${getAccuracyColor(feedback.accuracy)}`}>
                    {(feedback.accuracy * 100).toFixed(0)}%
                  </span>
                  <span className="feedback-message">{feedback.feedback}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};