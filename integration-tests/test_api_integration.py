"""
Integration tests for ChordMe API endpoints.
Tests the API functionality with real HTTP requests.
"""
import requests
import pytest
import json
import time
import uuid
import subprocess
import signal
import os
import sys
from typing import Dict, Any

# Base URL for the API
BASE_URL = "http://localhost:5000"

class TestAPIIntegration:
    """Integration tests for the ChordMe API."""
    
    server_process = None
    
    @classmethod
    def setup_class(cls):
        """Setup for the test class - start backend server if needed."""
        # Check if server is already running
        try:
            response = requests.get(f"{BASE_URL}/api/v1/health", timeout=2)
            if response.status_code == 200:
                print("Backend server already running")
                return
        except requests.exceptions.RequestException:
            pass
        
        # Try to start the server for CI/local testing
        backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
        if os.path.exists(backend_dir):
            try:
                # Set up environment
                env = os.environ.copy()
                env['FLASK_CONFIG'] = 'test_config'
                
                # Start the server
                cls.server_process = subprocess.Popen(
                    [sys.executable, "run.py"],
                    cwd=backend_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Wait for server to start
                for _ in range(30):  # Wait up to 30 seconds
                    try:
                        response = requests.get(f"{BASE_URL}/api/v1/health", timeout=1)
                        if response.status_code == 200:
                            print("Backend server started successfully")
                            return
                    except requests.exceptions.RequestException:
                        pass
                    time.sleep(1)
                
                # If we get here, server didn't start
                if cls.server_process:
                    cls.server_process.terminate()
                    cls.server_process = None
                
            except Exception as e:
                print(f"Failed to start backend server: {e}")
                if cls.server_process:
                    cls.server_process.terminate()
                    cls.server_process = None
    
    @classmethod
    def teardown_class(cls):
        """Cleanup - stop the server if we started it."""
        if cls.server_process:
            cls.server_process.terminate()
            cls.server_process.wait()
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Setup for each test method."""
        # Wait a bit to ensure the server is ready
        time.sleep(0.1)
    
    def create_user_data(self):
        """Create unique user data for testing."""
        return {
            "email": f"test_{uuid.uuid4()}@example.com",
            "password": "TestPassword123!"
        }
    
    def test_health_endpoint(self):
        """Test that the health endpoint is accessible."""
        try:
            response = requests.get(f"{BASE_URL}/api/v1/health")
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert data["status"] == "ok"
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_user_registration_and_login_flow(self):
        """Test complete user registration and login flow."""
        try:
            # Test data
            user_data = {
                "email": f"test_{uuid.uuid4()}@example.com",
                "password": "TestPassword123!"
            }
            
            # 1. Register a new user
            register_response = requests.post(
                f"{BASE_URL}/api/v1/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert register_response.status_code == 201
            register_data = register_response.json()
            assert "message" in register_data
            assert "data" in register_data
            assert register_data["data"]["email"] == user_data["email"]
            
            # 2. Login with the registered user
            login_response = requests.post(
                f"{BASE_URL}/api/v1/auth/login",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert login_response.status_code == 200
            login_data = login_response.json()
            assert "data" in login_data
            assert "token" in login_data["data"]
            assert "user" in login_data["data"]
            assert login_data["data"]["user"]["email"] == user_data["email"]
            
            # Store token for subsequent requests
            token = login_data["data"]["token"]
            
            # 3. Test authenticated request (songs list)
            auth_headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            songs_response = requests.get(
                f"{BASE_URL}/api/v1/songs",
                headers=auth_headers
            )
            
            assert songs_response.status_code == 200
            songs_data = songs_response.json()
            assert isinstance(songs_data["data"]["songs"], list)
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_invalid_registration_data(self):
        """Test registration with invalid data."""
        try:
            # Test invalid email
            invalid_email_data = {
                "email": "invalid-email",
                "password": "ValidPassword123!"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/v1/auth/register",
                json=invalid_email_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 400
            
            # Test missing password
            missing_password_data = {
                "email": "valid@example.com"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/v1/auth/register",
                json=missing_password_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 400
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_invalid_login_data(self):
        """Test login with invalid credentials."""
        try:
            invalid_credentials = {
                "email": "nonexistent@example.com",
                "password": "WrongPassword123!"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/v1/auth/login",
                json=invalid_credentials,
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 401
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication."""
        try:
            response = requests.get(f"{BASE_URL}/api/v1/songs")
            assert response.status_code == 401
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")
        
    def test_song_creation_flow(self):
        """Test creating a song with proper authentication."""
        try:
            # First, register and login a user
            user_data = self.create_user_data()
            
            # Register
            requests.post(
                f"{BASE_URL}/api/v1/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            # Login
            login_response = requests.post(
                f"{BASE_URL}/api/v1/auth/login",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            token = login_response.json()["data"]["token"]
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
                f"{BASE_URL}/api/v1/songs",
                json=song_data,
                headers=auth_headers
            )
            
            assert create_response.status_code == 201
            created_song = create_response.json()
            assert "id" in created_song["data"]
            assert created_song["data"]["title"] == song_data["title"]
            assert created_song["data"]["content"] == song_data["content"]
            
            # Retrieve the created song
            song_id = created_song["data"]["id"]
            get_response = requests.get(
                f"{BASE_URL}/api/v1/songs/{song_id}",
                headers=auth_headers
            )
            
            assert get_response.status_code == 200
            retrieved_song = get_response.json()
            assert retrieved_song["data"]["id"] == song_id
            assert retrieved_song["data"]["title"] == song_data["title"]
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend server not available at localhost:5000")