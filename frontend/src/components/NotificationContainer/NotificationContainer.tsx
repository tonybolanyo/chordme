import React from 'react';
import NotificationToast from '../NotificationToast';
import type { SharingNotification } from '../../types';
import './NotificationContainer.css';

interface NotificationContainerProps {
  notifications: SharingNotification[];
  onRemoveNotification: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemoveNotification,
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="notification-container"
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => onRemoveNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
