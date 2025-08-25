import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebase';
import { googleOAuth2Service } from '../../services/googleOAuth';
import './StorageSettings.css';

export interface StorageBackend {
  id: string;
  name: string;
  description: string;
  available: boolean;
  configurationRequired?: string;
}

interface StorageSettingsProps {
  onClose?: () => void;
  currentBackend: string;
  onBackendChange: (backendId: string) => void;
}

const StorageSettings: React.FC<StorageSettingsProps> = ({
  onClose,
  currentBackend,
  onBackendChange,
}) => {
  const [selectedBackend, setSelectedBackend] = useState(currentBackend);
  const [backends, setBackends] = useState<StorageBackend[]>([]);

  useEffect(() => {
    const checkBackendAvailability = () => {
      const isFirebaseConfigured = firebaseService.isInitialized();
      const isGoogleOAuthConfigured = googleOAuth2Service.isConfigured();

      return [
        {
          id: 'api',
          name: 'REST API Storage',
          description:
            'Server-based storage using Flask backend. Reliable and consistent.',
          available: true,
        },
        {
          id: 'firebase',
          name: 'Firebase/Firestore',
          description:
            'Real-time cloud storage with live synchronization across devices.',
          available: isFirebaseConfigured,
          configurationRequired: !isFirebaseConfigured
            ? 'Firebase configuration required in environment variables'
            : undefined,
        },
        {
          id: 'googledrive',
          name: 'Google Drive',
          description:
            'Store songs as files in your Google Drive. Import/export ChordPro files.',
          available: isGoogleOAuthConfigured,
          configurationRequired: !isGoogleOAuthConfigured
            ? 'Google OAuth configuration required'
            : undefined,
        },
        {
          id: 'localstorage',
          name: 'Local Storage',
          description: 'Browser-based storage. Data stays on this device only.',
          available: typeof localStorage !== 'undefined',
          configurationRequired:
            typeof localStorage === 'undefined'
              ? 'Local storage not supported in this browser'
              : undefined,
        },
      ];
    };

    setBackends(checkBackendAvailability());
  }, []);

  const handleBackendSelect = (backendId: string) => {
    setSelectedBackend(backendId);
  };

  const handleSave = () => {
    onBackendChange(selectedBackend);
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedBackend(currentBackend);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="storage-settings-overlay">
      <div className="storage-settings-modal">
        <div className="storage-settings-header">
          <h2>Storage Backend Settings</h2>
          <button
            className="close-button"
            onClick={handleCancel}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="storage-settings-content">
          <p className="settings-description">
            Choose how and where your songs are stored. You can change this
            setting at any time.
          </p>

          <div className="backend-options">
            {backends.map((backend) => (
              <div
                key={backend.id}
                className={`backend-option ${
                  selectedBackend === backend.id ? 'selected' : ''
                } ${!backend.available ? 'disabled' : ''}`}
                onClick={() =>
                  backend.available && handleBackendSelect(backend.id)
                }
              >
                <div className="backend-option-header">
                  <input
                    type="radio"
                    id={`backend-${backend.id}`}
                    name="storage-backend"
                    value={backend.id}
                    checked={selectedBackend === backend.id}
                    disabled={!backend.available}
                    onChange={() => handleBackendSelect(backend.id)}
                  />
                  <label
                    htmlFor={`backend-${backend.id}`}
                    className="backend-name"
                  >
                    {backend.name}
                  </label>
                  {!backend.available && (
                    <span className="unavailable-badge">Unavailable</span>
                  )}
                </div>
                <p className="backend-description">{backend.description}</p>
                {backend.configurationRequired && (
                  <p className="configuration-required">
                    ⚠️ {backend.configurationRequired}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="storage-settings-footer">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={
              !backends.find((b) => b.id === selectedBackend)?.available
            }
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageSettings;
