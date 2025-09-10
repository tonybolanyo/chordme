/**
 * Growth and engagement features service for frontend
 */

import { apiService } from './api';

export interface ReferralCode {
  id: number;
  referral_code: string;
  status: string;
  referrer_reward_amount: number;
  referred_reward_amount: number;
  source?: string;
  campaign?: string;
  created_at: string;
  expires_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
  active_codes: ReferralCode[];
  recent_completions: ReferralCode[];
}

export interface DailyChallenge {
  id: number;
  challenge_date: string;
  challenge_type: string;
  title: string;
  description: string;
  target_value: number;
  unit: string;
  points_reward: number;
  difficulty: string;
  category: string;
  progress?: ChallengeProgress;
}

export interface ChallengeProgress {
  id: number;
  user_id: number;
  challenge_id: number;
  current_value: number;
  is_completed: boolean;
  completion_percentage: number;
  started_at: string;
  completed_at?: string;
  last_update: string;
}

export interface OnboardingProgress {
  user_id: number;
  profile_completed: boolean;
  first_song_created: boolean;
  first_song_saved: boolean;
  tutorial_completed: boolean;
  first_chord_learned: boolean;
  first_practice_session: boolean;
  first_social_interaction: boolean;
  completion_percentage: number;
  onboarding_completed: boolean;
  milestones_achieved: string[];
  celebrations_shown: string[];
  days_active: number;
  last_active: string;
  streak_days: number;
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface ExperimentAssignment {
  experiment: string;
  variant: string;
  assigned_at: string;
  feature_flags: Record<string, unknown>;
}

export interface AchievementProgress {
  reputation: UserReputation;
  earned_badges: Badge[];
  available_badges: Badge[];
  next_level_threshold: number;
  progress_to_next_level: number;
}

export interface UserReputation {
  user_id: number;
  total_score: number;
  post_score: number;
  thread_score: number;
  solution_score: number;
  helpful_score: number;
  posts_created: number;
  threads_created: number;
  solutions_provided: number;
  votes_cast: number;
  level: number;
  level_name: string;
  badges_earned: number[];
  milestones_achieved: string[];
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon?: string;
  color: string;
  badge_type: string;
  requirements: Record<string, unknown>;
  rarity: string;
  is_active: boolean;
  awarded_count: number;
  created_at: string;
}

export class GrowthService {
  /**
   * Generate a new referral code
   */
  async generateReferralCode(options?: { campaign?: string; source?: string }): Promise<ReferralCode> {
    const response = await apiService.post('/growth/referrals/generate', options || {});
    return response.data;
  }

  /**
   * Track a referral by email
   */
  async trackReferral(referralCode: string, email: string): Promise<void> {
    await apiService.post('/growth/referrals/track', {
      referral_code: referralCode,
      email
    });
  }

  /**
   * Complete a referral when user signs up
   */
  async completeReferral(referralCode: string): Promise<ReferralCode> {
    const response = await apiService.post('/growth/referrals/complete', {
      referral_code: referralCode
    });
    return response.data;
  }

  /**
   * Get referral statistics for current user
   */
  async getReferralStats(): Promise<ReferralStats> {
    const response = await apiService.get('/growth/referrals/stats');
    return response.data;
  }

  /**
   * Get today's daily challenges
   */
  async getDailyChallenges(date?: string): Promise<DailyChallenge[]> {
    const params = date ? { date } : {};
    const response = await apiService.get('/growth/challenges/daily', { params });
    return response.data;
  }

  /**
   * Update progress for a specific challenge
   */
  async updateChallengeProgress(challengeId: number, value: number): Promise<{
    progress: ChallengeProgress;
    newly_completed: boolean;
    points_awarded: number;
  }> {
    const response = await apiService.post(`/growth/challenges/${challengeId}/progress`, {
      value
    });
    return response.data;
  }

  /**
   * Get onboarding progress for current user
   */
  async getOnboardingProgress(): Promise<OnboardingProgress> {
    const response = await apiService.get('/growth/onboarding/progress');
    return response.data;
  }

  /**
   * Complete an onboarding step
   */
  async completeOnboardingStep(step: string): Promise<{
    progress: OnboardingProgress;
    new_milestones: string[];
  }> {
    const response = await apiService.post('/growth/onboarding/complete-step', {
      step
    });
    return response.data;
  }

  /**
   * Get experiment assignment for A/B testing
   */
  async getExperimentAssignment(experimentName: string): Promise<ExperimentAssignment> {
    const response = await apiService.get(`/growth/experiments/${experimentName}/assignment`);
    return response.data;
  }

  /**
   * Get achievement and badge progress
   */
  async getAchievementProgress(): Promise<AchievementProgress> {
    const response = await apiService.get('/growth/achievements/progress');
    return response.data;
  }

  /**
   * Generate shareable referral link
   */
  generateReferralLink(referralCode: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}?ref=${referralCode}`;
  }

  /**
   * Check if there's a referral code in URL params
   */
  extractReferralFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }

  /**
   * Share achievement on social media
   */
  shareAchievement(badge: Badge, platform: 'twitter' | 'facebook' | 'linkedin' = 'twitter'): void {
    const text = `I just earned the "${badge.name}" badge on ChordMe! 🎵 ${badge.description}`;
    const url = window.location.origin;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  }

  /**
   * Get challenge category color for UI
   */
  getChallengeColor(category: string): string {
    const colors = {
      practice: '#10B981',      // emerald-500
      social: '#F59E0B',        // amber-500
      learning: '#3B82F6',      // blue-500
      achievement: '#8B5CF6',   // violet-500
      general: '#6B7280'        // gray-500
    };
    return colors[category as keyof typeof colors] || colors.general;
  }

  /**
   * Get difficulty color for UI
   */
  getDifficultyColor(difficulty: string): string {
    const colors = {
      easy: '#10B981',    // emerald-500
      medium: '#F59E0B',  // amber-500
      hard: '#EF4444'     // red-500
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  }

  /**
   * Get badge rarity color for UI
   */
  getBadgeRarityColor(rarity: string): string {
    const colors = {
      common: '#6B7280',      // gray-500
      uncommon: '#10B981',    // emerald-500
      rare: '#3B82F6',        // blue-500
      epic: '#8B5CF6',        // violet-500
      legendary: '#F59E0B'    // amber-500
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  }

  /**
   * Format milestone name for display
   */
  formatMilestoneName(milestone: string): string {
    const names = {
      first_day: 'First Day Complete',
      first_week: 'First Week Streak',
      streak_3: '3-Day Streak',
      streak_7: '7-Day Streak',
      onboarding_complete: 'Onboarding Complete'
    };
    return names[milestone as keyof typeof names] || milestone.replace(/_/g, ' ');
  }

  /**
   * Calculate days until challenge expires
   */
  getDaysUntilExpiry(expiresAt: string): number {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if user should see onboarding hint
   */
  shouldShowOnboardingHint(progress: OnboardingProgress, step: string): boolean {
    if (progress.onboarding_completed) return false;
    
    const stepOrder = [
      'profile_completed',
      'first_song_created',
      'first_song_saved',
      'tutorial_completed',
      'first_chord_learned',
      'first_practice_session',
      'first_social_interaction'
    ];
    
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex === -1) return false;
    
    // Show hint if this step is not completed but previous steps are
    if ((progress as unknown)[step]) return false;
    
    for (let i = 0; i < currentIndex; i++) {
      if (!(progress as unknown)[stepOrder[i]]) return false;
    }
    
    return true;
  }
}

export const growthService = new GrowthService();