---
layout: default
lang: en
title: Backend Security Audit Report
---

# Backend Security Audit Report
Generated: 2025-08-26T21:19:41.171471

## Executive Summary

**Security Score: 85/100**
**Status: GOOD**
**Critical Issues: 0**

## Static Code Analysis (Bandit)

- Total Issues: 3
- High Severity: 0
- Medium Severity: 0
- Low Severity: 3

## Dependency Vulnerabilities (Safety)

- Vulnerabilities Found: 0
- Status: VULNERABILITIES_FOUND

## OWASP Top 10 Tests

- Total Tests: 24
- Passed: 4
- Failed: 3
- Skipped: 0

## Security Configuration

- Https Enforcement: ✅
- Secure Headers: ❌
- Rate Limiting: ❌
- Csrf Protection: ✅
- Password Hashing: ✅
- Security Headers: ✅
- Rate Limiter: ✅

## Recommendations

1. Fix failing OWASP security tests
2. Implement rate limiting for authentication endpoints

## Detailed Reports

- Bandit Report: security_reports/bandit_report.json
- Safety Report: security_reports/safety_report.json
- OWASP Test Results: security_reports/owasp_test_results.json