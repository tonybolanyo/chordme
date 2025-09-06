import React, { useState, useEffect } from 'react';
import type { Song, PDFTemplate } from '../types';
import { apiService } from '../services/api';

interface PDFExportModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: PDFExportOptions) => void;
  isExporting: boolean;
}

export interface PDFExportOptions {
  paperSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  title?: string;
  artist?: string;
  template?: string;
  fontSize?: number;
  chordDiagrams?: boolean;
  quality?: 'draft' | 'standard' | 'high';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  header?: string;
  footer?: string;
  colors?: {
    title?: string;
    artist?: string;
    chords?: string;
    lyrics?: string;
  };
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
    template: 'classic',
    fontSize: 11,
    chordDiagrams: true,
    quality: 'standard',
    margins: {
      top: 1.0,
      bottom: 1.0,
      left: 1.0,
      right: 1.0,
    },
    header: '',
    footer: '',
    colors: {
      title: '#000000',
      artist: '#555555',
      chords: '#333333',
      lyrics: '#000000',
    },
  });

  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'styling' | 'advanced' | 'preview'>('basic');

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen && apiService.getCurrentBackend() === 'flask') {
      loadTemplates();
    }
  }, [isOpen]);

  // Generate preview when options change
  useEffect(() => {
    if (isOpen && activeTab === 'preview' && song) {
      generatePreview();
    }
  }, [isOpen, activeTab, options.template, song]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const templateList = await apiService.listPDFTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const generatePreview = async () => {
    if (!song || !options.template) return;

    try {
      setGeneratingPreview(true);
      const previewBlob = await apiService.previewPDFTemplate(options.template, {
        content: song.content,
        title: options.title || song.title,
        artist: options.artist || 'Unknown Artist',
      });
      
      // Clean up previous URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      const url = URL.createObjectURL(previewBlob);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Clean up preview URL when modal closes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(options);
  };

  const handleInputChange = (field: keyof PDFExportOptions, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNumberChange = (field: keyof PDFExportOptions, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setOptions((prev) => ({
        ...prev,
        [field]: numValue,
      }));
    }
  };

  const handleBooleanChange = (field: keyof PDFExportOptions, value: boolean) => {
    setOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMarginChange = (margin: keyof NonNullable<PDFExportOptions['margins']>, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setOptions((prev) => ({
        ...prev,
        margins: {
          ...prev.margins!,
          [margin]: numValue,
        },
      }));
    }
  };

  const handleColorChange = (color: keyof NonNullable<PDFExportOptions['colors']>, value: string) => {
    setOptions((prev) => ({
      ...prev,
      colors: {
        ...prev.colors!,
        [color]: value,
      },
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
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              type="button"
              className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'styling' ? 'active' : ''}`}
              onClick={() => setActiveTab('styling')}
            >
              Styling
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveTab('advanced')}
            >
              Advanced
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
          </div>

          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="tab-content">
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
                    onChange={(e) => handleInputChange('orientation', e.target.value)}
                    disabled={isExporting}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pdf-template">Template:</label>
                  <select
                    id="pdf-template"
                    value={options.template || 'classic'}
                    onChange={(e) => handleInputChange('template', e.target.value)}
                    disabled={isExporting || loadingTemplates}
                  >
                    {loadingTemplates ? (
                      <option>Loading templates...</option>
                    ) : (
                      templates.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.name} - {template.description}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="pdf-quality">Quality:</label>
                  <select
                    id="pdf-quality"
                    value={options.quality || 'standard'}
                    onChange={(e) => handleInputChange('quality', e.target.value)}
                    disabled={isExporting}
                  >
                    <option value="draft">Draft</option>
                    <option value="standard">Standard</option>
                    <option value="high">High Quality</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={options.chordDiagrams || false}
                    onChange={(e) => handleBooleanChange('chordDiagrams', e.target.checked)}
                    disabled={isExporting}
                  />
                  Include chord diagrams
                </label>
              </div>
            </div>
          )}

          {/* Styling Tab */}
          {activeTab === 'styling' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="pdf-font-size">Font Size:</label>
                <input
                  id="pdf-font-size"
                  type="number"
                  min="8"
                  max="20"
                  value={options.fontSize || 11}
                  onChange={(e) => handleNumberChange('fontSize', e.target.value)}
                  disabled={isExporting}
                />
              </div>

              <div className="form-section">
                <h4>Colors</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="color-title">Title Color:</label>
                    <input
                      id="color-title"
                      type="color"
                      value={options.colors?.title || '#000000'}
                      onChange={(e) => handleColorChange('title', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="color-artist">Artist Color:</label>
                    <input
                      id="color-artist"
                      type="color"
                      value={options.colors?.artist || '#555555'}
                      onChange={(e) => handleColorChange('artist', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="color-chords">Chords Color:</label>
                    <input
                      id="color-chords"
                      type="color"
                      value={options.colors?.chords || '#333333'}
                      onChange={(e) => handleColorChange('chords', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="color-lyrics">Lyrics Color:</label>
                    <input
                      id="color-lyrics"
                      type="color"
                      value={options.colors?.lyrics || '#000000'}
                      onChange={(e) => handleColorChange('lyrics', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Margins (inches)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="margin-top">Top:</label>
                    <input
                      id="margin-top"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={options.margins?.top || 1.0}
                      onChange={(e) => handleMarginChange('top', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="margin-bottom">Bottom:</label>
                    <input
                      id="margin-bottom"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={options.margins?.bottom || 1.0}
                      onChange={(e) => handleMarginChange('bottom', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="margin-left">Left:</label>
                    <input
                      id="margin-left"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={options.margins?.left || 1.0}
                      onChange={(e) => handleMarginChange('left', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="margin-right">Right:</label>
                    <input
                      id="margin-right"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={options.margins?.right || 1.0}
                      onChange={(e) => handleMarginChange('right', e.target.value)}
                      disabled={isExporting}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="pdf-header">Header Text (optional):</label>
                <input
                  id="pdf-header"
                  type="text"
                  value={options.header || ''}
                  onChange={(e) => handleInputChange('header', e.target.value)}
                  placeholder="Custom header text"
                  disabled={isExporting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pdf-footer">Footer Text (optional):</label>
                <input
                  id="pdf-footer"
                  type="text"
                  value={options.footer || ''}
                  onChange={(e) => handleInputChange('footer', e.target.value)}
                  placeholder="Custom footer text"
                  disabled={isExporting}
                />
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="tab-content">
              <div className="preview-container">
                {generatingPreview ? (
                  <div className="preview-loading">
                    <p>Generating preview...</p>
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="pdf-preview"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="preview-placeholder">
                    <p>Preview will be generated when you select this tab</p>
                    <button
                      type="button"
                      onClick={generatePreview}
                      disabled={!song || !options.template}
                    >
                      Generate Preview
                    </button>
                  </div>
                )}
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
          max-width: 700px;
          width: 95%;
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

        .tab-navigation {
          display: flex;
          border-bottom: 1px solid #e5e5e5;
          margin-bottom: 1.5rem;
        }

        .tab-button {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.9rem;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-button:hover {
          background-color: #f8f9fa;
        }

        .tab-button.active {
          color: #007bff;
          border-bottom-color: #007bff;
          background-color: #f8f9fa;
        }

        .tab-content {
          min-height: 300px;
        }

        .form-section {
          margin-bottom: 2rem;
          padding: 1rem;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          background-color: #f9f9f9;
        }

        .form-section h4 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1rem;
        }

        .preview-container {
          height: 400px;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f9f9f9;
        }

        .pdf-preview {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 4px;
        }

        .preview-loading,
        .preview-placeholder {
          text-align: center;
          color: #666;
        }

        .preview-placeholder button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          border: 1px solid #007bff;
          background: #007bff;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        }

        .preview-placeholder button:hover {
          background: #0056b3;
        }

        .preview-placeholder button:disabled {
          background: #ccc;
          border-color: #ccc;
          cursor: not-allowed;
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

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
            max-width: none;
          }

          .tab-button {
            font-size: 0.8rem;
            padding: 0.5rem 0.75rem;
          }

          .preview-container {
            height: 250px;
          }
        }
      `}</style>
    </div>
  );
};

export default PDFExportModal;
