/**
 * Placeholder components for setlist collaboration features
 * These provide the basic structure and will be implemented with full functionality
 */

import React from 'react';
import type { 
  SetlistComment, 
  SetlistTask, 
  SetlistCollaborationParticipant,
  MobileCoordinationState,
  Setlist 
} from '../../types/setlist';

// RealtimeParticipants Component
export interface RealtimeParticipantsProps {
  participants: SetlistCollaborationParticipant[];
  currentUserId: string;
}

export const RealtimeParticipants: React.FC<RealtimeParticipantsProps> = ({
  participants,
  currentUserId,
}) => {
  return (
    <div className="realtime-participants">
      {participants.slice(0, 5).map((participant) => (
        <div
          key={participant.userId}
          className={`participant-avatar ${participant.status === 'active' ? 'active' : ''}`}
          style={{ backgroundColor: participant.color }}
          title={`${participant.name || participant.email} (${participant.bandRole || 'No role'})`}
        >
          {participant.name?.[0] || participant.email[0]}
        </div>
      ))}
      {participants.length > 5 && (
        <span className="participant-count">+{participants.length - 5}</span>
      )}
    </div>
  );
};

// SetlistComments Component
export interface SetlistCommentsProps {
  comments: SetlistComment[];
  setlistId: string;
  canComment: boolean;
  onAddComment: (content: string, options?: unknown) => Promise<SetlistComment>;
  onResolveComment: (commentId: string) => Promise<void>;
}

export const SetlistComments: React.FC<SetlistCommentsProps> = ({
  comments,
  setlistId,
  canComment,
  onAddComment,
  onResolveComment,
}) => {
  const [newComment, setNewComment] = React.useState('');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await onAddComment(newComment);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div className="setlist-comments">
      <h3>Comments & Annotations</h3>
      
      {canComment && (
        <div className="add-comment">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment or suggestion..."
            rows={3}
          />
          <button onClick={handleAddComment} disabled={!newComment.trim()}>
            Add Comment
          </button>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p>No comments yet. Be the first to add feedback!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <strong>{comment.author?.display_name || comment.author?.email}</strong>
                <span className="comment-type">{comment.comment_type}</span>
                <span className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
              <div className="comment-content">{comment.content}</div>
              {!comment.is_resolved && (
                <button onClick={() => onResolveComment(comment.id)}>
                  Mark as Resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// TaskManagement Component
export interface TaskManagementProps {
  tasks: SetlistTask[];
  setlistId: string;
  participants: SetlistCollaborationParticipant[];
  onCreateTask: (title: string, options?: unknown) => Promise<SetlistTask>;
  onUpdateTaskStatus: (taskId: string, status: string) => Promise<void>;
}

export const TaskManagement: React.FC<TaskManagementProps> = ({
  tasks,
  setlistId,
  participants,
  onCreateTask,
  onUpdateTaskStatus,
}) => {
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [showCreateForm, setShowCreateForm] = React.useState(false);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    try {
      await onCreateTask(newTaskTitle);
      setNewTaskTitle('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="task-management">
      <h3>Performance Preparation Tasks</h3>
      
      <div className="task-actions">
        <button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-task-form">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title..."
          />
          <button onClick={handleCreateTask}>Create Task</button>
        </div>
      )}

      <div className="tasks-section">
        <h4>Pending Tasks ({pendingTasks.length})</h4>
        {pendingTasks.map((task) => (
          <div key={task.id} className="task-item">
            <div className="task-header">
              <strong>{task.title}</strong>
              <span className={`task-priority ${task.priority}`}>{task.priority}</span>
            </div>
            {task.description && <p>{task.description}</p>}
            <div className="task-meta">
              <span>Assigned to: {task.assignee?.display_name || 'Unassigned'}</span>
              <button onClick={() => onUpdateTaskStatus(task.id, 'completed')}>
                Mark Complete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="tasks-section">
        <h4>Completed Tasks ({completedTasks.length})</h4>
        {completedTasks.map((task) => (
          <div key={task.id} className="task-item completed">
            <div className="task-header">
              <strong>{task.title}</strong>
              <span>✅ Completed</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ExternalSharing Component
export interface ExternalSharingProps {
  setlistId: string;
  onCreateShare: (shareType: string, options: unknown) => Promise<string>;
}

export const ExternalSharing: React.FC<ExternalSharingProps> = ({
  setlistId,
  onCreateShare,
}) => {
  const [shareType, setShareType] = React.useState('venue');
  const [accessLevel, setAccessLevel] = React.useState('view_only');
  const [recipientEmail, setRecipientEmail] = React.useState('');

  const handleCreateShare = async () => {
    try {
      const shareUrl = await onCreateShare(shareType, {
        accessLevel,
        recipientEmail: recipientEmail || undefined,
      });
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert(`Share link created and copied to clipboard: ${shareUrl}`);
    } catch (error) {
      console.error('Failed to create share:', error);
    }
  };

  return (
    <div className="external-sharing">
      <h3>External Sharing</h3>
      <p>Share your setlist with venues, sound engineers, or other external collaborators.</p>
      
      <div className="sharing-form">
        <div className="form-group">
          <label>Share Type:</label>
          <select value={shareType} onChange={(e) => setShareType(e.target.value)}>
            <option value="venue">Venue</option>
            <option value="sound_engineer">Sound Engineer</option>
            <option value="guest_musician">Guest Musician</option>
            <option value="manager">Manager</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Access Level:</label>
          <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="view_only">View Only</option>
            <option value="limited">Limited Access</option>
            <option value="full">Full Access</option>
          </select>
        </div>

        <div className="form-group">
          <label>Recipient Email (optional):</label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>

        <button onClick={handleCreateShare}>
          Create Share Link
        </button>
      </div>
    </div>
  );
};

// MobileCoordination Component
export interface MobileCoordinationProps {
  setlist: Setlist;
  mobileState: MobileCoordinationState;
  onSetCurrentSong: (songId: string) => Promise<void>;
  onAdjustTempo: (songId: string, tempoChange: number) => Promise<void>;
  onSkipSong: (songId: string) => Promise<void>;
}

export const MobileCoordination: React.FC<MobileCoordinationProps> = ({
  setlist,
  mobileState,
  onSetCurrentSong,
  onAdjustTempo,
  onSkipSong,
}) => {
  const currentSong = setlist.songs?.find(s => s.id === mobileState.current_song);

  return (
    <div className="mobile-coordination">
      <h3>Mobile Performance Control</h3>
      
      <div className="current-song">
        <h4>Current Song</h4>
        {currentSong ? (
          <div className="song-info">
            <strong>{currentSong.song?.title}</strong>
            <div className="song-controls">
              <button onClick={() => onAdjustTempo(currentSong.id, -5)}>
                Tempo -5
              </button>
              <span>Tempo: {currentSong.performance_tempo || 'Default'}</span>
              <button onClick={() => onAdjustTempo(currentSong.id, 5)}>
                Tempo +5
              </button>
            </div>
            <button onClick={() => onSkipSong(currentSong.id)}>
              Skip This Song
            </button>
          </div>
        ) : (
          <p>No song currently selected</p>
        )}
      </div>

      <div className="setlist-overview">
        <h4>Setlist Progress</h4>
        {setlist.songs?.map((song, index) => (
          <div 
            key={song.id} 
            className={`song-item ${song.id === mobileState.current_song ? 'current' : ''} ${mobileState.skipped_songs.includes(song.id) ? 'skipped' : ''}`}
            onClick={() => onSetCurrentSong(song.id)}
          >
            <span className="song-number">{index + 1}</span>
            <span className="song-title">{song.song?.title}</span>
            {mobileState.skipped_songs.includes(song.id) && <span className="skipped">SKIPPED</span>}
          </div>
        ))}
      </div>
    </div>
  );
};