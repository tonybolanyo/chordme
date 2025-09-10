/**
 * Modal component for creating new collaborative sessions.
 */

import React, { useState, useEffect } from 'react';
import { sessionManagementService } from '../../services/sessionManagementService';
import type { CreateSessionRequest } from '../../services/sessionManagementService';
import type { SessionTemplate } from '../../types/collaboration';

export interface CreateSessionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when modal should be closed */
  onClose: () => void;
  /** Called when session is successfully created */
  onSessionCreated?: (sessionId: string) => void;
  /** Pre-selected song ID */
  songId?: number;
  /** Songs available for selection */
  availableSongs?: Array<{ id: number; title: string; artist?: string }>;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
  songId,
  availableSongs = [],
}) => {
  const [formData, setFormData] = useState<CreateSessionRequest>({
    song_id: songId || 0,
    name: '',
    description: '',
    template_id: undefined,
    access_mode: 'invite-only',
    max_participants: 10,
  });

  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Reset form when opening
      setFormData(prev => ({
        ...prev,
        song_id: songId || prev.song_id,
        name: '',
        description: '',
        template_id: undefined,
        access_mode: 'invite-only',
        max_participants: 10,
      }));
      setError(null);
    }
  }, [isOpen, songId]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const templatesData = await sessionManagementService.getSessionTemplates();
      setTemplates(templatesData);
    } catch (err) {
      console.error('Error loading templates:', err);
      // Don't show error for templates, it's not critical
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.song_id || !formData.name.trim()) {
      setError('Song and session name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const session = await sessionManagementService.createSession({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      });

      onSessionCreated?.(session.id);
      onClose();
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      setFormData(prev => ({
        ...prev,
        template_id: template.id,
        max_participants: template.max_participants,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        template_id: undefined,
      }));
    }
  };

  const getTemplateDescription = (templateId?: number) => {
    if (!templateId) return null;
    const template = templates.find(t => t.id === templateId);
    return template?.description;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Create Collaboration Session</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Song Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Song *
              </label>
              {songId ? (
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                  Pre-selected song (ID: {songId})
                </div>
              ) : (
                <select
                  value={formData.song_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, song_id: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={0}>Select a song</option>
                  {availableSongs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title} {song.artist && `by ${song.artist}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Session Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Band Practice Session"
                required
                maxLength={255}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description of the session..."
                rows={3}
                maxLength={1000}
              />
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Template
              </label>
              {loadingTemplates ? (
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500">
                  Loading templates...
                </div>
              ) : (
                <select
                  value={formData.template_id || ''}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No template (custom settings)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
              )}
              {getTemplateDescription(formData.template_id) && (
                <p className="mt-1 text-sm text-gray-600">
                  {getTemplateDescription(formData.template_id)}
                </p>
              )}
            </div>

            {/* Access Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Mode
              </label>
              <select
                value={formData.access_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, access_mode: e.target.value as unknown }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="invite-only">Invite Only</option>
                <option value="link-access">Link Access (with invitation code)</option>
                <option value="public">Public (anyone with song access)</option>
              </select>
              <p className="mt-1 text-sm text-gray-600">
                {formData.access_mode === 'invite-only' && 'Only explicitly invited users can join'}
                {formData.access_mode === 'link-access' && 'Anyone with the invitation link can join'}
                {formData.access_mode === 'public' && 'Anyone with access to the song can join'}
              </p>
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Participants
              </label>
              <input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={2}
                max={50}
                required
              />
              <p className="mt-1 text-sm text-gray-600">
                Maximum number of users who can participate simultaneously (2-50)
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !formData.song_id || !formData.name.trim()}
              >
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionModal;