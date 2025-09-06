/**
 * Session list component for displaying and managing collaborative sessions.
 */

import React, { useState, useEffect } from 'react';
import { sessionManagementService, type SessionFilters } from '../../services/sessionManagementService';
import type { CollaborationSession } from '../../types/collaboration';

export interface SessionListProps {
  /** Additional CSS class name */
  className?: string;
  /** Filter sessions by status */
  statusFilter?: string;
  /** Filter sessions by user role */
  roleFilter?: string;
  /** Called when session is selected */
  onSessionSelect?: (session: CollaborationSession & { user_role: string }) => void;
  /** Called when session creation is requested */
  onCreateSession?: () => void;
  /** Show create session button */
  showCreateButton?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  className = '',
  statusFilter,
  roleFilter,
  onSessionSelect,
  onCreateSession,
  showCreateButton = true,
}) => {
  const [sessions, setSessions] = useState<Array<CollaborationSession & { user_role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilters>({
    status: statusFilter,
    role: roleFilter,
  });

  useEffect(() => {
    loadSessions();
  }, [filters]);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      status: statusFilter,
      role: roleFilter,
    }));
  }, [statusFilter, roleFilter]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionsData = await sessionManagementService.getMySessions(filters);
      setSessions(sessionsData);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setFilters(prev => ({ ...prev, status: status || undefined }));
  };

  const handleRoleFilterChange = (role: string) => {
    setFilters(prev => ({ ...prev, role: role || undefined }));
  };

  const formatLastActivity = (lastActivity: string) => {
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-green-600 bg-green-100',
      paused: 'text-yellow-600 bg-yellow-100',
      ended: 'text-gray-600 bg-gray-100',
      archived: 'text-blue-600 bg-blue-100',
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'text-purple-600 bg-purple-100',
      editor: 'text-blue-600 bg-blue-100',
      viewer: 'text-green-600 bg-green-100',
      commenter: 'text-orange-600 bg-orange-100',
    };
    return colors[role] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">My Sessions</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Sessions</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadSessions}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Sessions</h2>
        {showCreateButton && (
          <button
            onClick={onCreateSession}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Session
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            My Role
          </label>
          <select
            value={filters.role || ''}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="commenter">Commenter</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500">No sessions found</p>
          {showCreateButton && (
            <button
              onClick={onCreateSession}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSessionSelect?.(session)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-gray-900 truncate flex-1">
                    {session.name}
                  </h3>
                  <div className="flex gap-2 ml-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(session.user_role)}`}>
                      {sessionManagementService.getRoleDisplayName(session.user_role)}
                    </span>
                  </div>
                </div>

                {session.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {session.description}
                  </p>
                )}

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      {session.participant_count}/{session.max_participants}
                    </span>
                    
                    <span>
                      {formatLastActivity(session.last_activity)}
                    </span>
                  </div>

                  {session.started_at && (
                    <span>
                      Duration: {sessionManagementService.formatSessionDuration(session.started_at, session.ended_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionList;