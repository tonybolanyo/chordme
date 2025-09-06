// Privacy settings component for presence visibility controls
import React, { useState } from 'react';
import { usePresenceSystem } from '../../hooks/usePresenceSystem';
import type { PresencePrivacySettings } from '../../types/collaboration';
import './CollaborativeEditing.css';

interface PrivacySettingsProps {
  songId: string | null;
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  songId,
  userId,
  isOpen,
  onClose,
}) => {
  const { privacySettings, updatePrivacySettings } = usePresenceSystem({
    songId,
    userId,
  });

  const [localSettings, setLocalSettings] = useState<PresencePrivacySettings>(privacySettings);

  const handleToggle = (key: keyof PresencePrivacySettings) => {
    const newSettings = {
      ...localSettings,
      [key]: !localSettings[key],
    };
    setLocalSettings(newSettings);
    updatePrivacySettings(newSettings);
  };

  const handleVisibilityChange = (value: PresencePrivacySettings['visibleToUsers']) => {
    const newSettings = {
      ...localSettings,
      visibleToUsers: value,
    };
    setLocalSettings(newSettings);
    updatePrivacySettings(newSettings);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="privacy-settings-overlay" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.2)',
          zIndex: 999,
        }}
      />
      
      {/* Settings Panel */}
      <div className="privacy-settings-panel">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            🔒 Presence Privacy
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <div className="privacy-setting">
          <div>
            <div className="privacy-setting-label">Show Online Status</div>
            <div className="privacy-setting-description">
              Let others see when you're online
            </div>
          </div>
          <div
            className={`privacy-toggle ${localSettings.showOnlineStatus ? 'enabled' : ''}`}
            onClick={() => handleToggle('showOnlineStatus')}
          />
        </div>

        <div className="privacy-setting">
          <div>
            <div className="privacy-setting-label">Show Activity Status</div>
            <div className="privacy-setting-description">
              Show typing indicators and idle status
            </div>
          </div>
          <div
            className={`privacy-toggle ${localSettings.showActivityStatus ? 'enabled' : ''}`}
            onClick={() => handleToggle('showActivityStatus')}
          />
        </div>

        <div className="privacy-setting">
          <div>
            <div className="privacy-setting-label">Show Cursor Position</div>
            <div className="privacy-setting-description">
              Display your cursor and text selections
            </div>
          </div>
          <div
            className={`privacy-toggle ${localSettings.showCursorPosition ? 'enabled' : ''}`}
            onClick={() => handleToggle('showCursorPosition')}
          />
        </div>

        <div className="privacy-setting">
          <div>
            <div className="privacy-setting-label">Show Current Location</div>
            <div className="privacy-setting-description">
              Display which song/section you're viewing
            </div>
          </div>
          <div
            className={`privacy-toggle ${localSettings.showCurrentLocation ? 'enabled' : ''}`}
            onClick={() => handleToggle('showCurrentLocation')}
          />
        </div>

        <div className="privacy-setting">
          <div>
            <div className="privacy-setting-label">Allow Direct Messages</div>
            <div className="privacy-setting-description">
              Let users send you messages during collaboration
            </div>
          </div>
          <div
            className={`privacy-toggle ${localSettings.allowDirectMessages ? 'enabled' : ''}`}
            onClick={() => handleToggle('allowDirectMessages')}
          />
        </div>

        <div className="privacy-setting">
          <div>
            <div className="privacy-setting-label">Invisible Mode</div>
            <div className="privacy-setting-description">
              Appear offline to other users
            </div>
          </div>
          <div
            className={`privacy-toggle ${localSettings.invisibleMode ? 'enabled' : ''}`}
            onClick={() => handleToggle('invisibleMode')}
          />
        </div>

        <div style={{ 
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e0e0e0'
        }}>
          <div className="privacy-setting-label" style={{ marginBottom: '8px' }}>
            Visible to
          </div>
          <select
            value={localSettings.visibleToUsers}
            onChange={(e) => handleVisibilityChange(e.target.value as PresencePrivacySettings['visibleToUsers'])}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              background: 'white',
            }}
          >
            <option value="all">All users</option>
            <option value="collaborators-only">Collaborators only</option>
            <option value="friends-only">Friends only</option>
          </select>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666'
        }}>
          💡 <strong>Tip:</strong> Privacy settings are applied immediately and sync across all your devices.
          Your preferences are remembered for future sessions.
        </div>
      </div>
    </>
  );
};