import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import {
  AnalyticsPrivacySettings,
  GDPRRights,
  PrivacySettingsProps,
} from '../../types/analytics';
import './AnalyticsPrivacySettings.css';

const AnalyticsPrivacySettingsComponent: React.FC<PrivacySettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
}) => {
  const [currentSettings, setCurrentSettings] = useState<AnalyticsPrivacySettings>(settings);
  const [gdprRights, setGdprRights] = useState<GDPRRights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPrivacySettings();
    }
  }, [isOpen]);

  const loadPrivacySettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await analyticsService.getPrivacySettings();
      setCurrentSettings(response.privacy_settings);
      setGdprRights(response.gdpr_rights);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load privacy settings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: keyof AnalyticsPrivacySettings, value: boolean | number) => {
    setCurrentSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      await analyticsService.updatePrivacySettings(currentSettings);
      onUpdate(currentSettings);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update privacy settings';
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteData = async () => {
    if (!window.confirm('Are you sure you want to delete your analytics data? This action cannot be undone.')) {
      return;
    }

    const confirmation = prompt('Type "I understand this action cannot be undone" to confirm:');
    if (confirmation !== 'I understand this action cannot be undone') {
      return;
    }

    try {
      setIsUpdating(true);
      await analyticsService.deleteAnalyticsData('all', confirmation);
      alert('Analytics data has been deleted successfully.');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete analytics data';
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="privacy-settings-overlay">
      <div className="privacy-settings-modal">
        <div className="privacy-settings-header">
          <h2>🔒 Analytics Privacy Settings</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close privacy settings"
          >
            ✕
          </button>
        </div>

        <div className="privacy-settings-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading privacy settings...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-message">❌ {error}</p>
              <button onClick={loadPrivacySettings} className="retry-button">
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="settings-section">
                <h3>Data Collection Preferences</h3>
                <p className="section-description">
                  Control what analytics data is collected from your account.
                </p>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={currentSettings.collect_performance_data}
                      onChange={(e) => handleSettingChange('collect_performance_data', e.target.checked)}
                      className="setting-checkbox"
                    />
                    <span className="setting-text">
                      <strong>Collect Performance Data</strong>
                      <span className="setting-description">
                        Allow collection of setlist and song performance analytics
                      </span>
                    </span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={currentSettings.include_in_trends}
                      onChange={(e) => handleSettingChange('include_in_trends', e.target.checked)}
                      className="setting-checkbox"
                    />
                    <span className="setting-text">
                      <strong>Include in Trending Analysis</strong>
                      <span className="setting-description">
                        Allow your performance data to contribute to anonymous trending analysis
                      </span>
                    </span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={currentSettings.allow_recommendations}
                      onChange={(e) => handleSettingChange('allow_recommendations', e.target.checked)}
                      className="setting-checkbox"
                    />
                    <span className="setting-text">
                      <strong>Enable Recommendations</strong>
                      <span className="setting-description">
                        Allow generation of personalized performance recommendations
                      </span>
                    </span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={currentSettings.export_allowed}
                      onChange={(e) => handleSettingChange('export_allowed', e.target.checked)}
                      className="setting-checkbox"
                    />
                    <span className="setting-text">
                      <strong>Allow Data Export</strong>
                      <span className="setting-description">
                        Enable export of your analytics data (required for GDPR compliance)
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h3>Data Retention</h3>
                <p className="section-description">
                  Choose how long your analytics data should be retained.
                </p>

                <div className="setting-item">
                  <label className="setting-label">
                    <span className="setting-text">
                      <strong>Retention Period (days)</strong>
                      <span className="setting-description">
                        Analytics data will be automatically deleted after this period
                      </span>
                    </span>
                    <select
                      value={currentSettings.data_retention_days}
                      onChange={(e) => handleSettingChange('data_retention_days', parseInt(e.target.value))}
                      className="setting-select"
                    >
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>6 months</option>
                      <option value={365}>1 year</option>
                      <option value={730}>2 years</option>
                      <option value={2555}>7 years (maximum)</option>
                    </select>
                  </label>
                </div>
              </div>

              {gdprRights && (
                <div className="settings-section">
                  <h3>Your Privacy Rights</h3>
                  <p className="section-description">
                    Under GDPR and CCPA, you have the following rights regarding your data:
                  </p>

                  <div className="rights-list">
                    <div className="right-item">
                      <strong>Access:</strong> {gdprRights.access}
                    </div>
                    <div className="right-item">
                      <strong>Rectification:</strong> {gdprRights.rectification}
                    </div>
                    <div className="right-item">
                      <strong>Erasure:</strong> {gdprRights.erasure}
                    </div>
                    <div className="right-item">
                      <strong>Portability:</strong> {gdprRights.portability}
                    </div>
                    <div className="right-item">
                      <strong>Restriction:</strong> {gdprRights.restriction}
                    </div>
                    <div className="right-item">
                      <strong>Objection:</strong> {gdprRights.objection}
                    </div>
                  </div>
                </div>
              )}

              <div className="settings-section danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <p className="section-description">
                  Permanent actions that cannot be undone.
                </p>

                <button
                  type="button"
                  onClick={handleDeleteData}
                  className="delete-data-button"
                  disabled={isUpdating}
                >
                  Delete All Analytics Data
                </button>
                <p className="delete-warning">
                  This will permanently delete all your performance analytics data. 
                  This action cannot be undone.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="privacy-settings-footer">
          <div className="button-group">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="save-button"
              disabled={isLoading || isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div className="compliance-notice">
            <p>
              <strong>Privacy Compliance:</strong> ChordMe is committed to protecting your privacy. 
              These settings ensure compliance with GDPR, CCPA, and other privacy regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPrivacySettingsComponent;