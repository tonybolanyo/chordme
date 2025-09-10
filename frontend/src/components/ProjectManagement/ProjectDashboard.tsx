import React, { useState, useEffect } from 'react';
import { Project } from '../../types/professionalCollaboration';
import { professionalCollaborationService } from '../../services/professionalCollaborationService';
import ProjectList from './ProjectList';
import ProjectTimeline from './ProjectTimeline';
import TaskManagement from './TaskManagement';
import TimeTracking from './TimeTracking';
import './ProjectDashboard.css';

interface ProjectDashboardProps {
  className?: string;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ className = '' }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'timeline' | 'tasks' | 'time'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const { projects } = await professionalCollaborationService.listProjects({ include_stats: true });
      setProjects(projects);
      if (projects.length > 0 && !selectedProject) {
        setSelectedProject(projects[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setActiveView('overview');
  };

  const handleCreateProject = async (projectData: unknown) => {
    try {
      const newProject = await professionalCollaborationService.createProject(projectData);
      setProjects(prev => [newProject, ...prev]);
      setSelectedProject(newProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  if (loading) {
    return (
      <div className={`project-dashboard loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`project-dashboard error ${className}`}>
        <div className="error-message">
          <h3>Error Loading Projects</h3>
          <p>{error}</p>
          <button onClick={loadProjects} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`project-dashboard ${className}`}>
      <div className="dashboard-header">
        <h1>Project Management</h1>
        <div className="dashboard-actions">
          <button 
            className="create-project-btn"
            onClick={() => {/* TODO: Open create project modal */}}
          >
            + New Project
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="sidebar">
          <ProjectList
            projects={projects}
            selectedProject={selectedProject}
            onProjectSelect={handleProjectSelect}
            onCreateProject={handleCreateProject}
          />
        </div>

        <div className="main-content">
          {selectedProject ? (
            <>
              <div className="project-header">
                <div className="project-info">
                  <h2>{selectedProject.name}</h2>
                  <div className="project-meta">
                    <span className={`status ${selectedProject.status}`}>
                      {selectedProject.status}
                    </span>
                    <span className="progress">
                      {selectedProject.overall_progress}% Complete
                    </span>
                    {selectedProject.stats && (
                      <span className="task-count">
                        {selectedProject.stats.completed_tasks}/{selectedProject.stats.total_tasks} Tasks
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="view-tabs">
                  <button
                    className={`tab ${activeView === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveView('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={`tab ${activeView === 'timeline' ? 'active' : ''}`}
                    onClick={() => setActiveView('timeline')}
                  >
                    Timeline
                  </button>
                  <button
                    className={`tab ${activeView === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveView('tasks')}
                  >
                    Tasks
                  </button>
                  <button
                    className={`tab ${activeView === 'time' ? 'active' : ''}`}
                    onClick={() => setActiveView('time')}
                  >
                    Time Tracking
                  </button>
                </div>
              </div>

              <div className="view-content">
                {activeView === 'overview' && (
                  <ProjectOverview project={selectedProject} />
                )}
                {activeView === 'timeline' && (
                  <ProjectTimeline projectId={selectedProject.id} />
                )}
                {activeView === 'tasks' && (
                  <TaskManagement projectId={selectedProject.id} />
                )}
                {activeView === 'time' && (
                  <TimeTracking projectId={selectedProject.id} />
                )}
              </div>
            </>
          ) : (
            <div className="no-project-selected">
              <h3>No Project Selected</h3>
              <p>Select a project from the sidebar or create a new one to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Project Overview Component
const ProjectOverview: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <div className="project-overview">
      <div className="overview-grid">
        <div className="overview-card">
          <h3>Project Details</h3>
          <div className="detail-row">
            <span className="label">Type:</span>
            <span className="value">{project.project_type}</span>
          </div>
          <div className="detail-row">
            <span className="label">Status:</span>
            <span className={`value status ${project.status}`}>{project.status}</span>
          </div>
          <div className="detail-row">
            <span className="label">Progress:</span>
            <span className="value">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${project.overall_progress}%` }}
                ></div>
              </div>
              {project.overall_progress}%
            </span>
          </div>
          {project.start_date && (
            <div className="detail-row">
              <span className="label">Start Date:</span>
              <span className="value">{new Date(project.start_date).toLocaleDateString()}</span>
            </div>
          )}
          {project.target_end_date && (
            <div className="detail-row">
              <span className="label">Target End:</span>
              <span className="value">{new Date(project.target_end_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {project.stats && (
          <div className="overview-card">
            <h3>Task Statistics</h3>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-number">{project.stats.total_tasks}</span>
                <span className="stat-label">Total Tasks</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{project.stats.completed_tasks}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{project.stats.overdue_tasks}</span>
                <span className="stat-label">Overdue</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{Math.round(project.stats.completion_rate)}%</span>
                <span className="stat-label">Completion Rate</span>
              </div>
            </div>
          </div>
        )}

        {project.description && (
          <div className="overview-card description">
            <h3>Description</h3>
            <p>{project.description}</p>
          </div>
        )}

        {project.tags && project.tags.length > 0 && (
          <div className="overview-card">
            <h3>Tags</h3>
            <div className="tag-list">
              {project.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDashboard;