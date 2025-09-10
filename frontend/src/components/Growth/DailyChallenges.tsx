/**
 * Daily Challenges Component
 * Displays daily challenges and tracks user progress
 */

import React, { useState, useEffect } from 'react';
import { growthService, DailyChallenge } from '../../services/growthService';

interface DailyChallengesProps {
  className?: string;
}

export const DailyChallenges: React.FC<DailyChallengesProps> = ({ className = '' }) => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const challengesData = await growthService.getDailyChallenges();
      setChallenges(challengesData);
    } catch (err) {
      setError('Failed to load daily challenges');
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (challengeId: number, newValue: number) => {
    try {
      const result = await growthService.updateChallengeProgress(challengeId, newValue);
      
      // Update local state
      setChallenges(prev =>
        prev.map(challenge =>
          challenge.id === challengeId
            ? { ...challenge, progress: result.progress }
            : challenge
        )
      );

      // Show success notification if newly completed
      if (result.newly_completed) {
        // You can integrate with your notification system here
        console.log(`Challenge completed! Earned ${result.points_awarded} points`);
      }
    } catch (err) {
      console.error('Error updating challenge progress:', err);
    }
  };

  const getChallengeIcon = React.useCallback((type: string) => {
    const icons = {
      practice_time: '⏱️',
      accuracy: '🎯',
      new_song: '🎵',
      sharing: '📤',
      streak: '🔥',
      mastery: '⭐'
    };
    return icons[type as keyof typeof icons] || '🎯';
  }, []);

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} text-red-600`}>
        <p>{error}</p>
        <button 
          onClick={loadChallenges}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Daily Challenges</h3>
      
      {challenges.length === 0 ? (
        <p className="text-gray-500">No challenges available today.</p>
      ) : (
        <div className="space-y-3">
          {challenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onProgressUpdate={updateProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ChallengeCardProps {
  challenge: DailyChallenge;
  onProgressUpdate: (challengeId: number, value: number) => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onProgressUpdate }) => {
  const progress = challenge.progress;
  const isCompleted = progress?.is_completed || false;
  const progressPercentage = progress?.completion_percentage || 0;
  
  const challengeColor = growthService.getChallengeColor(challenge.category);
  const difficultyColor = growthService.getDifficultyColor(challenge.difficulty);

  const handleManualUpdate = () => {
    if (challenge.unit === 'count') {
      // For countable challenges, increment by 1
      const newValue = (progress?.current_value || 0) + 1;
      onProgressUpdate(challenge.id, newValue);
    }
  };

  return (
    <div className={`
      p-4 border rounded-lg transition-all duration-200
      ${isCompleted 
        ? 'bg-green-50 border-green-200' 
        : 'bg-white border-gray-200 hover:border-gray-300'
      }
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">
              {getChallengeIcon(challenge.challenge_type)}
            </span>
            <h4 className="font-medium text-gray-900">{challenge.title}</h4>
            <span 
              className="px-2 py-1 text-xs rounded-full text-white"
              style={{ backgroundColor: difficultyColor }}
            >
              {challenge.difficulty}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {progress?.current_value || 0} / {challenge.target_value} {challenge.unit}
                </span>
                <span className="font-medium" style={{ color: challengeColor }}>
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${progressPercentage}%`,
                    backgroundColor: challengeColor 
                  }}
                ></div>
              </div>
            </div>
            
            <div className="ml-4 text-right">
              <div className="text-xs text-gray-500">Reward</div>
              <div className="font-medium text-amber-600">
                {challenge.points_reward} pts
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {!isCompleted && challenge.unit === 'count' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleManualUpdate}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Update Progress (+1)
          </button>
        </div>
      )}
      
      {isCompleted && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="flex items-center justify-center text-green-600 text-sm font-medium">
            <span className="mr-2">✅</span>
            Challenge Completed!
          </div>
        </div>
      )}
    </div>
  );
};