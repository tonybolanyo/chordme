import React, { useState } from 'react';
import type { Song } from '../../types';
import type { PDFExportOptions } from '../PDFExportModal';

interface BatchExportDialogProps {
  songs: Song[];
  isOpen: boolean;
  onClose: () => void;
  onExport: (songIds: string[], options: PDFExportOptions) => void;
  isExporting: boolean;
}

const BatchExportDialog: React.FC<BatchExportDialogProps> = ({
  songs,
  isOpen,
  onClose,
  onExport,
  isExporting,
}) => {
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [exportOptions, setExportOptions] = useState<PDFExportOptions>({
    paperSize: 'a4',
    orientation: 'portrait',
    template: 'modern',
    includeChordDiagrams: true,
    fontSize: 12,
    fontFamily: 'Helvetica',
    marginTop: 0.5,
    marginBottom: 0.5,
    marginLeft: 0.75,
    marginRight: 0.75,
    quality: 'standard',
  });

  const handleSongToggle = (songId: string) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSongs.size === songs.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(songs.map(song => song.id)));
    }
  };

  const handleExport = () => {
    if (selectedSongs.size === 0) return;
    onExport(Array.from(selectedSongs), exportOptions);
  };

  const handleOptionChange = (field: keyof PDFExportOptions, value: string | number | boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Batch Export Songs</h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="batch-export-content">
          <div className="songs-section">
            <div className="songs-header">
              <h4>Select Songs ({selectedSongs.size} of {songs.length})</h4>
              <button
                type="button"
                className="btn-link"
                onClick={handleSelectAll}
                disabled={isExporting}
              >
                {selectedSongs.size === songs.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="songs-list">
              {songs.map(song => (
                <label key={song.id} className="song-item">
                  <input
                    type="checkbox"
                    checked={selectedSongs.has(song.id)}
                    onChange={() => handleSongToggle(song.id)}
                    disabled={isExporting}
                  />
                  <div className="song-info">
                    <div className="song-title">{song.title}</div>
                    <div className="song-author">{song.author}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="options-section">
            <h4>Export Options</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="batch-paper-size">Paper Size:</label>
                <select
                  id="batch-paper-size"
                  value={exportOptions.paperSize}
                  onChange={(e) => handleOptionChange('paperSize', e.target.value)}
                  disabled={isExporting}
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="batch-orientation">Orientation:</label>
                <select
                  id="batch-orientation"
                  value={exportOptions.orientation}
                  onChange={(e) => handleOptionChange('orientation', e.target.value)}
                  disabled={isExporting}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="batch-template">Template:</label>
                <select
                  id="batch-template"
                  value={exportOptions.template}
                  onChange={(e) => handleOptionChange('template', e.target.value)}
                  disabled={isExporting}
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="batch-quality">Quality:</label>
                <select
                  id="batch-quality"
                  value={exportOptions.quality}
                  onChange={(e) => handleOptionChange('quality', e.target.value)}
                  disabled={isExporting}
                >
                  <option value="standard">Standard</option>
                  <option value="high">High Quality</option>
                  <option value="print">Print Quality</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={exportOptions.includeChordDiagrams}
                  onChange={(e) => handleOptionChange('includeChordDiagrams', e.target.checked)}
                  disabled={isExporting}
                />
                <span>Include chord diagrams</span>
              </label>
            </div>
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
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || selectedSongs.size === 0}
          >
            {isExporting ? 'Exporting...' : `Export ${selectedSongs.size} Song${selectedSongs.size !== 1 ? 's' : ''}`}
          </button>
        </div>
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

        .batch-export-content {
          padding: 1.5rem;
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 2rem;
        }

        .songs-section h4,
        .options-section h4 {
          margin: 0 0 1rem 0;
          color: #495057;
          font-size: 1.1rem;
        }

        .songs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .songs-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          padding: 0.5rem;
        }

        .song-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .song-item:hover {
          background-color: #f8f9fa;
        }

        .song-item input[type="checkbox"] {
          margin: 0;
          flex-shrink: 0;
        }

        .song-info {
          flex: 1;
          min-width: 0;
        }

        .song-title {
          font-weight: 500;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-author {
          font-size: 0.9rem;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
          font-size: 0.9rem;
        }

        .form-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
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

        .btn-link {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0;
        }

        .btn-link:hover:not(:disabled) {
          color: #0056b3;
          text-decoration: underline;
        }

        .btn-link:disabled {
          color: #6c757d;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1.5rem;
          padding: 1rem 1.5rem;
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

        @media (max-width: 768px) {
          .batch-export-content {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default BatchExportDialog;