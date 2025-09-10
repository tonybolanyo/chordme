import React, { useState } from 'react';
import { Project, CreateProjectRequest } from '../../types/professionalCollaboration';
import './ProjectList.css';

interface ProjectListProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onCreateProject: (projectData: CreateProjectRequest) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedProject,
  onProjectSelect,
  onCreateProject
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredProjects = projects.filter(project => {
    if (filterStatus !== 'all' && project.status !== filterStatus) return false;
    if (filterType !== 'all' && project.project_type !== filterType) return false;
    return true;
  });

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h3>Projects</h3>
        <button 
          className="create-btn"
          onClick={() => setShowCreateForm(true)}
          title="Create New Project"
        >
          +
        </button>
      </div>

      <div className="project-filters">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>

        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="album">Album</option>
          <option value="tour">Tour</option>
          <option value="lesson_plan">Lesson Plan</option>
          <option value="general">General</option>
        </select>
      </div>

      <div className="project-items">
        {filteredProjects.map(project => (
          <ProjectListItem
            key={project.id}
            project={project}
            isSelected={selectedProject?.id === project.id}
            onClick={() => onProjectSelect(project)}
          />
        ))}
        
        {filteredProjects.length === 0 && (
          <div className="no-projects">
            <p>No projects found</p>
            <button 
              className="create-first-project"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first project
            </button>
          </div>
        )}
      </div>

      {showCreateForm && (
        <CreateProjectModal
          onClose={() => setShowCreateForm(false)}
          onSubmit={onCreateProject}
        />
      )}
    </div>
  );
};

// Project List Item Component
interface ProjectListItemProps {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, isSelected, onClick }) => {
  return (
    <div 
      className={`project-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="project-item-header">
        <h4>{project.name}</h4>
        <span className={`status ${project.status}`}>
          {project.status}
        </span>
      </div>
      
      <div className="project-item-meta">
        <span className="project-type">{project.project_type}</span>
        <span className="progress">{project.overall_progress}%</span>
      </div>
      
      {project.stats && (
        <div className="project-item-stats">
          <span className="task-stats">
            {project.stats.completed_tasks}/{project.stats.total_tasks} tasks
          </span>
          {project.stats.overdue_tasks > 0 && (
            <span className="overdue-indicator">
              {project.stats.overdue_tasks} overdue
            </span>
          )}
        </div>
      )}
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${project.overall_progress}%` }}
        />
      </div>
    </div>
  );
};

// Create Project Modal Component
interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (projectData: CreateProjectRequest) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    project_type: 'general',
    tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (_error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      e.currentTarget.value = '';
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="create-project-form">
          <div className="form-group">
            <label htmlFor="name">Project Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="project_type">Project Type</label>
            <select
              id="project_type"
              value={formData.project_type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                project_type: e.target.value as CreateProjectRequest['project_type']
              }))}
            >
              <option value="general">General</option>
              <option value="album">Album Production</option>
              <option value="tour">Tour Management</option>
              <option value="lesson_plan">Lesson Plan</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Project description (optional)"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="start_date">Start Date</label>
            <input
              id="start_date"
              type="date"
              value={formData.start_date ? formData.start_date.split('T')[0] : ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined
              }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="target_end_date">Target End Date</label>
            <input
              id="target_end_date"
              type="date"
              value={formData.target_end_date ? formData.target_end_date.split('T')[0] : ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                target_end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined
              }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              type="text"
              placeholder="Type a tag and press Enter"
              onKeyDown={handleTagInput}
            />
            {formData.tags.length > 0 && (
              <div className="tag-list">
                {formData.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                    <button 
                      type="button" 
                      className="remove-tag"
                      onClick={() => removeTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectList;