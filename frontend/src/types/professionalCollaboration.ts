// Professional Collaboration Workspace Types
export interface CollaborationRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'album' | 'tour' | 'lesson_plan' | 'general';
  creator_id: number;
  access_mode: 'invite-only' | 'link-access' | 'public';
  max_participants: number;
  invitation_code?: string;
  
  // Professional features
  has_resource_library: boolean;
  has_meeting_scheduler: boolean;
  has_calendar_integration: boolean;
  has_progress_tracking: boolean;
  has_chat_enabled: boolean;
  
  // Room state
  status: 'active' | 'archived' | 'suspended';
  is_persistent: boolean;
  last_activity?: string;
  
  // Settings and metadata
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Extended data (when included)
  participants?: RoomParticipant[];
  resources?: RoomResource[];
  user_role?: string;
  participant_count?: number;
  recent_activity?: RoomChatMessage[];
  upcoming_meetings?: RoomMeeting[];
}

export interface RoomParticipant {
  id: number;
  room_id: string;
  user_id: number;
  role: 'band_leader' | 'member' | 'guest' | 'observer';
  status: 'active' | 'inactive' | 'suspended';
  invited_by?: number;
  title?: string;
  department?: string;
  joined_at: string;
  last_seen: string;
  total_time: number;
  contribution_score: number;
  notifications_enabled: boolean;
  calendar_integration_enabled: boolean;
  user?: {
    id: number;
    email: string;
    display_name?: string;
  };
}

export interface RoomResource {
  id: number;
  room_id: string;
  name: string;
  description?: string;
  resource_type: 'document' | 'audio' | 'video' | 'chord_chart' | 'setlist';
  content_url?: string;
  content_data?: unknown;
  file_size?: number;
  mime_type?: string;
  category?: string;
  tags: string[];
  access_level: 'room' | 'band_leader_only' | 'member_plus';
  is_shared_externally: boolean;
  created_by: number;
  version: number;
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface RoomMeeting {
  id: number;
  room_id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  agenda: AgendaItem[];
  location?: string;
  meeting_url?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by: number;
  max_attendees?: number;
  
  // Calendar integration
  google_calendar_event_id?: string;
  outlook_calendar_event_id?: string;
  ical_uid?: string;
  
  // Meeting outcomes
  meeting_notes?: string;
  action_items: ActionItem[];
  decisions_made: Decision[];
  next_meeting_date?: string;
  
  created_at: string;
  updated_at: string;
  attendees?: MeetingAttendee[];
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  presenter?: string;
  type: 'discussion' | 'presentation' | 'decision' | 'action' | 'break';
  order: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assigned_to?: number;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export interface Decision {
  id: string;
  title: string;
  description?: string;
  decision_type: 'unanimous' | 'majority' | 'executive' | 'consensus';
  outcome: string;
  decided_by: number[];
  created_at: string;
}

export interface MeetingAttendee {
  id: number;
  meeting_id: number;
  user_id: number;
  rsvp_status: 'pending' | 'accepted' | 'declined' | 'tentative';
  is_required: boolean;
  attended?: boolean;
  join_time?: string;
  leave_time?: string;
  calendar_reminder_sent: boolean;
  calendar_updated: boolean;
  invited_at: string;
  responded_at?: string;
}

export interface RoomChatMessage {
  id: number;
  room_id: string;
  sender_id: number;
  message_type: 'text' | 'file' | 'link' | 'system' | 'announcement';
  content: string;
  formatted_content?: string;
  parent_message_id?: number;
  thread_id?: string;
  attachments: ChatAttachment[];
  mentions: number[];
  reactions: Record<string, number[]>;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  edited_at?: string;
  created_at: string;
  replies?: RoomChatMessage[];
}

export interface ChatAttachment {
  id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  url: string;
  thumbnail_url?: string;
}

// Request/Response types
export interface CreateRoomRequest {
  name: string;
  description?: string;
  room_type: 'album' | 'tour' | 'lesson_plan' | 'general';
  access_mode?: 'invite-only' | 'link-access' | 'public';
  max_participants?: number;
  has_resource_library?: boolean;
  has_meeting_scheduler?: boolean;
  has_calendar_integration?: boolean;
  has_progress_tracking?: boolean;
  has_chat_enabled?: boolean;
}

export interface AddParticipantRequest {
  email: string;
  role?: 'band_leader' | 'member' | 'guest' | 'observer';
  title?: string;
  department?: string;
}

export interface CreateResourceRequest {
  name: string;
  description?: string;
  resource_type: 'document' | 'audio' | 'video' | 'chord_chart' | 'setlist';
  content_url?: string;
  content_data?: unknown;
  category?: string;
  tags?: string[];
  access_level?: 'room' | 'band_leader_only' | 'member_plus';
}

export interface ScheduleMeetingRequest {
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes?: number;
  timezone?: string;
  agenda?: Omit<AgendaItem, 'id'>[];
  location?: string;
  meeting_url?: string;
  attendee_emails?: string[];
  create_calendar_events?: boolean;
  send_notifications?: boolean;
}

export interface SendChatMessageRequest {
  content: string;
  message_type?: 'text' | 'file' | 'link' | 'announcement';
  parent_message_id?: number;
  mentions?: number[];
  attachments?: Omit<ChatAttachment, 'id'>[];
}

export interface RoomFilters {
  room_type?: string;
  status?: string;
  access_mode?: string;
  has_meetings?: boolean;
}

export interface RoomListResponse {
  rooms: CollaborationRoom[];
  total_count: number;
  limit: number;
  offset: number;
}

// Calendar Integration Types
export interface CalendarIntegration {
  provider: 'google' | 'outlook';
  is_connected: boolean;
  last_sync?: string;
  sync_enabled: boolean;
  default_calendar_id?: string;
  auto_create_events: boolean;
  reminder_settings: {
    email_reminder_minutes: number[];
    popup_reminder_minutes: number[];
  };
}

export interface CalendarEvent {
  id: string;
  provider: 'google' | 'outlook';
  external_id: string;
  meeting_id?: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location?: string;
  attendees: string[];
  created_at: string;
  updated_at: string;
}

// Professional Template Types
export interface ProfessionalTemplate {
  id: string;
  name: string;
  description: string;
  room_type: 'album' | 'tour' | 'lesson_plan';
  category: string;
  subcategory?: string;
  
  // Template configuration
  default_roles: string[];
  max_participants: number;
  features: {
    resource_library: boolean;
    meeting_scheduler: boolean;
    calendar_integration: boolean;
    progress_tracking: boolean;
    chat_enabled: boolean;
  };
  
  // Professional settings
  workflow_stages: WorkflowStage[];
  default_resources: TemplateResource[];
  meeting_templates: MeetingTemplate[];
  role_permissions: Record<string, string[]>;
  
  // Metadata
  is_system: boolean;
  is_public: boolean;
  usage_count: number;
  rating_average?: number;
  rating_count?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  required_roles: string[];
  estimated_duration_days?: number;
  deliverables: string[];
  milestones: string[];
}

export interface TemplateResource {
  name: string;
  resource_type: 'document' | 'audio' | 'video' | 'chord_chart' | 'setlist';
  description?: string;
  category?: string;
  is_required: boolean;
  access_level: 'room' | 'band_leader_only' | 'member_plus';
}

export interface MeetingTemplate {
  name: string;
  description?: string;
  duration_minutes: number;
  agenda_items: Omit<AgendaItem, 'id'>[];
  required_attendees: string[];
  recurrence_pattern?: string;
}

// Progress Tracking Types
export interface ProjectProgress {
  room_id: string;
  overall_progress: number; // 0-100
  current_stage: string;
  stages: StageProgress[];
  milestones: MilestoneProgress[];
  metrics: ProgressMetrics;
  last_updated: string;
}

export interface StageProgress {
  stage_id: string;
  name: string;
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  estimated_completion?: string;
  actual_completion?: string;
  assigned_to: number[];
}

export interface MilestoneProgress {
  milestone_id: string;
  name: string;
  target_date: string;
  actual_date?: string;
  status: 'upcoming' | 'on_track' | 'at_risk' | 'completed' | 'overdue';
  completion_percentage: number;
}

export interface ProgressMetrics {
  total_tasks: number;
  completed_tasks: number;
  total_meetings: number;
  attended_meetings: number;
  total_resources: number;
  active_participants: number;
  collaboration_score: number; // 0-100
  velocity: number; // tasks completed per week
}

// Dashboard Types
export interface ActivityDashboard {
  room_id: string;
  time_period: 'day' | 'week' | 'month' | 'quarter';
  summary: ActivitySummary;
  charts: DashboardChart[];
  recent_activities: RecentActivity[];
  participant_stats: ParticipantStats[];
  upcoming_events: UpcomingEvent[];
}

export interface ActivitySummary {
  total_messages: number;
  total_meetings: number;
  total_resources: number;
  active_participants: number;
  progress_change: number; // percentage change
  collaboration_score: number;
}

export interface DashboardChart {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  data: Record<string, unknown>; // Chart.js compatible data
  options?: Record<string, unknown>; // Chart.js compatible options
}

export interface RecentActivity {
  id: string;
  type: 'message' | 'meeting' | 'resource' | 'participant_join' | 'milestone';
  title: string;
  description?: string;
  user_id: number;
  user_name: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ParticipantStats {
  user_id: number;
  user_name: string;
  role: string;
  contribution_score: number;
  messages_sent: number;
  meetings_attended: number;
  resources_created: number;
  last_active: string;
}

export interface UpcomingEvent {
  type: 'meeting' | 'milestone' | 'deadline';
  title: string;
  date: string;
  description?: string;
  participants?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Advanced Project Management Types

export interface Project {
  id: number;
  name: string;
  description?: string;
  project_type: 'album' | 'tour' | 'lesson_plan' | 'general';
  owner_id: number;
  collaboration_room_id?: number;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  overall_progress: number;
  is_template: boolean;
  template_id?: number;
  is_public: boolean;
  tags: string[];
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
  stats?: ProjectStats;
}

export interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  parent_task_id?: number;
  setlist_id?: number;
  milestone_id?: number;
  assigned_to?: number;
  created_by: number;
  title: string;
  description?: string;
  task_type: 'songwriting' | 'arrangement' | 'recording' | 'rehearsal' | 'performance' | 'administrative' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  progress_percentage: number;
  estimated_hours?: number;
  actual_hours: number;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  depends_on_tasks: number[];
  blocks_tasks: number[];
  watchers: number[];
  tags: string[];
  created_at: string;
  updated_at: string;
  time_entries?: TimeEntry[];
  // Timeline specific properties
  duration_days?: number;
  is_overdue?: boolean;
}

export interface ProjectMilestone {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  milestone_type: 'deliverable' | 'checkpoint' | 'deadline' | 'release';
  target_date: string;
  actual_date?: string;
  status: 'upcoming' | 'on_track' | 'at_risk' | 'completed' | 'overdue';
  completion_percentage: number;
  depends_on_milestones: number[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags: string[];
  deliverables: string[];
  created_at: string;
  updated_at: string;
  is_overdue?: boolean;
}

export interface TimeEntry {
  id: number;
  project_id: number;
  task_id?: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  activity_type: 'work' | 'meeting' | 'research' | 'practice' | 'review';
  is_billable: boolean;
  is_manual_entry: boolean;
  is_running: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: number;
  name: string;
  description?: string;
  template_type: 'album_production' | 'tour_management' | 'lesson_plan';
  category: string;
  stages: TemplateStage[];
  default_tasks: TemplateTask[];
  default_milestones: TemplateMilestone[];
  estimated_duration_days?: number;
  is_public: boolean;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  estimated_days: number;
  dependencies: string[];
}

export interface TemplateTask {
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  estimated_hours?: number;
  days_from_start?: number;
  stage_id?: string;
}

export interface TemplateMilestone {
  name: string;
  description?: string;
  milestone_type: string;
  priority: string;
  days_from_start?: number;
  days_before_end?: number;
}

// Timeline and Gantt Chart Types

export interface TimelineData {
  project: Project;
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  dependencies: TaskDependency[];
}

export interface TaskDependency {
  from: number;
  to: number;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

export interface GanttChartData {
  tasks: GanttTask[];
  milestones: GanttMilestone[];
  timeline: {
    start_date: string;
    end_date: string;
    view_mode: 'day' | 'week' | 'month';
  };
}

export interface GanttTask {
  id: number;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: number[];
  resource?: string;
  type: 'task' | 'project' | 'milestone';
  custom_class?: string;
}

export interface GanttMilestone {
  id: number;
  name: string;
  date: string;
  type: 'milestone';
  custom_class?: string;
}

// Resource Allocation Types

export interface ResourceAllocation {
  user_id: number;
  user_name: string;
  role: string;
  allocated_hours_per_week: number;
  current_workload: number;
  availability: ResourceAvailability[];
  tasks: ProjectTask[];
  utilization_percentage: number;
}

export interface ResourceAvailability {
  date: string;
  available_hours: number;
  allocated_hours: number;
  is_working_day: boolean;
}

export interface WorkloadReport {
  period_start: string;
  period_end: string;
  team_members: ResourceAllocation[];
  project_summary: {
    total_allocated_hours: number;
    total_logged_hours: number;
    efficiency_rating: number;
  };
}

// Notification System Types

export interface ProjectNotification {
  id: string;
  type: 'task_assigned' | 'task_due' | 'milestone_approaching' | 'project_status_change' | 'time_reminder';
  title: string;
  message: string;
  project_id: number;
  task_id?: number;
  milestone_id?: number;
  user_id: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export interface NotificationSettings {
  task_assignments: boolean;
  task_due_reminders: boolean;
  milestone_alerts: boolean;
  project_status_changes: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  reminder_advance_days: number;
}

// API Request/Response Types

export interface CreateProjectRequest {
  name: string;
  description?: string;
  project_type: 'album' | 'tour' | 'lesson_plan' | 'general';
  start_date?: string;
  target_end_date?: string;
  collaboration_room_id?: number;
  template_id?: number;
  tags?: string[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  task_type?: string;
  priority?: string;
  assigned_to?: number;
  milestone_id?: number;
  setlist_id?: number;
  estimated_hours?: number;
  due_date?: string;
  parent_task_id?: number;
  depends_on_tasks?: number[];
  tags?: string[];
}

export interface CreateTimeEntryRequest {
  task_id?: number;
  description?: string;
  activity_type?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  is_manual_entry?: boolean;
}

export interface ProjectFilters {
  project_type?: string;
  status?: string;
  owner_id?: number;
  include_stats?: boolean;
}

export interface TaskFilters {
  status?: string;
  assigned_to?: number;
  priority?: string;
  task_type?: string;
  milestone_id?: number;
  overdue_only?: boolean;
}

export default CollaborationRoom;