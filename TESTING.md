# ChordMe Testing Guide

This document describes the testing setup for the ChordMe application.

## Testing Overview

The project now includes comprehensive testing infrastructure:

1. **Frontend Unit Tests** - Tests for React components using Vitest and React Testing Library
2. **Backend Unit Tests** - Existing pytest-based tests for Flask API endpoints
3. **Integration Tests** - Tests that verify API functionality with real HTTP requests
4. **End-to-End Tests** - Playwright tests that test the full application flow

## Running Tests

### Frontend Unit Tests
```bash
# Run tests in watch mode
npm run test:frontend

# Run tests once
npm run test:frontend:run

# From frontend directory
cd frontend
npm test
```

### Backend Unit Tests
```bash
# Run backend tests
npm run test:backend

# From backend directory
cd backend
FLASK_CONFIG=test_config python -m pytest tests/ -v
```

### Integration Tests
```bash
# Run integration tests (requires backend server running)
npm run test:integration

# From integration-tests directory
cd integration-tests
python -m pytest -v
```

### End-to-End Tests
```bash
# Run E2E tests (requires both frontend and backend running)
npm run test:e2e

# From root directory
npx playwright test
```

### Run All Tests
```bash
npm run test:all
```

## Test Structure

### Frontend Tests (`frontend/src/`)
- `App.test.tsx` - Tests for main App component
- `components/Layout/Layout.test.tsx` - Tests for Layout component
- `components/Header/Header.test.tsx` - Tests for Header component
- `test/setup.ts` - Test configuration and setup

### Backend Tests (`backend/tests/`)
- Comprehensive test suite with 153+ test cases
- Tests for authentication, song management, file upload/download, security features
- Uses pytest and pytest-flask

### Integration Tests (`integration-tests/`)
- `test_api_integration.py` - Tests API endpoints with real HTTP requests
- Tests registration, login, song creation flows
- Validates API responses and error handling

### E2E Tests (`e2e/`)
- `basic-navigation.spec.ts` - Tests application navigation and basic functionality
- `authentication.spec.ts` - Tests user registration and login workflows
- `chordpro-demo.spec.ts` - Tests ChordPro editor and demo functionality
- `song-management.spec.ts` - Tests authenticated user song management operations
- `error-handling.spec.ts` - Tests error handling and edge cases
- `ui-accessibility.spec.ts` - Tests UI/UX and accessibility compliance
- Uses Playwright for browser automation
- Covers all critical user workflows (77 test cases total)

## Test Configuration

### Frontend (Vitest)
- Configuration in `vite.config.ts`
- Uses jsdom environment for DOM testing
- Includes React Testing Library for component testing

### Backend (pytest)
- Configuration in `backend/pytest.ini`
- Uses in-memory SQLite database for testing
- Includes Flask test client

### Integration Tests (pytest)
- Configuration in `integration-tests/pytest.ini`
- Tests against running backend server
- Uses requests library for HTTP calls

### E2E Tests (Playwright)
- Configuration in `playwright.config.ts`
- Automatically starts frontend and backend servers
- Tests in Chromium browser

## Development Workflow

1. **Unit Tests**: Run during development to catch component/function level issues
2. **Integration Tests**: Run to verify API contracts and data flow
3. **E2E Tests**: Run to verify complete user workflows

## CI/CD Integration

All test types can be run in CI environments:

- Frontend tests require Node.js environment
- Backend tests require Python environment with dependencies
- Integration tests require backend server to be running
- E2E tests require both frontend and backend servers plus browser automation

## Coverage

### Comprehensive Test Suite Statistics
- **Frontend Unit Tests**: 3 files with component testing
- **Backend Unit Tests**: 153+ test cases with comprehensive API coverage  
- **Integration Tests**: API endpoint testing with real HTTP requests
- **End-to-End Tests**: 77 test cases across 6 test files covering:
  - Authentication workflows (15 tests)
  - ChordPro editor functionality (13 tests) 
  - Song management operations (12 tests)
  - Error handling and edge cases (18 tests)
  - UI/UX and accessibility (15 tests)
  - Basic navigation (4 tests)

### Critical Workflows Tested
1. **User Authentication**: Registration, login, validation, session management
2. **Song Management**: Create, read, update, delete songs with ChordPro content
3. **ChordPro Editor**: Interactive editing, syntax highlighting, real-time preview
4. **File Operations**: Upload/download individual and bulk song files
5. **Error Handling**: Network errors, validation errors, edge cases
6. **Accessibility**: Keyboard navigation, screen readers, responsive design

### Test Quality Metrics
- **API Coverage**: All 17 backend endpoints tested
- **User Journey Coverage**: Complete end-to-end workflows
- **Accessibility Compliance**: WCAG guidelines validated
- **Cross-Device Testing**: Mobile, tablet, desktop viewports
- **Error Scenario Coverage**: Network failures, invalid inputs, edge cases

### Legacy Coverage Summary
- Frontend tests cover key components and basic functionality
- Backend tests provide comprehensive coverage of API endpoints
- Integration tests verify API contracts
- E2E tests validate critical user workflows

## Updated Coverage Requirements and Standards

### Coverage Thresholds (Enforced by CI)
- **Overall Project**: 90%+ coverage required
- **Backend**: 90%+ coverage required  
- **Frontend**: 90%+ coverage required
- **Integration**: 85%+ coverage required

### Running Coverage Reports

#### Backend Coverage
```bash
# Generate comprehensive backend coverage report
cd backend
FLASK_CONFIG=test_config python -m pytest tests/test_*.py -v \
  --cov=chordme \
  --cov-report=term-missing \
  --cov-report=html:htmlcov \
  --cov-report=xml:coverage.xml

# View HTML report
open htmlcov/index.html
```

#### Frontend Coverage  
```bash
# Generate frontend coverage report
cd frontend
npm run test:coverage

# Reports generated in coverage/ directory
```

### Coverage Enforcement
- **CI Integration**: GitHub Actions automatically check coverage on PRs
- **Build Failures**: Builds **WILL FAIL** if coverage drops below thresholds (90% backend, 90% frontend)
- **Codecov Integration**: Detailed coverage tracking and reporting with failure notifications
- **Coverage Reports**: Generated for all pull requests with detailed breakdown

### Recent Test Coverage Improvements

#### Backend Test Enhancements (New in v1.0)
- **Utils Module Coverage**: Added `test_utils_coverage.py` with 26 comprehensive tests covering:
  - HTML sanitization and XSS prevention functions
  - Email and password validation with edge cases  
  - JWT token generation, verification, and expiration handling
  - Input sanitization for DoS and injection prevention
  - Authentication decorators and authorization checks
  - Request validation and security helper functions

#### Frontend Test Fixes (New in v1.0)
- **Critical Test Failures Resolved**: Fixed 7 failing tests in core modules
- **Firebase Integration**: Improved mocking and configuration handling
- **Main Entry Point**: Enhanced module loading and DOM interaction tests

### Adding New Tests

#### Backend Unit Tests
1. Create test file in `backend/tests/test_*.py`
2. Follow existing patterns using pytest fixtures
3. Use Flask test client for API endpoints
4. Include edge cases and error scenarios

#### Frontend Unit Tests
1. Create test file alongside component: `*.test.tsx`
2. Use Vitest and React Testing Library
3. Mock external dependencies (Firebase, APIs)
4. Test user interactions and state changes

#### Integration Tests
1. Add tests to `integration-tests/test_*.py`
2. Test real API endpoints with HTTP requests
3. Validate complete workflows
4. Include error handling scenarios

### Test Quality Guidelines

#### Comprehensive Testing
- **Happy Path**: Normal user workflows
- **Edge Cases**: Boundary conditions and limits
- **Error Scenarios**: Network failures, invalid inputs
- **Security**: Authentication, authorization, input validation
- **Performance**: Large data sets, concurrent operations

#### Best Practices
- **Isolation**: Tests should not depend on each other
- **Repeatability**: Tests should produce consistent results
- **Documentation**: Clear test names and comments
- **Mocking**: Mock external services appropriately
- **Assertions**: Specific and meaningful test assertions

### Coverage Monitoring Tools

#### Codecov Configuration
- Project coverage target: 90%
- Patch coverage target: 85%
- Automatic PR comments with coverage changes
- Flag-based coverage for backend/frontend/integration

#### Local Coverage Tools
- Backend: pytest-cov with HTML reports
- Frontend: Vitest with v8 coverage provider
- Integration: Combined reporting with overall metrics

### Debugging Test Failures

#### Backend Test Issues
```bash
# Run specific test with verbose output
pytest tests/test_specific.py::TestClass::test_method -v -s

# Run with debugging
pytest tests/test_specific.py --pdb
```

#### Frontend Test Issues
```bash
# Run specific test file
npm test -- ComponentName.test.tsx

# Run with debugging
npm test -- --inspect-brk
```

### Documentation Requirements

When adding new features:
1. **Unit Tests**: Cover all new functions/components
2. **Integration Tests**: Test new API endpoints
3. **Documentation**: Update this guide with new patterns
4. **Coverage**: Ensure overall coverage remains above 90%

This comprehensive testing strategy ensures ChordMe maintains high code quality and reliability while supporting rapid development and deployment.