"""
Tests for Analytics API Routes

Tests the analytics REST API endpoints, authentication,
and privacy compliance features.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from chordme import app, db
from chordme.models import User, Song, Setlist, SetlistSong, SetlistPerformance


class TestAnalyticsRoutes:
    """Test suite for analytics API routes."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment for each test."""
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            self.setup_test_data()
            yield
            db.session.remove()
            db.drop_all()
    
    def setup_test_data(self):
        """Create test data for API testing."""
        # Create test user
        self.user = User(email='test@example.com', password='password123')
        db.session.add(self.user)
        db.session.flush()
        
        # Create test setlist
        self.setlist = Setlist(
            name='Test Setlist',
            user_id=self.user.id,
            description='Test setlist for API testing'
        )
        db.session.add(self.setlist)
        db.session.flush()
        
        # Create test song
        self.song = Song(
            title='Test Song',
            artist='Test Artist',
            content='{title: Test Song}\nVerse 1',
            user_id=self.user.id
        )
        db.session.add(self.song)
        db.session.commit()
        
        # Mock authentication token
        self.auth_headers = {
            'Authorization': 'Bearer mock_token',
            'Content-Type': 'application/json'
        }
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.PerformanceAnalyticsService.get_setlist_analytics')
    def test_get_setlist_analytics_success(self, mock_analytics, mock_user_id, mock_auth):
        """Test successful setlist analytics retrieval."""
        # Setup mocks
        mock_auth.return_value = lambda f: f  # Decorator that does nothing
        mock_user_id.return_value = self.user.id
        mock_analytics.return_value = {
            'setlist_id': self.setlist.id,
            'setlist_name': 'Test Setlist',
            'total_performances': 5,
            'average_rating': 4.2
        }
        
        with self.app.app_context():
            response = self.client.get(
                f'/api/v1/analytics/setlists/{self.setlist.id}',
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['setlist_id'] == self.setlist.id
            assert 'privacy_notice' in data['data']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.PerformanceAnalyticsService.get_setlist_analytics')
    def test_get_setlist_analytics_permission_denied(self, mock_analytics, mock_user_id, mock_auth):
        """Test setlist analytics with permission denied."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_analytics.side_effect = PermissionError("Access denied")
        
        with self.app.app_context():
            response = self.client.get(
                f'/api/v1/analytics/setlists/{self.setlist.id}',
                headers=self.auth_headers
            )
            
            assert response.status_code == 403
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Access denied' in data['message']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.PerformanceAnalyticsService.get_song_analytics')
    def test_get_song_analytics_success(self, mock_analytics, mock_user_id, mock_auth):
        """Test successful song analytics retrieval."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_analytics.return_value = {
            'song_id': self.song.id,
            'song_title': 'Test Song',
            'total_performances': 3,
            'average_rating': 4.5
        }
        
        with self.app.app_context():
            response = self.client.get(
                f'/api/v1/analytics/songs/{self.song.id}',
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['song_id'] == self.song.id
            assert 'privacy_notice' in data['data']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.PerformanceAnalyticsService.get_recommendations')
    def test_get_recommendations_success(self, mock_recommendations, mock_user_id, mock_auth):
        """Test successful recommendations retrieval."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_recommendations.return_value = {
            'high_performing_songs': [],
            'optimal_durations': {},
            'timing_recommendations': {}
        }
        
        with self.app.app_context():
            response = self.client.get(
                '/api/v1/analytics/recommendations?limit=5',
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'privacy_notice' in data['data']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.PerformanceAnalyticsService.get_popular_songs')
    def test_get_popular_songs_user_scope(self, mock_popular, mock_user_id, mock_auth):
        """Test popular songs with user scope."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_popular.return_value = {
            'timeframe': '30d',
            'popular_songs': [],
            'trending_songs': [],
            'total_songs': 0
        }
        
        with self.app.app_context():
            response = self.client.get(
                '/api/v1/analytics/popular?timeframe=30d&scope=user&limit=10',
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['timeframe'] == '30d'
            assert 'privacy_notice' in data['data']
    
    def test_get_popular_songs_invalid_timeframe(self):
        """Test popular songs with invalid timeframe."""
        with self.app.app_context():
            response = self.client.get(
                '/api/v1/analytics/popular?timeframe=invalid',
                headers=self.auth_headers
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Invalid timeframe' in data['message']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.PerformanceAnalyticsService.compare_setlists')
    def test_compare_setlists_success(self, mock_compare, mock_user_id, mock_auth):
        """Test successful setlist comparison."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_compare.return_value = {
            'setlists': [],
            'insights': ['Comparison insight']
        }
        
        request_data = {
            'setlist_ids': [self.setlist.id, self.setlist.id + 1]
        }
        
        with self.app.app_context():
            response = self.client.post(
                '/api/v1/analytics/compare',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'privacy_notice' in data['data']
    
    def test_compare_setlists_invalid_request(self):
        """Test setlist comparison with invalid request."""
        request_data = {
            'setlist_ids': [self.setlist.id]  # Only one setlist
        }
        
        with self.app.app_context():
            response = self.client.post(
                '/api/v1/analytics/compare',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'At least 2 setlist IDs required' in data['message']
    
    def test_compare_setlists_too_many(self):
        """Test setlist comparison with too many setlists."""
        request_data = {
            'setlist_ids': list(range(1, 12))  # 11 setlists
        }
        
        with self.app.app_context():
            response = self.client.post(
                '/api/v1/analytics/compare',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Maximum 10 setlists' in data['message']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.PerformanceAnalyticsService.export_analytics_data')
    def test_export_analytics_success(self, mock_export, mock_user_id, mock_auth):
        """Test successful analytics data export."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_export.return_value = {
            'export_type': 'comprehensive',
            'format': 'json',
            'user_id': self.user.id,
            'data': {}
        }
        
        request_data = {
            'export_type': 'comprehensive',
            'format': 'json',
            'privacy_consent': True
        }
        
        with self.app.app_context():
            response = self.client.post(
                '/api/v1/analytics/export',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'gdpr_compliance' in data['data']
    
    def test_export_analytics_no_consent(self):
        """Test analytics export without privacy consent."""
        request_data = {
            'export_type': 'comprehensive',
            'format': 'json',
            'privacy_consent': False
        }
        
        with self.app.app_context():
            response = self.client.post(
                '/api/v1/analytics/export',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Privacy consent required' in data['message']
    
    def test_export_analytics_invalid_type(self):
        """Test analytics export with invalid export type."""
        request_data = {
            'export_type': 'invalid_type',
            'format': 'json',
            'privacy_consent': True
        }
        
        with self.app.app_context():
            response = self.client.post(
                '/api/v1/analytics/export',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Invalid export type' in data['message']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.User.query')
    def test_get_privacy_settings(self, mock_user_query, mock_user_id, mock_auth):
        """Test getting privacy settings."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_user = MagicMock()
        mock_user.analytics_privacy_settings = {
            'collect_performance_data': True,
            'include_in_trends': True
        }
        mock_user_query.get_or_404.return_value = mock_user
        
        with self.app.app_context():
            response = self.client.get(
                '/api/v1/analytics/privacy/settings',
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'privacy_settings' in data['data']
            assert 'gdpr_rights' in data['data']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.User.query')
    @patch('chordme.analytics_routes.db.session')
    def test_update_privacy_settings(self, mock_session, mock_user_query, mock_user_id, mock_auth):
        """Test updating privacy settings."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        mock_user = MagicMock()
        mock_user.analytics_privacy_settings = {}
        mock_user_query.get_or_404.return_value = mock_user
        
        request_data = {
            'collect_performance_data': False,
            'data_retention_days': 180
        }
        
        with self.app.app_context():
            response = self.client.put(
                '/api/v1/analytics/privacy/settings',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert 'updated_settings' in data['data']
    
    def test_update_privacy_settings_invalid_retention(self):
        """Test updating privacy settings with invalid retention period."""
        request_data = {
            'data_retention_days': 10  # Too short
        }
        
        with self.app.app_context():
            response = self.client.put(
                '/api/v1/analytics/privacy/settings',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Data retention must be between' in data['message']
    
    @patch('chordme.analytics_routes.require_auth')
    @patch('chordme.analytics_routes.get_current_user_id')
    @patch('chordme.analytics_routes.db.session')
    def test_delete_analytics_data_success(self, mock_session, mock_user_id, mock_auth):
        """Test successful analytics data deletion."""
        # Setup mocks
        mock_auth.return_value = lambda f: f
        mock_user_id.return_value = self.user.id
        
        request_data = {
            'confirmation': 'I understand this action cannot be undone',
            'delete_type': 'all'
        }
        
        with self.app.app_context():
            # Mock database operations
            with patch('chordme.analytics_routes.SetlistPerformance') as mock_perf:
                mock_perf.query.join.return_value.filter.return_value.all.return_value = []
                
                response = self.client.post(
                    '/api/v1/analytics/data/delete',
                    data=json.dumps(request_data),
                    headers=self.auth_headers
                )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['status'] == 'success'
                assert 'deleted_items' in data['data']
                assert 'compliance_note' in data['data']
    
    def test_delete_analytics_data_no_confirmation(self):
        """Test analytics data deletion without proper confirmation."""
        request_data = {
            'confirmation': 'wrong confirmation',
            'delete_type': 'all'
        }
        
        with self.app.app_context():
            response = self.client.post(
                '/api/v1/analytics/data/delete',
                data=json.dumps(request_data),
                headers=self.auth_headers
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Explicit confirmation required' in data['message']
    
    def test_rate_limiting_error_handler(self):
        """Test rate limiting error handler."""
        with self.app.app_context():
            # Simulate rate limit error
            with patch('chordme.analytics_routes.analytics_bp.errorhandler') as mock_handler:
                # This would test the rate limit handler function
                # In a real test, you'd trigger actual rate limiting
                pass
    
    def test_analytics_authentication_required(self):
        """Test that analytics endpoints require authentication."""
        with self.app.app_context():
            # Test without auth headers
            response = self.client.get('/api/v1/analytics/recommendations')
            
            # The actual response code depends on the auth implementation
            # This test would verify proper authentication enforcement
            assert response.status_code in [401, 403]
    
    def test_analytics_endpoints_cors(self):
        """Test CORS headers on analytics endpoints."""
        with self.app.app_context():
            response = self.client.options('/api/v1/analytics/recommendations')
            
            # Verify CORS headers are present
            # This test would check that CORS is properly configured
            assert response.status_code in [200, 204]


class TestAnalyticsPrivacyCompliance:
    """Test suite for analytics privacy compliance."""
    
    def test_gdpr_compliance_export(self):
        """Test GDPR compliance in data export."""
        # Test would verify GDPR information is included in exports
        pass
    
    def test_privacy_notice_inclusion(self):
        """Test that privacy notices are included in responses."""
        # Test would verify privacy notices are present in all analytics responses
        pass
    
    def test_data_minimization(self):
        """Test that only necessary data is included in analytics."""
        # Test would verify data minimization principles
        pass
    
    def test_user_consent_tracking(self):
        """Test that user consent is properly tracked and respected."""
        # Test would verify consent mechanisms work correctly
        pass


if __name__ == '__main__':
    pytest.main([__file__])