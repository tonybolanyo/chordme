/**
 * SetlistBuilder - Main component for creating and editing setlists with drag-and-drop functionality
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Setlist,
  SetlistSong,
  Song,
  DraggedSong,
  DropTargetSection,
  SetlistBuilderState
} from '../../types/setlist';
import { setlistService } from '../../services/setlistService';
import './SetlistBuilder.css';

interface SetlistBuilderProps {
  setlistId?: string;
  templateId?: string;
  onSave?: (setlist: Setlist) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export const SetlistBuilder: React.FC<SetlistBuilderProps> = ({
  setlistId,
  templateId,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const { t } = useTranslation(['setlist', 'common']);
  
  // State management
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [builderState, setBuilderState] = useState<SetlistBuilderState>({
    selectedSongs: [],
    editingSection: null,
    showPreview: false,
    previewMode: 'timing',
    filterSection: null,
    searchQuery: '',
    sortBy: 'order',
    sortDirection: 'asc'
  });

  // Drag and drop state
  const [draggedSong, setDraggedSong] = useState<DraggedSong | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetSection | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);

  // Load setlist or create new one
  useEffect(() => {
    const loadSetlist = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if we're in demo mode
        const isDemoMode = window.location.hash.includes('setlist-demo');
        
        if (isDemoMode) {
          // Use mock data for demo
          const mockSetlist = {
            id: 'demo-setlist',
            name: 'Sunday Morning Worship - Demo',
            description: 'A sample setlist showcasing the drag-and-drop interface',
            user_id: 'demo-user',
            event_type: 'worship' as const,
            venue: 'Main Sanctuary',
            event_date: '2024-01-21T10:00:00Z',
            estimated_duration: 45,
            is_template: false,
            is_public: false,
            is_recurring: false,
            status: 'draft' as const,
            is_deleted: false,
            is_archived: false,
            tags: ['contemporary', 'worship'],
            view_count: 0,
            usage_count: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            songs: [
              {
                id: 'demo-setlist-song-1',
                setlist_id: 'demo-setlist',
                song_id: 'demo-song-1',
                sort_order: 1,
                section: 'opening',
                performance_key: 'G',
                performance_tempo: 120,
                is_optional: false,
                is_highlight: true,
                requires_preparation: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              {
                id: 'demo-setlist-song-2',
                setlist_id: 'demo-setlist',
                song_id: 'demo-song-2',
                sort_order: 2,
                section: 'main',
                performance_key: 'C',
                performance_tempo: 130,
                is_optional: false,
                is_highlight: false,
                requires_preparation: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              }
            ]
          };
          setSetlist(mockSetlist);
          setLoading(false);
          return;
        }

        if (setlistId) {
          // Load existing setlist
          const data = await setlistService.getSetlist(setlistId, {
            include_songs: true,
            include_collaborators: true
          });
          setSetlist(data);
        } else if (templateId) {
          // Create from template
          const template = await setlistService.getTemplate(templateId);
          const newSetlist = await setlistService.createSetlistFromTemplate(templateId, {
            name: `${template.name} - ${new Date().toLocaleDateString()}`,
            event_type: template.default_event_type
          });
          setSetlist(newSetlist);
        } else {
          // Create new empty setlist
          const newSetlist = await setlistService.createSetlist({
            name: t('setlist:new_setlist'),
            event_type: 'performance'
          });
          setSetlist(newSetlist);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load setlist');
      } finally {
        setLoading(false);
      }
    };

    loadSetlist();
  }, [setlistId, templateId, t]);

  // Load available songs for search
  useEffect(() => {
    const loadSongs = async () => {
      try {
        // Check if we're in demo mode
        const isDemoMode = window.location.hash.includes('setlist-demo');
        
        if (isDemoMode) {
          // Use mock songs for demo
          const mockSongs = [
            {
              id: 'demo-song-1',
              title: 'Amazing Grace',
              artist: 'Traditional',
              key: 'G',
              tempo: 120,
              duration: 240,
              tags: ['hymn', 'traditional']
            },
            {
              id: 'demo-song-2',
              title: 'How Great Is Our God',
              artist: 'Chris Tomlin',
              key: 'C',
              tempo: 130,
              duration: 300,
              tags: ['contemporary', 'praise']
            },
            {
              id: 'demo-song-3',
              title: '10,000 Reasons',
              artist: 'Matt Redman',
              key: 'A',
              tempo: 110,
              duration: 280,
              tags: ['contemporary', 'worship']
            },
            {
              id: 'demo-song-4',
              title: 'Blessed Be Your Name',
              artist: 'Tree63',
              key: 'D',
              tempo: 140,
              duration: 320,
              tags: ['contemporary', 'praise']
            },
            {
              id: 'demo-song-5',
              title: 'Holy Holy Holy',
              artist: 'Traditional',
              key: 'F',
              tempo: 90,
              duration: 200,
              tags: ['hymn', 'traditional']
            }
          ];
          setAvailableSongs(mockSongs);
          return;
        }
        
        const songs = await setlistService.searchSongs('', { limit: 100 });
        setAvailableSongs(songs);
      } catch (err) {
        console.error('Failed to load songs:', err);
      }
    };

    loadSongs();
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, song: Song) => {
    if (readOnly) return;

    const draggedSongData: DraggedSong = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      key: song.key,
      tempo: song.tempo,
      duration: song.duration,
      tags: song.tags
    };

    setDraggedSong(draggedSongData);
    setIsDragging(true);
    
    // Store data for external drops
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedSongData));
    e.dataTransfer.setData('application/x-chordme-song', song.id);
    e.dataTransfer.effectAllowed = 'copy';

    // Add visual feedback
    e.currentTarget.classList.add('dragging');
  }, [readOnly]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedSong(null);
    setDropTarget(null);
    setIsDragging(false);
    
    // Clean up visual feedback
    e.currentTarget.classList.remove('dragging');
    
    // Stop auto-scroll
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, section: string, position: number) => {
    if (readOnly || !isDragging) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const newDropTarget: DropTargetSection = { section, position };
    
    // Only update if target changed to avoid unnecessary re-renders
    if (!dropTarget || 
        dropTarget.section !== newDropTarget.section || 
        dropTarget.position !== newDropTarget.position) {
      setDropTarget(newDropTarget);
    }

    // Auto-scroll logic
    const element = e.currentTarget as HTMLElement;
    const scrollContainer = element.closest('.setlist-builder-content');
    
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const scrollThreshold = 50;
      
      if (e.clientY < containerRect.top + scrollThreshold) {
        // Scroll up
        if (!autoScrollInterval.current) {
          autoScrollInterval.current = setInterval(() => {
            scrollContainer.scrollTop -= 10;
          }, 50);
        }
      } else if (e.clientY > containerRect.bottom - scrollThreshold) {
        // Scroll down
        if (!autoScrollInterval.current) {
          autoScrollInterval.current = setInterval(() => {
            scrollContainer.scrollTop += 10;
          }, 50);
        }
      } else {
        // Stop auto-scroll
        if (autoScrollInterval.current) {
          clearInterval(autoScrollInterval.current);
          autoScrollInterval.current = null;
        }
      }
    }
  }, [readOnly, isDragging, dropTarget]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear drop target if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTarget(null);
      
      // Stop auto-scroll
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, section: string, position: number) => {
    if (readOnly) return;

    e.preventDefault();
    setDropTarget(null);
    setIsDragging(false);

    try {
      const songId = e.dataTransfer.getData('application/x-chordme-song');
      
      if (!songId || !setlist) return;

      // Check if we're in demo mode
      const isDemoMode = window.location.hash.includes('setlist-demo');
      
      if (isDemoMode) {
        // For demo, just show an alert and simulate the action
        const song = availableSongs.find(s => s.id === songId);
        if (song) {
          alert(`Demo: Added "${song.title}" to ${section} section!\n\nIn the real app, this would save to the database.`);
        }
        return;
      }

      // Add song to setlist
      await setlistService.addSongToSetlist(setlist.id, {
        song_id: songId,
        section,
        sort_order: position,
        is_optional: false,
        is_highlight: false,
        requires_preparation: false
      });

      // Reload setlist to get updated data
      const updatedSetlist = await setlistService.getSetlist(setlist.id, {
        include_songs: true
      });
      setSetlist(updatedSetlist);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add song to setlist');
    }
  }, [readOnly, setlist, availableSongs]);

  // Search functionality
  const handleSongSearch = useCallback(async (query: string) => {
    try {
      // Check if we're in demo mode
      const isDemoMode = window.location.hash.includes('setlist-demo');
      
      if (isDemoMode) {
        // Filter mock songs for demo
        const mockSongs = [
          {
            id: 'demo-song-1',
            title: 'Amazing Grace',
            artist: 'Traditional',
            key: 'G',
            tempo: 120,
            duration: 240,
            tags: ['hymn', 'traditional']
          },
          {
            id: 'demo-song-2',
            title: 'How Great Is Our God',
            artist: 'Chris Tomlin',
            key: 'C',
            tempo: 130,
            duration: 300,
            tags: ['contemporary', 'praise']
          },
          {
            id: 'demo-song-3',
            title: '10,000 Reasons',
            artist: 'Matt Redman',
            key: 'A',
            tempo: 110,
            duration: 280,
            tags: ['contemporary', 'worship']
          },
          {
            id: 'demo-song-4',
            title: 'Blessed Be Your Name',
            artist: 'Tree63',
            key: 'D',
            tempo: 140,
            duration: 320,
            tags: ['contemporary', 'praise']
          },
          {
            id: 'demo-song-5',
            title: 'Holy Holy Holy',
            artist: 'Traditional',
            key: 'F',
            tempo: 90,
            duration: 200,
            tags: ['hymn', 'traditional']
          }
        ];
        
        const filteredSongs = query 
          ? mockSongs.filter(song => 
              song.title.toLowerCase().includes(query.toLowerCase()) ||
              song.artist.toLowerCase().includes(query.toLowerCase())
            )
          : mockSongs;
          
        setAvailableSongs(filteredSongs);
        setBuilderState(prev => ({ ...prev, searchQuery: query }));
        return;
      }
      
      const songs = await setlistService.searchSongs(query, { limit: 50 });
      setAvailableSongs(songs);
      setBuilderState(prev => ({ ...prev, searchQuery: query }));
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, []);

  // Render functions
  const renderSongCard = (song: Song, isDraggable = true) => (
    <div
      key={song.id}
      className={`song-card ${isDraggable ? 'draggable' : ''}`}
      draggable={isDraggable && !readOnly}
      onDragStart={isDraggable ? (e) => handleDragStart(e, song) : undefined}
      onDragEnd={isDraggable ? handleDragEnd : undefined}
      role="listitem"
      tabIndex={isDraggable ? 0 : -1}
      aria-label={t('setlist:song_card_label', { title: song.title, artist: song.artist })}
    >
      <div className="song-info">
        <h4 className="song-title">{song.title}</h4>
        {song.artist && <p className="song-artist">{song.artist}</p>}
        <div className="song-meta">
          {song.key && <span className="song-key">{song.key}</span>}
          {song.tempo && <span className="song-tempo">{song.tempo} BPM</span>}
          {song.duration && (
            <span className="song-duration">
              {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
      {isDraggable && !readOnly && (
        <div className="drag-handle" aria-label={t('setlist:drag_handle')}>
          ⋮⋮
        </div>
      )}
    </div>
  );

  const renderSetlistSection = (sectionName: string, songs: SetlistSong[]) => {
    const isDropTarget = dropTarget?.section === sectionName;
    
    return (
      <div
        key={sectionName}
        className={`setlist-section ${isDropTarget ? 'drop-target' : ''}`}
        onDragOver={(e) => handleDragOver(e, sectionName, songs.length)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, sectionName, songs.length)}
      >
        <h3 className="section-title">
          {t(`setlist:section_${sectionName}`, sectionName)}
          <span className="song-count">({songs.length})</span>
        </h3>
        
        <div className="section-songs" role="list">
          {songs.map((setlistSong, index) => {
            const song = availableSongs.find(s => s.id === setlistSong.song_id);
            if (!song) return null;

            return (
              <div
                key={setlistSong.id}
                className={`setlist-song ${
                  dropTarget?.section === sectionName && dropTarget?.position === index 
                    ? 'drop-before' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, sectionName, index)}
              >
                {renderSongCard(song, false)}
                <div className="setlist-song-controls">
                  <span className="song-order">{setlistSong.sort_order}</span>
                  {setlistSong.is_highlight && (
                    <span className="highlight-indicator" title={t('setlist:highlight_song')}>★</span>
                  )}
                  {setlistSong.is_optional && (
                    <span className="optional-indicator" title={t('setlist:optional_song')}>?</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Drop zone at end of section */}
          <div
            className={`drop-zone ${
              dropTarget?.section === sectionName && dropTarget?.position === songs.length 
                ? 'drop-active' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, sectionName, songs.length)}
            onDrop={(e) => handleDrop(e, sectionName, songs.length)}
          >
            {t('setlist:drop_songs_here')}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="setlist-builder-loading" role="status" aria-live="polite">
        <div className="loading-spinner"></div>
        <p>{t('setlist:loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="setlist-builder-error" role="alert">
        <h2>{t('common:error')}</h2>
        <p>{error}</p>
        <button onClick={onCancel} className="btn btn-secondary">
          {t('common:go_back')}
        </button>
      </div>
    );
  }

  if (!setlist) {
    return null;
  }

  // Group songs by section
  const songsBySection = (setlist.songs || []).reduce((acc, song) => {
    const section = song.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(song);
    return acc;
  }, {} as Record<string, SetlistSong[]>);

  // Sort songs within each section
  Object.values(songsBySection).forEach(songs => {
    songs.sort((a, b) => a.sort_order - b.sort_order);
  });

  const sections = ['opening', 'main', 'encore'];

  return (
    <div className={`setlist-builder ${isDragging ? 'dragging' : ''}`}>
      <header className="setlist-header">
        <h1>{setlist.name}</h1>
        <div className="setlist-actions">
          {!readOnly && (
            <>
              <button
                onClick={() => setBuilderState(prev => ({ ...prev, showPreview: !prev.showPreview }))}
                className="btn btn-secondary"
                aria-pressed={builderState.showPreview}
              >
                {t('setlist:preview')}
              </button>
              <button
                onClick={() => onSave?.(setlist)}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? t('setlist:saving') : t('common:save')}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="setlist-builder-content">
        <div className="builder-sidebar">
          <div className="song-search">
            <h3>{t('setlist:available_songs')}</h3>
            <input
              type="search"
              placeholder={t('setlist:search_songs')}
              value={builderState.searchQuery}
              onChange={(e) => handleSongSearch(e.target.value)}
              className="search-input"
              aria-label={t('setlist:search_songs')}
            />
          </div>
          
          <div className="song-library" role="list">
            {availableSongs.map(song => renderSongCard(song, true))}
          </div>
        </div>

        <div className="setlist-main">
          <div className="setlist-sections">
            {sections.map(section => 
              renderSetlistSection(section, songsBySection[section] || [])
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && draggedSong && (
        <div className="drag-overlay">
          <div className="drag-preview">
            <strong>{draggedSong.title}</strong>
            {draggedSong.artist && <span> - {draggedSong.artist}</span>}
          </div>
        </div>
      )}
    </div>
  );
};