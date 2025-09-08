"""
Test growth and engagement features
"""

import json
import pytest
from datetime import datetime, timedelta, date
from chordme.models import (
    User, UserReferral, DailyChallenge, UserChallengeProgress,
    UserOnboardingProgress, GrowthExperiment, ExperimentAssignment,
    UserReputation, UserBadge
)


class TestReferralSystem:
    """Test referral program functionality."""

    def test_generate_referral_code(self, client, auth_headers):
        """Test generating a new referral code."""
        response = client.post('/api/v1/growth/referrals/generate', 
                             headers=auth_headers,
                             json={})
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'referral_code' in data['data']
        assert len(data['data']['referral_code']) == 8
        assert data['data']['status'] == 'pending'

    def test_generate_referral_code_with_campaign(self, client, auth_headers):
        """Test generating referral code with campaign info."""
        response = client.post('/api/v1/growth/referrals/generate',
                             headers=auth_headers,
                             json={
                                 'campaign': 'test-campaign',
                                 'source': 'email'
                             })
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['campaign'] == 'test-campaign'
        assert data['data']['source'] == 'email'

    def test_track_referral(self, client):
        """Test tracking a referral by email."""
        # First create a referral code
        referral = UserReferral(
            referrer_id=1,
            referral_code='TEST123'
        )
        referral.save()

        response = client.post('/api/v1/growth/referrals/track',
                             json={
                                 'referral_code': 'TEST123',
                                 'email': 'test@example.com'
                             })
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        
        # Verify referral was updated
        updated_referral = UserReferral.query.filter_by(referral_code='TEST123').first()
        assert updated_referral.referred_email == 'test@example.com'

    def test_track_referral_invalid_code(self, client):
        """Test tracking with invalid referral code."""
        response = client.post('/api/v1/growth/referrals/track',
                             json={
                                 'referral_code': 'INVALID',
                                 'email': 'test@example.com'
                             })
        assert response.status_code == 404
        
        data = response.get_json()
        assert data['status'] == 'error'

    def test_complete_referral(self, client, auth_headers):
        """Test completing a referral."""
        # Create a referral with tracked email
        referral = UserReferral(
            referrer_id=2,  # Different user
            referral_code='COMPLETE123',
            referred_email='test@example.com'
        )
        referral.save()

        response = client.post('/api/v1/growth/referrals/complete',
                             headers=auth_headers,
                             json={'referral_code': 'COMPLETE123'})
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['status'] == 'rewarded'

    def test_get_referral_stats(self, client, auth_headers):
        """Test getting referral statistics."""
        response = client.get('/api/v1/growth/referrals/stats',
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'total_referrals' in data['data']
        assert 'completed_referrals' in data['data']
        assert 'pending_referrals' in data['data']
        assert 'total_rewards_earned' in data['data']


class TestDailyChallenges:
    """Test daily challenges functionality."""

    def test_get_daily_challenges(self, client, auth_headers):
        """Test getting today's daily challenges."""
        # Create a challenge for today
        today = date.today()
        challenge = DailyChallenge(
            challenge_date=today,
            challenge_type='practice_time',
            title='Practice 30 Minutes',
            description='Practice for at least 30 minutes today',
            target_value=30,
            unit='minutes'
        )
        challenge.save()

        response = client.get('/api/v1/growth/challenges/daily',
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert len(data['data']) >= 1
        assert data['data'][0]['title'] == 'Practice 30 Minutes'

    def test_get_daily_challenges_specific_date(self, client, auth_headers):
        """Test getting challenges for a specific date."""
        response = client.get('/api/v1/growth/challenges/daily?date=2024-01-01',
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'

    def test_update_challenge_progress(self, client, auth_headers):
        """Test updating challenge progress."""
        # Create a challenge
        today = date.today()
        challenge = DailyChallenge(
            challenge_date=today,
            challenge_type='practice_time',
            title='Practice 30 Minutes',
            description='Practice for at least 30 minutes today',
            target_value=30,
            unit='minutes'
        )
        challenge.save()

        response = client.post(f'/api/v1/growth/challenges/{challenge.id}/progress',
                             headers=auth_headers,
                             json={'value': 15})
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['progress']['current_value'] == 15
        assert data['data']['progress']['completion_percentage'] == 50.0
        assert data['data']['newly_completed'] == False

    def test_complete_challenge(self, client, auth_headers):
        """Test completing a challenge."""
        # Create a challenge with low target for easy completion
        today = date.today()
        challenge = DailyChallenge(
            challenge_date=today,
            challenge_type='new_song',
            title='Create 1 Song',
            description='Create your first song today',
            target_value=1,
            unit='count',
            points_reward=20
        )
        challenge.save()

        response = client.post(f'/api/v1/growth/challenges/{challenge.id}/progress',
                             headers=auth_headers,
                             json={'value': 1})
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['progress']['is_completed'] == True
        assert data['data']['newly_completed'] == True
        assert data['data']['points_awarded'] == 20


class TestOnboardingProgress:
    """Test onboarding progress functionality."""

    def test_get_onboarding_progress(self, client, auth_headers):
        """Test getting onboarding progress."""
        response = client.get('/api/v1/growth/onboarding/progress',
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'completion_percentage' in data['data']
        assert 'onboarding_completed' in data['data']

    def test_complete_onboarding_step(self, client, auth_headers):
        """Test completing an onboarding step."""
        response = client.post('/api/v1/growth/onboarding/complete-step',
                             headers=auth_headers,
                             json={'step': 'profile_completed'})
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['progress']['profile_completed'] == True

    def test_complete_invalid_onboarding_step(self, client, auth_headers):
        """Test completing an invalid onboarding step."""
        response = client.post('/api/v1/growth/onboarding/complete-step',
                             headers=auth_headers,
                             json={'step': 'invalid_step'})
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['status'] == 'error'


class TestExperimentAssignment:
    """Test A/B testing functionality."""

    def test_get_experiment_assignment(self, client, auth_headers):
        """Test getting experiment assignment."""
        # Create an experiment
        experiment = GrowthExperiment(
            name='test-experiment',
            description='Test experiment',
            experiment_type='ab_test',
            variants=['control', 'variant_a'],
            traffic_allocation={'control': 50, 'variant_a': 50},
            primary_metric='conversion',
            success_criteria={'min_conversion_rate': 0.05},
            created_by=1
        )
        experiment.status = 'active'
        experiment.save()

        response = client.get('/api/v1/growth/experiments/test-experiment/assignment',
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['experiment'] == 'test-experiment'
        assert data['data']['variant'] in ['control', 'variant_a']

    def test_get_experiment_assignment_not_found(self, client, auth_headers):
        """Test getting assignment for non-existent experiment."""
        response = client.get('/api/v1/growth/experiments/non-existent/assignment',
                            headers=auth_headers)
        assert response.status_code == 404
        
        data = response.get_json()
        assert data['status'] == 'error'


class TestAchievementProgress:
    """Test achievement and badge progress functionality."""

    def test_get_achievement_progress(self, client, auth_headers):
        """Test getting achievement progress."""
        response = client.get('/api/v1/growth/achievements/progress',
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'reputation' in data['data']
        assert 'earned_badges' in data['data']
        assert 'available_badges' in data['data']
        assert 'next_level_threshold' in data['data']
        assert 'progress_to_next_level' in data['data']


class TestModels:
    """Test growth feature models."""

    def test_user_referral_model(self):
        """Test UserReferral model functionality."""
        referral = UserReferral(
            referrer_id=1,
            referral_code='TEST123'
        )
        
        assert referral.status == 'pending'
        assert not referral.rewards_claimed
        
        # Test completing referral
        referral.complete_referral(2)
        assert referral.status == 'completed'
        assert referral.referred_id == 2
        assert referral.completed_at is not None
        
        # Test claiming rewards
        success = referral.claim_rewards()
        assert success == True
        assert referral.rewards_claimed == True
        assert referral.status == 'rewarded'

    def test_daily_challenge_model(self):
        """Test DailyChallenge model functionality."""
        challenge = DailyChallenge(
            challenge_date=date.today(),
            challenge_type='practice_time',
            title='Practice 30 Minutes',
            description='Practice for at least 30 minutes today',
            target_value=30
        )
        
        assert challenge.unit == 'count'
        assert challenge.points_reward == 10
        assert challenge.difficulty == 'medium'
        assert challenge.is_active == True

    def test_user_challenge_progress_model(self):
        """Test UserChallengeProgress model functionality."""
        progress = UserChallengeProgress(
            user_id=1,
            challenge_id=1
        )
        
        assert progress.current_value == 0
        assert progress.is_completed == False
        assert progress.completion_percentage == 0.0
        
        # Mock challenge for testing
        class MockChallenge:
            target_value = 30
        
        progress.challenge = MockChallenge()
        
        # Test updating progress
        newly_completed = progress.update_progress(15)
        assert progress.current_value == 15
        assert progress.completion_percentage == 50.0
        assert newly_completed == False
        
        # Test completing
        newly_completed = progress.update_progress(30)
        assert progress.current_value == 30
        assert progress.completion_percentage == 100.0
        assert progress.is_completed == True
        assert newly_completed == True

    def test_user_onboarding_progress_model(self):
        """Test UserOnboardingProgress model functionality."""
        progress = UserOnboardingProgress(user_id=1)
        
        assert progress.completion_percentage == 0.0
        assert progress.onboarding_completed == False
        
        # Test completing steps
        new_milestones = progress.complete_step('profile_completed')
        assert progress.profile_completed == True
        assert progress.completion_percentage > 0
        
        new_milestones = progress.complete_step('first_song_created')
        assert progress.first_song_created == True
        assert 'first_day' in new_milestones

    def test_growth_experiment_model(self):
        """Test GrowthExperiment model functionality."""
        experiment = GrowthExperiment(
            name='test-experiment',
            description='Test experiment',
            experiment_type='ab_test',
            variants=['control', 'variant_a'],
            traffic_allocation={'control': 50, 'variant_a': 50},
            primary_metric='conversion',
            success_criteria={'min_conversion_rate': 0.05},
            created_by=1
        )
        
        assert experiment.status == 'draft'
        assert experiment.confidence_level == 95.0
        
        # Test user assignment (would need mocked database session)
        # variant = experiment.assign_user(1)
        # assert variant in ['control', 'variant_a']