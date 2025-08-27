#!/bin/bash
# Deploy ChordMe to Netlify (script for local use)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
FRONTEND_DIR="./frontend"
BUILD_DIR="$FRONTEND_DIR/dist"

echo -e "${GREEN}🚀 Deploying ChordMe Frontend to Netlify${NC}"
echo "Environment: $ENVIRONMENT"

# Check dependencies
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}Installing Netlify CLI...${NC}"
    npm install -g netlify-cli@latest
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Set environment variables
if [ "$ENVIRONMENT" = "staging" ]; then
    export VITE_API_URL="https://chordme-backend-staging.up.railway.app"
    DEPLOY_ALIAS="staging"
    DEPLOY_MESSAGE="Staging deployment from local"
else
    export VITE_API_URL="https://chordme-backend-production.up.railway.app"
    DEPLOY_ALIAS=""
    DEPLOY_MESSAGE="Production deployment from local"
fi

echo "API URL: $VITE_API_URL"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$FRONTEND_DIR"
npm ci

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm run test:run

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

# Check if build succeeded
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Build failed: $BUILD_DIR not found${NC}"
    exit 1
fi

# Deploy to Netlify
echo -e "${YELLOW}🚀 Deploying to Netlify...${NC}"
cd ..  # Back to project root

if [ "$ENVIRONMENT" = "production" ]; then
    netlify deploy --dir="$BUILD_DIR" --prod --message="$DEPLOY_MESSAGE"
else
    netlify deploy --dir="$BUILD_DIR" --alias="$DEPLOY_ALIAS" --message="$DEPLOY_MESSAGE"
fi

echo -e "${GREEN}✅ Frontend deployment completed!${NC}"

# Get deployment URL
if [ "$ENVIRONMENT" = "staging" ]; then
    DEPLOY_URL="https://staging--\${NETLIFY_SITE_NAME}.netlify.app"
else
    DEPLOY_URL="https://\${NETLIFY_SITE_NAME}.netlify.app"
fi

echo -e "${GREEN}🌐 Deployment URL: $DEPLOY_URL${NC}"

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 10

# Note: Replace with actual site name in production
echo -e "${YELLOW}⚠️  Manual health check required${NC}"
echo "Please verify the deployment at your Netlify site URL"

echo -e "${GREEN}🎉 Deployment process completed!${NC}"