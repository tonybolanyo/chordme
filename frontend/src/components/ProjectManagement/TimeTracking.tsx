import React, { useState, useEffect } from 'react';
import { TimeEntry, CreateTimeEntryRequest } from '../../types/professionalCollaboration';
import { professionalCollaborationService } from '../../services/professionalCollaborationService';
import './TimeTracking.css';

interface TimeTrackingProps {
  projectId: number;
}

const TimeTracking: React.FC<TimeTrackingProps> = ({ projectId }) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [runningTimer, setRunningTimer] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    loadTimeEntries();
    // Check for running timer
    const timer = timeEntries.find(entry => entry.is_running);
    setRunningTimer(timer || null);
  }, [projectId]);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      const entries = await professionalCollaborationService.getTimeEntries(projectId);
      setTimeEntries(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      const entry = await professionalCollaborationService.startTimeTracking(projectId);
      setRunningTimer(entry);
      setTimeEntries(prev => [entry, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    try {
      const entry = await professionalCollaborationService.stopTimeTracking(projectId);
      setRunningTimer(null);
      setTimeEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    }
  };

  const handleManualEntry = async (entryData: CreateTimeEntryRequest) => {
    try {
      const entry = await professionalCollaborationService.startTimeTracking(projectId, {
        ...entryData,
        is_manual_entry: true
      });
      setTimeEntries(prev => [entry, ...prev]);
      setShowManualEntry(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manual entry');
    }
  };

  if (loading) {
    return (
      <div className="time-tracking-loading">
        <div className="spinner"></div>
        <p>Loading time entries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="time-tracking-error">
        <h3>Error Loading Time Tracking</h3>
        <p>{error}</p>
        <button onClick={loadTimeEntries} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  const totalHours = timeEntries.reduce((sum, entry) => 
    sum + (entry.duration_minutes || 0) / 60, 0
  );

  return (
    <div className="time-tracking">
      <div className="time-header">
        <div className="time-info">
          <h3>Time Tracking</h3>
          <p>{timeEntries.length} entries • {totalHours.toFixed(1)} hours total</p>
        </div>
        
        <div className="time-actions">
          <button 
            className="manual-entry-btn"
            onClick={() => setShowManualEntry(true)}
          >
            + Manual Entry
          </button>
          
          {runningTimer ? (
            <button 
              className="stop-timer-btn"
              onClick={handleStopTimer}
            >
              ⏹ Stop Timer
            </button>
          ) : (
            <button 
              className="start-timer-btn"
              onClick={handleStartTimer}
            >
              ▶ Start Timer
            </button>
          )}
        </div>
      </div>

      {runningTimer && (
        <div className="running-timer">
          <div className="timer-display">
            <div className="timer-icon">⏱</div>
            <div className="timer-info">
              <h4>Timer Running</h4>
              <p>Started: {new Date(runningTimer.start_time).toLocaleTimeString()}</p>
              <div className="live-duration">
                <LiveTimer startTime={runningTimer.start_time} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="time-summary">
        <TimeSummary entries={timeEntries} />
      </div>

      <div className="time-entries">
        <h4>Recent Time Entries</h4>
        {timeEntries.map(entry => (
          <TimeEntryItem key={entry.id} entry={entry} />
        ))}
        
        {timeEntries.length === 0 && (
          <div className="no-entries">
            <p>No time entries yet</p>
            <button 
              className="start-first-timer"
              onClick={handleStartTimer}
            >
              Start your first timer
            </button>
          </div>
        )}
      </div>

      {showManualEntry && (
        <ManualEntryModal
          onClose={() => setShowManualEntry(false)}
          onSubmit={handleManualEntry}
        />
      )}
    </div>
  );
};

// Live Timer Component
interface LiveTimerProps {
  startTime: string;
}

const LiveTimer: React.FC<LiveTimerProps> = ({ startTime }) => {
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    const updateDuration = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="live-timer">{duration}</span>;
};

// Time Summary Component
interface TimeSummaryProps {
  entries: TimeEntry[];
}

const TimeSummary: React.FC<TimeSummaryProps> = ({ entries }) => {
  const today = new Date().toDateString();
  const thisWeek = getWeekStart(new Date());
  
  const todayEntries = entries.filter(entry => 
    new Date(entry.start_time).toDateString() === today
  );
  
  const thisWeekEntries = entries.filter(entry => 
    new Date(entry.start_time) >= thisWeek
  );

  const todayHours = todayEntries.reduce((sum, entry) => 
    sum + (entry.duration_minutes || 0) / 60, 0
  );
  
  const weekHours = thisWeekEntries.reduce((sum, entry) => 
    sum + (entry.duration_minutes || 0) / 60, 0
  );

  return (
    <div className="time-summary-grid">
      <div className="summary-card">
        <span className="summary-number">{todayHours.toFixed(1)}h</span>
        <span className="summary-label">Today</span>
      </div>
      <div className="summary-card">
        <span className="summary-number">{weekHours.toFixed(1)}h</span>
        <span className="summary-label">This Week</span>
      </div>
      <div className="summary-card">
        <span className="summary-number">{todayEntries.length}</span>
        <span className="summary-label">Sessions Today</span>
      </div>
      <div className="summary-card">
        <span className="summary-number">{entries.length}</span>
        <span className="summary-label">Total Sessions</span>
      </div>
    </div>
  );
};

// Time Entry Item Component
interface TimeEntryItemProps {
  entry: TimeEntry;
}

const TimeEntryItem: React.FC<TimeEntryItemProps> = ({ entry }) => {
  const duration = entry.duration_minutes ? 
    `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` :
    'Running...';

  return (
    <div className={`time-entry ${entry.is_running ? 'running' : ''}`}>
      <div className="entry-main">
        <div className="entry-header">
          <span className="activity-type">{entry.activity_type}</span>
          <span className="duration">{duration}</span>
        </div>
        
        <div className="entry-time">
          {new Date(entry.start_time).toLocaleDateString()} • 
          {new Date(entry.start_time).toLocaleTimeString()} 
          {entry.end_time && ` - ${new Date(entry.end_time).toLocaleTimeString()}`}
        </div>
        
        {entry.description && (
          <div className="entry-description">
            {entry.description}
          </div>
        )}
        
        <div className="entry-meta">
          {entry.is_manual_entry && (
            <span className="manual-badge">Manual</span>
          )}
          {entry.is_billable && (
            <span className="billable-badge">Billable</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Manual Entry Modal Component
interface ManualEntryModalProps {
  onClose: () => void;
  onSubmit: (entryData: CreateTimeEntryRequest) => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTimeEntryRequest>({
    description: '',
    activity_type: 'work',
    duration_minutes: 60,
    start_time: new Date().toISOString().slice(0, 16),
    is_manual_entry: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Manual Time Entry</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="manual-entry-form">
          <div className="form-group">
            <label htmlFor="start_time">Start Time</label>
            <input
              id="start_time"
              type="datetime-local"
              value={formData.start_time?.slice(0, 16)}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                start_time: new Date(e.target.value).toISOString()
              }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration (minutes)</label>
            <input
              id="duration"
              type="number"
              min="1"
              value={formData.duration_minutes || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                duration_minutes: parseInt(e.target.value)
              }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="activity_type">Activity Type</label>
            <select
              id="activity_type"
              value={formData.activity_type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                activity_type: e.target.value as CreateTimeEntryRequest['activity_type']
              }))}
            >
              <option value="work">Work</option>
              <option value="meeting">Meeting</option>
              <option value="research">Research</option>
              <option value="practice">Practice</option>
              <option value="review">Review</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Add Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Utility function
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

export default TimeTracking;