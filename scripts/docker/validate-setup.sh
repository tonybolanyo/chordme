#!/bin/bash

# ChordMe Docker Setup Validation Script
# This script validates that the Docker setup is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info "=== ChordMe Docker Setup Validation ==="
echo

# Change to project directory
cd "$(dirname "$0")/../.."

# Test 1: Docker availability
print_info "Testing Docker availability..."
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        print_success "Docker is available and running"
    else
        print_error "Docker is installed but not running"
        exit 1
    fi
else
    print_error "Docker is not installed"
    exit 1
fi

# Test 2: Docker Compose availability
print_info "Testing Docker Compose availability..."
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    print_success "docker-compose is available"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    print_success "docker compose (v2) is available"
else
    print_error "Neither docker-compose nor docker compose is available"
    exit 1
fi

# Test 3: Start development infrastructure
print_info "Starting development infrastructure (database + redis)..."
$COMPOSE_CMD -f docker-compose.dev.yml up -d

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 15

# Test 4: Check database connectivity
print_info "Testing database connectivity..."
if $COMPOSE_CMD -f docker-compose.dev.yml exec -T db pg_isready -U postgres -d chordme >/dev/null 2>&1; then
    print_success "Database is ready and accepting connections"
else
    print_error "Database is not ready"
    exit 1
fi

# Test 5: Check Redis connectivity
print_info "Testing Redis connectivity..."
if $COMPOSE_CMD -f docker-compose.dev.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
    print_success "Redis is ready and accepting connections"
else
    print_error "Redis is not ready"
    exit 1
fi

# Test 6: Test backend connection to database
print_info "Testing backend connection to containerized database..."
if cd backend && python -c "
import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:password@localhost:5432/chordme'
from chordme import app, db
with app.app_context():
    try:
        db.engine.connect()
        print('Database connection successful')
    except Exception as e:
        print(f'Database connection failed: {e}')
        exit(1)
"; then
    print_success "Backend can connect to containerized database"
    cd ..
else
    print_error "Backend cannot connect to containerized database"
    cd ..
    exit 1
fi

# Test 7: Build frontend Docker image (basic test)
print_info "Testing frontend Docker image build..."
cd frontend
if docker build -t chordme-frontend-test -f Dockerfile . >/dev/null 2>&1; then
    print_success "Frontend Docker image builds successfully"
    docker rmi chordme-frontend-test >/dev/null 2>&1 || true
else
    print_warning "Frontend Docker image build failed (may be due to network issues)"
fi
cd ..

# Test 8: Validate all necessary files exist
print_info "Validating Docker configuration files..."

required_files=(
    "docker-compose.yml"
    "docker-compose.dev.yml"
    "docker-compose.prod.yml"
    "frontend/Dockerfile"
    "backend/Dockerfile"
    "scripts/docker/docker-setup.sh"
    "scripts/docker/minikube-setup.sh"
    "docs/docker-development.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file is missing"
        exit 1
    fi
done

# Test 9: Validate Kubernetes manifests
print_info "Validating Kubernetes manifests..."

k8s_files=(
    "k8s/configmap.yaml"
    "k8s/database.yaml"
    "k8s/backend.yaml"
    "k8s/frontend.yaml"
)

for file in "${k8s_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file is missing"
        exit 1
    fi
done

# Test 10: Validate npm scripts
print_info "Validating npm scripts..."

if npm run 2>/dev/null | grep -q "docker:start"; then
    print_success "Docker npm scripts are configured"
else
    print_error "Docker npm scripts are missing"
    exit 1
fi

if npm run 2>/dev/null | grep -q "k8s:setup"; then
    print_success "Kubernetes npm scripts are configured"
else
    print_error "Kubernetes npm scripts are missing"
    exit 1
fi

# Clean up
print_info "Cleaning up test resources..."
$COMPOSE_CMD -f docker-compose.dev.yml down >/dev/null 2>&1

echo
print_success "=== All Docker setup validations passed! ==="
echo
print_info "Quick start commands:"
echo "  Development database: npm run docker:start"
echo "  Full Docker setup:   docker compose up -d"
echo "  Minikube setup:      npm run k8s:setup"
echo
print_info "Documentation: docs/docker-development.md"