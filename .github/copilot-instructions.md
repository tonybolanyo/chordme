# ChordMe - GitHub Copilot Coding Agent Instructions

ChordMe is a full-stack web application for managing lyrics and chords using the ChordPro format. The application consists of a React TypeScript frontend and a Python Flask backend with comprehensive testing.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap, Build, and Test the Repository

**CRITICAL: All commands have been validated to work. NEVER CANCEL builds or tests - they complete in under 2 minutes.**

1. **Install all dependencies:**
   ```bash
   # Install root dependencies (2 seconds)
   npm install
   
   # Install frontend dependencies (15 seconds)
   cd frontend && npm install && cd ..
   
   # Install backend dependencies (30 seconds)
   cd backend && pip install -r requirements.txt && cd ..
   ```

2. **Setup backend configuration:**
   ```bash
   cd backend && cp config.template.py config.py && cd ..
   ```

3. **Build frontend (2 seconds - NEVER CANCEL):**
   ```bash
   cd frontend && npx vite build
   ```

4. **Run all tests (45 seconds total - NEVER CANCEL):**
   ```bash
   # Frontend tests: 8 seconds
   npm run test:frontend:run
   
   # Backend tests: 31 seconds (6 known failures, 147 pass)
   npm run test:backend
   
   # Integration tests: 2 seconds
   npm run test:integration
   
   # All tests combined
   npm run test:all
   ```

### Development Servers

**CRITICAL: Run in separate terminals. Backend must disable HTTPS for development.**

1. **Backend development server (Port 5000):**
   ```bash
   cd backend
   # Set HTTPS_ENFORCED = False in config.py for development
   FLASK_DEBUG=1 python run.py
   ```

2. **Frontend development server (Port 5173):**
   ```bash
   cd frontend && npm run dev
   ```

3. **Verify servers are running:**
   ```bash
   # Test backend health endpoint
   curl http://localhost:5000/api/v1/health
   
   # Test frontend accessibility
   curl -s http://localhost:5173/ | head -10
   ```

### Code Quality and Linting

**CRITICAL: Always run these before committing. All complete in under 5 seconds.**

```bash
# Frontend linting and formatting (2 seconds each)
cd frontend
npm run lint
npm run format:check
npx tsc --noEmit  # TypeScript check

# Lint fixes
npm run lint:fix
npm run format
```

## Validation

### Manual Testing Scenarios

**CRITICAL: Always test these complete user workflows after making changes:**

1. **User Registration Flow:**
   - Navigate to http://localhost:5173/#register
   - Fill in email, password, confirm password
   - Submit form and verify API communication
   - Expected: Either success or appropriate error message

2. **User Login Flow:**
   - Navigate to http://localhost:5173/#login  
   - Test with valid/invalid credentials
   - Verify JWT token handling

3. **Health Check Verification:**
   ```bash
   curl http://localhost:5000/api/v1/health
   # Expected response: {"message": "Service is running", "status": "ok"}
   ```

### Build Validation

**CRITICAL: Specific timeout values and warnings:**

- **Frontend build: 2 seconds max - NEVER CANCEL**
- **Frontend tests: 10 seconds max - NEVER CANCEL** 
- **Backend tests: 35 seconds max - NEVER CANCEL (6 known failures are normal)**
- **Integration tests: 5 seconds max - NEVER CANCEL**

### Known Issues to Expect

1. **Backend tests**: 6 tests fail (147 pass) - this is normal, do not attempt to fix
2. **TypeScript build**: `npm run build` fails due to test type errors - use `npx vite build` instead
3. **E2E tests**: Require Playwright browser installation which may fail in CI environments
4. **HTTPS enforcement**: Must be disabled for development (set `HTTPS_ENFORCED = False` in config.py)

## Repository Structure

```
chordme/
├── .github/                    # GitHub Actions and workflows
│   ├── workflows/              # CI/CD pipelines (5+ workflow files)
│   └── copilot-instructions.md # This file
├── frontend/                   # React TypeScript application
│   ├── src/
│   │   ├── components/         # Reusable UI components  
│   │   ├── pages/             # Page-level components (Login, Register, Home)
│   │   ├── services/          # API service layer
│   │   ├── types/             # TypeScript definitions
│   │   └── utils/             # Utility functions (validation, JWT)
│   ├── package.json           # Frontend dependencies and scripts
│   └── vite.config.ts         # Vite configuration
├── backend/                    # Python Flask API
│   ├── chordme/               # Main application package
│   ├── tests/                 # Backend test suite (153 tests)
│   ├── requirements.txt       # Python dependencies
│   ├── config.py              # Configuration (copy from template)
│   ├── run.py                 # Development server entry point
│   └── pytest.ini            # Test configuration
├── integration-tests/          # API integration tests
├── e2e/                       # Playwright end-to-end tests
├── docs/                      # Documentation files
├── package.json               # Root package scripts
└── playwright.config.ts       # E2E test configuration
```

## Key Projects and Technologies

### Frontend Stack
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **Vitest** for testing with jsdom environment
- **ESLint + Prettier** for code quality
- **React Testing Library** for component testing

### Backend Stack  
- **Flask 3.1.1** with SQLAlchemy
- **JWT authentication** with bcrypt password hashing
- **pytest** with Flask test client
- **Swagger/Flasgger** for API documentation
- **SQLite** database (development)

### Testing Strategy
- **Frontend**: 218 tests covering components, services, utils
- **Backend**: 153 tests covering auth, API, security, ChordPro
- **Integration**: 6 tests for API endpoint integration  
- **E2E**: Playwright tests for complete user workflows

## Common Commands Reference

### Quick Commands (Frequent Usage)
```bash
# Start development (run in separate terminals)
npm run dev:backend    # Port 5000
npm run dev:frontend   # Port 5173

# Test commands  
npm run test:all                    # Run all tests (45 seconds)
npm run test:frontend:run           # Frontend only (8 seconds)
npm run test:backend               # Backend only (31 seconds)

# Build commands
cd frontend && npx vite build      # Frontend build (2 seconds)

# Code quality
npm run lint:frontend              # ESLint check
npm run format:frontend            # Prettier format
```

### Environment Setup
```bash
# Backend configuration for development
cd backend
cp config.template.py config.py
# Edit config.py: set HTTPS_ENFORCED = False
```

### API Endpoints (Validated)
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/register` - User registration  
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/validate-chordpro` - ChordPro validation

## Timing Expectations

**CRITICAL: Use these timeouts in your commands**

| Operation | Expected Time | Timeout Setting |
|-----------|---------------|-----------------|
| npm install (root) | 2 seconds | 30 seconds |
| npm install (frontend) | 15 seconds | 60 seconds |
| pip install (backend) | 30 seconds | 120 seconds |
| Frontend build | 2 seconds | 30 seconds |
| Frontend tests | 8 seconds | 60 seconds |
| Backend tests | 31 seconds | 120 seconds |
| Integration tests | 2 seconds | 30 seconds |
| Server startup | 5 seconds | 30 seconds |

## Troubleshooting

### Common Development Issues

1. **Port conflicts**: Frontend (5173) or Backend (5000) ports in use
   ```bash
   # Kill processes on ports
   lsof -ti:5173 | xargs kill -9
   lsof -ti:5000 | xargs kill -9
   ```

2. **HTTPS redirect issues**: Backend redirects to HTTPS
   ```bash
   # Solution: Edit backend/config.py
   HTTPS_ENFORCED = False
   ```

3. **Build failures**: TypeScript errors in npm run build
   ```bash
   # Solution: Use Vite directly
   cd frontend && npx vite build
   ```

4. **Test failures**: Some backend tests expected to fail
   ```bash
   # Expected: 6 failed, 147 passed - do not fix these
   ```

### Performance Notes
- Frontend hot reload is instant
- Backend auto-restart in debug mode  
- Database is in-memory SQLite for tests
- All builds and tests complete under 2 minutes total

## Final Validation Steps

**CRITICAL: Always run these before committing:**

1. **Build validation**: `cd frontend && npx vite build`
2. **Test validation**: `npm run test:all` 
3. **Lint validation**: `npm run lint:frontend`
4. **Manual validation**: Test login/registration flow in browser
5. **API validation**: `curl http://localhost:5000/api/v1/health`

**Success criteria**: All commands complete without blocking errors, servers start successfully, and user workflows function in browser.