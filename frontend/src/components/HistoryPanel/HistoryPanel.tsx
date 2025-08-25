import React, { useState, useEffect } from 'react';
import { versionHistoryService } from '../../services/versionHistory';
import type { SongVersion } from '../../services/versionHistory';
import './HistoryPanel.css';

interface HistoryPanelProps {
  songId: string | number;
  currentTitle: string;
  currentContent: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (version: SongVersion) => void;
  onPreview: (version: SongVersion) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  songId,
  currentTitle,
  isOpen,
  onClose,
  onRestore,
  onPreview,
}) => {
  const [versions, setVersions] = useState<SongVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<SongVersion | null>(
    null
  );
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && songId) {
      loadVersions();
    }
  }, [isOpen, songId]);

  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const versionList = await versionHistoryService.getVersions(songId);
      setVersions(versionList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load version history'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: SongVersion) => {
    if (
      window.confirm(
        `Are you sure you want to restore to version ${version.version_number}? This will create a new version with the restored content.`
      )
    ) {
      setRestoring(version.id);
      try {
        await versionHistoryService.restoreVersion(songId, version.id);
        onRestore(version);
        // Reload versions to show the new restoration
        await loadVersions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to restore version'
        );
      } finally {
        setRestoring(null);
      }
    }
  };

  const handlePreview = (version: SongVersion) => {
    setSelectedVersion(version);
    onPreview(version);
  };

  const formatVersionDisplay = (version: SongVersion) => {
    return versionHistoryService.formatVersionForDisplay(version);
  };

  if (!isOpen) return null;

  return (
    <div className="history-panel-overlay">
      <div className="history-panel">
        <div className="history-panel-header">
          <h3>Version History</h3>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close history panel"
          >
            ×
          </button>
        </div>

        <div className="history-panel-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading version history...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button onClick={loadVersions} className="retry-button">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Current version */}
              <div className="version-item current-version">
                <div className="version-header">
                  <div className="version-info">
                    <span className="version-title">Current Version</span>
                    <span className="version-subtitle">{currentTitle}</span>
                  </div>
                  <div className="version-actions">
                    <span className="current-badge">Current</span>
                  </div>
                </div>
              </div>

              {/* Version history */}
              <div className="versions-list">
                {versions.length === 0 ? (
                  <div className="empty-state">
                    <p>No version history available.</p>
                    <p className="empty-subtitle">
                      Versions will appear here after you save changes to this
                      song.
                    </p>
                  </div>
                ) : (
                  versions.map((version) => {
                    const display = formatVersionDisplay(version);
                    const isSelected = selectedVersion?.id === version.id;
                    const isRestoring = restoring === version.id;

                    return (
                      <div
                        key={version.id}
                        className={`version-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="version-header">
                          <div className="version-info">
                            <span className="version-title">
                              {display.title}
                            </span>
                            <span className="version-subtitle">
                              {display.subtitle}
                            </span>
                            <span className="version-timestamp">
                              {display.timestamp}
                            </span>
                          </div>
                          <div className="version-actions">
                            <button
                              className="preview-button"
                              onClick={() => handlePreview(version)}
                              disabled={isRestoring}
                            >
                              Preview
                            </button>
                            <button
                              className="restore-button"
                              onClick={() => handleRestore(version)}
                              disabled={isRestoring}
                            >
                              {isRestoring ? (
                                <>
                                  <span className="spinner small"></span>
                                  Restoring...
                                </>
                              ) : (
                                'Restore'
                              )}
                            </button>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="version-preview">
                            <h4>Content Preview:</h4>
                            <pre className="content-preview">
                              {version.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
