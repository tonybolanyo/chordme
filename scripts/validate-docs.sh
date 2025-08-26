#!/bin/bash

# Documentation validation script for ChordMe
# This script validates that all documentation files have proper format

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Starting documentation validation..."

# Change to docs directory
cd "$(dirname "$0")/../docs"

# Initialize counters
total_files=0
valid_files=0
invalid_files=0
warnings=0

# Function to check front matter
check_front_matter() {
    local file="$1"
    local filename=$(basename "$file")
    
    # Skip certain files that don't need front matter
    case "$filename" in
        ".nojekyll"|".gitignore"|"Gemfile"|"Gemfile.lock"|"swagger.json"|"swagger.html")
            return 0
            ;;
    esac
    
    # Check if file starts with front matter
    if head -1 "$file" | grep -q "^---$"; then
        # Validate front matter structure
        local front_matter_end=$(grep -n "^---$" "$file" | sed -n '2p' | cut -d: -f1)
        
        if [ -z "$front_matter_end" ]; then
            echo -e "${RED}❌ $file: Front matter not properly closed${NC}"
            return 1
        fi
        
        # Extract and validate front matter content
        local front_matter=$(sed -n "2,$((front_matter_end-1))p" "$file")
        
        # Check for required fields
        if ! echo "$front_matter" | grep -q "^layout:"; then
            echo -e "${YELLOW}⚠️  $file: Missing 'layout' field in front matter${NC}"
            warnings=$((warnings + 1))
        fi
        
        if ! echo "$front_matter" | grep -q "^title:"; then
            echo -e "${YELLOW}⚠️  $file: Missing 'title' field in front matter${NC}"
            warnings=$((warnings + 1))
        fi
        
        # Check for valid YAML syntax (basic check)
        if echo "$front_matter" | grep -qP '\t'; then
            echo -e "${RED}❌ $file: Front matter contains tabs (use spaces)${NC}"
            return 1
        fi
        
        echo -e "${GREEN}✅ $file: Valid front matter${NC}"
        return 0
    else
        echo -e "${RED}❌ $file: Missing front matter${NC}"
        return 1
    fi
}

# Check all markdown files
echo "📝 Checking markdown files for front matter..."
for file in *.md; do
    if [ -f "$file" ]; then
        total_files=$((total_files + 1))
        if check_front_matter "$file"; then
            valid_files=$((valid_files + 1))
        else
            invalid_files=$((invalid_files + 1))
        fi
    fi
done

echo ""
echo "📊 Validation Results:"
echo "   Total files checked: $total_files"
echo -e "   ${GREEN}Valid files: $valid_files${NC}"
echo -e "   ${RED}Invalid files: $invalid_files${NC}"
echo -e "   ${YELLOW}Warnings: $warnings${NC}"

# Check for bilingual coverage (both English and Spanish versions)
echo ""
echo "🌐 Checking bilingual coverage..."
missing_translations=0

# Get list of English markdown files (excluding ones that should not have translations)
exclude_pattern="^(swagger|Gemfile|_)"
for file in *.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .md)
        
        # Skip files that shouldn't have translations
        if echo "$filename" | grep -qE "$exclude_pattern"; then
            continue
        fi
        
        # Skip if it's already a Spanish file
        if echo "$filename" | grep -q "\-es$"; then
            continue
        fi
        
        # Check if Spanish version exists
        spanish_file="${filename}-es.md"
        if [ -f "$spanish_file" ]; then
            echo -e "${GREEN}✅ $file ↔ $spanish_file${NC}"
        else
            echo -e "${RED}❌ Missing Spanish version: $spanish_file${NC}"
            missing_translations=$((missing_translations + 1))
        fi
    fi
done

if [ $missing_translations -gt 0 ]; then
    echo -e "${RED}Missing $missing_translations Spanish translations${NC}"
    invalid_files=$((invalid_files + missing_translations))
else
    echo -e "${GREEN}✅ All documentation files have both English and Spanish versions${NC}"
fi

# Check Jekyll configuration
echo ""
echo "⚙️  Checking Jekyll configuration..."
if [ -f "_config.yml" ]; then
    # Basic YAML syntax check
    if command -v ruby >/dev/null 2>&1; then
        if ruby -e "require 'yaml'; YAML.load_file('_config.yml')" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ _config.yml: Valid YAML syntax${NC}"
        else
            echo -e "${RED}❌ _config.yml: Invalid YAML syntax${NC}"
            invalid_files=$((invalid_files + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Ruby not available for YAML validation${NC}"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${RED}❌ Missing _config.yml file${NC}"
    invalid_files=$((invalid_files + 1))
fi

# Check for required Jekyll files
echo ""
echo "📄 Checking required Jekyll files..."
required_files=("Gemfile" "_config.yml")
for required_file in "${required_files[@]}"; do
    if [ -f "$required_file" ]; then
        echo -e "${GREEN}✅ $required_file: Present${NC}"
    else
        echo -e "${RED}❌ $required_file: Missing${NC}"
        invalid_files=$((invalid_files + 1))
    fi
done

# Jekyll build test
echo ""
echo "🏗️  Testing Jekyll build..."
if command -v bundle >/dev/null 2>&1; then
    if bundle exec jekyll build --destination=./_site_test >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Jekyll build: Successful${NC}"
        rm -rf ./_site_test
    else
        echo -e "${RED}❌ Jekyll build: Failed${NC}"
        echo "Run 'bundle exec jekyll build --verbose' for details"
        invalid_files=$((invalid_files + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Bundle not available for Jekyll build test${NC}"
    warnings=$((warnings + 1))
fi

echo ""
echo "🏁 Validation Complete!"

# Exit with appropriate code
if [ $invalid_files -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}Note: $warnings warnings found${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ $invalid_files validation errors found${NC}"
    exit 1
fi