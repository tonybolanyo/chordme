"""
Music Discovery and Recommendation Service

Provides intelligent music discovery and recommendation features including:
- Personalized song recommendations based on user activity
- Similar songs discovery using audio features
- Artist and genre exploration tools
- Trending songs and popular content discovery
- Collaborative filtering based on community activity
- Content-based filtering using song metadata
"""

from sqlalchemy import func, desc, and_, or_, distinct
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, UTC
from collections import defaultdict, Counter
import logging
import math
from typing import Dict, List, Any, Optional, Tuple, Set

from .models import db, Song, User, Setlist, SetlistSong, SetlistPerformance
from .analytics_service import PerformanceAnalyticsService

logger = logging.getLogger(__name__)


class MusicDiscoveryService:
    """Service for music discovery and recommendation features."""
    
    @staticmethod
    def get_personalized_recommendations(user_id: int, limit: int = 20) -> Dict[str, Any]:
        """
        Get personalized song recommendations based on user activity and preferences.
        
        Args:
            user_id: ID of the user requesting recommendations
            limit: Maximum number of recommendations to return
            
        Returns:
            Dictionary containing personalized recommendations with explanations
        """
        user = User.query.get_or_404(user_id)
        
        # Get user's song history and preferences
        user_songs = MusicDiscoveryService._get_user_song_history(user_id)
        
        if not user_songs:
            # For new users, recommend popular songs
            return MusicDiscoveryService._get_popular_recommendations(user_id, limit)
        
        # Combine content-based and collaborative filtering
        content_recommendations = MusicDiscoveryService._content_based_filtering(
            user_id, user_songs, limit // 2
        )
        
        collaborative_recommendations = MusicDiscoveryService._collaborative_filtering(
            user_id, user_songs, limit // 2
        )
        
        # Merge and deduplicate recommendations
        all_recommendations = content_recommendations + collaborative_recommendations
        seen_ids = set()
        unique_recommendations = []
        
        for rec in all_recommendations:
            if rec['song_id'] not in seen_ids:
                seen_ids.add(rec['song_id'])
                unique_recommendations.append(rec)
        
        # Sort by relevance score and limit
        unique_recommendations.sort(key=lambda x: x['relevance_score'], reverse=True)
        recommendations = unique_recommendations[:limit]
        
        return {
            'user_id': user_id,
            'recommendations': recommendations,
            'recommendation_sources': {
                'content_based': len(content_recommendations),
                'collaborative_filtering': len(collaborative_recommendations)
            },
            'privacy_notice': {
                'data_usage': 'Recommendations based on your song activity and similar users',
                'personalization': 'Uses your performance history and music preferences',
                'explanation': 'Recommendations can be explained and customized in settings'
            },
            'generated_at': datetime.now(UTC).isoformat()
        }
    
    @staticmethod
    def get_similar_songs(song_id: int, user_id: int, limit: int = 10) -> Dict[str, Any]:
        """
        Find similar songs using audio features and metadata.
        
        Args:
            song_id: ID of the reference song
            user_id: ID of the requesting user  
            limit: Maximum number of similar songs to return
            
        Returns:
            Dictionary containing similar songs with similarity explanations
        """
        reference_song = Song.query.get_or_404(song_id)
        
        # Verify user can access reference song
        if not reference_song.can_user_access(user_id):
            raise PermissionError("User does not have access to reference song")
        
        # Find similar songs based on audio features
        similar_songs = MusicDiscoveryService._find_similar_by_features(
            reference_song, user_id, limit
        )
        
        return {
            'reference_song': {
                'id': reference_song.id,
                'title': reference_song.title,
                'artist': reference_song.artist,
                'genre': reference_song.genre,
                'key': reference_song.song_key,
                'tempo': reference_song.tempo,
                'difficulty': reference_song.difficulty
            },
            'similar_songs': similar_songs,
            'similarity_factors': [
                'Musical key and harmony',
                'Tempo and rhythm',
                'Genre and style',
                'Difficulty level',
                'Community preferences'
            ],
            'generated_at': datetime.now(UTC).isoformat()
        }
    
    @staticmethod
    def get_artist_exploration(artist: str, user_id: int, limit: int = 20) -> Dict[str, Any]:
        """
        Explore songs by a specific artist with discovery insights.
        
        Args:
            artist: Name of the artist to explore
            user_id: ID of the requesting user
            limit: Maximum number of songs to return
            
        Returns:
            Dictionary containing artist songs and exploration data
        """
        # Get songs by the artist that user can access
        artist_songs_query = Song.query.filter(
            Song.artist.ilike(f'%{artist}%'),
            Song.is_deleted == False
        )
        
        # Apply access controls
        accessible_songs = []
        for song in artist_songs_query.all():
            if song.can_user_access(user_id):
                accessible_songs.append(song)
        
        # Sort by popularity (view count and favorite count)
        accessible_songs.sort(
            key=lambda s: (s.favorite_count or 0) + (s.view_count or 0),
            reverse=True
        )
        
        songs = accessible_songs[:limit]
        
        # Analyze artist characteristics
        genres = [song.genre for song in songs if song.genre]
        keys = [song.song_key for song in songs if song.song_key]
        difficulties = [song.difficulty for song in songs if song.difficulty]
        
        genre_distribution = Counter(genres)
        key_distribution = Counter(keys)
        difficulty_distribution = Counter(difficulties)
        
        # Get related artists (same genre or similar style)
        related_artists = MusicDiscoveryService._find_related_artists(
            artist, genre_distribution.most_common(1)[0][0] if genre_distribution else None,
            user_id
        )
        
        return {
            'artist': artist,
            'total_songs': len(songs),
            'songs': [song.to_dict() for song in songs],
            'artist_characteristics': {
                'primary_genres': dict(genre_distribution.most_common(3)),
                'common_keys': dict(key_distribution.most_common(3)),
                'difficulty_levels': dict(difficulty_distribution)
            },
            'related_artists': related_artists,
            'generated_at': datetime.now(UTC).isoformat()
        }
    
    @staticmethod
    def get_genre_exploration(genre: str, user_id: int, limit: int = 20) -> Dict[str, Any]:
        """
        Explore songs within a specific genre.
        
        Args:
            genre: Genre to explore
            user_id: ID of the requesting user
            limit: Maximum number of songs to return
            
        Returns:
            Dictionary containing genre songs and characteristics
        """
        # Get songs in the genre that user can access
        genre_songs_query = Song.query.filter(
            Song.genre.ilike(f'%{genre}%'),
            Song.is_deleted == False
        )
        
        # Apply access controls
        accessible_songs = []
        for song in genre_songs_query.all():
            if song.can_user_access(user_id):
                accessible_songs.append(song)
        
        # Sort by popularity and diversity
        accessible_songs.sort(
            key=lambda s: (s.favorite_count or 0) + (s.view_count or 0),
            reverse=True
        )
        
        songs = accessible_songs[:limit]
        
        # Analyze genre characteristics
        artists = [song.artist for song in songs if song.artist]
        keys = [song.song_key for song in songs if song.song_key]
        tempos = [song.tempo for song in songs if song.tempo]
        difficulties = [song.difficulty for song in songs if song.difficulty]
        
        artist_distribution = Counter(artists)
        key_distribution = Counter(keys)
        difficulty_distribution = Counter(difficulties)
        
        # Calculate average tempo
        avg_tempo = sum(tempos) / len(tempos) if tempos else None
        
        return {
            'genre': genre,
            'total_songs': len(songs),
            'songs': [song.to_dict() for song in songs],
            'genre_characteristics': {
                'popular_artists': dict(artist_distribution.most_common(5)),
                'common_keys': dict(key_distribution.most_common(5)),
                'average_tempo': round(avg_tempo) if avg_tempo else None,
                'difficulty_distribution': dict(difficulty_distribution)
            },
            'generated_at': datetime.now(UTC).isoformat()
        }
    
    @staticmethod
    def get_trending_songs(user_id: int, timeframe: str = '7d', limit: int = 20) -> Dict[str, Any]:
        """
        Get trending songs based on community activity.
        
        Args:
            user_id: ID of the requesting user
            timeframe: Time period for trending analysis ('1d', '7d', '30d')
            limit: Maximum number of trending songs to return
            
        Returns:
            Dictionary containing trending songs and analysis
        """
        # Calculate date range
        now = datetime.now(UTC)
        if timeframe == '1d':
            start_date = now - timedelta(days=1)
        elif timeframe == '7d':
            start_date = now - timedelta(days=7)
        elif timeframe == '30d':
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)  # Default to 7 days
        
        # Get song activity in the timeframe
        trending_data = MusicDiscoveryService._calculate_trending_scores(
            start_date, now, user_id, limit
        )
        
        return {
            'timeframe': timeframe,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': now.isoformat()
            },
            'trending_songs': trending_data,
            'trending_factors': [
                'Recent view count increases',
                'New favorites and shares',
                'Performance frequency',
                'Community engagement'
            ],
            'generated_at': now.isoformat()
        }
    
    @staticmethod
    def _get_user_song_history(user_id: int) -> List[Dict[str, Any]]:
        """Get user's song interaction history."""
        # Get user's songs
        user_songs = Song.query.filter_by(user_id=user_id, is_deleted=False).all()
        
        # Get songs from user's setlists
        user_setlists = Setlist.query.filter_by(user_id=user_id).all()
        setlist_songs = []
        for setlist in user_setlists:
            setlist_songs.extend([ss.song for ss in setlist.songs if ss.song and not ss.song.is_deleted])
        
        # Combine and deduplicate
        all_songs = user_songs + setlist_songs
        seen_ids = set()
        unique_songs = []
        
        for song in all_songs:
            if song.id not in seen_ids:
                seen_ids.add(song.id)
                unique_songs.append({
                    'song': song,
                    'interaction_type': 'created' if song.user_id == user_id else 'used_in_setlist',
                    'last_accessed': song.last_accessed
                })
        
        return unique_songs
    
    @staticmethod
    def _content_based_filtering(user_id: int, user_songs: List[Dict], limit: int) -> List[Dict[str, Any]]:
        """Content-based recommendation algorithm."""
        if not user_songs:
            return []
        
        # Analyze user's music preferences
        user_preferences = MusicDiscoveryService._analyze_user_preferences(user_songs)
        
        # Find songs with similar characteristics
        similar_songs = Song.query.filter(
            Song.is_deleted == False,
            Song.user_id != user_id  # Exclude user's own songs
        ).all()
        
        recommendations = []
        user_song_ids = {item['song'].id for item in user_songs}
        
        for song in similar_songs:
            if not song.can_user_access(user_id) or song.id in user_song_ids:
                continue
            
            similarity_score = MusicDiscoveryService._calculate_content_similarity(
                song, user_preferences
            )
            
            if similarity_score > 0.3:  # Minimum similarity threshold
                recommendations.append({
                    'song_id': song.id,
                    'title': song.title,
                    'artist': song.artist,
                    'genre': song.genre,
                    'relevance_score': similarity_score,
                    'explanation': MusicDiscoveryService._generate_content_explanation(
                        song, user_preferences
                    ),
                    'recommendation_type': 'content_based'
                })
        
        # Sort by similarity score and limit
        recommendations.sort(key=lambda x: x['relevance_score'], reverse=True)
        return recommendations[:limit]
    
    @staticmethod
    def _collaborative_filtering(user_id: int, user_songs: List[Dict], limit: int) -> List[Dict[str, Any]]:
        """Collaborative filtering recommendation algorithm."""
        if not user_songs:
            return []
        
        # Find users with similar music taste
        similar_users = MusicDiscoveryService._find_similar_users(user_id, user_songs)
        
        recommendations = []
        user_song_ids = {item['song'].id for item in user_songs}
        
        # Get songs liked by similar users
        for similar_user_id, similarity_score in similar_users:
            similar_user_songs = MusicDiscoveryService._get_user_song_history(similar_user_id)
            
            for song_item in similar_user_songs:
                song = song_item['song']
                if (song.id not in user_song_ids and 
                    song.can_user_access(user_id) and 
                    song.user_id != user_id):
                    
                    relevance_score = similarity_score * 0.8  # Weight by user similarity
                    
                    recommendations.append({
                        'song_id': song.id,
                        'title': song.title,
                        'artist': song.artist,
                        'genre': song.genre,
                        'relevance_score': relevance_score,
                        'explanation': f'Users with similar taste also enjoyed this song',
                        'recommendation_type': 'collaborative'
                    })
        
        # Sort by relevance and limit
        recommendations.sort(key=lambda x: x['relevance_score'], reverse=True)
        return recommendations[:limit]
    
    @staticmethod
    def _find_similar_by_features(reference_song: Song, user_id: int, limit: int) -> List[Dict[str, Any]]:
        """Find songs similar to reference song based on audio features."""
        similar_songs = Song.query.filter(
            Song.is_deleted == False,
            Song.id != reference_song.id
        ).all()
        
        similarities = []
        
        for song in similar_songs:
            if not song.can_user_access(user_id):
                continue
            
            similarity_score = MusicDiscoveryService._calculate_feature_similarity(
                reference_song, song
            )
            
            if similarity_score > 0.4:  # Minimum similarity threshold
                similarities.append({
                    'song_id': song.id,
                    'title': song.title,
                    'artist': song.artist,
                    'genre': song.genre,
                    'similarity_score': similarity_score,
                    'similarity_explanation': MusicDiscoveryService._generate_similarity_explanation(
                        reference_song, song
                    )
                })
        
        # Sort by similarity score and limit
        similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
        return similarities[:limit]
    
    @staticmethod
    def _calculate_feature_similarity(song1: Song, song2: Song) -> float:
        """Calculate similarity between two songs based on features."""
        similarity_score = 0.0
        factors = 0
        
        # Genre similarity (highest weight)
        if song1.genre and song2.genre:
            if song1.genre.lower() == song2.genre.lower():
                similarity_score += 0.4
            factors += 1
        
        # Key similarity
        if song1.song_key and song2.song_key:
            if song1.song_key == song2.song_key:
                similarity_score += 0.3
            factors += 1
        
        # Tempo similarity
        if song1.tempo and song2.tempo:
            tempo_diff = abs(song1.tempo - song2.tempo)
            tempo_similarity = max(0, 1 - tempo_diff / 60)  # Normalize tempo difference
            similarity_score += tempo_similarity * 0.2
            factors += 1
        
        # Difficulty similarity
        if song1.difficulty and song2.difficulty:
            difficulty_levels = {'easy': 1, 'medium': 2, 'hard': 3}
            diff1 = difficulty_levels.get(song1.difficulty, 2)
            diff2 = difficulty_levels.get(song2.difficulty, 2)
            difficulty_similarity = 1 - abs(diff1 - diff2) / 2
            similarity_score += difficulty_similarity * 0.1
            factors += 1
        
        # Normalize by number of factors
        return similarity_score / factors if factors > 0 else 0.0
    
    @staticmethod
    def _analyze_user_preferences(user_songs: List[Dict]) -> Dict[str, Any]:
        """Analyze user's music preferences from their song history."""
        genres = []
        keys = []
        tempos = []
        difficulties = []
        
        for item in user_songs:
            song = item['song']
            if song.genre:
                genres.append(song.genre)
            if song.song_key:
                keys.append(song.song_key)
            if song.tempo:
                tempos.append(song.tempo)
            if song.difficulty:
                difficulties.append(song.difficulty)
        
        return {
            'preferred_genres': Counter(genres),
            'preferred_keys': Counter(keys),
            'average_tempo': sum(tempos) / len(tempos) if tempos else None,
            'preferred_difficulties': Counter(difficulties)
        }
    
    @staticmethod
    def _calculate_content_similarity(song: Song, user_preferences: Dict) -> float:
        """Calculate how well a song matches user preferences."""
        similarity_score = 0.0
        factors = 0
        
        # Genre preference
        if song.genre and user_preferences['preferred_genres']:
            genre_count = user_preferences['preferred_genres'].get(song.genre, 0)
            total_songs = sum(user_preferences['preferred_genres'].values())
            genre_preference = genre_count / total_songs
            similarity_score += genre_preference * 0.4
            factors += 1
        
        # Tempo preference
        if song.tempo and user_preferences['average_tempo']:
            tempo_diff = abs(song.tempo - user_preferences['average_tempo'])
            tempo_similarity = max(0, 1 - tempo_diff / 60)
            similarity_score += tempo_similarity * 0.3
            factors += 1
        
        # Key preference
        if song.song_key and user_preferences['preferred_keys']:
            key_count = user_preferences['preferred_keys'].get(song.song_key, 0)
            total_songs = sum(user_preferences['preferred_keys'].values())
            key_preference = key_count / total_songs
            similarity_score += key_preference * 0.2
            factors += 1
        
        # Difficulty preference
        if song.difficulty and user_preferences['preferred_difficulties']:
            diff_count = user_preferences['preferred_difficulties'].get(song.difficulty, 0)
            total_songs = sum(user_preferences['preferred_difficulties'].values())
            diff_preference = diff_count / total_songs
            similarity_score += diff_preference * 0.1
            factors += 1
        
        return similarity_score / factors if factors > 0 else 0.0
    
    @staticmethod
    def _find_similar_users(user_id: int, user_songs: List[Dict]) -> List[Tuple[int, float]]:
        """Find users with similar music taste."""
        user_song_ids = {item['song'].id for item in user_songs}
        
        # Get all other users and their songs
        other_users = User.query.filter(User.id != user_id).all()
        similar_users = []
        
        for other_user in other_users:
            other_user_songs = MusicDiscoveryService._get_user_song_history(other_user.id)
            other_song_ids = {item['song'].id for item in other_user_songs}
            
            # Calculate Jaccard similarity
            intersection = len(user_song_ids.intersection(other_song_ids))
            union = len(user_song_ids.union(other_song_ids))
            
            if union > 0:
                similarity = intersection / union
                if similarity > 0.1:  # Minimum similarity threshold
                    similar_users.append((other_user.id, similarity))
        
        # Sort by similarity
        similar_users.sort(key=lambda x: x[1], reverse=True)
        return similar_users[:10]  # Return top 10 similar users
    
    @staticmethod
    def _get_popular_recommendations(user_id: int, limit: int) -> Dict[str, Any]:
        """Get popular song recommendations for new users."""
        # Get most popular songs (by view count and favorite count)
        popular_songs = Song.query.filter(
            Song.is_deleted == False
        ).order_by(
            desc(Song.favorite_count + Song.view_count)
        ).limit(limit).all()
        
        recommendations = []
        for song in popular_songs:
            if song.can_user_access(user_id):
                recommendations.append({
                    'song_id': song.id,
                    'title': song.title,
                    'artist': song.artist,
                    'genre': song.genre,
                    'relevance_score': 0.8,  # High score for popular songs
                    'explanation': 'Popular among the community',
                    'recommendation_type': 'popular'
                })
        
        return {
            'user_id': user_id,
            'recommendations': recommendations,
            'recommendation_sources': {
                'popular_songs': len(recommendations)
            },
            'privacy_notice': {
                'data_usage': 'Recommendations based on community popularity',
                'personalization': 'Generic recommendations for new users',
                'explanation': 'No personal data used for these recommendations'
            },
            'generated_at': datetime.now(UTC).isoformat()
        }
    
    @staticmethod
    def _calculate_trending_scores(start_date: datetime, end_date: datetime, 
                                  user_id: int, limit: int) -> List[Dict[str, Any]]:
        """Calculate trending scores for songs in the given timeframe."""
        # For now, use view count and favorite count as trending indicators
        # In a real implementation, this would track activity changes over time
        
        trending_songs = Song.query.filter(
            Song.is_deleted == False,
            Song.updated_at >= start_date  # Songs with recent activity
        ).order_by(
            desc(Song.view_count + Song.favorite_count)
        ).limit(limit * 2).all()  # Get more than needed for filtering
        
        trending_data = []
        for song in trending_songs:
            if song.can_user_access(user_id):
                # Calculate simple trending score
                days_since_update = (end_date - song.updated_at).days + 1
                trending_score = (song.view_count + song.favorite_count) / days_since_update
                
                trending_data.append({
                    'song_id': song.id,
                    'title': song.title,
                    'artist': song.artist,
                    'genre': song.genre,
                    'trending_score': trending_score,
                    'view_count': song.view_count,
                    'favorite_count': song.favorite_count,
                    'trend_explanation': 'Recent community activity and engagement'
                })
        
        # Sort by trending score
        trending_data.sort(key=lambda x: x['trending_score'], reverse=True)
        return trending_data[:limit]
    
    @staticmethod
    def _find_related_artists(artist: str, primary_genre: Optional[str], user_id: int) -> List[str]:
        """Find artists related to the given artist."""
        related_query = Song.query.filter(
            Song.artist != artist,
            Song.is_deleted == False
        )
        
        if primary_genre:
            related_query = related_query.filter(Song.genre.ilike(f'%{primary_genre}%'))
        
        related_songs = related_query.all()
        
        # Filter for accessible songs and get unique artists
        related_artists = set()
        for song in related_songs:
            if song.can_user_access(user_id) and song.artist:
                related_artists.add(song.artist)
        
        return list(related_artists)[:10]  # Return up to 10 related artists
    
    @staticmethod
    def _generate_content_explanation(song: Song, user_preferences: Dict) -> str:
        """Generate explanation for content-based recommendation."""
        explanations = []
        
        if song.genre and user_preferences['preferred_genres']:
            genre_count = user_preferences['preferred_genres'].get(song.genre, 0)
            if genre_count > 0:
                explanations.append(f"matches your {song.genre} preference")
        
        if song.song_key and user_preferences['preferred_keys']:
            key_count = user_preferences['preferred_keys'].get(song.song_key, 0)
            if key_count > 0:
                explanations.append(f"in your preferred key of {song.song_key}")
        
        if song.difficulty and user_preferences['preferred_difficulties']:
            diff_count = user_preferences['preferred_difficulties'].get(song.difficulty, 0)
            if diff_count > 0:
                explanations.append(f"matches your {song.difficulty} difficulty level")
        
        if explanations:
            return "Recommended because it " + " and ".join(explanations)
        else:
            return "Similar to songs in your collection"
    
    @staticmethod
    def _generate_similarity_explanation(song1: Song, song2: Song) -> str:
        """Generate explanation for song similarity."""
        similarities = []
        
        if song1.genre and song2.genre and song1.genre.lower() == song2.genre.lower():
            similarities.append(f"same genre ({song1.genre})")
        
        if song1.song_key and song2.song_key and song1.song_key == song2.song_key:
            similarities.append(f"same key ({song1.song_key})")
        
        if song1.tempo and song2.tempo and abs(song1.tempo - song2.tempo) <= 10:
            similarities.append("similar tempo")
        
        if song1.difficulty and song2.difficulty and song1.difficulty == song2.difficulty:
            similarities.append(f"same difficulty ({song1.difficulty})")
        
        if similarities:
            return "Similar due to " + " and ".join(similarities)
        else:
            return "Musical characteristics match"