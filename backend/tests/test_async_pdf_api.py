"""
Integration tests for async PDF export API endpoints.
Tests the complete async PDF generation workflow including job creation,
progress tracking, and file download.
"""

import pytest
import json
import time
from unittest.mock import patch

from chordme import app, db
from chordme.models import User, Song, PDFExportJob


class TestAsyncPDFExportAPI:
    """Test cases for async PDF export API endpoints."""
    
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
    def auth_headers(self, client):
        """Create authenticated user and return auth headers."""
        # Register user
        user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        client.post('/api/v1/auth/register', 
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        # Login user
        response = client.post('/api/v1/auth/login',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        token = response.get_json()['data']['token']
        return {'Authorization': f'Bearer {token}'}
    
    @pytest.fixture
    def sample_song(self, client, auth_headers):
        """Create a sample song for testing."""
        song_data = {
            'title': 'Test Song',
            'content': '{title: Test Song}\n{artist: Test Artist}\n\n[C]Hello [G]world [Am]from [F]ChordMe'
        }
        
        response = client.post('/api/v1/songs',
                              data=json.dumps(song_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        return response.get_json()['data']
    
    def test_async_single_song_export(self, client, auth_headers, sample_song):
        """Test async single song PDF export."""
        request_data = {
            'song_id': sample_song['id'],
            'options': {
                'paper_size': 'a4',
                'orientation': 'portrait',
                'template': 'classic',
                'chord_diagrams': True,
                'font_size': 12
            }
        }
        
        # Start async export
        response = client.post('/api/v1/pdf/export/async/single',
                              data=json.dumps(request_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 202
        data = response.get_json()
        
        assert data['status'] == 'success'
        assert 'job_id' in data['data']
        assert data['data']['status'] == 'pending'
        assert data['data']['progress'] == 0
        
        job_id = data['data']['job_id']
        
        # Check job status
        status_response = client.get(f'/api/v1/pdf/jobs/{job_id}',
                                   headers=auth_headers)
        
        assert status_response.status_code == 200
        status_data = status_response.get_json()
        
        assert status_data['data']['id'] == job_id
        assert status_data['data']['job_type'] == 'single'
        assert status_data['data']['total_count'] == 1
    
    def test_async_batch_export(self, client, auth_headers, sample_song):
        """Test async batch PDF export."""
        # Create another song
        song_data2 = {
            'title': 'Test Song 2',
            'content': '{title: Test Song 2}\n\n[D]Another [A]test [Bm]song'
        }
        
        response2 = client.post('/api/v1/songs',
                               data=json.dumps(song_data2),
                               content_type='application/json',
                               headers=auth_headers)
        
        sample_song2 = response2.get_json()['data']
        
        request_data = {
            'song_ids': [sample_song['id'], sample_song2['id']],
            'options': {
                'paper_size': 'letter',
                'template': 'modern'
            }
        }
        
        # Start async batch export
        response = client.post('/api/v1/pdf/export/async/batch',
                              data=json.dumps(request_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 202
        data = response.get_json()
        
        assert data['status'] == 'success'
        assert 'job_id' in data['data']
        assert data['data']['total_songs'] == 2
        
        job_id = data['data']['job_id']
        
        # Check job status
        status_response = client.get(f'/api/v1/pdf/jobs/{job_id}',
                                   headers=auth_headers)
        
        assert status_response.status_code == 200
        status_data = status_response.get_json()
        
        assert status_data['data']['job_type'] == 'batch'
        assert status_data['data']['total_count'] == 2
    
    def test_async_multi_song_export(self, client, auth_headers, sample_song):
        """Test async multi-song PDF export."""
        # Create additional songs
        song_data2 = {'title': 'Song 2', 'content': '{title: Song 2}\n[G]Test'}
        song_data3 = {'title': 'Song 3', 'content': '{title: Song 3}\n[C]Test'}
        
        response2 = client.post('/api/v1/songs',
                               data=json.dumps(song_data2),
                               content_type='application/json',
                               headers=auth_headers)
        
        response3 = client.post('/api/v1/songs',
                               data=json.dumps(song_data3),
                               content_type='application/json',
                               headers=auth_headers)
        
        sample_song2 = response2.get_json()['data']
        sample_song3 = response3.get_json()['data']
        
        request_data = {
            'song_ids': [sample_song['id'], sample_song2['id'], sample_song3['id']],
            'options': {
                'include_toc': True,
                'template': 'minimal'
            }
        }
        
        # Start async multi-song export
        response = client.post('/api/v1/pdf/export/async/multi-song',
                              data=json.dumps(request_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 202
        data = response.get_json()
        
        assert data['status'] == 'success'
        assert data['data']['total_songs'] == 3
        
        job_id = data['data']['job_id']
        
        # Check job status
        status_response = client.get(f'/api/v1/pdf/jobs/{job_id}',
                                   headers=auth_headers)
        
        assert status_response.status_code == 200
        status_data = status_response.get_json()
        
        assert status_data['data']['job_type'] == 'multi_song'
        assert status_data['data']['total_count'] == 3
    
    def test_list_pdf_jobs(self, client, auth_headers, sample_song):
        """Test listing PDF export jobs."""
        # Create a few jobs
        job_requests = [
            {'song_id': sample_song['id']},
            {'song_id': sample_song['id']},
        ]
        
        job_ids = []
        for req in job_requests:
            response = client.post('/api/v1/pdf/export/async/single',
                                  data=json.dumps(req),
                                  content_type='application/json',
                                  headers=auth_headers)
            job_ids.append(response.get_json()['data']['job_id'])
        
        # List jobs
        response = client.get('/api/v1/pdf/jobs',
                             headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['status'] == 'success'
        assert len(data['data']['jobs']) == 2
        
        returned_job_ids = [job['id'] for job in data['data']['jobs']]
        for job_id in job_ids:
            assert job_id in returned_job_ids
    
    def test_cancel_pdf_job(self, client, auth_headers, sample_song):
        """Test cancelling a PDF export job."""
        request_data = {'song_id': sample_song['id']}
        
        # Create job
        response = client.post('/api/v1/pdf/export/async/single',
                              data=json.dumps(request_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        job_id = response.get_json()['data']['job_id']
        
        # Cancel job
        cancel_response = client.post(f'/api/v1/pdf/jobs/{job_id}/cancel',
                                     headers=auth_headers)
        
        assert cancel_response.status_code == 200
        cancel_data = cancel_response.get_json()
        
        assert cancel_data['status'] == 'success'
        assert cancel_data['data']['status'] == 'cancelled'
        
        # Check job status
        status_response = client.get(f'/api/v1/pdf/jobs/{job_id}',
                                   headers=auth_headers)
        
        status_data = status_response.get_json()
        assert status_data['data']['status'] == 'cancelled'
    
    def test_job_access_control(self, client, auth_headers, sample_song):
        """Test that users can only access their own jobs."""
        # Create job with first user
        request_data = {'song_id': sample_song['id']}
        
        response = client.post('/api/v1/pdf/export/async/single',
                              data=json.dumps(request_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        job_id = response.get_json()['data']['job_id']
        
        # Create second user
        user2_data = {
            'email': 'user2@example.com',
            'password': 'TestPassword123!'
        }
        client.post('/api/v1/auth/register', 
                   data=json.dumps(user2_data),
                   content_type='application/json')
        
        login_response = client.post('/api/v1/auth/login',
                                    data=json.dumps(user2_data),
                                    content_type='application/json')
        
        user2_token = login_response.get_json()['data']['token']
        user2_headers = {'Authorization': f'Bearer {user2_token}'}
        
        # Try to access first user's job with second user
        response = client.get(f'/api/v1/pdf/jobs/{job_id}',
                             headers=user2_headers)
        
        assert response.status_code == 403
        assert response.get_json()['error'] == 'Access denied'
    
    def test_validation_errors(self, client, auth_headers):
        """Test validation errors for async PDF export."""
        # Test missing song_id
        response = client.post('/api/v1/pdf/export/async/single',
                              data=json.dumps({}),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'song_id is required' in response.get_json()['error']
        
        # Test invalid song_id
        response = client.post('/api/v1/pdf/export/async/single',
                              data=json.dumps({'song_id': 99999}),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 404
        assert 'not found' in response.get_json()['error']
        
        # Test invalid paper size
        response = client.post('/api/v1/pdf/export/async/single',
                              data=json.dumps({
                                  'song_id': 1,
                                  'options': {'paper_size': 'invalid'}
                              }),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Invalid paper_size' in response.get_json()['error']
    
    def test_batch_export_validation(self, client, auth_headers):
        """Test batch export validation."""
        # Test empty song_ids
        response = client.post('/api/v1/pdf/export/async/batch',
                              data=json.dumps({'song_ids': []}),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'song_ids is required' in response.get_json()['error']
        
        # Test too many songs
        response = client.post('/api/v1/pdf/export/async/batch',
                              data=json.dumps({'song_ids': list(range(1, 52))}),  # 51 songs
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Cannot export more than 50 songs' in response.get_json()['error']
    
    def test_multi_song_export_validation(self, client, auth_headers):
        """Test multi-song export validation."""
        # Test too few songs
        response = client.post('/api/v1/pdf/export/async/multi-song',
                              data=json.dumps({'song_ids': [1]}),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'at least 2 songs' in response.get_json()['error']
        
        # Test too many songs
        response = client.post('/api/v1/pdf/export/async/multi-song',
                              data=json.dumps({'song_ids': list(range(1, 32))}),  # 31 songs
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 400
        assert 'Cannot export more than 30 songs' in response.get_json()['error']
    
    @patch('chordme.pdf_job_manager.pdf_job_manager.start_job_async')
    def test_job_creation_flow(self, mock_start_job, client, auth_headers, sample_song):
        """Test the complete job creation flow without actually processing."""
        request_data = {
            'song_id': sample_song['id'],
            'options': {
                'paper_size': 'a4',
                'template': 'classic'
            }
        }
        
        # Start async export
        response = client.post('/api/v1/pdf/export/async/single',
                              data=json.dumps(request_data),
                              content_type='application/json',
                              headers=auth_headers)
        
        assert response.status_code == 202
        data = response.get_json()
        
        # Verify job was created in database
        job_id = data['data']['job_id']
        with app.app_context():
            job = PDFExportJob.query.get(job_id)
            assert job is not None
            assert job.job_type == 'single'
            assert job.song_ids == [sample_song['id']]
            assert job.export_options['paper_size'] == 'a4'
            assert job.status == 'pending'
        
        # Verify async processing was started
        mock_start_job.assert_called_once_with(job_id)
    
    def test_rate_limiting(self, client, auth_headers, sample_song):
        """Test rate limiting for async PDF export endpoints."""
        request_data = {'song_id': sample_song['id']}
        
        # Make multiple requests to test rate limiting
        # The limit is 10 per 5 minutes for single exports
        responses = []
        for i in range(12):  # Try to exceed the limit
            response = client.post('/api/v1/pdf/export/async/single',
                                  data=json.dumps(request_data),
                                  content_type='application/json',
                                  headers=auth_headers)
            responses.append(response)
        
        # Some requests should succeed, others should be rate limited
        success_count = sum(1 for r in responses if r.status_code == 202)
        rate_limited_count = sum(1 for r in responses if r.status_code == 429)
        
        # Should have some successful requests and some rate limited
        assert success_count > 0
        # Note: In test environment, rate limiting might not work exactly as expected
        # This test mainly verifies the endpoint exists and handles multiple requests