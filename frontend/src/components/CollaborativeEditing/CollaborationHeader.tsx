// Collaborative editing header component showing real-time status and participants
import React, { useState } from 'react';
import {
  useCollaborativePresence,
  useCollaborativeNetwork,
} from '../../hooks/useCollaborativeEditing';
import { usePresenceSystem } from '../../hooks/usePresenceSystem';
import { PrivacySettings } from './PrivacySettings';
import type { CollaborationUser } from '../../types/collaboration';
import './CollaborativeEditing.css';

interface CollaborationHeaderProps {
  songId: string;
  isCollaborating: boolean;
  participants: CollaborationUser[];
  currentUserId?: string;
}

export const CollaborationHeader: React.FC<CollaborationHeaderProps> = ({
  songId,
  isCollaborating,
  participants,
  currentUserId,
}) => {
  const { activePeerCount, presences } = useCollaborativePresence(songId);
  const { isOnline, connectionQuality } = useCollaborativeNetwork();
  const { 
    generateUserAvatar, 
    typingUsers, 
    isUserTyping,
    getActiveUserCount,
    getTypingUserCount 
  } = usePresenceSystem({ songId, userId: currentUserId });

  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const getNetworkIcon = () => {
    if (!isOnline) return '📡';
    switch (connectionQuality) {
      case 'excellent':
        return '📶';
      case 'good':
        return '📶';
      case 'poor':
        return '📵';
      default:
        return '📡';
    }
  };

  const getConnectionText = () => {
    if (!isOnline) return 'Offline';
    switch (connectionQuality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'poor':
        return 'Poor connection';
      default:
        return 'Connected';
    }
  };

  const getUserPresenceStatus = (userId: string) => {
    const presence = presences.find(p => p.userId === userId);
    if (!presence) return 'offline';
    
    if (isUserTyping(userId)) return 'typing';
    return presence.status;
  };

  const getStatusTooltip = (user: CollaborationUser) => {
    const status = getUserPresenceStatus(user.id);
    const presence = presences.find(p => p.userId === user.id);
    
    let statusText = status;
    if (presence?.activityDetails?.lastInteraction) {
      const lastSeen = new Date(presence.activityDetails.lastInteraction);
      const now = new Date();
      const diff = now.getTime() - lastSeen.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) {
        statusText += ' • Just now';
      } else if (minutes < 60) {
        statusText += ` • ${minutes}m ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        statusText += ` • ${hours}h ago`;
      }
    }
    
    return `${user.name || user.email} - ${statusText}`;
  };

  const formatParticipantCount = () => {
    const activeCount = getActiveUserCount();
    const typingCount = getTypingUserCount();
    
    let text = '';
    if (activeCount > 0) {
      text += `${activeCount} online`;
    }
    if (typingCount > 0) {
      text += ` • ${typingCount} typing`;
    }
    return text || 'No one else online';
  };

  if (!isCollaborating) {
    return null;
  }

  return (
    <>
      <div className="collaboration-header">
        <div className="collaboration-status">
          <div
            className={`collaboration-indicator ${isCollaborating ? 'active' : ''}`}
          >
            <span>⚡</span>
            <span>Live Collaboration</span>
          </div>
          <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            {formatParticipantCount()}
          </span>
        </div>

        <div className="presence-indicators">
          {participants
            .filter(user => user.id !== currentUserId) // Don't show current user
            .map((user) => {
              const avatar = generateUserAvatar(user);
              const status = getUserPresenceStatus(user.id);
              
              return (
                <div
                  key={user.id}
                  className={`user-avatar ${status}`}
                  style={{ backgroundColor: avatar.backgroundColor }}
                  title={getStatusTooltip(user)}
                >
                  {avatar.initials}
                  <div className="user-avatar-tooltip">
                    {getStatusTooltip(user)}
                  </div>
                </div>
              );
            })}
          
          {/* Current user avatar with privacy settings */}
          {currentUserId && (
            <div className="current-user-controls" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginLeft: '8px',
              paddingLeft: '8px',
              borderLeft: '1px solid rgba(255,255,255,0.2)'
            }}>
              <button
                onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                title="Privacy settings"
              >
                <span>🔒</span>
                <span>Privacy</span>
              </button>
            </div>
          )}
        </div>

        <div className={`network-status ${connectionQuality}`}>
          <span>{getNetworkIcon()}</span>
          <span>{getConnectionText()}</span>
        </div>
      </div>

      {/* Privacy Settings Panel */}
      <PrivacySettings
        songId={songId}
        userId={currentUserId || null}
        isOpen={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
      />
    </>
  );
};
