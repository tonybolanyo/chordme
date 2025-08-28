---
layout: default
lang: en
title: CodeCov Integration
---

# Codecov Configuration

This repository is configured with Codecov to track code coverage across three main components:

## Components

### 1. Backend Coverage
- **Path**: `backend/`
- **Tool**: pytest with pytest-cov
- **Reports**: XML and LCOV formats
- **Target**: 75% coverage
- **Configuration**: `backend/pytest.ini`

### 2. Frontend Coverage  
- **Path**: `frontend/`
- **Tool**: Vitest with @vitest/coverage-v8
- **Reports**: LCOV, JSON, HTML formats
- **Target**: 60% coverage
- **Configuration**: `frontend/vite.config.ts`

### 3. Integration Test Coverage
- **Path**: `integration-tests/`
- **Tool**: pytest with pytest-cov
- **Reports**: XML and LCOV formats
- **Target**: 50% coverage
- **Configuration**: `integration-tests/pytest.ini`

## Configuration Files

### codecov.yml
The main configuration file that defines:
- Coverage targets for each component
- Flags for separating coverage reports
- Ignore patterns for test files and build artifacts
- Comment format and behavior

### CI Workflows
All GitHub Actions workflows upload coverage to Codecov:
- `.github/workflows/ci.yml` - Main CI pipeline
- `.github/workflows/backend-ci.yml` - Backend-specific CI
- `.github/workflows/frontend-ci.yml` - Frontend-specific CI

## Running Coverage Locally

### Backend
```bash
cd backend
FLASK_CONFIG=test_config python -m pytest tests/ -v --cov=chordme --cov-report=xml --cov-report=lcov
```

### Frontend
```bash
cd frontend
npm run test:coverage
```

### Integration Tests
```bash
cd integration-tests
python -m pytest -v --cov=. --cov-report=xml --cov-report=lcov
```

### All Components
```bash
npm run test:coverage  # Runs frontend and backend coverage
npm run test:integration  # Runs integration tests with coverage
```

## Coverage Reports

After running tests, coverage reports are generated in:
- Backend: `backend/coverage.xml`, `backend/coverage.lcov`
- Frontend: `frontend/coverage/lcov.info`, `frontend/coverage/coverage-final.json`
- Integration: `integration-tests/coverage.xml`, `integration-tests/coverage.lcov`

## Codecov Dashboard

Visit [https://app.codecov.io/github/tonybolanyo/chordme](https://app.codecov.io/github/tonybolanyo/chordme) to view:
- Overall project coverage
- Coverage by component (backend, frontend, integration)
- Coverage trends over time
- Pull request coverage impact