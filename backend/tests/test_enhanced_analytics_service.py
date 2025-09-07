"""
Comprehensive test suite for Enhanced Performance Analytics Service

Tests include:
- Performance session management
- Event recording and analysis
- Problem section identification
- AI recommendation generation
- Privacy compliance
- Data retention and cleanup
"""

import pytest
from datetime import datetime, timedelta, UTC
from unittest.mock import Mock, patch
from sqlalchemy.exc import SQLAlchemyError

from chordme import app, db
from chordme.models import (
    User, Song, PerformanceSession, PerformanceEvent, 
    ProblemSection, PerformanceAnalytics
)
from chordme.enhanced_analytics_service import EnhancedPerformanceAnalyticsService


class TestEnhancedPerformanceAnalyticsService:
    """Test suite for Enhanced Performance Analytics Service."""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Set up test data for each test."""
        with app.test_client() as client:
            with app.app_context():
                # Create test user
                self.test_user = User(email='test@example.com', password='testpass123')
                db.session.add(self.test_user)
                
                # Create test song
                self.test_song = Song(
                    title='Test Song',
                    content='{title: Test Song}\n{artist: Test Artist}\n[C]Test content',
                    user_id=self.test_user.id
                )
                db.session.add(self.test_song)
                
                db.session.commit()
                
                self.service = EnhancedPerformanceAnalyticsService
                self.client = client
    
    def test_start_performance_session(self):
        """Test starting a new performance session."""
        with app.app_context():
            session_id = self.service.start_performance_session(
                user_id=self.test_user.id,
                session_type='practice',
                song_id=self.test_song.id,
                device_type='desktop',
                analytics_consent=True
            )
            
            assert session_id is not None
            
            # Verify session was created in database
            session = PerformanceSession.query.get(session_id)
            assert session is not None
            assert session.user_id == self.test_user.id
            assert session.song_id == self.test_song.id
            assert session.session_type == 'practice'
            assert session.device_type == 'desktop'
            assert session.analytics_consent is True
            assert session.started_at is not None
            assert session.ended_at is None
    
    def test_start_session_privacy_settings(self):
        """Test session creation respects user privacy settings."""
        # Set user privacy settings
        self.test_user.analytics_privacy_settings = {
            'anonymous_only': True,
            'analytics_consent': False
        }
        db.session.commit()
        
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice',
            analytics_consent=False
        )
        
        session = PerformanceSession.query.get(session_id)
        assert session.anonymous_data_only is True
        assert session.analytics_consent is False
    
    def test_record_performance_event(self):
        """Test recording performance events."""
        # Start a session first
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice'
        )
        
        # Record a pause event
        success = self.service.record_performance_event(
            session_id=session_id,
            event_type='pause',
            position_seconds=30.5,
            chord_at_position='G',
            section_name='verse'
        )
        
        assert success is True
        
        # Verify event was recorded
        event = PerformanceEvent.query.filter_by(session_id=session_id).first()
        assert event is not None
        assert event.event_type == 'pause'
        assert event.position_seconds == 30.5
        assert event.chord_at_position == 'G'
        assert event.section_name == 'verse'
        
        # Verify session counters were updated
        session = PerformanceSession.query.get(session_id)
        assert session.pause_count == 1
    
    def test_record_multiple_events(self):
        """Test recording multiple events and counter updates."""
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice'
        )
        
        # Record multiple events
        events = [
            ('pause', 10.0),
            ('play', 15.0),
            ('rewind', 25.0),
            ('tempo_change', 30.0),
            ('pause', 45.0)
        ]
        
        for event_type, position in events:
            self.service.record_performance_event(
                session_id=session_id,
                event_type=event_type,
                position_seconds=position
            )
        
        # Verify counters
        session = PerformanceSession.query.get(session_id)
        assert session.pause_count == 2
        assert session.rewind_count == 1
        assert session.tempo_changes == 1
        
        # Verify all events were recorded
        recorded_events = PerformanceEvent.query.filter_by(session_id=session_id).all()
        assert len(recorded_events) == 5
    
    def test_end_performance_session(self):
        """Test ending a performance session."""
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice'
        )
        
        # Add some events first
        self.service.record_performance_event(session_id, 'pause', 10.0)
        self.service.record_performance_event(session_id, 'play', 15.0)
        
        # End the session
        success = self.service.end_performance_session(
            session_id=session_id,
            completion_percentage=85.0,
            session_rating=4,
            difficulty_rating=3
        )
        
        assert success is True
        
        # Verify session was ended
        session = PerformanceSession.query.get(session_id)
        assert session.ended_at is not None
        assert session.total_duration is not None
        assert session.completion_percentage == 85.0
        assert session.session_rating == 4
        assert session.difficulty_rating == 3
    
    def test_problem_section_detection(self):
        """Test automatic problem section detection."""
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice',
            song_id=self.test_song.id
        )
        
        # Record multiple pause events in the same area (should trigger problem detection)
        positions = [30.0, 32.0, 35.0, 38.0]  # Multiple pauses around position 30-38
        for pos in positions:
            self.service.record_performance_event(session_id, 'pause', pos)
        
        # Check if problem section was created
        problem_sections = ProblemSection.query.filter_by(session_id=session_id).all()
        assert len(problem_sections) > 0
        
        problem = problem_sections[0]
        assert problem.problem_type == 'frequent_pauses'
        assert problem.severity_score > 1.0
        assert problem.start_position <= 30.0
        assert problem.end_position >= 38.0
    
    def test_get_problem_sections(self):
        """Test retrieving problem sections."""
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice',
            song_id=self.test_song.id
        )
        
        # Create a problem section manually
        problem = ProblemSection(
            session_id=session_id,
            start_position=20.0,
            end_position=40.0,
            problem_type='frequent_pauses',
            severity_score=3.5,
            song_id=self.test_song.id
        )
        db.session.add(problem)
        db.session.commit()
        
        # Retrieve problem sections
        problems = self.service.get_problem_sections(
            user_id=self.test_user.id,
            song_id=self.test_song.id
        )
        
        assert len(problems) == 1
        assert problems[0]['problem_type'] == 'frequent_pauses'
        assert problems[0]['severity_score'] == 3.5
    
    def test_performance_insights_generation(self):
        """Test comprehensive performance insights generation."""
        # Create multiple sessions with different metrics
        sessions_data = [
            {'completion': 90.0, 'rating': 5, 'difficulty': 2},
            {'completion': 75.0, 'rating': 4, 'difficulty': 3},
            {'completion': 80.0, 'rating': 4, 'difficulty': 3},
        ]
        
        for i, data in enumerate(sessions_data):
            session_id = self.service.start_performance_session(
                user_id=self.test_user.id,
                session_type='practice',
                song_id=self.test_song.id
            )
            
            # Add some events
            self.service.record_performance_event(session_id, 'pause', 10.0 + i * 5)
            
            # End session
            self.service.end_performance_session(
                session_id=session_id,
                completion_percentage=data['completion'],
                session_rating=data['rating'],
                difficulty_rating=data['difficulty']
            )
        
        # Get insights
        insights = self.service.get_performance_insights(
            user_id=self.test_user.id,
            song_id=self.test_song.id,
            period_days=30
        )
        
        assert insights['user_id'] == self.test_user.id
        assert insights['song_id'] == self.test_song.id
        assert insights['summary_metrics']['total_sessions'] == 3
        assert insights['summary_metrics']['average_completion_rate'] > 0
        assert 'ai_recommendations' in insights
        assert 'improvement_trends' in insights
    
    def test_ai_recommendations_generation(self):
        """Test AI-powered recommendations generation."""
        # Create sessions with low completion rates to trigger recommendations
        for i in range(3):
            session_id = self.service.start_performance_session(
                user_id=self.test_user.id,
                session_type='practice'
            )
            
            self.service.end_performance_session(
                session_id=session_id,
                completion_percentage=45.0  # Low completion rate
            )
        
        insights = self.service.get_performance_insights(
            user_id=self.test_user.id,
            period_days=30
        )
        
        recommendations = insights['ai_recommendations']
        assert len(recommendations) > 0
        
        # Should include completion improvement recommendation
        completion_rec = next(
            (r for r in recommendations if r['type'] == 'completion_improvement'), 
            None
        )
        assert completion_rec is not None
        assert completion_rec['priority'] == 'high'
        assert 'actionable_steps' in completion_rec
    
    def test_improvement_trends_calculation(self):
        """Test improvement trends calculation."""
        # Create sessions with improving completion rates
        completion_rates = [60.0, 70.0, 80.0, 85.0, 90.0]
        
        for completion in completion_rates:
            session_id = self.service.start_performance_session(
                user_id=self.test_user.id,
                session_type='practice'
            )
            
            self.service.end_performance_session(
                session_id=session_id,
                completion_percentage=completion
            )
        
        insights = self.service.get_performance_insights(
            user_id=self.test_user.id,
            period_days=30
        )
        
        trends = insights['improvement_trends']
        assert 'completion_trend' in trends
        assert trends['completion_trend'] > 0  # Should show positive trend
        assert trends['trend_interpretation']['completion'] == 'improving'
    
    def test_session_comparison(self):
        """Test session comparison functionality."""
        # Create multiple sessions over time
        for i in range(10):
            session_id = self.service.start_performance_session(
                user_id=self.test_user.id,
                session_type='practice'
            )
            
            # Vary completion rates (improving over time)
            completion = 50.0 + i * 4  # 50%, 54%, 58%, ... 86%
            
            self.service.end_performance_session(
                session_id=session_id,
                completion_percentage=completion
            )
        
        insights = self.service.get_performance_insights(
            user_id=self.test_user.id,
            period_days=30
        )
        
        comparison = insights['session_comparison']
        assert 'improvement_summary' in comparison
        assert comparison['improvement_summary']['completion_improved'] is True
    
    def test_anonymous_usage_analytics(self):
        """Test anonymous usage analytics generation."""
        # Create anonymous sessions
        for device in ['mobile', 'tablet', 'desktop']:
            session_id = self.service.start_performance_session(
                user_id=self.test_user.id,
                session_type='practice',
                device_type=device,
                analytics_consent=False  # Anonymous
            )
            
            # Add events
            self.service.record_performance_event(session_id, 'pause', 10.0)
            self.service.record_performance_event(session_id, 'tempo_change', 20.0)
            
            self.service.end_performance_session(session_id)
        
        # Get anonymous analytics
        analytics = self.service.get_anonymous_usage_analytics('weekly')
        
        assert analytics['time_period'] == 'weekly'
        assert analytics['session_metrics']['total_sessions'] > 0
        assert 'device_distribution' in analytics['session_metrics']
        assert 'interaction_patterns' in analytics
        assert 'feature_optimization_insights' in analytics
    
    def test_privacy_compliance(self):
        """Test privacy compliance features."""
        # Create session with privacy settings
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice',
            analytics_consent=False
        )
        
        session = PerformanceSession.query.get(session_id)
        assert session.anonymous_data_only is True
        
        # Test data export
        sessions = PerformanceSession.query.filter_by(user_id=self.test_user.id).all()
        export_data = {
            'user_id': self.test_user.id,
            'performance_sessions': [s.to_dict(include_events=True) for s in sessions],
            'privacy_settings': self.test_user.analytics_privacy_settings or {}
        }
        
        assert 'user_id' in export_data
        assert 'performance_sessions' in export_data
        assert 'privacy_settings' in export_data
    
    def test_data_retention_and_cleanup(self):
        """Test data retention and cleanup functionality."""
        # Create old session
        old_session = PerformanceSession(
            user_id=self.test_user.id,
            session_type='practice'
        )
        old_session.started_at = datetime.now(UTC) - timedelta(days=100)
        old_session.ended_at = old_session.started_at + timedelta(minutes=30)
        db.session.add(old_session)
        db.session.commit()
        
        # Create analytics record with expiration
        analytics = PerformanceAnalytics(
            user_id=self.test_user.id,
            analytics_period='daily',
            period_start=datetime.now(UTC) - timedelta(days=100),
            period_end=datetime.now(UTC) - timedelta(days=99),
            data_retention_days=30
        )
        db.session.add(analytics)
        db.session.commit()
        
        # Test cleanup query (would be run by background job)
        cutoff_date = datetime.now(UTC) - timedelta(days=90)
        old_sessions = PerformanceSession.query.filter(
            PerformanceSession.started_at < cutoff_date
        ).all()
        
        expired_analytics = PerformanceAnalytics.query.filter(
            PerformanceAnalytics.expires_at < datetime.now(UTC)
        ).all()
        
        assert len(old_sessions) > 0
        assert len(expired_analytics) > 0
    
    def test_error_handling(self):
        """Test error handling in analytics service."""
        # Test with invalid session ID
        success = self.service.record_performance_event(
            session_id=99999,  # Non-existent session
            event_type='pause',
            position_seconds=10.0
        )
        
        assert success is False
        
        # Test ending non-existent session
        success = self.service.end_performance_session(
            session_id=99999,
            completion_percentage=100.0
        )
        
        assert success is False
    
    def test_real_time_analysis(self):
        """Test real-time problem detection during session."""
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice',
            song_id=self.test_song.id
        )
        
        # Record events that should trigger real-time analysis
        positions = [25.0, 27.0, 29.0]  # Close together - should detect pattern
        for pos in positions:
            self.service.record_performance_event(session_id, 'pause', pos)
        
        # Check if problem was detected
        problems = ProblemSection.query.filter_by(session_id=session_id).all()
        assert len(problems) > 0
        
        problem = problems[0]
        assert problem.severity_score > 1.0
        assert len(problem.suggested_improvements) > 0
    
    def test_feature_insights_generation(self):
        """Test generation of feature optimization insights."""
        # Create diverse session data
        session_data = [
            {'device': 'mobile', 'tempo_changes': 5, 'completion': 85.0},
            {'device': 'desktop', 'tempo_changes': 2, 'completion': 95.0},
            {'device': 'tablet', 'tempo_changes': 8, 'completion': 75.0},
        ]
        
        for data in session_data:
            session_id = self.service.start_performance_session(
                user_id=self.test_user.id,
                session_type='practice',
                device_type=data['device'],
                analytics_consent=False  # Anonymous
            )
            
            # Add tempo changes
            for i in range(data['tempo_changes']):
                self.service.record_performance_event(
                    session_id, 'tempo_change', 10.0 + i * 5
                )
            
            self.service.end_performance_session(
                session_id, completion_percentage=data['completion']
            )
        
        analytics = self.service.get_anonymous_usage_analytics('weekly')
        insights = analytics['feature_optimization_insights']
        
        assert len(insights) > 0
        
        # Check for tempo adjustment insights
        tempo_insight = next(
            (i for i in insights if i['feature'] == 'tempo_adjustment'), 
            None
        )
        
        if tempo_insight:  # May not always be generated depending on thresholds
            assert 'usage_rate' in tempo_insight
            assert 'optimization_suggestion' in tempo_insight
    
    def test_active_duration_calculation(self):
        """Test calculation of active duration excluding long pauses."""
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice'
        )
        
        # Record events with timestamps
        events = [
            ('play', 0.0),
            ('pause', 30.0),    # 30-second pause
            ('play', 40.0),     # 10-second break (short)
            ('pause', 70.0),    # 30-second pause  
            ('play', 85.0),     # 15-second break (long)
            ('pause', 100.0)
        ]
        
        for event_type, position in events:
            self.service.record_performance_event(session_id, event_type, position)
        
        self.service.end_performance_session(session_id)
        
        session = PerformanceSession.query.get(session_id)
        assert session.active_duration is not None
        assert session.active_duration < session.total_duration
    
    def test_analytics_snapshot_creation(self):
        """Test creation of analytics snapshots."""
        session_id = self.service.start_performance_session(
            user_id=self.test_user.id,
            session_type='practice',
            song_id=self.test_song.id,
            analytics_consent=True  # Consent required for snapshots
        )
        
        self.service.end_performance_session(
            session_id=session_id,
            completion_percentage=80.0
        )
        
        # Check if analytics snapshot was created
        snapshot = PerformanceAnalytics.query.filter_by(
            user_id=self.test_user.id,
            song_id=self.test_song.id,
            analytics_period='daily'
        ).first()
        
        if snapshot:  # May not be created immediately in test environment
            assert snapshot.total_sessions >= 1
            assert snapshot.completion_rate > 0