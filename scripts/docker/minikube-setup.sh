#!/bin/bash

# ChordMe Minikube Setup Script
# This script helps with Minikube Kubernetes operations

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

# Function to check if minikube is installed
check_minikube() {
    if ! command -v minikube >/dev/null 2>&1; then
        print_error "Minikube is not installed. Please install it first."
        echo "Visit: https://minikube.sigs.k8s.io/docs/start/"
        exit 1
    fi
    print_success "Minikube is installed"
}

# Function to check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl >/dev/null 2>&1; then
        print_error "kubectl is not installed. Please install it first."
        echo "Visit: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    print_success "kubectl is installed"
}

# Function to start minikube
start_minikube() {
    print_info "Starting Minikube..."
    
    if minikube status >/dev/null 2>&1; then
        print_success "Minikube is already running"
    else
        minikube start --cpus=2 --memory=4096 --driver=docker
        print_success "Minikube started"
    fi
    
    # Enable required addons
    print_info "Enabling required addons..."
    minikube addons enable ingress
    
    # Set kubectl context to minikube
    kubectl config use-context minikube
    print_success "kubectl context set to minikube"
}

# Function to stop minikube
stop_minikube() {
    print_info "Stopping Minikube..."
    minikube stop
    print_success "Minikube stopped"
}

# Function to build and load images
build_images() {
    print_info "Building Docker images for Minikube..."
    
    # Set docker environment to minikube
    eval $(minikube docker-env)
    
    # Build frontend image
    print_info "Building frontend image..."
    docker build -t chordme-frontend:latest ./frontend/
    
    # Build backend image
    print_info "Building backend image..."
    docker build -t chordme-backend:latest ./backend/
    
    print_success "Images built successfully"
}

# Function to deploy to kubernetes
deploy_k8s() {
    print_info "Deploying ChordMe to Kubernetes..."
    
    # Apply manifests in order
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/database.yaml
    kubectl apply -f k8s/backend.yaml
    kubectl apply -f k8s/frontend.yaml
    
    print_info "Waiting for deployments to be ready..."
    
    # Wait for database
    kubectl wait --for=condition=ready pod -l app=postgres -n chordme --timeout=300s
    
    # Wait for backend
    kubectl wait --for=condition=ready pod -l app=backend -n chordme --timeout=300s
    
    # Wait for frontend
    kubectl wait --for=condition=ready pod -l app=frontend -n chordme --timeout=300s
    
    print_success "All services deployed successfully"
}

# Function to undeploy from kubernetes
undeploy_k8s() {
    print_info "Removing ChordMe from Kubernetes..."
    
    kubectl delete -f k8s/frontend.yaml --ignore-not-found=true
    kubectl delete -f k8s/backend.yaml --ignore-not-found=true
    kubectl delete -f k8s/database.yaml --ignore-not-found=true
    kubectl delete -f k8s/configmap.yaml --ignore-not-found=true
    
    print_success "ChordMe removed from Kubernetes"
}

# Function to show status
show_status() {
    print_info "Minikube status:"
    minikube status
    echo
    
    print_info "Kubernetes resources:"
    kubectl get all -n chordme
    echo
    
    print_info "Service URLs:"
    minikube service frontend-service -n chordme --url
    echo
}

# Function to show logs
show_logs() {
    if [ -z "$1" ]; then
        print_error "Please specify a service name (frontend, backend, postgres)"
        exit 1
    fi
    
    print_info "Showing logs for service: $1"
    kubectl logs -f -l app="$1" -n chordme
}

# Function to enter pod shell
enter_shell() {
    if [ -z "$1" ]; then
        print_error "Please specify a service name (frontend, backend, postgres)"
        exit 1
    fi
    
    POD=$(kubectl get pods -n chordme -l app="$1" -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD" ]; then
        print_error "No pod found for service: $1"
        exit 1
    fi
    
    print_info "Entering shell for pod: $POD"
    case $1 in
        frontend)
            kubectl exec -it "$POD" -n chordme -- sh
            ;;
        backend)
            kubectl exec -it "$POD" -n chordme -- bash
            ;;
        postgres)
            kubectl exec -it "$POD" -n chordme -- psql -U postgres -d chordme
            ;;
        *)
            kubectl exec -it "$POD" -n chordme -- sh
            ;;
    esac
}

# Function to open service in browser
open_service() {
    print_info "Opening ChordMe frontend in browser..."
    minikube service frontend-service -n chordme
}

# Function to show help
show_help() {
    echo "ChordMe Minikube Setup Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start        Start Minikube cluster"
    echo "  stop         Stop Minikube cluster"
    echo "  build        Build Docker images for Minikube"
    echo "  deploy       Deploy ChordMe to Kubernetes"
    echo "  undeploy     Remove ChordMe from Kubernetes"
    echo "  status       Show cluster and service status"
    echo "  logs <svc>   Show logs for service (frontend, backend, postgres)"
    echo "  shell <svc>  Enter shell for service pod"
    echo "  open         Open frontend service in browser"
    echo "  full-setup   Complete setup (start + build + deploy)"
    echo "  cleanup      Undeploy and stop Minikube"
    echo "  help         Show this help message"
    echo
}

# Function for full setup
full_setup() {
    check_minikube
    check_kubectl
    start_minikube
    build_images
    deploy_k8s
    show_status
    print_success "Full setup completed! Use './scripts/docker/minikube-setup.sh open' to access the application."
}

# Function for cleanup
cleanup() {
    undeploy_k8s
    stop_minikube
    print_success "Cleanup completed"
}

# Main execution
main() {
    # Change to script directory
    cd "$(dirname "$0")/../.."
    
    case "${1:-help}" in
        start)
            check_minikube
            check_kubectl
            start_minikube
            ;;
        stop)
            check_minikube
            stop_minikube
            ;;
        build)
            check_minikube
            build_images
            ;;
        deploy)
            check_kubectl
            deploy_k8s
            ;;
        undeploy)
            check_kubectl
            undeploy_k8s
            ;;
        status)
            check_minikube
            check_kubectl
            show_status
            ;;
        logs)
            check_kubectl
            show_logs "$2"
            ;;
        shell)
            check_kubectl
            enter_shell "$2"
            ;;
        open)
            check_minikube
            open_service
            ;;
        full-setup)
            full_setup
            ;;
        cleanup)
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