import React, { useState } from 'react';
import type { Song } from '../types';

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
  });

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
          max-width: 500px;
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
