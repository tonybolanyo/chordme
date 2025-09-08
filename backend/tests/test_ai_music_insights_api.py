"""
Tests for AI Music Insights API Routes

Test suite for the REST API endpoints for AI music analysis
"""

import unittest
import json
from unittest.mock import patch, MagicMock
from flask import Flask
from chordme import app, db
from chordme.models import User
from chordme.ai_music_insights_routes import ai_insights_bp


class TestAIMusicInsightsAPI(unittest.TestCase):
    """Test AI Music Insights API endpoints"""
    
    def setUp(self):
        """Set up test environment"""
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            # Create test user
            self.test_user = User(email='test@example.com')
            self.test_user.set_password('testpassword123')
            db.session.add(self.test_user)
            db.session.commit()
            
            # Get auth token
            response = self.client.post('/api/v1/auth/login', 
                json={'email': 'test@example.com', 'password': 'testpassword123'})
            data = json.loads(response.data)
            self.auth_token = data['data']['token']
            
        self.auth_headers = {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/json'
        }
        
        self.sample_content = """{title: Test Song}
{artist: Test Artist}

{start_of_verse}
[C]Simple [F]test [G]song [Am]here
{end_of_verse}

{start_of_chorus}
[F]This is [C]the chorus [G]part [Am]now
{end_of_chorus}"""

    def tearDown(self):
        """Clean up test environment"""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_analyze_song_success(self):
        """Test successful song analysis"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            # Mock successful analysis
            mock_service.analyze_song.return_value = {
                'title': 'Test Song',
                'artist': 'Test Artist',
                'analyzed_at': '2024-01-01T00:00:00Z',
                'chord_progression': [{
                    'name': 'I-V-vi-IV',
                    'pattern': '0-7-9-5',
                    'confidence': 0.9,
                    'key': 'C major'
                }],
                'structure': {
                    'sections': [],
                    'structure': 'V-C',
                    'confidence': 0.8
                },
                'key': {
                    'key': 'C major',
                    'root': 'C',
                    'mode': 'major',
                    'confidence': 0.9
                },
                'complexity': {
                    'overall_score': 0.4,
                    'difficulty_level': 'intermediate'
                },
                'genre': {
                    'primary_genre': 'Pop',
                    'confidence': 0.7
                },
                'harmony': {
                    'chord_functions': [],
                    'cadences': []
                },
                'recommendations': [{
                    'type': 'practice',
                    'priority': 'medium',
                    'title': 'Practice chord transitions',
                    'description': 'Work on smooth transitions between chords'
                }],
                'overall_confidence': 0.8,
                'analysis_metrics': {
                    'processing_time': 0.5,
                    'algorithms_used': ['chord_detection', 'key_analysis'],
                    'data_quality': 0.9
                }
            }
            
            response = self.client.post('/api/v1/ai-insights/analyze',
                headers=self.auth_headers,
                json={'content': self.sample_content}
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            
            self.assertEqual(data['status'], 'success')
            self.assertIn('data', data)
            
            insights = data['data']
            self.assertEqual(insights['title'], 'Test Song')
            self.assertEqual(insights['artist'], 'Test Artist')
            self.assertGreater(len(insights['chord_progression']), 0)
            self.assertIn('key', insights)
            self.assertIn('complexity', insights)
            self.assertIn('recommendations', insights)
            
            mock_service.analyze_song.assert_called_once_with(self.sample_content, {})

    def test_analyze_song_with_options(self):
        """Test song analysis with custom options"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_service.analyze_song.return_value = {
                'title': 'Test Song',
                'genre': {'primary_genre': 'Unknown'},  # Genre disabled
                'recommendations': [],  # Recommendations disabled
                'overall_confidence': 0.7,
                'analysis_metrics': {'processing_time': 0.3}
            }
            
            options = {
                'enable_genre_classification': False,
                'enable_recommendations': False,
                'user_skill_level': 'beginner'
            }
            
            response = self.client.post('/api/v1/ai-insights/analyze',
                headers=self.auth_headers,
                json={
                    'content': self.sample_content,
                    'options': options
                }
            )
            
            self.assertEqual(response.status_code, 200)
            mock_service.analyze_song.assert_called_once_with(self.sample_content, options)

    def test_analyze_song_missing_content(self):
        """Test analysis with missing content"""
        response = self.client.post('/api/v1/ai-insights/analyze',
            headers=self.auth_headers,
            json={}
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)
        self.assertEqual(data['error']['code'], 'MISSING_REQUIRED_FIELD')

    def test_analyze_song_empty_content(self):
        """Test analysis with empty content"""
        response = self.client.post('/api/v1/ai-insights/analyze',
            headers=self.auth_headers,
            json={'content': ''}
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'INVALID_INPUT_FORMAT')

    def test_analyze_song_invalid_content_type(self):
        """Test analysis with invalid content type"""
        response = self.client.post('/api/v1/ai-insights/analyze',
            headers=self.auth_headers,
            json={'content': 123}  # Not a string
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'INVALID_INPUT_FORMAT')

    def test_analyze_song_analysis_failed(self):
        """Test analysis failure due to invalid content"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_service.analyze_song.side_effect = ValueError('No chords detected in content')
            
            response = self.client.post('/api/v1/ai-insights/analyze',
                headers=self.auth_headers,
                json={'content': self.sample_content}
            )
            
            self.assertEqual(response.status_code, 422)
            data = json.loads(response.data)
            
            self.assertEqual(data['status'], 'error')
            self.assertEqual(data['error']['code'], 'ANALYSIS_FAILED')
            self.assertIn('No chords detected', data['error']['message'])

    def test_analyze_song_server_error(self):
        """Test analysis server error handling"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_service.analyze_song.side_effect = Exception('Service unavailable')
            
            response = self.client.post('/api/v1/ai-insights/analyze',
                headers=self.auth_headers,
                json={'content': self.sample_content}
            )
            
            self.assertEqual(response.status_code, 500)
            data = json.loads(response.data)
            
            self.assertEqual(data['status'], 'error')
            self.assertEqual(data['error']['code'], 'INTERNAL_SERVER_ERROR')

    def test_analyze_song_unauthorized(self):
        """Test analysis without authentication"""
        response = self.client.post('/api/v1/ai-insights/analyze',
            json={'content': self.sample_content}
        )
        
        self.assertEqual(response.status_code, 401)

    def test_compare_songs_success(self):
        """Test successful song comparison"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_service.compare_songs.return_value = {
                'target_song': 'Song 2',
                'similarity': 0.85,
                'similarity_aspects': [{
                    'aspect': 'chord_progression',
                    'score': 0.9,
                    'weight': 0.3
                }],
                'common_characteristics': ['Both in major key'],
                'differences': ['Different tempo']
            }
            
            song1 = "{title: Song 1}\n[C]Test [G]song [Am]one [F]here"
            song2 = "{title: Song 2}\n[C]Test [G]song [Am]two [F]here"
            
            response = self.client.post('/api/v1/ai-insights/compare',
                headers=self.auth_headers,
                json={
                    'song1_content': song1,
                    'song2_content': song2
                }
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            
            self.assertEqual(data['status'], 'success')
            comparison = data['data']
            
            self.assertEqual(comparison['target_song'], 'Song 2')
            self.assertEqual(comparison['similarity'], 0.85)
            self.assertGreater(len(comparison['similarity_aspects']), 0)
            self.assertGreater(len(comparison['common_characteristics']), 0)
            
            mock_service.compare_songs.assert_called_once_with(song1, song2, {})

    def test_compare_songs_missing_content(self):
        """Test comparison with missing song content"""
        response = self.client.post('/api/v1/ai-insights/compare',
            headers=self.auth_headers,
            json={'song1_content': 'Only one song'}
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'MISSING_REQUIRED_FIELD')

    def test_compare_songs_invalid_content_type(self):
        """Test comparison with invalid content types"""
        response = self.client.post('/api/v1/ai-insights/compare',
            headers=self.auth_headers,
            json={
                'song1_content': 123,  # Not string
                'song2_content': 'Valid content'
            }
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'INVALID_INPUT_FORMAT')

    def test_compare_songs_empty_content(self):
        """Test comparison with empty content"""
        response = self.client.post('/api/v1/ai-insights/compare',
            headers=self.auth_headers,
            json={
                'song1_content': 'Valid content',
                'song2_content': '   '  # Empty after strip
            }
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'INVALID_INPUT_FORMAT')

    def test_validate_content_success(self):
        """Test successful content validation"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_parsed = {
                'chords': ['C', 'F', 'G', 'Am'],
                'title': 'Test Song',
                'artist': 'Test Artist',
                'sections': [{'type': 'verse'}, {'type': 'chorus'}]
            }
            mock_service.analyzer.parse_chordpro_content.return_value = mock_parsed
            mock_service._assess_data_quality.return_value = 0.9
            
            response = self.client.post('/api/v1/ai-insights/validate-content',
                headers=self.auth_headers,
                json={'content': self.sample_content}
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            
            self.assertEqual(data['status'], 'success')
            validation = data['data']
            
            self.assertTrue(validation['is_valid'])
            self.assertEqual(validation['chord_count'], 4)
            self.assertEqual(validation['unique_chords'], 4)
            self.assertTrue(validation['has_structure'])
            self.assertTrue(validation['has_metadata'])
            self.assertEqual(validation['quality_score'], 0.9)

    def test_validate_content_poor_quality(self):
        """Test content validation with poor quality content"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_parsed = {
                'chords': ['C'],  # Only one chord
                'title': None,
                'artist': None,
                'sections': []  # No structure
            }
            mock_service.analyzer.parse_chordpro_content.return_value = mock_parsed
            mock_service._assess_data_quality.return_value = 0.3
            
            response = self.client.post('/api/v1/ai-insights/validate-content',
                headers=self.auth_headers,
                json={'content': '[C]Short'}
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            
            validation = data['data']
            self.assertFalse(validation['is_valid'])
            self.assertEqual(validation['chord_count'], 1)
            self.assertFalse(validation['has_structure'])
            self.assertFalse(validation['has_metadata'])
            self.assertGreater(len(validation['recommendations']), 0)
            self.assertGreater(len(validation['warnings']), 0)

    def test_validate_content_missing_content(self):
        """Test content validation with missing content"""
        response = self.client.post('/api/v1/ai-insights/validate-content',
            headers=self.auth_headers,
            json={}
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'MISSING_REQUIRED_FIELD')

    def test_validate_content_invalid_type(self):
        """Test content validation with invalid content type"""
        response = self.client.post('/api/v1/ai-insights/validate-content',
            headers=self.auth_headers,
            json={'content': ['not', 'a', 'string']}
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'INVALID_INPUT_FORMAT')

    def test_health_check_success(self):
        """Test successful health check"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_service.analyzer.parse_chordpro_content.return_value = {
                'chords': ['C', 'F', 'G']
            }
            
            response = self.client.get('/api/v1/ai-insights/health')
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            
            self.assertEqual(data['status'], 'success')
            health_data = data['data']
            
            self.assertEqual(health_data['service'], 'AI Music Insights')
            self.assertEqual(health_data['status'], 'healthy')
            self.assertGreater(len(health_data['features']), 0)
            
            expected_features = [
                'chord_progression_analysis',
                'structure_detection',
                'key_analysis',
                'complexity_assessment',
                'genre_classification'
            ]
            
            for feature in expected_features:
                self.assertIn(feature, health_data['features'])

    def test_health_check_failure(self):
        """Test health check failure"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            mock_service.analyzer.parse_chordpro_content.side_effect = Exception('Service down')
            
            response = self.client.get('/api/v1/ai-insights/health')
            
            self.assertEqual(response.status_code, 500)
            data = json.loads(response.data)
            
            self.assertEqual(data['status'], 'error')
            self.assertEqual(data['error']['code'], 'INTERNAL_SERVER_ERROR')

    def test_error_handlers(self):
        """Test API error handlers"""
        # Test 404 - endpoint not found
        response = self.client.get('/api/v1/ai-insights/nonexistent')
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'RESOURCE_NOT_FOUND')
        
        # Test 405 - method not allowed
        response = self.client.put('/api/v1/ai-insights/analyze')
        self.assertEqual(response.status_code, 405)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 'INVALID_INPUT_FORMAT')

    def test_request_validation(self):
        """Test request validation edge cases"""
        # Test with malformed JSON
        response = self.client.post('/api/v1/ai-insights/analyze',
            headers={'Authorization': f'Bearer {self.auth_token}'},
            data='invalid json'
        )
        self.assertEqual(response.status_code, 400)
        
        # Test with missing authorization header
        response = self.client.post('/api/v1/ai-insights/analyze',
            headers={'Content-Type': 'application/json'},
            json={'content': self.sample_content}
        )
        self.assertEqual(response.status_code, 401)
        
        # Test with invalid authorization token
        response = self.client.post('/api/v1/ai-insights/analyze',
            headers={'Authorization': 'Bearer invalid_token', 'Content-Type': 'application/json'},
            json={'content': self.sample_content}
        )
        self.assertEqual(response.status_code, 401)


class TestAIMusicInsightsAPIIntegration(unittest.TestCase):
    """Integration tests for AI Music Insights API"""
    
    def setUp(self):
        """Set up integration test environment"""
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            # Create test user
            self.test_user = User(email='integration@example.com')
            self.test_user.set_password('testpassword123')
            db.session.add(self.test_user)
            db.session.commit()
            
            # Get auth token
            response = self.client.post('/api/v1/auth/login', 
                json={'email': 'integration@example.com', 'password': 'testpassword123'})
            data = json.loads(response.data)
            self.auth_token = data['data']['token']
            
        self.auth_headers = {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/json'
        }

    def tearDown(self):
        """Clean up integration test environment"""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @patch('chordme.ai_music_insights_routes.ai_music_insights_service')
    def test_full_analysis_workflow(self, mock_service):
        """Test complete analysis workflow"""
        # Mock the analysis service
        mock_service.analyzer.parse_chordpro_content.return_value = {
            'chords': ['C', 'F', 'G', 'Am'],
            'title': 'Integration Test',
            'artist': 'Test Artist',
            'sections': [{'type': 'verse'}, {'type': 'chorus'}]
        }
        mock_service._assess_data_quality.return_value = 0.85
        mock_service.analyze_song.return_value = {
            'title': 'Integration Test',
            'analyzed_at': '2024-01-01T00:00:00Z',
            'overall_confidence': 0.8,
            'analysis_metrics': {'processing_time': 0.5}
        }
        
        # Step 1: Validate content
        content = """{title: Integration Test}
{artist: Test Artist}
[C]Test [F]content [G]for [Am]analysis"""
        
        validation_response = self.client.post('/api/v1/ai-insights/validate-content',
            headers=self.auth_headers,
            json={'content': content}
        )
        
        self.assertEqual(validation_response.status_code, 200)
        validation_data = json.loads(validation_response.data)
        self.assertTrue(validation_data['data']['is_valid'])
        
        # Step 2: Perform analysis
        analysis_response = self.client.post('/api/v1/ai-insights/analyze',
            headers=self.auth_headers,
            json={'content': content}
        )
        
        self.assertEqual(analysis_response.status_code, 200)
        analysis_data = json.loads(analysis_response.data)
        self.assertEqual(analysis_data['data']['title'], 'Integration Test')
        
        # Step 3: Check health
        health_response = self.client.get('/api/v1/ai-insights/health')
        self.assertEqual(health_response.status_code, 200)
        health_data = json.loads(health_response.data)
        self.assertEqual(health_data['data']['status'], 'healthy')

    @patch('chordme.ai_music_insights_routes.ai_music_insights_service')
    def test_concurrent_requests(self, mock_service):
        """Test handling of concurrent analysis requests"""
        import threading
        import time
        
        # Mock slow analysis
        def slow_analysis(content, options=None):
            time.sleep(0.1)  # Simulate processing time
            return {
                'title': 'Concurrent Test',
                'overall_confidence': 0.8,
                'analysis_metrics': {'processing_time': 0.1}
            }
        
        mock_service.analyze_song.side_effect = slow_analysis
        
        content = "[C]Test [F]concurrent [G]analysis [Am]here"
        
        results = []
        errors = []
        
        def make_request():
            try:
                response = self.client.post('/api/v1/ai-insights/analyze',
                    headers=self.auth_headers,
                    json={'content': content}
                )
                results.append(response.status_code)
            except Exception as e:
                errors.append(str(e))
        
        # Create multiple concurrent requests
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all requests to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(results), 5)
        self.assertTrue(all(status == 200 for status in results))

    def test_large_content_handling(self):
        """Test handling of large content"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            # Create large content
            large_content = "{title: Large Song}\n"
            for i in range(100):
                large_content += f"[C]Line {i} [F]with [G]chords [Am]here\n"
            
            mock_service.analyzer.parse_chordpro_content.return_value = {
                'chords': ['C', 'F', 'G', 'Am'] * 100,
                'title': 'Large Song',
                'sections': []
            }
            mock_service._assess_data_quality.return_value = 0.95
            
            response = self.client.post('/api/v1/ai-insights/validate-content',
                headers=self.auth_headers,
                json={'content': large_content}
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            
            # Should handle large content gracefully
            self.assertTrue(data['data']['is_valid'])
            self.assertEqual(data['data']['chord_count'], 400)

    def test_api_documentation_compliance(self):
        """Test that API responses comply with documented schemas"""
        with patch('chordme.ai_music_insights_routes.ai_music_insights_service') as mock_service:
            # Mock comprehensive response
            mock_service.analyze_song.return_value = {
                'title': 'Schema Test',
                'artist': 'Test Artist',
                'analyzed_at': '2024-01-01T00:00:00Z',
                'chord_progression': [{
                    'name': 'I-V-vi-IV',
                    'pattern': '0-7-9-5',
                    'description': 'Popular progression',
                    'confidence': 0.9,
                    'key': 'C major',
                    'roman_numerals': ['I', 'V', 'vi', 'IV'],
                    'functional_labels': ['tonic', 'dominant', 'tonic', 'predominant']
                }],
                'structure': {
                    'sections': [],
                    'structure': 'V-C',
                    'confidence': 0.8,
                    'complexity_score': 0.4,
                    'estimated_duration': 180
                },
                'key': {
                    'key': 'C major',
                    'root': 'C',
                    'mode': 'major',
                    'confidence': 0.9,
                    'alternatives': [{'key': 'A minor', 'confidence': 0.6}],
                    'signature': {'sharps': 0, 'flats': 0, 'accidentals': []}
                },
                'complexity': {
                    'overall_score': 0.4,
                    'chord_complexity': 0.3,
                    'harmonic_complexity': 0.4,
                    'rhythmic_complexity': 0.3,
                    'structure_complexity': 0.5,
                    'difficulty_level': 'intermediate',
                    'factors': [{
                        'name': 'Chord Variety',
                        'description': 'Uses 4 unique chords',
                        'impact': 0.3,
                        'category': 'chord'
                    }]
                },
                'genre': {
                    'primary_genre': 'Pop',
                    'confidence': 0.7,
                    'alternative_genres': [{'genre': 'Rock', 'confidence': 0.5}],
                    'characteristics': [{
                        'name': 'Pop Structure',
                        'strength': 0.7,
                        'description': 'Common pop progression'
                    }]
                },
                'harmony': {
                    'chord_functions': [],
                    'cadences': [],
                    'modulations': [],
                    'harmonic_rhythm': {'changes_per_measure': 2.0, 'pattern': 'moderate'},
                    'suggestions': []
                },
                'recommendations': [{
                    'type': 'practice',
                    'priority': 'medium',
                    'title': 'Practice transitions',
                    'description': 'Work on chord transitions',
                    'estimated_time': '1 week',
                    'difficulty': 'beginner',
                    'resources': [{
                        'type': 'tutorial',
                        'title': 'Chord Transitions',
                        'description': 'Basic chord transition exercises'
                    }]
                }],
                'overall_confidence': 0.8,
                'analysis_metrics': {
                    'processing_time': 0.5,
                    'algorithms_used': ['chord_detection', 'key_analysis'],
                    'data_quality': 0.9
                }
            }
            
            response = self.client.post('/api/v1/ai-insights/analyze',
                headers=self.auth_headers,
                json={'content': '[C]Test [F]schema [G]compliance [Am]here'}
            )
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            
            # Verify response structure matches API documentation
            self.assertEqual(data['status'], 'success')
            insights = data['data']
            
            # Check all required fields are present
            required_fields = [
                'title', 'artist', 'analyzed_at', 'chord_progression',
                'structure', 'key', 'complexity', 'genre', 'harmony',
                'recommendations', 'overall_confidence', 'analysis_metrics'
            ]
            
            for field in required_fields:
                self.assertIn(field, insights, f"Missing required field: {field}")
            
            # Check data types
            self.assertIsInstance(insights['chord_progression'], list)
            self.assertIsInstance(insights['structure'], dict)
            self.assertIsInstance(insights['overall_confidence'], (int, float))
            self.assertIsInstance(insights['analysis_metrics'], dict)


if __name__ == '__main__':
    unittest.main()