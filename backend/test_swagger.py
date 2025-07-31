#!/usr/bin/env python3
"""
Test script to verify the Swagger API documentation is working correctly.
"""

import requests
import json
import time
import subprocess
import sys
import os
from pathlib import Path

def test_swagger_docs():
    """Test that Swagger documentation is accessible and valid."""
    print("Testing Swagger API documentation...")
    
    # Start Flask server
    backend_dir = Path(__file__).parent
    env = os.environ.copy()
    env['FLASK_CONFIG'] = 'config'
    env['FLASK_HOST'] = '127.0.0.1'
    env['FLASK_PORT'] = '5556'
    
    process = subprocess.Popen(
        [sys.executable, 'run.py'],
        cwd=backend_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    server_url = "http://127.0.0.1:5556"
    
    try:
        # Wait for server to start
        print("Starting Flask server...")
        time.sleep(3)
        
        # Test health endpoint
        print("Testing health endpoint...")
        response = requests.get(f"{server_url}/api/v1/health", timeout=5)
        assert response.status_code == 200
        health_data = response.json()
        assert health_data['status'] == 'ok'
        print("✅ Health endpoint working")
        
        # Test Swagger JSON
        print("Testing Swagger JSON endpoint...")
        response = requests.get(f"{server_url}/apispec.json", timeout=5)
        assert response.status_code == 200
        swagger_data = response.json()
        
        # Validate Swagger JSON structure
        assert 'swagger' in swagger_data
        assert 'info' in swagger_data
        assert 'paths' in swagger_data
        assert 'definitions' in swagger_data
        
        # Check some key endpoints are documented
        paths = swagger_data['paths']
        assert '/health' in paths
        assert '/auth/login' in paths
        assert '/auth/register' in paths
        assert '/songs' in paths
        
        print("✅ Swagger JSON is valid")
        
        # Test Swagger UI
        print("Testing Swagger UI endpoint...")
        response = requests.get(f"{server_url}/apidocs/", timeout=5)
        assert response.status_code == 200
        assert 'Flasgger' in response.text or 'Swagger' in response.text
        print("✅ Swagger UI is accessible")
        
        print("\n🎉 All API documentation tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
        
    finally:
        # Stop Flask server
        print("\nStopping Flask server...")
        try:
            process.terminate()
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()

if __name__ == "__main__":
    success = test_swagger_docs()
    sys.exit(0 if success else 1)