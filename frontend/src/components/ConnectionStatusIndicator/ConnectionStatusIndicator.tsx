/**
 * WebSocket connection status indicator component
 */

import React from 'react';
import { useConnectionIndicator } from '../../hooks/useWebSocket';
import './ConnectionStatusIndicator.css';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = false,
  className = '',
  onClick,
}) => {
  const {
    statusColor,
    statusText,
    statusIcon,
    isConnected,
    isAuthenticated,
    isReconnecting,
    latency,
    retryCount,
    lastError,
  } = useConnectionIndicator();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const getDetailedStatus = () => {
    if (!isConnected) {
      return 'WebSocket disconnected';
    }
    if (!isAuthenticated) {
      return 'Authenticating...';
    }
    if (isReconnecting) {
      return `Reconnecting... (attempt ${retryCount})`;
    }
    if (latency !== undefined) {
      return `Connected • ${latency}ms latency`;
    }
    return 'Connected';
  };

  return (
    <div
      className={`connection-status-indicator ${className}`}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={showDetails ? undefined : getDetailedStatus()}
    >
      <div className="status-indicator">
        <span 
          className={`status-dot ${isReconnecting ? 'pulsing' : ''}`}
          style={{ backgroundColor: statusColor }}
        />
        <span className="status-icon">{statusIcon}</span>
      </div>
      
      {showDetails && (
        <div className="status-details">
          <div className="status-text">{statusText}</div>
          {latency !== undefined && (
            <div className="status-latency">{latency}ms</div>
          )}
          {isReconnecting && retryCount > 0 && (
            <div className="status-retry">Attempt {retryCount}</div>
          )}
          {lastError && !isConnected && (
            <div className="status-error" title={lastError}>
              Connection error
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;