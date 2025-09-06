"""
Test suite for setlist database migration (005_setlist_architecture.sql).
Validates that the migration runs successfully and creates all required tables and constraints.
"""

import pytest
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os


class TestSetlistMigration:
    """Test the setlist architecture database migration."""
    
    @pytest.fixture(scope='class')
    def db_connection(self):
        """Create test database connection."""
        # Use environment variables or defaults for test database
        host = os.getenv('TEST_DB_HOST', 'localhost')
        port = os.getenv('TEST_DB_PORT', '5432')
        user = os.getenv('TEST_DB_USER', 'postgres')
        password = os.getenv('TEST_DB_PASSWORD', 'postgres')
        database = 'chordme_test_migration'
        
        # Connect to PostgreSQL server to create test database
        conn = psycopg2.connect(
            host=host, port=port, user=user, password=password, database='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Drop and recreate test database
        cursor.execute(f"DROP DATABASE IF EXISTS {database}")
        cursor.execute(f"CREATE DATABASE {database}")
        cursor.close()
        conn.close()
        
        # Connect to test database
        test_conn = psycopg2.connect(
            host=host, port=port, user=user, password=password, database=database
        )
        test_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        yield test_conn
        
        # Cleanup
        test_conn.close()
        
        # Drop test database
        conn = psycopg2.connect(
            host=host, port=port, user=user, password=password, database='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        cursor.execute(f"DROP DATABASE IF EXISTS {database}")
        cursor.close()
        conn.close()
    
    def test_migration_prerequisites(self, db_connection):
        """Test that prerequisite tables exist before running setlist migration."""
        cursor = db_connection.cursor()
        
        # Create prerequisite tables (users, songs) that setlist migration depends on
        cursor.execute("""
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(100),
                bio TEXT,
                profile_image_url VARCHAR(500),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS songs (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                artist VARCHAR(255),
                content TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                is_public BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create updated_at trigger function
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """)
        
        # Verify tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name IN ('users', 'songs')
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        assert 'users' in tables
        assert 'songs' in tables
        
        cursor.close()
    
    def test_run_setlist_migration(self, db_connection):
        """Test running the complete setlist migration."""
        cursor = db_connection.cursor()
        
        # Read and execute the migration file
        migration_path = '/home/runner/work/chordme/chordme/database/migrations/005_setlist_architecture.sql'
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration (may contain multiple statements)
        cursor.execute(migration_sql)
        
        cursor.close()
    
    def test_setlist_tables_created(self, db_connection):
        """Test that all setlist tables are created."""
        cursor = db_connection.cursor()
        
        expected_tables = [
            'setlists',
            'setlist_songs', 
            'setlist_versions',
            'setlist_templates',
            'setlist_template_sections',
            'setlist_collaborators',
            'setlist_performances',
            'setlist_performance_songs'
        ]
        
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'setlist%'
            ORDER BY table_name
        """)
        
        actual_tables = [row[0] for row in cursor.fetchall()]
        
        for table in expected_tables:
            assert table in actual_tables, f"Table {table} was not created"
        
        cursor.close()
    
    def test_setlist_table_structure(self, db_connection):
        """Test the structure of the main setlists table."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'setlists' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row[0]: {'type': row[1], 'nullable': row[2], 'default': row[3]} 
                  for row in cursor.fetchall()}
        
        # Test required columns exist
        required_columns = [
            'id', 'name', 'user_id', 'event_type', 'status', 'is_deleted', 
            'is_archived', 'created_at', 'updated_at'
        ]
        
        for col in required_columns:
            assert col in columns, f"Column {col} missing from setlists table"
        
        # Test specific column properties
        assert columns['name']['nullable'] == 'NO'
        assert columns['is_deleted']['default'] == 'false'
        assert columns['status']['default'] == "'draft'::character varying"
        
        cursor.close()
    
    def test_setlist_songs_table_structure(self, db_connection):
        """Test the structure of the setlist_songs table."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'setlist_songs' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row[0]: {'type': row[1], 'nullable': row[2]} for row in cursor.fetchall()}
        
        # Test required columns
        required_columns = [
            'id', 'setlist_id', 'song_id', 'sort_order', 'performance_key',
            'performance_tempo', 'estimated_duration', 'arrangement_notes'
        ]
        
        for col in required_columns:
            assert col in columns, f"Column {col} missing from setlist_songs table"
        
        # Test nullable constraints
        assert columns['setlist_id']['nullable'] == 'NO'
        assert columns['song_id']['nullable'] == 'NO'
        assert columns['sort_order']['nullable'] == 'NO'
        
        cursor.close()
    
    def test_foreign_key_constraints(self, db_connection):
        """Test that foreign key constraints are properly created."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name LIKE 'setlist%'
        """)
        
        foreign_keys = cursor.fetchall()
        
        # Expected foreign key relationships
        expected_fks = [
            ('setlists', 'user_id', 'users'),
            ('setlist_songs', 'setlist_id', 'setlists'),
            ('setlist_songs', 'song_id', 'songs'),
            ('setlist_versions', 'setlist_id', 'setlists'),
            ('setlist_collaborators', 'setlist_id', 'setlists'),
            ('setlist_collaborators', 'user_id', 'users'),
        ]
        
        fk_dict = {(fk[0], fk[1]): fk[2] for fk in foreign_keys}
        
        for table, column, ref_table in expected_fks:
            assert (table, column) in fk_dict, f"Missing FK: {table}.{column}"
            assert fk_dict[(table, column)] == ref_table, f"Wrong FK target for {table}.{column}"
        
        cursor.close()
    
    def test_unique_constraints(self, db_connection):
        """Test that unique constraints are properly created."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT 
                tc.table_name,
                tc.constraint_name,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'UNIQUE' 
                AND tc.table_name LIKE 'setlist%'
            ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
        """)
        
        constraints = cursor.fetchall()
        
        # Group by table and constraint
        table_constraints = {}
        for table, constraint, column in constraints:
            if table not in table_constraints:
                table_constraints[table] = {}
            if constraint not in table_constraints[table]:
                table_constraints[table][constraint] = []
            table_constraints[table][constraint].append(column)
        
        # Test specific unique constraints
        assert 'setlist_songs' in table_constraints
        setlist_songs_constraints = table_constraints['setlist_songs']
        
        # Should have unique constraint on (setlist_id, song_id)
        unique_setlist_song = None
        for constraint_name, columns in setlist_songs_constraints.items():
            if set(columns) == {'setlist_id', 'song_id'}:
                unique_setlist_song = constraint_name
                break
        
        assert unique_setlist_song is not None, "Missing unique constraint on (setlist_id, song_id)"
        
        cursor.close()
    
    def test_check_constraints(self, db_connection):
        """Test that check constraints are properly created.""" 
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT 
                tc.table_name,
                tc.constraint_name,
                cc.check_clause
            FROM information_schema.table_constraints tc
            JOIN information_schema.check_constraints cc
                ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_name LIKE 'setlist%'
            ORDER BY tc.table_name, tc.constraint_name
        """)
        
        constraints = cursor.fetchall()
        constraint_dict = {(row[0], row[1]): row[2] for row in constraints}
        
        # Test that setlist status check constraint exists
        setlist_status_constraints = [
            (table, name) for table, name in constraint_dict.keys() 
            if table == 'setlists' and 'status' in name.lower()
        ]
        
        assert len(setlist_status_constraints) > 0, "Missing status check constraint on setlists"
        
        cursor.close()
    
    def test_indexes_created(self, db_connection):
        """Test that performance indexes are created."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT 
                indexname,
                tablename,
                indexdef
            FROM pg_indexes 
            WHERE tablename LIKE 'setlist%'
                AND schemaname = 'public'
            ORDER BY tablename, indexname
        """)
        
        indexes = cursor.fetchall()
        
        # Should have indexes on commonly queried columns
        index_names = [idx[0] for idx in indexes]
        
        # Test some expected indexes
        expected_index_patterns = [
            'setlists_user_id',
            'setlist_songs_setlist_id', 
            'setlist_songs_song_id',
            'setlist_collaborators_setlist_id'
        ]
        
        for pattern in expected_index_patterns:
            matching_indexes = [name for name in index_names if pattern in name]
            assert len(matching_indexes) > 0, f"No index found matching pattern: {pattern}"
        
        cursor.close()
    
    def test_default_templates_inserted(self, db_connection):
        """Test that default system templates are inserted."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT name, category, is_system 
            FROM setlist_templates 
            WHERE is_system = true
            ORDER BY name
        """)
        
        templates = cursor.fetchall()
        
        # Should have system templates
        assert len(templates) > 0, "No system templates were inserted"
        
        template_names = [t[0] for t in templates]
        
        # Test for expected default templates
        expected_templates = [
            'Basic Worship Service',
            'Contemporary Worship', 
            'Concert Performance',
            'Band Rehearsal'
        ]
        
        for expected in expected_templates:
            assert expected in template_names, f"Missing system template: {expected}"
        
        cursor.close()
    
    def test_template_sections_inserted(self, db_connection):
        """Test that default template sections are inserted."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT 
                st.name as template_name,
                sts.section_name,
                sts.section_order
            FROM setlist_templates st
            JOIN setlist_template_sections sts ON st.id = sts.template_id
            WHERE st.name = 'Basic Worship Service'
            ORDER BY sts.section_order
        """)
        
        sections = cursor.fetchall()
        
        # Should have sections for the Basic Worship Service template
        assert len(sections) > 0, "No sections found for Basic Worship Service template"
        
        section_names = [s[1] for s in sections]
        
        # Test for expected sections
        expected_sections = ['opening', 'worship', 'message', 'response', 'closing']
        
        for expected in expected_sections:
            assert expected in section_names, f"Missing section: {expected}"
        
        cursor.close()
    
    def test_triggers_created(self, db_connection):
        """Test that database triggers are created."""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT 
                trigger_name,
                event_object_table,
                action_timing,
                event_manipulation
            FROM information_schema.triggers 
            WHERE event_object_table LIKE 'setlist%'
            ORDER BY event_object_table, trigger_name
        """)
        
        triggers = cursor.fetchall()
        
        # Should have update triggers for updated_at columns
        update_triggers = [
            t for t in triggers 
            if 'updated_at' in t[0] and t[2] == 'BEFORE' and t[3] == 'UPDATE'
        ]
        
        assert len(update_triggers) > 0, "No updated_at triggers found"
        
        # Should have triggers for setlist versioning
        version_triggers = [
            t for t in triggers
            if 'version' in t[0] and t[1] == 'setlists'
        ]
        
        assert len(version_triggers) > 0, "No versioning triggers found for setlists"
        
        cursor.close()


@pytest.mark.integration
class TestSetlistMigrationData:
    """Integration tests for data operations after migration."""
    
    def test_insert_basic_setlist(self, db_connection):
        """Test inserting a basic setlist record."""
        cursor = db_connection.cursor()
        
        # Insert test user first
        cursor.execute("""
            INSERT INTO users (email, password_hash) 
            VALUES ('test@example.com', 'hashed_password')
            RETURNING id
        """)
        user_id = cursor.fetchone()[0]
        
        # Insert setlist
        cursor.execute("""
            INSERT INTO setlists (name, user_id, event_type, status)
            VALUES ('Test Setlist', %s, 'worship', 'draft')
            RETURNING id
        """, (user_id,))
        
        setlist_id = cursor.fetchone()[0]
        
        assert setlist_id is not None
        
        # Verify the record
        cursor.execute("SELECT name, event_type, status FROM setlists WHERE id = %s", (setlist_id,))
        result = cursor.fetchone()
        
        assert result[0] == 'Test Setlist'
        assert result[1] == 'worship'
        assert result[2] == 'draft'
        
        cursor.close()
    
    def test_insert_setlist_with_songs(self, db_connection):
        """Test inserting setlist with songs."""
        cursor = db_connection.cursor()
        
        # Insert test data
        cursor.execute("""
            INSERT INTO users (email, password_hash) 
            VALUES ('test@example.com', 'hashed_password')
            RETURNING id
        """)
        user_id = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO songs (title, content, user_id)
            VALUES ('Amazing Grace', 'Test content', %s)
            RETURNING id
        """, (user_id,))
        song_id = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO setlists (name, user_id)
            VALUES ('Test Setlist', %s)
            RETURNING id
        """, (user_id,))
        setlist_id = cursor.fetchone()[0]
        
        # Add song to setlist
        cursor.execute("""
            INSERT INTO setlist_songs (setlist_id, song_id, sort_order, section, performance_key)
            VALUES (%s, %s, 1, 'opening', 'G')
            RETURNING id
        """, (setlist_id, song_id))
        
        setlist_song_id = cursor.fetchone()[0]
        assert setlist_song_id is not None
        
        # Verify the relationship
        cursor.execute("""
            SELECT s.title, ss.section, ss.performance_key
            FROM setlist_songs ss
            JOIN songs s ON ss.song_id = s.id
            WHERE ss.setlist_id = %s
        """, (setlist_id,))
        
        result = cursor.fetchone()
        assert result[0] == 'Amazing Grace'
        assert result[1] == 'opening'
        assert result[2] == 'G'
        
        cursor.close()
    
    def test_unique_constraint_enforcement(self, db_connection):
        """Test that unique constraints are enforced."""
        cursor = db_connection.cursor()
        
        # Setup test data
        cursor.execute("""
            INSERT INTO users (email, password_hash) 
            VALUES ('test@example.com', 'hashed_password')
            RETURNING id
        """)
        user_id = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO songs (title, content, user_id)
            VALUES ('Test Song', 'Test content', %s)
            RETURNING id
        """, (user_id,))
        song_id = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO setlists (name, user_id)
            VALUES ('Test Setlist', %s)
            RETURNING id
        """, (user_id,))
        setlist_id = cursor.fetchone()[0]
        
        # Add song to setlist
        cursor.execute("""
            INSERT INTO setlist_songs (setlist_id, song_id, sort_order)
            VALUES (%s, %s, 1)
        """, (setlist_id, song_id))
        
        # Try to add same song again - should fail
        with pytest.raises(psycopg2.IntegrityError):
            cursor.execute("""
                INSERT INTO setlist_songs (setlist_id, song_id, sort_order)
                VALUES (%s, %s, 2)
            """, (setlist_id, song_id))
        
        cursor.close()


if __name__ == '__main__':
    pytest.main([__file__])