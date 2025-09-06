#!/bin/bash

# ChordMe Docker Compose Setup Script
# This script helps with Docker Compose operations

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

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Neither docker-compose nor docker compose is available"
        exit 1
    fi
    print_success "Using: $COMPOSE_CMD"
}

# Function to start services
start_services() {
    print_info "Starting ChordMe services with Docker Compose..."
    
    # Build and start services
    $COMPOSE_CMD up -d --build
    
    print_info "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_service_health
}

# Function to stop services
stop_services() {
    print_info "Stopping ChordMe services..."
    $COMPOSE_CMD down
    print_success "Services stopped"
}

# Function to restart services
restart_services() {
    print_info "Restarting ChordMe services..."
    $COMPOSE_CMD restart
    sleep 5
    check_service_health
}

# Function to check service health
check_service_health() {
    print_info "Checking service health..."
    
    # Check database
    if $COMPOSE_CMD exec -T db pg_isready -U postgres -d chordme >/dev/null 2>&1; then
        print_success "Database is healthy"
    else
        print_warning "Database is not ready yet"
    fi
    
    # Check backend
    if curl -f http://localhost:5000/api/v1/health >/dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend is not ready yet"
    fi
    
    # Check frontend
    if curl -f http://localhost:5173 >/dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend is not ready yet"
    fi
}

# Function to show logs
show_logs() {
    if [ -z "$1" ]; then
        print_info "Showing logs for all services..."
        $COMPOSE_CMD logs -f
    else
        print_info "Showing logs for service: $1"
        $COMPOSE_CMD logs -f "$1"
    fi
}

# Function to clean up
cleanup() {
    print_info "Cleaning up Docker resources..."
    $COMPOSE_CMD down -v --rmi local
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show status
show_status() {
    print_info "Service status:"
    $COMPOSE_CMD ps
    echo
    print_info "Service URLs:"
    echo "Frontend: http://localhost:5173"
    echo "Backend API: http://localhost:5000"
    echo "Database: localhost:5432"
    echo
    check_service_health
}

# Function to enter container shell
enter_shell() {
    if [ -z "$1" ]; then
        print_error "Please specify a service name (frontend, backend, db)"
        exit 1
    fi
    
    print_info "Entering shell for service: $1"
    case $1 in
        frontend)
            $COMPOSE_CMD exec frontend sh
            ;;
        backend)
            $COMPOSE_CMD exec backend bash
            ;;
        db)
            $COMPOSE_CMD exec db psql -U postgres -d chordme
            ;;
        *)
            print_error "Unknown service: $1"
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo "ChordMe Docker Compose Setup Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start        Start all services"
    echo "  stop         Stop all services"
    echo "  restart      Restart all services"
    echo "  status       Show service status and health"
    echo "  logs [svc]   Show logs (optionally for specific service)"
    echo "  shell <svc>  Enter shell for service (frontend, backend, db)"
    echo "  cleanup      Stop services and clean up resources"
    echo "  help         Show this help message"
    echo
}

# Main execution
main() {
    # Change to script directory
    cd "$(dirname "$0")/../.."
    
    case "${1:-help}" in
        start)
            check_docker
            check_docker_compose
            start_services
            show_status
            ;;
        stop)
            check_docker_compose
            stop_services
            ;;
        restart)
            check_docker_compose
            restart_services
            ;;
        status)
            check_docker_compose
            show_status
            ;;
        logs)
            check_docker_compose
            show_logs "$2"
            ;;
        shell)
            check_docker_compose
            enter_shell "$2"
            ;;
        cleanup)
            check_docker_compose
            cleanup
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"