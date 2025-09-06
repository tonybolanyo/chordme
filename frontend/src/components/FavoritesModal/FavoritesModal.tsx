import React, { useState, useEffect } from 'react';
import { favoritesService, FavoriteSong, FavoriteQuery } from '../../services/favoritesService';
import './FavoritesModal.css';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong?: (songId: number) => void;
  onSelectQuery?: (query: FavoriteQuery) => void;
}

type TabType = 'songs' | 'queries' | 'history' | 'privacy' | 'export';

const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  onSelectSong,
  onSelectQuery
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('songs');
  const [favoriteSongs, setFavoriteSongs] = useState<FavoriteSong[]>([]);
  const [favoriteQueries, setFavoriteQueries] = useState<FavoriteQuery[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    clearOnExit: false,
    trackHistory: true
  });

  // New favorite query form
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [queryFormData, setQueryFormData] = useState({
    name: '',
    query: '',
    filters: {}
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadPrivacySettings();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load favorite songs
      const songsResponse = await favoritesService.getFavoriteSongs({ limit: 100 });
      setFavoriteSongs(songsResponse.data.favorites);

      // Load favorite queries
      const queries = favoritesService.getFavoriteQueries();
      setFavoriteQueries(queries);

      // Load search history
      const history = favoritesService.getSearchHistory();
      setSearchHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const loadPrivacySettings = () => {
    const settings = favoritesService.getSearchPrivacySettings();
    setPrivacySettings(settings);
  };

  const handleRemoveFavoriteSong = async (songId: number) => {
    try {
      await favoritesService.toggleSongFavorite(songId);
      setFavoriteSongs(songs => songs.filter(song => song.song_id !== songId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorite');
    }
  };

  const handleDeleteFavoriteQuery = (queryId: string | number) => {
    favoritesService.deleteFavoriteQuery(queryId);
    setFavoriteQueries(queries => queries.filter(q => q.id !== queryId));
  };

  const handleUseFavoriteQuery = (query: FavoriteQuery) => {
    const updatedQuery = favoritesService.useFavoriteQuery(query.id);
    if (updatedQuery && onSelectQuery) {
      onSelectQuery(updatedQuery);
      onClose();
    }
  };

  const handleSaveFavoriteQuery = () => {
    if (!queryFormData.name.trim() || !queryFormData.query.trim()) {
      setError('Name and query are required');
      return;
    }

    try {
      favoritesService.saveFavoriteQuery(
        queryFormData.name,
        queryFormData.query,
        queryFormData.filters
      );
      setQueryFormData({ name: '', query: '', filters: {} });
      setShowQueryForm(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save favorite query');
    }
  };

  const handlePrivacySettingsChange = (setting: keyof typeof privacySettings, value: boolean) => {
    const newSettings = { ...privacySettings, [setting]: value };
    setPrivacySettings(newSettings);
    favoritesService.setSearchPrivacySettings(newSettings);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your search history? This action cannot be undone.')) {
      favoritesService.clearSearchHistory();
      setSearchHistory([]);
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = await favoritesService.exportFavorites('json');
      
      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chordme-favorites-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="favorites-modal-overlay" onClick={onClose}>
      <div className="favorites-modal" onClick={e => e.stopPropagation()}>
        <div className="favorites-modal-header">
          <h2>Favorites & History</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="favorites-modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
            onClick={() => setActiveTab('songs')}
          >
            Favorite Songs ({favoriteSongs.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'queries' ? 'active' : ''}`}
            onClick={() => setActiveTab('queries')}
          >
            Saved Searches ({favoriteQueries.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Search History ({searchHistory.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy
          </button>
          <button 
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </div>

        <div className="favorites-modal-content">
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {loading && <div className="loading">Loading...</div>}

          {activeTab === 'songs' && (
            <div className="favorites-tab">
              <div className="favorites-header">
                <h3>Favorite Songs</h3>
                <p>{favoriteSongs.length} songs saved</p>
              </div>
              
              {favoriteSongs.length === 0 ? (
                <div className="empty-state">
                  <p>No favorite songs yet. Start favoriting songs while browsing!</p>
                </div>
              ) : (
                <div className="favorites-list">
                  {favoriteSongs.map((song) => (
                    <div key={song.id} className="favorite-item">
                      <div className="favorite-item-info">
                        <h4>{song.title}</h4>
                        <p>{song.artist}</p>
                        <span className="genre">{song.genre}</span>
                        <span className="date">
                          Favorited: {new Date(song.favorited_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="favorite-item-actions">
                        <button 
                          className="btn-primary"
                          onClick={() => onSelectSong?.(song.song_id)}
                        >
                          Open
                        </button>
                        <button 
                          className="btn-danger"
                          onClick={() => handleRemoveFavoriteSong(song.song_id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'queries' && (
            <div className="favorites-tab">
              <div className="favorites-header">
                <h3>Saved Searches</h3>
                <button 
                  className="btn-primary"
                  onClick={() => setShowQueryForm(true)}
                >
                  Save Current Search
                </button>
              </div>

              {showQueryForm && (
                <div className="query-form">
                  <h4>Save Search Query</h4>
                  <input
                    type="text"
                    placeholder="Name for this search..."
                    value={queryFormData.name}
                    onChange={(e) => setQueryFormData({...queryFormData, name: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Search query..."
                    value={queryFormData.query}
                    onChange={(e) => setQueryFormData({...queryFormData, query: e.target.value})}
                  />
                  <div className="form-actions">
                    <button className="btn-primary" onClick={handleSaveFavoriteQuery}>
                      Save
                    </button>
                    <button className="btn-secondary" onClick={() => setShowQueryForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {favoriteQueries.length === 0 ? (
                <div className="empty-state">
                  <p>No saved searches yet. Save frequently used searches for quick access!</p>
                </div>
              ) : (
                <div className="favorites-list">
                  {favoriteQueries.map((query) => (
                    <div key={query.id} className="favorite-item">
                      <div className="favorite-item-info">
                        <h4>{query.name}</h4>
                        <p>"{query.query}"</p>
                        <span className="usage-count">Used {query.usage_count} times</span>
                        <span className="date">
                          Created: {new Date(query.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="favorite-item-actions">
                        <button 
                          className="btn-primary"
                          onClick={() => handleUseFavoriteQuery(query)}
                        >
                          Use
                        </button>
                        <button 
                          className="btn-danger"
                          onClick={() => handleDeleteFavoriteQuery(query.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="favorites-tab">
              <div className="favorites-header">
                <h3>Search History</h3>
                <button 
                  className="btn-danger"
                  onClick={handleClearHistory}
                >
                  Clear History
                </button>
              </div>
              
              {searchHistory.length === 0 ? (
                <div className="empty-state">
                  <p>No search history available.</p>
                </div>
              ) : (
                <div className="history-list">
                  {searchHistory.map((item, index) => (
                    <div key={index} className="history-item">
                      <div className="history-item-info">
                        <p>"{item.query}"</p>
                        <span className="results-count">{item.results_count} results</span>
                        <span className="date">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button 
                        className="btn-secondary"
                        onClick={() => onSelectQuery?.({
                          id: `history-${index}`,
                          name: `Search: ${item.query}`,
                          query: item.query,
                          filters: {},
                          created_at: new Date(item.timestamp).toISOString(),
                          usage_count: 0
                        })}
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="favorites-tab">
              <div className="privacy-settings">
                <h3>Privacy Settings</h3>
                
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={privacySettings.trackHistory}
                      onChange={(e) => handlePrivacySettingsChange('trackHistory', e.target.checked)}
                    />
                    Track search history
                  </label>
                  <p>Save your search queries for quick access and suggestions</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={privacySettings.clearOnExit}
                      onChange={(e) => handlePrivacySettingsChange('clearOnExit', e.target.checked)}
                    />
                    Clear history when closing app
                  </label>
                  <p>Automatically clear search history when you close ChordMe</p>
                </div>

                <div className="privacy-actions">
                  <button 
                    className="btn-danger"
                    onClick={handleClearHistory}
                  >
                    Clear All History Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="favorites-tab">
              <div className="export-section">
                <h3>Export Your Data</h3>
                <p>Download all your favorites, search history, and settings.</p>
                
                <div className="export-options">
                  <div className="export-item">
                    <h4>JSON Export</h4>
                    <p>Complete data export including all favorites and settings</p>
                    <button className="btn-primary" onClick={handleExportData}>
                      Download JSON
                    </button>
                  </div>
                  
                  <div className="export-item">
                    <h4>CSV Export</h4>
                    <p>Simplified format for spreadsheet applications</p>
                    <button className="btn-secondary" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>

                <div className="export-info">
                  <h4>What's included:</h4>
                  <ul>
                    <li>Favorite songs ({favoriteSongs.length} items)</li>
                    <li>Saved search queries ({favoriteQueries.length} items)</li>
                    <li>Search history ({searchHistory.length} items)</li>
                    <li>Privacy settings</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoritesModal;