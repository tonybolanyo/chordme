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
  ActivityDashboard
} from '../types/professionalCollaboration';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
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
}

// Create singleton instance
export const professionalCollaborationService = new ProfessionalCollaborationService();

export default professionalCollaborationService;