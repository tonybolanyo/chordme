#!/bin/bash

# Version synchronization script for ChordMe
# Usage: ./scripts/sync-version.sh <version>
# Example: ./scripts/sync-version.sh 1.2.0

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.2.0"
    exit 1
fi

VERSION="$1"

echo "🔄 Synchronizing version to $VERSION"

# Update root package.json
echo "📦 Updating root package.json..."
npm version $VERSION --no-git-tag-version

# Update frontend package.json
echo "⚛️  Updating frontend package.json..."
cd frontend
npm version $VERSION --no-git-tag-version
cd ..

# Update backend version file
echo "🐍 Updating backend version..."
cat > backend/chordme/version.py << EOF
"""Version information for ChordMe backend."""
__version__ = "$VERSION"
EOF

echo "✅ Version synchronization complete!"
echo ""
echo "📋 Summary:"
echo "  - Root package.json: $VERSION"
echo "  - Frontend package.json: $VERSION"
echo "  - Backend version.py: $VERSION"
echo ""
echo "🚀 To create a release, run:"
echo "   git add ."
echo "   git commit -m 'chore: bump version to $VERSION'"
echo "   git tag v$VERSION"
echo "   git push origin main --tags"