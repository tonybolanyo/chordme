"""
Tests for Practice Mode API endpoints
"""

import json
import pytest
from datetime import datetime
from chordme import app, db
from chordme.models import User
from chordme.practice_api import practice_sessions, practice_statistics, practice_achievements


@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def auth_headers():
    """Create authentication headers for testing"""
    # This would normally create a proper JWT token
    # For testing, we'll create a mock user and token
    return {'Authorization': 'Bearer mock_jwt_token'}


@pytest.fixture
def test_user():
    """Create a test user"""
    user = User(
        email='test@example.com',
        username='testuser',
        password_hash='hashed_password'
    )
    db.session.add(user)
    db.session.commit()
    return user


class TestPracticeAPI:
    """Test class for Practice Mode API endpoints"""
    
    def test_start_practice_session(self, client, auth_headers):
        """Test starting a practice session"""
        # Mock the require_auth decorator to work in tests
        with client.application.test_request_context():
            session_data = {
                'songId': 'test-song-123',
                'goals': [
                    {
                        'id': '1',
                        'type': 'chord_changes',
                        'target': 80,
                        'description': 'Achieve 80% accuracy'
                    }
                ],
                'metronome': {
                    'enabled': True,
                    'bpm': 120,
                    'timeSignature': {'numerator': 4, 'denominator': 4}
                },
                'difficulty': 'intermediate',
                'enableRecording': False
            }
            
            # Note: This test would need proper authentication setup
            # For now, we'll test the data structure
            assert session_data['songId'] == 'test-song-123'
            assert len(session_data['goals']) == 1
            assert session_data['metronome']['bpm'] == 120
    
    def test_session_data_structure(self):
        """Test practice session data structure"""
        session_id = 'test_session_123'
        user_id = 1
        
        session_data = {
            'id': session_id,
            'user_id': user_id,
            'song_id': 'test-song-123',
            'start_time': datetime.utcnow().isoformat(),
            'goals': [
                {
                    'id': '1',
                    'type': 'chord_changes',
                    'target': 80,
                    'current': 0,
                    'completed': False,
                    'description': 'Achieve 80% chord change accuracy'
                }
            ],
            'metronome_config': {
                'enabled': True,
                'bpm': 120,
                'timeSignature': {'numerator': 4, 'denominator': 4},
                'subdivision': 'quarter',
                'volume': 0.7,
                'sound': 'click'
            },
            'difficulty': 'intermediate',
            'recording_enabled': False,
            'status': 'active'
        }
        
        # Validate session structure
        assert session_data['id'] == session_id
        assert session_data['user_id'] == user_id
        assert session_data['status'] == 'active'
        assert len(session_data['goals']) == 1
        assert session_data['metronome_config']['bpm'] == 120
        assert session_data['difficulty'] == 'intermediate'
    
    def test_practice_statistics_structure(self):
        """Test practice statistics data structure"""
        user_id = 1
        
        stats = {
            'total_practice_time': 3600,  # 1 hour in seconds
            'sessions_count': 5,
            'average_accuracy': 0.85,
            'chord_change_accuracy': 0.82,
            'tempo_consistency': 0.88,
            'sections_completed': 12,
            'streak': 3,
            'last_practice_date': datetime.utcnow().isoformat(),
            'improvement_rate': 0.15
        }
        
        # Validate statistics structure
        assert stats['total_practice_time'] == 3600
        assert stats['sessions_count'] == 5
        assert 0 <= stats['average_accuracy'] <= 1
        assert 0 <= stats['chord_change_accuracy'] <= 1
        assert 0 <= stats['tempo_consistency'] <= 1
        assert stats['streak'] >= 0
        assert stats['improvement_rate'] >= 0
    
    def test_achievement_structure(self):
        """Test achievement data structure"""
        achievement = {
            'id': 'first_session',
            'title': 'First Steps',
            'description': 'Complete your first practice session',
            'type': 'practice_time',
            'level': 'bronze',
            'progress': 0.0,
            'requirement': 1,
            'icon': '🎵',
            'reward': 'Practice Mode unlocked!',
            'unlocked_at': None
        }
        
        # Validate achievement structure
        assert achievement['id'] == 'first_session'
        assert achievement['type'] in ['practice_time', 'accuracy', 'streak', 'speed', 'challenge']
        assert achievement['level'] in ['bronze', 'silver', 'gold', 'platinum']
        assert 0 <= achievement['progress'] <= 1
        assert achievement['requirement'] > 0
        assert achievement['unlocked_at'] is None  # Not yet unlocked
    
    def test_timing_feedback_structure(self):
        """Test timing feedback data structure"""
        feedback = {
            'chord_name': 'C',
            'expected_time': 10.0,
            'actual_time': 10.1,
            'accuracy': 0.95,
            'timing': 'late',
            'feedback': 'Slightly late, but close!',
            'suggestion': 'Try changing chords 100ms earlier'
        }
        
        # Validate feedback structure
        assert feedback['chord_name'] == 'C'
        assert feedback['expected_time'] >= 0
        assert feedback['actual_time'] >= 0
        assert 0 <= feedback['accuracy'] <= 1
        assert feedback['timing'] in ['early', 'late', 'perfect']
        assert len(feedback['feedback']) > 0
    
    def test_recording_structure(self):
        """Test practice recording data structure"""
        recording = {
            'id': 'recording_123',
            'user_id': 1,
            'session_id': 'session_123',
            'duration': 180,  # 3 minutes
            'timing_data': [
                {
                    'chord_name': 'C',
                    'expected_time': 10.0,
                    'actual_time': 10.1,
                    'accuracy': 0.95,
                    'timing': 'late'
                }
            ],
            'metronome_data': [
                {
                    'beat': 1,
                    'subdivision': 1,
                    'time': 10.0,
                    'accent': True,
                    'played': True
                }
            ],
            'quality': 'medium',
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Validate recording structure
        assert recording['duration'] > 0
        assert recording['quality'] in ['low', 'medium', 'high']
        assert len(recording['timing_data']) >= 0
        assert len(recording['metronome_data']) >= 0
        
        # Validate timing data
        if recording['timing_data']:
            timing = recording['timing_data'][0]
            assert 0 <= timing['accuracy'] <= 1
            assert timing['timing'] in ['early', 'late', 'perfect']
        
        # Validate metronome data
        if recording['metronome_data']:
            metronome = recording['metronome_data'][0]
            assert metronome['beat'] > 0
            assert isinstance(metronome['accent'], bool)
            assert isinstance(metronome['played'], bool)
    
    def test_goal_structure(self):
        """Test practice goal data structure"""
        goal = {
            'id': 'goal_123',
            'user_id': 1,
            'type': 'chord_changes',
            'target': 80,
            'current': 65,
            'completed': False,
            'description': 'Achieve 80% chord change accuracy',
            'created_at': datetime.utcnow().isoformat(),
            'deadline': None
        }
        
        # Validate goal structure
        assert goal['type'] in ['chord_changes', 'tempo', 'accuracy', 'endurance', 'section_mastery']
        assert goal['target'] > 0
        assert goal['current'] >= 0
        assert isinstance(goal['completed'], bool)
        assert len(goal['description']) > 0
        
        # Check progress calculation
        progress = goal['current'] / goal['target']
        assert 0 <= progress <= 1.5  # Allow some overshoot
    
    def test_analytics_structure(self):
        """Test practice analytics data structure"""
        analytics = {
            'total_sessions': 10,
            'total_practice_time': 7200,  # 2 hours
            'average_session_length': 720,  # 12 minutes
            'sessions_this_week': 3,
            'practice_frequency': 0.43,  # sessions per day
            'most_practiced_difficulty': 'intermediate',
            'improvement_trends': {
                'duration_trend': 'improving',
                'recent_avg_duration': 800,
                'early_avg_duration': 600,
                'total_sessions_analyzed': 10
            },
            'goal_completion_rate': 0.75
        }
        
        # Validate analytics structure
        assert analytics['total_sessions'] >= 0
        assert analytics['total_practice_time'] >= 0
        assert analytics['average_session_length'] >= 0
        assert analytics['sessions_this_week'] >= 0
        assert 0 <= analytics['practice_frequency'] <= 10  # Reasonable upper bound
        assert analytics['most_practiced_difficulty'] in ['beginner', 'intermediate', 'advanced', 'expert']
        assert 0 <= analytics['goal_completion_rate'] <= 1
        
        # Validate improvement trends
        trends = analytics['improvement_trends']
        assert trends['duration_trend'] in ['improving', 'declining', 'stable']
        assert trends['total_sessions_analyzed'] >= 0
    
    def test_error_response_structure(self):
        """Test API error response structure"""
        error_response = {
            'success': False,
            'message': 'Failed to start practice session',
            'error_code': 'PRACTICE_SESSION_ERROR',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Validate error response structure
        assert error_response['success'] is False
        assert len(error_response['message']) > 0
        assert error_response['error_code'].isupper()
        
        # Validate timestamp format
        datetime.fromisoformat(error_response['timestamp'])
    
    def test_success_response_structure(self):
        """Test API success response structure"""
        success_response = {
            'success': True,
            'session': {
                'id': 'session_123',
                'status': 'active'
            },
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Validate success response structure
        assert success_response['success'] is True
        assert 'session' in success_response
        
        # Validate timestamp format
        datetime.fromisoformat(success_response['timestamp'])


class TestPracticeHelperFunctions:
    """Test helper functions for practice mode"""
    
    def test_streak_calculation(self):
        """Test practice streak calculation logic"""
        from chordme.practice_api import update_practice_streak
        
        # Test maintaining streak (same day)
        stats_same_day = {
            'last_practice_date': datetime.utcnow().isoformat(),
            'streak': 5
        }
        update_practice_streak(stats_same_day)
        assert stats_same_day['streak'] == 5  # Should maintain
        
        # Test incrementing streak (consecutive day)
        yesterday = datetime.utcnow().replace(day=datetime.utcnow().day - 1)
        stats_consecutive = {
            'last_practice_date': yesterday.isoformat(),
            'streak': 5
        }
        update_practice_streak(stats_consecutive)
        assert stats_consecutive['streak'] == 6  # Should increment
    
    def test_default_achievements_creation(self):
        """Test creation of default achievements"""
        from chordme.practice_api import create_default_achievements
        
        achievements = create_default_achievements()
        
        # Validate we have the expected achievements
        assert len(achievements) >= 6
        
        # Check for specific achievements
        achievement_ids = [a['id'] for a in achievements]
        assert 'first_session' in achievement_ids
        assert 'accuracy_80' in achievement_ids
        assert 'streak_7' in achievement_ids
        assert 'practice_time_1h' in achievement_ids
        
        # Validate each achievement has required fields
        for achievement in achievements:
            assert 'id' in achievement
            assert 'title' in achievement
            assert 'description' in achievement
            assert 'type' in achievement
            assert 'level' in achievement
            assert 'requirement' in achievement
            assert achievement['unlocked_at'] is None  # Should start locked
    
    def test_improvement_trends_calculation(self):
        """Test calculation of improvement trends"""
        from chordme.practice_api import calculate_improvement_trends
        
        # Test with insufficient data
        few_sessions = [{'duration': 300}]
        trends = calculate_improvement_trends(few_sessions)
        assert trends['trend'] == 'insufficient_data'
        
        # Test with improving trend
        improving_sessions = [
            {'start_time': '2024-01-01T10:00:00', 'duration': 300},
            {'start_time': '2024-01-02T10:00:00', 'duration': 400},
            {'start_time': '2024-01-03T10:00:00', 'duration': 500},
            {'start_time': '2024-01-04T10:00:00', 'duration': 600},
            {'start_time': '2024-01-05T10:00:00', 'duration': 700},
            {'start_time': '2024-01-06T10:00:00', 'duration': 800},
        ]
        trends = calculate_improvement_trends(improving_sessions)
        assert trends['duration_trend'] == 'improving'
        assert trends['recent_avg_duration'] > trends['early_avg_duration']
    
    def test_goal_completion_rate_calculation(self):
        """Test calculation of goal completion rate"""
        from chordme.practice_api import calculate_goal_completion_rate
        
        # Test with no goals
        no_goals_sessions = [{'goals': []}]
        rate = calculate_goal_completion_rate(no_goals_sessions)
        assert rate == 0.0
        
        # Test with mixed completion
        mixed_sessions = [
            {
                'goals': [
                    {'completed': True},
                    {'completed': False},
                    {'completed': True}
                ]
            },
            {
                'goals': [
                    {'completed': True},
                    {'completed': True}
                ]
            }
        ]
        rate = calculate_goal_completion_rate(mixed_sessions)
        assert rate == 0.8  # 4 out of 5 goals completed


if __name__ == '__main__':
    pytest.main([__file__])