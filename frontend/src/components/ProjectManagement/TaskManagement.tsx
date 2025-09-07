import React, { useState, useEffect } from 'react';
import { ProjectTask, CreateTaskRequest } from '../../types/professionalCollaboration';
import { professionalCollaborationService } from '../../services/professionalCollaborationService';
import './TaskManagement.css';

interface TaskManagementProps {
  projectId: number;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const taskList = await professionalCollaborationService.listProjectTasks(projectId);
      setTasks(taskList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    try {
      const newTask = await professionalCollaborationService.createProjectTask(projectId, taskData);
      setTasks(prev => [newTask, ...prev]);
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="task-management-loading">
        <div className="spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-management-error">
        <h3>Error Loading Tasks</h3>
        <p>{error}</p>
        <button onClick={loadTasks} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="task-management">
      <div className="task-header">
        <div className="task-info">
          <h3>Task Management</h3>
          <p>{tasks.length} total tasks</p>
        </div>
        
        <div className="task-actions">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
          
          <button 
            className="create-task-btn"
            onClick={() => setShowCreateForm(true)}
          >
            + New Task
          </button>
        </div>
      </div>

      <div className="task-list">
        {filteredTasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onUpdate={(updatedTask) => {
              setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            }}
          />
        ))}
        
        {filteredTasks.length === 0 && (
          <div className="no-tasks">
            <p>No tasks found</p>
            <button 
              className="create-first-task"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first task
            </button>
          </div>
        )}
      </div>

      {showCreateForm && (
        <CreateTaskModal
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateTask}
        />
      )}
    </div>
  );
};

// Task Item Component
interface TaskItemProps {
  task: ProjectTask;
  onUpdate: (task: ProjectTask) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'normal': return '#007bff';
      case 'low': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#ffc107';
      case 'blocked': return '#dc3545';
      case 'todo': return '#6c757d';
      default: return '#6c757d';
    }
  };

  return (
    <div className={`task-item ${expanded ? 'expanded' : ''}`}>
      <div className="task-summary" onClick={() => setExpanded(!expanded)}>
        <div className="task-main">
          <div className="task-title-row">
            <h4>{task.title}</h4>
            <div className="task-badges">
              <span 
                className="priority-badge" 
                style={{ backgroundColor: getPriorityColor(task.priority) }}
              >
                {task.priority}
              </span>
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(task.status) }}
              >
                {task.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <div className="task-meta">
            <span className="task-type">{task.task_type}</span>
            {task.assigned_to && (
              <span className="assignee">Assigned to User {task.assigned_to}</span>
            )}
            {task.due_date && (
              <span className={`due-date ${task.is_overdue ? 'overdue' : ''}`}>
                Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${task.progress_percentage}%` }}
              />
            </div>
            <span className="progress-text">{task.progress_percentage}%</span>
          </div>
        </div>
        
        <div className="expand-icon">
          {expanded ? '▼' : '▶'}
        </div>
      </div>

      {expanded && (
        <div className="task-details">
          {task.description && (
            <div className="task-description">
              <h5>Description</h5>
              <p>{task.description}</p>
            </div>
          )}
          
          <div className="task-info-grid">
            {task.estimated_hours && (
              <div className="info-item">
                <label>Estimated Hours:</label>
                <span>{task.estimated_hours}h</span>
              </div>
            )}
            
            <div className="info-item">
              <label>Actual Hours:</label>
              <span>{task.actual_hours}h</span>
            </div>
            
            {task.start_date && (
              <div className="info-item">
                <label>Start Date:</label>
                <span>{new Date(task.start_date).toLocaleDateString()}</span>
              </div>
            )}
            
            <div className="info-item">
              <label>Created:</label>
              <span>{new Date(task.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          {task.tags.length > 0 && (
            <div className="task-tags">
              <label>Tags:</label>
              <div className="tag-list">
                {task.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
          
          <div className="task-actions">
            <button className="edit-task-btn">Edit</button>
            <button className="delete-task-btn">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Task Modal (simplified)
interface CreateTaskModalProps {
  onClose: () => void;
  onSubmit: (taskData: CreateTaskRequest) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    priority: 'normal',
    task_type: 'general'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Task</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="create-task-form">
          <div className="form-group">
            <label htmlFor="title">Task Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  priority: e.target.value as CreateTaskRequest['priority']
                }))}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task_type">Type</label>
              <select
                id="task_type"
                value={formData.task_type}
                onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value }))}
              >
                <option value="general">General</option>
                <option value="songwriting">Songwriting</option>
                <option value="arrangement">Arrangement</option>
                <option value="recording">Recording</option>
                <option value="rehearsal">Rehearsal</option>
                <option value="performance">Performance</option>
                <option value="administrative">Administrative</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description (optional)"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskManagement;