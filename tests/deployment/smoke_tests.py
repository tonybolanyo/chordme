"""
Post-Deployment Smoke Tests
Comprehensive validation of critical application functionality after deployment
"""

import requests
import time
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class SmokeTestConfig:
    """Configuration for smoke tests"""
    backend_url: str
    frontend_url: str
    environment: str
    timeout: int = 30


class SmokeTestSuite:
    """Comprehensive post-deployment smoke tests"""
    
    def __init__(self, config: SmokeTestConfig):
        self.config = config
        self.session = requests.Session()
        self.session.timeout = config.timeout
        self.test_results = []
    
    def record_test(self, test_name: str, success: bool, details: Dict[str, Any] = None):
        """Record test result"""
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details or {},
            "timestamp": time.time()
        })
    
    def test_critical_endpoints(self) -> bool:
        """Test critical API endpoints"""
        critical_endpoints = [
            {"path": "/api/v1/health", "method": "GET", "expected_status": 200},
            {"path": "/api/v1/version", "method": "GET", "expected_status": 200},
            {"path": "/api/v1/auth/register", "method": "POST", "expected_status": [400, 422]},  # Bad request without data
            {"path": "/api/v1/auth/login", "method": "POST", "expected_status": [400, 422]},     # Bad request without data
        ]
        
        all_passed = True
        
        for endpoint in critical_endpoints:
            try:
                url = f"{self.config.backend_url.rstrip('/')}{endpoint['path']}"
                
                if endpoint["method"] == "GET":
                    response = self.session.get(url)
                elif endpoint["method"] == "POST":
                    response = self.session.post(url, json={})
                else:
                    continue
                
                expected_statuses = endpoint["expected_status"]
                if isinstance(expected_statuses, int):
                    expected_statuses = [expected_statuses]
                
                success = response.status_code in expected_statuses
                
                self.record_test(
                    f"Endpoint {endpoint['path']}",
                    success,
                    {
                        "url": url,
                        "method": endpoint["method"],
                        "status_code": response.status_code,
                        "expected_status": endpoint["expected_status"],
                        "response_time": response.elapsed.total_seconds()
                    }
                )
                
                if not success:
                    all_passed = False
                    
            except Exception as e:
                self.record_test(
                    f"Endpoint {endpoint['path']}",
                    False,
                    {"error": str(e)}
                )
                all_passed = False
        
        return all_passed
    
    def test_health_endpoint_details(self) -> bool:
        """Test health endpoint response details"""
        try:
            url = f"{self.config.backend_url.rstrip('/')}/api/v1/health"
            response = self.session.get(url)
            
            if response.status_code != 200:
                self.record_test("Health endpoint details", False, {"status_code": response.status_code})
                return False
            
            try:
                data = response.json()
            except json.JSONDecodeError:
                self.record_test("Health endpoint details", False, {"error": "Invalid JSON response"})
                return False
            
            # Check required fields
            required_fields = ["status"]
            optional_fields = ["message", "timestamp", "version", "environment"]
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                self.record_test(
                    "Health endpoint details",
                    False,
                    {"missing_fields": missing_fields}
                )
                return False
            
            # Validate status value
            valid_statuses = ["ok", "healthy", "running"]
            if data["status"] not in valid_statuses:
                self.record_test(
                    "Health endpoint details",
                    False,
                    {"invalid_status": data["status"], "valid_statuses": valid_statuses}
                )
                return False
            
            self.record_test(
                "Health endpoint details",
                True,
                {
                    "response": data,
                    "response_time": response.elapsed.total_seconds(),
                    "has_optional_fields": [field for field in optional_fields if field in data]
                }
            )
            return True
            
        except Exception as e:
            self.record_test("Health endpoint details", False, {"error": str(e)})
            return False
    
    def test_cors_headers(self) -> bool:
        """Test CORS configuration"""
        try:
            url = f"{self.config.backend_url.rstrip('/')}/api/v1/health"
            
            # Test preflight request
            headers = {
                "Origin": self.config.frontend_url,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }
            
            response = self.session.options(url, headers=headers)
            
            cors_headers = {
                key: value for key, value in response.headers.items()
                if key.lower().startswith('access-control-')
            }
            
            # Check for required CORS headers
            required_cors_headers = [
                "access-control-allow-origin",
                "access-control-allow-methods"
            ]
            
            missing_headers = []
            for header in required_cors_headers:
                if header not in [h.lower() for h in cors_headers.keys()]:
                    missing_headers.append(header)
            
            success = len(missing_headers) == 0 and response.status_code in [200, 204]
            
            self.record_test(
                "CORS configuration",
                success,
                {
                    "status_code": response.status_code,
                    "cors_headers": cors_headers,
                    "missing_headers": missing_headers
                }
            )
            
            return success
            
        except Exception as e:
            self.record_test("CORS configuration", False, {"error": str(e)})
            return False
    
    def test_frontend_loading(self) -> bool:
        """Test frontend application loading"""
        try:
            response = self.session.get(self.config.frontend_url)
            
            if response.status_code != 200:
                self.record_test("Frontend loading", False, {"status_code": response.status_code})
                return False
            
            content = response.text.lower()
            
            # Check for React application indicators
            react_indicators = [
                "react",
                "chordme",
                "div id=\"root\"",
                "application/javascript",
                "text/javascript"
            ]
            
            found_indicators = [indicator for indicator in react_indicators if indicator in content]
            
            # Check for critical resources
            has_js = "javascript" in content or ".js" in content
            has_css = "stylesheet" in content or ".css" in content
            
            success = len(found_indicators) >= 2 and has_js
            
            self.record_test(
                "Frontend loading",
                success,
                {
                    "status_code": response.status_code,
                    "content_length": len(response.text),
                    "found_indicators": found_indicators,
                    "has_javascript": has_js,
                    "has_css": has_css,
                    "response_time": response.elapsed.total_seconds()
                }
            )
            
            return success
            
        except Exception as e:
            self.record_test("Frontend loading", False, {"error": str(e)})
            return False
    
    def test_security_headers(self) -> bool:
        """Test security headers"""
        urls_to_test = [
            ("Backend", f"{self.config.backend_url.rstrip('/')}/api/v1/health"),
            ("Frontend", self.config.frontend_url)
        ]
        
        all_passed = True
        
        for name, url in urls_to_test:
            try:
                response = self.session.get(url)
                
                # Security headers to check
                security_headers = {
                    "x-content-type-options": "nosniff",
                    "x-frame-options": ["DENY", "SAMEORIGIN"],
                    "x-xss-protection": "1; mode=block",
                    "strict-transport-security": None,  # Should exist for HTTPS
                    "content-security-policy": None     # Optional but recommended
                }
                
                found_headers = {}
                missing_headers = []
                invalid_headers = []
                
                for header, expected_value in security_headers.items():
                    actual_value = response.headers.get(header)
                    found_headers[header] = actual_value
                    
                    if actual_value is None:
                        missing_headers.append(header)
                    elif expected_value is not None:
                        if isinstance(expected_value, list):
                            if actual_value not in expected_value:
                                invalid_headers.append(f"{header}: {actual_value}")
                        elif expected_value != actual_value:
                            invalid_headers.append(f"{header}: {actual_value}")
                
                # For HTTPS URLs, HSTS should be present
                if url.startswith('https://') and not response.headers.get('strict-transport-security'):
                    missing_headers.append('strict-transport-security (HTTPS)')
                
                success = len(missing_headers) <= 2 and len(invalid_headers) == 0  # Allow some missing headers
                
                self.record_test(
                    f"Security headers - {name}",
                    success,
                    {
                        "url": url,
                        "found_headers": found_headers,
                        "missing_headers": missing_headers,
                        "invalid_headers": invalid_headers
                    }
                )
                
                if not success:
                    all_passed = False
                    
            except Exception as e:
                self.record_test(f"Security headers - {name}", False, {"error": str(e)})
                all_passed = False
        
        return all_passed
    
    def test_response_times(self) -> bool:
        """Test response times for critical endpoints"""
        endpoints_to_test = [
            f"{self.config.backend_url.rstrip('/')}/api/v1/health",
            f"{self.config.backend_url.rstrip('/')}/api/v1/version",
            self.config.frontend_url
        ]
        
        all_passed = True
        response_times = {}
        
        for url in endpoints_to_test:
            try:
                start_time = time.time()
                response = self.session.get(url)
                end_time = time.time()
                
                response_time = end_time - start_time
                response_times[url] = response_time
                
                # Thresholds
                threshold = 5.0 if "frontend" in url else 2.0  # Frontend can be slower due to static assets
                success = response_time < threshold and response.status_code == 200
                
                self.record_test(
                    f"Response time - {url}",
                    success,
                    {
                        "response_time": response_time,
                        "threshold": threshold,
                        "status_code": response.status_code
                    }
                )
                
                if not success:
                    all_passed = False
                    
            except Exception as e:
                self.record_test(f"Response time - {url}", False, {"error": str(e)})
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all smoke tests"""
        print(f"Running post-deployment smoke tests for {self.config.environment}...")
        
        start_time = time.time()
        
        tests = [
            ("Critical Endpoints", self.test_critical_endpoints),
            ("Health Endpoint Details", self.test_health_endpoint_details),
            ("CORS Configuration", self.test_cors_headers),
            ("Frontend Loading", self.test_frontend_loading),
            ("Security Headers", self.test_security_headers),
            ("Response Times", self.test_response_times)
        ]
        
        overall_success = True
        
        for test_name, test_func in tests:
            print(f"  Running {test_name}...")
            try:
                success = test_func()
                if not success:
                    overall_success = False
            except Exception as e:
                print(f"    Error in {test_name}: {e}")
                self.record_test(test_name, False, {"error": str(e)})
                overall_success = False
        
        end_time = time.time()
        
        return {
            "environment": self.config.environment,
            "backend_url": self.config.backend_url,
            "frontend_url": self.config.frontend_url,
            "overall_success": overall_success,
            "total_tests": len(self.test_results),
            "passed_tests": len([r for r in self.test_results if r["success"]]),
            "failed_tests": len([r for r in self.test_results if not r["success"]]),
            "duration": end_time - start_time,
            "timestamp": start_time,
            "test_results": self.test_results
        }


def main():
    """Run smoke tests from command line"""
    import argparse
    import os
    import sys
    
    parser = argparse.ArgumentParser(description="Run post-deployment smoke tests")
    parser.add_argument("--environment", choices=["staging", "production", "local"], default="staging")
    parser.add_argument("--backend-url", help="Backend URL to test")
    parser.add_argument("--frontend-url", help="Frontend URL to test")
    parser.add_argument("--timeout", type=int, default=30, help="Request timeout in seconds")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()
    
    # Configure URLs based on environment
    if args.environment == "local":
        backend_url = args.backend_url or "http://localhost:5000"
        frontend_url = args.frontend_url or "http://localhost:5173"
    elif args.environment == "staging":
        backend_url = args.backend_url or os.getenv("STAGING_BACKEND_URL", "https://chordme-staging-backend.onrender.com")
        frontend_url = args.frontend_url or os.getenv("STAGING_FRONTEND_URL", "https://chordme-staging.vercel.app")
    else:  # production
        backend_url = args.backend_url or os.getenv("PRODUCTION_BACKEND_URL", "https://chordme-backend.onrender.com")
        frontend_url = args.frontend_url or os.getenv("PRODUCTION_FRONTEND_URL", "https://chordme.vercel.app")
    
    config = SmokeTestConfig(
        backend_url=backend_url,
        frontend_url=frontend_url,
        environment=args.environment,
        timeout=args.timeout
    )
    
    suite = SmokeTestSuite(config)
    results = suite.run_all_tests()
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        # Human-readable output
        print("\n" + "="*60)
        print(f"POST-DEPLOYMENT SMOKE TEST RESULTS - {config.environment.upper()}")
        print("="*60)
        print(f"Backend URL: {config.backend_url}")
        print(f"Frontend URL: {config.frontend_url}")
        print(f"Total Tests: {results['total_tests']}")
        print(f"Passed: {results['passed_tests']}")
        print(f"Failed: {results['failed_tests']}")
        print(f"Duration: {results['duration']:.2f}s")
        print()
        
        # Show individual test results
        for test_result in results['test_results']:
            status = "✅ PASS" if test_result['success'] else "❌ FAIL"
            print(f"{test_result['test']}: {status}")
            
            if not test_result['success'] and 'error' in test_result['details']:
                print(f"  Error: {test_result['details']['error']}")
        
        print("\n" + "="*60)
        overall_status = "✅ ALL TESTS PASSED" if results['overall_success'] else "❌ SOME TESTS FAILED"
        print(f"OVERALL RESULT: {overall_status}")
        print("="*60)
    
    # Exit with appropriate code
    sys.exit(0 if results['overall_success'] else 1)


if __name__ == "__main__":
    main()