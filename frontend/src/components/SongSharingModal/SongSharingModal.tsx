import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import type {
  Song,
  SharedUser,
  ShareSongRequest,
  UpdatePermissionRequest,
} from '../../types';
import './SongSharingModal.css';

interface SongSharingModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onShareUpdate?: () => void;
}

const SongSharingModal: React.FC<SongSharingModalProps> = ({
  song,
  isOpen,
  onClose,
  onShareUpdate,
}) => {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPermission, setNewUserPermission] = useState<
    'read' | 'edit' | 'admin'
  >('read');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingShares, setLoadingShares] = useState(false);

  // Load sharing information when modal opens
  useEffect(() => {
    if (isOpen && song.id) {
      loadSharingInfo();
    }
  }, [isOpen, song.id]);

  const loadSharingInfo = async () => {
    try {
      setLoadingShares(true);
      setError(null);

      // First try to get from song data if available
      if (song.shared_with) {
        setSharedUsers(song.shared_with);
      } else {
        // Otherwise fetch from API
        const response = await apiService.getSongSharingInfo(song.id);
        setSharedUsers(response.shared_users || []);
      }
    } catch (err) {
      console.error('Error loading sharing info:', err);
      setError('Failed to load sharing information');
    } finally {
      setLoadingShares(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPermission) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const shareData: ShareSongRequest = {
        user_email: newUserEmail.toLowerCase().trim(),
        permission_level: newUserPermission,
      };

      const response = await apiService.shareSong(song.id, shareData);

      if (response.status === 'success') {
        setSuccess(
          response.message || `Successfully shared with ${newUserEmail}`
        );
        setNewUserEmail('');
        setNewUserPermission('read');

        // Reload sharing info to show updated list
        await loadSharingInfo();

        // Notify parent component
        onShareUpdate?.();
      } else {
        setError(response.error || 'Failed to share song');
      }
    } catch (err) {
      console.error('Error sharing song:', err);
      setError(err instanceof Error ? err.message : 'Failed to share song');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (
    userEmail: string,
    newPermission: 'read' | 'edit' | 'admin'
  ) => {
    setError(null);
    setSuccess(null);

    try {
      const updateData: UpdatePermissionRequest = {
        user_email: userEmail,
        permission_level: newPermission,
      };

      const response = await apiService.updateSongPermissions(
        song.id,
        updateData
      );

      if (response.status === 'success') {
        setSuccess(`Updated ${userEmail}'s permission to ${newPermission}`);

        // Update local state
        setSharedUsers((prev) =>
          prev.map((user) =>
            user.email === userEmail
              ? { ...user, permission_level: newPermission }
              : user
          )
        );

        // Notify parent component
        onShareUpdate?.();
      } else {
        setError(response.error || 'Failed to update permissions');
      }
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update permissions'
      );
    }
  };

  const handleRevokeAccess = async (user: SharedUser) => {
    if (!confirm(`Remove ${user.email}'s access to this song?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.revokeSongAccess(song.id, user.id);

      if (response.status === 'success') {
        setSuccess(`Removed ${user.email}'s access`);

        // Update local state
        setSharedUsers((prev) => prev.filter((u) => u.id !== user.id));

        // Notify parent component
        onShareUpdate?.();
      } else {
        setError(response.error || 'Failed to revoke access');
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
    }
  };

  const closeModal = () => {
    setError(null);
    setSuccess(null);
    setNewUserEmail('');
    setNewUserPermission('read');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="modal-title">Share "{song.title}"</h2>
          <button
            className="modal-close"
            onClick={closeModal}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" role="status">
              {success}
            </div>
          )}

          {/* Add New Collaborator Form */}
          <form onSubmit={handleShare} className="share-form">
            <h3>Invite Collaborator</h3>
            <div className="form-group">
              <label htmlFor="user-email">Email address:</label>
              <input
                type="email"
                id="user-email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter email address"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="permission-level">Permission level:</label>
              <select
                id="permission-level"
                value={newUserPermission}
                onChange={(e) =>
                  setNewUserPermission(
                    e.target.value as 'read' | 'edit' | 'admin'
                  )
                }
                disabled={loading}
              >
                <option value="read">Read - Can view the song</option>
                <option value="edit">
                  Edit - Can view and modify the song
                </option>
                <option value="admin">
                  Admin - Can view, modify, and manage sharing
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !newUserEmail}
            >
              {loading ? 'Sharing...' : 'Share Song'}
            </button>
          </form>

          {/* Current Collaborators List */}
          <div className="collaborators-section">
            <h3>Current Collaborators</h3>

            {loadingShares && (
              <div className="loading-message">Loading collaborators...</div>
            )}

            {!loadingShares && sharedUsers.length === 0 && (
              <div className="no-collaborators">
                This song is not shared with anyone yet.
              </div>
            )}

            {!loadingShares && sharedUsers.length > 0 && (
              <div className="collaborators-list">
                {sharedUsers.map((user) => (
                  <div key={user.id} className="collaborator-item">
                    <div className="collaborator-info">
                      <span className="collaborator-email">{user.email}</span>
                      <span
                        className={`permission-badge permission-${user.permission_level}`}
                      >
                        {user.permission_level}
                      </span>
                    </div>

                    <div className="collaborator-actions">
                      <select
                        value={user.permission_level}
                        onChange={(e) =>
                          handleUpdatePermission(
                            user.email,
                            e.target.value as 'read' | 'edit' | 'admin'
                          )
                        }
                        className="permission-select"
                        title="Change permission level"
                      >
                        <option value="read">Read</option>
                        <option value="edit">Edit</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        onClick={() => handleRevokeAccess(user)}
                        className="btn btn-danger btn-sm"
                        title="Remove access"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={closeModal} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongSharingModal;
