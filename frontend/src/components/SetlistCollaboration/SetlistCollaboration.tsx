/**
 * SetlistCollaboration - Main component for setlist collaboration features
 * Includes band coordination, real-time editing, and mobile support
 */

import React, { useState, useEffect } from 'react';
import { useSetlistCollaboration } from '../../hooks/useSetlistCollaboration';
import { BandCoordination } from './BandCoordination';
import { 
  SetlistComments, 
  TaskManagement, 
  ExternalSharing, 
  MobileCoordination, 
  RealtimeParticipants 
} from './CollaborationComponents';
import type { Setlist } from '../../types/setlist';
import './SetlistCollaboration.css';

export interface SetlistCollaborationProps {
  setlist: Setlist;
  userId: string;
  userInfo: {
    email: string;
    name?: string;
  };
  enableMobileMode?: boolean;
  onSetlistUpdate?: (setlist: Setlist) => void;
}

export const SetlistCollaboration: React.FC<SetlistCollaborationProps> = ({
  setlist,
  userId,
  userInfo,
  enableMobileMode = false,
  onSetlistUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<string>('coordination');
  const [isCollaborationActive, setIsCollaborationActive] = useState(false);

  const collaboration = useSetlistCollaboration({
    setlistId: setlist.id,
    userId,
    userInfo,
    enableRealtimeUpdates: true,
    enableBandCoordination: true,
    enableMobileMode,
  });

  const {
    session,
    isConnected,
    participants,
    currentUserRole,
    bandCoordination,
    comments,
    tasks,
    mobileState,
    error,
    clearError,
  } = collaboration;

  // Auto-connect when component mounts
  useEffect(() => {
    if (!isConnected) {
      collaboration.connect();
    }
    
    return () => {
      if (isConnected) {
        collaboration.disconnect();
      }
    };
  }, []);

  // Update parent when setlist changes
  useEffect(() => {
    if (session?.documentState.setlist && onSetlistUpdate) {
      onSetlistUpdate(session.documentState.setlist);
    }
  }, [session?.documentState.setlist, onSetlistUpdate]);

  const handleStartRehearsalMode = async () => {
    try {
      await collaboration.startRehearsalMode();
      setIsCollaborationActive(true);
    } catch (err) {
      console.error('Failed to start rehearsal mode:', err);
    }
  };

  const handleStartPerformanceMode = async () => {
    try {
      await collaboration.startPerformanceMode();
      setIsCollaborationActive(true);
    } catch (err) {
      console.error('Failed to start performance mode:', err);
    }
  };

  const handleStopCollaboration = async () => {
    try {
      await collaboration.stopCoordinationMode();
      setIsCollaborationActive(false);
    } catch (err) {
      console.error('Failed to stop collaboration:', err);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'coordination':
        return (
          <BandCoordination
            bandCoordination={bandCoordination}
            participants={participants}
            currentUserRole={currentUserRole}
            onStartRehearsalMode={handleStartRehearsalMode}
            onStartPerformanceMode={handleStartPerformanceMode}
            onStopCoordination={handleStopCollaboration}
            onUpdateReadyStatus={collaboration.updateReadyStatus}
            onSendMessage={collaboration.sendCoordinationMessage}
          />
        );
      
      case 'comments':
        return (
          <SetlistComments
            comments={comments}
            setlistId={setlist.id}
            canComment={isConnected}
            onAddComment={collaboration.addComment}
            onResolveComment={collaboration.resolveComment}
          />
        );
      
      case 'tasks':
        return (
          <TaskManagement
            tasks={tasks}
            setlistId={setlist.id}
            participants={participants}
            onCreateTask={collaboration.createTask}
            onUpdateTaskStatus={collaboration.updateTaskStatus}
          />
        );
      
      case 'sharing':
        return (
          <ExternalSharing
            setlistId={setlist.id}
            onCreateShare={collaboration.createExternalShare}
          />
        );
      
      case 'mobile':
        return enableMobileMode && mobileState ? (
          <MobileCoordination
            setlist={setlist}
            mobileState={mobileState}
            onSetCurrentSong={collaboration.setCurrentSong}
            onAdjustTempo={collaboration.adjustTempo}
            onSkipSong={collaboration.skipSong}
          />
        ) : (
          <div className="mobile-disabled">
            Mobile coordination is not enabled for this setlist.
          </div>
        );
      
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="setlist-collaboration-error">
        <div className="error-message">
          <h3>Collaboration Error</h3>
          <p>{error}</p>
          <button onClick={clearError} className="btn-primary">
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="setlist-collaboration">
      {/* Header with connection status and participants */}
      <div className="collaboration-header">
        <div className="collaboration-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
          
          {isCollaborationActive && (
            <div className="collaboration-mode">
              {bandCoordination.rehearsalMode && '🎵 Rehearsal Mode'}
              {bandCoordination.performanceMode && '🎤 Performance Mode'}
            </div>
          )}
        </div>
        
        <RealtimeParticipants 
          participants={participants}
          currentUserId={userId}
        />
      </div>

      {/* Tab navigation */}
      <div className="collaboration-tabs">
        <button
          className={`tab ${activeTab === 'coordination' ? 'active' : ''}`}
          onClick={() => setActiveTab('coordination')}
        >
          Band Coordination
        </button>
        <button
          className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Comments ({comments.length})
        </button>
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks ({tasks.filter(t => t.status !== 'completed').length})
        </button>
        <button
          className={`tab ${activeTab === 'sharing' ? 'active' : ''}`}
          onClick={() => setActiveTab('sharing')}
        >
          External Sharing
        </button>
        {enableMobileMode && (
          <button
            className={`tab ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveTab('mobile')}
          >
            Mobile Control
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="collaboration-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SetlistCollaboration;