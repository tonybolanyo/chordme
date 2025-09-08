/**
 * Referral Program Component
 * Allows users to generate and manage referral codes
 */

import React, { useState, useEffect } from 'react';
import { growthService, ReferralStats, ReferralCode } from '../../services/growthService';

interface ReferralProgramProps {
  className?: string;
}

export const ReferralProgram: React.FC<ReferralProgramProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await growthService.getReferralStats();
      setStats(statsData);
    } catch (err) {
      setError('Failed to load referral statistics');
      console.error('Error loading referral stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewCode = async () => {
    try {
      setGenerating(true);
      const newCode = await growthService.generateReferralCode();
      await loadStats(); // Reload stats to include new code
    } catch (err) {
      setError('Failed to generate referral code');
      console.error('Error generating code:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyReferralLink = async (code: string) => {
    try {
      const link = growthService.generateReferralLink(code);
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const shareOnSocial = (code: string, platform: 'twitter' | 'facebook' | 'linkedin') => {
    const link = growthService.generateReferralLink(code);
    const text = `Join me on ChordMe - the best way to manage your songs and chords! Sign up with my referral link and we both get rewards. 🎵`;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}&summary=${encodeURIComponent(text)}`
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} text-red-600`}>
        <p>{error}</p>
        <button 
          onClick={loadStats}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Referral Program</h3>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.total_referrals}</div>
          <div className="text-sm text-blue-700">Total Referrals</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.completed_referrals}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">{stats.pending_referrals}</div>
          <div className="text-sm text-amber-700">Pending</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.total_rewards_earned}</div>
          <div className="text-sm text-purple-700">Points Earned</div>
        </div>
      </div>

      {/* Generate New Code */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Share ChordMe and Earn Rewards</h4>
        <p className="text-gray-600 mb-4">
          Invite friends to join ChordMe and earn points when they sign up. You both get rewards!
        </p>
        
        <button
          onClick={generateNewCode}
          disabled={generating}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {generating ? 'Generating...' : 'Generate New Referral Code'}
        </button>
      </div>

      {/* Active Referral Codes */}
      {stats.active_codes.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Your Referral Codes</h4>
          {stats.active_codes.map(code => (
            <ReferralCodeCard
              key={code.id}
              code={code}
              onCopy={copyReferralLink}
              onShare={shareOnSocial}
              isCopied={copiedCode === code.referral_code}
            />
          ))}
        </div>
      )}

      {/* Recent Completions */}
      {stats.recent_completions.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Recent Successful Referrals</h4>
          <div className="space-y-2">
            {stats.recent_completions.map(completion => (
              <div
                key={completion.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div>
                  <div className="font-medium text-green-800">Referral Completed!</div>
                  <div className="text-sm text-green-600">
                    Code: {completion.referral_code}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-green-800">
                    +{completion.referrer_reward_amount} points
                  </div>
                  <div className="text-xs text-green-600">
                    {new Date(completion.completed_at!).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ReferralCodeCardProps {
  code: ReferralCode;
  onCopy: (code: string) => void;
  onShare: (code: string, platform: 'twitter' | 'facebook' | 'linkedin') => void;
  isCopied: boolean;
}

const ReferralCodeCard: React.FC<ReferralCodeCardProps> = ({
  code,
  onCopy,
  onShare,
  isCopied
}) => {
  const daysUntilExpiry = growthService.getDaysUntilExpiry(code.expires_at);
  const isExpiringSoon = daysUntilExpiry <= 7;
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="font-mono text-lg font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded">
            {code.referral_code}
          </div>
          <div className={`
            px-2 py-1 text-xs rounded-full font-medium
            ${code.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
              code.status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }
          `}>
            {code.status}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-600">Expires in</div>
          <div className={`text-sm font-medium ${isExpiringSoon ? 'text-red-600' : 'text-gray-900'}`}>
            {daysUntilExpiry} days
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-1">Referral Link:</div>
        <div className="text-sm font-mono bg-gray-50 p-2 rounded border break-all">
          {growthService.generateReferralLink(code.referral_code)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCopy(code.referral_code)}
          className={`
            px-3 py-1 text-sm rounded-lg font-medium transition-colors
            ${isCopied 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {isCopied ? '✓ Copied!' : '📋 Copy Link'}
        </button>
        
        <button
          onClick={() => onShare(code.referral_code, 'twitter')}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors"
        >
          🐦 Twitter
        </button>
        
        <button
          onClick={() => onShare(code.referral_code, 'facebook')}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors"
        >
          📘 Facebook
        </button>
        
        <button
          onClick={() => onShare(code.referral_code, 'linkedin')}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors"
        >
          💼 LinkedIn
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-600">
        <span>Reward: {code.referrer_reward_amount} points</span>
        <span>Created: {new Date(code.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};