-- ChordMe Database Migration Script for Supabase
-- Version: 001_initial_schema
-- Description: Create initial database schema for ChordMe application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    content TEXT NOT NULL, -- ChordPro format content
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Song collections/playlists table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for songs in collections
CREATE TABLE IF NOT EXISTS collection_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, song_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_public ON songs(is_public);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public);
CREATE INDEX IF NOT EXISTS idx_collection_songs_collection_id ON collection_songs(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_songs_song_id ON collection_songs(song_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_songs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());

-- Songs policies
CREATE POLICY "Users can view own songs" ON songs FOR SELECT USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "Users can insert own songs" ON songs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own songs" ON songs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own songs" ON songs FOR DELETE USING (user_id = auth.uid());

-- Collections policies
CREATE POLICY "Users can view own collections" ON collections FOR SELECT USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "Users can insert own collections" ON collections FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own collections" ON collections FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own collections" ON collections FOR DELETE USING (user_id = auth.uid());

-- Collection songs policies
CREATE POLICY "Users can view collection songs if they own collection" ON collection_songs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_songs.collection_id AND (collections.user_id = auth.uid() OR collections.is_public = true)));
CREATE POLICY "Users can modify collection songs if they own collection" ON collection_songs FOR ALL 
    USING (EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_songs.collection_id AND collections.user_id = auth.uid()));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();