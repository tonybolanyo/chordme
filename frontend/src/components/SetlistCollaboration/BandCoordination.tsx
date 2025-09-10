/**
 * BandCoordination - Component for real-time band coordination during rehearsals and performances
 */

import React, { useState } from 'react';
import type { 
  SetlistCollaborationParticipant, 
  BandCoordinationState 
} from '../../services/setlistCollaborationService';
import './BandCoordination.css';

export interface BandCoordinationProps {
  bandCoordination: BandCoordinationState;
  participants: SetlistCollaborationParticipant[];
  currentUserRole?: string;
  onStartRehearsalMode: () => Promise<void>;
  onStartPerformanceMode: () => Promise<void>;
  onStopCoordination: () => Promise<void>;
  onUpdateReadyStatus: (isReady: boolean) => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
}

export const BandCoordination: React.FC<BandCoordinationProps> = ({
  bandCoordination,
  participants,
  onStartRehearsalMode,
  onStartPerformanceMode,
  onStopCoordination,
  onUpdateReadyStatus,
  onSendMessage,
}) => {
  const [message, setMessage] = useState('');
  const [isReady, setIsReady] = useState(false);

  const handleStartRehearsalMode = async () => {
    try {
      await onStartRehearsalMode();
    } catch (error) {
      console.error('Failed to start rehearsal mode:', error);
    }
  };

  const handleStartPerformanceMode = async () => {
    try {
      await onStartPerformanceMode();
    } catch (error) {
      console.error('Failed to start performance mode:', error);
    }
  };

  const handleStopCoordination = async () => {
    try {
      await onStopCoordination();
    } catch (error) {
      console.error('Failed to stop coordination:', error);
    }
  };

  const handleReadyStatusChange = async (ready: boolean) => {
    try {
      setIsReady(ready);
      await onUpdateReadyStatus(ready);
    } catch (error) {
      console.error('Failed to update ready status:', error);
      setIsReady(!ready); // Revert on error
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getParticipantsByRole = (role: string) => {
    return participants.filter(p => p.bandRole === role);
  };

  const getReadyParticipants = () => {
    return participants.filter(p => bandCoordination.readyStatus[p.userId]);
  };

  const isCoordinationActive = bandCoordination.rehearsalMode || bandCoordination.performanceMode;

  return (
    <div className="band-coordination">
      {!isCoordinationActive ? (
        <div className="coordination-start">
          <h3>Band Coordination</h3>
          <p>Start a coordination session to sync with your band members.</p>
          
          <div className="coordination-buttons">
            <button 
              className="btn-primary rehearsal-btn"
              onClick={handleStartRehearsalMode}
            >
              🎵 Start Rehearsal Mode
            </button>
            <button 
              className="btn-secondary performance-btn"
              onClick={handleStartPerformanceMode}
            >
              🎤 Start Performance Mode
            </button>
          </div>
        </div>
      ) : (
        <div className="coordination-active">
          {/* Coordination header */}
          <div className="coordination-header">
            <div className="mode-indicator">
              {bandCoordination.rehearsalMode && (
                <span className="rehearsal-mode">🎵 Rehearsal Mode Active</span>
              )}
              {bandCoordination.performanceMode && (
                <span className="performance-mode">🎤 Performance Mode Active</span>
              )}
            </div>
            
            <button 
              className="btn-secondary stop-btn"
              onClick={handleStopCoordination}
            >
              Stop Coordination
            </button>
          </div>

          {/* Band layout by roles */}
          <div className="band-layout">
            <h4>Band Members</h4>
            
            <div className="role-sections">
              {/* Vocals */}
              <div className="role-section vocals">
                <h5>Vocals</h5>
                <div className="role-members">
                  {getParticipantsByRole('lead_vocals').map(participant => (
                    <div key={participant.userId} className="band-member lead">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Lead Vocals</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                  
                  {getParticipantsByRole('backing_vocals').map(participant => (
                    <div key={participant.userId} className="band-member">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Backing Vocals</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Guitars */}
              <div className="role-section guitars">
                <h5>Guitars</h5>
                <div className="role-members">
                  {getParticipantsByRole('lead_guitar').map(participant => (
                    <div key={participant.userId} className="band-member lead">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Lead Guitar</span>
                        <span className="instrument">{participant.instrument}</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                  
                  {getParticipantsByRole('rhythm_guitar').map(participant => (
                    <div key={participant.userId} className="band-member">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Rhythm Guitar</span>
                        <span className="instrument">{participant.instrument}</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rhythm Section */}
              <div className="role-section rhythm">
                <h5>Rhythm Section</h5>
                <div className="role-members">
                  {getParticipantsByRole('bass').map(participant => (
                    <div key={participant.userId} className="band-member">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Bass</span>
                        <span className="instrument">{participant.instrument}</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                  
                  {getParticipantsByRole('drums').map(participant => (
                    <div key={participant.userId} className="band-member">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Drums</span>
                        <span className="instrument">{participant.instrument}</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                  
                  {getParticipantsByRole('keys').map(participant => (
                    <div key={participant.userId} className="band-member">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Keys</span>
                        <span className="instrument">{participant.instrument}</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Team */}
              <div className="role-section tech">
                <h5>Tech Team</h5>
                <div className="role-members">
                  {getParticipantsByRole('sound_engineer').map(participant => (
                    <div key={participant.userId} className="band-member">
                      <div className="member-avatar" style={{ backgroundColor: participant.color }}>
                        {participant.name?.[0] || participant.email[0]}
                      </div>
                      <div className="member-info">
                        <span className="name">{participant.name || participant.email}</span>
                        <span className="role">Sound Engineer</span>
                        <span className={`status ${participant.status}`}>{participant.status}</span>
                      </div>
                      {bandCoordination.readyStatus[participant.userId] && (
                        <span className="ready-indicator">✅</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ready status and coordination controls */}
          <div className="coordination-controls">
            <div className="ready-status">
              <h4>Ready Status ({getReadyParticipants().length}/{participants.length})</h4>
              
              <div className="ready-toggle">
                <label className="ready-checkbox">
                  <input
                    type="checkbox"
                    checked={isReady}
                    onChange={(e) => handleReadyStatusChange(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  I'm ready
                </label>
              </div>
            </div>

            {/* Quick communication */}
            <div className="quick-communication">
              <h4>Quick Communication</h4>
              <div className="message-input">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Send a message to the band..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage} disabled={!message.trim()}>
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Current leader indicator */}
          {bandCoordination.currentLeader && (
            <div className="current-leader">
              <h4>Current Leader</h4>
              <div className="leader-info">
                {participants.find(p => p.userId === bandCoordination.currentLeader)?.name || 'Unknown'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BandCoordination;