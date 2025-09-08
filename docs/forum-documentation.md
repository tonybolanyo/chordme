# ChordMe Community Forum Documentation

## Overview

The ChordMe Community Forum is a comprehensive discussion system that enables users to engage in discussions, ask questions, share knowledge, and build community around music and the ChordMe platform.

## Features

### Core Forum Features
- **Threaded Discussions**: Support for reply chains and nested conversations
- **Category System**: Organized discussions by topic (General, Q&A, Feature Requests, etc.)
- **Thread Types**: Different types of discussions (Discussion, Question, Announcement, Feature Request)
- **Voting System**: Upvote/downvote threads and posts, mark posts as helpful
- **User Reputation**: Comprehensive reputation system with levels and progression
- **Badge System**: Achievement tracking with 10+ badges and rarity levels
- **Search Functionality**: Full-text search across threads and posts
- **Moderation Tools**: Thread locking, pinning, and moderation action logging
- **Mobile Responsive**: Optimized for all device sizes

### Reputation System

Users earn reputation points through various activities:
- **Creating Threads**: +5 points
- **Creating Posts**: +2 points
- **Receiving Upvotes on Threads**: +10 points
- **Receiving Upvotes on Posts**: +5 points
- **Receiving Helpful Votes**: +15 points
- **Having Posts Marked as Solutions**: Bonus points

#### Reputation Levels
1. **Newcomer** (0-9 points): New to the community
2. **Participant** (10-49 points): Starting to engage
3. **Member** (50-99 points): Regular participant
4. **Regular** (100-249 points): Active community member
5. **Contributor** (250-499 points): Valued contributor
6. **Skilled** (500-999 points): Knowledgeable member
7. **Experienced** (1000-2499 points): Highly experienced
8. **Advanced** (2500-4999 points): Advanced user
9. **Master** (5000-9999 points): Master level contributor
10. **Expert** (10000+ points): Expert level community leader

### Badge System

The forum includes a comprehensive achievement system with badges of different rarities:

#### Common Badges
- **First Post**: Made your first forum post
- **Conversation Starter**: Created your first thread

#### Uncommon Badges
- **Active Participant**: Made 10 forum posts
- **Helpful Member**: Received 5 helpful votes

#### Rare Badges
- **Problem Solver**: Had 3 posts marked as solutions
- **Discussion Leader**: Created 10 forum threads

#### Epic Badges
- **Community Hero**: Reached 500 reputation points
- **Prolific Poster**: Made 100 forum posts

#### Legendary Badges
- **Master Contributor**: Reached 1000 reputation points
- **Forum Legend**: Reached maximum reputation level

## API Endpoints

### Categories
- `GET /api/v1/forum/categories` - List all categories
- `POST /api/v1/forum/categories` - Create new category (admin)

### Threads
- `GET /api/v1/forum/categories/{slug}/threads` - List threads in category
- `POST /api/v1/forum/threads` - Create new thread
- `GET /api/v1/forum/threads/{id}` - Get thread with posts

### Posts
- `POST /api/v1/forum/threads/{id}/posts` - Create new post

### Voting
- `POST /api/v1/forum/threads/{id}/vote` - Vote on thread
- `POST /api/v1/forum/posts/{id}/vote` - Vote on post

### User Data
- `GET /api/v1/forum/users/{id}/reputation` - Get user reputation
- `GET /api/v1/forum/badges` - List available badges

### Search & Moderation
- `GET /api/v1/forum/search` - Search forum content
- `POST /api/v1/forum/threads/{id}/lock` - Lock thread (moderator)

## Frontend Components

### Main Components
- **ForumHome**: Category overview and navigation
- **ThreadList**: Thread browsing with filtering and sorting
- **VotingButtons**: Interactive voting system
- **ForumNavigation**: Sidebar navigation with user info

### Usage Example
```jsx
import { ForumHome, ForumNavigation } from '../components/Forum';

function ForumPage() {
  return (
    <div className="forum-page">
      <ForumNavigation currentPath="/forum" />
      <ForumHome />
    </div>
  );
}
```

## Database Schema

### Core Models
- **ForumCategory**: Forum categories with hierarchy support
- **ForumThread**: Discussion threads with metadata and status
- **ForumPost**: Individual posts with threading support
- **ForumVote**: Voting records for threads and posts
- **UserReputation**: User reputation tracking and levels
- **UserBadge**: Available badges and requirements
- **ForumModeration**: Moderation actions and history

## Setup and Initialization

### 1. Database Migration
Ensure all forum models are created in your database:
```python
from chordme import db
db.create_all()
```

### 2. Initialize Forum Data
Run the initialization script to create default categories and badges:
```bash
cd backend
python init_forum_data.py
```

### 3. Configure Permissions
Update your authentication system to include forum permissions and moderator roles.

## Mobile Responsiveness

The forum is fully responsive and optimized for mobile devices:
- Touch-friendly interface elements
- Optimized layouts for small screens
- Accessible navigation and interactions
- Fast loading and minimal data usage

## Security Features

- **Authentication Required**: Most actions require user authentication
- **Input Sanitization**: All user input is sanitized to prevent XSS
- **Rate Limiting**: API endpoints have appropriate rate limits
- **Permission Checks**: Proper authorization for moderation actions
- **CSRF Protection**: All forms include CSRF protection

## Future Enhancements

### Planned Features
- Real-time notifications for forum activity
- Advanced moderation interface
- Email digests for forum activity
- Integration with user profiles
- Advanced search filters
- Thread subscription system
- Rich text editor with media support
- User mention system (@username)

### Internationalization
- Multi-language support for forum interface
- Localized category names and descriptions
- Translated badge descriptions
- Cultural considerations for moderation

## Community Guidelines

The forum promotes healthy community engagement through:
- Clear community guidelines and code of conduct
- Progressive moderation enforcement
- User education and guidance
- Transparent appeals process
- Community feedback integration

## Troubleshooting

### Common Issues
1. **Forum not loading**: Check database connection and migration status
2. **Voting not working**: Verify user authentication and permissions
3. **Search returning no results**: Ensure database indexing is configured
4. **Mobile display issues**: Check CSS media queries and responsive design

### Support
For technical issues or questions about the forum system:
- Check the documentation
- Review the test files for usage examples
- Examine the API endpoint implementations
- Contact the development team

---

*This documentation covers the initial implementation of the ChordMe Community Forum. Additional features and updates will be documented as they are developed.*