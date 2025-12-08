#!/bin/sh
# Frontend entrypoint script for ChordMe
# This script ensures node_modules exist before starting Vite

set -e

echo "ChordMe Frontend - Starting..."

# Install node_modules if not present or if package.json changed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "Installing/updating node_modules..."
    npm ci
fi

echo "Starting Vite development server..."
exec npx vite --host 0.0.0.0
