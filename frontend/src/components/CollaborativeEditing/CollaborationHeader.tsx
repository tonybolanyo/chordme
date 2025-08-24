// Collaborative editing header component showing real-time status and participants
import React from 'react';
import { useCollaborativePresence, useCollaborativeNetwork } from '../../hooks/useCollaborativeEditing';
import type { CollaborationUser } from '../../types/collaboration';
import './CollaborativeEditing.css';

interface CollaborationHeaderProps {
  songId: string;
  isCollaborating: boolean;
  participants: CollaborationUser[];
}

export const CollaborationHeader: React.FC<CollaborationHeaderProps> = ({
  songId,
  isCollaborating,
  participants,
}) => {
  const { activePeerCount } = useCollaborativePresence(songId);
  const { networkStatus, isOnline, connectionQuality } = useCollaborativeNetwork();

  const getNetworkIcon = () => {
    if (!isOnline) return '📡';
    switch (connectionQuality) {
      case 'excellent': return '📶';
      case 'good': return '📶';
      case 'poor': return '📶';
      default: return '📡';
    }
  };

  const getConnectionText = () => {
    if (!isOnline) return 'Offline';
    switch (connectionQuality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Poor connection';
      default: return 'Connected';
    }
  };

  const getUserInitials = (user: CollaborationUser): string => {
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  if (!isCollaborating) {
    return null;
  }

  return (
    <div className="collaboration-header">
      <div className="collaboration-status">
        <div className={`collaboration-indicator ${isCollaborating ? 'active' : ''}`}>
          <span>⚡</span>
          <span>Live Collaboration</span>
        </div>
        {activePeerCount > 0 && (
          <span>• {activePeerCount} other{activePeerCount !== 1 ? 's' : ''} online</span>
        )}
      </div>

      <div className="presence-indicators">
        {participants.map((user) => (
          <div
            key={user.id}
            className={`user-avatar active`}
            style={{ backgroundColor: user.color }}
            title={`${user.name || user.email} - Active`}
          >
            {getUserInitials(user)}
          </div>
        ))}
      </div>

      <div className={`network-status ${connectionQuality}`}>
        <span>{getNetworkIcon()}</span>
        <span>{getConnectionText()}</span>
      </div>
    </div>
  );
};