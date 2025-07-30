"""
Integration tests for ChordMe API endpoints.
Tests the API functionality with real HTTP requests.
"""
import requests
import pytest
import json
import time
from typing import Dict, Any

# Base URL for the API
BASE_URL = "http://localhost:5000"

class TestAPIIntegration:
    """Integration tests for the ChordMe API."""
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Setup for each test method."""
        # Wait a bit to ensure the server is ready
        time.sleep(0.1)
    
    def test_health_endpoint(self):
        """Test that the health endpoint is accessible."""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
    
    def test_user_registration_and_login_flow(self):
        """Test complete user registration and login flow."""
        # Test data
        user_data = {
            "email": f"test_{int(time.time())}@example.com",
            "password": "TestPassword123!"
        }
        
        # 1. Register a new user
        register_response = requests.post(
            f"{BASE_URL}/api/register",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert register_response.status_code == 201
        register_data = register_response.json()
        assert "message" in register_data
        assert "user" in register_data
        assert register_data["user"]["email"] == user_data["email"]
        
        # 2. Login with the registered user
        login_response = requests.post(
            f"{BASE_URL}/api/login",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "token" in login_data
        assert "user" in login_data
        assert login_data["user"]["email"] == user_data["email"]
        
        # Store token for subsequent requests
        token = login_data["token"]
        
        # 3. Test authenticated request (songs list)
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        songs_response = requests.get(
            f"{BASE_URL}/api/songs",
            headers=auth_headers
        )
        
        assert songs_response.status_code == 200
        songs_data = songs_response.json()
        assert isinstance(songs_data, list)
    
    def test_invalid_registration_data(self):
        """Test registration with invalid data."""
        # Test invalid email
        invalid_email_data = {
            "email": "invalid-email",
            "password": "ValidPassword123!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/register",
            json=invalid_email_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        
        # Test missing password
        missing_password_data = {
            "email": "valid@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/register",
            json=missing_password_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
    
    def test_invalid_login_data(self):
        """Test login with invalid credentials."""
        invalid_credentials = {
            "email": "nonexistent@example.com",
            "password": "WrongPassword123!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/login",
            json=invalid_credentials,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication."""
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 401
        
    def test_song_creation_flow(self):
        """Test creating a song with proper authentication."""
        # First, register and login a user
        user_data = {
            "email": f"songwriter_{int(time.time())}@example.com",
            "password": "TestPassword123!"
        }
        
        # Register
        requests.post(
            f"{BASE_URL}/api/register",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/login",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        token = login_response.json()["token"]
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Create a song
        song_data = {
            "title": "Test Song",
            "content": "{title: Test Song}\n{artist: Test Artist}\n\n[Am]This is a test [F]song",
            "is_public": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/songs",
            json=song_data,
            headers=auth_headers
        )
        
        assert create_response.status_code == 201
        created_song = create_response.json()
        assert "id" in created_song
        assert created_song["title"] == song_data["title"]
        assert created_song["content"] == song_data["content"]
        
        # Retrieve the created song
        song_id = created_song["id"]
        get_response = requests.get(
            f"{BASE_URL}/api/songs/{song_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        retrieved_song = get_response.json()
        assert retrieved_song["id"] == song_id
        assert retrieved_song["title"] == song_data["title"]