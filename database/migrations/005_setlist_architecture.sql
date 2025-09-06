-- ChordMe Database Migration Script
-- Version: 005_setlist_architecture
-- Description: Implement comprehensive setlist management with performance metadata, templates, versioning, and analytics

-- Core setlists table - extends collections concept with performance-specific features
CREATE TABLE IF NOT EXISTS setlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Performance context
    event_type VARCHAR(50) DEFAULT 'performance', -- performance, rehearsal, lesson, jam, etc.
    venue VARCHAR(255),
    event_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- Total estimated duration in minutes
    
    -- Template and organizational features
    is_template BOOLEAN DEFAULT FALSE,
    template_id UUID REFERENCES setlists(id) ON DELETE SET NULL, -- Reference to template this was created from
    is_public BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50), -- weekly, monthly, custom, etc.
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'draft', -- draft, ready, in_progress, completed, archived
    is_deleted BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[], -- Quick tags for categorization
    notes TEXT, -- General notes about the setlist
    view_count INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0, -- How many times this setlist has been performed
    last_performed TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Setlist songs with performance-specific metadata
CREATE TABLE IF NOT EXISTS setlist_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    
    -- Position and organization
    sort_order INTEGER NOT NULL DEFAULT 0,
    section VARCHAR(50), -- opening, main, encore, break, etc.
    
    -- Performance-specific metadata (can override song defaults)
    performance_key VARCHAR(10), -- Key for this performance (may differ from song default)
    performance_tempo INTEGER, -- BPM for this performance
    performance_capo INTEGER DEFAULT 0,
    estimated_duration INTEGER, -- Duration in seconds for this performance
    
    -- Arrangement and notes
    arrangement_notes TEXT, -- Specific arrangement notes for this performance
    performance_notes TEXT, -- Notes about how to perform this song in this context
    intro_notes TEXT, -- Notes about song introduction
    outro_notes TEXT, -- Notes about song ending
    transition_notes TEXT, -- Notes about transition to next song
    
    -- Status and flags
    is_optional BOOLEAN DEFAULT FALSE, -- Can be skipped if needed
    is_highlight BOOLEAN DEFAULT FALSE, -- Featured/important song in setlist
    requires_preparation BOOLEAN DEFAULT FALSE, -- Needs special setup/preparation
    
    -- Analytics metadata
    actual_duration INTEGER, -- Actual duration when performed (populated after performance)
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5), -- 1-5 rating
    audience_response VARCHAR(20), -- excellent, good, fair, poor
    technical_notes TEXT, -- Notes about technical issues or successes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique song per setlist
    UNIQUE(setlist_id, song_id)
);

-- Setlist versions for change tracking
CREATE TABLE IF NOT EXISTS setlist_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Snapshot of setlist at this version
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50),
    venue VARCHAR(255),
    event_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER,
    status VARCHAR(20),
    tags TEXT[],
    notes TEXT,
    
    -- Version metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    version_note TEXT, -- Description of changes made
    is_major_version BOOLEAN DEFAULT FALSE,
    change_summary JSONB, -- Summary of what changed (songs added/removed/reordered)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(setlist_id, version_number)
);

-- Setlist templates with metadata
CREATE TABLE IF NOT EXISTS setlist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Template characteristics
    category VARCHAR(50), -- worship, concert, wedding, etc.
    subcategory VARCHAR(50), -- traditional_service, modern_service, etc.
    target_duration INTEGER, -- Target duration in minutes
    song_count_min INTEGER DEFAULT 0,
    song_count_max INTEGER,
    
    -- Template configuration
    default_sections TEXT[], -- Array of default sections (opening, worship, message, closing)
    required_tags TEXT[], -- Songs in this template should have these tags
    preferred_keys TEXT[], -- Preferred musical keys for flow
    tempo_guidelines JSONB, -- Guidelines for tempo progression
    
    -- Usage and sharing
    is_public BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE, -- System-provided templates
    usage_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.0, -- Average user rating
    rating_count INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[],
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Template sections define the structure of a template
CREATE TABLE IF NOT EXISTS setlist_template_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES setlist_templates(id) ON DELETE CASCADE,
    
    -- Section definition
    section_name VARCHAR(50) NOT NULL, -- opening, worship, teaching, response, closing
    section_order INTEGER NOT NULL DEFAULT 0,
    
    -- Section requirements
    min_songs INTEGER DEFAULT 1,
    max_songs INTEGER,
    target_duration INTEGER, -- Target duration for this section in minutes
    
    -- Musical guidelines
    suggested_keys TEXT[], -- Suggested keys for this section
    tempo_range_min INTEGER,
    tempo_range_max INTEGER,
    energy_level VARCHAR(20), -- low, medium, high, building, falling
    
    -- Content guidelines
    required_tags TEXT[], -- Songs in this section should have these tags
    preferred_themes TEXT[], -- Lyrical or content themes
    notes TEXT, -- Guidelines for this section
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Setlist sharing and collaboration
CREATE TABLE IF NOT EXISTS setlist_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Permission level
    permission_level VARCHAR(20) DEFAULT 'view', -- view, comment, edit, admin
    
    -- Collaboration metadata
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, revoked
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(setlist_id, user_id)
);

-- Performance analytics and reporting
CREATE TABLE IF NOT EXISTS setlist_performances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Performance context
    performance_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255),
    event_type VARCHAR(50),
    audience_size INTEGER,
    
    -- Performance metrics
    total_duration INTEGER, -- Actual total duration in minutes
    songs_performed INTEGER, -- Number of songs actually performed
    songs_skipped INTEGER DEFAULT 0,
    
    -- Quality metrics
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    technical_rating INTEGER CHECK (technical_rating >= 1 AND technical_rating <= 5),
    audience_engagement VARCHAR(20), -- excellent, good, fair, poor
    
    -- Analytics
    notes TEXT,
    improvements_needed TEXT,
    highlights TEXT,
    
    -- Metadata
    weather_conditions VARCHAR(50), -- indoor, outdoor_sunny, outdoor_rainy, etc.
    equipment_used TEXT[],
    team_members TEXT[], -- Other performers/team members
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance details for individual songs
CREATE TABLE IF NOT EXISTS setlist_performance_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performance_id UUID REFERENCES setlist_performances(id) ON DELETE CASCADE,
    setlist_song_id UUID REFERENCES setlist_songs(id) ON DELETE CASCADE,
    
    -- Performance specifics
    actual_order INTEGER, -- Order actually performed (may differ from planned)
    was_performed BOOLEAN DEFAULT TRUE,
    actual_key VARCHAR(10),
    actual_tempo INTEGER,
    actual_duration INTEGER, -- Duration in seconds
    
    -- Performance quality
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    technical_issues TEXT,
    audience_response VARCHAR(20),
    
    -- Notes
    performance_notes TEXT,
    improvement_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add constraints
ALTER TABLE setlists ADD CONSTRAINT chk_setlist_status 
    CHECK (status IN ('draft', 'ready', 'in_progress', 'completed', 'archived'));

ALTER TABLE setlists ADD CONSTRAINT chk_event_type 
    CHECK (event_type IN ('performance', 'rehearsal', 'lesson', 'jam', 'recording', 'worship', 'concert', 'wedding', 'other'));

ALTER TABLE setlists ADD CONSTRAINT chk_recurring_pattern 
    CHECK (recurring_pattern IS NULL OR recurring_pattern IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'));

ALTER TABLE setlist_songs ADD CONSTRAINT chk_performance_tempo_range 
    CHECK (performance_tempo IS NULL OR (performance_tempo >= 40 AND performance_tempo <= 300));

ALTER TABLE setlist_songs ADD CONSTRAINT chk_performance_capo_range 
    CHECK (performance_capo >= 0 AND performance_capo <= 12);

ALTER TABLE setlist_songs ADD CONSTRAINT chk_estimated_duration_positive 
    CHECK (estimated_duration IS NULL OR estimated_duration > 0);

ALTER TABLE setlist_songs ADD CONSTRAINT chk_actual_duration_positive 
    CHECK (actual_duration IS NULL OR actual_duration > 0);

ALTER TABLE setlist_collaborators ADD CONSTRAINT chk_permission_level 
    CHECK (permission_level IN ('view', 'comment', 'edit', 'admin'));

ALTER TABLE setlist_collaborators ADD CONSTRAINT chk_status 
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlists_user_id ON setlists(user_id);
CREATE INDEX IF NOT EXISTS idx_setlists_template_id ON setlists(template_id);
CREATE INDEX IF NOT EXISTS idx_setlists_event_date ON setlists(event_date);
CREATE INDEX IF NOT EXISTS idx_setlists_status ON setlists(status);
CREATE INDEX IF NOT EXISTS idx_setlists_public ON setlists(is_public);
CREATE INDEX IF NOT EXISTS idx_setlists_is_template ON setlists(is_template);
CREATE INDEX IF NOT EXISTS idx_setlists_deleted ON setlists(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_sort_order ON setlist_songs(setlist_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_section ON setlist_songs(setlist_id, section);

CREATE INDEX IF NOT EXISTS idx_setlist_versions_setlist_id ON setlist_versions(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_versions_number ON setlist_versions(setlist_id, version_number);

CREATE INDEX IF NOT EXISTS idx_setlist_templates_category ON setlist_templates(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_setlist_templates_public ON setlist_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_setlist_templates_system ON setlist_templates(is_system);

CREATE INDEX IF NOT EXISTS idx_setlist_collaborators_setlist_id ON setlist_collaborators(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_collaborators_user_id ON setlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_setlist_collaborators_permission ON setlist_collaborators(setlist_id, permission_level);

CREATE INDEX IF NOT EXISTS idx_setlist_performances_setlist_id ON setlist_performances(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_performances_date ON setlist_performances(performance_date);
CREATE INDEX IF NOT EXISTS idx_setlist_performances_user ON setlist_performances(performed_by);

-- Enable Row Level Security
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_performance_songs ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies for setlists
CREATE POLICY "Users can view own setlists" ON setlists FOR SELECT 
    USING (user_id = current_setting('jwt.claims.user_id', true)::uuid OR is_public = TRUE);

CREATE POLICY "Users can view shared setlists" ON setlists FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM setlist_collaborators 
        WHERE setlist_collaborators.setlist_id = setlists.id 
        AND setlist_collaborators.user_id = current_setting('jwt.claims.user_id', true)::uuid
        AND setlist_collaborators.status = 'accepted'
    ));

CREATE POLICY "Users can insert own setlists" ON setlists FOR INSERT 
    WITH CHECK (user_id = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY "Users can update own setlists" ON setlists FOR UPDATE 
    USING (user_id = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY "Users can update shared setlists with edit permission" ON setlists FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM setlist_collaborators 
        WHERE setlist_collaborators.setlist_id = setlists.id 
        AND setlist_collaborators.user_id = current_setting('jwt.claims.user_id', true)::uuid
        AND setlist_collaborators.permission_level IN ('edit', 'admin')
        AND setlist_collaborators.status = 'accepted'
    ));

CREATE POLICY "Users can delete own setlists" ON setlists FOR DELETE 
    USING (user_id = current_setting('jwt.claims.user_id', true)::uuid);

-- RLS Policies for setlist_songs (inherit from setlist permissions)
CREATE POLICY "Users can view setlist songs if they can view setlist" ON setlist_songs FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM setlists WHERE setlists.id = setlist_songs.setlist_id 
        AND (setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid 
             OR setlists.is_public = TRUE
             OR EXISTS (
                 SELECT 1 FROM setlist_collaborators 
                 WHERE setlist_collaborators.setlist_id = setlists.id 
                 AND setlist_collaborators.user_id = current_setting('jwt.claims.user_id', true)::uuid
                 AND setlist_collaborators.status = 'accepted'
             ))
        AND setlists.is_deleted = FALSE
    ));

CREATE POLICY "Users can manage setlist songs if they can edit setlist" ON setlist_songs FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM setlists WHERE setlists.id = setlist_songs.setlist_id 
        AND (setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid
             OR EXISTS (
                 SELECT 1 FROM setlist_collaborators 
                 WHERE setlist_collaborators.setlist_id = setlists.id 
                 AND setlist_collaborators.user_id = current_setting('jwt.claims.user_id', true)::uuid
                 AND setlist_collaborators.permission_level IN ('edit', 'admin')
                 AND setlist_collaborators.status = 'accepted'
             ))
        AND setlists.is_deleted = FALSE
    ));

-- RLS Policies for setlist_versions (inherit from setlist permissions)
CREATE POLICY "Users can view setlist versions if they can view setlist" ON setlist_versions FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM setlists WHERE setlists.id = setlist_versions.setlist_id 
        AND (setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid 
             OR setlists.is_public = TRUE
             OR EXISTS (
                 SELECT 1 FROM setlist_collaborators 
                 WHERE setlist_collaborators.setlist_id = setlists.id 
                 AND setlist_collaborators.user_id = current_setting('jwt.claims.user_id', true)::uuid
                 AND setlist_collaborators.status = 'accepted'
             ))
        AND setlists.is_deleted = FALSE
    ));

CREATE POLICY "Users can create setlist versions if they can edit setlist" ON setlist_versions FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM setlists WHERE setlists.id = setlist_versions.setlist_id 
        AND (setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid
             OR EXISTS (
                 SELECT 1 FROM setlist_collaborators 
                 WHERE setlist_collaborators.setlist_id = setlists.id 
                 AND setlist_collaborators.user_id = current_setting('jwt.claims.user_id', true)::uuid
                 AND setlist_collaborators.permission_level IN ('edit', 'admin')
                 AND setlist_collaborators.status = 'accepted'
             ))
        AND setlists.is_deleted = FALSE
    ));

-- RLS Policies for setlist_templates
CREATE POLICY "Anyone can view public templates" ON setlist_templates FOR SELECT 
    USING (is_public = TRUE OR is_system = TRUE);

CREATE POLICY "Users can view own templates" ON setlist_templates FOR SELECT 
    USING (created_by = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY "Users can create templates" ON setlist_templates FOR INSERT 
    WITH CHECK (created_by = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY "Users can update own templates" ON setlist_templates FOR UPDATE 
    USING (created_by = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY "Users can delete own templates" ON setlist_templates FOR DELETE 
    USING (created_by = current_setting('jwt.claims.user_id', true)::uuid);

-- RLS Policies for setlist_template_sections (inherit from template permissions)
CREATE POLICY "Users can view template sections if they can view template" ON setlist_template_sections FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM setlist_templates WHERE setlist_templates.id = setlist_template_sections.template_id 
        AND (setlist_templates.is_public = TRUE 
             OR setlist_templates.is_system = TRUE
             OR setlist_templates.created_by = current_setting('jwt.claims.user_id', true)::uuid)
    ));

CREATE POLICY "Users can manage template sections if they own template" ON setlist_template_sections FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM setlist_templates WHERE setlist_templates.id = setlist_template_sections.template_id 
        AND setlist_templates.created_by = current_setting('jwt.claims.user_id', true)::uuid
    ));

-- RLS Policies for setlist_collaborators
CREATE POLICY "Users can view collaborators for own setlists" ON setlist_collaborators FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM setlists WHERE setlists.id = setlist_collaborators.setlist_id 
        AND setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid
    ));

CREATE POLICY "Users can view own collaborations" ON setlist_collaborators FOR SELECT 
    USING (user_id = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY "Users can manage collaborators for own setlists" ON setlist_collaborators FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM setlists WHERE setlists.id = setlist_collaborators.setlist_id 
        AND setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid
    ));

-- RLS Policies for setlist_performances
CREATE POLICY "Users can view performances of own setlists" ON setlist_performances FOR SELECT 
    USING (performed_by = current_setting('jwt.claims.user_id', true)::uuid
           OR EXISTS (
               SELECT 1 FROM setlists WHERE setlists.id = setlist_performances.setlist_id 
               AND setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid
           ));

CREATE POLICY "Users can create performances" ON setlist_performances FOR INSERT 
    WITH CHECK (performed_by = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY "Users can update own performances" ON setlist_performances FOR UPDATE 
    USING (performed_by = current_setting('jwt.claims.user_id', true)::uuid);

-- RLS Policies for setlist_performance_songs (inherit from performance permissions)
CREATE POLICY "Users can view performance songs if they can view performance" ON setlist_performance_songs FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM setlist_performances WHERE setlist_performances.id = setlist_performance_songs.performance_id 
        AND (setlist_performances.performed_by = current_setting('jwt.claims.user_id', true)::uuid
             OR EXISTS (
                 SELECT 1 FROM setlists WHERE setlists.id = setlist_performances.setlist_id 
                 AND setlists.user_id = current_setting('jwt.claims.user_id', true)::uuid
             ))
    ));

CREATE POLICY "Users can manage performance songs if they can manage performance" ON setlist_performance_songs FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM setlist_performances WHERE setlist_performances.id = setlist_performance_songs.performance_id 
        AND setlist_performances.performed_by = current_setting('jwt.claims.user_id', true)::uuid
    ));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_setlists_updated_at BEFORE UPDATE ON setlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlist_songs_updated_at BEFORE UPDATE ON setlist_songs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlist_templates_updated_at BEFORE UPDATE ON setlist_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create setlist version on changes
CREATE OR REPLACE FUNCTION create_setlist_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version_number INTEGER;
BEGIN
    -- Get the next version number for this setlist
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO next_version_number 
    FROM setlist_versions 
    WHERE setlist_id = NEW.id;
    
    -- Create version record
    INSERT INTO setlist_versions (
        setlist_id, version_number, name, description, event_type, venue, 
        event_date, estimated_duration, status, tags, notes, created_by,
        version_note, is_major_version
    ) VALUES (
        NEW.id, next_version_number, NEW.name, NEW.description, NEW.event_type, 
        NEW.venue, NEW.event_date, NEW.estimated_duration, NEW.status, NEW.tags, 
        NEW.notes, NEW.user_id, 'Automatic version created', FALSE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically version setlists
CREATE TRIGGER create_setlist_version_on_update
    AFTER UPDATE ON setlists
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION create_setlist_version();

-- Create function to update setlist usage count
CREATE OR REPLACE FUNCTION update_setlist_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE setlists 
        SET usage_count = usage_count + 1, 
            last_performed = NEW.performance_date 
        WHERE id = NEW.setlist_id;
        
        -- Also update template usage if setlist was created from template
        UPDATE setlist_templates 
        SET usage_count = usage_count + 1 
        WHERE id IN (
            SELECT template_id FROM setlists 
            WHERE id = NEW.setlist_id AND template_id IS NOT NULL
        );
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain usage counts
CREATE TRIGGER update_usage_count_on_performance
    AFTER INSERT ON setlist_performances
    FOR EACH ROW EXECUTE FUNCTION update_setlist_usage_count();

-- Insert default system templates
INSERT INTO setlist_templates (name, description, category, subcategory, target_duration, is_system, is_public, default_sections) VALUES
('Basic Worship Service', 'Traditional worship service template with opening, worship, message, and closing', 'worship', 'traditional', 75, TRUE, TRUE, ARRAY['opening', 'worship', 'message', 'response', 'closing']),
('Contemporary Worship', 'Modern worship service with extended music sections', 'worship', 'contemporary', 90, TRUE, TRUE, ARRAY['pre_service', 'opening', 'worship_set', 'message', 'response', 'closing']),
('Concert Performance', 'Full concert setlist template', 'concert', 'full_show', 120, TRUE, TRUE, ARRAY['opening', 'set_one', 'intermission', 'set_two', 'encore']),
('Band Rehearsal', 'Band rehearsal session template', 'rehearsal', 'band_practice', 180, TRUE, TRUE, ARRAY['warm_up', 'new_songs', 'review', 'full_run']),
('Wedding Ceremony', 'Wedding ceremony music template', 'wedding', 'ceremony', 45, TRUE, TRUE, ARRAY['prelude', 'processional', 'ceremony', 'recessional']),
('Acoustic Set', 'Intimate acoustic performance template', 'concert', 'acoustic', 60, TRUE, TRUE, ARRAY['opening', 'main_set', 'encore']);

-- Insert default template sections for Basic Worship Service
INSERT INTO setlist_template_sections (template_id, section_name, section_order, min_songs, max_songs, target_duration, energy_level, notes) 
SELECT id, section_name, section_order, min_songs, max_songs, target_duration, energy_level, notes
FROM setlist_templates,
(VALUES 
    ('opening', 1, 1, 2, 5, 'medium', 'Welcome and opening songs to gather the congregation'),
    ('worship', 2, 3, 5, 25, 'building', 'Heart of worship - build from intimate to celebratory'),
    ('message', 3, 0, 1, 30, 'low', 'Teaching or sermon time'),
    ('response', 4, 1, 3, 10, 'medium', 'Response to the message - reflective or commitment'),
    ('closing', 5, 1, 2, 5, 'medium', 'Sending and blessing songs')
) AS sections(section_name, section_order, min_songs, max_songs, target_duration, energy_level, notes)
WHERE setlist_templates.name = 'Basic Worship Service';