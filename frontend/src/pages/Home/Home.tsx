import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { formatRelativeTime } from '../../utils';
import type { Song } from '../../types';
import { ChordProEditor, ChordProViewer } from '../../components';
import './Home.css';

const Home: React.FC = () => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', content: '' });
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editSongData, setEditSongData] = useState({ title: '', content: '' });
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getSongs();
      if (response.status === 'success') {
        setSongs(response.data.songs);
      } else {
        setError('Failed to load songs');
      }
    } catch (err) {
      console.error('Error loading songs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load songs');
    } finally {
      setIsLoading(false);
    }
  };

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
        loadSongs(); // Reload songs list
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
      loadSongs(); // Reload songs list
    } catch (err) {
      console.error('Error deleting song:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete song');
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setEditSongData({ title: song.title, content: song.content });
    setShowCreateForm(false); // Hide create form if open
    setViewingSong(null); // Hide view if open
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
        loadSongs(); // Reload songs list
      }
    } catch (err) {
      console.error('Error updating song:', err);
      setError(err instanceof Error ? err.message : 'Failed to update song');
    }
  };

  const handleCancelEdit = () => {
    setEditingSong(null);
    setEditSongData({ title: '', content: '' });
  };

  const handleViewSong = (song: Song) => {
    setViewingSong(song);
    setShowCreateForm(false); // Hide create form if open
    setEditingSong(null); // Hide edit if open
  };

  const handleCloseView = () => {
    setViewingSong(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file extension
    const allowedExtensions = ['.cho', '.chopro', '.crd'];
    const lastDotIndex = file.name.lastIndexOf('.');
    if (lastDotIndex === -1) {
      setError('Invalid file type. The uploaded file does not have an extension.');
      return;
    }

    const fileExtension = file.name.toLowerCase().substring(lastDotIndex);
    
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`Invalid file type. Please upload a ChordPro file with one of these extensions: ${allowedExtensions.join(', ')}`);
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
        extractedTitle = lastDotIndex === -1 ? file.name : file.name.substring(0, lastDotIndex);
      }

      // Update the form with the file content
      setNewSong({
        title: extractedTitle,
        content: content
      });

      // Clear the file input
      event.target.value = '';
      
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error reading ChordPro file. Please make sure the file is valid and not corrupted.');
    } finally {
      setIsFileUploading(false);
    }
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
        
        {error && (
          <div className="error-message" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
            {error}
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
              }
            }}
          >
            {showCreateForm ? 'Cancel' : 'Create New Song'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateSong} className="create-song-form" style={{ margin: '2rem 0', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <h3>Create New Song</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="title">Title:</label>
              <input
                type="text"
                id="title"
                value={newSong.title}
                onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                placeholder="Enter song title"
                required
                style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
              />
            </div>
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e8f4f8', borderRadius: '4px', border: '1px dashed #4169e1' }}>
              <label htmlFor="file-upload" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
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
                  backgroundColor: '#fff' 
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0 0' }}>
                {isFileUploading 
                  ? 'Reading file...' 
                  : 'Optional: Upload a ChordPro file to automatically fill the title and content fields. You can still edit them after upload.'
                }
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
              <button type="submit" className="btn btn-primary">Create Song</button>
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
          <form onSubmit={handleUpdateSong} className="edit-song-form" style={{ margin: '2rem 0', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '2px solid #4169e1' }}>
            <h3>Edit Song: {editingSong.title}</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="edit-title">Title:</label>
              <input
                type="text"
                id="edit-title"
                value={editSongData.title}
                onChange={(e) => setEditSongData({ ...editSongData, title: e.target.value })}
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
                onChange={(value) => setEditSongData({ ...editSongData, content: value })}
                placeholder="Enter chords and lyrics in ChordPro format&#10;Example:&#10;{title: My Song}&#10;{artist: Artist Name}&#10;# This is a comment&#10;[C]Here are the [G]lyrics [Am]with [F]chords"
                required
                rows={8}
                style={{ width: '100%', margin: '0.5rem 0' }}
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary">Save Changes</button>
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
          <div className="view-song-section" style={{ margin: '2rem 0', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px solid #6c757d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Viewing: {viewingSong.title}</h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCloseView}
              >
                Close
              </button>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px' }}>
              <ChordProViewer content={viewingSong.content} />
            </div>
          </div>
        )}
      </div>

      <div className="songs-section">
        <h2>Your Songs ({songs.length})</h2>
        
        {songs.length === 0 ? (
          <div className="no-songs">
            <p>You haven't created any songs yet. Create your first song to get started!</p>
          </div>
        ) : (
          <div className="songs-grid">
            {songs.map((song) => (
              <div key={song.id} className="song-card" style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', margin: '1rem 0', backgroundColor: '#fff' }}>
                <h3>{song.title}</h3>
                <div className="song-metadata" style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
                  Last modified: {formatRelativeTime(song.updated_at)}
                </div>
                <div className="song-content" style={{ marginBottom: '1rem', border: '1px solid #eee', borderRadius: '4px', padding: '0.5rem', backgroundColor: '#fafafa' }}>
                  <ChordProViewer 
                    content={song.content.length > 300 ? `${song.content.substring(0, 300)}...` : song.content}
                    showMetadata={false}
                    maxHeight="150px"
                    className="song-preview"
                  />
                  {song.content.length > 300 && (
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem', fontStyle: 'italic' }}>
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
