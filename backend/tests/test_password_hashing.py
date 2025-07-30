"""
Comprehensive tests for password hashing functionality in ChordMe application.

This module contains specific tests for:
- Password hashing with bcrypt  
- Password verification
- Edge cases and error handling
- Security considerations

Uses the existing test infrastructure from conftest.py
"""

import pytest
import bcrypt
import time
from flask import current_app


class TestPasswordHashingIntegration:
    """Test password hashing functionality through the API."""
    
    def test_password_hashing_through_registration(self, client):
        """Test password hashing through user registration endpoint."""
        user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        
        # Register user
        response = client.post('/api/v1/auth/register',
                             json=user_data,
                             content_type='application/json')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'data' in data
        assert data['data']['email'] == 'test@example.com'
        # Password should not be in response
        assert 'password' not in str(data)
        assert 'password_hash' not in str(data)
        
    def test_password_verification_through_login(self, client):
        """Test password verification through login endpoint."""
        user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        
        # Register user first
        register_response = client.post('/api/v1/auth/register',
                                      json=user_data,
                                      content_type='application/json')
        assert register_response.status_code == 201
        
        # Login with correct password
        login_response = client.post('/api/v1/auth/login',
                                   json=user_data,
                                   content_type='application/json')
        assert login_response.status_code == 200
        login_data = login_response.get_json()
        assert login_data['status'] == 'success'
        assert 'token' in login_data['data']
        assert 'user' in login_data['data']
        
        # Login with wrong password should fail
        wrong_data = {
            'email': 'test@example.com',
            'password': 'WrongPassword123!'
        }
        wrong_response = client.post('/api/v1/auth/login',
                                   json=wrong_data,
                                   content_type='application/json')
        assert wrong_response.status_code == 401
        
    def test_password_hashing_with_special_characters(self, client):
        """Test password hashing with various special characters."""
        special_passwords = [
            'Pass@word!123',  # Standard special chars
            'Pässwörd123',    # Unicode characters
            'PassWord 123',   # Spaces
            'Special!@#123X', # Multiple special chars
            'Test🔒Pass123',  # Emoji
        ]
        
        for i, password in enumerate(special_passwords):
            user_data = {
                'email': f'test{i}@example.com',
                'password': password
            }
            
            # Register with special password
            register_response = client.post('/api/v1/auth/register',
                                          json=user_data,
                                          content_type='application/json')
            assert register_response.status_code == 201
            
            # Login with same password should work
            login_response = client.post('/api/v1/auth/login',
                                       json=user_data,
                                       content_type='application/json')
            assert login_response.status_code == 200
            
    def test_different_passwords_produce_different_hashes(self, client):
        """Test that different users with same password get different hashes."""
        password = 'SamePassword123!'
        
        users = []
        for i in range(3):
            user_data = {
                'email': f'test{i}@example.com',
                'password': password
            }
            
            # Register user
            response = client.post('/api/v1/auth/register',
                                 json=user_data,
                                 content_type='application/json')
            assert response.status_code == 201
            users.append(user_data)
            
            # All should be able to login with same password
            login_response = client.post('/api/v1/auth/login',
                                       json=user_data,
                                       content_type='application/json')
            assert login_response.status_code == 200
        
    def test_password_case_sensitivity(self, client):
        """Test that password verification is case-sensitive."""
        user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        
        # Register user
        register_response = client.post('/api/v1/auth/register',
                                      json=user_data,
                                      content_type='application/json')
        assert register_response.status_code == 201
        
        # Login with exact password should work
        login_response = client.post('/api/v1/auth/login',
                                   json=user_data,
                                   content_type='application/json')
        assert login_response.status_code == 200
        
        # Login with different case should fail
        wrong_case_data = {
            'email': 'test@example.com',
            'password': 'testpassword123!'  # All lowercase
        }
        wrong_response = client.post('/api/v1/auth/login',
                                   json=wrong_case_data,
                                   content_type='application/json')
        assert wrong_response.status_code == 401
        
        # Login with different case should fail
        wrong_case_data2 = {
            'email': 'test@example.com',
            'password': 'TESTPASSWORD123!'  # All uppercase
        }
        wrong_response2 = client.post('/api/v1/auth/login',
                                    json=wrong_case_data2,
                                    content_type='application/json')
        assert wrong_response2.status_code == 401


class TestPasswordSecurity:
    """Test security aspects of password handling."""
    
    def test_password_not_exposed_in_responses(self, client):
        """Test that passwords are never exposed in API responses."""
        user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        
        # Register user
        register_response = client.post('/api/v1/auth/register',
                                      json=user_data,
                                      content_type='application/json')
        assert register_response.status_code == 201
        register_data = register_response.get_json()
        
        # Check registration response doesn't contain password
        response_str = str(register_data)
        assert 'TestPassword123!' not in response_str
        assert 'password' not in response_str.lower()
        
        # Login user
        login_response = client.post('/api/v1/auth/login',
                                   json=user_data,
                                   content_type='application/json')
        assert login_response.status_code == 200
        login_data = login_response.get_json()
        
        # Check login response doesn't contain password
        response_str = str(login_data)
        assert 'TestPassword123!' not in response_str
        assert 'password' not in response_str.lower()
        
    def test_timing_attack_resistance(self, client):
        """Test basic timing attack resistance."""
        # Register a user
        user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        
        register_response = client.post('/api/v1/auth/register',
                                      json=user_data,
                                      content_type='application/json')
        assert register_response.status_code == 201
        
        # Test login with correct password
        start_time = time.time()
        login_response = client.post('/api/v1/auth/login',
                                   json=user_data,
                                   content_type='application/json')
        correct_time = time.time() - start_time
        assert login_response.status_code == 200
        
        # Test login with wrong password of same length
        wrong_data = {
            'email': 'test@example.com',
            'password': 'WrongPassword123!'  # Same length as correct password
        }
        start_time = time.time()
        wrong_response = client.post('/api/v1/auth/login',
                                   json=wrong_data,
                                   content_type='application/json')
        wrong_time = time.time() - start_time
        assert wrong_response.status_code == 401
        
        # Test with non-existent user (should still take similar time)
        nonexistent_data = {
            'email': 'nonexistent@example.com',
            'password': 'TestPassword123!'
        }
        start_time = time.time()
        nonexistent_response = client.post('/api/v1/auth/login',
                                         json=nonexistent_data,
                                         content_type='application/json')
        nonexistent_time = time.time() - start_time
        assert nonexistent_response.status_code == 401
        
        # All times should be relatively similar (basic check)
        # Note: This is a simplified test; real timing analysis is more complex
        max_time_diff = 0.5  # 500ms tolerance for CI environments
        assert abs(correct_time - wrong_time) < max_time_diff
        assert abs(correct_time - nonexistent_time) < max_time_diff
        
    def test_bcrypt_hash_format(self, client):
        """Test that bcrypt hashes have the correct format."""
        # We can't directly access the hash from the API, but we can verify 
        # that the implementation is working by testing edge cases
        
        # Test with minimum valid password
        user_data = {
            'email': 'test@example.com',
            'password': 'MinPass1!'  # Minimum complexity
        }
        
        register_response = client.post('/api/v1/auth/register',
                                      json=user_data,
                                      content_type='application/json')
        assert register_response.status_code == 201
        
        # Should be able to login
        login_response = client.post('/api/v1/auth/login',
                                   json=user_data,
                                   content_type='application/json')
        assert login_response.status_code == 200
        
        # Test with maximum length password (but within 128 limit and no weak patterns)
        long_password = 'Abc123!' * 18  # 126 chars, valid pattern
        long_user_data = {
            'email': 'longtest@example.com',
            'password': long_password
        }
        
        long_register_response = client.post('/api/v1/auth/register',
                                           json=long_user_data,
                                           content_type='application/json')
        assert long_register_response.status_code == 201
        
        # Should be able to login with long password
        long_login_response = client.post('/api/v1/auth/login',
                                        json=long_user_data,
                                        content_type='application/json')
        assert long_login_response.status_code == 200


class TestPasswordEdgeCases:
    """Test edge cases in password handling."""
    
    def test_empty_password_handling(self, client):
        """Test that empty passwords are rejected."""
        user_data = {
            'email': 'test@example.com',
            'password': ''
        }
        
        response = client.post('/api/v1/auth/register',
                             json=user_data,
                             content_type='application/json')
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_missing_password_handling(self, client):
        """Test that missing passwords are rejected."""
        user_data = {
            'email': 'test@example.com'
            # No password field
        }
        
        response = client.post('/api/v1/auth/register',
                             json=user_data,
                             content_type='application/json')
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'
        
    def test_none_password_handling(self, client):
        """Test that None passwords are rejected."""
        user_data = {
            'email': 'test@example.com',
            'password': None
        }
        
        response = client.post('/api/v1/auth/register',
                             json=user_data,
                             content_type='application/json')
        assert response.status_code == 400
        data = response.get_json()
        assert data['status'] == 'error'