import React from 'react';
import { apiService } from '../../services/api';
import { type StorageBackendType } from '../../services/storagePreference';
import './StorageIndicator.css';

interface StorageIndicatorProps {
  onClick?: () => void;
}

const StorageIndicator: React.FC<StorageIndicatorProps> = ({ onClick }) => {
  const currentBackend = apiService.getCurrentBackend();

  const getBackendInfo = (backend: StorageBackendType) => {
    switch (backend) {
      case 'api':
        return { name: 'API', icon: '🔗', color: '#3498db' };
      case 'firebase':
        return { name: 'Firebase', icon: '🔥', color: '#ff9500' };
      case 'googledrive':
        return { name: 'Drive', icon: '📱', color: '#4285f4' };
      case 'localstorage':
        return { name: 'Local', icon: '💾', color: '#9b59b6' };
      default:
        return { name: 'Unknown', icon: '❓', color: '#95a5a6' };
    }
  };

  const backendInfo = getBackendInfo(currentBackend);
  const isAvailable = apiService.isBackendAvailable(currentBackend);

  return (
    <div
      className={`storage-indicator ${onClick ? 'clickable' : ''} ${!isAvailable ? 'unavailable' : ''}`}
      onClick={onClick}
      title={`Storage: ${backendInfo.name}${!isAvailable ? ' (Unavailable)' : ''}`}
    >
      <span className="storage-icon" style={{ color: backendInfo.color }}>
        {backendInfo.icon}
      </span>
      <span className="storage-name">{backendInfo.name}</span>
      {!isAvailable && <span className="storage-warning">⚠️</span>}
    </div>
  );
};

export default StorageIndicator;
