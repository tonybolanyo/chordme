---
layout: default
lang: en
title: Growth and Engagement Features Guide
---

# Growth and Engagement Features Guide

ChordMe includes comprehensive growth and engagement features designed to encourage platform adoption, improve user retention, and create a thriving community of musicians.

## Overview

The growth and engagement system includes:

- **Referral Program**: Reward users for inviting friends
- **Achievement System**: Progressive badge unlocks and reputation tracking
- **Daily Challenges**: Practice goals and skill-building tasks
- **Social Sharing**: Share achievements and milestones
- **Onboarding Optimization**: Guided user experience with progress tracking
- **A/B Testing Framework**: Optimize growth experiments
- **Email Marketing Integration**: Engagement campaigns

## Referral Program

### How It Works

1. **Generate Referral Code**: Users create unique referral codes
2. **Share with Friends**: Share codes via social media, email, or direct links
3. **Track Referrals**: System tracks when referred users sign up
4. **Earn Rewards**: Both referrer and referred user receive points

### API Endpoints

```javascript
// Generate a new referral code
POST /api/v1/growth/referrals/generate
{
  "campaign": "holiday-2024",
  "source": "email"
}

// Track referral before signup
POST /api/v1/growth/referrals/track
{
  "referral_code": "ABC123XY",
  "email": "friend@example.com"
}

// Complete referral after signup
POST /api/v1/growth/referrals/complete
{
  "referral_code": "ABC123XY"
}

// Get referral statistics
GET /api/v1/growth/referrals/stats
```

### Referral Rewards

- **Referrer Reward**: 100 points per successful referral
- **Referred User Reward**: 50 points for signing up
- **Expiry Period**: Referral codes expire after 30 days
- **Tracking**: Complete attribution from share to signup

## Achievement System

### Badge Categories

#### Common Badges
- **First Post**: Made your first forum post
- **Song Creator**: Created your first song
- **Practice Starter**: Completed first practice session

#### Uncommon Badges
- **Active Musician**: Created 5 songs
- **Practice Enthusiast**: 10 practice sessions completed
- **Community Member**: Made 10 forum posts

#### Rare Badges
- **Songwriter**: Created 25 songs
- **Practice Master**: 50 practice sessions completed
- **Helpful Member**: Received 25 helpful votes

#### Epic Badges
- **Prolific Creator**: Created 100 songs
- **Practice Legend**: 200 practice sessions completed
- **Community Leader**: Reached 500 reputation points

#### Legendary Badges
- **ChordMe Master**: Reached maximum reputation level
- **Ultimate Musician**: Completed all available challenges

### Reputation System

Users earn reputation points through various activities:

- **Song Creation**: 5 points per song
- **Practice Sessions**: 2 points per session
- **Forum Participation**: 1-10 points based on activity
- **Challenge Completion**: 10-50 points per challenge
- **Referral Success**: 100 points per referral

### API Endpoints

```javascript
// Get achievement progress
GET /api/v1/growth/achievements/progress

// Response includes:
{
  "reputation": {
    "total_score": 250,
    "level": 4,
    "level_name": "Regular",
    "badges_earned": [1, 5, 12]
  },
  "earned_badges": [...],
  "available_badges": [...],
  "progress_to_next_level": 65.5
}
```

## Daily Challenges

### Challenge Types

1. **Practice Time**: Practice for specific duration
2. **Accuracy**: Achieve practice accuracy targets
3. **New Song**: Create or learn new songs
4. **Sharing**: Share content with the community
5. **Streak**: Maintain consecutive days of activity
6. **Mastery**: Complete advanced skill challenges

### Challenge Difficulty

- **Easy**: 5-10 points reward, simple tasks
- **Medium**: 10-25 points reward, moderate effort
- **Hard**: 25-50 points reward, challenging goals

### API Endpoints

```javascript
// Get today's challenges
GET /api/v1/growth/challenges/daily

// Get challenges for specific date
GET /api/v1/growth/challenges/daily?date=2024-01-15

// Update challenge progress
POST /api/v1/growth/challenges/{challengeId}/progress
{
  "value": 30  // New progress value
}
```

## Onboarding Optimization

### Onboarding Steps

1. **Profile Setup**: Complete user profile information
2. **First Song**: Create first song using ChordPro editor
3. **Song Save**: Save and organize first song
4. **Tutorial**: Complete interactive tutorial
5. **First Chord**: Learn first chord or chord progression
6. **Practice Session**: Complete first practice session
7. **Social Interaction**: Engage with community features

### Progress Tracking

The system tracks completion percentage and celebrates milestones:

- **First Day**: Complete initial setup
- **First Week**: Stay active for 7 days
- **Streak Milestones**: Maintain 3, 7, 14, 30-day streaks
- **Onboarding Complete**: Finish all onboarding steps

### API Endpoints

```javascript
// Get onboarding progress
GET /api/v1/growth/onboarding/progress

// Complete onboarding step
POST /api/v1/growth/onboarding/complete-step
{
  "step": "first_song_created"
}
```

## A/B Testing Framework

### Experiment Types

- **A/B Tests**: Compare two variants
- **Multivariate Tests**: Test multiple variables
- **Feature Flags**: Gradual feature rollouts

### Experiment Configuration

```javascript
{
  "name": "new-onboarding-flow",
  "variants": ["control", "guided_tour", "video_intro"],
  "traffic_allocation": {
    "control": 33,
    "guided_tour": 33,
    "video_intro": 34
  },
  "success_criteria": {
    "primary_metric": "onboarding_completion",
    "min_improvement": 5.0
  }
}
```

### API Endpoints

```javascript
// Get experiment assignment
GET /api/v1/growth/experiments/{experimentName}/assignment

// Response includes variant and feature flags
{
  "experiment": "new-onboarding-flow",
  "variant": "guided_tour",
  "feature_flags": {
    "show_guided_tour": true,
    "tour_style": "spotlight"
  }
}
```

## Social Sharing Integration

### Shareable Content

- **Achievement Badges**: Share earned badges on social media
- **Milestone Celebrations**: Share onboarding milestones
- **Challenge Completions**: Share daily challenge successes
- **Referral Invitations**: Share referral codes and links

### Supported Platforms

- **Twitter**: Achievement announcements and referral sharing
- **Facebook**: Milestone celebrations and community invites
- **LinkedIn**: Professional music accomplishments

### Usage Example

```javascript
import { growthService } from './services/growthService';

// Share achievement on Twitter
growthService.shareAchievement(badge, 'twitter');

// Generate and share referral link
const link = growthService.generateReferralLink(referralCode);
```

## Frontend Integration

### React Components

```javascript
import { 
  DailyChallenges, 
  ReferralProgram, 
  AchievementProgress 
} from './components/Growth';

// Display daily challenges
<DailyChallenges className="mb-6" />

// Show referral program
<ReferralProgram className="mb-6" />

// Display achievement progress
<AchievementProgress className="mb-6" />
```

### Growth Service Usage

```javascript
import { growthService } from './services/growthService';

// Check for referral in URL
const referralCode = growthService.extractReferralFromUrl();
if (referralCode) {
  await growthService.trackReferral(referralCode, userEmail);
}

// Complete onboarding step
await growthService.completeOnboardingStep('first_song_created');

// Update challenge progress
await growthService.updateChallengeProgress(challengeId, newValue);
```

## Analytics and Metrics

### Key Metrics Tracked

- **Referral Conversion Rate**: Percentage of referrals that sign up
- **Challenge Completion Rate**: Daily challenge engagement
- **Onboarding Funnel**: Step-by-step completion rates
- **Retention Improvement**: Impact on user retention
- **Engagement Increase**: Active user growth

### Success Indicators

- **User Acquisition**: 25% increase from referrals
- **Retention**: 40% improvement in 30-day retention
- **Engagement**: 60% increase in daily active users
- **Community Growth**: 200% increase in forum participation

## Best Practices

### For Developers

1. **Gradual Rollout**: Use A/B testing for new features
2. **Performance Monitoring**: Track API response times
3. **Error Handling**: Graceful degradation for growth features
4. **Analytics Integration**: Comprehensive event tracking

### For Users

1. **Share Authentically**: Personal referral messages work best
2. **Set Achievable Goals**: Start with easy daily challenges
3. **Celebrate Milestones**: Share achievements with the community
4. **Stay Consistent**: Regular engagement improves experience

## Troubleshooting

### Common Issues

1. **Referral Not Tracking**: Ensure cookies are enabled
2. **Challenge Not Updating**: Check network connectivity
3. **Badges Not Appearing**: Clear browser cache
4. **Sharing Failures**: Verify social media permissions

### Error Codes

- `REFERRAL_EXPIRED`: Referral code has expired
- `CHALLENGE_NOT_FOUND`: Invalid challenge ID
- `EXPERIMENT_INACTIVE`: A/B test is not active
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

## API Rate Limits

- **Referral Generation**: 5 requests per hour
- **Progress Updates**: 30 requests per minute
- **Stats Retrieval**: 60 requests per hour
- **Experiment Assignment**: 100 requests per hour

---

**Cambiar idioma:** **English** | [Español](growth-features-guide-es.md)