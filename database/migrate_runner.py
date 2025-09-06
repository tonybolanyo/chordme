#!/usr/bin/env python3
"""
Simple database migration runner for ChordMe.
Applies SQL migration files in order.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import argparse
from pathlib import Path

# Default database connection settings
DEFAULT_DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'chordme_dev'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

class MigrationRunner:
    def __init__(self, db_config=None, migrations_dir=None):
        self.db_config = db_config or DEFAULT_DB_CONFIG
        self.migrations_dir = Path(migrations_dir or 'migrations')
        self.conn = None
        
    def connect(self):
        """Connect to the database."""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.conn.autocommit = False
            print(f"✅ Connected to database: {self.db_config['database']}")
            return True
        except Exception as e:
            print(f"❌ Error connecting to database: {e}")
            return False
    
    def disconnect(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
    
    def create_migrations_table(self):
        """Create migrations tracking table if it doesn't exist."""
        with self.conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) UNIQUE NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT TRUE,
                    error_message TEXT
                )
            """)
            self.conn.commit()
            print("✅ Migrations tracking table ready")
    
    def get_applied_migrations(self):
        """Get list of already applied migrations."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT version, filename, applied_at, success
                FROM schema_migrations
                ORDER BY version
            """)
            return [row['version'] for row in cur.fetchall() if row['success']]
    
    def get_pending_migrations(self):
        """Get list of pending migration files."""
        if not self.migrations_dir.exists():
            print(f"❌ Migrations directory not found: {self.migrations_dir}")
            return []
        
        applied = set(self.get_applied_migrations())
        all_migrations = []
        
        for file_path in sorted(self.migrations_dir.glob('*.sql')):
            version = file_path.stem  # Filename without extension
            if version not in applied:
                all_migrations.append((version, file_path))
        
        return all_migrations
    
    def apply_migration(self, version, file_path):
        """Apply a single migration file."""
        print(f"📁 Applying migration: {version}")
        
        try:
            # Read migration file
            with open(file_path, 'r', encoding='utf-8') as f:
                migration_sql = f.read()
            
            # Execute migration
            with self.conn.cursor() as cur:
                cur.execute(migration_sql)
                
                # Record successful migration
                cur.execute("""
                    INSERT INTO schema_migrations (version, filename, success)
                    VALUES (%s, %s, %s)
                """, (version, file_path.name, True))
                
                self.conn.commit()
                print(f"✅ Migration {version} applied successfully")
                return True
                
        except Exception as e:
            # Record failed migration
            self.conn.rollback()
            
            try:
                with self.conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO schema_migrations (version, filename, success, error_message)
                        VALUES (%s, %s, %s, %s)
                    """, (version, file_path.name, False, str(e)))
                    self.conn.commit()
            except:
                pass  # If we can't record the error, that's a secondary problem
            
            print(f"❌ Migration {version} failed: {e}")
            return False
    
    def run_migrations(self, target_version=None, dry_run=False):
        """Run all pending migrations up to target version."""
        if not self.connect():
            return False
        
        try:
            self.create_migrations_table()
            pending = self.get_pending_migrations()
            
            if target_version:
                # Filter to only migrations up to target version
                pending = [(v, p) for v, p in pending if v <= target_version]
            
            if not pending:
                print("✅ No pending migrations")
                return True
            
            print(f"📋 Found {len(pending)} pending migration(s):")
            for version, file_path in pending:
                print(f"  - {version}: {file_path.name}")
            
            if dry_run:
                print("🔍 Dry run mode - no migrations will be applied")
                return True
            
            success_count = 0
            for version, file_path in pending:
                if self.apply_migration(version, file_path):
                    success_count += 1
                else:
                    print(f"❌ Migration failed, stopping at {version}")
                    break
            
            print(f"\n📊 Applied {success_count}/{len(pending)} migrations successfully")
            return success_count == len(pending)
            
        finally:
            self.disconnect()
    
    def show_status(self):
        """Show migration status."""
        if not self.connect():
            return False
        
        try:
            self.create_migrations_table()
            
            # Get applied migrations
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT version, filename, applied_at, success, error_message
                    FROM schema_migrations
                    ORDER BY version
                """)
                applied = cur.fetchall()
            
            # Get all migration files
            all_files = []
            if self.migrations_dir.exists():
                for file_path in sorted(self.migrations_dir.glob('*.sql')):
                    all_files.append((file_path.stem, file_path.name))
            
            applied_versions = {row['version']: row for row in applied}
            
            print("📊 Migration Status:")
            print("=" * 60)
            
            if not all_files:
                print("No migration files found")
                return True
            
            for version, filename in all_files:
                if version in applied_versions:
                    row = applied_versions[version]
                    if row['success']:
                        status = "✅ APPLIED"
                        detail = f"on {row['applied_at'].strftime('%Y-%m-%d %H:%M:%S')}"
                    else:
                        status = "❌ FAILED"
                        detail = f"Error: {row['error_message'][:50]}..."
                else:
                    status = "⏳ PENDING"
                    detail = "Not applied"
                
                print(f"{version:30} {status:12} {detail}")
            
            pending_count = len([v for v, _ in all_files if v not in applied_versions])
            applied_count = len([v for v in applied_versions.values() if v['success']])
            failed_count = len([v for v in applied_versions.values() if not v['success']])
            
            print("=" * 60)
            print(f"Applied: {applied_count}, Pending: {pending_count}, Failed: {failed_count}")
            
            return True
            
        finally:
            self.disconnect()
    
    def rollback_migration(self, version):
        """Rollback a specific migration (mark as not applied)."""
        if not self.connect():
            return False
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM schema_migrations WHERE version = %s
                """, (version,))
                
                if cur.rowcount > 0:
                    self.conn.commit()
                    print(f"✅ Migration {version} marked as not applied")
                    print("⚠️  Note: You must manually revert the database changes")
                    return True
                else:
                    print(f"❌ Migration {version} not found in applied migrations")
                    return False
                    
        except Exception as e:
            self.conn.rollback()
            print(f"❌ Error rolling back migration: {e}")
            return False
            
        finally:
            self.disconnect()

def main():
    parser = argparse.ArgumentParser(description='ChordMe Database Migration Runner')
    parser.add_argument('command', choices=['migrate', 'status', 'rollback'],
                       help='Command to execute')
    parser.add_argument('--target', '-t',
                       help='Target migration version')
    parser.add_argument('--dry-run', '-n', action='store_true',
                       help='Show what would be done without applying changes')
    parser.add_argument('--migrations-dir', '-d', default='migrations',
                       help='Directory containing migration files')
    parser.add_argument('--database', help='Database name')
    parser.add_argument('--host', help='Database host')
    parser.add_argument('--port', help='Database port')
    parser.add_argument('--user', help='Database user')
    parser.add_argument('--password', help='Database password')
    
    args = parser.parse_args()
    
    # Build database config from args
    db_config = DEFAULT_DB_CONFIG.copy()
    for key in ['database', 'host', 'port', 'user', 'password']:
        value = getattr(args, key)
        if value:
            db_config[key] = value
    
    # Get migrations directory
    migrations_dir = Path(__file__).parent / args.migrations_dir
    
    runner = MigrationRunner(db_config, migrations_dir)
    
    if args.command == 'migrate':
        success = runner.run_migrations(args.target, args.dry_run)
        sys.exit(0 if success else 1)
        
    elif args.command == 'status':
        success = runner.show_status()
        sys.exit(0 if success else 1)
        
    elif args.command == 'rollback':
        if not args.target:
            print("❌ --target version required for rollback")
            sys.exit(1)
        success = runner.rollback_migration(args.target)
        sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()