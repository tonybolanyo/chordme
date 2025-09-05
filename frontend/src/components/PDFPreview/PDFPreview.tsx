import React, { useState, useEffect } from 'react';
import type { Song } from '../../types';
import type { PDFExportOptions } from '../PDFExportModal';

interface PDFPreviewProps {
  song: Song;
  options: PDFExportOptions;
  onPreviewReady?: (previewUrl: string) => void;
  onPreviewError?: (error: string) => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({
  song,
  options,
  onPreviewReady,
  onPreviewError,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Generate preview when options change (debounced)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      generatePreview();
    }, 500); // 500ms delay to avoid too many requests

    return () => clearTimeout(debounceTimer);
  }, [song, options]);

  const generatePreview = async () => {
    if (!song) return;

    setLoading(true);
    setError('');

    try {
      // For now, we'll create a simple preview URL
      // In a real implementation, this would call a backend preview endpoint
      const mockPreviewUrl = `/api/v1/songs/${song.id}/export/pdf/preview`;
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setPreviewUrl(mockPreviewUrl);
      onPreviewReady?.(mockPreviewUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
      setError(errorMessage);
      onPreviewError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pdf-preview-container">
        <div className="preview-loading">
          <div className="loading-spinner" role="status" aria-label="Loading"></div>
          <p>Generating preview...</p>
        </div>
        <style>{`
          .pdf-preview-container {
            width: 100%;
            height: 400px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .preview-loading {
            text-align: center;
            color: #6c757d;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e3e3e3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-preview-container">
        <div className="preview-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button 
            className="retry-btn"
            onClick={generatePreview}
          >
            Retry Preview
          </button>
        </div>
        <style>{`
          .pdf-preview-container {
            width: 100%;
            height: 400px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .preview-error {
            text-align: center;
            color: #dc3545;
          }
          
          .error-icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }
          
          .retry-btn {
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .retry-btn:hover {
            background-color: #0056b3;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pdf-preview-container">
      <div className="preview-frame">
        <div className="preview-header">
          <span className="preview-label">Preview</span>
          <div className="preview-options">
            <button 
              className="preview-btn"
              onClick={() => window.open(previewUrl, '_blank')}
              title="Open preview in new tab"
            >
              🔍 View Full
            </button>
          </div>
        </div>
        <div className="preview-content">
          <div className="mock-pdf-page">
            <div className="pdf-header">
              {options.headerText && (
                <div className="pdf-header-text">
                  {options.headerText.replace('{title}', song.title).replace('{artist}', options.artist || '')}
                </div>
              )}
            </div>
            
            <div className="pdf-title" data-testid="pdf-title" style={{ 
              fontSize: `${Math.max(14, (options.fontSize || 12) + 6)}px`,
              fontFamily: options.fontFamily || 'Helvetica'
            }}>
              {options.title || song.title}
            </div>
            
            {options.artist && (
              <div className="pdf-artist" style={{
                fontSize: `${Math.max(10, (options.fontSize || 12) - 2)}px`,
                fontFamily: options.fontFamily || 'Helvetica'
              }}>
                {options.artist}
              </div>
            )}
            
            <div className="pdf-content" data-testid="pdf-content" style={{
              fontSize: `${options.fontSize || 12}px`,
              fontFamily: options.fontFamily || 'Helvetica',
              marginTop: `${(options.marginTop || 0.5) * 16}px`,
              marginBottom: `${(options.marginBottom || 0.5) * 16}px`,
              marginLeft: `${(options.marginLeft || 0.75) * 16}px`,
              marginRight: `${(options.marginRight || 0.75) * 16}px`
            }}>
              <div className="chord-line">
                {options.includeChordDiagrams && <span className="chord">[C]</span>}
                <span className="lyrics">Amazing grace how sweet the sound</span>
              </div>
              <div className="chord-line">
                {options.includeChordDiagrams && <span className="chord">[Am]</span>}
                <span className="lyrics">That saved a wretch like me</span>
              </div>
              <div className="preview-note">
                <em>Preview shows first few lines with current settings...</em>
              </div>
            </div>
            
            <div className="pdf-footer">
              {options.footerText && (
                <div className="pdf-footer-text">
                  {options.footerText.replace('{page}', '1').replace('{pages}', '1')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .pdf-preview-container {
          width: 100%;
          height: 400px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #f8f9fa;
          overflow: hidden;
        }
        
        .preview-frame {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: #e9ecef;
          border-bottom: 1px solid #ddd;
        }
        
        .preview-label {
          font-weight: 500;
          color: #495057;
          font-size: 0.9rem;
        }
        
        .preview-btn {
          background: none;
          border: 1px solid #007bff;
          color: #007bff;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.75rem;
        }
        
        .preview-btn:hover {
          background-color: #007bff;
          color: white;
        }
        
        .preview-content {
          flex: 1;
          padding: 1rem;
          background-color: white;
          overflow-y: auto;
        }
        
        .mock-pdf-page {
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          padding: 1rem;
          min-height: 100%;
          position: relative;
          max-width: 300px;
          margin: 0 auto;
        }
        
        .pdf-header {
          text-align: center;
          margin-bottom: 1rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 0.5rem;
        }
        
        .pdf-header-text {
          font-size: 0.8rem;
          color: #666;
        }
        
        .pdf-title {
          text-align: center;
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: #333;
        }
        
        .pdf-artist {
          text-align: center;
          color: #666;
          margin-bottom: 1.5rem;
        }
        
        .pdf-content {
          line-height: 1.6;
        }
        
        .chord-line {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        
        .chord {
          color: #007bff;
          font-weight: bold;
          font-size: 0.9em;
        }
        
        .lyrics {
          color: #333;
        }
        
        .preview-note {
          margin-top: 1rem;
          color: #888;
          font-size: 0.8rem;
          text-align: center;
        }
        
        .pdf-footer {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
          text-align: center;
          border-top: 1px solid #eee;
          padding-top: 0.5rem;
        }
        
        .pdf-footer-text {
          font-size: 0.8rem;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default PDFPreview;