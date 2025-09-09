/**
 * Professional Collaboration Workspace Service
 * Handles room management, resources, meetings, and calendar integration
 */

import type {
  CollaborationRoom,
  CreateRoomRequest,
  AddParticipantRequest,
  CreateResourceRequest,
  ScheduleMeetingRequest,
  SendChatMessageRequest,
  RoomFilters,
  RoomListResponse,
  CalendarIntegration,
  ProfessionalTemplate,
  ProjectProgress,
  ActivityDashboard,
  Project,
  ProjectTask,
  ProjectMilestone,
  TimeEntry,
  ProjectTemplate,
  TimelineData,
  GanttChartData,
  GanttTask,
  GanttMilestone,
  ResourceAllocation,
  WorkloadReport,
  CreateProjectRequest,
  CreateTaskRequest,
  CreateTimeEntryRequest,
  ProjectFilters,
  TaskFilters
} from '../types/professionalCollaboration';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

class ProfessionalCollaborationService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Room Management
  async createRoom(roomData: CreateRoomRequest): Promise<CollaborationRoom> {
    const response = await this.makeRequest<CollaborationRoom>(
      '/api/v1/collaboration-rooms',
      {
        method: 'POST',
        body: JSON.stringify(roomData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to create room');
    }
    
    return response.data;
  }

  async getRooms(filters: RoomFilters = {}, limit = 20, offset = 0): Promise<RoomListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ),
    });

    const response = await this.makeRequest<RoomListResponse>(
      `/api/v1/collaboration-rooms?${params}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch rooms');
    }
    
    return response.data;
  }

  async getRoom(roomId: string): Promise<CollaborationRoom> {
    const response = await this.makeRequest<CollaborationRoom>(
      `/api/v1/collaboration-rooms/${roomId}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch room');
    }
    
    return response.data;
  }

  async updateRoom(
    roomId: string, 
    updates: Partial<CreateRoomRequest>
  ): Promise<CollaborationRoom> {
    const response = await this.makeRequest<CollaborationRoom>(
      `/api/v1/collaboration-rooms/${roomId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update room');
    }
    
    return response.data;
  }

  async deleteRoom(roomId: string): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}`,
      { method: 'DELETE' }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete room');
    }
  }

  // Participant Management
  async addParticipant(
    roomId: string, 
    participantData: AddParticipantRequest
  ): Promise<any> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/participants`,
      {
        method: 'POST',
        body: JSON.stringify(participantData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to add participant');
    }
    
    return response.data;
  }

  async updateParticipant(
    roomId: string,
    participantId: number,
    updates: Partial<AddParticipantRequest>
  ): Promise<any> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/participants/${participantId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update participant');
    }
    
    return response.data;
  }

  async removeParticipant(roomId: string, participantId: number): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/participants/${participantId}`,
      { method: 'DELETE' }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to remove participant');
    }
  }

  // Resource Management
  async createResource(
    roomId: string, 
    resourceData: CreateResourceRequest
  ): Promise<any> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/resources`,
      {
        method: 'POST',
        body: JSON.stringify(resourceData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to create resource');
    }
    
    return response.data;
  }

  async getResources(
    roomId: string,
    category?: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(category && { category }),
    });

    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/resources?${params}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch resources');
    }
    
    return response.data;
  }

  async updateResource(
    roomId: string,
    resourceId: number,
    updates: Partial<CreateResourceRequest>
  ): Promise<any> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/resources/${resourceId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update resource');
    }
    
    return response.data;
  }

  async deleteResource(roomId: string, resourceId: number): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/resources/${resourceId}`,
      { method: 'DELETE' }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete resource');
    }
  }

  // Meeting Management
  async scheduleMeeting(
    roomId: string, 
    meetingData: ScheduleMeetingRequest
  ): Promise<any> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/meetings`,
      {
        method: 'POST',
        body: JSON.stringify(meetingData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to schedule meeting');
    }
    
    return response.data;
  }

  async getMeetings(
    roomId: string,
    status?: string,
    limit = 20,
    offset = 0
  ): Promise<any> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(status && { status }),
    });

    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/meetings?${params}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch meetings');
    }
    
    return response.data;
  }

  async updateMeeting(
    roomId: string,
    meetingId: number,
    updates: Partial<ScheduleMeetingRequest>
  ): Promise<any> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/meetings/${meetingId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update meeting');
    }
    
    return response.data;
  }

  async deleteMeeting(roomId: string, meetingId: number): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/meetings/${meetingId}`,
      { method: 'DELETE' }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete meeting');
    }
  }

  async respondToMeeting(
    roomId: string,
    meetingId: number,
    rsvpStatus: 'accepted' | 'declined' | 'tentative'
  ): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/meetings/${meetingId}/rsvp`,
      {
        method: 'POST',
        body: JSON.stringify({ rsvp_status: rsvpStatus }),
      }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to respond to meeting');
    }
  }

  // Chat Management
  async sendChatMessage(
    roomId: string, 
    messageData: SendChatMessageRequest
  ): Promise<any> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/chat`,
      {
        method: 'POST',
        body: JSON.stringify(messageData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to send message');
    }
    
    return response.data;
  }

  async getChatMessages(
    roomId: string,
    limit = 50,
    offset = 0,
    threadId?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(threadId && { thread_id: threadId }),
    });

    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/chat?${params}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch chat messages');
    }
    
    return response.data;
  }

  async addMessageReaction(
    roomId: string,
    messageId: number,
    emoji: string
  ): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/chat/${messageId}/reactions`,
      {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to add reaction');
    }
  }

  // Calendar Integration
  async setupCalendarIntegration(
    provider: 'google' | 'outlook',
    credentials: any
  ): Promise<CalendarIntegration> {
    const response = await this.makeRequest<CalendarIntegration>(
      '/api/v1/calendar/setup',
      {
        method: 'POST',
        body: JSON.stringify({ provider, credentials }),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to setup calendar integration');
    }
    
    return response.data;
  }

  async getCalendarIntegration(): Promise<CalendarIntegration | null> {
    try {
      const response = await this.makeRequest<CalendarIntegration>(
        '/api/v1/calendar/integration'
      );
      
      if (response.status === 'success' && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      // Return null if no integration is set up
      return null;
    }
  }

  async syncCalendar(): Promise<void> {
    const response = await this.makeRequest(
      '/api/v1/calendar/sync',
      { method: 'POST' }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to sync calendar');
    }
  }

  // Professional Templates
  async getProfessionalTemplates(
    roomType?: 'album' | 'tour' | 'lesson_plan'
  ): Promise<ProfessionalTemplate[]> {
    const params = new URLSearchParams();
    if (roomType) {
      params.append('room_type', roomType);
    }

    const response = await this.makeRequest<ProfessionalTemplate[]>(
      `/api/v1/professional-templates?${params}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch templates');
    }
    
    return response.data;
  }

  async createRoomFromTemplate(
    templateId: string,
    roomData: Omit<CreateRoomRequest, 'room_type'>
  ): Promise<CollaborationRoom> {
    const response = await this.makeRequest<CollaborationRoom>(
      `/api/v1/professional-templates/${templateId}/create-room`,
      {
        method: 'POST',
        body: JSON.stringify(roomData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to create room from template');
    }
    
    return response.data;
  }

  // Progress Tracking
  async getProjectProgress(roomId: string): Promise<ProjectProgress> {
    const response = await this.makeRequest<ProjectProgress>(
      `/api/v1/collaboration-rooms/${roomId}/progress`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch project progress');
    }
    
    return response.data;
  }

  async updateProjectProgress(
    roomId: string,
    progressData: Partial<ProjectProgress>
  ): Promise<ProjectProgress> {
    const response = await this.makeRequest<ProjectProgress>(
      `/api/v1/collaboration-rooms/${roomId}/progress`,
      {
        method: 'PATCH',
        body: JSON.stringify(progressData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update project progress');
    }
    
    return response.data;
  }

  // Activity Dashboard
  async getActivityDashboard(
    roomId: string,
    timePeriod: 'day' | 'week' | 'month' | 'quarter' = 'week'
  ): Promise<ActivityDashboard> {
    const response = await this.makeRequest<ActivityDashboard>(
      `/api/v1/collaboration-rooms/${roomId}/dashboard?period=${timePeriod}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch activity dashboard');
    }
    
    return response.data;
  }

  // Utility Methods
  async joinRoomByCode(invitationCode: string): Promise<CollaborationRoom> {
    const response = await this.makeRequest<CollaborationRoom>(
      '/api/v1/collaboration-rooms/join',
      {
        method: 'POST',
        body: JSON.stringify({ invitation_code: invitationCode }),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to join room');
    }
    
    return response.data;
  }

  async leaveRoom(roomId: string): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/collaboration-rooms/${roomId}/leave`,
      { method: 'POST' }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to leave room');
    }
  }

  async generateInviteLink(roomId: string): Promise<string> {
    const response = await this.makeRequest<{ invite_link: string }>(
      `/api/v1/collaboration-rooms/${roomId}/invite-link`,
      { method: 'POST' }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to generate invite link');
    }
    
    return response.data.invite_link;
  }

  async exportRoomData(roomId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/collaboration-rooms/${roomId}/export?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to export room data');
    }
    
    return response.blob();
  }

  // Advanced Project Management Methods

  // Project Management
  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    const response = await this.makeRequest<Project>(
      '/api/v1/projects',
      {
        method: 'POST',
        body: JSON.stringify(projectData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to create project');
    }
    
    return response.data;
  }

  async listProjects(filters: ProjectFilters = {}): Promise<{ projects: Project[]; pagination: any }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await this.makeRequest<{ projects: Project[]; pagination: any }>(
      `/api/v1/projects?${params.toString()}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch projects');
    }
    
    return response.data;
  }

  async getProject(projectId: number): Promise<Project> {
    const response = await this.makeRequest<Project>(
      `/api/v1/projects/${projectId}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch project');
    }
    
    return response.data;
  }

  async updateProject(projectId: number, updateData: Partial<CreateProjectRequest>): Promise<Project> {
    const response = await this.makeRequest<Project>(
      `/api/v1/projects/${projectId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update project');
    }
    
    return response.data;
  }

  async deleteProject(projectId: number): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/projects/${projectId}`,
      {
        method: 'DELETE',
      }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete project');
    }
  }

  // Task Management
  async createProjectTask(projectId: number, taskData: CreateTaskRequest): Promise<ProjectTask> {
    const response = await this.makeRequest<ProjectTask>(
      `/api/v1/projects/${projectId}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify(taskData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to create task');
    }
    
    return response.data;
  }

  async listProjectTasks(projectId: number, filters: TaskFilters = {}): Promise<ProjectTask[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await this.makeRequest<{ tasks: ProjectTask[] }>(
      `/api/v1/projects/${projectId}/tasks?${params.toString()}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch tasks');
    }
    
    return response.data.tasks;
  }

  async updateProjectTask(projectId: number, taskId: number, updateData: Partial<CreateTaskRequest>): Promise<ProjectTask> {
    const response = await this.makeRequest<ProjectTask>(
      `/api/v1/projects/${projectId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update task');
    }
    
    return response.data;
  }

  async deleteProjectTask(projectId: number, taskId: number): Promise<void> {
    const response = await this.makeRequest(
      `/api/v1/projects/${projectId}/tasks/${taskId}`,
      {
        method: 'DELETE',
      }
    );
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete task');
    }
  }

  // Timeline and Gantt Chart
  async getProjectTimeline(projectId: number): Promise<TimelineData> {
    const response = await this.makeRequest<TimelineData>(
      `/api/v1/projects/${projectId}/timeline`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch timeline data');
    }
    
    return response.data;
  }

  // Milestone Management
  async createProjectMilestone(projectId: number, milestoneData: Omit<ProjectMilestone, 'id' | 'project_id' | 'created_at' | 'updated_at'>): Promise<ProjectMilestone> {
    const response = await this.makeRequest<ProjectMilestone>(
      `/api/v1/projects/${projectId}/milestones`,
      {
        method: 'POST',
        body: JSON.stringify(milestoneData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to create milestone');
    }
    
    return response.data;
  }

  async listProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    const response = await this.makeRequest<{ milestones: ProjectMilestone[] }>(
      `/api/v1/projects/${projectId}/milestones`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch milestones');
    }
    
    return response.data.milestones;
  }

  // Time Tracking
  async startTimeTracking(projectId: number, timeData: CreateTimeEntryRequest = {}): Promise<TimeEntry> {
    const response = await this.makeRequest<TimeEntry>(
      `/api/v1/projects/${projectId}/time-entries`,
      {
        method: 'POST',
        body: JSON.stringify(timeData),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to start time tracking');
    }
    
    return response.data;
  }

  async stopTimeTracking(projectId: number): Promise<TimeEntry> {
    const response = await this.makeRequest<TimeEntry>(
      `/api/v1/projects/${projectId}/time-entries`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to stop time tracking');
    }
    
    return response.data;
  }

  async getTimeEntries(projectId: number, filters: { task_id?: number; user_id?: number; start_date?: string; end_date?: string } = {}): Promise<TimeEntry[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await this.makeRequest<{ time_entries: TimeEntry[] }>(
      `/api/v1/projects/${projectId}/time-entries?${params.toString()}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch time entries');
    }
    
    return response.data.time_entries;
  }

  // Project Templates
  async getProjectTemplates(filters: { template_type?: string; category?: string; locale?: string } = {}): Promise<ProjectTemplate[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await this.makeRequest<{ templates: ProjectTemplate[] }>(
      `/api/v1/project-templates?${params.toString()}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch project templates');
    }
    
    return response.data.templates;
  }

  // Resource Allocation and Workload
  async getResourceAllocation(projectId: number): Promise<ResourceAllocation[]> {
    const response = await this.makeRequest<{ allocations: ResourceAllocation[] }>(
      `/api/v1/projects/${projectId}/resource-allocation`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch resource allocation');
    }
    
    return response.data.allocations;
  }

  async getWorkloadReport(projectId?: number, startDate?: string, endDate?: string): Promise<WorkloadReport> {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', String(projectId));
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await this.makeRequest<WorkloadReport>(
      `/api/v1/workload-report?${params.toString()}`
    );
    
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to fetch workload report');
    }
    
    return response.data;
  }

  // Utility Methods for Timeline Calculations
  calculateGanttData(timelineData: TimelineData): GanttChartData {
    const ganttTasks: GanttTask[] = timelineData.tasks.map(task => ({
      id: task.id,
      name: task.title,
      start: task.start_date || new Date().toISOString(),
      end: task.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      progress: task.progress_percentage,
      dependencies: task.depends_on_tasks,
      resource: task.assigned_to ? `User ${task.assigned_to}` : undefined,
      type: 'task',
      custom_class: task.is_overdue ? 'overdue' : task.status
    }));

    const ganttMilestones: GanttMilestone[] = timelineData.milestones.map(milestone => ({
      id: milestone.id,
      name: milestone.name,
      date: milestone.target_date,
      type: 'milestone',
      custom_class: milestone.is_overdue ? 'overdue' : milestone.status
    }));

    // Calculate timeline bounds
    const allDates = [
      ...ganttTasks.map(t => t.start),
      ...ganttTasks.map(t => t.end),
      ...ganttMilestones.map(m => m.date)
    ];
    
    const startDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));

    return {
      tasks: ganttTasks,
      milestones: ganttMilestones,
      timeline: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        view_mode: 'week'
      }
    };
  }

  calculateCriticalPath(timelineData: TimelineData): number[] {
    // Simplified critical path calculation
    // Returns array of task IDs on the critical path
    const tasks = timelineData.tasks;
    const criticalTasks: number[] = [];
    
    // Find tasks with no dependencies and latest end dates
    tasks.forEach(task => {
      if (task.depends_on_tasks.length === 0 && task.due_date) {
        const dependentTasks = tasks.filter(t => 
          t.depends_on_tasks.includes(task.id)
        );
        if (dependentTasks.length > 0) {
          criticalTasks.push(task.id);
        }
      }
    });
    
    return criticalTasks;
  }
}

// Create singleton instance
export const professionalCollaborationService = new ProfessionalCollaborationService();

export default professionalCollaborationService;