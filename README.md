# ChordMe

Lyrics and chords in a simple way

![CI/CD Pipeline](https://github.com/tonybolanyo/chordme/actions/workflows/ci.yml/badge.svg)
![Frontend CI](https://github.com/tonybolanyo/chordme/actions/workflows/frontend-ci.yml/badge.svg)
![Backend CI](https://github.com/tonybolanyo/chordme/actions/workflows/backend-ci.yml/badge.svg)

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

# Run with coverage (if pytest-cov installed)
python -m pytest tests/ --cov=chordme
```

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
