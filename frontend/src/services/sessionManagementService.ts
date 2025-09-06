/**
 * Session management service for collaborative editing sessions.
 * Handles session creation, management, invitations, and activity tracking.
 */

import type { 
  CollaborationSession, 
  SessionTemplate, 
  SessionParticipant, 
  SessionActivity 
} from '../types/collaboration';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface CreateSessionRequest {
  song_id: number;
  name: string;
  description?: string;
  template_id?: number;
  access_mode?: 'invite-only' | 'link-access' | 'public';
  max_participants?: number;
}

export interface JoinSessionRequest {
  invitation_code?: string;
}

export interface InviteUsersRequest {
  users: Array<{
    email: string;
    role?: 'viewer' | 'commenter' | 'editor';
  }>;
  message?: string;
}

export interface SessionFilters {
  status?: string;
  role?: string;
}

export interface ActivityFilters {
  limit?: number;
  offset?: number;
  activity_type?: string;
}

export interface SessionResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

export interface SessionsListResponse {
  sessions: Array<CollaborationSession & { user_role: string }>;
}

export interface ParticipantsResponse {
  participants: SessionParticipant[];
}

export interface ActivitiesResponse {
  activities: SessionActivity[];
}

export interface TemplatesResponse {
  templates: SessionTemplate[];
}

export interface InvitationResponse {
  invited_users: Array<{
    user_id: number;
    email: string;
    role: string;
  }>;
  errors: string[];
}

/**
 * Session management service
 */
export class SessionManagementService {
  private authToken: string | null = null;

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * Create a new collaborative session
   */
  async createSession(request: CreateSessionRequest): Promise<CollaborationSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<CollaborationSession>(response);
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<CollaborationSession & { user_role: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<CollaborationSession & { user_role: string }>(response);
  }

  /**
   * Join a session
   */
  async joinSession(sessionId: string, request?: JoinSessionRequest): Promise<CollaborationSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request || {}),
    });

    return this.handleResponse<CollaborationSession>(response);
  }

  /**
   * Leave a session
   */
  async leaveSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/leave`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse<void>(response);
  }

  /**
   * Get session participants
   */
  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/participants`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ParticipantsResponse>(response);
    return data.participants;
  }

  /**
   * Invite users to a session
   */
  async inviteUsers(sessionId: string, request: InviteUsersRequest): Promise<InvitationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/invite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<InvitationResponse>(response);
  }

  /**
   * Get session activity log
   */
  async getSessionActivities(sessionId: string, filters?: ActivityFilters): Promise<SessionActivity[]> {
    const params = new URLSearchParams();
    
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.activity_type) params.append('activity_type', filters.activity_type);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/v1/sessions/${sessionId}/activities${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<ActivitiesResponse>(response);
    return data.activities;
  }

  /**
   * Get available session templates
   */
  async getSessionTemplates(category?: string): Promise<SessionTemplate[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/v1/sessions/templates${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<TemplatesResponse>(response);
    return data.templates;
  }

  /**
   * Get user's sessions
   */
  async getMySessions(filters?: SessionFilters): Promise<Array<CollaborationSession & { user_role: string }>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.role) params.append('role', filters.role);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/v1/sessions/my-sessions${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<SessionsListResponse>(response);
    return data.sessions;
  }

  /**
   * Generate invitation link for a session
   */
  generateInvitationLink(sessionId: string, invitationCode?: string): string {
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/session/${sessionId}/join`;
    
    if (invitationCode) {
      url += `?code=${encodeURIComponent(invitationCode)}`;
    }
    
    return url;
  }

  /**
   * Parse invitation link to extract session ID and code
   */
  parseInvitationLink(link: string): { sessionId: string; invitationCode?: string } | null {
    try {
      const url = new URL(link);
      const pathMatch = url.pathname.match(/\/session\/([^\/]+)\/join/);
      
      if (!pathMatch) return null;
      
      const sessionId = pathMatch[1];
      const invitationCode = url.searchParams.get('code') || undefined;
      
      return { sessionId, invitationCode };
    } catch {
      return null;
    }
  }

  /**
   * Check if user has permission in a session
   */
  hasPermission(session: CollaborationSession & { user_role?: string }, permission: string): boolean {
    const role = session.user_role;
    
    // Default permissions based on role
    const permissions: Record<string, string[]> = {
      owner: ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
      editor: ['read', 'edit', 'comment'],
      viewer: ['read', 'comment'],
      commenter: ['read', 'comment'],
    };

    const rolePermissions = permissions[role || ''] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      owner: 'Owner',
      editor: 'Editor',
      viewer: 'Viewer',
      commenter: 'Commenter',
    };

    return roleNames[role] || role;
  }

  /**
   * Get activity type display name
   */
  getActivityDisplayName(activityType: string): string {
    const activityNames: Record<string, string> = {
      session_created: 'Session created',
      user_joined: 'User joined',
      user_left: 'User left',
      user_invited: 'User invited',
      permission_changed: 'Permission changed',
      edit: 'Content edited',
      comment: 'Comment added',
      session_paused: 'Session paused',
      session_resumed: 'Session resumed',
      session_ended: 'Session ended',
    };

    return activityNames[activityType] || activityType;
  }

  /**
   * Format session duration
   */
  formatSessionDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get session status display info
   */
  getSessionStatusInfo(session: CollaborationSession): { 
    label: string; 
    color: string; 
    description: string 
  } {
    const statusInfo: Record<string, { label: string; color: string; description: string }> = {
      active: {
        label: 'Active',
        color: 'green',
        description: 'Session is currently active and accepting participants',
      },
      paused: {
        label: 'Paused',
        color: 'yellow',
        description: 'Session is temporarily paused',
      },
      ended: {
        label: 'Ended',
        color: 'gray',
        description: 'Session has been ended',
      },
      archived: {
        label: 'Archived',
        color: 'blue',
        description: 'Session has been archived for long-term storage',
      },
    };

    return statusInfo[session.status] || {
      label: session.status,
      color: 'gray',
      description: 'Unknown session status',
    };
  }

  /**
   * Calculate session health score based on activity and participation
   */
  calculateSessionHealth(session: CollaborationSession): {
    score: number;
    level: 'excellent' | 'good' | 'fair' | 'poor';
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // Participation factor (40%)
    const participationRatio = session.participant_count / session.max_participants;
    if (participationRatio > 0.8) {
      score += 40;
      factors.push('High participation');
    } else if (participationRatio > 0.5) {
      score += 30;
      factors.push('Good participation');
    } else if (participationRatio > 0.2) {
      score += 20;
      factors.push('Moderate participation');
    } else {
      score += 10;
      factors.push('Low participation');
    }

    // Activity factor (30%)
    const lastActivity = new Date(session.last_activity);
    const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceActivity < 1) {
      score += 30;
      factors.push('Recent activity');
    } else if (hoursSinceActivity < 24) {
      score += 20;
      factors.push('Active today');
    } else if (hoursSinceActivity < 168) {
      score += 10;
      factors.push('Active this week');
    } else {
      factors.push('Inactive');
    }

    // Duration factor (20%)
    if (session.started_at) {
      const sessionHours = (Date.now() - new Date(session.started_at).getTime()) / (1000 * 60 * 60);
      if (sessionHours > 1 && sessionHours < 8) {
        score += 20;
        factors.push('Optimal duration');
      } else if (sessionHours >= 8) {
        score += 10;
        factors.push('Long session');
      } else {
        score += 5;
        factors.push('Short session');
      }
    }

    // Settings factor (10%)
    if (session.auto_save_enabled) {
      score += 5;
    }
    if (session.is_recording) {
      score += 5;
      factors.push('Recording enabled');
    }

    // Determine level
    let level: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 80) level = 'excellent';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'fair';
    else level = 'poor';

    return { score, level, factors };
  }
}

// Export singleton instance
export const sessionManagementService = new SessionManagementService();

// Export service class for testing
export { SessionManagementService };