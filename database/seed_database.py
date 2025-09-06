#!/usr/bin/env python3
"""
Database seeding script for ChordMe application.
Creates sample data for testing and demonstration purposes.
"""

import os
import sys
import random
from datetime import datetime, timedelta

# Add the parent directory to the path to import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    import uuid
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Sample song data with ChordPro format
SAMPLE_SONGS = [
    {
        'title': 'Amazing Grace',
        'artist': 'Traditional',
        'genre': 'Gospel',
        'song_key': 'G',
        'tempo': 90,
        'difficulty': 'beginner',
        'language': 'en',
        'content': '''{title: Amazing Grace}
{artist: Traditional}
{key: G}
{tempo: 90}

{start_of_verse}
[G]Amazing [G/B]grace how [C]sweet the [G]sound
That [G]saved a [D]wretch like [G]me
I [G]once was [G/B]lost but [C]now am [G]found
Was [G]blind but [D]now I [G]see
{end_of_verse}

{start_of_verse}
'Twas [G]grace that [G/B]taught my [C]heart to [G]fear
And [G]grace my [D]fears re-[G]lieved
How [G]precious [G/B]did that [C]grace ap-[G]pear
The [G]hour I [D]first be-[G]lieved
{end_of_verse}''',
        'tags': ['Gospel', 'Worship'],
        'categories': ['Beginner Friendly', 'Guitar']
    },
    {
        'title': 'House of the Rising Sun',
        'artist': 'The Animals',
        'genre': 'Rock',
        'song_key': 'Am',
        'tempo': 120,
        'difficulty': 'intermediate',
        'language': 'en',
        'content': '''{title: House of the Rising Sun}
{artist: The Animals}
{key: Am}
{tempo: 120}

{start_of_verse}
There [Am]is a [C]house in [D]New Or-[F]leans
They [Am]call the [C]Rising [E]Sun
And it's [Am]been the [C]ruin of [D]many a poor [F]boy
And [Am]God, I [E]know I'm [Am]one
{end_of_verse}

{start_of_verse}
My [Am]mother [C]was a [D]tailor [F]
She [Am]sewed my [C]new blue [E]jeans
My [Am]father [C]was a [D]gambling [F]man
[Am]Down in [E]New Or-[Am]leans
{end_of_verse}''',
        'tags': ['Rock', 'Blues'],
        'categories': ['Guitar', '2010s']
    },
    {
        'title': 'Wonderwall',
        'artist': 'Oasis',
        'genre': 'Rock',
        'song_key': 'Em',
        'tempo': 87,
        'difficulty': 'intermediate',
        'language': 'en',
        'content': '''{title: Wonderwall}
{artist: Oasis}
{key: Em}
{tempo: 87}

{start_of_verse}
[Em7]Today is [G]gonna be the day that they're [D]gonna throw it back to [C]you
[Em7]By now you [G]should've somehow real-[D]ized what you gotta [C]do
[Em7]I don't believe that [G]anybody [D]feels the way I [C]do about you [D]now
{end_of_verse}

{start_of_chorus}
[C]And all the roads we [D]have to walk are [Em7]winding
[C]And all the lights that [D]lead us there are [Em7]blinding
[C]There are many [D]things that I would [G]like to [D/F#]say to [Em7]you
But I don't know [A]how
{end_of_chorus}''',
        'tags': ['Rock', 'Pop'],
        'categories': ['Guitar', '2000s']
    },
    {
        'title': 'Happy Birthday',
        'artist': 'Traditional',
        'genre': 'Folk',
        'song_key': 'F',
        'tempo': 120,
        'difficulty': 'beginner',
        'language': 'en',
        'content': '''{title: Happy Birthday}
{artist: Traditional}
{key: F}
{tempo: 120}

{start_of_verse}
[F]Happy birthday to [Bb]you
[F]Happy birthday to [C]you
[F]Happy birth-[F7]day dear [Bb]{name}
[F]Happy birth-[C]day to [F]you
{end_of_verse}''',
        'tags': ['Folk'],
        'categories': ['Birthday', 'Beginner Friendly']
    },
    {
        'title': 'Hallelujah',
        'artist': 'Leonard Cohen',
        'genre': 'Folk',
        'song_key': 'C',
        'tempo': 60,
        'difficulty': 'intermediate',
        'language': 'en',
        'content': '''{title: Hallelujah}
{artist: Leonard Cohen}
{key: C}
{tempo: 60}

{start_of_verse}
[C]Now I've [Am]heard there was a [C]secret chord
That [Am]David played, and it [F]pleased the Lord
But [G]you don't really [C]care for music, [G]do you?
[C]It goes like this: The [F]fourth, the [G]fifth
The [Am]minor fall, the [F]major lift
The [G]baffled king com-[Em]posing Halle-[Am]lujah
{end_of_verse}

{start_of_chorus}
Halle-[F]lujah, Halle-[Am]lujah
Halle-[F]lujah, Halle-[C]lu-[G]jah-[C]ah
{end_of_chorus}''',
        'tags': ['Folk', 'Worship'],
        'categories': ['Guitar', 'Piano']
    },
    {
        'title': 'Jingle Bells',
        'artist': 'Traditional',
        'genre': 'Folk',
        'song_key': 'G',
        'tempo': 120,
        'difficulty': 'beginner',
        'language': 'en',
        'content': '''{title: Jingle Bells}
{artist: Traditional}
{key: G}
{tempo: 120}

{start_of_verse}
[G]Dashing through the snow
In a [C]one-horse open [G]sleigh
O'er the fields we [D]go
[D7]Laughing all the [G]way
[G]Bells on bobtails ring
Making [C]spirits [G]bright
What fun it is to [D]ride and sing
A [D7]sleighing song to-[G]night!
{end_of_verse}

{start_of_chorus}
[G]Jingle bells, jingle bells
Jingle [D]all the way!
[C]Oh, what fun it [G]is to ride
In a [A7]one-horse open [D]sleigh!
[G]Jingle bells, jingle bells
Jingle [D]all the way!
[C]Oh, what fun it [G]is to ride
In a [D7]one-horse open [G]sleigh!
{end_of_chorus}''',
        'tags': ['Christmas', 'Folk'],
        'categories': ['Beginner Friendly', 'Guitar']
    }
]

class DatabaseSeeder:
    def __init__(self, connection_string=None):
        self.connection_string = connection_string or self._get_default_connection()
        self.conn = None
        
    def _get_default_connection(self):
        """Get default connection string from environment or use local defaults."""
        return os.getenv('DATABASE_URL', 
                        'postgresql://postgres:password@localhost:5432/chordme_dev')
    
    def connect(self):
        """Connect to the database."""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            self.conn.autocommit = False
            print(f"Connected to database successfully")
            return True
        except Exception as e:
            print(f"Error connecting to database: {e}")
            return False
    
    def disconnect(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            print("Database connection closed")
    
    def seed_users(self, count=5):
        """Create sample users."""
        print(f"Creating {count} sample users...")
        
        sample_users = [
            ('john@example.com', 'John Musician', 'Professional musician and songwriter'),
            ('mary@example.com', 'Mary Singer', 'Church choir director and worship leader'),
            ('bob@example.com', 'Bob Guitarist', 'Rock band lead guitarist'),
            ('alice@example.com', 'Alice Folk', 'Folk music enthusiast'),
            ('charlie@example.com', 'Charlie Jazz', 'Jazz pianist and composer')
        ]
        
        created_users = []
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            for i, (email, display_name, bio) in enumerate(sample_users[:count]):
                try:
                    # Create user with bcrypt hashed password
                    import bcrypt
                    password = 'password123'
                    password_hash = bcrypt.hashpw(password.encode('utf-8'), 
                                                bcrypt.gensalt()).decode('utf-8')
                    
                    user_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO users (id, email, password_hash, display_name, bio, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (email) DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            bio = EXCLUDED.bio,
                            updated_at = EXCLUDED.updated_at
                        RETURNING id, email
                    """, (user_id, email, password_hash, display_name, bio, 
                         datetime.now(), datetime.now()))
                    
                    result = cur.fetchone()
                    created_users.append(result)
                    print(f"  Created user: {email}")
                    
                except Exception as e:
                    print(f"  Error creating user {email}: {e}")
                    
        self.conn.commit()
        print(f"Created {len(created_users)} users")
        return created_users
    
    def get_tag_ids(self, tag_names):
        """Get tag IDs by names."""
        if not tag_names:
            return []
            
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name FROM tags WHERE name = ANY(%s)
            """, (tag_names,))
            
            tag_map = {row['name']: row['id'] for row in cur.fetchall()}
            return [tag_map[name] for name in tag_names if name in tag_map]
    
    def get_category_ids(self, category_names):
        """Get category IDs by names."""
        if not category_names:
            return []
            
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name FROM categories WHERE name = ANY(%s)
            """, (category_names,))
            
            cat_map = {row['name']: row['id'] for row in cur.fetchall()}
            return [cat_map[name] for name in category_names if name in cat_map]
    
    def seed_songs(self, users):
        """Create sample songs with the provided users."""
        print(f"Creating {len(SAMPLE_SONGS)} sample songs...")
        
        created_songs = []
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            for i, song_data in enumerate(SAMPLE_SONGS):
                try:
                    # Assign song to a random user
                    user = random.choice(users)
                    song_id = str(uuid.uuid4())
                    
                    # Insert song
                    cur.execute("""
                        INSERT INTO songs (
                            id, title, artist, genre, song_key, tempo, difficulty, 
                            language, content, user_id, is_public, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, title
                    """, (
                        song_id, song_data['title'], song_data['artist'],
                        song_data['genre'], song_data['song_key'], song_data['tempo'],
                        song_data['difficulty'], song_data['language'], song_data['content'],
                        user['id'], True,  # Make all sample songs public
                        datetime.now(), datetime.now()
                    ))
                    
                    result = cur.fetchone()
                    created_songs.append(result)
                    
                    # Add tags
                    tag_ids = self.get_tag_ids(song_data.get('tags', []))
                    for tag_id in tag_ids:
                        cur.execute("""
                            INSERT INTO song_tags (song_id, tag_id, created_at)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (song_id, tag_id) DO NOTHING
                        """, (song_id, tag_id, datetime.now()))
                    
                    # Add categories
                    category_ids = self.get_category_ids(song_data.get('categories', []))
                    for category_id in category_ids:
                        cur.execute("""
                            INSERT INTO song_categories (song_id, category_id, created_at)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (song_id, category_id) DO NOTHING
                        """, (song_id, category_id, datetime.now()))
                    
                    print(f"  Created song: {song_data['title']} by {song_data['artist']}")
                    
                except Exception as e:
                    print(f"  Error creating song {song_data['title']}: {e}")
                    
        self.conn.commit()
        print(f"Created {len(created_songs)} songs")
        return created_songs
    
    def seed_favorites(self, users, songs):
        """Create some random favorites."""
        print("Creating sample favorites...")
        
        favorites_count = 0
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Each user favorites 2-4 random songs
            for user in users:
                num_favorites = random.randint(2, 4)
                favorite_songs = random.sample(songs, min(num_favorites, len(songs)))
                
                for song in favorite_songs:
                    try:
                        cur.execute("""
                            INSERT INTO user_favorites (user_id, song_id, created_at)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (user_id, song_id) DO NOTHING
                        """, (user['id'], song['id'], datetime.now()))
                        
                        favorites_count += 1
                        
                    except Exception as e:
                        print(f"  Error creating favorite: {e}")
        
        self.conn.commit()
        print(f"Created {favorites_count} favorites")
    
    def seed_collections(self, users, songs):
        """Create sample collections."""
        print("Creating sample collections...")
        
        collection_names = [
            ('My Worship Songs', 'Collection of worship and gospel songs'),
            ('Rock Classics', 'Classic rock songs for the band'),
            ('Easy Beginner Songs', 'Simple songs for learning guitar'),
            ('Christmas Favorites', 'Holiday songs for the season'),
            ('Wedding Playlist', 'Perfect songs for weddings')
        ]
        
        created_collections = []
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            for user in users[:3]:  # Only create collections for first 3 users
                for name, description in random.sample(collection_names, 2):
                    try:
                        collection_id = str(uuid.uuid4())
                        
                        # Create collection
                        cur.execute("""
                            INSERT INTO collections (id, name, description, user_id, is_public, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            RETURNING id, name
                        """, (collection_id, name, description, user['id'], True, 
                             datetime.now(), datetime.now()))
                        
                        result = cur.fetchone()
                        created_collections.append(result)
                        
                        # Add 2-4 random songs to collection
                        num_songs = random.randint(2, 4)
                        collection_songs = random.sample(songs, min(num_songs, len(songs)))
                        
                        for i, song in enumerate(collection_songs):
                            cur.execute("""
                                INSERT INTO collection_songs (collection_id, song_id, sort_order, created_at)
                                VALUES (%s, %s, %s, %s)
                                ON CONFLICT (collection_id, song_id) DO NOTHING
                            """, (collection_id, song['id'], i, datetime.now()))
                        
                        print(f"  Created collection: {name} with {len(collection_songs)} songs")
                        
                    except Exception as e:
                        print(f"  Error creating collection {name}: {e}")
        
        self.conn.commit()
        print(f"Created {len(created_collections)} collections")
        return created_collections
    
    def update_statistics(self, songs):
        """Update view counts and other statistics."""
        print("Updating song statistics...")
        
        with self.conn.cursor() as cur:
            for song in songs:
                # Random view count between 10 and 1000
                view_count = random.randint(10, 1000)
                
                # Random last accessed within the last 30 days
                days_ago = random.randint(1, 30)
                last_accessed = datetime.now() - timedelta(days=days_ago)
                
                cur.execute("""
                    UPDATE songs 
                    SET view_count = %s, last_accessed = %s
                    WHERE id = %s
                """, (view_count, last_accessed, song['id']))
        
        self.conn.commit()
        print("Updated song statistics")
    
    def seed_all(self):
        """Run the complete seeding process."""
        print("Starting database seeding process...")
        
        if not self.connect():
            return False
        
        try:
            # Create users
            users = self.seed_users(5)
            
            # Create songs
            songs = self.seed_songs(users)
            
            # Create favorites
            self.seed_favorites(users, songs)
            
            # Create collections
            collections = self.seed_collections(users, songs)
            
            # Update statistics
            self.update_statistics(songs)
            
            print("\n✅ Database seeding completed successfully!")
            print(f"Created: {len(users)} users, {len(songs)} songs, {len(collections)} collections")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {e}")
            self.conn.rollback()
            return False
            
        finally:
            self.disconnect()

def main():
    """Main function to run the seeding script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Seed ChordMe database with sample data')
    parser.add_argument('--connection', '-c', 
                       help='Database connection string (default: from DATABASE_URL env var)')
    parser.add_argument('--force', '-f', action='store_true',
                       help='Force seeding even if data exists')
    
    args = parser.parse_args()
    
    seeder = DatabaseSeeder(args.connection)
    
    if seeder.seed_all():
        print("\n🎵 Sample data created! You can now:")
        print("  - Browse songs by genre, key, or difficulty")
        print("  - Search for songs using full-text search")
        print("  - Test the tags and categories system")
        print("  - Try the user favorites functionality")
        print("  - Explore song collections")
        sys.exit(0)
    else:
        print("\n❌ Seeding failed. Check the error messages above.")
        sys.exit(1)

if __name__ == '__main__':
    main()