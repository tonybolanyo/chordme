#!/usr/bin/env python3
"""
Test script for comprehensive analytics dashboard API
"""

import requests
import json
import time

def test_comprehensive_analytics_api():
    """Test the comprehensive analytics API endpoints."""
    
    # Base URL for the API
    base_url = "http://localhost:5000"
    
    # Test endpoints
    endpoints = [
        "/api/v1/analytics/comprehensive/dashboard",
        "/api/v1/analytics/comprehensive/user-activity", 
        "/api/v1/analytics/comprehensive/song-popularity",
        "/api/v1/analytics/comprehensive/collaboration-patterns",
        "/api/v1/analytics/comprehensive/widgets/config"
    ]
    
    print("Testing Comprehensive Analytics API endpoints...")
    print("=" * 60)
    
    for endpoint in endpoints:
        print(f"\n🔍 Testing: {endpoint}")
        
        try:
            # Make request without authentication (will fail but shows endpoint exists)
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            
            if response.status_code == 401:
                print(f"✅ Endpoint exists - Authentication required (expected)")
            elif response.status_code == 404:
                print(f"❌ Endpoint not found - Check routing")
            else:
                print(f"✅ Endpoint responds with status: {response.status_code}")
                
        except requests.exceptions.ConnectRefused:
            print(f"❌ Connection refused - Flask server not running")
            return False
        except requests.exceptions.Timeout:
            print(f"⚠️  Timeout - Server may be slow")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("✨ Comprehensive Analytics API test completed!")
    return True

def test_health_endpoint():
    """Test basic health endpoint to verify server is running."""
    try:
        response = requests.get("http://localhost:5000/api/v1/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint OK - Server is running")
            return True
        else:
            print(f"⚠️  Health endpoint returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Comprehensive Analytics Dashboard - API Test")
    print("=" * 60)
    
    # Test basic health first
    if test_health_endpoint():
        test_comprehensive_analytics_api()
    else:
        print("\n💡 To test the API, start the Flask server:")
        print("   cd backend && FLASK_DEBUG=1 python run.py")
        
    print("\n🎯 Next steps:")
    print("1. Start the Flask server to test API endpoints")
    print("2. Create test user and authentication")
    print("3. Test dashboard frontend component")
    print("4. Test real-time WebSocket updates")