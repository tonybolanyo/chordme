"""
Deployment Pipeline Integration Tests
Tests the actual deployment process to staging environments
"""

import os
import sys
import time
import pytest
import requests
import subprocess
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class DeploymentConfig:
    """Configuration for deployment testing"""
    backend_url: str
    frontend_url: str
    environment: str
    health_endpoint: str = "/api/v1/health"
    version_endpoint: str = "/api/v1/version"
    timeout: int = 300  # 5 minutes
    retry_interval: int = 10  # 10 seconds


class DeploymentTester:
    """Test deployment pipeline functionality"""
    
    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.session = requests.Session()
        self.session.timeout = 30
    
    def wait_for_service(self, url: str, endpoint: str = "", max_attempts: int = 30) -> bool:
        """Wait for a service to become available"""
        full_url = f"{url.rstrip('/')}{endpoint}"
        
        for attempt in range(max_attempts):
            try:
                response = self.session.get(full_url)
                if response.status_code == 200:
                    return True
            except requests.exceptions.RequestException:
                pass
            
            if attempt < max_attempts - 1:
                time.sleep(self.config.retry_interval)
        
        return False
    
    def test_backend_health(self) -> Dict[str, Any]:
        """Test backend health endpoint"""
        url = f"{self.config.backend_url}{self.config.health_endpoint}"
        
        try:
            response = self.session.get(url)
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                "response_time": response.elapsed.total_seconds()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response_time": None
            }
    
    def test_backend_version(self) -> Dict[str, Any]:
        """Test backend version endpoint"""
        url = f"{self.config.backend_url}{self.config.version_endpoint}"
        
        try:
            response = self.session.get(url)
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                "response_time": response.elapsed.total_seconds()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response_time": None
            }
    
    def test_frontend_availability(self) -> Dict[str, Any]:
        """Test frontend availability"""
        try:
            response = self.session.get(self.config.frontend_url)
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "has_content": len(response.text) > 0,
                "has_react_app": "chordme" in response.text.lower() or "react" in response.text.lower(),
                "response_time": response.elapsed.total_seconds()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response_time": None
            }
    
    def test_cors_configuration(self) -> Dict[str, Any]:
        """Test CORS configuration for frontend-backend communication"""
        url = f"{self.config.backend_url}{self.config.health_endpoint}"
        
        headers = {
            "Origin": self.config.frontend_url,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type"
        }
        
        try:
            # Preflight request
            response = self.session.options(url, headers=headers)
            cors_headers = {
                key: value for key, value in response.headers.items()
                if key.lower().startswith('access-control-')
            }
            
            return {
                "success": response.status_code in [200, 204],
                "status_code": response.status_code,
                "cors_headers": cors_headers,
                "allows_origin": response.headers.get('Access-Control-Allow-Origin'),
                "response_time": response.elapsed.total_seconds()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response_time": None
            }
    
    def test_ssl_configuration(self) -> Dict[str, Any]:
        """Test SSL/TLS configuration"""
        results = {}
        
        for name, url in [("backend", self.config.backend_url), ("frontend", self.config.frontend_url)]:
            if not url.startswith('https://'):
                results[name] = {"https_enabled": False, "reason": "URL is not HTTPS"}
                continue
            
            try:
                response = self.session.get(url)
                results[name] = {
                    "https_enabled": True,
                    "status_code": response.status_code,
                    "security_headers": {
                        key: value for key, value in response.headers.items()
                        if key.lower() in ['strict-transport-security', 'content-security-policy', 
                                         'x-frame-options', 'x-content-type-options']
                    }
                }
            except Exception as e:
                results[name] = {
                    "https_enabled": False,
                    "error": str(e)
                }
        
        return results
    
    def run_smoke_tests(self) -> Dict[str, Any]:
        """Run all smoke tests"""
        print(f"Running deployment smoke tests for {self.config.environment} environment...")
        
        results = {
            "environment": self.config.environment,
            "backend_url": self.config.backend_url,
            "frontend_url": self.config.frontend_url,
            "timestamp": time.time(),
            "tests": {}
        }
        
        # Wait for services to be available
        print("Waiting for backend service...")
        backend_available = self.wait_for_service(self.config.backend_url, self.config.health_endpoint)
        
        print("Waiting for frontend service...")
        frontend_available = self.wait_for_service(self.config.frontend_url)
        
        if not backend_available:
            results["tests"]["service_availability"] = {
                "backend": False,
                "frontend": frontend_available,
                "error": "Backend service not available after waiting"
            }
            return results
        
        if not frontend_available:
            results["tests"]["service_availability"] = {
                "backend": backend_available,
                "frontend": False,
                "error": "Frontend service not available after waiting"
            }
            return results
        
        results["tests"]["service_availability"] = {
            "backend": backend_available,
            "frontend": frontend_available
        }
        
        # Run individual tests
        print("Testing backend health...")
        results["tests"]["backend_health"] = self.test_backend_health()
        
        print("Testing backend version...")
        results["tests"]["backend_version"] = self.test_backend_version()
        
        print("Testing frontend availability...")
        results["tests"]["frontend_availability"] = self.test_frontend_availability()
        
        print("Testing CORS configuration...")
        results["tests"]["cors_configuration"] = self.test_cors_configuration()
        
        print("Testing SSL configuration...")
        results["tests"]["ssl_configuration"] = self.test_ssl_configuration()
        
        return results


@pytest.fixture
def staging_config():
    """Configuration for staging environment tests"""
    return DeploymentConfig(
        backend_url=os.getenv("STAGING_BACKEND_URL", "https://chordme-staging-backend.onrender.com"),
        frontend_url=os.getenv("STAGING_FRONTEND_URL", "https://chordme-staging.vercel.app"),
        environment="staging"
    )


@pytest.fixture
def production_config():
    """Configuration for production environment tests"""
    return DeploymentConfig(
        backend_url=os.getenv("PRODUCTION_BACKEND_URL", "https://chordme-backend.onrender.com"),
        frontend_url=os.getenv("PRODUCTION_FRONTEND_URL", "https://chordme.vercel.app"),
        environment="production"
    )


class TestStagingDeployment:
    """Test staging deployment"""
    
    def test_staging_deployment_smoke_tests(self, staging_config):
        """Run smoke tests against staging environment"""
        tester = DeploymentTester(staging_config)
        results = tester.run_smoke_tests()
        
        # Assert critical functionality
        assert results["tests"]["service_availability"]["backend"], "Backend service not available"
        assert results["tests"]["service_availability"]["frontend"], "Frontend service not available"
        assert results["tests"]["backend_health"]["success"], f"Backend health check failed: {results['tests']['backend_health']}"
        assert results["tests"]["frontend_availability"]["success"], f"Frontend not available: {results['tests']['frontend_availability']}"
        
        # Print results for debugging
        print("\n=== Staging Deployment Test Results ===")
        for test_name, test_result in results["tests"].items():
            print(f"{test_name}: {test_result}")


class TestProductionDeployment:
    """Test production deployment (run only when explicitly requested)"""
    
    @pytest.mark.production
    def test_production_deployment_smoke_tests(self, production_config):
        """Run smoke tests against production environment"""
        tester = DeploymentTester(production_config)
        results = tester.run_smoke_tests()
        
        # Assert critical functionality
        assert results["tests"]["service_availability"]["backend"], "Backend service not available"
        assert results["tests"]["service_availability"]["frontend"], "Frontend service not available"
        assert results["tests"]["backend_health"]["success"], f"Backend health check failed: {results['tests']['backend_health']}"
        assert results["tests"]["frontend_availability"]["success"], f"Frontend not available: {results['tests']['frontend_availability']}"
        
        # Production-specific checks
        ssl_results = results["tests"]["ssl_configuration"]
        assert ssl_results["backend"]["https_enabled"], "Backend HTTPS not enabled in production"
        assert ssl_results["frontend"]["https_enabled"], "Frontend HTTPS not enabled in production"
        
        # Print results for debugging
        print("\n=== Production Deployment Test Results ===")
        for test_name, test_result in results["tests"].items():
            print(f"{test_name}: {test_result}")


class TestDeploymentPipeline:
    """Test deployment pipeline functionality"""
    
    def test_version_consistency(self, staging_config):
        """Test that deployed version is consistent between frontend and backend"""
        tester = DeploymentTester(staging_config)
        
        # Get backend version
        backend_version = tester.test_backend_version()
        
        if backend_version["success"]:
            version_info = backend_version["response"]
            print(f"Backend version: {version_info}")
            
            # Verify version format
            if isinstance(version_info, dict) and "version" in version_info:
                version = version_info["version"]
                assert version, "Version should not be empty"
                # Basic version format check (semantic versioning)
                import re
                version_pattern = r'^\d+\.\d+\.\d+.*$'
                assert re.match(version_pattern, version), f"Version format invalid: {version}"
    
    def test_health_check_response_format(self, staging_config):
        """Test health check response format"""
        tester = DeploymentTester(staging_config)
        health_result = tester.test_backend_health()
        
        assert health_result["success"], "Health check failed"
        
        response = health_result["response"]
        assert isinstance(response, dict), "Health response should be JSON"
        assert "status" in response, "Health response should include status"
        assert response["status"] in ["ok", "healthy"], f"Invalid health status: {response['status']}"
        
        # Check response time
        response_time = health_result["response_time"]
        assert response_time is not None, "Response time should be measured"
        assert response_time < 5.0, f"Health check too slow: {response_time}s"


if __name__ == "__main__":
    """Run smoke tests directly"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run deployment smoke tests")
    parser.add_argument("--environment", choices=["staging", "production"], default="staging")
    parser.add_argument("--backend-url", help="Backend URL to test")
    parser.add_argument("--frontend-url", help="Frontend URL to test")
    args = parser.parse_args()
    
    # Configure based on arguments
    if args.environment == "staging":
        config = DeploymentConfig(
            backend_url=args.backend_url or os.getenv("STAGING_BACKEND_URL", "https://chordme-staging-backend.onrender.com"),
            frontend_url=args.frontend_url or os.getenv("STAGING_FRONTEND_URL", "https://chordme-staging.vercel.app"),
            environment="staging"
        )
    else:
        config = DeploymentConfig(
            backend_url=args.backend_url or os.getenv("PRODUCTION_BACKEND_URL", "https://chordme-backend.onrender.com"),
            frontend_url=args.frontend_url or os.getenv("PRODUCTION_FRONTEND_URL", "https://chordme.vercel.app"),
            environment="production"
        )
    
    tester = DeploymentTester(config)
    results = tester.run_smoke_tests()
    
    # Print results
    print("\n" + "="*50)
    print(f"DEPLOYMENT SMOKE TEST RESULTS - {config.environment.upper()}")
    print("="*50)
    
    all_passed = True
    for test_name, test_result in results["tests"].items():
        if isinstance(test_result, dict):
            if "success" in test_result:
                status = "✅ PASS" if test_result["success"] else "❌ FAIL"
                if not test_result["success"]:
                    all_passed = False
            else:
                status = "ℹ️  INFO"
            print(f"{test_name}: {status}")
            
            # Print details for failed tests
            if isinstance(test_result, dict) and not test_result.get("success", True):
                if "error" in test_result:
                    print(f"  Error: {test_result['error']}")
                if "status_code" in test_result:
                    print(f"  Status Code: {test_result['status_code']}")
    
    print("\n" + "="*50)
    final_status = "✅ ALL TESTS PASSED" if all_passed else "❌ SOME TESTS FAILED"
    print(f"FINAL RESULT: {final_status}")
    print("="*50)
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)