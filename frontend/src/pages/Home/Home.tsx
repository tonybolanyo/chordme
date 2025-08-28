import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { googleOAuth2Service } from '../../services/googleOAuth';
import { formatRelativeTime } from '../../utils';
import { useRealtimeSongs } from '../../hooks/useRealtimeSongs';
import { useRealtimeSong } from '../../hooks/useRealtimeSong';
import type { Song, DriveFile, SharingNotification } from '../../types';
import type { SongVersion } from '../../services/versionHistory';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import {
  ChordProEditor,
  ChordProViewer,
  GoogleDriveFileList,
  SongSharingModal,
  NotificationContainer,
  HistoryPanel,
  UndoRedoControls,
  PDFExportModal,
} from '../../components';
import type { PDFExportOptions } from '../../components';
import './Home.css';

const Home: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  // Use real-time songs hook instead of manual state management
  const {
    songs,
    loading: isLoading,
    error: songsError,
    isRealTime,
    refetch: reloadSongs,
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

  // Sharing state
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [songToShare, setSongToShare] = useState<Song | null>(null);
  const [notifications, setNotifications] = useState<SharingNotification[]>([]);

  // PDF Export state
  const [pdfExportModalOpen, setPdfExportModalOpen] = useState(false);
  const [songToExportPDF, setSongToExportPDF] = useState<Song | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Real-time editing state
  const [hasExternalChanges, setHasExternalChanges] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Version history and undo/redo state
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Initialize undo/redo for editing
  const undoRedo = useUndoRedo({
    title: editSongData.title,
    content: editSongData.content,
  });

  // Subscribe to real-time updates for the song being edited
  const { song: realtimeEditingSong, isRealTime: isEditingRealTime } =
    useRealtimeSong(editingSong?.id || null);

  // Combine real-time songs error with other errors
  const displayError = error || songsError;

  // Monitor external changes to the song being edited
  useEffect(() => {
    if (!editingSong || !realtimeEditingSong || !isEditingRealTime) {
      setHasExternalChanges(false);
      return;
    }

    // Check if the real-time song data differs from our editing state
    const hasContentChanged =
      realtimeEditingSong.content !== editSongData.content;
    const hasTitleChanged = realtimeEditingSong.title !== editSongData.title;
    const hasTimestampChanged =
      realtimeEditingSong.updated_at !== editingSong.updated_at;

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

  const handleExportSongAsPDF = (song: Song) => {
    setSongToExportPDF(song);
    setPdfExportModalOpen(true);
  };

  const handlePDFExport = async (options: PDFExportOptions) => {
    if (!songToExportPDF) return;

    try {
      setIsExportingPDF(true);
      setError(null);

      await apiService.exportSongAsPDF(songToExportPDF.id, options);

      // Close modal on success
      setPdfExportModalOpen(false);
      setSongToExportPDF(null);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleClosePDFModal = () => {
    if (!isExportingPDF) {
      setPdfExportModalOpen(false);
      setSongToExportPDF(null);
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    const initialState = { title: song.title, content: song.content };
    setEditSongData(initialState);

    // Reset undo/redo history and set initial state
    undoRedo.clearHistory();
    undoRedo.setState(initialState);

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
      const newState = {
        title: realtimeEditingSong.title,
        content: realtimeEditingSong.content,
      };
      setEditSongData(newState);
      undoRedo.setState(newState);
      setHasExternalChanges(false);
      setShowConflictDialog(false);
    } else {
      setError(
        'External song data is incomplete or invalid. Please try again or reload.'
      );
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
    undoRedo.clearHistory();
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    const previousState = undoRedo.undo();
    if (previousState) {
      setEditSongData(previousState);
    }
  };

  const handleRedo = () => {
    const nextState = undoRedo.redo();
    if (nextState) {
      setEditSongData(nextState);
    }
  };

  // Version history handlers
  const handleShowHistory = () => {
    setShowHistoryPanel(true);
  };

  const handleCloseHistory = () => {
    setShowHistoryPanel(false);
  };

  const handleRestoreVersion = (version: SongVersion) => {
    // Update the editing state with restored content
    const restoredState = { title: version.title, content: version.content };
    setEditSongData(restoredState);
    undoRedo.setState(restoredState);
    setShowHistoryPanel(false);
  };

  const handlePreviewVersion = (version: SongVersion) => {
    // For now, just show an alert with version info
    // In a more advanced implementation, this could show a side-by-side preview
    alert(
      `Preview of Version ${version.version_number}:\n\nTitle: ${version.title}\n\nCreated: ${new Date(version.created_at).toLocaleString()}`
    );
  };

  // Update undo/redo state when edit data changes
  const handleEditDataChange = (newData: {
    title?: string;
    content?: string;
  }) => {
    const updatedData = { ...editSongData, ...newData };
    setEditSongData(updatedData);
    undoRedo.setState(updatedData);
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

  // Sharing handlers
  const handleShareSong = (song: Song) => {
    setSongToShare(song);
    setSharingModalOpen(true);
  };

  const handleCloseSharingModal = () => {
    setSharingModalOpen(false);
    setSongToShare(null);
  };

  const handleShareUpdate = () => {
    // Reload songs to get updated sharing information
    if (!isRealTime) {
      loadSongs();
    }
    // For real-time, the updates will come automatically
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Helper function to get user permission level for a song
  const getUserPermission = (song: Song): string => {
    const currentUser = localStorage.getItem('authUser');
    if (!currentUser) return 'none';

    try {
      const user = JSON.parse(currentUser);
      if (song.author_id === user.id) return 'owner';
      return song.user_permission || 'none';
    } catch {
      return 'none';
    }
  };

  // Helper function to check if user can share a song
  const canUserShare = (song: Song): boolean => {
    const permission = getUserPermission(song);
    return permission === 'owner' || permission === 'admin';
  };

  // Helper functions to categorize songs
  const getMySongs = (): Song[] => {
    return songs.filter((song) => getUserPermission(song) === 'owner');
  };

  const getSharedSongs = (): Song[] => {
    return songs.filter((song) => {
      const permission = getUserPermission(song);
      return (
        permission === 'read' || permission === 'edit' || permission === 'admin'
      );
    });
  };

  // Sorting and filtering state for dashboard sections
  const [mySongsSort, setMySongsSort] = useState<'title' | 'date' | 'updated'>(
    'updated'
  );
  const [sharedSongsSort, setSharedSongsSort] = useState<
    'title' | 'date' | 'updated'
  >('updated');
  const [sharedSongsFilter, setSharedSongsFilter] = useState<
    'all' | 'read' | 'edit' | 'admin'
  >('all');

  // Apply sorting to songs
  const sortSongs = (
    songList: Song[],
    sortBy: 'title' | 'date' | 'updated'
  ): Song[] => {
    return [...songList].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'date':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case 'updated':
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        default:
          return 0;
      }
    });
  };

  // Apply filtering to shared songs
  const filterSharedSongs = (
    songList: Song[],
    filterBy: 'all' | 'read' | 'edit' | 'admin'
  ): Song[] => {
    if (filterBy === 'all') return songList;
    return songList.filter((song) => getUserPermission(song) === filterBy);
  };

  // Get processed song lists
  const getMySongsSorted = (): Song[] => {
    return sortSongs(getMySongs(), mySongsSort);
  };

  const getSharedSongsSorted = (): Song[] => {
    const filtered = filterSharedSongs(getSharedSongs(), sharedSongsFilter);
    return sortSongs(filtered, sharedSongsSort);
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
            {showCreateForm ? t('common.cancel') : t('songs.createNewSong')}
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
              <label htmlFor="title">{t('songs.title')}</label>
              <input
                type="text"
                id="title"
                value={newSong.title}
                onChange={(e) =>
                  setNewSong({ ...newSong, title: e.target.value })
                }
                placeholder={t('songs.titlePlaceholder')}
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
                {t('songs.createSong')}
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
                {t('common.cancel')}
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0 }}>Edit Song: {editingSong.title}</h3>
              <UndoRedoControls
                canUndo={undoRedo.canUndo}
                canRedo={undoRedo.canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onShowHistory={handleShowHistory}
              />
            </div>

            {/* Real-time status indicator */}
            {isEditingRealTime && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '4px',
                  color: '#155724',
                  fontSize: '0.9em',
                }}
              >
                🔄 Real-time editing enabled - Changes from other users will be
                detected
              </div>
            )}

            {/* Conflict notification */}
            {hasExternalChanges && !showConflictDialog && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '4px',
                  color: '#856404',
                }}
              >
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
                    cursor: 'pointer',
                  }}
                >
                  Review changes
                </button>
              </div>
            )}

            {/* Conflict resolution dialog */}
            {showConflictDialog && realtimeEditingSong && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px',
                  color: '#721c24',
                }}
              >
                <h4 style={{ margin: '0 0 1rem 0' }}>
                  ⚠️ Conflicting Changes Detected
                </h4>
                <p style={{ margin: '0 0 1rem 0' }}>
                  The song has been updated by another user. Choose how to
                  proceed:
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Last updated:</strong>{' '}
                  {formatRelativeTime(realtimeEditingSong.updated_at)}
                </div>
                <div
                  style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                >
                  <button
                    type="button"
                    onClick={handleAcceptExternalChanges}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
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
                      cursor: 'pointer',
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
                  handleEditDataChange({ title: e.target.value })
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
                onChange={(value) => handleEditDataChange({ content: value })}
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
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleExportSongAsPDF(viewingSong)}
                  style={{
                    marginRight: '0.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                  }}
                  aria-label="Export the song as PDF"
                  title="Export the song as PDF"
                >
                  Export PDF
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

      {/* My Songs Section */}
      <div className="my-songs-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h2>My Songs ({getMySongs().length})</h2>
          {isRealTime && (
            <span
              style={{
                fontSize: '12px',
                color: '#28a745',
                backgroundColor: '#e8f5e8',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #28a745',
              }}
              title="Songs update automatically when changes are made"
            >
              🔄 Real-time
            </span>
          )}
        </div>

        {/* My Songs Controls */}
        {getMySongs().length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
              padding: '0.5rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              Sort by:
              <select
                value={mySongsSort}
                onChange={(e) =>
                  setMySongsSort(e.target.value as 'title' | 'date' | 'updated')
                }
                style={{
                  padding: '0.25rem',
                  fontSize: '0.9rem',
                  borderRadius: '3px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="updated">Last Modified</option>
                <option value="title">Title</option>
                <option value="date">Created Date</option>
              </select>
            </label>
          </div>
        )}

        {getMySongs().length === 0 ? (
          <div className="no-songs">
            <p>
              You haven't created any songs yet. Create your first song to get
              started!
            </p>
          </div>
        ) : (
          <div className="songs-grid">
            {getMySongsSorted().map((song) => (
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h3 style={{ margin: 0 }}>{song.title}</h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {/* Ownership/Permission indicator */}
                    {getUserPermission(song) === 'owner' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#4169e1',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title="You own this song"
                      >
                        Owner
                      </span>
                    )}
                    {getUserPermission(song) === 'admin' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title="You have admin access to this song"
                      >
                        Admin
                      </span>
                    )}
                    {getUserPermission(song) === 'edit' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#7b1fa2',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title="You can edit this song"
                      >
                        Editor
                      </span>
                    )}
                    {getUserPermission(song) === 'read' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#1976d2',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title="You have read-only access to this song"
                      >
                        Reader
                      </span>
                    )}
                    {/* Collaboration indicator */}
                    {song.shared_with && song.shared_with.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title={`Shared with ${song.shared_with.length} collaborator${song.shared_with.length === 1 ? '' : 's'}`}
                      >
                        👥 {song.shared_with.length}
                      </span>
                    )}
                  </div>
                </div>
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
                  <button
                    className="btn"
                    onClick={() => handleExportSongAsPDF(song)}
                    style={{
                      marginRight: '0.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                    }}
                    title="Export as PDF"
                  >
                    PDF
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
                  {canUserShare(song) && (
                    <button
                      className="btn"
                      onClick={() => handleShareSong(song)}
                      style={{
                        marginRight: '0.5rem',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                      }}
                      title="Share this song with others"
                    >
                      Share
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

      {/* Shared with Me Section */}
      <div className="shared-songs-section" style={{ marginTop: '3rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h2>Shared with Me ({getSharedSongs().length})</h2>
          {isRealTime && (
            <span
              style={{
                fontSize: '12px',
                color: '#28a745',
                backgroundColor: '#e8f5e8',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #28a745',
              }}
              title="Shared songs update automatically when changes are made"
            >
              🔄 Real-time
            </span>
          )}
        </div>

        {/* Shared Songs Controls */}
        {getSharedSongs().length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
              padding: '0.5rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              Filter by permission:
              <select
                value={sharedSongsFilter}
                onChange={(e) =>
                  setSharedSongsFilter(
                    e.target.value as 'all' | 'read' | 'edit' | 'admin'
                  )
                }
                style={{
                  padding: '0.25rem',
                  fontSize: '0.9rem',
                  borderRadius: '3px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="all">All Permissions</option>
                <option value="admin">Admin Access</option>
                <option value="edit">Edit Access</option>
                <option value="read">Read Only</option>
              </select>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              Sort by:
              <select
                value={sharedSongsSort}
                onChange={(e) =>
                  setSharedSongsSort(
                    e.target.value as 'title' | 'date' | 'updated'
                  )
                }
                style={{
                  padding: '0.25rem',
                  fontSize: '0.9rem',
                  borderRadius: '3px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="updated">Last Modified</option>
                <option value="title">Title</option>
                <option value="date">Created Date</option>
              </select>
            </label>
          </div>
        )}

        {getSharedSongs().length === 0 ? (
          <div
            className="no-shared-songs"
            style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
            }}
          >
            <p style={{ margin: 0, color: '#6c757d' }}>
              No songs have been shared with you yet. When other users share
              songs with you, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="songs-grid">
            {getSharedSongsSorted().map((song) => (
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h3 style={{ margin: 0 }}>{song.title}</h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {/* Permission indicator for shared songs */}
                    {getUserPermission(song) === 'admin' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title="You have admin access to this song"
                      >
                        Admin
                      </span>
                    )}
                    {getUserPermission(song) === 'edit' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#7b1fa2',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title="You can edit this song"
                      >
                        Editor
                      </span>
                    )}
                    {getUserPermission(song) === 'read' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#1976d2',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title="You have read-only access to this song"
                      >
                        Reader
                      </span>
                    )}
                    {/* Collaboration indicator */}
                    {song.shared_with && song.shared_with.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: '500',
                        }}
                        title={`Shared with ${song.shared_with.length} collaborator${song.shared_with.length === 1 ? '' : 's'}`}
                      >
                        👥 {song.shared_with.length}
                      </span>
                    )}
                  </div>
                </div>
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
                  {/* Only show edit button if user has edit or admin permission */}
                  {(getUserPermission(song) === 'edit' ||
                    getUserPermission(song) === 'admin') && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleEditSong(song)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      Edit
                    </button>
                  )}
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
                  <button
                    className="btn"
                    onClick={() => handleExportSongAsPDF(song)}
                    style={{
                      marginRight: '0.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                    }}
                    title="Export as PDF"
                  >
                    PDF
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
                  {/* Only allow sharing if user has admin permission */}
                  {canUserShare(song) && (
                    <button
                      className="btn"
                      onClick={() => handleShareSong(song)}
                      style={{
                        marginRight: '0.5rem',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                      }}
                      title="Share this song with others"
                    >
                      Share
                    </button>
                  )}
                  {/* Only allow deletion if user is owner (shouldn't happen in shared section, but good safety check) */}
                  {getUserPermission(song) === 'owner' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteSong(song.id)}
                      style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sharing Modal */}
      {songToShare && (
        <SongSharingModal
          song={songToShare}
          isOpen={sharingModalOpen}
          onClose={handleCloseSharingModal}
          onShareUpdate={handleShareUpdate}
        />
      )}

      {/* PDF Export Modal */}
      {songToExportPDF && (
        <PDFExportModal
          song={songToExportPDF}
          isOpen={pdfExportModalOpen}
          onClose={handleClosePDFModal}
          onExport={handlePDFExport}
          isExporting={isExportingPDF}
        />
      )}

      {/* Notification Container */}
      <NotificationContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />

      {/* Version History Panel */}
      {editingSong && (
        <HistoryPanel
          songId={editingSong.id}
          currentTitle={editSongData.title}
          currentContent={editSongData.content}
          isOpen={showHistoryPanel}
          onClose={handleCloseHistory}
          onRestore={handleRestoreVersion}
          onPreview={handlePreviewVersion}
        />
      )}
    </div>
  );
};

export default Home;
