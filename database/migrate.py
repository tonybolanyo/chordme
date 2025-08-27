#!/usr/bin/env python3
"""
Database migration script for ChordMe with Supabase.
Applies SQL migrations to the database.
"""

import os
import sys
import psycopg2
from pathlib import Path
import argparse
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_connection():
    """Get database connection from environment variables."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    # Handle postgres:// vs postgresql:// formats
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    return psycopg2.connect(database_url)

def create_migrations_table(conn):
    """Create migrations tracking table if it doesn't exist."""
    with conn.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def get_applied_migrations(conn):
    """Get list of already applied migrations."""
    with conn.cursor() as cursor:
        cursor.execute("SELECT filename FROM migrations ORDER BY applied_at")
        return [row[0] for row in cursor.fetchall()]

def apply_migration(conn, migration_file):
    """Apply a single migration file."""
    logger.info(f"Applying migration: {migration_file.name}")
    
    with migration_file.open('r') as f:
        migration_sql = f.read()
    
    with conn.cursor() as cursor:
        try:
            # Execute the migration
            cursor.execute(migration_sql)
            
            # Record the migration as applied
            cursor.execute(
                "INSERT INTO migrations (filename) VALUES (%s)",
                (migration_file.name,)
            )
            
            conn.commit()
            logger.info(f"Successfully applied migration: {migration_file.name}")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to apply migration {migration_file.name}: {str(e)}")
            raise

def main():
    parser = argparse.ArgumentParser(description='Run database migrations for ChordMe')
    parser.add_argument('--dry-run', action='store_true', help='Show pending migrations without applying them')
    parser.add_argument('--force', action='store_true', help='Apply migrations even if some have already been applied')
    args = parser.parse_args()

    try:
        # Get migrations directory
        migrations_dir = Path(__file__).parent / 'migrations'
        if not migrations_dir.exists():
            logger.error(f"Migrations directory not found: {migrations_dir}")
            sys.exit(1)

        # Get all migration files
        migration_files = sorted([f for f in migrations_dir.glob('*.sql')])
        if not migration_files:
            logger.info("No migration files found")
            return

        # Connect to database
        conn = get_database_connection()
        logger.info("Connected to database")

        # Create migrations tracking table
        create_migrations_table(conn)

        # Get already applied migrations
        applied_migrations = get_applied_migrations(conn)
        logger.info(f"Found {len(applied_migrations)} previously applied migrations")

        # Determine pending migrations
        pending_migrations = []
        for migration_file in migration_files:
            if migration_file.name not in applied_migrations or args.force:
                pending_migrations.append(migration_file)

        if not pending_migrations:
            logger.info("No pending migrations")
            return

        logger.info(f"Found {len(pending_migrations)} pending migrations:")
        for migration in pending_migrations:
            logger.info(f"  - {migration.name}")

        if args.dry_run:
            logger.info("Dry run mode - no migrations applied")
            return

        # Apply pending migrations
        for migration_file in pending_migrations:
            apply_migration(conn, migration_file)

        logger.info("All migrations applied successfully")

    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    main()