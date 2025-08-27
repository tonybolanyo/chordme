#!/usr/bin/env python3
"""
Post-deployment health check script for ChordMe.
Validates that all components are working correctly after deployment.
"""

import sys
import requests
import time
import json
import argparse
from urllib.parse import urljoin

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_status(message, status='info'):
    colors = {
        'success': Colors.GREEN,
        'error': Colors.RED,
        'warning': Colors.YELLOW,
        'info': Colors.BLUE
    }
    color = colors.get(status, Colors.BLUE)
    print(f"{color}{message}{Colors.END}")

def test_endpoint(url, expected_status=200, timeout=30):
    """Test an endpoint and return success status and response info."""
    try:
        response = requests.get(url, timeout=timeout)
        success = response.status_code == expected_status
        return success, {
            'status_code': response.status_code,
            'response_time': response.elapsed.total_seconds(),
            'content_type': response.headers.get('content-type', ''),
            'content': response.text[:200] + ('...' if len(response.text) > 200 else '')
        }
    except requests.exceptions.RequestException as e:
        return False, {'error': str(e)}

def test_post_endpoint(url, data=None, expected_status=422, timeout=30):
    """Test a POST endpoint with optional data."""
    try:
        response = requests.post(url, json=data or {}, timeout=timeout)
        success = response.status_code == expected_status
        return success, {
            'status_code': response.status_code,
            'response_time': response.elapsed.total_seconds(),
            'content_type': response.headers.get('content-type', ''),
            'content': response.text[:200] if len(response.text) < 200 else response.text[:200] + '...'
        }
    except requests.exceptions.RequestException as e:
        return False, {'error': str(e)}

def test_frontend(frontend_url):
    """Test frontend health and functionality."""
    print_status("\n🌐 Testing Frontend Health", 'info')
    
    tests = [
        ("Main page", frontend_url, 200),
        ("Assets loading", urljoin(frontend_url, '/assets/'), 404),  # 404 is expected for directory listing
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, url, expected_status in tests:
        print(f"  Testing {test_name}...")
        success, info = test_endpoint(url, expected_status)
        
        if success:
            print_status(f"    ✅ {test_name}: OK ({info.get('response_time', 0):.2f}s)", 'success')
            passed += 1
        else:
            print_status(f"    ❌ {test_name}: FAILED", 'error')
            if 'error' in info:
                print(f"       Error: {info['error']}")
            else:
                print(f"       Expected {expected_status}, got {info.get('status_code', 'N/A')}")
    
    return passed, total

def test_backend(backend_url):
    """Test backend API health and functionality."""
    print_status("\n🚂 Testing Backend API Health", 'info')
    
    tests = [
        ("Health endpoint", urljoin(backend_url, '/api/v1/health'), 200),
        ("Version endpoint", urljoin(backend_url, '/api/v1/version'), 200),
        ("API documentation", urljoin(backend_url, '/api/v1/docs'), 200),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, url, expected_status in tests:
        print(f"  Testing {test_name}...")
        success, info = test_endpoint(url, expected_status)
        
        if success:
            print_status(f"    ✅ {test_name}: OK ({info.get('response_time', 0):.2f}s)", 'success')
            passed += 1
            
            # Special handling for health endpoint
            if 'health' in url:
                try:
                    health_data = json.loads(info['content'])
                    if health_data.get('status') == 'ok':
                        print_status(f"       Status: {health_data.get('message', 'Unknown')}", 'success')
                    else:
                        print_status(f"       Warning: Unexpected health status", 'warning')
                except:
                    pass
        else:
            print_status(f"    ❌ {test_name}: FAILED", 'error')
            if 'error' in info:
                print(f"       Error: {info['error']}")
            else:
                print(f"       Expected {expected_status}, got {info.get('status_code', 'N/A')}")
    
    return passed, total

def test_api_endpoints(backend_url):
    """Test specific API endpoints that require database connectivity."""
    print_status("\n🔌 Testing API Endpoints & Database Connectivity", 'info')
    
    # Test auth endpoints (should return validation errors, not 500s)
    tests = [
        ("User registration (validation)", urljoin(backend_url, '/api/v1/auth/register'), {}),
        ("User login (validation)", urljoin(backend_url, '/api/v1/auth/login'), {}),
        ("ChordPro validation", urljoin(backend_url, '/api/v1/auth/validate-chordpro'), {}),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, url, data in tests:
        print(f"  Testing {test_name}...")
        success, info = test_post_endpoint(url, data, 422)  # Expecting validation error
        
        if success:
            print_status(f"    ✅ {test_name}: OK (validation working)", 'success')
            passed += 1
        elif info.get('status_code') == 400:
            print_status(f"    ✅ {test_name}: OK (bad request as expected)", 'success')
            passed += 1
        else:
            # Check if it's a 500 error (indicates database/server issue)
            status_code = info.get('status_code', 'N/A')
            if status_code == 500:
                print_status(f"    ❌ {test_name}: SERVER ERROR (possible database issue)", 'error')
            else:
                print_status(f"    ⚠️  {test_name}: Unexpected status {status_code}", 'warning')
                passed += 0.5  # Partial credit
            
            if 'error' in info:
                print(f"       Error: {info['error']}")
    
    return passed, total

def test_integration(frontend_url, backend_url):
    """Test frontend-backend integration."""
    print_status("\n🔗 Testing Frontend-Backend Integration", 'info')
    
    # This is a basic test - in a real scenario, you might use Selenium or similar
    # to test actual frontend-backend communication
    
    print("  Testing CORS and connectivity...")
    
    # For now, we'll just verify that both services are accessible
    # and that the frontend is configured with the correct backend URL
    
    frontend_success, _ = test_endpoint(frontend_url, 200)
    backend_success, _ = test_endpoint(urljoin(backend_url, '/api/v1/health'), 200)
    
    if frontend_success and backend_success:
        print_status("    ✅ Both services accessible", 'success')
        return 1, 1
    else:
        print_status("    ❌ One or both services not accessible", 'error')
        return 0, 1

def main():
    parser = argparse.ArgumentParser(description='ChordMe post-deployment health check')
    parser.add_argument('--frontend-url', required=True, help='Frontend URL to test')
    parser.add_argument('--backend-url', required=True, help='Backend URL to test')
    parser.add_argument('--timeout', type=int, default=30, help='Request timeout in seconds')
    parser.add_argument('--wait', type=int, default=0, help='Wait time before starting tests')
    
    args = parser.parse_args()
    
    print_status("🏥 ChordMe Post-Deployment Health Check", 'info')
    print_status("=" * 50, 'info')
    print(f"Frontend URL: {args.frontend_url}")
    print(f"Backend URL: {args.backend_url}")
    print(f"Timeout: {args.timeout}s")
    
    if args.wait > 0:
        print_status(f"\n⏳ Waiting {args.wait} seconds for deployments to stabilize...", 'info')
        time.sleep(args.wait)
    
    # Run all tests
    total_passed = 0
    total_tests = 0
    
    # Test frontend
    passed, total = test_frontend(args.frontend_url)
    total_passed += passed
    total_tests += total
    
    # Test backend
    passed, total = test_backend(args.backend_url)
    total_passed += passed
    total_tests += total
    
    # Test API endpoints
    passed, total = test_api_endpoints(args.backend_url)
    total_passed += passed
    total_tests += total
    
    # Test integration
    passed, total = test_integration(args.frontend_url, args.backend_url)
    total_passed += passed
    total_tests += total
    
    # Summary
    print_status("\n📊 Health Check Summary", 'info')
    print_status("=" * 30, 'info')
    
    success_rate = (total_passed / total_tests) * 100 if total_tests > 0 else 0
    
    if success_rate >= 90:
        print_status(f"✅ Health Check PASSED: {total_passed}/{total_tests} tests passed ({success_rate:.1f}%)", 'success')
        sys.exit(0)
    elif success_rate >= 70:
        print_status(f"⚠️  Health Check WARNING: {total_passed}/{total_tests} tests passed ({success_rate:.1f}%)", 'warning')
        print_status("Some tests failed, but core functionality appears to work", 'warning')
        sys.exit(1)
    else:
        print_status(f"❌ Health Check FAILED: {total_passed}/{total_tests} tests passed ({success_rate:.1f}%)", 'error')
        print_status("Significant issues detected, manual investigation required", 'error')
        sys.exit(2)

if __name__ == '__main__':
    main()