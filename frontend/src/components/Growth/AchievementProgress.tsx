/**
 * Achievement Progress Component
 * Displays user achievements, badges, and reputation progress
 */

import React, { useState, useEffect } from 'react';
import { growthService, AchievementProgress, Badge } from '../../services/growthService';

interface AchievementProgressProps {
  className?: string;
}

export const AchievementProgress: React.FC<AchievementProgressProps> = ({ className = '' }) => {
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'earned' | 'available'>('earned');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const progressData = await growthService.getAchievementProgress();
      setProgress(progressData);
    } catch (err) {
      setError('Failed to load achievement progress');
      console.error('Error loading achievement progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareAchievement = (badge: Badge, platform: 'twitter' | 'facebook' | 'linkedin' = 'twitter') => {
    growthService.shareAchievement(badge, platform);
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} text-red-600`}>
        <p>{error}</p>
        <button 
          onClick={loadProgress}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Achievement Progress</h3>
      
      {/* Reputation Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              Level {progress.reputation.level} - {progress.reputation.level_name}
            </h4>
            <p className="text-gray-600">{progress.reputation.total_score} total points</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {progress.earned_badges.length}
            </div>
            <div className="text-sm text-gray-600">Badges Earned</div>
          </div>
        </div>

        {/* Level Progress */}
        {progress.next_level_threshold > 0 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progress to next level</span>
              <span className="font-medium text-blue-600">
                {Math.round(progress.progress_to_next_level)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress_to_next_level}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Next level at {progress.next_level_threshold} points
            </div>
          </div>
        )}

        {/* Reputation Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="font-bold text-green-600">{progress.reputation.post_score}</div>
            <div className="text-xs text-gray-600">Post Score</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-600">{progress.reputation.thread_score}</div>
            <div className="text-xs text-gray-600">Thread Score</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-amber-600">{progress.reputation.solution_score}</div>
            <div className="text-xs text-gray-600">Solution Score</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-purple-600">{progress.reputation.helpful_score}</div>
            <div className="text-xs text-gray-600">Helpful Score</div>
          </div>
        </div>
      </div>

      {/* Badge Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('earned')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'earned'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Earned Badges ({progress.earned_badges.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Available Badges ({progress.available_badges.length})
          </button>
        </nav>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTab === 'earned' ? (
          progress.earned_badges.length > 0 ? (
            progress.earned_badges.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                isEarned={true}
                onShare={handleShareAchievement}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🏆</div>
              <p>No badges earned yet. Complete challenges and activities to earn your first badge!</p>
            </div>
          )
        ) : (
          progress.available_badges.length > 0 ? (
            progress.available_badges.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                isEarned={false}
                onShare={handleShareAchievement}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎉</div>
              <p>Congratulations! You've earned all available badges!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

interface BadgeCardProps {
  badge: Badge;
  isEarned: boolean;
  onShare: (badge: Badge, platform: 'twitter' | 'facebook' | 'linkedin') => void;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, isEarned, onShare }) => {
  const rarityColor = growthService.getBadgeRarityColor(badge.rarity);
  
  return (
    <div className={`
      border rounded-lg p-4 transition-all duration-200
      ${isEarned 
        ? 'bg-white border-gray-200 shadow-sm' 
        : 'bg-gray-50 border-gray-200 opacity-75'
      }
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-2xl
            ${isEarned ? 'bg-gray-100' : 'bg-gray-200'}
          `}>
            {badge.icon || '🏆'}
          </div>
          <div>
            <h4 className={`font-medium ${isEarned ? 'text-gray-900' : 'text-gray-600'}`}>
              {badge.name}
            </h4>
            <div className="flex items-center gap-2">
              <span 
                className="px-2 py-1 text-xs rounded-full text-white font-medium"
                style={{ backgroundColor: rarityColor }}
              >
                {badge.rarity}
              </span>
              <span className={`text-xs ${isEarned ? 'text-gray-600' : 'text-gray-500'}`}>
                {badge.badge_type}
              </span>
            </div>
          </div>
        </div>
        
        {isEarned && (
          <div className="text-green-600">
            ✅
          </div>
        )}
      </div>
      
      <p className={`text-sm mb-3 ${isEarned ? 'text-gray-600' : 'text-gray-500'}`}>
        {badge.description}
      </p>
      
      {/* Requirements */}
      {badge.requirements && Object.keys(badge.requirements).length > 0 && (
        <div className="mb-3">
          <div className={`text-xs font-medium mb-1 ${isEarned ? 'text-gray-700' : 'text-gray-500'}`}>
            Requirements:
          </div>
          <div className={`text-xs ${isEarned ? 'text-gray-600' : 'text-gray-500'}`}>
            {Object.entries(badge.requirements).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Award Count */}
      <div className={`text-xs mb-3 ${isEarned ? 'text-gray-500' : 'text-gray-400'}`}>
        Awarded to {badge.awarded_count} users
      </div>
      
      {/* Share Button for Earned Badges */}
      {isEarned && (
        <div className="flex gap-2">
          <button
            onClick={() => onShare(badge, 'twitter')}
            className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors"
          >
            Share 🐦
          </button>
          <button
            onClick={() => onShare(badge, 'facebook')}
            className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors"
          >
            Share 📘
          </button>
        </div>
      )}
    </div>
  );
};