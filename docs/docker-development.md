# ChordMe Local Development with Docker

This guide provides instructions for running ChordMe locally using Docker Compose or Minikube for a complete containerized development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Compose Setup](#docker-compose-setup)
- [Minikube Setup](#minikube-setup)
- [Switching Between Environments](#switching-between-environments)
- [Troubleshooting](#troubleshooting)
- [Development Workflow](#development-workflow)

## Prerequisites

### For Docker Compose
- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)

### For Minikube
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) (version 1.25+)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (version 1.24+)
- Docker (for Minikube driver)

## Docker Compose Setup

Docker Compose provides the simplest way to run the full ChordMe stack locally.

### Quick Start

1. **Clone and navigate to the repository:**
   ```bash
   git clone <repository-url>
   cd chordme
   ```

2. **Start all services:**
   ```bash
   npm run docker:start
   # or directly:
   ./scripts/docker/docker-setup.sh start
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Database: localhost:5432

### Available Commands

```bash
# Start all services
npm run docker:start

# Check service status
npm run docker:status

# View logs (all services)
npm run docker:logs
# View logs for specific service
./scripts/docker/docker-setup.sh logs backend

# Stop all services
npm run docker:stop

# Restart services
./scripts/docker/docker-setup.sh restart

# Enter service shell
./scripts/docker/docker-setup.sh shell backend
./scripts/docker/docker-setup.sh shell frontend
./scripts/docker/docker-setup.sh shell db

# Clean up (remove containers, volumes, and images)
npm run docker:cleanup
```

### Service Configuration

The Docker Compose setup includes:

#### Database (PostgreSQL 15)
- **Container**: `chordme-db`
- **Port**: 5432
- **Database**: `chordme`
- **User**: `postgres`
- **Password**: `password`
- **Volume**: `postgres_data` (persistent storage)

#### Backend (Flask API)
- **Container**: `chordme-backend`
- **Port**: 5000
- **Environment**: Development mode with hot-reload
- **Volume**: Backend code mounted for live editing

#### Frontend (React + Vite)
- **Container**: `chordme-frontend`
- **Port**: 5173
- **Environment**: Development mode with hot-reload
- **Volume**: Frontend code mounted for live editing

### Environment Variables

Environment variables are configured in:
- `.env.backend` - Backend configuration
- `.env.frontend` - Frontend configuration
- `.env.database` - Database configuration

Edit these files to customize your local environment.

## Minikube Setup

Minikube provides a local Kubernetes environment for testing container orchestration.

### Quick Start

1. **Complete setup (start cluster + deploy application):**
   ```bash
   npm run k8s:setup
   # or directly:
   ./scripts/docker/minikube-setup.sh full-setup
   ```

2. **Access the application:**
   ```bash
   ./scripts/docker/minikube-setup.sh open
   ```

### Available Commands

```bash
# Start Minikube cluster
npm run k8s:start

# Build Docker images for Minikube
./scripts/docker/minikube-setup.sh build

# Deploy to Kubernetes
npm run k8s:deploy

# Check status
npm run k8s:status

# View logs
./scripts/docker/minikube-setup.sh logs backend

# Enter pod shell
./scripts/docker/minikube-setup.sh shell backend

# Open application in browser
./scripts/docker/minikube-setup.sh open

# Clean up (undeploy + stop cluster)
npm run k8s:cleanup
```

### Kubernetes Resources

The Minikube deployment includes:

#### Namespace
- **Name**: `chordme`
- All resources are deployed in this namespace

#### ConfigMap
- **Name**: `chordme-config`
- Contains non-sensitive configuration

#### Secrets
- **Name**: `chordme-secrets`
- Contains sensitive data (passwords, keys)

#### Services
1. **Database** (`postgres-service`)
   - PostgreSQL 15 with persistent volume
   - Internal cluster access only

2. **Backend** (`backend-service`)
   - Flask API with 2 replicas
   - Health checks enabled
   - Resource limits configured

3. **Frontend** (`frontend-service`)
   - React app with 2 replicas
   - LoadBalancer service for external access
   - Health checks enabled

## Switching Between Environments

### From Docker Compose to Minikube

1. Stop Docker Compose:
   ```bash
   npm run docker:stop
   ```

2. Start Minikube setup:
   ```bash
   npm run k8s:setup
   ```

### From Minikube to Docker Compose

1. Clean up Minikube:
   ```bash
   npm run k8s:cleanup
   ```

2. Start Docker Compose:
   ```bash
   npm run docker:start
   ```

### Running Both Simultaneously

Both environments can run simultaneously on different ports:
- Docker Compose: Frontend on 5173, Backend on 5000
- Minikube: Uses different ports (check with `minikube service list`)

## Development Workflow

### Code Changes

Both environments support live code reloading:

#### Docker Compose
- Changes to frontend/backend code are automatically reflected
- No container rebuild required for code changes
- Database changes persist in volumes

#### Minikube
- For code changes, rebuild and redeploy:
  ```bash
  ./scripts/docker/minikube-setup.sh build
  ./scripts/docker/minikube-setup.sh deploy
  ```

### Database Operations

#### Docker Compose
```bash
# Connect to database
./scripts/docker/docker-setup.sh shell db

# Run migrations (from host)
docker-compose exec backend python -c "from chordme import create_app; from chordme.models import db; app = create_app(); app.app_context().push(); db.create_all()"
```

#### Minikube
```bash
# Connect to database
./scripts/docker/minikube-setup.sh shell postgres

# Run migrations (from backend pod)
kubectl exec -it $(kubectl get pods -n chordme -l app=backend -o jsonpath='{.items[0].metadata.name}') -n chordme -- python -c "from chordme import create_app; from chordme.models import db; app = create_app(); app.app_context().push(); db.create_all()"
```

### Debugging

#### View Logs
```bash
# Docker Compose
npm run docker:logs
./scripts/docker/docker-setup.sh logs backend

# Minikube
./scripts/docker/minikube-setup.sh logs backend
kubectl logs -f -l app=backend -n chordme
```

#### Service Health
```bash
# Docker Compose
npm run docker:status

# Minikube
npm run k8s:status
kubectl get all -n chordme
```

## Troubleshooting

### Common Issues

#### Docker Compose

**Services not starting:**
```bash
# Check Docker is running
docker info

# View detailed logs
docker-compose logs -f

# Rebuild containers
docker-compose down
docker-compose up --build
```

**Port conflicts:**
```bash
# Check what's using the ports
lsof -i :5000
lsof -i :5173
lsof -i :5432

# Kill processes if needed
sudo kill -9 <PID>
```

**Database connection issues:**
```bash
# Verify database is ready
docker-compose exec db pg_isready -U postgres -d chordme

# Reset database
docker-compose down -v
docker-compose up -d db
```

#### Minikube

**Cluster not starting:**
```bash
# Check Minikube status
minikube status

# Delete and recreate cluster
minikube delete
minikube start --cpus=2 --memory=4096
```

**Images not found:**
```bash
# Ensure you're using Minikube's Docker daemon
eval $(minikube docker-env)

# Rebuild images
./scripts/docker/minikube-setup.sh build
```

**Services not accessible:**
```bash
# Check service status
kubectl get svc -n chordme

# Get service URL
minikube service frontend-service -n chordme --url
```

### Performance Optimization

#### Docker Compose
- Allocate more memory to Docker Desktop (4GB+ recommended)
- Use Docker's experimental features for better performance
- Enable BuildKit for faster builds

#### Minikube
- Increase CPU and memory allocation:
  ```bash
  minikube start --cpus=4 --memory=8192
  ```
- Use faster storage driver if available

### Clean Installation

#### Complete Docker Reset
```bash
# Stop and remove everything
npm run docker:cleanup

# Remove Docker volumes
docker volume prune -f

# Remove Docker networks
docker network prune -f
```

#### Complete Minikube Reset
```bash
# Clean up deployment
npm run k8s:cleanup

# Delete cluster
minikube delete

# Remove Minikube files
rm -rf ~/.minikube
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ChordMe Developer Guide](docs/developer-guide.md)