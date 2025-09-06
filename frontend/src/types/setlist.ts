/**
 * Setlist types and interfaces for ChordMe setlist management
 */

export interface Setlist {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  
  // Performance context
  event_type: EventType;
  venue?: string;
  event_date?: string;
  estimated_duration?: number; // Minutes
  
  // Template and organization
  is_template: boolean;
  template_id?: string;
  is_public: boolean;
  is_recurring: boolean;
  recurring_pattern?: string;
  
  // Status and lifecycle
  status: SetlistStatus;
  is_deleted: boolean;
  is_archived: boolean;
  
  // Metadata and analytics
  tags: string[];
  notes?: string;
  view_count: number;
  usage_count: number;
  last_performed?: string;
  
  created_at: string;
  updated_at: string;
  
  // Related data
  songs?: SetlistSong[];
  template?: SetlistTemplate;
  collaborator_count?: number;
  permission_level?: PermissionLevel;
}

export interface SetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  
  // Position and organization
  sort_order: number;
  section?: string; // opening, main, encore, etc.
  
  // Performance overrides
  performance_key?: string;
  performance_tempo?: number;
  performance_capo?: number;
  estimated_duration?: number; // Seconds
  
  // Performance notes and arrangements
  arrangement_notes?: string;
  performance_notes?: string;
  intro_notes?: string;
  outro_notes?: string;
  transition_notes?: string;
  
  // Status flags
  is_optional: boolean;
  is_highlight: boolean;
  requires_preparation: boolean;
  
  // Post-performance analytics
  actual_duration?: number;
  performance_rating?: number; // 1-5
  audience_response?: string;
  technical_notes?: string;
  
  created_at: string;
  updated_at: string;
  
  // Related data
  song?: Song;
}

export interface SetlistTemplate {
  id: string;
  name: string;
  description?: string;
  user_id?: string; // null for system templates
  
  // Template configuration
  default_event_type: EventType;
  default_duration?: number;
  default_sections: TemplateSection[];
  
  // Metadata
  is_system_template: boolean;
  is_public: boolean;
  usage_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface TemplateSection {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  sort_order: number;
  estimated_duration?: number;
  is_required: boolean;
  default_song_count?: number;
}

export interface SetlistCollaborator {
  id: string;
  setlist_id: string;
  user_id: string;
  permission_level: PermissionLevel;
  
  // Band role coordination (NEW)
  band_role?: string; // lead, rhythm, bass, drums, keys, vocals, sound_engineer, etc.
  instrument?: string; // primary instrument
  is_lead_for_role?: boolean; // lead guitarist, lead vocalist, etc.
  backup_roles?: string[]; // additional roles this person can fill
  
  // External sharing capabilities (NEW)
  external_access_level?: string; // full, limited, view_only, none
  can_download_files?: boolean;
  can_view_contact_info?: boolean;
  external_notes?: string; // notes for external collaborators
  
  // Performance preparation (NEW)
  preparation_tasks?: string[]; // assigned preparation task IDs
  task_completion_status?: Record<string, boolean>; // task_id -> completion status
  
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  
  // User info (populated)
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SetlistPerformance {
  id: string;
  setlist_id: string;
  venue: string;
  event_date: string;
  actual_duration?: number;
  audience_size?: number;
  performance_notes?: string;
  overall_rating?: number; // 1-5
  
  created_at: string;
  updated_at: string;
  
  // Performance songs
  song_performances?: SetlistSongPerformance[];
}

export interface SetlistSongPerformance {
  id: string;
  performance_id: string;
  setlist_song_id: string;
  actual_key?: string;
  actual_tempo?: number;
  actual_duration?: number;
  performance_rating?: number;
  audience_response?: string;
  technical_notes?: string;
}

// Basic types
export interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  duration?: number;
  content?: string; // ChordPro content
  tags: string[];
}

// Enums
export type EventType = 
  | 'performance' 
  | 'rehearsal' 
  | 'worship' 
  | 'concert' 
  | 'wedding' 
  | 'lesson' 
  | 'jam' 
  | 'recording' 
  | 'other';

export type SetlistStatus = 
  | 'draft' 
  | 'ready' 
  | 'in_progress' 
  | 'completed' 
  | 'archived';

export type PermissionLevel = 
  | 'owner' 
  | 'admin' 
  | 'editor' 
  | 'commenter' 
  | 'viewer';

// API Request/Response types
export interface CreateSetlistRequest {
  name: string;
  description?: string;
  event_type?: EventType;
  venue?: string;
  event_date?: string;
  estimated_duration?: number;
  template_id?: string;
  is_public?: boolean;
  tags?: string[];
  notes?: string;
}

export interface UpdateSetlistRequest {
  name?: string;
  description?: string;
  event_type?: EventType;
  venue?: string;
  event_date?: string;
  estimated_duration?: number;
  status?: SetlistStatus;
  is_public?: boolean;
  tags?: string[];
  notes?: string;
}

export interface AddSongToSetlistRequest {
  song_id: string;
  sort_order?: number;
  section?: string;
  performance_key?: string;
  performance_tempo?: number;
  performance_capo?: number;
  estimated_duration?: number;
  arrangement_notes?: string;
  performance_notes?: string;
  intro_notes?: string;
  outro_notes?: string;
  is_optional?: boolean;
  is_highlight?: boolean;
  requires_preparation?: boolean;
}

export interface UpdateSetlistSongRequest {
  sort_order?: number;
  section?: string;
  performance_key?: string;
  performance_tempo?: number;
  performance_capo?: number;
  estimated_duration?: number;
  arrangement_notes?: string;
  performance_notes?: string;
  intro_notes?: string;
  outro_notes?: string;
  transition_notes?: string;
  is_optional?: boolean;
  is_highlight?: boolean;
  requires_preparation?: boolean;
}

export interface ReorderSongsRequest {
  song_orders: Array<{
    setlist_song_id: string;
    new_sort_order: number;
    section?: string;
  }>;
}

// Search and filtering
export interface SetlistSearchParams {
  status?: SetlistStatus;
  event_type?: EventType;
  is_template?: boolean;
  include_shared?: boolean;
  include_public?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'name' | 'created_at' | 'updated_at' | 'last_performed';
  order?: 'asc' | 'desc';
}

export interface SetlistSearchResult {
  setlists: Setlist[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Drag and drop types
export interface DraggedSong {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  duration?: number;
  tags: string[];
}

export interface DropTargetSection {
  section: string;
  position: number;
}

export interface DragDropContext {
  draggedSong: DraggedSong | null;
  dropTarget: DropTargetSection | null;
  isDragging: boolean;
}

// Bulk operations
export interface BulkAddSongsRequest {
  songs: Array<{
    song_id: string;
    section?: string;
    performance_key?: string;
    performance_tempo?: number;
    performance_capo?: number;
    is_optional?: boolean;
    is_highlight?: boolean;
  }>;
  start_position?: number;
}

export interface BulkOperation {
  type: 'add' | 'remove' | 'reorder' | 'update';
  songs: string[]; // setlist_song_ids or song_ids
  data?: any;
}

// UI state types
export interface SetlistBuilderState {
  selectedSongs: string[];
  editingSection: string | null;
  showPreview: boolean;
  previewMode: 'timing' | 'flow' | 'print';
  filterSection: string | null;
  searchQuery: string;
  sortBy: 'order' | 'title' | 'duration' | 'key';
  sortDirection: 'asc' | 'desc';
}

// Performance analysis
export interface SetlistAnalysis {
  total_duration: number;
  sections: SectionAnalysis[];
  key_transitions: KeyTransition[];
  tempo_flow: TempoFlow[];
  energy_curve: EnergyPoint[];
  recommendations: string[];
}

export interface SectionAnalysis {
  section: string;
  song_count: number;
  duration: number;
  average_tempo: number;
  key_distribution: Record<string, number>;
  energy_level: 'low' | 'medium' | 'high';
}

export interface KeyTransition {
  from_song: string;
  to_song: string;
  from_key: string;
  to_key: string;
  difficulty: 'easy' | 'moderate' | 'difficult';
  suggestion?: string;
}

export interface TempoFlow {
  position: number;
  tempo: number;
  change: number; // Percentage change from previous
}

export interface EnergyPoint {
  position: number;
  energy: number; // 1-10 scale
  factor: string; // What contributes to energy level
}

// NEW: Comment and annotation system
export interface SetlistComment {
  id: string;
  setlist_id: string;
  setlist_song_id?: string; // null for general comments
  user_id: string;
  parent_comment_id?: string; // for threaded comments
  
  // Comment content
  content: string;
  comment_type: 'general' | 'suggestion' | 'arrangement' | 'technical' | 'performance';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Status tracking
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  
  // Positioning for inline comments
  target_element?: string; // song_title, section, lyrics, chords, etc.
  element_position?: number; // line number, character position, etc.
  
  // Visibility and permissions
  is_private: boolean;
  visible_to_roles: string[]; // specific roles that can see this comment
  
  created_at: string;
  updated_at: string;
  
  // Populated fields
  author?: {
    id: string;
    email: string;
    display_name?: string;
  };
  replies?: SetlistComment[];
}

// NEW: Performance preparation tasks
export interface SetlistTask {
  id: string;
  setlist_id: string;
  setlist_song_id?: string; // null for general tasks
  assigned_to?: string; // null for unassigned
  created_by: string;
  
  // Task details
  title: string;
  description?: string;
  task_type: 'general' | 'practice' | 'setup' | 'coordination' | 'technical' | 'review';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Status and tracking
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
  estimated_duration?: number; // minutes
  actual_duration?: number; // minutes
  
  // Scheduling
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  
  // Dependencies and coordination
  depends_on_tasks: string[]; // task IDs this depends on
  role_requirements: string[]; // roles needed for this task
  
  // Notes and updates
  notes?: string;
  completion_notes?: string;
  
  created_at: string;
  updated_at: string;
  
  // Populated fields
  assignee?: {
    id: string;
    email: string;
    display_name?: string;
  };
  creator?: {
    id: string;
    email: string;
    display_name?: string;
  };
}

// NEW: External sharing types
export interface ExternalShare {
  id: string;
  setlist_id: string;
  share_type: 'venue' | 'sound_engineer' | 'guest_musician' | 'manager' | 'other';
  share_url: string;
  access_level: 'view_only' | 'limited' | 'full';
  expires_at?: string;
  password_protected: boolean;
  
  // Contact information
  recipient_name?: string;
  recipient_email?: string;
  recipient_organization?: string;
  
  // Access controls
  can_download_setlist: boolean;
  can_view_contact_info: boolean;
  can_leave_comments: boolean;
  allowed_sections: string[]; // sections they can access
  
  created_at: string;
  created_by: string;
  last_accessed?: string;
  access_count: number;
}

// NEW: Mobile coordination types
export interface MobileCoordinationState {
  setlist_id: string;
  current_song?: string; // currently playing/rehearsing song ID
  is_live: boolean; // is this a live performance or rehearsal
  tempo_adjustments: Record<string, number>; // song_id -> tempo adjustment
  key_changes: Record<string, string>; // song_id -> new key
  skipped_songs: string[]; // song IDs that were skipped
  coordinator_user_id?: string; // who is leading the coordination
}

// NEW: Band role types
export type BandRole = 
  | 'lead_guitar' 
  | 'rhythm_guitar' 
  | 'bass' 
  | 'drums' 
  | 'keys' 
  | 'lead_vocals' 
  | 'backing_vocals' 
  | 'sound_engineer' 
  | 'stage_manager' 
  | 'music_director' 
  | 'other';

export interface BandMember {
  user_id: string;
  name: string;
  email: string;
  primary_role: BandRole;
  backup_roles: BandRole[];
  instruments: string[];
  is_lead: boolean;
  availability_status: 'available' | 'limited' | 'unavailable';
  preparation_status: 'ready' | 'preparing' | 'needs_practice';
}