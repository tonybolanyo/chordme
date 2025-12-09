# Running ChordMe Locally with Docker

This guide explains how to run ChordMe locally using Docker Compose, without any cloud or server dependencies. This is the easiest way to get started with ChordMe development.

## Prerequisites

- **Docker** version 20.10 or later
- **Docker Compose** version 2.0 or later

### Install Docker

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Windows
Download and install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

#### macOS
Download and install [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

Verify installation:
```bash
docker --version
docker compose version
```

## Quick Start (5 minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/tonybolanyo/chordme.git
cd chordme
```

### 2. Start All Services
```bash
docker compose up -d
```

This command will:
- Build the Docker images (first time only, takes 2-3 minutes)
- Start PostgreSQL database with automatic initialization
- Start the Flask backend API
- Start the React frontend application

### 3. Access the Application

Once all services are running (wait about 30-60 seconds):

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/v1/health
- **Database**: localhost:5432 (credentials: postgres/password)

### 4. Stop Services

```bash
docker compose down
```

To remove all data (database and uploads):
```bash
docker compose down -v
```

## What Gets Installed Automatically?

When you run `docker compose up`, Docker will:

1. **Database (PostgreSQL 15)**
   - Creates a PostgreSQL database named `chordme`
   - Automatically runs all database migrations in order
   - Sets up tables: users, songs, collections, etc.
   - Creates indexes and security policies

2. **Backend (Flask API)**
   - Installs Python dependencies
   - Configures the Flask application
   - Connects to the database
   - Starts the API server on port 5000

3. **Frontend (React + Vite)**
   - Installs Node.js dependencies
   - Starts the development server with hot reload
   - Connects to the backend API
   - Serves the application on port 5173

## Development Workflow

### Making Code Changes

All code changes are automatically detected and applied:

#### Frontend Changes
- Edit files in `frontend/src/`
- Browser automatically refreshes (hot module reload)
- No rebuild required

#### Backend Changes
- Edit files in `backend/chordme/`
- Flask automatically restarts
- No rebuild required

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Checking Service Status

```bash
docker compose ps
```

### Restarting Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

### Accessing Service Shells

```bash
# Backend shell
docker compose exec backend bash

# Frontend shell
docker compose exec frontend sh

# Database shell
docker compose exec db psql -U postgres -d chordme
```

### Running Tests

```bash
# Backend tests
docker compose exec backend pytest tests/ -v

# Frontend tests (if configured)
docker compose exec frontend npm run test
```

## Configuration

### Environment Variables

The default configuration works out of the box. To customize, create a `.env` file in the project root:

```bash
# Copy the Docker environment template
cp .env.docker .env

# Edit with your preferred settings
nano .env
```

Default values:
- Database: `chordme`
- User: `postgres`
- Password: `password` (⚠️ Change in production!)
- Backend port: `5000`
- Frontend port: `5173`

### Custom Port Mapping

To use different ports, edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3000:5173"  # Access on http://localhost:3000
  
  backend:
    ports:
      - "8000:5000"  # Access on http://localhost:8000
```

## Common Tasks

### Database Operations

#### View Database Data
```bash
# Connect to database
docker compose exec db psql -U postgres -d chordme

# Inside psql:
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;
```

#### Reset Database
```bash
# Stop and remove all data
docker compose down -v

# Start fresh
docker compose up -d
```

#### Backup Database
```bash
docker compose exec db pg_dump -U postgres chordme > backup.sql
```

#### Restore Database
```bash
docker compose exec -T db psql -U postgres chordme < backup.sql
```

### Troubleshooting

#### Services Won't Start

1. **Check Docker is running:**
   ```bash
   docker info
   ```

2. **Check for port conflicts:**
   ```bash
   # Linux/Mac
   lsof -i :5000
   lsof -i :5173
   lsof -i :5432
   
   # Windows
   netstat -ano | findstr :5000
   netstat -ano | findstr :5173
   netstat -ano | findstr :5432
   ```

3. **Clean up and restart:**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

#### Database Connection Errors

```bash
# Check if database is healthy
docker compose exec db pg_isready -U postgres -d chordme

# View database logs
docker compose logs db

# Wait for database to be ready (might take 30-60 seconds)
docker compose exec backend python -c "from chordme import create_app; app = create_app(); print('DB Connected')"
```

#### Backend Not Responding

```bash
# Check backend health
curl http://localhost:5000/api/v1/health

# View backend logs
docker compose logs backend

# Restart backend
docker compose restart backend
```

#### Frontend Not Loading

```bash
# Check frontend container
docker compose ps frontend

# View frontend logs
docker compose logs frontend

# Restart frontend
docker compose restart frontend
```

#### Need to Rebuild Images

```bash
# Rebuild all images
docker compose build

# Rebuild specific service
docker compose build backend
docker compose build frontend

# Rebuild and restart
docker compose up -d --build
```

## Complete Cleanup

To completely remove everything:

```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Remove images (optional)
docker compose down --rmi all -v

# Remove all unused Docker resources (optional, careful!)
docker system prune -a --volumes
```

## Production Deployment

⚠️ **The docker-compose.yml file is configured for development only!**

For production:

1. Use `docker-compose.prod.yml`
2. Set strong passwords
3. Enable HTTPS
4. Use production-grade secrets management
5. Configure proper backup strategies
6. Set up monitoring and logging

See [docker-compose.prod.yml](../docker-compose.prod.yml) for production configuration.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ChordMe Developer Guide](developer-guide.md)
- [ChordMe API Documentation](api-reference.md)

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the logs: `docker compose logs`
3. Open an issue on GitHub with:
   - Output of `docker compose version`
   - Output of `docker compose ps`
   - Relevant logs from `docker compose logs`

---

**Quick Reference**

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f

# Check status
docker compose ps

# Rebuild and restart
docker compose up -d --build

# Complete cleanup
docker compose down -v
```
