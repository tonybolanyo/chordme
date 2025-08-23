import React, { useState, useEffect } from 'react';
import { googleOAuth2Service } from '../../services/googleOAuth';
import type { DriveFile, DriveFileList } from '../../types';

interface GoogleDriveFileListProps {
  onFileSelect?: (file: DriveFile) => void;
  onError?: (error: string) => void;
  className?: string;
  fileTypes?: string[]; // MIME types to filter
  maxResults?: number;
}

export const GoogleDriveFileList: React.FC<GoogleDriveFileListProps> = ({
  onFileSelect,
  onError,
  className = '',
  fileTypes = ['text/plain', 'application/octet-stream'],
  maxResults = 20,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (googleOAuth2Service.isAuthenticated()) {
      loadFiles();
    }
  }, []);

  const buildQuery = () => {
    const mimeTypeQuery = fileTypes.map(type => `mimeType='${type}'`).join(' or ');
    return `(${mimeTypeQuery}) and trashed=false`;
  };

  const loadFiles = async (pageToken?: string) => {
    try {
      setIsLoading(true);
      
      const result: DriveFileList = await googleOAuth2Service.listDriveFiles({
        pageToken,
        pageSize: maxResults,
        query: buildQuery(),
        orderBy: 'modifiedTime desc',
      });

      if (pageToken) {
        setFiles(prev => [...prev, ...result.files]);
      } else {
        setFiles(result.files);
      }

      setNextPageToken(result.nextPageToken);
      setHasMore(!!result.nextPageToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load files';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreFiles = () => {
    if (nextPageToken && !isLoading) {
      loadFiles(nextPageToken);
    }
  };

  const handleFileClick = (file: DriveFile) => {
    onFileSelect?.(file);
  };

  const formatFileSize = (sizeString?: string) => {
    if (!sizeString) return '';
    const size = parseInt(sizeString);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    if (size < 1024 * 1024 * 1024) return `${Math.round(size / (1024 * 1024))} MB`;
    return `${Math.round(size / (1024 * 1024 * 1024))} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!googleOAuth2Service.isAuthenticated()) {
    return (
      <div className={`drive-file-list ${className}`}>
        <p>Please sign in with Google to access Drive files.</p>
      </div>
    );
  }

  return (
    <div className={`drive-file-list ${className}`}>
      <div className="file-list-header">
        <h3>Google Drive Files</h3>
        <button
          onClick={() => loadFiles()}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {files.length === 0 && !isLoading && (
        <p className="no-files-message">No files found in your Google Drive.</p>
      )}

      <div className="file-list">
        {files.map((file) => (
          <div
            key={file.id}
            className="file-item"
            onClick={() => handleFileClick(file)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              marginBottom: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <div className="file-info">
              <div className="file-name" style={{ fontWeight: '500', marginBottom: '4px' }}>
                {file.name}
              </div>
              <div className="file-meta" style={{ fontSize: '14px', color: '#666' }}>
                Modified: {formatDate(file.modifiedTime)}
                {file.size && ` • ${formatFileSize(file.size)}`}
              </div>
            </div>
            <div className="file-actions">
              {file.webViewLink && (
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: '#1976d2',
                    textDecoration: 'none',
                    border: '1px solid #1976d2',
                    borderRadius: '3px',
                    marginLeft: '8px',
                  }}
                >
                  View
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="load-more" style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={loadMoreFiles}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Loading...' : 'Load More Files'}
          </button>
        </div>
      )}
    </div>
  );
};