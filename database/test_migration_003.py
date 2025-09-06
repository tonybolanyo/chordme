#!/usr/bin/env python3
"""
Test suite for database migration 003_enhance_song_schema.sql
Tests schema validation, constraints, indexes, and data integrity.
"""

import os
import sys
import unittest
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime

# Database connection settings
TEST_DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'chordme_test'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

class DatabaseMigrationTest(unittest.TestCase):
    """Test cases for database schema migration."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test database connection."""
        try:
            cls.conn = psycopg2.connect(**TEST_DB_CONFIG)
            cls.conn.autocommit = False
            print(f"Connected to test database: {TEST_DB_CONFIG['database']}")
        except Exception as e:
            print(f"Failed to connect to test database: {e}")
            print("Make sure PostgreSQL is running and test database exists")
            sys.exit(1)
    
    @classmethod
    def tearDownClass(cls):
        """Clean up database connection."""
        if hasattr(cls, 'conn'):
            cls.conn.close()
    
    def setUp(self):
        """Set up each test case."""
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        
    def tearDown(self):
        """Clean up each test case."""
        self.conn.rollback()
        self.cursor.close()

class TestSchemaStructure(DatabaseMigrationTest):
    """Test that all tables and columns exist with correct types."""
    
    def test_songs_table_enhanced_columns(self):
        """Test that songs table has all the new columns."""
        self.cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'songs' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row['column_name']: row for row in self.cursor.fetchall()}
        
        # Check new metadata columns
        expected_columns = {
            'genre': 'character varying',
            'song_key': 'character varying',
            'tempo': 'integer',
            'capo': 'integer',
            'difficulty': 'character varying',
            'duration': 'integer',
            'language': 'character varying',
            'lyrics': 'text',
            'chords_used': 'ARRAY',
            'is_deleted': 'boolean',
            'is_archived': 'boolean',
            'deleted_at': 'timestamp with time zone',
            'archived_at': 'timestamp with time zone',
            'view_count': 'integer',
            'favorite_count': 'integer',
            'last_accessed': 'timestamp with time zone'
        }
        
        for col_name, expected_type in expected_columns.items():
            self.assertIn(col_name, columns, f"Column {col_name} missing from songs table")
            actual_type = columns[col_name]['data_type']
            self.assertIn(expected_type.lower(), actual_type.lower(), 
                         f"Column {col_name} has wrong type: {actual_type} vs {expected_type}")
    
    def test_tags_table_exists(self):
        """Test that tags table exists with correct structure."""
        self.cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tags' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row['column_name'] for row in self.cursor.fetchall()}
        expected_columns = {'id', 'name', 'description', 'color', 'is_system', 
                          'created_by', 'created_at', 'updated_at'}
        
        self.assertEqual(expected_columns, columns, 
                        "Tags table missing expected columns")
    
    def test_song_tags_table_exists(self):
        """Test that song_tags junction table exists."""
        self.cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'song_tags' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row['column_name'] for row in self.cursor.fetchall()}
        expected_columns = {'id', 'song_id', 'tag_id', 'created_at'}
        
        self.assertEqual(expected_columns, columns,
                        "Song_tags table missing expected columns")
    
    def test_song_versions_table_enhanced(self):
        """Test that song_versions table has enhanced columns."""
        self.cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'song_versions' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row['column_name'] for row in self.cursor.fetchall()}
        expected_columns = {'id', 'song_id', 'version_number', 'title', 'artist',
                          'content', 'lyrics', 'chords_used', 'created_by',
                          'version_note', 'is_major_version', 'created_at'}
        
        self.assertEqual(expected_columns, columns,
                        "Song_versions table missing expected columns")
    
    def test_user_favorites_table_exists(self):
        """Test that user_favorites table exists."""
        self.cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'user_favorites' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row['column_name'] for row in self.cursor.fetchall()}
        expected_columns = {'id', 'user_id', 'song_id', 'created_at'}
        
        self.assertEqual(expected_columns, columns,
                        "User_favorites table missing expected columns")
    
    def test_categories_table_exists(self):
        """Test that categories table exists with hierarchical support."""
        self.cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'categories' AND table_schema = 'public'
            ORDER BY column_name
        """)
        
        columns = {row['column_name'] for row in self.cursor.fetchall()}
        expected_columns = {'id', 'name', 'description', 'parent_id', 'is_system',
                          'created_at', 'updated_at'}
        
        self.assertEqual(expected_columns, columns,
                        "Categories table missing expected columns")

class TestConstraints(DatabaseMigrationTest):
    """Test database constraints and validations."""
    
    def test_difficulty_constraint(self):
        """Test that difficulty field enforces valid values."""
        # Create a test user and song first
        user_id = str(uuid.uuid4())
        song_id = str(uuid.uuid4())
        
        self.cursor.execute("""
            INSERT INTO users (id, email, password_hash)
            VALUES (%s, %s, %s)
        """, (user_id, 'test@example.com', 'hashed_password'))
        
        # Valid difficulty should work
        self.cursor.execute("""
            INSERT INTO songs (id, title, content, user_id, difficulty)
            VALUES (%s, %s, %s, %s, %s)
        """, (song_id, 'Test Song', 'Test content', user_id, 'beginner'))
        
        # Invalid difficulty should fail
        with self.assertRaises(psycopg2.IntegrityError):
            self.cursor.execute("""
                INSERT INTO songs (id, title, content, user_id, difficulty)
                VALUES (%s, %s, %s, %s, %s)
            """, (str(uuid.uuid4()), 'Test Song 2', 'Test content', user_id, 'invalid'))
    
    def test_tempo_range_constraint(self):
        """Test that tempo field enforces valid range."""
        user_id = str(uuid.uuid4())
        song_id = str(uuid.uuid4())
        
        self.cursor.execute("""
            INSERT INTO users (id, email, password_hash)
            VALUES (%s, %s, %s)
        """, (user_id, 'test2@example.com', 'hashed_password'))
        
        # Valid tempo should work
        self.cursor.execute("""
            INSERT INTO songs (id, title, content, user_id, tempo)
            VALUES (%s, %s, %s, %s, %s)
        """, (song_id, 'Test Song', 'Test content', user_id, 120))
        
        # Invalid tempo (too low) should fail
        with self.assertRaises(psycopg2.IntegrityError):
            self.cursor.execute("""
                INSERT INTO songs (id, title, content, user_id, tempo)
                VALUES (%s, %s, %s, %s, %s)
            """, (str(uuid.uuid4()), 'Test Song 2', 'Test content', user_id, 30))
    
    def test_capo_range_constraint(self):
        """Test that capo field enforces valid range."""
        user_id = str(uuid.uuid4())
        song_id = str(uuid.uuid4())
        
        self.cursor.execute("""
            INSERT INTO users (id, email, password_hash)
            VALUES (%s, %s, %s)
        """, (user_id, 'test3@example.com', 'hashed_password'))
        
        # Valid capo should work
        self.cursor.execute("""
            INSERT INTO songs (id, title, content, user_id, capo)
            VALUES (%s, %s, %s, %s, %s)
        """, (song_id, 'Test Song', 'Test content', user_id, 5))
        
        # Invalid capo (too high) should fail
        with self.assertRaises(psycopg2.IntegrityError):
            self.cursor.execute("""
                INSERT INTO songs (id, title, content, user_id, capo)
                VALUES (%s, %s, %s, %s, %s)
            """, (str(uuid.uuid4()), 'Test Song 2', 'Test content', user_id, 15))
    
    def test_unique_constraints(self):
        """Test unique constraints on junction tables."""
        user_id = str(uuid.uuid4())
        song_id = str(uuid.uuid4())
        tag_id = str(uuid.uuid4())
        
        # Create prerequisites
        self.cursor.execute("""
            INSERT INTO users (id, email, password_hash)
            VALUES (%s, %s, %s)
        """, (user_id, 'test4@example.com', 'hashed_password'))
        
        self.cursor.execute("""
            INSERT INTO songs (id, title, content, user_id)
            VALUES (%s, %s, %s, %s)
        """, (song_id, 'Test Song', 'Test content', user_id))
        
        self.cursor.execute("""
            INSERT INTO tags (id, name)
            VALUES (%s, %s)
        """, (tag_id, 'Test Tag'))
        
        # First insert should work
        self.cursor.execute("""
            INSERT INTO song_tags (song_id, tag_id)
            VALUES (%s, %s)
        """, (song_id, tag_id))
        
        # Duplicate should fail
        with self.assertRaises(psycopg2.IntegrityError):
            self.cursor.execute("""
                INSERT INTO song_tags (song_id, tag_id)
                VALUES (%s, %s)
            """, (song_id, tag_id))

class TestIndexes(DatabaseMigrationTest):
    """Test that performance indexes exist."""
    
    def test_basic_indexes_exist(self):
        """Test that basic performance indexes exist."""
        self.cursor.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'songs' AND schemaname = 'public'
        """)
        
        indexes = {row['indexname'] for row in self.cursor.fetchall()}
        
        expected_indexes = {
            'idx_songs_genre',
            'idx_songs_key',
            'idx_songs_tempo',
            'idx_songs_difficulty',
            'idx_songs_language',
            'idx_songs_deleted',
            'idx_songs_archived',
            'idx_songs_view_count'
        }
        
        for index in expected_indexes:
            self.assertIn(index, indexes, f"Index {index} missing from songs table")
    
    def test_full_text_indexes_exist(self):
        """Test that full-text search indexes exist."""
        self.cursor.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'songs' AND schemaname = 'public'
            AND indexname LIKE '%_trgm'
        """)
        
        trgm_indexes = {row['indexname'] for row in self.cursor.fetchall()}
        
        expected_trgm_indexes = {
            'idx_songs_title_trgm',
            'idx_songs_artist_trgm',
            'idx_songs_content_trgm',
            'idx_songs_lyrics_trgm'
        }
        
        for index in expected_trgm_indexes:
            self.assertIn(index, trgm_indexes, f"Full-text index {index} missing")
    
    def test_gin_indexes_exist(self):
        """Test that GIN indexes for arrays exist."""
        self.cursor.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'songs' AND schemaname = 'public'
            AND indexname LIKE '%_gin'
        """)
        
        gin_indexes = {row['indexname'] for row in self.cursor.fetchall()}
        expected_gin_indexes = {'idx_songs_chords_gin'}
        
        for index in expected_gin_indexes:
            self.assertIn(index, gin_indexes, f"GIN index {index} missing")

class TestFunctions(DatabaseMigrationTest):
    """Test custom database functions."""
    
    def test_extract_chords_function(self):
        """Test chord extraction function."""
        chordpro_content = """
        [C]Test song with [G]chords and [Am]more [F]chords
        Another [Dm]line with [C/G]slash chords
        """
        
        self.cursor.execute("""
            SELECT extract_chords_from_content(%s) as chords
        """, (chordpro_content,))
        
        result = self.cursor.fetchone()
        chords = result['chords']
        
        expected_chords = ['Am', 'C', 'C/G', 'Dm', 'F', 'G']
        self.assertEqual(sorted(chords), expected_chords,
                        "Chord extraction function not working correctly")
    
    def test_extract_lyrics_function(self):
        """Test lyrics extraction function."""
        chordpro_content = """
        {title: Test Song}
        {artist: Test Artist}
        
        [C]This is a [G]test line
        Another line [Am]without much [F]formatting
        
        {comment: This is a comment}
        [C]Final [G]line
        """
        
        self.cursor.execute("""
            SELECT extract_lyrics_from_content(%s) as lyrics
        """, (chordpro_content,))
        
        result = self.cursor.fetchone()
        lyrics = result['lyrics'].strip()
        
        # Should extract lyrics without chords and directives
        self.assertIn('This is a test line', lyrics)
        self.assertIn('Another line without much formatting', lyrics)
        self.assertIn('Final line', lyrics)
        self.assertNotIn('[C]', lyrics)
        self.assertNotIn('{title:', lyrics)
        self.assertNotIn('{comment:', lyrics)
    
    def test_search_songs_function(self):
        """Test comprehensive search function."""
        # This test requires sample data, so we'll just test that the function exists
        self.cursor.execute("""
            SELECT routine_name FROM information_schema.routines
            WHERE routine_name = 'search_songs' AND routine_schema = 'public'
        """)
        
        result = self.cursor.fetchone()
        self.assertIsNotNone(result, "search_songs function does not exist")

class TestTriggers(DatabaseMigrationTest):
    """Test database triggers."""
    
    def test_automatic_chord_extraction_trigger(self):
        """Test that chords are automatically extracted when song is created."""
        user_id = str(uuid.uuid4())
        song_id = str(uuid.uuid4())
        
        # Create user
        self.cursor.execute("""
            INSERT INTO users (id, email, password_hash)
            VALUES (%s, %s, %s)
        """, (user_id, 'trigger_test@example.com', 'hashed_password'))
        
        # Create song with ChordPro content
        chordpro_content = "[C]Test [G]song with [Am]chords [F]extracted"
        
        self.cursor.execute("""
            INSERT INTO songs (id, title, content, user_id)
            VALUES (%s, %s, %s, %s)
            RETURNING chords_used, lyrics
        """, (song_id, 'Trigger Test Song', chordpro_content, user_id))
        
        result = self.cursor.fetchone()
        
        # Check that chords were extracted
        self.assertIsNotNone(result['chords_used'])
        self.assertIn('C', result['chords_used'])
        self.assertIn('G', result['chords_used'])
        self.assertIn('Am', result['chords_used'])
        self.assertIn('F', result['chords_used'])
        
        # Check that lyrics were extracted
        self.assertIsNotNone(result['lyrics'])
        self.assertIn('Test song with chords extracted', result['lyrics'])
        self.assertNotIn('[C]', result['lyrics'])
    
    def test_favorite_count_trigger(self):
        """Test that favorite count is automatically updated."""
        user_id = str(uuid.uuid4())
        song_id = str(uuid.uuid4())
        
        # Create user and song
        self.cursor.execute("""
            INSERT INTO users (id, email, password_hash)
            VALUES (%s, %s, %s)
        """, (user_id, 'favorite_test@example.com', 'hashed_password'))
        
        self.cursor.execute("""
            INSERT INTO songs (id, title, content, user_id)
            VALUES (%s, %s, %s, %s)
        """, (song_id, 'Favorite Test Song', 'Test content', user_id))
        
        # Check initial favorite count
        self.cursor.execute("""
            SELECT favorite_count FROM songs WHERE id = %s
        """, (song_id,))
        
        initial_count = self.cursor.fetchone()['favorite_count']
        self.assertEqual(initial_count, 0)
        
        # Add a favorite
        self.cursor.execute("""
            INSERT INTO user_favorites (user_id, song_id)
            VALUES (%s, %s)
        """, (user_id, song_id))
        
        # Check that count increased
        self.cursor.execute("""
            SELECT favorite_count FROM songs WHERE id = %s
        """, (song_id,))
        
        new_count = self.cursor.fetchone()['favorite_count']
        self.assertEqual(new_count, 1)
        
        # Remove the favorite
        self.cursor.execute("""
            DELETE FROM user_favorites WHERE user_id = %s AND song_id = %s
        """, (user_id, song_id))
        
        # Check that count decreased
        self.cursor.execute("""
            SELECT favorite_count FROM songs WHERE id = %s
        """, (song_id,))
        
        final_count = self.cursor.fetchone()['favorite_count']
        self.assertEqual(final_count, 0)

class TestDataIntegrity(DatabaseMigrationTest):
    """Test data integrity and relationships."""
    
    def test_cascade_deletions(self):
        """Test that related data is properly deleted when parent is deleted."""
        user_id = str(uuid.uuid4())
        song_id = str(uuid.uuid4())
        tag_id = str(uuid.uuid4())
        
        # Create test data
        self.cursor.execute("""
            INSERT INTO users (id, email, password_hash)
            VALUES (%s, %s, %s)
        """, (user_id, 'cascade_test@example.com', 'hashed_password'))
        
        self.cursor.execute("""
            INSERT INTO songs (id, title, content, user_id)
            VALUES (%s, %s, %s, %s)
        """, (song_id, 'Cascade Test Song', 'Test content', user_id))
        
        self.cursor.execute("""
            INSERT INTO tags (id, name)
            VALUES (%s, %s)
        """, (tag_id, 'Test Tag'))
        
        self.cursor.execute("""
            INSERT INTO song_tags (song_id, tag_id)
            VALUES (%s, %s)
        """, (song_id, tag_id))
        
        self.cursor.execute("""
            INSERT INTO user_favorites (user_id, song_id)
            VALUES (%s, %s)
        """, (user_id, song_id))
        
        # Verify data exists
        self.cursor.execute("""
            SELECT COUNT(*) FROM song_tags WHERE song_id = %s
        """, (song_id,))
        self.assertEqual(self.cursor.fetchone()['count'], 1)
        
        self.cursor.execute("""
            SELECT COUNT(*) FROM user_favorites WHERE song_id = %s
        """, (song_id,))
        self.assertEqual(self.cursor.fetchone()['count'], 1)
        
        # Delete the song
        self.cursor.execute("""
            DELETE FROM songs WHERE id = %s
        """, (song_id,))
        
        # Verify related data was deleted
        self.cursor.execute("""
            SELECT COUNT(*) FROM song_tags WHERE song_id = %s
        """, (song_id,))
        self.assertEqual(self.cursor.fetchone()['count'], 0)
        
        self.cursor.execute("""
            SELECT COUNT(*) FROM user_favorites WHERE song_id = %s
        """, (song_id,))
        self.assertEqual(self.cursor.fetchone()['count'], 0)

class TestRowLevelSecurity(DatabaseMigrationTest):
    """Test Row Level Security policies."""
    
    def test_rls_enabled(self):
        """Test that RLS is enabled on all tables."""
        tables_with_rls = [
            'users', 'songs', 'collections', 'collection_songs',
            'tags', 'song_tags', 'song_versions', 'user_favorites',
            'categories', 'song_categories'
        ]
        
        for table in tables_with_rls:
            self.cursor.execute("""
                SELECT relrowsecurity FROM pg_class 
                WHERE relname = %s AND relnamespace = (
                    SELECT oid FROM pg_namespace WHERE nspname = 'public'
                )
            """, (table,))
            
            result = self.cursor.fetchone()
            self.assertIsNotNone(result, f"Table {table} not found")
            self.assertTrue(result['relrowsecurity'], 
                          f"RLS not enabled on table {table}")

class TestSampleData(DatabaseMigrationTest):
    """Test that sample/default data was inserted correctly."""
    
    def test_system_tags_inserted(self):
        """Test that system tags were inserted."""
        self.cursor.execute("""
            SELECT name FROM tags WHERE is_system = TRUE
            ORDER BY name
        """)
        
        system_tags = [row['name'] for row in self.cursor.fetchall()]
        
        expected_tags = ['Blues', 'Christmas', 'Classical', 'Country', 'Folk', 
                        'Gospel', 'Jazz', 'Pop', 'Rock', 'Worship']
        
        for tag in expected_tags:
            self.assertIn(tag, system_tags, f"System tag {tag} not found")
    
    def test_system_categories_inserted(self):
        """Test that system categories were inserted."""
        self.cursor.execute("""
            SELECT name FROM categories WHERE is_system = TRUE
            ORDER BY name
        """)
        
        system_categories = [row['name'] for row in self.cursor.fetchall()]
        
        expected_categories = ['2000s', '2010s', '2020s', 'Beginner Friendly',
                             'Birthday', 'Decades', 'Genres', 'Guitar', 
                             'Instruments', 'Occasions', 'Piano', 'Skill Level',
                             'Wedding']
        
        for category in expected_categories:
            self.assertIn(category, system_categories, 
                         f"System category {category} not found")

class TestViews(DatabaseMigrationTest):
    """Test database views."""
    
    def test_active_songs_view_exists(self):
        """Test that active_songs view exists and works."""
        self.cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.views
                WHERE table_name = 'active_songs' AND table_schema = 'public'
            )
        """)
        
        exists = self.cursor.fetchone()['exists']
        self.assertTrue(exists, "active_songs view does not exist")
        
        # Test that view can be queried
        self.cursor.execute("""
            SELECT COUNT(*) FROM active_songs LIMIT 1
        """)
        
        result = self.cursor.fetchone()
        self.assertIsNotNone(result, "Cannot query active_songs view")

def run_tests():
    """Run all database migration tests."""
    print("Running database migration tests...")
    print("=" * 60)
    
    # Test connection first
    try:
        conn = psycopg2.connect(**TEST_DB_CONFIG)
        conn.close()
        print(f"✅ Connected to test database: {TEST_DB_CONFIG['database']}")
    except Exception as e:
        print(f"❌ Cannot connect to test database: {e}")
        print("Make sure PostgreSQL is running and the test database exists.")
        print("You can create it with: CREATE DATABASE chordme_test;")
        return False
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    test_classes = [
        TestSchemaStructure,
        TestConstraints,
        TestIndexes,
        TestFunctions,
        TestTriggers,
        TestDataIntegrity,
        TestRowLevelSecurity,
        TestSampleData,
        TestViews
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 60)
    if result.wasSuccessful():
        print("✅ All database migration tests passed!")
        return True
    else:
        print(f"❌ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        return False

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)