#!/usr/bin/env python3
"""
Automated Security Audit Script

This script performs comprehensive security scanning including:
- Static code analysis with Bandit
- Dependency vulnerability scanning with Safety
- OWASP Top 10 automated testing
- Security configuration validation
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime
from pathlib import Path


class SecurityAuditor:
    def __init__(self, output_dir="security_reports"):
        """Initialize the security auditor."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'bandit': {},
            'safety': {},
            'owasp_tests': {},
            'summary': {}
        }
    
    def run_bandit_scan(self):
        """Run Bandit static security analysis."""
        print("🔍 Running Bandit static security analysis...")
        
        try:
            # Run bandit on the codebase
            cmd = [
                'bandit', '-r', 'chordme/', 
                '-f', 'json',
                '-o', str(self.output_dir / 'bandit_report.json'),
                '--skip', 'B101,B601'  # Skip assert_used and shell_injection for specific cases
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd='.')
            
            # Load the JSON report
            bandit_report_path = self.output_dir / 'bandit_report.json'
            if bandit_report_path.exists():
                with open(bandit_report_path, 'r') as f:
                    bandit_data = json.load(f)
                
                self.results['bandit'] = {
                    'total_issues': len(bandit_data.get('results', [])),
                    'high_severity': len([r for r in bandit_data.get('results', []) if r.get('issue_severity') == 'HIGH']),
                    'medium_severity': len([r for r in bandit_data.get('results', []) if r.get('issue_severity') == 'MEDIUM']),
                    'low_severity': len([r for r in bandit_data.get('results', []) if r.get('issue_severity') == 'LOW']),
                    'report_path': str(bandit_report_path)
                }
                
                print(f"✅ Bandit scan completed: {self.results['bandit']['total_issues']} issues found")
                return True
            else:
                self.results['bandit'] = {'error': 'Report file not generated'}
                return False
                
        except FileNotFoundError:
            print("❌ Bandit not found. Install with: pip install bandit")
            self.results['bandit'] = {'error': 'Bandit not installed'}
            return False
        except Exception as e:
            print(f"❌ Bandit scan failed: {e}")
            self.results['bandit'] = {'error': str(e)}
            return False
    
    def run_safety_scan(self):
        """Run Safety dependency vulnerability scan."""
        print("🔍 Running Safety dependency vulnerability scan...")
        
        try:
            # Run safety check
            cmd = ['safety', 'check', '--json', '--output', str(self.output_dir / 'safety_report.json')]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd='.')
            
            # Parse safety output
            if result.returncode == 0:
                self.results['safety'] = {
                    'vulnerabilities_found': 0,
                    'status': 'SAFE',
                    'report_path': str(self.output_dir / 'safety_report.json')
                }
                print("✅ Safety scan completed: No vulnerabilities found")
            else:
                # Parse the JSON output for vulnerabilities
                try:
                    # Safety may output to stderr on vulnerabilities found
                    safety_output = result.stdout if result.stdout else result.stderr
                    
                    # Write raw output to file for analysis
                    with open(self.output_dir / 'safety_report.json', 'w') as f:
                        f.write(safety_output)
                    
                    # Try to parse as JSON
                    if safety_output.strip().startswith('[') or safety_output.strip().startswith('{'):
                        vulnerability_data = json.loads(safety_output)
                        vuln_count = len(vulnerability_data) if isinstance(vulnerability_data, list) else 1
                    else:
                        vuln_count = safety_output.count('vulnerability') if safety_output else 0
                    
                    self.results['safety'] = {
                        'vulnerabilities_found': vuln_count,
                        'status': 'VULNERABILITIES_FOUND',
                        'report_path': str(self.output_dir / 'safety_report.json')
                    }
                    print(f"⚠️ Safety scan completed: {vuln_count} vulnerabilities found")
                    
                except json.JSONDecodeError:
                    # Safety might output plain text
                    with open(self.output_dir / 'safety_report.txt', 'w') as f:
                        f.write(safety_output)
                    
                    vuln_count = safety_output.count('vulnerability') if safety_output else 0
                    self.results['safety'] = {
                        'vulnerabilities_found': vuln_count,
                        'status': 'VULNERABILITIES_FOUND',
                        'report_path': str(self.output_dir / 'safety_report.txt')
                    }
                    print(f"⚠️ Safety scan completed: {vuln_count} potential vulnerabilities found")
            
            return True
            
        except FileNotFoundError:
            print("❌ Safety not found. Install with: pip install safety")
            self.results['safety'] = {'error': 'Safety not installed'}
            return False
        except Exception as e:
            print(f"❌ Safety scan failed: {e}")
            self.results['safety'] = {'error': str(e)}
            return False
    
    def run_owasp_tests(self):
        """Run OWASP Top 10 automated tests."""
        print("🔍 Running OWASP Top 10 security tests...")
        
        try:
            # Run the OWASP security test suite
            cmd = [
                'python', '-m', 'pytest', 
                'tests/test_owasp_security_audit.py',
                '-v', '--tb=short',
                '--json-report', '--json-report-file=' + str(self.output_dir / 'owasp_test_results.json')
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd='.')
            
            # Parse pytest results
            test_report_path = self.output_dir / 'owasp_test_results.json'
            if test_report_path.exists():
                with open(test_report_path, 'r') as f:
                    test_data = json.load(f)
                
                summary = test_data.get('summary', {})
                self.results['owasp_tests'] = {
                    'total_tests': summary.get('total', 0),
                    'passed': summary.get('passed', 0),
                    'failed': summary.get('failed', 0),
                    'skipped': summary.get('skipped', 0),
                    'duration': test_data.get('duration', 0),
                    'report_path': str(test_report_path)
                }
            else:
                # Fallback to parsing stdout
                self.results['owasp_tests'] = {
                    'output': result.stdout,
                    'errors': result.stderr,
                    'return_code': result.returncode
                }
            
            print(f"✅ OWASP tests completed: {self.results['owasp_tests'].get('passed', 0)} passed, {self.results['owasp_tests'].get('failed', 0)} failed")
            return result.returncode == 0
            
        except Exception as e:
            print(f"❌ OWASP tests failed: {e}")
            self.results['owasp_tests'] = {'error': str(e)}
            return False
    
    def validate_security_configuration(self):
        """Validate security configuration settings."""
        print("🔍 Validating security configuration...")
        
        config_checks = {
            'https_enforcement': False,
            'secure_headers': False,
            'rate_limiting': False,
            'csrf_protection': False,
            'password_hashing': False
        }
        
        try:
            # Check if security modules exist
            security_files = [
                'chordme/security_headers.py',
                'chordme/rate_limiter.py',
                'chordme/csrf_protection.py'
            ]
            
            for file_path in security_files:
                if Path(file_path).exists():
                    config_checks[file_path.split('/')[-1].replace('.py', '')] = True
            
            # Check for HTTPS enforcement
            config_files = ['config.py', 'config.template.py']
            for config_file in config_files:
                if Path(config_file).exists():
                    with open(config_file, 'r') as f:
                        content = f.read()
                        if 'HTTPS_ENFORCED' in content:
                            config_checks['https_enforcement'] = True
                            break
            
            # Check for password hashing
            model_files = ['chordme/models.py', 'chordme/models/__init__.py']
            for model_file in model_files:
                if Path(model_file).exists():
                    with open(model_file, 'r') as f:
                        content = f.read()
                        if 'bcrypt' in content or 'check_password' in content:
                            config_checks['password_hashing'] = True
                            break
            
            self.results['security_configuration'] = config_checks
            passed_checks = sum(config_checks.values())
            total_checks = len(config_checks)
            
            print(f"✅ Security configuration validated: {passed_checks}/{total_checks} checks passed")
            return passed_checks >= total_checks * 0.8  # 80% pass rate
            
        except Exception as e:
            print(f"❌ Security configuration validation failed: {e}")
            self.results['security_configuration'] = {'error': str(e)}
            return False
    
    def generate_summary_report(self):
        """Generate a comprehensive summary report."""
        print("📊 Generating security audit summary...")
        
        # Calculate overall security score
        security_score = 100
        critical_issues = 0
        
        # Deduct points for security issues
        if self.results.get('bandit', {}).get('high_severity', 0) > 0:
            high_issues = self.results['bandit']['high_severity']
            security_score -= high_issues * 20
            critical_issues += high_issues
        
        if self.results.get('bandit', {}).get('medium_severity', 0) > 0:
            medium_issues = self.results['bandit']['medium_severity']
            security_score -= medium_issues * 10
        
        if self.results.get('safety', {}).get('vulnerabilities_found', 0) > 0:
            vuln_count = self.results['safety']['vulnerabilities_found']
            security_score -= vuln_count * 15
            critical_issues += vuln_count
        
        if self.results.get('owasp_tests', {}).get('failed', 0) > 0:
            failed_tests = self.results['owasp_tests']['failed']
            security_score -= failed_tests * 5
        
        # Ensure score doesn't go below 0
        security_score = max(0, security_score)
        
        # Determine security status
        if critical_issues > 0:
            status = "CRITICAL"
        elif security_score >= 90:
            status = "EXCELLENT"
        elif security_score >= 75:
            status = "GOOD"
        elif security_score >= 60:
            status = "ADEQUATE"
        else:
            status = "POOR"
        
        self.results['summary'] = {
            'security_score': security_score,
            'status': status,
            'critical_issues': critical_issues,
            'recommendations': self._generate_recommendations()
        }
        
        # Write summary report
        summary_path = self.output_dir / 'security_audit_summary.json'
        with open(summary_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        # Generate human-readable report
        self._generate_human_readable_report()
        
        print(f"📊 Security audit completed: Score {security_score}/100 ({status})")
        return security_score >= 75  # Pass threshold
    
    def _generate_recommendations(self):
        """Generate security recommendations based on findings."""
        recommendations = []
        
        if self.results.get('bandit', {}).get('high_severity', 0) > 0:
            recommendations.append("Address high-severity static analysis findings immediately")
        
        if self.results.get('safety', {}).get('vulnerabilities_found', 0) > 0:
            recommendations.append("Update vulnerable dependencies to secure versions")
        
        if self.results.get('owasp_tests', {}).get('failed', 0) > 0:
            recommendations.append("Fix failing OWASP security tests")
        
        security_config = self.results.get('security_configuration', {})
        if not security_config.get('https_enforcement', False):
            recommendations.append("Enable HTTPS enforcement for production")
        
        if not security_config.get('rate_limiting', False):
            recommendations.append("Implement rate limiting for authentication endpoints")
        
        if not recommendations:
            recommendations.append("Security posture is strong - maintain current practices")
        
        return recommendations
    
    def _generate_human_readable_report(self):
        """Generate a human-readable security report."""
        report_path = self.output_dir / 'SECURITY_AUDIT_REPORT.md'
        
        with open(report_path, 'w') as f:
            f.write(f"""# Security Audit Report
Generated: {self.results['timestamp']}

## Executive Summary

**Security Score: {self.results['summary']['security_score']}/100**
**Status: {self.results['summary']['status']}**
**Critical Issues: {self.results['summary']['critical_issues']}**

## Static Code Analysis (Bandit)

- Total Issues: {self.results.get('bandit', {}).get('total_issues', 'N/A')}
- High Severity: {self.results.get('bandit', {}).get('high_severity', 'N/A')}
- Medium Severity: {self.results.get('bandit', {}).get('medium_severity', 'N/A')}
- Low Severity: {self.results.get('bandit', {}).get('low_severity', 'N/A')}

## Dependency Vulnerabilities (Safety)

- Vulnerabilities Found: {self.results.get('safety', {}).get('vulnerabilities_found', 'N/A')}
- Status: {self.results.get('safety', {}).get('status', 'N/A')}

## OWASP Top 10 Tests

- Total Tests: {self.results.get('owasp_tests', {}).get('total_tests', 'N/A')}
- Passed: {self.results.get('owasp_tests', {}).get('passed', 'N/A')}
- Failed: {self.results.get('owasp_tests', {}).get('failed', 'N/A')}
- Skipped: {self.results.get('owasp_tests', {}).get('skipped', 'N/A')}

## Security Configuration

""")
            
            security_config = self.results.get('security_configuration', {})
            for check, status in security_config.items():
                if isinstance(status, bool):
                    status_icon = "✅" if status else "❌"
                    f.write(f"- {check.replace('_', ' ').title()}: {status_icon}\n")
            
            f.write(f"""
## Recommendations

""")
            for i, rec in enumerate(self.results['summary']['recommendations'], 1):
                f.write(f"{i}. {rec}\n")
            
            f.write(f"""
## Detailed Reports

- Bandit Report: {self.results.get('bandit', {}).get('report_path', 'N/A')}
- Safety Report: {self.results.get('safety', {}).get('report_path', 'N/A')}
- OWASP Test Results: {self.results.get('owasp_tests', {}).get('report_path', 'N/A')}
""")


def main():
    """Main function to run security audit."""
    parser = argparse.ArgumentParser(description='Run comprehensive security audit')
    parser.add_argument('--output-dir', default='security_reports', 
                       help='Output directory for reports')
    parser.add_argument('--fail-on-issues', action='store_true',
                       help='Exit with non-zero code if security issues found')
    
    args = parser.parse_args()
    
    # Change to backend directory if running from root
    if Path('backend').exists() and Path('backend/chordme').exists():
        os.chdir('backend')
    
    auditor = SecurityAuditor(args.output_dir)
    
    print("🚀 Starting comprehensive security audit...")
    
    # Run all security scans
    bandit_success = auditor.run_bandit_scan()
    safety_success = auditor.run_safety_scan()
    owasp_success = auditor.run_owasp_tests()
    config_success = auditor.validate_security_configuration()
    
    # Generate summary
    audit_passed = auditor.generate_summary_report()
    
    print(f"\n📋 Security Audit Complete!")
    print(f"Reports saved to: {auditor.output_dir}")
    print(f"Summary score: {auditor.results['summary']['security_score']}/100")
    
    # Exit with appropriate code
    if args.fail_on_issues and not audit_passed:
        print("❌ Security audit failed - critical issues found")
        sys.exit(1)
    else:
        print("✅ Security audit completed successfully")
        sys.exit(0)


if __name__ == '__main__':
    main()