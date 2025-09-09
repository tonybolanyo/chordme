#!/usr/bin/env python3
"""
Enterprise Integration Testing Runner

Comprehensive test runner for enterprise integration testing that orchestrates:
- Enterprise workflow integration tests
- Performance benchmarking and load testing
- Security integration testing
- Cross-browser E2E testing
- Compliance validation
- Test reporting and analytics
"""

import asyncio
import subprocess
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class EnterpriseTestRunner:
    """Orchestrates comprehensive enterprise integration testing."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.test_results: Dict[str, Any] = {}
        self.start_time = None
        self.end_time = None
        
        # Test suites configuration
        self.test_suites = {
            "integration": {
                "command": ["python", "-m", "pytest", "-v", "test_enterprise_workflows.py"],
                "working_dir": "integration-tests",
                "timeout": 1800,  # 30 minutes
                "critical": True
            },
            "security_integration": {
                "command": ["python", "-m", "pytest", "-v", "test_enterprise_security_integration.py"],
                "working_dir": "integration-tests", 
                "timeout": 1200,  # 20 minutes
                "critical": True
            },
            "e2e_workflows": {
                "command": ["npx", "playwright", "test", "enterprise-workflows.spec.ts"],
                "working_dir": ".",
                "timeout": 3600,  # 60 minutes
                "critical": True
            },
            "load_testing": {
                "command": ["python", "scripts/enterprise_load_testing.py", "--users", "50", "--duration", "5"],
                "working_dir": ".",
                "timeout": 900,  # 15 minutes
                "critical": False
            },
            "performance_benchmark": {
                "command": ["python", "scripts/enterprise_performance_benchmark.py", "--users", "20", "--duration", "5"],
                "working_dir": ".",
                "timeout": 600,  # 10 minutes
                "critical": False
            }
        }
    
    async def run_comprehensive_enterprise_tests(self) -> Dict[str, Any]:
        """Run all enterprise integration tests and generate comprehensive report."""
        logger.info("Starting comprehensive enterprise integration testing")
        logger.info(f"Configuration: {json.dumps(self.config, indent=2)}")
        
        self.start_time = time.time()
        
        # Check prerequisites
        if not await self._check_prerequisites():
            return {"error": "Prerequisites not met for enterprise testing"}
        
        # Run test suites based on configuration
        selected_suites = self.config.get("test_suites", list(self.test_suites.keys()))
        
        for suite_name in selected_suites:
            if suite_name in self.test_suites:
                logger.info(f"Running test suite: {suite_name}")
                result = await self._run_test_suite(suite_name)
                self.test_results[suite_name] = result
                
                # Stop on critical failures if configured
                if result.get("success") is False and self.test_suites[suite_name]["critical"] and self.config.get("stop_on_critical_failure", False):
                    logger.error(f"Critical test suite {suite_name} failed, stopping execution")
                    break
            else:
                logger.warning(f"Unknown test suite: {suite_name}")
        
        self.end_time = time.time()
        
        # Generate comprehensive report
        report = self._generate_comprehensive_report()
        
        # Save report
        if self.config.get("save_report", True):
            self._save_report(report)
        
        # Print summary
        self._print_test_summary(report)
        
        return report
    
    async def _check_prerequisites(self) -> bool:
        """Check if all prerequisites for enterprise testing are met."""
        logger.info("Checking enterprise testing prerequisites")
        
        prerequisites = [
            # Backend server availability
            {
                "name": "Backend Server",
                "check": self._check_backend_availability,
                "critical": True
            },
            # Frontend availability (for E2E tests)
            {
                "name": "Frontend Server", 
                "check": self._check_frontend_availability,
                "critical": False  # E2E tests can be skipped
            },
            # Python dependencies
            {
                "name": "Python Dependencies",
                "check": self._check_python_dependencies,
                "critical": True
            },
            # Node.js dependencies (for E2E tests)
            {
                "name": "Node.js Dependencies",
                "check": self._check_nodejs_dependencies,
                "critical": False
            }
        ]
        
        all_critical_met = True
        
        for prereq in prerequisites:
            try:
                result = await prereq["check"]()
                status = "✅ PASS" if result else "❌ FAIL"
                logger.info(f"{prereq['name']}: {status}")
                
                if not result and prereq["critical"]:
                    all_critical_met = False
                    
            except Exception as e:
                logger.error(f"{prereq['name']}: ❌ ERROR - {e}")
                if prereq["critical"]:
                    all_critical_met = False
        
        return all_critical_met
    
    async def _check_backend_availability(self) -> bool:
        """Check if backend server is available."""
        try:
            import aiohttp
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                base_url = self.config.get("backend_url", "http://localhost:5000")
                async with session.get(f"{base_url}/api/v1/health") as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def _check_frontend_availability(self) -> bool:
        """Check if frontend server is available."""
        try:
            import aiohttp
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                frontend_url = self.config.get("frontend_url", "http://localhost:5173")
                async with session.get(frontend_url) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def _check_python_dependencies(self) -> bool:
        """Check if required Python dependencies are available."""
        required_packages = ["pytest", "requests", "aiohttp"]
        
        for package in required_packages:
            try:
                __import__(package)
            except ImportError:
                logger.error(f"Missing Python package: {package}")
                return False
        
        return True
    
    async def _check_nodejs_dependencies(self) -> bool:
        """Check if required Node.js dependencies are available."""
        try:
            result = subprocess.run(
                ["npx", "playwright", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False
    
    async def _run_test_suite(self, suite_name: str) -> Dict[str, Any]:
        """Run a specific test suite and return results."""
        suite_config = self.test_suites[suite_name]
        start_time = time.time()
        
        logger.info(f"Starting test suite: {suite_name}")
        logger.info(f"Command: {' '.join(suite_config['command'])}")
        logger.info(f"Working directory: {suite_config['working_dir']}")
        
        try:
            # Prepare environment
            env = os.environ.copy()
            env.update(self.config.get("environment_variables", {}))
            
            # Run the test command
            process = await asyncio.create_subprocess_exec(
                *suite_config["command"],
                cwd=suite_config["working_dir"],
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=suite_config["timeout"]
                )
            except asyncio.TimeoutError:
                logger.error(f"Test suite {suite_name} timed out after {suite_config['timeout']} seconds")
                process.kill()
                await process.wait()
                return {
                    "success": False,
                    "error": "timeout",
                    "duration_seconds": suite_config["timeout"],
                    "stdout": "",
                    "stderr": "Test suite timed out"
                }
            
            end_time = time.time()
            duration = end_time - start_time
            
            success = process.returncode == 0
            
            result = {
                "success": success,
                "returncode": process.returncode,
                "duration_seconds": duration,
                "stdout": stdout.decode("utf-8") if stdout else "",
                "stderr": stderr.decode("utf-8") if stderr else ""
            }
            
            # Parse test results if available
            if success:
                parsed_results = self._parse_test_output(suite_name, result["stdout"])
                result.update(parsed_results)
            
            status = "✅ PASS" if success else "❌ FAIL"
            logger.info(f"Test suite {suite_name}: {status} (duration: {duration:.2f}s)")
            
            return result
            
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            
            logger.error(f"Test suite {suite_name} failed with exception: {e}")
            return {
                "success": False,
                "error": str(e),
                "duration_seconds": duration,
                "stdout": "",
                "stderr": str(e)
            }
    
    def _parse_test_output(self, suite_name: str, stdout: str) -> Dict[str, Any]:
        """Parse test output to extract metrics and results."""
        parsed = {}
        
        # Parse pytest output
        if "pytest" in self.test_suites[suite_name]["command"]:
            parsed.update(self._parse_pytest_output(stdout))
        
        # Parse Playwright output
        elif "playwright" in self.test_suites[suite_name]["command"]:
            parsed.update(self._parse_playwright_output(stdout))
        
        # Parse load testing output
        elif "load_testing" in suite_name:
            parsed.update(self._parse_load_testing_output(stdout))
        
        # Parse benchmark output
        elif "benchmark" in suite_name:
            parsed.update(self._parse_benchmark_output(stdout))
        
        return parsed
    
    def _parse_pytest_output(self, stdout: str) -> Dict[str, Any]:
        """Parse pytest output for test counts and results."""
        lines = stdout.split('\n')
        
        # Look for test summary line
        for line in lines:
            if "failed" in line and "passed" in line:
                # Example: "1 failed, 5 passed in 10.50s"
                parts = line.split()
                
                failed = 0
                passed = 0
                duration = 0
                
                for i, part in enumerate(parts):
                    if part == "failed,":
                        failed = int(parts[i-1])
                    elif part == "passed":
                        passed = int(parts[i-1])
                    elif part.endswith("s"):
                        try:
                            duration = float(part[:-1])
                        except ValueError:
                            pass
                
                return {
                    "test_counts": {
                        "passed": passed,
                        "failed": failed,
                        "total": passed + failed
                    },
                    "test_duration_seconds": duration
                }
        
        return {}
    
    def _parse_playwright_output(self, stdout: str) -> Dict[str, Any]:
        """Parse Playwright test output."""
        # Playwright outputs test results in a different format
        # Implementation would depend on specific Playwright output format
        return {"test_type": "e2e"}
    
    def _parse_load_testing_output(self, stdout: str) -> Dict[str, Any]:
        """Parse load testing output for performance metrics."""
        # Look for performance summary in output
        # Implementation would parse the specific output format
        return {"test_type": "load_testing"}
    
    def _parse_benchmark_output(self, stdout: str) -> Dict[str, Any]:
        """Parse benchmark output for performance metrics."""
        # Look for benchmark results in output
        # Implementation would parse the specific output format
        return {"test_type": "benchmark"}
    
    def _generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report."""
        total_duration = self.end_time - self.start_time if self.end_time and self.start_time else 0
        
        # Calculate overall success
        critical_failures = [
            name for name, result in self.test_results.items()
            if not result.get("success", False) and self.test_suites[name]["critical"]
        ]
        
        overall_success = len(critical_failures) == 0
        
        # Count test results
        total_tests_passed = 0
        total_tests_failed = 0
        
        for result in self.test_results.values():
            if "test_counts" in result:
                total_tests_passed += result["test_counts"].get("passed", 0)
                total_tests_failed += result["test_counts"].get("failed", 0)
        
        # Generate report
        report = {
            "enterprise_test_report": {
                "timestamp": datetime.utcnow().isoformat(),
                "overall_success": overall_success,
                "total_duration_seconds": total_duration,
                "configuration": self.config
            },
            "test_suite_results": self.test_results,
            "summary": {
                "total_test_suites": len(self.test_results),
                "successful_suites": len([r for r in self.test_results.values() if r.get("success", False)]),
                "failed_suites": len([r for r in self.test_results.values() if not r.get("success", False)]),
                "critical_failures": critical_failures,
                "total_tests_passed": total_tests_passed,
                "total_tests_failed": total_tests_failed
            },
            "recommendations": self._generate_recommendations(),
            "enterprise_readiness_assessment": self._assess_enterprise_readiness()
        }
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results."""
        recommendations = []
        
        # Check for critical failures
        critical_failures = [
            name for name, result in self.test_results.items()
            if not result.get("success", False) and self.test_suites[name]["critical"]
        ]
        
        if critical_failures:
            recommendations.append(f"Address critical test failures in: {', '.join(critical_failures)}")
        
        # Check for performance issues
        performance_suites = ["load_testing", "performance_benchmark"]
        for suite in performance_suites:
            if suite in self.test_results and not self.test_results[suite].get("success", False):
                recommendations.append(f"Investigate performance issues identified in {suite}")
        
        # Check for security issues
        if "security_integration" in self.test_results and not self.test_results["security_integration"].get("success", False):
            recommendations.append("Address security integration test failures before enterprise deployment")
        
        # General recommendations
        if not recommendations:
            recommendations.append("All tests passed - enterprise features are ready for deployment")
        
        return recommendations
    
    def _assess_enterprise_readiness(self) -> Dict[str, Any]:
        """Assess enterprise readiness based on test results."""
        # Calculate scores for different aspects
        security_score = self._calculate_score("security_integration")
        performance_score = self._calculate_score(["load_testing", "performance_benchmark"])
        functionality_score = self._calculate_score(["integration", "e2e_workflows"])
        
        overall_score = (security_score + performance_score + functionality_score) / 3
        
        # Determine readiness level
        if overall_score >= 90:
            readiness_level = "ENTERPRISE_READY"
        elif overall_score >= 75:
            readiness_level = "MOSTLY_READY"
        elif overall_score >= 50:
            readiness_level = "NEEDS_IMPROVEMENT"
        else:
            readiness_level = "NOT_READY"
        
        return {
            "overall_score": overall_score,
            "readiness_level": readiness_level,
            "component_scores": {
                "security": security_score,
                "performance": performance_score,
                "functionality": functionality_score
            },
            "certification_recommendation": self._get_certification_recommendation(overall_score)
        }
    
    def _calculate_score(self, suite_names) -> float:
        """Calculate score for given test suite(s)."""
        if isinstance(suite_names, str):
            suite_names = [suite_names]
        
        total_score = 0
        count = 0
        
        for suite_name in suite_names:
            if suite_name in self.test_results:
                result = self.test_results[suite_name]
                if result.get("success", False):
                    score = 100
                    
                    # Adjust score based on test counts if available
                    if "test_counts" in result:
                        passed = result["test_counts"].get("passed", 0)
                        total = result["test_counts"].get("total", 1)
                        score = (passed / total) * 100 if total > 0 else 0
                else:
                    score = 0
                
                total_score += score
                count += 1
        
        return total_score / count if count > 0 else 0
    
    def _get_certification_recommendation(self, score: float) -> str:
        """Get certification recommendation based on score."""
        if score >= 95:
            return "APPROVED for enterprise deployment"
        elif score >= 85:
            return "CONDITIONALLY APPROVED - minor issues should be addressed"
        elif score >= 70:
            return "REQUIRES IMPROVEMENTS before enterprise deployment"
        else:
            return "NOT APPROVED - significant issues must be resolved"
    
    def _save_report(self, report: Dict[str, Any]):
        """Save test report to file."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"enterprise_test_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Enterprise test report saved to {filename}")
    
    def _print_test_summary(self, report: Dict[str, Any]):
        """Print test summary to console."""
        print("\n" + "="*80)
        print("ENTERPRISE INTEGRATION TEST RESULTS")
        print("="*80)
        
        summary = report["summary"]
        readiness = report["enterprise_readiness_assessment"]
        
        print(f"Overall Success: {'✅ PASS' if report['enterprise_test_report']['overall_success'] else '❌ FAIL'}")
        print(f"Total Duration: {report['enterprise_test_report']['total_duration_seconds']:.2f} seconds")
        print(f"Test Suites: {summary['successful_suites']}/{summary['total_test_suites']} passed")
        
        if summary['total_tests_passed'] + summary['total_tests_failed'] > 0:
            print(f"Individual Tests: {summary['total_tests_passed']}/{summary['total_tests_passed'] + summary['total_tests_failed']} passed")
        
        print(f"\nEnterprise Readiness: {readiness['readiness_level']} ({readiness['overall_score']:.1f}/100)")
        print(f"Certification: {readiness['certification_recommendation']}")
        
        if summary['critical_failures']:
            print(f"\n❌ Critical Failures:")
            for failure in summary['critical_failures']:
                print(f"  - {failure}")
        
        print(f"\n📊 Component Scores:")
        for component, score in readiness['component_scores'].items():
            print(f"  {component.capitalize()}: {score:.1f}/100")
        
        print(f"\n💡 Recommendations:")
        for rec in report['recommendations']:
            print(f"  - {rec}")


async def main():
    """Main function to run enterprise integration testing."""
    parser = argparse.ArgumentParser(description="Enterprise Integration Testing Runner")
    parser.add_argument("--backend-url", default="http://localhost:5000", help="Backend server URL")
    parser.add_argument("--frontend-url", default="http://localhost:5173", help="Frontend server URL")
    parser.add_argument("--test-suites", nargs="+", help="Specific test suites to run")
    parser.add_argument("--stop-on-failure", action="store_true", help="Stop on critical failures")
    parser.add_argument("--save-report", action="store_true", default=True, help="Save test report to file")
    parser.add_argument("--config", help="Configuration file path")
    
    args = parser.parse_args()
    
    # Load configuration
    config = {
        "backend_url": args.backend_url,
        "frontend_url": args.frontend_url,
        "stop_on_critical_failure": args.stop_on_failure,
        "save_report": args.save_report,
        "environment_variables": {
            "BASE_URL": args.backend_url,
            "FRONTEND_URL": args.frontend_url
        }
    }
    
    if args.test_suites:
        config["test_suites"] = args.test_suites
    
    if args.config:
        try:
            with open(args.config, 'r') as f:
                file_config = json.load(f)
                config.update(file_config)
        except Exception as e:
            logger.error(f"Failed to load config file {args.config}: {e}")
            return 1
    
    # Run enterprise tests
    runner = EnterpriseTestRunner(config)
    
    try:
        report = await runner.run_comprehensive_enterprise_tests()
        
        # Return appropriate exit code
        if report.get("enterprise_test_report", {}).get("overall_success", False):
            return 0
        else:
            return 1
            
    except KeyboardInterrupt:
        logger.info("Enterprise testing interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Enterprise testing failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))