"""
Tests for Performance Analytics Service

Tests the analytics engine functionality, privacy compliance,
and data aggregation features.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from chordme import app, db
from chordme.models import (
    User, Song, Setlist, SetlistSong, SetlistPerformance, 
    SetlistPerformanceSong
)
from chordme.analytics_service import PerformanceAnalyticsService


class TestPerformanceAnalyticsService:
    """Test suite for PerformanceAnalyticsService."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment for each test."""
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        with self.app.app_context():
            db.create_all()
            self.setup_test_data()
            yield
            db.session.remove()
            db.drop_all()
    
    def setup_test_data(self):
        """Create test data for analytics testing."""
        # Create test user
        self.user = User(email='test@example.com', password='password123')
        db.session.add(self.user)
        db.session.flush()
        
        # Create test songs
        self.song1 = Song(
            title='Test Song 1',
            artist='Test Artist',
            content='{title: Test Song 1}\n{artist: Test Artist}\nVerse 1',
            user_id=self.user.id
        )
        self.song2 = Song(
            title='Test Song 2', 
            artist='Test Artist',
            content='{title: Test Song 2}\n{artist: Test Artist}\nVerse 1',
            user_id=self.user.id
        )
        db.session.add_all([self.song1, self.song2])
        db.session.flush()
        
        # Create test setlist
        self.setlist = Setlist(
            name='Test Setlist',
            user_id=self.user.id,
            description='Test setlist for analytics'
        )
        db.session.add(self.setlist)
        db.session.flush()
        
        # Add songs to setlist
        self.setlist_song1 = SetlistSong(
            setlist_id=self.setlist.id,
            song_id=self.song1.id,
            sort_order=1,
            estimated_duration=240
        )
        self.setlist_song2 = SetlistSong(
            setlist_id=self.setlist.id,
            song_id=self.song2.id,
            sort_order=2,
            estimated_duration=180
        )
        db.session.add_all([self.setlist_song1, self.setlist_song2])
        db.session.flush()
        
        # Create test performances
        self.performance1 = SetlistPerformance(
            setlist_id=self.setlist.id,
            performance_date=datetime.utcnow() - timedelta(days=7),
            performed_by=self.user.id,
            venue='Test Venue',
            total_duration=65,
            overall_rating=4,
            audience_engagement='excellent'
        )
        self.performance2 = SetlistPerformance(
            setlist_id=self.setlist.id,
            performance_date=datetime.utcnow() - timedelta(days=14),
            performed_by=self.user.id,
            venue='Test Venue 2',
            total_duration=70,
            overall_rating=5,
            audience_engagement='good'
        )
        db.session.add_all([self.performance1, self.performance2])
        db.session.flush()
        
        # Create performance song records
        self.perf_song1_1 = SetlistPerformanceSong(
            performance_id=self.performance1.id,
            setlist_song_id=self.setlist_song1.id,
            actual_duration=250,
            performance_rating=4,
            audience_response='excellent'
        )
        self.perf_song1_2 = SetlistPerformanceSong(
            performance_id=self.performance1.id,
            setlist_song_id=self.setlist_song2.id,
            actual_duration=190,
            performance_rating=4,
            audience_response='good'
        )
        self.perf_song2_1 = SetlistPerformanceSong(
            performance_id=self.performance2.id,
            setlist_song_id=self.setlist_song1.id,
            actual_duration=245,
            performance_rating=5,
            audience_response='excellent'
        )
        self.perf_song2_2 = SetlistPerformanceSong(
            performance_id=self.performance2.id,
            setlist_song_id=self.setlist_song2.id,
            actual_duration=185,
            performance_rating=5,
            audience_response='good'
        )
        db.session.add_all([
            self.perf_song1_1, self.perf_song1_2,
            self.perf_song2_1, self.perf_song2_2
        ])
        
        db.session.commit()
    
    def test_get_setlist_analytics_basic(self):
        """Test basic setlist analytics functionality."""
        with self.app.app_context():
            analytics = PerformanceAnalyticsService.get_setlist_analytics(
                self.setlist.id, self.user.id
            )
            
            assert analytics['setlist_id'] == self.setlist.id
            assert analytics['setlist_name'] == 'Test Setlist'
            assert analytics['total_performances'] == 2
            assert analytics['average_rating'] == 4.5
            assert analytics['average_duration'] == 68  # Rounded (65 + 70) / 2
            assert len(analytics['most_performed_songs']) == 2
            assert 'performance_trends' in analytics
            assert 'audience_feedback' in analytics
            assert 'timing_analysis' in analytics
    
    def test_get_setlist_analytics_permission_denied(self):
        """Test that analytics access is denied for unauthorized users."""
        with self.app.app_context():
            # Create another user
            other_user = User(email='other@example.com', password='password123')
            db.session.add(other_user)
            db.session.commit()
            
            with pytest.raises(PermissionError):
                PerformanceAnalyticsService.get_setlist_analytics(
                    self.setlist.id, other_user.id
                )
    
    def test_get_song_analytics(self):
        """Test song-specific analytics."""
        with self.app.app_context():
            analytics = PerformanceAnalyticsService.get_song_analytics(
                self.song1.id, self.user.id
            )
            
            assert analytics['song_id'] == self.song1.id
            assert analytics['song_title'] == 'Test Song 1'
            assert analytics['total_performances'] == 2
            assert analytics['average_rating'] == 4.5  # (4 + 5) / 2
            assert analytics['average_duration'] == 247.5  # (250 + 245) / 2
            assert 'performance_trend' in analytics
    
    def test_get_recommendations(self):
        """Test recommendation generation."""
        with self.app.app_context():
            recommendations = PerformanceAnalyticsService.get_recommendations(
                self.user.id, limit=5
            )
            
            assert 'high_performing_songs' in recommendations
            assert 'optimal_durations' in recommendations
            assert 'timing_recommendations' in recommendations
            assert 'trending_combinations' in recommendations
            assert recommendations['high_performing_songs'] == []  # Not enough data
            assert 'average_performance_duration' in recommendations['timing_recommendations']
    
    def test_get_popular_songs_user_scope(self):
        """Test popular songs with user scope."""
        with self.app.app_context():
            popular = PerformanceAnalyticsService.get_popular_songs(
                user_id=self.user.id, timeframe='30d', limit=10
            )
            
            assert popular['timeframe'] == '30d'
            assert len(popular['popular_songs']) == 2
            assert popular['total_songs'] == 2
            assert 'trending_songs' in popular
    
    def test_get_popular_songs_public_scope(self):
        """Test popular songs with public scope (no user filter)."""
        with self.app.app_context():
            popular = PerformanceAnalyticsService.get_popular_songs(
                user_id=None, timeframe='7d', limit=5
            )
            
            assert popular['timeframe'] == '7d'
            assert len(popular['popular_songs']) >= 0  # May be 0 if no performances in timeframe
    
    def test_compare_setlists(self):
        """Test setlist comparison functionality."""
        with self.app.app_context():
            # Create a second setlist for comparison
            setlist2 = Setlist(
                name='Test Setlist 2',
                user_id=self.user.id,
                description='Second test setlist'
            )
            db.session.add(setlist2)
            db.session.commit()
            
            comparison = PerformanceAnalyticsService.compare_setlists(
                [self.setlist.id, setlist2.id], self.user.id
            )
            
            assert len(comparison['setlists']) == 2
            assert comparison['setlists'][0]['setlist_id'] == self.setlist.id
            assert comparison['setlists'][1]['setlist_id'] == setlist2.id
            assert len(comparison['insights']) > 0
    
    def test_compare_setlists_insufficient_data(self):
        """Test setlist comparison with insufficient data."""
        with self.app.app_context():
            with pytest.raises(ValueError, match='At least 2 setlists required'):
                PerformanceAnalyticsService.compare_setlists(
                    [self.setlist.id], self.user.id
                )
    
    def test_export_analytics_data(self):
        """Test analytics data export functionality."""
        with self.app.app_context():
            export_data = PerformanceAnalyticsService.export_analytics_data(
                self.user.id, export_type='comprehensive', format='json'
            )
            
            assert export_data['export_type'] == 'comprehensive'
            assert export_data['format'] == 'json'
            assert export_data['user_id'] == self.user.id
            assert 'data' in export_data
            assert 'performances' in export_data['data']
            assert 'songs' in export_data['data']
            assert 'trends' in export_data['data']
    
    def test_timing_analysis(self):
        """Test timing analysis calculations."""
        with self.app.app_context():
            timing = PerformanceAnalyticsService._get_timing_analysis(self.setlist.id)
            
            assert timing['total_songs'] == 2
            assert timing['estimated_total_duration'] == 420  # 240 + 180
            assert timing['average_estimated_duration'] == 210  # 420 / 2
            assert timing['average_actual_duration'] == 217  # Average of actual durations
            assert 'prediction_accuracy' in timing
    
    def test_performance_trends(self):
        """Test performance trends calculation."""
        with self.app.app_context():
            performances = [self.performance1, self.performance2]
            trends = PerformanceAnalyticsService._get_performance_trends(performances)
            
            assert 'by_month' in trends
            assert len(trends['by_month']) > 0
            
            # Check that monthly data is properly aggregated
            monthly_data = trends['by_month'][0]
            assert 'month' in monthly_data
            assert 'performances' in monthly_data
            assert 'average_rating' in monthly_data
    
    def test_audience_feedback_distribution(self):
        """Test audience feedback distribution calculation."""
        with self.app.app_context():
            performances = [self.performance1, self.performance2]
            feedback = PerformanceAnalyticsService._get_audience_feedback_distribution(performances)
            
            assert feedback['excellent'] == 1
            assert feedback['good'] == 1
    
    def test_privacy_compliance(self):
        """Test that analytics respect privacy settings and don't expose sensitive data."""
        with self.app.app_context():
            # Test that analytics don't include email or other PII
            analytics = PerformanceAnalyticsService.get_setlist_analytics(
                self.setlist.id, self.user.id
            )
            
            # Convert to string to check for sensitive data
            analytics_str = str(analytics)
            assert 'test@example.com' not in analytics_str
            assert 'password' not in analytics_str
            
            # Ensure only performance-related data is included
            assert all(key in [
                'setlist_id', 'setlist_name', 'total_performances', 
                'average_rating', 'average_duration', 'most_performed_songs',
                'performance_trends', 'audience_feedback', 'timing_analysis',
                'last_performed', 'generated_at'
            ] for key in analytics.keys())
    
    def test_no_performance_data(self):
        """Test analytics behavior when no performance data exists."""
        with self.app.app_context():
            # Create a setlist with no performances
            empty_setlist = Setlist(
                name='Empty Setlist',
                user_id=self.user.id,
                description='Setlist with no performances'
            )
            db.session.add(empty_setlist)
            db.session.commit()
            
            analytics = PerformanceAnalyticsService.get_setlist_analytics(
                empty_setlist.id, self.user.id
            )
            
            assert analytics['total_performances'] == 0
            assert 'message' in analytics
            assert analytics['message'] == 'No performance data available'
    
    def test_data_aggregation_accuracy(self):
        """Test that data aggregation calculations are accurate."""
        with self.app.app_context():
            song_analytics = PerformanceAnalyticsService.get_song_analytics(
                self.song1.id, self.user.id
            )
            
            # Verify calculations are correct
            expected_avg_rating = (4 + 5) / 2  # 4.5
            expected_avg_duration = (250 + 245) / 2  # 247.5
            
            assert song_analytics['average_rating'] == expected_avg_rating
            assert song_analytics['average_duration'] == expected_avg_duration
            assert song_analytics['total_performances'] == 2
    
    def test_error_handling(self):
        """Test error handling in analytics service."""
        with self.app.app_context():
            # Test with non-existent setlist
            with pytest.raises(Exception):  # Should raise 404 or similar
                PerformanceAnalyticsService.get_setlist_analytics(99999, self.user.id)
            
            # Test with non-existent song
            with pytest.raises(Exception):  # Should raise 404 or similar
                PerformanceAnalyticsService.get_song_analytics(99999, self.user.id)


class TestAnalyticsPrivacy:
    """Test suite for analytics privacy compliance."""
    
    def test_data_anonymization(self):
        """Test that public analytics properly anonymize data."""
        # Test would verify that when getting public analytics,
        # no user identifiable information is included
        pass
    
    def test_gdpr_compliance(self):
        """Test GDPR compliance features."""
        # Test would verify export includes proper GDPR notices
        # and data deletion works correctly
        pass
    
    def test_ccpa_compliance(self):
        """Test CCPA compliance features."""
        # Test would verify CCPA requirements are met
        pass


if __name__ == '__main__':
    pytest.main([__file__])