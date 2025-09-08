---
layout: default
lang: en
title: Music Discovery and Recommendations User Guide
---

# Music Discovery and Recommendations User Guide

The ChordMe Music Discovery system helps you find new songs based on your musical preferences and activity. This intelligent recommendation engine uses both your personal music library and community data to suggest songs you'll enjoy.

## Overview

The discovery system provides several ways to explore music:
- **Personalized Recommendations**: Songs tailored to your taste
- **Similar Songs**: Find songs that match a specific song's characteristics  
- **Artist Exploration**: Discover more songs from artists you like
- **Genre Exploration**: Explore songs within specific musical genres
- **Trending Songs**: See what's popular in the community

## Getting Started

### Accessing Music Discovery

1. Navigate to the **Discovery** section in the main menu
2. You'll see tabs for **For You** (personalized) and **Trending** content
3. Use the timeframe selector for trending songs (24h, 7 days, 30 days)

### Understanding Recommendations

Each recommendation includes:
- **Song title and artist**
- **Match percentage**: How well it fits your preferences (0-100%)
- **Explanation**: Why this song was recommended to you
- **Genre and key information**

## Features

### Personalized Recommendations

**How it works:**
- Analyzes your song collection and setlist activity
- Finds patterns in your music preferences (genres, keys, tempo, difficulty)
- Uses collaborative filtering to find users with similar taste
- Combines multiple algorithms for better accuracy

**Recommendation types:**
- **Content-based**: "Matches your rock preferences and C major key usage"
- **Collaborative**: "Users with similar taste also enjoyed this song"
- **Popular**: "Popular among the community" (for new users)

### Similar Songs Discovery

**To find similar songs:**
1. Go to any song page
2. Click "Find Similar Songs" 
3. View songs with similar characteristics

**Similarity factors:**
- Musical key and harmony
- Tempo and rhythm patterns
- Genre and musical style
- Difficulty level
- Community listening patterns

### Artist and Genre Exploration

**Artist Exploration:**
- View all accessible songs by an artist
- See artist characteristics (primary genres, common keys, difficulty levels)
- Discover related artists in similar styles

**Genre Exploration:**
- Browse songs within specific genres
- View genre characteristics (popular artists, common keys, average tempo)
- Understand the genre's difficulty distribution

### Trending Analysis

**Trending songs show:**
- Recent community activity
- Rising popularity indicators
- View and favorite count trends
- Community engagement metrics

**Timeframe options:**
- **24 hours**: Latest trending songs
- **7 days**: Weekly trending (default)
- **30 days**: Monthly popular content

## Privacy and Personalization

### Privacy Controls

Access your discovery preferences through:
1. **Settings** → **Privacy** → **Music Discovery**
2. Or click the privacy notice in any discovery section

**Privacy levels:**
- **Private**: No personalization, generic recommendations only
- **Anonymous**: Anonymous data used for improved recommendations (default)
- **Public**: Activity visible for community-based recommendations

### Personalization Settings

**Enable/disable features:**
- ✅ **Personalized Recommendations**: Tailored song suggestions
- ✅ **Collaborative Filtering**: Recommendations based on similar users
- ⚪ **Trending Notifications**: Alerts for trending songs (optional)

**Preferred Genres:**
- Set your favorite music genres
- Influences content-based recommendations
- Can be updated anytime

### Data Usage Transparency

The system uses:
- **Your song collection**: Titles, artists, genres, keys you've added
- **Setlist activity**: Songs you've organized into setlists
- **Access patterns**: Songs you view or favorite (anonymized)
- **Community trends**: Popular songs and engagement (aggregated)

**What's NOT used:**
- Personal information (name, email)
- Private song content
- Individual listening timestamps
- Location or device information

## Tips for Better Recommendations

### For New Users
1. **Add diverse songs** to your collection
2. **Create setlists** with songs you enjoy
3. **Mark favorites** to improve preferences
4. **Explore different genres** to expand recommendations

### For Existing Users
1. **Update privacy preferences** to get better personalization
2. **Try different recommendation explanations** to understand patterns
3. **Explore recommended artists and genres**
4. **Use similar songs** to discover variations of favorites

### Improving Accuracy
- **Rate or favorite** songs you like
- **Add songs from recommendations** to your collection
- **Update preferred genres** in settings
- **Use artist/genre exploration** to refine taste profile

## Understanding Recommendation Explanations

### Content-Based Explanations
- "Matches your jazz preferences and F major key usage"
- "Similar tempo and difficulty to songs in your collection"
- "Recommended because it matches your medium difficulty level"

### Collaborative Explanations
- "Users with similar taste also enjoyed this song"
- "Popular among users who like [your preferred genres]"
- "Recommended by the community with similar music libraries"

### Trending Explanations
- "Recent community activity and engagement"
- "Rising popularity in the last [timeframe]"
- "Increased view count and favorites"

## Troubleshooting

### No Recommendations Showing
**Possible causes:**
- New account with no music activity
- Very restrictive privacy settings
- Limited song database

**Solutions:**
1. Add more songs to your collection
2. Create setlists with your favorite songs
3. Check privacy settings (ensure not set to "Private")
4. Try genre exploration to discover new music

### Poor Recommendation Quality
**To improve recommendations:**
1. **Review privacy settings**: Enable personalization features
2. **Update preferred genres**: Ensure they match your taste
3. **Add variety**: Include songs from different styles you enjoy
4. **Use explanations**: Understand why songs are recommended

### Similar Songs Not Found
**This might happen when:**
- Reference song has limited metadata
- Very unique or uncommon musical characteristics
- Privacy restrictions limit accessible songs

**Try instead:**
- Artist exploration for the same artist
- Genre exploration for the song's genre
- Manual search with similar characteristics

### Trending Songs Seem Outdated
**Check:**
- Selected timeframe (24h vs 7d vs 30d)
- Community activity levels
- Your access permissions to trending content

## Best Practices

### Building Your Music Profile
1. **Curate thoughtfully**: Add songs you genuinely enjoy
2. **Be diverse**: Include various genres, keys, and difficulties
3. **Stay organized**: Use setlists to group related songs
4. **Update regularly**: Keep adding new discoveries

### Privacy Management
1. **Review settings periodically**: Ensure they match your comfort level
2. **Understand trade-offs**: More data sharing = better personalization
3. **Use anonymous mode**: Good balance of privacy and recommendations
4. **Export your data**: Keep backups of your music preferences

### Discovery Workflow
1. **Start with "For You"**: Check personalized recommendations
2. **Explore trending**: See what's popular in the community
3. **Use similar songs**: When you find something you like
4. **Deep dive artists/genres**: Explore styles that interest you
5. **Update preferences**: Based on what you discover

## API Integration

For developers integrating with the discovery system:

### Available Endpoints
- `GET /api/v1/analytics/discovery/recommendations` - Personalized recommendations
- `GET /api/v1/analytics/discovery/similar/{song_id}` - Similar songs
- `GET /api/v1/analytics/discovery/artists/{artist}/explore` - Artist exploration
- `GET /api/v1/analytics/discovery/genres/{genre}/explore` - Genre exploration
- `GET /api/v1/analytics/discovery/trending` - Trending songs
- `GET/PUT /api/v1/analytics/discovery/preferences` - Privacy preferences

### Rate Limits
- 30 requests per minute per endpoint
- Automatic rate limiting with clear error messages
- Contact support for higher limits if needed

### Authentication
- All endpoints require valid JWT authentication
- User can only access songs they have permission to view
- Privacy settings are enforced automatically

## Support

Need help with music discovery?

- **Check this guide**: Most common questions are answered here
- **Community Forum**: Ask other users for tips and recommendations
- **Support Email**: Contact support for technical issues
- **Privacy Questions**: Review our privacy policy for data handling details

## Feedback

Help us improve the music discovery system:

- **Rate recommendations**: Mark helpful/unhelpful suggestions
- **Report issues**: Let us know about poor recommendations
- **Suggest features**: Ideas for new discovery capabilities
- **Share success stories**: Tell us about great music you discovered!

---

*Last updated: September 2025*
*For technical details, see the [API Documentation](api-reference.md)*