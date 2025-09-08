"""
Script to initialize forum data with default categories and badges.
Run this after database migration to set up initial forum structure.
"""

from chordme import app, db
from chordme.models import ForumCategory, UserBadge


def create_default_categories():
    """Create default forum categories."""
    categories = [
        {
            'name': 'General Discussion',
            'slug': 'general',
            'description': 'General discussions about ChordMe and music',
            'color': '#3498db',
            'icon': '💬',
            'display_order': 1
        },
        {
            'name': 'Questions & Answers',
            'slug': 'questions',
            'description': 'Ask questions and get help from the community',
            'color': '#e74c3c',
            'icon': '❓',
            'display_order': 2
        },
        {
            'name': 'Feature Requests',
            'slug': 'feature-requests',
            'description': 'Suggest new features and improvements',
            'color': '#f39c12',
            'icon': '💡',
            'display_order': 3
        },
        {
            'name': 'Bug Reports',
            'slug': 'bug-reports',
            'description': 'Report bugs and technical issues',
            'color': '#e67e22',
            'icon': '🐛',
            'display_order': 4
        },
        {
            'name': 'Show & Tell',
            'slug': 'show-tell',
            'description': 'Share your songs, covers, and musical creations',
            'color': '#9b59b6',
            'icon': '🎵',
            'display_order': 5
        },
        {
            'name': 'Tips & Tutorials',
            'slug': 'tips-tutorials',
            'description': 'Share and learn music tips, tricks, and tutorials',
            'color': '#27ae60',
            'icon': '📚',
            'display_order': 6
        },
        {
            'name': 'Announcements',
            'slug': 'announcements',
            'description': 'Official announcements and updates',
            'color': '#2c3e50',
            'icon': '📢',
            'display_order': 0,
            'moderator_only': True
        }
    ]
    
    for cat_data in categories:
        existing = ForumCategory.query.filter_by(slug=cat_data['slug']).first()
        if not existing:
            category = ForumCategory(
                name=cat_data['name'],
                slug=cat_data['slug'],
                description=cat_data['description'],
                color=cat_data['color']
            )
            category.icon = cat_data['icon']
            category.display_order = cat_data['display_order']
            if 'moderator_only' in cat_data:
                category.moderator_only = cat_data['moderator_only']
            
            db.session.add(category)
            print(f"Created category: {cat_data['name']}")
    
    db.session.commit()


def create_default_badges():
    """Create default forum badges."""
    badges = [
        # Achievement Badges
        {
            'name': 'First Post',
            'description': 'Made your first forum post',
            'badge_type': 'achievement',
            'requirements': {'posts_created': 1},
            'icon': '✏️',
            'color': '#95a5a6',
            'rarity': 'common'
        },
        {
            'name': 'Conversation Starter',
            'description': 'Created your first thread',
            'badge_type': 'achievement',
            'requirements': {'threads_created': 1},
            'icon': '🗣️',
            'color': '#3498db',
            'rarity': 'common'
        },
        {
            'name': 'Active Participant',
            'description': 'Made 10 forum posts',
            'badge_type': 'achievement',
            'requirements': {'posts_created': 10},
            'icon': '🏃',
            'color': '#2ecc71',
            'rarity': 'uncommon'
        },
        {
            'name': 'Helpful Member',
            'description': 'Received 5 helpful votes on your posts',
            'badge_type': 'achievement',
            'requirements': {'helpful_score': 75},  # 15 points per helpful vote
            'icon': '🌟',
            'color': '#f1c40f',
            'rarity': 'uncommon'
        },
        {
            'name': 'Problem Solver',
            'description': 'Had 3 posts marked as solutions',
            'badge_type': 'achievement',
            'requirements': {'solutions_provided': 3},
            'icon': '🧩',
            'color': '#9b59b6',
            'rarity': 'rare'
        },
        {
            'name': 'Community Hero',
            'description': 'Reached 500 reputation points',
            'badge_type': 'milestone',
            'requirements': {'total_score': 500},
            'icon': '🦸',
            'color': '#e74c3c',
            'rarity': 'epic'
        },
        {
            'name': 'Discussion Leader',
            'description': 'Created 10 forum threads',
            'badge_type': 'achievement',
            'requirements': {'threads_created': 10},
            'icon': '👑',
            'color': '#f39c12',
            'rarity': 'rare'
        },
        {
            'name': 'Prolific Poster',
            'description': 'Made 100 forum posts',
            'badge_type': 'milestone',
            'requirements': {'posts_created': 100},
            'icon': '📝',
            'color': '#34495e',
            'rarity': 'epic'
        },
        {
            'name': 'Master Contributor',
            'description': 'Reached 1000 reputation points',
            'badge_type': 'milestone',
            'requirements': {'total_score': 1000},
            'icon': '🏆',
            'color': '#e67e22',
            'rarity': 'legendary'
        },
        {
            'name': 'Forum Legend',
            'description': 'Reached maximum reputation level',
            'badge_type': 'milestone',
            'requirements': {'level': 10},
            'icon': '⭐',
            'color': '#8e44ad',
            'rarity': 'legendary'
        }
    ]
    
    for badge_data in badges:
        existing = UserBadge.query.filter_by(name=badge_data['name']).first()
        if not existing:
            badge = UserBadge(
                name=badge_data['name'],
                description=badge_data['description'],
                badge_type=badge_data['badge_type'],
                requirements=badge_data['requirements'],
                icon=badge_data['icon'],
                color=badge_data['color'],
                rarity=badge_data['rarity']
            )
            db.session.add(badge)
            print(f"Created badge: {badge_data['name']}")
    
    db.session.commit()


def main():
    """Initialize forum data."""
    with app.app_context():
        print("Initializing forum data...")
        
        # Create all tables
        db.create_all()
        
        # Create default categories
        print("\nCreating default categories...")
        create_default_categories()
        
        # Create default badges
        print("\nCreating default badges...")
        create_default_badges()
        
        print("\nForum initialization complete!")


if __name__ == '__main__':
    main()