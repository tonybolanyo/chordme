// Presence notifications component for user join/leave events
import React from 'react';
import { usePresenceSystem } from '../../hooks/usePresenceSystem';
import type { PresenceNotification, CollaborationUser } from '../../types/collaboration';
import './CollaborativeEditing.css';

interface PresenceNotificationsProps {
  songId: string | null;
  userId: string | null;
  participants: CollaborationUser[];
}

export const PresenceNotifications: React.FC<PresenceNotificationsProps> = ({
  songId,
  userId,
  participants,
}) => {
  const { notifications, removeNotification, generateUserAvatar } = usePresenceSystem({
    songId,
    userId,
  });

  const getNotificationIcon = (type: PresenceNotification['type']) => {
    switch (type) {
      case 'user-joined':
        return '👋';
      case 'user-left':
        return '👋';
      case 'user-reconnected':
        return '🔄';
      case 'user-disconnected':
        return '⚠️';
      default:
        return '👤';
    }
  };

  const getNotificationMessage = (notification: PresenceNotification) => {
    switch (notification.type) {
      case 'user-joined':
        return `${notification.userName} joined the session`;
      case 'user-left':
        return `${notification.userName} left the session`;
      case 'user-reconnected':
        return `${notification.userName} reconnected`;
      case 'user-disconnected':
        return `${notification.userName} disconnected`;
      default:
        return `${notification.userName} updated their presence`;
    }
  };

  const getNotificationClassName = (type: PresenceNotification['type']) => {
    switch (type) {
      case 'user-joined':
      case 'user-reconnected':
        return 'joining';
      case 'user-left':
      case 'user-disconnected':
        return 'leaving';
      default:
        return '';
    }
  };

  const getUserForNotification = (userId: string): CollaborationUser | null => {
    return participants.find(p => p.id === userId) || null;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="presence-notifications">
      {notifications.map((notification) => {
        const user = getUserForNotification(notification.userId);
        const avatar = user ? generateUserAvatar(user) : { initials: '?', backgroundColor: '#999' };
        const className = getNotificationClassName(notification.type);

        return (
          <div
            key={notification.id}
            className={`presence-notification ${className}`}
          >
            <div
              className="notification-avatar"
              style={{ backgroundColor: avatar.backgroundColor }}
            >
              {avatar.initials}
            </div>
            
            <div className="notification-content">
              <div className="notification-title">
                {getNotificationIcon(notification.type)} {getNotificationMessage(notification)}
              </div>
              <div className="notification-subtitle">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            </div>

            <button
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};