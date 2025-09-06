"""
Tests for Filter Preset API Routes
"""

import pytest
import json
from chordme import app, db
from chordme.models import User, FilterPreset
from datetime import datetime, UTC


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    from chordme import app as chordme_app
    chordme_app.config['TESTING'] = True
    chordme_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with chordme_app.app_context():
        db.create_all()
        yield chordme_app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return app.test_client()


@pytest.fixture
def auth_headers(app):
    """Create authentication headers for test user."""
    with app.app_context():
        # Create test user
        user = User(email='test@example.com', password='testpass123')
        db.session.add(user)
        db.session.commit()
        
        # Create JWT token for user
        from chordme.utils import generate_jwt_token
        token = generate_jwt_token(user.id)
        
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_preset_data():
    """Sample filter preset data for testing."""
    return {
        'name': 'Rock Songs',
        'description': 'Filter for rock genre songs',
        'filter_config': {
            'genre': 'Rock',
            'difficulty': 'intermediate',
            'minTempo': 100,
            'maxTempo': 140
        },
        'is_public': False,
        'is_shared': False
    }


class TestFilterPresetAPI:
    """Test filter preset API endpoints."""
    
    def test_get_filter_presets_empty(self, client, auth_headers):
        """Test getting filter presets when none exist."""
        response = client.get('/api/v1/filter-presets', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data'] == []
    
    def test_create_filter_preset(self, client, auth_headers, sample_preset_data):
        """Test creating a new filter preset."""
        response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['message'] == 'Filter preset created successfully'
        assert data['data']['name'] == sample_preset_data['name']
        assert data['data']['filter_config'] == sample_preset_data['filter_config']
    
    def test_create_filter_preset_missing_name(self, client, auth_headers):
        """Test creating filter preset without required name."""
        preset_data = {
            'filter_config': {'genre': 'Rock'},
            'is_public': False
        }
        
        response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(preset_data)
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'name is required' in data['message']
    
    def test_create_filter_preset_missing_config(self, client, auth_headers):
        """Test creating filter preset without filter config."""
        preset_data = {
            'name': 'Test Preset',
            'is_public': False
        }
        
        response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(preset_data)
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'filter configuration is required' in data['message']
    
    def test_create_filter_preset_duplicate_name(self, client, auth_headers, sample_preset_data, app):
        """Test creating filter preset with duplicate name."""
        # Create first preset
        response1 = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        assert response1.status_code == 201
        
        # Try to create another with same name
        response2 = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        
        assert response2.status_code == 409
        data = response2.get_json()
        assert data['status'] == 'error'
        assert 'preset with this name already exists' in data['message']
    
    def test_get_filter_preset_by_id(self, client, auth_headers, sample_preset_data):
        """Test getting a specific filter preset by ID."""
        # Create preset first
        create_response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        preset_id = create_response.get_json()['data']['id']
        
        # Get preset by ID
        response = client.get(f'/api/v1/filter-presets/{preset_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['id'] == preset_id
        assert data['data']['name'] == sample_preset_data['name']
    
    def test_get_filter_preset_not_found(self, client, auth_headers):
        """Test getting non-existent filter preset."""
        response = client.get('/api/v1/filter-presets/999', headers=auth_headers)
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'not found' in data['message']
    
    def test_update_filter_preset(self, client, auth_headers, sample_preset_data):
        """Test updating a filter preset."""
        # Create preset first
        create_response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        preset_id = create_response.get_json()['data']['id']
        
        # Update preset
        update_data = {
            'name': 'Updated Rock Songs',
            'description': 'Updated description',
            'is_public': True
        }
        
        response = client.put(
            f'/api/v1/filter-presets/{preset_id}',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(update_data)
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['name'] == 'Updated Rock Songs'
        assert data['data']['is_public'] == True
    
    def test_delete_filter_preset(self, client, auth_headers, sample_preset_data):
        """Test deleting a filter preset."""
        # Create preset first
        create_response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        preset_id = create_response.get_json()['data']['id']
        
        # Delete preset
        response = client.delete(f'/api/v1/filter-presets/{preset_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'deleted successfully' in data['message']
        
        # Verify preset is deleted
        get_response = client.get(f'/api/v1/filter-presets/{preset_id}', headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_filter_preset_sharing(self, client, auth_headers, sample_preset_data, app):
        """Test sharing filter preset with another user."""
        with app.app_context():
            # Create second user
            user2 = User(email='user2@example.com', password='testpass123')
            db.session.add(user2)
            db.session.commit()
        
        # Create preset
        create_response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        preset_id = create_response.get_json()['data']['id']
        
        # Share preset with user2
        share_data = {'user_email': 'user2@example.com'}
        response = client.post(
            f'/api/v1/filter-presets/{preset_id}/share',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(share_data)
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'shared with user2@example.com' in data['message']
    
    def test_unauthorized_access(self, client, sample_preset_data):
        """Test accessing filter presets without authentication."""
        response = client.get('/api/v1/filter-presets')
        assert response.status_code == 401
        
        response = client.post(
            '/api/v1/filter-presets',
            headers={'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        assert response.status_code == 401


class TestFilterPresetValidation:
    """Test filter preset validation logic."""
    
    def test_invalid_filter_config(self, client, auth_headers):
        """Test creating preset with invalid filter configuration."""
        preset_data = {
            'name': 'Invalid Preset',
            'filter_config': {
                'invalid_field': 'invalid_value',
                'genre': 'Rock'
            }
        }
        
        response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(preset_data)
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Invalid filter fields' in data['message']
    
    def test_filter_config_validation_success(self, client, auth_headers):
        """Test creating preset with valid filter configuration."""
        preset_data = {
            'name': 'Valid Preset',
            'filter_config': {
                'q': 'test search',
                'genre': 'Rock',
                'key': 'C',
                'difficulty': 'intermediate',
                'language': 'en',
                'tags': ['rock', 'electric'],
                'categories': ['popular'],
                'minTempo': 80,
                'maxTempo': 120,
                'timeSignature': '4/4',
                'dateRange': {'from': '2024-01-01', 'to': '2024-12-31'},
                'includePublic': True,
                'combineMode': 'AND'
            }
        }
        
        response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(preset_data)
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'


class TestFilterPresetPermissions:
    """Test filter preset permission handling."""
    
    def test_owner_permissions(self, client, auth_headers, sample_preset_data):
        """Test that preset owner has full access."""
        # Create preset
        create_response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        preset_id = create_response.get_json()['data']['id']
        
        # Owner should be able to read, update, and delete
        get_response = client.get(f'/api/v1/filter-presets/{preset_id}', headers=auth_headers)
        assert get_response.status_code == 200
        
        update_response = client.put(
            f'/api/v1/filter-presets/{preset_id}',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps({'name': 'Updated Name'})
        )
        assert update_response.status_code == 200
        
        delete_response = client.delete(f'/api/v1/filter-presets/{preset_id}', headers=auth_headers)
        assert delete_response.status_code == 200
    
    def test_public_preset_access(self, client, auth_headers, sample_preset_data, app):
        """Test that public presets are accessible to all users."""
        # Create public preset
        sample_preset_data['is_public'] = True
        create_response = client.post(
            '/api/v1/filter-presets',
            headers={**auth_headers, 'Content-Type': 'application/json'},
            data=json.dumps(sample_preset_data)
        )
        preset_id = create_response.get_json()['data']['id']
        
        # Create second user and get their auth headers
        with app.app_context():
            user2 = User(email='user2@example.com', password='testpass123')
            db.session.add(user2)
            db.session.commit()
            
            from chordme.utils import generate_jwt_token
            token2 = generate_jwt_token(user2.id)
            auth_headers2 = {'Authorization': f'Bearer {token2}'}
        
        # Second user should be able to access public preset
        response = client.get(f'/api/v1/filter-presets/{preset_id}', headers=auth_headers2)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['data']['id'] == preset_id