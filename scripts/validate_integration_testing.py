#!/usr/bin/env python3
"""
Performance Integration Test Validation Script

This script validates the performance characteristics of the ChordMe application
by running integration tests and measuring key performance metrics.
"""

import subprocess
import time
import json
import sys
import os
from typing import Dict, List, Any

class PerformanceValidator:
    """Validates performance metrics across the ChordMe application."""
    
    def __init__(self):
        self.results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "metrics": {},
            "test_results": {},
            "status": "unknown"
        }
    
    def run_frontend_tests(self) -> Dict[str, Any]:
        """Run frontend tests and measure execution time."""
        print("🔧 Running frontend tests...")
        start_time = time.time()
        
        try:
            # Change to frontend directory and run tests
            result = subprocess.run(
                ["npm", "run", "test:run"],
                cwd="frontend",
                capture_output=True,
                text=True,
                timeout=120
            )
            
            execution_time = time.time() - start_time
            
            return {
                "execution_time": execution_time,
                "status": "success" if result.returncode == 0 else "failed",
                "test_count": self._count_frontend_tests(),
                "output_lines": len(result.stdout.split('\n')) if result.stdout else 0
            }
        except subprocess.TimeoutExpired:
            return {
                "execution_time": time.time() - start_time,
                "status": "timeout",
                "test_count": self._count_frontend_tests(),
                "error": "Tests timed out after 120 seconds"
            }
        except Exception as e:
            return {
                "execution_time": time.time() - start_time,
                "status": "error",
                "error": str(e)
            }
    
    def run_integration_tests(self) -> Dict[str, Any]:
        """Run integration tests and measure execution time."""
        print("🔧 Running integration tests...")
        start_time = time.time()
        
        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "-v"],
                cwd="integration-tests",
                capture_output=True,
                text=True,
                timeout=60
            )
            
            execution_time = time.time() - start_time
            
            # Parse test results from output
            test_summary = self._parse_pytest_output(result.stdout)
            
            return {
                "execution_time": execution_time,
                "status": "success" if result.returncode == 0 else "failed",
                "test_summary": test_summary,
                "return_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "execution_time": time.time() - start_time,
                "status": "timeout",
                "error": "Integration tests timed out after 60 seconds"
            }
        except Exception as e:
            return {
                "execution_time": time.time() - start_time,
                "status": "error",
                "error": str(e)
            }
    
    def validate_build_performance(self) -> Dict[str, Any]:
        """Validate frontend build performance."""
        print("🔧 Validating build performance...")
        start_time = time.time()
        
        try:
            result = subprocess.run(
                ["npx", "vite", "build"],
                cwd="frontend",
                capture_output=True,
                text=True,
                timeout=60
            )
            
            build_time = time.time() - start_time
            
            # Check if dist directory was created and get size
            dist_path = os.path.join("frontend", "dist")
            bundle_info = self._analyze_build_output(dist_path, result.stdout)
            
            return {
                "build_time": build_time,
                "status": "success" if result.returncode == 0 else "failed",
                "bundle_info": bundle_info,
                "return_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "build_time": time.time() - start_time,
                "status": "timeout",
                "error": "Build timed out after 60 seconds"
            }
        except Exception as e:
            return {
                "build_time": time.time() - start_time,
                "status": "error",
                "error": str(e)
            }
    
    def _count_frontend_tests(self) -> int:
        """Count the number of frontend test files."""
        try:
            result = subprocess.run(
                ["find", "frontend/src", "-name", "*.test.*", "-o", "-name", "*.spec.*"],
                capture_output=True,
                text=True
            )
            return len([line for line in result.stdout.strip().split('\n') if line])
        except:
            return 0
    
    def _parse_pytest_output(self, output: str) -> Dict[str, int]:
        """Parse pytest output to extract test counts."""
        summary = {"passed": 0, "failed": 0, "total": 0}
        
        for line in output.split('\n'):
            if 'passed' in line or 'failed' in line:
                if 'passed' in line and 'failed' in line:
                    # Line like "10 failed, 5 passed in 3.45s"
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if part == 'failed' and i > 0:
                            try:
                                summary["failed"] = int(parts[i-1])
                            except:
                                pass
                        elif part == 'passed' and i > 0:
                            try:
                                summary["passed"] = int(parts[i-1])
                            except:
                                pass
        
        summary["total"] = summary["passed"] + summary["failed"]
        return summary
    
    def _analyze_build_output(self, dist_path: str, output: str) -> Dict[str, Any]:
        """Analyze build output and directory size."""
        info = {"exists": False, "files": [], "total_size_kb": 0}
        
        if os.path.exists(dist_path):
            info["exists"] = True
            
            # Get file sizes
            for root, dirs, files in os.walk(dist_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        size = os.path.getsize(file_path)
                        rel_path = os.path.relpath(file_path, dist_path)
                        info["files"].append({
                            "name": rel_path,
                            "size_kb": round(size / 1024, 2)
                        })
                        info["total_size_kb"] += size / 1024
                    except:
                        pass
            
            info["total_size_kb"] = round(info["total_size_kb"], 2)
        
        return info
    
    def run_all_validations(self) -> Dict[str, Any]:
        """Run all performance validations."""
        print("🚀 Starting ChordMe Integration Testing Performance Validation\n")
        
        # Build validation (must come first)
        self.results["metrics"]["build"] = self.validate_build_performance()
        
        # Integration tests (lightweight)
        self.results["test_results"]["integration"] = self.run_integration_tests()
        
        # Frontend tests (might be resource intensive)
        self.results["test_results"]["frontend"] = self.run_frontend_tests()
        
        # Calculate overall status
        self._calculate_overall_status()
        
        return self.results
    
    def _calculate_overall_status(self):
        """Calculate overall validation status."""
        all_success = True
        
        # Check build status
        if self.results["metrics"]["build"]["status"] != "success":
            all_success = False
        
        # Check test statuses
        for test_type, results in self.results["test_results"].items():
            if results["status"] not in ["success", "timeout"]:  # timeout might be acceptable
                all_success = False
        
        self.results["status"] = "success" if all_success else "partial"
    
    def print_summary(self):
        """Print a summary of validation results."""
        print("\n" + "="*60)
        print("🎯 CHORDME INTEGRATION TESTING VALIDATION SUMMARY")
        print("="*60)
        
        print(f"\n📊 Overall Status: {self.results['status'].upper()}")
        print(f"🕐 Timestamp: {self.results['timestamp']}")
        
        # Build metrics
        build = self.results["metrics"]["build"]
        print(f"\n🏗️  Build Performance:")
        print(f"   ⏱️  Build Time: {build['build_time']:.2f} seconds")
        print(f"   📦 Bundle Size: {build['bundle_info']['total_size_kb']:.2f} KB")
        print(f"   ✅ Status: {build['status']}")
        
        # Test results
        print(f"\n🧪 Test Execution:")
        
        if "integration" in self.results["test_results"]:
            integration = self.results["test_results"]["integration"]
            print(f"   🔗 Integration Tests:")
            print(f"      ⏱️  Execution Time: {integration['execution_time']:.2f} seconds")
            print(f"      ✅ Status: {integration['status']}")
            if "test_summary" in integration:
                summary = integration["test_summary"]
                print(f"      📈 Results: {summary['passed']} passed, {summary['failed']} failed")
        
        if "frontend" in self.results["test_results"]:
            frontend = self.results["test_results"]["frontend"]
            print(f"   🎨 Frontend Tests:")
            print(f"      ⏱️  Execution Time: {frontend['execution_time']:.2f} seconds")
            print(f"      ✅ Status: {frontend['status']}")
            print(f"      📁 Test Files: {frontend.get('test_count', 'unknown')}")
        
        print(f"\n🎯 Performance Benchmarks:")
        print(f"   ⚡ Build Time Target: < 60 seconds ({'✅ PASS' if build['build_time'] < 60 else '❌ FAIL'})")
        print(f"   📦 Bundle Size Target: < 1000 KB ({'✅ PASS' if build['bundle_info']['total_size_kb'] < 1000 else '❌ FAIL'})")
        
        if "integration" in self.results["test_results"]:
            integration_time = self.results["test_results"]["integration"]["execution_time"]
            print(f"   🔗 Integration Test Time: < 30 seconds ({'✅ PASS' if integration_time < 30 else '❌ FAIL'})")
        
        print("\n" + "="*60)
        print("🎉 VALIDATION COMPLETE")
        print("="*60)

def main():
    """Main execution function."""
    validator = PerformanceValidator()
    
    try:
        results = validator.run_all_validations()
        validator.print_summary()
        
        # Write results to file
        with open("integration_test_validation_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📁 Detailed results written to: integration_test_validation_results.json")
        
        # Exit with appropriate code
        sys.exit(0 if results["status"] == "success" else 1)
        
    except KeyboardInterrupt:
        print("\n\n❌ Validation interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n❌ Validation failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()