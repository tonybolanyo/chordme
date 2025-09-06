import React, { useState } from 'react';
import { ExportFormat, ExportConfig } from '../../types';
import './ExportResultsModal.css';

interface ExportResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  selectedCount: number;
  selectedTitles: string[];
}

const ExportResultsModal: React.FC<ExportResultsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  selectedCount,
  selectedTitles,
}) => {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'pdf',
    includeMetadata: true,
    includeLyrics: true,
    includeChords: true,
    fileName: `search-results-${new Date().toISOString().split('T')[0]}`,
  });

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(exportConfig);
    onClose();
  };

  const handleConfigChange = (key: keyof ExportConfig, value: any) => {
    setExportConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatOptions: Array<{ value: ExportFormat; label: string; description: string }> = [
    { value: 'pdf', label: 'PDF', description: 'Formatted document with chords and lyrics' },
    { value: 'txt', label: 'Text', description: 'Plain text format, easy to share' },
    { value: 'json', label: 'JSON', description: 'Structured data for developers' },
    { value: 'csv', label: 'CSV', description: 'Spreadsheet format for analysis' },
  ];

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>Export Search Results</h2>
          <button
            type="button"
            className="export-modal-close"
            onClick={onClose}
            aria-label="Close export modal"
          >
            ✕
          </button>
        </div>

        <div className="export-modal-content">
          <div className="export-summary">
            <p>
              <strong>{selectedCount}</strong> song{selectedCount !== 1 ? 's' : ''} selected for export
            </p>
            
            {selectedTitles.length > 0 && (
              <div className="selected-songs-preview">
                <h4>Selected Songs:</h4>
                <ul className="selected-songs-list">
                  {selectedTitles.slice(0, 3).map((title, index) => (
                    <li key={index}>{title}</li>
                  ))}
                  {selectedTitles.length > 3 && (
                    <li className="more-items">
                      ...and {selectedTitles.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="export-config">
            <div className="export-section">
              <h3>Export Format</h3>
              <div className="format-options">
                {formatOptions.map(({ value, label, description }) => (
                  <label key={value} className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value={value}
                      checked={exportConfig.format === value}
                      onChange={(e) => handleConfigChange('format', e.target.value as ExportFormat)}
                    />
                    <div className="format-option-content">
                      <span className="format-label">{label}</span>
                      <span className="format-description">{description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="export-section">
              <h3>Content Options</h3>
              <div className="content-options">
                <label className="content-option">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeMetadata}
                    onChange={(e) => handleConfigChange('includeMetadata', e.target.checked)}
                  />
                  <span>Include metadata (artist, genre, key, etc.)</span>
                </label>

                <label className="content-option">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeLyrics}
                    onChange={(e) => handleConfigChange('includeLyrics', e.target.checked)}
                  />
                  <span>Include lyrics</span>
                </label>

                <label className="content-option">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeChords}
                    onChange={(e) => handleConfigChange('includeChords', e.target.checked)}
                  />
                  <span>Include chord notations</span>
                </label>
              </div>
            </div>

            <div className="export-section">
              <h3>File Settings</h3>
              <div className="file-settings">
                <label className="file-name-input">
                  <span>File name:</span>
                  <input
                    type="text"
                    value={exportConfig.fileName}
                    onChange={(e) => handleConfigChange('fileName', e.target.value)}
                    placeholder="Enter file name"
                  />
                  <span className="file-extension">.{exportConfig.format}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="export-modal-actions">
          <button
            type="button"
            className="export-button cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="export-button primary"
            onClick={handleExport}
          >
            Export {selectedCount} Song{selectedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportResultsModal;