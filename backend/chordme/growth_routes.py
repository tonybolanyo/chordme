"""Growth and engagement features API routes."""

from . import app, db
from .models import (
    User, UserReferral, DailyChallenge, UserChallengeProgress,
    UserOnboardingProgress, GrowthExperiment, ExperimentAssignment,
    UserReputation, UserBadge
)
from .utils import (
    auth_required, create_success_response, create_error_response,
    validate_positive_integer, sanitize_input
)
from .rate_limiter import rate_limit
from .security_headers import security_headers
from flask import request, jsonify, g
from datetime import datetime, date, timedelta
import secrets
import string
import logging

logger = logging.getLogger(__name__)


# Referral System Routes

@app.route('/api/v1/growth/referrals/generate', methods=['POST'])
@auth_required
@rate_limit(max_requests=5, window_seconds=3600)  # 5 referral codes per hour
@security_headers
def generate_referral_code():
    """
    Generate a new referral code for the authenticated user.
    ---
    tags:
      - Growth
    summary: Generate referral code
    description: Creates a new referral code for the user to share with others
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            campaign:
              type: string
              description: Campaign identifier (optional)
            source:
              type: string
              description: Source identifier (optional)
    responses:
      200:
        description: Referral code generated successfully
      400:
        description: Invalid request
      429:
        description: Rate limit exceeded
    """
    try:
        data = request.get_json() or {}
        
        # Generate unique referral code
        while True:
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            if not UserReferral.query.filter_by(referral_code=code).first():
                break
        
        # Create referral record
        referral = UserReferral(
            referrer_id=g.user.id,
            referral_code=code,
            source=data.get('source'),
            campaign=data.get('campaign')
        )
        
        db.session.add(referral)
        db.session.commit()
        
        return create_success_response(
            data=referral.to_dict(),
            message="Referral code generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating referral code: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to generate referral code",
            status_code=500
        )


@app.route('/api/v1/growth/referrals/track', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=300)  # 10 tracking requests per 5 minutes
@security_headers
def track_referral():
    """
    Track a referral by email before user registration.
    ---
    tags:
      - Growth
    summary: Track referral
    description: Associates an email with a referral code before user signs up
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - referral_code
            - email
          properties:
            referral_code:
              type: string
              description: Referral code to track
            email:
              type: string
              format: email
              description: Email address of the referred user
    responses:
      200:
        description: Referral tracked successfully
      400:
        description: Invalid referral code or email
      404:
        description: Referral code not found
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        referral_code = sanitize_input(data.get('referral_code', ''))
        email = sanitize_input(data.get('email', ''))
        
        if not referral_code or not email:
            return create_error_response("Referral code and email are required", 400)
        
        # Find referral
        referral = UserReferral.query.filter_by(
            referral_code=referral_code,
            status='pending'
        ).first()
        
        if not referral:
            return create_error_response("Invalid or expired referral code", 404)
        
        # Check if not expired
        if referral.expires_at and referral.expires_at < datetime.utcnow():
            return create_error_response("Referral code has expired", 400)
        
        # Update referral with email
        referral.referred_email = email
        db.session.commit()
        
        return create_success_response(
            message="Referral tracked successfully"
        )
        
    except Exception as e:
        logger.error(f"Error tracking referral: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to track referral",
            status_code=500
        )


@app.route('/api/v1/growth/referrals/complete', methods=['POST'])
@auth_required
@rate_limit(max_requests=3, window_seconds=3600)  # 3 completions per hour
@security_headers
def complete_referral():
    """
    Complete a referral when the referred user signs up.
    ---
    tags:
      - Growth
    summary: Complete referral
    description: Marks a referral as completed and processes rewards
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - referral_code
          properties:
            referral_code:
              type: string
              description: Referral code used during signup
    responses:
      200:
        description: Referral completed successfully
      400:
        description: Invalid referral code or already completed
      404:
        description: Referral not found
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        referral_code = sanitize_input(data.get('referral_code', ''))
        
        if not referral_code:
            return create_error_response("Referral code is required", 400)
        
        # Find referral
        referral = UserReferral.query.filter_by(
            referral_code=referral_code,
            status='pending'
        ).first()
        
        if not referral:
            return create_error_response("Invalid referral code", 404)
        
        # Check if user email matches
        if referral.referred_email and referral.referred_email != g.user.email:
            return create_error_response("Email mismatch", 400)
        
        # Complete referral
        referral.complete_referral(g.user.id)
        
        # Process rewards
        if referral.claim_rewards():
            # Add points to referrer
            referrer_reputation = UserReputation.query.filter_by(
                user_id=referral.referrer_id
            ).first()
            
            if referrer_reputation:
                referrer_reputation.add_score(referral.referrer_reward_amount, 'referral')
            
            # Add points to new user
            user_reputation = UserReputation.query.filter_by(
                user_id=g.user.id
            ).first()
            
            if not user_reputation:
                user_reputation = UserReputation(g.user.id)
                db.session.add(user_reputation)
            
            user_reputation.add_score(referral.referred_reward_amount, 'referral')
        
        db.session.commit()
        
        return create_success_response(
            data=referral.to_dict(),
            message="Referral completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error completing referral: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to complete referral",
            status_code=500
        )


@app.route('/api/v1/growth/referrals/stats', methods=['GET'])
@auth_required
@security_headers
def get_referral_stats():
    """
    Get referral statistics for the authenticated user.
    ---
    tags:
      - Growth
    summary: Get referral statistics
    description: Returns referral stats including completed referrals and rewards earned
    security:
      - Bearer: []
    responses:
      200:
        description: Referral statistics retrieved successfully
    """
    try:
        # Get user's referrals
        referrals = UserReferral.query.filter_by(referrer_id=g.user.id).all()
        
        stats = {
            'total_referrals': len(referrals),
            'completed_referrals': len([r for r in referrals if r.status == 'rewarded']),
            'pending_referrals': len([r for r in referrals if r.status == 'pending']),
            'total_rewards_earned': sum(r.referrer_reward_amount for r in referrals if r.rewards_claimed),
            'active_codes': [r.to_dict() for r in referrals if r.status in ['pending', 'completed']],
            'recent_completions': [
                r.to_dict() for r in referrals 
                if r.status == 'rewarded' and r.completed_at and 
                r.completed_at > datetime.utcnow() - timedelta(days=30)
            ]
        }
        
        return create_success_response(
            data=stats,
            message="Referral statistics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting referral stats: {str(e)}")
        return create_error_response(
            message="Failed to retrieve referral statistics",
            status_code=500
        )


# Daily Challenges Routes

@app.route('/api/v1/growth/challenges/daily', methods=['GET'])
@auth_required
@security_headers
def get_daily_challenges():
    """
    Get today's daily challenges for the authenticated user.
    ---
    tags:
      - Growth
    summary: Get daily challenges
    description: Returns today's available challenges and user progress
    security:
      - Bearer: []
    parameters:
      - in: query
        name: date
        type: string
        format: date
        description: Date for challenges (defaults to today)
    responses:
      200:
        description: Daily challenges retrieved successfully
    """
    try:
        # Get date parameter or use today
        date_param = request.args.get('date')
        if date_param:
            target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        else:
            target_date = date.today()
        
        # Get challenges for the date
        challenges = DailyChallenge.query.filter_by(
            challenge_date=target_date,
            is_active=True
        ).all()
        
        # Get user's progress for these challenges
        challenge_ids = [c.id for c in challenges]
        progress_records = UserChallengeProgress.query.filter(
            UserChallengeProgress.user_id == g.user.id,
            UserChallengeProgress.challenge_id.in_(challenge_ids)
        ).all()
        
        progress_by_challenge = {p.challenge_id: p for p in progress_records}
        
        # Build response
        result = []
        for challenge in challenges:
            challenge_data = challenge.to_dict()
            progress = progress_by_challenge.get(challenge.id)
            
            if progress:
                challenge_data['progress'] = progress.to_dict()
            else:
                # Initialize progress if not exists
                progress = UserChallengeProgress(g.user.id, challenge.id)
                db.session.add(progress)
                challenge_data['progress'] = progress.to_dict()
        
        db.session.commit()
        
        return create_success_response(
            data=result,
            message="Daily challenges retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting daily challenges: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to retrieve daily challenges",
            status_code=500
        )


@app.route('/api/v1/growth/challenges/<int:challenge_id>/progress', methods=['POST'])
@auth_required
@rate_limit(max_requests=30, window_seconds=60)  # 30 progress updates per minute
@security_headers
def update_challenge_progress(challenge_id):
    """
    Update progress for a specific challenge.
    ---
    tags:
      - Growth
    summary: Update challenge progress
    description: Updates user progress on a daily challenge
    security:
      - Bearer: []
    parameters:
      - in: path
        name: challenge_id
        type: integer
        required: true
        description: Challenge ID
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - value
          properties:
            value:
              type: integer
              description: New progress value
    responses:
      200:
        description: Challenge progress updated successfully
      400:
        description: Invalid request data
      404:
        description: Challenge not found
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        new_value = data.get('value')
        if new_value is None or not isinstance(new_value, int) or new_value < 0:
            return create_error_response("Valid value is required", 400)
        
        # Find challenge
        challenge = DailyChallenge.query.get_or_404(challenge_id)
        
        # Find or create progress
        progress = UserChallengeProgress.query.filter_by(
            user_id=g.user.id,
            challenge_id=challenge_id
        ).first()
        
        if not progress:
            progress = UserChallengeProgress(g.user.id, challenge_id)
            db.session.add(progress)
        
        # Update progress
        newly_completed = progress.update_progress(new_value)
        
        # If newly completed, award points
        if newly_completed:
            user_reputation = UserReputation.query.filter_by(
                user_id=g.user.id
            ).first()
            
            if not user_reputation:
                user_reputation = UserReputation(g.user.id)
                db.session.add(user_reputation)
            
            user_reputation.add_score(challenge.points_reward, 'challenge')
        
        db.session.commit()
        
        response_data = {
            'progress': progress.to_dict(),
            'newly_completed': newly_completed,
            'points_awarded': challenge.points_reward if newly_completed else 0
        }
        
        return create_success_response(
            data=response_data,
            message="Challenge progress updated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error updating challenge progress: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to update challenge progress",
            status_code=500
        )


# Onboarding Progress Routes

@app.route('/api/v1/growth/onboarding/progress', methods=['GET'])
@auth_required
@security_headers
def get_onboarding_progress():
    """
    Get onboarding progress for the authenticated user.
    ---
    tags:
      - Growth
    summary: Get onboarding progress
    description: Returns user's onboarding completion status and milestones
    security:
      - Bearer: []
    responses:
      200:
        description: Onboarding progress retrieved successfully
    """
    try:
        # Find or create onboarding progress
        progress = UserOnboardingProgress.query.filter_by(
            user_id=g.user.id
        ).first()
        
        if not progress:
            progress = UserOnboardingProgress(g.user.id)
            db.session.add(progress)
            db.session.commit()
        
        return create_success_response(
            data=progress.to_dict(),
            message="Onboarding progress retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting onboarding progress: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to retrieve onboarding progress",
            status_code=500
        )


@app.route('/api/v1/growth/onboarding/complete-step', methods=['POST'])
@auth_required
@rate_limit(max_requests=20, window_seconds=60)  # 20 step completions per minute
@security_headers
def complete_onboarding_step():
    """
    Mark an onboarding step as completed.
    ---
    tags:
      - Growth
    summary: Complete onboarding step
    description: Marks a specific onboarding step as completed and checks for milestones
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - step
          properties:
            step:
              type: string
              enum:
                - profile_completed
                - first_song_created
                - first_song_saved
                - tutorial_completed
                - first_chord_learned
                - first_practice_session
                - first_social_interaction
              description: Onboarding step to complete
    responses:
      200:
        description: Onboarding step completed successfully
      400:
        description: Invalid step name
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response("No data provided", 400)
        
        step = sanitize_input(data.get('step', ''))
        valid_steps = [
            'profile_completed', 'first_song_created', 'first_song_saved',
            'tutorial_completed', 'first_chord_learned', 'first_practice_session',
            'first_social_interaction'
        ]
        
        if step not in valid_steps:
            return create_error_response("Invalid step name", 400)
        
        # Find or create onboarding progress
        progress = UserOnboardingProgress.query.filter_by(
            user_id=g.user.id
        ).first()
        
        if not progress:
            progress = UserOnboardingProgress(g.user.id)
            db.session.add(progress)
        
        # Complete step and check for milestones
        new_milestones = progress.complete_step(step)
        progress.update_activity()
        
        db.session.commit()
        
        response_data = {
            'progress': progress.to_dict(),
            'new_milestones': new_milestones
        }
        
        return create_success_response(
            data=response_data,
            message="Onboarding step completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error completing onboarding step: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to complete onboarding step",
            status_code=500
        )


# A/B Testing Routes

@app.route('/api/v1/growth/experiments/<experiment_name>/assignment', methods=['GET'])
@auth_required
@security_headers
def get_experiment_assignment(experiment_name):
    """
    Get user's assignment for an A/B test experiment.
    ---
    tags:
      - Growth
    summary: Get experiment assignment
    description: Returns the user's variant assignment for a specific experiment
    security:
      - Bearer: []
    parameters:
      - in: path
        name: experiment_name
        type: string
        required: true
        description: Name of the experiment
    responses:
      200:
        description: Experiment assignment retrieved successfully
      404:
        description: Experiment not found
    """
    try:
        # Find active experiment
        experiment = GrowthExperiment.query.filter_by(
            name=experiment_name,
            status='active'
        ).first()
        
        if not experiment:
            return create_error_response("Experiment not found or not active", 404)
        
        # Get or create assignment
        assignment = ExperimentAssignment.query.filter_by(
            experiment_id=experiment.id,
            user_id=g.user.id
        ).first()
        
        if not assignment:
            # Assign user to variant
            variant = experiment.assign_user(g.user.id)
            assignment = ExperimentAssignment.query.filter_by(
                experiment_id=experiment.id,
                user_id=g.user.id
            ).first()
        
        # Record exposure
        assignment.record_exposure()
        db.session.commit()
        
        return create_success_response(
            data={
                'experiment': experiment.name,
                'variant': assignment.variant,
                'assigned_at': assignment.assigned_at.isoformat(),
                'feature_flags': experiment.feature_flags.get(assignment.variant, {})
            },
            message="Experiment assignment retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting experiment assignment: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to get experiment assignment",
            status_code=500
        )


# Enhanced Achievement System Routes

@app.route('/api/v1/growth/achievements/progress', methods=['GET'])
@auth_required
@security_headers
def get_achievement_progress():
    """
    Get user's achievement and badge progress.
    ---
    tags:
      - Growth
    summary: Get achievement progress
    description: Returns user's reputation, badges, and available achievements
    security:
      - Bearer: []
    responses:
      200:
        description: Achievement progress retrieved successfully
    """
    try:
        # Get user reputation
        reputation = UserReputation.query.filter_by(user_id=g.user.id).first()
        if not reputation:
            reputation = UserReputation(g.user.id)
            db.session.add(reputation)
            db.session.commit()
        
        # Get available badges
        all_badges = UserBadge.query.filter_by(is_active=True).all()
        earned_badge_ids = reputation.badges_earned or []
        
        # Categorize badges
        earned_badges = [badge.to_dict() for badge in all_badges if badge.id in earned_badge_ids]
        available_badges = [badge.to_dict() for badge in all_badges if badge.id not in earned_badge_ids]
        
        # Calculate next level progress
        next_level_threshold = 0
        current_level = reputation.level
        
        level_thresholds = [0, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
        if current_level < len(level_thresholds):
            next_level_threshold = level_thresholds[current_level]
        
        progress_to_next = 0
        if next_level_threshold > 0:
            progress_to_next = (reputation.total_score / next_level_threshold) * 100
        
        response_data = {
            'reputation': reputation.to_dict(),
            'earned_badges': earned_badges,
            'available_badges': available_badges,
            'next_level_threshold': next_level_threshold,
            'progress_to_next_level': min(progress_to_next, 100.0)
        }
        
        return create_success_response(
            data=response_data,
            message="Achievement progress retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting achievement progress: {str(e)}")
        db.session.rollback()
        return create_error_response(
            message="Failed to retrieve achievement progress",
            status_code=500
        )