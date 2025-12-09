#!/bin/sh
# Frontend entrypoint script for ChordMe
# This script starts the Vite development server

set -e

echo "ChordMe Frontend - Starting Vite development server..."
exec npx vite --host 0.0.0.0
