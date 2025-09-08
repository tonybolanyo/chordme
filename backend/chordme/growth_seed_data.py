"""
Seed data for growth and engagement features
Creates sample challenges, badges, and test data for development
"""

from chordme.models import (
    DailyChallenge, UserBadge, GrowthExperiment, 
    UserReputation, UserOnboardingProgress
)
from chordme import db
from datetime import date, datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def create_sample_badges():
    """Create sample achievement badges."""
    badges = [
        # Common badges
        {
            'name': 'First Steps',
            'description': 'Created your first song',
            'badge_type': 'achievement',
            'requirements': {'songs_created': 1},
            'rarity': 'common',
            'icon': '🎵',
            'color': '#10B981',
            'localized_names': {
                'es': 'Primeros Pasos'
            },
            'localized_descriptions': {
                'es': 'Creaste tu primera canción'
            }
        },
        {
            'name': 'Practice Starter',
            'description': 'Completed your first practice session',
            'badge_type': 'achievement',
            'requirements': {'practice_sessions': 1},
            'rarity': 'common',
            'icon': '🎯',
            'color': '#3B82F6'
        },
        {
            'name': 'Community Member',
            'description': 'Made your first forum post',
            'badge_type': 'achievement',
            'requirements': {'forum_posts': 1},
            'rarity': 'common',
            'icon': '💬',
            'color': '#8B5CF6'
        },
        
        # Uncommon badges
        {
            'name': 'Song Creator',
            'description': 'Created 5 songs',
            'badge_type': 'achievement',
            'requirements': {'songs_created': 5},
            'rarity': 'uncommon',
            'icon': '🎼',
            'color': '#059669'
        },
        {
            'name': 'Practice Enthusiast',
            'description': 'Completed 10 practice sessions',
            'badge_type': 'achievement',
            'requirements': {'practice_sessions': 10},
            'rarity': 'uncommon',
            'icon': '🔥',
            'color': '#DC2626'
        },
        {
            'name': 'Helpful Member',
            'description': 'Received 10 helpful votes in the forum',
            'badge_type': 'achievement',
            'requirements': {'helpful_votes': 10},
            'rarity': 'uncommon',
            'icon': '👍',
            'color': '#7C3AED'
        },
        
        # Rare badges
        {
            'name': 'Prolific Creator',
            'description': 'Created 25 songs',
            'badge_type': 'achievement',
            'requirements': {'songs_created': 25},
            'rarity': 'rare',
            'icon': '🏆',
            'color': '#1D4ED8'
        },
        {
            'name': 'Practice Master',
            'description': 'Completed 50 practice sessions',
            'badge_type': 'achievement',
            'requirements': {'practice_sessions': 50},
            'rarity': 'rare',
            'icon': '⭐',
            'color': '#B91C1C'
        },
        {
            'name': 'Community Leader',
            'description': 'Reached 500 reputation points',
            'badge_type': 'milestone',
            'requirements': {'reputation_score': 500},
            'rarity': 'rare',
            'icon': '👑',
            'color': '#9333EA'
        },
        
        # Epic badges
        {
            'name': 'Song Master',
            'description': 'Created 100 songs',
            'badge_type': 'achievement',
            'requirements': {'songs_created': 100},
            'rarity': 'epic',
            'icon': '🎖️',
            'color': '#1E40AF'
        },
        {
            'name': 'Practice Legend',
            'description': 'Completed 200 practice sessions',
            'badge_type': 'achievement',
            'requirements': {'practice_sessions': 200},
            'rarity': 'epic',
            'icon': '🥇',
            'color': '#DC2626'
        },
        
        # Legendary badges
        {
            'name': 'ChordMe Master',
            'description': 'Reached maximum reputation level',
            'badge_type': 'milestone',
            'requirements': {'reputation_score': 10000},
            'rarity': 'legendary',
            'icon': '💎',
            'color': '#F59E0B'
        },
        {
            'name': 'Ultimate Musician',
            'description': 'Completed all available challenges',
            'badge_type': 'special',
            'requirements': {'all_challenges_completed': True},
            'rarity': 'legendary',
            'icon': '🌟',
            'color': '#EF4444'
        }
    ]
    
    created_badges = []
    for badge_data in badges:
        # Check if badge already exists
        existing = UserBadge.query.filter_by(name=badge_data['name']).first()
        if not existing:
            badge = UserBadge(
                name=badge_data['name'],
                description=badge_data['description'],
                badge_type=badge_data['badge_type'],
                requirements=badge_data['requirements'],
                icon=badge_data.get('icon'),
                color=badge_data.get('color', '#3498db'),
                rarity=badge_data.get('rarity', 'common')
            )
            
            if 'localized_names' in badge_data:
                badge.localized_names = badge_data['localized_names']
            if 'localized_descriptions' in badge_data:
                badge.localized_descriptions = badge_data['localized_descriptions']
            
            db.session.add(badge)
            created_badges.append(badge)
    
    db.session.commit()
    logger.info(f"Created {len(created_badges)} badges")
    return created_badges


def create_sample_challenges():
    """Create sample daily challenges for the next week."""
    today = date.today()
    challenges = []
    
    # Challenge templates with different types and difficulties
    challenge_templates = [
        {
            'type': 'practice_time',
            'title': 'Practice Session',
            'description': 'Practice for at least {target} minutes today',
            'targets': [15, 30, 45, 60],
            'units': 'minutes',
            'rewards': [10, 15, 20, 25],
            'difficulties': ['easy', 'medium', 'medium', 'hard']
        },
        {
            'type': 'accuracy',
            'title': 'Accuracy Challenge',
            'description': 'Achieve {target}% accuracy in practice mode',
            'targets': [70, 80, 90, 95],
            'units': 'percentage',
            'rewards': [15, 20, 30, 40],
            'difficulties': ['easy', 'medium', 'hard', 'hard']
        },
        {
            'type': 'new_song',
            'title': 'Song Creation',
            'description': 'Create {target} new song(s) today',
            'targets': [1, 2, 3],
            'units': 'count',
            'rewards': [20, 35, 50],
            'difficulties': ['medium', 'hard', 'hard']
        },
        {
            'type': 'sharing',
            'title': 'Share Your Music',
            'description': 'Share {target} song(s) with the community',
            'targets': [1, 2, 3],
            'units': 'count',
            'rewards': [15, 25, 35],
            'difficulties': ['easy', 'medium', 'hard']
        },
        {
            'type': 'streak',
            'title': 'Keep Your Streak',
            'description': 'Maintain your daily activity streak',
            'targets': [1],
            'units': 'count',
            'rewards': [10],
            'difficulties': ['easy']
        }
    ]
    
    # Create challenges for the next 7 days
    for day_offset in range(7):
        challenge_date = today + timedelta(days=day_offset)
        
        # Create 2-3 challenges per day
        num_challenges = 2 if day_offset < 3 else 3
        selected_templates = challenge_templates[:num_challenges]
        
        for i, template in enumerate(selected_templates):
            # Rotate through different difficulty levels
            difficulty_index = (day_offset + i) % len(template['targets'])
            target = template['targets'][difficulty_index]
            reward = template['rewards'][difficulty_index]
            difficulty = template['difficulties'][difficulty_index]
            
            title = template['title']
            if day_offset > 0:
                title += f" (Day {day_offset + 1})"
            
            description = template['description'].format(target=target)
            
            # Add Spanish translations
            localized_titles = {'es': title}
            localized_descriptions = {'es': description}
            
            if template['type'] == 'practice_time':
                localized_titles['es'] = 'Sesión de Práctica'
                localized_descriptions['es'] = f'Practica por al menos {target} minutos hoy'
            elif template['type'] == 'accuracy':
                localized_titles['es'] = 'Desafío de Precisión'
                localized_descriptions['es'] = f'Alcanza {target}% de precisión en modo práctica'
            elif template['type'] == 'new_song':
                localized_titles['es'] = 'Creación de Canciones'
                localized_descriptions['es'] = f'Crea {target} canción(es) nueva(s) hoy'
            elif template['type'] == 'sharing':
                localized_titles['es'] = 'Comparte tu Música'
                localized_descriptions['es'] = f'Comparte {target} canción(es) con la comunidad'
            elif template['type'] == 'streak':
                localized_titles['es'] = 'Mantén tu Racha'
                localized_descriptions['es'] = 'Mantén tu racha de actividad diaria'
            
            challenge = DailyChallenge(
                challenge_date=challenge_date,
                challenge_type=template['type'],
                title=title,
                description=description,
                target_value=target,
                unit=template['units'],
                points_reward=reward,
                difficulty=difficulty,
                category='practice' if template['type'] in ['practice_time', 'accuracy'] else 'general'
            )
            
            challenge.localized_titles = localized_titles
            challenge.localized_descriptions = localized_descriptions
            
            # Check if challenge already exists
            existing = DailyChallenge.query.filter_by(
                challenge_date=challenge_date,
                challenge_type=template['type']
            ).first()
            
            if not existing:
                db.session.add(challenge)
                challenges.append(challenge)
    
    db.session.commit()
    logger.info(f"Created {len(challenges)} daily challenges")
    return challenges


def create_sample_experiments():
    """Create sample A/B testing experiments."""
    experiments = [
        {
            'name': 'new-onboarding-flow',
            'description': 'Test new guided onboarding vs current flow',
            'experiment_type': 'ab_test',
            'variants': ['control', 'guided_tour'],
            'traffic_allocation': {'control': 50, 'guided_tour': 50},
            'primary_metric': 'onboarding_completion',
            'success_criteria': {'min_improvement': 5.0},
            'status': 'active',
            'feature_flags': {
                'control': {},
                'guided_tour': {
                    'show_guided_tour': True,
                    'tour_style': 'spotlight'
                }
            }
        },
        {
            'name': 'challenge-difficulty',
            'description': 'Test optimal challenge difficulty for retention',
            'experiment_type': 'multivariate',
            'variants': ['easy', 'medium', 'adaptive'],
            'traffic_allocation': {'easy': 33, 'medium': 33, 'adaptive': 34},
            'primary_metric': 'challenge_completion_rate',
            'success_criteria': {'min_improvement': 10.0},
            'status': 'active',
            'feature_flags': {
                'easy': {'challenge_multiplier': 0.7},
                'medium': {'challenge_multiplier': 1.0},
                'adaptive': {'adaptive_difficulty': True}
            }
        },
        {
            'name': 'referral-rewards',
            'description': 'Test different referral reward structures',
            'experiment_type': 'ab_test',
            'variants': ['current', 'increased'],
            'traffic_allocation': {'current': 50, 'increased': 50},
            'primary_metric': 'referral_conversion',
            'success_criteria': {'min_improvement': 15.0},
            'status': 'draft',
            'feature_flags': {
                'current': {'referrer_reward': 100, 'referred_reward': 50},
                'increased': {'referrer_reward': 150, 'referred_reward': 75}
            }
        }
    ]
    
    created_experiments = []
    for exp_data in experiments:
        existing = GrowthExperiment.query.filter_by(name=exp_data['name']).first()
        if not existing:
            experiment = GrowthExperiment(
                name=exp_data['name'],
                description=exp_data['description'],
                experiment_type=exp_data['experiment_type'],
                variants=exp_data['variants'],
                traffic_allocation=exp_data['traffic_allocation'],
                primary_metric=exp_data['primary_metric'],
                success_criteria=exp_data['success_criteria'],
                created_by=1  # Assuming admin user with ID 1
            )
            experiment.status = exp_data['status']
            experiment.feature_flags = exp_data['feature_flags']
            
            if exp_data['status'] == 'active':
                experiment.start_date = datetime.utcnow()
                experiment.end_date = datetime.utcnow() + timedelta(days=30)
            
            db.session.add(experiment)
            created_experiments.append(experiment)
    
    db.session.commit()
    logger.info(f"Created {len(created_experiments)} experiments")
    return created_experiments


def seed_growth_data():
    """Main function to seed all growth-related data."""
    try:
        logger.info("Starting growth data seeding...")
        
        badges = create_sample_badges()
        challenges = create_sample_challenges()
        experiments = create_sample_experiments()
        
        logger.info("Growth data seeding completed successfully!")
        return {
            'badges': len(badges),
            'challenges': len(challenges),
            'experiments': len(experiments)
        }
        
    except Exception as e:
        logger.error(f"Error seeding growth data: {str(e)}")
        db.session.rollback()
        raise


if __name__ == '__main__':
    # Can be run directly for testing
    from chordme import app
    with app.app_context():
        result = seed_growth_data()
        print(f"Seeded {result['badges']} badges, {result['challenges']} challenges, {result['experiments']} experiments")