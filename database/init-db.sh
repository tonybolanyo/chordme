#!/bin/bash
# Database Initialization Script for ChordMe
# This script runs all migrations in order when the database container starts

set -e

echo "Starting database initialization..."

# Wait for PostgreSQL to be ready
until PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready. Running migrations..."

# Run migrations in order
for migration in /docker-entrypoint-initdb.d/*.sql; do
  if [ -f "$migration" ]; then
    echo "Running migration: $(basename $migration)"
    PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration"
  fi
done

echo "Database initialization completed successfully!"
