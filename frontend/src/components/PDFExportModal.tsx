import React, { useState, useEffect } from 'react';
import type { Song } from '../types';
import { apiService } from '../services/api';

interface PDFExportModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: PDFExportOptions) => void;
  isExporting: boolean;
}

interface PDFTemplate {
  name: string;
  description: string;
  predefined: boolean;
}

export interface PDFExportOptions {
  paperSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  title?: string;
  artist?: string;
  template?: string;
  includeChordDiagrams?: boolean;
  fontSize?: number;
  fontFamily?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  headerText?: string;
  footerText?: string;
  quality?: 'standard' | 'high' | 'print';
}

const PDFExportModal: React.FC<PDFExportModalProps> = ({
  song,
  isOpen,
  onClose,
  onExport,
  isExporting,
}) => {
  const [options, setOptions] = useState<PDFExportOptions>({
    paperSize: 'a4',
    orientation: 'portrait',
    title: song?.title || '',
    artist: '',
    template: 'modern',
    includeChordDiagrams: true,
    fontSize: 12,
    fontFamily: 'Helvetica',
    marginTop: 0.5,
    marginBottom: 0.5,
    marginLeft: 0.75,
    marginRight: 0.75,
    headerText: '',
    footerText: '',
    quality: 'standard',
  });

  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await apiService.get('/api/v1/pdf/templates');
      if (response.status === 'success') {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Failed to load PDF templates:', error);
      // Fallback to default templates
      setTemplates([
        { name: 'modern', description: 'Clean, contemporary design', predefined: true },
        { name: 'classic', description: 'Traditional sheet music appearance', predefined: true },
        { name: 'minimal', description: 'Simplified layout', predefined: true },
      ]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(options);
  };

  const handleInputChange = (field: keyof PDFExportOptions, value: string | number | boolean) => {
    setOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export as PDF</h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pdf-export-form">
          <div className="form-group">
            <label htmlFor="pdf-title">Title (optional override):</label>
            <input
              id="pdf-title"
              type="text"
              value={options.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={song?.title || 'Song title'}
              disabled={isExporting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pdf-artist">Artist (optional):</label>
            <input
              id="pdf-artist"
              type="text"
              value={options.artist || ''}
              onChange={(e) => handleInputChange('artist', e.target.value)}
              placeholder="Artist name"
              disabled={isExporting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pdf-paper-size">Paper Size:</label>
              <select
                id="pdf-paper-size"
                value={options.paperSize}
                onChange={(e) => handleInputChange('paperSize', e.target.value)}
                disabled={isExporting}
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="pdf-orientation">Orientation:</label>
              <select
                id="pdf-orientation"
                value={options.orientation}
                onChange={(e) =>
                  handleInputChange('orientation', e.target.value)
                }
                disabled={isExporting}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pdf-template">Template:</label>
            <select
              id="pdf-template"
              value={options.template}
              onChange={(e) => handleInputChange('template', e.target.value)}
              disabled={isExporting || loadingTemplates}
            >
              {loadingTemplates ? (
                <option value="">Loading templates...</option>
              ) : (
                templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.description}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={options.includeChordDiagrams}
                onChange={(e) => handleInputChange('includeChordDiagrams', e.target.checked)}
                disabled={isExporting}
              />
              <span>Include chord diagrams</span>
            </label>
          </div>

          <div className="advanced-toggle">
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isExporting}
            >
              {showAdvanced ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-options">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pdf-font-family">Font Family:</label>
                  <select
                    id="pdf-font-family"
                    value={options.fontFamily}
                    onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                    disabled={isExporting}
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times-Roman">Times Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="pdf-font-size">Font Size:</label>
                  <input
                    id="pdf-font-size"
                    type="number"
                    min="8"
                    max="24"
                    value={options.fontSize}
                    onChange={(e) => handleInputChange('fontSize', parseInt(e.target.value))}
                    disabled={isExporting}
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>Margins (inches)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pdf-margin-top">Top:</label>
                    <input
                      id="pdf-margin-top"
                      type="number"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={options.marginTop}
                      onChange={(e) => handleInputChange('marginTop', parseFloat(e.target.value))}
                      disabled={isExporting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pdf-margin-bottom">Bottom:</label>
                    <input
                      id="pdf-margin-bottom"
                      type="number"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={options.marginBottom}
                      onChange={(e) => handleInputChange('marginBottom', parseFloat(e.target.value))}
                      disabled={isExporting}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pdf-margin-left">Left:</label>
                    <input
                      id="pdf-margin-left"
                      type="number"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={options.marginLeft}
                      onChange={(e) => handleInputChange('marginLeft', parseFloat(e.target.value))}
                      disabled={isExporting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pdf-margin-right">Right:</label>
                    <input
                      id="pdf-margin-right"
                      type="number"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={options.marginRight}
                      onChange={(e) => handleInputChange('marginRight', parseFloat(e.target.value))}
                      disabled={isExporting}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Header & Footer</h4>
                <div className="form-group">
                  <label htmlFor="pdf-header">Header Text:</label>
                  <input
                    id="pdf-header"
                    type="text"
                    value={options.headerText || ''}
                    onChange={(e) => handleInputChange('headerText', e.target.value)}
                    placeholder="e.g., {title} - {artist}"
                    disabled={isExporting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pdf-footer">Footer Text:</label>
                  <input
                    id="pdf-footer"
                    type="text"
                    value={options.footerText || ''}
                    onChange={(e) => handleInputChange('footerText', e.target.value)}
                    placeholder="e.g., Page {page} of {pages}"
                    disabled={isExporting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pdf-quality">Export Quality:</label>
                <select
                  id="pdf-quality"
                  value={options.quality}
                  onChange={(e) => handleInputChange('quality', e.target.value)}
                  disabled={isExporting}
                >
                  <option value="standard">Standard (smaller file)</option>
                  <option value="high">High Quality</option>
                  <option value="print">Print Quality (larger file)</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 0;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .modal-header h3 {
          margin: 0;
          color: #333;
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close-btn:hover {
          color: #333;
        }

        .pdf-export-form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-group input:disabled,
        .form-group select:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e5e5;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #f8f9fa;
          border-color: #dee2e6;
          color: #6c757d;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #e2e6ea;
        }

        .btn-primary {
          background-color: #007bff;
          border-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-weight: 500;
          color: #333;
        }

        .checkbox-label input[type="checkbox"] {
          margin-right: 0.5rem;
          width: auto;
        }

        .checkbox-label span {
          user-select: none;
        }

        .advanced-toggle {
          margin: 1rem 0;
          border-top: 1px solid #e5e5e5;
          padding-top: 1rem;
        }

        .btn-link {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-link:hover:not(:disabled) {
          color: #0056b3;
          text-decoration: underline;
        }

        .btn-link:disabled {
          color: #6c757d;
          cursor: not-allowed;
        }

        .advanced-options {
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          padding: 1rem;
          margin-top: 0.5rem;
          background-color: #f8f9fa;
        }

        .form-section {
          margin: 1rem 0;
          padding-top: 1rem;
          border-top: 1px solid #e5e5e5;
        }

        .form-section:first-child {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
        }

        .form-section h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #495057;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
};

export default PDFExportModal;
