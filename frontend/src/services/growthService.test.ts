/**
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { growthService } from './growthService';
import { apiService } from './api';

// Mock API service
vi.mock('./api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

describe('GrowthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Referral System', () => {
    it('should generate referral code', async () => {
      const mockCode = {
        id: 1,
        referral_code: 'ABC123',
        status: 'pending',
        referrer_reward_amount: 100,
        referred_reward_amount: 50,
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-02-01T00:00:00Z'
      };

      (apiService.post as any).mockResolvedValue({ data: mockCode });

      const result = await growthService.generateReferralCode();

      expect(apiService.post).toHaveBeenCalledWith('/growth/referrals/generate', {});
      expect(result).toEqual(mockCode);
    });

    it('should generate referral code with options', async () => {
      const options = { campaign: 'test-campaign', source: 'email' };
      const mockCode = {
        id: 1,
        referral_code: 'ABC123',
        status: 'pending',
        referrer_reward_amount: 100,
        referred_reward_amount: 50,
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-02-01T00:00:00Z'
      };

      (apiService.post as any).mockResolvedValue({ data: mockCode });

      const result = await growthService.generateReferralCode(options);

      expect(apiService.post).toHaveBeenCalledWith('/growth/referrals/generate', options);
      expect(result).toEqual(mockCode);
    });

    it('should track referral', async () => {
      (apiService.post as any).mockResolvedValue({});

      await growthService.trackReferral('ABC123', 'test@example.com');

      expect(apiService.post).toHaveBeenCalledWith('/growth/referrals/track', {
        referral_code: 'ABC123',
        email: 'test@example.com'
      });
    });

    it('should complete referral', async () => {
      const mockCode = {
        id: 1,
        referral_code: 'ABC123',
        status: 'completed',
        referrer_reward_amount: 100,
        referred_reward_amount: 50,
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-02-01T00:00:00Z'
      };

      (apiService.post as any).mockResolvedValue({ data: mockCode });

      const result = await growthService.completeReferral('ABC123');

      expect(apiService.post).toHaveBeenCalledWith('/growth/referrals/complete', {
        referral_code: 'ABC123'
      });
      expect(result).toEqual(mockCode);
    });

    it('should get referral stats', async () => {
      const mockStats = {
        total_referrals: 5,
        completed_referrals: 3,
        pending_referrals: 2,
        total_rewards_earned: 300,
        active_codes: [],
        recent_completions: []
      };

      (apiService.get as any).mockResolvedValue({ data: mockStats });

      const result = await growthService.getReferralStats();

      expect(apiService.get).toHaveBeenCalledWith('/growth/referrals/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('Daily Challenges', () => {
    it('should get daily challenges', async () => {
      const mockChallenges = [
        {
          id: 1,
          challenge_date: '2024-01-01',
          challenge_type: 'practice_time',
          title: 'Practice 30 Minutes',
          description: 'Practice for at least 30 minutes today',
          target_value: 30,
          unit: 'minutes',
          points_reward: 10,
          difficulty: 'medium',
          category: 'practice'
        }
      ];

      (apiService.get as any).mockResolvedValue({ data: mockChallenges });

      const result = await growthService.getDailyChallenges();

      expect(apiService.get).toHaveBeenCalledWith('/growth/challenges/daily', { params: {} });
      expect(result).toEqual(mockChallenges);
    });

    it('should get daily challenges for specific date', async () => {
      const mockChallenges = [];
      (apiService.get as any).mockResolvedValue({ data: mockChallenges });

      const result = await growthService.getDailyChallenges('2024-01-01');

      expect(apiService.get).toHaveBeenCalledWith('/growth/challenges/daily', { 
        params: { date: '2024-01-01' }
      });
      expect(result).toEqual(mockChallenges);
    });

    it('should update challenge progress', async () => {
      const mockResult = {
        progress: {
          id: 1,
          user_id: 1,
          challenge_id: 1,
          current_value: 15,
          is_completed: false,
          completion_percentage: 50.0,
          started_at: '2024-01-01T00:00:00Z',
          last_update: '2024-01-01T12:00:00Z'
        },
        newly_completed: false,
        points_awarded: 0
      };

      (apiService.post as any).mockResolvedValue({ data: mockResult });

      const result = await growthService.updateChallengeProgress(1, 15);

      expect(apiService.post).toHaveBeenCalledWith('/growth/challenges/1/progress', {
        value: 15
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('Onboarding Progress', () => {
    it('should get onboarding progress', async () => {
      const mockProgress = {
        user_id: 1,
        profile_completed: true,
        first_song_created: false,
        first_song_saved: false,
        tutorial_completed: false,
        first_chord_learned: false,
        first_practice_session: false,
        first_social_interaction: false,
        completion_percentage: 14.3,
        onboarding_completed: false,
        milestones_achieved: [],
        celebrations_shown: [],
        days_active: 1,
        last_active: '2024-01-01T00:00:00Z',
        streak_days: 1,
        started_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      (apiService.get as any).mockResolvedValue({ data: mockProgress });

      const result = await growthService.getOnboardingProgress();

      expect(apiService.get).toHaveBeenCalledWith('/growth/onboarding/progress');
      expect(result).toEqual(mockProgress);
    });

    it('should complete onboarding step', async () => {
      const mockResult = {
        progress: {
          user_id: 1,
          profile_completed: true,
          first_song_created: true,
          completion_percentage: 28.6,
          onboarding_completed: false,
          milestones_achieved: ['first_day'],
          celebrations_shown: [],
          days_active: 1,
          last_active: '2024-01-01T00:00:00Z',
          streak_days: 1,
          started_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        new_milestones: ['first_day']
      };

      (apiService.post as any).mockResolvedValue({ data: mockResult });

      const result = await growthService.completeOnboardingStep('first_song_created');

      expect(apiService.post).toHaveBeenCalledWith('/growth/onboarding/complete-step', {
        step: 'first_song_created'
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('Utility Functions', () => {
    it('should generate referral link', () => {
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true
      });

      const link = growthService.generateReferralLink('ABC123');
      expect(link).toBe('https://example.com?ref=ABC123');

      window.location = originalLocation;
    });

    it('should generate referral link with custom base URL', () => {
      const link = growthService.generateReferralLink('ABC123', 'https://custom.com');
      expect(link).toBe('https://custom.com?ref=ABC123');
    });

    it('should extract referral from URL', () => {
      // Mock URL search params
      Object.defineProperty(window, 'location', {
        value: { search: '?ref=ABC123&other=param' },
        writable: true
      });

      const ref = growthService.extractReferralFromUrl();
      expect(ref).toBe('ABC123');
    });

    it('should return null when no referral in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?other=param' },
        writable: true
      });

      const ref = growthService.extractReferralFromUrl();
      expect(ref).toBeNull();
    });

    it('should get challenge color', () => {
      expect(growthService.getChallengeColor('practice')).toBe('#10B981');
      expect(growthService.getChallengeColor('social')).toBe('#F59E0B');
      expect(growthService.getChallengeColor('learning')).toBe('#3B82F6');
      expect(growthService.getChallengeColor('achievement')).toBe('#8B5CF6');
      expect(growthService.getChallengeColor('unknown')).toBe('#6B7280');
    });

    it('should get difficulty color', () => {
      expect(growthService.getDifficultyColor('easy')).toBe('#10B981');
      expect(growthService.getDifficultyColor('medium')).toBe('#F59E0B');
      expect(growthService.getDifficultyColor('hard')).toBe('#EF4444');
      expect(growthService.getDifficultyColor('unknown')).toBe('#F59E0B');
    });

    it('should get badge rarity color', () => {
      expect(growthService.getBadgeRarityColor('common')).toBe('#6B7280');
      expect(growthService.getBadgeRarityColor('uncommon')).toBe('#10B981');
      expect(growthService.getBadgeRarityColor('rare')).toBe('#3B82F6');
      expect(growthService.getBadgeRarityColor('epic')).toBe('#8B5CF6');
      expect(growthService.getBadgeRarityColor('legendary')).toBe('#F59E0B');
      expect(growthService.getBadgeRarityColor('unknown')).toBe('#6B7280');
    });

    it('should format milestone name', () => {
      expect(growthService.formatMilestoneName('first_day')).toBe('First Day Complete');
      expect(growthService.formatMilestoneName('first_week')).toBe('First Week Streak');
      expect(growthService.formatMilestoneName('streak_3')).toBe('3-Day Streak');
      expect(growthService.formatMilestoneName('streak_7')).toBe('7-Day Streak');
      expect(growthService.formatMilestoneName('onboarding_complete')).toBe('Onboarding Complete');
      expect(growthService.formatMilestoneName('unknown_milestone')).toBe('unknown milestone');
    });

    it('should calculate days until expiry', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const days = growthService.getDaysUntilExpiry(futureDate.toISOString());
      expect(days).toBe(5);
    });

    it('should determine when to show onboarding hint', () => {
      const progress = {
        user_id: 1,
        profile_completed: true,
        first_song_created: false,
        first_song_saved: false,
        tutorial_completed: false,
        first_chord_learned: false,
        first_practice_session: false,
        first_social_interaction: false,
        completion_percentage: 14.3,
        onboarding_completed: false,
        milestones_achieved: [],
        celebrations_shown: [],
        days_active: 1,
        last_active: '2024-01-01T00:00:00Z',
        streak_days: 1,
        started_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Should show hint for first_song_created since profile is completed
      expect(growthService.shouldShowOnboardingHint(progress, 'first_song_created')).toBe(true);

      // Should not show hint for first_song_saved since first_song_created is not done
      expect(growthService.shouldShowOnboardingHint(progress, 'first_song_saved')).toBe(false);

      // Should not show hint for profile_completed since it's already done
      expect(growthService.shouldShowOnboardingHint(progress, 'profile_completed')).toBe(false);
    });
  });
});