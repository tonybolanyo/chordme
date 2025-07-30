import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { formatRelativeTime } from '../../utils';
import type { Song } from '../../types';
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
            onClick={() => setShowCreateForm(!showCreateForm)}
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
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="content">Content (Chords and Lyrics):</label>
              <textarea
                id="content"
                value={newSong.content}
                onChange={(e) => setNewSong({ ...newSong, content: e.target.value })}
                placeholder="Enter chords and lyrics (e.g., C G Am F&#10;Verse lyrics here)"
                required
                rows={6}
                style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
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
              <textarea
                id="edit-content"
                value={editSongData.content}
                onChange={(e) => setEditSongData({ ...editSongData, content: e.target.value })}
                placeholder="Enter chords and lyrics in ChordPro format&#10;Example:&#10;[C]Verse lyrics [G]with chords&#10;{chorus}&#10;[F]Chorus lyrics [C]here"
                required
                rows={8}
                style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0', fontFamily: 'monospace' }}
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
                <div className="song-content" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  {song.content.length > 150 ? `${song.content.substring(0, 150)}...` : song.content}
                </div>
                <div className="song-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleEditSong(song)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDeleteSong(song.id)}
                    style={{ marginLeft: '0.5rem', backgroundColor: '#dc3545', color: 'white' }}
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
