# Docker Setup Status

## Working Components ✅

### Database (PostgreSQL 15)
- **Status**: Fully functional
- **Port**: 5432
- **Credentials**: postgres/password (default)
- **Features**:
  - Automatic database initialization with migrations
  - All 5 migration files run on first startup
  - Health checks configured
  - Data persists in named volume `postgres_data`

### Backend (Flask API)
- **Status**: Fully functional  
- **Port**: 5000
- **Features**:
  - Automatic config.py creation from template
  - Skips SQLAlchemy table creation (uses migrations instead)
  - Health endpoint: http://localhost:5000/api/v1/health
  - Hot reload for backend code changes
  - WebSocket support configured

### Commands
```bash
# Start database and backend only
docker compose up -d db backend

# Check health
curl http://localhost:5000/api/v1/health

# View logs
docker compose logs backend

# Stop services
docker compose down
```

## Known Issues ⚠️

### Frontend (React + Vite)
- **Status**: Not working due to node_modules volume mount issue
- **Problem**: Volume mount `/app` overwrites node_modules installed during build
- **Attempted Solutions**:
  1. Anonymous volume for `/app/node_modules` - didn't preserve modules
  2. Running `npm ci` in entrypoint - npm crashes in container
  3. Removing volume mount - vite.config.ts still imports missing vitest/config

### Root Cause
The vite.config.ts file imports `vitest/config` which requires vitest to be installed. When using volume mounts in Docker, the node_modules from the image get overwritten by the (empty) host directory.

## Workarounds

### Option 1: Backend + Database Only (Recommended for Now)
```bash
docker compose up -d db backend
# Run frontend locally
cd frontend && npm install && npm run dev
```

### Option 2: Manual Frontend Setup
```bash
# Start database
docker compose up -d db

# Run backend locally  
cd backend && cp config.template.py config.py
FLASK_DEBUG=1 python run.py

# Run frontend locally
cd frontend && npm install && npm run dev
```

## Future Work

To fix the frontend Docker setup:
1. Change vite.config.ts to import from 'vite' instead of 'vitest/config' for Docker builds
2. Use multi-stage Docker build with production dependencies only
3. Or use named volume for node_modules with proper initialization

## Files Modified

- `docker-compose.yml` - Updated for development setup
- `backend/Dockerfile.dev` - Development backend with entrypoint
- `backend/docker-entrypoint.sh` - Handles config.py creation
- `backend/chordme/api.py` - Made db.create_all() conditional
- `backend/chordme/chord_cli.py` - Made populate_chord_database import conditional
- `backend/run.py` - Added allow_unsafe_werkzeug for development
- `frontend/Dockerfile.dev` - Development frontend (needs work)
- `frontend/docker-entrypoint.sh` - Simple vite startup (needs work)
- `.env.docker` - Docker environment template
- `DOCKER_SETUP.md` - Comprehensive Docker documentation (English)
- `DOCKER_SETUP_ES.md` - Comprehensive Docker documentation (Spanish)
