#!/bin/bash
# Full stack deployment script for ChordMe

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🚀 ChordMe Full Stack Deployment${NC}"
echo -e "${BLUE}================================${NC}"
echo "Environment: $ENVIRONMENT"
echo "Script directory: $SCRIPT_DIR"
echo ""

# Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    echo -e "${RED}❌ Error: Environment must be 'production' or 'staging'${NC}"
    echo "Usage: $0 [production|staging]"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to check command availability
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ Error: $1 is required but not installed${NC}"
        return 1
    fi
}

# Check dependencies
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
check_command "node" || exit 1
check_command "npm" || exit 1
check_command "python3" || check_command "python" || exit 1
check_command "pip3" || check_command "pip" || exit 1

# Step 1: Run database migrations
echo -e "${BLUE}📊 Step 1: Database Migrations${NC}"
if [ -n "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Running database migrations for $ENVIRONMENT...${NC}"
    python3 database/migrate.py || python database/migrate.py
    echo -e "${GREEN}✅ Database migrations completed${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not set, skipping migrations${NC}"
fi
echo ""

# Step 2: Deploy backend
echo -e "${BLUE}🚂 Step 2: Backend Deployment${NC}"
if [ -f "$SCRIPT_DIR/deploy-railway.sh" ]; then
    chmod +x "$SCRIPT_DIR/deploy-railway.sh"
    "$SCRIPT_DIR/deploy-railway.sh" "$ENVIRONMENT"
    echo -e "${GREEN}✅ Backend deployment completed${NC}"
else
    echo -e "${RED}❌ Error: Backend deployment script not found${NC}"
    exit 1
fi
echo ""

# Step 3: Deploy frontend
echo -e "${BLUE}🌐 Step 3: Frontend Deployment${NC}"
if [ -f "$SCRIPT_DIR/deploy-netlify.sh" ]; then
    chmod +x "$SCRIPT_DIR/deploy-netlify.sh"
    "$SCRIPT_DIR/deploy-netlify.sh" "$ENVIRONMENT"
    echo -e "${GREEN}✅ Frontend deployment completed${NC}"
else
    echo -e "${RED}❌ Error: Frontend deployment script not found${NC}"
    exit 1
fi
echo ""

# Step 4: Health checks
echo -e "${BLUE}🏥 Step 4: End-to-End Health Checks${NC}"

# Set URLs based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    BACKEND_URL="https://chordme-backend-staging.up.railway.app"
    FRONTEND_URL="https://staging--chordme.netlify.app"
else
    BACKEND_URL="https://chordme-backend-production.up.railway.app"
    FRONTEND_URL="https://chordme.netlify.app"
fi

echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"

# Wait for deployments to stabilize
echo -e "${YELLOW}⏳ Waiting for deployments to stabilize...${NC}"
sleep 30

# Backend health check
echo -e "${YELLOW}Testing backend health...${NC}"
if curl -s -f "$BACKEND_URL/api/v1/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "Manual verification required: $BACKEND_URL/api/v1/health"
fi

# Frontend health check
echo -e "${YELLOW}Testing frontend health...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed (status: $FRONTEND_STATUS)${NC}"
    echo "Manual verification required: $FRONTEND_URL"
fi

# API integration test
echo -e "${YELLOW}Testing API integration...${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v1/version" || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ API integration test passed${NC}"
else
    echo -e "${YELLOW}⚠️  API integration test returned status: $API_STATUS${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Full Stack Deployment Summary${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Frontend URL: ${BLUE}$FRONTEND_URL${NC}"
echo -e "Backend URL: ${BLUE}$BACKEND_URL${NC}"
echo -e "API Documentation: ${BLUE}$BACKEND_URL/api/v1/docs${NC}"
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Optional: Run E2E tests if available
if [ -f "playwright.config.ts" ] && command -v npx &> /dev/null; then
    echo ""
    echo -e "${BLUE}🧪 Optional: End-to-End Tests${NC}"
    read -p "Do you want to run E2E tests? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Running E2E tests...${NC}"
        export PLAYWRIGHT_BASE_URL="$FRONTEND_URL"
        export API_BASE_URL="$BACKEND_URL"
        npx playwright test || echo -e "${YELLOW}⚠️  Some E2E tests may have failed${NC}"
    fi
fi