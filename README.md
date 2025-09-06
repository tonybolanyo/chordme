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
- **[Workflows Documentation](WORKFLOWS_DOCUMENTATION.md)** - Complete guide to all GitHub Actions workflows
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

## 🐳 Docker Setup (Recommended)

For a complete containerized development environment, use Docker Compose or Minikube:

### Development Database (Easiest)

Start just the database and Redis services, run your app locally:

```bash
# Start database and Redis in containers
npm run docker:dev

# In separate terminals, run the app locally:
npm run dev:backend    # Terminal 1 (Flask API - Port 5000)
npm run dev:frontend   # Terminal 2 (React App - Port 5173)

# Access the application:
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000
# Database: localhost:5432 (PostgreSQL)

# Stop services when done
npm run docker:dev:stop
```

### Full Docker Compose

```bash
# Start all services (database, backend, frontend)
npm run docker:start

# Check status
npm run docker:status

# Stop services
npm run docker:stop
```

### Minikube (Kubernetes)

```bash
# Complete setup (start cluster + deploy application)
npm run k8s:setup

# Open application in browser
./scripts/docker/minikube-setup.sh open

# Clean up
npm run k8s:cleanup
```

**[📖 Complete Docker Documentation](docs/docker-development.md)** - Detailed setup and troubleshooting guide

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

ChordMe features **comprehensive integration testing** covering all major features and user workflows.

#### Test Coverage Summary

| Category | Count | Coverage |
|----------|-------|----------|
| **Frontend Tests** | 218+ | Components, Services, Utils |
| **Backend Tests** | 1,039+ | API, Security, Models |
| **Integration Tests** | 11 | End-to-end workflows |
| **E2E Tests** | 197 | Complete user journeys |
| **Total Coverage** | **1,465+ tests** | **All major features** |

#### Test Execution Commands

```bash
# Run all tests
npm run test:all

# Frontend tests (218+ tests)
npm run test:frontend:run

# Backend tests (1039+ tests)
npm run test:backend

# Integration tests (11 tests)
npm run test:integration

# E2E tests (197 tests)
npx playwright test

# Performance validation
python scripts/validate_integration_testing.py
```

#### Integration Testing Documentation

- 📊 [Integration Testing Report](docs/INTEGRATION_TESTING_REPORT.md)
- 🚀 [Integration Testing Demo](docs/INTEGRATION_TESTING_DEMO.md)
- 📋 [E2E Testing Documentation](docs/E2E_TESTING.md)

#### Features Tested

- ✅ **ChordPro Editor** with syntax highlighting and validation
- ✅ **Transposition System** with chord recognition
- ✅ **Chord Diagrams** integrated with editor
- ✅ **Search and Filtering** across all song data
- ✅ **Cross-browser Compatibility** verification
- ✅ **Mobile Responsiveness** testing
- ✅ **Accessibility Compliance** (WCAG 2.1)
- ✅ **Security Testing** (OWASP standards)

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

### Deployment Workflows

ChordMe supports multiple deployment strategies:

**🎯 Recommended: Netlify + Railway + Supabase**
- **Frontend**: Automated deployment to Netlify with preview URLs
- **Backend**: Containerized deployment to Railway with auto-scaling  
- **Database**: Supabase PostgreSQL with automated migrations
- **Workflow**: `deploy-full-stack.yml` for complete automation

**🔄 Alternative: Vercel + Render + PostgreSQL**
- **Frontend**: Vercel deployment (existing workflow)
- **Backend**: Render.com deployment
- **Database**: Hosted PostgreSQL

**Deployment Commands:**
```bash
# Full stack deployment
npm run deploy:production    # Deploy everything to production
npm run deploy:staging       # Deploy everything to staging

# Individual deployments
npm run deploy:netlify       # Frontend only (Netlify)
npm run deploy:railway       # Backend only (Railway)
npm run migrate              # Database migrations only

# Health checks
npm run health-check --frontend-url=https://app.netlify.app --backend-url=https://api.railway.app
```

### Workflows

- **Main CI/CD Pipeline**: Comprehensive testing for both frontend and backend
- **Full Stack Deployment**: `deploy-full-stack.yml` - Complete automation with health checks
- **Netlify Deployment**: `deploy-netlify.yml` - Frontend deployment with PR previews
- **Railway Deployment**: `deploy-railway.yml` - Backend deployment with database migrations
- **Frontend CI**: Optimized workflow for frontend-only changes
- **Backend CI**: Optimized workflow for backend-only changes  
- **Dependency Updates**: Automated weekly dependency updates

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

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
