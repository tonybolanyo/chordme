#!/bin/bash

# Link validation script for ChordMe documentation
# This script validates that all links in documentation are not broken

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔗 Starting link validation..."

# Change to docs directory
cd "$(dirname "$0")/../docs"

# Initialize counters
total_links=0
valid_links=0
invalid_links=0
warnings=0

# Function to check if URL is accessible
check_url() {
    local url="$1"
    
    # Skip certain URLs that might require authentication or are known to be problematic
    case "$url" in
        "mailto:"*|"#"*|"javascript:"*|"file:"*)
            return 0
            ;;
        "http://localhost:"*|"https://localhost:"*)
            # Skip localhost URLs as they won't be accessible in CI
            return 0
            ;;
    esac
    
    # Use curl to check if URL is accessible
    if curl -s --head --fail --max-time 10 "$url" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to extract links from markdown files
extract_links() {
    local file="$1"
    
    # Extract markdown links [text](url) and reference links [text]: url
    {
        # Extract inline links [text](url)
        grep -o '\[.*\]([^)]*)' "$file" | sed 's/.*(\([^)]*\)).*/\1/' 2>/dev/null || true
        # Extract reference-style links [text]: url
        grep -o '\[.*\]:.*' "$file" | sed 's/.*:\s*\([^\s]*\).*/\1/' 2>/dev/null || true
    } | grep -v '^$' || true
}

# Function to validate links in a file
validate_file_links() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo "📄 Checking links in $filename..."
    
    local file_links=0
    local file_valid=0
    local file_invalid=0
    
    while IFS= read -r link; do
        if [ -n "$link" ]; then
            file_links=$((file_links + 1))
            total_links=$((total_links + 1))
            
            # Check if it's a relative link to another doc file
            if [[ "$link" == *.md ]] && [[ "$link" != http* ]]; then
                # Remove any anchor fragments
                local base_link="${link%#*}"
                if [ -f "$base_link" ]; then
                    echo -e "  ${GREEN}✅ $link (local file)${NC}"
                    file_valid=$((file_valid + 1))
                    valid_links=$((valid_links + 1))
                else
                    echo -e "  ${RED}❌ $link (local file not found)${NC}"
                    file_invalid=$((file_invalid + 1))
                    invalid_links=$((invalid_links + 1))
                fi
            elif [[ "$link" == http* ]]; then
                # Check external URL
                if check_url "$link"; then
                    echo -e "  ${GREEN}✅ $link${NC}"
                    file_valid=$((file_valid + 1))
                    valid_links=$((valid_links + 1))
                else
                    echo -e "  ${RED}❌ $link (unreachable)${NC}"
                    file_invalid=$((file_invalid + 1))
                    invalid_links=$((invalid_links + 1))
                fi
            else
                # Other links (anchors, relative paths, etc.)
                echo -e "  ${YELLOW}⚠️  $link (skipped - relative/anchor link)${NC}"
                warnings=$((warnings + 1))
            fi
        fi
    done < <(extract_links "$file")
    
    if [ $file_links -eq 0 ]; then
        echo "  📝 No links found in $filename"
    else
        echo "  📊 $filename: $file_valid valid, $file_invalid invalid links"
    fi
}

# Check all markdown files
for file in *.md; do
    if [ -f "$file" ]; then
        validate_file_links "$file"
        echo ""
    fi
done

# Summary
echo "📊 Link Validation Summary:"
echo -e "   ${GREEN}Total links checked: $total_links${NC}"
echo -e "   ${GREEN}Valid links: $valid_links${NC}"
echo -e "   ${RED}Invalid links: $invalid_links${NC}"
echo -e "   ${YELLOW}Warnings (skipped): $warnings${NC}"

# Check for critical documentation links
echo ""
echo "🔍 Checking critical documentation structure..."

critical_files=(
    "README.md"
    "getting-started.md"
    "user-guide.md"
    "api-reference.md"
    "developer-guide.md"
    "troubleshooting.md"
)

critical_missing=0
for critical_file in "${critical_files[@]}"; do
    if [ -f "$critical_file" ]; then
        echo -e "${GREEN}✅ $critical_file: Present${NC}"
    else
        echo -e "${RED}❌ $critical_file: Missing${NC}"
        critical_missing=$((critical_missing + 1))
    fi
done

# Check Spanish versions of critical files
echo ""
echo "🌐 Checking critical Spanish documentation..."
for critical_file in "${critical_files[@]}"; do
    spanish_file="${critical_file%.md}-es.md"
    if [ -f "$spanish_file" ]; then
        echo -e "${GREEN}✅ $spanish_file: Present${NC}"
    else
        echo -e "${RED}❌ $spanish_file: Missing${NC}"
        critical_missing=$((critical_missing + 1))
    fi
done

echo ""
echo "🏁 Link Validation Complete!"

# Exit with appropriate code
if [ $invalid_links -eq 0 ] && [ $critical_missing -eq 0 ]; then
    echo -e "${GREEN}✅ All links are valid and critical documentation is complete!${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}Note: $warnings links were skipped (relative/anchor links)${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ Found $invalid_links broken links and $critical_missing missing critical files${NC}"
    echo "Please fix the broken links and ensure all critical documentation is present."
    exit 1
fi