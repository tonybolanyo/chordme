---
layout: default
title: ChordMe - Lyrics and Chords Management
description: A full-stack web application for managing lyrics and chords using the ChordPro format
---

# ChordMe

Lyrics and chords in a simple way

![CI/CD Pipeline](https://github.com/tonybolanyo/chordme/actions/workflows/ci.yml/badge.svg)
![Frontend CI](https://github.com/tonybolanyo/chordme/actions/workflows/frontend-ci.yml/badge.svg?label=frontend)
![Backend CI](https://github.com/tonybolanyo/chordme/actions/workflows/backend-ci.yml/badge.svg?label=backend)
![Documentation](https://github.com/tonybolanyo/chordme/actions/workflows/deploy-docs.yml/badge.svg)

[![codecov](https://codecov.io/gh/tonybolanyo/chordme/branch/main/graph/badge.svg)](https://codecov.io/gh/tonybolanyo/chordme)
[![Frontend Coverage](https://codecov.io/gh/tonybolanyo/chordme/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/tonybolanyo/chordme)
[![Backend Coverage](https://codecov.io/gh/tonybolanyo/chordme/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/tonybolanyo/chordme)

## 📖 Documentation

**[Complete User Manual](https://tonybolanyo.github.io/chordme/)** - Comprehensive documentation including:

- **[Getting Started](docs/getting-started.md)** - Installation and setup guide
- **[User Guide](docs/user-guide.md)** - Complete feature documentation  
- **[ChordPro Format](docs/chordpro-format.md)** - ChordPro format reference
- **[API Reference](docs/api-reference.md)** - Complete API documentation
- **[Developer Guide](docs/developer-guide.md)** - Contributing and development
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

*The documentation is automatically updated with each release and available at [tonybolanyo.github.io/chordme](https://tonybolanyo.github.io/chordme/).*

## Quick Start

```bash
# Clone the repository
git clone https://github.com/tonybolanyo/chordme.git
cd chordme

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && pip install -r requirements.txt && cd ..

# Configure backend
cd backend && cp config.template.py config.py && cd ..

# Start development servers
npm run dev:backend    # Terminal 1 (Flask API - Port 5000)
npm run dev:frontend   # Terminal 2 (React App - Port 5173)
```

Then open http://localhost:5173 in your browser.

## Project Structure

This project consists of two main parts:

- **Backend**: Python Flask API (in `/backend`)
- **Frontend**: React with TypeScript (in `/frontend`)

## Frontend Setup

The frontend is built with:
- **React 19** with TypeScript
- **Vite** for fast development and building
- **ESLint** and **Prettier** for code quality
- Modern folder structure with components, pages, services, and utilities

### Getting Started

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run preview` - Preview production build

### Folder Structure

```
frontend/src/
├── components/     # Reusable UI components
│   ├── Header/
│   └── Layout/
├── pages/         # Page components
│   └── Home/
├── services/      # API and external service calls
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── assets/        # Static assets
```

## Backend Setup

The backend is built with Python Flask and includes comprehensive automated tests for all authentication endpoints.

### Getting Started

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy configuration template:
   ```bash
   cp config.template.py config.py
   ```

4. Run the development server:
   ```bash
   python run.py
   ```

### Running Tests

The backend includes a comprehensive test suite covering all authentication endpoints:

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test categories
python -m pytest tests/test_auth.py::TestUserRegistration -v
python -m pytest tests/test_auth.py::TestUserLogin -v

# Run with coverage
python -m pytest tests/ --cov=chordme --cov-report=term --cov-report=html
```

### Test Coverage

Both frontend and backend have comprehensive test coverage reporting:

**Frontend Coverage:**
```bash
cd frontend
npm run test:coverage
```

**Backend Coverage:**
```bash
cd backend
FLASK_CONFIG=test_config python -m pytest tests/ --cov=chordme --cov-report=html:htmlcov --cov-report=xml:coverage.xml
```

**Combined Coverage:**
```bash
# Run coverage for both frontend and backend
npm run test:coverage
```

Coverage reports are generated in:
- Frontend: `frontend/coverage/` (HTML reports)
- Backend: `backend/htmlcov/` (HTML reports)

Current coverage status is displayed in the badges above and detailed reports are available through our CI/CD pipeline.

### Test Documentation

For detailed testing documentation, see [backend/TESTING.md](backend/TESTING.md).

The test suite includes:
- **25 automated tests** covering all authentication endpoints
- **Health check** endpoint validation
- **User registration** with comprehensive validation testing
- **User login** with JWT token validation
- **Integration scenarios** for end-to-end testing
- **Error handling** and edge case coverage

#### Test Coverage

- ✅ Health check endpoint (`/api/v1/health`)
- ✅ User registration endpoint (`/api/v1/auth/register`)
  - Valid registration scenarios
  - Email format validation
  - Password strength validation  
  - Duplicate user prevention
  - Error handling
- ✅ User login endpoint (`/api/v1/auth/login`)
  - Valid login scenarios
  - JWT token generation and validation
  - Invalid credentials handling
  - Error handling
- ✅ Integration tests for complete user workflows

### API Endpoints

#### Authentication Endpoints

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login (returns JWT token)
- `GET /api/v1/health` - Health check

See the test documentation for detailed API behavior and response formats.

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment. The CI/CD pipeline automatically runs on every pull request and push to the main branch.

### Automated Checks

**Frontend:**
- ESLint code linting
- Prettier code formatting validation  
- TypeScript type checking
- Production build testing
- Security vulnerability scanning

**Backend:**
- Python dependency installation
- Pytest test suite execution
- Application startup verification
- Configuration validation

### Workflows

- **Main CI/CD Pipeline**: Comprehensive testing for both frontend and backend
- **Frontend CI**: Optimized workflow for frontend-only changes
- **Backend CI**: Optimized workflow for backend-only changes  
- **Dependency Updates**: Automated weekly dependency updates

For detailed CI/CD documentation, see [CI/CD Documentation](.github/CI_CD_DOCUMENTATION.md).

### Running CI Checks Locally

**Frontend:**
```bash
cd frontend
npm install
npm run lint
npm run format:check  
npx tsc --noEmit
npm run build
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp config.template.py config.py
export FLASK_CONFIG=test_config
python -m pytest tests/ -v
```
