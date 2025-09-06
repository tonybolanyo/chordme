-- ChordMe Database Migration Script
-- Version: 003_enhance_song_schema
-- Description: Enhance song schema with comprehensive metadata, tags, versioning, and search capabilities

-- Enable additional extensions for full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- Remove accents for better search

-- Add metadata fields to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS genre VARCHAR(100);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_key VARCHAR(10);  -- Musical key (C, Am, etc.)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tempo INTEGER;         -- BPM
ALTER TABLE songs ADD COLUMN IF NOT EXISTS capo INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium'; -- beginner, intermediate, advanced
ALTER TABLE songs ADD COLUMN IF NOT EXISTS duration INTEGER;      -- Duration in seconds
ALTER TABLE songs ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en'; -- ISO language code
ALTER TABLE songs ADD COLUMN IF NOT EXISTS lyrics TEXT;           -- Extracted lyrics for search
ALTER TABLE songs ADD COLUMN IF NOT EXISTS chords_used TEXT[];    -- Array of chords used in song

-- Soft delete and archival system
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Metadata for search and organization
ALTER TABLE songs ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE;

-- Add constraints for enum-like fields
ALTER TABLE songs ADD CONSTRAINT chk_difficulty 
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert'));
ALTER TABLE songs ADD CONSTRAINT chk_tempo_range 
    CHECK (tempo IS NULL OR (tempo >= 40 AND tempo <= 300));
ALTER TABLE songs ADD CONSTRAINT chk_capo_range 
    CHECK (capo >= 0 AND capo <= 12);
ALTER TABLE songs ADD CONSTRAINT chk_duration_positive 
    CHECK (duration IS NULL OR duration > 0);

-- Tags system for categorization
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    is_system BOOLEAN DEFAULT FALSE, -- System vs user-created tags
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Song-tags many-to-many relationship
CREATE TABLE IF NOT EXISTS song_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, tag_id)
);

-- Song versioning system (enhanced)
CREATE TABLE IF NOT EXISTS song_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    content TEXT NOT NULL,
    lyrics TEXT,
    chords_used TEXT[],
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    version_note TEXT, -- Optional note about what changed
    is_major_version BOOLEAN DEFAULT FALSE, -- Flag for significant changes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, version_number)
);

-- User favorites system
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_id)
);

-- Song categories (broader than tags)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- Hierarchical categories
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Song-categories relationship
CREATE TABLE IF NOT EXISTS song_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, category_id)
);

-- Performance indexes for songs table
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre) WHERE genre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_key ON songs(song_key) WHERE song_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_tempo ON songs(tempo) WHERE tempo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_difficulty ON songs(difficulty);
CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language);
CREATE INDEX IF NOT EXISTS idx_songs_deleted ON songs(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_songs_archived ON songs(is_archived);
CREATE INDEX IF NOT EXISTS idx_songs_view_count ON songs(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_songs_last_accessed ON songs(last_accessed DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_songs_user_active ON songs(user_id, is_deleted, is_archived) 
    WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_songs_public_active ON songs(is_public, is_deleted, is_archived) 
    WHERE is_public = TRUE AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_songs_genre_key ON songs(genre, song_key) 
    WHERE genre IS NOT NULL AND song_key IS NOT NULL;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON songs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_artist_trgm ON songs USING gin(artist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_content_trgm ON songs USING gin(content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_lyrics_trgm ON songs USING gin(lyrics gin_trgm_ops);

-- GIN indexes for array searches
CREATE INDEX IF NOT EXISTS idx_songs_chords_gin ON songs USING gin(chords_used);

-- Indexes for tag system
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tags_system ON tags(is_system);
CREATE INDEX IF NOT EXISTS idx_song_tags_song_id ON song_tags(song_id);
CREATE INDEX IF NOT EXISTS idx_song_tags_tag_id ON song_tags(tag_id);

-- Indexes for versioning
CREATE INDEX IF NOT EXISTS idx_song_versions_song_id ON song_versions(song_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_song_versions_created_by ON song_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_song_versions_major ON song_versions(song_id, is_major_version) 
    WHERE is_major_version = TRUE;

-- Indexes for favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_song_id ON user_favorites(song_id);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_system ON categories(is_system);
CREATE INDEX IF NOT EXISTS idx_song_categories_song_id ON song_categories(song_id);
CREATE INDEX IF NOT EXISTS idx_song_categories_category_id ON song_categories(category_id);

-- Update Row Level Security policies for new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Anyone can view system tags" ON tags FOR SELECT 
    USING (is_system = TRUE);
CREATE POLICY "Users can view own tags" ON tags FOR SELECT 
    USING (created_by = current_setting('jwt.claims.user_id', true)::uuid);
CREATE POLICY "Users can create own tags" ON tags FOR INSERT 
    WITH CHECK (created_by = current_setting('jwt.claims.user_id', true)::uuid);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE 
    USING (created_by = current_setting('jwt.claims.user_id', true)::uuid);

-- RLS Policies for song_tags (inherit from song permissions)
CREATE POLICY "Users can view song tags if they can view song" ON song_tags FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM songs WHERE songs.id = song_tags.song_id 
        AND (songs.user_id = current_setting('jwt.claims.user_id', true)::uuid OR songs.is_public = TRUE)
        AND songs.is_deleted = FALSE
    ));
CREATE POLICY "Users can manage song tags if they can edit song" ON song_tags FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM songs WHERE songs.id = song_tags.song_id 
        AND songs.user_id = current_setting('jwt.claims.user_id', true)::uuid
        AND songs.is_deleted = FALSE
    ));

-- RLS Policies for song_versions (inherit from song permissions)
CREATE POLICY "Users can view song versions if they can view song" ON song_versions FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM songs WHERE songs.id = song_versions.song_id 
        AND (songs.user_id = current_setting('jwt.claims.user_id', true)::uuid OR songs.is_public = TRUE)
        AND songs.is_deleted = FALSE
    ));
CREATE POLICY "Users can create song versions if they can edit song" ON song_versions FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM songs WHERE songs.id = song_versions.song_id 
        AND songs.user_id = current_setting('jwt.claims.user_id', true)::uuid
        AND songs.is_deleted = FALSE
    ));

-- RLS Policies for user_favorites
CREATE POLICY "Users can view own favorites" ON user_favorites FOR SELECT 
    USING (user_id = current_setting('jwt.claims.user_id', true)::uuid);
CREATE POLICY "Users can manage own favorites" ON user_favorites FOR ALL 
    USING (user_id = current_setting('jwt.claims.user_id', true)::uuid);

-- RLS Policies for categories
CREATE POLICY "Anyone can view system categories" ON categories FOR SELECT 
    USING (is_system = TRUE);
CREATE POLICY "Users can view all categories" ON categories FOR SELECT 
    USING (true); -- Categories are generally public for browsing

-- RLS Policies for song_categories (inherit from song permissions)
CREATE POLICY "Users can view song categories if they can view song" ON song_categories FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM songs WHERE songs.id = song_categories.song_id 
        AND (songs.user_id = current_setting('jwt.claims.user_id', true)::uuid OR songs.is_public = TRUE)
        AND songs.is_deleted = FALSE
    ));
CREATE POLICY "Users can manage song categories if they can edit song" ON song_categories FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM songs WHERE songs.id = song_categories.song_id 
        AND songs.user_id = current_setting('jwt.claims.user_id', true)::uuid
        AND songs.is_deleted = FALSE
    ));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update favorite count
CREATE OR REPLACE FUNCTION update_song_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE songs SET favorite_count = favorite_count + 1 WHERE id = NEW.song_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE songs SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = OLD.song_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain favorite count
CREATE TRIGGER update_favorite_count_on_insert
    AFTER INSERT ON user_favorites
    FOR EACH ROW EXECUTE FUNCTION update_song_favorite_count();

CREATE TRIGGER update_favorite_count_on_delete
    AFTER DELETE ON user_favorites
    FOR EACH ROW EXECUTE FUNCTION update_song_favorite_count();

-- Create function to extract chords from content
CREATE OR REPLACE FUNCTION extract_chords_from_content(content_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
    chord_pattern TEXT := '\[([A-G][#b]?(?:maj|min|m|dim|aug|sus|add|[0-9])*(?:\/[A-G][#b]?)?)\]';
    chords TEXT[];
BEGIN
    -- Extract unique chords from ChordPro content
    SELECT ARRAY(
        SELECT DISTINCT match[1]
        FROM regexp_split_to_table(content_text, '\n') AS line,
             regexp_matches(line, chord_pattern, 'g') AS match
        ORDER BY match[1]
    ) INTO chords;
    
    RETURN chords;
END;
$$ LANGUAGE plpgsql;

-- Create function to extract lyrics from ChordPro content
CREATE OR REPLACE FUNCTION extract_lyrics_from_content(content_text TEXT)
RETURNS TEXT AS $$
DECLARE
    lyrics TEXT := '';
    line TEXT;
BEGIN
    -- Remove ChordPro directives and chord annotations
    FOR line IN SELECT unnest(string_to_array(content_text, E'\n'))
    LOOP
        -- Skip directive lines (starting with {)
        IF line !~ '^\s*\{.*\}\s*$' THEN
            -- Remove chord annotations [chord]
            line := regexp_replace(line, '\[([^\]]+)\]', '', 'g');
            -- Clean up extra whitespace
            line := regexp_replace(line, '\s+', ' ', 'g');
            line := trim(line);
            
            -- Add non-empty lines to lyrics
            IF length(line) > 0 THEN
                lyrics := lyrics || line || E'\n';
            END IF;
        END IF;
    END LOOP;
    
    RETURN trim(lyrics);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update extracted data
CREATE OR REPLACE FUNCTION update_song_extracted_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract chords and lyrics when content changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content) THEN
        NEW.chords_used := extract_chords_from_content(NEW.content);
        NEW.lyrics := extract_lyrics_from_content(NEW.content);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to songs table
CREATE TRIGGER update_song_extracted_data_trigger
    BEFORE INSERT OR UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_song_extracted_data();

-- Create view for active songs (non-deleted, non-archived)
CREATE OR REPLACE VIEW active_songs AS
SELECT s.*, 
       u.email as author_email,
       u.display_name as author_display_name,
       array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tag_names,
       array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as category_names
FROM songs s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN song_tags st ON s.id = st.song_id
LEFT JOIN tags t ON st.tag_id = t.id
LEFT JOIN song_categories sc ON s.id = sc.song_id
LEFT JOIN categories c ON sc.category_id = c.id
WHERE s.is_deleted = FALSE AND s.is_archived = FALSE
GROUP BY s.id, u.email, u.display_name;

-- Create comprehensive search function
CREATE OR REPLACE FUNCTION search_songs(
    search_term TEXT DEFAULT NULL,
    search_genre TEXT DEFAULT NULL,
    search_key TEXT DEFAULT NULL,
    search_difficulty TEXT DEFAULT NULL,
    search_language TEXT DEFAULT 'en',
    search_tags TEXT[] DEFAULT NULL,
    search_categories TEXT[] DEFAULT NULL,
    min_tempo INTEGER DEFAULT NULL,
    max_tempo INTEGER DEFAULT NULL,
    user_id_filter UUID DEFAULT NULL,
    include_public BOOLEAN DEFAULT TRUE,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    artist VARCHAR(255),
    genre VARCHAR(100),
    song_key VARCHAR(10),
    tempo INTEGER,
    difficulty VARCHAR(20),
    language VARCHAR(10),
    view_count INTEGER,
    favorite_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        s.id,
        s.title,
        s.artist,
        s.genre,
        s.song_key,
        s.tempo,
        s.difficulty,
        s.language,
        s.view_count,
        s.favorite_count,
        s.created_at,
        CASE 
            WHEN search_term IS NOT NULL THEN
                (COALESCE(similarity(s.title, search_term), 0) * 3 +
                 COALESCE(similarity(s.artist, search_term), 0) * 2 +
                 COALESCE(similarity(s.lyrics, search_term), 0) * 1.5 +
                 COALESCE(similarity(s.content, search_term), 0) * 1)
            ELSE 1.0
        END as relevance_score
    FROM songs s
    LEFT JOIN song_tags st ON s.id = st.song_id
    LEFT JOIN tags t ON st.tag_id = t.id
    LEFT JOIN song_categories sc ON s.id = sc.song_id  
    LEFT JOIN categories cat ON sc.category_id = cat.id
    WHERE 
        s.is_deleted = FALSE 
        AND s.is_archived = FALSE
        AND (user_id_filter IS NULL OR s.user_id = user_id_filter)
        AND (include_public = FALSE OR s.is_public = TRUE OR s.user_id = user_id_filter)
        AND (search_term IS NULL OR 
             s.title ILIKE '%' || search_term || '%' OR
             s.artist ILIKE '%' || search_term || '%' OR
             s.lyrics ILIKE '%' || search_term || '%' OR
             s.content ILIKE '%' || search_term || '%')
        AND (search_genre IS NULL OR s.genre ILIKE '%' || search_genre || '%')
        AND (search_key IS NULL OR s.song_key = search_key)
        AND (search_difficulty IS NULL OR s.difficulty = search_difficulty)
        AND (search_language IS NULL OR s.language = search_language)
        AND (search_tags IS NULL OR t.name = ANY(search_tags))
        AND (search_categories IS NULL OR cat.name = ANY(search_categories))
        AND (min_tempo IS NULL OR s.tempo >= min_tempo)
        AND (max_tempo IS NULL OR s.tempo <= max_tempo)
    ORDER BY 
        relevance_score DESC,
        s.view_count DESC,
        s.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some default system tags
INSERT INTO tags (name, description, is_system, color) VALUES
    ('Rock', 'Rock music genre', TRUE, '#FF6B6B'),
    ('Pop', 'Pop music genre', TRUE, '#4ECDC4'),
    ('Folk', 'Folk music genre', TRUE, '#45B7D1'),
    ('Country', 'Country music genre', TRUE, '#96CEB4'),
    ('Jazz', 'Jazz music genre', TRUE, '#FFEAA7'),
    ('Blues', 'Blues music genre', TRUE, '#74B9FF'),
    ('Classical', 'Classical music genre', TRUE, '#A29BFE'),
    ('Gospel', 'Gospel music genre', TRUE, '#FD79A8'),
    ('Worship', 'Worship/Religious music', TRUE, '#FDCB6E'),
    ('Christmas', 'Christmas songs', TRUE, '#E17055')
ON CONFLICT (name) DO NOTHING;

-- Insert some default system categories
INSERT INTO categories (name, description, is_system) VALUES
    ('Genres', 'Musical genres', TRUE),
    ('Occasions', 'Special occasions and events', TRUE),
    ('Skill Level', 'Difficulty classifications', TRUE),
    ('Instruments', 'Primary instruments', TRUE),
    ('Decades', 'Time periods', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert sub-categories
INSERT INTO categories (name, description, parent_id, is_system) VALUES
    ('Wedding', 'Wedding songs', (SELECT id FROM categories WHERE name = 'Occasions'), TRUE),
    ('Birthday', 'Birthday songs', (SELECT id FROM categories WHERE name = 'Occasions'), TRUE),
    ('Beginner Friendly', 'Easy songs for beginners', (SELECT id FROM categories WHERE name = 'Skill Level'), TRUE),
    ('Guitar', 'Guitar-focused songs', (SELECT id FROM categories WHERE name = 'Instruments'), TRUE),
    ('Piano', 'Piano-focused songs', (SELECT id FROM categories WHERE name = 'Instruments'), TRUE),
    ('2000s', '2000-2009 songs', (SELECT id FROM categories WHERE name = 'Decades'), TRUE),
    ('2010s', '2010-2019 songs', (SELECT id FROM categories WHERE name = 'Decades'), TRUE),
    ('2020s', '2020+ songs', (SELECT id FROM categories WHERE name = 'Decades'), TRUE)
ON CONFLICT (name) DO NOTHING;