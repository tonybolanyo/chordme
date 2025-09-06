-- Migration 004: Enhanced Full-Text Search Engine
-- This migration enhances the existing search functionality with:
-- - Boolean operators (AND, OR, NOT)
-- - Phrase searching with quotes
-- - Search result ranking improvements
-- - Performance optimizations

-- Enable required PostgreSQL extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram matching (already exists)
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- Accent removal (already exists)

-- Create enhanced search function with boolean operators and phrase search
CREATE OR REPLACE FUNCTION search_songs_advanced(
    search_query TEXT DEFAULT NULL,
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
    offset_count INTEGER DEFAULT 0,
    enable_fuzzy BOOLEAN DEFAULT TRUE
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
    relevance_score FLOAT,
    match_type TEXT,
    matched_fields TEXT[]
) AS $$
DECLARE
    processed_query TEXT;
    phrase_queries TEXT[];
    and_terms TEXT[];
    or_terms TEXT[];
    not_terms TEXT[];
    base_score FLOAT := 1.0;
BEGIN
    -- Initialize return structure
    processed_query := search_query;
    
    -- Parse boolean operators and phrases from search query
    IF search_query IS NOT NULL AND search_query != '' THEN
        -- Extract quoted phrases
        SELECT array_agg(match[1]) INTO phrase_queries
        FROM regexp_matches(search_query, '"([^"]+)"', 'g') AS match;
        
        -- Remove quoted phrases from query for further processing
        processed_query := regexp_replace(search_query, '"[^"]+"', '', 'g');
        
        -- Extract AND terms (terms without operators or with +)
        SELECT array_agg(trim(term)) INTO and_terms
        FROM regexp_split_to_table(processed_query, '\s+') AS term
        WHERE term != '' 
          AND upper(term) NOT IN ('AND', 'OR', 'NOT')
          AND NOT term ~ '^-'
          AND trim(term) != '';
        
        -- Extract NOT terms (terms with - prefix)
        SELECT array_agg(regexp_replace(term, '^-', '')) INTO not_terms
        FROM regexp_split_to_table(processed_query, '\s+') AS term
        WHERE term ~ '^-';
    END IF;
    
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
        -- Enhanced relevance scoring
        CASE 
            WHEN search_query IS NOT NULL THEN
                (
                    -- Exact title match gets highest score
                    CASE WHEN lower(s.title) = lower(search_query) THEN 10.0 ELSE 0.0 END +
                    -- Title similarity (weighted heavily)
                    COALESCE(similarity(lower(s.title), lower(search_query)), 0) * 5.0 +
                    -- Artist similarity (high weight)
                    COALESCE(similarity(lower(s.artist), lower(search_query)), 0) * 3.0 +
                    -- Lyrics similarity (medium weight)
                    COALESCE(similarity(lower(s.lyrics), lower(search_query)), 0) * 2.0 +
                    -- Content similarity (lower weight)
                    COALESCE(similarity(lower(s.content), lower(search_query)), 0) * 1.0 +
                    -- Phrase match bonus
                    CASE 
                        WHEN phrase_queries IS NOT NULL THEN
                            CASE 
                                WHEN EXISTS (
                                    SELECT 1 FROM unnest(phrase_queries) AS phrase 
                                    WHERE s.title ILIKE '%' || phrase || '%' 
                                       OR s.artist ILIKE '%' || phrase || '%'
                                       OR s.lyrics ILIKE '%' || phrase || '%'
                                ) THEN 2.0 ELSE 0.0 
                            END
                        ELSE 0.0 
                    END +
                    -- Popularity boost
                    COALESCE(s.view_count::FLOAT / 1000.0, 0) * 0.1 +
                    COALESCE(s.favorite_count::FLOAT / 10.0, 0) * 0.2
                )
            ELSE base_score
        END as relevance_score,
        -- Match type classification
        CASE 
            WHEN search_query IS NULL THEN 'browse'
            WHEN lower(s.title) = lower(search_query) THEN 'exact_title'
            WHEN s.title ILIKE '%' || search_query || '%' THEN 'title_contains'
            WHEN s.artist ILIKE '%' || search_query || '%' THEN 'artist_contains'
            WHEN s.lyrics ILIKE '%' || search_query || '%' THEN 'lyrics_contains'
            ELSE 'fuzzy_match'
        END as match_type,
        -- Matched fields array
        ARRAY(
            SELECT field_name FROM (
                SELECT 'title' as field_name WHERE s.title ILIKE '%' || COALESCE(search_query, '') || '%'
                UNION
                SELECT 'artist' as field_name WHERE s.artist ILIKE '%' || COALESCE(search_query, '') || '%'
                UNION
                SELECT 'lyrics' as field_name WHERE s.lyrics ILIKE '%' || COALESCE(search_query, '') || '%'
                UNION
                SELECT 'genre' as field_name WHERE s.genre ILIKE '%' || COALESCE(search_genre, '') || '%'
            ) matches
        ) as matched_fields
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
        
        -- Enhanced search query processing
        AND (
            search_query IS NULL OR search_query = '' OR (
                -- Handle phrase searches
                (phrase_queries IS NULL OR EXISTS (
                    SELECT 1 FROM unnest(phrase_queries) AS phrase 
                    WHERE s.title ILIKE '%' || phrase || '%' 
                       OR s.artist ILIKE '%' || phrase || '%'
                       OR s.lyrics ILIKE '%' || phrase || '%'
                       OR s.content ILIKE '%' || phrase || '%'
                )) AND
                
                -- Handle AND terms (all must match)
                (and_terms IS NULL OR (
                    SELECT bool_and(
                        s.title ILIKE '%' || term || '%' OR
                        s.artist ILIKE '%' || term || '%' OR
                        s.lyrics ILIKE '%' || term || '%' OR
                        s.content ILIKE '%' || term || '%'
                    ) FROM unnest(and_terms) AS term
                )) AND
                
                -- Handle NOT terms (none must match)
                (not_terms IS NULL OR NOT EXISTS (
                    SELECT 1 FROM unnest(not_terms) AS term
                    WHERE s.title ILIKE '%' || term || '%' 
                       OR s.artist ILIKE '%' || term || '%'
                       OR s.lyrics ILIKE '%' || term || '%'
                       OR s.content ILIKE '%' || term || '%'
                )) AND
                
                -- Fallback to simple search if no special operators
                (phrase_queries IS NOT NULL OR and_terms IS NOT NULL OR not_terms IS NOT NULL OR
                 s.title ILIKE '%' || search_query || '%' OR
                 s.artist ILIKE '%' || search_query || '%' OR
                 s.lyrics ILIKE '%' || search_query || '%' OR
                 s.content ILIKE '%' || search_query || '%')
            )
        )
        
        -- Existing filter conditions
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

-- Create function for search suggestions/autocomplete
CREATE OR REPLACE FUNCTION get_search_suggestions(
    partial_query TEXT,
    suggestion_type TEXT DEFAULT 'all', -- 'title', 'artist', 'tag', 'all'
    max_suggestions INTEGER DEFAULT 10,
    user_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    suggestion TEXT,
    type TEXT,
    count INTEGER,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        suggestion_text,
        suggestion_type_result,
        suggestion_count::INTEGER,
        similarity(lower(suggestion_text), lower(partial_query)) as relevance_score
    FROM (
        -- Song title suggestions
        SELECT DISTINCT
            s.title as suggestion_text,
            'title' as suggestion_type_result,
            count(*) OVER (PARTITION BY s.title) as suggestion_count
        FROM songs s
        WHERE s.is_deleted = FALSE 
          AND s.is_archived = FALSE
          AND (user_id_filter IS NULL OR s.user_id = user_id_filter OR s.is_public = TRUE)
          AND (suggestion_type = 'all' OR suggestion_type = 'title')
          AND s.title ILIKE '%' || partial_query || '%'
          AND char_length(s.title) > 0
        
        UNION ALL
        
        -- Artist suggestions
        SELECT DISTINCT
            s.artist as suggestion_text,
            'artist' as suggestion_type_result,
            count(*) OVER (PARTITION BY s.artist) as suggestion_count
        FROM songs s
        WHERE s.is_deleted = FALSE 
          AND s.is_archived = FALSE
          AND (user_id_filter IS NULL OR s.user_id = user_id_filter OR s.is_public = TRUE)
          AND (suggestion_type = 'all' OR suggestion_type = 'artist')
          AND s.artist ILIKE '%' || partial_query || '%'
          AND char_length(s.artist) > 0
        
        UNION ALL
        
        -- Tag suggestions
        SELECT DISTINCT
            t.name as suggestion_text,
            'tag' as suggestion_type_result,
            count(*) OVER (PARTITION BY t.name) as suggestion_count
        FROM tags t
        WHERE (suggestion_type = 'all' OR suggestion_type = 'tag')
          AND t.name ILIKE '%' || partial_query || '%'
          AND char_length(t.name) > 0
    ) combined_suggestions
    WHERE similarity(lower(suggestion_text), lower(partial_query)) > 0.1
    ORDER BY relevance_score DESC, suggestion_count DESC
    LIMIT max_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for improved search performance
CREATE INDEX IF NOT EXISTS idx_songs_search_vector ON songs USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(artist, '') || ' ' || coalesce(lyrics, '')));
CREATE INDEX IF NOT EXISTS idx_songs_title_artist_gin ON songs USING gin((lower(title) || ' ' || lower(artist)) gin_trgm_ops);

-- Create search statistics table for analytics
CREATE TABLE IF NOT EXISTS search_analytics (
    id SERIAL PRIMARY KEY,
    search_query TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    search_time_ms INTEGER NOT NULL DEFAULT 0,
    filters_used JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Index for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(search_query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);

-- Function to log search analytics
CREATE OR REPLACE FUNCTION log_search_analytics(
    query TEXT,
    user_id_param UUID DEFAULT NULL,
    results_count_param INTEGER DEFAULT 0,
    search_time_param INTEGER DEFAULT 0,
    filters_param JSONB DEFAULT '{}',
    ip_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO search_analytics (
        search_query, 
        user_id, 
        results_count, 
        search_time_ms, 
        filters_used, 
        ip_address, 
        user_agent
    ) VALUES (
        query, 
        user_id_param, 
        results_count_param, 
        search_time_param, 
        filters_param, 
        ip_param, 
        user_agent_param
    );
END;
$$ LANGUAGE plpgsql;

-- Update the active_songs view to include search-relevant fields
DROP VIEW IF EXISTS active_songs;
CREATE OR REPLACE VIEW active_songs AS
SELECT s.*, 
       u.email as author_email,
       u.display_name as author_display_name,
       array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tag_names,
       array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as category_names,
       -- Add search-friendly concatenated field
       (s.title || ' ' || COALESCE(s.artist, '') || ' ' || COALESCE(s.genre, '')) as search_text
FROM songs s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN song_tags st ON s.id = st.song_id
LEFT JOIN tags t ON st.tag_id = t.id
LEFT JOIN song_categories sc ON s.id = sc.song_id
LEFT JOIN categories c ON sc.category_id = c.id
WHERE s.is_deleted = FALSE AND s.is_archived = FALSE
GROUP BY s.id, u.email, u.display_name;