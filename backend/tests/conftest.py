"""Test configuration and fixtures for ChordMe tests."""

import pytest
import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)


@pytest.fixture
def app():
    """Create a test app instance using the real application."""
    # Import the real application
    from chordme import app, db
    
    # Configure for testing
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['HTTPS_ENFORCED'] = False  # Disable HTTPS enforcement in tests
    
    with app.app_context():
        # Create all tables
        db.create_all()
        try:
            yield app
        finally:
            # Clean up after test
            db.session.remove()
            db.drop_all()


@pytest.fixture
def client():
    """Create a test client using the real application."""
    # Import the real application
    from chordme import app, db
    
    # Configure for testing
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['HTTPS_ENFORCED'] = False  # Disable HTTPS enforcement in tests
    
    with app.test_client() as client:
        with app.app_context():
            # Create all tables
            db.create_all()
            try:
                yield client
            finally:
                # Clean up after test
                db.session.remove()
                db.drop_all()



@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        'email': 'test@example.com',
        'password': 'TestPassword123'
    }


@pytest.fixture
def invalid_emails():
    """List of invalid email formats for testing."""
    return [
        '',
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid.com',
        'test@',
        'test@.com',
        'test@domain',
        'a' * 120 + '@example.com',  # Too long
    ]


@pytest.fixture
def invalid_passwords():
    """List of invalid passwords for testing."""
    return [
        '',
        'short',
        'toolong' * 20,  # Too long
        'nouppercase123',
        'NOLOWERCASE123',
        'NoNumbers',
        'NoDigits!',
    ]


@pytest.fixture
def valid_user_variations():
    """Various valid user data for testing."""
    return [
        {'email': 'user1@example.com', 'password': 'ValidPass123'},
        {'email': 'user2@test.org', 'password': 'AnotherPass456'},
        {'email': 'test.user@domain.co.uk', 'password': 'ComplexPassword789'},
    ]


@pytest.fixture
def auth_token(client):
    """Create a user and return a valid JWT token for testing."""
    import json
    
    # Create a test user
    user_data = {
        'email': 'test@example.com',
        'password': 'TestPassword123'
    }
    
    # Register the user
    response = client.post('/api/v1/auth/register',
                           data=json.dumps(user_data),
                           content_type='application/json')
    
    assert response.status_code == 201
    
    # Login to get the token
    login_response = client.post('/api/v1/auth/login',
                                data=json.dumps(user_data),
                                content_type='application/json')
    
    assert login_response.status_code == 200
    login_data = login_response.get_json()
    
    # Extract token from response data
    token = login_data['data']['token']
    assert token is not None
    
    return token