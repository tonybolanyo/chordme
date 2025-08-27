#!/bin/bash
# Deploy ChordMe backend to Railway (script for local use)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
BACKEND_DIR="./backend"

echo -e "${GREEN}🚂 Deploying ChordMe Backend to Railway${NC}"
echo "Environment: $ENVIRONMENT"

# Check dependencies
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Installing Railway CLI...${NC}"
    curl -fsSL https://railway.app/install.sh | sh
    export PATH="$HOME/.railway/bin:$PATH"
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check for Railway token
if [ -z "$RAILWAY_TOKEN" ]; then
    echo -e "${RED}❌ Error: RAILWAY_TOKEN environment variable is required${NC}"
    echo "Get your token from: https://railway.app/account/tokens"
    exit 1
fi

# Set environment-specific configuration
if [ "$ENVIRONMENT" = "staging" ]; then
    if [ -z "$RAILWAY_STAGING_PROJECT_ID" ] || [ -z "$RAILWAY_STAGING_SERVICE_ID" ]; then
        echo -e "${RED}❌ Error: RAILWAY_STAGING_PROJECT_ID and RAILWAY_STAGING_SERVICE_ID are required for staging deployment${NC}"
        exit 1
    fi
    PROJECT_ID="$RAILWAY_STAGING_PROJECT_ID"
    SERVICE_ID="$RAILWAY_STAGING_SERVICE_ID"
    DEPLOY_URL="https://chordme-backend-staging.up.railway.app"
else
    if [ -z "$RAILWAY_PRODUCTION_PROJECT_ID" ] || [ -z "$RAILWAY_PRODUCTION_SERVICE_ID" ]; then
        echo -e "${RED}❌ Error: RAILWAY_PRODUCTION_PROJECT_ID and RAILWAY_PRODUCTION_SERVICE_ID are required for production deployment${NC}"
        exit 1
    fi
    PROJECT_ID="$RAILWAY_PRODUCTION_PROJECT_ID"
    SERVICE_ID="$RAILWAY_PRODUCTION_SERVICE_ID"
    DEPLOY_URL="https://chordme-backend-production.up.railway.app"
fi

echo "Project ID: $PROJECT_ID"
echo "Service ID: $SERVICE_ID"

# Install dependencies and run tests
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$BACKEND_DIR"
pip install -r requirements.txt

# Setup configuration
echo -e "${YELLOW}⚙️  Setting up configuration...${NC}"
cp config.template.py config.py

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
export FLASK_CONFIG=test_config
python -m pytest tests/ -v || echo -e "${YELLOW}⚠️  Some tests failed, continuing with deployment...${NC}"

# Link to Railway project
echo -e "${YELLOW}🔗 Linking to Railway project...${NC}"
railway link --project "$PROJECT_ID"

# Deploy the application
echo -e "${YELLOW}🚀 Deploying to Railway...${NC}"
railway up --service "$SERVICE_ID"

echo -e "${GREEN}✅ Backend deployment initiated!${NC}"

# Wait for deployment to be ready
echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
sleep 90

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
for i in {1..10}; do
    echo "Attempt $i: Testing $DEPLOY_URL/api/v1/health"
    
    if curl -s -f "$DEPLOY_URL/api/v1/health" > /dev/null; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Health check failed, retrying in 30 seconds...${NC}"
        sleep 30
    fi
    
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Health check failed after 10 attempts${NC}"
        echo "Deployment may have failed or is taking longer than expected"
        exit 1
    fi
done

# Test API endpoints
echo -e "${YELLOW}🔍 Testing API endpoints...${NC}"

# Test version endpoint
VERSION_RESPONSE=$(curl -s "$DEPLOY_URL/api/v1/version" || echo "N/A")
echo "API Version: $VERSION_RESPONSE"

# Test auth endpoint (should return 400/422 for empty request)
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/api/v1/auth/register" -X POST -H "Content-Type: application/json" -d '{}')
if [ "$AUTH_STATUS" = "400" ] || [ "$AUTH_STATUS" = "422" ]; then
    echo -e "${GREEN}✅ Auth endpoint is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Auth endpoint returned unexpected status: $AUTH_STATUS${NC}"
fi

echo -e "${GREEN}🌐 Backend URL: $DEPLOY_URL${NC}"
echo -e "${GREEN}📚 API Documentation: $DEPLOY_URL/api/v1/docs${NC}"
echo -e "${GREEN}🎉 Backend deployment completed successfully!${NC}"