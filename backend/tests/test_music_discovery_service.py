"""
Test Music Discovery and Recommendation Service

Tests for the music discovery and recommendation functionality including:
- Personalized recommendations
- Similar songs discovery
- Artist and genre exploration
- Trending songs analysis
- Privacy compliance
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, UTC, timedelta

from chordme import app, db
from chordme.models import User, Song, Setlist, SetlistSong
from chordme.music_discovery_service import MusicDiscoveryService


class TestMusicDiscoveryService:
    """Test suite for MusicDiscoveryService."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with app.test_client() as client:
            with app.app_context():
                db.create_all()
                yield client
                db.drop_all()
    
    @pytest.fixture
    def sample_data(self):
        """Create sample test data."""
        # Create test users
        user1 = User(email='user1@test.com', password='password123')
        user2 = User(email='user2@test.com', password='password123')
        db.session.add_all([user1, user2])
        db.session.commit()
        
        # Create test songs with varied characteristics
        song1 = Song(
            title='Rock Song 1',
            artist='Rock Artist',
            user_id=user1.id,
            content='[C]Rock song content here',
            genre='Rock',
            song_key='C',
            tempo=120,
            difficulty='medium'
        )
        song1.view_count = 100
        song1.favorite_count = 20
        
        song2 = Song(
            title='Rock Song 2',
            artist='Rock Artist',
            user_id=user1.id,
            content='[G]Another rock song',
            genre='Rock',
            song_key='G',
            tempo=130,
            difficulty='medium'
        )
        song2.view_count = 80
        song2.favorite_count = 15
        
        song3 = Song(
            title='Jazz Song 1',
            artist='Jazz Artist',
            user_id=user2.id,
            content='[F]Jazz song content',
            genre='Jazz',
            song_key='F',
            tempo=90,
            difficulty='hard',
            share_settings='public'
        )
        song3.view_count = 50
        song3.favorite_count = 10
        
        song4 = Song(
            title='Pop Song 1',
            artist='Pop Artist',
            user_id=user2.id,
            content='[C]Pop song content',
            genre='Pop',
            song_key='C',
            tempo=125,
            difficulty='easy',
            share_settings='public'
        )
        song4.view_count = 200
        song4.favorite_count = 40
        
        song5 = Song(
            title='Blues Song 1',
            artist='Blues Artist',
            user_id=user1.id,
            content='[A]Blues song content',
            genre='Blues',
            song_key='A',
            tempo=80,
            difficulty='medium'
        )
        song5.view_count = 60
        song5.favorite_count = 12
        
        songs = [song1, song2, song3, song4, song5]
        
        db.session.add_all(songs)
        db.session.commit()
        
        # Create a setlist for user1
        setlist = Setlist(name='Test Setlist', user_id=user1.id)
        db.session.add(setlist)
        db.session.commit()
        
        # Add songs to setlist
        setlist_song = SetlistSong(setlist_id=setlist.id, song_id=songs[0].id, position=1)
        db.session.add(setlist_song)
        db.session.commit()
        
        return {
            'users': [user1, user2],
            'songs': songs,
            'setlist': setlist
        }
    
    def test_get_personalized_recommendations_new_user(self, client, sample_data):
        """Test recommendations for a new user with no history."""
        with app.app_context():
            # Create a new user with no songs
            new_user = User(email='newuser@test.com', password='password123')
            db.session.add(new_user)
            db.session.commit()
            
            recommendations = MusicDiscoveryService.get_personalized_recommendations(
                new_user.id, limit=5
            )
            
            assert 'user_id' in recommendations
            assert 'recommendations' in recommendations
            assert recommendations['user_id'] == new_user.id
            
            # New users should get popular recommendations
            assert 'recommendation_sources' in recommendations
            assert 'privacy_notice' in recommendations
    
    def test_get_personalized_recommendations_existing_user(self, client, sample_data):
        """Test recommendations for a user with song history."""
        with app.app_context():
            user = sample_data['users'][0]
            
            recommendations = MusicDiscoveryService.get_personalized_recommendations(
                user.id, limit=10
            )
            
            assert 'user_id' in recommendations
            assert 'recommendations' in recommendations
            assert recommendations['user_id'] == user.id
            
            # Should have both content-based and collaborative recommendations
            assert 'recommendation_sources' in recommendations
            sources = recommendations['recommendation_sources']
            assert isinstance(sources.get('content_based', 0), int)
            assert isinstance(sources.get('collaborative_filtering', 0), int)
            
            # Should include privacy notice
            assert 'privacy_notice' in recommendations
            privacy = recommendations['privacy_notice']
            assert 'data_usage' in privacy
            assert 'explanation' in privacy
    
    def test_get_similar_songs(self, client, sample_data):
        """Test finding similar songs based on audio features."""
        with app.app_context():
            user = sample_data['users'][0]
            reference_song = sample_data['songs'][0]  # Rock Song 1
            
            similar_songs = MusicDiscoveryService.get_similar_songs(
                reference_song.id, user.id, limit=5
            )
            
            assert 'reference_song' in similar_songs
            assert 'similar_songs' in similar_songs
            assert 'similarity_factors' in similar_songs
            
            ref_song = similar_songs['reference_song']
            assert ref_song['id'] == reference_song.id
            assert ref_song['title'] == reference_song.title
            assert ref_song['genre'] == reference_song.genre
            
            # Should list similarity factors
            factors = similar_songs['similarity_factors']
            assert isinstance(factors, list)
            assert len(factors) > 0
    
    def test_get_similar_songs_permission_error(self, client, sample_data):
        """Test similar songs with permission denied."""
        with app.app_context():
            user = sample_data['users'][1]
            private_song = sample_data['songs'][0]  # User1's private song
            
            with pytest.raises(PermissionError):
                MusicDiscoveryService.get_similar_songs(
                    private_song.id, user.id, limit=5
                )
    
    def test_get_artist_exploration(self, client, sample_data):
        """Test artist exploration functionality."""
        with app.app_context():
            user = sample_data['users'][0]
            artist_name = 'Rock Artist'
            
            exploration = MusicDiscoveryService.get_artist_exploration(
                artist_name, user.id, limit=10
            )
            
            assert 'artist' in exploration
            assert 'total_songs' in exploration
            assert 'songs' in exploration
            assert 'artist_characteristics' in exploration
            assert 'related_artists' in exploration
            
            assert exploration['artist'] == artist_name
            assert exploration['total_songs'] >= 0
            
            characteristics = exploration['artist_characteristics']
            assert 'primary_genres' in characteristics
            assert 'common_keys' in characteristics
            assert 'difficulty_levels' in characteristics
    
    def test_get_genre_exploration(self, client, sample_data):
        """Test genre exploration functionality."""
        with app.app_context():
            user = sample_data['users'][0]
            genre = 'Rock'
            
            exploration = MusicDiscoveryService.get_genre_exploration(
                genre, user.id, limit=10
            )
            
            assert 'genre' in exploration
            assert 'total_songs' in exploration
            assert 'songs' in exploration
            assert 'genre_characteristics' in exploration
            
            assert exploration['genre'] == genre
            assert exploration['total_songs'] >= 0
            
            characteristics = exploration['genre_characteristics']
            assert 'popular_artists' in characteristics
            assert 'common_keys' in characteristics
            assert 'difficulty_distribution' in characteristics
    
    def test_get_trending_songs(self, client, sample_data):
        """Test trending songs analysis."""
        with app.app_context():
            user = sample_data['users'][0]
            
            trending = MusicDiscoveryService.get_trending_songs(
                user.id, timeframe='7d', limit=10
            )
            
            assert 'timeframe' in trending
            assert 'period' in trending
            assert 'trending_songs' in trending
            assert 'trending_factors' in trending
            
            assert trending['timeframe'] == '7d'
            
            period = trending['period']
            assert 'start_date' in period
            assert 'end_date' in period
            
            # Should list trending factors
            factors = trending['trending_factors']
            assert isinstance(factors, list)
            assert len(factors) > 0
    
    def test_content_based_filtering(self, client, sample_data):
        """Test content-based recommendation algorithm."""
        with app.app_context():
            user = sample_data['users'][0]
            user_songs = MusicDiscoveryService._get_user_song_history(user.id)
            
            recommendations = MusicDiscoveryService._content_based_filtering(
                user.id, user_songs, limit=5
            )
            
            assert isinstance(recommendations, list)
            
            for rec in recommendations:
                assert 'song_id' in rec
                assert 'title' in rec
                assert 'relevance_score' in rec
                assert 'explanation' in rec
                assert 'recommendation_type' in rec
                assert rec['recommendation_type'] == 'content_based'
                assert 0 <= rec['relevance_score'] <= 1
    
    def test_collaborative_filtering(self, client, sample_data):
        """Test collaborative filtering algorithm."""
        with app.app_context():
            user = sample_data['users'][0]
            user_songs = MusicDiscoveryService._get_user_song_history(user.id)
            
            recommendations = MusicDiscoveryService._collaborative_filtering(
                user.id, user_songs, limit=5
            )
            
            assert isinstance(recommendations, list)
            
            for rec in recommendations:
                assert 'song_id' in rec
                assert 'title' in rec
                assert 'relevance_score' in rec
                assert 'explanation' in rec
                assert 'recommendation_type' in rec
                assert rec['recommendation_type'] == 'collaborative'
                assert 0 <= rec['relevance_score'] <= 1
    
    def test_feature_similarity_calculation(self, client, sample_data):
        """Test audio feature similarity calculation."""
        with app.app_context():
            song1 = sample_data['songs'][0]  # Rock Song 1
            song2 = sample_data['songs'][1]  # Rock Song 2
            song3 = sample_data['songs'][2]  # Jazz Song 1
            
            # Similar genre songs should have higher similarity
            similarity_same_genre = MusicDiscoveryService._calculate_feature_similarity(
                song1, song2
            )
            
            # Different genre songs should have lower similarity
            similarity_diff_genre = MusicDiscoveryService._calculate_feature_similarity(
                song1, song3
            )
            
            assert 0 <= similarity_same_genre <= 1
            assert 0 <= similarity_diff_genre <= 1
            assert similarity_same_genre > similarity_diff_genre
    
    def test_user_preferences_analysis(self, client, sample_data):
        """Test user music preferences analysis."""
        with app.app_context():
            user = sample_data['users'][0]
            user_songs = MusicDiscoveryService._get_user_song_history(user.id)
            
            preferences = MusicDiscoveryService._analyze_user_preferences(user_songs)
            
            assert 'preferred_genres' in preferences
            assert 'preferred_keys' in preferences
            assert 'preferred_difficulties' in preferences
            
            # Should analyze genres from user's songs
            assert isinstance(preferences['preferred_genres'], dict)
            
            # Average tempo can be None if no tempo data
            avg_tempo = preferences.get('average_tempo')
            assert avg_tempo is None or isinstance(avg_tempo, (int, float))
    
    def test_find_similar_users(self, client, sample_data):
        """Test finding users with similar music taste."""
        with app.app_context():
            user = sample_data['users'][0]
            user_songs = MusicDiscoveryService._get_user_song_history(user.id)
            
            similar_users = MusicDiscoveryService._find_similar_users(user.id, user_songs)
            
            assert isinstance(similar_users, list)
            
            for user_id, similarity_score in similar_users:
                assert isinstance(user_id, int)
                assert 0 <= similarity_score <= 1
                assert user_id != user.id  # Should not include self
    
    def test_trending_scores_calculation(self, client, sample_data):
        """Test trending scores calculation."""
        with app.app_context():
            user = sample_data['users'][0]
            now = datetime.now(UTC)
            start_date = now - timedelta(days=7)
            
            trending_data = MusicDiscoveryService._calculate_trending_scores(
                start_date, now, user.id, limit=5
            )
            
            assert isinstance(trending_data, list)
            
            for item in trending_data:
                assert 'song_id' in item
                assert 'title' in item
                assert 'trending_score' in item
                assert 'view_count' in item
                assert 'favorite_count' in item
                assert 'trend_explanation' in item
                assert item['trending_score'] >= 0
    
    def test_privacy_compliance(self, client, sample_data):
        """Test privacy compliance in recommendations."""
        with app.app_context():
            user = sample_data['users'][0]
            
            # Test personalized recommendations privacy
            recommendations = MusicDiscoveryService.get_personalized_recommendations(
                user.id, limit=5
            )
            
            assert 'privacy_notice' in recommendations
            privacy = recommendations['privacy_notice']
            assert 'data_usage' in privacy
            assert 'personalization' in privacy
            assert 'explanation' in privacy
            
            # Test similar songs (only uses song metadata)
            reference_song = sample_data['songs'][0]
            similar_songs = MusicDiscoveryService.get_similar_songs(
                reference_song.id, user.id, limit=3
            )
            
            # Should not expose private information
            assert 'reference_song' in similar_songs
            ref_song = similar_songs['reference_song']
            assert 'id' in ref_song
            assert 'title' in ref_song
            # Should not include sensitive user data
    
    def test_recommendation_explanations(self, client, sample_data):
        """Test recommendation explanations and transparency."""
        with app.app_context():
            user = sample_data['users'][0]
            user_songs = MusicDiscoveryService._get_user_song_history(user.id)
            
            if user_songs:
                preferences = MusicDiscoveryService._analyze_user_preferences(user_songs)
                test_song = sample_data['songs'][3]  # Pop Song 1
                
                explanation = MusicDiscoveryService._generate_content_explanation(
                    test_song, preferences
                )
                
                assert isinstance(explanation, str)
                assert len(explanation) > 0
                
                # Should provide meaningful explanation
                assert any(word in explanation.lower() for word in 
                          ['genre', 'key', 'difficulty', 'similar', 'matches', 'preference'])
    
    def test_rate_limiting_compatibility(self, client, sample_data):
        """Test that discovery service works with rate limiting."""
        with app.app_context():
            user = sample_data['users'][0]
            
            # Multiple calls should work (in test environment)
            for _ in range(3):
                recommendations = MusicDiscoveryService.get_personalized_recommendations(
                    user.id, limit=5
                )
                assert 'recommendations' in recommendations
    
    def test_error_handling(self, client, sample_data):
        """Test error handling in discovery service."""
        with app.app_context():
            # Test with non-existent user
            with pytest.raises(Exception):
                MusicDiscoveryService.get_personalized_recommendations(
                    99999, limit=5  # Non-existent user ID
                )
            
            # Test with non-existent song
            user = sample_data['users'][0]
            with pytest.raises(Exception):
                MusicDiscoveryService.get_similar_songs(
                    99999, user.id, limit=5  # Non-existent song ID
                )
    
    def test_limit_enforcement(self, client, sample_data):
        """Test that limit parameters are properly enforced."""
        with app.app_context():
            user = sample_data['users'][0]
            
            # Test recommendations limit
            recommendations = MusicDiscoveryService.get_personalized_recommendations(
                user.id, limit=3
            )
            
            # Should respect the limit (may be less if not enough data)
            assert len(recommendations['recommendations']) <= 3
            
            # Test trending songs limit
            trending = MusicDiscoveryService.get_trending_songs(
                user.id, timeframe='7d', limit=2
            )
            
            assert len(trending['trending_songs']) <= 2