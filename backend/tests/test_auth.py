"""
Automated tests for authentication endpoints in ChordMe application.

This module contains comprehensive tests for:
- User registration endpoint (/api/v1/auth/register)
- User login endpoint (/api/v1/auth/login)
- Health check endpoint (/api/v1/health)

Test scenarios include:
- Valid operations
- Invalid input validation
- Error handling
- Security considerations
- Edge cases
"""

import pytest
import json
import jwt
from datetime import datetime, timedelta
from chordme.models import User
from chordme import db


class TestHealthEndpoint:
    """Test cases for the health check endpoint."""
    
    def test_health_check(self, client):
        """Test that health endpoint returns successful response."""
        response = client.get('/api/v1/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['message'] == 'Service is running'


class TestUserRegistration:
    """Test cases for user registration endpoint."""
    
    def test_successful_registration(self, client, sample_user_data):
        """Test successful user registration with valid data."""
        response = client.post(
            '/api/v1/auth/register',
            json=sample_user_data,
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'User registered successfully'
        assert 'data' in data
        assert data['data']['email'] == sample_user_data['email']
        assert 'password' not in data['data']  # Password should not be returned
        assert 'id' in data['data']
        assert 'created_at' in data['data']
        assert 'updated_at' in data['data']
    
    def test_registration_with_multiple_valid_users(self, client, valid_user_variations):
        """Test registration with multiple valid user variations."""
        for user_data in valid_user_variations:
            response = client.post(
                '/api/v1/auth/register',
                json=user_data,
                content_type='application/json'
            )
            
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['email'] == user_data['email']
    
    def test_registration_email_normalization(self, client):
        """Test that email is normalized to lowercase."""
        user_data = {
            'email': 'Test.User@EXAMPLE.COM',
            'password': 'TestPassword123'
        }
        
        response = client.post(
            '/api/v1/auth/register',
            json=user_data,
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['email'] == 'test.user@example.com'
    
    def test_registration_no_data(self, client):
        """Test registration fails when no data is provided."""
        response = client.post('/api/v1/auth/register')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'No data provided' in data['error']
    
    def test_registration_empty_json(self, client):
        """Test registration fails with empty JSON data."""
        response = client.post(
            '/api/v1/auth/register',
            json={},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'No data provided' in data['error']
    
    def test_registration_missing_email(self, client):
        """Test registration fails when email is missing."""
        response = client.post(
            '/api/v1/auth/register',
            json={'password': 'TestPassword123'},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Email is required' in data['error']
    
    def test_registration_missing_password(self, client):
        """Test registration fails when password is missing."""
        response = client.post(
            '/api/v1/auth/register',
            json={'email': 'test@example.com'},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Password is required' in data['error']
    
    def test_registration_invalid_emails(self, client, invalid_emails):
        """Test registration fails with various invalid email formats."""
        for invalid_email in invalid_emails:
            response = client.post(
                '/api/v1/auth/register',
                json={'email': invalid_email, 'password': 'TestPassword123'},
                content_type='application/json'
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            # Check for email-related error messages
            error_msg = data['error'].lower()
            assert any(keyword in error_msg for keyword in ['email', 'invalid', 'required', 'format', 'long'])
    
    def test_registration_invalid_passwords(self, client, invalid_passwords):
        """Test registration fails with various invalid passwords."""
        for invalid_password in invalid_passwords:
            response = client.post(
                '/api/v1/auth/register',
                json={'email': 'test@example.com', 'password': invalid_password},
                content_type='application/json'
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'Password' in data['error'] or 'password' in data['error']
    
    def test_registration_duplicate_email(self, client, sample_user_data):
        """Test registration fails when email already exists."""
        # Register first user
        response1 = client.post(
            '/api/v1/auth/register',
            json=sample_user_data,
            content_type='application/json'
        )
        assert response1.status_code == 201
        
        # Try to register with same email
        response2 = client.post(
            '/api/v1/auth/register',
            json=sample_user_data,
            content_type='application/json'
        )
        
        assert response2.status_code == 409
        data = json.loads(response2.data)
        assert data['status'] == 'error'
        assert 'already exists' in data['error']
    
    def test_registration_duplicate_email_case_insensitive(self, client):
        """Test registration fails with duplicate email regardless of case."""
        user_data1 = {'email': 'test@example.com', 'password': 'TestPassword123'}
        user_data2 = {'email': 'TEST@EXAMPLE.COM', 'password': 'TestPassword456'}
        
        # Register first user
        response1 = client.post(
            '/api/v1/auth/register',
            json=user_data1,
            content_type='application/json'
        )
        assert response1.status_code == 201
        
        # Try to register with same email in different case
        response2 = client.post(
            '/api/v1/auth/register',
            json=user_data2,
            content_type='application/json'
        )
        
        assert response2.status_code == 409
        data = json.loads(response2.data)
        assert data['status'] == 'error'
        assert 'already exists' in data['error']


class TestUserLogin:
    """Test cases for user login endpoint."""
    
    def test_successful_login(self, client, sample_user_data):
        """Test successful login with valid credentials."""
        # First register a user
        client.post(
            '/api/v1/auth/register',
            json=sample_user_data,
            content_type='application/json'
        )
        
        # Then login
        response = client.post(
            '/api/v1/auth/login',
            json=sample_user_data,
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['message'] == 'Login successful'
        assert 'data' in data
        assert 'token' in data['data']
        assert 'user' in data['data']
        assert data['data']['user']['email'] == sample_user_data['email']
        assert 'password' not in data['data']['user']
    
    def test_login_jwt_token_validity(self, client):
        """Test that login returns a valid JWT token."""
        # Register a user
        sample_user_data = {'email': 'test@example.com', 'password': 'TestPassword123'}
        client.post(
            '/api/v1/auth/register',
            json=sample_user_data,
            content_type='application/json'
        )
        
        # Login
        response = client.post(
            '/api/v1/auth/login',
            json=sample_user_data,
            content_type='application/json'
        )
        
        data = json.loads(response.data)
        token = data['data']['token']
        
        # Verify token structure and content
        # Import here to avoid circular imports
        from chordme.utils import verify_jwt_token
        decoded_token = verify_jwt_token(token)
        
        # Token should be valid and contain expected fields
        assert decoded_token is not None
        assert 'user_id' in decoded_token
        assert 'exp' in decoded_token
        assert 'iat' in decoded_token
        
        # Check that user_id matches the registered user
        assert decoded_token['user_id'] == data['data']['user']['id']
    
    def test_login_email_normalization(self, client):
        """Test that login works with different email cases."""
        # Register with lowercase
        register_data = {'email': 'test@example.com', 'password': 'TestPassword123'}
        client.post(
            '/api/v1/auth/register',
            json=register_data,
            content_type='application/json'
        )
        
        # Login with uppercase
        login_data = {'email': 'TEST@EXAMPLE.COM', 'password': 'TestPassword123'}
        response = client.post(
            '/api/v1/auth/login',
            json=login_data,
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
    
    def test_login_no_data(self, client):
        """Test login fails when no data is provided."""
        response = client.post('/api/v1/auth/login')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'No data provided' in data['error']
    
    def test_login_empty_json(self, client):
        """Test login fails with empty JSON data."""
        response = client.post(
            '/api/v1/auth/login',
            json={},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'No data provided' in data['error']
    
    def test_login_missing_email(self, client):
        """Test login fails when email is missing."""
        response = client.post(
            '/api/v1/auth/login',
            json={'password': 'TestPassword123'},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Email is required' in data['error']
    
    def test_login_missing_password(self, client):
        """Test login fails when password is missing."""
        response = client.post(
            '/api/v1/auth/login',
            json={'email': 'test@example.com'},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Password is required' in data['error']
    
    def test_login_invalid_email(self, client):
        """Test login fails with non-existent email."""
        response = client.post(
            '/api/v1/auth/login',
            json={'email': 'nonexistent@example.com', 'password': 'TestPassword123'},
            content_type='application/json'
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Invalid email or password' in data['error']
    
    def test_login_invalid_password(self, client, sample_user_data):
        """Test login fails with wrong password."""
        # Register a user
        client.post(
            '/api/v1/auth/register',
            json=sample_user_data,
            content_type='application/json'
        )
        
        # Try to login with wrong password
        login_data = {
            'email': sample_user_data['email'],
            'password': 'WrongPassword123'
        }
        response = client.post(
            '/api/v1/auth/login',
            json=login_data,
            content_type='application/json'
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Invalid email or password' in data['error']
    
    def test_login_empty_email(self, client):
        """Test login fails with empty email."""
        response = client.post(
            '/api/v1/auth/login',
            json={'email': '', 'password': 'TestPassword123'},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Email is required' in data['error']
    
    def test_login_empty_password(self, client):
        """Test login fails with empty password."""
        response = client.post(
            '/api/v1/auth/login',
            json={'email': 'test@example.com', 'password': ''},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Password is required' in data['error']


class TestIntegrationScenarios:
    """Integration test scenarios combining multiple operations."""
    
    def test_register_and_login_flow(self, client, valid_user_variations):
        """Test complete user registration and login flow."""
        for user_data in valid_user_variations:
            # Register user
            register_response = client.post(
                '/api/v1/auth/register',
                json=user_data,
                content_type='application/json'
            )
            assert register_response.status_code == 201
            
            # Login with same credentials
            login_response = client.post(
                '/api/v1/auth/login',
                json=user_data,
                content_type='application/json'
            )
            assert login_response.status_code == 200
            
            # Verify user data consistency
            register_data = json.loads(register_response.data)
            login_data = json.loads(login_response.data)
            
            assert register_data['data']['email'] == login_data['data']['user']['email']
            assert register_data['data']['id'] == login_data['data']['user']['id']
    
    def test_multiple_users_registration_and_login(self, client):
        """Test multiple users can register and login independently."""
        users = [
            {'email': 'user1@example.com', 'password': 'ValidPass123'},
            {'email': 'user2@example.com', 'password': 'StrongPass456'},
            {'email': 'user3@example.com', 'password': 'SecurePass789'},
        ]
        
        user_ids = []
        
        # Register all users
        for user_data in users:
            response = client.post(
                '/api/v1/auth/register',
                json=user_data,
                content_type='application/json'
            )
            assert response.status_code == 201
            data = json.loads(response.data)
            user_ids.append(data['data']['id'])
        
        # Login all users and verify unique tokens
        tokens = []
        for user_data in users:
            response = client.post(
                '/api/v1/auth/login',
                json=user_data,
                content_type='application/json'
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            tokens.append(data['data']['token'])
        
        # Verify all tokens are unique
        assert len(set(tokens)) == len(tokens)
        
        # Verify all user IDs are unique
        assert len(set(user_ids)) == len(user_ids)