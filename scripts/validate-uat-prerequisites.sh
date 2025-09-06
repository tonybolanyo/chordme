#!/bin/bash

# UAT Prerequisites Validation Script
# This script validates that all technical prerequisites are met before running UAT

set -e

echo "🔍 ChordMe UAT Prerequisites Validation"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠️ WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[❌ FAIL]${NC} $1"
}

# Initialize counters
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Function to run a check
run_check() {
    local description="$1"
    local command="$2"
    local is_critical="${3:-true}"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    print_status "Checking: $description"
    
    if eval "$command" > /dev/null 2>&1; then
        print_success "$description"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            print_error "$description"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
            return 1
        else
            print_warning "$description"
            CHECKS_WARNING=$((CHECKS_WARNING + 1))
            return 0
        fi
    fi
}

echo ""
print_status "Starting UAT prerequisites validation..."
echo ""

# 1. Node.js and npm availability
print_status "📦 Checking Node.js and package management..."
run_check "Node.js is installed" "command -v node"
run_check "npm is available" "command -v npm"

if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
fi

echo ""

# 2. Python and pip availability  
print_status "🐍 Checking Python and package management..."
run_check "Python 3 is installed" "command -v python3"
run_check "pip is available" "command -v pip"

if command -v python3 > /dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    print_status "Python version: $PYTHON_VERSION"
fi

echo ""

# 3. Repository structure validation
print_status "📁 Validating repository structure..."
run_check "Frontend directory exists" "[ -d './frontend' ]"
run_check "Backend directory exists" "[ -d './backend' ]"
run_check "E2E tests directory exists" "[ -d './e2e' ]"
run_check "Integration tests directory exists" "[ -d './integration-tests' ]"
run_check "Documentation directory exists" "[ -d './docs' ]"

echo ""

# 4. Configuration files
print_status "⚙️ Checking configuration files..."
run_check "Root package.json exists" "[ -f './package.json' ]"
run_check "Frontend package.json exists" "[ -f './frontend/package.json' ]"
run_check "Backend requirements.txt exists" "[ -f './backend/requirements.txt' ]"
run_check "Playwright config exists" "[ -f './playwright.config.ts' ]"
run_check "Backend config template exists" "[ -f './backend/config.template.py' ]"

echo ""

# 5. Dependencies installation
print_status "📥 Checking dependency installation..."

# Check if node_modules exists in frontend
if [ -d "./frontend/node_modules" ]; then
    print_success "Frontend dependencies are installed"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    print_error "Frontend dependencies not installed (run: cd frontend && npm install)"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

# Check if backend requirements are met
print_status "Checking backend dependencies..."
if cd backend && python3 -c "import flask, pytest, bcrypt" 2>/dev/null; then
    print_success "Backend dependencies are installed"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    cd ..
else
    print_error "Backend dependencies not installed (run: cd backend && pip install -r requirements.txt)"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    cd .. 2>/dev/null || true
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

echo ""

# 6. Test infrastructure validation
print_status "🧪 Validating test infrastructure..."

# Check test scripts in package.json
run_check "Frontend test script exists" "grep -q 'test:frontend:run' package.json"
run_check "Backend test script exists" "grep -q 'test:backend' package.json"
run_check "Integration test script exists" "grep -q 'test:integration' package.json"
run_check "E2E test script exists" "grep -q 'test:e2e' package.json"
run_check "All tests script exists" "grep -q 'test:all' package.json"

echo ""

# 7. UAT documentation validation
print_status "📚 Checking UAT documentation..."
run_check "UAT test plan exists" "[ -f './docs/UAT_TEST_PLAN.md' ]"
run_check "UAT feedback templates exist" "[ -f './docs/UAT_FEEDBACK_TEMPLATES.md' ]"
run_check "UAT execution framework exists" "[ -f './docs/UAT_EXECUTION_FRAMEWORK.md' ]"
run_check "UAT test cases documentation exists" "[ -f './docs/UAT_TEST_CASES_RESULTS.md' ]"
run_check "Release notes template exists" "[ -f './docs/RELEASE_NOTES_TEMPLATE.md' ]"

echo ""

# 8. Existing test infrastructure (the foundation UAT builds on)
print_status "🏗️ Validating existing test foundation..."
run_check "E2E test files exist" "[ -d './e2e' ] && [ $(find ./e2e -name '*.spec.ts' | wc -l) -gt 0 ]"
run_check "Frontend test files exist" "[ -d './frontend/src' ] && [ $(find ./frontend/src -name '*.test.*' | wc -l) -gt 0 ]"
run_check "Backend test files exist" "[ -d './backend/tests' ] && [ $(find ./backend/tests -name 'test_*.py' | wc -l) -gt 0 ]"
run_check "Integration test files exist" "[ -d './integration-tests' ] && [ $(find ./integration-tests -name '*.py' | wc -l) -gt 0 ]"

echo ""

# 9. Quick test execution validation (optional but recommended)
print_status "🚀 Testing build and execution capabilities..."

print_status "Attempting frontend build test..."
if cd frontend && npm run build > /dev/null 2>&1; then
    print_success "Frontend can be built successfully"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    cd ..
else
    print_warning "Frontend build failed (this may be expected in some environments)"
    CHECKS_WARNING=$((CHECKS_WARNING + 1))
    cd .. 2>/dev/null || true
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

# Test if backend config can be created
if [ ! -f "./backend/config.py" ]; then
    if cd backend && cp config.template.py config.py; then
        print_success "Backend config can be created"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        cd ..
    else
        print_warning "Could not create backend config"
        CHECKS_WARNING=$((CHECKS_WARNING + 1))
        cd .. 2>/dev/null || true
    fi
else
    print_success "Backend config already exists"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

echo ""

# 10. Environment preparation
print_status "🌍 Environment preparation check..."
run_check "Git is available" "command -v git"
run_check "curl is available for API testing" "command -v curl"

# Check if we're in a git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_success "Working in a git repository"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    
    # Check if there are uncommitted changes
    if git diff-index --quiet HEAD --; then
        print_success "No uncommitted changes (good for stable testing)"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        print_warning "There are uncommitted changes (consider committing before UAT)"
        CHECKS_WARNING=$((CHECKS_WARNING + 1))
    fi
    CHECKS_TOTAL=$((CHECKS_TOTAL + 2))
else
    print_warning "Not in a git repository"
    CHECKS_WARNING=$((CHECKS_WARNING + 1))
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
fi

echo ""
echo "========================================"
echo "🎯 UAT Prerequisites Validation Summary"
echo "========================================"
echo ""
echo "Total checks performed: $CHECKS_TOTAL"
echo -e "${GREEN}Checks passed: $CHECKS_PASSED${NC}"
echo -e "${YELLOW}Warnings: $CHECKS_WARNING${NC}"
echo -e "${RED}Checks failed: $CHECKS_FAILED${NC}"
echo ""

# Calculate success rate
SUCCESS_RATE=$(( (CHECKS_PASSED * 100) / CHECKS_TOTAL ))
echo "Success rate: $SUCCESS_RATE%"

echo ""
if [ $CHECKS_FAILED -eq 0 ]; then
    print_success "✅ UAT Prerequisites: READY"
    echo ""
    echo "Your environment is ready for User Acceptance Testing!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy to staging environment"
    echo "2. Prepare test data and user accounts"
    echo "3. Schedule UAT sessions with representative users"
    echo "4. Follow the UAT execution framework in docs/UAT_EXECUTION_FRAMEWORK.md"
    echo ""
    echo "Quick commands to start local testing:"
    echo "  npm run dev:backend   # Terminal 1"
    echo "  npm run dev:frontend  # Terminal 2"
    echo "  npm run test:all      # Validate all tests pass"
    echo ""
    exit 0
else
    print_error "❌ UAT Prerequisites: ISSUES FOUND"
    echo ""
    echo "Please resolve the failed checks before proceeding with UAT."
    echo ""
    echo "Common solutions:"
    echo "• Install missing dependencies:"
    echo "  - cd frontend && npm install"
    echo "  - cd backend && pip install -r requirements.txt"
    echo "• Create backend configuration:"
    echo "  - cd backend && cp config.template.py config.py"
    echo "• Install missing system tools (Node.js, Python, Git)"
    echo ""
    exit 1
fi