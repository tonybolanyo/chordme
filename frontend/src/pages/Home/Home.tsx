import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { googleOAuth2Service } from '../../services/googleOAuth';
import { formatRelativeTime } from '../../utils';
import { useRealtimeSongs } from '../../hooks/useRealtimeSongs';
import { useRealtimeSong } from '../../hooks/useRealtimeSong';
import type { Song, DriveFile } from '../../types';
import {
  ChordProEditor,
  ChordProViewer,
  GoogleDriveFileList,
} from '../../components';
import './Home.css';

const Home: React.FC = () => {
  const { user } = useAuth();
  
  // Use real-time songs hook instead of manual state management
  const { 
    songs, 
    loading: isLoading, 
    error: songsError, 
    isRealTime, 
    refetch: reloadSongs 
  } = useRealtimeSongs();
  
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', content: '' });
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editSongData, setEditSongData] = useState({ title: '', content: '' });
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [exportingToGoogle, setExportingToGoogle] = useState<string | null>(
    null
  );
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Real-time editing state
  const [hasExternalChanges, setHasExternalChanges] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Subscribe to real-time updates for the song being edited
  const { 
    song: realtimeEditingSong, 
    isRealTime: isEditingRealTime 
  } = useRealtimeSong(editingSong?.id || null);

  // Combine real-time songs error with other errors
  const displayError = error || songsError;

  // Monitor external changes to the song being edited
  useEffect(() => {
    if (!editingSong || !realtimeEditingSong || !isEditingRealTime) {
      setHasExternalChanges(false);
      return;
    }

    // Check if the real-time song data differs from our editing state
    const hasContentChanged = realtimeEditingSong.content !== editSongData.content;
    const hasTitleChanged = realtimeEditingSong.title !== editSongData.title;
    const hasTimestampChanged = realtimeEditingSong.updated_at !== editingSong.updated_at;

    // Only consider it an external change if the timestamp is newer than when we started editing
    if ((hasContentChanged || hasTitleChanged) && hasTimestampChanged) {
      setHasExternalChanges(true);
    } else {
      setHasExternalChanges(false);
    }
  }, [editingSong, realtimeEditingSong, editSongData, isEditingRealTime]);

  // Remove the old loadSongs function since it's handled by the hook
  // Keep a reload function for manual refresh if needed (for non-real-time scenarios)
  const loadSongs = reloadSongs;

  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.title || !newSong.content) {
      return;
    }

    try {
      const response = await apiService.createSong({
        title: newSong.title,
        content: newSong.content,
      });

      if (response.status === 'success') {
        setNewSong({ title: '', content: '' });
        setShowCreateForm(false);
        // Real-time updates will handle refreshing the list automatically
        // Only manually reload if not using real-time
        if (!isRealTime) {
          loadSongs();
        }
      }
    } catch (err) {
      console.error('Error creating song:', err);
      setError(err instanceof Error ? err.message : 'Failed to create song');
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this song?')) {
      return;
    }

    try {
      await apiService.deleteSong(songId);
      // Real-time updates will handle removing the song from the list automatically
      // Only manually reload if not using real-time
      if (!isRealTime) {
        loadSongs();
      }
    } catch (err) {
      console.error('Error deleting song:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete song');
    }
  };

  const handleDownloadSong = async (songId: string) => {
    try {
      setError(null); // Clear any previous errors
      await apiService.downloadSong(songId);
      // Success - no need to show any message as the download should start
    } catch (err) {
      console.error('Error downloading song:', err);
      setError(err instanceof Error ? err.message : 'Failed to download song');
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setEditSongData({ title: song.title, content: song.content });
    setShowCreateForm(false); // Hide create form if open
    setViewingSong(null); // Hide view if open
    setHasExternalChanges(false); // Reset conflict state
    setShowConflictDialog(false);
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong || !editSongData.title || !editSongData.content) {
      return;
    }

    try {
      const response = await apiService.updateSong(editingSong.id, {
        title: editSongData.title,
        content: editSongData.content,
      });

      if (response.status === 'success') {
        setEditingSong(null);
        setEditSongData({ title: '', content: '' });
        setHasExternalChanges(false);
        setShowConflictDialog(false);
        // Real-time updates will handle refreshing the song automatically
        // Only manually reload if not using real-time
        if (!isRealTime) {
          loadSongs();
        }
      }
    } catch (err) {
      console.error('Error updating song:', err);
      setError(err instanceof Error ? err.message : 'Failed to update song');
    }
  };

  // Conflict resolution handlers
  const handleAcceptExternalChanges = () => {
    if (realtimeEditingSong) {
      setEditSongData({ 
        title: realtimeEditingSong.title, 
        content: realtimeEditingSong.content 
      });
      setEditingSong(realtimeEditingSong);
      setHasExternalChanges(false);
      setShowConflictDialog(false);
    }
  };

  const handleKeepLocalChanges = () => {
    setHasExternalChanges(false);
    setShowConflictDialog(false);
  };

  const handleShowConflictDialog = () => {
    setShowConflictDialog(true);
  };

  const handleCancelEdit = () => {
    setEditingSong(null);
    setEditSongData({ title: '', content: '' });
    setHasExternalChanges(false);
    setShowConflictDialog(false);
  };

  const handleViewSong = (song: Song) => {
    setViewingSong(song);
    setShowCreateForm(false); // Hide create form if open
    setEditingSong(null); // Hide edit if open
  };

  const handleCloseView = () => {
    setViewingSong(null);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file extension
    const allowedExtensions = ['.cho', '.chopro', '.crd'];
    const lastDotIndex = file.name.lastIndexOf('.');
    if (lastDotIndex === -1) {
      setError(
        'Invalid file type. The uploaded file does not have an extension.'
      );
      return;
    }

    const fileExtension = file.name.toLowerCase().substring(lastDotIndex);

    if (!allowedExtensions.includes(fileExtension)) {
      setError(
        `Invalid file type. Please upload a ChordPro file with one of these extensions: ${allowedExtensions.join(', ')}`
      );
      return;
    }

    // Check file size (limit to 1MB)
    if (file.size > 1024 * 1024) {
      setError('File is too large. Please upload a file smaller than 1MB.');
      return;
    }

    setIsFileUploading(true);
    setError(null);

    try {
      const content = await file.text();

      // Parse ChordPro content to extract title if available
      let extractedTitle = '';
      const titleMatch = content.match(/\{title:\s*([^}]+)\}/i);
      if (titleMatch && titleMatch[1]) {
        extractedTitle = titleMatch[1].trim();
      } else {
        // If no title directive found, use filename without extension
        const lastDotIndex = file.name.lastIndexOf('.');
        extractedTitle =
          lastDotIndex === -1
            ? file.name
            : file.name.substring(0, lastDotIndex);
      }

      // Update the form with the file content
      setNewSong({
        title: extractedTitle,
        content: content,
      });

      // Clear the file input
      event.target.value = '';
    } catch (err) {
      console.error('Error reading file:', err);
      setError(
        'Error reading ChordPro file. Please make sure the file is valid and not corrupted.'
      );
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleDriveFileSelect = async (file: DriveFile) => {
    try {
      setIsFileUploading(true);
      setDriveError(null);

      // Get file content from Google Drive
      const content = await googleOAuth2Service.getFileContent(file.id);

      // Extract title from content or use filename
      const titleMatch = content.match(/\{title[:\s]*([^}]+)\}/i);
      const extractedTitle = titleMatch
        ? titleMatch[1].trim()
        : file.name.replace(/\.[^/.]+$/, '');

      // Update the form with the file content
      setNewSong({
        title: extractedTitle,
        content: content,
      });

      // Show the create form if not already visible
      setShowCreateForm(true);
      setShowGoogleDrive(false);
    } catch (error) {
      console.error('Error loading file from Google Drive:', error);
      setDriveError(
        error instanceof Error
          ? error.message
          : 'Failed to load file from Google Drive'
      );
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleDriveError = (error: string) => {
    setDriveError(error);
  };

  const handleExportToGoogleDrive = async (song: Song) => {
    if (!googleOAuth2Service.isAuthenticated()) {
      setDriveError('Please authenticate with Google Drive first');
      return;
    }

    try {
      setExportingToGoogle(song.id);
      setDriveError(null);
      setExportSuccess(null);

      // Create filename with .cho extension
      const filename = `${song.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.cho`;

      // Export the song to Google Drive
      const exportedFile = await googleOAuth2Service.createFile(
        filename,
        song.content,
        'text/plain'
      );

      setExportSuccess(
        `Song "${song.title}" successfully exported to Google Drive as "${exportedFile.name}"`
      );
    } catch (error) {
      console.error('Error exporting to Google Drive:', error);
      setDriveError(
        error instanceof Error
          ? error.message
          : 'Failed to export to Google Drive'
      );
    } finally {
      setExportingToGoogle(null);
    }
  };

  const handleSaveNewSongToGoogleDrive = async () => {
    if (!googleOAuth2Service.isAuthenticated()) {
      setDriveError('Please authenticate with Google Drive first');
      return;
    }

    if (!newSong.title || !newSong.content) {
      setDriveError(
        'Please enter both title and content before saving to Google Drive'
      );
      return;
    }

    try {
      setExportingToGoogle('new-song');
      setDriveError(null);
      setExportSuccess(null);

      // Create filename with .cho extension
      const filename = `${newSong.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.cho`;

      // Save the new song to Google Drive
      const savedFile = await googleOAuth2Service.createFile(
        filename,
        newSong.content,
        'text/plain'
      );

      setExportSuccess(
        `Song "${newSong.title}" successfully saved to Google Drive as "${savedFile.name}"`
      );
    } catch (error) {
      console.error('Error saving to Google Drive:', error);
      setDriveError(
        error instanceof Error
          ? error.message
          : 'Failed to save to Google Drive'
      );
    } finally {
      setExportingToGoogle(null);
    }
  };

  const handleSaveEditedSongToGoogleDrive = async () => {
    if (!googleOAuth2Service.isAuthenticated()) {
      setDriveError('Please authenticate with Google Drive first');
      return;
    }

    if (!editSongData.title || !editSongData.content) {
      setDriveError(
        'Please enter both title and content before saving to Google Drive'
      );
      return;
    }

    try {
      setExportingToGoogle(editingSong?.id || 'edit-song');
      setDriveError(null);
      setExportSuccess(null);

      // Create filename with .cho extension
      const filename = `${editSongData.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.cho`;

      // Save the edited song to Google Drive
      const savedFile = await googleOAuth2Service.createFile(
        filename,
        editSongData.content,
        'text/plain'
      );

      setExportSuccess(
        `Song "${editSongData.title}" successfully saved to Google Drive as "${savedFile.name}"`
      );
    } catch (error) {
      console.error('Error saving to Google Drive:', error);
      setDriveError(
        error instanceof Error
          ? error.message
          : 'Failed to save to Google Drive'
      );
    } finally {
      setExportingToGoogle(null);
    }
  };

  const clearNotifications = () => {
    setExportSuccess(null);
    setDriveError(null);
  };

  if (isLoading) {
    return (
      <div className="home">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading your songs...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-hero">
        <h1>Welcome back, {user?.email}!</h1>
        <p className="home-subtitle">Manage your chords and lyrics</p>

        {displayError && (
          <div
            className="error-message"
            style={{
              margin: '1rem 0',
              padding: '1rem',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
            }}
          >
            {displayError}
          </div>
        )}

        {exportSuccess && (
          <div
            className="success-message"
            style={{
              margin: '1rem 0',
              padding: '1rem',
              backgroundColor: '#dfd',
              border: '1px solid #bfb',
              borderRadius: '4px',
              position: 'relative',
            }}
          >
            {exportSuccess}
            <button
              onClick={clearNotifications}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#666',
              }}
              title="Close notification"
            >
              ×
            </button>
          </div>
        )}

        <div className="home-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (!showCreateForm) {
                setEditingSong(null);
                setViewingSong(null);
                setShowGoogleDrive(false);
              }
            }}
          >
            {showCreateForm ? 'Cancel' : 'Create New Song'}
          </button>

          {googleOAuth2Service.isAuthenticated() && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowGoogleDrive(!showGoogleDrive);
                if (!showGoogleDrive) {
                  setEditingSong(null);
                  setViewingSong(null);
                  setShowCreateForm(false);
                }
              }}
              style={{ marginLeft: '1rem' }}
            >
              {showGoogleDrive ? 'Hide Drive Files' : 'Browse Google Drive'}
            </button>
          )}
        </div>

        {driveError && (
          <div
            className="error-message"
            style={{
              margin: '1rem 0',
              padding: '1rem',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
            }}
          >
            Google Drive Error: {driveError}
          </div>
        )}

        {showGoogleDrive && (
          <div
            className="google-drive-section"
            style={{
              margin: '2rem 0',
              padding: '1rem',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              border: '1px solid #4285f4',
            }}
          >
            <h3 style={{ color: '#1976d2', marginBottom: '1rem' }}>
              Google Drive Files
            </h3>
            <p
              style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}
            >
              Select a ChordPro file from your Google Drive to import:
            </p>
            <GoogleDriveFileList
              onFileSelect={handleDriveFileSelect}
              onError={handleDriveError}
              fileTypes={[
                'text/plain',
                'application/octet-stream',
                'text/x-chordpro',
              ]}
              maxResults={15}
            />
          </div>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateSong}
            className="create-song-form"
            style={{
              margin: '2rem 0',
              padding: '1rem',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
            }}
          >
            <h3>Create New Song</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="title">Title:</label>
              <input
                type="text"
                id="title"
                value={newSong.title}
                onChange={(e) =>
                  setNewSong({ ...newSong, title: e.target.value })
                }
                placeholder="Enter song title"
                required
                style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
              />
            </div>
            <div
              style={{
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#e8f4f8',
                borderRadius: '4px',
                border: '1px dashed #4169e1',
              }}
            >
              <label
                htmlFor="file-upload"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                }}
              >
                Upload ChordPro File (.cho, .chopro, .crd):
              </label>
              <input
                type="file"
                id="file-upload"
                accept=".cho,.chopro,.crd"
                onChange={handleFileUpload}
                disabled={isFileUploading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                }}
              />
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#666',
                  margin: '0.5rem 0 0 0',
                }}
              >
                {isFileUploading
                  ? 'Reading file...'
                  : 'Optional: Upload a ChordPro file to automatically fill the title and content fields. You can still edit them after upload.'}
              </p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="content">Content (ChordPro format):</label>
              <ChordProEditor
                id="content"
                value={newSong.content}
                onChange={(value) => setNewSong({ ...newSong, content: value })}
                placeholder="Enter chords and lyrics in ChordPro format&#10;Example:&#10;{title: My Song}&#10;{artist: Artist Name}&#10;# This is a comment&#10;[C]Here are the [G]lyrics [Am]with [F]chords"
                required
                rows={6}
                style={{ width: '100%', margin: '0.5rem 0' }}
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary">
                Create Song
              </button>
              {googleOAuth2Service.isAuthenticated() && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleSaveNewSongToGoogleDrive}
                  disabled={exportingToGoogle === 'new-song'}
                  style={{
                    marginLeft: '1rem',
                    backgroundColor: '#4285f4',
                    color: 'white',
                    opacity: exportingToGoogle === 'new-song' ? 0.6 : 1,
                  }}
                  title="Save to Google Drive"
                >
                  {exportingToGoogle === 'new-song'
                    ? 'Saving...'
                    : 'Save to Drive'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
                style={{ marginLeft: '1rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {editingSong && (
          <form
            onSubmit={handleUpdateSong}
            className="edit-song-form"
            style={{
              margin: '2rem 0',
              padding: '1rem',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              border: '2px solid #4169e1',
            }}
          >
            <h3>Edit Song: {editingSong.title}</h3>
            
            {/* Real-time status indicator */}
            {isEditingRealTime && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.5rem', 
                backgroundColor: '#d4edda', 
                border: '1px solid #c3e6cb', 
                borderRadius: '4px',
                color: '#155724',
                fontSize: '0.9em'
              }}>
                🔄 Real-time editing enabled - Changes from other users will be detected
              </div>
            )}
            
            {/* Conflict notification */}
            {hasExternalChanges && !showConflictDialog && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '4px',
                color: '#856404'
              }}>
                ⚠️ This song has been updated by another user. 
                <button 
                  type="button"
                  onClick={handleShowConflictDialog}
                  style={{
                    marginLeft: '0.5rem',
                    background: 'none',
                    border: '1px solid #856404',
                    color: '#856404',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Review changes
                </button>
              </div>
            )}
            
            {/* Conflict resolution dialog */}
            {showConflictDialog && realtimeEditingSong && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '1rem', 
                backgroundColor: '#f8d7da', 
                border: '1px solid #f5c6cb', 
                borderRadius: '4px',
                color: '#721c24'
              }}>
                <h4 style={{ margin: '0 0 1rem 0' }}>⚠️ Conflicting Changes Detected</h4>
                <p style={{ margin: '0 0 1rem 0' }}>
                  The song has been updated by another user. Choose how to proceed:
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Last updated:</strong> {formatRelativeTime(realtimeEditingSong.updated_at)}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    onClick={handleAcceptExternalChanges}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Accept external changes
                  </button>
                  <button 
                    type="button"
                    onClick={handleKeepLocalChanges}
                    style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Keep my changes
                  </button>
                </div>
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="edit-title">Title:</label>
              <input
                type="text"
                id="edit-title"
                value={editSongData.title}
                onChange={(e) =>
                  setEditSongData({ ...editSongData, title: e.target.value })
                }
                placeholder="Enter song title"
                required
                style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="edit-content">Content (ChordPro format):</label>
              <ChordProEditor
                id="edit-content"
                value={editSongData.content}
                onChange={(value) =>
                  setEditSongData({ ...editSongData, content: value })
                }
                placeholder="Enter chords and lyrics in ChordPro format&#10;Example:&#10;{title: My Song}&#10;{artist: Artist Name}&#10;# This is a comment&#10;[C]Here are the [G]lyrics [Am]with [F]chords"
                required
                rows={8}
                style={{ width: '100%', margin: '0.5rem 0' }}
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
              {googleOAuth2Service.isAuthenticated() && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleSaveEditedSongToGoogleDrive}
                  disabled={
                    exportingToGoogle === editingSong?.id ||
                    exportingToGoogle === 'edit-song'
                  }
                  style={{
                    marginLeft: '1rem',
                    backgroundColor: '#4285f4',
                    color: 'white',
                    opacity:
                      exportingToGoogle === editingSong?.id ||
                      exportingToGoogle === 'edit-song'
                        ? 0.6
                        : 1,
                  }}
                  title="Save to Google Drive"
                >
                  {exportingToGoogle === editingSong?.id ||
                  exportingToGoogle === 'edit-song'
                    ? 'Saving...'
                    : 'Save to Drive'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                style={{ marginLeft: '1rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {viewingSong && (
          <div
            className="view-song-section"
            style={{
              margin: '2rem 0',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px solid #6c757d',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3>Viewing: {viewingSong.title}</h3>
              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDownloadSong(viewingSong.id)}
                  style={{ marginRight: '0.5rem' }}
                  aria-label="Download the song in ChordPro format"
                  title="Download the song in ChordPro format"
                >
                  Download
                </button>
                {googleOAuth2Service.isAuthenticated() && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleExportToGoogleDrive(viewingSong)}
                    disabled={exportingToGoogle === viewingSong.id}
                    style={{
                      marginRight: '0.5rem',
                      backgroundColor: '#4285f4',
                      color: 'white',
                      opacity: exportingToGoogle === viewingSong.id ? 0.6 : 1,
                    }}
                    title="Export to Google Drive"
                  >
                    {exportingToGoogle === viewingSong.id
                      ? 'Exporting...'
                      : 'Export to Drive'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseView}
                >
                  Close
                </button>
              </div>
            </div>
            <div
              style={{
                backgroundColor: '#fff',
                padding: '1rem',
                borderRadius: '4px',
              }}
            >
              <ChordProViewer content={viewingSong.content} />
            </div>
          </div>
        )}
      </div>

      <div className="songs-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h2>Your Songs ({songs.length})</h2>
          {isRealTime && (
            <span 
              style={{ 
                fontSize: '12px', 
                color: '#28a745', 
                backgroundColor: '#e8f5e8', 
                padding: '2px 8px', 
                borderRadius: '12px',
                border: '1px solid #28a745'
              }}
              title="Songs update automatically when changes are made"
            >
              🔄 Real-time
            </span>
          )}
        </div>

        {songs.length === 0 ? (
          <div className="no-songs">
            <p>
              You haven't created any songs yet. Create your first song to get
              started!
            </p>
          </div>
        ) : (
          <div className="songs-grid">
            {songs.map((song) => (
              <div
                key={song.id}
                className="song-card"
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  margin: '1rem 0',
                  backgroundColor: '#fff',
                }}
              >
                <h3>{song.title}</h3>
                <div
                  className="song-metadata"
                  style={{
                    fontSize: '0.8rem',
                    color: '#888',
                    marginBottom: '0.5rem',
                  }}
                >
                  Last modified: {formatRelativeTime(song.updated_at)}
                </div>
                <div
                  className="song-content"
                  style={{
                    marginBottom: '1rem',
                    border: '1px solid #eee',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <ChordProViewer
                    content={
                      song.content.length > 300
                        ? `${song.content.substring(0, 300)}...`
                        : song.content
                    }
                    showMetadata={false}
                    maxHeight="150px"
                    className="song-preview"
                  />
                  {song.content.length > 300 && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#888',
                        marginTop: '0.5rem',
                        fontStyle: 'italic',
                      }}
                    >
                      Content truncated... Click "View" to see full song
                    </div>
                  )}
                </div>
                <div className="song-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleViewSong(song)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEditSong(song)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleDownloadSong(song.id)}
                    style={{
                      marginRight: '0.5rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                    }}
                    title="Download as ChordPro file"
                  >
                    Download
                  </button>
                  {googleOAuth2Service.isAuthenticated() && (
                    <button
                      className="btn"
                      onClick={() => handleExportToGoogleDrive(song)}
                      disabled={exportingToGoogle === song.id}
                      style={{
                        marginRight: '0.5rem',
                        backgroundColor: '#4285f4',
                        color: 'white',
                        opacity: exportingToGoogle === song.id ? 0.6 : 1,
                      }}
                      title="Export to Google Drive"
                    >
                      {exportingToGoogle === song.id
                        ? 'Exporting...'
                        : 'Export to Drive'}
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteSong(song.id)}
                    style={{ backgroundColor: '#dc3545', color: 'white' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
