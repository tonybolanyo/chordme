/**
 * Setlist Page - Main page for setlist management
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SetlistBuilder } from '../../components/SetlistBuilder';
import { setlistService } from '../../services/setlistService';
import { Setlist, SetlistSearchParams } from '../../types/setlist';
import './Setlist.css';

interface SetlistPageProps {
  mode?: 'list' | 'create' | 'edit';
  setlistId?: string;
  templateId?: string;
}

export const SetlistPage: React.FC<SetlistPageProps> = ({
  mode = 'list',
  setlistId,
  templateId
}) => {
  const { t } = useTranslation(['setlist', 'common']);
  
  const [currentMode, setCurrentMode] = useState(mode);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SetlistSearchParams>({
    limit: 20,
    offset: 0,
    sort: 'updated_at',
    order: 'desc'
  });

  // Load setlists for list view
  useEffect(() => {
    if (currentMode === 'list') {
      loadSetlists();
    }
  }, [currentMode, searchParams]);

  const loadSetlists = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await setlistService.getSetlists(searchParams);
      setSetlists(result.setlists);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load setlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentMode('create');
  };

  const handleEdit = (setlistId: string) => {
    // In a real app, you'd navigate to edit mode with the setlist ID
    setCurrentMode('edit');
  };

  const handleSave = (setlist: Setlist) => {
    // Handle save and navigate back to list
    setCurrentMode('list');
    loadSetlists(); // Refresh the list
  };

  const handleCancel = () => {
    setCurrentMode('list');
  };

  const handleDuplicate = async (setlist: Setlist) => {
    try {
      await setlistService.duplicateSetlist(setlist.id, `${setlist.name} (Copy)`);
      loadSetlists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate setlist');
    }
  };

  const handleDelete = async (setlist: Setlist) => {
    if (!confirm(t('setlist:confirm_delete', { name: setlist.name }))) {
      return;
    }

    try {
      await setlistService.deleteSetlist(setlist.id);
      loadSetlists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete setlist');
    }
  };

  // Render setlist list view
  const renderSetlistList = () => (
    <div className="setlist-list">
      <header className="setlist-list-header">
        <h1>{t('setlist:my_setlists')}</h1>
        <div className="setlist-list-actions">
          <button onClick={handleCreateNew} className="btn btn-primary">
            {t('setlist:create_new')}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="setlist-grid">
        {loading ? (
          <div className="loading-message">{t('common:loading')}</div>
        ) : setlists.length === 0 ? (
          <div className="empty-state">
            <h2>{t('setlist:no_setlists')}</h2>
            <p>{t('setlist:no_setlists_description')}</p>
            <button onClick={handleCreateNew} className="btn btn-primary">
              {t('setlist:create_first')}
            </button>
          </div>
        ) : (
          setlists.map(setlist => (
            <div key={setlist.id} className="setlist-card">
              <div className="setlist-card-header">
                <h3 className="setlist-title">{setlist.name}</h3>
                <span className={`setlist-status status-${setlist.status}`}>
                  {t(`setlist:status_${setlist.status}`)}
                </span>
              </div>
              
              <div className="setlist-card-body">
                {setlist.description && (
                  <p className="setlist-description">{setlist.description}</p>
                )}
                
                <div className="setlist-meta">
                  <span className="setlist-event-type">
                    {t(`setlist:event_type_${setlist.event_type}`)}
                  </span>
                  {setlist.venue && (
                    <span className="setlist-venue">{setlist.venue}</span>
                  )}
                  {setlist.event_date && (
                    <span className="setlist-date">
                      {new Date(setlist.event_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="setlist-stats">
                  <span className="song-count">
                    {setlist.songs?.length || 0} {t('setlist:songs')}
                  </span>
                  {setlist.estimated_duration && (
                    <span className="duration">
                      {setlist.estimated_duration} {t('setlist:minutes')}
                    </span>
                  )}
                </div>
              </div>

              <div className="setlist-card-actions">
                <button
                  onClick={() => handleEdit(setlist.id)}
                  className="btn btn-secondary btn-sm"
                >
                  {t('common:edit')}
                </button>
                <button
                  onClick={() => handleDuplicate(setlist)}
                  className="btn btn-secondary btn-sm"
                >
                  {t('setlist:duplicate')}
                </button>
                <button
                  onClick={() => handleDelete(setlist)}
                  className="btn btn-danger btn-sm"
                >
                  {t('common:delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render builder view
  const renderBuilder = () => (
    <SetlistBuilder
      setlistId={currentMode === 'edit' ? setlistId : undefined}
      templateId={templateId}
      onSave={handleSave}
      onCancel={handleCancel}
      readOnly={false}
    />
  );

  return (
    <div className="setlist-page">
      {currentMode === 'list' ? renderSetlistList() : renderBuilder()}
    </div>
  );
};