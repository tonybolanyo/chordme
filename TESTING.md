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
- Uses Playwright for browser automation

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

- Frontend tests cover key components and basic functionality
- Backend tests provide comprehensive coverage of API endpoints
- Integration tests verify API contracts
- E2E tests validate critical user workflows