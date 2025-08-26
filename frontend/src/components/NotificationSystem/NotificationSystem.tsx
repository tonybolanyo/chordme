import { useEffect } from 'react';
import { useError, type NotificationError } from '../../contexts/ErrorContext';
import './NotificationSystem.css';

interface NotificationItemProps {
  notification: NotificationError;
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  useEffect(() => {
    if (notification.autoClose && notification.duration) {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification, onRemove]);

  const getIcon = () => {
    switch (notification.type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const handleClose = () => {
    onRemove(notification.id);
  };

  return (
    <div
      className={`notification notification--${notification.type}`}
      role="alert"
      aria-live="polite"
    >
      <div className="notification__content">
        <span className="notification__icon" aria-hidden="true">
          {getIcon()}
        </span>
        <div className="notification__message">
          <div className="notification__text">{notification.message}</div>
          {notification.code && (
            <div className="notification__code">Error Code: {notification.code}</div>
          )}
        </div>
      </div>
      <button
        className="notification__close"
        onClick={handleClose}
        aria-label="Close notification"
        type="button"
      >
        ×
      </button>
    </div>
  );
}

export function NotificationSystem() {
  const { state, removeNotification } = useError();

  if (state.notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-system" aria-label="Notifications">
      {state.notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
}

export default NotificationSystem;