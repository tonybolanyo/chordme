# CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the ChordMe project.

## Overview

The project uses GitHub Actions for automated testing, linting, and building of both frontend and backend components on every pull request and push to the main branch.

## Workflows

### 1. Main CI/CD Pipeline (`ci.yml`)

This is the primary workflow that runs comprehensive checks on both frontend and backend:

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**

#### Frontend CI
- **Node.js**: v20.x
- **Steps**:
  1. Install dependencies with `npm ci`
  2. Run ESLint linting
  3. Check Prettier formatting
  4. TypeScript type checking
  5. Build production bundle
  6. Upload build artifacts

#### Backend CI
- **Python**: v3.12
- **Steps**:
  1. Install Python dependencies
  2. Setup configuration files
  3. Run pytest test suite
  4. Test application startup

#### Security Checks (PR only)
- Frontend security audit with `npm audit`
- Secret scanning with TruffleHog

### 2. Frontend-Specific CI (`frontend-ci.yml`)

Dedicated workflow for frontend changes only:

**Triggers:**
- Changes to `frontend/**` directory
- Changes to the workflow file itself

**Features:**
- Faster CI for frontend-only changes
- Same checks as main pipeline but focused

### 3. Backend-Specific CI (`backend-ci.yml`)

Dedicated workflow for backend changes only:

**Triggers:**
- Changes to `backend/**` directory  
- Changes to the workflow file itself

**Features:**
- Faster CI for backend-only changes
- Same checks as main pipeline but focused

### 4. Dependency Updates (`dependency-updates.yml`)

Automated dependency management:

**Schedule:** Every Monday at 9 AM UTC

**Features:**
- Updates npm packages for frontend
- Updates Python packages for backend using pip-tools
- Creates pull requests for review
- Can be triggered manually

## Local Development

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run linting
npm run lint

# Check formatting
npm run format:check

# Fix formatting
npm run format

# Type check
npx tsc --noEmit

# Build
npm run build

# Dev server
npm run dev
```

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Setup configuration
cp config.template.py config.py

# Run tests
export FLASK_CONFIG=test_config
python -m pytest tests/ -v

# Start development server
python run.py
```

## Configuration

### Frontend Configuration
- ESLint configuration in `eslint.config.js`
- Prettier configuration in `.prettierrc`
- TypeScript configuration in `tsconfig.json`
- Vite configuration in `vite.config.ts`

### Backend Configuration
- Test configuration in `test_config.py`
- Main configuration template in `config.template.py`
- pytest configuration in `pytest.ini`

## Artifacts

The CI pipeline generates and stores the following artifacts:

- **Frontend Build**: Production-ready static files (`dist/`)
- **Retention**: 7 days

## Status Badges

Add these badges to your README to show CI status:

```markdown
![CI/CD Pipeline](https://github.com/tonybolanyo/chordme/actions/workflows/ci.yml/badge.svg)
![Frontend CI](https://github.com/tonybolanyo/chordme/actions/workflows/frontend-ci.yml/badge.svg)
![Backend CI](https://github.com/tonybolanyo/chordme/actions/workflows/backend-ci.yml/badge.svg)
```

## Troubleshooting

### Common Issues

1. **Frontend build fails**: Check for TypeScript errors or missing dependencies
2. **Backend tests fail**: Ensure `test_config.py` is properly configured
3. **Dependency conflicts**: Review automated dependency update PRs carefully

### Manual Workflow Triggering

You can manually trigger workflows from the GitHub Actions tab:
- Go to Actions → Select workflow → Run workflow

## Contributing

When contributing:
1. Ensure all CI checks pass before requesting review
2. Fix any linting or formatting issues
3. Add tests for new functionality
4. Update documentation if needed

The CI pipeline helps maintain code quality and prevents regressions by automatically checking:
- ✅ Code formatting and style
- ✅ Type safety
- ✅ Build success
- ✅ Test coverage
- ✅ Security vulnerabilities