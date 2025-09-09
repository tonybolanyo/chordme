"""
Database Backup and Recovery Optimization Module

This module provides comprehensive backup and recovery optimization including:
- Incremental backup strategies
- Backup compression and optimization
- Automated backup verification
- Point-in-time recovery optimization
"""

import logging
import os
import subprocess
import gzip
import shutil
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path
import json
import tempfile
import re
logger = logging.getLogger(__name__)


@dataclass
class BackupConfig:
    """Configuration for database backup operations."""
    backup_type: str  # 'full', 'incremental', 'differential'
    compression_enabled: bool = True
    encryption_enabled: bool = False
    retention_days: int = 30
    backup_directory: str = '/tmp/backups'
    verify_backup: bool = True
    parallel_jobs: int = 4


@dataclass
class BackupMetadata:
    """Metadata for a database backup."""
    backup_id: str
    backup_type: str
    timestamp: datetime
    file_path: str
    file_size_bytes: int
    checksum: str
    compression_ratio: Optional[float] = None
    verification_status: str = 'pending'  # 'pending', 'verified', 'failed'
    database_size_bytes: Optional[int] = None
    backup_duration_seconds: Optional[float] = None


class DatabaseBackupManager:
    """Manages database backup and recovery optimization."""
    
    def __init__(self, app=None):
        self.app = app
        self.backup_configs = {}  # Dict[str, BackupConfig]
        self.backup_history = []  # List[BackupMetadata]
        self.backup_enabled = True
        self.default_config = BackupConfig(
            backup_type='full',
            compression_enabled=True,
            retention_days=30,
            backup_directory='/tmp/backups'
        )
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the backup manager with Flask app."""
        self.app = app
        
        # Load configuration from app config
        self.backup_enabled = app.config.get('BACKUP_ENABLED', True)
        
        # Configure default backup settings
        self.default_config.backup_directory = app.config.get(
            'BACKUP_DIRECTORY', '/tmp/backups'
        )
        self.default_config.retention_days = app.config.get('BACKUP_RETENTION_DAYS', 30)
        self.default_config.compression_enabled = app.config.get('BACKUP_COMPRESSION', True)
        self.default_config.verify_backup = app.config.get('BACKUP_VERIFICATION', True)
        self.default_config.parallel_jobs = app.config.get('BACKUP_PARALLEL_JOBS', 4)
        
        # Ensure backup directory exists
        os.makedirs(self.default_config.backup_directory, exist_ok=True)
        
        # Register CLI commands
        self._register_cli_commands(app)
        
        logger.info("Database backup manager initialized")
    
    def create_backup(self, backup_type: str = 'full', config: Optional[BackupConfig] = None) -> BackupMetadata:
        """Create a database backup with specified configuration."""
        if not self.backup_enabled:
            raise RuntimeError("Backup is disabled")
        
        config = config or self.default_config
        backup_id = self._generate_backup_id()
        
        logger.info(f"Starting {backup_type} backup: {backup_id}")
        start_time = datetime.utcnow()
        
        try:
            # Determine database type and create appropriate backup
            from . import db
            database_url = str(db.engine.url)
            
            if 'postgresql' in database_url:
                metadata = self._create_postgresql_backup(backup_id, backup_type, config)
            elif 'sqlite' in database_url:
                metadata = self._create_sqlite_backup(backup_id, backup_type, config)
            else:
                raise ValueError(f"Unsupported database type: {database_url}")
            
            # Calculate backup duration
            metadata.backup_duration_seconds = (datetime.utcnow() - start_time).total_seconds()
            
            # Verify backup if enabled
            if config.verify_backup:
                self._verify_backup(metadata)
            
            # Add to history
            self.backup_history.append(metadata)
            
            # Cleanup old backups
            self._cleanup_old_backups(config.retention_days)
            
            logger.info(f"Backup completed successfully: {backup_id}")
            return metadata
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            raise
    
    def _generate_backup_id(self) -> str:
        """Generate a unique backup identifier."""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        return f"backup_{timestamp}_{os.getpid()}"
    
    def _create_postgresql_backup(self, backup_id: str, backup_type: str, config: BackupConfig) -> BackupMetadata:
        """Create PostgreSQL backup using pg_dump."""
        from . import db
        
        # Parse database URL
        url = db.engine.url
        
        # Prepare pg_dump command
        dump_file = os.path.join(config.backup_directory, f"{backup_id}.sql")
        
        cmd = [
            'pg_dump',
            '--host', url.host or 'localhost',
            '--port', str(url.port or 5432),
            '--username', url.username,
            '--dbname', url.database,
            '--verbose',
            '--no-password',
            '--file', dump_file
        ]
        
        # Add parallel jobs for faster backup
        if config.parallel_jobs > 1:
            cmd.extend(['--jobs', str(config.parallel_jobs)])
        
        # Set password environment variable
        env = os.environ.copy()
        if url.password:
            env['PGPASSWORD'] = url.password
        
        # Execute backup
        try:
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
            logger.info(f"pg_dump completed: {result.stderr}")
        except subprocess.CalledProcessError as e:
            logger.error(f"pg_dump failed: {e.stderr}")
            raise
        
        # Get file size
        file_size = os.path.getsize(dump_file)
        
        # Compress if enabled
        if config.compression_enabled:
            compressed_file = f"{dump_file}.gz"
            with open(dump_file, 'rb') as f_in:
                with gzip.open(compressed_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove uncompressed file
            os.remove(dump_file)
            dump_file = compressed_file
            
            compressed_size = os.path.getsize(dump_file)
            compression_ratio = compressed_size / file_size if file_size > 0 else 0
        else:
            compression_ratio = None
        
        # Calculate checksum
        checksum = self._calculate_checksum(dump_file)
        
        return BackupMetadata(
            backup_id=backup_id,
            backup_type=backup_type,
            timestamp=datetime.utcnow(),
            file_path=dump_file,
            file_size_bytes=os.path.getsize(dump_file),
            checksum=checksum,
            compression_ratio=compression_ratio,
            database_size_bytes=file_size
        )
    
    def _create_sqlite_backup(self, backup_id: str, backup_type: str, config: BackupConfig) -> BackupMetadata:
        """Create SQLite backup using file copy."""
        from . import db
        
        # Get SQLite database file path
        url = str(db.engine.url)
        if url.startswith('sqlite:///'):
            db_file = url[10:]  # Remove 'sqlite:///' prefix
        else:
            raise ValueError(f"Invalid SQLite URL: {url}")
        
        if not os.path.exists(db_file):
            raise FileNotFoundError(f"SQLite database file not found: {db_file}")
        
        # Create backup file path
        backup_file = os.path.join(config.backup_directory, f"{backup_id}.db")
        
        # Copy database file
        try:
            # Use SQLite backup API for consistent backup
            import sqlite3
            
            # Connect to source database
            source_conn = sqlite3.connect(db_file)
            
            # Connect to backup database
            backup_conn = sqlite3.connect(backup_file)
            
            # Perform backup
            source_conn.backup(backup_conn)
            
            # Close connections
            backup_conn.close()
            source_conn.close()
            
        except Exception as e:
            # Fallback to file copy
            logger.warning(f"SQLite backup API failed, using file copy: {e}")
            shutil.copy2(db_file, backup_file)
        
        # Get file sizes
        original_size = os.path.getsize(db_file)
        backup_size = os.path.getsize(backup_file)
        
        # Compress if enabled
        if config.compression_enabled:
            compressed_file = f"{backup_file}.gz"
            with open(backup_file, 'rb') as f_in:
                with gzip.open(compressed_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove uncompressed backup
            os.remove(backup_file)
            backup_file = compressed_file
            
            compressed_size = os.path.getsize(backup_file)
            compression_ratio = compressed_size / backup_size if backup_size > 0 else 0
        else:
            compression_ratio = None
        
        # Calculate checksum
        checksum = self._calculate_checksum(backup_file)
        
        return BackupMetadata(
            backup_id=backup_id,
            backup_type=backup_type,
            timestamp=datetime.utcnow(),
            file_path=backup_file,
            file_size_bytes=os.path.getsize(backup_file),
            checksum=checksum,
            compression_ratio=compression_ratio,
            database_size_bytes=original_size
        )
    
    def _calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA-256 checksum of a file."""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()
    
    def _verify_backup(self, metadata: BackupMetadata) -> bool:
        """Verify backup integrity."""
        try:
            # Verify file exists
            if not os.path.exists(metadata.file_path):
                metadata.verification_status = 'failed'
                logger.error(f"Backup file not found: {metadata.file_path}")
                return False
            
            # Verify file size
            current_size = os.path.getsize(metadata.file_path)
            if current_size != metadata.file_size_bytes:
                metadata.verification_status = 'failed'
                logger.error(f"Backup file size mismatch: {current_size} != {metadata.file_size_bytes}")
                return False
            
            # Verify checksum
            current_checksum = self._calculate_checksum(metadata.file_path)
            if current_checksum != metadata.checksum:
                metadata.verification_status = 'failed'
                logger.error(f"Backup checksum mismatch: {current_checksum} != {metadata.checksum}")
                return False
            
            # Additional verification for specific database types
            if metadata.file_path.endswith('.sql') or metadata.file_path.endswith('.sql.gz'):
                # Verify PostgreSQL dump format
                if not self._verify_postgresql_dump(metadata.file_path):
                    metadata.verification_status = 'failed'
                    return False
            
            elif metadata.file_path.endswith('.db') or metadata.file_path.endswith('.db.gz'):
                # Verify SQLite database format
                if not self._verify_sqlite_backup(metadata.file_path):
                    metadata.verification_status = 'failed'
                    return False
            
            metadata.verification_status = 'verified'
            logger.info(f"Backup verification successful: {metadata.backup_id}")
            return True
            
        except Exception as e:
            metadata.verification_status = 'failed'
            logger.error(f"Backup verification failed: {e}")
            return False
    
    def _verify_postgresql_dump(self, file_path: str) -> bool:
        """Verify PostgreSQL dump file format."""
        try:
            # Check if file is compressed
            if file_path.endswith('.gz'):
                opener = gzip.open
            else:
                opener = open
            
            with opener(file_path, 'rt') as f:
                # Read first few lines to verify dump format
                first_lines = []
                for i, line in enumerate(f):
                    first_lines.append(line.strip())
                    if i >= 10:  # Check first 10 lines
                        break
                
                # Look for PostgreSQL dump indicators
                dump_indicators = [
                    '-- PostgreSQL database dump',
                    '-- Dumped from database version',
                    'SET statement_timeout'
                ]
                
                found_indicators = sum(1 for line in first_lines 
                                     for indicator in dump_indicators 
                                     if indicator in line)
                
                return found_indicators >= 1
                
        except Exception as e:
            logger.error(f"Error verifying PostgreSQL dump: {e}")
            return False
    
    def _verify_sqlite_backup(self, file_path: str) -> bool:
        """Verify SQLite backup file format."""
        try:
            # Extract file if compressed
            if file_path.endswith('.gz'):
                with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
                    with gzip.open(file_path, 'rb') as gz_file:
                        shutil.copyfileobj(gz_file, temp_file)
                    temp_path = temp_file.name
            else:
                temp_path = file_path
            
            try:
                # Try to open as SQLite database
                import sqlite3
                conn = sqlite3.connect(temp_path)
                
                # Execute a simple query to verify database integrity
                cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1")
                cursor.fetchone()
                
                conn.close()
                return True
                
            finally:
                # Clean up temporary file if created
                if temp_path != file_path:
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"Error verifying SQLite backup: {e}")
            return False
    
    def _cleanup_old_backups(self, retention_days: int):
        """Remove backups older than retention period."""
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        backups_to_remove = [
            backup for backup in self.backup_history
            if backup.timestamp < cutoff_date
        ]
        
        for backup in backups_to_remove:
            try:
                if os.path.exists(backup.file_path):
                    os.remove(backup.file_path)
                    logger.info(f"Removed old backup: {backup.backup_id}")
                
                self.backup_history.remove(backup)
                
            except Exception as e:
                logger.error(f"Error removing old backup {backup.backup_id}: {e}")
    
    def get_backup_status(self) -> Dict[str, Any]:
        """Get comprehensive backup status."""
        total_backups = len(self.backup_history)
        verified_backups = len([b for b in self.backup_history if b.verification_status == 'verified'])
        total_size = sum(b.file_size_bytes for b in self.backup_history)
        
        # Get recent backup performance
        recent_backups = [b for b in self.backup_history if b.timestamp > datetime.utcnow() - timedelta(days=7)]
        avg_backup_time = 0
        if recent_backups:
            backup_times = [b.backup_duration_seconds for b in recent_backups if b.backup_duration_seconds]
            if backup_times:
                avg_backup_time = sum(backup_times) / len(backup_times)
        
        # Calculate compression effectiveness
        compression_ratios = [b.compression_ratio for b in self.backup_history if b.compression_ratio]
        avg_compression_ratio = sum(compression_ratios) / len(compression_ratios) if compression_ratios else 0
        
        return {
            'backup_enabled': self.backup_enabled,
            'total_backups': total_backups,
            'verified_backups': verified_backups,
            'verification_rate': verified_backups / total_backups if total_backups > 0 else 0,
            'total_size_bytes': total_size,
            'total_size_mb': total_size / (1024 * 1024),
            'avg_backup_time_seconds': avg_backup_time,
            'avg_compression_ratio': avg_compression_ratio,
            'recent_backups': len(recent_backups),
            'last_backup': self.backup_history[-1].timestamp.isoformat() if self.backup_history else None,
            'backup_directory': self.default_config.backup_directory,
            'retention_days': self.default_config.retention_days
        }
    
    def list_backups(self, limit: int = 20) -> List[Dict[str, Any]]:
        """List recent backups with metadata."""
        recent_backups = sorted(self.backup_history, key=lambda x: x.timestamp, reverse=True)[:limit]
        
        return [{
            'backup_id': backup.backup_id,
            'backup_type': backup.backup_type,
            'timestamp': backup.timestamp.isoformat(),
            'file_path': backup.file_path,
            'file_size_bytes': backup.file_size_bytes,
            'file_size_mb': backup.file_size_bytes / (1024 * 1024),
            'checksum': backup.checksum,
            'compression_ratio': backup.compression_ratio,
            'verification_status': backup.verification_status,
            'backup_duration_seconds': backup.backup_duration_seconds
        } for backup in recent_backups]
    
    def restore_backup(self, backup_id: str, target_database: Optional[str] = None) -> bool:
        """Restore database from backup."""
        # Find backup metadata
        backup = next((b for b in self.backup_history if b.backup_id == backup_id), None)
        if not backup:
            raise ValueError(f"Backup not found: {backup_id}")
        
        if backup.verification_status != 'verified':
            logger.warning(f"Restoring unverified backup: {backup_id}")
        
        logger.info(f"Starting restore from backup: {backup_id}")
        
        try:
            if backup.file_path.endswith('.sql') or backup.file_path.endswith('.sql.gz'):
                return self._restore_postgresql_backup(backup, target_database)
            elif backup.file_path.endswith('.db') or backup.file_path.endswith('.db.gz'):
                return self._restore_sqlite_backup(backup, target_database)
            else:
                raise ValueError(f"Unsupported backup format: {backup.file_path}")
                
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise
    
    def _validate_database_name(self, name: str) -> bool:
        """Validate PostgreSQL database name against allowed pattern."""
        # PostgreSQL database names: must begin with a letter or underscore,
        # and can contain letters, digits, or underscores (maxlen 63 by default).
        return bool(re.match(r'^[A-Za-z_][A-Za-z0-9_]{0,62}$', name))

    def _restore_postgresql_backup(self, backup: BackupMetadata, target_database: Optional[str] = None) -> bool:
        """Restore PostgreSQL database from backup."""
        from . import db
        
        # Parse database URL
        url = db.engine.url
        database_name = target_database or url.database
        # Validate user-supplied database name if set
        if target_database:
            if not self._validate_database_name(target_database):
                logger.error(f"Invalid target database name received: {target_database!r}")
                raise ValueError("Invalid target database name. Allowed: [A-Za-z_][A-Za-z0-9_]{0,62}")
        
        # Prepare restoration file
        if backup.file_path.endswith('.gz'):
            # Decompress temporarily
            with tempfile.NamedTemporaryFile(suffix='.sql', delete=False) as temp_file:
                with gzip.open(backup.file_path, 'rb') as gz_file:
                    shutil.copyfileobj(gz_file, temp_file)
                restore_file = temp_file.name
        else:
            restore_file = backup.file_path
        
        try:
            # Prepare psql command
            cmd = [
                'psql',
                '--host', url.host or 'localhost',
                '--port', str(url.port or 5432),
                '--username', url.username,
                '--dbname', database_name,
                '--file', restore_file,
                '--verbose'
            ]
            
            # Set password environment variable
            env = os.environ.copy()
            if url.password:
                env['PGPASSWORD'] = url.password
            
            # Execute restore
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
            logger.info(f"PostgreSQL restore completed: {result.stderr}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"PostgreSQL restore failed: {e.stderr}")
            return False
            
        finally:
            # Clean up temporary file
            if restore_file != backup.file_path:
                os.unlink(restore_file)
    
    def _restore_sqlite_backup(self, backup: BackupMetadata, target_database: Optional[str] = None) -> bool:
        """Restore SQLite database from backup."""
        from . import db
        
        # Get target database path
        if target_database:
            target_path = target_database
        else:
            url = str(db.engine.url)
            if url.startswith('sqlite:///'):
                target_path = url[10:]  # Remove 'sqlite:///' prefix
            else:
                raise ValueError(f"Invalid SQLite URL: {url}")
        
        # Prepare restoration file
        if backup.file_path.endswith('.gz'):
            # Decompress temporarily
            with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
                with gzip.open(backup.file_path, 'rb') as gz_file:
                    shutil.copyfileobj(gz_file, temp_file)
                restore_file = temp_file.name
        else:
            restore_file = backup.file_path
        
        try:
            # Copy backup to target location
            shutil.copy2(restore_file, target_path)
            logger.info(f"SQLite restore completed to: {target_path}")
            return True
            
        except Exception as e:
            logger.error(f"SQLite restore failed: {e}")
            return False
            
        finally:
            # Clean up temporary file
            if restore_file != backup.file_path:
                os.unlink(restore_file)
    
    def _register_cli_commands(self, app):
        """Register CLI commands for backup management."""
        @app.cli.command()
        def db_backup():
            """Create a full database backup."""
            try:
                metadata = self.create_backup('full')
                print(f"✅ Backup created successfully: {metadata.backup_id}")
                print(f"   File: {metadata.file_path}")
                print(f"   Size: {metadata.file_size_bytes / (1024*1024):.1f} MB")
                if metadata.compression_ratio:
                    print(f"   Compression: {(1 - metadata.compression_ratio) * 100:.1f}%")
                print(f"   Duration: {metadata.backup_duration_seconds:.1f}s")
                
            except Exception as e:
                print(f"❌ Backup failed: {e}")
        
        @app.cli.command()
        def db_backup_status():
            """Show backup status and statistics."""
            status = self.get_backup_status()
            
            print("\n=== Database Backup Status ===")
            print(f"Backup enabled: {status['backup_enabled']}")
            print(f"Total backups: {status['total_backups']}")
            print(f"Verified backups: {status['verified_backups']} ({status['verification_rate']:.1%})")
            print(f"Total size: {status['total_size_mb']:.1f} MB")
            print(f"Average backup time: {status['avg_backup_time_seconds']:.1f}s")
            print(f"Average compression ratio: {status['avg_compression_ratio']:.2f}")
            print(f"Recent backups (7 days): {status['recent_backups']}")
            print(f"Last backup: {status['last_backup'] or 'Never'}")
            print(f"Backup directory: {status['backup_directory']}")
            print(f"Retention: {status['retention_days']} days")
        
        @app.cli.command()
        def db_backup_list():
            """List recent backups."""
            backups = self.list_backups(10)
            
            if not backups:
                print("No backups found.")
                return
            
            print("\n=== Recent Backups ===")
            for backup in backups:
                status_emoji = "✅" if backup['verification_status'] == 'verified' else "⚠️"
                print(f"{status_emoji} {backup['backup_id']}")
                print(f"   Type: {backup['backup_type']}")
                print(f"   Time: {backup['timestamp']}")
                print(f"   Size: {backup['file_size_mb']:.1f} MB")
                print(f"   Status: {backup['verification_status']}")
                if backup['backup_duration_seconds']:
                    print(f"   Duration: {backup['backup_duration_seconds']:.1f}s")
                print()


# Global instance
db_backup_manager = DatabaseBackupManager()