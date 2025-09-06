---
layout: default
lang: es
title: Diseño de Esquema de Base de Datos
---

# Documentación del Diseño de Esquema de Base de Datos de Canciones

## Resumen

El esquema de base de datos de canciones de ChordMe ha sido mejorado para soportar metadatos completos de canciones, etiquetado, categorización, funcionalidad de búsqueda y características colaborativas. Este documento describe las decisiones de diseño, relaciones y capacidades del esquema mejorado.

## Versión del Esquema: 003_enhance_song_schema

### Principios de Diseño Central

1. **Escalabilidad**: Diseñado para manejar millones de canciones y usuarios
2. **Flexibilidad**: Metadatos extensibles sin modificaciones de esquema
3. **Rendimiento**: Indexación optimizada para búsqueda y filtrado
4. **Integridad**: Restricciones para mantener consistencia de datos
5. **Auditabilidad**: Tracking completo de cambios e historial

## Esquema Principal

### Tabla: songs

Tabla central que almacena información básica de canciones.

```sql
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    album VARCHAR(255),
    
    -- Contenido
    content TEXT NOT NULL,  -- Contenido ChordPro
    lyrics TEXT,           -- Letras extraídas
    
    -- Metadatos musicales
    key VARCHAR(10),       -- Tonalidad (C, Am, F#, etc.)
    tempo INTEGER,         -- BPM
    time_signature VARCHAR(10), -- 4/4, 3/4, 6/8, etc.
    capo_fret INTEGER DEFAULT 0,
    
    -- Metadatos adicionales
    genre VARCHAR(100),
    style VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    year INTEGER,
    duration_seconds INTEGER,
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    
    -- Información de origen
    source_url TEXT,
    source_type VARCHAR(50), -- 'manual', 'import', 'api', etc.
    
    -- Control de acceso
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'shared')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Índices de búsqueda
    search_vector TSVECTOR,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_tempo CHECK (tempo IS NULL OR (tempo >= 30 AND tempo <= 300)),
    CONSTRAINT valid_year CHECK (year IS NULL OR (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 10))
);
```

### Índices de Rendimiento

```sql
-- Índices principales
CREATE INDEX idx_songs_created_by ON songs(created_by);
CREATE INDEX idx_songs_visibility ON songs(visibility);
CREATE INDEX idx_songs_genre ON songs(genre);
CREATE INDEX idx_songs_key ON songs(key);
CREATE INDEX idx_songs_difficulty ON songs(difficulty_level);
CREATE INDEX idx_songs_created_at ON songs(created_at);
CREATE INDEX idx_songs_updated_at ON songs(updated_at);

-- Índice de búsqueda de texto completo
CREATE INDEX idx_songs_search ON songs USING GIN(search_vector);

-- Índices compuestos para consultas comunes
CREATE INDEX idx_songs_user_visible ON songs(created_by, visibility, deleted_at);
CREATE INDEX idx_songs_public_recent ON songs(visibility, created_at) WHERE visibility = 'public' AND deleted_at IS NULL;
CREATE INDEX idx_songs_genre_difficulty ON songs(genre, difficulty_level) WHERE deleted_at IS NULL;

-- Índice parcial para canciones activas
CREATE INDEX idx_songs_active ON songs(id, title, artist, created_at) WHERE deleted_at IS NULL;
```

### Tabla: song_tags

Sistema de etiquetado flexible para categorización y búsqueda.

```sql
CREATE TABLE song_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_type VARCHAR(50) DEFAULT 'user', -- 'user', 'auto', 'system'
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(song_id, tag_name, tag_type)
);

CREATE INDEX idx_song_tags_song_id ON song_tags(song_id);
CREATE INDEX idx_song_tags_name ON song_tags(tag_name);
CREATE INDEX idx_song_tags_type ON song_tags(tag_type);
CREATE INDEX idx_song_tags_composite ON song_tags(tag_name, tag_type, song_id);
```

### Tabla: song_chords

Almacena acordes extraídos para búsqueda y análisis.

```sql
CREATE TABLE song_chords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    chord_name VARCHAR(50) NOT NULL,
    chord_position INTEGER NOT NULL, -- Posición en la canción
    chord_context TEXT,             -- Contexto circundante
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(song_id, chord_name, chord_position)
);

CREATE INDEX idx_song_chords_song_id ON song_chords(song_id);
CREATE INDEX idx_song_chords_name ON song_chords(chord_name);
CREATE INDEX idx_song_chords_position ON song_chords(song_id, chord_position);
```

### Tabla: song_shares

Gestión de compartir canciones entre usuarios.

```sql
CREATE TABLE song_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    message TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(song_id, shared_with)
);

CREATE INDEX idx_song_shares_song_id ON song_shares(song_id);
CREATE INDEX idx_song_shares_shared_with ON song_shares(shared_with);
CREATE INDEX idx_song_shares_shared_by ON song_shares(shared_by);
CREATE INDEX idx_song_shares_active ON song_shares(shared_with, accepted_at) WHERE expires_at IS NULL OR expires_at > NOW();
```

### Tabla: song_history

Tracking de versiones y cambios en canciones.

```sql
CREATE TABLE song_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Snapshot de campos principales
    title VARCHAR(255),
    artist VARCHAR(255),
    content TEXT,
    key VARCHAR(10),
    tempo INTEGER,
    
    -- Información del cambio
    change_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'restore'
    change_summary TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(song_id, version_number)
);

CREATE INDEX idx_song_history_song_id ON song_history(song_id, version_number DESC);
CREATE INDEX idx_song_history_changed_by ON song_history(changed_by);
CREATE INDEX idx_song_history_created_at ON song_history(created_at);
```

### Tabla: song_favorites

Sistema de favoritos de usuario.

```sql
CREATE TABLE song_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(song_id, user_id)
);

CREATE INDEX idx_song_favorites_user_id ON song_favorites(user_id, created_at);
CREATE INDEX idx_song_favorites_song_id ON song_favorites(song_id);
```

### Tabla: song_analytics

Métricas de uso y engagement.

```sql
CREATE TABLE song_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    
    -- Métricas de uso
    view_count INTEGER DEFAULT 0,
    edit_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    
    -- Métricas de engagement
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    avg_session_duration_seconds INTEGER,
    
    -- Métricas agregadas
    weekly_views INTEGER DEFAULT 0,
    monthly_views INTEGER DEFAULT 0,
    popularity_score DECIMAL(10,2) DEFAULT 0.0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(song_id)
);

CREATE INDEX idx_song_analytics_popularity ON song_analytics(popularity_score DESC);
CREATE INDEX idx_song_analytics_views ON song_analytics(view_count DESC);
CREATE INDEX idx_song_analytics_recent ON song_analytics(last_viewed_at DESC);
```

## Tablas de Soporte

### Tabla: tag_categories

Categorización de etiquetas para mejor organización.

```sql
CREATE TABLE tag_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_hex VARCHAR(7), -- #RRGGBB
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías predefinidas
INSERT INTO tag_categories (name, description, color_hex, icon) VALUES
('genre', 'Musical genres', '#FF6B6B', 'music'),
('mood', 'Song mood and feeling', '#4ECDC4', 'heart'),
('occasion', 'Usage occasions', '#45B7D1', 'calendar'),
('difficulty', 'Playing difficulty', '#96CEB4', 'star'),
('instrument', 'Primary instruments', '#FECA57', 'guitar'),
('style', 'Musical styles', '#FF9FF3', 'palette');
```

### Tabla: popular_tags

Caché de etiquetas populares para sugerencias.

```sql
CREATE TABLE popular_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_name VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES tag_categories(id),
    usage_count INTEGER DEFAULT 0,
    trend_score DECIMAL(10,2) DEFAULT 0.0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tag_name)
);

CREATE INDEX idx_popular_tags_usage ON popular_tags(usage_count DESC);
CREATE INDEX idx_popular_tags_trend ON popular_tags(trend_score DESC);
CREATE INDEX idx_popular_tags_category ON popular_tags(category_id, usage_count DESC);
```

## Vistas Optimizadas

### Vista: song_list_view

Vista optimizada para listados de canciones.

```sql
CREATE VIEW song_list_view AS
SELECT 
    s.id,
    s.title,
    s.artist,
    s.album,
    s.genre,
    s.key,
    s.tempo,
    s.difficulty_level,
    s.language,
    s.year,
    s.visibility,
    s.created_by,
    s.created_at,
    s.updated_at,
    
    -- Contadores agregados
    COALESCE(sa.view_count, 0) as view_count,
    COALESCE(sa.favorite_count, 0) as favorite_count,
    COALESCE(sa.popularity_score, 0.0) as popularity_score,
    
    -- Información del creador
    u.email as creator_email,
    u.display_name as creator_name,
    
    -- Etiquetas como array
    ARRAY_AGG(DISTINCT st.tag_name) FILTER (WHERE st.tag_name IS NOT NULL) as tags
    
FROM songs s
LEFT JOIN song_analytics sa ON s.id = sa.song_id
LEFT JOIN users u ON s.created_by = u.id
LEFT JOIN song_tags st ON s.id = st.song_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, sa.view_count, sa.favorite_count, sa.popularity_score, u.email, u.display_name;
```

### Vista: song_search_view

Vista optimizada para búsqueda de texto completo.

```sql
CREATE VIEW song_search_view AS
SELECT 
    s.id,
    s.title,
    s.artist,
    s.album,
    s.genre,
    s.key,
    s.difficulty_level,
    s.created_by,
    s.visibility,
    
    -- Texto combinado para búsqueda
    CONCAT_WS(' ', s.title, s.artist, s.album, s.genre, s.lyrics) as searchable_text,
    s.search_vector,
    
    -- Etiquetas como string
    STRING_AGG(DISTINCT st.tag_name, ' ') as tag_string,
    
    -- Acordes como string
    STRING_AGG(DISTINCT sc.chord_name, ' ') as chord_string
    
FROM songs s
LEFT JOIN song_tags st ON s.id = st.song_id
LEFT JOIN song_chords sc ON s.id = sc.song_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.title, s.artist, s.album, s.genre, s.key, s.difficulty_level, 
         s.created_by, s.visibility, s.lyrics, s.search_vector;
```

## Funciones de Base de Datos

### Función: update_search_vector

Actualiza automáticamente el vector de búsqueda cuando se modifica una canción.

```sql
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.artist, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.album, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.genre, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.lyrics, '')), 'D');
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();
```

### Función: update_analytics

Actualiza métricas de analytics cuando ocurren eventos.

```sql
CREATE OR REPLACE FUNCTION update_song_analytics(
    p_song_id UUID,
    p_event_type VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO song_analytics (song_id, view_count, edit_count, share_count, updated_at)
    VALUES (p_song_id, 
            CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END,
            CASE WHEN p_event_type = 'edit' THEN 1 ELSE 0 END,
            CASE WHEN p_event_type = 'share' THEN 1 ELSE 0 END,
            NOW())
    ON CONFLICT (song_id)
    DO UPDATE SET
        view_count = song_analytics.view_count + 
                    CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END,
        edit_count = song_analytics.edit_count + 
                    CASE WHEN p_event_type = 'edit' THEN 1 ELSE 0 END,
        share_count = song_analytics.share_count + 
                     CASE WHEN p_event_type = 'share' THEN 1 ELSE 0 END,
        last_viewed_at = CASE WHEN p_event_type = 'view' THEN NOW() 
                              ELSE song_analytics.last_viewed_at END,
        last_edited_at = CASE WHEN p_event_type = 'edit' THEN NOW() 
                              ELSE song_analytics.last_edited_at END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### Función: calculate_popularity_score

Calcula puntuación de popularidad basada en múltiples métricas.

```sql
CREATE OR REPLACE FUNCTION calculate_popularity_score(
    p_view_count INTEGER,
    p_favorite_count INTEGER,
    p_share_count INTEGER,
    p_created_at TIMESTAMP WITH TIME ZONE
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    age_days INTEGER;
    recency_factor DECIMAL(10,2);
    engagement_score DECIMAL(10,2);
    final_score DECIMAL(10,2);
BEGIN
    -- Calcular edad en días
    age_days := EXTRACT(DAY FROM NOW() - p_created_at);
    
    -- Factor de recencia (decae exponencialmente)
    recency_factor := EXP(-age_days::DECIMAL / 30.0);
    
    -- Puntuación de engagement (ponderada)
    engagement_score := 
        (p_view_count * 1.0) +
        (p_favorite_count * 5.0) +
        (p_share_count * 10.0);
    
    -- Puntuación final normalizada
    final_score := (engagement_score * recency_factor) / 100.0;
    
    RETURN LEAST(final_score, 100.0); -- Máximo 100
END;
$$ LANGUAGE plpgsql;
```

## Consultas Optimizadas de Ejemplo

### Búsqueda de Texto Completo

```sql
-- Búsqueda de canciones con ranking de relevancia
SELECT 
    s.id,
    s.title,
    s.artist,
    s.genre,
    s.difficulty_level,
    ts_rank(s.search_vector, plainto_tsquery('english', $1)) as relevance_score
FROM songs s
WHERE s.search_vector @@ plainto_tsquery('english', $1)
    AND s.visibility = 'public'
    AND s.deleted_at IS NULL
ORDER BY relevance_score DESC, s.popularity_score DESC
LIMIT 20;
```

### Filtrado Avanzado

```sql
-- Buscar canciones con filtros múltiples
SELECT DISTINCT s.*
FROM song_list_view s
JOIN song_tags st ON s.id = st.song_id
WHERE s.genre = ANY($1::VARCHAR[])  -- géneros
    AND s.difficulty_level BETWEEN $2 AND $3  -- rango de dificultad
    AND s.key = ANY($4::VARCHAR[])  -- tonalidades
    AND st.tag_name = ANY($5::VARCHAR[])  -- etiquetas
    AND s.visibility = 'public'
ORDER BY s.popularity_score DESC, s.created_at DESC;
```

### Recomendaciones Personalizadas

```sql
-- Recomendar canciones basadas en favoritos del usuario
WITH user_preferences AS (
    SELECT 
        s.genre,
        s.key,
        s.difficulty_level,
        COUNT(*) as preference_weight
    FROM song_favorites sf
    JOIN songs s ON sf.song_id = s.id
    WHERE sf.user_id = $1
    GROUP BY s.genre, s.key, s.difficulty_level
),
recommendations AS (
    SELECT 
        s.*,
        COALESCE(up.preference_weight, 0) * sa.popularity_score as recommendation_score
    FROM songs s
    JOIN song_analytics sa ON s.id = sa.song_id
    LEFT JOIN user_preferences up ON (
        s.genre = up.genre OR 
        s.key = up.key OR 
        s.difficulty_level = up.difficulty_level
    )
    WHERE s.visibility = 'public'
        AND s.deleted_at IS NULL
        AND s.id NOT IN (
            SELECT song_id FROM song_favorites WHERE user_id = $1
        )
)
SELECT * FROM recommendations
ORDER BY recommendation_score DESC, popularity_score DESC
LIMIT 10;
```

## Estrategias de Migración

### Migración desde Esquema Anterior

```sql
-- Script de migración incremental
BEGIN;

-- Agregar nuevas columnas
ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR,
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

-- Crear nuevas tablas
CREATE TABLE IF NOT EXISTS song_analytics (
    -- definición completa aquí
);

-- Migrar datos existentes
UPDATE songs SET 
    language = 'en',
    source_type = 'manual',
    updated_at = NOW()
WHERE language IS NULL;

-- Construir vectores de búsqueda para canciones existentes
UPDATE songs SET search_vector = (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(artist, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(genre, '')), 'C')
) WHERE search_vector IS NULL;

-- Crear índices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_search 
ON songs USING GIN(search_vector);

COMMIT;
```

## Monitoreo y Mantenimiento

### Consultas de Monitoreo

```sql
-- Estadísticas de uso de la base de datos
SELECT 
    COUNT(*) as total_songs,
    COUNT(*) FILTER (WHERE visibility = 'public') as public_songs,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_songs,
    AVG(EXTRACT(EPOCH FROM NOW() - created_at) / 86400) as avg_age_days
FROM songs 
WHERE deleted_at IS NULL;

-- Etiquetas más populares
SELECT 
    tag_name,
    COUNT(*) as usage_count,
    COUNT(DISTINCT song_id) as unique_songs
FROM song_tags 
GROUP BY tag_name 
ORDER BY usage_count DESC 
LIMIT 20;

-- Rendimiento de consultas
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%songs%' 
ORDER BY total_time DESC;
```

### Mantenimiento Automático

```sql
-- Procedimiento de limpieza automática
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Limpiar canciones marcadas como eliminadas hace más de 30 días
    DELETE FROM songs 
    WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days';
    
    -- Limpiar sesiones de compartir expiradas
    DELETE FROM song_shares 
    WHERE expires_at IS NOT NULL 
        AND expires_at < NOW();
    
    -- Actualizar contadores de etiquetas populares
    INSERT INTO popular_tags (tag_name, usage_count, last_used_at, updated_at)
    SELECT 
        tag_name,
        COUNT(*),
        MAX(created_at),
        NOW()
    FROM song_tags 
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY tag_name
    ON CONFLICT (tag_name) 
    DO UPDATE SET 
        usage_count = popular_tags.usage_count + EXCLUDED.usage_count,
        last_used_at = GREATEST(popular_tags.last_used_at, EXCLUDED.last_used_at),
        updated_at = NOW();
        
    -- Recalcular puntuaciones de popularidad
    UPDATE song_analytics SET 
        popularity_score = calculate_popularity_score(
            view_count, 
            favorite_count, 
            share_count, 
            (SELECT created_at FROM songs WHERE id = song_analytics.song_id)
        ),
        updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Programar limpieza diaria
SELECT cron.schedule('cleanup-songs', '0 2 * * *', 'SELECT cleanup_old_data();');
```

---

**Idioma:** [English](database-schema-design.md) | **Español**

*Para más información sobre la base de datos, consulte la [Documentación de Testing](testing-es.md) y la [Guía del Desarrollador](developer-guide-es.md).*