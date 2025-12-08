#!/bin/bash
# Backend entrypoint script for ChordMe
# This script ensures config.py exists before starting the Flask server

set -e

echo "ChordMe Backend - Starting..."

# Create config.py from template if it doesn't exist
if [ ! -f "config.py" ]; then
    echo "Creating config.py from config.template.py..."
    cp config.template.py config.py
fi

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if python -c "
import psycopg2
import os
import time
try:
    db_url = os.environ.get('DATABASE_URL', '')
    if 'postgresql://' in db_url:
        # Parse DATABASE_URL
        import re
        match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
        if match:
            user, password, host, port, dbname = match.groups()
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                dbname=dbname,
                connect_timeout=5
            )
            conn.close()
            print('Database is ready!')
            exit(0)
except Exception as e:
    print(f'Database not ready yet: {e}')
    exit(1)
" 2>/dev/null; then
        echo "Database connection successful!"
        break
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -lt $max_attempts ]; then
        echo "Database not ready yet (attempt $attempt/$max_attempts), retrying in 2 seconds..."
        sleep 2
    fi
done

if [ $attempt -eq $max_attempts ]; then
    echo "WARNING: Could not connect to database after $max_attempts attempts. Continuing anyway..."
fi

echo "Starting Flask development server..."
exec python run.py
