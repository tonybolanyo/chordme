import React, { useState, useEffect } from 'react';
import { TimelineData, GanttChartData, ProjectTask, ProjectMilestone } from '../../types/professionalCollaboration';
import { professionalCollaborationService } from '../../services/professionalCollaborationService';
import './ProjectTimeline.css';

interface ProjectTimelineProps {
  projectId: number;
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ projectId }) => {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [ganttData, setGanttData] = useState<GanttChartData | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimelineData();
  }, [projectId]);

  useEffect(() => {
    if (timelineData) {
      const gantt = professionalCollaborationService.calculateGanttData(timelineData);
      setGanttData(gantt);
    }
  }, [timelineData, viewMode]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      const data = await professionalCollaborationService.getProjectTimeline(projectId);
      setTimelineData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="timeline-loading">
        <div className="spinner"></div>
        <p>Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-error">
        <h3>Error Loading Timeline</h3>
        <p>{error}</p>
        <button onClick={loadTimelineData} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!timelineData || !ganttData) {
    return (
      <div className="timeline-empty">
        <h3>No Timeline Data</h3>
        <p>Add tasks and milestones to see the project timeline.</p>
      </div>
    );
  }

  return (
    <div className="project-timeline">
      <div className="timeline-header">
        <div className="timeline-info">
          <h3>Project Timeline</h3>
          <p>{timelineData.tasks.length} tasks • {timelineData.milestones.length} milestones</p>
        </div>
        
        <div className="timeline-controls">
          <div className="view-mode-selector">
            <button
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week View
            </button>
            <button
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month View
            </button>
          </div>
          
          <button 
            className="refresh-btn"
            onClick={loadTimelineData}
            title="Refresh Timeline"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="gantt-container">
        <GanttChart 
          data={ganttData} 
          viewMode={viewMode}
          onTaskUpdate={(taskId, updates) => {
            // TODO: Handle task updates
            console.log('Task update:', taskId, updates);
          }}
        />
      </div>

      <div className="timeline-summary">
        <TimelineSummary 
          tasks={timelineData.tasks} 
          milestones={timelineData.milestones}
        />
      </div>
    </div>
  );
};

// Gantt Chart Component (simplified implementation)
interface GanttChartProps {
  data: GanttChartData;
  viewMode: 'week' | 'month';
  onTaskUpdate: (taskId: number, updates: unknown) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ data, viewMode }) => {
  const startDate = new Date(data.timeline.start_date);
  const endDate = new Date(data.timeline.end_date);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const timelineWidth = Math.max(totalDays * (viewMode === 'week' ? 20 : 8), 800);

  const getTaskPosition = (task: unknown) => {
    const taskStart = new Date(task.start);
    const taskEnd = new Date(task.end);
    const dayWidth = timelineWidth / totalDays;
    
    const startOffset = Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: Math.max(0, startOffset * dayWidth),
      width: Math.max(dayWidth, duration * dayWidth)
    };
  };

  const getMilestonePosition = (milestone: unknown) => {
    const milestoneDate = new Date(milestone.date);
    const dayWidth = timelineWidth / totalDays;
    const offset = Math.floor((milestoneDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: offset * dayWidth
    };
  };

  return (
    <div className="gantt-chart">
      <div className="gantt-header">
        <div className="task-column-header">Tasks</div>
        <div className="timeline-header-container" style={{ width: timelineWidth }}>
          <TimelineHeader 
            startDate={startDate} 
            endDate={endDate} 
            viewMode={viewMode}
            width={timelineWidth}
          />
        </div>
      </div>
      
      <div className="gantt-body">
        <div className="gantt-rows">
          {data.tasks.map((task, _index) => (
            <div key={task.id} className="gantt-row">
              <div className="task-info">
                <span className="task-name">{task.name}</span>
                <span className="task-progress">{task.progress}%</span>
              </div>
              <div className="timeline-area" style={{ width: timelineWidth }}>
                <div 
                  className={`task-bar ${task.custom_class || ''}`}
                  style={getTaskPosition(task)}
                >
                  <div 
                    className="progress-fill" 
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          
          {data.milestones.map((milestone, _index) => (
            <div key={milestone.id} className="gantt-row milestone-row">
              <div className="task-info">
                <span className="milestone-name">🏁 {milestone.name}</span>
              </div>
              <div className="timeline-area" style={{ width: timelineWidth }}>
                <div 
                  className={`milestone-marker ${milestone.custom_class || ''}`}
                  style={getMilestonePosition(milestone)}
                  title={milestone.name}
                >
                  ♦
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Timeline Header Component
interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  viewMode: 'week' | 'month';
  width: number;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ startDate, endDate, viewMode, width }) => {
  const generateTimelineLabels = () => {
    const labels: string[] = [];
    const current = new Date(startDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const labelWidth = width / totalDays;

    if (viewMode === 'week') {
      while (current <= endDate) {
        labels.push(current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Month view - show weeks
      while (current <= endDate) {
        labels.push(`Week ${Math.ceil(current.getDate() / 7)}`);
        current.setDate(current.getDate() + 7);
      }
    }

    return labels.map((label, index) => (
      <div 
        key={index} 
        className="timeline-label" 
        style={{ width: viewMode === 'week' ? labelWidth : labelWidth * 7 }}
      >
        {label}
      </div>
    ));
  };

  return (
    <div className="timeline-header-labels">
      {generateTimelineLabels()}
    </div>
  );
};

// Timeline Summary Component
interface TimelineSummaryProps {
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
}

const TimelineSummary: React.FC<TimelineSummaryProps> = ({ tasks, milestones }) => {
  const overdueTasks = tasks.filter(task => task.is_overdue).length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const activeTasks = tasks.filter(task => task.status === 'in_progress').length;
  const overdueMilestones = milestones.filter(milestone => milestone.is_overdue).length;

  return (
    <div className="timeline-summary">
      <h4>Timeline Summary</h4>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-number">{activeTasks}</span>
          <span className="summary-label">Active Tasks</span>
        </div>
        <div className="summary-item">
          <span className="summary-number">{completedTasks}</span>
          <span className="summary-label">Completed</span>
        </div>
        <div className="summary-item">
          <span className={`summary-number ${overdueTasks > 0 ? 'warning' : ''}`}>
            {overdueTasks}
          </span>
          <span className="summary-label">Overdue Tasks</span>
        </div>
        <div className="summary-item">
          <span className={`summary-number ${overdueMilestones > 0 ? 'warning' : ''}`}>
            {overdueMilestones}
          </span>
          <span className="summary-label">Overdue Milestones</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectTimeline;