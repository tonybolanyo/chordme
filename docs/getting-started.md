# Getting Started with ChordMe

This guide will help you set up and run ChordMe on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** - For running the frontend
- **Python 3.12+** - For running the backend
- **npm** - For managing frontend dependencies
- **pip** - For managing Python dependencies
- **Git** - For cloning the repository

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tonybolanyo/chordme.git
cd chordme
```

### 2. Install Dependencies

#### Root Dependencies
```bash
npm install
```

#### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

#### Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Configure the Backend

```bash
cd backend
cp config.template.py config.py
# Edit config.py with your settings if needed
cd ..
```

### 4. Start the Development Servers

#### Option A: Start Both Services Simultaneously

```bash
# In one terminal - Backend
npm run dev:backend

# In another terminal - Frontend
npm run dev:frontend
```

#### Option B: Manual Startup

**Backend:**
```bash
cd backend
python run.py
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/v1/health

## Environment Configuration

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### Backend Configuration

The backend uses `config.py` for configuration. Key settings include:

```python
# Database configuration
SQLALCHEMY_DATABASE_URI = 'sqlite:///chordme.db'

# JWT configuration
JWT_SECRET_KEY = 'your-secret-key-here'
JWT_EXPIRATION_DELTA = 3600  # 1 hour

# Flask configuration
SECRET_KEY = 'your-flask-secret-key'
```

## First Steps

### 1. Register a User Account

Navigate to the registration page and create your first user account.

### 2. Login

Use your credentials to log in and receive a JWT token for API access.

### 3. Create Your First Song

Use the web interface or API to create your first song with ChordPro format.

## Development Mode

### Frontend Development Features

- **Hot Reload**: Changes are automatically reflected in the browser
- **TypeScript Support**: Full type checking and IntelliSense
- **ESLint Integration**: Code quality checks as you type
- **Prettier Formatting**: Automatic code formatting

### Backend Development Features

- **Auto-reload**: Flask development server reloads on code changes
- **Comprehensive Testing**: Run tests with `python -m pytest tests/ -v`
- **API Documentation**: Interactive API exploration via endpoints

## Useful Commands

### Build and Test Commands

```bash
# Frontend
npm run build:frontend        # Build for production
npm run test:frontend        # Run frontend tests
npm run lint:frontend        # Check code quality

# Backend
npm run test:backend         # Run backend tests
python -m pytest tests/ -v  # Direct backend testing

# Full Application
npm run test:all            # Run all tests
npm run test:coverage       # Generate coverage reports
```

### Development Workflow Commands

```bash
# Code Quality
npm run lint:frontend       # Lint frontend code
cd frontend && npm run format  # Format frontend code

# Database Management (Backend)
cd backend
python -c "from chordme import app, db; app.app_context().push(); db.create_all()"
```

## Troubleshooting Setup Issues

### Port Conflicts

If you encounter port conflicts:

- **Frontend**: Change the port in `vite.config.ts`
- **Backend**: Set `PORT` environment variable or modify `run.py`

### Database Issues

```bash
# Reset the database
cd backend
rm -f chordme.db
python -c "from chordme import app, db; app.app_context().push(); db.create_all()"
```

### Dependency Issues

```bash
# Clean and reinstall frontend dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clean and reinstall backend dependencies
cd backend
pip install --force-reinstall -r requirements.txt
```

## Next Steps

Once you have ChordMe running locally:

1. Read the [User Guide](user-guide.md) to learn how to use all features
2. Explore the [ChordPro Format](chordpro-format.md) documentation
3. Check out the [API Reference](api-reference.md) for programmatic access
4. See the [Developer Guide](developer-guide.md) if you want to contribute

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the error logs in your terminal
3. Open an issue on the [GitHub repository](https://github.com/tonybolanyo/chordme/issues)
4. Check existing issues for similar problems

---

*Need more detailed information? See the complete [User Manual](README.md).*