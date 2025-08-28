---
layout: default
lang: en
title: Backend Testing Documentation
---

# ChordMe Backend - Automated Testing Documentation

This document provides comprehensive documentation for the automated tests implemented for the ChordMe backend authentication system.

## Overview

The test suite covers all user authentication endpoints including registration, login, and health check functionality. Tests are implemented using pytest and pytest-flask, providing comprehensive coverage of both happy path scenarios and edge cases.

## Test Structure

### Test Organization

The test suite is organized into the following test classes:

1. **TestHealthEndpoint** - Health check endpoint tests
2. **TestUserRegistration** - User registration endpoint tests  
3. **TestUserLogin** - User login endpoint tests
4. **TestIntegrationScenarios** - End-to-end integration tests

### Test Configuration

Tests use an isolated in-memory SQLite database to ensure:
- Fast test execution
- No interference between tests
- No impact on development or production data
- Complete isolation between test runs

## Test Categories

### Health Check Tests

**Endpoint**: `GET /api/v1/health`

- **test_health_check**: Verifies the health endpoint returns correct status and message

### User Registration Tests

**Endpoint**: `POST /api/v1/auth/register`

#### Happy Path Tests
- **test_successful_registration**: Valid registration with proper email and password
- **test_registration_with_multiple_valid_users**: Multiple users can register with different valid data
- **test_registration_email_normalization**: Email addresses are normalized to lowercase

#### Validation Tests
- **test_registration_missing_email**: Registration fails when email is missing
- **test_registration_missing_password**: Registration fails when password is missing
- **test_registration_invalid_emails**: Registration fails with various invalid email formats:
  - Empty string
  - Invalid formats (no @, no domain, etc.)
  - Emails exceeding maximum length (120 characters)
- **test_registration_invalid_passwords**: Registration fails with weak passwords:
  - Too short (< 8 characters)
  - Too long (> 128 characters)
  - Missing uppercase letters
  - Missing lowercase letters
  - Missing numbers

#### Error Handling Tests
- **test_registration_no_data**: Registration fails when no data is provided
- **test_registration_empty_json**: Registration fails with empty JSON payload
- **test_registration_duplicate_email**: Registration fails when email already exists
- **test_registration_duplicate_email_case_insensitive**: Duplicate detection is case-insensitive

### User Login Tests

**Endpoint**: `POST /api/v1/auth/login`

#### Happy Path Tests
- **test_successful_login**: Valid login returns JWT token and user data
- **test_login_jwt_token_validity**: Generated JWT tokens are valid and contain expected claims
- **test_login_email_normalization**: Login works with different email cases

#### Validation Tests
- **test_login_missing_email**: Login fails when email is missing
- **test_login_missing_password**: Login fails when password is missing
- **test_login_empty_email**: Login fails with empty email string
- **test_login_empty_password**: Login fails with empty password string

#### Authentication Tests
- **test_login_invalid_email**: Login fails with non-existent email
- **test_login_invalid_password**: Login fails with incorrect password

#### Error Handling Tests
- **test_login_no_data**: Login fails when no data is provided
- **test_login_empty_json**: Login fails with empty JSON payload

### Integration Tests

#### End-to-End Scenarios
- **test_register_and_login_flow**: Complete user journey from registration to login
- **test_multiple_users_registration_and_login**: Multiple users can register and login independently

## Test Data and Fixtures

### Fixtures

- **client**: Flask test client with in-memory database
- **sample_user_data**: Valid user data for basic testing
- **invalid_emails**: Collection of invalid email formats for validation testing
- **invalid_passwords**: Collection of weak passwords for validation testing
- **valid_user_variations**: Multiple valid user datasets for comprehensive testing

### Test Data Patterns

**Valid Email Formats**:
- user@example.com
- test.user@domain.co.uk
- user1@test.org

**Invalid Email Formats**:
- Empty strings
- Missing @ symbol
- Missing domain
- Missing TLD
- Emails exceeding length limits

**Valid Password Requirements**:
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

## Running Tests

### Prerequisites

Install required dependencies:
```bash
pip install flask flask-cors flask-sqlalchemy bcrypt pyjwt pytest pytest-flask
```

### Running All Tests

```bash
# From the backend directory
python -m pytest tests/

# With verbose output
python -m pytest tests/ -v

# With coverage report (if coverage installed)
python -m pytest tests/ --cov=chordme
```

### Running Specific Test Categories

```bash
# Health endpoint tests
python -m pytest tests/test_auth.py::TestHealthEndpoint -v

# Registration tests
python -m pytest tests/test_auth.py::TestUserRegistration -v

# Login tests
python -m pytest tests/test_auth.py::TestUserLogin -v

# Integration tests
python -m pytest tests/test_auth.py::TestIntegrationScenarios -v
```

### Running Individual Tests

```bash
# Specific test method
python -m pytest tests/test_auth.py::TestUserRegistration::test_successful_registration -v
```

## Test Results Interpretation

### Successful Test Run

```
tests/test_auth.py::TestHealthEndpoint::test_health_check PASSED
tests/test_auth.py::TestUserRegistration::test_successful_registration PASSED
tests/test_auth.py::TestUserLogin::test_successful_login PASSED
...
25 passed in 6.64s
```

### Test Failures

When tests fail, pytest provides detailed error information including:
- Expected vs actual values
- Request/response data
- Stack traces for debugging

## API Behavior Validation

### Registration Endpoint Behavior

**Valid Registration Response (201)**:
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-01-01T12:00:00.000000",
    "updated_at": "2024-01-01T12:00:00.000000"
  }
}
```

**Registration Error Response (400/409)**:
```json
{
  "status": "error",
  "error": "Error message description"
}
```

### Login Endpoint Behavior

**Valid Login Response (200)**:
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "created_at": "2024-01-01T12:00:00.000000",
      "updated_at": "2024-01-01T12:00:00.000000"
    }
  }
}
```

**Login Error Response (400/401)**:
```json
{
  "status": "error",
  "error": "Error message description"
}
```

## Security Validation

The test suite validates several security measures:

1. **Password Hashing**: Passwords are never returned in responses
2. **Email Normalization**: Emails are converted to lowercase to prevent duplicate accounts
3. **JWT Token Security**: Tokens contain proper claims and expiration
4. **Input Validation**: All inputs are properly validated before processing
5. **Error Messages**: Generic error messages prevent user enumeration

## Extending the Test Suite

### Adding New Tests

To add new test cases:

1. Create test methods following the naming convention `test_*`
2. Use appropriate test class based on functionality
3. Include docstrings describing the test purpose
4. Use fixtures for common test data
5. Follow the existing assertion patterns

### Example New Test

```python
def test_registration_custom_scenario(self, client):
    """Test registration with specific business logic."""
    # Arrange
    user_data = {'email': 'test@example.com', 'password': 'CustomPass123'}
    
    # Act
    response = client.post(
        '/api/v1/auth/register',
        json=user_data,
        content_type='application/json'
    )
    
    # Assert
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['status'] == 'success'
    # Additional assertions...
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- Fast execution (< 10 seconds for full suite)
- No external dependencies
- Deterministic results
- Clear pass/fail indicators
- Detailed error reporting

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure the backend directory is in Python path
2. **Database Errors**: Tests use in-memory database, no setup required
3. **Dependency Issues**: Install all required packages as listed in prerequisites

### Debug Mode

Run tests with additional debugging:

```bash
python -m pytest tests/ -v -s --tb=long
```

This provides more detailed output and preserves print statements for debugging.