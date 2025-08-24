import React, { useEffect } from 'react';
import type { SharingNotification } from '../../types';
import './NotificationToast.css';

interface NotificationToastProps {
  notification: SharingNotification;
  onClose: () => void;
  autoCloseDelay?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  autoCloseDelay = 5000,
}) => {
  useEffect(() => {
    if (autoCloseDelay > 0) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [onClose, autoCloseDelay]);

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'share_added':
        return '🎵';
      case 'share_removed':
        return '🚫';
      case 'permission_changed':
        return '🔧';
      default:
        return '📢';
    }
  };

  const getNotificationMessage = () => {
    switch (notification.type) {
      case 'share_added':
        return `${notification.actor_email} shared "${notification.song_title}" with you`;
      case 'share_removed':
        return `Your access to "${notification.song_title}" has been removed`;
      case 'permission_changed':
        return `Your permission for "${notification.song_title}" changed from ${notification.old_permission} to ${notification.new_permission}`;
      default:
        return 'Sharing notification';
    }
  };

  const getNotificationClass = () => {
    switch (notification.type) {
      case 'share_added':
        return 'notification-success';
      case 'share_removed':
        return 'notification-warning';
      case 'permission_changed':
        return 'notification-info';
      default:
        return 'notification-default';
    }
  };

  return (
    <div className={`notification-toast ${getNotificationClass()}`} role="alert">
      <div className="notification-content">
        <div className="notification-icon" role="img" aria-label="Notification icon">
          {getNotificationIcon()}
        </div>
        <div className="notification-message">
          {getNotificationMessage()}
        </div>
      </div>
      <button 
        className="notification-close" 
        onClick={onClose}
        aria-label="Close notification"
        title="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default NotificationToast;